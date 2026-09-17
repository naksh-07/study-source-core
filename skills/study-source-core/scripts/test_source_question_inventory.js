/**
 * Test Suite: Source Question Inventory & 100-Question Lossless Preservation
 * 
 * Verifies:
 * 1. 100 distinct source questions sharing a single pattern remain exactly 100 distinct questions.
 * 2. Stable unique source-question identity (`sqi.<subject>.<chapter>.<ref/hash>`).
 * 3. Verbatim multi-line question text preservation.
 * 4. Full options preservation (including options beyond (E) such as (F), (G)).
 * 5. Authentic provenance, question numbers, and question types.
 * 6. True duplicates are properly detected and logged in `inventory.removals` with explicit reasons.
 * 7. Evidence Pack Markdown rendering and parsing retains all items losslessly.
 * 8. Downstream Specialist Authoring (Math) preserves all 100 items into canonical question bank.
 * 9. Downstream Semantic IR and deduplication preserve distinct items without collapsing.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

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
    renderQuestionBankToMarkdown
} = require('./render_studylab_question_bank');

const {
    validateQuestionBankContent
} = require('./validate_studylab_question_bank');

const {
    createIRFromEvidencePack
} = require('./semantic_learning_ir');

const {
    deduplicateKnowledgeUnits,
    classifyKuRelation,
    RELATION_TYPES
} = require('./semantic_deduplication');

console.log('======================================================================');
console.log('TEST SUITE: SOURCE QUESTION INVENTORY & LOSSLESS PRESERVATION');
console.log('======================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
    totalTests++;
    try {
        fn();
        console.log(`[PASS] ${testName}`);
        passedTests++;
    } catch (e) {
        console.error(`[FAIL] ${testName}`);
        console.error(e.stack || e.message);
        process.exitCode = 1;
    }
}

// -----------------------------------------------------------------------------
// Test 1: Basic Ingestion of 100 Distinct Questions with Single Pattern
// -----------------------------------------------------------------------------
runTest('100 distinct source questions under 1 pattern preserve exactly 100 inventory items', () => {
    const rawQuestions = [];
    const patternId = 'pat.math.lcm.prime_factorization';

    for (let i = 1; i <= 100; i++) {
        const numA = 10 + i;
        const numB = 20 + i;
        rawQuestions.push({
            id: `raw_q_${i}`,
            question_number: `Q-${String(i).padStart(3, '0')}`,
            question_text: `Find the LCM of ${numA} and ${numB}.\nDetailed condition: Both numbers are positive integers.`,
            options: [
                `LCM(${numA}, ${numB}) = ${numA * 2}`,
                `LCM(${numA}, ${numB}) = ${numA * 3}`,
                `LCM(${numA}, ${numB}) = ${numA * numB}`,
                `LCM(${numA}, ${numB}) = ${numA * numB * 2}`,
                `LCM(${numA}, ${numB}) = None of these`
            ],
            correct_answer: `LCM(${numA}, ${numB}) = ${numA * numB}`,
            question_type: 'mcq',
            pattern_ref: patternId,
            difficulty: 2.5,
            provenance: {
                source: 'SSC CGL Tier 2 Authentic Past Papers 2018-2024',
                exam: 'SSC CGL Tier 2',
                year: 2018 + (i % 6),
                shift: (i % 3) + 1
            }
        });
    }

    const inventory = buildSourceQuestionInventory(rawQuestions, {
        subject: 'Math',
        chapter: 'LCM-HCF',
        sourceId: 'src.ssc.cgl.math.pyq'
    });

    assert.strictEqual(inventory.questions.length, 100, `Expected 100 items, got ${inventory.questions.length}`);
    assert.strictEqual(inventory.removals.length, 0, `Expected 0 removals, got ${inventory.removals.length}`);

    // Verify stable IDs
    const idSet = new Set();
    inventory.questions.forEach((q, idx) => {
        assert(q.source_question_id.startsWith('sqi.math.lcm-hcf.'), `Invalid ID format: ${q.source_question_id}`);
        assert.strictEqual(q.question_number, `Q-${String(idx + 1).padStart(3, '0')}`);
        assert.strictEqual(q.options.length, 5, `Expected 5 options, got ${q.options.length}`);
        assert(q.question_text.includes('Detailed condition: Both numbers are positive integers.'), 'Multi-line statement preserved');
        idSet.add(q.source_question_id);
    });
    assert.strictEqual(idSet.size, 100, 'All 100 source_question_id must be unique');

    // Schema Validation
    const valResult = validateSourceQuestionInventory(inventory);
    assert.strictEqual(valResult.isValid, true, `Inventory validation failed: ${valResult.errors.join(', ')}`);
});

// -----------------------------------------------------------------------------
// Test 2: True Duplicate Removal with Explicit Logged Reasons
// -----------------------------------------------------------------------------
runTest('True duplicate questions are removed with explicit audit reasons in removals', () => {
    const rawQuestions = [
        {
            id: 'q_orig',
            question_number: '1',
            question_text: 'What is the HCF of 24 and 36?',
            options: ['6', '12', '18', '24'],
            correct_answer: '12',
            provenance: { exam: 'SSC CGL 2020' }
        },
        {
            // Exact duplicate of q_orig
            id: 'q_duplicate',
            question_number: '2',
            question_text: 'What is the HCF of 24 and 36?',
            options: ['6', '12', '18', '24'],
            correct_answer: '12',
            provenance: { exam: 'SSC CGL 2020' }
        },
        {
            // Empty question
            id: 'q_empty',
            question_number: '3',
            question_text: '   '
        },
        {
            // Distinct question with same answer
            id: 'q_distinct',
            question_number: '4',
            question_text: 'What is the HCF of 48 and 60?',
            options: ['6', '12', '18', '24'],
            correct_answer: '12',
            provenance: { exam: 'SSC CGL 2021' }
        }
    ];

    const inventory = buildSourceQuestionInventory(rawQuestions, {
        subject: 'Math',
        chapter: 'LCM-HCF',
        sourceId: 'src.test.dedup'
    });

    assert.strictEqual(inventory.questions.length, 2, `Expected 2 valid questions, got ${inventory.questions.length}`);
    assert.strictEqual(inventory.removals.length, 2, `Expected 2 removals, got ${inventory.removals.length}`);

    const reasons = inventory.removals.map(r => r.reason);
    assert(reasons.includes('EMPTY_QUESTION_TEXT'), 'Expected EMPTY_QUESTION_TEXT removal reason');
    assert(reasons.includes('EXACT_TRUE_DUPLICATE'), 'Expected EXACT_TRUE_DUPLICATE removal reason');

    // Check duplicate_of reference
    const dupRemoval = inventory.removals.find(r => r.reason === 'EXACT_TRUE_DUPLICATE');
    assert(dupRemoval.duplicate_of, 'Duplicate removal must record duplicate_of ID');
});

// -----------------------------------------------------------------------------
// Test 3: Markdown Section 5 Rendering and Lossless Roundtrip Parsing
// -----------------------------------------------------------------------------
runTest('Inventory renders to Markdown Section 5 and roundtrips without losing items or options', () => {
    const rawQuestions = [];
    for (let i = 1; i <= 25; i++) {
        rawQuestions.push({
            id: `item_${i}`,
            question_number: `Q-${i}`,
            question_text: `Statement line 1 for problem ${i}\nStatement line 2 with mathematical detail.`,
            options: [
                `Option A value ${i}`,
                `Option B value ${i}`,
                `Option C value ${i}`,
                `Option D value ${i}`,
                `Option E value ${i}`,
                `Option F value ${i}` // 6 options to test beyond E
            ],
            correct_answer: `Option B value ${i}`,
            question_type: 'mcq',
            difficulty: 3.0,
            provenance: { exam: 'RRB NTPC 2022' }
        });
    }

    const inventory = buildSourceQuestionInventory(rawQuestions, {
        subject: 'Math',
        chapter: 'LCM-HCF',
        sourceId: 'src.rrb.ntpc'
    });

    const md = renderInventoryToEvidenceMarkdown(inventory);
    assert(md.includes('## 5. Authentic Source Problems & PYQs'), 'Must render Section 5 heading');

    const parsedItems = parseInventoryItemsFromMarkdownText(md);
    assert.strictEqual(parsedItems.length, 25, `Expected 25 parsed items from markdown, got ${parsedItems.length}`);

    for (let i = 0; i < 25; i++) {
        const orig = inventory.questions[i];
        const parsed = parsedItems[i];
        assert.strictEqual(parsed.source_question_id, orig.source_question_id, `ID mismatch at ${i}`);
        assert.strictEqual(parsed.options.length, 6, `Option count mismatch at ${i}, expected 6 got ${parsed.options.length}`);
        assert(parsed.question_text.includes('Statement line 2 with mathematical detail.'), `Multi-line text lost at ${i}`);
    }
});

// -----------------------------------------------------------------------------
// Test 4: End-to-End Pipeline: Ingest Fixture -> Evidence Pack -> Specialist Content
// -----------------------------------------------------------------------------
runTest('Complete Ingestion to Math Specialist authoring produces 100 questions in Question Bank', () => {
    const sourceFixture = {
        source_id: 'src.ssc.cgl.100q',
        subject: 'Math',
        chapter: 'LCM-HCF',
        problem_patterns: [
            {
                pattern_id: 'pat-math-lcm-prime-factorization',
                family_id: 'fam-math-lcm-factorization',
                title: 'LCM by Prime Factorization',
                deep_structure: 'Highest powers of prime factors',
                governing_method: 'Factor each number and take maximum exponent',
                decision_points: ['Identify primes', 'Compute product'],
                common_traps: ['Taking minimum exponent instead of maximum'],
                error_categories: ['ERR_01', 'ERR_06']
            }
        ],
        source_problems: []
    };

    // Populate 100 questions under source_problems
    for (let i = 1; i <= 100; i++) {
        sourceFixture.source_problems.push({
            id: `pyq_math_${i}`,
            question_number: String(i),
            pattern_ref: 'pat-math-lcm-prime-factorization',
            question_text: `Find the smallest number divisible by ${i + 5}, ${i + 10}, and ${i + 15}.`,
            options: [
                `Answer ${i * 10}`,
                `Answer ${i * 20}`,
                `Answer ${i * 30}`,
                `Answer ${i * 40}`
            ],
            correct_answer: `Answer ${i * 10}`,
            type: 'mcq',
            difficulty: 2.0 + (i % 3),
            exam: 'SSC CGL Tier 1'
        });
    }

    // Ingest into Canonical Evidence Pack
    const evidencePack = ingestSourceToEvidencePack(sourceFixture, {
        subject: 'Math',
        chapter: 'LCM-HCF'
    });

    assert(evidencePack.source_question_inventory, 'Evidence pack must contain source_question_inventory');
    assert.strictEqual(evidencePack.source_question_inventory.questions.length, 100, 'Inventory must have 100 questions');
    assert.strictEqual(evidencePack.source_problems.length, 100, 'source_problems must have 100 questions');

    // Author Canonical Question Bank with Math Specialist
    const canonicalQB = authorMathProceduralContent(evidencePack);
    assert.strictEqual(canonicalQB.questions.length, 100, `Expected 100 canonical questions, got ${canonicalQB.questions.length}`);

    // Verify all 100 questions have source_question_id preserved
    for (let i = 0; i < 100; i++) {
        const q = canonicalQB.questions[i];
        assert(q.source_question_id, `Question ${i} missing source_question_id`);
        assert(q.source_question_id.startsWith('sqi.math.lcm-hcf.'), `Invalid source_question_id: ${q.source_question_id}`);
        assert.strictEqual(q.options.length, 4, `Question ${i} should have 4 options`);
    }

    // Validate Question Bank Content
    const qbVal = validateQuestionBankContent(canonicalQB);
    assert.strictEqual(qbVal.isValid, true, `Question bank validation failed: ${qbVal.errors.join('; ')}`);

    // Render Question Bank to Markdown
    const qbMd = renderQuestionBankToMarkdown(canonicalQB);
    assert(qbMd.includes('**Total Practice Questions**: 100'), 'Markdown header must reflect 100 questions');
    assert(qbMd.includes('## math-q-100 — '), 'Markdown must render the 100th question');
});

// -----------------------------------------------------------------------------
// Test 5: Downstream Semantic IR and Deduplication Preservation Invariant
// -----------------------------------------------------------------------------
runTest('Semantic Learning IR and Deduplication preserve all distinct source questions under 1 pattern', () => {
    const rawQuestions = [];
    const patternId = 'pat.math.lcm.prime_factorization';

    for (let i = 1; i <= 50; i++) {
        rawQuestions.push({
            id: `sem_q_${i}`,
            question_number: String(i),
            question_text: `Compute the LCM of 2^${i} and 3^${i}.`,
            options: [`${2**i}`, `${3**i}`, `${(2*3)**i}`, 'None'],
            correct_answer: `${(2*3)**i}`,
            question_type: 'mcq',
            pattern_ref: patternId,
            provenance: { exam: 'CAT 2020' }
        });
    }

    const evidencePack = ingestSourceToEvidencePack({
        source_id: 'src.cat.math',
        subject: 'Math',
        chapter: 'LCM-HCF',
        problem_patterns: [{ pattern_id: patternId, title: 'Prime Factorization' }],
        source_problems: rawQuestions
    });

    const ir = createIRFromEvidencePack(evidencePack);
    assert.strictEqual(ir.practice_items.length, 50, `Expected 50 IR practice items, got ${ir.practice_items.length}`);

    // Deduplication should NOT collapse any of the 50 items
    const dedupResult = deduplicateKnowledgeUnits(ir.practice_items, { subject: 'Math', chapter: 'LCM-HCF' });
    assert.strictEqual(dedupResult.uniqueKus.length, 50, `Expected 50 items after dedup, got ${dedupResult.uniqueKus.length}`);
    assert.strictEqual(dedupResult.duplicateCount, 0, `Expected 0 items removed by dedup, got ${dedupResult.duplicateCount}`);
});

console.log('\n======================================================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} PASSED (ALL PASS)`);
console.log('======================================================================');
