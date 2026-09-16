/**
 * StudySourceCore Phase 10 Runtime Adversarial Attack Suite (`test_phase10_runtime_adversarial.js`)
 * 
 * Implements all 18 runtime adversarial attack cases:
 * RT-01: Request 5 concurrent workers -> maxObservedConcurrency <= 4.
 * RT-02: Parent attempts child self-execution -> REJECT.
 * RT-03: Worker crashes during execution -> FAILED -> retry once.
 * RT-04: Worker fails twice -> FINAL FAILURE.
 * RT-05: Process interrupted after partial Wave 1 -> resume from checkpoint.
 * RT-06: Process interrupted during Wave 2 -> completed Wave 1 tasks not repeated.
 * RT-07: Corrupted checkpoint -> FAIL CLOSED.
 * RT-08: Checkpoint with invalid task state -> REJECT.
 * RT-09: Retry counter tampered from 1 to 0 -> REJECT / preserve authoritative state.
 * RT-10: Worker result replaced by parent fallback -> REJECT.
 * RT-11: Dependent task starts before prerequisite -> BLOCK.
 * RT-12: Worker disappears without completion / timeout -> recoverable terminal state.
 * RT-13: 11th mission launch -> REJECT.
 * RT-14: Worker succeeds, then attempts to execute again -> REJECT.
 * RT-15: Resume attempts to regenerate already-certified artifact -> preserve certification state.
 * RT-16: Resume with mismatched pipeline version -> REJECT SAFE RESUME.
 * RT-17: Two workers attempt to claim the same logical task -> single-writer / single-owner enforcement.
 * RT-18: Concurrent checkpoint writes -> one valid authoritative checkpoint.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
    buildExecutionTaskGraph,
    executeTaskWorkflow,
    assertNoParentSelfExecution,
    validateCompletionEvidence
} = require('./orchestration_engine');

const {
    initExecutionState,
    saveExecutionState,
    loadExecutionState,
    updateTaskState,
    validateStateTransition,
    CURRENT_PIPELINE_VERSION
} = require('./execution_state');

const { AntigravityHostAdapter } = require('./antigravity_adapter');

const SCRATCH_DIR = path.resolve(__dirname, 'scratch/phase10_adversarial_tests');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(testId, description, testFn) {
    totalTests++;
    process.stdout.write(`  [${testId}] ${description} ... `);
    try {
        await testFn();
        console.log('✅ PASS');
        passedTests++;
    } catch (err) {
        console.log('❌ FAIL');
        console.error(`     Error: ${err.message}`);
        failedTests++;
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function setupMockEvidence(testRoot) {
    const scratch = path.join(testRoot, 'scratch');
    fs.mkdirSync(scratch, { recursive: true });
    const content = '# Evidence\nValid content for testing';
    fs.writeFileSync(path.join(scratch, 'evidence-pack.md'), content);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return { scratch, content, hash };
}

async function main() {
    console.log('================================================================================');
    console.log('STUDYSOURCECORE PHASE 10 — RUNTIME ADVERSARIAL ATTACK MATRIX (RT-01..RT-18)');
    console.log('================================================================================\n');

    if (fs.existsSync(SCRATCH_DIR)) {
        fs.rmSync(SCRATCH_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });

    // -------------------------------------------------------------------------
    // RT-01: Request 5 concurrent workers -> maxObservedConcurrency <= 4
    // -------------------------------------------------------------------------
    await runTest('RT-01', 'Request 5 concurrent workers -> maxObservedConcurrency <= 4', async () => {
        const testRoot = path.join(SCRATCH_DIR, 'rt01');
        fs.mkdirSync(testRoot, { recursive: true });
        const { hash: evHash } = setupMockEvidence(testRoot);

        const tasks = [1, 2, 3, 4, 5, 6].map(i => ({
            task_id: `task-${i}`,
            task_name: `Task ${i}`,
            wave: 1,
            owner_agent: `worker-${i}`,
            writer_agent: `worker-${i}`,
            target_path: path.join(testRoot, `t${i}.txt`),
            inputs: ['scratch/evidence-pack.md'],
            expected_outputs: [path.join(testRoot, `t${i}.txt`)],
            dependencies: [],
            status: 'PLANNED'
        }));

        let activeCount = 0;
        let peakActive = 0;

        const result = await executeTaskWorkflow({
            chapter: 'RT01',
            subject: 'Test',
            evidenceHash: evHash,
            tasks,
            context: { customRoot: testRoot }
        }, async (task) => {
            activeCount++;
            peakActive = Math.max(peakActive, activeCount);
            await delay(30);
            fs.writeFileSync(task.target_path, 'Content\n');
            activeCount--;
            return {
                status: 'SUCCESS',
                agent: task.owner_agent,
                task_id: task.task_id,
                inputs_consumed: ['scratch/evidence-pack.md'],
                outputs_produced: [task.target_path],
                output_paths: [task.target_path],
                validation_result: { passed: true },
                warnings: [],
                errors: [],
                dependencies_satisfied: true,
                retry_count: 0
            };
        }, { maxConcurrentWorkers: 5 });

        assert(peakActive <= 4, `Peak active workers must not exceed 4 (observed ${peakActive})`);
        assert(result.traces.efficiencyAudit.max_observed_concurrency <= 4);
    });

    // -------------------------------------------------------------------------
    // RT-02: Parent attempts child self-execution -> REJECT
    // -------------------------------------------------------------------------
    await runTest('RT-02', 'Parent attempts child self-execution -> REJECT with PARENT_SELF_EXECUTION_VIOLATION', () => {
        let threw = false;
        try {
            assertNoParentSelfExecution({
                task_id: 'task-math-apkg',
                owner_agent: 'math-apkg-author'
            }, 'parent');
        } catch (e) {
            threw = true;
            assert(e.message.includes('PARENT_SELF_EXECUTION_VIOLATION'));
        }
        assert(threw, 'Must throw PARENT_SELF_EXECUTION_VIOLATION');
    });

    // -------------------------------------------------------------------------
    // RT-03: Worker crashes during execution -> FAILED -> retry once
    // -------------------------------------------------------------------------
    await runTest('RT-03', 'Worker crashes during execution -> FAILED -> retry once and succeed', async () => {
        const testRoot = path.join(SCRATCH_DIR, 'rt03');
        fs.mkdirSync(testRoot, { recursive: true });
        const { hash: evHash } = setupMockEvidence(testRoot);

        let attempts = 0;
        const result = await executeTaskWorkflow({
            chapter: 'RT03',
            subject: 'Test',
            evidenceHash: evHash,
            tasks: [{
                task_id: 'task-flaky',
                task_name: 'Flaky Task',
                wave: 1,
                owner_agent: 'specialist-flaky',
                writer_agent: 'specialist-flaky',
                target_path: path.join(testRoot, 'flaky.txt'),
                inputs: ['scratch/evidence-pack.md'],
                expected_outputs: [path.join(testRoot, 'flaky.txt')],
                dependencies: [],
                status: 'PLANNED'
            }],
            context: { customRoot: testRoot }
        }, async (task, currentAttempt) => {
            attempts++;
            if (attempts === 1) {
                throw new Error('SIMULATED_TRANSIENT_CRASH');
            }
            fs.writeFileSync(task.target_path, 'Success Content\n');
            return {
                status: 'SUCCESS',
                agent: task.owner_agent,
                task_id: task.task_id,
                inputs_consumed: ['scratch/evidence-pack.md'],
                outputs_produced: [task.target_path],
                output_paths: [task.target_path],
                validation_result: { passed: true },
                warnings: [],
                errors: [],
                dependencies_satisfied: true,
                retry_count: currentAttempt
            };
        });

        assert.strictEqual(attempts, 2, 'Task must be retried exactly once');
        assert.strictEqual(result.taskStatusMap['task-flaky'], 'COMPLETED');
    });

    // -------------------------------------------------------------------------
    // RT-04: Worker fails twice -> FINAL FAILURE
    // -------------------------------------------------------------------------
    await runTest('RT-04', 'Worker fails twice -> FINAL FAILURE (MAX_RETRIES_PER_TASK = 1 exceeded)', async () => {
        const testRoot = path.join(SCRATCH_DIR, 'rt04');
        fs.mkdirSync(testRoot, { recursive: true });
        const { hash: evHash } = setupMockEvidence(testRoot);

        let attempts = 0;
        const result = await executeTaskWorkflow({
            chapter: 'RT04',
            subject: 'Test',
            evidenceHash: evHash,
            tasks: [{
                task_id: 'task-failing',
                task_name: 'Always Failing Task',
                wave: 1,
                owner_agent: 'specialist-failing',
                writer_agent: 'specialist-failing',
                target_path: path.join(testRoot, 'failing.txt'),
                inputs: ['scratch/evidence-pack.md'],
                expected_outputs: [path.join(testRoot, 'failing.txt')],
                dependencies: [],
                status: 'PLANNED'
            }],
            context: { customRoot: testRoot }
        }, async () => {
            attempts++;
            throw new Error('SIMULATED_PERSISTENT_CRASH');
        });

        assert.strictEqual(attempts, 2, 'Must stop at 2 attempts (1 initial + 1 retry)');
        assert.strictEqual(result.taskStatusMap['task-failing'], 'FAILED');
        assert.strictEqual(result.overallVerdict, 'FAILED');
    });

    // -------------------------------------------------------------------------
    // RT-05: Process interrupted after partial Wave 1 -> resume from checkpoint
    // -------------------------------------------------------------------------
    await runTest('RT-05', 'Process interrupted after partial Wave 1 -> resume recovers pending tasks', async () => {
        const testRoot = path.join(SCRATCH_DIR, 'rt05');
        fs.mkdirSync(testRoot, { recursive: true });
        const { hash: evHash } = setupMockEvidence(testRoot);

        const tasks = [
            { task_id: 't1', task_name: 'T1', wave: 1, owner_agent: 'a1', writer_agent: 'a1', target_path: path.join(testRoot, 't1.txt'), inputs: ['scratch/evidence-pack.md'], expected_outputs: [path.join(testRoot, 't1.txt')], dependencies: [], status: 'PLANNED' },
            { task_id: 't2', task_name: 'T2', wave: 1, owner_agent: 'a2', writer_agent: 'a2', target_path: path.join(testRoot, 't2.txt'), inputs: ['scratch/evidence-pack.md'], expected_outputs: [path.join(testRoot, 't2.txt')], dependencies: [], status: 'PLANNED' }
        ];

        // First run: complete t1, simulate crash on t2
        let t1Ran = 0;
        let t2Ran = 0;
        try {
            await executeTaskWorkflow({ chapter: 'RT05', subject: 'Test', evidenceHash: evHash, tasks, context: { customRoot: testRoot } }, async (t) => {
                if (t.task_id === 't1') {
                    t1Ran++;
                    fs.writeFileSync(t.target_path, 'T1 done\n');
                    return { status: 'SUCCESS', agent: t.owner_agent, task_id: t.task_id, inputs_consumed: ['scratch/evidence-pack.md'], outputs_produced: [t.target_path], output_paths: [t.target_path], validation_result: { passed: true }, warnings: [], errors: [], dependencies_satisfied: true, retry_count: 0 };
                }
                t2Ran++;
                throw new Error('INTERRUPT_CRASH');
            });
        } catch (e) {}

        // Second run: resume from checkpoint
        const resumeResult = await executeTaskWorkflow({ chapter: 'RT05', subject: 'Test', evidenceHash: evHash, tasks, context: { customRoot: testRoot } }, async (t) => {
            if (t.task_id === 't1') {
                t1Ran++;
            }
            if (t.task_id === 't2') {
                t2Ran++;
                fs.writeFileSync(t.target_path, 'T2 done\n');
                return { status: 'SUCCESS', agent: t.owner_agent, task_id: t.task_id, inputs_consumed: ['scratch/evidence-pack.md'], outputs_produced: [t.target_path], output_paths: [t.target_path], validation_result: { passed: true }, warnings: [], errors: [], dependencies_satisfied: true, retry_count: 0 };
            }
        }, { resume: true });

        assert.strictEqual(t1Ran, 1, 'T1 was completed before crash and must not run again');
        assert.strictEqual(t2Ran, 3, 'T2 was interrupted on attempt 1, retried once, then resumed and completed');
        assert.strictEqual(resumeResult.taskStatusMap['t1'], 'COMPLETED');
        assert.strictEqual(resumeResult.taskStatusMap['t2'], 'COMPLETED');
    });

    // -------------------------------------------------------------------------
    // RT-06: Process interrupted during Wave 2 -> completed Wave 1 tasks not repeated
    // -------------------------------------------------------------------------
    await runTest('RT-06', 'Process interrupted during Wave 2 -> Wave 1 tasks preserved on disk', async () => {
        const testRoot = path.join(SCRATCH_DIR, 'rt06');
        fs.mkdirSync(testRoot, { recursive: true });
        const { hash: evHash } = setupMockEvidence(testRoot);

        const tasks = [
            { task_id: 'w1_task', task_name: 'Wave 1 Task', wave: 1, owner_agent: 'a1', writer_agent: 'a1', target_path: path.join(testRoot, 'w1.txt'), inputs: ['scratch/evidence-pack.md'], expected_outputs: [path.join(testRoot, 'w1.txt')], dependencies: [], status: 'PLANNED' },
            { task_id: 'w2_task', task_name: 'Wave 2 Task', wave: 2, owner_agent: 'a2', writer_agent: 'a2', target_path: path.join(testRoot, 'w2.txt'), inputs: ['scratch/evidence-pack.md'], expected_outputs: [path.join(testRoot, 'w2.txt')], dependencies: ['w1_task'], status: 'PLANNED' }
        ];

        let w1Count = 0;
        try {
            await executeTaskWorkflow({ chapter: 'RT06', subject: 'Test', evidenceHash: evHash, tasks, context: { customRoot: testRoot } }, async (t) => {
                if (t.wave === 1) {
                    w1Count++;
                    fs.writeFileSync(t.target_path, 'W1\n');
                    return { status: 'SUCCESS', agent: t.owner_agent, task_id: t.task_id, inputs_consumed: ['scratch/evidence-pack.md'], outputs_produced: [t.target_path], output_paths: [t.target_path], validation_result: { passed: true }, warnings: [], errors: [], dependencies_satisfied: true, retry_count: 0 };
                }
                throw new Error('WAVE2_CRASH');
            });
        } catch (e) {}

        await executeTaskWorkflow({ chapter: 'RT06', subject: 'Test', evidenceHash: evHash, tasks, context: { customRoot: testRoot } }, async (t) => {
            if (t.wave === 1) w1Count++;
            if (t.wave === 2) {
                fs.writeFileSync(t.target_path, 'W2\n');
                return { status: 'SUCCESS', agent: t.owner_agent, task_id: t.task_id, inputs_consumed: ['scratch/evidence-pack.md'], outputs_produced: [t.target_path], output_paths: [t.target_path], validation_result: { passed: true }, warnings: [], errors: [], dependencies_satisfied: true, retry_count: 0 };
            }
        }, { resume: true });

        assert.strictEqual(w1Count, 1, 'Wave 1 task must execute exactly once across interrupted run and resume');
    });

    // -------------------------------------------------------------------------
    // RT-07: Corrupted checkpoint -> FAIL CLOSED
    // -------------------------------------------------------------------------
    await runTest('RT-07', 'Corrupted checkpoint (truncated JSON) -> FAIL CLOSED with CORRUPT_CHECKPOINT', () => {
        const testRoot = path.join(SCRATCH_DIR, 'rt07');
        fs.mkdirSync(testRoot, { recursive: true });
        const corruptFile = path.join(testRoot, 'execution-state.json');
        fs.writeFileSync(corruptFile, '{"mission_id": "m1", "tasks": {'); // Truncated JSON

        let threw = false;
        try {
            loadExecutionState(testRoot, { failClosed: true, throwOnCorrupt: true });
        } catch (e) {
            threw = true;
            assert(e.message.includes('CORRUPT_CHECKPOINT'));
        }
        assert(threw, 'Must throw CORRUPT_CHECKPOINT on truncated JSON');
    });

    // -------------------------------------------------------------------------
    // RT-08: Checkpoint with invalid task state -> REJECT
    // -------------------------------------------------------------------------
    await runTest('RT-08', 'Checkpoint with invalid task state -> REJECT with CORRUPT_CHECKPOINT', () => {
        const testRoot = path.join(SCRATCH_DIR, 'rt08');
        fs.mkdirSync(testRoot, { recursive: true });
        const corruptState = {
            mission_id: 'm1',
            pipeline_version: CURRENT_PIPELINE_VERSION,
            tasks: {
                't1': { task_id: 't1', status: 'NON_EXISTENT_MAGIC_STATE' }
            }
        };
        fs.writeFileSync(path.join(testRoot, 'execution-state.json'), JSON.stringify(corruptState));

        let threw = false;
        try {
            loadExecutionState(testRoot, { failClosed: true, validate: true });
        } catch (e) {
            threw = true;
            assert(e.message.includes('CORRUPT_CHECKPOINT') || e.message.includes('invalid state'));
        }
        assert(threw, 'Must throw on invalid task state');
    });

    // -------------------------------------------------------------------------
    // RT-09: Retry counter tampered from 1 to 0 -> REJECT / preserve authoritative state
    // -------------------------------------------------------------------------
    await runTest('RT-09', 'Retry counter tampering detected via checksum mismatch', () => {
        const testRoot = path.join(SCRATCH_DIR, 'rt09');
        fs.mkdirSync(testRoot, { recursive: true });
        const state = initExecutionState({ chapter: 'RT09', subject: 'Test' });
        state.tasks['t1'] = { task_id: 't1', status: 'RETRYING', attempts: [{ attempt: 1 }] };
        state.retry_counts = { 't1': 1 };
        saveExecutionState(state, testRoot);

        // Tamper with file on disk
        const statePath = path.join(testRoot, 'execution-state.json');
        const raw = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        raw.retry_counts['t1'] = 0; // Tamper count from 1 to 0
        fs.writeFileSync(statePath, JSON.stringify(raw));

        let threw = false;
        try {
            loadExecutionState(testRoot, { failClosed: true, validate: true });
        } catch (e) {
            threw = true;
            assert(e.message.includes('Checksum mismatch'));
        }
        assert(threw, 'Must reject checkpoint when retry counter is tampered');
    });

    // -------------------------------------------------------------------------
    // RT-10: Worker result replaced by parent fallback -> REJECT
    // -------------------------------------------------------------------------
    await runTest('RT-10', 'Worker result replaced by parent fallback -> REJECT with PARENT_SELF_EXECUTION_VIOLATION', async () => {
        const testRoot = path.join(SCRATCH_DIR, 'rt10');
        fs.mkdirSync(testRoot, { recursive: true });
        const targetFile = path.join(testRoot, 'notes.md');
        fs.writeFileSync(targetFile, 'Parent written notes\n');

        const val = await validateCompletionEvidence({
            task_id: 'task-notes',
            owner_agent: 'core-notes',
            target_path: targetFile
        }, {
            agent: 'parent-orchestrator', // Parent tried to substitute itself
            status: 'SUCCESS'
        });

        assert.strictEqual(val.isValid, false);
        assert(val.errors.some(e => e.includes('PARENT_SELF_EXECUTION_VIOLATION') || e.includes('OWNERSHIP_MISMATCH')));
    });

    // -------------------------------------------------------------------------
    // RT-11: Dependent task starts before prerequisite -> BLOCK
    // -------------------------------------------------------------------------
    await runTest('RT-11', 'Dependent task starts before prerequisite -> BLOCKED status enforced', async () => {
        const testRoot = path.join(SCRATCH_DIR, 'rt11');
        fs.mkdirSync(testRoot, { recursive: true });
        const { hash: evHash } = setupMockEvidence(testRoot);

        const tasks = [
            { task_id: 'parent_task', task_name: 'Parent Task', wave: 1, owner_agent: 'p1', writer_agent: 'p1', target_path: path.join(testRoot, 'p.txt'), inputs: ['scratch/evidence-pack.md'], expected_outputs: [path.join(testRoot, 'p.txt')], dependencies: [], status: 'PLANNED' },
            { task_id: 'child_task', task_name: 'Child Task', wave: 2, owner_agent: 'c1', writer_agent: 'c1', target_path: path.join(testRoot, 'c.txt'), inputs: ['scratch/evidence-pack.md'], expected_outputs: [path.join(testRoot, 'c.txt')], dependencies: ['parent_task'], status: 'PLANNED' }
        ];

        // Fail parent task
        const result = await executeTaskWorkflow({ chapter: 'RT11', subject: 'Test', evidenceHash: evHash, tasks, context: { customRoot: testRoot } }, async (t) => {
            if (t.task_id === 'parent_task') {
                throw new Error('PARENT_PREREQUISITE_FAILED');
            }
            return { status: 'SUCCESS' };
        });

        assert.strictEqual(result.taskStatusMap['parent_task'], 'FAILED');
        assert.strictEqual(result.taskStatusMap['child_task'], 'BLOCKED');
    });

    // -------------------------------------------------------------------------
    // RT-12: Worker disappears without completion / timeout -> recoverable terminal state
    // -------------------------------------------------------------------------
    await runTest('RT-12', 'Worker timeout triggers recovery transition and frees concurrency slot', async () => {
        const testRoot = path.join(SCRATCH_DIR, 'rt12');
        fs.mkdirSync(testRoot, { recursive: true });
        const { hash: evHash } = setupMockEvidence(testRoot);

        let attempts = 0;
        const result = await executeTaskWorkflow({
            chapter: 'RT12',
            subject: 'Test',
            evidenceHash: evHash,
            tasks: [{
                task_id: 'task-stuck',
                task_name: 'Stuck Worker',
                wave: 1,
                owner_agent: 'specialist-stuck',
                writer_agent: 'specialist-stuck',
                target_path: path.join(testRoot, 'stuck.txt'),
                inputs: ['scratch/evidence-pack.md'],
                expected_outputs: [path.join(testRoot, 'stuck.txt')],
                dependencies: [],
                status: 'PLANNED'
            }],
            context: { customRoot: testRoot }
        }, async (task, currentAttempt) => {
            attempts++;
            if (attempts === 1) {
                // Hang on attempt 1 (simulate stuck worker)
                await delay(200);
            }
            fs.writeFileSync(task.target_path, 'Recovered output\n');
            return {
                status: 'SUCCESS',
                agent: task.owner_agent,
                task_id: task.task_id,
                inputs_consumed: ['scratch/evidence-pack.md'],
                outputs_produced: [task.target_path],
                output_paths: [task.target_path],
                validation_result: { passed: true },
                warnings: [],
                errors: [],
                dependencies_satisfied: true,
                retry_count: currentAttempt
            };
        }, { taskTimeoutMs: 50 }); // 50ms timeout cap

        assert(attempts >= 2, 'Stuck task must be timed out and retried');
        assert.strictEqual(result.taskStatusMap['task-stuck'], 'COMPLETED');
    });

    // -------------------------------------------------------------------------
    // RT-13: 11th mission launch -> REJECT
    // -------------------------------------------------------------------------
    await runTest('RT-13', '11th mission launch -> REJECT with RESOURCE_LIMIT_EXCEEDED', async () => {
        const testRoot = path.join(SCRATCH_DIR, 'rt13');
        fs.mkdirSync(testRoot, { recursive: true });
        const { hash: evHash } = setupMockEvidence(testRoot);

        // Create 11 tasks
        const tasks = [];
        for (let i = 1; i <= 11; i++) {
            tasks.push({
                task_id: `t_${i}`,
                task_name: `T ${i}`,
                wave: 1,
                owner_agent: `worker-${i}`,
                writer_agent: `worker-${i}`,
                target_path: path.join(testRoot, `out_${i}.txt`),
                inputs: ['scratch/evidence-pack.md'],
                expected_outputs: [path.join(testRoot, `out_${i}.txt`)],
                dependencies: [],
                status: 'PLANNED'
            });
        }

        let launchedCount = 0;
        const result = await executeTaskWorkflow({
            chapter: 'RT13',
            subject: 'Test',
            evidenceHash: evHash,
            tasks,
            context: { customRoot: testRoot }
        }, async (task) => {
            launchedCount++;
            fs.writeFileSync(task.target_path, 'Done\n');
            return {
                status: 'SUCCESS',
                agent: task.owner_agent,
                task_id: task.task_id,
                inputs_consumed: ['scratch/evidence-pack.md'],
                outputs_produced: [task.target_path],
                output_paths: [task.target_path],
                validation_result: { passed: true },
                warnings: [],
                errors: [],
                dependencies_satisfied: true,
                retry_count: 0
            };
        });

        assert(launchedCount <= 10, `Total invocations (${launchedCount}) must never exceed 10`);
        assert.strictEqual(result.traces.efficiencyAudit.max_total_launches_cap, 10);
    });

    // -------------------------------------------------------------------------
    // RT-14: Worker succeeds, then attempts to execute again -> REJECT
    // -------------------------------------------------------------------------
    await runTest('RT-14', 'Worker succeeds, then attempts to execute again -> REJECT with INVALID_STATE_TRANSITION', () => {
        let threw = false;
        try {
            validateStateTransition('SUCCEEDED', 'RUNNING', 'task-notes');
        } catch (e) {
            threw = true;
            assert(e.message.includes('INVALID_STATE_TRANSITION'));
        }
        assert(threw, 'Must throw INVALID_STATE_TRANSITION for SUCCEEDED -> RUNNING');
    });

    // -------------------------------------------------------------------------
    // RT-15: Resume attempts to regenerate already-certified artifact -> preserve certification state
    // -------------------------------------------------------------------------
    await runTest('RT-15', 'Resume preserves existing certified/completed artifact on disk', async () => {
        const testRoot = path.join(SCRATCH_DIR, 'rt15');
        fs.mkdirSync(testRoot, { recursive: true });
        const { hash: evHash } = setupMockEvidence(testRoot);

        const targetPath = path.join(testRoot, 'certified.txt');
        fs.writeFileSync(targetPath, 'Original Authoritative Content\n');

        const state = initExecutionState({ chapter: 'RT15', subject: 'Test' });
        state.completed_tasks = ['t_cert'];
        state.tasks['t_cert'] = {
            task_id: 't_cert',
            status: 'COMPLETED',
            output_paths: [targetPath]
        };
        saveExecutionState(state, testRoot);

        let ran = false;
        await executeTaskWorkflow({
            chapter: 'RT15',
            subject: 'Test',
            evidenceHash: evHash,
            tasks: [{
                task_id: 't_cert',
                task_name: 'Certified Task',
                wave: 1,
                owner_agent: 'cert-agent',
                writer_agent: 'cert-agent',
                target_path: targetPath,
                inputs: ['scratch/evidence-pack.md'],
                expected_outputs: [targetPath],
                dependencies: [],
                status: 'PLANNED'
            }],
            context: { customRoot: testRoot }
        }, async () => {
            ran = true;
        }, { resume: true });

        assert.strictEqual(ran, false, 'Already verified on-disk task must not re-execute');
        assert.strictEqual(fs.readFileSync(targetPath, 'utf8'), 'Original Authoritative Content\n');
    });

    // -------------------------------------------------------------------------
    // RT-16: Resume with mismatched pipeline version -> REJECT SAFE RESUME
    // -------------------------------------------------------------------------
    await runTest('RT-16', 'Resume with mismatched pipeline version -> REJECT SAFE RESUME', async () => {
        const testRoot = path.join(SCRATCH_DIR, 'rt16');
        fs.mkdirSync(testRoot, { recursive: true });
        const { hash: evHash } = setupMockEvidence(testRoot);
        const state = initExecutionState({ chapter: 'RT16', subject: 'Test', pipeline_version: '999.0.0' });
        saveExecutionState(state, testRoot);

        let threw = false;
        try {
            await executeTaskWorkflow({
                chapter: 'RT16',
                subject: 'Test',
                evidenceHash: evHash,
                tasks: [],
                context: { customRoot: testRoot }
            }, async () => {}, { resume: true });
        } catch (e) {
            threw = true;
            assert(e.message.includes('CHECKPOINT_VERSION_MISMATCH'));
        }
        assert(threw, 'Must throw CHECKPOINT_VERSION_MISMATCH on incompatible pipeline version');
    });

    // -------------------------------------------------------------------------
    // RT-17: Two workers attempt to claim the same logical task -> single-writer / single-owner enforcement
    // -------------------------------------------------------------------------
    await runTest('RT-17', 'Two workers attempt to claim the same logical task -> SINGLE_WRITER_COLLISION', () => {
        const adapter = new AntigravityHostAdapter({ missionId: 'm_rt17' });
        const w1 = adapter.bindWorkerToTask({
            logicalTaskId: 'task-notes',
            ownerAgent: 'core-notes',
            waveId: 1
        });
        adapter.recordWorkerStart(w1.worker_id);

        let threw = false;
        try {
            adapter.bindWorkerToTask({
                logicalTaskId: 'task-notes',
                ownerAgent: 'core-notes',
                waveId: 1
            });
        } catch (e) {
            threw = true;
            assert(e.message.includes('SINGLE_WRITER_COLLISION'));
        }
        assert(threw, 'Must reject multiple concurrent workers claiming same logical task');
    });

    // -------------------------------------------------------------------------
    // RT-18: Concurrent checkpoint writes -> one valid authoritative checkpoint
    // -------------------------------------------------------------------------
    await runTest('RT-18', 'Concurrent checkpoint writes -> one valid authoritative checkpoint', async () => {
        const testRoot = path.join(SCRATCH_DIR, 'rt18');
        fs.mkdirSync(testRoot, { recursive: true });
        const state = initExecutionState({ chapter: 'RT18', subject: 'Test' });

        // Fire 10 rapid concurrent writes
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push((async () => {
                const copy = JSON.parse(JSON.stringify(state));
                copy.tasks[`task_${i}`] = { task_id: `task_${i}`, status: 'RUNNING' };
                saveExecutionState(copy, testRoot);
            })());
        }
        await Promise.all(promises);

        // Checkpoint must load cleanly without corrupt syntax
        const loaded = loadExecutionState(testRoot, { failClosed: true, validate: true });
        assert(loaded && loaded.mission_id, 'Checkpoint must be valid and intact');
    });

    console.log('\n================================================================================');
    console.log(`PHASE 10 RUNTIME ADVERSARIAL RESULT: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
    console.log('================================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(err => {
        console.error('Fatal test failure:', err);
        process.exit(1);
    });
}
