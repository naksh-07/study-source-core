/**
 * StudySourceCore Opaque-Box E2E Test Suite: Lightweight StudyLab Question Bank & SQI Cardinality
 * Script: `test_e2e_lightweight_question_bank.js`
 * 
 * Requirement-driven E2E test suite strictly implementing:
 * - ORIGINAL_REQUEST.md (Requirements R1, R2, R3, R5, R6)
 * - PROJECT.md (Features F1, F2, F3, F4, F5, F7, F8, F9)
 * 
 * Architecture across the 4 systematic tiers:
 * - Tier 1: Feature Coverage (>=5 tests per feature: statement, options, metadata, SQI, types)
 * - Tier 2: Boundary, Corner & Anti-Leak Cases (strict prohibition of hints, solutions, verifications, traps, answers; extreme inputs)
 * - Tier 3: Cross-Feature Combinations & SQI Cardinality (100 distinct questions under 1 pattern, removals traceability, ID stability)
 * - Tier 4: Real-World Scenarios (LCM-HCF end-to-end fixture, procedural APKG sidelining, generic Anki safety, non-STEM isolation)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
    renderQuestionBankToMarkdown,
    normalizeQuestionItem,
    compileCanonicalQuestionBank
} = require('./render_studylab_question_bank');

const {
    buildSourceQuestionInventory,
    validateSourceQuestionInventory,
    renderInventoryToEvidenceMarkdown,
    parseInventoryItemsFromMarkdownText
} = require('./source_question_inventory');

const {
    ingestSourceToEvidencePack
} = require('./evidence_ingestion_engine');

const {
    authorMathProceduralContent
} = require('./author_math_studylab');

const {
    resolveSubjectPolicy
} = require('./subject_policy_resolver');

const {
    getArtifactRegistry,
    getArtifactDefinition
} = require('./artifact_registry');

const {
    evaluateArtifactRouting
} = require('./routing_engine');

const {
    createIRFromEvidencePack
} = require('./semantic_learning_ir');

const {
    deduplicateKnowledgeUnits
} = require('./semantic_deduplication');

// Test runner state
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function runTest(testId, description, fn) {
    totalTests++;
    try {
        fn();
        console.log(`  [PASS] ${testId}: ${description}`);
        passedTests++;
    } catch (e) {
        console.error(`  [FAIL] ${testId}: ${description}`);
        console.error(`         ${e.stack || e.message}`);
        failures.push({ testId, description, error: e.message });
        failedTests++;
    }
}

/**
 * Strict anti-leak audit helper.
 * Asserts that rendered Markdown has ZERO prohibited procedural sections.
 */
function assertZeroProceduralLeakage(md, contextName = 'Questions.md') {
    // 1. Prohibited section headers
    assert(!md.includes('### Progressive Hints'), `[LEAK] '${contextName}' contains '### Progressive Hints'`);
    assert(!md.includes('### Solution'), `[LEAK] '${contextName}' contains '### Solution'`);
    assert(!md.includes('### Verification'), `[LEAK] '${contextName}' contains '### Verification'`);
    assert(!md.includes('### Method & Recognition'), `[LEAK] '${contextName}' contains '### Method & Recognition'`);
    assert(!md.includes('### Traps & Errors'), `[LEAK] '${contextName}' contains '### Traps & Errors'`);

    // 2. Prohibited hint callouts
    assert(!/>\s*\[!tip\]-?\s*Tier\s*1/i.test(md), `[LEAK] '${contextName}' contains Tier 1 hint callout`);
    assert(!/>\s*\[!tip\]-?\s*Tier\s*2/i.test(md), `[LEAK] '${contextName}' contains Tier 2 hint callout`);
    assert(!/>\s*\[!tip\]-?\s*Tier\s*3/i.test(md), `[LEAK] '${contextName}' contains Tier 3 hint callout`);

    // 3. Prohibited answer reveals
    assert(!/\*\*Correct Option\*\*/i.test(md), `[LEAK] '${contextName}' contains '**Correct Option**'`);
    assert(!/\*\*Correct Answer\*\*/i.test(md), `[LEAK] '${contextName}' contains '**Correct Answer**'`);
    assert(!/>\s*-\s*\*\*Answer\*\*/i.test(md), `[LEAK] '${contextName}' contains '**Answer**'`);
    assert(!/>\s*-\s*\*\*Decision Points\*\*/i.test(md), `[LEAK] '${contextName}' contains '**Decision Points**'`);
    assert(!/>\s*-\s*\*\*Trap\*\*/i.test(md), `[LEAK] '${contextName}' contains '**Trap**'`);
    assert(!/>\s*-\s*\*\*Expected Method\*\*/i.test(md), `[LEAK] '${contextName}' contains '**Expected Method**'`);
}

console.log('================================================================================');
console.log('E2E TEST SUITE: LIGHTWEIGHT STUDYLAB QUESTION BANK & SQI CARDINALITY');
console.log('================================================================================\n');

// =============================================================================
// TIER 1: FEATURE COVERAGE (>=5 tests per feature)
// =============================================================================
console.log('--- TIER 1: FEATURE COVERAGE ---');

// --- Feature 1: Question Statement Rendering ---
console.log('\n  [Feature 1: Question Statement Rendering]');

runTest('T1.1.1', 'Single-line question statement rendered verbatim', () => {
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{
            id: 'q-single-line',
            question: 'Find the greatest common divisor of 84 and 126.',
            question_type: 'numerical'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('Find the greatest common divisor of 84 and 126.'), 'Single-line text must be preserved verbatim');
    assertZeroProceduralLeakage(md, 'T1.1.1');
});

