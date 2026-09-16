/**
 * StudySourceCore Milestone 2 — Master Test Suite (`test_milestone2_semantic_layer.js`)
 *
 * Comprehensive verification of the Knowledge + Pedagogy + Semantic QA Layer:
 *
 * SECTION A: Unit Tests — Individual module correctness (6 modules × ~4 tests each)
 * SECTION B: Multi-Domain Contract Tests — Math, Physics, Chemistry, Reasoning, Geography (5 domains)
 * SECTION C: Adversarial Scenarios (ADV-KU-01 through ADV-KU-12)
 * SECTION D: Integration — Cross-module orchestration and comprehensive audit
 *
 * Total: ~60+ assertions covering all Milestone 2 subsystems.
 */

const assert = require('assert');
const crypto = require('crypto');

// ─── Module Imports ─────────────────────────────────────────
const {
    RESERVATION_STATES,
    generateDeterministicKuId,
    isValidKuId,
    normalizePropositionText,
    generateCanonicalSemanticIdentity,
    computeSemanticDigest,
    getReservationRegistry,
    reserveKnowledgeUnit,
    validateReservationIntegrity,
    releaseReservation
} = require('./ku_reservation_engine');

const {
    RELATION_TYPES,
    classifyKuRelation,
    deduplicateKnowledgeUnits,
    enforceCrossArtifactDeduplication,
    computeJaccardSimilarity,
    extractTokens,
    isStemProceduralVariant
} = require('./semantic_deduplication');

const {
    validateSubjectDomain,
    getDomainLexicon,
    resolveCanonicalSubject,
    detectForeignIntruders
} = require('./subject_boundary_validator');

const {
    SUITABILITY_TIERS,
    getSuitability,
    getSuitabilityTier,
    evaluateChapterSuitability,
    normalizeSubject
} = require('./artifact_suitability_policy');

const {
    validateHintSemantics,
    validateDistractorSemantics,
    detectHintLeak,
    detectHintBoilerplate
} = require('./hint_distractor_semantics');

const {
    PEDAGOGICAL_CLASSIFICATIONS,
    LEARNING_OBJECTIVES,
    SCAFFOLDING_STAGES,
    classifyKnowledgeUnit,
    compileKnowledgeUnit,
    compileChapterPedagogy,
    validateCompiledPedagogy
} = require('./pedagogical_compiler');

const {
    QA_SEVERITY,
    QA_CHECK_IDS,
    checkKuReservationIntegrity,
    checkSemanticDeduplication,
    checkSubjectBoundary,
    checkArtifactSuitability,
    checkHintSemantics,
    checkDistractorSemantics,
    checkMcqCardinality,
    checkKuIdFormat,
    checkSourceGrounding,
    checkCrossArtifactDedup,
    runComprehensiveAudit
} = require('./semantic_qa_engine');

const { computeSha256, createContentLineageRecord } = require('./content_lineage_record');

// ─── Test Helpers ───────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ✓ ${name}`);
    } catch (err) {
        failed++;
        failures.push({ name, error: err.message });
        console.log(`  ✗ ${name}`);
        console.log(`    → ${err.message}`);
    }
}

function makeHash(content) {
    return computeSha256(content || `test-content-${Date.now()}-${Math.random()}`);
}

function makeCLR(overrides = {}) {
    return createContentLineageRecord({
        source_id: overrides.source_id || 'src.test',
        source_coordinates: overrides.source_coordinates || { section: 'Test Section' },
        source_chunk_hash: overrides.source_chunk_hash || makeHash('test chunk'),
        evidence_pack_id: overrides.evidence_pack_id || 'ep.test.001',
        ku_id: overrides.ku_id || 'ku.math.lcm-hcf.prime-factorization',
        origin_tier: overrides.origin_tier || 'CURATED',
        generator_metadata: overrides.generator_metadata || { engine_version: '1.0.0-test' },
        model_and_prompt: overrides.model_and_prompt || { model: 'test', prompt_version: 'v1' },
        transformation_history: overrides.transformation_history || ['test_creation'],
        renderer_target: overrides.renderer_target || 'Notes/Test_Notes.md',
        certification_state: overrides.certification_state || { status: 'PENDING' }
    });
}

function makeReservation(overrides = {}) {
    const chunkHash = overrides.source_chunk_hash || makeHash('reservation chunk');
    const kuId = overrides.ku_id || 'ku.math.lcm-hcf.prime-factorization';
    const epId = overrides.evidence_pack_id || 'ep.test.001';
    const clr = makeCLR({ source_chunk_hash: chunkHash, ku_id: kuId, evidence_pack_id: epId });
    return reserveKnowledgeUnit({
        ku_id: kuId,
        subject: overrides.subject || 'Math',
        topic: overrides.topic || 'LCM-HCF',
        concept_name: overrides.concept_name || 'Prime Factorization',
        propositions: overrides.propositions || ['Every composite number has a unique prime factorization'],
        source_chunk_hash: chunkHash,
        evidence_pack_id: epId,
        target_modalities: overrides.target_modalities || ['notes', 'basic', 'cloze'],
        clr
    });
}

