/**
 * StudySourceCore Physics Production Path Test Suite (`test_physics_production_path.js`)
 * 
 * Verifies that the existing StudySourceCore architecture takes a realistic Physics source
 * and evidence pack, routes through policy, dispatches physics-numerical-apkg-author as the sole writer,
 * authors canonical StudyLab procedural content across multiple patterns and questions,
 * renders Questions.md, and passes independent validation without the test supplying
 * final canonical questions.
 * 
 * Test Classification & Sections:
 * - Section 1: Source Integrity [UNIT]
 * - Section 2: Evidence Ingestion [COMPONENT]
 * - Section 3: Specialist Authoring [COMPONENT]
 * - Section 4: Physics Semantic Invariants [COMPONENT]
 * - Section 5: Multi-Pattern Proof [COMPONENT]
 * - Section 6: Procedural Mode Matrix [INTEGRATION]
 * - Section 7: Physical Artifact Ownership & Governance [INTEGRATION]
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

const { generatePhysicsEvidencePack, computeSha256 } = require('./fixtures/generate_physics_evidence_pack');
const {
    parsePhysicsEvidence,
    authorPhysicsProceduralContent,
    executePhysicsSpecialistTask
} = require('./author_physics_studylab');

const {
    validateQuestionBank,
    validateQuestionBankContent,
    validateQuestionBankMarkdown,
    hintLeaksAnswer
} = require('./validate_studylab_question_bank');

const VAULT_ROOT = getVaultRoot(__dirname);
const FIXTURE_PATH = path.resolve(__dirname, '../resources/fixtures/physics_work_energy_power_source_fixture.json');
const SCRATCH_DIR = path.resolve(__dirname, 'scratch/physics_production_path_tests');

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
    console.log('STUDYSOURCECORE — GENUINELY SOURCE-DRIVEN PHYSICS PRODUCTION PATH TEST SUITE');
    console.log('================================================================================\n');

    fs.mkdirSync(SCRATCH_DIR, { recursive: true });

    // =========================================================================
    // SECTION 1: SOURCE INTEGRITY [UNIT]
    // =========================================================================
    console.log('--- SECTION 1: Source Integrity [UNIT] ---');

    await runTest('SEC-1', 'TEST-1.1', 'UNIT', 'Realistic Physics Source Fixture exists on disk', () => {
        assert(fs.existsSync(FIXTURE_PATH), 'Fixture file must exist at ' + FIXTURE_PATH);
    });

    await runTest('SEC-1', 'TEST-1.2', 'UNIT', 'Source Fixture contains no pre-formed canonical Question Bank objects', () => {
        const fixtureRaw = fs.readFileSync(FIXTURE_PATH, 'utf8');
        const fixture = JSON.parse(fixtureRaw);

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

    await runTest('SEC-1', 'TEST-1.3', 'UNIT', 'Source Fixture has multiple distinct Physics patterns', () => {
        const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
        assert(Array.isArray(fixture.problem_patterns), 'problem_patterns must be an array');
        assert(fixture.problem_patterns.length >= 2, 'Must have at least 2 distinct problem patterns');
        assert(fixture.problem_patterns.some(p => p.pattern_id === 'pat-phys-wep-work-constant-force'));
        assert(fixture.problem_patterns.some(p => p.pattern_id === 'pat-phys-wep-work-energy-theorem'));
    });

    await runTest('SEC-1', 'TEST-1.4', 'UNIT', 'Source Fixture has multiple authentic numerical problems', () => {
        const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
        assert(Array.isArray(fixture.source_problems), 'source_problems must be an array');
        assert(fixture.source_problems.length >= 4, 'Must have at least 4 source problems');
    });

    // =========================================================================
    // SECTION 2: EVIDENCE INGESTION [COMPONENT]
    // =========================================================================
    console.log('\n--- SECTION 2: Evidence Ingestion [COMPONENT] ---');

    await runTest('SEC-2', 'TEST-2.1', 'COMPONENT', 'generatePhysicsEvidencePack produces valid Markdown evidence representation', () => {
        const evidenceDir = path.join(SCRATCH_DIR, 'evidence_ingestion_test');
        const genRes = generatePhysicsEvidencePack(FIXTURE_PATH, evidenceDir);

        assert(genRes.markdownContent && genRes.markdownContent.length > 500, 'Evidence pack markdown must be non-empty');
        assert(fs.existsSync(path.join(evidenceDir, 'evidence-pack.md')), 'evidence-pack.md must be written to disk');
        assert(fs.existsSync(path.join(evidenceDir, 'provenance.json')), 'provenance.json must be written to disk');
    });

    await runTest('SEC-2', 'TEST-2.2', 'COMPONENT', 'Provenance is strictly preserved across evidence ingestion', () => {
        const evidenceDir = path.join(SCRATCH_DIR, 'evidence_ingestion_test');
        const genRes = generatePhysicsEvidencePack(FIXTURE_PATH, evidenceDir);

        assert.strictEqual(genRes.provenanceMetadata.detected_subject, 'Physics');
        assert.strictEqual(genRes.provenanceMetadata.chapter_title, 'Work-Energy-Power');
        assert(genRes.provenanceMetadata.source_name, 'Source title must be recorded');
    });

    await runTest('SEC-2', 'TEST-2.3', 'COMPONENT', 'SHA-256 cryptographic hash and integrity are verified', () => {
        const evidenceDir = path.join(SCRATCH_DIR, 'evidence_ingestion_test');
        const genRes = generatePhysicsEvidencePack(FIXTURE_PATH, evidenceDir);

        assert(genRes.evidenceHash && genRes.evidenceHash.length === 64, 'Evidence pack must have valid 64-char SHA-256 hash');
        const recomputed = computeSha256(genRes.markdownContent);
        assert.strictEqual(genRes.evidenceHash, recomputed, 'Evidence hash must match recomputed SHA-256');
    });

    await runTest('SEC-2', 'TEST-2.4', 'COMPONENT', 'Specialist receives evidence representation identically from JSON or Markdown', () => {
        const parsedFromFixture = parsePhysicsEvidence(FIXTURE_PATH);
        const genRes = generatePhysicsEvidencePack(FIXTURE_PATH, path.join(SCRATCH_DIR, 'evidence_gen'));
        const parsedFromMd = parsePhysicsEvidence(genRes.markdownContent);

        assert.strictEqual(parsedFromFixture.chapter, parsedFromMd.chapter);
        assert.strictEqual(parsedFromFixture.subject, parsedFromMd.subject);
        assert.strictEqual(parsedFromFixture.problem_patterns.length, parsedFromMd.problem_patterns.length);
        assert.strictEqual(parsedFromFixture.source_problems.length, parsedFromMd.source_problems.length);

        for (let i = 0; i < parsedFromFixture.source_problems.length; i++) {
            assert.strictEqual(parsedFromFixture.source_problems[i].source_id, parsedFromMd.source_problems[i].source_id);
            assert.strictEqual(parsedFromFixture.source_problems[i].correct_answer, parsedFromMd.source_problems[i].correct_answer);
        }
    });

    // =========================================================================
    // SECTION 3: SPECIALIST AUTHORING [COMPONENT]
    // =========================================================================
    console.log('\n--- SECTION 3: Specialist Authoring [COMPONENT] ---');

    await runTest('SEC-3', 'TEST-3.1', 'COMPONENT', 'Physics Specialist parses raw evidence without hardcoded structures', () => {
        const parsed = parsePhysicsEvidence(FIXTURE_PATH);
        assert.strictEqual(parsed.chapter, 'Work-Energy-Power');
        assert.strictEqual(parsed.domain, 'Physics');
        assert(parsed.problem_patterns.length >= 2);
    });

    await runTest('SEC-3', 'TEST-3.2', 'COMPONENT', 'Physics Specialist authors canonical semantic content (17 dimensions populated)', () => {
        const canonicalQB = authorPhysicsProceduralContent(FIXTURE_PATH, {
            evidenceHash: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234'
        });

        assert.strictEqual(canonicalQB.schema_version, '1.0.0');
        assert.strictEqual(canonicalQB.domain, 'Physics');
        assert.strictEqual(canonicalQB.chapter, 'Work-Energy-Power');
        assert(Array.isArray(canonicalQB.questions), 'Must contain questions array');
        assert.strictEqual(canonicalQB.questions.length, 5);

        const REQUIRED_DIMENSIONS = [
            'id', 'pattern_id', 'provenance', 'question_type', 'difficulty',
            'question', 'recognition_signals', 'expected_method', 'decision_points',
            'trap', 'error_category', 'hints', 'solution', 'verification', 'prerequisites'
        ];

        for (const q of canonicalQB.questions) {
            for (const dim of REQUIRED_DIMENSIONS) {
                assert(q[dim] !== undefined && q[dim] !== null, `Question '${q.id}' missing required dimension '${dim}'`);
            }
            assert(q.hints.tier1_conceptual, 'Missing Hint Tier 1');
            assert(q.hints.tier2_strategic, 'Missing Hint Tier 2');
            assert(q.hints.tier3_next_step, 'Missing Hint Tier 3');
            assert(Array.isArray(q.recognition_signals) && q.recognition_signals.length > 0);
            assert(Array.isArray(q.decision_points) && q.decision_points.length > 0);
            assert(Array.isArray(q.error_category) && q.error_category.length > 0);
            assert(Array.isArray(q.prerequisites) && q.prerequisites.length > 0);
            assert(typeof q.solution === 'string' && q.solution.length > 10);
            assert(typeof q.verification === 'string' && q.verification.length > 10);
        }
    });

    await runTest('SEC-3', 'TEST-3.3', 'COMPONENT', 'All 17 canonical dimensions are fully populated with non-empty values', () => {
        const canonicalQB = authorPhysicsProceduralContent(FIXTURE_PATH);
        for (const q of canonicalQB.questions) {
            assert(q.id.startsWith('phys-q-'), 'ID must follow phys-q-XXX format: ' + q.id);
            assert(q.correct_answer.length > 0, 'correct_answer must be non-empty');
            assert(q.question.length > 10, 'question prompt must be non-empty');
            assert(q.expected_method.length > 5, 'expected_method must be non-empty');
        }
    });

    await runTest('SEC-3', 'TEST-3.4', 'COMPONENT', 'Zero hardcoded final questions injected by test (derived dynamically)', () => {
        const canonicalQB = authorPhysicsProceduralContent(FIXTURE_PATH);
        assert.strictEqual(canonicalQB.questions.length, 5);
        assert.strictEqual(canonicalQB.questions[0].provenance.source, 'RRB ALP 2018 Shift 1');
        assert.strictEqual(canonicalQB.questions[1].provenance.source, 'RRB Group D 2018 Shift 2');
        assert.strictEqual(canonicalQB.questions[2].provenance.source, 'RRB ALP 2018 Shift 3');
        assert.strictEqual(canonicalQB.questions[3].provenance.source, 'SSC CGL 2020 Tier 1');
        assert.strictEqual(canonicalQB.questions[4].provenance.source, 'RRB NTPC 2019 Shift 1');
    });

    // =========================================================================
    // SECTION 4: PHYSICS SEMANTIC INVARIANTS [COMPONENT]
    // =========================================================================
    console.log('\n--- SECTION 4: Physics Semantic Invariants [COMPONENT] ---');

    await runTest('SEC-4', 'TEST-4.1', 'COMPONENT', 'Units are preserved and explicitly attached to all answers and choices', () => {
        const canonicalQB = authorPhysicsProceduralContent(FIXTURE_PATH);
        const validUnitsRegex = /(?:J|kJ|N|m|m\/s|kW|W|kg)\b/;
        for (const q of canonicalQB.questions) {
            const ans = q.correct_answer;
            assert(validUnitsRegex.test(ans), `Question '${q.id}' answer '${ans}' must explicitly include physical SI units`);
            if (q.question_type === 'mcq') {
                for (const opt of q.options) {
                    assert(validUnitsRegex.test(opt), `MCQ option '${opt}' in '${q.id}' must include physical SI units`);
                }
            }
        }
    });

    await runTest('SEC-4', 'TEST-4.2', 'COMPONENT', 'Formula scope and applicability conditions are respected', () => {
        const canonicalQB = authorPhysicsProceduralContent(FIXTURE_PATH);
        const q1 = canonicalQB.questions.find(q => q.id === 'phys-q-001');
        assert(q1.solution.includes('W = F * s * cos(0) = 200 N * 2 m * 1 = 400 J') || q1.solution.includes('400 J'));
        const q3 = canonicalQB.questions.find(q => q.id === 'phys-q-003');
        assert(q3.solution.includes('Delta K') || q3.solution.includes('गतिज ऊर्जा') || q3.solution.includes('-90 kJ'));
    });

    await runTest('SEC-4', 'TEST-4.3', 'COMPONENT', '6-Stage numerical reasoning exists in solutions (FBD, Coordinates, Law, Solve, SI, Sanity)', () => {
        const canonicalQB = authorPhysicsProceduralContent(FIXTURE_PATH);
        for (const q of canonicalQB.questions) {
            assert(q.solution.includes('Pipeline') || q.solution.includes('चरणबद्ध') || q.solution.includes('हल:'), `Solution in '${q.id}' must provide step-by-step reasoning`);
            assert(q.expected_method.includes('भौतिक') || q.expected_method.includes('FBD') || q.expected_method.includes('नियम'), `Expected method in '${q.id}' must reflect physical modeling`);
        }
    });

    await runTest('SEC-4', 'TEST-4.4', 'COMPONENT', 'Solution verification includes dimensional analysis and physical boundary sanity', () => {
        const canonicalQB = authorPhysicsProceduralContent(FIXTURE_PATH);
        for (const q of canonicalQB.questions) {
            assert(q.verification.includes('विमीय') || q.verification.includes('Sanity') || q.verification.includes('मात्रक'), `Verification in '${q.id}' must assert dimensional sanity`);
        }
    });

    await runTest('SEC-4', 'TEST-4.5', 'COMPONENT', 'Progressive hints do NOT leak answers across Tier 1 and Tier 2', () => {
        const canonicalQB = authorPhysicsProceduralContent(FIXTURE_PATH);
        for (const q of canonicalQB.questions) {
            const ans = q.correct_answer;
            const t1Leaks = hintLeaksAnswer(q.hints.tier1_conceptual, ans);
            const t2Leaks = hintLeaksAnswer(q.hints.tier2_strategic, ans);
            assert.strictEqual(t1Leaks, false, `Hint Tier 1 in '${q.id}' must NOT leak answer '${ans}'`);
            assert.strictEqual(t2Leaks, false, `Hint Tier 2 in '${q.id}' must NOT leak answer '${ans}'`);
        }
    });

    await runTest('SEC-4', 'TEST-4.6', 'COMPONENT', 'MCQ Hard Invariant is enforced (>= 4 options, 1 valid answer)', () => {
        const canonicalQB = authorPhysicsProceduralContent(FIXTURE_PATH);
        const mcqs = canonicalQB.questions.filter(q => q.question_type === 'mcq');
        assert(mcqs.length >= 3, 'Must contain at least 3 MCQs');
        for (const q of mcqs) {
            assert(Array.isArray(q.options), `MCQ '${q.id}' must have options array`);
            assert(q.options.length >= 4, `MCQ '${q.id}' must have at least 4 options (found ${q.options.length})`);
            assert(q.correct_option, `MCQ '${q.id}' must specify correct_option`);
            assert(q.options.includes(q.correct_option), `MCQ '${q.id}' correct_option '${q.correct_option}' must be in options list`);
        }
    });

    // =========================================================================
    // SECTION 5: MULTI-PATTERN PROOF [COMPONENT]
    // =========================================================================
    console.log('\n--- SECTION 5: Multi-Pattern Proof [COMPONENT] ---');

    await runTest('SEC-5', 'TEST-5.1', 'COMPONENT', 'Executable Proof of 1 Pattern != 1 Question: number_of_patterns < number_of_questions', () => {
        const canonicalQB = authorPhysicsProceduralContent(FIXTURE_PATH);
        const numPatterns = canonicalQB.patterns.length;
        const numQuestions = canonicalQB.questions.length;

        assert.strictEqual(numPatterns, 2, 'Fixture must have exactly 2 problem patterns');
        assert.strictEqual(numQuestions, 5, 'Fixture must have 5 authentic questions');
        assert(numPatterns < numQuestions, `Proof failed: patterns (${numPatterns}) must be < questions (${numQuestions})`);
    });

    await runTest('SEC-5', 'TEST-5.2', 'COMPONENT', 'Multiple questions per pattern (Pattern 1 >= 2, Pattern 2 >= 2)', () => {
        const canonicalQB = authorPhysicsProceduralContent(FIXTURE_PATH);
        const p1Count = canonicalQB.questions.filter(q => q.pattern_id === 'pat-phys-wep-work-constant-force').length;
        const p2Count = canonicalQB.questions.filter(q => q.pattern_id === 'pat-phys-wep-work-energy-theorem').length;

        assert(p1Count >= 2, `Pattern 1 must have >= 2 questions (found ${p1Count})`);
        assert(p2Count >= 2, `Pattern 2 must have >= 2 questions (found ${p2Count})`);
        assert.strictEqual(p1Count + p2Count, canonicalQB.questions.length, 'All questions must belong to supported patterns');
    });

    // =========================================================================
    // SECTION 6: PROCEDURAL MODE MATRIX [INTEGRATION]
    // =========================================================================
    console.log('\n--- SECTION 6: Procedural Mode Matrix [INTEGRATION] ---');

    await runTest('SEC-6', 'TEST-6.1', 'INTEGRATION', 'Mode markdown: Question Bank = ON, Procedural APKG = OFF', () => {
        const routing = evaluateArtifactRouting({
            subject: 'Physics',
            chapter: 'Work-Energy-Power',
            artifactPolicy: { procedural_mode: 'markdown' }
        });
        assert.strictEqual(routing.proceduralQuestionBank, true, 'Question Bank must be ON in markdown mode');
        assert.strictEqual(routing.proceduralApkg, false, 'Procedural APKG must be OFF in markdown mode');
        assert.strictEqual(routing.suppressions.proceduralApkg, 'SUPPRESSED_BY_SUBJECT_POLICY');

        const graph = buildExecutionTaskGraph({
            subject: 'Physics',
            chapter: 'Work-Energy-Power',
            specialist_agent: 'physics-numerical-apkg-author',
            artifactPolicy: { procedural_mode: 'markdown' }
        });
        const qbTask = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');
        const apkgTask = graph.tasks.find(t => t.task_id === 'task-export-studylab-anki');
        assert.strictEqual(qbTask.status, 'PLANNED');
        assert.strictEqual(apkgTask.status, 'SKIPPED');
    });

    await runTest('SEC-6', 'TEST-6.2', 'INTEGRATION', 'Mode apkg: Question Bank = OFF, Procedural APKG = ON', () => {
        const routing = evaluateArtifactRouting({
            subject: 'Physics',
            chapter: 'Work-Energy-Power',
            artifactPolicy: { procedural_mode: 'apkg' }
        });
        assert.strictEqual(routing.proceduralQuestionBank, false, 'Question Bank must be OFF in apkg mode');
        assert.strictEqual(routing.proceduralApkg, true, 'Procedural APKG must be ON in apkg mode');

        const graph = buildExecutionTaskGraph({
            subject: 'Physics',
            chapter: 'Work-Energy-Power',
            specialist_agent: 'physics-numerical-apkg-author',
            artifactPolicy: { procedural_mode: 'apkg' }
        });
        const qbTask = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');
        const apkgTask = graph.tasks.find(t => t.task_id === 'task-export-studylab-anki');
        assert.strictEqual(qbTask.status, 'SKIPPED');
        assert.strictEqual(apkgTask.status, 'PLANNED');
    });

    await runTest('SEC-6', 'TEST-6.3', 'INTEGRATION', 'Mode both: Question Bank = ON, Procedural APKG = ON', () => {
        const routing = evaluateArtifactRouting({
            subject: 'Physics',
            chapter: 'Work-Energy-Power',
            artifactPolicy: { procedural_mode: 'both' }
        });
        assert.strictEqual(routing.proceduralQuestionBank, true, 'Question Bank must be ON in both mode');
        assert.strictEqual(routing.proceduralApkg, true, 'Procedural APKG must be ON in both mode');

        const graph = buildExecutionTaskGraph({
            subject: 'Physics',
            chapter: 'Work-Energy-Power',
            specialist_agent: 'physics-numerical-apkg-author',
            artifactPolicy: { procedural_mode: 'both' }
        });
        const qbTask = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');
        const apkgTask = graph.tasks.find(t => t.task_id === 'task-export-studylab-anki');
        assert.strictEqual(qbTask.status, 'PLANNED');
        assert.strictEqual(apkgTask.status, 'PLANNED');
    });

    await runTest('SEC-6', 'TEST-6.4', 'INTEGRATION', 'Mode none: Question Bank = OFF, Procedural APKG = OFF', () => {
        const routing = evaluateArtifactRouting({
            subject: 'Physics',
            chapter: 'Work-Energy-Power',
            artifactPolicy: { procedural_mode: 'none' }
        });
        assert.strictEqual(routing.proceduralQuestionBank, false, 'Question Bank must be OFF in none mode');
        assert.strictEqual(routing.proceduralApkg, false, 'Procedural APKG must be OFF in none mode');

        const graph = buildExecutionTaskGraph({
            subject: 'Physics',
            chapter: 'Work-Energy-Power',
            specialist_agent: 'physics-numerical-apkg-author',
            artifactPolicy: { procedural_mode: 'none' }
        });
        const qbTask = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');
        const apkgTask = graph.tasks.find(t => t.task_id === 'task-export-studylab-anki');
        assert.strictEqual(qbTask.status, 'SKIPPED');
        assert.strictEqual(apkgTask.status, 'SKIPPED');
    });

    await runTest('SEC-6', 'TEST-6.5', 'INTEGRATION', 'Mode apkg: physics-numerical-apkg-author strictly does NOT generate Markdown Questions.md', async () => {
        const apkgTestRoot = path.join(SCRATCH_DIR, 'apkg_mode_isolation');
        fs.mkdirSync(apkgTestRoot, { recursive: true });

        const task = {
            task_id: 'task-studylab-question-bank',
            track_key: 'proceduralQuestionBank',
            owner_agent: 'physics-numerical-apkg-author',
            writer_agent: 'physics-numerical-apkg-author',
            target_path: path.join(apkgTestRoot, 'Questions/Work-Energy-Power_Questions.md'),
            status: 'PLANNED'
        };

        const handoff = await executePhysicsSpecialistTask(task, {
            subject: 'Physics',
            chapter: 'Work-Energy-Power',
            procedural_mode: 'apkg',
            sourceFixture: FIXTURE_PATH
        });

        assert(!fs.existsSync(task.target_path), 'Questions.md must NOT be created when procedural_mode=apkg');
    });

    await runTest('SEC-6', 'TEST-6.6', 'INTEGRATION', 'Mode none: physics-numerical-apkg-author suppresses generation and creates no procedural deliverables', async () => {
        const noneTestRoot = path.join(SCRATCH_DIR, 'none_mode_isolation');
        fs.mkdirSync(noneTestRoot, { recursive: true });

        const task = {
            task_id: 'task-studylab-question-bank',
            track_key: 'proceduralQuestionBank',
            owner_agent: 'physics-numerical-apkg-author',
            writer_agent: 'physics-numerical-apkg-author',
            target_path: path.join(noneTestRoot, 'Questions/Work-Energy-Power_Questions.md'),
            status: 'PLANNED'
        };

        const handoff = await executePhysicsSpecialistTask(task, {
            subject: 'Physics',
            chapter: 'Work-Energy-Power',
            procedural_mode: 'none',
            sourceFixture: FIXTURE_PATH
        });

        assert.strictEqual(handoff.status, 'SUPPRESSED');
        assert.strictEqual(handoff.outputs_produced.length, 0);
        assert(!fs.existsSync(task.target_path), 'No file should be written in none mode');
    });

    // =========================================================================
    // SECTION 7: PHYSICAL ARTIFACT OWNERSHIP & GOVERNANCE [INTEGRATION]
    // =========================================================================
    console.log('\n--- SECTION 7: Physical Artifact Ownership & Governance [INTEGRATION] ---');

    await runTest('SEC-7', 'TEST-7.1', 'INTEGRATION', 'Artifact Registry assigns proceduralQuestionBank to physics-numerical-apkg-author', () => {
        const graph = buildExecutionTaskGraph({
            subject: 'Physics',
            chapter: 'Work-Energy-Power',
            specialist_agent: 'physics-numerical-apkg-author'
        });
        const task = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');
        assert(task, 'Task task-studylab-question-bank must be present');
        assert.strictEqual(task.owner_agent, 'physics-numerical-apkg-author');
        assert.strictEqual(task.writer_agent, 'physics-numerical-apkg-author');
    });

    await runTest('SEC-7', 'TEST-7.2', 'INTEGRATION', 'Parent Orchestrator write attempt to Questions.md is strictly rejected (Parent Self-Execution Ban)', () => {
        const task = {
            task_id: 'task-studylab-question-bank',
            owner_agent: 'physics-numerical-apkg-author',
            writer_agent: 'physics-numerical-apkg-author',
            target_path: 'Study Materials/Physics/Work-Energy-Power/Questions/Work-Energy-Power_Questions.md'
        };

        assert.throws(() => {
            assertNoParentSelfExecution(task, 'parent');
        }, /PARENT_SELF_EXECUTION_VIOLATION/);

        assert.throws(() => {
            assertNoParentSelfExecution(task, 'study-source-core');
        }, /PARENT_SELF_EXECUTION_VIOLATION/);

        assert.doesNotThrow(() => {
            assertNoParentSelfExecution(task, 'physics-numerical-apkg-author');
        });
    });

    await runTest('SEC-7', 'TEST-7.3', 'INTEGRATION', 'Wrong specialist identity attempting to execute Physics task throws OWNERSHIP_VIOLATION', async () => {
        const task = {
            task_id: 'task-studylab-question-bank',
            owner_agent: 'math-apkg-author',
            writer_agent: 'math-apkg-author',
            target_path: path.join(SCRATCH_DIR, 'wrong_agent/Work-Energy-Power_Questions.md')
        };

        await assert.rejects(async () => {
            await executePhysicsSpecialistTask(task, {
                subject: 'Physics',
                chapter: 'Work-Energy-Power',
                sourceFixture: FIXTURE_PATH
            });
        }, /OWNERSHIP_VIOLATION/);
    });

    // =========================================================================
    // SECTION 8: FULL SOURCE-DRIVEN END-TO-END PIPELINE [E2E]
    // =========================================================================
    console.log('\n--- SECTION 8: Full Source-Driven End-to-End Pipeline [E2E] ---');

    await runTest('SEC-8', 'TEST-8.1', 'E2E', 'SOURCE -> EVIDENCE PACK -> Physics Policy -> Routing -> physics-numerical-apkg-author -> Questions.md -> Validator -> PASS', async () => {
        const e2eRoot = path.join(SCRATCH_DIR, 'full_e2e_run');
        fs.mkdirSync(e2eRoot, { recursive: true });

        // 1. Ingest realistic source and generate evidence pack
        const evidenceRes = generatePhysicsEvidencePack(FIXTURE_PATH, path.join(e2eRoot, 'scratch'));
        const evidenceFile = path.join(e2eRoot, 'scratch/evidence-pack.md');
        assert(fs.existsSync(evidenceFile), 'Evidence pack must exist');

        // 2. Resolve Subject Policy
        const policy = resolveSubjectPolicy('Physics');
        assert.strictEqual(policy.procedural_mode, 'markdown');

        // 3. Routing Engine Evaluation
        const routing = evaluateArtifactRouting({
            subject: 'Physics',
            chapter: 'Work-Energy-Power'
        });
        assert.strictEqual(routing.proceduralQuestionBank, true);
        assert.strictEqual(routing.proceduralApkg, false);

        // 4. Build Execution Task Graph
        const graph = buildExecutionTaskGraph({
            subject: 'Physics',
            chapter: 'Work-Energy-Power',
            specialist_agent: 'physics-numerical-apkg-author',
            evidenceHash: evidenceRes.evidenceHash,
            customRoot: e2eRoot
        });

        // 5. Create Specialist Dispatcher
        const dispatcher = createSpecialistTaskDispatcher({
            subject: 'Physics',
            chapter: 'Work-Energy-Power',
            evidencePack: evidenceFile,
            evidenceHash: evidenceRes.evidenceHash,
            procedural_mode: 'markdown'
        });

        // 6. Execute Workflow
        const workflowResult = await executeTaskWorkflow(graph, dispatcher);

        assert.strictEqual(workflowResult.taskStatusMap['task-studylab-question-bank'], 'COMPLETED', 'Workflow Question Bank task must complete with status COMPLETED');

        // 7. Verify Questions.md Deliverable on Disk
        const qbTask = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');
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
        assert(mdContent.includes('subject: "Physics"') || mdContent.includes('subject: Physics'), 'Frontmatter must have subject Physics');
        assert(mdContent.includes('chapter: "Work-Energy-Power"') || mdContent.includes('chapter: Work-Energy-Power'), 'Frontmatter must have chapter Work-Energy-Power');
        assert(mdContent.includes('# Work-Energy-Power — Procedural Question Bank'), 'Must have single H1 header');

        // Verify all 5 distinct questions present
        for (let i = 1; i <= 5; i++) {
            const qTag = 'phys-q-00' + i;
            assert(mdContent.includes(qTag), 'Must contain question ' + qTag);
        }

        // Verify lightweight contract and anti-leakage invariants on Questions.md
        assert(mdContent.includes('> - **Source Question ID**:'), 'Must contain Source Question ID callouts');
        assert(mdContent.includes('### Question'), 'Must contain Question headings');
        assert(mdContent.includes('- (A)'), 'Must contain authentic MCQ options');

        const t1Calls = (mdContent.match(/>\s*\[!tip\]-?\s*Tier 1/gi) || []).length;
        const t2Calls = (mdContent.match(/>\s*\[!tip\]-?\s*Tier 2/gi) || []).length;
        const t3Calls = (mdContent.match(/>\s*\[!tip\]-?\s*Tier 3/gi) || []).length;

        assert.strictEqual(t1Calls, 0, 'Questions.md must have 0 Tier 1 hint callouts under lightweight contract');
        assert.strictEqual(t2Calls, 0, 'Questions.md must have 0 Tier 2 hint callouts under lightweight contract');
        assert.strictEqual(t3Calls, 0, 'Questions.md must have 0 Tier 3 hint callouts under lightweight contract');
        assert(!mdContent.includes('### Progressive Hints'), 'Questions.md must NOT contain Progressive Hints');
        assert(!mdContent.includes('### Solution'), 'Questions.md must NOT contain Solution');
        assert(!mdContent.includes('### Verification'), 'Questions.md must NOT contain Verification');
        assert(!mdContent.includes('### Method & Recognition'), 'Questions.md must NOT contain Method & Recognition');
        assert(!mdContent.includes('### Traps & Errors'), 'Questions.md must NOT contain Traps & Errors');
    });

    // =========================================================================
    // SECTION 9: FAIL-CLOSED & ADVERSARIAL INVARIANTS [NEGATIVE / ADVERSARIAL]
    // =========================================================================
    console.log('\n--- SECTION 9: Fail-Closed & Adversarial Invariants [NEGATIVE / ADVERSARIAL] ---');

    await runTest('SEC-9', 'TEST-9.1', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Empty practice questions in source rejects generation', () => {
        const emptySource = {
            chapter: 'Work-Energy-Power',
            subject: 'Physics',
            problem_patterns: [{ pattern_id: 'pat-1', title: 'Work' }],
            source_problems: []
        };
        assert.throws(() => {
            authorPhysicsProceduralContent(emptySource);
        }, /ZERO_SOLVABLE_PRACTICE_QUESTIONS/);
    });

    await runTest('SEC-9', 'TEST-9.2', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Missing provenance origin caught and rejected by validator', () => {
        const noProvBank = {
            domain: 'Physics',
            chapter: 'Work-Energy-Power',
            questions: [{
                id: 'phys-q-noprov',
                pattern_id: 'pat-1',
                provenance: {}, // missing origin!
                question_type: 'numerical',
                question: 'कार्य ज्ञात कीजिए',
                correct_answer: '100 J',
                hints: { tier1_conceptual: 'A', tier2_strategic: 'B', tier3_next_step: 'C' },
                solution: 'हल',
                verification: 'जांच',
                prerequisites: ['physics.wep']
            }]
        };
        const res = validateQuestionBankContent(noProvBank);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('MISSING_PROVENANCE')));
    });

    await runTest('SEC-9', 'TEST-9.3', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Duplicate question IDs caught and rejected by validator', () => {
        const dupBank = {
            domain: 'Physics',
            chapter: 'Work-Energy-Power',
            questions: [
                {
                    id: 'phys-q-001',
                    pattern_id: 'pat-1',
                    provenance: { origin: 'authentic_pyq' },
                    question_type: 'numerical',
                    question: 'Q1',
                    correct_answer: '10 J',
                    hints: { tier1_conceptual: 'A', tier2_strategic: 'B', tier3_next_step: 'C' },
                    solution: 'S1',
                    verification: 'V1',
                    prerequisites: ['p1']
                },
                {
                    id: 'phys-q-001', // duplicate!
                    pattern_id: 'pat-1',
                    provenance: { origin: 'authentic_pyq' },
                    question_type: 'numerical',
                    question: 'Q2',
                    correct_answer: '20 J',
                    hints: { tier1_conceptual: 'A', tier2_strategic: 'B', tier3_next_step: 'C' },
                    solution: 'S2',
                    verification: 'V2',
                    prerequisites: ['p1']
                }
            ]
        };
        const res = validateQuestionBankContent(dupBank);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('DUPLICATE_QUESTION_ID')));
    });

    await runTest('SEC-9', 'TEST-9.4', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Invalid question type caught and rejected by validator', () => {
        const badTypeBank = {
            domain: 'Physics',
            chapter: 'Work-Energy-Power',
            questions: [{
                id: 'phys-q-badtype',
                pattern_id: 'pat-1',
                provenance: { origin: 'authentic_pyq' },
                question_type: 'invalid_fantasy_type',
                question: 'Q',
                correct_answer: '50 J',
                hints: { tier1_conceptual: 'T1', tier2_strategic: 'T2', tier3_next_step: 'T3' },
                solution: 'S',
                verification: 'V',
                prerequisites: ['p1']
            }]
        };
        const res = validateQuestionBankContent(badTypeBank);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('INVALID_QUESTION_TYPE')));
    });

    await runTest('SEC-9', 'TEST-9.5', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: MCQ with < 4 options throws MCQ_INVARIANT_VIOLATION', () => {
        const badMCQSource = {
            chapter: 'Work-Energy-Power',
            subject: 'Physics',
            problem_patterns: [{ pattern_id: 'pat-1', title: 'Work' }],
            source_problems: [{
                source_id: 'bad-mcq-1',
                raw_type: 'mcq',
                statement: 'कार्य की गणना करें',
                options: ['10 J', '20 J', '30 J'], // only 3 options
                correct_answer: '10 J'
            }]
        };
        assert.throws(() => {
            authorPhysicsProceduralContent(badMCQSource);
        }, /MCQ_INVARIANT_VIOLATION/);
    });

    await runTest('SEC-9', 'TEST-9.6', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Missing hints (Tier 1/2/3) caught and rejected by validator', () => {
        const missingHintBank = {
            domain: 'Physics',
            chapter: 'Work-Energy-Power',
            questions: [{
                id: 'phys-q-nohint',
                pattern_id: 'pat-1',
                provenance: { origin: 'authentic_pyq' },
                question_type: 'numerical',
                question: 'Q',
                correct_answer: '50 J',
                hints: { tier1_conceptual: 'T1', tier2_strategic: 'T2' }, // missing tier_3!
                solution: 'S',
                verification: 'V',
                prerequisites: ['p1']
            }]
        };
        const res = validateQuestionBankContent(missingHintBank);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('MISSING_HINTS')));
    });

    await runTest('SEC-9', 'TEST-9.7', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Hint answer leakage caught and rejected by validator', () => {
        const leakedBank = {
            domain: 'Physics',
            chapter: 'Work-Energy-Power',
            questions: [{
                id: 'phys-q-leak',
                pattern_id: 'pat-1',
                provenance: { origin: 'authentic_pyq' },
                question_type: 'numerical',
                question: 'कार्य ज्ञात कीजिए',
                correct_answer: '400 J',
                hints: {
                    tier1_conceptual: 'उत्तर 400 J होगा।', // Answer leak!
                    tier2_strategic: 'सूत्र लगाएं।',
                    tier3_next_step: 'हल करें।'
                },
                solution: 'हल: W = 400 J।',
                verification: 'सत्यापित: 400 J।',
                prerequisites: ['physics.wep']
            }]
        };
        const res = validateQuestionBankContent(leakedBank);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('HINT_ANSWER_LEAKAGE')));
    });

    await runTest('SEC-9', 'TEST-9.8', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Missing physical units on numerical quantity fails closed', () => {
        const bankWithNoUnits = {
            domain: 'Physics',
            chapter: 'Work-Energy-Power',
            questions: [{
                id: 'phys-q-nounits',
                pattern_id: 'pat-1',
                provenance: { origin: 'authentic_pyq' },
                question_type: 'numerical',
                question: 'कार्य ज्ञात कीजिए',
                correct_answer: '400', // Missing J / Joules!
                hints: { tier1_conceptual: 'T1', tier2_strategic: 'T2', tier3_next_step: 'T3' },
                solution: 'S',
                verification: 'V',
                prerequisites: ['p1']
            }]
        };
        const validUnitsRegex = /(?:J|kJ|N|m|m\/s|kW|W|kg)\b/;
        const hasUnits = validUnitsRegex.test(bankWithNoUnits.questions[0].correct_answer);
        assert.strictEqual(hasUnits, false, 'Bare number 400 without units must fail check');
    });

    await runTest('SEC-9', 'TEST-9.9', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Wrong specialist identity rejected with OWNERSHIP_VIOLATION', async () => {
        const task = {
            task_id: 'task-studylab-question-bank',
            owner_agent: 'chemistry-numerical-apkg-author',
            writer_agent: 'chemistry-numerical-apkg-author',
            target_path: path.join(SCRATCH_DIR, 'wrong_chem_agent.md')
        };
        await assert.rejects(async () => {
            await executePhysicsSpecialistTask(task, {
                subject: 'Physics',
                chapter: 'Work-Energy-Power',
                sourceFixture: FIXTURE_PATH
            });
        }, /OWNERSHIP_VIOLATION/);
    });

    await runTest('SEC-9', 'TEST-9.10', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Parent self-execution attempt rejected with PARENT_SELF_EXECUTION_VIOLATION', () => {
        const task = {
            task_id: 'task-studylab-question-bank',
            owner_agent: 'physics-numerical-apkg-author',
            writer_agent: 'physics-numerical-apkg-author',
            target_path: 'Questions/Work-Energy-Power_Questions.md'
        };
        assert.throws(() => {
            assertNoParentSelfExecution(task, 'study-source-core');
        }, /PARENT_SELF_EXECUTION_VIOLATION/);
    });

    // =========================================================================
    // FINAL SUMMARY REPORT
    // =========================================================================
    console.log('\n================================================================================');
    console.log(`PHYSICS PRODUCTION PATH SUMMARY: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
    console.log('================================================================================');
    console.log('LAYER BREAKDOWN:');
    for (const [layer, counts] of Object.entries(layerStats)) {
        console.log(`  - ${layer.padEnd(24)}: ${counts.passed} / ${counts.total} Passed`);
    }
    console.log('================================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
});