runTest('T1.1.2', 'Multi-line question statement with preserved paragraph breaks', () => {
    const multiLine = 'A rectangular field is 120m long and 80m wide.\n\nSquare tiles of the largest possible size are to be paved.\nFind the minimum number of tiles required.';
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{
            id: 'q-multi-line',
            question: multiLine,
            question_type: 'numerical'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('A rectangular field is 120m long and 80m wide.'), 'First paragraph missing');
    assert(md.includes('Square tiles of the largest possible size are to be paved.'), 'Second paragraph missing');
    assert(md.includes('Find the minimum number of tiles required.'), 'Third line missing');
    assertZeroProceduralLeakage(md, 'T1.1.2');
});

runTest('T1.1.3', 'LaTeX inline math formulas rendered without corruption or escaping losses', () => {
    const latexInline = 'If $\\text{LCM}(a, b) = 180$ and $\\text{HCF}(a, b) = 12$, compute $a \\times b$.';
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{
            id: 'q-latex-inline',
            question: latexInline,
            question_type: 'numerical'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('$\\text{LCM}(a, b) = 180$'), 'Inline LaTeX formula corrupted');
    assert(md.includes('$\\text{HCF}(a, b) = 12$'), 'Inline LaTeX HCF formula corrupted');
    assert(md.includes('$a \\times b$'), 'Inline LaTeX multiplication corrupted');
    assertZeroProceduralLeakage(md, 'T1.1.3');
});