// ─── Compact KU fixture builder ─────────────────────────────
function makeKU(id, title, props = {}) {
    return {
        id,
        ku_id: id,
        title,
        definition: props.definition || title,
        propositions: props.propositions || [title],
        stem: props.stem || '',
        formulas: props.formulas || [],
        subject: props.subject || 'Math',
        topic: props.topic || 'General',
        target_modalities: props.target_modalities || ['notes'],
        source_chunk_hash: props.source_chunk_hash || makeHash(id),
        evidence_pack_id: props.evidence_pack_id || 'ep.test.001',
        ku_type: props.ku_type || 'conceptual',
        canonical_semantic_identity: props.canonical_semantic_identity || normalizePropositionText(title),
        metadata: props.metadata || {},
        clr: props.clr || makeCLR({ ku_id: id, source_chunk_hash: props.source_chunk_hash || makeHash(id) }),
        ...(props.options ? { options: props.options } : {}),
        ...(props.solution_dag ? { solution_dag: props.solution_dag } : {}),
        ...(props.pattern_id ? { pattern_id: props.pattern_id } : {}),
        ...(props.question_type ? { question_type: props.question_type } : {}),
        ...(props.hints ? { hints: props.hints } : {}),
        ...(props.answer ? { answer: props.answer } : {}),
        ...(props.worked_example ? { worked_example: props.worked_example } : {})
    };
}

// ═════════════════════════════════════════════════════════════
// SECTION A: UNIT TESTS
// ═════════════════════════════════════════════════════════════
console.log('\n═══ SECTION A: UNIT TESTS ═══\n');

// ─── A.1: KU Reservation Engine ────────────────────────────
console.log('─── A.1: KU Reservation Engine ───');

test('A1.1 — Generates deterministic KU IDs', () => {
    const id = generateDeterministicKuId('Math', 'LCM-HCF', 'Prime Factorization');
    assert.strictEqual(id, 'ku.math.lcm-hcf.prime_factorization');
    assert.ok(isValidKuId(id));
});

test('A1.2 — Validates KU ID format', () => {
    assert.ok(isValidKuId('ku.math.algebra.quadratic'));
    assert.ok(!isValidKuId('invalid-id'));
    assert.ok(!isValidKuId('ku.math'));
    assert.ok(!isValidKuId('ku.math.'));
});

test('A1.3 — Reservation state lifecycle: RESERVED → ACTIVE → SUPPRESSED', () => {
    const registry = getReservationRegistry();
    const res = makeReservation();
    registry.register(res);
    assert.strictEqual(res.state, RESERVATION_STATES.RESERVED);
    registry.updateState(res.ku_id, RESERVATION_STATES.ACTIVE, 'activation');
    assert.strictEqual(res.state, RESERVATION_STATES.ACTIVE);
    registry.release(res.ku_id, 'dedup merge');
    assert.strictEqual(res.state, RESERVATION_STATES.SUPPRESSED);
    assert.strictEqual(res.state_history.length, 3);
});

test('A1.4 — Reservation integrity validation', () => {
    const res = makeReservation();
    const v = validateReservationIntegrity(res);
    assert.ok(v.isValid, `Expected valid reservation, got: ${v.errors.join('; ')}`);
});

test('A1.5 — Canonical semantic identity generation', () => {
    const identity = generateCanonicalSemanticIdentity({
        propositions: ['LCM of two numbers is the smallest common multiple'],
        definition: 'Least Common Multiple'
    });
    assert.ok(identity.length > 0);
    assert.ok(identity.includes('prop:'));
});

// ─── A.2: Semantic Deduplication ────────────────────────────
console.log('\n─── A.2: Semantic Deduplication ───');

test('A2.1 — SAME_KU classification for identical propositions', () => {
    const kuA = makeKU('ku.math.lcm.definition', 'LCM is the Least Common Multiple of two numbers');
    const kuB = makeKU('ku.math.lcm.definition-dup', 'LCM is the Least Common Multiple of two numbers');
    const result = classifyKuRelation(kuA, kuB);
    assert.strictEqual(result.relation, RELATION_TYPES.SAME_KU);
});

test('A2.2 — DIFFERENT_KU for unrelated concepts', () => {
    const kuA = makeKU('ku.math.lcm.definition', 'LCM is the Least Common Multiple');
    const kuB = makeKU('ku.physics.newton.first-law', "Newton's first law states that an object at rest stays at rest unless acted upon by a force");
    const result = classifyKuRelation(kuA, kuB);
    assert.strictEqual(result.relation, RELATION_TYPES.DIFFERENT_KU);
});

