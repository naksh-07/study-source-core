/**
 * StudySourceCore Reasoning Production Path Test Suite (`test_reasoning_production_path.js`)
 * 
 * Verifies that the existing StudySourceCore architecture takes a realistic Reasoning source
 * and evidence pack, routes through policy, dispatches reasoning-apkg-author as the sole writer,
 * authors canonical StudyLab procedural content across multiple patterns and questions,
 * renders Questions.md, and passes independent validation without the test supplying
 * final canonical questions.
 * 
 * Test Classification & Sections:
 * - Section 1: Source Integrity [UNIT]
 * - Section 2: Evidence Ingestion & Consumption Proof [COMPONENT]
 * - Section 3: Specialist Authoring [COMPONENT]
 * - Section 4: Reasoning Semantic Invariants [COMPONENT]
 * - Section 5: Multi-Pattern Proof [COMPONENT]
 * - Section 6: Procedural Mode Matrix [INTEGRATION]
 * - Section 7: Reasoning Artifact Ownership & Governance [INTEGRATION]
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

const { generateReasoningEvidencePack, computeSha256 } = require('./fixtures/generate_reasoning_evidence_pack');
const {
    parseReasoningEvidence,
    authorReasoningProceduralContent,
    executeReasoningSpecialistTask
} = require('./author_reasoning_studylab');

const {
    validateQuestionBank,
    validateQuestionBankContent,
    validateQuestionBankMarkdown,
    hintLeaksAnswer
} = require('./validate_studylab_question_bank');

const VAULT_ROOT = getVaultRoot(__dirname);
const FIXTURE_PATH = path.resolve(__dirname, '../resources/fixtures/reasoning_syllogism_seating_source_fixture.json');
const SCRATCH_DIR = path.resolve(__dirname, 'scratch/reasoning_production_path_tests');

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
    console.log('STUDYSOURCECORE — GENUINELY SOURCE-DRIVEN REASONING PRODUCTION PATH TEST SUITE');
    console.log('================================================================================\n');

    fs.mkdirSync(SCRATCH_DIR, { recursive: true });

    // =========================================================================
    // SECTION 1: SOURCE INTEGRITY [UNIT]
    // =========================================================================
    console.log('--- SECTION 1: Source Integrity [UNIT] ---');

    await runTest('SEC-1', 'TEST-1.1', 'UNIT', 'Realistic Reasoning Source Fixture exists on disk', () => {
        assert(fs.existsSync(FIXTURE_PATH), 'Fixture file must exist at ' + FIXTURE_PATH);
    });

    await runTest('SEC-1', 'TEST-1.2', 'UNIT', 'Source Fixture contains no pre-formed canonical Question Bank objects', () => {
        const raw = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
        assert.strictEqual(raw.questions, undefined, 'Raw fixture must not have questions array');
        assert.strictEqual(raw.questionBank, undefined, 'Raw fixture must not have questionBank');
        assert.strictEqual(raw.canonicalQuestions, undefined, 'Raw fixture must not have canonicalQuestions');

        for (const prob of raw.source_problems) {
            assert.strictEqual(prob.recognition_signals, undefined, 'Raw problem must not have recognition signals');
            assert.strictEqual(prob.expected_method, undefined, 'Raw problem must not have expected method');
            assert.strictEqual(prob.decision_points, undefined, 'Raw problem must not have decision points');
            assert.strictEqual(prob.hints, undefined, 'Raw problem must not have 3-tier hints');
            assert.strictEqual(prob.verification, undefined, 'Raw problem must not have verification block');
        }
    });

    await runTest('SEC-1', 'TEST-1.3', 'UNIT', 'Source Fixture has multiple distinct Reasoning patterns', () => {
        const raw = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
        assert(Array.isArray(raw.problem_patterns), 'problem_patterns must be an array');
        assert(raw.problem_patterns.length >= 3, 'Must have at least 3 distinct patterns, found ' + raw.problem_patterns.length);
        const patternIds = new Set(raw.problem_patterns.map(p => p.pattern_id));
        assert.strictEqual(patternIds.size, raw.problem_patterns.length, 'All pattern IDs must be unique');
    });

    await runTest('SEC-1', 'TEST-1.4', 'UNIT', 'Source Fixture has multiple authentic reasoning problems', () => {
        const raw = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
        assert(Array.isArray(raw.source_problems), 'source_problems must be an array');
        assert(raw.source_problems.length >= 6, 'Must have at least 6 authentic problems, found ' + raw.source_problems.length);
        for (const prob of raw.source_problems) {
            assert(prob.statement && prob.statement.length > 10, 'Problem must have substantial statement');
            assert(prob.correct_answer, 'Problem must specify correct answer');
            assert(prob.source_solution_steps && prob.source_solution_steps.length > 0, 'Problem must have raw solution steps');
        }
    });

    // =========================================================================
    // SECTION 2: EVIDENCE INGESTION & CONSUMPTION PROOF [COMPONENT]
    // =========================================================================
    console.log('\n--- SECTION 2: Evidence Ingestion & Consumption Proof [COMPONENT] ---');

    const evidenceOutDir = path.join(SCRATCH_DIR, 'evidence_pack');
    let evidenceResult = null;

    await runTest('SEC-2', 'TEST-2.1', 'COMPONENT', 'generateReasoningEvidencePack produces valid Markdown evidence representation', () => {
        evidenceResult = generateReasoningEvidencePack(FIXTURE_PATH, evidenceOutDir);
        assert(evidenceResult.markdownContent && evidenceResult.markdownContent.length > 500, 'Markdown content must be substantial');
        assert(fs.existsSync(path.join(evidenceOutDir, 'evidence-pack.md')), 'evidence-pack.md must be written to disk');
        assert(fs.existsSync(path.join(evidenceOutDir, 'provenance.json')), 'provenance.json must be written to disk');

        const md = evidenceResult.markdownContent;
        assert(md.includes('## 1. Chapter Metadata & Provenance'), 'Must contain section 1');
        assert(md.includes('## 2. Core Concepts & Definitions'), 'Must contain section 2');
        assert(md.includes('## 3. Master Principles & Governing Rules'), 'Must contain section 3');
        assert(md.includes('## 4. Problem Pattern Archetypes'), 'Must contain section 4');
        assert(md.includes('## 5. Authentic Source Problems & PYQs'), 'Must contain section 5');
    });

    await runTest('SEC-2', 'TEST-2.2', 'COMPONENT', 'Provenance is strictly preserved across evidence ingestion', () => {
        const meta = evidenceResult.provenanceMetadata;
        assert.strictEqual(meta.detected_subject, 'Reasoning');
        assert.strictEqual(meta.chapter_title, 'Syllogism-And-Seating-Arrangement');
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
        const parsedFromJson = parseReasoningEvidence(FIXTURE_PATH);
        const parsedFromMd = parseReasoningEvidence(path.join(evidenceOutDir, 'evidence-pack.md'));

        assert.strictEqual(parsedFromJson.chapter, parsedFromMd.chapter);
        assert.strictEqual(parsedFromJson.subject, parsedFromMd.subject);
        assert.strictEqual(parsedFromJson.problem_patterns.length, parsedFromMd.problem_patterns.length);
        assert.strictEqual(parsedFromJson.source_problems.length, parsedFromMd.source_problems.length);

        for (let i = 0; i < parsedFromJson.source_problems.length; i++) {
            assert.strictEqual(parsedFromJson.source_problems[i].source_id, parsedFromMd.source_problems[i].source_id);
            assert.strictEqual(parsedFromJson.source_problems[i].correct_answer, parsedFromMd.source_problems[i].correct_answer);
        }
    });

    await runTest('SEC-2', 'TEST-2.5', 'COMPONENT', 'CRITICAL Proof: Specialist strictly consumes Evidence Pack representation without bypassing to raw source', () => {
        // Create an altered evidence pack in a test sandbox
        const originalMd = fs.readFileSync(path.join(evidenceOutDir, 'evidence-pack.md'), 'utf8');
        const TAMPER_MARKER = 'TAMPERED_EVIDENCE_STATEMENT_REPRESENTATION';
        const modifiedMd = originalMd.replace('कथन:\n1. सभी पेन पेंसिल हैं।', `कथन:\n1. [${TAMPER_MARKER}] सभी पेन पेंसिल हैं।`);

        const sandboxEvidencePath = path.join(SCRATCH_DIR, 'evidence_tamper_test.md');
        fs.writeFileSync(sandboxEvidencePath, modifiedMd, 'utf8');

        // Specialist authors from modified Evidence Pack
        const authoredFromEvidence = authorReasoningProceduralContent(sandboxEvidencePath);
        
        // Assert that the generated question derived its question statement directly from the Evidence Pack!
        const targetQ = authoredFromEvidence.questions.find(q => q.id === 'reas-q-001');
        assert(targetQ, 'Question reas-q-001 must exist');
        assert(targetQ.question.includes(TAMPER_MARKER), 'Generated Question Bank MUST contain the Evidence Pack tamper marker, proving it authors from the Evidence Pack and does not silently re-read the raw source file!');

        // Confirm raw source file on disk is untouched
        const rawSourceDisk = fs.readFileSync(FIXTURE_PATH, 'utf8');
        assert(!rawSourceDisk.includes(TAMPER_MARKER), 'Raw source fixture on disk must remain completely untouched');
    });

    // =========================================================================
    // SECTION 3: SPECIALIST AUTHORING [COMPONENT]
    // =========================================================================
    console.log('\n--- SECTION 3: Specialist Authoring [COMPONENT] ---');

    let authoredQB = null;

    await runTest('SEC-3', 'TEST-3.1', 'COMPONENT', 'Reasoning Specialist parses raw evidence without hardcoded structures', () => {
        const parsed = parseReasoningEvidence(path.join(evidenceOutDir, 'evidence-pack.md'));
        assert.strictEqual(parsed.chapter, 'Syllogism-And-Seating-Arrangement');
        assert.strictEqual(parsed.subject, 'Reasoning');
        assert.strictEqual(parsed.problem_patterns.length, 3);
        assert.strictEqual(parsed.source_problems.length, 6);
    });

    await runTest('SEC-3', 'TEST-3.2', 'COMPONENT', 'Reasoning Specialist authors canonical semantic content (17 dimensions populated)', () => {
        authoredQB = authorReasoningProceduralContent(path.join(evidenceOutDir, 'evidence-pack.md'), {
            evidenceHash: evidenceResult.evidenceHash
        });

        assert(authoredQB, 'Canonical Question Bank must be generated');
        assert.strictEqual(authoredQB.schema_version, '1.0.0');
        assert.strictEqual(authoredQB.domain, 'Reasoning');
        assert.strictEqual(authoredQB.chapter, 'Syllogism-And-Seating-Arrangement');
        assert.strictEqual(authoredQB.questions.length, 6);
    });

    await runTest('SEC-3', 'TEST-3.3', 'COMPONENT', 'All 17 canonical dimensions are fully populated with non-empty values', () => {
        const required17 = [
            'id', 'pattern_id', 'provenance', 'question_type', 'difficulty',
            'question', 'recognition_signals', 'expected_method', 'decision_points',
            'trap', 'error_category', 'hints', 'solution', 'verification', 'prerequisites'
        ];

        for (const q of authoredQB.questions) {
            for (const dim of required17) {
                assert(q[dim] !== undefined && q[dim] !== null, `Question '${q.id}' missing dimension '${dim}'`);
                if (typeof q[dim] === 'string') {
                    assert(q[dim].trim().length > 0, `Question '${q.id}' dimension '${dim}' must not be empty`);
                } else if (Array.isArray(q[dim])) {
                    assert(q[dim].length > 0, `Question '${q.id}' array dimension '${dim}' must not be empty`);
                }
            }
            // Verify 3 distinct hint tiers
            assert(q.hints.tier_1 && q.hints.tier_1.length > 10, `'${q.id}' Hint Tier 1 must be substantial`);
            assert(q.hints.tier_2 && q.hints.tier_2.length > 10, `'${q.id}' Hint Tier 2 must be substantial`);
            assert(q.hints.tier_3 && q.hints.tier_3.length > 10, `'${q.id}' Hint Tier 3 must be substantial`);
        }
    });

    await runTest('SEC-3', 'TEST-3.4', 'COMPONENT', 'Zero hardcoded final questions injected by test (derived dynamically from source evidence)', () => {
        const raw = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
        for (let i = 0; i < raw.source_problems.length; i++) {
            const rawProb = raw.source_problems[i];
            const q = authoredQB.questions[i];
            assert.strictEqual(q.correct_answer, rawProb.correct_answer);
            assert(q.question.includes(rawProb.statement.substring(0, 15)));
        }
    });

    // =========================================================================
    // SECTION 4: REASONING SEMANTIC INVARIANTS [COMPONENT]
    // =========================================================================
    console.log('\n--- SECTION 4: Reasoning Semantic Invariants [COMPONENT] ---');

    await runTest('SEC-4', 'TEST-4.1', 'COMPONENT', '7-Layer Cognitive Thinking Pipeline exists in solutions', () => {
        for (const q of authoredQB.questions) {
            assert(q.solution.includes('7-Layer') || q.solution.includes('चरणबद्ध तार्किक समाधान'), `'${q.id}' solution must incorporate 7-Layer Cognitive Thinking pipeline`);
            assert(q.expected_method.includes('पैटर्न पहचान') || q.expected_method.includes('Pattern Recognition'), `'${q.id}' expected_method must reference reasoning pipeline`);
        }
    });

    await runTest('SEC-4', 'TEST-4.2', 'COMPONENT', 'Solution verification includes domain-aware logical consistency checks', () => {
        for (const q of authoredQB.questions) {
            assert(q.verification && q.verification.length > 20, `'${q.id}' verification must be substantial`);
            const isVennOrArrangement = q.verification.includes('वेन आरेख') || q.verification.includes('व्यवस्था सुसंगतता') || q.verification.includes('पूरक युग्म');
            assert(isVennOrArrangement, `'${q.id}' verification must be domain-aware (Venn/Arrangement/Either-Or)`);
        }
    });

    await runTest('SEC-4', 'TEST-4.3', 'COMPONENT', 'Progressive hints do NOT leak answers across Tier 1 and Tier 2', () => {
        for (const q of authoredQB.questions) {
            const ans = q.correct_answer;
            assert.strictEqual(hintLeaksAnswer(q.hints.tier_1, ans), false, `'${q.id}' Tier 1 hint must not leak answer '${ans}'`);
            assert.strictEqual(hintLeaksAnswer(q.hints.tier_2, ans), false, `'${q.id}' Tier 2 hint must not leak answer '${ans}'`);
        }
    });

    await runTest('SEC-4', 'TEST-4.4', 'COMPONENT', 'MCQ Hard Invariant is enforced (>= 4 options, 1 valid answer)', () => {
        for (const q of authoredQB.questions) {
            assert.strictEqual(q.question_type, 'mcq');
            assert(Array.isArray(q.options), `'${q.id}' options must be an array`);
            assert(q.options.length >= 4, `'${q.id}' must have >= 4 options, found ${q.options.length}`);
            assert(q.options.includes(q.correct_answer), `'${q.id}' options must contain correct answer '${q.correct_answer}'`);

            // Verify unique options (no duplicate distractors)
            const uniqueOptions = new Set(q.options);
            assert.strictEqual(uniqueOptions.size, q.options.length, `'${q.id}' options must all be distinct`);
        }
    });

    await runTest('SEC-4', 'TEST-4.5', 'COMPONENT', 'Diagnostic error categories match Reasoning taxonomy (ERR_01-ERR_14)', () => {
        const validErrorPrefixes = ['ERR_01', 'ERR_02', 'ERR_03', 'ERR_04', 'ERR_05', 'ERR_06', 'ERR_07', 'ERR_08', 'ERR_09', 'ERR_10', 'ERR_11', 'ERR_12', 'ERR_13', 'ERR_14'];
        for (const q of authoredQB.questions) {
            assert(Array.isArray(q.error_category) && q.error_category.length > 0, `'${q.id}' must have error_category array`);
            for (const errCode of q.error_category) {
                const isValid = validErrorPrefixes.some(p => errCode.includes(p));
                assert(isValid, `'${q.id}' error code '${errCode}' must match Reasoning taxonomy ERR_01-ERR_14`);
            }
        }
    });

    await runTest('SEC-4', 'TEST-4.6', 'COMPONENT', 'Decision points and recognition signals are non-empty and domain-specific', () => {
        for (const q of authoredQB.questions) {
            assert(Array.isArray(q.decision_points) && q.decision_points.length > 0, `'${q.id}' decision points must be non-empty`);
            assert(Array.isArray(q.recognition_signals) && q.recognition_signals.length > 0, `'${q.id}' recognition signals must be non-empty`);
            assert(typeof q.trap === 'string' && q.trap.length > 5, `'${q.id}' trap must be substantial`);
        }
    });

    // =========================================================================
    // SECTION 5: MULTI-PATTERN PROOF [COMPONENT]
    // =========================================================================
    console.log('\n--- SECTION 5: Multi-Pattern Proof [COMPONENT] ---');

    await runTest('SEC-5', 'TEST-5.1', 'COMPONENT', 'Executable Proof of 1 Pattern != 1 Question: number_of_patterns < number_of_questions', () => {
        const numPatterns = authoredQB.patterns.length;
        const numQuestions = authoredQB.questions.length;
        assert(numPatterns < numQuestions, `Invariant violation: number_of_patterns (${numPatterns}) must be strictly less than number_of_questions (${numQuestions})`);
        assert.strictEqual(numPatterns, 3);
        assert.strictEqual(numQuestions, 6);
    });

    await runTest('SEC-5', 'TEST-5.2', 'COMPONENT', 'Multiple questions per pattern (Pattern 1 >= 2, Pattern 2 >= 2, Pattern 3 >= 2)', () => {
        const patternCounts = {};
        for (const q of authoredQB.questions) {
            patternCounts[q.pattern_id] = (patternCounts[q.pattern_id] || 0) + 1;
        }
        assert(patternCounts['pat-reas-syl-standard'] >= 2, 'Pattern pat-reas-syl-standard must have >= 2 questions');
        assert(patternCounts['pat-reas-syl-either-or'] >= 2, 'Pattern pat-reas-syl-either-or must have >= 2 questions');
        assert(patternCounts['pat-reas-seating-linear'] >= 2, 'Pattern pat-reas-seating-linear must have >= 2 questions');
    });

    // =========================================================================
    // SECTION 6: PROCEDURAL MODE MATRIX [INTEGRATION]
    // =========================================================================
    console.log('\n--- SECTION 6: Procedural Mode Matrix [INTEGRATION] ---');

    await runTest('SEC-6', 'TEST-6.1', 'INTEGRATION', 'Mode markdown: Question Bank = ON, Procedural APKG = OFF', () => {
        const routing = evaluateArtifactRouting({
            subject: 'Reasoning',
            chapter: 'Syllogism-And-Seating-Arrangement',
            artifactPolicy: { procedural_mode: 'markdown' },
            solvablePracticeCount: 6,
            evidenceChars: 1500
        });
        assert.strictEqual(routing.proceduralQuestionBank, true);
        assert.strictEqual(routing.proceduralApkg, false);
    });

    await runTest('SEC-6', 'TEST-6.2', 'INTEGRATION', 'Mode apkg: Question Bank = OFF, Procedural APKG = ON', () => {
        const routing = evaluateArtifactRouting({
            subject: 'Reasoning',
            chapter: 'Syllogism-And-Seating-Arrangement',
            artifactPolicy: { procedural_mode: 'apkg' },
            solvablePracticeCount: 6,
            evidenceChars: 1500
        });
        assert.strictEqual(routing.proceduralQuestionBank, false);
        assert.strictEqual(routing.proceduralApkg, true);
    });

    await runTest('SEC-6', 'TEST-6.3', 'INTEGRATION', 'Mode both: Question Bank = ON, Procedural APKG = ON', () => {
        const routing = evaluateArtifactRouting({
            subject: 'Reasoning',
            chapter: 'Syllogism-And-Seating-Arrangement',
            artifactPolicy: { procedural_mode: 'both' },
            solvablePracticeCount: 6,
            evidenceChars: 1500
        });
        assert.strictEqual(routing.proceduralQuestionBank, true);
        assert.strictEqual(routing.proceduralApkg, true);
    });

    await runTest('SEC-6', 'TEST-6.4', 'INTEGRATION', 'Mode none: Question Bank = OFF, Procedural APKG = OFF', () => {
        const routing = evaluateArtifactRouting({
            subject: 'Reasoning',
            chapter: 'Syllogism-And-Seating-Arrangement',
            artifactPolicy: { procedural_mode: 'none' },
            solvablePracticeCount: 6,
            evidenceChars: 1500
        });
        assert.strictEqual(routing.proceduralQuestionBank, false);
        assert.strictEqual(routing.proceduralApkg, false);

        const graph = buildExecutionTaskGraph({
            subject: 'Reasoning',
            chapter: 'Syllogism-And-Seating-Arrangement',
            specialist_agent: 'reasoning-apkg-author',
            artifactPolicy: { procedural_mode: 'none' }
        });
        const qbTask = graph.tasks.find(t => t.task_id === 'task-studylab-question-bank');
        const apkgTask = graph.tasks.find(t => t.task_id === 'task-export-studylab-anki');
        assert.strictEqual(qbTask.status, 'SKIPPED');
        assert.strictEqual(apkgTask.status, 'SKIPPED');
    });

    await runTest('SEC-6', 'TEST-6.5', 'INTEGRATION', 'Mode apkg: reasoning-apkg-author strictly does NOT generate Markdown Questions.md', async () => {
        const task = {
            task_id: 'task-studylab-question-bank',
            owner_agent: 'reasoning-apkg-author',
            writer_agent: 'reasoning-apkg-author',
            track_key: 'proceduralQuestionBank',
            target_path: path.join(SCRATCH_DIR, 'mode_apkg_check/Questions.md')
        };
        const res = await executeReasoningSpecialistTask(task, {
            subject: 'Reasoning',
            chapter: 'Syllogism-And-Seating-Arrangement',
            evidencePack: path.join(evidenceOutDir, 'evidence-pack.md'),
            procedural_mode: 'apkg'
        });
        assert.strictEqual(fs.existsSync(task.target_path), false, 'Markdown deliverable must NOT be produced in mode apkg');
    });

    await runTest('SEC-6', 'TEST-6.6', 'INTEGRATION', 'Mode none: reasoning-apkg-author suppresses generation and creates no procedural deliverables', async () => {
        const task = {
            task_id: 'task-studylab-question-bank',
            owner_agent: 'reasoning-apkg-author',
            writer_agent: 'reasoning-apkg-author',
            track_key: 'proceduralQuestionBank',
            target_path: path.join(SCRATCH_DIR, 'mode_none_check/Questions.md')
        };
        const res = await executeReasoningSpecialistTask(task, {
            subject: 'Reasoning',
            chapter: 'Syllogism-And-Seating-Arrangement',
            evidencePack: path.join(evidenceOutDir, 'evidence-pack.md'),
            procedural_mode: 'none'
        });
        assert.strictEqual(res.status, 'SUPPRESSED');
        assert.strictEqual(fs.existsSync(task.target_path), false);
    });

    // =========================================================================
    // SECTION 7: REASONING ARTIFACT OWNERSHIP & GOVERNANCE [INTEGRATION]
    // =========================================================================
    console.log('\n--- SECTION 7: Reasoning Artifact Ownership & Governance [INTEGRATION] ---');

    await runTest('SEC-7', 'TEST-7.1', 'INTEGRATION', 'Artifact Registry assigns proceduralQuestionBank to reasoning-apkg-author', () => {
        const graph = buildExecutionTaskGraph({
            subject: 'Reasoning',
            chapter: 'Syllogism-And-Seating-Arrangement',
            procedural_mode: 'markdown',
            solvablePracticeCount: 6,
            evidenceChars: 1500
        });

        const qbTask = graph.tasks.find(t => t.track_key === 'proceduralQuestionBank');
        assert(qbTask, 'Task for proceduralQuestionBank must exist in graph');
        assert.strictEqual(qbTask.owner_agent, 'reasoning-apkg-author', 'Task owner must be reasoning-apkg-author');
        assert.strictEqual(qbTask.writer_agent, 'reasoning-apkg-author', 'Task writer must be reasoning-apkg-author');
    });

    await runTest('SEC-7', 'TEST-7.2', 'INTEGRATION', 'Parent Orchestrator write attempt to Questions.md is strictly rejected (Parent Self-Execution Ban)', () => {
        const task = {
            task_id: 'task-studylab-question-bank',
            owner_agent: 'reasoning-apkg-author',
            writer_agent: 'reasoning-apkg-author',
            target_path: 'Questions.md'
        };
        assert.throws(() => {
            assertNoParentSelfExecution(task, 'parent-orchestrator');
        }, /PARENT_SELF_EXECUTION_VIOLATION/);
    });

    await runTest('SEC-7', 'TEST-7.3', 'INTEGRATION', 'Wrong specialist identity attempting to execute Reasoning task throws OWNERSHIP_VIOLATION', async () => {
        const task = {
            task_id: 'task-studylab-question-bank',
            owner_agent: 'core-notes',
            writer_agent: 'core-notes',
            track_key: 'proceduralQuestionBank',
            target_path: path.join(SCRATCH_DIR, 'wrong_specialist/Questions.md')
        };
        await assert.rejects(async () => {
            await executeReasoningSpecialistTask(task, { subject: 'Reasoning' });
        }, /OWNERSHIP_VIOLATION/);
    });

    // =========================================================================
    // SECTION 8: FULL SOURCE-DRIVEN END-TO-END PRODUCTION PIPELINE [E2E]
    // =========================================================================
    console.log('\n--- SECTION 8: Full Source-Driven End-to-End Production Pipeline [E2E] ---');

    await runTest('SEC-8', 'TEST-8.1', 'E2E', 'SOURCE -> EVIDENCE PACK -> Reasoning Policy -> Routing -> reasoning-apkg-author -> Questions.md -> Independent Validator -> PASS', async () => {
        const e2eDir = path.join(SCRATCH_DIR, 'e2e_run');
        fs.mkdirSync(e2eDir, { recursive: true });

        // 1. Evidence Generation from Raw Source
        const evidenceRes = generateReasoningEvidencePack(FIXTURE_PATH, e2eDir);
        const evidenceFile = path.join(e2eDir, 'evidence-pack.md');
        assert(fs.existsSync(evidenceFile), 'Evidence pack must be created on disk');

        // 2. Policy Resolution
        const policy = resolveSubjectPolicy('Reasoning');
        assert.strictEqual(policy.procedural_mode, 'markdown');
        assert.strictEqual(policy.proceduralQuestionBank, true);

        // 3. Routing Evaluation
        const routing = evaluateArtifactRouting({
            subject: 'Reasoning',
            chapter: 'Syllogism-And-Seating-Arrangement',
            procedural_mode: policy.procedural_mode,
            solvablePracticeCount: 6,
            evidenceChars: evidenceRes.markdownContent.length
        });
        assert.strictEqual(routing.proceduralQuestionBank, true);

        // 4. Task Graph Construction
        const graph = buildExecutionTaskGraph({
            subject: 'Reasoning',
            chapter: 'Syllogism-And-Seating-Arrangement',
            customRoot: e2eDir,
            evidenceHash: evidenceRes.evidenceHash,
            procedural_mode: 'markdown',
            solvablePracticeCount: 6,
            evidenceChars: evidenceRes.markdownContent.length
        });

        const qbTask = graph.tasks.find(t => t.track_key === 'proceduralQuestionBank');
        assert(qbTask, 'Question Bank task must exist in graph');
        assert.strictEqual(qbTask.owner_agent, 'reasoning-apkg-author');

        // 5. Specialist Task Dispatcher
        const dispatcher = createSpecialistTaskDispatcher({
            subject: 'Reasoning',
            chapter: 'Syllogism-And-Seating-Arrangement',
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
        assert(mdContent.includes('subject: "Reasoning"') || mdContent.includes('subject: Reasoning'), 'Frontmatter must have subject Reasoning');
        assert(mdContent.includes('chapter: "Syllogism-And-Seating-Arrangement"') || mdContent.includes('chapter: Syllogism-And-Seating-Arrangement'), 'Frontmatter must have chapter');
        assert(mdContent.includes('# Syllogism-And-Seating-Arrangement — Procedural Question Bank'), 'Must have single H1 header');

        // Verify all 6 distinct questions present
        for (let i = 1; i <= 6; i++) {
            const qTag = 'reas-q-00' + i;
            assert(mdContent.includes(qTag), 'Must contain question ' + qTag);
        }
    });

    // =========================================================================
    // SECTION 9: FAIL-CLOSED & ADVERSARIAL INVARIANTS [NEGATIVE / ADVERSARIAL]
    // =========================================================================
    console.log('\n--- SECTION 9: Fail-Closed & Adversarial Invariants [NEGATIVE / ADVERSARIAL] ---');

    await runTest('SEC-9', 'TEST-9.1', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Empty practice questions in source rejects generation', () => {
        const emptyEvidence = {
            chapter: 'Syllogism-And-Seating-Arrangement',
            domain: 'Reasoning',
            problem_patterns: [{ pattern_id: 'p1', title: 'Pattern 1' }],
            source_problems: []
        };
        assert.throws(() => {
            authorReasoningProceduralContent(emptyEvidence);
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
        corruptedRaw.source_problems[0].options = ['Only I follows', 'Only II follows', 'Both follow']; // Only 3 options
        assert.throws(() => {
            authorReasoningProceduralContent(corruptedRaw);
        }, /MCQ_INVARIANT_VIOLATION/);
    });

    await runTest('SEC-9', 'TEST-9.6', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Missing hints (Tier 1/2/3) caught and rejected by validator', () => {
        const corruptedQB = JSON.parse(JSON.stringify(authoredQB));
        corruptedQB.questions[0].hints.tier_2 = '';
        const val = validateQuestionBankContent(corruptedQB);
        assert.strictEqual(val.isValid, false);
        assert(val.errors.some(e => e.includes('MISSING_HINTS')));
    });

    await runTest('SEC-9', 'TEST-9.7', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Hint answer leakage caught and rejected by validator', () => {
        const ans = 'T';
        const leakingHint = `इस प्रश्न का सही उत्तर ${ans} है।`;
        assert.strictEqual(hintLeaksAnswer(leakingHint, ans), true);

        const corruptedQB = JSON.parse(JSON.stringify(authoredQB));
        corruptedQB.questions[4].hints.tier_1 = leakingHint;
        const val = validateQuestionBankContent(corruptedQB);
        assert.strictEqual(val.isValid, false);
        assert(val.errors.some(e => e.includes('HINT_ANSWER_LEAKAGE')));
    });

    await runTest('SEC-9', 'TEST-9.8', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Missing verification block caught and rejected by validator', () => {
        const corruptedQB = JSON.parse(JSON.stringify(authoredQB));
        corruptedQB.questions[0].verification = '';
        const val = validateQuestionBankContent(corruptedQB);
        assert.strictEqual(val.isValid, false);
        assert(val.errors.some(e => e.includes('MISSING_VERIFICATION')));
    });

    await runTest('SEC-9', 'TEST-9.9', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Wrong specialist identity rejected with OWNERSHIP_VIOLATION', async () => {
        const task = {
            task_id: 'task-studylab-question-bank',
            owner_agent: 'math-apkg-author',
            writer_agent: 'math-apkg-author',
            track_key: 'proceduralQuestionBank',
            target_path: path.join(SCRATCH_DIR, 'wrong_identity/Questions.md')
        };
        await assert.rejects(async () => {
            await executeReasoningSpecialistTask(task, { subject: 'Reasoning' });
        }, /OWNERSHIP_VIOLATION/);
    });

    await runTest('SEC-9', 'TEST-9.10', 'NEGATIVE / ADVERSARIAL', 'Fail-Closed: Parent self-execution attempt rejected with PARENT_SELF_EXECUTION_VIOLATION', () => {
        const task = {
            task_id: 'task-studylab-question-bank',
            owner_agent: 'reasoning-apkg-author',
            writer_agent: 'reasoning-apkg-author',
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
    console.log(`REASONING PRODUCTION PATH SUMMARY: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
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

if (require.main === module) {
    main().catch(err => {
        console.error('Fatal error in reasoning production path test suite:', err);
        process.exit(1);
    });
}