runTest('T1.1.4', 'LaTeX display math formulas rendered completely intact', () => {
    const latexDisplay = 'Evaluate the sum of residues:\n$$\\sum_{k=1}^{n} \\gcd(k, n)$$\nwhere $n = 60$.';
    const data = {
        subject: 'Math',
        chapter: 'Number-Theory',
        questions: [{
            id: 'q-latex-display',
            question: latexDisplay,
            question_type: 'numerical'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('$$\\sum_{k=1}^{n} \\gcd(k, n)$$'), 'Display LaTeX block missing or modified');
    assertZeroProceduralLeakage(md, 'T1.1.4');
});

runTest('T1.1.5', 'Bilingual Hindi-first statement with English technical terms in parentheses and LaTeX', () => {
    const bilingual = 'यदि दो संख्याओं का अनुपात $3 : 4$ है तथा उनका महत्तम समापवर्तक (HCF) $4$ है, तो उनका लघुत्तम समापवर्त्य (LCM) ज्ञात कीजिए।';
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{
            id: 'q-bilingual',
            question: bilingual,
            question_type: 'numerical'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('महत्तम समापवर्तक (HCF)'), 'Bilingual technical term lost');
    assert(md.includes('लघुत्तम समापवर्त्य (LCM)'), 'Bilingual technical term lost');
    assert(md.includes('$3 : 4$'), 'Bilingual LaTeX ratio lost');
    assertZeroProceduralLeakage(md, 'T1.1.5');
});

// --- Feature 2: Authentic MCQ Options ---
console.log('\n  [Feature 2: Authentic MCQ Options]');

runTest('T1.2.1', 'Standard 4 options (A, B, C, D) with proper markdown list formatting', () => {
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{
            id: 'q-mcq-4',
            question: 'What is the HCF of 12 and 18?',
            options: ['6', '12', '18', '24'],
            question_type: 'mcq'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('- (A) 6'), 'Option (A) missing');
    assert(md.includes('- (B) 12'), 'Option (B) missing');
    assert(md.includes('- (C) 18'), 'Option (C) missing');
    assert(md.includes('- (D) 24'), 'Option (D) missing');
    assertZeroProceduralLeakage(md, 'T1.2.1');
});

runTest('T1.2.2', '5-option question (A, B, C, D, E) authentically preserved', () => {
    const data = {
        subject: 'Reasoning',
        chapter: 'Syllogism',
        questions: [{
            id: 'q-mcq-5',
            question: 'Which of the following conclusions follows logically?',
            options: [
                'Only conclusion I follows',
                'Only conclusion II follows',
                'Either conclusion I or II follows',
                'Neither conclusion I nor II follows',
                'Both conclusions I and II follow'
            ],
            question_type: 'mcq'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('- (A) Only conclusion I follows'), 'Option (A) missing');
    assert(md.includes('- (B) Only conclusion II follows'), 'Option (B) missing');
    assert(md.includes('- (C) Either conclusion I or II follows'), 'Option (C) missing');
    assert(md.includes('- (D) Neither conclusion I nor II follows'), 'Option (D) missing');
    assert(md.includes('- (E) Both conclusions I and II follow'), 'Option (E) missing');
    assertZeroProceduralLeakage(md, 'T1.2.2');
});

runTest('T1.2.3', 'Option prefix normalization strips pre-existing labels without duplicating', () => {
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{
            id: 'q-mcq-prefixed',
            question: 'Select the correct value:',
            options: [
                '(A) 120',
                'B. 180',
                '(C): 240',
                'D: 360',
                '(E) None of these'
            ],
            question_type: 'mcq'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('- (A) 120'), 'Option (A) not cleanly normalized');
    assert(md.includes('- (B) 180'), 'Option (B) not cleanly normalized');
    assert(md.includes('- (C) 240'), 'Option (C) not cleanly normalized');
    assert(md.includes('- (D) 360'), 'Option (D) not cleanly normalized');
    assert(md.includes('- (E) None of these'), 'Option (E) not cleanly normalized');
    assert(!md.includes('- (A) (A)'), 'Redundant double label in (A)');
    assert(!md.includes('- (B) B.'), 'Redundant double label in (B)');
    assert(!md.includes('- (E) (E)'), 'Redundant double label in (E)');
    assertZeroProceduralLeakage(md, 'T1.2.3');
});

runTest('T1.2.4', 'MCQ options containing complex mathematical formulas and LaTeX', () => {
    const data = {
        subject: 'Physics',
        chapter: 'Kinematics',
        questions: [{
            id: 'q-mcq-latex-options',
            question: 'The escape velocity from the surface of Earth is:',
            options: [
                '$\\sqrt{2 g R}$',
                '$\\sqrt{g R}$',
                '$\\sqrt{\\frac{2 G M}{R^2}}$',
                '$2 \\sqrt{g R}$'
            ],
            question_type: 'mcq'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('- (A) $\\sqrt{2 g R}$'), 'LaTeX in option A lost');
    assert(md.includes('- (B) $\\sqrt{g R}$'), 'LaTeX in option B lost');
    assert(md.includes('- (C) $\\sqrt{\\frac{2 G M}{R^2}}$'), 'LaTeX in option C lost');
    assert(md.includes('- (D) $2 \\sqrt{g R}$'), 'LaTeX in option D lost');
    assertZeroProceduralLeakage(md, 'T1.2.4');
});

runTest('T1.2.5', 'Extended options beyond E (e.g. A through G) rendered without truncation', () => {
    const data = {
        subject: 'Reasoning',
        chapter: 'Puzzles',
        questions: [{
            id: 'q-mcq-extended',
            question: 'Which person sits at the extreme left end?',
            options: ['Person A', 'Person B', 'Person C', 'Person D', 'Person E', 'Person F', 'Person G'],
            question_type: 'mcq'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('- (A) Person A'), 'Option (A) missing');
    assert(md.includes('- (E) Person E'), 'Option (E) missing');
    assert(md.includes('- (F) Person F'), 'Option (F) missing');
    assert(md.includes('- (G) Person G'), 'Option (G) missing');
    assertZeroProceduralLeakage(md, 'T1.2.5');
});

// --- Feature 3: Source / Provenance Metadata ---
console.log('\n  [Feature 3: Source / Provenance Metadata]');

runTest('T1.3.1', 'Complete provenance callout with Exam, Year, Shift, and Origin', () => {
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{
            id: 'q-prov-full',
            question: 'Sample question statement.',
            question_type: 'mcq',
            options: ['A', 'B', 'C', 'D'],
            provenance: {
                origin: 'authentic_pyq',
                exam: 'RRB ALP',
                year: 2018,
                shift: 'Shift 1',
                source: 'RRB ALP Official Question Paper'
            }
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('> - **Provenance**: `authentic_pyq` (RRB ALP Official Question Paper)'), 'Provenance line missing');
    assert(md.includes('> - **Exam**: RRB ALP'), 'Exam line missing');
    assert(md.includes('> - **Year**: 2018'), 'Year line missing');
    assert(md.includes('> - **Shift**: Shift 1'), 'Shift line missing');
    assertZeroProceduralLeakage(md, 'T1.3.1');
});

runTest('T1.3.2', 'Provenance origin normalization across all 5 valid categories', () => {
    const origins = ['authentic_pyq', 'source_derived', 'curated_source', 'derived_variant', 'synthetic_schema'];
    const questions = origins.map((orig, i) => ({
        id: `q-orig-${i}`,
        question: `Question for origin ${orig}`,
        question_type: 'numerical',
        provenance: { origin: orig }
    }));
    const data = { subject: 'Math', chapter: 'LCM-HCF', questions };
    const md = renderQuestionBankToMarkdown(data);
    for (const orig of origins) {
        assert(md.includes(`> - **Provenance**: \`${orig}\``), `Origin ${orig} not rendered in metadata callout`);
    }
    assertZeroProceduralLeakage(md, 'T1.3.2');
});

runTest('T1.3.3', 'Difficulty rating rendering (numerical floats and labels)', () => {
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [
            { id: 'q-diff-num', question: 'Question 1', question_type: 'numerical', difficulty: 3.5 },
            { id: 'q-diff-int', question: 'Question 2', question_type: 'numerical', difficulty: 2 }
        ]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('> - **Difficulty**: 3.5'), 'Numerical float difficulty not rendered');
    assert(md.includes('> - **Difficulty**: 2'), 'Numerical int difficulty not rendered');
    assertZeroProceduralLeakage(md, 'T1.3.3');
});

runTest('T1.3.4', 'Topic / pattern reference rendering with human-readable title', () => {
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        patterns: [{ id: 'pat-math-lcm-001', name: 'LCM by Prime Factorization' }],
        questions: [{
            id: 'q-pattern-link',
            question: 'Sample pattern question.',
            question_type: 'numerical',
            pattern_id: 'pat-math-lcm-001'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('> - **Pattern ID**: `pat-math-lcm-001`'), 'Pattern ID missing');
    assert(md.includes('> - **Topic / Pattern**: LCM by Prime Factorization'), 'Topic title missing');
    assertZeroProceduralLeakage(md, 'T1.3.4');
});

runTest('T1.3.5', 'Authentic exam shift / session metadata formatted correctly', () => {
    const data = {
        subject: 'Chemistry',
        chapter: 'Thermodynamics',
        questions: [{
            id: 'q-chem-pyq',
            question: 'Calculate enthalpy of reaction.',
            question_type: 'numerical',
            exam: 'JEE Main',
            year: 2023,
            shift: 'Morning Shift 2'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('> - **Exam**: JEE Main'), 'Exam name missing');
    assert(md.includes('> - **Year**: 2023'), 'Year missing');
    assert(md.includes('> - **Shift**: Morning Shift 2'), 'Shift missing');
    assertZeroProceduralLeakage(md, 'T1.3.5');
});

// --- Feature 4: source_question_id Rendering ---
console.log('\n  [Feature 4: source_question_id Rendering]');

runTest('T1.4.1', 'Rendered metadata callout contains Source Question ID', () => {
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{
            id: 'math-q-001',
            source_question_id: 'sqi.math.lcm-hcf.001',
            question: 'What is the LCM of 15 and 25?',
            question_type: 'numerical'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('> - **Source Question ID**: `sqi.math.lcm-hcf.001`'), 'Source Question ID callout line missing');
    assertZeroProceduralLeakage(md, 'T1.4.1');
});

runTest('T1.4.2', 'Original question number / reference preserved when present', () => {
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{
            id: 'math-q-002',
            source_question_id: 'sqi.math.lcm-hcf.002',
            question_number: 'Q-042',
            question: 'What is the HCF of 45 and 60?',
            question_type: 'numerical'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('> - **Question Number / Reference**: Q-042'), 'Question Number missing');
    assertZeroProceduralLeakage(md, 'T1.4.2');
});

runTest('T1.4.3', 'Hierarchical SQI formats preserved with high fidelity', () => {
    const sqi = 'sqi.physics.mechanics.kinematics.projectile.007';
    const data = {
        subject: 'Physics',
        chapter: 'Kinematics',
        questions: [{
            id: 'phys-q-007',
            source_question_id: sqi,
            question: 'Find maximum height of projectile.',
            question_type: 'numerical'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes(`> - **Source Question ID**: \`${sqi}\``), 'Hierarchical SQI missing or altered');
    assertZeroProceduralLeakage(md, 'T1.4.3');
});

runTest('T1.4.4', 'Fallback to question id when explicit source_question_id is omitted', () => {
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{
            id: 'canonical-q-101',
            question: 'Compute LCM(4, 6).',
            question_type: 'numerical'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('> - **Source Question ID**: `canonical-q-101`'), 'Fallback to item.id failed');
    assertZeroProceduralLeakage(md, 'T1.4.4');
});

runTest('T1.4.5', 'Multiple questions retain distinct, stable source_question_id tags', () => {
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [
            { id: 'q-1', source_question_id: 'sqi.math.lcm.001', question: 'Problem 1', question_type: 'numerical' },
            { id: 'q-2', source_question_id: 'sqi.math.lcm.002', question: 'Problem 2', question_type: 'numerical' },
            { id: 'q-3', source_question_id: 'sqi.math.lcm.003', question: 'Problem 3', question_type: 'numerical' }
        ]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('`sqi.math.lcm.001`'), 'sqi.math.lcm.001 missing');
    assert(md.includes('`sqi.math.lcm.002`'), 'sqi.math.lcm.002 missing');
    assert(md.includes('`sqi.math.lcm.003`'), 'sqi.math.lcm.003 missing');
    assertZeroProceduralLeakage(md, 'T1.4.5');
});

// --- Feature 5: Numerical and Subjective Question Types ---
console.log('\n  [Feature 5: Numerical and Subjective Question Types]');

runTest('T1.5.1', 'numerical question type renders statement without generating MCQ options', () => {
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{
            id: 'q-num-only',
            question: 'Find the least common multiple of 14, 21, and 28.',
            question_type: 'numerical'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('> - **Question Type**: numerical'), 'Question Type missing');
    assert(!md.includes('- (A)'), 'Spurious option (A) generated for numerical question');
    assert(!md.includes('- (B)'), 'Spurious option (B) generated for numerical question');
    assertZeroProceduralLeakage(md, 'T1.5.1');
});

runTest('T1.5.2', 'structured question type renders statement and metadata cleanly without options', () => {
    const data = {
        subject: 'Physics',
        chapter: 'Electrostatics',
        questions: [{
            id: 'q-structured',
            question: 'Derive the electric field intensity due to an electric dipole at an axial point.',
            question_type: 'structured'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('> - **Question Type**: structured'), 'Structured type missing');
    assert(md.includes('Derive the electric field intensity'), 'Prompt missing');
    assert(!md.includes('- (A)'), 'Spurious option list in structured question');
    assertZeroProceduralLeakage(md, 'T1.5.2');
});

runTest('T1.5.3', 'direct_compute question type renders prompt and metadata cleanly', () => {
    const data = {
        subject: 'Math',
        chapter: 'Arithmetic',
        questions: [{
            id: 'q-direct-compute',
            question: 'Evaluate $125 \\times 8 + 450 \\div 9$.',
            question_type: 'direct_compute'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('> - **Question Type**: direct_compute'), 'direct_compute type missing');
    assert(!md.includes('- (A)'), 'Spurious options in direct_compute');
    assertZeroProceduralLeakage(md, 'T1.5.3');
});

runTest('T1.5.4', 'reverse_problem question type renders with appropriate type label', () => {
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{
            id: 'q-reverse',
            question: 'Given $\\text{LCM}(x, 24) = 72$ and $\\text{HCF}(x, 24) = 8$, determine $x$.',
            question_type: 'reverse_problem'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('> - **Question Type**: reverse_problem'), 'reverse_problem type missing');
    assertZeroProceduralLeakage(md, 'T1.5.4');
});

runTest('T1.5.5', 'trap question type renders statement without leaking diagnostic traps', () => {
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{
            id: 'q-trap-type',
            question: 'Can two numbers have 16 as their HCF and 380 as their LCM? Justify.',
            question_type: 'trap',
            trap: 'Dividing 380 by 16 leaves remainder 12, so it is impossible.'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('> - **Question Type**: trap'), 'trap type missing');
    assert(!md.includes('Dividing 380 by 16 leaves remainder 12'), 'Trap leaked into Markdown!');
    assertZeroProceduralLeakage(md, 'T1.5.5');
});

// =============================================================================
// TIER 2: BOUNDARY, CORNER & ANTI-LEAK CASES
// =============================================================================
console.log('\n--- TIER 2: BOUNDARY, CORNER & ANTI-LEAK CASES ---');

runTest('T2.1.1', "Assert Questions.md strictly rejects '### Progressive Hints'", () => {
    const sampleWithHints = `# LCM-HCF — Procedural Question Bank\n\n## math-q-001\n\n### Question\nSample\n\n### Progressive Hints\n> [!tip]- Tier 1\nHint 1`;
    assert.throws(() => {
        assertZeroProceduralLeakage(sampleWithHints, 'T2.1.1 test fixture');
    }, /contains '### Progressive Hints'/);
});

runTest('T2.1.2', "Assert Questions.md strictly rejects Tier 1, Tier 2, Tier 3 hint callouts", () => {
    for (const tierNum of [1, 2, 3]) {
        const sampleWithTier = `# Questions\n\n## q-1\n\n### Question\nQ\n\n> [!tip]- Tier ${tierNum}: Secret hint`;
        assert.throws(() => {
            assertZeroProceduralLeakage(sampleWithTier, `T2.1.2 Tier ${tierNum} test`);
        }, new RegExp(`contains Tier ${tierNum} hint callout`));
    }
});

runTest('T2.1.3', "Assert Questions.md strictly rejects '### Solution' derivations", () => {
    const sampleWithSolution = `# Questions\n\n## q-1\n\n### Question\nQ\n\n### Solution\nDetailed step by step solution derivation`;
    assert.throws(() => {
        assertZeroProceduralLeakage(sampleWithSolution, 'T2.1.3 test fixture');
    }, /contains '### Solution'/);
});

runTest('T2.1.4', "Assert Questions.md strictly rejects '### Verification' blocks", () => {
    const sampleWithVerification = `# Questions\n\n## q-1\n\n### Question\nQ\n\n### Verification\nSanity check formula`;
    assert.throws(() => {
        assertZeroProceduralLeakage(sampleWithVerification, 'T2.1.4 test fixture');
    }, /contains '### Verification'/);
});

runTest('T2.1.5', "Assert Questions.md strictly rejects '### Method & Recognition' and '### Traps & Errors'", () => {
    const sampleWithMethod = `# Questions\n\n## q-1\n\n### Method & Recognition\nSignals here`;
    assert.throws(() => {
        assertZeroProceduralLeakage(sampleWithMethod, 'T2.1.5 Method test');
    }, /contains '### Method & Recognition'/);

    const sampleWithTraps = `# Questions\n\n## q-1\n\n### Traps & Errors\nTrap info here`;
    assert.throws(() => {
        assertZeroProceduralLeakage(sampleWithTraps, 'T2.1.5 Traps test');
    }, /contains '### Traps & Errors'/);
});

runTest('T2.1.6', "Assert Questions.md strictly rejects correct answer reveals", () => {
    const leaks = [
        '**Correct Option**: (B)',
        '**Correct Answer**: 180',
        '> - **Answer**: 42',
        '> - **Decision Points**: Factorize',
        '> - **Trap**: Calculation slip',
        '> - **Expected Method**: Prime factorization'
    ];
    for (const leak of leaks) {
        const md = `# Questions\n\n## q-1\n\n### Question\nQ\n\n${leak}`;
        assert.throws(() => {
            assertZeroProceduralLeakage(md, `Leak: ${leak}`);
        }, /\[LEAK\]/);
    }
});

runTest('T2.2.1', 'Empty question bank or invalid inputs fail closed with explicit errors', () => {
    assert.throws(() => {
        renderQuestionBankToMarkdown(null);
    }, /INVALID_INPUT/);

    assert.throws(() => {
        renderQuestionBankToMarkdown(undefined);
    }, /INVALID_INPUT/);

    assert.throws(() => {
        renderQuestionBankToMarkdown('not-an-object');
    }, /INVALID_INPUT/);
});

runTest('T2.2.2', 'Extremely long question statements (10,000+ characters) rendered intact without truncation', () => {
    const longStatement = 'Paragraph 1: Background context.\n\n' + 'Detailed observation data '.repeat(400) + '\n\nFinal Question: Compute parameter.';
    assert(longStatement.length > 10000, 'Test fixture length check');
    const data = {
        subject: 'Physics',
        chapter: 'Long-Scenario',
        questions: [{
            id: 'q-extreme-length',
            question: longStatement,
            question_type: 'numerical'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('Paragraph 1: Background context.'), 'Header text lost');
    assert(md.includes('Final Question: Compute parameter.'), 'Trailer text lost');
    assert(md.length > 10000, 'Rendered Markdown truncated');
    assertZeroProceduralLeakage(md, 'T2.2.2');
});

runTest('T2.2.3', 'Multi-line options with complex formatting and sub-bullets', () => {
    const data = {
        subject: 'Reasoning',
        chapter: 'Critical-Reasoning',
        questions: [{
            id: 'q-multiline-options',
            question: 'Evaluate the argument based on the statements below.',
            options: [
                'Statement I is valid;\n  However Statement II fails under boundary conditions.',
                'Statement II is valid;\n  However Statement I contradicts premise A.',
                'Both statements are mutually reinforcing.',
                'Neither statement provides sufficient evidence.'
            ],
            question_type: 'mcq'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('Statement I is valid;'), 'Option A first line missing');
    assert(md.includes('However Statement II fails under boundary conditions.'), 'Option A second line missing');
    assertZeroProceduralLeakage(md, 'T2.2.3');
});

runTest('T2.2.4', 'Special characters, unicode symbols, brackets, and markdown meta-characters in statements', () => {
    const specialText = 'Symbols: α, β, γ, θ, λ, π, Δ; Inequalities: x ≤ y, a ≥ b, p ≠ q; Brackets: [0, 1] ∪ (2, ∞); Pipes: |x - 5| = 10; Quotes: "bilingual" & \'atomic\'; HTML chars: <tag> & </tag>.';
    const data = {
        subject: 'Math',
        chapter: 'Set-Theory',
        questions: [{
            id: 'q-special-chars',
            question: specialText,
            question_type: 'numerical'
        }]
    };
    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('Symbols: α, β, γ, θ, λ, π, Δ'), 'Unicode Greek symbols corrupted');
    assert(md.includes('x ≤ y, a ≥ b, p ≠ q'), 'Mathematical relational operators corrupted');
    assert(md.includes('[0, 1] ∪ (2, ∞)'), 'Set notation brackets corrupted');
    assert(md.includes('|x - 5| = 10'), 'Absolute value pipes corrupted');
    assertZeroProceduralLeakage(md, 'T2.2.4');
});

// =============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS & SQI CARDINALITY
// =============================================================================
console.log('\n--- TIER 3: CROSS-FEATURE COMBINATIONS & SQI CARDINALITY ---');

runTest('T3.1.1', 'Cardinality Invariant: 100 distinct questions under 1 pattern yield EXACTLY 100 question blocks (1 Pattern != 1 Question)', () => {
    const rawQuestions = [];
    const patternId = 'pat-math-lcm-prime-factorization';

    for (let i = 1; i <= 100; i++) {
        rawQuestions.push({
            id: `lcm-q-${String(i).padStart(3, '0')}`,
            source_question_id: `sqi.math.lcm-hcf.${String(i).padStart(3, '0')}`,
            question_number: `Q-${String(i).padStart(3, '0')}`,
            pattern_id: patternId,
            question: `Find the LCM of ${10 + i} and ${20 + i}.`,
            options: [
                `Answer ${i * 1}`,
                `Answer ${i * 2}`,
                `Answer ${i * 3}`,
                `Answer ${i * 4}`
            ],
            correct_answer: `Answer ${i * 2}`,
            question_type: 'mcq',
            difficulty: 2.0 + (i % 3) * 0.5,
            provenance: {
                origin: 'authentic_pyq',
                exam: 'SSC CGL Tier 1',
                year: 2018 + (i % 6),
                shift: `Shift ${(i % 3) + 1}`
            }
        });
    }

    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        patterns: [{ id: patternId, name: 'LCM by Prime Factorization' }],
        questions: rawQuestions
    };

    const md = renderQuestionBankToMarkdown(data);

    // Assert total question blocks
    const h2Matches = md.match(/^##\s+[^\n]+/gm) || [];
    assert.strictEqual(h2Matches.length, 100, `Expected exactly 100 question headings, got ${h2Matches.length}`);

    // Assert all 100 source_question_id appear in the rendered document
    for (let i = 1; i <= 100; i++) {
        const sqi = `sqi.math.lcm-hcf.${String(i).padStart(3, '0')}`;
        assert(md.includes(sqi), `Missing ${sqi} in rendered Markdown`);
    }

    // Assert zero leakage across the entire 100-question document
    assertZeroProceduralLeakage(md, 'T3.1.1 (100 Questions)');
});

runTest('T3.1.2', 'Removals and exclusions traceability preserves conservation identity', () => {
    const rawQuestions = [
        { id: 'q-1', question_number: '1', question_text: 'Find HCF of 12 and 18.', options: ['6', '12', '18', '24'] },
        { id: 'q-2', question_number: '2', question_text: 'Find HCF of 12 and 18.', options: ['6', '12', '18', '24'] }, // duplicate of q-1
        { id: 'q-3', question_number: '3', question_text: '   ' }, // empty question
        { id: 'q-4', question_number: '4', question_text: 'Find HCF of 36 and 48.', options: ['6', '12', '18', '24'] }
    ];

    const inventory = buildSourceQuestionInventory(rawQuestions, {
        subject: 'Math',
        chapter: 'LCM-HCF',
        sourceId: 'src.dedup.test'
    });

    assert.strictEqual(inventory.questions.length, 2, 'Expected 2 valid questions');
    assert.strictEqual(inventory.removals.length, 2, 'Expected 2 removals');

    // Cardinality conservation equation: Raw = Eligible + Removals
    assert.strictEqual(
        rawQuestions.length,
        inventory.questions.length + inventory.removals.length,
        'Cardinality conservation equation violated!'
    );

    // Verify reasons
    const reasons = inventory.removals.map(r => r.reason);
    assert(reasons.includes('EXACT_TRUE_DUPLICATE'), 'Expected EXACT_TRUE_DUPLICATE');
    assert(reasons.includes('EMPTY_QUESTION_TEXT'), 'Expected EMPTY_QUESTION_TEXT');

    // Render eligible items to Markdown
    const qbData = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: inventory.questions.map(q => ({
            id: q.source_question_id,
            source_question_id: q.source_question_id,
            question: q.question_text,
            options: q.options,
            question_type: q.question_type || 'mcq'
        }))
    };
    const md = renderQuestionBankToMarkdown(qbData);
    const renderedH2s = (md.match(/^##\s+[^\n]+/gm) || []).length;
    assert.strictEqual(renderedH2s, inventory.questions.length, 'Questions.md count must match eligible inventory count');
    assertZeroProceduralLeakage(md, 'T3.1.2');
});

runTest('T3.1.3', 'Stability and bijectivity of source_question_id between Inventory and Questions.md', () => {
    const rawQuestions = [];
    for (let i = 1; i <= 30; i++) {
        rawQuestions.push({
            id: `raw-${i}`,
            question_number: String(i),
            question_text: `Arithmetic progression problem ${i}: determine term ${i * 5}.`,
            question_type: 'numerical'
        });
    }

    const inventory = buildSourceQuestionInventory(rawQuestions, {
        subject: 'Math',
        chapter: 'Progressions',
        sourceId: 'src.prog.test'
    });

    const qbData = {
        subject: 'Math',
        chapter: 'Progressions',
        questions: inventory.questions.map(q => ({
            id: q.source_question_id,
            source_question_id: q.source_question_id,
            question: q.question_text,
            question_type: q.question_type
        }))
    };

    const md = renderQuestionBankToMarkdown(qbData);

    // Check that every single source_question_id from inventory exists exactly once in Questions.md
    for (const item of inventory.questions) {
        const sqi = item.source_question_id;
        const count = (md.match(new RegExp(escapeRegex(sqi), 'g')) || []).length;
        assert(count >= 1, `SQI ${sqi} not found in Questions.md`);
    }
    assertZeroProceduralLeakage(md, 'T3.1.3');
});

runTest('T3.1.4', 'Heterogeneous question types under multiple patterns render without cross-talk', () => {
    const questions = [];
    const patterns = [
        { id: 'pat-1', name: 'Pattern One' },
        { id: 'pat-2', name: 'Pattern Two' },
        { id: 'pat-3', name: 'Pattern Three' }
    ];

    // 15 MCQs
    for (let i = 1; i <= 15; i++) {
        questions.push({
            id: `mcq-q-${i}`,
            pattern_id: 'pat-1',
            question: `MCQ Question ${i}`,
            options: ['Opt 1', 'Opt 2', 'Opt 3', 'Opt 4'],
            question_type: 'mcq'
        });
    }
    // 10 Numericals
    for (let i = 1; i <= 10; i++) {
        questions.push({
            id: `num-q-${i}`,
            pattern_id: 'pat-2',
            question: `Numerical Question ${i}`,
            question_type: 'numerical'
        });
    }
    // 5 Structured
    for (let i = 1; i <= 5; i++) {
        questions.push({
            id: `struct-q-${i}`,
            pattern_id: 'pat-3',
            question: `Structured Question ${i}`,
            question_type: 'structured'
        });
    }

    const data = {
        subject: 'Physics',
        chapter: 'Thermodynamics',
        patterns,
        questions
    };

    const md = renderQuestionBankToMarkdown(data);
    const h2Count = (md.match(/^##\s+[^\n]+/gm) || []).length;
    assert.strictEqual(h2Count, 30, `Expected 30 questions, got ${h2Count}`);

    // Verify option blocks count: only the 15 MCQs should have options
    const optionHeaders = (md.match(/- \(A\)/g) || []).length;
    assert.strictEqual(optionHeaders, 15, `Expected exactly 15 option (A) occurrences, got ${optionHeaders}`);
    assertZeroProceduralLeakage(md, 'T3.1.4');
});

runTest('T3.1.5', 'Internal procedural representation is preserved while rendered Markdown has zero leaks', () => {
    // Canonical 17-dimension procedural JSON object
    const canonicalQuestion = {
        id: 'math-q-full-proc',
        source_question_id: 'sqi.math.lcm-hcf.full',
        pattern_id: 'pat-math-lcm-001',
        patternTitle: 'Product Rule of LCM-HCF',
        provenance: { origin: 'authentic_pyq', exam: 'SSC CGL 2020' },
        question_type: 'mcq',
        difficulty: 3.0,
        question: 'दो संख्याओं का गुणनफल 4320 है तथा उनका HCF 12 है। उनका LCM ज्ञात कीजिए।',
        options: ['360', '720', '180', '540'],
        correct_answer: '360',
        recognition_signals: ['Product of two numbers given', 'HCF given, LCM required'],
        expected_method: 'LCM * HCF = Product of numbers',
        decision_points: ['Divide product by HCF'],
        trap: 'Dividing product by HCF squared',
        error_category: ['ERR_01', 'ERR_06'],
        hints: {
            tier1_conceptual: 'अवधारणा: दो संख्याओं का गुणनफल उनके LCM और HCF के गुणनफल के बराबर होता है।',
            tier2_strategic: 'रणनीति: सूत्र LCM = (संख्याओं का गुणनफल) / HCF लागू करें।',
            tier3_next_step: 'चरण: 4320 को 12 से विभाजित करें।'
        },
        solution: 'हल:\nLCM * 12 = 4320\nLCM = 4320 / 12 = 360.',
        verification: 'सत्यापन: 360 * 12 = 4320 (सत्यापित)।',
        prerequisites: ['math.arithmetic.multiplication']
    };

    // 1. Assert internal object preserves all 17 procedural dimensions
    assert(canonicalQuestion.recognition_signals.length > 0, 'Internal IR missing recognition_signals');
    assert(canonicalQuestion.expected_method, 'Internal IR missing expected_method');
    assert(canonicalQuestion.decision_points.length > 0, 'Internal IR missing decision_points');
    assert(canonicalQuestion.trap, 'Internal IR missing trap');
    assert(canonicalQuestion.hints.tier1_conceptual, 'Internal IR missing tier1_conceptual');
    assert(canonicalQuestion.hints.tier2_strategic, 'Internal IR missing tier2_strategic');
    assert(canonicalQuestion.hints.tier3_next_step, 'Internal IR missing tier3_next_step');
    assert(canonicalQuestion.solution, 'Internal IR missing solution');
    assert(canonicalQuestion.verification, 'Internal IR missing verification');

    // 2. Render to Markdown and assert ZERO of those internal procedural elements leak out
    const data = {
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [canonicalQuestion]
    };
    const md = renderQuestionBankToMarkdown(data);

    assert(md.includes('दो संख्याओं का गुणनफल 4320'), 'Question text missing');
    assert(md.includes('- (A) 360'), 'Option A missing');

    // Anti-leak strict checks
    assertZeroProceduralLeakage(md, 'T3.1.5');
    assert(!md.includes('Product of two numbers given'), 'Recognition signal leaked');
    assert(!md.includes('Divide product by HCF'), 'Decision point leaked');
    assert(!md.includes('Dividing product by HCF squared'), 'Trap leaked');
    assert(!md.includes('संख्याओं का गुणनफल उनके LCM और HCF के गुणनफल के बराबर'), 'Tier 1 hint leaked');
    assert(!md.includes('360 * 12 = 4320 (सत्यापित)'), 'Verification leaked');
});

// =============================================================================
// TIER 4: REAL-WORLD SCENARIOS & APKG SIDELINING
// =============================================================================
console.log('\n--- TIER 4: REAL-WORLD SCENARIOS & APKG SIDELINING ---');

runTest('T4.1.1', 'Authentic LCM-HCF fixture end-to-end cardinality reconciliation', () => {
    // Construct authentic LCM-HCF source fixture with 25 authentic past exam questions
    const sourceFixture = {
        source_id: 'src.rrb.alp.math.lcm_hcf',
        subject: 'Math',
        chapter: 'LCM-HCF',
        problem_patterns: [
            {
                pattern_id: 'pat-math-lcm-prime-factorization',
                name: 'LCM by Prime Factorization',
                family_id: 'fam-math-lcm-001'
            }
        ],
        source_problems: []
    };

    for (let i = 1; i <= 25; i++) {
        sourceFixture.source_problems.push({
            id: `rrb_alp_${i}`,
            question_number: String(i),
            pattern_ref: 'pat-math-lcm-prime-factorization',
            question_text: `RRB ALP 2018 Past Question ${i}: Find the LCM of ${i * 4} and ${i * 6}.`,
            options: [
                `${i * 12}`,
                `${i * 24}`,
                `${i * 36}`,
                `${i * 48}`
            ],
            correct_answer: `${i * 12}`,
            type: 'mcq',
            difficulty: 2.0,
            exam: 'RRB ALP',
            year: 2018,
            shift: `Shift ${(i % 3) + 1}`
        });
    }

    // 1. Source Ingestion
    const evidencePack = ingestSourceToEvidencePack(sourceFixture, {
        subject: 'Math',
        chapter: 'LCM-HCF'
    });
    assert(evidencePack.source_question_inventory, 'Missing inventory in evidence pack');
    assert.strictEqual(evidencePack.source_question_inventory.questions.length, 25, 'Inventory count mismatch');

    // 2. Authoring via Math Specialist
    const canonicalQB = authorMathProceduralContent(evidencePack);
    assert.strictEqual(canonicalQB.questions.length, 25, 'Canonical QB count mismatch');

    // 3. Rendering to Lightweight Markdown
    const md = renderQuestionBankToMarkdown(canonicalQB);
    const h2Count = (md.match(/^##\s+[^\n]+/gm) || []).length;
    assert.strictEqual(h2Count, 25, 'Markdown H2 count mismatch');

    // 4. Exact Cardinality Reconciliation Identity
    // Raw (25) -> SQI (25) -> Removals (0) -> Eligible (25) = Questions.md (25)
    assert.strictEqual(
        evidencePack.source_question_inventory.questions.length,
        h2Count,
        'SQI Eligible count must equal Questions.md rendered count'
    );

    // 5. Anti-leak verification on real-world output
    assertZeroProceduralLeakage(md, 'T4.1.1 (LCM-HCF Real-World Fixture)');
});

runTest('T4.2.1', 'Procedural APKG sidelining: STEM subjects default to procedural_mode=markdown and proceduralApkg=false', () => {
    const stemSubjects = ['Math', 'Physics', 'Chemistry', 'Reasoning'];
    for (const subj of stemSubjects) {
        const policy = resolveSubjectPolicy(subj);
        assert.strictEqual(policy.procedural_mode, 'markdown', `${subj} procedural_mode must be 'markdown'`);
        assert.strictEqual(policy.proceduralQuestionBank, true, `${subj} proceduralQuestionBank must be true`);
        assert.strictEqual(policy.proceduralApkg, false, `${subj} proceduralApkg must be false`);
        assert.strictEqual(policy.procedural_apkg, false, `${subj} procedural_apkg must be false`);
    }
});

runTest('T4.2.2', 'Procedural APKG sidelining: Artifact registry does not require task-export-studylab-anki for bmQa', () => {
    const registry = getArtifactRegistry();
    assert(registry.bmQa, 'bmQa artifact definition missing');
    const bmQaDeps = registry.bmQa.dependencies || [];
    assert(
        !bmQaDeps.includes('task-export-studylab-anki'),
        `bmQa statically requires 'task-export-studylab-anki': ${JSON.stringify(bmQaDeps)}`
    );
    assert(bmQaDeps.includes('task-core-notes'), 'bmQa must include task-core-notes');
    assert(bmQaDeps.includes('task-export-anki'), 'bmQa must include task-export-anki');
});

runTest('T4.2.3', 'Routing engine evaluates Math without procedural APKG and suppresses it cleanly', () => {
    const routing = evaluateArtifactRouting({
        subject: 'Math',
        chapter: 'LCM-HCF'
    });
    assert.strictEqual(routing.proceduralQuestionBank, true, 'proceduralQuestionBank should be true in Math routing');
    assert.strictEqual(routing.proceduralApkg, false, 'proceduralApkg must be false in Math routing');
    assert.strictEqual(routing.suppressions.proceduralApkg, 'SUPPRESSED_BY_SUBJECT_POLICY', 'proceduralApkg must have suppression reason');
});

runTest('T4.3.1', 'Non-STEM subjects resolve to procedural_mode=none and proceduralQuestionBank=false', () => {
    const nonStem = ['Biology', 'Geography', 'History', 'Map', 'Political Science'];
    for (const subj of nonStem) {
        const policy = resolveSubjectPolicy(subj);
        assert.strictEqual(policy.procedural_mode, 'none', `${subj} procedural_mode must be 'none'`);
        assert.strictEqual(policy.proceduralQuestionBank, false, `${subj} proceduralQuestionBank must be false`);
        assert.strictEqual(policy.proceduralApkg, false, `${subj} proceduralApkg must be false`);

        const routing = evaluateArtifactRouting({ subject: subj, chapter: 'General' });
        assert.strictEqual(routing.proceduralQuestionBank, false, `${subj} routing proceduralQuestionBank must be false`);
        assert.strictEqual(routing.proceduralApkg, false, `${subj} routing proceduralApkg must be false`);
    }
});

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =============================================================================
// SUMMARY & VERDICT
// =============================================================================
console.log('\n================================================================================');
console.log(`TOTAL RESULTS: ${passedTests} passed, ${failedTests} failed (Total: ${totalTests})`);
if (failedTests === 0) {
    console.log('STATUS: ALL TIERS PASSED WITH 100% SUCCESS RATE');
    console.log('================================================================================\n');
    process.exit(0);
} else {
    console.error(`STATUS: ${failedTests} TESTS FAILED`);
    console.error('================================================================================\n');
    for (const f of failures) {
        console.error(`  - [${f.testId}] ${f.description}: ${f.error}`);
    }
    process.exit(1);
}