test('A2.3 — Procedural variant preservation (1 Pattern != 1 Question)', () => {
    const kuA = makeKU('ku.math.lcm.q1', 'Find the LCM of 12 and 15', {
        ku_type: 'procedural', stem: 'Find the LCM of 12 and 15', pattern_id: 'MATH-LCM-01', answer: '60'
    });
    const kuB = makeKU('ku.math.lcm.q2', 'Find the LCM of 18 and 24', {
        ku_type: 'procedural', stem: 'Find the LCM of 18 and 24', pattern_id: 'MATH-LCM-01', answer: '72'
    });
    const result = classifyKuRelation(kuA, kuB);
    // Should be RELATED (same pattern, different questions) — NOT SAME_KU
    assert.strictEqual(result.relation, RELATION_TYPES.RELATED_KU);
});

test('A2.4 — Cross-artifact deduplication resolves Basic+Cloze conflict', () => {
    const kus = [
        makeKU('ku.geo.rivers.ganga', 'The Ganga river originates from Gangotri glacier', {
            target_modalities: ['basic', 'cloze']
        })
    ];
    const result = enforceCrossArtifactDeduplication(kus);
    assert.strictEqual(result.violationsCount, 1);
    assert.strictEqual(result.conflictsResolved.length, 1);
    // Factual atomic → should resolve to basic
    assert.strictEqual(result.conflictsResolved[0].resolvedModality, 'basic');
});

test('A2.5 — Deduplication merges duplicate KUs', () => {
    const kus = [
        makeKU('ku.math.lcm.def1', 'LCM is the smallest positive number divisible by both'),
        makeKU('ku.math.lcm.def2', 'LCM is the smallest positive number divisible by both')
    ];
    const result = deduplicateKnowledgeUnits(kus);
    assert.strictEqual(result.uniqueKus.length, 1);
    assert.strictEqual(result.duplicateCount, 1);
});

// ─── A.3: Subject Boundary Validator ────────────────────────
console.log('\n─── A.3: Subject Boundary Validator ───');

test('A3.1 — Passes for correct domain concepts', () => {
    const kus = [makeKU('ku.math.lcm.prime', 'Prime factorization method for finding LCM and HCF')];
    const result = validateSubjectDomain(kus, 'Math');
    assert.ok(result.isValid, `Expected valid, got: ${result.summary}`);
});

test('A3.2 — Detects Physics intrusion in Math chapter', () => {
    const kus = [makeKU('ku.math.lcm.invalid', "Apply Newton's first law to find the LCM of two numbers")];
    const result = validateSubjectDomain(kus, 'Math');
    assert.ok(!result.isValid);
    assert.ok(result.violations.length > 0);
    assert.ok(result.violations[0].foreign_domain === 'Physics');
});

test('A3.3 — Domain lexicon retrieval', () => {
    const lex = getDomainLexicon('Physics');
    assert.ok(lex.centroids.length > 0);
    assert.ok(lex.signatures.length > 0);
    assert.strictEqual(lex.canonicalSubject, 'Physics');
});

test('A3.4 — Subject alias resolution', () => {
    assert.strictEqual(resolveCanonicalSubject('maths'), 'Math');
    assert.strictEqual(resolveCanonicalSubject('polity'), 'Political Science');
    assert.strictEqual(resolveCanonicalSubject('bio'), 'Biology');
});

// ─── A.4: Artifact Suitability Policy ──────────────────────
console.log('\n─── A.4: Artifact Suitability Policy ───');

test('A4.1 — STEM procedural subjects require question banks', () => {
    const suit = getSuitability('Math', 'proceduralQuestionBank');
    assert.strictEqual(suit.tier, SUITABILITY_TIERS.CORE);
});

test('A4.2 — Declarative subjects forbid procedural APKG', () => {
    const suit = getSuitability('Geography', 'proceduralApkg');
    assert.strictEqual(suit.tier, SUITABILITY_TIERS.SHOULD_NOT_GENERATE);
});

test('A4.3 — Chapter suitability evaluation with evidence', () => {
    const eval1 = evaluateChapterSuitability('Math', {
        diagram_count: 3, relational_depth: 2, problem_count: 10
    });
    assert.ok(eval1.shouldGenerate('notes'));
    assert.ok(eval1.shouldGenerate('proceduralQuestionBank'));
    assert.ok(eval1.shouldGenerate('imageOcclusion')); // diagrams present
    assert.ok(eval1.shouldGenerate('mindmap')); // depth >= 2
});

test('A4.4 — Conditional artifact suppression when evidence absent', () => {
    const eval2 = evaluateChapterSuitability('History', {
        diagram_count: 0, relational_depth: 1
    });
    assert.ok(!eval2.shouldGenerate('imageOcclusion'));
    assert.ok(!eval2.shouldGenerate('mindmap'));
    assert.ok(!eval2.shouldGenerate('proceduralQuestionBank'));
});

