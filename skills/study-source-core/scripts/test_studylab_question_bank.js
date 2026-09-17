/**
 * StudySourceCore vNext StudyLab Question Bank Test Suite (`test_studylab_question_bank.js`)
 * 
 * Verifies all 10 core Phase 1 requirements:
 * 1. Policy resolution
 * 2. Artifact registry & path resolution
 * 3. Renderer determinism & complete semantic output
 * 4. Validator happy path (canonical data & markdown)
 * 5. Invalid / duplicate question IDs
 * 6. Missing provenance & invalid origins
 * 7. Missing hints across tiers 1, 2, 3
 * 8. Answer leakage in hints (Tier 1 & Tier 2)
 * 9. Invalid question type & MCQ < 4 options
 * 10. Empty question bank fail-closed
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { resolveSubjectPolicy } = require('./subject_policy_resolver');
const { getArtifactRegistry, getArtifactDefinition } = require('./artifact_registry');
const { getCanonicalArtifactPaths } = require('./path_resolver');
const { evaluateArtifactRouting } = require('./routing_engine');
const { renderQuestionBankToMarkdown, compileCanonicalQuestionBank } = require('./render_studylab_question_bank');
const { validateQuestionBankContent, validateQuestionBankMarkdown, hintLeaksAnswer } = require('./validate_studylab_question_bank');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(testName, testFn) {
    totalTests++;
    try {
        testFn();
        console.log(`  ✅ PASS: ${testName}`);
        passedTests++;
    } catch (e) {
        console.error(`  ❌ FAIL: ${testName}`);
        console.error(`     Error: ${e.message}`);
        failedTests++;
    }
}

console.log('====================================================');
console.log('StudySourceCore StudyLab Question Bank Test Suite');
console.log('====================================================\n');

// ----------------------------------------------------
// 1. POLICY RESOLUTION
// ----------------------------------------------------
console.log('--- 1. Policy Resolution ---');

runTest('Math resolves to procedural_mode=markdown with proceduralQuestionBank=true and proceduralApkg=false', () => {
    const policy = resolveSubjectPolicy('Math');
    assert.strictEqual(policy.procedural_mode, 'markdown');
    assert.strictEqual(policy.proceduralQuestionBank, true);
    assert.strictEqual(policy.proceduralApkg, false);
    assert.strictEqual(policy.procedural_apkg, false);
});

runTest('Physics, Chemistry, and Reasoning resolve to procedural_mode=markdown', () => {
    for (const subj of ['Physics', 'Chemistry', 'Reasoning']) {
        const policy = resolveSubjectPolicy(subj);
        assert.strictEqual(policy.procedural_mode, 'markdown', `${subj} procedural_mode should be markdown`);
        assert.strictEqual(policy.proceduralQuestionBank, true, `${subj} proceduralQuestionBank should be true`);
        assert.strictEqual(policy.proceduralApkg, false, `${subj} proceduralApkg should be false`);
    }
});

runTest('Non-STEM subjects (Biology, Geography, History, Map, Political Science) resolve to procedural_mode=none', () => {
    for (const subj of ['Biology', 'Geography', 'History', 'Map', 'Political Science']) {
        const policy = resolveSubjectPolicy(subj);
        assert.strictEqual(policy.procedural_mode, 'none', `${subj} procedural_mode should be none`);
        assert.strictEqual(policy.proceduralQuestionBank, false, `${subj} proceduralQuestionBank should be false`);
        assert.strictEqual(policy.proceduralApkg, false, `${subj} proceduralApkg should be false`);
    }
});

runTest('Routing engine defaults Math to proceduralQuestionBank=true and suppresses proceduralApkg', () => {
    const routing = evaluateArtifactRouting({
        subject: 'Math',
        chapter: 'LCM-HCF'
    });
    assert.strictEqual(routing.proceduralQuestionBank, true);
    assert.strictEqual(routing.proceduralApkg, false);
    assert.strictEqual(routing.suppressions.proceduralApkg, 'SUPPRESSED_BY_SUBJECT_POLICY');
});

runTest('Invalid procedural_mode throws INVALID_POLICY_SCHEMA', () => {
    assert.throws(() => {
        const dummySubject = 'DummySubj';
        const dummyDir = path.join(__dirname, '..', 'subject-skills', dummySubject);
        const { VALID_SUBJECTS } = require('./subject_policy_resolver');
        VALID_SUBJECTS.push(dummySubject);
        fs.mkdirSync(dummyDir, { recursive: true });
        try {
            fs.writeFileSync(path.join(dummyDir, 'runtime-policy.json'), JSON.stringify({
                notes: true, basic: true, cloze: true, imageOcclusion: true, mindmap: true, slideDeck: true,
                practiceQuestions: true, problemPatterns: true, apkg: true, proceduralApkg: false,
                proceduralQuestionBank: true, bmGraph: true, bmQa: true,
                procedural_mode: 'invalid_mode'
            }));
            resolveSubjectPolicy(dummySubject);
        } finally {
            fs.unlinkSync(path.join(dummyDir, 'runtime-policy.json'));
            fs.rmdirSync(dummyDir);
            VALID_SUBJECTS.pop();
        }
    }, /INVALID_POLICY_SCHEMA/);
});

// ----------------------------------------------------
// 2. ARTIFACT REGISTRY & PATH RESOLVER
// ----------------------------------------------------
console.log('\n--- 2. Artifact Registry & Path Resolution ---');

runTest('Artifact registry contains proceduralQuestionBank with valid definition', () => {
    const registry = getArtifactRegistry();
    assert(registry.proceduralQuestionBank, 'proceduralQuestionBank must be in registry');
    const def = registry.proceduralQuestionBank;
    assert.strictEqual(def.task_id, 'task-studylab-question-bank');
    assert.strictEqual(def.output_dir, 'Questions');
    assert.strictEqual(def.file_pattern, '{chapter}_Questions.md');
    assert.strictEqual(def.validator, 'validate_studylab_question_bank.js');
    assert.strictEqual(def.validator_export, 'validateQuestionBank');
    assert.strictEqual(def.validator_format, 'path');
});

runTest('Path resolver correctly resolves canonical Questions directory path', () => {
    const paths = getCanonicalArtifactPaths('Math', 'LCM-HCF');
    assert(paths.proceduralQuestionBank, 'paths.proceduralQuestionBank must exist');
    assert(paths.proceduralQuestionBank.path.endsWith(path.join('Questions', 'LCM-HCF_Questions.md')));
    assert.strictEqual(paths.proceduralQuestionBank.relPath, path.join('Questions', 'LCM-HCF_Questions.md'));
});

// ----------------------------------------------------
// 3. RENDERER DETERMINISM & COMPLETE SEMANTIC OUTPUT
// ----------------------------------------------------
console.log('\n--- 3. Renderer Determinism & Semantics ---');

const sampleValidCanonical = {
    schema_version: '1.0.0',
    domain: 'Mathematics',
    chapter: 'LCM-HCF',
    skill_id: 'math.number_system.lcm_hcf',
    language: 'hi',
    provenance: {
        source: 'Authentic RRB ALP Past Exam Papers (2018-2024)',
        chapter: 'LCM-HCF'
    },
    questions: [
        {
            id: 'math-q-001',
            pattern_id: 'pat-math-lcm-001',
            provenance: {
                origin: 'authentic_pyq',
                source: 'RRB ALP 2018 Shift 1'
            },
            question_type: 'numerical',
            difficulty: 2.0,
            question: 'दो संख्याओं का गुणनफल 2160 है तथा उनका महत्तम समापवर्तक (HCF) 12 है। उनका लघुत्तम समापवर्त्य (LCM) ज्ञात कीजिए।',
            recognition_signals: ['दो संख्याओं का गुणनफल दिया हो', 'HCF ज्ञात हो और LCM पूछा हो'],
            expected_method: 'LCM × HCF = पहली संख्या × दूसरी संख्या (गुणनफल)',
            decision_points: ['गुणनफल को HCF से विभाजित करें'],
            trap: 'गुणनफल को HCF के वर्ग से विभाजित करना।',
            error_category: ['ERR_01', 'ERR_06'],
            hints: {
                tier1_conceptual: 'दो संख्याओं के LCM और HCF के गुणनफल का मौलिक संबंध स्मरण करें।',
                tier2_strategic: 'सूत्र: LCM = (संख्याओं का गुणनफल) / HCF स्थापित करें।',
                tier3_next_step: '2160 को 12 से विभाजित करें।'
            },
            solution: 'सूत्रानुसार:\nLCM × HCF = दो संख्याओं का गुणनफल\nLCM × 12 = 2160\nLCM = 2160 / 12 = 180.',
            verification: 'जांच: 180 × 12 = 2160 (सत्यापित)।',
            prerequisites: ['math.arithmetic.multiplication', 'math.factors.hcf_definition']
        },
        {
            id: 'math-q-002',
            pattern_id: 'pat-math-lcm-002',
            provenance: {
                origin: 'authentic_pyq',
                source: 'SSC CGL 2020'
            },
            question_type: 'mcq',
            difficulty: 2.5,
            question: 'वह सबसे छोटी संख्या कौन-सी है जिसे 12, 15 तथा 20 से विभाजित करने पर प्रत्येक स्थिति में शेषफल 4 बचता है?',
            options: ['64', '56', '60', '74'],
            correct_option: '64',
            correct_answer: '64',
            recognition_signals: ['सबसे छोटी संख्या पूछी गई हो', 'प्रत्येक स्थिति में समान शेषफल बचे'],
            expected_method: 'दी गई संख्याओं का LCM ज्ञात करें और उसमें शेषफल जोड़ें: (LCM + R)',
            decision_points: ['दी गई संख्याओं का अभाज्य गुणनखंडन करें', 'LCM निकालें', 'शेषफल 4 जोड़ें'],
            trap: 'LCM निकालने के बाद शेषफल घटा देना या केवल संख्याओं को जोड़ना।',
            error_category: ['ERR_02'],
            hints: {
                tier1_conceptual: 'सबसे छोटी उभयनिष्ठ विभाज्य संख्या (LCM) की अवधारणा लागू करें।',
                tier2_strategic: '12, 15, 20 का LCM ज्ञात करके उसमें अभीष्ट शेषफल जोड़ें।',
                tier3_next_step: 'LCM(12, 15, 20) = 60; अब 60 में 4 जोड़ें।'
            },
            solution: '12, 15, 20 का LCM = 60\nअभीष्ट संख्या = LCM + 4 = 60 + 4 = 64.',
            verification: 'जांच: 64/12 = भागफल 5 शेष 4; 64/15 = भागफल 4 शेष 4; 64/20 = भागफल 3 शेष 4 (सत्यापित)।',
            prerequisites: ['math.lcm.prime_factorization']
        }
    ]
};

runTest('Renderer deterministically outputs valid Markdown with all lightweight sections', () => {
    const md1 = renderQuestionBankToMarkdown(sampleValidCanonical);
    const md2 = renderQuestionBankToMarkdown(sampleValidCanonical);
    assert.strictEqual(md1, md2, 'Rendering must be 100% deterministic');

    assert(md1.includes('artifact: "proceduralQuestionBank"'), 'Must contain artifact frontmatter');
    assert(md1.includes('# LCM-HCF — Procedural Question Bank'), 'Must contain single H1 header');
    assert(md1.includes('## math-q-001'), 'Must contain H2 for math-q-001');
    assert(md1.includes('## math-q-002'), 'Must contain H2 for math-q-002');
    assert(md1.includes('### Question'), 'Must contain Question section');
    assert(md1.includes('> - **Source Question ID**:'), 'Must contain Source Question ID callout');
    assert(md1.includes('- (A) 64'), 'Must contain authentic MCQ option (A)');
    assert(md1.includes('- (B) 56'), 'Must contain authentic MCQ option (B)');
    assert(md1.includes('- (C) 60'), 'Must contain authentic MCQ option (C)');
    assert(md1.includes('- (D) 74'), 'Must contain authentic MCQ option (D)');

    // Assert absence of procedural elements in human-facing Questions.md
    assert(!md1.includes('### Method & Recognition'), 'Must NOT contain Method & Recognition section');
    assert(!md1.includes('### Traps & Errors'), 'Must NOT contain Traps & Errors section');
    assert(!md1.includes('### Progressive Hints'), 'Must NOT contain Progressive Hints section');
    assert(!md1.includes('> [!tip]- Tier 1'), 'Must NOT contain Tier 1 hint callout');
    assert(!md1.includes('> [!tip]- Tier 2'), 'Must NOT contain Tier 2 hint callout');
    assert(!md1.includes('> [!tip]- Tier 3'), 'Must NOT contain Tier 3 hint callout');
    assert(!md1.includes('### Solution'), 'Must NOT contain Solution section');
    assert(!md1.includes('### Verification'), 'Must NOT contain Verification section');
});

runTest('Renderer preserves decimal numbers in MCQ options without prefix stripping', () => {
    const data = {
        subject: 'Mathematics',
        chapter: 'Decimals',
        questions: [{
            id: 'q-dec-01',
            source_question_id: 'sqi.math.dec.01',
            provenance: { origin: 'authentic_pyq', source: 'Exam 2024' },
            question_type: 'mcq',
            difficulty: 2.5,
            question: 'What is the value of the measurement?',
            options: ['42.5', '3.14', '0.25', '1.5']
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('- (A) 42.5'), 'Option 42.5 must be preserved verbatim');
    assert(md.includes('- (B) 3.14'), 'Option 3.14 must be preserved verbatim');
    assert(md.includes('- (C) 0.25'), 'Option 0.25 must be preserved verbatim');
    assert(md.includes('- (D) 1.5'), 'Option 1.5 must be preserved verbatim');
    assert(!md.includes('- (A) 5'), 'Decimal integer prefix must NOT be stripped');
    assert(!md.includes('- (B) 14'), 'Decimal integer prefix must NOT be stripped');
});

runTest('Renderer normalizes spaced dash option prefixes cleanly', () => {
    const data = {
        subject: 'Mathematics',
        chapter: 'SpacedDash',
        questions: [{
            id: 'q-dash-01',
            source_question_id: 'sqi.math.dash.01',
            provenance: { origin: 'authentic_pyq', source: 'Exam 2024' },
            question_type: 'mcq',
            difficulty: 2.0,
            question: 'Choose the correct parameter:',
            options: ['A - Alpha value', 'B - Beta value', 'C - Gamma value', 'D - Delta value']
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('- (A) Alpha value'), 'Spaced dash option A - Alpha value must render cleanly');
    assert(md.includes('- (B) Beta value'), 'Spaced dash option B - Beta value must render cleanly');
    assert(md.includes('- (C) Gamma value'), 'Spaced dash option C - Gamma value must render cleanly');
    assert(md.includes('- (D) Delta value'), 'Spaced dash option D - Delta value must render cleanly');
    assert(!md.includes('- (B) B - Beta value'), 'Duplicate prefix must NOT be retained');
});

// ----------------------------------------------------
// 4. VALIDATOR HAPPY PATH & ANTI-LEAKAGE
// ----------------------------------------------------
console.log('\n--- 4. Validator Happy Path & Anti-Leakage ---');

runTest('Validator passes canonical in-memory structure with 0 errors', () => {
    const res = validateQuestionBankContent(sampleValidCanonical);
    assert.strictEqual(res.isValid, true, `Expected valid, got errors: ${res.errors.join(', ')}`);
    assert.strictEqual(res.errors.length, 0);
});

runTest('Validator passes rendered markdown string with 0 errors', () => {
    const md = renderQuestionBankToMarkdown(sampleValidCanonical);
    const res = validateQuestionBankMarkdown(md, 'test_output.md');
    assert.strictEqual(res.isValid, true, `Expected valid markdown, got errors: ${res.errors.join(', ')}`);
    assert.strictEqual(res.errors.length, 0);
});

runTest('Validator rejects markdown containing procedural leakage (hints, solutions, verifications, traps, answers)', () => {
    const md = renderQuestionBankToMarkdown(sampleValidCanonical);

    // 1. Leak hints
    const leakHints = md + '\n### Progressive Hints\n> [!tip]- Tier 1\nHint text';
    const resHints = validateQuestionBankMarkdown(leakHints, 'leak_hints.md');
    assert.strictEqual(resHints.isValid, false);
    assert(resHints.errors.some(e => e.includes('[PROCEDURAL_LEAKAGE]')), 'Should detect leakage of Progressive Hints');

    // 2. Leak solution
    const leakSol = md + '\n### Solution\nStep 1: compute value';
    const resSol = validateQuestionBankMarkdown(leakSol, 'leak_sol.md');
    assert.strictEqual(resSol.isValid, false);
    assert(resSol.errors.some(e => e.includes('[PROCEDURAL_LEAKAGE]')), 'Should detect leakage of Solution');

    // 3. Leak verification
    const leakVer = md + '\n### Verification\nVerification check';
    const resVer = validateQuestionBankMarkdown(leakVer, 'leak_ver.md');
    assert.strictEqual(resVer.isValid, false);
    assert(resVer.errors.some(e => e.includes('[PROCEDURAL_LEAKAGE]')), 'Should detect leakage of Verification');

    // 4. Leak method & traps
    const leakMethod = md + '\n### Method & Recognition\nSignals';
    const resMethod = validateQuestionBankMarkdown(leakMethod, 'leak_method.md');
    assert.strictEqual(resMethod.isValid, false);
    assert(resMethod.errors.some(e => e.includes('[PROCEDURAL_LEAKAGE]')), 'Should detect leakage of Method & Recognition');

    // 5. Leak answer reveal
    const leakAns = md + '\n- **Correct Option**: (A)';
    const resAns = validateQuestionBankMarkdown(leakAns, 'leak_ans.md');
    assert.strictEqual(resAns.isValid, false);
    assert(resAns.errors.some(e => e.includes('[PROCEDURAL_LEAKAGE]')), 'Should detect leakage of Correct Answer');
});

// ----------------------------------------------------
// 5. INVALID / DUPLICATE QUESTION IDS
// ----------------------------------------------------
console.log('\n--- 5. Invalid & Duplicate Question IDs ---');

runTest('Validator rejects duplicate question IDs', () => {
    const dupe = JSON.parse(JSON.stringify(sampleValidCanonical));
    dupe.questions.push({ ...dupe.questions[0] }); // identical id math-q-001
    const res = validateQuestionBankContent(dupe);
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('[DUPLICATE_QUESTION_ID]')), 'Should detect DUPLICATE_QUESTION_ID');
});

runTest('Validator rejects missing or empty question ID', () => {
    const badId = JSON.parse(JSON.stringify(sampleValidCanonical));
    badId.questions[0].id = '';
    const res = validateQuestionBankContent(badId);
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('[INVALID_QUESTION_ID]')), 'Should detect INVALID_QUESTION_ID');
});

// ----------------------------------------------------
// 6. MISSING PROVENANCE & INVALID ORIGINS
// ----------------------------------------------------
console.log('\n--- 6. Missing Provenance & Invalid Origins ---');

runTest('Validator rejects question with missing provenance object', () => {
    const missingProv = JSON.parse(JSON.stringify(sampleValidCanonical));
    delete missingProv.questions[0].provenance;
    const res = validateQuestionBankContent(missingProv);
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('[MISSING_PROVENANCE]')), 'Should detect MISSING_PROVENANCE');
});

runTest('Validator rejects question with missing provenance.origin', () => {
    const noOrigin = JSON.parse(JSON.stringify(sampleValidCanonical));
    noOrigin.questions[0].provenance = { source: 'Unknown book' };
    const res = validateQuestionBankContent(noOrigin);
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('[MISSING_PROVENANCE]')), 'Should detect missing origin in provenance');
});

runTest('Validator rejects invalid provenance origin value', () => {
    const badOrigin = JSON.parse(JSON.stringify(sampleValidCanonical));
    badOrigin.questions[0].provenance = { origin: 'internet_scrape' };
    const res = validateQuestionBankContent(badOrigin);
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('[INVALID_PROVENANCE_ORIGIN]')), 'Should detect INVALID_PROVENANCE_ORIGIN');
});

// ----------------------------------------------------
// 7. MISSING HINTS ACROSS TIERS 1, 2, 3
// ----------------------------------------------------
console.log('\n--- 7. Missing Hints Across Tiers ---');

runTest('Validator rejects missing hints object', () => {
    const noHints = JSON.parse(JSON.stringify(sampleValidCanonical));
    delete noHints.questions[0].hints;
    const res = validateQuestionBankContent(noHints);
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('[MISSING_HINTS]')), 'Should detect MISSING_HINTS');
});

runTest('Validator rejects missing Hint Tier 1', () => {
    const noT1 = JSON.parse(JSON.stringify(sampleValidCanonical));
    noT1.questions[0].hints.tier1_conceptual = '';
    const res = validateQuestionBankContent(noT1);
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('missing Hint Tier 1')), 'Should detect missing Tier 1');
});

runTest('Validator rejects missing Hint Tier 2', () => {
    const noT2 = JSON.parse(JSON.stringify(sampleValidCanonical));
    noT2.questions[0].hints.tier2_strategic = '';
    const res = validateQuestionBankContent(noT2);
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('missing Hint Tier 2')), 'Should detect missing Tier 2');
});

runTest('Validator rejects missing Hint Tier 3', () => {
    const noT3 = JSON.parse(JSON.stringify(sampleValidCanonical));
    noT3.questions[0].hints.tier3_next_step = '';
    const res = validateQuestionBankContent(noT3);
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('missing Hint Tier 3')), 'Should detect missing Tier 3');
});

// ----------------------------------------------------
// 8. ANSWER LEAKAGE IN HINTS
// ----------------------------------------------------
console.log('\n--- 8. Answer Leakage in Hints ---');

runTest('Validator rejects Tier 1 hint leaking the final answer', () => {
    const leakT1 = JSON.parse(JSON.stringify(sampleValidCanonical));
    leakT1.questions[0].correct_answer = '180';
    leakT1.questions[0].hints.tier1_conceptual = 'इस प्रश्न का सही उत्तर 180 है, सूत्र लगाएं।';
    const res = validateQuestionBankContent(leakT1);
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('[HINT_ANSWER_LEAKAGE]')), 'Should detect HINT_ANSWER_LEAKAGE in Tier 1');
});

runTest('Validator rejects Tier 2 hint leaking the final answer', () => {
    const leakT2 = JSON.parse(JSON.stringify(sampleValidCanonical));
    leakT2.questions[0].correct_answer = '180';
    leakT2.questions[0].hints.tier2_strategic = 'सूत्र: LCM = 2160 / 12 = 180 प्राप्त होगा।';
    const res = validateQuestionBankContent(leakT2);
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('[HINT_ANSWER_LEAKAGE]')), 'Should detect HINT_ANSWER_LEAKAGE in Tier 2');
});

runTest('Non-leaking strategic hint passes anti-leak check', () => {
    assert.strictEqual(hintLeaksAnswer('सूत्र: LCM = (संख्याओं का गुणनफल) / HCF स्थापित करें।', '180'), false);
    assert.strictEqual(hintLeaksAnswer('2160 को 12 से विभाजित करने की तैयारी करें।', '180'), false);
});

// ----------------------------------------------------
// 9. INVALID QUESTION TYPE & MCQ < 4 OPTIONS
// ----------------------------------------------------
console.log('\n--- 9. Invalid Question Type & MCQ Options ---');

runTest('Validator rejects unsupported question type', () => {
    const badType = JSON.parse(JSON.stringify(sampleValidCanonical));
    badType.questions[0].question_type = 'essay_subjective_freeform';
    const res = validateQuestionBankContent(badType);
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('[INVALID_QUESTION_TYPE]')), 'Should detect INVALID_QUESTION_TYPE');
});

runTest('Validator rejects MCQ with fewer than 4 options', () => {
    const badMcq = JSON.parse(JSON.stringify(sampleValidCanonical));
    badMcq.questions[1].options = ['Option A', 'Option B']; // only 2 options
    const res = validateQuestionBankContent(badMcq);
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('[INVALID_MCQ_OPTIONS]')), 'Should detect INVALID_MCQ_OPTIONS');
});

// ----------------------------------------------------
// 10. EMPTY QUESTION BANK
// ----------------------------------------------------
console.log('\n--- 10. Empty Question Bank Fail-Closed ---');

runTest('Validator rejects empty questions array in JSON', () => {
    const empty = JSON.parse(JSON.stringify(sampleValidCanonical));
    empty.questions = [];
    const res = validateQuestionBankContent(empty);
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('[EMPTY_QUESTION_BANK]')), 'Should detect EMPTY_QUESTION_BANK for empty array');
});

runTest('Validator rejects 0-byte or empty markdown file', () => {
    const res = validateQuestionBankMarkdown('', 'empty.md');
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('[EMPTY_QUESTION_BANK]')), 'Should detect EMPTY_QUESTION_BANK for empty markdown');
});

runTest('Validator rejects markdown with no question blocks', () => {
    const noQuestionsMd = '---\nsubject: Math\nchapter: Test\nartifact: proceduralQuestionBank\n---\n# Test — Procedural Question Bank\n> [!info] Chapter Overview\nNo questions here.';
    const res = validateQuestionBankMarkdown(noQuestionsMd, 'no_questions.md');
    assert.strictEqual(res.isValid, false);
    assert(res.errors.some(e => e.includes('[EMPTY_QUESTION_BANK]')), 'Should detect EMPTY_QUESTION_BANK when no H2 questions exist');
});

runTest('Validator rejects empty question block preceding block separator ---', () => {
    const emptyQMd = [
        '---',
        'subject: Math',
        'chapter: Test',
        'artifact: proceduralQuestionBank',
        '---',
        '# Test — Procedural Question Bank',
        '',
        '## q1 — P1',
        '> [!info] Question Metadata',
        '> - **Source Question ID**: `s1`',
        '### Question',
        '',
        '---',
        '',
        '## q2 — P2',
        '> [!info] Question Metadata',
        '> - **Source Question ID**: `s2`',
        '### Question',
        'Valid question statement.',
        '',
        '- (A) Option 1',
        '- (B) Option 2',
        '- (C) Option 3',
        '- (D) Option 4'
    ].join('\n');
    const res = validateQuestionBankMarkdown(emptyQMd, 'empty_q_sep.md');
    assert.strictEqual(res.isValid, false, 'Should fail validation on empty question statement');
    assert(res.errors.some(e => e.includes('[EMPTY_QUESTION_TEXT]')), 'Should record [EMPTY_QUESTION_TEXT] error');
});

console.log('\n====================================================');
console.log(`Summary: ${passedTests} passed, ${failedTests} failed (Total: ${totalTests})`);
console.log('====================================================');

if (failedTests > 0) {
    process.exit(1);
} else {
    console.log('🎉 ALL QUESTION BANK TESTS PASSED WITH 100% SUCCESS RATE!');
    process.exit(0);
}
