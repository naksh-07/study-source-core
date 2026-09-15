/**
 * Master Verification Suite: Milestone 2 — Stream 1
 * Knowledge Reservation, Semantic Deduplication, and Subject Boundary Validation
 * (`test_milestone2_stream1.js`)
 */

const assert = require('assert');
const path = require('path');
const { computeSha256, createContentLineageRecord, ORIGIN_TIERS } = require('./content_lineage_record');

const {
    RESERVATION_STATES,
    TARGET_MODALITIES,
    generateDeterministicKuId,
    isValidKuId,
    generateCanonicalSemanticIdentity,
    computeSemanticDigest,
    getReservationRegistry,
    validateReservationIntegrity,
    reserveKnowledgeUnit,
    releaseReservation
} = require('./ku_reservation_engine');

const {
    RELATION_TYPES,
    computeJaccardSimilarity,
    computeContainment,
    classifyKuRelation,
    deduplicateKnowledgeUnits,
    enforceCrossArtifactDeduplication
} = require('./semantic_deduplication');

const {
    CANONICAL_SUBJECTS,
    DOMAIN_CENTROIDS,
    EXCLUSIVE_SIGNATURES,
    resolveCanonicalSubject,
    detectForeignIntruders,
    validateSubjectDomain,
    getDomainLexicon
} = require('./subject_boundary_validator');

let passedCount = 0;
let failedCount = 0;

async function runTest(suite, id, name, fn) {
    try {
        await fn();
        console.log(`  [${suite} / ${id}] ${name} ... ✅ PASS`);
        passedCount++;
    } catch (err) {
        console.error(`  [${suite} / ${id}] ${name} ... ❌ FAIL`);
        console.error(`     Error: ${err.message}`);
        failedCount++;
    }
}