test('A4.5 — Math Anki flashcards exclude numerical calculations constraint', () => {
    const suit = getSuitability('Math', 'basic');
    assert.ok(suit.constraints.includes('STRICTLY_EXCLUDE_NUMERICAL_CALCULATIONS'));
});

// ─── A.5: Hint & Distractor Semantics ──────────────────────
console.log('\n─── A.5: Hint & Distractor Semantics ───');

test('A5.1 — Valid 3-tier hints pass validation', () => {
    const result = validateHintSemantics({
        tier1_conceptual: 'LCM requires identifying the prime factors of each number and taking the highest power of each',
        tier2_strategic: 'Use prime factorization: decompose both numbers into primes, then multiply the highest powers',
        tier3_next_step: 'For 12 and 15: 12 = 2² × 3 and 15 = 3 × 5. Now take max powers of each prime factor'
    }, '60', ['45', '60', '120', '180']);
    assert.ok(result.isValid, `Expected valid hints, got: ${result.errors.join('; ')}`);
});

test('A5.2 — Detects hint answer leak (exact match)', () => {
    const leak = detectHintLeak('The answer is 60, just compute it', '60');
    assert.ok(leak.hasLeak);
    assert.ok(leak.leakType === 'EXACT_MATCH_LEAK' || leak.leakType === 'NUMERICAL_EQUIVALENCE_LEAK',
        `Expected EXACT_MATCH_LEAK or NUMERICAL_EQUIVALENCE_LEAK, got ${leak.leakType}`);
});

test('A5.3 — Detects boilerplate hints', () => {
    const bp = detectHintBoilerplate('Think carefully');
    assert.ok(bp.isBoilerplate);
});

test('A5.4 — Valid MCQ distractors pass validation', () => {
    const result = validateDistractorSemantics(['45', '60', '120', '180'], '60');
    assert.ok(result.isValid, `Expected valid distractors, got: ${result.errors.join('; ')}`);
});

test('A5.5 — Rejects MCQ with < 4 options', () => {
    const result = validateDistractorSemantics(['A', 'B'], 'A');
    assert.ok(!result.isValid);
    assert.ok(result.errors.some(e => e.includes('CARDINALITY')));
});

// ─── A.6: Pedagogical Compiler ─────────────────────────────
console.log('\n─── A.6: Pedagogical Compiler ───');

test('A6.1 — Classifies procedural KU correctly', () => {
    const ku = makeKU('ku.math.lcm.q1', 'Calculate the LCM of 12 and 15', { stem: 'Calculate the LCM of 12 and 15' });
    const cls = classifyKnowledgeUnit(ku);
    assert.strictEqual(cls.classification, PEDAGOGICAL_CLASSIFICATIONS.PROCEDURAL);
    assert.ok(cls.confidence > 0);
});

test('A6.2 — Classifies factual KU correctly', () => {
    const ku = makeKU('ku.history.mughal.definition', 'Define the extent of the Mughal Empire under Akbar');
    const cls = classifyKnowledgeUnit(ku);
    assert.strictEqual(cls.classification, PEDAGOGICAL_CLASSIFICATIONS.FACTUAL);
});

test('A6.3 — Compiles KU with full payload', () => {
    const ku = makeKU('ku.math.algebra.quadratic', 'Solve the quadratic equation x² - 5x + 6 = 0', {
        stem: 'Solve the quadratic equation', formulas: ['x = (-b ± √(b²-4ac))/2a']
    });
    const compiled = compileKnowledgeUnit(ku, { subject: 'Math' });
    assert.ok(compiled.classification);
    assert.ok(compiled.learningObjective);
    assert.ok(compiled.scaffolding);
    assert.ok(compiled.compiledAt);
});

test('A6.4 — Chapter pedagogy compilation', () => {
    const kus = [
        makeKU('ku.math.lcm.def', 'LCM definition and properties'),
        makeKU('ku.math.lcm.calc', 'Calculate the LCM of two numbers', { stem: 'Calculate the LCM' })
    ];
    const result = compileChapterPedagogy(kus, 'Math');
    assert.strictEqual(result.subject, 'Math');
    assert.strictEqual(result.compiledKus.length, 2);
    assert.ok(result.chapterSummary);
    assert.ok(result.pedagogicalProfile);
});

test('A6.5 — Validates compiled pedagogy', () => {
    const ku = makeKU('ku.math.lcm.test', 'Find the LCM using factorization', { stem: 'Find the LCM' });
    const compiled = compileKnowledgeUnit(ku, { subject: 'Math' });
    const validation = validateCompiledPedagogy(compiled);
    assert.ok(validation.isValid, `Expected valid, got: ${(validation.errors || []).join('; ')}`);
});

// ─── A.7: Semantic QA Engine ───────────────────────────────
console.log('\n─── A.7: Semantic QA Engine ───');

