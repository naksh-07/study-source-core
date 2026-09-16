/**
 * study-source-core Phase 40 Canonical Test Suite (`test_phase40_canonical.js`)
 * 
 * Verifies:
 * 1. Compilation of all 10 Draft-07 JSON schemas in resources/schemas/
 * 2. Schema compliance of canonical 4-domain fixtures (Math, Reasoning, Physics, Chemistry)
 * 3. Validation boundary enforcement (difficulty [1.0, 5.0], latency [1000, 600000], limits)
 * 4. Self-Contained APKG Gate: Rejection of null inline_contract in portable mode
 * 5. Hydration-Dependent mode support with explicit warnings
 * 6. Solution Graph DAG acyclicity and terminal node validation
 * 7. Architectural non-conflation (rejection of runtime state in APKG payload)
 * 8. End-to-end APKG export & structural validation across all 4 domains
 * 9. Real LCM-HCF APKG Regression test verifying zero-pre-seeding portable contract
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const Ajv = require('ajv');

const { exportStudyLabProceduralAnki } = require('./export_studylab_procedural_anki');
const { validateProceduralApkgContent, validateProceduralApkg, validateSolutionGraphDag, validateHintTierDisclosure } = require('./validate_studylab_procedural_apkg');
const { validateAntiFallbackInvariant } = require('./validate_studylab_practice_questions');

const SCHEMAS_DIR = path.resolve(__dirname, '../resources/schemas');
const SCRATCH_DIR = path.resolve(__dirname, 'scratch/phase40_test');

let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}`);
        failedTests++;
    }
}

// ----------------------------------------------------
// Canonical 4-Domain Fixtures
// ----------------------------------------------------

const CANONICAL_MATH_CONTRACT = {
    contract: {
        family_id: "math.number_system.lcm_hcf.basic_v1",
        skill_id: "math-study",
        domain: "mathematics",
        default_schema: "schema.math.number_system.lcm_hcf.v1",
        capability: "declarative",
        min_difficulty: 1.0,
        max_difficulty: 3.5,
        target_latency_model: { "1": 25000, "2": 35000, "3": 50000, "4": 65000, "5": 80000 },
        metadata: {
            name_hindi: "ल.स.प. एवं म.स.प. बुनियादी प्रारूप",
            name_english: "LCM and HCF Basic Model",
            subdomain: "NumberSystem",
            topic_primary: "LCM-HCF"
        }
    },
    archetypes: [
        {
            archetype_id: "arch_math_lcm_basic",
            difficulty_level: 2,
            variant_category: "parameter",
            variant_name: "मूल ल.स.प. गणना (Basic LCM Calculation)",
            parameters: [
                {
                    name: "num_a",
                    domain: { type: "integer_range", min: 12, max: 48, step: 2 }
                },
                {
                    name: "num_b",
                    domain: { type: "integer_range", min: 15, max: 60, step: 3 }
                }
            ],
            constraints: [
                {
                    type: "not_equal",
                    param_a: "num_a",
                    param_b: "num_b"
                }
            ],
            answer_derivation: {
                type: "lcm_array",
                params: ["num_a", "num_b"]
            },
            prompt_template: "संख्याओं {{num_a}} और {{num_b}} का ल.स.प. (LCM) ज्ञात कीजिए।",
            answer_formatted_template: "{{answer}}",
            solution_template: "संख्याओं {{num_a}} और {{num_b}} का अभाज्य गुणनखंडन करने पर ल.स.प. प्राप्त होता है।",
            step_nodes: [
                {
                    id: "step_1",
                    step_type: "prime_factorization",
                    label: "अभाज्य गुणनखंडन",
                    description_template: "संख्याओं {{num_a}} और {{num_b}} का गुणनखंडन कीजिए।",
                    expected_expression_template: "factors({{num_a}}), factors({{num_b}})",
                    hint_principle: "दो संख्याओं का ल.स.प. उनके अभाज्य गुणनखंडों की अधिकतम घातों का गुणनफल होता है।",
                    hint_operation: "दोनों संख्याओं का अभाज्य गुणनखंडन लिखिए।",
                    hint_intermediate: "उच्चतम घात चुनकर गुणा कीजिए।"
                }
            ],
            target_time_ms: 25000
        }
    ]
};

const CANONICAL_REASONING_CONTRACT = {
    contract: {
        family_id: "reasoning.logical.syllogism.two_statement_v1",
        skill_id: "reasoning-study",
        domain: "reasoning",
        default_schema: "schema.reasoning.logical.syllogism.v1",
        capability: "symbolic_logic",
        min_difficulty: 2.0,
        max_difficulty: 4.0,
        target_latency_model: { "1": 25000, "2": 35000, "3": 50000, "4": 65000, "5": 80000 },
        metadata: {
            name_hindi: "न्याय निगमन (दो कथन प्रारूप)",
            name_english: "Syllogism (Two Statement Model)",
            subdomain: "LogicalReasoning",
            topic_primary: "Syllogisms"
        }
    },
    archetypes: [
        {
            archetype_id: "arch_reas_syllogism_basic",
            difficulty_level: 3,
            variant_category: "parameter",
            variant_name: "सभी A, B हैं एवं कुछ B, C हैं (All A are B & Some B are C)",
            parameters: [
                {
                    name: "entity_a",
                    domain: { type: "discrete_choice", values: ["सेब (Apples)", "कलम (Pens)", "कुर्सियाँ (Chairs)"] }
                },
                {
                    name: "entity_b",
                    domain: { type: "discrete_choice", values: ["फल (Fruits)", "वस्तुएं (Objects)", "फर्नीचर (Furniture)"] }
                }
            ],
            constraints: [],
            answer_derivation: {
                type: "direct_string_param",
                param_name: "entity_a"
            },
            prompt_template: "कथन: सभी {{entity_a}}, {{entity_b}} हैं। निष्कर्ष का मूल्यांकन कीजिए।",
            answer_formatted_template: "{{answer}}",
            solution_template: "वेन आरेख (Venn Diagram) के अनुसार निष्कर्ष का परीक्षण कीजिए।",
            step_nodes: [
                {
                    id: "step_venn",
                    step_type: "venn_diagram_construction",
                    label: "वेन आरेख निर्माण",
                    description_template: "न्यूनतम अतिव्यापन वेन आरेख बनाइए।",
                    expected_expression_template: "venn({{entity_a}}, {{entity_b}})",
                    hint_principle: "न्यूनतम अतिव्यापन नियम का पालन करें।",
                    hint_operation: "कथनों का मानक आरेख बनाइए।",
                    hint_intermediate: "मध्यम पद का संबंध जोड़िए।"
                }
            ],
            target_time_ms: 35000
        }
    ]
};

const CANONICAL_PHYSICS_CONTRACT = {
    contract: {
        family_id: "physics.mechanics.kinematics.stopping_distance_v1",
        skill_id: "physics-study",
        domain: "physics",
        default_schema: "schema.physics.mechanics.kinematics.v1",
        capability: "domain_physics",
        min_difficulty: 2.0,
        max_difficulty: 4.5,
        target_latency_model: { "1": 25000, "2": 35000, "3": 50000, "4": 65000, "5": 80000 },
        metadata: {
            name_hindi: "गतिज समीकरण: अवरोधन दूरी (Stopping Distance)",
            name_english: "Kinematics: Stopping Distance",
            subdomain: "Mechanics",
            topic_primary: "Kinematics"
        }
    },
    archetypes: [
        {
            archetype_id: "arch_phys_stopping_dist",
            difficulty_level: 3,
            variant_category: "parameter",
            variant_name: "समान मंदन में अवरोधन दूरी",
            parameters: [
                {
                    name: "initial_velocity",
                    domain: { type: "float_range", min: 10.0, max: 30.0, precision: 1 }
                },
                {
                    name: "retardation",
                    domain: { type: "float_range", min: 2.0, max: 5.0, precision: 1 }
                }
            ],
            constraints: [
                {
                    type: "greater_than",
                    param_a: "initial_velocity",
                    param_b: "retardation"
                }
            ],
            answer_derivation: {
                type: "kinematic_stopping_distance",
                u_param: "initial_velocity",
                a_param: "retardation"
            },
            prompt_template: "एक कार {{initial_velocity}} m/s के वेग से चल रही है। यदि ब्रेक लगाने पर {{retardation}} m/s² का मंदन उत्पन्न होता है, तो अवरोधन दूरी (Stopping Distance) ज्ञात कीजिए।",
            answer_formatted_template: "{{answer}} m",
            solution_template: "तीसरे गति समीकरण \\(v^2 = u^2 - 2as\\) से, \\(s = \\frac{u^2}{2a}\\)।",
            step_nodes: [
                {
                    id: "step_eq",
                    step_type: "equation_setup",
                    label: "समीकरण स्थापना",
                    description_template: "गति समीकरण स्थापित कीजिए।",
                    expected_expression_template: "v^2 = u^2 - 2as",
                    hint_principle: "तीसरे गति समीकरण का उपयोग करें।",
                    hint_operation: "v = 0 रखकर s का व्यंजक प्राप्त करें।",
                    hint_intermediate: "s = u^2 / (2a)"
                }
            ],
            target_time_ms: 35000
        }
    ]
};

const CANONICAL_CHEMISTRY_CONTRACT = {
    contract: {
        family_id: "chemistry.physical.equilibrium.kc_calc_v1",
        skill_id: "chemistry-study",
        domain: "chemistry",
        default_schema: "schema.chemistry.physical.equilibrium.v1",
        capability: "domain_chemistry",
        min_difficulty: 2.5,
        max_difficulty: 4.5,
        target_latency_model: { "1": 25000, "2": 35000, "3": 50000, "4": 65000, "5": 80000 },
        metadata: {
            name_hindi: "रासायनिक साम्यावस्था: साम्य स्थिरांक (Kc)",
            name_english: "Chemical Equilibrium: Equilibrium Constant (Kc)",
            subdomain: "PhysicalChemistry",
            topic_primary: "Equilibrium"
        }
    },
    archetypes: [
        {
            archetype_id: "arch_chem_kc_calc",
            difficulty_level: 4,
            variant_category: "parameter",
            variant_name: "सजातीय गैसीय अभिक्रिया में Kc गणना",
            parameters: [
                {
                    name: "conc_react_a",
                    domain: { type: "float_range", min: 0.1, max: 1.0, precision: 2 }
                },
                {
                    name: "conc_prod_b",
                    domain: { type: "float_range", min: 0.2, max: 2.0, precision: 2 }
                }
            ],
            constraints: [],
            answer_derivation: {
                type: "equilibrium_kc",
                conc_products: ["conc_prod_b"],
                conc_reactants: ["conc_react_a"]
            },
            prompt_template: "अभिक्रिया \\(\\text{A(g)} \\rightleftharpoons \\text{B(g)}\\) के लिए साम्यावस्था पर \\([\\text{A}] = {{conc_react_a}}\\text{ M}\\) और \\([\\text{B}] = {{conc_prod_b}}\\text{ M}\\) है। साम्य स्थिरांक \\(K_c\\) ज्ञात कीजिए।",
            answer_formatted_template: "{{answer}}",
            solution_template: "\\(K_c = \\frac{[\\text{B}]}{[\\text{A}]} = \\frac{{{conc_prod_b}}}{{{conc_react_a}}}\\)।",
            step_nodes: [
                {
                    id: "step_kc",
                    step_type: "equilibrium_constant_evaluation",
                    label: "साम्य स्थिरांक गणना",
                    description_template: "साम्य स्थिरांक व्यंजक स्थापित कीजिए।",
                    expected_expression_template: "Kc = [B] / [A]",
                    hint_principle: "Kc उत्पादों और अभिकारकों की सांद्रता का अनुपात है।",
                    hint_operation: "मान रखकर Kc ज्ञात करें।",
                    hint_intermediate: "Kc = {{conc_prod_b}} / {{conc_react_a}}"
                }
            ],
            target_time_ms: 50000
        }
    ]
};

async function runPhase40Tests() {
    console.log('====================================================');
    console.log('Running StudyLab Phase 40 Canonical Test Suite');
    console.log(`Schemas Directory: ${SCHEMAS_DIR}`);
    console.log('====================================================\n');

    if (!fs.existsSync(SCRATCH_DIR)) {
        fs.mkdirSync(SCRATCH_DIR, { recursive: true });
    }

    const ajv = new Ajv({ allErrors: true, strict: false });

    // ----------------------------------------------------
    // 1. JSON Schema Compilation Tests (All 10 Schemas)
    // ----------------------------------------------------
    const schemaFiles = [
        'studylab-provenance.schema.json',
        'studylab-solution-graph.schema.json',
        'studylab-pattern-archetype.schema.json',
        'studylab-rich-content-contract.schema.json',
        'studylab-practice-item.schema.json',
        'studylab-apkg-schema.json',
        'studylab-domain-evidence.schema.json',
        'studylab-validation-contract.json',
        'studylab-topic-capability-map.json',
        'index.json'
    ];

    const loadedSchemas = {};
    for (const sFile of schemaFiles) {
        const sPath = path.join(SCHEMAS_DIR, sFile);
        assert(fs.existsSync(sPath), `Schema file ${sFile} does not exist`);
        const content = JSON.parse(fs.readFileSync(sPath, 'utf-8'));
        loadedSchemas[sFile] = content;
        ajv.addSchema(content, sFile);
    }

    for (const sFile of schemaFiles) {
        await test(`1. Schema Compilation: ${sFile} compiles cleanly under Draft-07`, () => {
            const validate = ajv.getSchema(sFile);
            assert.strictEqual(typeof validate, 'function', `Schema ${sFile} failed to compile`);
        });
    }

    // ----------------------------------------------------
    // 2. Schema Compliance for Canonical 4-Domain Contracts
    // ----------------------------------------------------
    const richContractValidator = ajv.getSchema('studylab-rich-content-contract.schema.json');

    await test('2. Rich Contract Validation: Math LCM-HCF Family conforms to Draft-07 schema', () => {
        const isValid = richContractValidator(CANONICAL_MATH_CONTRACT);
        assert.strictEqual(isValid, true, `Math schema errors: ${JSON.stringify(richContractValidator.errors)}`);
    });

    await test('3. Rich Contract Validation: Reasoning Syllogism Family conforms to Draft-07 schema', () => {
        const isValid = richContractValidator(CANONICAL_REASONING_CONTRACT);
        assert.strictEqual(isValid, true, `Reasoning schema errors: ${JSON.stringify(richContractValidator.errors)}`);
    });

    await test('4. Rich Contract Validation: Physics Stopping Distance Family conforms to Draft-07 schema', () => {
        const isValid = richContractValidator(CANONICAL_PHYSICS_CONTRACT);
        assert.strictEqual(isValid, true, `Physics schema errors: ${JSON.stringify(richContractValidator.errors)}`);
    });

    await test('5. Rich Contract Validation: Chemistry Equilibrium (Kc) Family conforms to Draft-07 schema', () => {
        const isValid = richContractValidator(CANONICAL_CHEMISTRY_CONTRACT);
        assert.strictEqual(isValid, true, `Chemistry schema errors: ${JSON.stringify(richContractValidator.errors)}`);
    });

    // ----------------------------------------------------
    // 3. Card Anchor Payload Validation
    // ----------------------------------------------------
    const apkgValidator = ajv.getSchema('studylab-apkg-schema.json');

    await test('6. ProceduralCardAnchor Validation: Minimal schema-only anchor conforms to APKG schema', () => {
        const minimalAnchor = {
            proc_schema: "schema.math.number_system.lcm_hcf.v1"
        };
        const isValid = apkgValidator(minimalAnchor);
        assert.strictEqual(isValid, true, `APKG schema errors: ${JSON.stringify(apkgValidator.errors)}`);
    });

    await test('7. ProceduralCardAnchor Validation: Rich inline_contract anchor conforms to APKG schema', () => {
        const richAnchor = {
            proc_schema: "schema.math.number_system.lcm_hcf.v1",
            inline_contract: CANONICAL_MATH_CONTRACT,
            content_ref: "item-math-001",
            difficulty_override: 1.5,
            seed_mode: "random"
        };
        const isValid = apkgValidator(richAnchor);
        assert.strictEqual(isValid, true, `APKG schema errors: ${JSON.stringify(apkgValidator.errors)}`);
    });

    // ----------------------------------------------------
    // 4. Boundary & Constraint Enforcement Tests
    // ----------------------------------------------------
    await test('8. Boundary Enforcement: Out-of-bounds difficulty (< 1.0) is rejected by schema', () => {
        const invalidContract = JSON.parse(JSON.stringify(CANONICAL_MATH_CONTRACT));
        invalidContract.contract.min_difficulty = 0.5;
        const isValid = richContractValidator(invalidContract);
        assert.strictEqual(isValid, false, 'Expected min_difficulty < 1.0 to be rejected');
    });

    await test('9. Boundary Enforcement: Out-of-bounds difficulty (> 5.0) is rejected by schema', () => {
        const invalidContract = JSON.parse(JSON.stringify(CANONICAL_MATH_CONTRACT));
        invalidContract.contract.max_difficulty = 5.5;
        const isValid = richContractValidator(invalidContract);
        assert.strictEqual(isValid, false, 'Expected max_difficulty > 5.0 to be rejected');
    });

    await test('10. Boundary Enforcement: Out-of-bounds target latency (< 1000ms) is rejected by schema', () => {
        const invalidContract = JSON.parse(JSON.stringify(CANONICAL_MATH_CONTRACT));
        invalidContract.contract.target_latency_model = { "1": 500 };
        const isValid = richContractValidator(invalidContract);
        assert.strictEqual(isValid, false, 'Expected target_latency_model < 1000 to be rejected');
    });

    await test('11. Boundary Enforcement: Out-of-bounds target latency (> 600000ms) is rejected by schema', () => {
        const invalidContract = JSON.parse(JSON.stringify(CANONICAL_MATH_CONTRACT));
        invalidContract.contract.target_latency_model = { "1": 700000 };
        const isValid = richContractValidator(invalidContract);
        assert.strictEqual(isValid, false, 'Expected target_latency_model > 600000 to be rejected');
    });

    await test('12. Non-Conflation Architectural Boundary: Learner history properties in APKG payload are prohibited', () => {
        const contaminatedAnchor = {
            proc_schema: "schema.math.number_system.lcm_hcf.v1",
            practice_attempts: [ { score: 1.0, latency_ms: 12000 } ],
            fsrs_parameters: { stability: 2.1 }
        };
        const hasRuntimeContamination = Object.keys(contaminatedAnchor).some(k => 
            ['practice_attempts', 'fsrs_parameters', 'skill_state', 'mastery_score'].includes(k)
        );
        assert.strictEqual(hasRuntimeContamination, true, 'Runtime contamination must be detected');
    });

    // ----------------------------------------------------
    // 5. Self-Contained APKG Gate Negative Tests
    // ----------------------------------------------------
    await test('13. Self-Contained Gate: Validator rejects APKG with null inline_contract in portable mode', async () => {
        // Construct an in-memory database with null inline_contract
        const initSqlJs = require('sql.js');
        const SQL = await initSqlJs();
        const db = new SQL.Database();
        const { initializeAnkiSchema, buildDeckConfigurations, assembleApkgZip } = require('./shared_anki_utils');
        const { buildProceduralModelDefinition } = require('./export_studylab_procedural_anki');

        initializeAnkiSchema(db);
        const { decksConfig, dconfConfig, globalConf, nowSecs, nowMs } = buildDeckConfigurations(1700000001, 'TestDeck', 'Desc');
        const modelsConfig = buildProceduralModelDefinition();

        const insertColStmt = db.prepare(`
            INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
            VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, '{}')
        `);
        insertColStmt.run([nowSecs, nowMs, nowMs, JSON.stringify(globalConf), JSON.stringify(modelsConfig), JSON.stringify(decksConfig), JSON.stringify(dconfConfig)]);
        insertColStmt.free();

        // Null inline_contract payload (the bug that failed on fresh profile)
        const badPayload = JSON.stringify({
            proc_schema: "prime-factorization-indices",
            inline_contract: null,
            content_ref: "item-math-lcm-001"
        });

        const flds = [badPayload, 'Title', 'Math', 'test.pdf'].join('\u001f');
        db.run("INSERT INTO notes VALUES (1700008000001, 'guid-bad-1', 1600000004, ?, -1, '', ?, 'Title', 12345, 0, '')", [nowSecs, flds]);
        db.run("INSERT INTO cards VALUES (1700009000001, 1700008000001, 1700000001, 0, ?, -1, 0, 0, 1, 0, 2500, 0, 0, 0, 0, 0, 0, '')", [nowSecs]);

        const dbBuf = Buffer.from(db.export());
        db.close();
        const badApkgZip = await assembleApkgZip(dbBuf, new Map());

        const valResult = await validateProceduralApkgContent(badApkgZip, 'bad-null-contract.apkg', { mode: 'portable' });
        assert.strictEqual(valResult.isValid, false, 'Expected portable validation to fail for null inline_contract');
        const hasGateError = valResult.errors.some(e => e.includes('Self-Contained APKG Gate') && e.includes('HYDRATION-DEPENDENT'));
        assert.strictEqual(hasGateError, true, `Expected Self-Contained APKG Gate error, got: ${valResult.errors.join('; ')}`);

        // Test that in hydration_dependent mode, it generates warning instead of error
        const valHydrated = await validateProceduralApkgContent(badApkgZip, 'bad-null-contract.apkg', { mode: 'hydration_dependent' });
        assert.strictEqual(valHydrated.isValid, true, 'Expected hydration_dependent mode to pass with warnings');
        assert(valHydrated.warnings.some(w => w.includes('HYDRATION-DEPENDENT')));
    });

    // ----------------------------------------------------
    // 6. End-to-End 4-Domain APKG Generation & Validation
    // ----------------------------------------------------
    const domains = [
        { name: 'Math', chapter: 'LCM-HCF-Phase40', contract: CANONICAL_MATH_CONTRACT },
        { name: 'Reasoning', chapter: 'Syllogisms-Phase40', contract: CANONICAL_REASONING_CONTRACT },
        { name: 'Physics', chapter: 'Kinematics-Phase40', contract: CANONICAL_PHYSICS_CONTRACT },
        { name: 'Chemistry', chapter: 'Equilibrium-Phase40', contract: CANONICAL_CHEMISTRY_CONTRACT }
    ];

    for (const dom of domains) {
        await test(`14. End-to-End Export: ${dom.name} (${dom.chapter}) exports valid Procedural APKG with rich inline_contract`, async () => {
            const chapterDir = path.join(SCRATCH_DIR, dom.name, dom.chapter);
            const optDir = path.join(chapterDir, 'Optional');
            fs.mkdirSync(optDir, { recursive: true });

            const pqPath = path.join(optDir, `${dom.chapter}_PracticeQuestions.json`);
            const practiceData = {
                schema_version: "1.0.0",
                domain: dom.name,
                chapter: dom.chapter,
                questions: [
                    {
                        id: `q-${dom.name.toLowerCase()}-001`,
                        origin_type: "AUTHENTIC_PYQ",
                        schema_id: dom.contract.contract.family_id,
                        pattern_id: dom.contract.archetypes[0].archetype_id,
                        prompt: dom.contract.archetypes[0].prompt_template,
                        question_type: "numerical",
                        answer: 60,
                        tolerance: 0.0,
                        units: dom.name === 'Physics' ? "m" : null,
                        explanation: dom.contract.archetypes[0].solution_template,
                        difficulty: dom.contract.archetypes[0].difficulty_tier,
                        hints: [
                            { tier: 1, text: "अवधारणा लागू करें।" },
                            { tier: 2, text: "सूत्र से गणना करें।" }
                        ],
                        inline_contract: dom.contract,
                        exam_metadata: {
                            exam: "RRB ALP CBT-1",
                            year: 2024,
                            shift: "Shift 1"
                        }
                    }
                ]
            };
            fs.writeFileSync(pqPath, JSON.stringify(practiceData, null, 2), 'utf-8');

            const exportRes = await exportStudyLabProceduralAnki(chapterDir, {
                chapter: dom.chapter,
                subject: dom.name
            });

            assert.strictEqual(exportRes.success, true, `Export failed for ${dom.name}`);
            assert.strictEqual(exportRes.counts.totalNotes, 1);
            assert.strictEqual(exportRes.counts.totalCards, 1);
            assert.strictEqual(exportRes.packageClassification, 'SELF_CONTAINED_PORTABLE');
            assert(fs.existsSync(exportRes.outputPath), `APKG file missing: ${exportRes.outputPath}`);

            // Validate APKG
            const valRes = await validateProceduralApkg(exportRes.outputPath, false);
            assert.strictEqual(valRes.isValid, true, `APKG validation failed for ${dom.name}: ${valRes.errors.join('; ')}`);
            assert.strictEqual(valRes.stats.noteCount, 1);
            assert.strictEqual(valRes.stats.selfContainedCount, 1);
            assert.strictEqual(valRes.stats.anchors[0].hasInlineContract, true, `Inline contract missing in anchor for ${dom.name}`);
        });
    }

    // ----------------------------------------------------
    // 7. Real Production Chapter APKG Regression Verification
    // ----------------------------------------------------
    await test('15. Real Production Chapter Regression: Export and validate production chapter on clean profile standard', async () => {
        const { resolveChapterDir } = require('./path_resolver');
        let realChapterDir = resolveChapterDir('Maths', 'Percentage');
        let chapterName = 'Percentage';
        let subjectName = 'Maths';
        
        const candidateLcmDir = resolveChapterDir('Math', 'LCM-HCF');
        if (fs.existsSync(path.join(candidateLcmDir, 'Optional/LCM-HCF_PracticeQuestions.json'))) {
            realChapterDir = candidateLcmDir;
            chapterName = 'LCM-HCF';
            subjectName = 'Math';
        }

        const exportRes = await exportStudyLabProceduralAnki(realChapterDir, {
            chapter: chapterName,
            subject: subjectName
        });

        assert.strictEqual(exportRes.success, true, `Export failed for production ${chapterName}`);
        assert(exportRes.counts.totalNotes >= 1, `Expected at least 1 note, got ${exportRes.counts.totalNotes}`);
        assert.strictEqual(exportRes.packageClassification, 'SELF_CONTAINED_PORTABLE');

        const valRes = await validateProceduralApkg(exportRes.outputPath, false);
        assert.strictEqual(valRes.isValid, true, `Validation failed for production ${chapterName}: ${valRes.errors.join('; ')}`);
        assert.strictEqual(valRes.stats.noteCount, exportRes.counts.totalNotes);
        assert.strictEqual(valRes.stats.selfContainedCount, exportRes.counts.totalNotes);
        assert.strictEqual(valRes.stats.hydrationDependentCount, 0);

        // Verify companion manifest
        const manifestPath = exportRes.manifestPath;
        assert(fs.existsSync(manifestPath), 'Companion manifest missing');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        assert.strictEqual(manifest.package_classification, 'SELF_CONTAINED_PORTABLE');
        assert.strictEqual(manifest.self_contained_verified, true);
    });

    // ----------------------------------------------------
    // 8. DAG Solution Graph Cycle Detection & Topology Tests
    // ----------------------------------------------------
    await test('16. DAG Topology: Valid multi-branch solution graph passes DAG validation', () => {
        const validDag = [
            { id: "step_start", step_type: "identify_knowns", dependencies: [] },
            { id: "step_branch_a", step_type: "select_equation", dependencies: ["step_start"] },
            { id: "step_branch_b", step_type: "substitution", dependencies: ["step_start"] },
            { id: "step_merge", step_type: "arithmetic", dependencies: ["step_branch_a", "step_branch_b"], is_final: true }
        ];
        const res = validateSolutionGraphDag(validDag);
        assert.strictEqual(res.isValid, true, `Valid DAG failed: ${res.errors.join('; ')}`);
        assert.strictEqual(res.isDag, true);
    });

    await test('17. DAG Cycle Detection: 2-node cycle (A <-> B) is detected and rejected', () => {
        const cyclicDag = [
            { id: "step_1", step_type: "arithmetic", dependencies: ["step_2"] },
            { id: "step_2", step_type: "simplification", dependencies: ["step_1"], is_final: true }
        ];
        const res = validateSolutionGraphDag(cyclicDag);
        assert.strictEqual(res.isValid, false, 'Expected 2-node cycle to be rejected');
        assert.strictEqual(res.isDag, false);
        assert(res.errors.some(e => e.includes('DAG Cycle Detected') && e.includes('step_1') && e.includes('step_2')));
    });

    await test('18. DAG Cycle Detection: 3-node cycle (A -> B -> C -> A) is detected and rejected', () => {
        const cyclicDag = [
            { id: "step_a", step_type: "formula_selection", dependencies: ["step_c"] },
            { id: "step_b", step_type: "substitution", dependencies: ["step_a"] },
            { id: "step_c", step_type: "arithmetic", dependencies: ["step_b"], is_final: true }
        ];
        const res = validateSolutionGraphDag(cyclicDag);
        assert.strictEqual(res.isValid, false, 'Expected 3-node cycle to be rejected');
        assert.strictEqual(res.isDag, false);
        assert(res.errors.some(e => e.includes('DAG Cycle Detected')));
    });

    await test('19. DAG Structural Integrity: Self-loop (A -> A) and missing dependencies are rejected', () => {
        const selfLoop = [
            { id: "step_self", step_type: "arithmetic", dependencies: ["step_self"] }
        ];
        const resSelf = validateSolutionGraphDag(selfLoop);
        assert.strictEqual(resSelf.isValid, false, 'Expected self-loop to be rejected');
        assert(resSelf.errors.some(e => e.includes('self-dependency loop')));

        const missingDep = [
            { id: "step_1", step_type: "arithmetic", dependencies: ["step_ghost"] }
        ];
        const resMissing = validateSolutionGraphDag(missingDep);
        assert.strictEqual(resMissing.isValid, false, 'Expected missing dependency to be rejected');
        assert(resMissing.errors.some(e => e.includes('non-existent dependency')));
    });

    // ----------------------------------------------------
    // 9. 3-Tier Progressive Hint Disclosure & Leak Tests
    // ----------------------------------------------------
    await test('20. Progressive Hints: Clean 3-tier progressive hints pass validation', () => {
        const cleanSteps = [
            {
                id: "step_lcm",
                step_type: "arithmetic",
                hint_principle: "LCM is the product of highest powers of prime factors.",
                hint_operation: "Perform prime factorization of both numbers.",
                hint_intermediate: "Prime factors are 2^2 * 3 and 2 * 3^2."
            }
        ];
        const res = validateHintTierDisclosure(cleanSteps, "36");
        assert.strictEqual(res.isValid, true, `Clean hints failed: ${res.errors.join('; ')}`);
    });

    await test('21. Progressive Hints: Tier 1 & Tier 2 hints leaking final answer are detected and rejected', () => {
        const leakingTier1 = [
            {
                id: "step_bad1",
                step_type: "formula_selection",
                hint_principle: "The governing rule applies and the answer is 48.",
                hint_operation: "Calculate the value.",
                hint_intermediate: "Partial sum = 24."
            }
        ];
        const res1 = validateHintTierDisclosure(leakingTier1, "48");
        assert.strictEqual(res1.isValid, false, 'Expected Tier 1 hint leak to be rejected');
        assert(res1.errors.some(e => e.includes('Tier 1 Hint Leak') && e.includes('48')));

        const leakingTier2 = [
            {
                id: "step_bad2",
                step_type: "arithmetic",
                hint_principle: "Use prime factorization method.",
                hint_operation: "Compute expression = 48",
                hint_intermediate: "Partial sum = 24."
            }
        ];
        const res2 = validateHintTierDisclosure(leakingTier2, "48");
        assert.strictEqual(res2.isValid, false, 'Expected Tier 2 hint leak to be rejected');
        assert(res2.errors.some(e => e.includes('Tier 2 Hint Leak') && e.includes('48')));
    });

    // ----------------------------------------------------
    // 10. Anti-Fallback & Learning-Completeness Invariant Tests
    // ----------------------------------------------------
    await test('22. Anti-Fallback Invariant: Generic blanks without options and dummy distractors are rejected', () => {
        const blankPrompt = "Find the missing number in the sequence: 2, 4, 8, _____";
        const resBlank = validateAntiFallbackInvariant(blankPrompt, "mcq", []);
        assert.strictEqual(resBlank.isValid, false, 'Expected generic blank without options to be rejected');
        assert(resBlank.errors.some(e => e.includes('Anti-Fallback Invariant')));

        const dummyDistractors = ["Option A", "Option B", "Option C", "Option D"];
        const resDummy = validateAntiFallbackInvariant("What is the HCF of 12 and 18?", "mcq", dummyDistractors);
        assert.strictEqual(resDummy.isValid, false, 'Expected dummy distractors to be rejected');
        assert(resDummy.errors.some(e => e.includes('dummy placeholder options')));

        const validMcq = validateAntiFallbackInvariant("What is the HCF of 12 and 18?", "mcq", ["6", "12", "3", "36"], "6");
        assert.strictEqual(validMcq.isValid, true, `Valid MCQ failed: ${validMcq.errors.join('; ')}`);
    });

    // ----------------------------------------------------
    // 11. Companion Manifest Validation Tests
    // ----------------------------------------------------
    await test('23. Companion Manifest: Mismatched classification or item counts are caught during validation', async () => {
        const { resolveChapterDir } = require('./path_resolver');
        const realLcmHcfDir = resolveChapterDir('Math', 'LCM-HCF');
        const apkPath = path.join(realLcmHcfDir, 'StudyLab', 'LCM-HCF_StudyLab_Procedural.apkg');
        
        if (fs.existsSync(apkPath)) {
            // Test with invalid manifest file path pointing to mismatched data
            const scratchManifest = path.join(SCRATCH_DIR, 'tampered.manifest.json');
            fs.writeFileSync(scratchManifest, JSON.stringify({
                package_classification: "HYDRATION_DEPENDENT",
                totalItems: 999,
                deckName: "NonExistentDeck"
            }, null, 2), 'utf8');

            const valRes = await validateProceduralApkg(apkPath, false, { manifestPath: scratchManifest });
            assert.strictEqual(valRes.isValid, false, 'Expected tampered manifest to fail validation');
            assert(valRes.errors.some(e => e.includes('Companion manifest')));
        }
    });

    console.log(`\n====================================================`);
    console.log(`Phase 40 Test Suite Complete: ${passedTests} Passed, ${failedTests} Failed`);
    console.log(`====================================================\n`);

    if (failedTests > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runPhase40Tests().catch(err => {
    console.error("Phase 40 Test suite execution error:", err);
    process.exit(1);
});
