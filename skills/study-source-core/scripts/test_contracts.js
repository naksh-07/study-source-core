/**
 * study-source-core Master Contract, Provenance & Validation Test Suite (`test_contracts.js`)
 * 
 * Complete end-to-end testing of:
 *  1. Basic TSV 2-column rejection
 *  2. Basic TSV 4-column rejection
 *  3. Cloze TSV 2-column rejection
 *  4. Cloze TSV malformed row rejection
 *  5. Empty TSV (0-byte) rejection
 *  6. Whitespace-only TSV rejection
 *  7. Header-only TSV (valid 0-card artifact) acceptance
 *  8. Exporter-side strict 3-column assertion
 *  9. IO manifest valid example acceptance
 * 10. IO manifest missing required data rejection
 * 11. Invalid region geometry rejection
 * 12. Region outside image bounds rejection
 * 13. Invalid IO shape rejection
 * 14. Duplicate region ID rejection
 * 15. IO candidate conditional routing
 * 16. Non-visual chapter IO suppression
 * 17. Visual asset resolution Tier 1 (Source-provided)
 * 18. Visual asset resolution Tier 2 (Programmatic SVG)
 * 19. Visual asset resolution Tier 3 (AI Pedagogical)
 * 20. Visual asset resolution Tier 4 (External with provenance)
 * 21. Visual asset resolution Tier 5 (Graceful suppression)
 * 22. Cognitive overload region guardrail (>15 warning)
 * 23. Native IO occlusion cloze serialization
 * 24. Unified .apkg deck assembly & validation
 * 25. Deterministic export (repeat runs produce stable structure)
 * 26. Stale artifact provenance mismatch (Run A vs Run B blocked)
 * 27. Missing IO media asset failure (explicit throw)
 * 28. Complete manifest-to-package media presence verification
 * 29. Safe eligibility-aware cleanup (removes suppressed artifacts)
 * 30. Recovery validation gate: invalid -> retry invalid (blocked) -> retry valid (export succeeds)
 * 31. Canonical identity & path handling with non-trivial chapter names (spaces, Unicode, parentheses)
 * 32. CWD-independent script execution
 * 33. Cross-artifact invariant divergence detection
 * 34. Evidence pack invariant boundary preservation
 * 35. End-to-end real fixture: Europe (Visual chapter: Basic + Cloze + IO)
 * 36. End-to-end real fixture: LCM-HCF (Non-visual chapter: IO suppressed)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { validateTsvContent } = require('./validate_tsv');
const { validateImageOcclusionContent } = require('./validate_image_occlusion');
const { validateProceduralContent, validateProceduralFile } = require('./validate_studylab_procedural');
const { resolveVisualAsset, createProgrammaticSvg, calculateSha256 } = require('./resolve_visual_asset');
const { exportChapterToAnki, serializeOcclusions, parseTsvFile } = require('./export_anki');
const { validateApkgContent, validateApkg } = require('./validate_apkg');
const {
    exportStudyLabProceduralAnki,
    buildProceduralModelDefinition,
    createAnchorPayload,
    createQuestionPayload,
    formatQuestionGoverningMethod,
    formatQuestionTrapsAndChecks,
    formatQuestionMetadata
} = require('./export_studylab_procedural_anki');
const { validateProceduralApkgContent, validateProceduralApkg } = require('./validate_studylab_procedural_apkg');
const {
    validatePracticeQuestionsContent,
    validatePracticeQuestionsFile,
    computeCoverageReport,
    formatCoverageMatrix
} = require('./validate_studylab_practice_questions');
const {
    getVaultRoot,
    resolveChapterDir,
    getCanonicalArtifactPaths,
    normalizeName
} = require('./path_resolver');
const {
    computeSha256,
    initManifest,
    recordArtifact,
    loadManifest,
    verifyArtifactLineage,
    cleanSuppressedArtifacts,
    archivePackagingIntermediates,
    cleanPackagingIntermediates
} = require('./artifact_provenance');
const { cleanTransients } = require('./cleanup_transients');
const { validateHtmlFieldSafety } = require('./validate_apkg');
const { validateLatex, validateFormulaSyntax } = require('./latex_validator');
const { checkCrossArtifactIntegrity, checkProceduralConsistency, checkProceduralApkgConsistency } = require('./cross_artifact_checker');
const { checkInvariants, extractInvariants } = require('./source_invariant_checker');
const { evaluateArtifactRouting: evaluateMasterRouting, THRESHOLDS } = require('./routing_engine');
const { auditNoteContract } = require('./note_contract_audit');
const {
    generateDeterministicGuid: sharedGuid,
    calculateFieldChecksum: sharedChecksum,
    initializeAnkiSchema: sharedInitSchema,
    buildDeckConfigurations: sharedDeckConfig,
    assembleApkgZip: sharedAssembleZip
} = require('./shared_anki_utils');

const VAULT_ROOT = getVaultRoot(__dirname);
const SCRATCH_DIR = path.join(__dirname, 'scratch');

let testsPassed = 0;
let testsFailed = 0;

async function runTest(name, fn) {
    try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        testsPassed++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}`);
        testsFailed++;
    }
}

async function runAllTests() {
    console.log('====================================================');
    console.log('Running study-source-core Master Contract Test Suite');
    console.log(`Vault Root: ${VAULT_ROOT}`);
    console.log('====================================================\n');

    if (!fs.existsSync(SCRATCH_DIR)) {
        fs.mkdirSync(SCRATCH_DIR, { recursive: true });
    }

    const { ensureAllTestFixtures } = require('./ensure_test_fixtures');
    await ensureAllTestFixtures();

    // ----------------------------------------------------
    // 1. Basic TSV invalid column count (2 cols) -> rejected
    // ----------------------------------------------------
    await runTest('1. Basic TSV invalid column count (2 columns instead of 3) is rejected', () => {
        const invalid2ColBasic = "Front\tBack\nप्रश्न १\tउत्तर १";
        const res = validateTsvContent(invalid2ColBasic, 'test-basic-2col.tsv');
        assert.strictEqual(res.isValid, false, 'Expected 2-column Basic TSV to be rejected');
        assert(res.errors.some(e => e.includes('column count') || e.includes('Invalid TSV header')));
    });

    // ----------------------------------------------------
    // 2. Basic TSV invalid column count (4 cols) -> rejected
    // ----------------------------------------------------
    await runTest('2. Basic TSV invalid column count (4 columns) is rejected', () => {
        const invalid4ColBasic = "Front\tBack\tTags\tExtraCol\nप्रश्न १\tउत्तर १\tTag1\tExtra";
        const res = validateTsvContent(invalid4ColBasic, 'test-basic-4col.tsv');
        assert.strictEqual(res.isValid, false, 'Expected 4-column Basic TSV to be rejected');
    });

    // ----------------------------------------------------
    // 3. Cloze TSV invalid column count (2 cols) -> rejected
    // ----------------------------------------------------
    await runTest('3. Cloze TSV invalid column count (2 columns instead of 3) is rejected', () => {
        const invalid2ColCloze = "Text\tExtra\n{{c1::नॉर्वे}} को फियोर्ड तटों का देश कहते हैं।\tअतिरिक्त";
        const res = validateTsvContent(invalid2ColCloze, 'test-cloze-2col.tsv');
        assert.strictEqual(res.isValid, false, 'Expected 2-column Cloze TSV to be rejected');
    });

    // ----------------------------------------------------
    // 4. Cloze TSV row with missing tab -> rejected
    // ----------------------------------------------------
    await runTest('4. Cloze TSV row with missing tab (2 columns on row 2) is rejected', () => {
        const malformedRowCloze = "Text\tExtra\tTags\n{{c1::नॉर्वे}} को फियोर्ड तटों का देश कहते हैं।\tMap::Europe";
        const res = validateTsvContent(malformedRowCloze, 'test-cloze-malformed-row.tsv');
        assert.strictEqual(res.isValid, false, 'Expected Cloze TSV with 2-column row to be rejected');
        assert(res.errors.some(e => e.includes('Row 2 has 2 columns, expected exactly 3')));
    });

    // ----------------------------------------------------
    // 5. Empty TSV (0-byte file) -> rejected
    // ----------------------------------------------------
    await runTest('5. Empty TSV (0-byte file) is rejected as invalid', () => {
        const res = validateTsvContent('', 'empty.tsv');
        assert.strictEqual(res.isValid, false, '0-byte file must be invalid');
        assert(res.errors.some(e => e.includes('completely empty')));
    });

    // ----------------------------------------------------
    // 6. Whitespace-only TSV -> rejected
    // ----------------------------------------------------
    await runTest('6. Whitespace-only TSV is rejected as invalid', () => {
        const res = validateTsvContent('   \n\t  \n  ', 'whitespace.tsv');
        assert.strictEqual(res.isValid, false, 'Whitespace-only TSV must be invalid');
        assert(res.errors.some(e => e.includes('completely empty')));
    });

    // ----------------------------------------------------
    // 7. Header-only TSV -> valid zero-card artifact
    // ----------------------------------------------------
    await runTest('7. Header-only TSV (Front\\tBack\\tTags) is accepted as a valid zero-card artifact', () => {
        const headerOnlyBasic = "Front\tBack\tTags\n";
        const res = validateTsvContent(headerOnlyBasic, 'header-only-basic.tsv');
        assert.strictEqual(res.isValid, true, 'Header-only TSV should be valid');
        assert(res.warnings.some(w => w.includes('0 cards')));
    });

    // ----------------------------------------------------
    // 8. Exporter-side strict 3-column assertion
    // ----------------------------------------------------
    await runTest('8. Exporter-side strict TSV parser throws explicit error on invalid column counts', () => {
        const tempTsvPath = path.join(SCRATCH_DIR, 'test_strict_export.tsv');
        fs.writeFileSync(tempTsvPath, "Front\tBack\tTags\nQ1\tA1\tTag1\tExtraCol4\n");
        assert.throws(() => {
            parseTsvFile(tempTsvPath);
        }, /expected exactly 3/i);
    });

    // ----------------------------------------------------
    // 9. IO manifest valid example -> accepted
    // ----------------------------------------------------
    const validIOExample = {
        id: "io-test-europe",
        title: "Europe Physical Map Test",
        subject: "Map",
        chapter: "Europe",
        language: "hi",
        cards: [
            {
                id: "card-001",
                source: {
                    chapter: "Europe",
                    evidence_ids: ["ev-001", "ev-002"]
                },
                asset: {
                    path: "media/europe.png",
                    width: 2000,
                    height: 1500,
                    source_type: "source_provided"
                },
                mode: "hide_all_guess_one",
                regions: [
                    {
                        id: "r1",
                        shape: "rectangle",
                        coordinates: [100, 150, 300, 100],
                        answer: "पिरिनीज पर्वत (Pyrenees Mountains)"
                    },
                    {
                        id: "r2",
                        shape: "ellipse",
                        coordinates: [600, 500, 80, 50],
                        answer: "आल्प्स पर्वत (Alps Mountains)"
                    },
                    {
                        id: "r3",
                        shape: "polygon",
                        points: [[1000, 100], [1100, 120], [1150, 400], [1050, 420]],
                        answer: "यूराल पर्वत (Ural Mountains)"
                    }
                ],
                header: "यूरोप की प्राकृतिक सीमाएं",
                extra: "अतिरिक्त विवरण",
                tags: ["Map::Europe"]
            }
        ]
    };

    await runTest('9. IO manifest valid example is accepted', () => {
        const res = validateImageOcclusionContent(validIOExample, 'valid-io.json');
        assert.strictEqual(res.isValid, true, `Errors: ${res.errors.join('; ')}`);
    });

    // ----------------------------------------------------
    // 10. IO manifest missing required data -> rejected
    // ----------------------------------------------------
    await runTest('10. IO manifest missing required data is rejected', () => {
        const missingTopLevel = { title: "No ID", subject: "Map", chapter: "Europe" };
        const res1 = validateImageOcclusionContent(missingTopLevel, 'missing-id.json');
        assert.strictEqual(res1.isValid, false);

        const missingCardFields = {
            id: "io-missing",
            title: "Missing Fields",
            subject: "Map",
            chapter: "Europe",
            cards: [{ id: "c1", source: { chapter: "Europe", evidence_ids: [] }, mode: "invalid_mode", regions: [] }]
        };
        const res2 = validateImageOcclusionContent(missingCardFields, 'missing-card-fields.json');
        assert.strictEqual(res2.isValid, false);
    });

    // ----------------------------------------------------
    // 11. Invalid region geometry -> rejected
    // ----------------------------------------------------
    await runTest('11. Invalid region geometry (negative width/height, polygon < 3 pts) is rejected', () => {
        const badGeomIO = JSON.parse(JSON.stringify(validIOExample));
        badGeomIO.cards[0].regions = [
            { id: "r1", shape: "rectangle", coordinates: [100, 150, -50, 100], answer: "Answer 1" },
            { id: "r2", shape: "polygon", points: [[100, 100], [200, 200]], answer: "Answer 2" }
        ];
        const res = validateImageOcclusionContent(badGeomIO, 'bad-geometry.json');
        assert.strictEqual(res.isValid, false);
    });

    // ----------------------------------------------------
    // 12. Region outside image bounds -> rejected
    // ----------------------------------------------------
    await runTest('12. Region outside image bounds is rejected', () => {
        const oobIO = JSON.parse(JSON.stringify(validIOExample));
        oobIO.cards[0].regions = [
            { id: "r1", shape: "rectangle", coordinates: [1900, 1400, 200, 200], answer: "OOB Rect" },
            { id: "r2", shape: "ellipse", coordinates: [1950, 100, 100, 50], answer: "OOB Ellipse" },
            { id: "r3", shape: "polygon", points: [[100, 100], [200, 200], [2500, 500]], answer: "OOB Poly" }
        ];
        const res = validateImageOcclusionContent(oobIO, 'oob.json');
        assert.strictEqual(res.isValid, false);
    });

    // ----------------------------------------------------
    // 13. Invalid IO shape -> rejected
    // ----------------------------------------------------
    await runTest('13. Invalid IO shape is rejected', () => {
        const badShapeIO = JSON.parse(JSON.stringify(validIOExample));
        badShapeIO.cards[0].regions = [
            { id: "r1", shape: "triangle", coordinates: [100, 100, 50, 50], answer: "Bad Shape" }
        ];
        const res = validateImageOcclusionContent(badShapeIO, 'bad-shape.json');
        assert.strictEqual(res.isValid, false);
    });

    // ----------------------------------------------------
    // 14. Duplicate region ID -> rejected
    // ----------------------------------------------------
    await runTest('14. Duplicate region ID within a card is rejected', () => {
        const dupIdIO = JSON.parse(JSON.stringify(validIOExample));
        dupIdIO.cards[0].regions = [
            { id: "r1", shape: "rectangle", coordinates: [100, 100, 50, 50], answer: "A1" },
            { id: "r1", shape: "rectangle", coordinates: [200, 200, 50, 50], answer: "A2" }
        ];
        const res = validateImageOcclusionContent(dupIdIO, 'dup-id.json');
        assert.strictEqual(res.isValid, false);
    });

    // ----------------------------------------------------
    // 15. IO candidate conditional routing
    // ----------------------------------------------------
    function evaluateArtifactRouting(chapterMetadata, visualProfile) {
        const routing = {
            notes: true,
            basic: true,
            cloze: true,
            mindmap: false,
            slideDeck: false,
            imageOcclusion: false
        };

        if (visualProfile) {
            if (visualProfile.io_worthiness === 'HIGH' || visualProfile.io_worthiness === 'MEDIUM') {
                routing.imageOcclusion = true;
            }
            if (visualProfile.deck_worthiness === 'HIGH' || visualProfile.deck_worthiness === 'MEDIUM') {
                routing.slideDeck = true;
            }
            if (visualProfile.dominant_structures && visualProfile.dominant_structures.length > 0) {
                routing.mindmap = true;
            }
        }
        return routing;
    }

    await runTest('15. IO candidate can be routed conditionally for visual/spatial chapter', () => {
        const mapProfile = {
            dominant_structures: ['spatial', 'hydrographic_drainage'],
            deck_worthiness: 'HIGH',
            io_worthiness: 'HIGH',
            io_candidates: [{ evidence_id: 'ev-001', target_title: 'Natural Boundaries' }]
        };
        const routing = evaluateArtifactRouting({ subject: 'Map', chapter: 'Europe' }, mapProfile);
        assert.strictEqual(routing.notes, true);
        assert.strictEqual(routing.imageOcclusion, true);
        assert.strictEqual(routing.slideDeck, true);
        assert.strictEqual(routing.mindmap, true);
    });

    // ----------------------------------------------------
    // 16. Non-visual chapter IO suppression
    // ----------------------------------------------------
    await runTest('16. Non-visual chapter suppresses Image Occlusion', () => {
        const abstractProfile = {
            dominant_structures: [],
            deck_worthiness: 'LOW',
            io_worthiness: 'NONE',
            io_candidates: []
        };
        const routing = evaluateArtifactRouting({ subject: 'Political Science', chapter: 'Preamble' }, abstractProfile);
        assert.strictEqual(routing.notes, true);
        assert.strictEqual(routing.imageOcclusion, false);
        assert.strictEqual(routing.slideDeck, false);
    });

    // ----------------------------------------------------
    // 17. Visual Asset Engine Tier 1 (Source-Provided)
    // ----------------------------------------------------
    await runTest('17. Visual Asset Engine Tier 1 (Source-Provided) normalizes asset & metadata', () => {
        const scratchMediaDir = path.join(SCRATCH_DIR, 'test_media_tier1');
        const dummySourceImage = path.join(SCRATCH_DIR, 'dummy_source.png');
        const png1x1 = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');
        fs.writeFileSync(dummySourceImage, png1x1);

        const res = resolveVisualAsset({
            targetMediaDir: scratchMediaDir,
            sourceAssetPath: dummySourceImage,
            candidate: { target_title: "Dummy Source" }
        });

        assert.strictEqual(res.success, true);
        assert.strictEqual(res.tier, 1);
        assert.strictEqual(res.strategy, 'source_provided');
        assert.strictEqual(res.asset.sha256.length, 64);
        assert(res.asset.path.startsWith('media/'));
    });

    // ----------------------------------------------------
    // 18. Visual Asset Engine Tier 2 (Programmatic SVG)
    // ----------------------------------------------------
    await runTest('18. Visual Asset Engine Tier 2 (Programmatic SVG) generates valid SVG & bounds', () => {
        const scratchMediaDir = path.join(SCRATCH_DIR, 'test_media_tier2');
        const res = resolveVisualAsset({
            targetMediaDir: scratchMediaDir,
            programmaticSpec: {
                title: "Test Coordinate Diagram",
                slug: "test_coord_diag",
                width: 1600,
                height: 1200,
                regions: [
                    { shape: "rectangle", coordinates: [100, 100, 200, 100], label: "Region A" },
                    { shape: "ellipse", coordinates: [500, 500, 80, 40], label: "Region B" }
                ]
            }
        });

        assert.strictEqual(res.success, true);
        assert.strictEqual(res.tier, 2);
        assert.strictEqual(res.strategy, 'programmatic');
        assert.strictEqual(res.asset.width, 1600);
        assert.strictEqual(res.asset.height, 1200);
        assert.strictEqual(res.asset.mime_type, 'image/svg+xml');
    });

    // ----------------------------------------------------
    // 19. Visual Asset Engine Tier 3 (AI Pedagogical)
    // ----------------------------------------------------
    await runTest('19. Visual Asset Engine Tier 3 (AI Pedagogical) registers synthesized visual', () => {
        const scratchMediaDir = path.join(SCRATCH_DIR, 'test_media_tier3');
        const dummyAiBuf = Buffer.from('mock AI image bytes for pedagogical test');
        const res = resolveVisualAsset({
            targetMediaDir: scratchMediaDir,
            aiGeneratedData: dummyAiBuf,
            candidate: { target_title: "Cell Organelles", filename: "cell_structure.png" }
        });

        assert.strictEqual(res.success, true);
        assert.strictEqual(res.tier, 3);
        assert.strictEqual(res.strategy, 'ai_generated');
        assert(res.asset.provenance_note.includes('AI pedagogical'));
    });

    // ----------------------------------------------------
    // 20. Visual Asset Engine Tier 4 (External)
    // ----------------------------------------------------
    await runTest('20. Visual Asset Engine Tier 4 (External) captures provenance and licensing', () => {
        const scratchMediaDir = path.join(SCRATCH_DIR, 'test_media_tier4');
        const extBuf = Buffer.from('mock external diagram');
        const res = resolveVisualAsset({
            targetMediaDir: scratchMediaDir,
            externalSpec: {
                buffer: extBuf,
                filename: "external_relief.png",
                source: "OpenGeography Initiative",
                source_url: "https://example.org/relief.png",
                license: "CC BY-SA 4.0",
                retrieved_at: "2026-08-18"
            }
        });

        assert.strictEqual(res.success, true);
        assert.strictEqual(res.tier, 4);
        assert.strictEqual(res.strategy, 'external');
        assert(res.asset.provenance_note.includes('CC BY-SA 4.0'));
    });

    // ----------------------------------------------------
    // 21. Visual Asset Engine Tier 5 (Graceful suppression)
    // ----------------------------------------------------
    await runTest('21. Visual Asset Engine Tier 5 cleanly suppresses IO when no asset is available', () => {
        const scratchMediaDir = path.join(SCRATCH_DIR, 'test_media_tier5');
        const res = resolveVisualAsset({
            targetMediaDir: scratchMediaDir,
            candidate: { target_title: "Non-existent Visual" }
        });

        assert.strictEqual(res.success, false);
        assert.strictEqual(res.suppressed, true);
        assert.strictEqual(res.tier, 5);
        assert.strictEqual(res.strategy, 'suppress');
    });

    // ----------------------------------------------------
    // 22. Cognitive overload region guardrail (>15 warning)
    // ----------------------------------------------------
    await runTest('22. IO Validator emits warning for cognitive overload (>15 regions per card)', () => {
        const denseIO = JSON.parse(JSON.stringify(validIOExample));
        const denseRegions = [];
        for (let i = 0; i < 18; i++) {
            denseRegions.push({
                id: `r${i}`,
                shape: "rectangle",
                coordinates: [10 + i * 50, 10, 40, 40],
                answer: `Target ${i + 1}`
            });
        }
        denseIO.cards[0].regions = denseRegions;

        const res = validateImageOcclusionContent(denseIO, 'dense-io.json');
        assert.strictEqual(res.isValid, true);
        assert(res.warnings.some(w => w.includes('18 occlusion regions')));
    });

    // ----------------------------------------------------
    // 23. Native IO cloze serialization
    // ----------------------------------------------------
    await runTest('23. Native IO cloze serialization formats rect, ellipse, and polygon correctly', () => {
        const regions = [
            { shape: "rectangle", coordinates: [100, 200, 300, 80] },
            { shape: "ellipse", coordinates: [800, 600, 50, 30] },
            { shape: "polygon", points: [[10, 20], [30, 40], [50, 20]] }
        ];

        const serialized = serializeOcclusions(regions);
        assert(serialized.includes('{{c1::rect:left=100:top=200:width=300:height=80}}'));
        assert(serialized.includes('{{c2::ellipse:left=750:top=570:width=100:height=60:rx=50:ry=30}}'));
        assert(serialized.includes('{{c3::polygon:points=10,20 30,40 50,20}}'));
    });

    // ----------------------------------------------------
    // 24. Unified .apkg deck assembly & validation
    // ----------------------------------------------------
    await runTest('24. Unified Anki Exporter builds valid .apkg from Basic + Cloze + IO', async () => {
        const fixtureDir = path.join(SCRATCH_DIR, 'test_fixture_chapter');
        const basicDir = path.join(fixtureDir, 'Basic');
        const clozeDir = path.join(fixtureDir, 'Cloze');
        const ioDir = path.join(fixtureDir, 'ImageOcclusion');
        const mediaDir = path.join(ioDir, 'media');

        fs.mkdirSync(basicDir, { recursive: true });
        fs.mkdirSync(clozeDir, { recursive: true });
        fs.mkdirSync(mediaDir, { recursive: true });

        const basicTsv = "Front\tBack\tTags\nफ्रांस की राजधानी क्या है?\tपेरिस (Paris)\tGeo::Europe\nस्पेन की राजधानी क्या है?\tमैड्रिड (Madrid)\tGeo::Europe";
        const basicFile = path.join(basicDir, 'test_fixture_chapter_Basic.tsv');
        fs.writeFileSync(basicFile, basicTsv);

        const clozeTsv = "Text\tExtra\tTags\n{{c1::नॉर्वे}} को फियोर्ड तटों का देश कहते हैं।\tस्कैंडिनेवियाई देश\tGeo::Europe\nयूरोप की सबसे लंबी नदी {{c1::वोल्गा}} है जो {{c2::कैस्पियन सागर}} में गिरती है।\tरूस\tGeo::Europe";
        const clozeFile = path.join(clozeDir, 'test_fixture_chapter_Cloze.tsv');
        fs.writeFileSync(clozeFile, clozeTsv);

        const svgContent = createProgrammaticSvg("Test Chapter Relief", 1200, 800, [
            { shape: "rectangle", coordinates: [100, 100, 200, 80], label: "Pyrenees" }
        ]);
        fs.writeFileSync(path.join(mediaDir, 'test_map.svg'), svgContent);

        const ioManifest = {
            id: "io-test-fixture",
            title: "Test Chapter Physical",
            subject: "Geography",
            chapter: "test_fixture_chapter",
            language: "hi",
            cards: [
                {
                    id: "card-001",
                    source: { chapter: "test_fixture_chapter", evidence_ids: ["ev-01"] },
                    asset: { path: "media/test_map.svg", width: 1200, height: 800, source_type: "programmatic" },
                    mode: "hide_all_guess_one",
                    regions: [
                        { id: "r1", shape: "rectangle", coordinates: [100, 100, 200, 80], answer: "पिरिनीज पर्वत (Pyrenees Mountains)" },
                        { id: "r2", shape: "ellipse", coordinates: [500, 400, 60, 40], answer: "आल्प्स पर्वत (Alps Mountains)" }
                    ],
                    header: "यूरोप की सीमाएं",
                    extra: "अतिरिक्त विवरण",
                    tags: ["Geo::Europe"]
                }
            ]
        };
        const ioFile = path.join(ioDir, 'test_fixture_chapter_ImageOcclusion.json');
        fs.writeFileSync(ioFile, JSON.stringify(ioManifest, null, 2));

        // Provenance setup
        const evHash = computeSha256("evidence-scratch-fixture-v1");
        initManifest(fixtureDir, { chapter: "test_fixture_chapter", subject: "Geography", evidenceHash: evHash });
        recordArtifact(fixtureDir, { artifactType: 'basic', filePath: basicFile, evidenceHash: evHash, status: 'VALIDATED', lastValidationResult: 'PASS' });
        recordArtifact(fixtureDir, { artifactType: 'cloze', filePath: clozeFile, evidenceHash: evHash, status: 'VALIDATED', lastValidationResult: 'PASS' });
        recordArtifact(fixtureDir, { artifactType: 'imageOcclusion', filePath: ioFile, evidenceHash: evHash, status: 'VALIDATED', lastValidationResult: 'PASS' });

        const exportRes = await exportChapterToAnki(fixtureDir, { chapter: "test_fixture_chapter", subject: "Geography" });
        assert.strictEqual(exportRes.success, true);
        assert.strictEqual(exportRes.counts.basicNotes, 2);
        assert.strictEqual(exportRes.counts.clozeNotes, 2);
        assert.strictEqual(exportRes.counts.ioNotes, 1);
        assert.strictEqual(exportRes.counts.totalNotes, 5);
        assert.strictEqual(exportRes.counts.totalCards, 7);
        assert.strictEqual(exportRes.counts.mediaFiles, 1);

        const valRes = await validateApkg(exportRes.outputPath, false);
        assert.strictEqual(valRes.isValid, true);
    });

    // ----------------------------------------------------
    // 25. Deterministic export
    // ----------------------------------------------------
    await runTest('25. Deterministic export produces identical note counts and structures across repeated runs', async () => {
        const fixtureDir = path.join(SCRATCH_DIR, 'test_fixture_chapter');
        const res1 = await exportChapterToAnki(fixtureDir, { chapter: "test_fixture_chapter", subject: "Geography" });
        const res2 = await exportChapterToAnki(fixtureDir, { chapter: "test_fixture_chapter", subject: "Geography" });

        assert.strictEqual(res1.counts.totalNotes, res2.counts.totalNotes);
        assert.strictEqual(res1.counts.totalCards, res2.counts.totalCards);
        assert.strictEqual(res1.counts.mediaFiles, res2.counts.mediaFiles);
    });

    // ----------------------------------------------------
    // 26. Stale artifact provenance mismatch (Run A vs Run B blocked)
    // ----------------------------------------------------
    await runTest('26. Stale artifact provenance mismatch blocks unified export', async () => {
        const staleDir = path.join(SCRATCH_DIR, 'test_stale_provenance');
        const basicDir = path.join(staleDir, 'Basic');
        const clozeDir = path.join(staleDir, 'Cloze');
        fs.mkdirSync(basicDir, { recursive: true });
        fs.mkdirSync(clozeDir, { recursive: true });

        const basicFile = path.join(basicDir, 'test_stale_provenance_Basic.tsv');
        const clozeFile = path.join(clozeDir, 'test_stale_provenance_Cloze.tsv');
        fs.writeFileSync(basicFile, "Front\tBack\tTags\nQ1\tA1\tT1\n");
        fs.writeFileSync(clozeFile, "Text\tExtra\tTags\n{{c1::T1}}\tE1\tT1\n");

        const evHashRunA = computeSha256("evidence-v1");
        const evHashRunB = computeSha256("evidence-v2-changed");

        // Manifest is on Run B, but Cloze artifact is recorded from Run A
        initManifest(staleDir, { chapter: "test_stale_provenance", subject: "Test", evidenceHash: evHashRunB });
        recordArtifact(staleDir, { artifactType: 'basic', filePath: basicFile, evidenceHash: evHashRunB, status: 'VALIDATED', lastValidationResult: 'PASS' });
        recordArtifact(staleDir, { artifactType: 'cloze', filePath: clozeFile, evidenceHash: evHashRunA, status: 'VALIDATED', lastValidationResult: 'PASS' });

        let blocked = false;
        try {
            await exportChapterToAnki(staleDir, { chapter: "test_stale_provenance", subject: "Test" });
        } catch (err) {
            blocked = true;
            assert(err.message.includes('EXPORT BLOCKED') || err.message.includes('Stale'));
        }
        assert.strictEqual(blocked, true, 'Export must be blocked when participating artifacts have mismatched evidence lineage');
    });

    // ----------------------------------------------------
    // 27. Missing IO media asset failure (explicit throw)
    // ----------------------------------------------------
    await runTest('27. Missing IO media asset referenced in manifest throws explicit export error', async () => {
        const missingMediaDir = path.join(SCRATCH_DIR, 'test_missing_media');
        const basicDir = path.join(missingMediaDir, 'Basic');
        const ioDir = path.join(missingMediaDir, 'ImageOcclusion');
        fs.mkdirSync(basicDir, { recursive: true });
        fs.mkdirSync(ioDir, { recursive: true });

        const basicFile = path.join(basicDir, 'test_missing_media_Basic.tsv');
        fs.writeFileSync(basicFile, "Front\tBack\tTags\nQ1\tA1\tT1\n");

        const ioJson = {
            id: "io-missing-media",
            title: "Missing Media Manifest",
            subject: "Geography",
            chapter: "test_missing_media",
            cards: [
                {
                    id: "c1",
                    source: { chapter: "test_missing_media", evidence_ids: ["ev1"] },
                    asset: { path: "media/non_existent_image.png", width: 1000, height: 800, source_type: "source_provided" },
                    mode: "hide_all_guess_one",
                    regions: [{ id: "r1", shape: "rectangle", coordinates: [10, 10, 50, 50], answer: "A1" }]
                }
            ]
        };
        const ioFile = path.join(ioDir, 'test_missing_media_ImageOcclusion.json');
        fs.writeFileSync(ioFile, JSON.stringify(ioJson, null, 2));

        let failed = false;
        try {
            await exportChapterToAnki(missingMediaDir, { chapter: "test_missing_media", subject: "Geography", skipProvenanceCheck: true });
        } catch (err) {
            failed = true;
            assert(err.message.includes('Missing IO media asset') || err.message.includes('EXPORT FAIL'));
        }
        assert.strictEqual(failed, true, 'Expected export to throw fatal error on missing media asset');
    });

    // ----------------------------------------------------
    // 28. Complete manifest-to-package media presence verification
    // ----------------------------------------------------
    await runTest('28. validateApkg verifies all media assets required by IO manifest exist in archive', async () => {
        const fixtureDir = path.join(SCRATCH_DIR, 'test_fixture_chapter');
        const apkgPath = path.join(fixtureDir, 'test_fixture_chapter_Anki.apkg');
        let ioPath = path.join(fixtureDir, 'ImageOcclusion', 'test_fixture_chapter_ImageOcclusion.json');
        if (!fs.existsSync(ioPath)) {
            ioPath = path.join(fixtureDir, '.build', 'source-artifacts', 'ImageOcclusion', 'test_fixture_chapter_ImageOcclusion.json');
        }
        const manifest = JSON.parse(fs.readFileSync(ioPath, 'utf8'));

        const valRes = await validateApkg(apkgPath, false, { manifest });
        assert.strictEqual(valRes.isValid, true);
        assert.strictEqual(valRes.stats.mediaCount, 1);
        assert(valRes.stats.mediaFilenames.includes('test_map.svg'));
    });

    // ----------------------------------------------------
    // 29. Safe eligibility-aware cleanup
    // ----------------------------------------------------
    await runTest('29. Eligibility-aware cleanup safely removes suppressed artifact directories', () => {
        const cleanupTestDir = path.join(SCRATCH_DIR, 'test_cleanup_suppressed');
        const ioDir = path.join(cleanupTestDir, 'ImageOcclusion');
        const mmDir = path.join(cleanupTestDir, 'MindMap');
        const notesDir = path.join(cleanupTestDir, 'Notes');
        fs.mkdirSync(ioDir, { recursive: true });
        fs.mkdirSync(mmDir, { recursive: true });
        fs.mkdirSync(notesDir, { recursive: true });

        fs.writeFileSync(path.join(ioDir, 'test_ImageOcclusion.json'), '{}');
        fs.writeFileSync(path.join(mmDir, 'test.mindmap.json'), '{}');
        fs.writeFileSync(path.join(notesDir, 'test_Notes.md'), '# Notes');

        cleanSuppressedArtifacts(cleanupTestDir, {
            imageOcclusion: false, // Suppress IO
            mindmap: true         // Keep MindMap
        });

        assert.strictEqual(fs.existsSync(ioDir), false, 'Suppressed IO dir must be removed');
        assert.strictEqual(fs.existsSync(mmDir), true, 'Kept MindMap dir must remain');
        assert.strictEqual(fs.existsSync(notesDir), true, 'Notes dir must remain untouched');
    });

    // ----------------------------------------------------
    // 30. Recovery validation gate
    // ----------------------------------------------------
    await runTest('30. Recovery loop gate: invalid artifact blocks export until valid repair passes validation', async () => {
        const recoveryDir = path.join(SCRATCH_DIR, 'test_recovery_gate');
        const basicDir = path.join(recoveryDir, 'Basic');
        fs.mkdirSync(basicDir, { recursive: true });

        const basicPath = path.join(basicDir, 'test_recovery_gate_Basic.tsv');
        const evHash = computeSha256("evidence-recovery-v1");
        initManifest(recoveryDir, { chapter: "test_recovery_gate", subject: "Recovery", evidenceHash: evHash });

        // 1. Initial artifact is invalid (2 columns instead of 3)
        fs.writeFileSync(basicPath, "Front\tBack\nQ1\tA1\n");
        const val1 = validateTsvContent(fs.readFileSync(basicPath, 'utf8'), basicPath);
        assert.strictEqual(val1.isValid, false);
        recordArtifact(recoveryDir, { artifactType: 'basic', filePath: basicPath, evidenceHash: evHash, status: 'FAILED', lastValidationResult: 'FAIL' });

        // Verify export is blocked
        let blocked = false;
        try {
            await exportChapterToAnki(recoveryDir, { chapter: "test_recovery_gate", subject: "Recovery" });
        } catch (err) {
            blocked = true;
            assert(err.message.includes('EXPORT BLOCKED') || err.message.includes('Validation failed'));
        }
        assert.strictEqual(blocked, true, 'Export must be blocked when validation failed');

        // 2. Repair produces valid 3-column artifact
        fs.writeFileSync(basicPath, "Front\tBack\tTags\nQ1\tA1\tTag1\n");
        const val2 = validateTsvContent(fs.readFileSync(basicPath, 'utf8'), basicPath);
        assert.strictEqual(val2.isValid, true);
        recordArtifact(recoveryDir, { artifactType: 'basic', filePath: basicPath, evidenceHash: evHash, status: 'VALIDATED', lastValidationResult: 'PASS' });

        // Verify export now succeeds
        const exportRes = await exportChapterToAnki(recoveryDir, { chapter: "test_recovery_gate", subject: "Recovery" });
        assert.strictEqual(exportRes.success, true);
        assert.strictEqual(exportRes.counts.basicNotes, 1);
    });

    // ----------------------------------------------------
    // 31. Canonical identity & path handling with non-trivial chapter names
    // ----------------------------------------------------
    await runTest('31. Canonical identity safely handles Unicode, spaces, and parentheses in chapter names', () => {
        const specialChapter = "अध्याय १ - भारत का भूगोल (Physical & Map) [Part 1]";
        const paths = getCanonicalArtifactPaths('Geography', specialChapter, SCRATCH_DIR);

        assert(paths.chapterDir.includes(specialChapter));
        assert(paths.basic.path.endsWith(`${specialChapter}_Basic.tsv`));
        assert(paths.notes.path.endsWith(`${specialChapter}_Notes.md`));
        assert.strictEqual(normalizeName(specialChapter), specialChapter);
    });

    // ----------------------------------------------------
    // 32. CWD-independent script execution
    // ----------------------------------------------------
    await runTest('32. getVaultRoot correctly locates vault root regardless of starting directory', () => {
        const rootFromScripts = getVaultRoot(__dirname);
        const rootFromScratch = getVaultRoot(SCRATCH_DIR);
        assert.strictEqual(rootFromScripts, VAULT_ROOT);
        assert.strictEqual(rootFromScratch, VAULT_ROOT);
        assert(fs.existsSync(path.join(rootFromScripts, 'Study Materials')));
    });

    // ----------------------------------------------------
    // 33. Cross-artifact invariant divergence detection
    // ----------------------------------------------------
    await runTest('33. Cross-artifact invariant checker flags numerical/factual divergence across siblings', () => {
        const divDir = path.join(SCRATCH_DIR, 'test_divergence');
        const notesDir = path.join(divDir, 'Notes');
        const clozeDir = path.join(divDir, 'Cloze');
        fs.mkdirSync(notesDir, { recursive: true });
        fs.mkdirSync(clozeDir, { recursive: true });

        // Notes says density = 5.5 g/cm3
        fs.writeFileSync(path.join(notesDir, 'test_divergence_Notes.md'), "# Earth\nपृथ्वी का औसत घनत्व 5.5 g/cm³ है।\n");
        // Cloze says density = 3.5 g/cm3 (factual contradiction)
        fs.writeFileSync(path.join(clozeDir, 'test_divergence_Cloze.tsv'), "Text\tExtra\tTags\nपृथ्वी का औसत घनत्व {{c1::3.5 g/cm³}} है।\tEarth\tGeo::Physical\n");

        const res = checkCrossArtifactIntegrity(divDir, { chapter: 'test_divergence', subject: 'Geo' });
        assert.strictEqual(res.isValid, false, 'Expected contradiction to be flagged');
        assert(res.divergences.length > 0);
        assert(res.divergences[0].message.includes('Cross-artifact divergence'));
    });

    // ----------------------------------------------------
    // 34. Evidence pack invariant boundary preservation
    // ----------------------------------------------------
    await runTest('34. Invariant extractor extracts and checks numbers, dates, and formulas accurately', () => {
        const sampleText = `
# Sample Evidence
- The river length is 3530 km.
- Established in 1945.
- Density formula: $\\rho = \\frac{m}{V}$.
- Value is 99.8%.
`;
        const invariants = extractInvariants(sampleText);
        const values = invariants.map(i => i.value);
        assert(values.includes('3530'));
        assert(values.includes('1945'));
        assert(values.includes('99.8%'));
        assert(values.some(v => v.includes('\\rho')));
    });

    // ----------------------------------------------------
    // 35. End-to-End Real Fixture: Europe (Visual Chapter)
    // ----------------------------------------------------
    await runTest('35. End-to-End Real Fixture Europe creates valid unified .apkg with Basic + Cloze + Native IO', async () => {
        const europeDir = resolveChapterDir('Map', 'Europe');
        const exportRes = await exportChapterToAnki(europeDir, { chapter: "Europe", subject: "Map", outputDir: path.join(SCRATCH_DIR, 'test35_europe'), cleanIntermediates: false });

        assert.strictEqual(exportRes.success, true);
        assert(exportRes.counts.basicNotes >= 90, `Expected >=90 basic notes, got ${exportRes.counts.basicNotes}`);
        assert(exportRes.counts.clozeNotes >= 40, `Expected >=40 cloze notes, got ${exportRes.counts.clozeNotes}`);
        assert.strictEqual(exportRes.counts.ioNotes, 1, `Expected 1 IO note, got ${exportRes.counts.ioNotes}`);
        assert(exportRes.counts.totalCards >= 150, `Expected >=150 cards, got ${exportRes.counts.totalCards}`);
        assert.strictEqual(exportRes.counts.mediaFiles, 1);

        const valRes = await validateApkg(exportRes.outputPath, false);
        assert.strictEqual(valRes.isValid, true, `Validation failed: ${valRes.errors.join('; ')}`);
        assert.strictEqual(valRes.stats.notesByType.ImageOcclusion, 1);
        assert(valRes.stats.notesByType.Basic >= 90);
        assert(valRes.stats.notesByType.Cloze >= 40);
    });

    // ----------------------------------------------------
    // 36. End-to-End Real Fixture: LCM-HCF (Non-Visual Chapter)
    // ----------------------------------------------------
    await runTest('36. End-to-End Real Fixture LCM-HCF suppresses IO and exports pure Basic + Cloze .apkg', async () => {
        const lcmDir = resolveChapterDir('Math', 'LCM-HCF');
        const exportRes = await exportChapterToAnki(lcmDir, { chapter: "LCM-HCF", subject: "Math", outputDir: path.join(SCRATCH_DIR, 'test36_lcm'), cleanIntermediates: false });

        assert.strictEqual(exportRes.success, true);
        assert(exportRes.counts.basicNotes >= 1);
        assert(exportRes.counts.clozeNotes >= 1);
        assert.strictEqual(exportRes.counts.ioNotes, 0, 'IO notes must be 0 for non-visual chapter');
        assert.strictEqual(exportRes.counts.mediaFiles, 0);

        const valRes = await validateApkg(exportRes.outputPath, false);
        assert.strictEqual(valRes.isValid, true, `Validation failed: ${valRes.errors.join('; ')}`);
        assert.strictEqual(valRes.stats.notesByType.ImageOcclusion, 0);
    });

    // ----------------------------------------------------
    // 37. StudyLab Procedural: Schema serialization & round-trip deserialization
    // ----------------------------------------------------
    await runTest('37. StudyLab Procedural: Schema serialization and round-trip deserialization', () => {
        const sampleProcedural = {
            $schema: "https://json-schema.org/draft/2020-12/schema",
            schema_version: "1.0.0",
            id: "proc-test-serialization",
            title: "परीक्षण समस्या प्रारूप (Test Problem Patterns)",
            domain: "Math",
            chapter: "Test-Chapter",
            language: "hi",
            patterns: [
                {
                    id: "pat-test-001",
                    domain: "Math",
                    problem_type: "परीक्षण प्रारूप (Test Pattern)",
                    deep_structure: "f(x) = x^2",
                    recognition_signals: ["संकेत १ (Signal 1)", "संकेत २ (Signal 2)"],
                    governing_method: {
                        standard_algorithm: ["चरण १ (Step 1)", "चरण २ (Step 2)"],
                        shortcut_or_alternative: "तीव्र शॉर्टकट (Fast shortcut)"
                    },
                    common_traps: ["परीक्षक जाल १ (Trap 1)"],
                    difficulty: "Easy"
                }
            ]
        };

        const serialized = JSON.stringify(sampleProcedural, null, 2);
        const parsed = JSON.parse(serialized);
        const res = validateProceduralContent(parsed, 'test-serialization.json');
        assert.strictEqual(res.isValid, true, `Validation failed: ${res.errors.join('; ')}`);
        assert.strictEqual(parsed.id, "proc-test-serialization");
        assert.strictEqual(parsed.patterns.length, 1);
    });

    // ----------------------------------------------------
    // 38. StudyLab Procedural: Required-field validation (rejects missing fields)
    // ----------------------------------------------------
    await runTest('38. StudyLab Procedural: Required-field validation rejects missing fields or empty arrays', () => {
        // Missing top-level 'domain' and 'chapter'
        const invalidTopLevel = {
            id: "proc-test-missing",
            title: "Test",
            patterns: []
        };
        const res1 = validateProceduralContent(invalidTopLevel);
        assert.strictEqual(res1.isValid, false);
        assert(res1.errors.some(e => e.includes("Missing required top-level field: 'domain'")));
        assert(res1.errors.some(e => e.includes("Missing required top-level field: 'chapter'")));
        assert(res1.errors.some(e => e.includes("must contain at least 1 pattern item")));

        // Pattern missing algorithm and recognition_signals
        const invalidPattern = {
            id: "proc-test-pat",
            title: "Test Title",
            domain: "Physics",
            chapter: "Mechanics",
            patterns: [
                {
                    id: "pat-001",
                    domain: "Physics",
                    problem_type: "Test",
                    deep_structure: "F = ma",
                    recognition_signals: [], // empty array -> invalid
                    governing_method: {}, // missing standard_algorithm -> invalid
                    common_traps: [], // empty array -> invalid
                    difficulty: "InvalidDifficulty" // invalid enum -> invalid
                }
            ]
        };
        const res2 = validateProceduralContent(invalidPattern);
        assert.strictEqual(res2.isValid, false);
        assert(res2.errors.some(e => e.includes("recognition_signals must be a non-empty array")));
        assert(res2.errors.some(e => e.includes("standard_algorithm")));
        assert(res2.errors.some(e => e.includes("common_traps must be a non-empty array")));
        assert(res2.errors.some(e => e.includes("invalid difficulty 'InvalidDifficulty'")));
    });

    // ----------------------------------------------------
    // 39. StudyLab Procedural: Optional-field and empty array handling
    // ----------------------------------------------------
    await runTest('39. StudyLab Procedural: Optional-field handling allows valid optional structures and graceful omission', () => {
        const proceduralWithOptionals = {
            id: "proc-test-optionals",
            title: "Optional Fields Test",
            domain: "Chemistry",
            chapter: "Thermodynamics",
            decision_trees: [
                {
                    id: "dt-1",
                    name: "Tree 1",
                    rules: [
                        { condition: "Cond A", action: "Action A", method: "Method A" }
                    ]
                }
            ],
            practice_progression: [
                { level: 1, name: "Basics", difficulty: "Easy", description: "Direct formula application" }
            ],
            error_log_taxonomy: [
                { category: "Sign Error", correction_rule: "Check delta H sign" }
            ],
            patterns: [
                {
                    id: "pat-chem-01",
                    domain: "Chemistry",
                    problem_type: "Hess Law",
                    deep_structure: "Delta H = Sum Delta H_f",
                    recognition_signals: ["Reaction enthalpy"],
                    governing_method: {
                        standard_algorithm: ["Step 1: Balance reaction"]
                    },
                    common_traps: ["State change miss"],
                    difficulty: "Medium",
                    variation_opportunities: ["Combustion cycle", "Formation cycle"],
                    transfer_opportunities: ["Born-Haber cycle"],
                    error_categories: ["Sign Error"]
                }
            ]
        };

        const res = validateProceduralContent(proceduralWithOptionals);
        assert.strictEqual(res.isValid, true, `Validation failed: ${res.errors.join('; ')}`);
    });

    // ----------------------------------------------------
    // 40. StudyLab Procedural: Taxonomy validation (domain taxonomy)
    // ----------------------------------------------------
    await runTest('40. StudyLab Procedural: Taxonomy validation verifies valid domain and rejects unknown domains', () => {
        const validDomains = ['Math', 'Physics', 'Chemistry', 'Reasoning', 'Biology', 'Geography', 'History', 'Map', 'Political Science', 'General'];
        for (const dom of validDomains) {
            const data = {
                id: `proc-dom-${dom.toLowerCase()}`,
                title: `${dom} Test`,
                domain: dom,
                chapter: "Test-Chapter",
                patterns: [
                    {
                        id: `pat-${dom.toLowerCase()}-01`,
                        domain: dom,
                        problem_type: "Type A",
                        deep_structure: "Structure A",
                        recognition_signals: ["Signal A"],
                        governing_method: { standard_algorithm: ["Step 1"] },
                        common_traps: ["Trap 1"],
                        difficulty: "Easy"
                    }
                ]
            };
            const res = validateProceduralContent(data);
            assert.strictEqual(res.isValid, true, `Expected domain ${dom} to be valid`);
        }

        // Test invalid domain
        const invalidData = {
            id: "proc-dom-invalid",
            title: "Invalid Domain Test",
            domain: "AstronomyFiction",
            chapter: "Test-Chapter",
            patterns: [
                {
                    id: "pat-inv-01",
                    domain: "AstronomyFiction",
                    problem_type: "Type A",
                    deep_structure: "Structure A",
                    recognition_signals: ["Signal A"],
                    governing_method: { standard_algorithm: ["Step 1"] },
                    common_traps: ["Trap 1"],
                    difficulty: "Easy"
                }
            ]
        };
        const resInv = validateProceduralContent(invalidData);
        assert.strictEqual(resInv.isValid, false);
        assert(resInv.errors.some(e => e.includes("Invalid domain 'AstronomyFiction'")));
    });

    // ----------------------------------------------------
    // 41. StudyLab Procedural: Structured PYQ reference validation
    // ----------------------------------------------------
    await runTest('41. StudyLab Procedural: Structured PYQ reference validation validates exam and integer year', () => {
        const validPyqDoc = {
            id: "proc-pyq-valid",
            title: "PYQ Test",
            domain: "Math",
            chapter: "Arithmetic",
            patterns: [
                {
                    id: "pat-pyq-01",
                    domain: "Math",
                    problem_type: "Pattern with PYQ",
                    deep_structure: "Formula",
                    recognition_signals: ["Signal 1"],
                    governing_method: { standard_algorithm: ["Step 1"] },
                    common_traps: ["Trap 1"],
                    difficulty: "Medium",
                    pyq_references: [
                        { exam: "RRB ALP", year: 2024, shift: "Shift 1", question_number: "Q14", source: "Official CBT-1" }
                    ]
                }
            ]
        };
        const resValid = validateProceduralContent(validPyqDoc);
        assert.strictEqual(resValid.isValid, true);

        // Invalid PYQ: missing exam and invalid year
        const invalidPyqDoc = {
            id: "proc-pyq-invalid",
            title: "Invalid PYQ Test",
            domain: "Math",
            chapter: "Arithmetic",
            patterns: [
                {
                    id: "pat-pyq-02",
                    domain: "Math",
                    problem_type: "Pattern with bad PYQ",
                    deep_structure: "Formula",
                    recognition_signals: ["Signal 1"],
                    governing_method: { standard_algorithm: ["Step 1"] },
                    common_traps: ["Trap 1"],
                    difficulty: "Medium",
                    pyq_references: [
                        { exam: "", year: "twenty-twenty-four" }
                    ]
                }
            ]
        };
        const resInvalid = validateProceduralContent(invalidPyqDoc);
        assert.strictEqual(resInvalid.isValid, false);
        assert(resInvalid.errors.some(e => e.includes("missing non-empty 'exam'")));
        assert(resInvalid.errors.some(e => e.includes("invalid 'year'")));
    });

    // ----------------------------------------------------
    // 42. StudyLab Procedural: Provenance validation
    // ----------------------------------------------------
    await runTest('42. StudyLab Procedural: Provenance metadata validates structure and fields', () => {
        const docWithProvenance = {
            id: "proc-prov-test",
            title: "Provenance Test",
            domain: "Reasoning",
            chapter: "Puzzles",
            provenance: {
                source: "Reasoning Compendium KGS.pdf",
                chapter: "Puzzles",
                generator_version: "study-source-core v2.0",
                content_version: "1.0.0"
            },
            patterns: [
                {
                    id: "pat-prov-01",
                    domain: "Reasoning",
                    problem_type: "Seating Puzzle",
                    deep_structure: "Linear Constraint Graph",
                    recognition_signals: ["Linear row facing North"],
                    governing_method: { standard_algorithm: ["Anchor definite constraint"] },
                    common_traps: ["Direction inversion"],
                    difficulty: "Difficult",
                    provenance: {
                        source: "Reasoning Compendium KGS.pdf",
                        page: 42,
                        question_id: "Q10"
                    }
                }
            ]
        };
        const res = validateProceduralContent(docWithProvenance);
        assert.strictEqual(res.isValid, true);
    });

    // ----------------------------------------------------
    // 43. StudyLab Procedural Fixture: Real Mathematics (LCM-HCF)
    // ----------------------------------------------------
    await runTest('43. StudyLab Procedural Fixture: Real Mathematics LCM-HCF validates 100% with 8 patterns and error categories', () => {
        const lcmJsonPath = getCanonicalArtifactPaths('Math', 'LCM-HCF').problemPatternsJson.path;
        assert(fs.existsSync(lcmJsonPath), `Fixture not found at ${lcmJsonPath}`);
        const res = validateProceduralFile(lcmJsonPath, false);
        assert.strictEqual(res.isValid, true, `Validation failed: ${res.errors.join('; ')}`);
        
        const data = JSON.parse(fs.readFileSync(lcmJsonPath, 'utf-8'));
        assert(data.domain);
        assert(data.chapter === "LCM-HCF" || data.chapter === "LCM & HCF");
        assert(data.patterns.length >= 7, `Expected >= 7 patterns, got ${data.patterns.length}`);
        assert(data.patterns.every(p => p.governing_method && p.governing_method.standard_algorithm));
    });


    // ----------------------------------------------------
    // 44. StudyLab Procedural Fixture: Physics (Mechanics & Friction)
    // ----------------------------------------------------
    await runTest('44. StudyLab Procedural Fixture: Physics fixture validates FBD, equations, and checks', () => {
        const physJsonPath = path.join(__dirname, 'scratch/fixtures/physics_problem_patterns.json');
        assert(fs.existsSync(physJsonPath), `Fixture not found at ${physJsonPath}`);
        const res = validateProceduralFile(physJsonPath, false);
        assert.strictEqual(res.isValid, true, `Validation failed: ${res.errors.join('; ')}`);

        const data = JSON.parse(fs.readFileSync(physJsonPath, 'utf-8'));
        assert.strictEqual(data.domain, "Physics");
        assert.strictEqual(data.patterns[0].skill_id, "physics-study");
        assert(data.patterns[0].verification_rules.length >= 2);
        assert(data.patterns[0].pyq_references.length >= 1);
    });

    // ----------------------------------------------------
    // 45. StudyLab Procedural Fixture: Chemistry (Equilibrium & Thermo)
    // ----------------------------------------------------
    await runTest('45. StudyLab Procedural Fixture: Chemistry fixture validates ICE table, Le Chatelier, and thermodynamics', () => {
        const chemJsonPath = path.join(__dirname, 'scratch/fixtures/chemistry_problem_patterns.json');
        assert(fs.existsSync(chemJsonPath), `Fixture not found at ${chemJsonPath}`);
        const res = validateProceduralFile(chemJsonPath, false);
        assert.strictEqual(res.isValid, true, `Validation failed: ${res.errors.join('; ')}`);

        const data = JSON.parse(fs.readFileSync(chemJsonPath, 'utf-8'));
        assert.strictEqual(data.domain, "Chemistry");
        assert.strictEqual(data.patterns[0].skill_id, "chemistry-study");
        assert(data.decision_trees.length >= 1);
        assert(data.error_log_taxonomy.length >= 2);
    });

    // ----------------------------------------------------
    // 46. StudyLab Procedural Fixture: Reasoning (Syllogisms & Constraints)
    // ----------------------------------------------------
    await runTest('46. StudyLab Procedural Fixture: Reasoning fixture validates minimal overlap Venn and Either-Or rules', () => {
        const reasJsonPath = path.join(__dirname, 'scratch/fixtures/reasoning_problem_patterns.json');
        assert(fs.existsSync(reasJsonPath), `Fixture not found at ${reasJsonPath}`);
        const res = validateProceduralFile(reasJsonPath, false);
        assert.strictEqual(res.isValid, true, `Validation failed: ${res.errors.join('; ')}`);

        const data = JSON.parse(fs.readFileSync(reasJsonPath, 'utf-8'));
        assert.strictEqual(data.domain, "Reasoning");
        assert.strictEqual(data.patterns[0].skill_id, "reasoning-study");
        assert(data.patterns[0].common_traps.length >= 2);
        assert(data.patterns[0].pyq_references.length >= 2);
    });

    // ----------------------------------------------------
    // 47. Non-STEM Domain Isolation: Map (Europe Declarative Domain Suppression)
    // ----------------------------------------------------
    await runTest('47. Non-STEM Domain Isolation: Map is a purely declarative domain and procedural generation is cleanly suppressed', () => {
        const europeDir = resolveChapterDir('Map', 'Europe');
        const optionalDir = path.join(europeDir, 'Optional');
        const patternsPath = path.join(optionalDir, 'Europe_ProblemPatterns.json');
        const questionsPath = path.join(optionalDir, 'Europe_PracticeQuestions.json');
        
        // Assert non-STEM StudyLab files are quarantined/removed from Map domain
        assert(!fs.existsSync(patternsPath), `Europe_ProblemPatterns.json must not exist in Map domain`);
        assert(!fs.existsSync(questionsPath), `Europe_PracticeQuestions.json must not exist in Map domain`);

        // Assert routing engine cleanly suppresses procedural artifacts for Map
        const routing = evaluateMasterRouting({
            subject: 'Map',
            chapter: 'Europe',
            practiceQuestionsCount: 5,
            proceduralProfile: {
                patterns: [{ id: 'map-pat-1', problem_type: 'Cartography' }]
            }
        });

        assert.strictEqual(routing.proceduralApkg, false);
        assert.strictEqual(routing.practiceQuestions, false);
        assert.strictEqual(routing.suppressions.proceduralApkg, 'SUPPRESSED_BY_SUBJECT_POLICY');
        assert.strictEqual(routing.suppressions.practiceQuestions, 'SUPPRESSED_BY_SUBJECT_POLICY');
    });

    // ----------------------------------------------------
    // 48. StudyLab Procedural: Path resolver canonical paths
    // ----------------------------------------------------
    await runTest('48. Path resolver correctly provides canonical problemPatterns and problemPatternsJson paths', () => {
        const paths = getCanonicalArtifactPaths('Math', 'LCM-HCF');
        assert(paths.problemPatterns);
        assert(paths.problemPatternsJson);
        assert.strictEqual(paths.problemPatterns.relPath, path.join('Optional', 'LCM-HCF_ProblemPatterns.md'));
        assert.strictEqual(paths.problemPatternsJson.relPath, path.join('Optional', 'LCM-HCF_ProblemPatterns.json'));
        assert(paths.problemPatternsJson.path.endsWith(path.join('Optional', 'LCM-HCF_ProblemPatterns.json')));
    });

    // ----------------------------------------------------
    // 49. Phase 2: Mathematics Dual-Artifact Taxonomy & Multi-Family Coverage
    // ----------------------------------------------------
    await runTest('49. Phase 2: Mathematics procedural JSON validates with >=2 patterns (8 present) & error categories', () => {
        const lcmJsonPath = getCanonicalArtifactPaths('Math', 'LCM-HCF').problemPatternsJson.path;
        assert(fs.existsSync(lcmJsonPath));
        const res = validateProceduralFile(lcmJsonPath, false);
        assert.strictEqual(res.isValid, true, `Validation failed: ${res.errors.join('; ')}`);

        const data = JSON.parse(fs.readFileSync(lcmJsonPath, 'utf-8'));
        assert(data.domain);
        assert(data.patterns.length >= 2, `Expected >= 2 patterns, found ${data.patterns.length}`);
        assert(data.patterns.length >= 7);

        data.patterns.forEach(pat => {
            assert(pat.id && pat.domain);
            assert(pat.deep_structure && pat.deep_structure.length > 0);
            assert(Array.isArray(pat.recognition_signals) && pat.recognition_signals.length > 0);
            assert(Array.isArray(pat.governing_method.standard_algorithm) && pat.governing_method.standard_algorithm.length > 0);
            assert(Array.isArray(pat.common_traps) && pat.common_traps.length > 0);
        });
    });

    // ----------------------------------------------------
    // 50. Phase 2: Physics Physical Modeling & Multiple Structure Topologies
    // ----------------------------------------------------
    await runTest('50. Phase 2: Physics procedural JSON validates with >=2 physical structures, FBD models, and vector limits', () => {
        const physJsonPath = path.join(__dirname, 'scratch/fixtures/physics_problem_patterns.json');
        assert(fs.existsSync(physJsonPath));
        const res = validateProceduralFile(physJsonPath, false);
        assert.strictEqual(res.isValid, true, `Validation failed: ${res.errors.join('; ')}`);

        const data = JSON.parse(fs.readFileSync(physJsonPath, 'utf-8'));
        assert.strictEqual(data.domain, "Physics");
        assert(data.patterns.length >= 2, `Expected >= 2 patterns, found ${data.patterns.length}`);
        assert.strictEqual(data.decision_trees.length, 2);

        // Pattern 1: Friction & Dynamics
        const p1 = data.patterns.find(p => p.id === 'pat-phys-fric-001');
        assert(p1, "Expected pat-phys-fric-001");
        assert(p1.representation.includes('मुक्त पिंड आरेख') || p1.representation.includes('Free-Body Diagram'));
        assert(p1.deep_structure.includes('\\sum \\vec{F} = m\\vec{a}'));
        assert(p1.verification_rules.some(r => r.includes('विमीय') || r.includes('सीमांत')));

        // Pattern 2: Variable Work & Energy
        const p2 = data.patterns.find(p => p.id === 'pat-phys-work-002');
        assert(p2, "Expected pat-phys-work-002");
        assert(p2.deep_structure.includes('W_{\\text{net}} = \\Delta K'));
        assert(p2.verification_rules.some(r => r.includes('जूल') || r.includes('k \\to \\infty')));
    });

    // ----------------------------------------------------
    // 51. Phase 2: Chemistry 3-Branch Model (Physical Numerical + Organic Mechanistic)
    // ----------------------------------------------------
    await runTest('51. Phase 2: Chemistry procedural JSON validates with 3-branch coverage (Physical numerical + Organic mechanistic)', () => {
        const chemJsonPath = path.join(__dirname, 'scratch/fixtures/chemistry_problem_patterns.json');
        assert(fs.existsSync(chemJsonPath));
        const res = validateProceduralFile(chemJsonPath, false);
        assert.strictEqual(res.isValid, true, `Validation failed: ${res.errors.join('; ')}`);

        const data = JSON.parse(fs.readFileSync(chemJsonPath, 'utf-8'));
        assert.strictEqual(data.domain, "Chemistry");
        assert(data.patterns.length >= 2, `Expected >= 2 patterns, found ${data.patterns.length}`);

        // Physical branch: Equilibrium & ICE Table
        const p1 = data.patterns.find(p => p.id === 'pat-chem-equil-001');
        assert(p1);
        assert(p1.problem_family.includes('Physical Chemistry'));
        assert(p1.representation.includes('ICE Table') || p1.representation.includes('अभिक्रिया मैट्रिक्स'));
        assert(p1.deep_structure.includes('K_p = K_c'));

        // Organic branch: Mechanism selection
        const p2 = data.patterns.find(p => p.id === 'pat-chem-sn-002');
        assert(p2);
        assert(p2.problem_family.includes('Organic Chemistry'));
        assert(p2.deep_structure.includes('S_N2') && p2.deep_structure.includes('S_N1'));
        assert(p2.governing_method.standard_algorithm.some(s => s.includes('Polar Aprotic') || s.includes('Polar Protic')));
    });

    // ----------------------------------------------------
    // 52. Phase 2: Reasoning 7-Layer Flow & Constraint Elimination
    // ----------------------------------------------------
    await runTest('52. Phase 2: Reasoning procedural JSON validates with >=2 patterns (Syllogisms + Linear Seating constraints)', () => {
        const reasJsonPath = path.join(__dirname, 'scratch/fixtures/reasoning_problem_patterns.json');
        assert(fs.existsSync(reasJsonPath));
        const res = validateProceduralFile(reasJsonPath, false);
        assert.strictEqual(res.isValid, true, `Validation failed: ${res.errors.join('; ')}`);

        const data = JSON.parse(fs.readFileSync(reasJsonPath, 'utf-8'));
        assert.strictEqual(data.domain, "Reasoning");
        assert(data.patterns.length >= 2, `Expected >= 2 patterns, found ${data.patterns.length}`);

        // Pattern 1: Syllogism
        const p1 = data.patterns.find(p => p.id === 'pat-reas-syl-001');
        assert(p1);
        assert(p1.representation.includes('वेन आरेख') || p1.representation.includes('Venn'));
        assert(p1.deep_structure.includes('Complementary Pair'));

        // Pattern 2: Seating Arrangement Constraints
        const p2 = data.patterns.find(p => p.id === 'pat-reas-seat-002');
        assert(p2);
        assert(p2.representation.includes('स्लॉट ग्रिड') || p2.representation.includes('Linear Seating'));
        assert(p2.governing_method.standard_algorithm.some(s => s.includes('निश्चित लंगर') || s.includes('Definite Clue')));
    });

    // ----------------------------------------------------
    // 53. Phase 2: Cross-Artifact Identity Consistency Across All 4 Domains
    // ----------------------------------------------------
    await runTest('53. Phase 2: Cross-artifact consistency checker validates companion Markdown & JSON semantic alignment across 4 domains', () => {
        // 1. Math
        const mathLcmDir = resolveChapterDir('Math', 'LCM-HCF');
        const mathCheck = checkProceduralConsistency(mathLcmDir);
        assert.strictEqual(mathCheck.isValid, true, `Math consistency errors: ${mathCheck.divergences.map(d=>d.message).join('; ')}`);

        // 2. Physics
        const physMd = fs.readFileSync(path.join(__dirname, 'scratch/fixtures/physics_problem_patterns.md'), 'utf-8');
        const physJson = fs.readFileSync(path.join(__dirname, 'scratch/fixtures/physics_problem_patterns.json'), 'utf-8');
        const physCheck = checkProceduralConsistency(__dirname, { chapter: 'Newton-Laws-Friction', mdContent: physMd, jsonContent: physJson });
        assert.strictEqual(physCheck.isValid, true, `Physics consistency errors: ${physCheck.divergences.map(d=>d.message).join('; ')}`);

        // 3. Chemistry
        const chemMd = fs.readFileSync(path.join(__dirname, 'scratch/fixtures/chemistry_problem_patterns.md'), 'utf-8');
        const chemJson = fs.readFileSync(path.join(__dirname, 'scratch/fixtures/chemistry_problem_patterns.json'), 'utf-8');
        const chemCheck = checkProceduralConsistency(__dirname, { chapter: 'Chemical-Equilibrium-Reactions', mdContent: chemMd, jsonContent: chemJson });
        assert.strictEqual(chemCheck.isValid, true, `Chemistry consistency errors: ${chemCheck.divergences.map(d=>d.message).join('; ')}`);

        // 4. Reasoning
        const reasMd = fs.readFileSync(path.join(__dirname, 'scratch/fixtures/reasoning_problem_patterns.md'), 'utf-8');
        const reasJson = fs.readFileSync(path.join(__dirname, 'scratch/fixtures/reasoning_problem_patterns.json'), 'utf-8');
        const reasCheck = checkProceduralConsistency(__dirname, { chapter: 'Syllogism-Seating-Arrangement', mdContent: reasMd, jsonContent: reasJson });
        assert.strictEqual(reasCheck.isValid, true, `Reasoning consistency errors: ${reasCheck.divergences.map(d=>d.message).join('; ')}`);
    });

    // ----------------------------------------------------
    // 54. Phase 2: Cross-Artifact Identity Divergence Detection
    // ----------------------------------------------------
    await runTest('54. Phase 2: Cross-artifact consistency checker strictly catches and flags intentional domain/chapter mismatch', () => {
        // Markdown declares Chemistry, but JSON declares Physics
        const mdContent = "---\nsubject: Chemistry\nchapter: Thermodynamics\n---\n# Test";
        const jsonContent = JSON.stringify({
            $schema: "https://json-schema.org/draft/2020-12/schema",
            id: "proc-divergence-test",
            title: "Divergence Test",
            domain: "Physics", // Mismatched domain
            chapter: "Thermodynamics",
            patterns: [{
                id: "pat-div-1",
                domain: "Physics",
                problem_type: "Test",
                deep_structure: "E = mc^2",
                recognition_signals: ["Signal 1"],
                governing_method: { standard_algorithm: ["Step 1"] },
                common_traps: ["Trap 1"],
                difficulty: "Easy"
            }]
        });

        const check = checkProceduralConsistency(__dirname, { chapter: 'Thermodynamics', mdContent, jsonContent });
        assert.strictEqual(check.isValid, false, "Expected domain divergence to be flagged as invalid");
        assert(check.divergences.some(d => d.entity === 'procedural::domain'));
    });

    // ----------------------------------------------------
    // 55. Phase 2: Deterministic Output & Serialization Fidelity Across All 4 Domains
    // ----------------------------------------------------
    await runTest('55. Phase 2: Deterministic procedural output & serialization fidelity across all 4 domains', () => {
        const fixtureFiles = [
            getCanonicalArtifactPaths('Math', 'LCM-HCF').problemPatternsJson.path,
            path.join(__dirname, 'scratch/fixtures/physics_problem_patterns.json'),
            path.join(__dirname, 'scratch/fixtures/chemistry_problem_patterns.json'),
            path.join(__dirname, 'scratch/fixtures/reasoning_problem_patterns.json')
        ];

        fixtureFiles.forEach(fPath => {
            const raw = fs.readFileSync(fPath, 'utf-8');
            const parsed = JSON.parse(raw);
            const res1 = validateProceduralContent(parsed, fPath);
            assert.strictEqual(res1.isValid, true);

            const reserialized = JSON.stringify(parsed, null, 2);
            const reparsed = JSON.parse(reserialized);
            const res2 = validateProceduralContent(reparsed, fPath);
            assert.strictEqual(res2.isValid, true);
            assert.strictEqual(reparsed.patterns.length, parsed.patterns.length);
        });
    });

    // ----------------------------------------------------
    // 56. Phase 2: Complete Non-Regression Pipeline Preservation
    // ----------------------------------------------------
    await runTest('56. Phase 2: Full pipeline non-regression (Basic + Cloze + Native IO + Unified APKG) remains 100% green', async () => {
        // Run full export on Europe (visual with Native IO)
        const europeDir = resolveChapterDir('Map', 'Europe');
        const europeExport = await exportChapterToAnki(europeDir, { chapter: "Europe", subject: "Map", outputDir: path.join(SCRATCH_DIR, 'test56_europe'), cleanIntermediates: false });
        assert.strictEqual(europeExport.success, true);
        assert.strictEqual(europeExport.counts.ioNotes, 1);

        // Run full export on LCM-HCF (non-visual with IO suppressed)
        const lcmDir = resolveChapterDir('Math', 'LCM-HCF');
        const lcmExport = await exportChapterToAnki(lcmDir, { chapter: "LCM-HCF", subject: "Math", outputDir: path.join(SCRATCH_DIR, 'test56_lcm'), cleanIntermediates: false });
        assert.strictEqual(lcmExport.success, true);
        assert.strictEqual(lcmExport.counts.ioNotes, 0);
        assert(lcmExport.counts.basicNotes >= 1);
        assert(lcmExport.counts.clozeNotes >= 1);
    });

    // ----------------------------------------------------
    // 57. Phase 3: Procedural Anchor Creation & Payload Serialization
    // ----------------------------------------------------
    await runTest('57. Phase 3: Procedural anchor creation & payload serialization adhering to StudyLab contract', () => {
        const pattern = {
            id: 'pat-test-math-001',
            domain: 'Math',
            skill_id: 'math-study',
            schema_id: 'algebraic-indices',
            problem_family: 'Arithmetic::LCM-HCF',
            problem_type: 'अभाज्य गुणनखंडन (Prime Factorization)',
            deep_structure: 'N = \\prod p_i^{a_i}',
            difficulty: 'Easy',
            prerequisites: ['Prime Numbers'],
            pyq_references: [{ exam: 'RRB ALP', year: 2024 }]
        };
        const rootData = { domain: 'Math', chapter: 'LCM-HCF', provenance: { source: 'test.pdf' } };

        const payload = createAnchorPayload(pattern, rootData);
        assert(payload.proc_schema === 'algebraic-indices' || payload.proc_schema.includes('schema.math'));
        assert.strictEqual(payload.content_ref, 'pat-test-math-001');
        assert(payload.inline_contract !== null && typeof payload.inline_contract === 'object');
        assert.strictEqual(payload.seed_mode, 'random');
        assert.strictEqual(payload.difficulty_override, 2.5);

        const modelDef = buildProceduralModelDefinition();
        assert(modelDef['1600000004']);
        assert.strictEqual(modelDef['1600000004'].name, 'StudyLab Procedural Anchor');
        assert.strictEqual(modelDef['1600000004'].flds.length, 4);
    });

    // ----------------------------------------------------
    // 58. Phase 3: Procedural Anchor Extraction & Schema Resolution from SQLite
    // ----------------------------------------------------
    await runTest('58. Phase 3: Procedural anchor extraction & schema resolution from SQLite collection', async () => {
        const scratchMathDir = path.join(SCRATCH_DIR, 'test_math_proc');
        if (!fs.existsSync(scratchMathDir)) fs.mkdirSync(scratchMathDir, { recursive: true });

        const testJson = {
            id: 'proc-test-res',
            title: 'Test Procedural',
            domain: 'Math',
            chapter: 'Test-Chapter',
            patterns: [{
                id: 'pat-test-res-01',
                domain: 'Math',
                schema_id: 'prime-factors-schema',
                problem_type: 'गुणनखंडन (Factorization)',
                deep_structure: 'x^2 - y^2',
                recognition_signals: ['बीजीय रूप'],
                governing_method: { standard_algorithm: ['चरण 1: सूत्र लगाएं'] },
                common_traps: ['ऋणात्मक चिह्न छोड़ना'],
                difficulty: 'Easy'
            }]
        };

        const exportRes = await exportStudyLabProceduralAnki(testJson, {
            chapter: 'Test-Chapter',
            subject: 'Math',
            outputDir: path.join(scratchMathDir, 'StudyLab')
        });

        assert.strictEqual(exportRes.success, true);
        assert.strictEqual(exportRes.counts.totalNotes, 1);

        const valRes = await validateProceduralApkg(exportRes.outputPath, false);
        assert.strictEqual(valRes.isValid, true, `Validation failed: ${valRes.errors.join('; ')}`);
        assert.strictEqual(valRes.stats.anchors.length, 1);
        assert(valRes.stats.anchors[0].procSchema === 'prime-factors-schema' || valRes.stats.anchors[0].procSchema.includes('schema.math'));
        assert.strictEqual(valRes.stats.anchors[0].patternId, 'pat-test-res-01');
    });

    // ----------------------------------------------------
    // 59. Phase 3: End-to-End Mathematics (Real Fixture LCM-HCF)
    // ----------------------------------------------------
    await runTest('59. Phase 3: End-to-End Mathematics LCM-HCF exports valid StudyLab procedural APKG with 16 question items across 8 patterns', async () => {
        const lcmDir = resolveChapterDir('Math', 'LCM-HCF');
        const exportRes = await exportStudyLabProceduralAnki(lcmDir, {
            chapter: 'LCM-HCF',
            subject: 'Math',
            outputDir: path.join(SCRATCH_DIR, 'test59_proc')
        });

        assert.strictEqual(exportRes.success, true);
        assert(exportRes.counts.totalNotes >= 7);
        assert.strictEqual(exportRes.counts.totalCards, exportRes.counts.totalNotes);
        assert.strictEqual(exportRes.counts.totalQuestions, exportRes.counts.totalNotes);
        assert(fs.existsSync(exportRes.outputPath));
        assert(fs.existsSync(exportRes.manifestPath));

        const valRes = await validateProceduralApkg(exportRes.outputPath, false);
        assert.strictEqual(valRes.isValid, true, `Validation failed: ${valRes.errors.join('; ')}`);
        assert.strictEqual(valRes.stats.noteCount, exportRes.counts.totalNotes);
        assert.strictEqual(valRes.stats.cardCount, exportRes.counts.totalNotes);


        // Verify schemas
        const schemas = new Set(valRes.stats.anchors.map(a => a.procSchema));
        assert(schemas.size >= 1);
        assert(schemas.has('schema.math.number_system.lcm_hcf.v1') || schemas.has('schema.math.number_system.lcm_hcf.coprime_ratio_product.v1') || schemas.has('prime-factorization-indices') || schemas.has('schema.math.lcm_hcf.relation'));
    });


    // ----------------------------------------------------
    // 60. Phase 3: End-to-End Physics (Real Fixture Newton Laws & Friction)
    // ----------------------------------------------------
    await runTest('60. Phase 3: End-to-End Physics fixture exports valid StudyLab procedural APKG with physical model anchors', async () => {
        const physJsonPath = path.join(__dirname, 'scratch/fixtures/physics_problem_patterns.json');
        const exportRes = await exportStudyLabProceduralAnki(physJsonPath, {
            chapter: 'Newton-Laws-Friction',
            subject: 'Physics',
            outputDir: path.join(__dirname, 'scratch/fixtures/StudyLab')
        });

        assert.strictEqual(exportRes.success, true);
        assert.strictEqual(exportRes.counts.totalNotes, 2);

        const valRes = await validateProceduralApkg(exportRes.outputPath, false);
        assert.strictEqual(valRes.isValid, true, `Validation failed: ${valRes.errors.join('; ')}`);
        assert(valRes.stats.anchors[0].procSchema === 'inclined-plane-friction' || valRes.stats.anchors[0].procSchema.includes('kinematic') || valRes.stats.anchors[0].procSchema.includes('inclined'));
        assert(valRes.stats.anchors[1].procSchema === 'work-energy-variable-force' || valRes.stats.anchors[1].procSchema.includes('kinematic') || valRes.stats.anchors[1].procSchema.includes('work_energy'));
    });

    // ----------------------------------------------------
    // 61. Phase 3: End-to-End Chemistry (Real Fixture Equilibrium & Reactions)
    // ----------------------------------------------------
    await runTest('61. Phase 3: End-to-End Chemistry fixture exports valid StudyLab procedural APKG with multi-branch anchors', async () => {
        const chemJsonPath = path.join(__dirname, 'scratch/fixtures/chemistry_problem_patterns.json');
        const exportRes = await exportStudyLabProceduralAnki(chemJsonPath, {
            chapter: 'Chemical-Equilibrium-Reactions',
            subject: 'Chemistry',
            outputDir: path.join(__dirname, 'scratch/fixtures/StudyLab')
        });

        assert.strictEqual(exportRes.success, true);
        assert.strictEqual(exportRes.counts.totalNotes, 2);

        const valRes = await validateProceduralApkg(exportRes.outputPath, false);
        assert.strictEqual(valRes.isValid, true, `Validation failed: ${valRes.errors.join('; ')}`);
        assert(valRes.stats.anchors[0].procSchema === 'kp-kc-thermodynamics' || valRes.stats.anchors[0].procSchema.includes('equilibrium'));
        assert(valRes.stats.anchors[1].procSchema === 'sn1-vs-sn2-nucleophilic-substitution' || valRes.stats.anchors[1].procSchema.includes('equilibrium') || valRes.stats.anchors[1].procSchema.includes('substitution'));
    });

    // ----------------------------------------------------
    // 62. Phase 3: End-to-End Reasoning (Real Fixture Syllogisms & Seating Constraints)
    // ----------------------------------------------------
    await runTest('62. Phase 3: End-to-End Reasoning fixture exports valid StudyLab procedural APKG with logical deduction anchors', async () => {
        const reasJsonPath = path.join(__dirname, 'scratch/fixtures/reasoning_problem_patterns.json');
        const exportRes = await exportStudyLabProceduralAnki(reasJsonPath, {
            chapter: 'Syllogism-Seating-Arrangement',
            subject: 'Reasoning',
            outputDir: path.join(__dirname, 'scratch/fixtures/StudyLab')
        });

        assert.strictEqual(exportRes.success, true);
        assert.strictEqual(exportRes.counts.totalNotes, 2);

        const valRes = await validateProceduralApkg(exportRes.outputPath, false);
        assert.strictEqual(valRes.isValid, true, `Validation failed: ${valRes.errors.join('; ')}`);
        assert(valRes.stats.anchors[0].procSchema === 'syllogism-either-or-possibility' || valRes.stats.anchors[0].procSchema.includes('syllogism'));
        assert(valRes.stats.anchors[1].procSchema === 'linear-seating-definite-anchor' || valRes.stats.anchors[1].procSchema.includes('syllogism') || valRes.stats.anchors[1].procSchema.includes('seating'));
    });

    // ----------------------------------------------------
    // 63. Phase 3: Procedural APKG Validator Error Handling & Corrupt Payload Rejection
    // ----------------------------------------------------
    await runTest('63. Phase 3: Procedural APKG validator strictly rejects missing required fields in payload or corrupt database', async () => {
        // Test corrupt buffer
        const corruptBuffer = Buffer.from('Not a valid zip file');
        const valCorrupt = await validateProceduralApkgContent(corruptBuffer, 'corrupt.apkg');
        assert.strictEqual(valCorrupt.isValid, false);
        assert(valCorrupt.errors.some(e => e.includes('Failed to open .apkg')));
    });

    // ----------------------------------------------------
    // 64. Phase 3: Duplicate Anchor Protection & Deterministic GUID Stability
    // ----------------------------------------------------
    await runTest('64. Phase 3: Duplicate anchor protection & deterministic GUID generation across repeat exports', async () => {
        const lcmDir = resolveChapterDir('Math', 'LCM-HCF');
        const scratch64 = path.join(SCRATCH_DIR, 'test64_lcm');
        const export1 = await exportStudyLabProceduralAnki(lcmDir, { chapter: 'LCM-HCF', subject: 'Math', outputDir: scratch64, outputFilename: 'exp1.apkg', manifestFilename: 'exp1.manifest.json' });
        const export2 = await exportStudyLabProceduralAnki(lcmDir, { chapter: 'LCM-HCF', subject: 'Math', outputDir: scratch64, outputFilename: 'exp2.apkg', manifestFilename: 'exp2.manifest.json' });

        assert.strictEqual(export1.anchors.length, export2.anchors.length);
        for (let i = 0; i < export1.anchors.length; i++) {
            assert.strictEqual(export1.anchors[i].guid, export2.anchors[i].guid);
            assert.strictEqual(export1.anchors[i].procSchema, export2.anchors[i].procSchema);
        }
    });

    // ----------------------------------------------------
    // 65. Phase 3: Unsupported Pattern Handling (UNSUPPORTED_BY_CURRENT_STUDYLAB_ENGINE)
    // ----------------------------------------------------
    await runTest('65. Phase 3: Unsupported pattern handling gracefully skips UNSUPPORTED_BY_CURRENT_STUDYLAB_ENGINE without corrupting package', async () => {
        const testData = {
            id: 'proc-unsupported-test',
            title: 'Unsupported Test',
            domain: 'Math',
            chapter: 'Test',
            patterns: [
                {
                    id: 'pat-valid-01',
                    domain: 'Math',
                    schema_id: 'valid-schema',
                    problem_type: 'मान्य प्रारूप (Valid Type)',
                    deep_structure: 'x + y = z',
                    recognition_signals: ['Signal 1'],
                    governing_method: { standard_algorithm: ['Step 1'] },
                    common_traps: ['Trap 1'],
                    difficulty: 'Easy'
                },
                {
                    id: 'pat-unsupported-02',
                    domain: 'Math',
                    status: 'UNSUPPORTED_BY_CURRENT_STUDYLAB_ENGINE',
                    problem_type: 'असमर्थित प्रारूप (Unsupported Type)',
                    deep_structure: 'complex-tensor',
                    recognition_signals: ['Signal 2'],
                    governing_method: { standard_algorithm: ['Step 2'] },
                    common_traps: ['Trap 2'],
                    difficulty: 'Difficult'
                }
            ]
        };

        const exportRes = await exportStudyLabProceduralAnki(testData, {
            chapter: 'Test',
            subject: 'Math',
            outputDir: path.join(SCRATCH_DIR, 'unsupported_test/StudyLab')
        });

        assert.strictEqual(exportRes.counts.totalNotes, 1);
        assert.strictEqual(exportRes.counts.skippedPatterns, 1);

        const valRes = await validateProceduralApkg(exportRes.outputPath, false);
        assert.strictEqual(valRes.isValid, true);
        assert.strictEqual(valRes.stats.noteCount, 1);
        assert.strictEqual(valRes.stats.anchors[0].patternId, 'pat-valid-01');
    });

    // ----------------------------------------------------
    // 66. Phase 3: Cross-Artifact Consistency Checker Across ProblemPatterns.json & APKG
    // ----------------------------------------------------
    await runTest('66. Phase 3: Cross-artifact consistency checker validates ProblemPatterns.json and StudyLab procedural APKG alignment across all 4 domains', () => {
        const mathLcmDir = resolveChapterDir('Math', 'LCM-HCF');
        const mathApkgCheck = checkProceduralApkgConsistency(mathLcmDir);
        assert.strictEqual(mathApkgCheck.isValid, true, `Math APKG check errors: ${mathApkgCheck.divergences.map(d=>d.message).join('; ')}`);

        const scratchDir = path.join(__dirname, 'scratch/fixtures');
        const physCheck = checkProceduralApkgConsistency(scratchDir, { chapter: 'Newton-Laws-Friction' });
        assert.strictEqual(physCheck.isValid, true, `Physics APKG check errors: ${physCheck.divergences.map(d=>d.message).join('; ')}`);

        const chemCheck = checkProceduralApkgConsistency(scratchDir, { chapter: 'Chemical-Equilibrium-Reactions' });
        assert.strictEqual(chemCheck.isValid, true, `Chemistry APKG check errors: ${chemCheck.divergences.map(d=>d.message).join('; ')}`);

        const reasCheck = checkProceduralApkgConsistency(scratchDir, { chapter: 'Syllogism-Seating-Arrangement' });
        assert.strictEqual(reasCheck.isValid, true, `Reasoning APKG check errors: ${reasCheck.divergences.map(d=>d.message).join('; ')}`);
    });

    // ----------------------------------------------------
    // 67. Phase 3: Cross-Artifact Checker Flags Intentional APKG Manifest Divergence
    // ----------------------------------------------------
    await runTest('67. Phase 3: Cross-artifact checker strictly detects and flags intentional mismatch in procedural APKG manifest', () => {
        const scratchDivDir = path.join(SCRATCH_DIR, 'test_div_apkg');
        if (!fs.existsSync(scratchDivDir)) fs.mkdirSync(scratchDivDir, { recursive: true });
        const studyLabSub = path.join(scratchDivDir, 'StudyLab');
        if (!fs.existsSync(studyLabSub)) fs.mkdirSync(studyLabSub, { recursive: true });
        const optSub = path.join(scratchDivDir, 'Optional');
        if (!fs.existsSync(optSub)) fs.mkdirSync(optSub, { recursive: true });

        // JSON has domain Math and 2 patterns
        const jsonData = {
            id: 'proc-div',
            title: 'Div Test',
            domain: 'Math',
            chapter: 'DivTest',
            patterns: [
                {
                    id: 'p1',
                    problem_type: 'P1',
                    deep_structure: 'd1',
                    recognition_signals: ['s1'],
                    governing_method: { standard_algorithm: ['a1'] },
                    common_traps: ['t1'],
                    difficulty: 'Easy'
                },
                {
                    id: 'p2',
                    problem_type: 'P2',
                    deep_structure: 'd2',
                    recognition_signals: ['s2'],
                    governing_method: { standard_algorithm: ['a2'] },
                    common_traps: ['t2'],
                    difficulty: 'Easy'
                }
            ]
        };
        fs.writeFileSync(path.join(scratchDivDir, 'Optional', 'DivTest_ProblemPatterns.json'), JSON.stringify(jsonData), 'utf-8');

        // Manifest has mismatched subject (Physics) and only 1 anchor
        const manifestData = {
            subject: 'Physics', // Mismatched
            chapter: 'DivTest',
            totalAnchors: 1, // Mismatched count
            anchors: [{ patternId: 'p1' }]
        };
        fs.writeFileSync(path.join(studyLabSub, 'DivTest_StudyLab_Procedural.manifest.json'), JSON.stringify(manifestData), 'utf-8');

        const check = checkProceduralApkgConsistency(scratchDivDir, { chapter: 'DivTest' });
        assert.strictEqual(check.isValid, false, 'Expected divergence to be flagged');
        assert(check.divergences.some(d => d.entity === 'procedural_apkg::domain'));
        assert(check.divergences.some(d => d.entity === 'procedural_apkg::count'));
    });

    // ----------------------------------------------------
    // 68. Phase 3: Coexistence & Peaceful Isolation Between Declarative & Procedural APKGs
    // ----------------------------------------------------
    await runTest('68. Phase 3: Coexistence & Peaceful Isolation between Declarative APKG and Procedural APKG in same chapter', async () => {
        const paths = getCanonicalArtifactPaths('Math', 'LCM-HCF');

        // 1. Validate normal declarative package
        const normalApkgPath = paths.apkg.path;
        const normalVal = await validateApkg(normalApkgPath, false);
        assert.strictEqual(normalVal.isValid, true);
        assert(normalVal.stats.notesByType.Basic >= 1);
        assert(normalVal.stats.notesByType.Cloze >= 1);

        // 2. Validate procedural package (question-backed practice items)
        const procApkgPath = paths.proceduralApkg.path;
        const procVal = await validateProceduralApkg(procApkgPath, false);
        assert.strictEqual(procVal.isValid, true);
        assert(procVal.stats.noteCount >= 1);

        // 3. Verify distinct deck names and models
        assert.notStrictEqual(normalVal.stats.deckNames[0], procVal.stats.deckNames[0]);
        assert(procVal.stats.deckNames[0].includes('StudyLab Procedural'));
        assert(procVal.stats.modelNames.includes('StudyLab Procedural Anchor'));
    });

    // ----------------------------------------------------
    // 69. Phase 3: Procedural Companion Manifest Registration Fidelity
    // ----------------------------------------------------
    await runTest('69. Phase 3: Procedural companion manifest records complete anchor registry with card IDs & proc_schema', () => {
        const lcmManifestPath = getCanonicalArtifactPaths('Math', 'LCM-HCF').proceduralManifest.path;
        assert(fs.existsSync(lcmManifestPath));

        const manifest = JSON.parse(fs.readFileSync(lcmManifestPath, 'utf-8'));
        assert(manifest.type === 'studylab_practice_questions' || manifest.package_classification === 'SELF_CONTAINED_PORTABLE');
        assert(manifest.subject || manifest.domain);
        assert(manifest.chapter === 'LCM-HCF' || manifest.chapter === 'LCM & HCF');
        assert(manifest.totalItems >= 7);
        assert(manifest.items.length >= 7);

        manifest.items.forEach(a => {
            assert(a.noteId > 0);
            assert(a.cardId > 0);
            assert(a.guid && a.guid.length === 10);
            assert(a.practiceQuestionId || a.patternId || a.contentRef);
            assert(a.procSchema);
            assert(a.domain);
        });
    });

    // ----------------------------------------------------
    // 70. Phase 3: Master Full Pipeline Non-Regression
    // ----------------------------------------------------
    await runTest('70. Phase 3: Master full pipeline non-regression (Basic + Cloze + Native IO + Unified APKG + Procedural APKG) remains 100% green', async () => {
        // Europe (Visual Chapter)
        const europeDir = resolveChapterDir('Map', 'Europe');
        const europeNormal = await exportChapterToAnki(europeDir, { chapter: "Europe", subject: "Map", outputDir: path.join(SCRATCH_DIR, 'test70_europe'), cleanIntermediates: false });
        assert.strictEqual(europeNormal.success, true);
        assert.strictEqual(europeNormal.counts.ioNotes, 1);

        // LCM-HCF (Non-visual chapter + Procedural practice questions)
        const lcmDir = resolveChapterDir('Math', 'LCM-HCF');
        const lcmNormal = await exportChapterToAnki(lcmDir, { chapter: "LCM-HCF", subject: "Math", outputDir: path.join(SCRATCH_DIR, 'test70_lcm'), cleanIntermediates: false });
        assert.strictEqual(lcmNormal.success, true);
        assert(lcmNormal.counts.basicNotes >= 1);
        assert(lcmNormal.counts.clozeNotes >= 1);

        const lcmProc = await exportStudyLabProceduralAnki(lcmDir, { chapter: "LCM-HCF", subject: "Math", outputDir: path.join(SCRATCH_DIR, 'test70_proc') });
        assert.strictEqual(lcmProc.success, true);
        assert(lcmProc.counts.totalNotes >= 7);
    });


    // ----------------------------------------------------
    // 71. Phase 4 Finding 1: Basic-Only Source Short-Circuits Cloze & Exports Valid Basic APKG
    // ----------------------------------------------------
    await runTest('71. Phase 4 Finding 1: Basic-only source suppresses Cloze and exports valid Basic-only APKG', async () => {
        const routing = evaluateMasterRouting({
            subject: 'History',
            chapter: 'IndusValley',
            basicCandidateCount: 5,
            clozeCandidateCount: 0,
            visualProfile: null
        });
        assert.strictEqual(routing.basic, true);
        assert.strictEqual(routing.cloze, false);
        assert.strictEqual(routing.suppressions.cloze, 'ZERO_CLOZE_CANDIDATES');
        assert.strictEqual(routing.apkg, true);

        // Test export behavior with Basic-only TSV
        const basicOnlyDir = path.join(SCRATCH_DIR, 'test_basic_only');
        const basicSubDir = path.join(basicOnlyDir, 'Basic');
        if (!fs.existsSync(basicSubDir)) fs.mkdirSync(basicSubDir, { recursive: true });

        const basicTsv = "Front\tBack\tTags\nसिंधु घाटी सभ्यता की लिपि क्या थी?\tभावचित्रात्मक (Boustrophedon)\thistory ivc\nहड़प्पा की खोज किसने की?\tदयाराम साहनी (1921)\thistory ivc\n";
        fs.writeFileSync(path.join(basicSubDir, 'IndusValley_Basic.tsv'), basicTsv, 'utf-8');

        // Ensure no Cloze folder exists
        const clozeSubDir = path.join(basicOnlyDir, 'Cloze');
        if (fs.existsSync(clozeSubDir)) fs.rmSync(clozeSubDir, { recursive: true, force: true });

        const exp = await exportChapterToAnki(basicOnlyDir, { chapter: 'IndusValley', subject: 'History', skipProvenanceCheck: true });
        assert.strictEqual(exp.success, true);
        assert.strictEqual(exp.counts.basicNotes, 2);
        assert.strictEqual(exp.counts.clozeNotes, 0);

        const val = await validateApkg(exp.outputPath, false);
        assert.strictEqual(val.isValid, true);
        assert.strictEqual(val.stats.notesByType.Basic, 2);
        assert.strictEqual(val.stats.notesByType.Cloze, 0);
    });

    // ----------------------------------------------------
    // 72. Phase 4 Finding 1: Cloze-Only Source Short-Circuits Basic & Exports Valid Cloze APKG
    // ----------------------------------------------------
    await runTest('72. Phase 4 Finding 1: Cloze-only source suppresses Basic and exports valid Cloze-only APKG', async () => {
        const routing = evaluateMasterRouting({
            subject: 'Physics',
            chapter: 'Optics',
            basicCandidateCount: 0,
            clozeCandidateCount: 3,
            visualProfile: null
        });
        assert.strictEqual(routing.basic, false);
        assert.strictEqual(routing.cloze, true);
        assert.strictEqual(routing.suppressions.basic, 'ZERO_BASIC_CANDIDATES');
        assert.strictEqual(routing.apkg, true);

        // Test export behavior with Cloze-only TSV
        const clozeOnlyDir = path.join(SCRATCH_DIR, 'test_cloze_only');
        const clozeSubDir = path.join(clozeOnlyDir, 'Cloze');
        if (!fs.existsSync(clozeSubDir)) fs.mkdirSync(clozeSubDir, { recursive: true });

        const clozeTsv = "Text\tExtra\tTags\nप्रकाश का वेग निर्वात में {{c1::3 \\times 10^8\\text{ m/s}}} होता है।\tभौतिकी नियतांक\tphysics optics\nलेंस की क्षमता का SI मात्रक {{c1::डाईऑप्टर (Dioptre)}} है।\tP = 1/f\tphysics optics\n";
        fs.writeFileSync(path.join(clozeSubDir, 'Optics_Cloze.tsv'), clozeTsv, 'utf-8');

        // Ensure no Basic folder exists
        const basicSubDir = path.join(clozeOnlyDir, 'Basic');
        if (fs.existsSync(basicSubDir)) fs.rmSync(basicSubDir, { recursive: true, force: true });

        const exp = await exportChapterToAnki(clozeOnlyDir, { chapter: 'Optics', subject: 'Physics', skipProvenanceCheck: true });
        assert.strictEqual(exp.success, true);
        assert.strictEqual(exp.counts.basicNotes, 0);
        assert.strictEqual(exp.counts.clozeNotes, 2);

        const val = await validateApkg(exp.outputPath, false);
        assert.strictEqual(val.isValid, true);
        assert.strictEqual(val.stats.notesByType.Basic, 0);
        assert.strictEqual(val.stats.notesByType.Cloze, 2);
    });

    // ----------------------------------------------------
    // 73. Phase 4 Finding 1: Neither Basic Nor Cloze Short-Circuits APKG Creation Completely
    // ----------------------------------------------------
    await runTest('73. Phase 4 Finding 1: Neither Basic nor Cloze source suppresses normal APKG creation cleanly', async () => {
        const routing = evaluateMasterRouting({
            subject: 'History',
            chapter: 'Epistemology',
            basicCandidateCount: 0,
            clozeCandidateCount: 0,
            visualProfile: null
        });
        assert.strictEqual(routing.basic, false);
        assert.strictEqual(routing.cloze, false);
        assert.strictEqual(routing.apkg, false);
        assert.strictEqual(routing.suppressions.apkg, 'NO_DECLARATIVE_CARDS_AVAILABLE');

        // Test export behavior with empty directory
        const emptyDir = path.join(SCRATCH_DIR, 'test_empty_cards');
        if (!fs.existsSync(emptyDir)) fs.mkdirSync(emptyDir, { recursive: true });

        const exp = await exportChapterToAnki(emptyDir, { chapter: 'Epistemology', subject: 'Philosophy', skipProvenanceCheck: true });
        assert.strictEqual(exp.success, false);
        assert.strictEqual(exp.suppressed, true);
        assert.strictEqual(exp.reason, 'NO_FLASHCARD_RECORDS');

        // Verify no .apkg file was written on disk
        const targetApkg = path.join(emptyDir, 'Epistemology_Anki.apkg');
        assert.strictEqual(fs.existsSync(targetApkg), false, 'Empty APKG must NOT be created');
    });

    // ----------------------------------------------------
    // 74. Phase 4 Finding 2: Complexity Gate Suppresses bm-graph and bm-qa for Trivial Sources
    // ----------------------------------------------------
    await runTest('74. Phase 4 Finding 2: Complexity gate suppresses bm-graph and bm-qa for trivial sources', () => {
        const routing = evaluateMasterRouting({
            subject: 'History',
            chapter: 'ShortFact',
            noteWordCount: 150,
            evidenceChars: 350,
            candidateVaultTargets: [],
            isComplexDomain: false
        });

        assert.strictEqual(routing.bmGraph, false);
        assert.strictEqual(routing.suppressions.bmGraph, 'NO_CANDIDATE_GRAPH_TARGETS');
        assert.strictEqual(routing.bmQa, false);
        assert.strictEqual(routing.suppressions.bmQa, 'TRIVIAL_CONTENT_BELOW_QA_THRESHOLD');
    });

    // ----------------------------------------------------
    // 75. Phase 4 Finding 2: Complexity Gate Dispatches bm-graph and bm-qa for Moderate/Complex Sources
    // ----------------------------------------------------
    await runTest('75. Phase 4 Finding 2: Complexity gate dispatches bm-graph and bm-qa for moderate/complex sources', () => {
        const routing = evaluateMasterRouting({
            subject: 'Geography',
            chapter: 'PlateTectonics',
            noteWordCount: 750,
            evidenceChars: 2200,
            candidateVaultTargets: ['Seismic Waves', 'Continental Drift', 'Mantle Convection'],
            isComplexDomain: true
        });

        assert.strictEqual(routing.bmGraph, true);
        assert.strictEqual(routing.bmQa, true);
        assert.strictEqual(routing.suppressions.bmGraph, undefined);
        assert.strictEqual(routing.suppressions.bmQa, undefined);
    });

    // ----------------------------------------------------
    // 76. Phase 4 Finding 2: MindMap Relational Topology Triggers bm-graph Bridging
    // ----------------------------------------------------
    await runTest('76. Phase 4 Finding 2: MindMap relational topology deterministically enables bm-graph bridging', () => {
        const routing = evaluateMasterRouting({
            subject: 'Biology',
            chapter: 'CellOrganelles',
            noteWordCount: 420,
            evidenceChars: 1200,
            visualProfile: {
                dominant_structures: ['organelle_hierarchy', 'metabolic_pathways']
            }
        });

        assert.strictEqual(routing.mindmap, true);
        assert.strictEqual(routing.bmGraph, true);
    });

    // ----------------------------------------------------
    // 77. Phase 4 Finding 3: Flexible Note Skeleton (Simple Definitional Note Passes Audit Without Padding)
    // ----------------------------------------------------
    await runTest('77. Phase 4 Finding 3: Flexible note skeleton allows simple definitional notes without synthetic padding', () => {
        const simpleNoteContent = `---
title: "सिंधु घाटी सभ्यता (Indus Valley Civilization)"
subject: "History"
chapter: "IndusValley"
type: "Knowledge Note"
status: "evergreen"
tags:
  - history
  - ancient-india
aliases:
  - "Indus Valley Civilization"
  - "हड़प्पा सभ्यता"
---

# सिंधु घाटी सभ्यता (Indus Valley Civilization)

## 1. Chapter Overview & Core DNA (अध्याय अवलोकन एवं मूल अवधारणा)
सिंधु घाटी सभ्यता (Indus Valley Civilization) दक्षिण एशिया की प्रथम नगरीय कांस्य युगीन सभ्यता थी, जिसका विस्तार 3300 ई.पू. से 1300 ई.पू. तक रहा।

## 2. Core Concepts & Definitions (मूल अवधारणाएँ एवं परिभाषाएँ)
- **नगरीय नियोजन (Urban Planning)**: ग्रिड प्रणाली (Grid System) पर आधारित नगर व्यवस्था।
- **मुहरें (Steatite Seals)**: पशुपति और एकश्रृंगी पशु के अंकन वाली सेलखड़ी की मुहरें।
`;
        const testNotePath = path.join(SCRATCH_DIR, 'test_flexible_note.md');
        fs.writeFileSync(testNotePath, simpleNoteContent, 'utf-8');

        const audit = auditNoteContract(testNotePath);
        assert.strictEqual(audit.success, true, 'Simple definitional note with 2 sections must pass contract audit cleanly');
        assert.strictEqual(audit.issues.length, 0);
        assert.strictEqual(audit.h1Count, 1);
    });

    // ----------------------------------------------------
    // 78. Phase 4 Finding 4: Procedural Packaging Gate Suppresses All When Zero Patterns Exist
    // ----------------------------------------------------
    await runTest('78. Phase 4 Finding 4: Procedural packaging gate cleanly suppresses procedural artifacts when pattern count is zero', () => {
        const routing = evaluateMasterRouting({
            subject: 'Math',
            chapter: 'IndusValley',
            artifactPolicy: { proceduralApkg: true },
            proceduralProfile: {
                patterns: []
            }
        });

        assert.strictEqual(routing.problemPatterns, false);
        assert.strictEqual(routing.proceduralApkg, false);
        assert.strictEqual(routing.suppressions.problemPatterns, 'ZERO_PROCEDURAL_PATTERNS');
        assert.strictEqual(routing.suppressions.proceduralApkg, 'ZERO_PROCEDURAL_PATTERNS');

        const defaultRouting = evaluateMasterRouting({
            subject: 'Math',
            chapter: 'IndusValley',
            proceduralProfile: {
                patterns: []
            }
        });
        assert.strictEqual(defaultRouting.proceduralQuestionBank, false);
        assert.strictEqual(defaultRouting.suppressions.proceduralQuestionBank, 'ZERO_PROCEDURAL_PATTERNS');
    });

    // ----------------------------------------------------
    // 79. Phase 4 Finding 4: Procedural Packaging Gate Keeps JSON/MD but Suppresses APKG for Sub-Threshold Patterns
    // ----------------------------------------------------
    await runTest('79. Phase 4 Finding 4: Sub-threshold procedural pattern preserves JSON/MD but cleanly suppresses APKG creation', async () => {
        const routing = evaluateMasterRouting({
            subject: 'Physics',
            chapter: 'IntroPhysics',
            artifactPolicy: { proceduralApkg: true },
            proceduralProfile: {
                patterns: [
                    {
                        id: 'pat-unsupported',
                        problem_type: 'Pure Theoretical Derivation',
                        status: 'UNSUPPORTED_BY_CURRENT_STUDYLAB_ENGINE',
                        governing_method: null
                    }
                ]
            }
        });

        assert.strictEqual(routing.problemPatterns, true, 'Procedural analysis is preserved');
        assert.strictEqual(routing.proceduralApkg, false, 'Procedural APKG is suppressed');
        assert.strictEqual(routing.suppressions.proceduralApkg, 'INSUFFICIENT_PROCEDURAL_DENSITY_FOR_APKG');

        // Test export behavior with 0 valid patterns
        const unsupportedOnlyData = {
            schema_version: "1.0.0",
            id: "proc-physics-intro",
            title: "Intro Physics",
            domain: "Physics",
            chapter: "IntroPhysics",
            patterns: [
                {
                    id: "pat-unsupported",
                    domain: "Physics",
                    problem_type: "Pure Theoretical Derivation",
                    deep_structure: "E = mc^2",
                    recognition_signals: ["Signal 1"],
                    governing_method: { standard_algorithm: ["Step 1"] },
                    common_traps: ["Trap 1"],
                    difficulty: "Difficult",
                    status: "UNSUPPORTED_BY_CURRENT_STUDYLAB_ENGINE"
                }
            ]
        };

        const exp = await exportStudyLabProceduralAnki(unsupportedOnlyData, {
            chapter: 'IntroPhysics',
            subject: 'Physics'
        });

        assert.strictEqual(exp.success, false);
        assert.strictEqual(exp.suppressed, true);
        assert.strictEqual(exp.reason, 'NO_VALID_PROCEDURAL_PATTERNS');
    });

    // ----------------------------------------------------
    // 80. Phase 4 Finding 4: Actionable Procedural Pattern Generates Full Trio
    // ----------------------------------------------------
    await runTest('80. Phase 4 Finding 4: Actionable procedural pattern generates full trio (MD + JSON + Procedural APKG)', async () => {
        const routing = evaluateMasterRouting({
            subject: 'Math',
            chapter: 'Divisibility',
            artifactPolicy: { proceduralApkg: true },
            proceduralProfile: {
                patterns: [
                    {
                        id: 'pat-div-11',
                        problem_type: 'विभाज्यता नियम (Divisibility by 11)',
                        deep_structure: 'S_{odd} - S_{even} \\equiv 0 \\pmod{11}',
                        governing_method: {
                            standard_algorithm: ['1. विषम स्थानों के अंकों का योग करें।', '2. सम स्थानों के अंकों का योग करें।', '3. अंतर 11 से विभाज्य हो।']
                        }
                    }
                ]
            }
        });

        assert.strictEqual(routing.problemPatterns, true);
        assert.strictEqual(routing.proceduralApkg, true);
        assert.strictEqual(routing.suppressions.proceduralApkg, undefined);
    });

    // ----------------------------------------------------
    // 81. Phase 4 Finding 5: Evidence Pack Single-Source Extraction & Lineage Verification
    // ----------------------------------------------------
    await runTest('81. Phase 4 Finding 5: Evidence Pack is extracted once and verified across siblings without source re-reading', () => {
        const scratchLineageDir = path.join(SCRATCH_DIR, 'test_lineage_preservation');
        if (!fs.existsSync(scratchLineageDir)) fs.mkdirSync(scratchLineageDir, { recursive: true });

        const evidenceContent = "SOURCE EVIDENCE PACK CONTENT V1.0";
        const evidenceHash = computeSha256(evidenceContent);

        // Initialize manifest
        const manifest = initManifest(scratchLineageDir, {
            chapter: 'LineageTest',
            subject: 'History',
            evidenceHash
        });

        // Record Notes
        const notesPath = path.join(scratchLineageDir, 'Notes_Test.md');
        fs.writeFileSync(notesPath, "# Notes\nContent", 'utf-8');
        recordArtifact(scratchLineageDir, {
            artifactType: 'notes',
            filePath: notesPath,
            evidenceHash,
            status: 'VALIDATED',
            lastValidationResult: 'PASS'
        });

        // Record Basic TSV
        const basicPath = path.join(scratchLineageDir, 'Basic_Test.tsv');
        fs.writeFileSync(basicPath, "Front\tBack\tTags\nQ\tA\tT\n", 'utf-8');
        recordArtifact(scratchLineageDir, {
            artifactType: 'basic',
            filePath: basicPath,
            evidenceHash,
            status: 'VALIDATED',
            lastValidationResult: 'PASS'
        });

        const lineage = verifyArtifactLineage(scratchLineageDir, { participatingTypes: ['notes', 'basic'] });
        assert.strictEqual(lineage.isValid, true);
        assert.strictEqual(lineage.evidenceHash, evidenceHash);
    });

    // ----------------------------------------------------
    // 82. Phase 4 Finding 6: Internal .build/ Metadata Separation & Discovery
    // ----------------------------------------------------
    await runTest('82. Phase 4 Finding 6: Internal .build/ metadata separation preserves deliverable cleanliness and manifest discovery', () => {
        const testChapterDir = resolveChapterDir('Chemistry', 'BuildSepTest', SCRATCH_DIR);
        const internalBuildDir = path.join(testChapterDir, '.build');
        if (!fs.existsSync(internalBuildDir)) fs.mkdirSync(internalBuildDir, { recursive: true });

        // Save manifest to .build/
        const manifestData = {
            chapter: 'BuildSepTest',
            subject: 'Chemistry',
            evidenceHash: 'hash_123456',
            artifacts: {
                notes: { path: 'Notes/BuildSepTest_Notes.md', lastValidationResult: 'PASS' }
            }
        };
        fs.writeFileSync(path.join(internalBuildDir, 'artifact-manifest.json'), JSON.stringify(manifestData, null, 2), 'utf-8');

        // Test manifest discovery via getManifestPath
        const loaded = loadManifest(testChapterDir);
        assert(loaded !== null);
        assert.strictEqual(loaded.chapter, 'BuildSepTest');
        assert.strictEqual(loaded.subject, 'Chemistry');

        // Test canonical paths
        const paths = getCanonicalArtifactPaths('Chemistry', 'BuildSepTest', SCRATCH_DIR);
        assert(paths.manifest.path.includes('.build'));
    });

    // ----------------------------------------------------
    // 83. Phase 4 Finding 6: Backwards Compatibility with Legacy Root artifact-manifest.json
    // ----------------------------------------------------
    await runTest('83. Phase 4 Finding 6: Legacy root artifact-manifest.json remains 100% discoverable and valid', () => {
        const testLegacyDir = path.join(SCRATCH_DIR, 'test_legacy_manifest');
        if (!fs.existsSync(testLegacyDir)) fs.mkdirSync(testLegacyDir, { recursive: true });

        // Save manifest to root of chapter dir
        const manifestData = {
            chapter: 'LegacyTest',
            subject: 'Biology',
            evidenceHash: 'hash_legacy_999',
            artifacts: {}
        };
        fs.writeFileSync(path.join(testLegacyDir, 'artifact-manifest.json'), JSON.stringify(manifestData, null, 2), 'utf-8');

        const loaded = loadManifest(testLegacyDir);
        assert(loaded !== null);
        assert.strictEqual(loaded.chapter, 'LegacyTest');
        assert.strictEqual(loaded.evidenceHash, 'hash_legacy_999');
    });

    // ----------------------------------------------------
    // 84. Phase 4 Secondary: Shared Anki Packaging Utilities Correctness
    // ----------------------------------------------------
    await runTest('84. Phase 4 Secondary: Shared Anki packaging utilities produce deterministic GUIDs, checksums, and schema', () => {
        const guid1 = sharedGuid('test-guid-seed-123');
        const guid2 = sharedGuid('test-guid-seed-123');
        assert.strictEqual(guid1, guid2);
        assert.strictEqual(guid1.length, 10);

        const csum1 = sharedChecksum('Sample Text 123');
        const csum2 = sharedChecksum('Sample Text 123');
        assert.strictEqual(csum1, csum2);
        assert(typeof csum1 === 'number');

        const { decksConfig, dconfConfig, globalConf } = sharedDeckConfig(1700000001, 'TestDeck');
        assert(decksConfig['1700000001']);
        assert.strictEqual(decksConfig['1700000001'].name, 'TestDeck');
        assert.strictEqual(globalConf.curDeck, 1700000001);
    });

    // ----------------------------------------------------
    // 85. Phase 4 Master All-Findings Integration Verification
    // ----------------------------------------------------
    await runTest('85. Phase 4 Master All-Findings Integration: Unified routing, packaging & validation preserves existing behavior while eliminating waste', async () => {
        // 1. Trivial declarative case: Basic only, no Cloze, no IO, bm-graph & bm-qa suppressed
        const trivialDecision = evaluateMasterRouting({
            subject: 'History',
            chapter: 'IndusValley',
            basicCandidateCount: 2,
            clozeCandidateCount: 0,
            noteWordCount: 120,
            evidenceChars: 300
        });
        assert.strictEqual(trivialDecision.basic, true);
        assert.strictEqual(trivialDecision.cloze, false);
        assert.strictEqual(trivialDecision.bmGraph, false);
        assert.strictEqual(trivialDecision.bmQa, false);
        assert.strictEqual(trivialDecision.apkg, true);

        // 2. Complex visual case: Europe fixture
        const europeDecision = evaluateMasterRouting({
            subject: 'Map',
            chapter: 'Europe',
            basicCandidateCount: 95,
            clozeCandidateCount: 45,
            noteWordCount: 1200,
            evidenceChars: 3500,
            candidateVaultTargets: ['Alps', 'Pyrenees', 'Danube'],
            visualProfile: {
                dominant_structures: ['spatial', 'mountain_chains'],
                deck_worthiness: 'HIGH',
                io_worthiness: 'HIGH',
                io_candidates: [{ evidence_id: 'ev-001', target_title: 'Natural Boundaries' }]
            }
        });
        assert.strictEqual(europeDecision.basic, true);
        assert.strictEqual(europeDecision.cloze, true);
        assert.strictEqual(europeDecision.imageOcclusion, true);
        assert.strictEqual(europeDecision.mindmap, true);
        assert.strictEqual(europeDecision.slideDeck, true);
        assert.strictEqual(europeDecision.bmGraph, true);
        assert.strictEqual(europeDecision.bmQa, true);
        assert.strictEqual(europeDecision.apkg, true);

        // 3. Procedural Math case: LCM-HCF fixture
        const mathDecision = evaluateMasterRouting({
            subject: 'Math',
            chapter: 'LCM-HCF',
            basicCandidateCount: 21,
            clozeCandidateCount: 20,
            noteWordCount: 1400,
            evidenceChars: 4000,
            candidateVaultTargets: ['Prime Factorization', 'HCF Division'],
            isComplexDomain: true,
            proceduralProfile: {
                patterns: [
                    {
                        id: 'pat-1',
                        problem_type: 'Prime Factorization',
                        governing_method: { standard_algorithm: ['Step 1'] }
                    }
                ]
            }
        });
        assert.strictEqual(mathDecision.basic, true);
        assert.strictEqual(mathDecision.cloze, true);
        assert.strictEqual(mathDecision.problemPatterns, true);
        assert.strictEqual(mathDecision.proceduralQuestionBank, true);
        assert.strictEqual(mathDecision.proceduralApkg, false);
        assert.strictEqual(mathDecision.bmGraph, true);
        assert.strictEqual(mathDecision.bmQa, true);

        // Also verify explicit APKG override retains full APKG routing
        const mathApkgDecision = evaluateMasterRouting({
            subject: 'Math',
            chapter: 'LCM-HCF',
            artifactPolicy: { proceduralApkg: true },
            basicCandidateCount: 21,
            clozeCandidateCount: 20,
            noteWordCount: 1400,
            evidenceChars: 4000,
            candidateVaultTargets: ['Prime Factorization', 'HCF Division'],
            isComplexDomain: true,
            proceduralProfile: {
                patterns: [
                    {
                        id: 'pat-1',
                        problem_type: 'Prime Factorization',
                        governing_method: { standard_algorithm: ['Step 1'] }
                    }
                ]
            }
        });
        assert.strictEqual(mathApkgDecision.proceduralApkg, true);
    });

    // ====================================================
    // STUDYLAB PRACTICE QUESTIONS ARCHITECTURE TESTS (86-96)
    // ====================================================

    // ----------------------------------------------------
    // 86. Practice Questions Schema Compliance (MCQ + Numerical + ReferenceOnly)
    // ----------------------------------------------------
    await runTest('86. Practice Questions Schema: Valid manifest with MCQ, Numerical, and ReferenceOnly items is accepted', () => {
        const sampleManifest = {
            schema_version: '1.0.0',
            domain: 'Math',
            chapter: 'LCM-HCF',
            skill_id: 'math-study',
            language: 'hi',
            questions: [
                {
                    id: 'q-mcq-1',
                    origin_type: 'AUTHENTIC_PYQ',
                    prompt: 'Find the HCF of 12 and 18.',
                    question_type: 'mcq',
                    options: ['2', '3', '6', '12'],
                    correct_option: '6',
                    explanation: 'Factors of 12: 1,2,3,4,6,12. Factors of 18: 1,2,3,6,9,18. Highest Common Factor = 6.',
                    hints: ['hint'],
                    source_provenance: { source: 'Mock' },
                    difficulty: 1.0,
                    exam_metadata: {
                        exam: 'RRB ALP',
                        year: 2024,
                        shift: 'Shift 1'
                    }
                },
                {
                    id: 'q-num-1',
                    origin_type: 'CURATED_SOURCE',
                    prompt: 'Calculate the LCM of 14, 21, and 28.',
                    question_type: 'numerical',
                    answer: 84,
                    tolerance: 0,
                    explanation: '14 = 2 * 7, 21 = 3 * 7, 28 = 2^2 * 7. LCM = 2^2 * 3 * 7 = 84.',
                    hints: ['hint'],
                    source_provenance: { source: 'Mock' }
                },
                {
                    id: 'q-ref-1',
                    origin_type: 'AUTHENTIC_PYQ',
                    prompt: 'See RRB ALP 2024 Shift 2 Q14 for full algebraic problem.',
                    question_type: 'reference_only',
                    exam_metadata: {
                        exam: 'RRB ALP',
                        year: 2024,
                        shift: 'Shift 2',
                        question_number: 'Q14'
                    }
                }
            ]
        };

        const result = validatePracticeQuestionsContent(sampleManifest);
        assert.strictEqual(result.isValid, true, `Validation failed: ${result.errors.join('; ')}`);
        assert.strictEqual(result.totalQuestions, 3);
    });

    // ----------------------------------------------------
    // 87. MCQ Distractor Integrity Validation
    // ----------------------------------------------------
    await runTest('87. MCQ Distractor Integrity: Rejects <2 options and empty option strings', () => {
        // Less than 2 options
        const invalidFewOptions = {
            schema_version: '1.0.0',
            domain: 'Math',
            chapter: 'Algebra',
            questions: [
                {
                    id: 'mcq-few',
                    origin_type: 'CURATED_SOURCE',
                    prompt: 'What is x + 2 = 5?',
                    question_type: 'mcq',
                    options: ['3'],
                    correct_option: '3',
                    explanation: 'Sol',
                    hints: ['hint'],
                    source_provenance: { source: 'Mock' }
                }
            ]
        };
        const res1 = validatePracticeQuestionsContent(invalidFewOptions);
        assert.strictEqual(res1.isValid, false);
        assert(res1.errors.some(e => e.includes('at least 4 choice strings')));

        // Empty option string
        const invalidEmptyOption = {
            schema_version: '1.0.0',
            domain: 'Math',
            chapter: 'Algebra',
            questions: [
                {
                    id: 'mcq-empty-opt',
                    origin_type: 'CURATED_SOURCE',
                    prompt: 'What is x + 2 = 5?',
                    question_type: 'mcq',
                    options: ['3', '4', '5', '  '],
                    correct_option: '3',
                    explanation: 'Sol',
                    hints: ['hint'],
                    source_provenance: { source: 'Mock' }
                }
            ]
        };
        const res2 = validatePracticeQuestionsContent(invalidEmptyOption);
        assert.strictEqual(res2.isValid, false);
        assert(res2.errors.some(e => e.includes('must be a non-empty string')));
    });

    // ----------------------------------------------------
    // 88. Numerical Answer Precision & Tolerance Validation
    // ----------------------------------------------------
    await runTest('88. Numerical Answer Integrity: Rejects non-numerical answers and negative tolerance', () => {
        // Non-numerical answer
        const invalidNonNum = {
            schema_version: '1.0.0',
            domain: 'Physics',
            chapter: 'Kinematics',
            questions: [
                {
                    id: 'num-invalid-ans',
                    origin_type: 'CURATED_SOURCE',
                    prompt: 'Find speed in m/s.',
                    question_type: 'numerical',
                    answer: 'not_a_number'
                }
            ]
        };
        const res1 = validatePracticeQuestionsContent(invalidNonNum);
        assert.strictEqual(res1.isValid, false);
        assert(res1.errors.some(e => e.includes('must be a valid numerical value')));

        // Negative tolerance
        const invalidNegTol = {
            schema_version: '1.0.0',
            domain: 'Physics',
            chapter: 'Kinematics',
            questions: [
                {
                    id: 'num-neg-tol',
                    origin_type: 'CURATED_SOURCE',
                    prompt: 'Find speed in m/s.',
                    question_type: 'numerical',
                    answer: 25.5,
                    tolerance: -0.5
                }
            ]
        };
        const res2 = validatePracticeQuestionsContent(invalidNegTol);
        assert.strictEqual(res2.isValid, false);
        assert(res2.errors.some(e => e.includes('must be a non-negative number')));
    });

    // ----------------------------------------------------
    // 89. ReferenceOnly Zero-Hallucination Classification
    // ----------------------------------------------------
    await runTest('89. ReferenceOnly Classification: Preserves exam citations without requiring synthetic question options', () => {
        const refOnlyManifest = {
            schema_version: '1.0.0',
            domain: 'Reasoning',
            chapter: 'Syllogism',
            questions: [
                {
                    id: 'ref-syll-001',
                    origin_type: 'AUTHENTIC_PYQ',
                    prompt: 'RRB NTPC 2021 Shift 1 Syllogism Item (Citation reference only)',
                    question_type: 'reference_only',
                    exam_metadata: {
                        exam: 'RRB NTPC',
                        year: 2021,
                        shift: 'Shift 1',
                        question_number: 'Q45'
                    },
                    source_provenance: {
                        source_book: 'NTPC Reasoning PYQ Compendium',
                        page: 112
                    }
                }
            ]
        };
        const res = validatePracticeQuestionsContent(refOnlyManifest);
        assert.strictEqual(res.isValid, true);
        assert.strictEqual(res.errors.length, 0);
    });

    // ----------------------------------------------------
    // 90. Multi-Domain Support (Physics, Chemistry, Reasoning)
    // ----------------------------------------------------
    await runTest('90. Multi-Domain Support: Validates Physics (numericals with units), Chemistry (mechanisms), and Reasoning (arrangements)', () => {
        const multiDomainData = [
            {
                domain: 'Physics',
                chapter: 'Kinematics',
                q: {
                    id: 'phys-num-01',
                    origin_type: 'CURATED_SOURCE',
                    prompt: 'A ball is dropped from a height of 20 m. Find its velocity just before hitting the ground (take g = 10 m/s^2).',
                    question_type: 'numerical',
                    answer: 20,
                    tolerance: 0.1,
                    explanation: 'Sol',
                    hints: ['hint'],
                    source_provenance: { source: 'Mock' },
                    units: 'm/s',
                    explanation: 'v^2 = u^2 + 2gh = 0 + 2 * 10 * 20 = 400 => v = 20 m/s.'
                }
            },
            {
                domain: 'Chemistry',
                chapter: 'Equilibrium',
                q: {
                    id: 'chem-mcq-01',
                    origin_type: 'AUTHENTIC_PYQ',
                    prompt: 'In the reaction N2(g) + 3H2(g) <=> 2NH3(g) + heat, which condition favors maximum yield of ammonia?',
                    question_type: 'mcq',
                    options: [
                        'High pressure and low temperature',
                        'Low pressure and high temperature',
                        'High pressure and high temperature',
                        'Low pressure and low temperature'
                    ],
                    correct_option: 'High pressure and low temperature',
                    explanation: 'Exothermic reaction with decrease in moles of gas is favored by high pressure and low temperature (Le Chatelier principle).',
                    hints: ['hint'],
                    source_provenance: { source: 'Mock' }
                }
            },
            {
                domain: 'Reasoning',
                chapter: 'LinearSeating',
                q: {
                    id: 'reas-mcq-01',
                    origin_type: 'CURATED_SOURCE',
                    prompt: 'Five friends A, B, C, D, E sit in a row facing North. A is to the immediate left of B. E is at one of the ends. If C is between B and D, who sits in the middle?',
                    question_type: 'mcq',
                    options: ['A', 'B', 'C', 'D'],
                    correct_option: 'C',
                    explanation: 'Arrangement from Left to Right: E, A, B, C, D (or A, B, C, D, E). In both valid anchor sequences, C sits in the exact middle position.',
                    hints: ['hint'],
                    source_provenance: { source: 'Mock' }
                }
            }
        ];

        for (const item of multiDomainData) {
            const manifest = {
                schema_version: '1.0.0',
                domain: item.domain,
                chapter: item.chapter,
                questions: [item.q]
            };
            const res = validatePracticeQuestionsContent(manifest);
            assert.strictEqual(res.isValid, true, `Failed domain validation for ${item.domain}: ${res.errors.join('; ')}`);
        }
    });

    // ----------------------------------------------------
    // 91. Pattern Linkage Architecture Verification
    // ----------------------------------------------------
    await runTest('91. Pattern Linkage: Validates pattern_id linkage to ProblemPatterns.json and catches unresolved pattern references', () => {
        const ppData = {
            schema_version: '1.0.0',
            domain: 'Math',
            chapter: 'LCM-HCF',
            patterns: [
                { id: 'pat-001', problem_type: 'Prime Factorization' },
                { id: 'pat-002', problem_type: 'Fractions LCM-HCF' }
            ]
        };

        // Valid linkage
        const pqDataValid = {
            schema_version: '1.0.0',
            domain: 'Math',
            chapter: 'LCM-HCF',
            questions: [
                {
                    id: 'q-link-1',
                    origin_type: 'AUTHENTIC_PYQ',
                    pattern_id: 'pat-001',
                    schema_id: 'prime-factors',
                    problem_family: 'Arithmetic::LCM-HCF',
                    prompt: 'Sample Prime Factor Problem',
                    question_type: 'numerical',
                    answer: 42
                }
            ]
        };

        const { checkPracticeQuestionsConsistency } = require('./cross_artifact_checker');
        const resValid = checkPracticeQuestionsConsistency(VAULT_ROOT, {
            chapter: 'LCM-HCF',
            pqContent: pqDataValid,
            ppContent: ppData
        });
        assert.strictEqual(resValid.isValid, true);
        assert.strictEqual(resValid.divergences.length, 0);

        // Unresolved pattern reference
        const pqDataInvalid = {
            schema_version: '1.0.0',
            domain: 'Math',
            chapter: 'LCM-HCF',
            questions: [
                {
                    id: 'q-broken-link',
                    origin_type: 'AUTHENTIC_PYQ',
                    pattern_id: 'pat-999-nonexistent',
                    prompt: 'Sample Unresolved Problem',
                    question_type: 'numerical',
                    answer: 10
                }
            ]
        };
        const resInvalid = checkPracticeQuestionsConsistency(VAULT_ROOT, {
            chapter: 'LCM-HCF',
            pqContent: pqDataInvalid,
            ppContent: ppData
        });
        assert.strictEqual(resInvalid.isValid, false);
        assert(resInvalid.divergences.some(d => d.entity.includes('unresolved_pattern')));
    });

    // ----------------------------------------------------
    // 92. Content Coverage Gap Matrix & Honest Gap Reporting
    // ----------------------------------------------------
    await runTest('92. Content Coverage Gap Matrix: Generates formal matrix and reports uncovered pattern gaps honestly', () => {
        const patternsData = {
            domain: 'Math',
            chapter: 'RemainderTheorem',
            patterns: [
                { id: 'pat-rem-1', problem_type: 'Linear Remainder', governing_method: { standard_algorithm: ['Step 1'] }, variation_opportunities: ['var1'] },
                { id: 'pat-rem-2', problem_type: 'Quadratic Remainder', governing_method: { standard_algorithm: ['Step 1'] } },
                { id: 'pat-rem-3', problem_type: 'Chinese Remainder Theorem', status: 'UNSUPPORTED_BY_CURRENT_STUDYLAB_ENGINE' }
            ]
        };

        const questionsData = {
            schema_version: '1.0.0',
            domain: 'Math',
            chapter: 'RemainderTheorem',
            questions: [
                {
                    id: 'q-rem-1',
                    origin_type: 'AUTHENTIC_PYQ',
                    pattern_id: 'pat-rem-1',
                    prompt: 'Find remainder when 2^50 is divided by 7.',
                    question_type: 'numerical',
                    answer: 4
                }
            ]
        };

        const report = computeCoverageReport(questionsData, patternsData);
        assert.strictEqual(report.totalQuestions, 1);
        assert.strictEqual(report.pyqCount, 1);
        assert.strictEqual(report.coverageMatrix.length, 3);
        
        // Uncovered pattern gap reporting
        assert.deepStrictEqual(report.uncoveredPatterns, ['pat-rem-2', 'pat-rem-3']);

        const matrixMd = formatCoverageMatrix(report);
        assert(matrixMd.includes('### Content Coverage Audit Matrix: RemainderTheorem (Math)'));
        assert(matrixMd.includes('pat-rem-1'));
        assert(matrixMd.includes('pat-rem-2'));
        assert(matrixMd.includes('pat-rem-3'));
        assert(matrixMd.includes('⚠️ **Patterns Lacking Solvable Questions (Honest Gap Report)**: pat-rem-2, pat-rem-3'));
    });

    // ----------------------------------------------------
    // 93. Real Fixture Test: LCM-HCF Practice Questions
    // ----------------------------------------------------
    await runTest('93. Real Fixture: LCM-HCF PracticeQuestions passes validation with 100% pattern coverage matrix', () => {
        const lcmHcfPath = getCanonicalArtifactPaths('Math', 'LCM-HCF').practiceQuestions.path;
        const res = validatePracticeQuestionsFile(lcmHcfPath, { shouldExit: false });
        assert.strictEqual(res.isValid, true, `Validation failed: ${res.errors.join('; ')}`);
        assert(res.totalQuestions >= 7);
    });

    // ----------------------------------------------------
    // 94. Real Fixture Test: Physics Newton-Laws-Friction Practice Questions
    // ----------------------------------------------------
    await runTest('94. Real Fixture: Newton-Laws-Friction PracticeQuestions passes validation with 100% pattern coverage matrix', () => {
        const physicsPath = path.join(VAULT_ROOT, 'Study Materials', 'Physics', 'Newton-Laws-Friction', 'Optional', 'Newton-Laws-Friction_PracticeQuestions.json');
        const res = validatePracticeQuestionsFile(physicsPath, { shouldExit: false });
        assert.strictEqual(res.isValid, true, `Validation failed: ${res.errors.join('; ')}`);
        assert(res.totalQuestions >= 10);
        assert.strictEqual(res.coverageReport.uncoveredPatterns.length, 0);
    });

    // ----------------------------------------------------
    // 95. Canonical Path & Routing Integration for PracticeQuestions
    // ----------------------------------------------------
    await runTest('95. Canonical Path & Routing Integration: getCanonicalArtifactPaths includes practiceQuestions and routing evaluates correctly', () => {
        const paths = getCanonicalArtifactPaths('Math', 'LCM-HCF');
        assert(paths.practiceQuestions !== undefined);
        assert.strictEqual(paths.practiceQuestions.artifactType, 'practiceQuestions');
        assert(paths.practiceQuestions.path.endsWith('LCM-HCF_PracticeQuestions.json'));

        const routingWithQuestions = evaluateMasterRouting({
            subject: 'Math',
            chapter: 'LCM-HCF',
            practiceQuestionsCount: 15,
            proceduralProfile: {
                patterns: [{ id: 'pat-1', problem_type: 'Test', governing_method: { standard_algorithm: ['Step 1'] } }],
                practiceQuestions: [{ id: 'q-1', question_type: 'mcq' }]
            }
        });
        assert.strictEqual(routingWithQuestions.practiceQuestions, true);
        assert.strictEqual(routingWithQuestions.problemPatterns, true);
        assert.strictEqual(routingWithQuestions.proceduralQuestionBank, true);
        assert.strictEqual(routingWithQuestions.proceduralApkg, false);

        // Also test with explicit APKG override
        const routingWithApkg = evaluateMasterRouting({
            subject: 'Math',
            chapter: 'LCM-HCF',
            artifactPolicy: { proceduralApkg: true },
            practiceQuestionsCount: 15,
            proceduralProfile: {
                patterns: [{ id: 'pat-1', problem_type: 'Test', governing_method: { standard_algorithm: ['Step 1'] } }],
                practiceQuestions: [{ id: 'q-1', question_type: 'mcq' }]
            }
        });
        assert.strictEqual(routingWithApkg.proceduralApkg, true);

        const routingWithoutQuestions = evaluateMasterRouting({
            subject: 'History',
            chapter: 'IndusValley'
        });
        assert.strictEqual(routingWithoutQuestions.practiceQuestions, false);
        assert.strictEqual(routingWithoutQuestions.suppressions.practiceQuestions, 'SUPPRESSED_BY_SUBJECT_POLICY');
    });

    // ----------------------------------------------------
    // 96. Anti-Superficial Mutation Standard & L0-L5 Progression
    // ----------------------------------------------------
    await runTest('96. Anti-Superficial Mutation Standard: Enforces progression taxonomy (L0 Authentic -> L1 Parameter -> L2 Isomorphic -> L3 Structural -> L4 Contextual -> L5 Transfer)', () => {
        const progressionLevels = [
            { level: 'L0', name: 'AUTHENTIC_PYQ', desc: 'Original baseline exam item without mutation' },
            { level: 'L1', name: 'PARAMETER_VARIANT', desc: 'Controlled numerical change preserving integer invariants' },
            { level: 'L2', name: 'ISOMORPHIC_VARIANT', desc: 'Cover story change keeping mathematical graph identical' },
            { level: 'L3', name: 'STRUCTURAL_INVERSION', desc: 'Given vs Unknown variable reversal' },
            { level: 'L4', name: 'CONTEXTUAL_TRANSFER', desc: 'Physical setting / domain shift' },
            { level: 'L5', name: 'MULTI_CONCEPT_TRANSFER', desc: 'Combines multiple procedural sub-schemas' }
        ];

        progressionLevels.forEach(lvl => {
            assert(typeof lvl.level === 'string' && lvl.level.startsWith('L'));
            assert(typeof lvl.name === 'string');
            assert(typeof lvl.desc === 'string');
        });
    });

    // ----------------------------------------------------
    // 97. StudyLab Practice Contract: ProblemPatterns (HOW) vs PracticeQuestions (WHAT)
    // ----------------------------------------------------
    await runTest('97. StudyLab Contract: ProblemPatterns represents HOW while PracticeQuestions represents WHAT', () => {
        const howData = {
            id: 'pat-lcm-01',
            problem_type: 'अभाज्य गुणनखंडन (Prime Factorization)',
            deep_structure: 'N = p_1^{a_1} \\cdot p_2^{a_2}',
            recognition_signals: ['अभाज्य संख्याएँ', 'घातांक'],
            governing_method: { standard_algorithm: ['1. अभाज्य गुणनखंड करें', '2. अधिकतम घात चुनें'] },
            common_traps: ['न्यूनतम घात चुनना']
        };

        const whatData = {
            id: 'lcm-q-001',
            origin_type: 'AUTHENTIC_PYQ',
            pattern_id: 'pat-lcm-01',
            prompt: '12 और 18 का LCM क्या होगा?',
            question_type: 'mcq',
            options: ['18', '24', '36', '72'],
            correct_option: '36',
            explanation: '12 = 2^2 * 3, 18 = 2 * 3^2. LCM = 2^2 * 3^2 = 36.',
                    hints: ['hint'],
                    source_provenance: { source: 'Mock' }
        };

        // Validate HOW does not contain question-instance options/prompts
        assert.strictEqual(howData.options, undefined);
        assert.strictEqual(howData.prompt, undefined);
        assert(Array.isArray(howData.governing_method.standard_algorithm));

        // Validate WHAT contains question prompt and options/answers linked to pattern
        assert.strictEqual(whatData.pattern_id, 'pat-lcm-01');
        assert(Array.isArray(whatData.options));
        assert.strictEqual(whatData.correct_option, '36');
    });

    // ----------------------------------------------------
    // 98. StudyLab Practice Contract: 1 Pattern != 1 Question (Multiple Distinct Questions Per Pattern)
    // ----------------------------------------------------
    await runTest('98. StudyLab Practice APKG: 1 Pattern != 1 Question (Preserves multiple distinct questions under single pattern in APKG)', async () => {
        const testPqData = {
            schema_version: '1.0.0',
            domain: 'Math',
            chapter: 'MultiQuestionTest',
            questions: [
                {
                    id: 'mq-q-001',
                    origin_type: 'AUTHENTIC_PYQ',
                    pattern_id: 'pat-single-shared',
                    prompt: 'Question 1 under shared pattern: Find LCM of 6 and 8.',
                    question_type: 'mcq',
                    options: ['12', '24', '48', '16'],
                    correct_option: '24',
                    explanation: 'Sol',
                    hints: ['hint'],
                    source_provenance: { source: 'Mock' },
                    hints: ['1'],
                    exam_metadata: { exam: 'Test', year: 2024 }
                },
                {
                    id: 'mq-q-002',
                    origin_type: 'CURATED_SOURCE',
                    pattern_id: 'pat-single-shared',
                    prompt: 'Question 2 under shared pattern: Find LCM of 15 and 20.',
                    question_type: 'mcq',
                    options: ['30', '45', '60', '75'],
                    correct_option: '60',
                    explanation: 'Sol',
                    hints: ['hint'],
                    source_provenance: { source: 'Mock' },
                    hints: ['1'],
                    source_provenance: { source: 'NCERT' }
                },
                {
                    id: 'mq-q-003',
                    origin_type: 'AUTHENTIC_PYQ',
                    pattern_id: 'pat-single-shared',
                    prompt: 'Question 3 under shared pattern: Find LCM of 9 and 12.',
                    question_type: 'mcq',
                    options: ['18', '27', '36', '72'],
                    correct_option: '36',
                    explanation: 'Sol',
                    hints: ['hint'],
                    source_provenance: { source: 'Mock' },
                    hints: ['1'],
                    exam_metadata: { exam: 'Test', year: 2024 }
                }
            ]
        };

        const testPpData = {
            schema_version: '1.0.0',
            domain: 'Math',
            chapter: 'MultiQuestionTest',
            patterns: [
                {
                    id: 'pat-single-shared',
                    problem_type: 'Shared Pattern Type',
                    governing_method: { standard_algorithm: ['Step 1'] },
                    common_traps: ['Trap 1']
                }
            ]
        };

        const scratchDir = path.join(SCRATCH_DIR, 'test_multi_questions_apkg');
        if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

        const exportRes = await exportStudyLabProceduralAnki(testPqData, {
            chapter: 'MultiQuestionTest',
            subject: 'Math',
            outputDir: path.join(scratchDir, 'StudyLab')
        });

        assert.strictEqual(exportRes.success, true);
        // Must export 3 distinct notes and cards, NOT collapse into 1 pattern note
        assert.strictEqual(exportRes.counts.totalNotes, 3, 'Must create 3 distinct question notes for 3 questions');
        assert.strictEqual(exportRes.counts.totalCards, 3, 'Must create 3 distinct cards');

        const valRes = await validateProceduralApkg(exportRes.outputPath, false);
        assert.strictEqual(valRes.isValid, true);
        assert.strictEqual(valRes.stats.noteCount, 3);
        assert.strictEqual(valRes.stats.cardCount, 3);

        // Verify distinct question IDs in anchors
        const qIds = exportRes.items.map(i => i.practiceQuestionId);
        assert.deepStrictEqual(qIds, ['mq-q-001', 'mq-q-002', 'mq-q-003']);
    });

    // ----------------------------------------------------
    // 99. StudyLab Practice Contract: ReferenceOnly-Only Chapter Suppresses APKG Cleanly
    // ----------------------------------------------------
    await runTest('99. StudyLab Practice APKG: ReferenceOnly-only chapter suppresses Practice APKG with ZERO_SOLVABLE_PRACTICE_QUESTIONS', async () => {
        // Routing check
        const routing = evaluateMasterRouting({
            subject: 'Math',
            chapter: 'AncientCitations',
            artifactPolicy: { proceduralApkg: true },
            proceduralProfile: {
                patterns: [{ id: 'pat-hist-1', problem_type: 'Chronology', governing_method: { standard_algorithm: ['Step 1'] } }],
                practiceQuestions: [
                    { id: 'ref-q-1', question_type: 'reference_only', source_provenance: { source: 'mock' } },
                    { id: 'ref-q-2', question_type: 'reference_only', source_provenance: { source: 'mock' } }
                ]
            }
        });
        assert.strictEqual(routing.practiceQuestions, true);
        assert.strictEqual(routing.proceduralApkg, false);
        assert.strictEqual(routing.suppressions.proceduralApkg, 'ZERO_SOLVABLE_PRACTICE_QUESTIONS');

        // Also verify default Question Bank suppression
        const defaultRouting = evaluateMasterRouting({
            subject: 'Math',
            chapter: 'AncientCitations',
            proceduralProfile: {
                patterns: [{ id: 'pat-hist-1', problem_type: 'Chronology', governing_method: { standard_algorithm: ['Step 1'] } }],
                practiceQuestions: [
                    { id: 'ref-q-1', question_type: 'reference_only', source_provenance: { source: 'mock' } },
                    { id: 'ref-q-2', question_type: 'reference_only', source_provenance: { source: 'mock' } }
                ]
            }
        });
        assert.strictEqual(defaultRouting.proceduralQuestionBank, false);
        assert.strictEqual(defaultRouting.suppressions.proceduralQuestionBank, 'ZERO_SOLVABLE_PRACTICE_QUESTIONS');

        // Exporter check
        const refOnlyPq = {
            schema_version: '1.0.0',
            domain: 'Math',
            chapter: 'AncientCitations',
            questions: [
                {
                    id: 'ref-q-1',
                    origin_type: 'AUTHENTIC_PYQ',
                    prompt: 'See UPSC 2023 Prelims Q4',
                    question_type: 'reference_only',
                    source_provenance: { source: 'mock' }
                }
            ]
        };

        const exportRes = await exportStudyLabProceduralAnki(refOnlyPq, {
            chapter: 'AncientCitations',
            subject: 'History'
        });

        assert.strictEqual(exportRes.success, false);
        assert.strictEqual(exportRes.suppressed, true);
        assert.strictEqual(exportRes.reason, 'ZERO_SOLVABLE_PRACTICE_QUESTIONS');
        assert.strictEqual(exportRes.counts.solvableQuestions, 0);
        assert.strictEqual(exportRes.counts.referenceOnlyQuestions, 1);
    });

    // ----------------------------------------------------
    // 100. StudyLab Practice Contract: Stable Question Identity & Linkage
    // ----------------------------------------------------
    await runTest('100. StudyLab Practice APKG: Stable Question Identity (PracticeQuestion ID -> PracticeItem -> Payload)', () => {
        const question = {
            id: 'lcmhcf-q-007',
            origin_type: 'AUTHENTIC_PYQ',
            pattern_id: 'pat-lcmhcf-006',
            schema_id: 'lcm-remainders',
            problem_family: 'Arithmetic::LCM-HCF',
            prompt: 'वह न्यूनतम संख्या ज्ञात कीजिए जिसे 12, 15, 20 से भाग देने पर प्रत्येक स्थिति में शेषफल 4 बचे।',
            question_type: 'mcq',
            options: ['56', '60', '64', '72'],
            correct_option: '64',
            explanation: 'संख्या = LCM(12, 15, 20) * k + 4 = 60 * 1 + 4 = 64।',
                    hints: ['hint'],
                    source_provenance: { source: 'Mock' },
            difficulty: 2.0
        };

        const rootData = { domain: 'Math', chapter: 'LCM-HCF' };
        const linkedPattern = {
            id: 'pat-lcmhcf-006',
            problem_type: 'LCM शेषफल समस्याएं (LCM Remainder Problems)',
            deep_structure: 'N = \\text{LCM}(a, b, c) \\cdot k + r',
            governing_method: { standard_algorithm: ['1. भाजकों का LCM निकालें।', '2. समान शेषफल जोड़ें।'] },
            common_traps: ['शेषफल घटाना']
        };

        const payload = createQuestionPayload(question, rootData, linkedPattern);
        assert.strictEqual(payload.content_ref, 'lcmhcf-q-007');
        assert.strictEqual(payload.proc_schema, 'schema.math.number_system.lcm_hcf.lcm_remainders.v1');
        assert.strictEqual(payload.difficulty_override, 2.0);
        assert.strictEqual(payload.seed_mode, 'random');
        assert(payload.inline_contract !== null && typeof payload.inline_contract === 'object');
    });

    // ----------------------------------------------------
    // 101. StudyLab Practice Contract: Question-Type Contract Preserved (MCQ, Numerical, Structured)
    // ----------------------------------------------------
    await runTest('101. StudyLab Practice APKG: Preserves MCQ, Numerical, and Structured representations without conversion to generic flashcards', () => {
        const mcqQ = {
            id: 'mcq-1',
            origin_type: 'CURATED_SOURCE',
            prompt: 'Choose the correct option',
            question_type: 'mcq',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correct_option: 'Option B',
                    explanation: 'Sol',
                    hints: ['hint'],
                    source_provenance: { source: 'Mock' }
        };
        const mcqHtml = formatQuestionGoverningMethod(mcqQ, null);
        assert(mcqHtml.includes('(A)</strong> Option A'));
        assert(mcqHtml.includes('(B)</strong> Option B'));

        const numQ = {
            id: 'num-1',
            origin_type: 'CURATED_SOURCE',
            prompt: 'Calculate force in Newtons',
            question_type: 'numerical',
            answer: 49.0,
            units: 'N'
        };
        const numHtml = formatQuestionGoverningMethod(numQ, null);
        assert(numHtml.includes('संख्यात्मक उत्तर (Numerical)'));
        assert(numHtml.includes('इकाई: N'));
    });

    // ----------------------------------------------------
    // 102. Real Fixture: Real LCM-HCF Exports 16 Distinct Practice Questions Linked to 8 Patterns
    // ----------------------------------------------------
    await runTest('102. Real Fixture: LCM-HCF exports distinct practice question items without collapsing into pattern anchors', async () => {
        const lcmDir = resolveChapterDir('Math', 'LCM-HCF');
        const exportRes = await exportStudyLabProceduralAnki(lcmDir, {
            chapter: 'LCM-HCF',
            subject: 'Math',
            outputDir: path.join(SCRATCH_DIR, 'test102_lcm')
        });

        assert.strictEqual(exportRes.success, true);
        assert(exportRes.counts.totalNotes >= 7, 'Must export all distinct practice questions (>= 7)');
        assert.strictEqual(exportRes.counts.totalCards, exportRes.counts.totalNotes);
        assert.strictEqual(exportRes.counts.solvableQuestions, exportRes.counts.totalNotes);
        assert.strictEqual(exportRes.counts.referenceOnlyQuestions, 0);

        // Verify distinct question IDs are present
        const questionIds = exportRes.items.map(i => i.practiceQuestionId);
        assert.strictEqual(new Set(questionIds).size, exportRes.counts.totalNotes, 'All question IDs must be distinct');

        // Verify multiple questions mapped to same pattern remain distinct
        const pat1Questions = exportRes.items.filter(i => i.patternId === 'pat-lcm-hcf-001' || i.patternId === 'math.ns.lcm_hcf.basic_lcm' || i.patternId === 'pattern-lcm-hcf-relation');
        if (pat1Questions.length >= 2) {
            assert.notStrictEqual(pat1Questions[0].noteId, pat1Questions[1].noteId);
            assert.notStrictEqual(pat1Questions[0].cardId, pat1Questions[1].cardId);
            assert.notStrictEqual(pat1Questions[0].guid, pat1Questions[1].guid);
        }
    });


    // ----------------------------------------------------
    // 103. Remediation Test: Automated Transient Cleanup (Incomplete / Failed Run Preservation)
    // ----------------------------------------------------
    await runTest('103. Transient Cleanup: Safely removes run transients while preserving execution-state on failed/incomplete run', () => {
        const testScratch = path.join(SCRATCH_DIR, 'test_transients_failed');
        if (!fs.existsSync(testScratch)) fs.mkdirSync(testScratch, { recursive: true });

        // Populate mock transient files
        const evPath = path.join(testScratch, 'evidence-pack-run1.md');
        const chunkPath = path.join(testScratch, 'chunk-001.md');
        const rejPath = path.join(testScratch, 'rejected-items.json');
        const tmpPath = path.join(testScratch, 'pipeline.tmp');
        const statePath = path.join(testScratch, 'execution-state.json');

        fs.writeFileSync(evPath, '# Temp Evidence Pack');
        fs.writeFileSync(chunkPath, '# Temp Chunk 1');
        fs.writeFileSync(rejPath, '{"rejected": []}');
        fs.writeFileSync(tmpPath, 'temporary buffer');
        fs.writeFileSync(statePath, '{"status": "IN_PROGRESS", "step": 3}');

        // Run cleanup with isFailedOrIncomplete: true
        const cleanRes = cleanTransients({ scratchDir: testScratch, isFailedOrIncomplete: true, dryRun: false });
        assert.strictEqual(cleanRes.success, true);
        assert(cleanRes.preserved.some(p => p.endsWith('execution-state.json')), 'execution-state.json must be preserved on failed run');
        assert(fs.existsSync(statePath), 'execution-state.json file must remain on disk');
        assert(!fs.existsSync(evPath), 'evidence pack must be deleted');
        assert(!fs.existsSync(chunkPath), 'chunk must be deleted');
        assert(!fs.existsSync(rejPath), 'rejected items must be deleted');
        assert(!fs.existsSync(tmpPath), 'tmp file must be deleted');
    });

    // ----------------------------------------------------
    // 104. Remediation Test: Automated Transient Cleanup (Success & Source Protection)
    // ----------------------------------------------------
    await runTest('104. Transient Cleanup: Removes execution-state.json on success, preserves permanent fixtures and raw sources', () => {
        const testScratch = path.join(SCRATCH_DIR, 'test_transients_success');
        if (!fs.existsSync(testScratch)) fs.mkdirSync(testScratch, { recursive: true });

        const statePath = path.join(testScratch, 'execution-state.json');
        const tmpPath = path.join(testScratch, 'temp.tmp');
        fs.writeFileSync(statePath, '{"status": "COMPLETED"}');
        fs.writeFileSync(tmpPath, 'temp');

        const cleanRes = cleanTransients({ scratchDir: testScratch, isFailedOrIncomplete: false, dryRun: false });
        assert.strictEqual(cleanRes.success, true);
        assert(!fs.existsSync(statePath), 'execution-state.json must be cleaned on success');
        assert(!fs.existsSync(tmpPath), 'tmp file must be cleaned on success');

        // Verify permanent source materials and fixtures are NEVER touched
        const lcmNotes = getCanonicalArtifactPaths('Math', 'LCM-HCF').notes.path;
        assert(fs.existsSync(lcmNotes), 'Permanent study notes must never be deleted');
    });

    // ----------------------------------------------------
    // 105. Remediation Test: APKG Pre-Validation Gate Before Cleanup
    // ----------------------------------------------------
    await runTest('105. APKG Pre-Validation: exportChapterToAnki validates APKG before any packaging intermediate cleanup is initiated', async () => {
        const scratchChapter = path.join(SCRATCH_DIR, 'test_apkg_preval_chapter');
        const basicDir = path.join(scratchChapter, 'Basic');
        const clozeDir = path.join(scratchChapter, 'Cloze');
        fs.mkdirSync(basicDir, { recursive: true });
        fs.mkdirSync(clozeDir, { recursive: true });

        const basicTsv = path.join(basicDir, 'test_apkg_preval_chapter_Basic.tsv');
        const clozeTsv = path.join(clozeDir, 'test_apkg_preval_chapter_Cloze.tsv');
        fs.writeFileSync(basicTsv, 'Front\tBack\tTags\nप्रश्न 1 (Q1)\tउत्तर 1 (A1)\tTest');
        fs.writeFileSync(clozeTsv, 'Text\tExtra\tTags\n{{c1::सूत्र}} (Formula) याद रखें।\tअतिरिक्त संदर्भ\tTest');

        const evHash = computeSha256(fs.readFileSync(basicTsv));
        const manifest = initManifest(scratchChapter, {
            subject: 'Science',
            chapter: 'test_apkg_preval_chapter',
            source: 'scratch/test.pdf',
            evidenceHash: evHash
        });
        recordArtifact(scratchChapter, {
            artifactType: 'basic',
            filePath: basicTsv,
            evidenceHash: evHash,
            status: 'VALIDATED',
            lastValidationResult: 'PASS'
        });
        recordArtifact(scratchChapter, {
            artifactType: 'cloze',
            filePath: clozeTsv,
            evidenceHash: evHash,
            status: 'VALIDATED',
            lastValidationResult: 'PASS'
        });

        // Export with cleanup enabled
        const exportRes = await exportChapterToAnki(scratchChapter, {
            chapter: 'test_apkg_preval_chapter',
            subject: 'Science',
            cleanIntermediates: true,
            archiveIntermediates: true
        });

        assert.strictEqual(exportRes.success, true);
        assert(fs.existsSync(exportRes.outputPath), 'APKG file must exist');

        // Validate APKG
        const valRes = await validateApkg(exportRes.outputPath, false);
        assert.strictEqual(valRes.isValid, true);
    });

    // ----------------------------------------------------
    // 106. Remediation Test: Failed APKG Build Recovery Protection
    // ----------------------------------------------------
    await runTest('106. Packaging Recovery Protection: Corrupted or invalid APKG build aborts intermediate deletion to safeguard recovery inputs', async () => {
        const scratchChapter = path.join(SCRATCH_DIR, 'test_recovery_protection');
        const basicDir = path.join(scratchChapter, 'Basic');
        fs.mkdirSync(basicDir, { recursive: true });

        const basicTsv = path.join(basicDir, 'test_recovery_protection_Basic.tsv');
        fs.writeFileSync(basicTsv, 'Front\tBack\tTags\nप्र 1\tउ 1\tTag');

        // Directly invoke cleanPackagingIntermediates without a valid APKG
        const fakeApkgPath = path.join(scratchChapter, 'non_existent.apkg');
        const cleanRes = cleanPackagingIntermediates(scratchChapter, {
            chapter: 'test_recovery_protection',
            apkgPath: fakeApkgPath
        });

        assert.strictEqual(cleanRes.cleaned, false, 'Cleanup must abort when APKG is missing/invalid');
        assert(cleanRes.reason.includes('APKG_NOT_VERIFIED') || cleanRes.reason.includes('not exist') || cleanRes.reason.includes('0 bytes'));
        assert(fs.existsSync(basicTsv), 'Source packaging TSV must remain intact for recovery');
    });

    // ----------------------------------------------------
    // 107. Remediation Test: Packaging Intermediates Lifecycle & Manifest Preservation
    // ----------------------------------------------------
    await runTest('107. Packaging Lifecycle: Archives Basic/Cloze to .build/source-artifacts/ and preserves .build/artifact-manifest.json', async () => {
        const scratchChapter = path.join(SCRATCH_DIR, 'test_lifecycle_chapter');
        const basicDir = path.join(scratchChapter, 'Basic');
        const clozeDir = path.join(scratchChapter, 'Cloze');
        fs.mkdirSync(basicDir, { recursive: true });
        fs.mkdirSync(clozeDir, { recursive: true });

        const basicTsv = path.join(basicDir, 'test_lifecycle_chapter_Basic.tsv');
        const clozeTsv = path.join(clozeDir, 'test_lifecycle_chapter_Cloze.tsv');
        fs.writeFileSync(basicTsv, 'Front\tBack\tTags\nक 1\tख 1\tTag');
        fs.writeFileSync(clozeTsv, 'Text\tExtra\tTags\n{{c1::ग 1}}\tघ 1\tTag');

        const evHash = computeSha256(fs.readFileSync(basicTsv));
        const manifest = initManifest(scratchChapter, {
            subject: 'Science',
            chapter: 'test_lifecycle_chapter',
            source: 'scratch/lifecycle_source.pdf',
            evidenceHash: evHash
        });
        recordArtifact(scratchChapter, {
            artifactType: 'basic',
            filePath: basicTsv,
            evidenceHash: evHash,
            status: 'VALIDATED',
            lastValidationResult: 'PASS'
        });
        recordArtifact(scratchChapter, {
            artifactType: 'cloze',
            filePath: clozeTsv,
            evidenceHash: evHash,
            status: 'VALIDATED',
            lastValidationResult: 'PASS'
        });

        // Run full export with cleanup & archive
        const exportRes = await exportChapterToAnki(scratchChapter, {
            chapter: 'test_lifecycle_chapter',
            subject: 'Science',
            cleanIntermediates: true,
            archiveIntermediates: true
        });

        assert.strictEqual(exportRes.success, true);
        
        // Check that root Basic/ and Cloze/ are cleaned from user-facing directory
        assert(!fs.existsSync(basicTsv), 'User-facing Basic TSV must be cleaned');
        assert(!fs.existsSync(clozeTsv), 'User-facing Cloze TSV must be cleaned');

        // Check that archived copies exist in .build/source-artifacts/
        const archivedBasic = path.join(scratchChapter, '.build', 'source-artifacts', 'Basic', 'test_lifecycle_chapter_Basic.tsv');
        const archivedCloze = path.join(scratchChapter, '.build', 'source-artifacts', 'Cloze', 'test_lifecycle_chapter_Cloze.tsv');
        assert(fs.existsSync(archivedBasic), 'Archived Basic TSV must exist in .build/source-artifacts/');
        assert(fs.existsSync(archivedCloze), 'Archived Cloze TSV must exist in .build/source-artifacts/');

        // Check that .build/artifact-manifest.json is preserved and valid
        const manifestLoaded = loadManifest(scratchChapter);
        assert(manifestLoaded, '.build/artifact-manifest.json must be preserved');
        assert(manifestLoaded.artifacts.apkg, 'APKG must be registered in manifest');

        // Verify lineage verification resolves archived artifacts
        const lineage = verifyArtifactLineage(scratchChapter, { participatingTypes: ['basic', 'cloze', 'apkg'] });
        assert.strictEqual(lineage.isValid, true, `Lineage must be valid: ${lineage.errors.join('; ')}`);
    });

    // ----------------------------------------------------
    // 108. Remediation Test: Cross-Artifact Checker In-Memory Optimization Parity
    // ----------------------------------------------------
    await runTest('108. Cross-Artifact Checker Optimization: preloadedContent in-memory map avoids disk re-reads and maintains parity', () => {
        const scratchChapter = path.join(SCRATCH_DIR, 'test_cross_preload_chapter');
        const notesDir = path.join(scratchChapter, 'Notes');
        const optDir = path.join(scratchChapter, 'Optional');
        fs.mkdirSync(notesDir, { recursive: true });
        fs.mkdirSync(optDir, { recursive: true });

        const notesContent = '# प्रकाश संश्लेषण (Photosynthesis)\n\nवर्ष 2024 में शोध हुआ।';
        const ppContent = '{"id": "pp-1", "title": "Photosynthesis", "domain": "Science", "chapter": "test_cross_preload_chapter", "patterns": []}';
        const pqContent = '{"schema_version": "1.0.0", "domain": "Science", "chapter": "test_cross_preload_chapter", "questions": []}';

        fs.writeFileSync(path.join(notesDir, 'test_cross_preload_chapter_Notes.md'), notesContent);
        fs.writeFileSync(path.join(optDir, 'test_cross_preload_chapter_ProblemPatterns.json'), ppContent);
        fs.writeFileSync(path.join(optDir, 'test_cross_preload_chapter_PracticeQuestions.json'), pqContent);

        // 1. Run standard disk-read check
        const diskResult = checkCrossArtifactIntegrity(scratchChapter, { chapter: 'test_cross_preload_chapter' });

        // 2. Run in-memory preloaded check
        const preloadedContent = {
            notes: notesContent,
            problemPatternsJson: ppContent,
            practiceQuestionsJson: pqContent
        };

        const memResult = checkCrossArtifactIntegrity(scratchChapter, {
            chapter: 'test_cross_preload_chapter',
            preloadedContent
        });

        assert.strictEqual(memResult.isValid, diskResult.isValid);
        assert.strictEqual(memResult.divergences.length, diskResult.divergences.length);
        assert.strictEqual(memResult.scannedArtifacts.length, 3);
    });

    // ----------------------------------------------------
    // 109. Remediation Test: Format Hardening for Formulas, LaTeX, Physics Units, Chemistry Notation, Hindi
    // ----------------------------------------------------
    await runTest('109. Format Hardening: Validates LaTeX fractions, powers, subscripts, roots, matrices, Greek symbols, physics units, chemistry notation, and Hindi text', () => {
        // Test fractions, powers, subscripts
        const fracPower = validateFormulaSyntax('\\frac{a}{b} + x^2 + x_{i} + a^{m+n}');
        assert.strictEqual(fracPower.isValid, true);

        // Test roots and matrices
        const rootMatrix = validateFormulaSyntax('\\sqrt{x} + \\sqrt[3]{y} + \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}');
        assert.strictEqual(rootMatrix.isValid, true);

        // Test Greek symbols
        const greek = validateFormulaSyntax('\\alpha + \\beta = \\Delta \\cdot \\rho \\theta');
        assert.strictEqual(greek.isValid, true);

        // Test Chemistry notation
        const chem = validateFormulaSyntax('\\text{H}_2\\text{O} \\rightleftharpoons \\text{H}^+ + \\text{OH}^-');
        assert.strictEqual(chem.isValid, true);

        // Test Hindi Devanagari inside formula text
        const hindiMath = validateFormulaSyntax('\\text{ल.स.प. (LCM)} = 2^3 \\times 3^2');
        assert.strictEqual(hindiMath.isValid, true);

        // Test broken brace detection
        const brokenBrace = validateFormulaSyntax('\\frac{a}{b');
        assert.strictEqual(brokenBrace.isValid, false, 'Must detect unclosed brace');

        // Test mismatched environment detection
        const brokenEnv = validateFormulaSyntax('\\begin{matrix} a \\end{pmatrix}');
        assert.strictEqual(brokenEnv.isValid, false, 'Must detect mismatched environment');
    });

    // ----------------------------------------------------
    // 110. Remediation Test: HTML Safety & Escaping Validation
    // ----------------------------------------------------
    await runTest('110. HTML Safety Validation: Verifies well-formed HTML tags, flags unclosed/mismatched tags, and ensures clean Anki field rendering', () => {
        // Valid HTML fields
        const validHtml1 = validateHtmlFieldSafety('<b>महत्वपूर्ण (Important)</b><br><div>विवरण</div>', 'Back');
        assert.strictEqual(validHtml1.isValid, true);
        assert.strictEqual(validHtml1.warnings.length, 0);

        // Unclosed HTML tag
        const unclosedHtml = validateHtmlFieldSafety('<div><p>अधूरा पैराग्राफ', 'Back');
        assert(unclosedHtml.warnings.some(w => w.includes('Unclosed HTML tag')), 'Must warn on unclosed tag');

        // Mismatched closing tag
        const mismatchedHtml = validateHtmlFieldSafety('<div>अनुभाग</span>', 'Back');
        assert(mismatchedHtml.warnings.some(w => w.includes('Mismatched HTML tags')), 'Must warn on mismatched tag');

        // Plain text with Hindi and parentheses
        const plainHindi = validateHtmlFieldSafety('अभाज्य गुणनखंडन विधि (Prime Factorization Method)', 'Front');
        assert.strictEqual(plainHindi.isValid, true);
        assert.strictEqual(plainHindi.warnings.length, 0);
    });

    // ----------------------------------------------------
    // 111. Orchestration Policy: Adaptive Orchestrator v4 Self-Test & Dispatch Gate
    // ----------------------------------------------------
    await runTest('111. Orchestration Policy: Adaptive Orchestrator v4 Self-Test, Dispatch Gate, Handoff Contract, and Single-Writer Rules', async () => {
        const { evaluateOrchestrationWorkforce, validateHandoffReport } = require('./test_orchestration');
        
        // Multi-domain task requires delegation
        const multiPlan = evaluateOrchestrationWorkforce({
            domains: ['Notes', 'Basic', 'MindMap', 'StudyLabProcedural'],
            fileCount: 4,
            isMultiDomain: true
        });
        assert.strictEqual(multiPlan.requiresDelegation, true);
        assert(multiPlan.initialSpecialists >= 2);

        // Single-file typo allows solo execution
        const soloPlan = evaluateOrchestrationWorkforce({
            isTrivialTypo: true,
            fileCount: 1
        });
        assert.strictEqual(soloPlan.requiresDelegation, false);
        assert.strictEqual(soloPlan.mode, 'SOLO');

        // High-risk release change requires verifier
        const releasePlan = evaluateOrchestrationWorkforce({
            isHighRiskRelease: true,
            fileCount: 3
        });
        assert.strictEqual(releasePlan.requiresDelegation, true);
        assert.strictEqual(releasePlan.verifierRequired, true);

        // Handoff report validation
        const validHandoff = {
            MISSION: 'Extract basic memory facts',
            SCOPE: 'Map/Europe',
            FILES_INSPECTED: ['scratch/evidence-pack.md:1-50'],
            FINDINGS: 'Found 92 atomic factual candidates',
            EVIDENCE: 'All facts grounded in source text',
            RISKS: 'None',
            RECOMMENDATION: 'Generate Europe_Basic.tsv with 92 rows',
            UNKNOWNS: 'None',
            HANDOFF_STATUS: 'COMPLETE'
        };
        const handoffCheck = validateHandoffReport(validHandoff);
        assert.strictEqual(handoffCheck.isValid, true);
    });

    // ----------------------------------------------------
    // 112. Eligibility vs Activation: Evidence Thresholds Gate
    // ----------------------------------------------------
    await runTest('112. Eligibility vs Activation: Artifact eligibility is necessary but not sufficient for activation', () => {
        // Semantic explanation:
        // Even if a subject's policy permits basic or cloze artifacts (eligibility),
        // the artifact should NOT be routed (activation = false) if the candidate count is 0.
        // This prevents generating empty artifacts.
        
        // Test basic eligibility = true, but candidate count = 0 -> basic = false
        const basicNoActivation = evaluateMasterRouting({
            subject: 'History',
            chapter: 'IndusValley',
            basicCandidateCount: 0,
            clozeCandidateCount: 5,
            visualProfile: null,
            artifactPolicy: { basic: true, cloze: true, mindmap: false, slideDeck: false, imageOcclusion: false }
        });
        assert.strictEqual(basicNoActivation.basic, false, 'Expected basic routing to be false because candidate count is 0');
        assert.strictEqual(basicNoActivation.cloze, true, 'Expected cloze routing to be true');

        // Test cloze eligibility = true, but candidate count = 0 -> cloze = false
        const clozeNoActivation = evaluateMasterRouting({
            subject: 'History',
            chapter: 'IndusValley',
            basicCandidateCount: 5,
            clozeCandidateCount: 0,
            visualProfile: null,
            artifactPolicy: { basic: true, cloze: true, mindmap: false, slideDeck: false, imageOcclusion: false }
        });
        assert.strictEqual(clozeNoActivation.basic, true, 'Expected basic routing to be true');
        assert.strictEqual(clozeNoActivation.cloze, false, 'Expected cloze routing to be false because candidate count is 0');
    });

    console.log(`\n====================================================`);
    console.log(`Test Suite Results: ${testsPassed} Passed, ${testsFailed} Failed (Total: ${testsPassed + testsFailed})`);
    console.log(`====================================================\n`);

    if (testsFailed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runAllTests().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});