test('A7.1 — QA check IDs are defined', () => {
    assert.ok(QA_CHECK_IDS.COMPREHENSIVE_AUDIT === 'QA-KU-12');
    assert.ok(Object.keys(QA_CHECK_IDS).length === 12);
});

test('A7.2 — KU ID format check passes valid IDs', () => {
    const kus = [
        makeKU('ku.math.lcm.def', 'LCM definition'),
        makeKU('ku.physics.kinematics.velocity', 'Average velocity')
    ];
    const result = checkKuIdFormat(kus);
    assert.ok(result.passed);
});

test('A7.3 — KU ID format check catches invalid IDs', () => {
    const kus = [{ id: 'bad-id', ku_id: 'bad-id', title: 'Invalid' }];
    const result = checkKuIdFormat(kus);
    assert.ok(!result.passed);
    assert.strictEqual(result.severity, QA_SEVERITY.CRITICAL);
});

test('A7.4 — Source grounding check validates provenance', () => {
    const kus = [makeKU('ku.math.lcm.def', 'LCM def')];
    const result = checkSourceGrounding(kus);
    assert.ok(result.passed);
});

test('A7.5 — MCQ cardinality check catches < 4 options', () => {
    const items = [{ id: 'q1', stem: 'Test', options: ['A', 'B'] }];
    const result = checkMcqCardinality(items);
    assert.ok(!result.passed);
    assert.strictEqual(result.severity, QA_SEVERITY.CRITICAL);
});

// ═════════════════════════════════════════════════════════════
// SECTION B: MULTI-DOMAIN CONTRACT TESTS
// ═════════════════════════════════════════════════════════════
console.log('\n═══ SECTION B: MULTI-DOMAIN CONTRACT TESTS ═══\n');

const DOMAIN_TEST_CASES = {
    Math: {
        validKU: makeKU('ku.math.lcm.prime-factorization', 'Prime factorization method for LCM and HCF of coprime integers', {
            subject: 'Math', stem: 'Find the LCM of 12, 15 and 20 using prime factorization method',
            formulas: ['LCM(a,b) = (a × b) / HCF(a,b)'], answer: '60',
            options: ['30', '60', '120', '180'],
            hints: {
                tier1_conceptual: 'LCM uses the highest power of each prime factor present across all numbers',
                tier2_strategic: 'Prime factorize each number: find powers of 2, 3, and 5 separately',
                tier3_next_step: '12 = 2² × 3, 15 = 3 × 5, 20 = 2² × 5. Take max of each prime power'
            }
        }),
        coreArtifacts: ['notes', 'proceduralQuestionBank'],
        forbiddenArtifacts: []
    },
    Physics: {
        validKU: makeKU('ku.physics.kinematics.equations-of-motion', 'Equations of motion for uniformly accelerated bodies', {
            subject: 'Physics', stem: 'A car accelerates from rest at 2 m/s². Find velocity after 10 seconds.',
            formulas: ['v = u + at', 's = ut + ½at²'], answer: '20',
            options: ['10', '20', '40', '5'],
            hints: {
                tier1_conceptual: 'Uniform acceleration means constant rate of change of velocity along straight line',
                tier2_strategic: 'Apply first equation of motion v = u + at where u is initial velocity',
                tier3_next_step: 'u = 0 (from rest), a = 2 m/s², t = 10 s. Substitute into v = u + at'
            }
        }),
        coreArtifacts: ['notes', 'proceduralQuestionBank'],
        forbiddenArtifacts: []
    },
    Chemistry: {
        validKU: makeKU('ku.chemistry.equilibrium.kc-expression', 'Equilibrium constant Kc expression for reversible reactions', {
            subject: 'Chemistry', stem: 'Calculate Kc for 2SO₂ + O₂ ⇌ 2SO₃ given equilibrium concentrations',
            formulas: ['Kc = [SO₃]² / ([SO₂]² × [O₂])'], answer: '4.0',
            options: ['2.0', '4.0', '8.0', '0.5'],
            hints: {
                tier1_conceptual: 'Equilibrium constant Kc relates product concentrations to reactant concentrations at equilibrium',
                tier2_strategic: 'Write Kc expression: products over reactants, each raised to stoichiometric coefficient',
                tier3_next_step: 'Kc = [SO₃]² / ([SO₂]² × [O₂]). Substitute the given equilibrium molar concentrations'
            }
        }),
        coreArtifacts: ['notes', 'proceduralQuestionBank'],
        forbiddenArtifacts: []
    },
    Reasoning: {
        validKU: makeKU('ku.reasoning.seating.circular-arrangement', 'Circular seating arrangement with 6 persons facing center', {
            subject: 'Reasoning', stem: 'Six persons A, B, C, D, E, F sit in circular arrangement facing center. A is opposite D. B is to immediate left of A.',
            answer: 'E sits opposite to B',
            options: ['B sits opposite to A', 'E sits opposite to B', 'C sits opposite to F', 'D sits opposite to A'],
            ku_type: 'procedural',
            hints: {
                tier1_conceptual: 'In circular arrangement facing center, opposite means directly across with 2 persons between',
                tier2_strategic: 'Fix one person first, then place others using constraints: opposite, immediate left/right',
                tier3_next_step: 'Place A at 12 o\'clock. D is opposite at 6 o\'clock. B is at 11 o\'clock position (immediate left of A)'
            }
        }),
        coreArtifacts: ['notes', 'proceduralQuestionBank'],
        forbiddenArtifacts: []
    },
    Geography: {
        validKU: makeKU('ku.geography.monsoons.southwest-monsoon', 'Southwest monsoon mechanism and Indian rainfall distribution', {
            subject: 'Geography',
            propositions: [
                'Southwest monsoon is caused by differential heating of land and sea',
                'Arabian Sea branch brings rainfall to Western Ghats and Kerala',
                'Bay of Bengal branch causes rainfall in northeast India'
            ]
        }),
        coreArtifacts: ['notes', 'basic', 'cloze'],
        forbiddenArtifacts: ['proceduralQuestionBank', 'proceduralApkg']
    }
};

