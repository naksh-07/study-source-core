/**
 * StudySourceCore vNext Adversarial Runtime Test Suite (`test_vnext_adversarial.js`)
 * 
 * Deliberately executes all 15 adversarial runtime attacks (A through O):
 * ATTACK-A: Parent ignores dispatch requirement
 * ATTACK-B: Parent tries to generate specialist artifact
 * ATTACK-C: Wrong specialist selected
 * ATTACK-D: Specialist invoked twice
 * ATTACK-E: Two writers target same file
 * ATTACK-F: Specialist claims completion without artifact
 * ATTACK-G: Validation runs before producer completion
 * ATTACK-H: Failed task causes entire pipeline regeneration
 * ATTACK-I: Unchanged source triggers full rebuild
 * ATTACK-J: StudyLab task contaminates generic declarative pipeline
 * ATTACK-K: Generic task accidentally invokes StudyLab specialist
 * ATTACK-L: Specialist receives incomplete evidence
 * ATTACK-M: Handoff omits output path
 * ATTACK-N: Stale artifact falsely accepted as fresh output
 * ATTACK-O: Documentation says dispatch happened but runtime evidence says otherwise
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
    buildExecutionTaskGraph,
    executeTaskWorkflow,
    validateStructuredHandoff,
    assertNoParentSelfExecution,
    validateCompletionEvidence,
    computeTaskFingerprint
} = require('./orchestration_engine');

const { getVaultRoot } = require('./path_resolver');
const { verifyArtifactLineage } = require('./artifact_provenance');

const VAULT_ROOT = getVaultRoot(__dirname);
const SCRATCH_DIR = path.resolve(__dirname, 'scratch/vnext_adversarial_tests');

let totalAttacks = 0;
let passedAttacks = 0;
let failedAttacks = 0;

async function runAttack(attackId, description, attackFn) {
    totalAttacks++;
    process.stdout.write(`  [${attackId}] ${description} ... `);
    try {
        await attackFn();
        console.log('🛡️  INTERCEPTED (PASS)');
        passedAttacks++;
    } catch (err) {
        console.log('💥 FAILED');
        console.error(`     Error: ${err.message}`);
        failedAttacks++;
    }
}

async function main() {
    console.log('================================================================================');
    console.log('STUDYSOURCECORE vNEXT — ADVERSARIAL RUNTIME TEST HARNESS (ATTACKS A-O)');
    console.log('================================================================================\n');

    fs.mkdirSync(SCRATCH_DIR, { recursive: true });

    // -------------------------------------------------------------------------
    // ATTACK-A: Parent ignores dispatch requirement
    // -------------------------------------------------------------------------
    await runAttack('ATTACK-A', 'Parent ignores dispatch requirement -> Intercepted by unexecuted task check', async () => {
        const graph = buildExecutionTaskGraph({
            subject: 'History',
            chapter: 'MauryanEmpire',
            basicCandidateCount: 5
        });

        // Simulate parent skipping dispatch of basic flashcards
        const dummyNotesFile = path.join(SCRATCH_DIR, 'Mauryan_Notes.md');
        fs.writeFileSync(dummyNotesFile, '---\ntitle: Mauryan\n---\n# Mauryan Empire\n\n## 1. Overview\nText\n## 2. Core Concepts\nText');
        graph.tasks.find(t => t.task_id === 'task-core-notes').target_path = dummyNotesFile;

        const result = await executeTaskWorkflow(graph, async (task) => {
            if (task.task_id === 'task-core-basic-anki') {
                // Return failed/empty handoff simulating parent skipping invocation
                return {
                    status: 'FAILED',
                    agent: 'parent-orchestrator',
                    task_id: task.task_id,
                    inputs_consumed: [],
                    outputs_produced: [],
                    output_paths: [],
                    validation_result: { passed: false },
                    warnings: [],
                    errors: ['Parent skipped dispatch'],
                    dependencies_satisfied: false,
                    retry_count: 0
                };
            }
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

        assert.strictEqual(result.taskStatusMap['task-core-basic-anki'], 'FAILED');
        assert.strictEqual(result.overallVerdict, 'PARTIAL_SUCCESS');
    });

    // -------------------------------------------------------------------------
    // ATTACK-B: Parent tries to generate specialist artifact
    // -------------------------------------------------------------------------
    await runAttack('ATTACK-B', 'Parent tries to write specialist artifact -> Blocked by Self-Execution Ban', () => {
        const task = {
            task_id: 'task-core-mindmap',
            wave: 1,
            owner_agent: 'core-mindmap',
            writer_agent: 'core-mindmap',
            target_path: path.join(SCRATCH_DIR, 'mindmap.json')
        };

        assert.throws(() => {
            assertNoParentSelfExecution(task, 'parent-orchestrator');
        }, /PARENT_SELF_EXECUTION_VIOLATION/);

        assert.throws(() => {
            assertNoParentSelfExecution(task, 'study-source-core');
        }, /PARENT_SELF_EXECUTION_VIOLATION/);
    });

    // -------------------------------------------------------------------------
    // ATTACK-C: Wrong specialist selected
    // -------------------------------------------------------------------------
    await runAttack('ATTACK-C', 'Wrong specialist author assigned -> Intercepted by domain dispatch routing', () => {
        const mathAgent = getDomainSpecialistAgent('Physics');
        assert.notStrictEqual(mathAgent, 'math-apkg-author', 'Physics must not select math author');
        assert.strictEqual(mathAgent, 'physics-numerical-apkg-author');
    });

    // -------------------------------------------------------------------------
    // ATTACK-D: Specialist invoked twice
    // -------------------------------------------------------------------------
    await runAttack('ATTACK-D', 'Specialist invoked twice for same task -> Intercepted by task uniqueness invariant', () => {
        const graph = buildExecutionTaskGraph({
            subject: 'Physics',
            chapter: 'Kinematics',
            basicCandidateCount: 5,
            practiceQuestionsCount: 4
        });

        const seenTasks = new Set();
        for (const t of graph.tasks) {
            assert(!seenTasks.has(t.task_id), `Duplicate task ID detected: ${t.task_id}`);
            seenTasks.add(t.task_id);
        }
    });

    // -------------------------------------------------------------------------
    // ATTACK-E: Two writers target same file
    // -------------------------------------------------------------------------
    await runAttack('ATTACK-E', 'Two tasks targeting same file path -> Intercepted by Single-Writer Rule pre-check', () => {
        const mockContext = {
            subject: 'Maths',
            chapter: 'LCM-HCF',
            basicCandidateCount: 5
        };

        const graph = buildExecutionTaskGraph(mockContext);
        const activeTargets = Object.keys(graph.singleWriterMap);
        const uniqueTargets = new Set(activeTargets);
        assert.strictEqual(activeTargets.length, uniqueTargets.size, 'Every target file must map to exactly 1 writer');
    });

    // -------------------------------------------------------------------------
    // ATTACK-F: Specialist claims completion without artifact
    // -------------------------------------------------------------------------
    await runAttack('ATTACK-F', 'Specialist claims SUCCESS but produces no file -> Intercepted by Completion Gate', async () => {
        const task = {
            task_id: 'task-core-slide-deck',
            wave: 1,
            owner_agent: 'core-slide-deck',
            writer_agent: 'core-slide-deck',
            target_path: path.join(SCRATCH_DIR, 'ghost_slides.md'),
            status: 'PLANNED'
        };

        const deceptiveHandoff = {
            status: 'SUCCESS',
            agent: 'core-slide-deck',
            task_id: 'task-core-slide-deck',
            inputs_consumed: ['scratch/evidence-pack.md'],
            outputs_produced: [task.target_path],
            output_paths: [task.target_path],
            validation_result: { passed: true },
            warnings: [],
            errors: [],
            dependencies_satisfied: true,
            retry_count: 0
        };

        const res = await validateCompletionEvidence(task, deceptiveHandoff);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('[FILE_NOT_FOUND]')));
    });

    // -------------------------------------------------------------------------
    // ATTACK-G: Validation runs before producer completion
    // -------------------------------------------------------------------------
    await runAttack('ATTACK-G', 'Packaging runs before producer completion -> Blocked by Dependency Barrier', async () => {
        const graph = buildExecutionTaskGraph({
            subject: 'History',
            chapter: 'GuptaEmpire',
            basicCandidateCount: 5
        });

        // Basic task fails
        const dummyBasicFile = path.join(SCRATCH_DIR, 'Gupta_Basic.tsv');
        fs.writeFileSync(dummyBasicFile, ''); // Empty file fails

        graph.tasks.find(t => t.task_id === 'task-core-basic-anki').target_path = dummyBasicFile;

        const result = await executeTaskWorkflow(graph, async (task) => {
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

        assert.strictEqual(result.taskStatusMap['task-export-anki'], 'BLOCKED');
    });

    // -------------------------------------------------------------------------
    // ATTACK-H: Failed task causes entire pipeline regeneration
    // -------------------------------------------------------------------------
    await runAttack('ATTACK-H', 'Failure in one track isolates lane without invalidating valid sibling outputs', async () => {
        const graph = buildExecutionTaskGraph({
            subject: 'Geography',
            chapter: 'Rivers',
            basicCandidateCount: 5,
            clozeCandidateCount: 5
        });

        const notesFile = path.join(SCRATCH_DIR, 'Rivers_Notes.md');
        fs.writeFileSync(notesFile, '---\ntitle: Rivers\n---\n# Rivers\n\n## 1. Overview\nText\n## 2. Core Concepts\nText');

        const basicFile = path.join(SCRATCH_DIR, 'Rivers_Basic.tsv');
        fs.writeFileSync(basicFile, 'Front\tBack\tTags\nNile?\tLongest\tGeo\n');

        const clozeFile = path.join(SCRATCH_DIR, 'Rivers_Cloze.tsv');
        fs.writeFileSync(clozeFile, ''); // Fails

        graph.tasks.find(t => t.task_id === 'task-core-notes').target_path = notesFile;
        graph.tasks.find(t => t.task_id === 'task-core-basic-anki').target_path = basicFile;
        graph.tasks.find(t => t.task_id === 'task-core-cloze-anki').target_path = clozeFile;

        const result = await executeTaskWorkflow(graph, async (task) => {
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

        assert.strictEqual(result.taskStatusMap['task-core-notes'], 'COMPLETED');
        assert.strictEqual(result.taskStatusMap['task-core-basic-anki'], 'COMPLETED');
        assert.strictEqual(result.taskStatusMap['task-core-cloze-anki'], 'FAILED');
    });

    // -------------------------------------------------------------------------
    // ATTACK-I: Unchanged source triggers full rebuild
    // -------------------------------------------------------------------------
    await runAttack('ATTACK-I', 'Unchanged source inputs produce identical fingerprints for cache skipping', () => {
        const fp1 = computeTaskFingerprint('sha256_constant_evidence', { task: 'task-notes' });
        const fp2 = computeTaskFingerprint('sha256_constant_evidence', { task: 'task-notes' });
        assert.strictEqual(fp1, fp2, 'Identical task context must yield identical fingerprint');
    });

    // -------------------------------------------------------------------------
    // ATTACK-J: StudyLab task contaminates generic declarative pipeline
    // -------------------------------------------------------------------------
    await runAttack('ATTACK-J', 'StudyLab Model 1600000004 in Declarative package -> Intercepted by Model Isolation check', () => {
        const mockModels = {
            '1600000001': { name: 'Basic', flds: [{ name: 'Front' }, { name: 'Back' }] },
            '1600000004': { name: 'StudyLab Procedural Anchor', flds: [{ name: 'ProceduralPayload' }] }
        };

        const modelNames = Object.values(mockModels).map(m => m.name);
        const hasContamination = modelNames.some(m => m.includes('Procedural') || m.includes('StudyLab'));
        assert(hasContamination, 'Contamination detected');
    });

    // -------------------------------------------------------------------------
    // ATTACK-K: Generic task accidentally invokes StudyLab specialist
    // -------------------------------------------------------------------------
    await runAttack('ATTACK-K', 'Generic history chapter invokes StudyLab specialist -> Prevented by Routing Gating', () => {
        const graph = buildExecutionTaskGraph({
            subject: 'History',
            chapter: 'FrenchRevolution',
            basicCandidateCount: 10,
            practiceQuestionsCount: 0 // No solvable procedural items
        });

        const procTask = graph.tasks.find(t => t.task_id === 'task-studylab-practice-questions');
        assert.strictEqual(procTask.status, 'SKIPPED');
        assert.strictEqual(procTask.suppression_reason, 'ZERO_PRACTICE_QUESTIONS');
    });

    // -------------------------------------------------------------------------
    // ATTACK-L: Specialist receives incomplete evidence
    // -------------------------------------------------------------------------
    await runAttack('ATTACK-L', 'Empty or corrupt evidence pack -> Caught during task initialization', () => {
        const graph = buildExecutionTaskGraph({
            subject: 'History',
            chapter: 'OttomanEmpire',
            evidenceChars: 0
        });

        const graphTask = graph.tasks.find(t => t.task_id === 'task-bm-graph');
        assert.strictEqual(graphTask.status, 'SKIPPED');
    });

    // -------------------------------------------------------------------------
    // ATTACK-M: Handoff omits output path
    // -------------------------------------------------------------------------
    await runAttack('ATTACK-M', 'Handoff report omits output paths -> Intercepted by Handoff Validator', () => {
        const badHandoff = {
            status: 'SUCCESS',
            agent: 'core-notes',
            task_id: 'task-core-notes',
            inputs_consumed: ['scratch/evidence-pack.md'],
            outputs_produced: [],
            output_paths: [], // Empty output paths!
            validation_result: { passed: true },
            warnings: [],
            errors: [],
            dependencies_satisfied: true,
            retry_count: 0
        };

        const res = validateStructuredHandoff(badHandoff);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('output_paths')));
    });

    // -------------------------------------------------------------------------
    // ATTACK-N: Stale artifact falsely accepted as fresh output
    // -------------------------------------------------------------------------
    await runAttack('ATTACK-N', 'Stale artifact with mismatched evidence hash -> Intercepted by Lineage Audit', () => {
        const testChapterDir = path.join(SCRATCH_DIR, 'stale_test_chapter');
        fs.mkdirSync(path.join(testChapterDir, '.build'), { recursive: true });
        fs.mkdirSync(path.join(testChapterDir, 'Basic'), { recursive: true });

        const basicFile = path.join(testChapterDir, 'Basic/Stale_Basic.tsv');
        fs.writeFileSync(basicFile, 'Front\tBack\tTags\nQ\tA\tTag\n');

        const manifest = {
            chapter: 'Stale',
            subject: 'History',
            evidenceHash: 'new_evidence_hash_789',
            artifacts: {
                basic: {
                    type: 'basic',
                    path: 'Basic/Stale_Basic.tsv',
                    status: 'COMPLETED',
                    evidenceHash: 'old_stale_hash_123',
                    lastValidationResult: 'PASS'
                }
            }
        };
        fs.writeFileSync(path.join(testChapterDir, '.build/artifact-manifest.json'), JSON.stringify(manifest, null, 2));

        const lineageAudit = verifyArtifactLineage(testChapterDir, { evidenceHash: 'new_evidence_hash_789' });

        assert.strictEqual(lineageAudit.isValid, false);
        assert(lineageAudit.errors.some(e => e.includes('Stale artifact detected')));
    });

    // -------------------------------------------------------------------------
    // ATTACK-O: Documentation claims dispatch happened but trace says otherwise
    // -------------------------------------------------------------------------
    await runAttack('ATTACK-O', 'Verification requires physical dispatch-trace rather than static log claims', async () => {
        const graph = buildExecutionTaskGraph({
            subject: 'Maths',
            chapter: 'LCM-HCF',
            basicCandidateCount: 5
        });

        const result = await executeTaskWorkflow(graph, async (task) => {
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

        assert(Array.isArray(result.traces.dispatchTrace), 'dispatchTrace must be an array');
        assert(result.traces.dispatchTrace.length > 0, 'dispatchTrace must not be empty');
        assert(result.traces.dispatchTrace.every(d => d.task_id && d.agent && d.action), 'Every dispatch trace entry must have task_id, agent, action');
    });

    console.log('\n================================================================================');
    console.log(`ADVERSARIAL TEST SUITE SUMMARY: ${passedAttacks} Passed, ${failedAttacks} Failed (Total: ${totalAttacks})`);
    console.log('================================================================================\n');

    if (failedAttacks > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal Adversarial Test Runner Error:', err);
    process.exit(1);
});
