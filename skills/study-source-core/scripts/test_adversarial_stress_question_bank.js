/**
 * StudySourceCore Challenger 1: Adversarial Stress Test Suite
 * Script: `test_adversarial_stress_question_bank.js`
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
    validateQuestionBankContent,
    validateQuestionBankMarkdown,
    validateQuestionBank,
    hintLeaksAnswer
} = require('./validate_studylab_question_bank');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];
const discoveries = [];

function runStressTest(suiteName, testId, description, fn) {
    totalTests++;
    try {
        fn();
        console.log(`  ✅ [PASS] [${suiteName}] ${testId}: ${description}`);
        passedTests++;
    } catch (e) {
        console.error(`  ❌ [FAIL] [${suiteName}] ${testId}: ${description}`);
        console.error(`     Error: ${e.message}`);
        failures.push({ suite: suiteName, testId, description, error: e.message });
        failedTests++;
    }
}

console.log('================================================================================');
console.log('CHALLENGER 1: ADVERSARIAL STRESS TEST HARNESS — LIGHTWEIGHT QUESTION BANK');
console.log('================================================================================\n');

const baseCanonicalQuestion = {
    id: 'math-q-leak-base',
    pattern_id: 'pat-math-lcm-001',
    provenance: { origin: 'authentic_pyq', source: 'Exam 2024' },
    question_type: 'mcq',
    difficulty: 3.0,
    question: 'यदि दो संख्याओं का ल.स. 120 और म.स. 6 है, तो संख्याओं का गुणनफल क्या होगा?',
    options: ['720', '600', '126', '20'],
    correct_answer: '720',
    recognition_signals: ['ल.स. और म.स. दिए होने पर गुणनफल ज्ञात करना'],
    expected_method: 'LCM × HCF = Product of two numbers',
    decision_points: ['संख्याओं के गुणनफल सूत्र का अनुप्रयोग करें'],
    trap: 'ल.स. को म.स. से भाग देना',
    error_category: ['ERR_01'],
    hints: {
        tier1_conceptual: 'दो संख्याओं के गुणनफल और उनके ल.स. तथा म.स. के संबंध पर विचार करें।',
        tier2_strategic: 'सूत्र: गुणनफल = LCM × HCF का प्रयोग करें।',
        tier3_next_step: '120 को 6 से गुणा करें।'
    },
    solution: 'हल:\nगुणनफल = LCM × HCF = 120 × 6 = 720.',
    verification: 'जांच: 720 / 6 = 120 (सत्यापित)।',
    prerequisites: ['math.arithmetic.multiplication']
};

// -----------------------------------------------------------------------------
// SUITE 1: ANTI-LEAK STRESS TESTING
// -----------------------------------------------------------------------------
console.log('--- SUITE 1: ANTI-LEAK STRESS TESTING ---');

runStressTest('Anti-Leak', 'AL-01', 'Renderer NEVER renders procedural fields (hints, solution, verification, traps, DAG) into output', () => {
    const md = renderQuestionBankToMarkdown({
        subject: 'Mathematics',
        chapter: 'LCM-HCF',
        questions: [baseCanonicalQuestion]
    });

    assert(!md.includes('### Progressive Hints'), 'Progressive Hints leaked into Markdown');
    assert(!md.includes('### Solution'), 'Solution section leaked into Markdown');
    assert(!md.includes('### Verification'), 'Verification section leaked into Markdown');
    assert(!md.includes('### Method & Recognition'), 'Method & Recognition leaked into Markdown');
    assert(!md.includes('### Traps & Errors'), 'Traps & Errors leaked into Markdown');
    assert(!md.includes('120 को 6 से गुणा करें'), 'Hint Tier 3 text leaked into Markdown');
    assert(!md.includes('गुणनफल = LCM × HCF = 120 × 6 = 720'), 'Solution derivation leaked into Markdown');
    assert(!md.includes('720 / 6 = 120 (सत्यापित)'), 'Verification text leaked into Markdown');
    assert(!md.includes('ल.स. को म.स. से भाग देना'), 'Trap description leaked into Markdown');
    assert(!md.includes('ERR_01'), 'Error code leaked into Markdown');
    assert(!md.includes('**Correct Answer**'), 'Correct answer label leaked into Markdown');
    assert(!md.includes('**Correct Option**'), 'Correct option label leaked into Markdown');
});

runStressTest('Anti-Leak', 'AL-02', 'Validator detects sneakily injected Progressive Hints in question text', () => {
    const md = renderQuestionBankToMarkdown({
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{
            ...baseCanonicalQuestion,
            question: 'Solve this problem.\n\n### Progressive Hints\n> [!tip]- Tier 1: Look at prime factors.'
        }]
    });
    const result = validateQuestionBankMarkdown(md, 'al-02.md');
    assert.strictEqual(result.isValid, false, 'Validator failed to catch injected Progressive Hints');
    assert(result.errors.some(e => e.includes('[PROCEDURAL_LEAKAGE]')), 'Missing PROCEDURAL_LEAKAGE code');
});

runStressTest('Anti-Leak', 'AL-03', 'Validator detects sneakily injected Solution header in question text', () => {
    const md = renderQuestionBankToMarkdown({
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{
            ...baseCanonicalQuestion,
            question: 'Solve this problem.\n\n### Solution\nFirst step is 120 * 6 = 720.'
        }]
    });
    const result = validateQuestionBankMarkdown(md, 'al-03.md');
    assert.strictEqual(result.isValid, false, 'Validator failed to catch injected Solution header');
    assert(result.errors.some(e => e.includes('[PROCEDURAL_LEAKAGE]')), 'Missing PROCEDURAL_LEAKAGE code');
});

runStressTest('Anti-Leak', 'AL-04', 'Validator detects sneakily injected Verification block in question text', () => {
    const md = renderQuestionBankToMarkdown({
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{
            ...baseCanonicalQuestion,
            question: 'Solve this problem.\n\n### Verification\nPlug back into equation.'
        }]
    });
    const result = validateQuestionBankMarkdown(md, 'al-04.md');
    assert.strictEqual(result.isValid, false, 'Validator failed to catch injected Verification header');
    assert(result.errors.some(e => e.includes('[PROCEDURAL_LEAKAGE]')), 'Missing PROCEDURAL_LEAKAGE code');
});

runStressTest('Anti-Leak', 'AL-05', 'Validator detects case variations of prohibited headers (### solution, ### SOLUTION, etc.)', () => {
    const testCases = [
        '### solution\ntext',
        '### SOLUTION\ntext',
        '### Progressive hints\ntext',
        '### PROGRESSIVE HINTS\ntext',
        '### verification\ntext',
        '### VERIFICATION\ntext',
        '### method & recognition\ntext',
        '### traps & errors\ntext'
    ];
    for (const injected of testCases) {
        const md = renderQuestionBankToMarkdown({
            subject: 'Math',
            chapter: 'LCM-HCF',
            questions: [{ ...baseCanonicalQuestion, question: `Calculate.\n\n${injected}` }]
        });
        const res = validateQuestionBankMarkdown(md, 'case-leak.md');
        assert.strictEqual(res.isValid, false, `Failed to reject case variation: ${injected}`);
        assert(res.errors.some(e => e.includes('[PROCEDURAL_LEAKAGE]')));
    }
});

runStressTest('Anti-Leak', 'AL-06', 'Validator detects answer reveals in English and Hindi (**Correct Option**, **Correct Answer**, **उत्तर**, **सही विकल्प**)', () => {
    const answerLeaks = [
        '**Correct Option**: (A)',
        '**Correct Answer**: 720',
        '- **Correct Option**: (B)',
        '> - **Correct Answer**: 720',
        '### Correct Answer\n(A)',
        '### Answer\n720',
        '**उत्तर**: 720',
        '**सही विकल्प**: (A)',
        '**सही उत्तर**: 720'
    ];
    for (const leak of answerLeaks) {
        const md = renderQuestionBankToMarkdown({
            subject: 'Math',
            chapter: 'LCM-HCF',
            questions: [{ ...baseCanonicalQuestion, question: `Statement.\n\n${leak}` }]
        });
        const res = validateQuestionBankMarkdown(md, 'ans-leak.md');
        assert.strictEqual(res.isValid, false, `Failed to catch answer reveal: ${leak}`);
        assert(res.errors.some(e => e.includes('[PROCEDURAL_LEAKAGE]')));
    }
});

runStressTest('Anti-Leak', 'AL-07', 'Validator catches procedural metadata callouts in rendered markdown (> - **Decision Points**, > - **Trap**)', () => {
    const calloutLeaks = [
        '> - **Decision Points**: Branch if x > 0',
        '> - **Trap**: Overcounting primes',
        '> - **Expected Method**: Prime factorization',
        '> - **Recognition Signals**: Given coprime pair',
        '> - **Error Categories**: ERR_01'
    ];
    for (const leak of calloutLeaks) {
        const md = renderQuestionBankToMarkdown({
            subject: 'Math',
            chapter: 'LCM-HCF',
            questions: [{ ...baseCanonicalQuestion, question: `Problem.\n\n${leak}` }]
        });
        const res = validateQuestionBankMarkdown(md, 'callout-leak.md');
        assert.strictEqual(res.isValid, false, `Failed to catch callout leak: ${leak}`);
        assert(res.errors.some(e => e.includes('[PROCEDURAL_LEAKAGE]')));
    }
});

runStressTest('Anti-Leak', 'AL-08', 'JSON validator hintLeaksAnswer catches subtle answer reveals in Hindi & English', () => {
    const leakTests = [
        { text: 'इसका अंतिम उत्तर 720 है।', ans: '720', shouldLeak: true },
        { text: 'अंतिम उत्तर होगा 720', ans: '720', shouldLeak: true },
        { text: 'सही विकल्प (A) है', ans: '(A)', shouldLeak: true },
        { text: 'Final answer is 720', ans: '720', shouldLeak: true },
        { text: 'Correct option is (B)', ans: '(B)', shouldLeak: true },
        { text: 'Computation yields 720', ans: '720', shouldLeak: true },
        { text: 'Equals 720 exactly', ans: '720', shouldLeak: true },
        { text: 'सूत्र: LCM = (संख्याओं का गुणनफल) / HCF स्थापित करें।', ans: '720', shouldLeak: false },
        { text: 'अभाज्य गुणनखंडन द्वारा उभयनिष्ठ घटक ज्ञात करें।', ans: '720', shouldLeak: false }
    ];
    for (const { text, ans, shouldLeak } of leakTests) {
        const leaks = hintLeaksAnswer(text, ans);
        assert.strictEqual(leaks, shouldLeak, `Leak mismatch for '${text}' with answer '${ans}'. Expected ${shouldLeak}, got ${leaks}`);
    }
});

// -----------------------------------------------------------------------------
// SUITE 2: OPTION PARSING STRESS
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 2: OPTION PARSING STRESS ---');

runStressTest('Option-Parsing', 'OP-01', 'Complex option prefixes ((A), (E), (1), A., 1., (iv)) are cleanly normalized to - (A) ...', () => {
    const rawOptions = [
        '(A) First option with parens',
        'B. Second option with dot',
        '(1) Third option with numeric parens',
        '4. Fourth option with numeric dot',
        '(E) Fifth option beyond D',
        '(iv) Sixth option roman parens'
    ];
    const md = renderQuestionBankToMarkdown({
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{ ...baseCanonicalQuestion, options: rawOptions }]
    });

    assert(md.includes('- (A) First option with parens'), 'Failed to normalize (A) prefix');
    assert(md.includes('- (B) Second option with dot'), 'Failed to normalize B. prefix');
    assert(md.includes('- (C) Third option with numeric parens'), 'Failed to normalize (1) prefix');
    assert(md.includes('- (D) Fourth option with numeric dot'), 'Failed to normalize 4. prefix');
    assert(md.includes('- (E) Fifth option beyond D'), 'Failed to normalize (E) prefix');
    assert(md.includes('- (F) Sixth option roman parens'), 'Failed to normalize (iv) prefix');

    assert(!md.includes('- (A) (A)'), 'Double prefix detected: - (A) (A)');
    assert(!md.includes('- (B) B.'), 'Double prefix detected: - (B) B.');
    assert(!md.includes('- (C) (1)'), 'Double prefix detected: - (C) (1)');
    assert(!md.includes('- (D) 4.'), 'Double prefix detected: - (D) 4.');
});

runStressTest('Option-Parsing', 'OP-02', 'Bare integer numbers in options ([\'42\', \'100\', \'250\', \'1000\']) are NEVER erased or modified', () => {
    const bareNumbers = ['42', '100', '250', '1000'];
    const md = renderQuestionBankToMarkdown({
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{ ...baseCanonicalQuestion, options: bareNumbers }]
    });

    assert(md.includes('- (A) 42'), 'Bare number 42 missing or corrupted');
    assert(md.includes('- (B) 100'), 'Bare number 100 missing or corrupted');
    assert(md.includes('- (C) 250'), 'Bare number 250 missing or corrupted');
    assert(md.includes('- (D) 1000'), 'Bare number 1000 missing or corrupted');
});

runStressTest('Option-Parsing', 'OP-03', 'LaTeX equations in options are preserved verbatim without prefix stripping', () => {
    const latexOptions = ['$\\frac{1}{2}$', '$\\sqrt{3}$', '$\\int_0^1 x dx$', '$\\sum_{k=1}^n k^2$'];
    const md = renderQuestionBankToMarkdown({
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{ ...baseCanonicalQuestion, options: latexOptions }]
    });

    assert(md.includes('- (A) $\\frac{1}{2}$'), 'LaTeX fraction corrupted');
    assert(md.includes('- (B) $\\sqrt{3}$'), 'LaTeX square root corrupted');
    assert(md.includes('- (C) $\\int_0^1 x dx$'), 'LaTeX integral corrupted');
    assert(md.includes('- (D) $\\sum_{k=1}^n k^2$'), 'LaTeX sum corrupted');
});

runStressTest('Option-Parsing', 'OP-04', 'Decimal numbers in options ([\'42.5\', \'3.14\', \'0.25\', \'1.5\']) stress check', () => {
    const decimalOptions = ['42.5', '3.14', '0.25', '1.5'];
    const md = renderQuestionBankToMarkdown({
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{ ...baseCanonicalQuestion, options: decimalOptions }]
    });

    const hasCorrupted42_5 = md.includes('- (A) 5') && !md.includes('- (A) 42.5');
    const hasCorrupted3_14 = md.includes('- (B) 14') && !md.includes('- (B) 3.14');
    const hasCorrupted0_25 = md.includes('- (C) 25') && !md.includes('- (C) 0.25');
    const hasCorrupted1_5 = md.includes('- (D) 5') && !md.includes('- (D) 1.5');

    if (hasCorrupted42_5 || hasCorrupted3_14 || hasCorrupted0_25 || hasCorrupted1_5) {
        const bugMsg = `CRITICAL REGEX BUG: Decimal options are corrupted by prefix stripper! 42.5 -> ${md.match(/- \(A\) .+/)}, 3.14 -> ${md.match(/- \(B\) .+/)}`;
        discoveries.push({
            id: 'BUG-DECIMAL-OPTION-CORRUPTION',
            severity: 'HIGH',
            component: 'render_studylab_question_bank.js',
            lines: '298-300',
            description: bugMsg
        });
        throw new Error(bugMsg);
    }

    assert(md.includes('- (A) 42.5'), 'Option 42.5 not preserved');
    assert(md.includes('- (B) 3.14'), 'Option 3.14 not preserved');
    assert(md.includes('- (C) 0.25'), 'Option 0.25 not preserved');
    assert(md.includes('- (D) 1.5'), 'Option 1.5 not preserved');
});

runStressTest('Option-Parsing', 'OP-05', 'Options with colon or dash delimiters (A: Text, B - Text) are cleanly standardized', () => {
    const colonDashOptions = ['A: Alpha value', 'B - Beta value', 'C) Gamma value', 'D : Delta value'];
    const md = renderQuestionBankToMarkdown({
        subject: 'Math',
        chapter: 'LCM-HCF',
        questions: [{ ...baseCanonicalQuestion, options: colonDashOptions }]
    });

    assert(md.includes('- (A) Alpha value'), 'Colon prefix A: not stripped cleanly');
    if (!md.includes('- (B) Beta value')) {
        const bugMsg = `Option dash prefix with space 'B - Beta value' was not stripped, rendered as '${(md.match(/- \(B\) .+/)||[])[0]}'`;
        discoveries.push({
            id: 'BUG-OPTION-DASH-PREFIX-NOT-STRIPPED',
            severity: 'MEDIUM',
            component: 'render_studylab_question_bank.js',
            lines: '298-300',
            description: bugMsg
        });
        throw new Error(bugMsg);
    }
    assert(md.includes('- (C) Gamma value'), 'Paren prefix C) not stripped cleanly');
    assert(md.includes('- (D) Delta value'), 'Spaced colon prefix D : not stripped cleanly');
});

// -----------------------------------------------------------------------------
// SUITE 3: 100% PRESERVATION & SQI CARDINALITY STRESS
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 3: 100% PRESERVATION & SQI CARDINALITY STRESS ---');

runStressTest('Cardinality', 'CARD-01', '100 distinct questions under a single pattern render EXACTLY 100 question blocks (1 Pattern != 1 Question)', () => {
    const COUNT = 100;
    const questions = [];

    for (let i = 1; i <= COUNT; i++) {
        questions.push({
            id: `math-q-stress-${String(i).padStart(3, '0')}`,
            source_question_id: `sqi.math.lcm.stress.${String(i).padStart(3, '0')}`,
            pattern_id: 'pat-math-lcm-single-pattern',
            patternTitle: 'Common Divisor Single Pattern',
            question_number: i,
            provenance: { origin: 'authentic_pyq', source: `Exam Shift ${((i % 3) + 1)}`, exam: 'RRB ALP', year: 2024, shift: `Shift ${((i % 3) + 1)}` },
            question_type: 'mcq',
            difficulty: 1.0 + (i % 5) * 0.5,
            question: `Distinct practice question item #${i}: Find LCM of ${i * 6} and ${i * 8}.`,
            options: [`${i * 24}`, `${i * 48}`, `${i * 12}`, `${i * 36}`],
            correct_answer: `${i * 24}`,
            recognition_signals: ['LCM calculation'],
            expected_method: 'Formula: (a * b) / gcd(a, b)',
            decision_points: ['Compute GCD'],
            trap: 'Multiplying without dividing by GCD',
            error_category: ['ERR_01'],
            hints: {
                tier1_conceptual: `Recall definition of LCM for item ${i}.`,
                tier2_strategic: `Formulate LCM = (a * b) / GCD for item ${i}.`,
                tier3_next_step: `Evaluate the expression for item ${i}.`
            },
            solution: `Solution for #${i}: LCM = ${i * 24}.`,
            verification: `Verify: ${i * 24} is divisible by both ${i * 6} and ${i * 8}.`,
            prerequisites: ['math.arithmetic.multiplication']
        });
    }

    const payload = {
        schema_version: '1.0.0',
        domain: 'Mathematics',
        subject: 'Mathematics',
        chapter: 'LCM-HCF-Stress',
        patterns: [{ id: 'pat-math-lcm-single-pattern', name: 'Common Divisor Single Pattern', difficulty: 2.5 }],
        questions
    };

    const jsonVal = validateQuestionBankContent(payload);
    assert.strictEqual(jsonVal.isValid, true, `JSON validation failed on 100 items: ${jsonVal.errors.join(', ')}`);

    const t0 = Date.now();
    const md = renderQuestionBankToMarkdown(payload);
    console.log(`     Rendered 100 distinct questions in ${Date.now() - t0}ms`);

    const h2Matches = md.match(/^##\s+math-q-stress-\d{3}\s+—\s+Common Divisor Single Pattern/gm) || [];
    assert.strictEqual(h2Matches.length, 100, `Expected exactly 100 H2 question blocks, found ${h2Matches.length}`);

    const qMatches = md.match(/###\s+Question/g) || [];
    assert.strictEqual(qMatches.length, 100, `Expected exactly 100 '### Question' sections, found ${qMatches.length}`);

    const sqiMatches = md.match(/>\s*-\s*\*\*Source Question ID\*\*:\s*`([^`]+)`/g) || [];
    assert.strictEqual(sqiMatches.length, 100, `Expected 100 Source Question ID callouts, found ${sqiMatches.length}`);

    const extractedSqis = new Set();
    for (let i = 1; i <= COUNT; i++) {
        const expectedSqi = `sqi.math.lcm.stress.${String(i).padStart(3, '0')}`;
        assert(md.includes(`> - **Source Question ID**: \`${expectedSqi}\``), `Missing SQI for question #${i}`);
        extractedSqis.add(expectedSqi);
    }
    assert.strictEqual(extractedSqis.size, 100, 'SQI uniqueness collapsed across 100 items');

    const mdVal = validateQuestionBankMarkdown(md, 'stress-100-q.md');
    assert.strictEqual(mdVal.isValid, true, `Markdown validator rejected 100-question output: ${mdVal.errors.join(', ')}`);
});

runStressTest('Cardinality', 'CARD-02', 'Preserves distinct question numbers and provenance details across all 100 questions', () => {
    const COUNT = 100;
    const questions = [];
    for (let i = 1; i <= COUNT; i++) {
        questions.push({
            id: `card-q-${i}`,
            source_question_id: `sqi.card.${i}`,
            question_number: `Q-${i * 10}`,
            provenance: { origin: 'authentic_pyq', source: `Book Vol ${i}`, exam: 'SSC', year: 2020 + (i % 5) },
            question_type: 'numerical',
            difficulty: 2.0,
            question: `Question statement number ${i}.`,
            hints: { tier1_conceptual: 't1', tier2_strategic: 't2', tier3_next_step: 't3' },
            solution: 'sol',
            verification: 'ver',
            prerequisites: ['math']
        });
    }

    const md = renderQuestionBankToMarkdown({
        subject: 'Math',
        chapter: 'ProvenanceTest',
        questions
    });

    for (let i = 1; i <= COUNT; i++) {
        assert(md.includes(`> - **Question Number / Reference**: Q-${i * 10}`), `Missing question number Q-${i * 10}`);
        assert(md.includes(`Book Vol ${i}`), `Missing source provenance Book Vol ${i}`);
    }
});

// -----------------------------------------------------------------------------
// SUITE 4: EXTREME INPUTS & FAIL-CLOSED STRESS
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 4: EXTREME INPUTS & FAIL-CLOSED STRESS ---');

runStressTest('Extreme-Inputs', 'EI-01', '10,000+ character question statement with complex markdown and LaTeX renders intact', () => {
    const paragraph = 'यह एक अत्यंत विस्तृत और गहन बहु-चरणीय गणितीय समस्या है जिसमें विभिन्न अवधारणाओं का समावेश है।\nLet $f(x) = \\int_0^x \\frac{\\sin(t)}{t} dt$ be the sine integral function.\n\n';
    let longStatement = '### Comprehensive Problem Description\n\n';
    while (longStatement.length < 10500) {
        longStatement += paragraph;
    }
    longStatement += '\nFinal prompt: Find $\\lim_{x \\to \\infty} f(x)$.';

    const data = {
        subject: 'Mathematics',
        chapter: 'AdvancedCalculus',
        questions: [{
            id: 'math-q-extreme-10k',
            source_question_id: 'sqi.math.extreme.10k',
            provenance: { origin: 'authentic_pyq', source: 'JEE Advanced' },
            question_type: 'mcq',
            difficulty: 4.5,
            question: longStatement,
            options: ['$\\frac{\\pi}{2}$', '$\\pi$', '$0$', '$1$'],
            hints: { tier1_conceptual: 't1', tier2_strategic: 't2', tier3_next_step: 't3' },
            solution: 'sol',
            verification: 'ver',
            prerequisites: ['math.calculus']
        }]
    };

    const md = renderQuestionBankToMarkdown(data);
    assert(md.length >= 10500, `Rendered markdown shorter than statement! Length: ${md.length}`);
    assert(md.includes('Final prompt: Find $\\lim_{x \\to \\infty} f(x)$.'), 'Statement tail truncated');

    const result = validateQuestionBankMarkdown(md, 'extreme-10k.md');
    assert.strictEqual(result.isValid, true, `Validator rejected 10k statement: ${result.errors.join(', ')}`);
});

runStressTest('Extreme-Inputs', 'EI-02', 'Multi-paragraph question containing markdown tables renders and validates cleanly', () => {
    const tableQuestion = [
        'दी गई तालिका का अध्ययन करें और प्रश्नों के उत्तर दें:',
        '',
        '| पाली (Shift) | उम्मीदवारों की संख्या | औसत अंक | मानक विचलन (SD) |',
        '| :--- | :--- | :--- | :--- |',
        '| Shift 1 | 12,500 | 64.2 | 8.5 |',
        '| Shift 2 | 14,200 | 61.8 | 9.1 |',
        '| Shift 3 | 11,800 | 67.4 | 7.9 |',
        '',
        'सभी पालियों को मिलाकर उम्मीदवारों का भारित औसत अंक (Weighted Mean) क्या होगा?'
    ].join('\n');

    const data = {
        subject: 'Reasoning',
        chapter: 'DataInterpretation',
        questions: [{
            id: 'di-q-table-001',
            source_question_id: 'sqi.reasoning.di.001',
            provenance: { origin: 'authentic_pyq', source: 'RRB NTPC 2021' },
            question_type: 'mcq',
            difficulty: 3.5,
            question: tableQuestion,
            options: ['64.35', '63.20', '65.10', '62.80'],
            hints: { tier1_conceptual: 't1', tier2_strategic: 't2', tier3_next_step: 't3' },
            solution: 'sol',
            verification: 'ver',
            prerequisites: ['stats.mean']
        }]
    };

    const md = renderQuestionBankToMarkdown(data);
    assert(md.includes('| Shift 1 | 12,500 | 64.2 | 8.5 |'), 'Table row 1 corrupted');
    assert(md.includes('| Shift 3 | 11,800 | 67.4 | 7.9 |'), 'Table row 3 corrupted');

    const result = validateQuestionBankMarkdown(md, 'table-test.md');
    assert.strictEqual(result.isValid, true, `Validator rejected table question: ${result.errors.join(', ')}`);
});

runStressTest('Extreme-Inputs', 'EI-03', 'Fail-Closed: null, undefined, and non-object inputs throw or fail validation', () => {
    assert.throws(() => renderQuestionBankToMarkdown(null), /INVALID_INPUT/);
    assert.throws(() => renderQuestionBankToMarkdown(undefined), /INVALID_INPUT/);
    assert.throws(() => renderQuestionBankToMarkdown('string-input'), /INVALID_INPUT/);

    const valNull = validateQuestionBankContent(null);
    assert.strictEqual(valNull.isValid, false);
    assert(valNull.errors.some(e => e.includes('[MALFORMED_STRUCTURE]')));

    const valUndef = validateQuestionBankContent(undefined);
    assert.strictEqual(valUndef.isValid, false);

    const valEmptyObj = validateQuestionBankContent({});
    assert.strictEqual(valEmptyObj.isValid, false);
    assert(valEmptyObj.errors.some(e => e.includes('[MISSING_METADATA]')));
    assert(valEmptyObj.errors.some(e => e.includes('[EMPTY_QUESTION_BANK]')));
});

runStressTest('Extreme-Inputs', 'EI-04', 'Fail-Closed: Corrupt question structures in questions array fail validation', () => {
    const corruptInputs = [
        { desc: 'null question element', questions: [null] },
        { desc: 'empty question object', questions: [{}] },
        { desc: 'missing question text', questions: [{ id: 'q1', pattern_id: 'p1', provenance: { origin: 'authentic_pyq' }, question_type: 'numerical', hints: { tier1_conceptual: 't', tier2_strategic: 't', tier3_next_step: 't' }, solution: 's', verification: 'v', prerequisites: ['p'] }] },
        { desc: 'invalid origin', questions: [{ ...baseCanonicalQuestion, provenance: { origin: 'unauthorized_crawler' } }] },
        { desc: 'unsupported question type', questions: [{ ...baseCanonicalQuestion, question_type: 'freeform_creative_writing' }] },
        { desc: 'MCQ with 2 options', questions: [{ ...baseCanonicalQuestion, question_type: 'mcq', options: ['A', 'B'] }] }
    ];

    for (const item of corruptInputs) {
        const payload = { domain: 'Math', chapter: 'Test', questions: item.questions };
        const res = validateQuestionBankContent(payload);
        assert.strictEqual(res.isValid, false, `Failed to reject corrupt input: ${item.desc}`);
    }
});

runStressTest('Extreme-Inputs', 'EI-05', 'Fail-Closed: Markdown validator rejects malformed files (missing H1, missing frontmatter, duplicate IDs)', () => {
    const malformedTests = [
        {
            desc: 'Missing frontmatter',
            content: '# Chapter — Procedural Question Bank\n## q1 — Pattern\n> [!info] Question Metadata\n> - **Source Question ID**: `s1`\n### Question\nPrompt'
        },
        {
            desc: 'Unclosed frontmatter',
            content: '---\nsubject: Math\nchapter: Test\nartifact: proceduralQuestionBank\n# Chapter — Procedural Question Bank'
        },
        {
            desc: 'Multiple H1 headers',
            content: '---\nsubject: Math\nchapter: Test\nartifact: proceduralQuestionBank\n---\n# H1 First\n\n# H1 Second\n## q1 — P\n> [!info] Question Metadata\n> - **Source Question ID**: `s1`\n### Question\nPrompt'
        },
        {
            desc: 'Duplicate question IDs in H2',
            content: '---\nsubject: Math\nchapter: Test\nartifact: proceduralQuestionBank\n---\n# Chapter — Procedural Question Bank\n\n## q1 — P1\n> [!info] Question Metadata\n> - **Source Question ID**: `s1`\n### Question\nPrompt 1\n\n---\n\n## q1 — P2\n> [!info] Question Metadata\n> - **Source Question ID**: `s2`\n### Question\nPrompt 2'
        },
        {
            desc: 'Missing Source Question ID callout',
            content: '---\nsubject: Math\nchapter: Test\nartifact: proceduralQuestionBank\n---\n# Chapter — Procedural Question Bank\n\n## q1 — P1\n> [!info] Question Metadata\n> - **Exam**: RRB\n### Question\nPrompt 1'
        },
        {
            desc: 'Empty question statement',
            content: '---\nsubject: Math\nchapter: Test\nartifact: proceduralQuestionBank\n---\n# Chapter — Procedural Question Bank\n\n## q1 — P1\n> [!info] Question Metadata\n> - **Source Question ID**: `s1`\n### Question\n\n---'
        }
    ];

    for (const item of malformedTests) {
        const res = validateQuestionBankMarkdown(item.content, `${item.desc}.md`);
        if (item.desc === 'Empty question statement' && res.isValid) {
            const bugMsg = "Validator fails to reject empty question statement when followed by block separator '\\n\\n---'. Root cause: afterQ.trim() strips leading newlines so search(/\\n\\s*---/) misses the separator.";
            discoveries.push({
                id: 'BUG-EMPTY-QUESTION-SEPARATOR-BYPASS',
                severity: 'HIGH',
                component: 'validate_studylab_question_bank.js',
                lines: '352-356',
                description: bugMsg
            });
            throw new Error(bugMsg);
        }
        assert.strictEqual(res.isValid, false, `Markdown validator failed to reject: ${item.desc}`);
    }
});

console.log('\n================================================================================');
console.log(`STRESS TEST SUMMARY: ${passedTests} passed, ${failedTests} failed (Total: ${totalTests})`);
console.log('================================================================================');

if (discoveries.length > 0) {
    console.log('\n🔍 EMPIRICAL DISCOVERIES / FINDINGS:');
    for (const disc of discoveries) {
        console.log(`  [${disc.severity}] ${disc.id} (${disc.component}:${disc.lines})`);
        console.log(`         ${disc.description}`);
    }
}

if (failures.length > 0) {
    console.log('\n❌ FAILED TESTS DETAIL:');
    for (const f of failures) {
        console.log(`  [${f.suite}] ${f.testId}: ${f.description}`);
        console.log(`       Error: ${f.error}`);
    }
}

module.exports = {
    totalTests,
    passedTests,
    failedTests,
    failures,
    discoveries
};

if (require.main === module) {
    process.exit(failedTests > 0 ? 1 : 0);
}