for (const [domain, tc] of Object.entries(DOMAIN_TEST_CASES)) {
    console.log(`─── B: ${domain} Contract ───`);

    test(`B.${domain}.1 — Subject boundary passes for valid ${domain} KU`, () => {
        const result = validateSubjectDomain([tc.validKU], domain);
        assert.ok(result.isValid, `${domain} boundary check failed: ${result.summary}`);
    });

    test(`B.${domain}.2 — Artifact suitability core artifacts present`, () => {
        for (const art of tc.coreArtifacts) {
            const tier = getSuitabilityTier(domain, art);
            assert.ok(
                tier === SUITABILITY_TIERS.CORE || tier === SUITABILITY_TIERS.USEFUL,
                `${domain} → ${art} should be CORE or USEFUL, got ${tier}`
            );
        }
    });

    test(`B.${domain}.3 — Forbidden artifacts properly suppressed`, () => {
        for (const art of tc.forbiddenArtifacts) {
            const tier = getSuitabilityTier(domain, art);
            assert.strictEqual(tier, SUITABILITY_TIERS.SHOULD_NOT_GENERATE,
                `${domain} → ${art} should be SHOULD_NOT_GENERATE, got ${tier}`);
        }
    });

    test(`B.${domain}.4 — Pedagogical compilation succeeds`, () => {
        const compiled = compileKnowledgeUnit(tc.validKU, { subject: domain });
        assert.ok(compiled.classification);
        assert.ok(compiled.learningObjective);
    });

    if (tc.validKU.hints) {
        test(`B.${domain}.5 — Hint semantics pass for valid hints`, () => {
            const result = validateHintSemantics(tc.validKU.hints, tc.validKU.answer, tc.validKU.options || []);
            assert.ok(result.isValid, `${domain} hint validation failed: ${result.errors.join('; ')}`);
        });
    }

    if (tc.validKU.options) {
        test(`B.${domain}.6 — Distractor semantics pass for valid MCQ`, () => {
            const result = validateDistractorSemantics(tc.validKU.options, tc.validKU.answer);
            assert.ok(result.isValid, `${domain} distractor validation failed: ${result.errors.join('; ')}`);
        });
    }
}

// ═════════════════════════════════════════════════════════════
// SECTION C: ADVERSARIAL SCENARIOS (ADV-KU-01 through ADV-KU-12)
// ═════════════════════════════════════════════════════════════
console.log('\n═══ SECTION C: ADVERSARIAL SCENARIOS ═══\n');

test('ADV-KU-01 — Rejects malformed KU ID in QA check', () => {
    const result = checkKuIdFormat([{ id: 'not.a.valid.ku.id.too-many-segments', ku_id: 'not.a.valid.ku.id.too-many-segments', title: 'Bad' }]);
    assert.ok(!result.passed);
});

test('ADV-KU-02 — Detects duplicate KUs masquerading as different', () => {
    const kus = [
        makeKU('ku.math.lcm.def-v1', 'The least common multiple (LCM) is the smallest positive integer divisible by both numbers'),
        makeKU('ku.math.lcm.def-v2', 'The least common multiple LCM is the smallest positive integer divisible by both numbers')
    ];
    const result = checkSemanticDeduplication(kus);
    assert.ok(result.duplicateCount > 0, 'Should detect semantic duplicates');
});

