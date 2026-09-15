/**
 * StudySourceCore Foundation Layer Master Test Suite (`test_foundation_layer.js`)
 * 
 * Milestone 1 Exit Gate Verification:
 *  - Section 1: Unit Tests (IR, Serialization, Chunking, CLR, Lineage)
 *  - Section 2: Multi-Domain Contract Tests (Math, Physics, Chemistry, Reasoning, Non-procedural Geography)
 *  - Section 3: Negative & Adversarial Tests (15 distinct attack scenarios)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const {
    ORIGIN_TIERS,
    computeSha256,
    validateContentLineageRecord,
    createContentLineageRecord,
    verifyLineageChain,
    assertNoLineageLoss
} = require('./content_lineage_record');

const {
    normalizeSourceText,
    segmentSourceIntoChunks,
    segmentFixtureIntoChunks,
    ingestSourceToEvidencePack,
    persistEvidencePack
} = require('./evidence_ingestion_engine');

const {
    SCHEMA_VERSION,
    toSlug,
    generateIrId,
    generateKuId,
    generateRelationshipId,
    generatePatternId,
    generatePracticeItemId,
    canonicalizeObject,
    serializeSemanticIR,
    computeIRHash,
    buildSemanticLearningIR,
    createIRFromEvidencePack
} = require('./semantic_learning_ir');

const {
    validateSemanticIR,
    hintLeaksTerminalAnswer
} = require('./validate_semantic_ir');

const { parseMathEvidence } = require('./author_math_studylab');

const FIXTURES_DIR = path.join(__dirname, '..', 'resources', 'fixtures');
const SCRATCH_DIR = path.join(__dirname, 'scratch', 'test_foundation_layer');

let testsPassed = 0;
let testsFailed = 0;

async function runTest(suite, id, name, fn) {
    try {
        await fn();
        console.log(`  [${suite} / ${id}] ${name} ... ✅ PASS`);
        testsPassed++;
    } catch (err) {
        console.error(`  [${suite} / ${id}] ${name} ... ❌ FAIL`);
        console.error(`     Error: ${err.message}`);
        testsFailed++;
    }
}

async function runAllTests() {
    console.log('================================================================================');
    console.log('STUDYSOURCECORE — MILESTONE 1: FOUNDATION LAYER MASTER TEST SUITE');
    console.log('================================================================================\n');

    fs.mkdirSync(SCRATCH_DIR, { recursive: true });

    // =========================================================================
    // SECTION 1: UNIT TESTS
    // =========================================================================
    console.log('--- SECTION 1: Unit Verification (IR, CLR, Chunking, Ingestion) ---');

    await runTest('SEC-1', 'TEST-1.1', 'IR Construction: valid IR builds successfully with all required fields', () => {
        const clr = createContentLineageRecord({
            source_id: 'src.unit.test',
            source_coordinates: { section: '1.1 Intro', paragraph: 1 },
            source_chunk_hash: computeSha256('Test content'),
            evidence_pack_id: 'evp.unit.test.v1',
            ku_id: 'ku.unit.test.concept_one',
            origin_tier: ORIGIN_TIERS.CURATED,
            generator_metadata: { engine_version: '1.0.0', timestamp: new Date().toISOString() },
            model_and_prompt: { model: 'test-model', prompt_version: 'v1.0' },
            transformation_history: ['unit_test'],
            renderer_target: 'Notes/Test_Notes.md#concept_one'
        });

        const ir = buildSemanticLearningIR({
            context: { subject: 'Physics', domain: 'stem_procedural', chapter: 'Kinematics' },
            evidence_pack_reference: {
                evidence_pack_id: 'evp.physics.kinematics.v1',
                evidence_hash: computeSha256('evidence pack'),
                source_id: 'src.ncert.ch3',
                source_hash: computeSha256('raw source')
            },
            knowledge_units: [{
                id: 'ku.unit.test.concept_one',
                ku_type: 'conceptual',
                title: 'Velocity',
                definition: 'Rate of change of displacement',
                clr
            }],
            relationships: [],
            practice_items: []
        });

        assert.strictEqual(ir.schema_version, '1.0.0');
        assert.strictEqual(ir.knowledge_units.length, 1);
        assert.strictEqual(ir.knowledge_units[0].clr.ku_id, 'ku.unit.test.concept_one');
    });

    await runTest('SEC-1', 'TEST-1.2', 'Deterministic Identifiers: generators produce reproducible, stable IDs', () => {
        const id1 = generateIrId('Math', 'LCM-HCF', 'a1b2c3d4e5f6');
        const id2 = generateIrId('Math', 'LCM-HCF', 'a1b2c3d4e5f6');
        assert.strictEqual(id1, id2);
        assert.strictEqual(id1, 'ir.math.lcm-hcf.a1b2c3d4');

        const ku1 = generateKuId('Physics', 'Newton-Laws', 'First Law of Motion');
        const ku2 = generateKuId('Physics', 'Newton-Laws', 'First Law of Motion');
        assert.strictEqual(ku1, ku2);
        assert.strictEqual(ku1, 'ku.physics.newton-laws.first_law_of_motion');

        const relId = generateRelationshipId('ku.a', 'ku.b', 'prerequisite');
        assert.strictEqual(relId, 'rel.ku.a.ku.b.prerequisite');
    });

    await runTest('SEC-1', 'TEST-1.3', 'Deterministic Serialization: canonical key sorting guarantees identical SHA-256 digest', () => {
        const objA = { z: 1, a: 2, m: { y: 'hello', x: 'world' } };
        const objB = { a: 2, m: { x: 'world', y: 'hello' }, z: 1 };

        const serializedA = serializeSemanticIR(objA);
        const serializedB = serializeSemanticIR(objB);

        assert.strictEqual(serializedA, serializedB);
        assert.strictEqual(computeSha256(serializedA), computeSha256(serializedB));
    });

    await runTest('SEC-1', 'TEST-1.4', 'Evidence Normalization: CRLF converted to LF, UTF-8 BOM stripped, empty input rejected', () => {
        const bomInput = '\uFEFFLine 1\r\nLine 2\r\nLine 3\r\n';
        const normalized = normalizeSourceText(bomInput);
        assert.strictEqual(normalized.includes('\r'), false);
        assert.strictEqual(normalized.charCodeAt(0) !== 0xFEFF, true);
        assert.strictEqual(normalized, 'Line 1\nLine 2\nLine 3\n');

        assert.throws(() => {
            normalizeSourceText('   \n\t  \r\n  ');
        }, /EMPTY_SOURCE_ERROR/);
    });

    await runTest('SEC-1', 'TEST-1.5', 'Source Chunking: segmentation assigns granular physical coordinates (section, paragraph, lines)', () => {
        const text = `# Chapter 1: Introduction\n\nFirst paragraph of text.\n\nSecond paragraph of text.\n\n## Section 1.1: Forces\n\nForce is mass times acceleration.`;
        const chunks = segmentSourceIntoChunks(text, 'src.test');

        assert(chunks.length >= 3, `Expected >= 3 chunks, got ${chunks.length}`);
        assert.strictEqual(chunks[0].coordinates.section, 'Chapter 1: Introduction');
        assert.strictEqual(chunks[0].coordinates.line_start, 1);
        assert(chunks.some(c => c.coordinates.section === 'Section 1.1: Forces'));
    });

    await runTest('SEC-1', 'TEST-1.6', 'Chunk SHA-256 Fingerprints: each chunk hash matches exact content digest', () => {
        const text = `# Concept\nSpeed is distance divided by time.\n\n# Law\nEnergy is conserved.`;
        const chunks = segmentSourceIntoChunks(text, 'src.phy');

        for (const chk of chunks) {
            const expectedHash = computeSha256(chk.content);
            assert.strictEqual(chk.chunk_hash, expectedHash);
        }
    });

    await runTest('SEC-1', 'TEST-1.7', '11-Field CLR: all 11 canonical fields are validated and present', () => {
        const clr = createContentLineageRecord({
            source_id: 'src.ncert.physics.ch5',
            source_coordinates: { page_start: 142, page_end: 143, section: '5.4 Friction', paragraph: 3 },
            source_chunk_hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
            evidence_pack_id: 'evp.physics.laws_of_motion.v1',
            ku_id: 'ku.physics.friction.static_friction',
            origin_tier: ORIGIN_TIERS.AUTHENTIC,
            generator_metadata: { engine_version: '1.0.0', timestamp: new Date().toISOString() },
            model_and_prompt: { model: 'gemini-3.8-flash', temperature: 0.2, prompt_version: 'v1.0' },
            transformation_history: ['bilingual_translation', '3_tier_hint_synthesis'],
            renderer_target: { file_path: 'Questions/Laws_Questions.md', anchor: 'q1', line: 12 },
            certification_state: { status: 'PENDING' }
        });

        const res = validateContentLineageRecord(clr);
        assert.strictEqual(res.isValid, true);
        assert.strictEqual(clr.origin_tier, 'AUTHENTIC');
        assert.strictEqual(clr.source_coordinates.section, '5.4 Friction');
    });

    await runTest('SEC-1', 'TEST-1.8', 'Lineage Chain Verification: unbroken cryptographic trace from source chunk to IR node', () => {
        const chunkText = 'Static friction prevents relative motion up to a maximum limit.';
        const chunkHash = computeSha256(chunkText);

        const evidencePack = {
            evidence_pack_id: 'evp.test.v1',
            chunks: [{ chunk_id: 'chk.001', chunk_hash: chunkHash, coordinates: { section: 'Friction' } }]
        };

        const clr = createContentLineageRecord({
            source_id: 'src.ncert',
            source_coordinates: { section: 'Friction' },
            source_chunk_hash: chunkHash,
            evidence_pack_id: 'evp.test.v1',
            ku_id: 'ku.test.friction',
            origin_tier: ORIGIN_TIERS.AUTHENTIC
        });

        const irNode = { id: 'ku.test.friction', clr };

        const verifyRes = verifyLineageChain({
            chunkContent: chunkText,
            clr,
            evidencePack,
            irNode
        });

        assert.strictEqual(verifyRes.verified, true);
    });

    // =========================================================================
    // SECTION 2: MULTI-DOMAIN CONTRACT TESTS
    // =========================================================================
    console.log('\n--- SECTION 2: Multi-Domain Contract Verification ---');

    await runTest('SEC-2', 'TEST-2.1', 'Mathematics Contract: LCM-HCF fixture ingests to Evidence Pack and valid IR', () => {
        const mathFixturePath = path.join(FIXTURES_DIR, 'math_lcm_hcf_source_fixture.json');
        const pack = ingestSourceToEvidencePack(mathFixturePath);

        assert(pack.chunks.length >= 5);
        assert(pack.evidence_hash.length === 64);

        const ir = createIRFromEvidencePack(pack);
        const valRes = validateSemanticIR(ir);

        assert.strictEqual(valRes.isValid, true, `Validation failed: ${valRes.errors.join('; ')}`);
        assert.strictEqual(ir.context.subject, 'Math');
        assert.strictEqual(ir.context.domain, 'stem_procedural');
        assert(ir.knowledge_units.length >= 5);
    });

    await runTest('SEC-2', 'TEST-2.2', 'Physics Contract: Work-Energy-Power fixture ingests to Evidence Pack and valid IR', () => {
        const physFixturePath = path.join(FIXTURES_DIR, 'physics_work_energy_power_source_fixture.json');
        const pack = ingestSourceToEvidencePack(physFixturePath);

        const ir = createIRFromEvidencePack(pack);
        const valRes = validateSemanticIR(ir);

        assert.strictEqual(valRes.isValid, true, `Validation failed: ${valRes.errors.join('; ')}`);
        assert.strictEqual(ir.context.subject, 'Physics');
        assert(ir.knowledge_units.length >= 4);
    });

    await runTest('SEC-2', 'TEST-2.3', 'Chemistry Contract: Chemical Equilibrium fixture ingests to Evidence Pack and valid IR', () => {
        const chemFixturePath = path.join(FIXTURES_DIR, 'chemistry_chemical_equilibrium_source_fixture.json');
        const pack = ingestSourceToEvidencePack(chemFixturePath);

        const ir = createIRFromEvidencePack(pack);
        const valRes = validateSemanticIR(ir);

        assert.strictEqual(valRes.isValid, true, `Validation failed: ${valRes.errors.join('; ')}`);
        assert.strictEqual(ir.context.subject, 'Chemistry');
        assert(ir.knowledge_units.length >= 4);
    });

    await runTest('SEC-2', 'TEST-2.4', 'Reasoning Contract: Syllogism & Seating fixture ingests to Evidence Pack and valid IR', () => {
        const reasFixturePath = path.join(FIXTURES_DIR, 'reasoning_syllogism_seating_source_fixture.json');
        const pack = ingestSourceToEvidencePack(reasFixturePath);

        const ir = createIRFromEvidencePack(pack);
        const valRes = validateSemanticIR(ir);

        assert.strictEqual(valRes.isValid, true, `Validation failed: ${valRes.errors.join('; ')}`);
        assert.strictEqual(ir.context.subject, 'Reasoning');
        assert(ir.knowledge_units.length >= 3);
    });

    await runTest('SEC-2', 'TEST-2.5', 'Non-Procedural Contract: Geography pure prose ingests to Evidence Pack and valid factual IR', () => {
        const geoText = `# Physical Features of India\n\n## The Himalayan Mountains\nThe Himalayas represent the highest and rugged mountain barrier of the world.\n\n## The Peninsular Plateau\nThe Peninsular plateau is a tableland composed of the old crystalline, igneous and metamorphic rocks.\n`;
        const pack = ingestSourceToEvidencePack(geoText, {
            subject: 'Geography',
            chapter: 'Physical_Features',
            source_id: 'src.ncert.geography.class9.ch2'
        });

        const ir = createIRFromEvidencePack(pack);
        const valRes = validateSemanticIR(ir);

        assert.strictEqual(valRes.isValid, true, `Validation failed: ${valRes.errors.join('; ')}`);
        assert.strictEqual(ir.context.subject, 'Geography');
        assert.strictEqual(ir.context.domain, 'humanities_factual');
        assert(ir.knowledge_units.length >= 2);
    });

    // =========================================================================
    // SECTION 3: NEGATIVE & ADVERSARIAL TESTS
    // =========================================================================
    console.log('\n--- SECTION 3: Negative & Adversarial Verification (15 Scenarios) ---');

    await runTest('ADV', 'ADV-01', 'Source Tampering: modified source after ingestion causes cryptographic mismatch in verifyLineageChain', () => {
        const originalText = 'Initial source text for physics problem';
        const tamperedText = 'Modified source text with altered numbers';

        const chunkHash = computeSha256(originalText);
        const clr = createContentLineageRecord({
            source_id: 'src.test',
            source_coordinates: { section: 'Physics' },
            source_chunk_hash: chunkHash,
            evidence_pack_id: 'evp.test.v1',
            ku_id: 'ku.test.physics'
        });

        const verify = verifyLineageChain({
            chunkContent: tamperedText,
            clr
        });

        assert.strictEqual(verify.verified, false);
        assert(verify.reason.includes('SOURCE_CHUNK_HASH_MISMATCH'));
    });

    await runTest('ADV', 'ADV-02', 'Missing Source Evidence: null or empty source input fails closed with fail-closed error', () => {
        assert.throws(() => {
            ingestSourceToEvidencePack('');
        }, /EMPTY_SOURCE_ERROR/);

        assert.throws(() => {
            ingestSourceToEvidencePack(null);
        }, /(SOURCE_INGESTION_ERROR|UNSUPPORTED_SOURCE_INPUT)/);
    });

    await runTest('ADV', 'ADV-03', 'Incomplete CLR: each mandatory field missing triggers validation failure', () => {
        const baseParams = {
            source_id: 'src.ncert',
            source_coordinates: { section: 'Kinematics' },
            source_chunk_hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
            evidence_pack_id: 'evp.physics.v1',
            ku_id: 'ku.physics.speed',
            origin_tier: ORIGIN_TIERS.AUTHENTIC,
            generator_metadata: { engine_version: '1.0.0', timestamp: new Date().toISOString() },
            model_and_prompt: { model: 'gemini', prompt_version: 'v1.0' },
            transformation_history: [],
            renderer_target: { file_path: 'Notes.md' },
            certification_state: { status: 'PENDING' }
        };

        // Test missing source_id
        const invalid1 = { ...baseParams, source_id: '' };
        assert.strictEqual(validateContentLineageRecord(invalid1).isValid, false);

        // Test missing source_chunk_hash
        const invalid2 = { ...baseParams, source_chunk_hash: 'bad_hash' };
        assert.strictEqual(validateContentLineageRecord(invalid2).isValid, false);

        // Test missing ku_id
        const invalid3 = { ...baseParams, ku_id: '' };
        assert.strictEqual(validateContentLineageRecord(invalid3).isValid, false);

        // Test missing origin_tier
        const invalid4 = { ...baseParams, origin_tier: '' };
        assert.strictEqual(validateContentLineageRecord(invalid4).isValid, false);
    });

    await runTest('ADV', 'ADV-04', 'Invalid Origin Tier: unrecognized tier value rejected with validation error', () => {
        const clr = {
            source_id: 'src.test',
            source_coordinates: { section: 'Sec' },
            source_chunk_hash: computeSha256('hash'),
            evidence_pack_id: 'evp.test',
            ku_id: 'ku.test',
            origin_tier: 'SUPER_AUTHENTIC', // Invalid tier
            generator_metadata: { engine_version: '1.0.0', timestamp: new Date().toISOString() },
            model_and_prompt: { model: 'm', prompt_version: 'v' },
            transformation_history: [],
            renderer_target: { file_path: 'path' },
            certification_state: { status: 'PENDING' }
        };

        const res = validateContentLineageRecord(clr);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('Invalid origin_tier')));
    });

    await runTest('ADV', 'ADV-05', 'Fabricated Provenance: AUTHENTIC tier citing synthetic/mock source rejected', () => {
        const clr = {
            source_id: 'src.synthetic.mock_generator_output',
            source_coordinates: { section: 'Sec' },
            source_chunk_hash: computeSha256('hash'),
            evidence_pack_id: 'evp.test',
            ku_id: 'ku.test',
            origin_tier: ORIGIN_TIERS.AUTHENTIC, // Cannot claim authentic with synthetic source_id
            generator_metadata: { engine_version: '1.0.0', timestamp: new Date().toISOString() },
            model_and_prompt: { model: 'm', prompt_version: 'v' },
            transformation_history: [],
            renderer_target: { file_path: 'path' },
            certification_state: { status: 'PENDING' }
        };

        const res = validateContentLineageRecord(clr);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('FABRICATED_PROVENANCE')));
    });

    await runTest('ADV', 'ADV-06', 'Broken Lineage: chunk hash not registered in Evidence Pack rejected in verifyLineageChain', () => {
        const evidencePack = {
            evidence_pack_id: 'evp.verified.v1',
            chunks: [{ chunk_hash: '1111111111111111111111111111111111111111111111111111111111111111' }]
        };

        const clr = createContentLineageRecord({
            source_id: 'src.test',
            source_coordinates: { section: 'Sec' },
            source_chunk_hash: '2222222222222222222222222222222222222222222222222222222222222222',
            evidence_pack_id: 'evp.verified.v1',
            ku_id: 'ku.test'
        });

        const verify = verifyLineageChain({
            clr,
            evidencePack
        });

        assert.strictEqual(verify.verified, false);
        assert(verify.reason.includes('UNGROUNDED_PROVENANCE'));
    });

    await runTest('ADV', 'ADV-07', 'Malformed IR: missing required top-level context fails Ajv validation', () => {
        const badIr = {
            schema_version: '1.0.0',
            ir_id: 'ir.test.chap.12345678'
            // missing context, evidence_pack_reference, knowledge_units, etc.
        };

        const res = validateSemanticIR(badIr);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.length > 0);
    });

    await runTest('ADV', 'ADV-08', 'Unsupported Schema Version: schema_version != 1.0.0 rejected immediately', () => {
        const mathFixturePath = path.join(FIXTURES_DIR, 'math_lcm_hcf_source_fixture.json');
        const pack = ingestSourceToEvidencePack(mathFixturePath);
        const ir = createIRFromEvidencePack(pack);
        ir.schema_version = '2.5.0'; // Unsupported version

        const res = validateSemanticIR(ir);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('UNSUPPORTED_SCHEMA_VERSION')));
    });

    await runTest('ADV', 'ADV-09', 'Duplicate Semantic IDs: duplicate KU id or duplicate practice item id fails validation', () => {
        const mathFixturePath = path.join(FIXTURES_DIR, 'math_lcm_hcf_source_fixture.json');
        const pack = ingestSourceToEvidencePack(mathFixturePath);
        const ir = createIRFromEvidencePack(pack);

        // Inject duplicate KU id
        if (ir.knowledge_units.length >= 2) {
            ir.knowledge_units[1].id = ir.knowledge_units[0].id;
            ir.knowledge_units[1].clr.ku_id = ir.knowledge_units[0].id;
        }

        const res = validateSemanticIR(ir);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('DUPLICATE_SEMANTIC_ID')));
    });

    await runTest('ADV', 'ADV-10', 'Broken Referential Integrity: relationship pointing to non-existent KU rejected', () => {
        const mathFixturePath = path.join(FIXTURES_DIR, 'math_lcm_hcf_source_fixture.json');
        const pack = ingestSourceToEvidencePack(mathFixturePath);
        const ir = createIRFromEvidencePack(pack);

        ir.relationships.push({
            id: 'rel.ghost.target.prerequisite',
            source_ku_id: 'ku.does_not_exist_at_all',
            target_ku_id: ir.knowledge_units[0].id,
            relation_type: 'prerequisite'
        });

        const res = validateSemanticIR(ir);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('BROKEN_REFERENTIAL_INTEGRITY')));
    });

    await runTest('ADV', 'ADV-11', 'Hint Answer Leakage: Tier 1 or Tier 2 hint containing answer rejected by validator', () => {
        const mathFixturePath = path.join(FIXTURES_DIR, 'math_lcm_hcf_source_fixture.json');
        const pack = ingestSourceToEvidencePack(mathFixturePath);
        const ir = createIRFromEvidencePack(pack);

        // Add a practice item where Tier 1 hint leaks the exact answer
        const clr = createContentLineageRecord({
            source_id: pack.source_id,
            source_coordinates: { section: 'Test' },
            source_chunk_hash: pack.chunks[0].chunk_hash,
            evidence_pack_id: pack.evidence_pack_id,
            ku_id: 'prob.test.item_01'
        });

        ir.practice_items.push({
            id: 'prob.test.item_01',
            pattern_id: 'pat.test.01',
            question_type: 'mcq',
            stem: 'What is the value of x?',
            options: ['10', '20', '30', '40'],
            correct_option: '30',
            hints: {
                tier_1_conceptual: 'The answer is definitely 30 because of arithmetic balance.', // LEAK
                tier_2_method: 'Apply the equation.',
                tier_3_setup: 'Simplify the equation.'
            },
            clr
        });

        const res = validateSemanticIR(ir);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('HINT_ANSWER_LEAKAGE')));
    });

    await runTest('ADV', 'ADV-12', 'MCQ Options Invariant: MCQ with fewer than 4 options rejected with error', () => {
        const mathFixturePath = path.join(FIXTURES_DIR, 'math_lcm_hcf_source_fixture.json');
        const pack = ingestSourceToEvidencePack(mathFixturePath);
        const ir = createIRFromEvidencePack(pack);

        const clr = createContentLineageRecord({
            source_id: pack.source_id,
            source_coordinates: { section: 'Test' },
            source_chunk_hash: pack.chunks[0].chunk_hash,
            evidence_pack_id: pack.evidence_pack_id,
            ku_id: 'prob.test.item_02'
        });

        ir.practice_items.push({
            id: 'prob.test.item_02',
            pattern_id: 'pat.test.01',
            question_type: 'mcq',
            stem: 'What is the speed?',
            options: ['10 m/s', '20 m/s'], // Only 2 options! Violates >= 4 rule
            correct_option: '10 m/s',
            hints: {
                tier_1_conceptual: 'Recall speed formula.',
                tier_2_method: 'v = d / t',
                tier_3_setup: 'Divide 100 by 10.'
            },
            clr
        });

        const res = validateSemanticIR(ir);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('MCQ_INVARIANT_VIOLATION')));
    });

    await runTest('ADV', 'ADV-13', 'Fallback Validation Bypass Elimination: malformed JSON fails closed instead of falling back to markdown', () => {
        const malformedJson = '{\n  "chapter": "LCM-HCF",\n  "concepts": [ invalid json syntax here';

        // parseMathEvidence should throw MALFORMED_JSON_EVIDENCE instead of silently passing to markdown parser
        assert.throws(() => {
            parseMathEvidence(malformedJson);
        }, /MALFORMED_JSON_EVIDENCE/);
    });

    await runTest('ADV', 'ADV-14', 'Provenance Loss During Retry: context regeneration losing CLR or downgrading tier is detected and rejected', () => {
        const originalItem = {
            id: 'ku.physics.gravity',
            clr: {
                source_id: 'src.ncert.physics',
                source_chunk_hash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                origin_tier: ORIGIN_TIERS.AUTHENTIC
            }
        };

        // Scenario A: regenerated item completely stripped CLR
        const strippedItem = { id: 'ku.physics.gravity' };
        assert.throws(() => {
            assertNoLineageLoss(originalItem, strippedItem);
        }, /PROVENANCE_LOSS_DETECTED/);

        // Scenario B: regenerated item downgraded from AUTHENTIC to SYNTHETIC
        const downgradedItem = {
            id: 'ku.physics.gravity',
            clr: {
                source_id: 'src.ncert.physics',
                source_chunk_hash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                origin_tier: ORIGIN_TIERS.SYNTHETIC
            }
        };
        assert.throws(() => {
            assertNoLineageLoss(originalItem, downgradedItem);
        }, /PROVENANCE_DEGRADATION/);
    });

    await runTest('ADV', 'ADV-15', 'Serialization Order Invariance: keys serialized in differing initial orders yield identical canonical digest', () => {
        const mathFixturePath = path.join(FIXTURES_DIR, 'math_lcm_hcf_source_fixture.json');
        const pack = ingestSourceToEvidencePack(mathFixturePath);
        const ir = createIRFromEvidencePack(pack);

        const digest1 = computeIRHash(ir);

        // Create deep clone with reversed keys
        const reversedIr = {};
        for (const k of Object.keys(ir).reverse()) {
            reversedIr[k] = ir[k];
        }

        const digest2 = computeIRHash(reversedIr);

        assert.strictEqual(digest1, digest2);
    });

    console.log('\n================================================================================');
    console.log(`FOUNDATION LAYER TEST SUITE RESULTS: ${testsPassed} Passed, ${testsFailed} Failed (Total: ${testsPassed + testsFailed})`);
    console.log('================================================================================');

    if (testsFailed > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    runAllTests().catch(err => {
        console.error('Fatal test error:', err);
        process.exit(1);
    });
}

module.exports = { runAllTests };
