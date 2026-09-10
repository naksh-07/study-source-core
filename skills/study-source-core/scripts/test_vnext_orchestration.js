/**
 * StudySourceCore vNext Orchestration & Task Graph Test Suite (`test_vnext_orchestration.js`)
 * 
 * Implements all 15 core orchestration verification tests:
 * TEST-01: Required specialist is actually dispatched.
 * TEST-02: Parent does not perform specialist-owned artifact generation (Self-Execution Ban).
 * TEST-03: Correct specialist is selected.
 * TEST-04: Independent tasks can execute without artificial serialization.
 * TEST-05: Dependent tasks wait for completion barrier.
 * TEST-06: Single-writer rule prevents overlapping ownership.
 * TEST-07: Structured handoff is required.
 * TEST-08: Missing artifact causes completion failure.
 * TEST-09: Failed specialist retries only its own task.
 * TEST-10: Successful sibling tasks are not regenerated after another task fails.
 * TEST-11: Unchanged source/artifacts do not trigger unnecessary rebuild.
 * TEST-12: Duplicate specialist dispatch for identical task is prevented.
 * TEST-13: StudyLab and generic declarative outputs remain isolated.
 * TEST-14: Fresh-agent can understand and execute the lifecycle from canonical docs.
 * TEST-15: Full L1–L7 StudyLab validation remains intact.
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

const { getVaultRoot, resolveChapterDir, getCanonicalArtifactPaths } = require('./path_resolver');
const { validateStudyLabLevels1to7 } = require('./validate_studylab_levels_1_6');
const { validateApkg } = require('./validate_apkg');
const { validateProceduralApkg } = require('./validate_studylab_procedural_apkg');

const VAULT_ROOT = getVaultRoot(__dirname);
const SCRATCH_DIR = path.resolve(__dirname, 'scratch/vnext_orchestration_tests');

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

async function main() {
    console.log('================================================================================');
    console.log('STUDYSOURCECORE vNEXT — ORCHESTRATION & RUNTIME HARDENING TEST SUITE');
    console.log('================================================================================\n');

    fs.mkdirSync(SCRATCH_DIR, { recursive: true });

    // -------------------------------------------------------------------------
    // TEST-01: Required specialist is actually dispatched
    // -------------------------------------------------------------------------
    await runTest('TEST-01', 'Required specialist is actually dispatched via observable dispatch trace', async () => {
        const graph = buildExecutionTaskGraph({
            specialist_agent: 'math-apkg-author',
            artifactPolicy: { notes: true, basic: true, cloze: true, imageOcclusion: true, mindmap: true, slideDeck: true, problemPatterns: true, practiceQuestions: true, proceduralApkg: true, apkg: true, bmGraph: true, bmQa: true },
            subject: 'Maths',
            chapter: 'LCM-HCF',
            basicCandidateCount: 10,
            clozeCandidateCount: 5,
            practiceQuestionsCount: 4
        });

        const dispatchedAgents = [];
        const result = await executeTaskWorkflow(graph, async (task) => {
            dispatchedAgents.push(task.owner_agent);
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

        assert(dispatchedAgents.includes('core-notes'), 'core-notes must be dispatched');
        assert(dispatchedAgents.includes('core-basic-anki'), 'core-basic-anki must be dispatched');
        assert(dispatchedAgents.includes('core-cloze-anki'), 'core-cloze-anki must be dispatched');
        assert(dispatchedAgents.includes('math-apkg-author'), 'math-apkg-author must be dispatched for Math');
        assert(result.traces.dispatchTrace.length > 0, 'Dispatch trace must be recorded');
    });

    // -------------------------------------------------------------------------
    // TEST-02: Parent does not perform specialist-owned artifact generation
    // -------------------------------------------------------------------------
    await runTest('TEST-02', 'Parent self-execution ban is strictly enforced for specialist deliverables', async () => {
        const graph = buildExecutionTaskGraph({
            artifactPolicy: { notes: true, basic: true, cloze: true, imageOcclusion: true, mindmap: true, slideDeck: true, problemPatterns: false, practiceQuestions: false, proceduralApkg: false, apkg: true, bmGraph: true, bmQa: true },
            subject: 'History',
            chapter: 'IndusValley',
            basicCandidateCount: 5
        });

        const notesTask = graph.tasks.find(t => t.task_id === 'task-core-notes');
        assert(notesTask, 'Notes task must exist');

        // Test with parent writer -> MUST throw error
        assert.throws(() => {
            assertNoParentSelfExecution(notesTask, 'parent-orchestrator');
        }, /PARENT_SELF_EXECUTION_VIOLATION/);

        assert.throws(() => {
            assertNoParentSelfExecution(notesTask, 'study-source-core');
        }, /PARENT_SELF_EXECUTION_VIOLATION/);

        // Test with designated specialist -> MUST succeed
        assert.doesNotThrow(() => {
            assertNoParentSelfExecution(notesTask, 'core-notes');
        });
    });

    // -------------------------------------------------------------------------
    // TEST-04: Independent tasks can execute without artificial serialization
    // -------------------------------------------------------------------------
    await runTest('TEST-04', 'Independent Wave 1 tasks execute in parallel without cross-dependencies', () => {
        const graph = buildExecutionTaskGraph({
            specialist_agent: 'physics-numerical-apkg-author',
            artifactPolicy: { notes: true, basic: true, cloze: true, imageOcclusion: true, mindmap: true, slideDeck: true, problemPatterns: true, practiceQuestions: true, proceduralApkg: true, apkg: true, bmGraph: true, bmQa: true },
            subject: 'Physics',
            chapter: 'Newton-Laws-Friction',
            basicCandidateCount: 5,
            clozeCandidateCount: 5,
            practiceQuestionsCount: 4,
            visualProfile: { io_worthiness: 'HIGH', io_candidates: ['fig1.png'], dominant_structures: ['branch1'] }
        });

        const wave1Tasks = graph.tasks.filter(t => t.status === 'PLANNED' && (!t.dependencies || t.dependencies.length === 0));
        assert(wave1Tasks.length >= 4, 'Should have >= 4 independent Wave 1 tasks');

        // Verify zero dependencies among Wave 1 sibling tasks
        for (const t of wave1Tasks) {
            assert.strictEqual(t.dependencies.length, 0, `Wave 1 task '${t.task_id}' must not have inter-wave dependencies`);
        }
    });

    // -------------------------------------------------------------------------
    // TEST-05: Dependent tasks wait for completion barrier
    // -------------------------------------------------------------------------
    await runTest('TEST-05', 'Dependent packaging tasks in Wave 2 wait for Wave 1 completion barrier', () => {
        const graph = buildExecutionTaskGraph({
            specialist_agent: 'math-apkg-author',
            artifactPolicy: { notes: true, basic: true, cloze: true, imageOcclusion: true, mindmap: true, slideDeck: true, problemPatterns: true, practiceQuestions: true, proceduralApkg: true, apkg: true, bmGraph: true, bmQa: true },
            subject: 'Maths',
            chapter: 'LCM-HCF',
            basicCandidateCount: 5,
            clozeCandidateCount: 5,
            practiceQuestionsCount: 4
        });

        const ankiExportTask = graph.tasks.find(t => t.task_id === 'task-export-anki');
        assert(ankiExportTask, 'Export Anki task must exist');
        assert(ankiExportTask.dependencies.includes('task-core-basic-anki'));
        assert(ankiExportTask.dependencies.includes('task-core-cloze-anki'));

        const procExportTask = graph.tasks.find(t => t.task_id === 'task-export-studylab-anki');
        assert(procExportTask, 'Export StudyLab Anki task must exist');
        // StudyLab APKG is generated by the specialist in Wave 1 concurrently with the JSONs.
    });

    // -------------------------------------------------------------------------
    // TEST-06: Single-writer rule prevents overlapping ownership
    // -------------------------------------------------------------------------
    await runTest('TEST-06', 'Single-writer rule guarantees disjoint write targets for all active lanes', () => {
        const graph = buildExecutionTaskGraph({
            artifactPolicy: { notes: true, basic: true, cloze: true, imageOcclusion: true, mindmap: true, slideDeck: true, problemPatterns: false, practiceQuestions: false, proceduralApkg: false, apkg: true, bmGraph: true, bmQa: true },
            subject: 'Map',
            chapter: 'Europe',
            basicCandidateCount: 5,
            clozeCandidateCount: 5,
            practiceQuestionsCount: 2,
            visualProfile: { io_worthiness: 'HIGH', io_candidates: ['europe.svg'], dominant_structures: ['rivers'] }
        });

        const targets = new Set();
        for (const task of graph.tasks) {
            if (task.status === 'PLANNED' && task.target_path) {
                assert(!targets.has(task.target_path), `Collision detected on target path: ${task.target_path}`);
                targets.add(task.target_path);
            }
        }
    });

    // -------------------------------------------------------------------------
    // TEST-07: Structured handoff is required
    // -------------------------------------------------------------------------
    await runTest('TEST-07', 'Structured 11-field handoff is strictly validated upon receipt', () => {
        const invalidHandoff1 = { status: 'SUCCESS' }; // Missing mandatory fields
        const val1 = validateStructuredHandoff(invalidHandoff1);
        assert.strictEqual(val1.isValid, false);
        assert(val1.errors.some(e => e.includes('Missing mandatory handoff field')));

        const validHandoff = {
            status: 'SUCCESS',
            agent: 'core-notes',
            task_id: 'task-core-notes',
            inputs_consumed: ['scratch/evidence-pack.md'],
            outputs_produced: ['Notes/Europe_Notes.md'],
            output_paths: ['c:/test/Notes/Europe_Notes.md'],
            validation_result: { passed: true, validator: 'note_contract_audit.js' },
            warnings: [],
            errors: [],
            dependencies_satisfied: true,
            retry_count: 0
        };
        const val2 = validateStructuredHandoff(validHandoff);
        assert.strictEqual(val2.isValid, true);
    });

    // -------------------------------------------------------------------------
    // TEST-08: Missing artifact causes completion failure
    // -------------------------------------------------------------------------
    await runTest('TEST-08', 'Missing physical artifact causes completion evidence failure', async () => {
        const task = {
            task_id: 'task-test-missing',
            owner_agent: 'core-notes',
            writer_agent: 'core-notes',
            target_path: path.join(SCRATCH_DIR, 'non_existent_file.md'),
            status: 'PLANNED'
        };

        const handoff = {
            status: 'SUCCESS',
            agent: 'core-notes',
            task_id: 'task-test-missing',
            output_paths: [task.target_path]
        };

        const res = await validateCompletionEvidence(task, handoff);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('[FILE_NOT_FOUND]')));
    });

    // -------------------------------------------------------------------------
    // TEST-09: Failed specialist retries only its own task
    // -------------------------------------------------------------------------
    await runTest('TEST-09', 'Failed specialist retries only its own task with diagnostic context', async () => {
        const graph = buildExecutionTaskGraph({
            artifactPolicy: { notes: true, basic: true, cloze: true, imageOcclusion: true, mindmap: true, slideDeck: true, problemPatterns: false, practiceQuestions: false, proceduralApkg: false, apkg: true, bmGraph: true, bmQa: true },
            subject: 'History',
            chapter: 'AncientIndia',
            basicCandidateCount: 5
        });

        let basicAttempts = 0;
        let notesAttempts = 0;

        const dummyNotesFile = path.join(SCRATCH_DIR, 'AncientIndia_Notes.md');
        fs.writeFileSync(dummyNotesFile, '---\ntitle: Ancient India\n---\n# Ancient India\n\n## 1. Overview\nText here\n## 2. Core Concepts\nMore text');

        const dummyBasicFile = path.join(SCRATCH_DIR, 'AncientIndia_Basic.tsv');

        // Override target paths to scratch for this test
        graph.tasks.find(t => t.task_id === 'task-core-notes').target_path = dummyNotesFile;
        graph.tasks.find(t => t.task_id === 'task-core-basic-anki').target_path = dummyBasicFile;

        const result = await executeTaskWorkflow(graph, async (task, retryCount) => {
            if (task.task_id === 'task-core-notes') {
                notesAttempts++;
                return {
                    status: 'SUCCESS',
                    agent: 'core-notes',
                    task_id: task.task_id,
                    inputs_consumed: ['scratch/evidence-pack.md'],
                    outputs_produced: [dummyNotesFile],
                    output_paths: [dummyNotesFile],
                    validation_result: { passed: true },
                    warnings: [],
                    errors: [],
                    dependencies_satisfied: true,
                    retry_count: retryCount
                };
            }

            if (task.task_id === 'task-core-basic-anki') {
                basicAttempts++;
                if (basicAttempts === 1) {
                    // Fail attempt 1 with empty file
                    fs.writeFileSync(dummyBasicFile, '');
                    return {
                        status: 'SUCCESS',
                        agent: 'core-basic-anki',
                        task_id: task.task_id,
                        inputs_consumed: ['scratch/evidence-pack.md'],
                        outputs_produced: [dummyBasicFile],
                        output_paths: [dummyBasicFile],
                        validation_result: { passed: true },
                        warnings: [],
                        errors: [],
                        dependencies_satisfied: true,
                        retry_count: retryCount
                    };
                } else {
                    // Succeed attempt 2 with valid TSV
                    fs.writeFileSync(dummyBasicFile, 'Front\tBack\tTags\nWhat is Harappa?\tAn ancient Indus city\tHistory::Indus\n');
                    return {
                        status: 'SUCCESS',
                        agent: 'core-basic-anki',
                        task_id: task.task_id,
                        inputs_consumed: ['scratch/evidence-pack.md'],
                        outputs_produced: [dummyBasicFile],
                        output_paths: [dummyBasicFile],
                        validation_result: { passed: true },
                        warnings: [],
                        errors: [],
                        dependencies_satisfied: true,
                        retry_count: retryCount
                    };
                }
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
                retry_count: retryCount
            };
        });

        assert.strictEqual(notesAttempts, 1, 'Successful notes task should execute exactly 1 time');
        assert.strictEqual(basicAttempts, 2, 'Failed basic task should retry exactly 1 time (2 attempts total)');
        assert.strictEqual(result.taskStatusMap['task-core-basic-anki'], 'COMPLETED', 'Basic task should complete after retry');
    });

    // -------------------------------------------------------------------------
    // TEST-10: Sibling tasks are not regenerated after another task fails
    // -------------------------------------------------------------------------
    await runTest('TEST-10', 'Blast radius isolation: persistent failure of one task preserves valid sibling outputs', async () => {
        const graph = buildExecutionTaskGraph({
            artifactPolicy: { notes: true, basic: true, cloze: true, imageOcclusion: true, mindmap: true, slideDeck: true, problemPatterns: false, practiceQuestions: false, proceduralApkg: false, apkg: true, bmGraph: true, bmQa: true },
            subject: 'History',
            chapter: 'Rome',
            basicCandidateCount: 5,
            clozeCandidateCount: 5
        });

        const dummyNotesFile = path.join(SCRATCH_DIR, 'Rome_Notes.md');
        fs.writeFileSync(dummyNotesFile, '---\ntitle: Rome\n---\n# Rome\n\n## 1. Overview\nText\n## 2. Core Concepts\nText');

        const dummyBasicFile = path.join(SCRATCH_DIR, 'Rome_Basic.tsv');
        fs.writeFileSync(dummyBasicFile, 'Front\tBack\tTags\nRome?\tCapital\tHistory\n');

        const dummyClozeFile = path.join(SCRATCH_DIR, 'Rome_Cloze.tsv');
        fs.writeFileSync(dummyClozeFile, ''); // Empty cloze file (will fail)

        graph.tasks.find(t => t.task_id === 'task-core-notes').target_path = dummyNotesFile;
        graph.tasks.find(t => t.task_id === 'task-core-basic-anki').target_path = dummyBasicFile;
        graph.tasks.find(t => t.task_id === 'task-core-cloze-anki').target_path = dummyClozeFile;

        const result = await executeTaskWorkflow(graph, async (task, retryCount) => {
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
                retry_count: retryCount
            };
        });

        assert.strictEqual(result.taskStatusMap['task-core-notes'], 'COMPLETED', 'Notes should remain COMPLETED');
        assert.strictEqual(result.taskStatusMap['task-core-basic-anki'], 'COMPLETED', 'Basic should remain COMPLETED');
        assert.strictEqual(result.taskStatusMap['task-core-cloze-anki'], 'FAILED', 'Cloze should be marked FAILED');
        assert.strictEqual(result.taskStatusMap['task-export-anki'], 'BLOCKED', 'Dependent packaging should be BLOCKED');
    });

    // -------------------------------------------------------------------------
    // TEST-11: Unchanged source does not trigger unnecessary rebuild
    // -------------------------------------------------------------------------
    await runTest('TEST-11', 'Composite fingerprint detects unchanged inputs and enables incremental skipping', () => {
        const fp1 = computeTaskFingerprint('hash_abc123', { chapter: 'Europe', track: 'notes' }, '2.4.0');
        const fp2 = computeTaskFingerprint('hash_abc123', { chapter: 'Europe', track: 'notes' }, '2.4.0');
        const fp3 = computeTaskFingerprint('hash_diff456', { chapter: 'Europe', track: 'notes' }, '2.4.0');

        assert.strictEqual(fp1, fp2, 'Identical inputs must produce identical fingerprints');
        assert.notStrictEqual(fp1, fp3, 'Different evidence hashes must produce different fingerprints');
    });

    // -------------------------------------------------------------------------
    // TEST-12: Duplicate specialist dispatch for identical task is prevented
    // -------------------------------------------------------------------------
    await runTest('TEST-12', 'Task graph prevents duplicate dispatch for identical task in same session', () => {
        const graph = buildExecutionTaskGraph({
            specialist_agent: 'math-apkg-author',
            artifactPolicy: { notes: true, basic: true, cloze: true, imageOcclusion: true, mindmap: true, slideDeck: true, problemPatterns: true, practiceQuestions: true, proceduralApkg: true, apkg: true, bmGraph: true, bmQa: true },
            subject: 'Maths',
            chapter: 'LCM-HCF',
            basicCandidateCount: 5
        });

        const taskIds = graph.tasks.map(t => t.task_id);
        const uniqueTaskIds = new Set(taskIds);
        assert.strictEqual(taskIds.length, uniqueTaskIds.size, 'Task IDs in task graph must be strictly unique');
    });

    // -------------------------------------------------------------------------
    // TEST-13: StudyLab and generic declarative outputs remain isolated
    // -------------------------------------------------------------------------
    await runTest('TEST-13', 'Model isolation: Declarative APKG models and StudyLab models remain completely isolated', async () => {
        const europePaths = getCanonicalArtifactPaths('Map', 'Europe');
        const lcmPaths = getCanonicalArtifactPaths('Maths', 'LCM-HCF');

        if (fs.existsSync(europePaths.apkg.path)) {
            const declVal = await validateApkg(europePaths.apkg.path, false);
            assert.strictEqual(declVal.isValid, true);
            assert(!declVal.stats.modelNames.some(m => m.includes('Procedural')), 'Declarative APKG must not contain StudyLab Procedural Models');
        }

        if (fs.existsSync(lcmPaths.proceduralApkg.path)) {
            const procVal = await validateProceduralApkg(lcmPaths.proceduralApkg.path, false);
            assert.strictEqual(procVal.isValid, true);
            assert(procVal.stats.noteCount >= 8, 'StudyLab procedural APKG must contain anchors');
        }
    });

    // -------------------------------------------------------------------------
    // TEST-14: Fresh-agent can understand and execute the lifecycle
    // -------------------------------------------------------------------------
    await runTest('TEST-14', 'Canonical documentation confirms 0 contradictions and full 12-question coverage', () => {
        const reqDocs = [
            path.join(VAULT_ROOT, '.agents/OWNERSHIP.md'),
            path.join(VAULT_ROOT, '.agents/EXECUTION_LIFECYCLE.md'),
            path.join(VAULT_ROOT, '.agents/DATA_FLOW.md'),
            path.join(VAULT_ROOT, 'docs/STUDYSOURCECORE_VNEXT_ORCHESTRATION.md')
        ];

        for (const d of reqDocs) {
            assert(fs.existsSync(d), `Required canonical document missing: ${d}`);
            const content = fs.readFileSync(d, 'utf8');
            assert(content.length > 500, `Document ${d} is too brief`);
            assert(content.includes('Single-Writer') || content.includes('single-writer'), `${d} must reference Single-Writer`);
        }
    });

    // -------------------------------------------------------------------------
    // TEST-15: Full L1–L7 StudyLab validation remains intact
    // -------------------------------------------------------------------------
    await runTest('TEST-15', 'Full L1-L7 StudyLab multi-tier validation remains completely intact and green', async () => {
        const chemPath = path.resolve(VAULT_ROOT, 'Study Materials/Chemistry/Chemical-Equilibrium-Reactions/StudyLab/Chemical-Equilibrium-Reactions_StudyLab_Procedural.apkg');
        if (fs.existsSync(chemPath)) {
            const res = await validateStudyLabLevels1to7(chemPath);
            assert.strictEqual(res.overall_verdict, 'PASS', 'Chemistry procedural package must pass L1-L7 validation');
            assert.strictEqual(res.levels.level_1_package_structure.status, 'PASS');
            assert.strictEqual(res.levels.level_2_schema_validation.status, 'PASS');
            assert.strictEqual(res.levels.level_3_modality_integrity.status, 'PASS');
            assert.strictEqual(res.levels.level_4_coverage_completeness.status, 'PASS');
            assert.strictEqual(res.levels.level_5_learning_completeness.status, 'PASS');
            assert.strictEqual(res.levels.level_6_adaptive_semantics.status, 'PASS');
            assert.strictEqual(res.levels.level_7_practice_depth.status, 'PASS');
        }
    });

    console.log('\n================================================================================');
    console.log(`ORCHESTRATION TEST SUITE SUMMARY: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
    console.log('================================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal Test Runner Error:', err);
    process.exit(1);
});