test('ADV-KU-03 — Protects procedural variants from false dedup', () => {
    const kuA = makeKU('ku.math.lcm.q1', 'Find the LCM of 12 and 15', {
        ku_type: 'procedural', stem: 'Find the LCM of 12 and 15', pattern_id: 'MATH-LCM-01', answer: '60', question_type: 'numerical'
    });
    const kuB = makeKU('ku.math.lcm.q2', 'Find the LCM of 18 and 24', {
        ku_type: 'procedural', stem: 'Find the LCM of 18 and 24', pattern_id: 'MATH-LCM-01', answer: '72', question_type: 'numerical'
    });
    const relation = classifyKuRelation(kuA, kuB);
    assert.notStrictEqual(relation.relation, RELATION_TYPES.SAME_KU,
        '1 Pattern != 1 Question: distinct practice questions must NOT be collapsed');
});

test('ADV-KU-04 — Chemistry concepts intruding in Math chapter', () => {
    const kus = [makeKU('ku.math.lcm.bad', "Apply Le Chatelier's principle to find the equilibrium of LCM", { subject: 'Math' })];
    const result = checkSubjectBoundary(kus, 'Math');
    assert.ok(!result.passed, 'Should detect Chemistry intrusion');
});

test('ADV-KU-05 — Biology intrusion in History chapter', () => {
    const kus = [makeKU('ku.history.mughal.bad', 'Study the mitochondria of the Mughal Empire cells and DNA replication fork', { subject: 'History' })];
    const result = checkSubjectBoundary(kus, 'History');
    assert.ok(!result.passed, 'Should detect Biology intrusion');
});

test('ADV-KU-06 — Declarative subject blocks procedural APKG', () => {
    const tier = getSuitabilityTier('Political Science', 'proceduralApkg');
    assert.strictEqual(tier, SUITABILITY_TIERS.SHOULD_NOT_GENERATE);
    const tier2 = getSuitabilityTier('History', 'proceduralApkg');
    assert.strictEqual(tier2, SUITABILITY_TIERS.SHOULD_NOT_GENERATE);
});

test('ADV-KU-07 — Missing source_chunk_hash fails source grounding', () => {
    const kus = [{ id: 'ku.math.test.bad', ku_id: 'ku.math.test.bad', title: 'Missing hash', evidence_pack_id: 'ep.test' }];
    const result = checkSourceGrounding(kus);
    assert.ok(!result.passed);
    assert.strictEqual(result.severity, QA_SEVERITY.CRITICAL);
});

test('ADV-KU-08 — Hint leaks terminal answer via exact match', () => {
    const result = validateHintSemantics({
        tier1_conceptual: 'The answer to the LCM problem is 60, which is the smallest common multiple',
        tier2_strategic: 'Use prime factorization to find the LCM',
        tier3_next_step: 'Decompose 12 = 2² × 3 and 15 = 3 × 5'
    }, '60');
    assert.ok(!result.isValid);
    assert.ok(result.errors.some(e => e.includes('LEAKAGE') || e.includes('LEAK')));
});

test('ADV-KU-09 — Boilerplate hints rejected', () => {
    const result = validateHintSemantics({
        tier1_conceptual: 'Think carefully about the problem',
        tier2_strategic: 'Apply the formula to find the answer',
        tier3_next_step: 'Use logic and solve step by step carefully'
    }, '42');
    assert.ok(!result.isValid);
    assert.ok(result.errors.some(e => e.includes('BOILERPLATE')));
});

test('ADV-KU-10 — MCQ with duplicate options fails', () => {
    const result = validateDistractorSemantics(['10', '20', '20', '40'], '20');
    assert.ok(!result.isValid);
    assert.ok(result.errors.some(e => e.includes('DUPLICATE')));
});

test('ADV-KU-11 — MCQ with placeholder distractors fails', () => {
    const result = validateDistractorSemantics(['dummy', '42', 'placeholder', 'test'], '42');
    assert.ok(!result.isValid);
});

test('ADV-KU-12 — Comprehensive audit catches multiple violations simultaneously', () => {
    const result = runComprehensiveAudit({
        kus: [
            { id: 'bad-format', ku_id: 'bad-format', title: 'Invalid KU' }
        ],
        subject: 'Math',
        practiceItems: [
            { id: 'mcq-bad', stem: 'Bad MCQ', options: ['A', 'B'] }
        ],
        hints: {
            tier1_conceptual: 'Think carefully',
            tier2_strategic: 'Use the formula',
            tier3_next_step: 'Just do it and follow the steps'
        },
        terminalAnswer: '42'
    });
    assert.ok(!result.passed, 'Comprehensive audit should FAIL with multiple violations');
    assert.ok(result.criticalFailures > 0);
    assert.ok(result.totalChecks >= 3);
});

// ═════════════════════════════════════════════════════════════
// SECTION D: INTEGRATION — Comprehensive Audit Orchestration
// ═════════════════════════════════════════════════════════════
console.log('\n═══ SECTION D: INTEGRATION ═══\n');

