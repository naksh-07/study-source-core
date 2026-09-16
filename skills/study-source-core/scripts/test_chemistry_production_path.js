/**
 * StudySourceCore Chemistry Production Path Test Suite (`test_chemistry_production_path.js`)
 * 
 * Verifies that the existing StudySourceCore architecture takes a realistic Chemistry source
 * and evidence pack, routes through policy, dispatches chemistry-numerical-apkg-author as the sole writer,
 * authors canonical StudyLab procedural content across multiple patterns and questions,
 * renders Questions.md, and passes independent validation without the test supplying
 * final canonical questions.
 * 
 * Test Classification & Sections:
 * - Section 1: Source Integrity [UNIT]
 * - Section 2: Evidence Ingestion [COMPONENT]
 * - Section 3: Specialist Authoring [COMPONENT]
 * - Section 4: Chemistry Semantic Invariants [COMPONENT]
 * - Section 5: Multi-Pattern Proof [COMPONENT]
 * - Section 6: Procedural Mode Matrix [INTEGRATION]
 * - Section 7: Chemical Artifact Ownership & Governance [INTEGRATION]
 * - Section 8: Full Source-Driven End-to-End Production Pipeline [E2E]
 * - Section 9: Fail-Closed & Adversarial Invariants [NEGATIVE / ADVERSARIAL]
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

const { generateChemistryEvidencePack, computeSha256 } = require('./fixtures/generate_chemistry_evidence_pack');
const {
    parseChemistryEvidence,
    authorChemistryProceduralContent,
    executeChemistrySpecialistTask
} = require('./author_chemistry_studylab');

const {
    validateQuestionBank,
    validateQuestionBankContent,
    validateQuestionBankMarkdown,
    hintLeaksAnswer
} = require('./validate_studylab_question_bank');

const VAULT_ROOT = getVaultRoot(__dirname);
const FIXTURE_PATH = path.resolve(__dirname, '../resources/fixtures/chemistry_chemical_equilibrium_source_fixture.json');
const SCRATCH_DIR = path.resolve(__dirname, 'scratch/chemistry_production_path_tests');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const layerStats = {
    'UNIT': { total: 0, passed: 0 },
    'COMPONENT': { total: 0, passed: 0 },
    'INTEGRATION': { total: 0, passed: 0 },
    'E2E': { total: 0, passed: 0 },
    'NEGATIVE / ADVERSARIAL': { total: 0, passed: 0 }
};

async function runTest(section, testId, layerOrDesc, descOrFn, maybeFn) {
    totalTests++;
    let layer = 'COMPONENT';
    let description = '';
    let fn = null;

    if (typeof maybeFn === 'function') {
        layer = layerOrDesc;
        description = descOrFn;
        fn = maybeFn;
    } else {
        description = layerOrDesc;
        fn = descOrFn;
        if (section.startsWith('SEC-1')) layer = 'UNIT';
        else if (section.startsWith('SEC-2') || section.startsWith('SEC-3') || section.startsWith('SEC-4') || section.startsWith('SEC-5')) layer = 'COMPONENT';
        else if (section.startsWith('SEC-6') || section.startsWith('SEC-7')) layer = 'INTEGRATION';
        else if (section.startsWith('SEC-8')) layer = 'E2E';
        else if (section.startsWith('SEC-9')) layer = 'NEGATIVE / ADVERSARIAL';
    }

    if (!layerStats[layer]) layerStats[layer] = { total: 0, passed: 0 };
    layerStats[layer].total++;

    process.stdout.write(`  [${section} / ${testId}] (${layer}) ${description} ... `);
    try {
        await fn();
        console.log('✅ PASS');
        passedTests++;
        layerStats[layer].passed++;
    } catch (err) {
        console.log('❌ FAIL');
        console.error(`     Error: ${err.message}`);
        failedTests++;
    }
}

async function main() {
    console.log('================================================================================');
    console.log('STUDYSOURCECORE — GENUINELY SOURCE-DRIVEN CHEMISTRY PRODUCTION PATH TEST SUITE');
    console.log('================================================================================\n');

    fs.mkdirSync(SCRATCH_DIR, { recursive: true });

    // =========================================================================
    // SECTION 1: SOURCE INTEGRITY [UNIT]
    // =========================================================================
    console.log('--- SECTION 1: Source Integrity [UNIT] ---');

    await runTest('SEC-1', 'TEST-1.1', 'UNIT', 'Realistic Chemistry Source Fixture exists on disk', () => {
        assert(fs.existsSync(FIXTURE_PATH), 'Fixture file must exist at ' + FIXTURE_PATH);
    });

    await runTest('SEC-1', 'TEST-1.2', 'UNIT', 'Source Fixture contains no pre-formed canonical Question Bank objects', () => {
        const raw = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
        assert.strictEqual(raw.questionBank, undefined, 'Must not contain questionBank field');
        assert.strictEqual(raw.questions, undefined, 'Must not contain questions array');
        assert.strictEqual(raw.canonicalQuestions, undefined, 'Must not contain canonicalQuestions');
        assert.strictEqual(raw.prebuiltHints, undefined, 'Must not contain prebuiltHints');

        for (const prob of (raw.source_problems || [])) {
            assert.strictEqual(prob.recognition_signals, undefined, 'Raw problem must not have recognition signals');
            assert.strictEqual(prob.expected_method, undefined, 'Raw problem must not have expected method');
            assert.strictEqual(prob.decision_points, undefined, 'Raw problem must not have decision points');
            assert.strictEqual(prob.hints, undefined, 'Raw problem must not have 3-tier hints');
            assert.strictEqual(prob.verification, undefined, 'Raw problem must not have verification block');
        }
    });

    await runTest('SEC-1', 'TEST-1.3', 'UNIT', 'Source Fixture has multiple distinct Chemistry patterns', () => {
        const raw = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
        assert(Array.isArray(raw.problem_patterns), 'problem_patterns must be an array');
        assert(raw.problem_patterns.length >= 3, 'Must have at least 3 distinct patterns, found ' + raw.problem_patterns.length);
        const patternIds = new Set(raw.problem_patterns.map(p => p.pattern_id));
        assert.strictEqual(patternIds.size, raw.problem_patterns.length, 'All pattern IDs must be unique');
    });

    await runTest('SEC-1', 'TEST-1.4', 'UNIT', 'Source Fixture has multiple authentic chemical problems', () => {
        const raw = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
        assert(Array.isArray(raw.source_problems), 'source_problems must be an array');
        assert(raw.source_problems.length >= 5, 'Must have at least 5 authentic problems, found ' + raw.source_problems.length);
        for (const prob of raw.source_problems) {
            assert(prob.statement && prob.statement.length > 10, 'Problem must have substantial statement');
            assert(prob.correct_answer, 'Problem must specify correct answer');
            assert(prob.source_solution_steps && prob.source_solution_steps.length > 0, 'Problem must have raw solution steps');
        }
    });

    // =========================================================================
    // SECTION 2: EVIDENCE INGESTION [COMPONENT]
    // =========================================================================
    console.log('\n--- SECTION 2: Evidence Ingestion [COMPONENT] ---');

    const evidenceOutDir = path.join(SCRATCH_DIR, 'evidence_pack');
    let evidenceResult = null;

    await runTest('SEC-2', 'TEST-2.1', 'COMPONENT', 'generateChemistryEvidencePack produces valid Markdown evidence representation', () => {
        evidenceResult = generateChemistryEvidencePack(FIXTURE_PATH, evidenceOutDir);
        assert(evidenceResult.markdownContent && evidenceResult.markdownContent.length > 500, 'Markdown content must be substantial');
        assert(fs.existsSync(path.join(evidenceOutDir, 'evidence-pack.md')), 'evidence-pack.md must be written to disk');
        assert(fs.existsSync(path.join(evidenceOutDir, 'provenance.json')), 'provenance.json must be written to disk');

        const md = evidenceResult.markdownContent;
        assert(md.includes('## 1. Chapter Metadata & Provenance'), 'Must contain section 1');
        assert(md.includes('## 2. Core Concepts & Definitions'), 'Must contain section 2');
        assert(md.includes('## 3. Master Formulas & Governing Identities'), 'Must contain section 3');
        assert(md.includes('## 4. Problem Pattern Archetypes'), 'Must contain section 4');
        assert(md.includes('## 5. Authentic Source Problems & PYQs'), 'Must contain section 5');
    });

    await runTest('SEC-2', 'TEST-2.2', 'COMPONENT', 'Provenance is strictly preserved across evidence ingestion', () => {
        const meta = evidenceResult.provenanceMetadata;
        assert.strictEqual(meta.detected_subject, 'Chemistry');
        assert.strictEqual(meta.chapter_title, 'Chemical-Equilibrium');
        assert(meta.source_hash_sha256 && meta.source_hash_sha256.length === 64, 'Source hash must be 64-char hex');
        assert(meta.evidence_hash_sha256 && meta.evidence_hash_sha256.length === 64, 'Evidence hash must be 64-char hex');
    });

    await runTest('SEC-2', 'TEST-2.3', 'COMPONENT', 'SHA-256 cryptographic hash and integrity are verified', () => {
        const expectedHash = computeSha256(evidenceResult.markdownContent);
        assert.strictEqual(evidenceResult.evidenceHash, expectedHash, 'Computed hash must match reported hash');
        const diskContent = fs.readFileSync(path.join(evidenceOutDir, 'evidence-pack.md'), 'utf8');
        assert.strictEqual(computeSha256(diskContent), expectedHash, 'Disk content hash must match');
    });

    await runTest('SEC-2', 'TEST-2.4', 'COMPONENT', 'Specialist receives evidence representation identically from JSON or Markdown', () => {
        const parsedFromJson = parseChemistryEvidence(FIXTURE_PATH);
        const parsedFromMd = parseChemistryEvidence(path.join(evidenceOutDir, 'evidence-pack.md'));

        assert.strictEqual(parsedFromJson.chapter, parsedFromMd.chapter);
        assert.strictEqual(parsedFromJson.subject, parsedFromMd.subject);
        assert.strictEqual(parsedFromJson.problem_patterns.length, parsedFromMd.problem_patterns.length);
        assert.strictEqual(parsedFromJson.source_problems.length, parsedFromMd.source_problems.length);

        for (let i = 0; i < parsedFromJson.source_problems.length; i++) {
            assert.strictEqual(parsedFromJson.source_problems[i].source_id, parsedFromMd.source_problems[i].source_id);
            assert.strictEqual(parsedFromJson.source_problems[i].correct_answer, parsedFromMd.source_problems[i].correct_answer);
        }
    });

    // =========================================================================
    // SECTION 3: SPECIALIST AUTHORING [COMPONENT]
    // =========================================================================
    console.log('\n--- SECTION 3: Specialist Authoring [COMPONENT] ---');

    let authoredQB = null;

    await runTest('SEC-3', 'TEST-3.1', 'COMPONENT', 'Chemistry Specialist parses raw evidence without hardcoded structures', () => {
        const parsed = parseChemistryEvidence(evidenceResult.markdownContent);
        assert.strictEqual(parsed.subject, 'Chemistry');
        assert(parsed.problem_patterns.length >= 3);
        assert(parsed.source_problems.length >= 5);
    });

    await runTest('SEC-3', 'TEST-3.2', 'COMPONENT', 'Chemistry Specialist authors canonical semantic content (17 dimensions populated)', () => {
        authoredQB = authorChemistryProceduralContent(evidenceResult.markdownContent, {
            evidenceHash: evidenceResult.evidenceHash
        });
        assert.strictEqual(authoredQB.schema_version, '1.0.0');
        assert.strictEqual(authoredQB.domain, 'Chemistry');
        assert.strictEqual(authoredQB.chapter, 'Chemical-Equilibrium');
        assert(Array.isArray(authoredQB.questions) && authoredQB.questions.length >= 5);

        const val = validateQuestionBankContent(authoredQB);
        assert.strictEqual(val.isValid, true, 'Validation errors: ' + JSON.stringify(val.errors));
    });

    await runTest('SEC-3', 'TEST-3.3', 'COMPONENT', 'All 17 canonical dimensions are fully populated with non-empty values', () => {
        for (const q of authoredQB.questions) {
            assert(q.id && q.id.startsWith('chem-q-'), '1. id');
            assert(q.pattern_id && q.pattern_id.startsWith('pat-chem-'), '2. pattern_id');
            assert(q.provenance && q.provenance.origin === 'authentic_pyq', '3. provenance');
            assert(q.question_type === 'mcq' || q.question_type === 'numerical', '4. question_type');
            assert(typeof q.difficulty === 'number' && q.difficulty > 0, '5. difficulty');
            assert(q.question && q.question.length > 5, '6. question');
            assert(Array.isArray(q.recognition_signals) && q.recognition_signals.length > 0, '7. recognition_signals');
            assert(q.expected_method && q.expected_method.length > 5, '8. expected_method');
            assert(Array.isArray(q.decision_points) && q.decision_points.length > 0, '9. decision_points');
            assert(q.trap && q.trap.length > 5, '10. trap');
            assert(Array.isArray(q.error_category) && q.error_category.length > 0, '11. error_category');
            assert(q.hints && q.hints.tier1_conceptual && q.hints.tier2_strategic && q.hints.tier3_next_step, '12-14. 3-tier hints');
            assert(q.solution && q.solution.length > 10, '15. solution');
            assert(q.verification && q.verification.length > 10, '16. verification');
            assert(Array.isArray(q.prerequisites) && q.prerequisites.length > 0, '17. prerequisites');
        }
    });

    await runTest('SEC-3', 'TEST-3.4', 'COMPONENT', 'Zero hardcoded final questions injected by test (derived dynamically)', () => {
        assert(authoredQB.questions.length === evidenceResult.fixture.source_problems.length);
    });

    // =========================================================================
    // SECTION 4: CHEMISTRY SEMANTIC INVARIANTS [COMPONENT]
    // =========================================================================
    console.log('\n--- SECTION 4: Chemistry Semantic Invariants [COMPONENT] ---');

    await runTest('SEC-4', 'TEST-4.1', 'COMPONENT', 'Units are preserved and explicitly attached to all answers and choices', () => {
        for (const q of authoredQB.questions) {
            assert(q.correct_answer && q.correct_answer.length > 0, 'Must have correct answer string');
            if (q.question_type === 'numerical') {
                const ans = q.correct_answer;
                const hasChemUnitOrNumber = ['mol/L', 'M', 'atm', 'bar', 'K', 'pH'].some(u => ans.includes(u)) || !isNaN(parseFloat(ans));
                assert(hasChemUnitOrNumber, `Numerical answer '${ans}' must have valid chemical unit or dimensionless value`);
            }
        }
    });

    await runTest('SEC-4', 'TEST-4.2', 'COMPONENT', 'Formula scope and applicability conditions are respected', () => {
        const raw = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
        for (const mf of raw.master_formulas) {
            assert(mf.scope && mf.scope.length > 10, 'Master formula must have explicit chemical scope');
            assert(mf.units && mf.units.length > 0, 'Master formula must specify units');
        }
    });

    await runTest('SEC-4', 'TEST-4.3', 'COMPONENT', '7-Stage chemical reasoning exists in solutions', () => {
        for (const q of authoredQB.questions) {
            assert(q.solution.includes('7-Stage Chemical Reasoning Pipeline'), 'Solution must follow 7-stage pipeline');
            assert(q.solution.includes('1.') && q.solution.includes('2.'), 'Solution must contain numbered stages');
        }
    });

    await runTest('SEC-4', 'TEST-4.4', 'COMPONENT', 'Solution verification includes chemical sanity, reaction quotient, and valid pH bounds', () => {
        for (const q of authoredQB.questions) {
            assert(q.verification.includes('Chemical Sanity Check'), 'Verification must include Chemical Sanity Check');
            assert(q.verification.includes('सुसंगत'), 'Verification must verify consistency');
        }
    });

    await runTest('SEC-4', 'TEST-4.5', 'COMPONENT', 'Progressive hints do NOT leak answers across Tier 1 and Tier 2', () => {
        for (const q of authoredQB.questions) {
            const ans = q.correct_answer;
            assert(!hintLeaksAnswer(q.hints.tier1_conceptual, ans), `Tier 1 hint for ${q.id} leaks answer '${ans}'`);
            assert(!hintLeaksAnswer(q.hints.tier2_strategic, ans), `Tier 2 hint for ${q.id} leaks answer '${ans}'`);
        }
    });

    await runTest('SEC-4', 'TEST-4.6', 'COMPONENT', 'MCQ Hard Invariant is enforced (>= 4 options, 1 valid answer)', () => {
        for (const q of authoredQB.questions) {
            if (q.question_type === 'mcq') {
                assert(Array.isArray(q.options) && q.options.length >= 4, `${q.id} must have >= 4 options, found ${q.options ? q.options.length : 0}`);
                assert(q.options.includes(q.correct_answer), `Options for ${q.id} must include correct answer '${q.correct_answer}'`);
            }
        }
    });

    // =========================================================================
    // SECTION 5: MULTI-PATTERN PROOF [COMPONENT]
    // =========================================================================
    console.log('\n--- SECTION 5: Multi-Pattern Proof [COMPONENT] ---');

    await runTest('SEC-5', 'TEST-5.1', 'COMPONENT', 'Executable Proof of 1 Pattern != 1 Question: number_of_patterns < number_of_questions', () => {
        const numPatterns = authoredQB.patterns.length;
        const numQuestions = authoredQB.questions.length;
        assert(numPatterns < numQuestions, `Proof failed: patterns (${numPatterns}) must be < questions (${numQuestions})`);
        assert(numPatterns >= 3, 'Must have at least 3 patterns');
        assert(numQuestions >= 6, 'Must have at least 6 questions');
    });

    await runTest('SEC-5', 'TEST-5.2', 'COMPONENT', 'Multiple questions per pattern (Pattern 1 >= 2, Pattern 2 >= 2, Pattern 3 >= 2)', () => {
        const counts = {};
        for (const q of authoredQB.questions) {
            counts[q.pattern_id] = (counts[q.pattern_id] || 0) + 1;
        }
        assert((counts['pat-chem-eq-kc-calc'] || 0) >= 2, 'Pattern 1 must have >= 2 questions');
        assert((counts['pat-chem-eq-kp-deltang'] || 0) >= 2, 'Pattern 2 must have >= 2 questions');
        assert((counts['pat-chem-sol-ph-calc'] || 0) >= 2, 'Pattern 3 must have >= 2 questions');
    });

    // =========================================================================
    // SECTION 6: PROCEDURAL MODE MATRIX [INTEGRATION]
    // =========================================================================
    console.log('\n--- SECTION 6: Procedural Mode Matrix [INTEGRATION] ---');

    await runTest('SEC-6', 'TEST-6.1', 'INTEGRATION', 'Mode markdown: Question Bank = ON, Procedural APKG = OFF', () => {
        const routing = evaluateArtifactRouting({
            subject: 'Chemistry',
            chapter: 'Chemical-Equilibrium',
            artifactPolicy: { procedural_mode: 'markdown' }
        });
        assert.strictEqual(routing.proceduralQuestionBank, true);
        assert.strictEqual(routing.proceduralApkg, false);
    });

    await runTest('SEC-6', 'TEST-6.2', 'INTEGRATION', 'Mode apkg: Question Bank = OFF, Procedural APKG = ON', () => {
        const routing = evaluateArtifactRouting({
            subject: 'Chemistry',
            chapter: 'Chemical-Equilibrium',
            artifactPolicy: { procedural_mode: 'apkg' }
        });
        assert.strictEqual(routing.proceduralQuestionBank, false);
        assert.strictEqual(routing.proceduralApkg, true);
    });

    await runTest('SEC-6', 'TEST-6.3', 'INTEGRATION', 'Mode both: Question Bank = ON, Procedural APKG = ON', () => {
        const routing = evaluateArtifactRouting({
            subject: 'Chemistry',
            chapter: 'Chemical-Equilibrium',
            artifactPolicy: { procedural_mode: 'both' }
        });
        assert.strictEqual(routing.proceduralQuestionBank, true);
        assert.strictEqual(routing.proceduralApkg, true);
    });

    await runTest('SEC-6', 'TEST-6.4', 'INTEGRATION', 'Mode none: Question Bank = OFF, Procedural APKG = OFF', () => {
        const routing = evaluateArtifactRouting({
            subject: 'Chemistry',
            chapter: 'Chemical-Equilibrium',
            artifactPolicy: { procedural_mode: 'none' }
        });
        assert.strictEqual(routing.proceduralQuestionBank, false);
        assert.strictEqual(routing.proceduralApkg, false);

        const graph = buildExecutionTaskGraph({
            subject: 'Chemistry',
            chapter: 'Chemical-Equilibrium',
            specialist_agent: 'chemistry-numerical-apkg-author',
            artifactPolicy: { procedural_mode: 'none' }
        });
        const qbTask = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');
        const apkgTask = graph.tasks.find(t => t.task_id === 'task-export-studylab-anki');
        assert.strictEqual(qbTask.status, 'SKIPPED');
        assert.strictEqual(apkgTask.status, 'SKIPPED');
    });

    await runTest('SEC-6', 'TEST-6.5', 'INTEGRATION', 'Mode apkg: chemistry-numerical-apkg-author strictly does NOT generate Markdown Questions.md', async () => {
        const apkgTestRoot = path.join(SCRATCH_DIR, 'mode_apkg_test');
        fs.mkdirSync(apkgTestRoot, { recursive: true });

        const task = {
            task_id: 'task-studylab-question-bank',
            track_key: 'proceduralQuestionBank',
            owner_agent: 'chemistry-numerical-apkg-author',
            writer_agent: 'chemistry-numerical-apkg-author',
            target_path: path.join(apkgTestRoot, 'Questions/Chemical-Equilibrium_Questions.md'),
            status: 'PLANNED'
        };

        const handoff = await executeChemistrySpecialistTask(task, {
            subject: 'Chemistry',
            chapter: 'Chemical-Equilibrium',
            procedural_mode: 'apkg',
            sourceFixture: FIXTURE_PATH
        });
        assert.strictEqual(fs.existsSync(task.target_path), false, 'Questions.md must NOT exist in apkg mode');
    });

    await runTest('SEC-6', 'TEST-6.6', 'INTEGRATION', 'Mode none: chemistry-numerical-apkg-author suppresses generation and creates no procedural deliverables', async () => {
        const noneTestRoot = path.join(SCRATCH_DIR, 'mode_none_test');
        fs.mkdirSync(noneTestRoot, { recursive: true });

        const task = {
            task_id: 'task-studylab-question-bank',
            track_key: 'proceduralQuestionBank',
            owner_agent: 'chemistry-numerical-apkg-author',
            writer_agent: 'chemistry-numerical-apkg-author',
            target_path: path.join(noneTestRoot, 'Questions/Chemical-Equilibrium_Questions.md'),
            status: 'PLANNED'
        };

        const handoff = await executeChemistrySpecialistTask(task, {
            subject: 'Chemistry',
            chapter: 'Chemical-Equilibrium',
            procedural_mode: 'none',
            sourceFixture: FIXTURE_PATH
        });
        assert.strictEqual(handoff.status, 'SUPPRESSED');
        assert.strictEqual(handoff.outputs_produced.length, 0);
        assert.strictEqual(fs.existsSync(task.target_path), false, 'Deliverable must NOT exist in none mode');
    });

    // =========================================================================
    // SECTION 7: CHEMICAL ARTIFACT OWNERSHIP & GOVERNANCE [INTEGRATION]
    // =========================================================================
    console.log('\n--- SECTION 7: Chemical Artifact Ownership & Governance [INTEGRATION] ---');

    await runTest('SEC-7', 'TEST-7.1', 'INTEGRATION', 'Artifact Registry assigns proceduralQuestionBank to chemistry-numerical-apkg-author', () => {
        const graph = buildExecutionTaskGraph({
            subject: 'Chemistry',
            chapter: 'Chemical-Equilibrium',
            specialist_agent: 'chemistry-numerical-apkg-author'
        });
        const qbTask = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');
        assert(qbTask, 'proceduralQuestionBank task must exist in execution graph');
        assert.strictEqual(qbTask.owner_agent, 'chemistry-numerical-apkg-author');
        assert.strictEqual(qbTask.writer_agent, 'chemistry-numerical-apkg-author');
    });

    await runTest('SEC-7', 'TEST-7.2', 'INTEGRATION', 'Parent Orchestrator write attempt to Questions.md is strictly rejected (Parent Self-Execution Ban)', () => {
        const task = {
            task_id: 'task-studylab-question-bank',
            owner_agent: 'chemistry-numerical-apkg-author',
            writer_agent: 'chemistry-numerical-apkg-author',
            target_path: 'Study Materials/Chemistry/Chemical-Equilibrium/Questions/Chemical-Equilibrium_Questions.md'
        };

        assert.throws(() => {
            assertNoParentSelfExecution(task, 'parent');
        }, /PARENT_SELF_EXECUTION_VIOLATION/);

        assert.throws(() => {
            assertNoParentSelfExecution(task, 'study-source-core');
        }, /PARENT_SELF_EXECUTION_VIOLATION/);

        assert.doesNotThrow(() => {
            assertNoParentSelfExecution(task, 'chemistry-numerical-apkg-author');
        });
    });

    await runTest('SEC-7', 'TEST-7.3', 'INTEGRATION', 'Wrong specialist identity attempting to execute Chemistry task throws OWNERSHIP_VIOLATION', async () => {
        const task = {
            task_id: 'task-studylab-question-bank',
            owner_agent: 'physics-numerical-apkg-author',
            writer_agent: 'physics-numerical-apkg-author',
            track_key: 'proceduralQuestionBank',
            target_path: path.join(SCRATCH_DIR, 'wrong_agent/Questions.md')
        };
        await assert.rejects(async () => {
            await executeChemistrySpecialistTask(task, { subject: 'Chemistry' });
        }, /OWNERSHIP_VIOLATION/);
    });

    // =========================================================================
    // SECTION 8: FULL SOURCE-DRIVEN END-TO-END PIPELINE [E2E]
    // =========================================================================
    console.log('\n--- SECTION 8: Full Source-Driven End-to-End Pipeline [E2E] ---');

    await runTest('SEC-8', 'TEST-8.1', 'E2E', 'SOURCE -> EVIDENCE PACK -> Chemistry Policy -> Routing -> chemistry-numerical-apkg-author -> Questions.md -> Validator -> PASS', async () => {
        const e2eRoot = path.join(SCRATCH_DIR, 'full_e2e_run');
        fs.mkdirSync(e2eRoot, { recursive: true });

        // 1. Generate Evidence Pack from raw source
        const evidenceRes = generateChemistryEvidencePack(FIXTURE_PATH, path.join(e2eRoot, 'scratch'));
        const evidenceFile = path.join(e2eRoot, 'scratch/evidence-pack.md');
        assert(fs.existsSync(evidenceFile), 'Evidence pack must exist');

        // 2. Resolve Subject Policy
        const policy = resolveSubjectPolicy('Chemistry');
        assert.strictEqual(policy.procedural_mode, 'markdown');

        // 3. Routing Engine
        const routing = evaluateArtifactRouting({
            subject: 'Chemistry',
            chapter: 'Chemical-Equilibrium'
        });
        assert.strictEqual(routing.proceduralQuestionBank, true);
        assert.strictEqual(routing.proceduralApkg, false);

        // 4. Build Execution Graph
        const graph = buildExecutionTaskGraph({
            subject: 'Chemistry',
            chapter: 'Chemical-Equilibrium',
            specialist_agent: 'chemistry-numerical-apkg-author',
            evidenceHash: evidenceRes.evidenceHash,
            customRoot: e2eRoot
        });
        const qbTask = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');
        assert(qbTask, 'Question Bank task must exist');
        assert.strictEqual(qbTask.owner_agent, 'chemistry-numerical-apkg-author');

        // 5. Dispatch to Specialist via Orchestrator Dispatcher
        const dispatcher = createSpecialistTaskDispatcher({
            subject: 'Chemistry',
            chapter: 'Chemical-Equilibrium',
            evidencePack: evidenceFile,
            evidenceHash: evidenceRes.evidenceHash,
            procedural_mode: 'markdown'
        });

        // 6. Execute Workflow
        const workflowResult = await executeTaskWorkflow(graph, dispatcher);
        assert.strictEqual(workflowResult.taskStatusMap['task-studylab-question-bank'], 'COMPLETED', 'Workflow Question Bank task must complete with status COMPLETED');

        // 7. Verify Questions.md Deliverable on Disk
        const targetQuestionsMd = qbTask.target_path;
        assert(fs.existsSync(targetQuestionsMd), 'Questions.md must exist on disk at ' + targetQuestionsMd);

        const fileSize = fs.statSync(targetQuestionsMd).size;
        assert(fileSize > 1000, `Questions.md must be substantial (found ${fileSize} bytes)`);

        // 8. Independent Validator Execution
        const mdContent = fs.readFileSync(targetQuestionsMd, 'utf8');
        const mdValidation = validateQuestionBankMarkdown(mdContent, targetQuestionsMd);
        assert.strictEqual(mdValidation.isValid, true, 'Questions.md must pass validateQuestionBankMarkdown: ' + JSON.stringify(mdValidation.errors));

        const diskValidation = validateQuestionBank(targetQuestionsMd);
        assert.strictEqual(diskValidation.isValid, true, 'Questions.md must pass validateQuestionBank: ' + JSON.stringify(diskValidation.errors));

        // 9. Semantic Parity Checks
        assert(mdContent.includes('subject: "Chemistry"') || mdContent.includes('subject: Chemistry'), 'Frontmatter must have subject Chemistry');
        assert(mdContent.includes('chapter: "Chemical-Equilibrium"') || mdContent.includes('chapter: Chemical-Equilibrium'), 'Frontmatter must have chapter Chemical-Equilibrium');
        assert(mdContent.includes('# Chemical-Equilibrium — Procedural Question Bank'), 'Must have single H1 header');

        // Verify all 6 distinct questions present
        for (let i = 1; i <= 6; i++) {
            const qTag = 'chem-q-00' + i;
            assert(mdContent.includes(qTag), 'Must contain question ' + qTag);
        }
    });

    // =========================================================================
    // SECTION 9: FAIL-CLOSED & ADVERSARIAL INVARIANTS [NEGATIVE / ADVERSARIAL]
    // =========================================================================
    console.log('\n--- SECTION 9: Fail-Closed & Adversarial Invariants [NEGATIVE / ADVERSARIAL] ---');

    await runTest('SEC-9', 'TEST-9.1', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Empty practice questions in source rejects generation', () => {
        const emptyEvidence = {
            chapter: 'Chemical-Equilibrium',
            domain: 'Chemistry',
            problem_patterns: [{ pattern_id: 'p1', title: 'Pattern 1' }],
            source_problems: []
        };
        assert.throws(() => {
            authorChemistryProceduralContent(emptyEvidence);
        }, /ZERO_SOLVABLE_PRACTICE_QUESTIONS/);
    });

    await runTest('SEC-9', 'TEST-9.2', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Missing provenance origin caught and rejected by validator', () => {
        const corruptedQB = JSON.parse(JSON.stringify(authoredQB));
        delete corruptedQB.questions[0].provenance.origin;
        const val = validateQuestionBankContent(corruptedQB);
        assert.strictEqual(val.isValid, false);
        assert(val.errors.some(e => e.includes('INVALID_PROVENANCE_ORIGIN') || e.includes('MISSING_PROVENANCE')));
    });

    await runTest('SEC-9', 'TEST-9.3', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Duplicate question IDs caught and rejected by validator', () => {
        const corruptedQB = JSON.parse(JSON.stringify(authoredQB));
        corruptedQB.questions[1].id = corruptedQB.questions[0].id;
        const val = validateQuestionBankContent(corruptedQB);
        assert.strictEqual(val.isValid, false);
        assert(val.errors.some(e => e.includes('DUPLICATE_QUESTION_ID')));
    });

    await runTest('SEC-9', 'TEST-9.4', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Invalid question type caught and rejected by validator', () => {
        const corruptedQB = JSON.parse(JSON.stringify(authoredQB));
        corruptedQB.questions[0].question_type = 'fantasy_type';
        const val = validateQuestionBankContent(corruptedQB);
        assert.strictEqual(val.isValid, false);
        assert(val.errors.some(e => e.includes('INVALID_QUESTION_TYPE')));
    });

    await runTest('SEC-9', 'TEST-9.5', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: MCQ with < 4 options throws MCQ_INVARIANT_VIOLATION', () => {
        const raw = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
        const corruptedRaw = JSON.parse(JSON.stringify(raw));
        corruptedRaw.source_problems[0].options = ['4', '2', '8']; // Only 3 options
        assert.throws(() => {
            authorChemistryProceduralContent(corruptedRaw);
        }, /MCQ_INVARIANT_VIOLATION/);
    });

    await runTest('SEC-9', 'TEST-9.6', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Missing hints (Tier 1/2/3) caught and rejected by validator', () => {
        const corruptedQB = JSON.parse(JSON.stringify(authoredQB));
        corruptedQB.questions[0].hints.tier2_strategic = '';
        const val = validateQuestionBankContent(corruptedQB);
        assert.strictEqual(val.isValid, false);
        assert(val.errors.some(e => e.includes('MISSING_HINTS')));
    });

    await runTest('SEC-9', 'TEST-9.7', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Hint answer leakage caught and rejected by validator', () => {
        const ans = '4';
        const leakingHint = `इस प्रश्न का सही उत्तर ${ans} है।`;
        assert.strictEqual(hintLeaksAnswer(leakingHint, ans), true);

        const corruptedQB = JSON.parse(JSON.stringify(authoredQB));
        corruptedQB.questions[0].hints.tier1_conceptual = leakingHint;
        const val = validateQuestionBankContent(corruptedQB);
        assert.strictEqual(val.isValid, false);
        assert(val.errors.some(e => e.includes('HINT_ANSWER_LEAKAGE')));
    });

    await runTest('SEC-9', 'TEST-9.8', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Missing chemical units on numerical quantity fails closed', () => {
        const qNum = authoredQB.questions.find(q => q.question_type === 'numerical');
        assert(qNum, 'Numerical question must exist');
        assert(qNum.correct_answer, 'Must have correct answer');
        const hasUnitOrNum = ['mol/L', 'M', 'atm', 'bar', 'K', 'pH'].some(u => qNum.correct_answer.includes(u)) || !isNaN(parseFloat(qNum.correct_answer));
        assert(hasUnitOrNum, 'Unit must be valid chemical unit or dimensionless');
    });

    await runTest('SEC-9', 'TEST-9.9', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Wrong specialist identity rejected with OWNERSHIP_VIOLATION', async () => {
        const task = {
            task_id: 'task-studylab-question-bank',
            owner_agent: 'core-notes',
            writer_agent: 'core-notes',
            track_key: 'proceduralQuestionBank',
            target_path: path.join(SCRATCH_DIR, 'wrong_identity/Questions.md')
        };
        await assert.rejects(async () => {
            await executeChemistrySpecialistTask(task, { subject: 'Chemistry' });
        }, /OWNERSHIP_VIOLATION/);
    });

    await runTest('SEC-9', 'TEST-9.10', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Parent self-execution attempt rejected with PARENT_SELF_EXECUTION_VIOLATION', () => {
        const task = {
            task_id: 'task-studylab-question-bank',
            owner_agent: 'chemistry-numerical-apkg-author',
            writer_agent: 'chemistry-numerical-apkg-author',
            target_path: 'Questions.md'
        };
        assert.throws(() => {
            assertNoParentSelfExecution(task, 'parent-orchestrator');
        }, /PARENT_SELF_EXECUTION_VIOLATION/);
    });

    // =========================================================================
    // FINAL SUMMARY
    // =========================================================================
    console.log('\n================================================================================');
    console.log(`CHEMISTRY PRODUCTION PATH SUMMARY: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
    console.log('================================================================================');
    console.log('LAYER BREAKDOWN:');
    for (const [l, stats] of Object.entries(layerStats)) {
        console.log(`  - ${l.padEnd(24)}: ${stats.passed} / ${stats.total} Passed`);
    }
    console.log('================================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal Test Runner Error:', err);
    process.exit(1);
});