async function runAllStream1Tests() {
    console.log('================================================================================');
    console.log('STUDYSOURCECORE — MILESTONE 2: STREAM 1 MASTER VERIFICATION SUITE');
    console.log('================================================================================\n');

    // =========================================================================
    // SECTION 1: KU RESERVATION ENGINE
    // =========================================================================
    console.log('--- SECTION 1: Knowledge Unit Reservation Engine ---');

    await runTest('RES-ENG', 'TEST-1.1', 'Deterministic KU ID generation: follows ku.<subject_slug>.<topic_slug>.<concept_slug>', () => {
        const id1 = generateDeterministicKuId('Math', 'LCM-HCF', 'Prime Factorization Theorem');
        assert.strictEqual(id1, 'ku.math.lcm-hcf.prime_factorization_theorem');
        assert.strictEqual(isValidKuId(id1), true);

        const id2 = generateDeterministicKuId('Political Science', 'Fundamental Rights', 'Right to Equality');
        assert.strictEqual(id2, 'ku.political_science.fundamental_rights.right_to_equality');
        assert.strictEqual(isValidKuId(id2), true);
    });

    await runTest('RES-ENG', 'TEST-1.2', 'Canonical Semantic Identity & Digest: normalizes propositions consistently', () => {
        const prop1 = '  **Static friction** prevents relative motion, up to {{c1::a maximum limit}}! ';
        const prop2 = 'Static friction prevents relative motion up to a maximum limit';

        const idStr1 = generateCanonicalSemanticIdentity(prop1);
        const idStr2 = generateCanonicalSemanticIdentity(prop2);

        assert.strictEqual(idStr1, idStr2);
        assert.strictEqual(computeSemanticDigest(idStr1), computeSemanticDigest(idStr2));
    });

    await runTest('RES-ENG', 'TEST-1.3', 'Successful KU Reservation: binds chunk hash, CLR, modalities, and RESERVED state', () => {
        const chunkHash = computeSha256('Test chunk content for physics');
        const kuId = generateDeterministicKuId('Physics', 'Kinematics', 'Acceleration');
        const clr = createContentLineageRecord({
            source_id: 'src.ncert.physics.ch3',
            source_coordinates: { section: '3.2 Acceleration' },
            source_chunk_hash: chunkHash,
            evidence_pack_id: 'evp.physics.kinematics.v1',
            ku_id: kuId,
            origin_tier: ORIGIN_TIERS.AUTHENTIC,
            renderer_target: 'Notes/Kinematics_Notes.md#acceleration'
        });

        const registry = getReservationRegistry();
        const reservation = reserveKnowledgeUnit({
            subject: 'Physics',
            topic: 'Kinematics',
            concept_name: 'Acceleration',
            propositions: ['Acceleration is the rate of change of velocity with respect to time.'],
            target_modalities: ['notes', 'basic', 'cloze'],
            source_chunk_hash: chunkHash,
            evidence_pack_id: 'evp.physics.kinematics.v1',
            clr
        }, registry);

        assert.strictEqual(reservation.ku_id, kuId);
        assert.strictEqual(reservation.state, RESERVATION_STATES.RESERVED);
        assert.deepStrictEqual(reservation.target_modalities, ['notes', 'basic', 'cloze']);
        assert.strictEqual(registry.size, 1);
        assert.strictEqual(registry.has(kuId), true);

        const val = validateReservationIntegrity(reservation);
        assert.strictEqual(val.isValid, true);
    });

    await runTest('RES-ENG', 'TEST-1.4', 'Reservation Collision Detection: duplicate KU ID throws RESERVATION_COLLISION_ERROR', () => {
        const chunkHash = computeSha256('Test chunk content');
        const kuId = generateDeterministicKuId('Math', 'LCM-HCF', 'GCD');
        const clr = createContentLineageRecord({
            source_id: 'src.math.ch1',
            source_coordinates: { section: '1.1 GCD' },
            source_chunk_hash: chunkHash,
            evidence_pack_id: 'evp.math.v1',
            ku_id: kuId
        });

        const registry = getReservationRegistry();
        reserveKnowledgeUnit({
            subject: 'Math',
            topic: 'LCM-HCF',
            concept_name: 'GCD',
            propositions: ['GCD is greatest common divisor'],
            target_modalities: ['basic'],
            source_chunk_hash: chunkHash,
            evidence_pack_id: 'evp.math.v1',
            clr
        }, registry);

        assert.throws(() => {
            reserveKnowledgeUnit({
                subject: 'Math',
                topic: 'LCM-HCF',
                concept_name: 'GCD',
                propositions: ['Duplicate attempt'],
                target_modalities: ['cloze'],
                source_chunk_hash: chunkHash,
                evidence_pack_id: 'evp.math.v1',
                clr
            }, registry);
        }, /RESERVATION_COLLISION_ERROR/);
    });

    await runTest('RES-ENG', 'TEST-1.5', 'Reservation Release: transitions state to SUPPRESSED with audit trail', () => {
        const chunkHash = computeSha256('Test chunk content for release');
        const kuId = generateDeterministicKuId('Chemistry', 'Equilibrium', 'Kc');
        const clr = createContentLineageRecord({
            source_id: 'src.chem.ch7',
            source_coordinates: { section: '7.1 Kc' },
            source_chunk_hash: chunkHash,
            evidence_pack_id: 'evp.chem.v1',
            ku_id: kuId
        });

        const registry = getReservationRegistry();
        reserveKnowledgeUnit({
            subject: 'Chemistry',
            topic: 'Equilibrium',
            concept_name: 'Kc',
            propositions: ['Kc is equilibrium constant in terms of concentration'],
            target_modalities: ['procedural'],
            source_chunk_hash: chunkHash,
            evidence_pack_id: 'evp.chem.v1',
            clr
        }, registry);

        const released = releaseReservation(kuId, registry, 'Pedagogically superseded by Kp');
        assert.strictEqual(released.state, RESERVATION_STATES.SUPPRESSED);
        assert.strictEqual(released.state_history.length, 2);
        assert.strictEqual(released.state_history[1].to_state, 'SUPPRESSED');
        assert.strictEqual(released.state_history[1].reason, 'Pedagogically superseded by Kp');
    });

    await runTest('RES-ENG', 'TEST-1.6', 'Fail-Closed Reservation Integrity: mismatched CLR chunk hash rejected', () => {
        const chunkHash = computeSha256('Original chunk');
        const differentHash = computeSha256('Different chunk');
        const kuId = generateDeterministicKuId('Physics', 'Optics', 'Snell');
        const clr = createContentLineageRecord({
            source_id: 'src.phys',
            source_coordinates: { section: 'Optics' },
            source_chunk_hash: differentHash, // Different!
            evidence_pack_id: 'evp.optics.v1',
            ku_id: kuId
        });

        assert.throws(() => {
            reserveKnowledgeUnit({
                subject: 'Physics',
                topic: 'Optics',
                concept_name: 'Snell',
                propositions: ['n1 sin i = n2 sin r'],
                target_modalities: ['notes'],
                source_chunk_hash: chunkHash, // Does not match CLR
                evidence_pack_id: 'evp.optics.v1',
                clr
            });
        }, /RESERVATION_INTEGRITY_ERROR/);
    });

    // =========================================================================
    // SECTION 2: SEMANTIC DEDUPLICATION ENGINE
    // =========================================================================
    console.log('\n--- SECTION 2: Semantic Deduplication Engine ---');

    await runTest('SEM-DEDUP', 'TEST-2.1', 'Pairwise Classification: identical propositions classified as SAME_KU', () => {
        const kuA = {
            id: 'ku.physics.laws.momentum_def',
            title: 'Momentum',
            propositions: ['Linear momentum is the product of mass and velocity of an object.'],
            definition: 'Product of mass and velocity.'
        };

        const kuB = {
            id: 'ku.physics.laws.momentum_def_variant',
            title: 'Linear Momentum Definition',
            propositions: ['Linear momentum equals the product of mass and velocity.'],
            definition: 'The product of the mass and velocity of a body.'
        };

        const rel = classifyKuRelation(kuA, kuB);
        assert.strictEqual(rel.relation, RELATION_TYPES.SAME_KU);
        assert(rel.similarityScore >= 0.80);
    });

    await runTest('SEM-DEDUP', 'TEST-2.2', 'Pairwise Classification: distinct topics classified as DIFFERENT_KU', () => {
        const kuA = {
            id: 'ku.physics.mechanics.kinematics',
            title: 'Kinematics',
            propositions: ['Kinematics describes motion without considering forces.']
        };

        const kuB = {
            id: 'ku.chemistry.acids.ph_scale',
            title: 'pH Scale',
            propositions: ['pH is negative logarithm of hydrogen ion concentration.']
        };

        const rel = classifyKuRelation(kuA, kuB);
        assert.strictEqual(rel.relation, RELATION_TYPES.DIFFERENT_KU);
    });

    await runTest('SEM-DEDUP', 'TEST-2.3', 'STEM Procedural Invariant (1 Pattern != 1 Question): procedural variants classified as RELATED_KU, NEVER SAME_KU', () => {
        const prob1 = {
            id: 'prob.pat_lcm_01.item_01',
            pattern_id: 'pat.math.lcm_hcf.coprime_pairing',
            ku_type: 'procedural',
            question_type: 'direct_compute',
            stem: 'Find the LCM of two coprime numbers 13 and 17.',
            answer: '221',
            options: ['221', '30', '4', '200'],
            propositions: ['For coprimes LCM is their product'],
            solution_dag: [{ step_id: '1', description: 'Multiply coprimes' }]
        };

        const prob2 = {
            id: 'prob.pat_lcm_01.item_02',
            pattern_id: 'pat.math.lcm_hcf.coprime_pairing',
            ku_type: 'procedural',
            question_type: 'reverse_problem',
            stem: 'Two coprime numbers have LCM 391. If one number is 17, find the other number.',
            answer: '23',
            options: ['23', '19', '21', '25'],
            propositions: ['For coprimes LCM is their product'],
            solution_dag: [{ step_id: '1', description: 'Divide LCM by given number' }]
        };

        const rel = classifyKuRelation(prob1, prob2);
        assert.strictEqual(rel.relation, RELATION_TYPES.RELATED_KU);
        assert(rel.reason.includes('STEM_PROCEDURAL_VARIANT_PRESERVED'));
    });

    await runTest('SEM-DEDUP', 'TEST-2.4', 'deduplicateKnowledgeUnits: merges duplicates, combines modalities, preserves procedural variants', () => {
        const chunkHash = computeSha256('Dummy chunk');
        const clrA = createContentLineageRecord({
            source_id: 'src.ncert',
            source_coordinates: { section: 'Forces' },
            source_chunk_hash: chunkHash,
            evidence_pack_id: 'evp.test',
            ku_id: 'ku.physics.force.newton_second_law',
            origin_tier: ORIGIN_TIERS.AUTHENTIC
        });

        const clrB = createContentLineageRecord({
            source_id: 'src.ncert',
            source_coordinates: { section: 'Forces' },
            source_chunk_hash: chunkHash,
            evidence_pack_id: 'evp.test',
            ku_id: 'ku.physics.force.second_law_duplicate',
            origin_tier: ORIGIN_TIERS.DERIVED
        });

        const kuA = {
            id: 'ku.physics.force.newton_second_law',
            title: "Newton's Second Law",
            propositions: ['Force equals mass times acceleration'],
            target_modalities: ['notes', 'basic'],
            source_chunk_hash: chunkHash,
            evidence_pack_id: 'evp.test',
            clr: clrA
        };

        const kuB = {
            id: 'ku.physics.force.second_law_duplicate',
            title: 'Second Law of Motion',
            propositions: ['Force is equal to mass multiplied by acceleration'],
            target_modalities: ['cloze', 'slideDeck'],
            source_chunk_hash: chunkHash,
            evidence_pack_id: 'evp.test',
            clr: clrB
        };

        const proceduralItem = {
            id: 'prob.force.item_01',
            pattern_id: 'pat.force.f_equals_ma',
            ku_type: 'procedural',
            question_type: 'numerical',
            stem: 'A mass of 5kg accelerates at 2 m/s^2. Calculate force.',
            answer: '10 N',
            target_modalities: ['procedural'],
            source_chunk_hash: chunkHash,
            evidence_pack_id: 'evp.test',
            clr: clrA
        };

        const res = deduplicateKnowledgeUnits([kuA, kuB, proceduralItem]);

        assert.strictEqual(res.duplicateCount, 1);
        assert.strictEqual(res.uniqueKus.length, 2); // 1 merged conceptual KU + 1 procedural item

        const merged = res.uniqueKus.find(k => k.id === 'ku.physics.force.newton_second_law');
        assert(merged);
        assert(merged.target_modalities.includes('notes'));
        assert(merged.target_modalities.includes('basic'));
        assert(merged.target_modalities.includes('cloze'));
        assert(merged.target_modalities.includes('slideDeck'));
        // Authentic tier preserved
        assert.strictEqual(merged.clr.origin_tier, ORIGIN_TIERS.AUTHENTIC);
    });

    await runTest('SEM-DEDUP', 'TEST-2.5', 'enforceCrossArtifactDeduplication: prevents redundant Basic and Cloze for identical factual proposition', () => {
        const chunkHash = computeSha256('Dummy chunk');
        const clr = createContentLineageRecord({
            source_id: 'src.test',
            source_coordinates: { section: 'Formulas' },
            source_chunk_hash: chunkHash,
            evidence_pack_id: 'evp.test',
            ku_id: 'ku.physics.momentum.formula'
        });

        const kuWithDual = {
            id: 'ku.physics.momentum.formula',
            title: 'Momentum Formula',
            propositions: ['Momentum = mass * velocity'],
            formulas: ['p = m * v'],
            target_modalities: ['notes', 'basic', 'cloze'], // Dual Basic + Cloze violation!
            clr
        };

        const kuWithJustification = {
            id: 'ku.physics.energy.formula',
            title: 'Kinetic Energy Formula',
            propositions: ['KE = 0.5 * m * v^2'],
            formulas: ['KE = \\frac{1}{2}mv^2'],
            target_modalities: ['basic', 'cloze'],
            metadata: { pedagogical_justification: 'Explicit contrast with Work-Energy theorem' },
            clr
        };

        const res = enforceCrossArtifactDeduplication([kuWithDual, kuWithJustification]);

        assert.strictEqual(res.violationsCount, 1);
        assert.strictEqual(res.conflictsResolved.length, 1);

        const fixed = res.compliantKus.find(k => k.id === 'ku.physics.momentum.formula');
        // Because it has formula / relation, Cloze is preserved and Basic is suppressed!
        assert.strictEqual(fixed.target_modalities.includes('cloze'), true);
        assert.strictEqual(fixed.target_modalities.includes('basic'), false);

        const justified = res.compliantKus.find(k => k.id === 'ku.physics.energy.formula');
        // Justified item retains both
        assert.strictEqual(justified.target_modalities.includes('cloze'), true);
        assert.strictEqual(justified.target_modalities.includes('basic'), true);
    });

    // =========================================================================
    // SECTION 3: SUBJECT BOUNDARY VALIDATOR
    // =========================================================================
    console.log('\n--- SECTION 3: Subject Boundary Validator ---');

    await runTest('SUB-BOUND', 'TEST-3.1', 'All 9 Canonical Subjects: correctly resolved and centroids retrieved', () => {
        const expected9 = ['Math', 'Physics', 'Chemistry', 'Reasoning', 'Geography', 'Biology', 'History', 'Map', 'Political Science'];
        for (const subj of expected9) {
            const canonical = resolveCanonicalSubject(subj);
            assert.strictEqual(canonical, subj);
            const lex = getDomainLexicon(subj);
            assert(lex.centroids.length >= 5, `Expected centroids for ${subj}`);
            assert(lex.signatures.length >= 5, `Expected signatures for ${subj}`);
        }

        // Check aliases
        assert.strictEqual(resolveCanonicalSubject('polity'), 'Political Science');
        assert.strictEqual(resolveCanonicalSubject('bio'), 'Biology');
        assert.strictEqual(resolveCanonicalSubject('maths'), 'Math');
    });

    await runTest('SUB-BOUND', 'TEST-3.2', 'Valid In-Domain Chapter: passes boundary check with zero violations', () => {
        const mathKus = [
            {
                id: 'ku.math.lcm.coprime',
                title: 'Coprime Numbers',
                definition: 'Two numbers are coprime if their greatest common divisor is 1.',
                propositions: ['If HCF(a, b) = 1, then LCM(a, b) = a * b.']
            },
            {
                id: 'ku.math.lcm.prime_factor',
                title: 'Prime Factorization',
                definition: 'Expressing a number as a product of prime numbers.',
                propositions: ['Every composite number can be uniquely factored into primes.']
            }
        ];

        const res = validateSubjectDomain(mathKus, 'Math');
        assert.strictEqual(res.isValid, true);
        assert.strictEqual(res.violationsCount, 0);
    });

    await runTest('SUB-BOUND', 'TEST-3.3', 'Fail-Closed Foreign Intrusion: detects Physics intrusion in Math LCM-HCF chapter', () => {
        const corruptedMathKus = [
            {
                id: 'ku.math.lcm.coprime',
                title: 'Coprime Numbers',
                definition: 'Two numbers are coprime if their greatest common divisor is 1.'
            },
            {
                id: 'ku.math.lcm.foreign_physics',
                title: 'Force Calculation',
                definition: "Newton's second law of motion states that net force equals rate of change of momentum.", // FOREIGN!
                propositions: ['Apply free body diagram to find acceleration']
            }
        ];

        const res = validateSubjectDomain(corruptedMathKus, 'Math');
        assert.strictEqual(res.isValid, false);
        assert(res.violationsCount >= 1);
        assert(res.violations.some(v => v.foreign_domain === 'Physics'));
        assert(res.summary.includes('FAIL_CLOSED'));
    });

    await runTest('SUB-BOUND', 'TEST-3.4', 'Fail-Closed Foreign Intrusion: detects Biology and History intrusions in Chemistry chapter', () => {
        const corruptedChemKus = [
            {
                id: 'ku.chem.eq.kc',
                title: 'Equilibrium Constant',
                definition: 'Ratio of product concentrations to reactant concentrations raised to stoichiometric coefficients.'
            },
            {
                id: 'ku.chem.eq.biological_pollutant',
                title: 'Cellular Organelle',
                definition: 'Mitochondria is the powerhouse of the cell performing oxidative phosphorylation.' // FOREIGN BIOLOGY!
            },
            {
                id: 'ku.chem.eq.historical_event',
                title: 'Colonial History',
                definition: 'The battle of plassey took place in 1757.' // FOREIGN HISTORY!
            }
        ];

        const res = validateSubjectDomain(corruptedChemKus, 'Chemistry');
        assert.strictEqual(res.isValid, false);
        assert.strictEqual(res.violationsCount, 2);
        assert(res.violations.some(v => v.foreign_domain === 'Biology'));
        assert(res.violations.some(v => v.foreign_domain === 'History'));
    });

    await runTest('SUB-BOUND', 'TEST-3.5', 'Throw on Error Mode: throws SUBJECT_BOUNDARY_VIOLATION when throwOnError is true', () => {
        const badKus = [
            {
                id: 'ku.reasoning.syllogism.error',
                title: 'Writ of Habeas Corpus', // POLITICAL SCIENCE FOREIGN INTRUDER IN REASONING!
                definition: 'A writ of habeas corpus demands production of an imprisoned person.'
            }
        ];

        assert.throws(() => {
            validateSubjectDomain(badKus, 'Reasoning', { throwOnError: true });
        }, /SUBJECT_BOUNDARY_VIOLATION/);
    });

    await runTest('SUB-BOUND', 'TEST-3.6', 'Geography & Map Mutual Legitimate Overlap: geographical coordinates not flagged as mutual violations', () => {
        const mapKus = [
            {
                id: 'ku.map.straits.palk_strait',
                title: 'Palk Strait',
                definition: 'A strait between the Tamil Nadu state of India and the Jaffna District of Sri Lanka.'
            }
        ];

        const res = validateSubjectDomain(mapKus, 'Geography');
        assert.strictEqual(res.isValid, true);
    });

    console.log('\n================================================================================');
    console.log(`STREAM 1 TEST SUITE RESULTS: ${passedCount} Passed, ${failedCount} Failed (Total: ${passedCount + failedCount})`);
    console.log('================================================================================');

    if (failedCount > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    runAllStream1Tests().catch(err => {
        console.error('Fatal error in Stream 1 test suite:', err);
        process.exit(1);
    });
}

module.exports = { runAllStream1Tests };