test('D.1 — Clean comprehensive audit passes all checks', () => {
    const validKU = makeKU('ku.math.lcm.integration-test', 'Prime factorization method for LCM computation', {
        subject: 'Math',
        stem: 'Find the LCM of 12 and 15 using prime factorization',
        answer: '60',
        options: ['30', '60', '120', '180'],
        hints: {
            tier1_conceptual: 'LCM uses the highest power of each prime factor present across all numbers',
            tier2_strategic: 'Prime factorize each number: find powers of 2, 3, and 5 separately for both numbers',
            tier3_next_step: 'For the given numbers: 12 = 2² × 3 and 15 = 3 × 5. Take maximum power of each prime'
        }
    });

    const result = runComprehensiveAudit({
        kus: [validKU],
        subject: 'Math',
        evidenceStats: { problem_count: 5, diagram_count: 0, relational_depth: 2 },
        practiceItems: [{ id: 'q1', stem: 'Find LCM', options: ['30', '60', '120', '180'] }],
        hints: validKU.hints,
        terminalAnswer: '60',
        options: ['30', '60', '120', '180'],
        correctKey: '60'
    });

    assert.ok(result.passed, `Clean audit should pass. Summary: ${result.summary}`);
    assert.strictEqual(result.criticalFailures, 0);
    assert.ok(result.totalChecks >= 5, `Expected >= 5 checks, got ${result.totalChecks}`);
});

test('D.2 — Fail-closed: single critical failure fails entire audit', () => {
    const result = runComprehensiveAudit({
        kus: [{ id: 'invalid', ku_id: 'invalid', title: 'Bad ID' }],
        subject: 'Math'
    });
    assert.ok(!result.passed, 'Audit must fail with invalid KU ID');
    assert.ok(result.criticalFailures > 0);
});

test('D.3 — Empty audit returns informational pass', () => {
    const result = runComprehensiveAudit({});
    assert.ok(result.passed);
    assert.strictEqual(result.totalChecks, 0);
});

test('D.4 — Cross-module pipeline: KU Reservation → Dedup → Boundary → Suitability → QA', () => {
    // Step 1: Reserve KUs
    const registry = getReservationRegistry();
    const chunkHash1 = makeHash('chunk-1');
    const chunkHash2 = makeHash('chunk-2');
    const res1 = reserveKnowledgeUnit({
        subject: 'Physics', topic: 'Kinematics', concept_name: 'Average Velocity',
        propositions: ['Average velocity is total displacement divided by total time'],
        source_chunk_hash: chunkHash1, evidence_pack_id: 'ep.physics.001',
        target_modalities: ['notes', 'basic', 'cloze'],
        clr: makeCLR({ source_chunk_hash: chunkHash1, ku_id: 'ku.physics.kinematics.average_velocity', evidence_pack_id: 'ep.physics.001' })
    }, registry);
    const res2 = reserveKnowledgeUnit({
        subject: 'Physics', topic: 'Kinematics', concept_name: 'Instantaneous Velocity',
        propositions: ['Instantaneous velocity is the derivative of position with respect to time'],
        source_chunk_hash: chunkHash2, evidence_pack_id: 'ep.physics.001',
        target_modalities: ['notes', 'basic'],
        clr: makeCLR({ source_chunk_hash: chunkHash2, ku_id: 'ku.physics.kinematics.instantaneous_velocity', evidence_pack_id: 'ep.physics.001' })
    }, registry);

    assert.strictEqual(registry.size, 2);

    // Step 2: Check reservation integrity
    const integrityCheck = checkKuReservationIntegrity([res1, res2]);
    assert.ok(integrityCheck.passed, `Integrity check failed: ${integrityCheck.findings.join('; ')}`);

    // Step 3: Subject boundary validation
    const boundaryCheck = checkSubjectBoundary([
        { id: res1.ku_id, title: 'Average Velocity', propositions: res1.canonical_semantic_identity.split(' || ') },
        { id: res2.ku_id, title: 'Instantaneous Velocity', propositions: ['Instantaneous velocity is the derivative of position with respect to time'] }
    ], 'Physics');
    assert.ok(boundaryCheck.passed, `Boundary check failed: ${boundaryCheck.findings.join('; ')}`);

    // Step 4: Artifact suitability
    const suitCheck = checkArtifactSuitability('Physics', { problem_count: 5, diagram_count: 2 });
    assert.ok(suitCheck.passed);
    assert.ok(suitCheck.toGenerate.includes('notes'));
});

// ═════════════════════════════════════════════════════════════
// FINAL REPORT
// ═════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60));
console.log(`MILESTONE 2 MASTER TEST SUITE: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(60));

if (failures.length > 0) {
    console.log('\nFailed tests:');
    for (const f of failures) {
        console.log(`  ✗ ${f.name}: ${f.error}`);
    }
}

if (failed > 0) {
    process.exit(1);
} else {
    console.log('\n✓ ALL MILESTONE 2 TESTS PASSED\n');
}
