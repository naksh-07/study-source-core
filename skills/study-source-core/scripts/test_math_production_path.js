/**
 * StudySourceCore Math Production Path Test Suite (`test_math_production_path.js`)
 * 
 * Verifies that the existing StudySourceCore architecture takes a realistic Math source
 * and evidence pack, routes through policy, dispatches math-apkg-author as the sole writer,
 * authors canonical StudyLab procedural content across multiple patterns and questions,
 * renders Questions.md, and passes independent validation without the test supplying
 * final canonical questions.
 * 
 * Test Sections:
 * 1. Unit & Component Verification (Specialist Parser, Synthesizer, Anti-Leak, MCQ Option Invariant)
 * 2. Multi-Pattern & "1 Pattern != 1 Question" Executable Proof
 * 3. Procedural Mode Isolation Matrix (markdown, apkg, both, none)
 * 4. Physical Artifact Ownership & Parent Self-Execution Ban
 * 5. Full Source-Driven End-to-End Production Pipeline (Source -> Evidence -> Routing -> Specialist -> Render -> Validator)
 * 6. Fail-Closed & Adversarial Invariant Enforcement
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { resolveSubjectPolicy } = require('./subject_policy_resolver');
const { evaluateArtifactRouting } = require('./routing_engine');
const { getCanonicalArtifactPaths, getVaultRoot } = require('./path_resolver');
const { getArtifactRegistry } = require('./artifact_registry');
const {
    buildExecutionTaskGraph,
    executeTaskWorkflow,
    createSpecialistTaskDispatcher,
    assertNoParentSelfExecution,
    validateStructuredHandoff
} = require('./orchestration_engine');

const { generateMathEvidencePack, computeSha256 } = require('./fixtures/generate_math_evidence_pack');
const {
    parseMathEvidence,
    authorMathProceduralContent,
    executeMathSpecialistTask
} = require('./author_math_studylab');

const {
    validateQuestionBank,
    validateQuestionBankContent,
    validateQuestionBankMarkdown,
    hintLeaksAnswer
} = require('./validate_studylab_question_bank');

const VAULT_ROOT = getVaultRoot(__dirname);
const FIXTURE_PATH = path.resolve(__dirname, '../resources/fixtures/math_lcm_hcf_source_fixture.json');
const SCRATCH_DIR = path.resolve(__dirname, 'scratch/math_production_path_tests');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(section, testId, description, fn) {
    totalTests++;
    process.stdout.write(`  [${section} / ${testId}] ${description} ... `);
    try {
        await fn();
        console.log('? PASS');
        passedTests++;
    } catch (err) {
        console.log('? FAIL');
        console.error(`     Error: ${err.message}`);
        failedTests++;
    }
}

async function main() {
    console.log('================================================================================');
    console.log('STUDYSOURCECORE ? GENUINELY SOURCE-DRIVEN MATH PRODUCTION PATH TEST SUITE');
    console.log('================================================================================\n');

    fs.mkdirSync(SCRATCH_DIR, { recursive: true });

    // =========================================================================
    // SECTION 1: UNIT & COMPONENT VERIFICATION
    // =========================================================================
    console.log('--- SECTION 1: Unit & Component Verification ---');

    await runTest('SEC-1', 'TEST-1.1', 'Realistic Math Source Fixture contains no pre-formed canonical Question Bank', () => {
        assert(fs.existsSync(FIXTURE_PATH), 'Fixture file must exist');
        const fixtureRaw = fs.readFileSync(FIXTURE_PATH, 'utf8');
        const fixture = JSON.parse(fixtureRaw);

        // Assert fixture contains raw source materials
        assert(fixture.concepts && fixture.concepts.length >= 2, 'Must contain raw concepts');
        assert(fixture.master_formulas && fixture.master_formulas.length >= 2, 'Must contain master formulas');
        assert(fixture.problem_patterns && fixture.problem_patterns.length >= 2, 'Must contain problem patterns');
        assert(fixture.source_problems && fixture.source_problems.length >= 4, 'Must contain source problems');

        // Assert fixture DOES NOT contain pre-formed canonical Question Bank objects
        assert.strictEqual(fixture.schema_version, undefined, 'Fixture must NOT contain schema_version');
        assert.strictEqual(fixture.questions, undefined, 'Fixture must NOT contain pre-compiled canonical questions array');
        for (const sp of fixture.source_problems) {
            assert.strictEqual(sp.recognition_signals, undefined, 'Raw problem must NOT pre-package recognition signals');
            assert.strictEqual(sp.expected_method, undefined, 'Raw problem must NOT pre-package expected method');
            assert.strictEqual(sp.decision_points, undefined, 'Raw problem must NOT pre-package decision points');
            assert.strictEqual(sp.hints, undefined, 'Raw problem must NOT pre-package 3-tier hints');
            assert.strictEqual(sp.solution, undefined, 'Raw problem must NOT pre-package canonical solution block');
            assert.strictEqual(sp.verification, undefined, 'Raw problem must NOT pre-package canonical verification block');
        }
    });

    await runTest('SEC-1', 'TEST-1.2', 'Specialist Parser parses raw source fixture and evidence pack identically', () => {
        const parsedFromFixture = parseMathEvidence(FIXTURE_PATH);
        assert.strictEqual(parsedFromFixture.chapter, 'LCM-HCF');
        assert.strictEqual(parsedFromFixture.subject, 'Math');
        assert.strictEqual(parsedFromFixture.problem_patterns.length, 2);
        assert.strictEqual(parsedFromFixture.source_problems.length, 5);

        // Generate markdown evidence pack
        const genRes = generateMathEvidencePack(FIXTURE_PATH, path.join(SCRATCH_DIR, 'evidence_gen'));
        const parsedFromMd = parseMathEvidence(genRes.markdownContent);

        assert.strictEqual(parsedFromMd.chapter, 'LCM-HCF');
        assert.strictEqual(parsedFromMd.problem_patterns.length, 2);
        assert.strictEqual(parsedFromMd.source_problems.length, 5);
    });

    await runTest('SEC-1', 'TEST-1.3', 'Specialist Synthesizer authors all 17 canonical dimensions from raw evidence', () => {
        const canonical = authorMathProceduralContent(FIXTURE_PATH);
        assert.strictEqual(canonical.schema_version, '1.0.0');
        assert.strictEqual(canonical.chapter, 'LCM-HCF');
        assert(canonical.questions.length >= 4, 'Must author at least 4 questions');

        const REQUIRED_DIMENSIONS = [
            'id', 'pattern_id', 'provenance', 'question_type', 'difficulty',
            'question', 'recognition_signals', 'expected_method', 'decision_points',
            'trap', 'error_category', 'hints', 'solution', 'verification', 'prerequisites'
        ];

        for (const q of canonical.questions) {
            for (const dim of REQUIRED_DIMENSIONS) {
                assert(q[dim] !== undefined && q[dim] !== null, `Question '${q.id}' missing required dimension '${dim}'`);
            }
            assert(q.hints.tier_1, 'Missing Hint Tier 1');
            assert(q.hints.tier_2, 'Missing Hint Tier 2');
            assert(q.hints.tier_3, 'Missing Hint Tier 3');
            assert(Array.isArray(q.recognition_signals) && q.recognition_signals.length > 0);
            assert(Array.isArray(q.decision_points) && q.decision_points.length > 0);
            assert(Array.isArray(q.error_category) && q.error_category.length > 0);
            assert(Array.isArray(q.prerequisites) && q.prerequisites.length > 0);
            assert(typeof q.solution === 'string' && q.solution.length > 10);
            assert(typeof q.verification === 'string' && q.verification.length > 10);
        }
    });

    await runTest('SEC-1', 'TEST-1.4', 'Strict Anti-Leak Invariant holds across all synthesized hints', () => {
        const canonical = authorMathProceduralContent(FIXTURE_PATH);
        for (const q of canonical.questions) {
            const answer = q.correct_answer;
            assert.strictEqual(hintLeaksAnswer(q.hints.tier_1, answer), false, `Tier 1 hint for '${q.id}' leaks answer '${answer}'`);
            assert.strictEqual(hintLeaksAnswer(q.hints.tier_2, answer), false, `Tier 2 hint for '${q.id}' leaks answer '${answer}'`);
        }
    });

    await runTest('SEC-1', 'TEST-1.5', 'MCQ Hard Invariant (>= 4 options, 1 valid answer) strictly verified', () => {
        const canonical = authorMathProceduralContent(FIXTURE_PATH);
        const mcqs = canonical.questions.filter(q => q.question_type === 'mcq');
        assert(mcqs.length >= 2, 'Should have at least 2 MCQs in source');
        for (const mcq of mcqs) {
            assert(Array.isArray(mcq.options) && mcq.options.length >= 4, `MCQ '${mcq.id}' must have >= 4 options`);
            assert(mcq.correct_option, `MCQ '${mcq.id}' must specify correct_option`);
            assert(mcq.options.includes(mcq.correct_option), `MCQ '${mcq.id}' correct_option must be one of the options`);
        }
    });

    // =========================================================================
    // SECTION 2: MULTI-PATTERN & "1 PATTERN != 1 QUESTION" PROOF
    // =========================================================================
    console.log('\n--- SECTION 2: Multi-Pattern & 1 Pattern != 1 Question Proof ---');

    await runTest('SEC-2', 'TEST-2.1', 'Executable Proof of 1 Pattern != 1 Question: number_of_patterns < number_of_questions', () => {
        const canonical = authorMathProceduralContent(FIXTURE_PATH);
        const numPatterns = canonical.patterns.length;
        const numQuestions = canonical.questions.length;

        assert.strictEqual(numPatterns, 2, 'Source fixture must contain exactly 2 distinct problem patterns');
        assert.strictEqual(numQuestions, 5, 'Source fixture must contain 5 authentic questions across the patterns');

        // Explicit Assertion of the Invariant
        assert(numPatterns < numQuestions, `1 Pattern != 1 Question invariant requires numPatterns (${numPatterns}) < numQuestions (${numQuestions})`);

        // Check distribution: each pattern must have > 1 question
        const patternCounts = {};
        for (const q of canonical.questions) {
            patternCounts[q.pattern_id] = (patternCounts[q.pattern_id] || 0) + 1;
        }

        assert(patternCounts['pat-math-lcm-prime-factorization'] >= 2, 'Pattern 1 must have >= 2 questions');
        assert(patternCounts['pat-math-lcm-product-identity'] >= 2, 'Pattern 2 must have >= 2 questions');
    });

    // =========================================================================
    // SECTION 3: PROCEDURAL MODE ISOLATION MATRIX
    // =========================================================================
    console.log('\n--- SECTION 3: Procedural Mode Isolation Matrix ---');

    await runTest('SEC-3', 'TEST-3.1', 'Mode markdown: Question Bank = ON, Procedural APKG = OFF', () => {
        const routing = evaluateArtifactRouting({
            subject: 'Math',
            chapter: 'LCM-HCF',
            artifactPolicy: { procedural_mode: 'markdown' }
        });
        assert.strictEqual(routing.proceduralQuestionBank, true, 'Question Bank must be ON in markdown mode');
        assert.strictEqual(routing.proceduralApkg, false, 'Procedural APKG must be OFF in markdown mode');
        assert.strictEqual(routing.suppressions.proceduralApkg, 'SUPPRESSED_BY_SUBJECT_POLICY');

        const graph = buildExecutionTaskGraph({
            subject: 'Math',
            chapter: 'LCM-HCF',
            specialist_agent: 'math-apkg-author',
            artifactPolicy: { procedural_mode: 'markdown' }
        });
        const qbTask = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');
        const apkgTask = graph.tasks.find(t => t.task_id === 'task-export-studylab-anki');
        assert.strictEqual(qbTask.status, 'PLANNED');
        assert.strictEqual(apkgTask.status, 'SKIPPED');
    });

    await runTest('SEC-3', 'TEST-3.2', 'Mode apkg: Question Bank = OFF, Procedural APKG = ON', () => {
        const routing = evaluateArtifactRouting({
            subject: 'Math',
            chapter: 'LCM-HCF',
            artifactPolicy: { procedural_mode: 'apkg' }
        });
        assert.strictEqual(routing.proceduralQuestionBank, false, 'Question Bank must be OFF in apkg mode');
        assert.strictEqual(routing.proceduralApkg, true, 'Procedural APKG must be ON in apkg mode');
        assert.strictEqual(routing.suppressions.proceduralQuestionBank, 'SUPPRESSED_BY_SUBJECT_POLICY');

        const graph = buildExecutionTaskGraph({
            subject: 'Math',
            chapter: 'LCM-HCF',
            specialist_agent: 'math-apkg-author',
            artifactPolicy: { procedural_mode: 'apkg' }
        });
        const qbTask = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');
        const apkgTask = graph.tasks.find(t => t.task_id === 'task-export-studylab-anki');
        assert.strictEqual(qbTask.status, 'SKIPPED');
        assert.strictEqual(apkgTask.status, 'PLANNED');
    });

    await runTest('SEC-3', 'TEST-3.3', 'Mode both: Question Bank = ON, Procedural APKG = ON', () => {
        const routing = evaluateArtifactRouting({
            subject: 'Math',
            chapter: 'LCM-HCF',
            artifactPolicy: { procedural_mode: 'both' }
        });
        assert.strictEqual(routing.proceduralQuestionBank, true, 'Question Bank must be ON in both mode');
        assert.strictEqual(routing.proceduralApkg, true, 'Procedural APKG must be ON in both mode');

        const graph = buildExecutionTaskGraph({
            subject: 'Math',
            chapter: 'LCM-HCF',
            specialist_agent: 'math-apkg-author',
            artifactPolicy: { procedural_mode: 'both' }
        });
        const qbTask = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');
        const apkgTask = graph.tasks.find(t => t.task_id === 'task-export-studylab-anki');
        assert.strictEqual(qbTask.status, 'PLANNED');
        assert.strictEqual(apkgTask.status, 'PLANNED');
    });

    await runTest('SEC-3', 'TEST-3.4', 'Mode none: Question Bank = OFF, Procedural APKG = OFF', () => {
        const routing = evaluateArtifactRouting({
            subject: 'Math',
            chapter: 'LCM-HCF',
            artifactPolicy: { procedural_mode: 'none' }
        });
        assert.strictEqual(routing.proceduralQuestionBank, false, 'Question Bank must be OFF in none mode');
        assert.strictEqual(routing.proceduralApkg, false, 'Procedural APKG must be OFF in none mode');

        const graph = buildExecutionTaskGraph({
            subject: 'Math',
            chapter: 'LCM-HCF',
            specialist_agent: 'math-apkg-author',
            artifactPolicy: { procedural_mode: 'none' }
        });
        const qbTask = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');
        const apkgTask = graph.tasks.find(t => t.task_id === 'task-export-studylab-anki');
        assert.strictEqual(qbTask.status, 'SKIPPED');
        assert.strictEqual(apkgTask.status, 'SKIPPED');
    });

    await runTest('SEC-3', 'TEST-3.5', 'Mode apkg: math-apkg-author strictly does NOT generate Markdown Questions.md', async () => {
        const apkgTestRoot = path.join(SCRATCH_DIR, 'apkg_mode_isolation');
        fs.mkdirSync(apkgTestRoot, { recursive: true });

        const task = {
            task_id: 'task-studylab-question-bank',
            track_key: 'proceduralQuestionBank',
            owner_agent: 'math-apkg-author',
            writer_agent: 'math-apkg-author',
            target_path: path.join(apkgTestRoot, 'Questions/LCM-HCF_Questions.md'),
            status: 'PLANNED'
        };

        const handoff = await executeMathSpecialistTask(task, {
            subject: 'Math',
            chapter: 'LCM-HCF',
            procedural_mode: 'apkg',
            sourceFixture: FIXTURE_PATH
        });

        assert(!fs.existsSync(task.target_path), 'Questions.md must NOT be created when procedural_mode=apkg');
    });

    await runTest('SEC-3', 'TEST-3.6', 'Mode none: math-apkg-author suppresses generation and creates no procedural deliverables', async () => {
        const noneTestRoot = path.join(SCRATCH_DIR, 'none_mode_isolation');
        fs.mkdirSync(noneTestRoot, { recursive: true });

        const task = {
            task_id: 'task-studylab-question-bank',
            track_key: 'proceduralQuestionBank',
            owner_agent: 'math-apkg-author',
            writer_agent: 'math-apkg-author',
            target_path: path.join(noneTestRoot, 'Questions/LCM-HCF_Questions.md'),
            status: 'PLANNED'
        };

        const handoff = await executeMathSpecialistTask(task, {
            subject: 'Math',
            chapter: 'LCM-HCF',
            procedural_mode: 'none',
            sourceFixture: FIXTURE_PATH
        });

        assert.strictEqual(handoff.status, 'SUPPRESSED');
        assert(!fs.existsSync(task.target_path), 'Questions.md must NOT be created when procedural_mode=none');
    });

    // =========================================================================
    // SECTION 4: PHYSICAL ARTIFACT OWNERSHIP & ANTI-PARENT EXECUTION
    // =========================================================================
    console.log('\n--- SECTION 4: Physical Artifact Ownership & Anti-Parent Execution ---');

    await runTest('SEC-4', 'TEST-4.1', 'Artifact Registry assigns proceduralQuestionBank to math-apkg-author', () => {
        const registry = getArtifactRegistry();
        const qbDef = registry.proceduralQuestionBank;
        assert.strictEqual(qbDef.task_id, 'task-studylab-question-bank');
        assert.strictEqual(qbDef.output_dir, 'Questions');
        assert.strictEqual(qbDef.file_pattern, '{chapter}_Questions.md');
        assert.strictEqual(qbDef.owner_agent, '$DOMAIN_SPECIALIST');
        assert.strictEqual(qbDef.writer_agent, '$DOMAIN_SPECIALIST');

        const graph = buildExecutionTaskGraph({
            subject: 'Math',
            chapter: 'LCM-HCF',
            specialist_agent: 'math-apkg-author'
        });
        const qbTask = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');
        assert.strictEqual(qbTask.owner_agent, 'math-apkg-author');
        assert.strictEqual(qbTask.writer_agent, 'math-apkg-author');
    });

    await runTest('SEC-4', 'TEST-4.2', 'Parent Orchestrator write attempt to Questions.md is strictly rejected', () => {
        const graph = buildExecutionTaskGraph({
            subject: 'Math',
            chapter: 'LCM-HCF',
            specialist_agent: 'math-apkg-author'
        });
        const qbTask = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');

        // Orchestrator attempts self-execution -> MUST throw PARENT_SELF_EXECUTION_VIOLATION
        assert.throws(() => {
            assertNoParentSelfExecution(qbTask, 'parent-orchestrator');
        }, /PARENT_SELF_EXECUTION_VIOLATION/);

        assert.throws(() => {
            assertNoParentSelfExecution(qbTask, 'study-source-core');
        }, /PARENT_SELF_EXECUTION_VIOLATION/);

        // Specialist execution -> MUST succeed
        assert.doesNotThrow(() => {
            assertNoParentSelfExecution(qbTask, 'math-apkg-author');
        });
    });

    // =========================================================================
    // SECTION 5: FULL SOURCE-DRIVEN END-TO-END PRODUCTION PIPELINE
    // =========================================================================
    console.log('\n--- SECTION 5: Full Source-Driven End-to-End Production Pipeline ---');

    await runTest('SEC-5', 'TEST-5.1', 'SOURCE -> EVIDENCE PACK -> Math Policy -> Routing -> math-apkg-author -> Questions.md -> Validator -> PASS', async () => {
        const testRoot = path.join(SCRATCH_DIR, 'e2e_production_test');
        fs.mkdirSync(testRoot, { recursive: true });

        // 1. Stage 1: Ingest source fixture & generate single immutable Evidence Pack
        const scratchEvidenceDir = path.join(testRoot, 'scratch');
        const genRes = generateMathEvidencePack(FIXTURE_PATH, scratchEvidenceDir);
        const evidencePath = path.join(scratchEvidenceDir, 'evidence-pack.md');

        assert(fs.existsSync(evidencePath), 'scratch/evidence-pack.md must exist');
        assert(genRes.evidenceHash && genRes.evidenceHash.length === 64, 'SHA-256 evidence hash must be computed');

        // 2. Stage 2: Policy & Deterministic Routing
        const policy = resolveSubjectPolicy('Math');
        assert.strictEqual(policy.procedural_mode, 'markdown');

        const routing = evaluateArtifactRouting({
            subject: 'Math',
            chapter: 'LCM-HCF',
            evidenceHash: genRes.evidenceHash
        });
        assert.strictEqual(routing.proceduralQuestionBank, true);
        assert.strictEqual(routing.proceduralApkg, false);

        // 3. Stage 3: Task Graph Construction
        const graph = buildExecutionTaskGraph({
            subject: 'Math',
            chapter: 'LCM-HCF',
            evidenceHash: genRes.evidenceHash,
            customRoot: testRoot,
            specialist_agent: 'math-apkg-author'
        });

        const qbTask = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');
        assert(qbTask, 'Question Bank task must exist in graph');
        assert.strictEqual(qbTask.owner_agent, 'math-apkg-author');
        assert.strictEqual(qbTask.writer_agent, 'math-apkg-author');
        assert(qbTask.target_path.endsWith(path.join('Questions', 'LCM-HCF_Questions.md')));

        // 4. Stage 4: Orchestration with Specialist Dispatcher
        // Note: The test DOES NOT supply the final canonical questions or rendered markdown!
        // math-apkg-author must perform the transformation itself.
        const dispatcher = createSpecialistTaskDispatcher({
            evidencePack: evidencePath,
            evidenceHash: genRes.evidenceHash,
            subject: 'Math',
            chapter: 'LCM-HCF',
            procedural_mode: 'markdown'
        });

        const workflowResult = await executeTaskWorkflow(graph, dispatcher);

        // 5. Assert completion and status
        assert.strictEqual(workflowResult.taskStatusMap['task-studylab-question-bank'], 'COMPLETED');

        // 6. Inspect Physical Deliverable on Disk
        const targetQuestionsFile = qbTask.target_path;
        assert(fs.existsSync(targetQuestionsFile), `Rendered file must exist on disk: ${targetQuestionsFile}`);

        const stat = fs.statSync(targetQuestionsFile);
        assert(stat.size > 1000, `Questions.md must have substantial content, got ${stat.size} bytes`);

        // 7. Independent Validator Verification on Disk
        const independentVal = validateQuestionBank(targetQuestionsFile);
        assert.strictEqual(independentVal.isValid, true, `Independent validation failed: ${independentVal.errors.join(', ')}`);
        assert.strictEqual(independentVal.errors.length, 0);

        // 8. Grounded Semantic Verification on Output
        const deliveredContent = fs.readFileSync(targetQuestionsFile, 'utf8');

        // Provenance Traceability
        assert(deliveredContent.includes('RRB ALP 2018') || deliveredContent.includes('RRB Group D'), 'Source exam provenance must be preserved');
        assert(deliveredContent.includes('pat-math-lcm-prime-factorization'), 'Pattern 1 must be present in output');
        assert(deliveredContent.includes('pat-math-lcm-product-identity'), 'Pattern 2 must be present in output');

        // 1 Pattern != 1 Question proof in output
        assert(deliveredContent.includes('math-q-001'), 'math-q-001 must exist');
        assert(deliveredContent.includes('math-q-002'), 'math-q-002 must exist');
        assert(deliveredContent.includes('math-q-003'), 'math-q-003 must exist');
        assert(deliveredContent.includes('math-q-004'), 'math-q-004 must exist');
        assert(deliveredContent.includes('math-q-005'), 'math-q-005 must exist');

        // Verification callouts and Progressive hints
        assert(deliveredContent.includes('> [!tip]- Tier 1: Conceptual Approach'), 'Tier 1 hint callout must exist');
        assert(deliveredContent.includes('> [!tip]- Tier 2: Strategy & Setup'), 'Tier 2 hint callout must exist');
        assert(deliveredContent.includes('> [!tip]- Tier 3: Step-by-Step Method'), 'Tier 3 hint callout must exist');
        assert(deliveredContent.includes('### Verification'), 'Verification section must exist');
    });

    // =========================================================================
    // SECTION 6: FAIL-CLOSED & ADVERSARIAL INVARIANT ENFORCEMENT
    // =========================================================================
    console.log('\n--- SECTION 6: Fail-Closed & Adversarial Invariants ---');

    await runTest('SEC-6', 'TEST-6.1', 'Fail-Closed: Empty practice questions in source rejects generation', () => {
        const emptySource = {
            chapter: 'EmptyMath',
            domain: 'Mathematics',
            subject: 'Math',
            problem_patterns: [{ pattern_id: 'p1' }],
            source_problems: []
        };
        assert.throws(() => {
            authorMathProceduralContent(emptySource);
        }, /ZERO_SOLVABLE_PRACTICE_QUESTIONS/);
    });

    await runTest('SEC-6', 'TEST-6.2', 'Fail-Closed: MCQ with < 4 options throws MCQ_INVARIANT_VIOLATION', () => {
        const invalidMcqSource = {
            chapter: 'BadMCQ',
            domain: 'Mathematics',
            subject: 'Math',
            problem_patterns: [{ pattern_id: 'p1' }],
            source_problems: [{
                source_id: 'bad-1',
                raw_type: 'mcq',
                statement: 'Short MCQ',
                options: ['A', 'B', 'C'], // Only 3 options!
                correct_answer: 'A'
            }]
        };
        assert.throws(() => {
            authorMathProceduralContent(invalidMcqSource);
        }, /MCQ_INVARIANT_VIOLATION/);
    });

    await runTest('SEC-6', 'TEST-6.3', 'Fail-Closed: Hint answer leakage caught and rejected by validator', () => {
        const leakingQb = authorMathProceduralContent(FIXTURE_PATH);
        // Deliberately tamper with hint to leak the answer
        leakingQb.questions[0].hints.tier_1 = `The final answer is ${leakingQb.questions[0].correct_answer}.`;

        const valRes = validateQuestionBankContent(leakingQb);
        assert.strictEqual(valRes.isValid, false);
        assert(valRes.errors.some(e => e.includes('HINT_ANSWER_LEAKAGE')));
    });

    await runTest('SEC-6', 'TEST-6.4', 'Fail-Closed: Missing provenance origin caught and rejected by validator', () => {
        const badProvQb = authorMathProceduralContent(FIXTURE_PATH);
        delete badProvQb.questions[0].provenance.origin;

        const valRes = validateQuestionBankContent(badProvQb);
        assert.strictEqual(valRes.isValid, false);
        assert(valRes.errors.some(e => e.includes('MISSING_PROVENANCE')));
    });

    await runTest('SEC-6', 'TEST-6.5', 'Fail-Closed: Duplicate question IDs caught and rejected by validator', () => {
        const dupQb = authorMathProceduralContent(FIXTURE_PATH);
        dupQb.questions[1].id = dupQb.questions[0].id; // Duplicate ID!

        const valRes = validateQuestionBankContent(dupQb);
        assert.strictEqual(valRes.isValid, false);
        assert(valRes.errors.some(e => e.includes('DUPLICATE_QUESTION_ID')));
    });

    await runTest('SEC-6', 'TEST-6.6', 'Fail-Closed: Missing hints (Tier 1/2/3) caught and rejected by validator', () => {
        const noHintQb = authorMathProceduralContent(FIXTURE_PATH);
        delete noHintQb.questions[0].hints.tier_1;

        const valRes = validateQuestionBankContent(noHintQb);
        assert.strictEqual(valRes.isValid, false);
        assert(valRes.errors.some(e => e.includes('missing Hint Tier 1')));
    });

    await runTest('SEC-6', 'TEST-6.7', 'Fail-Closed: Unsupported question type caught and rejected by validator', () => {
        const badTypeQb = authorMathProceduralContent(FIXTURE_PATH);
        badTypeQb.questions[0].question_type = 'unsupported_essay_type';

        const valRes = validateQuestionBankContent(badTypeQb);
        assert.strictEqual(valRes.isValid, false);
        assert(valRes.errors.some(e => e.includes('INVALID_QUESTION_TYPE')));
    });

    await runTest('SEC-6', 'TEST-6.8', 'Fail-Closed: Wrong specialist identity attempting to execute Math task throws OWNERSHIP_VIOLATION', async () => {
        const task = {
            task_id: 'task-studylab-question-bank',
            track_key: 'proceduralQuestionBank',
            owner_agent: 'physics-numerical-apkg-author', // Wrong specialist!
            writer_agent: 'physics-numerical-apkg-author',
            target_path: path.join(SCRATCH_DIR, 'wrong_agent_test.md')
        };

        await assert.rejects(async () => {
            await executeMathSpecialistTask(task, { subject: 'Math', chapter: 'LCM-HCF' });
        }, /OWNERSHIP_VIOLATION/);
    });

    console.log('\n================================================================================');
    console.log(`MATH PRODUCTION PATH SUMMARY: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
    console.log('================================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal Test Runner Error:', err);
    process.exit(1);
});
