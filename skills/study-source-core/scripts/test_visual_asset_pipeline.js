/**
 * test_visual_asset_pipeline.js — Phase 6 Visual Asset Pipeline Test Suite
 * 
 * 5-tier test architecture:
 *  UNIT tests        ~25 — Individual function/module validation
 *  COMPONENT tests   ~12 — Cross-module integration within pipeline
 *  INTEGRATION tests  ~5 — Full pipeline path tests
 *  E2E tests          ~3 — Source-to-artifact complete flows
 *  NEGATIVE tests    ~15 — Adversarial, fail-closed, no-fallback enforcement
 *  CHANGE ISOLATION   ~5 — Existing artifacts unaffected
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SCRIPTS = path.join(__dirname);
const RESOURCES = path.join(__dirname, '..', 'resources');
const SCRATCH = path.join(SCRIPTS, 'scratch', 'test_visual_pipeline');

// Modules under test
const { discoverVisualNeeds, classifyVisualNeed, isValidVisualCategory, VISUAL_NEED_CATEGORIES } = require('./visual_need_discovery');
const { discoverAssets, verifyAssetIntegrity, buildManifest, scanForImages, computeMatchScore, hashFile, getMimeType, getImageDimensions, SUPPORTED_IMAGE_EXTENSIONS } = require('./asset_discovery');
const { evaluateOcclusionEligibility, applyEligibilityToAsset, isOcclusionAppropriate, isValidTargetType, VALID_PROVENANCE, VALID_TARGET_TYPES, MIN_DIMENSION } = require('./occlusion_eligibility');
const { resolveVisualAsset, resolveApprovedAsset, resolveVisualAssetLegacy, normalizeAsset, createProgrammaticSvg, calculateSha256, VALID_PROVENANCE_CLASSES, LEGACY_PROVENANCE_MAP } = require('./resolve_visual_asset');
const { validateImageOcclusionContent, VALID_MODES, VALID_SHAPES, VALID_SOURCE_TYPES, VALID_OCCLUSION_TARGET_TYPES } = require('./validate_image_occlusion');
const { evaluateArtifactRouting } = require('./routing_engine');

let passed = 0;
let failed = 0;
const results = [];

function pass(testNum, desc) {
    passed++;
    results.push({ num: testNum, desc, status: 'PASS' });
    console.log(`  ✅ PASS: ${testNum}. ${desc}`);
}

function fail(testNum, desc, error) {
    failed++;
    results.push({ num: testNum, desc, status: 'FAIL', error });
    console.log(`  ❌ FAIL: ${testNum}. ${desc}`);
    if (error) console.log(`     Reason: ${error}`);
}

function assert(condition, testNum, desc, errorMsg = '') {
    if (condition) pass(testNum, desc);
    else fail(testNum, desc, errorMsg || 'Assertion failed');
}

// ─── Test Fixtures ──────────────────────────────────────────

function setupTestFixtures() {
    // Create scratch directories
    const diagramsRoot = path.join(SCRATCH, 'Sources', 'Diagrams');
    const subjects = ['Biology', 'Chemistry', 'Geography', 'History', 'Map', 'Math', 'Physics', 'Political Science', 'Reasoning'];
    for (const s of subjects) {
        fs.mkdirSync(path.join(diagramsRoot, s), { recursive: true });
    }

    // Create a test PNG (minimal valid PNG)
    const pngHeader = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x01, 0x00, // width = 256
        0x00, 0x00, 0x00, 0xC8, // height = 200
        0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, etc.
        0x00, 0x00, 0x00, 0x00, // CRC (placeholder)
        0x00, 0x00, 0x00, 0x00, // IEND
        0x49, 0x45, 0x4E, 0x44, // IEND tag
        0xAE, 0x42, 0x60, 0x82  // IEND CRC
    ]);

    // Create a high-res test PNG (width=400, height=300)
    const highResPng = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x01, 0x90, // width = 400
        0x00, 0x00, 0x01, 0x2C, // height = 300
        0x08, 0x02, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4E, 0x44,
        0xAE, 0x42, 0x60, 0x82
    ]);

    // Create a tiny PNG (width=50, height=50 — below MIN_DIMENSION)
    const tinyPng = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x32, // width = 50
        0x00, 0x00, 0x00, 0x32, // height = 50
        0x08, 0x02, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4E, 0x44,
        0xAE, 0x42, 0x60, 0x82
    ]);

    // Write test assets
    fs.writeFileSync(path.join(diagramsRoot, 'Biology', 'cell_structure_mitosis.png'), highResPng);
    fs.writeFileSync(path.join(diagramsRoot, 'Biology', 'digestive_system.png'), highResPng);
    fs.writeFileSync(path.join(diagramsRoot, 'Geography', 'india_rivers_map.png'), highResPng);
    fs.writeFileSync(path.join(diagramsRoot, 'Physics', 'circuit_series_parallel.png'), highResPng);
    fs.writeFileSync(path.join(diagramsRoot, 'Chemistry', 'reaction_mechanism_sn2.png'), highResPng);
    fs.writeFileSync(path.join(diagramsRoot, 'Biology', 'tiny_icon.png'), tinyPng);

    // Create an SVG test file
    const testSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#f0f0f0"/>
  <text x="400" y="300" text-anchor="middle" font-size="24">Heart Anatomy</text>
</svg>`;
    fs.writeFileSync(path.join(diagramsRoot, 'Biology', 'heart_anatomy.svg'), testSvg);

    // Media directory for resolver tests
    fs.mkdirSync(path.join(SCRATCH, 'media'), { recursive: true });

    return { diagramsRoot, highResPng, tinyPng, testSvg };
}

function cleanupTestFixtures() {
    try {
        fs.rmSync(SCRATCH, { recursive: true, force: true });
    } catch (e) {}
}

// ─── RUN TESTS ──────────────────────────────────────────────

console.log('\n====================================================');
console.log('Phase 6: Visual Asset Pipeline Test Suite');
console.log('====================================================\n');

cleanupTestFixtures();
const fixtures = setupTestFixtures();

// ═══════════════════════════════════════════════════════════
// UNIT TESTS (~25)
// ═══════════════════════════════════════════════════════════

console.log('--- UNIT TESTS ---\n');

// 1. Visual need categories count
assert(VISUAL_NEED_CATEGORIES.size === 16, 1, 'Visual Need Discovery: 16 canonical visual categories defined');

// 2. isValidVisualCategory works
assert(
    isValidVisualCategory('anatomical_diagram') && isValidVisualCategory('circuit') && !isValidVisualCategory('random_thing'),
    2, 'Visual Need Discovery: isValidVisualCategory correctly validates categories'
);

// 3. classifyVisualNeed detects anatomy
{
    const result = classifyVisualNeed('The heart anatomy consists of four chambers', 'Biology');
    assert(result && result.category === 'anatomical_diagram' && result.is_subject_preferred === true,
        3, 'Visual Need Discovery: classifyVisualNeed detects anatomical_diagram for Biology');
}

// 4. classifyVisualNeed detects circuit
{
    const result = classifyVisualNeed('A series circuit with resistors and battery', 'Physics');
    assert(result && result.category === 'circuit' && result.is_subject_preferred === true,
        4, 'Visual Need Discovery: classifyVisualNeed detects circuit for Physics');
}

// 5. classifyVisualNeed detects map
{
    const result = classifyVisualNeed('The boundary of the country with its territory and state', 'Geography');
    assert(result && (result.category === 'map' || result.category === 'geographical_feature'),
        5, 'Visual Need Discovery: classifyVisualNeed detects map/geographical_feature for Geography');
}

// 6. classifyVisualNeed returns null for non-visual
{
    const result = classifyVisualNeed('Abstract mathematical theorem proof', 'Math');
    assert(result === null, 6, 'Visual Need Discovery: classifyVisualNeed returns null for non-visual text');
}

// 7. discoverVisualNeeds with Biology evidence
{
    const result = discoverVisualNeeds({
        subject: 'Biology', chapter: 'Cell Structure',
        evidenceContent: 'The cell has organelles including mitochondria, cell membrane, nucleus. Anatomy of the plant cell.'
    });
    assert(result.has_visual_need === true && result.visual_needs.length > 0 && result.discovery_status === 'VISUAL_NEEDS_IDENTIFIED',
        7, 'Visual Need Discovery: Biology evidence with cell anatomy discovers visual needs');
}

// 8. discoverVisualNeeds with no visual content
{
    const result = discoverVisualNeeds({
        subject: 'Math', chapter: 'Number Theory',
        evidenceContent: 'The fundamental theorem states that every integer has a unique prime factorization.'
    });
    assert(result.has_visual_need === false && result.discovery_status === 'NO_VISUAL_NEEDS',
        8, 'Visual Need Discovery: Pure number theory with no visual keywords returns NO_VISUAL_NEEDS');
}

// 9. discoverVisualNeeds throws on missing subject
{
    let threw = false;
    try { discoverVisualNeeds({ chapter: 'Ch1', evidenceContent: 'test' }); } catch (e) { threw = true; }
    assert(threw, 9, 'Visual Need Discovery: throws on missing subject');
}

// 10. discoverVisualNeeds handles empty evidence
{
    const result = discoverVisualNeeds({ subject: 'Biology', chapter: 'Ch1', evidenceContent: '' });
    assert(result.discovery_status === 'NO_EVIDENCE_CONTENT', 10, 'Visual Need Discovery: empty evidence returns NO_EVIDENCE_CONTENT');
}

// 11. Asset discovery: SUPPORTED_IMAGE_EXTENSIONS
assert(
    SUPPORTED_IMAGE_EXTENSIONS.has('.png') && SUPPORTED_IMAGE_EXTENSIONS.has('.jpg') && SUPPORTED_IMAGE_EXTENSIONS.has('.svg') && !SUPPORTED_IMAGE_EXTENSIONS.has('.txt'),
    11, 'Asset Discovery: Supported image extensions include png/jpg/svg but not txt'
);

// 12. computeMatchScore: chapter match
{
    const score = computeMatchScore('cell_structure_mitosis.png', 'Cell Structure');
    assert(score > 0, 12, 'Asset Discovery: computeMatchScore returns positive score for matching chapter name');
}

// 13. computeMatchScore: no match
{
    const score = computeMatchScore('random_photo.png', 'Chemical Equilibrium');
    assert(score === 0, 13, 'Asset Discovery: computeMatchScore returns 0 for non-matching filename');
}

// 14. hashFile produces valid SHA-256
{
    const testFile = path.join(fixtures.diagramsRoot, 'Biology', 'cell_structure_mitosis.png');
    const hash = hashFile(testFile);
    assert(typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash), 14, 'Asset Discovery: hashFile produces valid 64-char SHA-256');
}

// 15. getMimeType returns correct types
{
    assert(
        getMimeType('test.png') === 'image/png' && getMimeType('test.jpg') === 'image/jpeg' && getMimeType('test.svg') === 'image/svg+xml',
        15, 'Asset Discovery: getMimeType returns correct MIME types'
    );
}

// 16. getImageDimensions reads PNG dimensions
{
    const testFile = path.join(fixtures.diagramsRoot, 'Biology', 'cell_structure_mitosis.png');
    const dims = getImageDimensions(testFile);
    assert(dims.width === 400 && dims.height === 300, 16, 'Asset Discovery: getImageDimensions reads PNG dimensions correctly');
}

// 17. getImageDimensions reads SVG dimensions
{
    const testFile = path.join(fixtures.diagramsRoot, 'Biology', 'heart_anatomy.svg');
    const dims = getImageDimensions(testFile);
    assert(dims.width === 800 && dims.height === 600, 17, 'Asset Discovery: getImageDimensions reads SVG viewBox dimensions');
}

// 18. VALID_PROVENANCE contains Phase 6 classes
assert(
    VALID_PROVENANCE.has('source_embedded') && VALID_PROVENANCE.has('approved_local') && VALID_PROVENANCE.has('derived') && !VALID_PROVENANCE.has('ai_generated'),
    18, 'Occlusion Eligibility: VALID_PROVENANCE contains Phase 6 classes only'
);

// 19. MIN_DIMENSION is 200
assert(MIN_DIMENSION === 200, 19, 'Occlusion Eligibility: MIN_DIMENSION is 200px');

// 20. isValidTargetType validates correctly
assert(
    isValidTargetType('labels') && isValidTargetType('structures') && isValidTargetType('map_locations') && !isValidTargetType('decoration'),
    20, 'Occlusion Eligibility: isValidTargetType validates canonical target types'
);

// 21. VALID_PROVENANCE_CLASSES in resolver
assert(
    VALID_PROVENANCE_CLASSES.has('approved_local') && VALID_PROVENANCE_CLASSES.has('source_embedded') && !VALID_PROVENANCE_CLASSES.has('ai_generated'),
    21, 'Asset Resolver: VALID_PROVENANCE_CLASSES contains Phase 6 classes'
);

// 22. LEGACY_PROVENANCE_MAP maps correctly
assert(
    LEGACY_PROVENANCE_MAP['source_provided'] === 'source_embedded' && LEGACY_PROVENANCE_MAP['user_provided'] === 'user_supplied' && LEGACY_PROVENANCE_MAP['programmatic'] === 'derived',
    22, 'Asset Resolver: LEGACY_PROVENANCE_MAP maps old provenance to Phase 6'
);

// 23. calculateSha256 consistency
{
    const buf = Buffer.from('test content for hash');
    const h1 = calculateSha256(buf);
    const h2 = calculateSha256(buf);
    assert(h1 === h2 && /^[a-f0-9]{64}$/.test(h1), 23, 'Asset Resolver: calculateSha256 produces deterministic SHA-256');
}

// 24. createProgrammaticSvg produces valid SVG
{
    const svg = createProgrammaticSvg('Test Diagram', 1200, 800, [
        { shape: 'rectangle', coordinates: [100, 100, 200, 150], label: 'Part A' }
    ]);
    assert(svg.includes('viewBox="0 0 1200 800"') && svg.includes('Test Diagram') && svg.includes('Part A'),
        24, 'Asset Resolver: createProgrammaticSvg produces valid SVG with shapes and labels');
}

// 25. VALID_SOURCE_TYPES in validator includes both old and new
assert(
    VALID_SOURCE_TYPES.has('source_provided') && VALID_SOURCE_TYPES.has('approved_local') && VALID_SOURCE_TYPES.has('source_embedded'),
    25, 'IO Validator: VALID_SOURCE_TYPES includes both legacy and Phase 6 provenance types'
);

// ═══════════════════════════════════════════════════════════
// COMPONENT TESTS (~12)
// ═══════════════════════════════════════════════════════════

console.log('\n--- COMPONENT TESTS ---\n');

// 26. discoverAssets finds matching chapter assets
{
    const result = discoverAssets({
        subject: 'Biology', chapter: 'Cell Structure',
        diagramsRoot: fixtures.diagramsRoot
    });
    assert(result.status === 'ASSETS_DISCOVERED' && result.assets.length > 0 && result.assets[0].source_provenance === 'approved_local',
        26, 'Asset Discovery: discoverAssets finds matching Biology/Cell Structure assets');
}

// 27. discoverAssets returns NO_APPROVED_ASSET for non-matching chapter
{
    const result = discoverAssets({
        subject: 'Biology', chapter: 'Quantum Mechanics',
        diagramsRoot: fixtures.diagramsRoot
    });
    assert(result.status === 'NO_APPROVED_ASSET', 27, 'Asset Discovery: discoverAssets returns NO_APPROVED_ASSET for non-matching chapter');
}

// 28. discoverAssets returns NO_APPROVED_ASSET for empty subject dir
{
    const result = discoverAssets({
        subject: 'Reasoning', chapter: 'Syllogisms',
        diagramsRoot: fixtures.diagramsRoot
    });
    assert(result.status === 'NO_APPROVED_ASSET', 28, 'Asset Discovery: discoverAssets returns NO_APPROVED_ASSET for empty subject directory');
}

// 29. Asset manifest has correct structure
{
    const result = discoverAssets({ subject: 'Biology', chapter: 'Cell Structure', diagramsRoot: fixtures.diagramsRoot });
    const m = result.manifest;
    assert(m.manifest_version === '1.0.0' && m.subject === 'Biology' && m.chapter === 'Cell Structure' && Array.isArray(m.assets),
        29, 'Asset Discovery: Manifest has correct structure (version, subject, chapter, assets array)');
}

// 30. verifyAssetIntegrity detects intact asset
{
    const result = discoverAssets({ subject: 'Biology', chapter: 'Cell Structure', diagramsRoot: fixtures.diagramsRoot });
    if (result.assets.length > 0) {
        const integrity = verifyAssetIntegrity(result.assets[0], fixtures.diagramsRoot);
        assert(integrity.intact === true && integrity.status === 'same', 30, 'Asset Discovery: verifyAssetIntegrity confirms intact asset');
    } else {
        fail(30, 'Asset Discovery: verifyAssetIntegrity confirms intact asset', 'No assets found');
    }
}

// 31. verifyAssetIntegrity detects missing asset
{
    const fakeAsset = { local_path: 'Biology/nonexistent_diagram.png', sha256: 'abc123' };
    const integrity = verifyAssetIntegrity(fakeAsset, fixtures.diagramsRoot);
    assert(integrity.intact === false && integrity.status === 'missing', 31, 'Asset Discovery: verifyAssetIntegrity detects missing asset');
}

// 32. evaluateOcclusionEligibility: eligible asset
{
    const asset = {
        source_provenance: 'approved_local', subject: 'Biology', chapter: 'Cell Structure',
        width: 400, height: 300, local_path: 'Biology/cell.png', sha256: 'a'.repeat(64),
        status: 'approved', asset_type: 'image/png'
    };
    const elig = evaluateOcclusionEligibility(asset, { subject: 'Biology', chapter: 'Cell Structure' });
    assert(elig.eligible === true && elig.reason === 'ELIGIBLE', 32, 'Occlusion Eligibility: Approved asset with valid metadata is ELIGIBLE');
}

// 33. evaluateOcclusionEligibility: missing provenance
{
    const asset = { subject: 'Biology', chapter: 'Ch1', width: 400, height: 300, local_path: 'x.png', status: 'approved', asset_type: 'image/png' };
    const elig = evaluateOcclusionEligibility(asset);
    assert(elig.eligible === false && elig.reason.includes('MISSING_OR_INVALID_PROVENANCE'),
        33, 'Occlusion Eligibility: Missing provenance → FAIL');
}

// 34. evaluateOcclusionEligibility: inadequate resolution
{
    const asset = {
        source_provenance: 'approved_local', subject: 'Bio', chapter: 'Ch1',
        width: 50, height: 50, local_path: 'x.png', sha256: 'a'.repeat(64), status: 'approved', asset_type: 'image/png'
    };
    const elig = evaluateOcclusionEligibility(asset);
    assert(elig.eligible === false && elig.reason.includes('INADEQUATE_RESOLUTION'),
        34, 'Occlusion Eligibility: 50x50 resolution → INADEQUATE_RESOLUTION');
}

// 35. evaluateOcclusionEligibility: cross-chapter reuse blocked
{
    const asset = {
        source_provenance: 'approved_local', subject: 'Biology', chapter: 'Genetics',
        width: 400, height: 300, local_path: 'x.png', sha256: 'a'.repeat(64), status: 'approved', asset_type: 'image/png'
    };
    const elig = evaluateOcclusionEligibility(asset, { subject: 'Biology', chapter: 'Cell Structure' });
    assert(elig.eligible === false && elig.reason.includes('CROSS_CHAPTER_REUSE_BLOCKED'),
        35, 'Occlusion Eligibility: Cross-chapter reuse → BLOCKED');
}

// 36. resolveApprovedAsset with valid source
{
    const sourceFile = path.join(fixtures.diagramsRoot, 'Biology', 'cell_structure_mitosis.png');
    const mediaDir = path.join(SCRATCH, 'media_test_36');
    const result = resolveApprovedAsset({ targetMediaDir: mediaDir, sourceAssetPath: sourceFile, candidate: { target_title: 'Cell Structure' } });
    assert(result.success === true && result.status === 'ASSET_RESOLVED' && result.strategy === 'approved_local',
        36, 'Asset Resolver: resolveApprovedAsset succeeds with valid approved local asset');
}

// 37. resolveApprovedAsset with no source → NO_APPROVED_ASSET
{
    const result = resolveApprovedAsset({ targetMediaDir: path.join(SCRATCH, 'media_test_37'), candidate: { target_title: 'Missing Diagram' } });
    assert(result.success === false && result.status === 'NO_APPROVED_ASSET',
        37, 'Asset Resolver: resolveApprovedAsset returns NO_APPROVED_ASSET when no source');
}

// ═══════════════════════════════════════════════════════════
// INTEGRATION TESTS (~5)
// ═══════════════════════════════════════════════════════════

console.log('\n--- INTEGRATION TESTS ---\n');

// 38. Full pipeline: Evidence → Visual Need → Asset Discovery → Eligible
{
    const needs = discoverVisualNeeds({
        subject: 'Biology', chapter: 'Cell Structure',
        evidenceContent: 'The cell membrane, mitochondria, and nucleus form the basic anatomy of plant and animal cells.'
    });
    const assets = discoverAssets({
        subject: 'Biology', chapter: 'Cell Structure',
        diagramsRoot: fixtures.diagramsRoot,
        visualNeeds: needs.visual_needs
    });
    let eligible = false;
    if (assets.assets.length > 0) {
        const elig = evaluateOcclusionEligibility(assets.assets[0], { subject: 'Biology', chapter: 'Cell Structure' });
        eligible = elig.eligible;
    }
    assert(needs.has_visual_need && assets.status === 'ASSETS_DISCOVERED' && eligible,
        38, 'Integration: Evidence → Visual Need → Asset Discovery → Eligibility = PASS (full path)');
}

// 39. Full pipeline: No visual need → IO suppressed at discovery stage
{
    const needs = discoverVisualNeeds({
        subject: 'Math', chapter: 'Number Theory',
        evidenceContent: 'Every positive integer greater than 1 is either prime or composite.'
    });
    assert(needs.has_visual_need === false && needs.discovery_status === 'NO_VISUAL_NEEDS',
        39, 'Integration: Pure theory evidence → NO_VISUAL_NEEDS → IO suppressed at discovery');
}

// 40. Full pipeline: Visual need identified but no asset → NO_APPROVED_ASSET
{
    const needs = discoverVisualNeeds({
        subject: 'Physics', chapter: 'Optics',
        evidenceContent: 'Ray diagram showing refraction through a convex lens and image formation at focal point.'
    });
    const assets = discoverAssets({
        subject: 'Physics', chapter: 'Optics',
        diagramsRoot: fixtures.diagramsRoot
    });
    assert(needs.has_visual_need === true && assets.status === 'NO_APPROVED_ASSET',
        40, 'Integration: Visual need exists but no matching asset → NO_APPROVED_ASSET');
}

// 41. Routing engine NO_APPROVED_ASSET suppression
{
    const routing = evaluateArtifactRouting({
        subject: 'Biology', chapter: 'Cell Structure',
        ioCandidateCount: 3, visualProfile: { io_worthiness: 80 },
        approvedAssetCount: 0
    });
    assert(routing.imageOcclusion === false && routing.suppressions && routing.suppressions.imageOcclusion === 'NO_APPROVED_ASSET',
        41, 'Routing Engine: approvedAssetCount=0 → imageOcclusion suppressed with NO_APPROVED_ASSET');
}

// 42. IO Validator accepts Phase 6 provenance types
{
    const testManifest = {
        id: 'test-io-1', title: 'Test IO', subject: 'Biology', chapter: 'Cell Structure',
        cards: [{
            id: 'card-1',
            source: { chapter: 'Cell Structure', evidence_ids: ['ev-1'] },
            asset: { path: 'media/cell.png', width: 400, height: 300, source_type: 'approved_local', sha256: 'a'.repeat(64), provenance_note: 'Approved local diagram' },
            mode: 'hide_all_guess_one',
            regions: [{
                id: 'r-1', shape: 'rectangle', coordinates: [10, 10, 100, 100],
                answer: 'Mitochondria', label: 'मायटोकॉन्ड्रिया'
            }]
        }]
    };
    const result = validateImageOcclusionContent(testManifest);
    assert(result.isValid === true, 42, 'IO Validator: Accepts Phase 6 approved_local provenance with sha256 and provenance_note');
}

// ═══════════════════════════════════════════════════════════
// E2E TESTS (~3)
// ═══════════════════════════════════════════════════════════

console.log('\n--- E2E TESTS ---\n');

// 43. E2E: Source → Evidence → Visual Need → Approved Asset → IO → Validator → PASS
{
    // Simulate full pipeline
    const evidenceContent = 'Cell anatomy including cell membrane, nucleus, mitochondria, ribosomes. The digestive system has stomach, intestines, liver.';
    const needs = discoverVisualNeeds({ subject: 'Biology', chapter: 'Digestive System', evidenceContent });
    const assets = discoverAssets({ subject: 'Biology', chapter: 'Digestive System', diagramsRoot: fixtures.diagramsRoot, visualNeeds: needs.visual_needs });

    if (assets.assets.length > 0) {
        const asset = assets.assets[0];
        const mediaDir = path.join(SCRATCH, 'e2e_test_43', 'media');
        const resolved = resolveApprovedAsset({ targetMediaDir: mediaDir, sourceAssetPath: asset.absolute_path, candidate: { target_title: 'Digestive System' } });

        if (resolved.success) {
            const ioManifest = {
                id: 'e2e-io-1', title: 'Digestive System IO', subject: 'Biology', chapter: 'Digestive System',
                cards: [{
                    id: 'e2e-card-1',
                    source: { chapter: 'Digestive System', evidence_ids: ['ev-1'] },
                    asset: { ...resolved.asset, source_type: resolved.asset.source_type },
                    mode: 'hide_all_guess_one',
                    regions: [{ id: 'r-1', shape: 'rectangle', coordinates: [10, 10, 100, 80], answer: 'Stomach', label: 'पेट' }]
                }]
            };
            const validation = validateImageOcclusionContent(ioManifest);
            assert(validation.isValid === true, 43, 'E2E: Full pipeline Source → Evidence → IO → Validator = PASS');
        } else {
            fail(43, 'E2E: Full pipeline Source → Evidence → IO → Validator = PASS', 'Resolver failed');
        }
    } else {
        fail(43, 'E2E: Full pipeline Source → Evidence → IO → Validator = PASS', 'No matching assets for Digestive System');
    }
}

// 44. E2E: No asset → NO_APPROVED_ASSET terminal state
{
    const needs = discoverVisualNeeds({
        subject: 'Reasoning', chapter: 'Syllogisms',
        evidenceContent: 'All dogs are animals. Some animals are cats. Therefore...'
    });
    const assets = discoverAssets({ subject: 'Reasoning', chapter: 'Syllogisms', diagramsRoot: fixtures.diagramsRoot });
    assert(assets.status === 'NO_APPROVED_ASSET', 44, 'E2E: Empty subject directory → NO_APPROVED_ASSET terminal state');
}

// 45. E2E: No visual need → IO suppressed at visual need stage
{
    const needs = discoverVisualNeeds({
        subject: 'Political Science', chapter: 'Constitutional Amendments',
        evidenceContent: 'The 42nd amendment to the Indian Constitution added the words socialist and secular to the preamble.'
    });
    assert(needs.has_visual_need === false, 45, 'E2E: Non-visual source (constitutional law) → IO suppressed at discovery');
}

// ═══════════════════════════════════════════════════════════
// NEGATIVE / ADVERSARIAL TESTS (~15)
// ═══════════════════════════════════════════════════════════

console.log('\n--- NEGATIVE / ADVERSARIAL TESTS ---\n');

// 46. Missing asset → fail closed
{
    const result = resolveApprovedAsset({ targetMediaDir: path.join(SCRATCH, 'neg_46') });
    assert(result.success === false && result.status === 'NO_APPROVED_ASSET',
        46, 'Negative: Missing asset → resolveApprovedAsset fails closed with NO_APPROVED_ASSET');
}

// 47. Wrong subject directory → fail closed
{
    const result = discoverAssets({ subject: 'NonExistentSubject', chapter: 'Ch1', diagramsRoot: fixtures.diagramsRoot });
    assert(result.status === 'NO_APPROVED_ASSET', 47, 'Negative: Non-existent subject directory → NO_APPROVED_ASSET');
}

// 48. Wrong chapter → no match
{
    const result = discoverAssets({ subject: 'Biology', chapter: 'Astrophysics', diagramsRoot: fixtures.diagramsRoot });
    assert(result.status === 'NO_APPROVED_ASSET', 48, 'Negative: Wrong chapter with no filename match → NO_APPROVED_ASSET');
}

// 49. Missing provenance → eligibility fail
{
    const asset = { subject: 'Bio', chapter: 'Ch1', width: 400, height: 300, local_path: 'x.png', status: 'approved', asset_type: 'image/png' };
    const elig = evaluateOcclusionEligibility(asset);
    assert(elig.eligible === false && elig.failures.includes('MISSING_OR_INVALID_PROVENANCE'),
        49, 'Negative: Missing provenance → eligibility FAIL');
}

// 50. Corrupted asset (null asset) → fail
{
    const elig = evaluateOcclusionEligibility(null);
    assert(elig.eligible === false && elig.reason === 'NO_ASSET_PROVIDED',
        50, 'Negative: Null asset → eligibility FAIL with NO_ASSET_PROVIDED');
}

// 51. Non-image asset type → fail
{
    const asset = {
        source_provenance: 'approved_local', subject: 'Bio', chapter: 'Ch1',
        width: 400, height: 300, local_path: 'x.pdf', sha256: 'a'.repeat(64),
        status: 'approved', asset_type: 'application/pdf'
    };
    const elig = evaluateOcclusionEligibility(asset);
    assert(elig.eligible === false && elig.reason.includes('NON_IMAGE_ASSET_TYPE'),
        51, 'Negative: PDF asset type → NON_IMAGE_ASSET_TYPE rejection');
}

// 52. Rejected asset → fail
{
    const asset = {
        source_provenance: 'approved_local', subject: 'Bio', chapter: 'Ch1',
        width: 400, height: 300, local_path: 'x.png', sha256: 'a'.repeat(64),
        status: 'rejected', rejection_reason: 'Decorative image', asset_type: 'image/png'
    };
    const elig = evaluateOcclusionEligibility(asset);
    assert(elig.eligible === false && elig.reason.includes('ASSET_PREVIOUSLY_REJECTED'),
        52, 'Negative: Previously rejected asset → eligibility FAIL');
}

// 53. No web fallback enforcement: resolveVisualAsset (Phase 6) NEVER has AI/external tiers
{
    const result = resolveVisualAsset({
        phase6: true,
        targetMediaDir: path.join(SCRATCH, 'neg_53'),
        aiGeneratedData: Buffer.from('fake ai image'),
        externalSpec: { buffer: Buffer.from('fake external'), source: 'web' }
    });
    assert(result.success === false && result.status === 'NO_AI_FALLBACK',
        53, 'Negative: Phase 6 resolveVisualAsset rejects AI data and returns NO_AI_FALLBACK');
}

// 54. No AI generation fallback enforcement
{
    const result = resolveApprovedAsset({
        targetMediaDir: path.join(SCRATCH, 'neg_54'),
        aiGeneratedData: Buffer.from('fake ai image')
    });
    assert(result.success === false && result.status === 'NO_AI_FALLBACK',
        54, 'Negative: resolveApprovedAsset never uses AI data, returns NO_AI_FALLBACK');
}

// 55. No random local file fallback
{
    const randomFile = path.join(SCRATCH, 'random_unrelated.png');
    fs.writeFileSync(randomFile, fixtures.highResPng || Buffer.from([0x89, 0x50, 0x4E, 0x47]));
    // The resolver only accepts sourceAssetPath that actually exists; it cannot scan random directories
    const result = resolveApprovedAsset({ targetMediaDir: path.join(SCRATCH, 'neg_55') });
    assert(result.success === false && result.status === 'NO_APPROVED_ASSET',
        55, 'Negative: No random local file fallback — resolver requires explicit sourceAssetPath');
}

// 56. Cross-chapter reuse without explicit relationship → blocked
{
    const asset = {
        source_provenance: 'approved_local', subject: 'Biology', chapter: 'Reproduction',
        width: 400, height: 300, local_path: 'Biology/cell.png', sha256: 'a'.repeat(64),
        status: 'approved', asset_type: 'image/png'
    };
    const elig = evaluateOcclusionEligibility(asset, { subject: 'Biology', chapter: 'Cell Structure' });
    assert(elig.eligible === false && elig.reason.includes('CROSS_CHAPTER_REUSE_BLOCKED'),
        56, 'Negative: Cross-chapter reuse without explicit relationship → BLOCKED');
}

// 57. Missing file path → fail
{
    const asset = { source_provenance: 'approved_local', subject: 'Bio', chapter: 'Ch1', width: 400, height: 300, status: 'approved', asset_type: 'image/png', sha256: 'a'.repeat(64) };
    const elig = evaluateOcclusionEligibility(asset);
    assert(elig.eligible === false && elig.reason.includes('MISSING_FILE_PATH'),
        57, 'Negative: Missing local_path → MISSING_FILE_PATH');
}

// 58. discoverVisualNeeds throws on missing chapter
{
    let threw = false;
    try { discoverVisualNeeds({ subject: 'Biology', evidenceContent: 'test' }); } catch (e) { threw = true; }
    assert(threw, 58, 'Negative: discoverVisualNeeds throws on missing chapter');
}

// 59. Legacy resolver still works (backwards compatibility preserved)
{
    const svg = createProgrammaticSvg('Legacy Test', 800, 600);
    const mediaDir = path.join(SCRATCH, 'legacy_59');
    const result = resolveVisualAssetLegacy({
        targetMediaDir: mediaDir,
        programmaticSpec: { title: 'Legacy Diagram', width: 800, height: 600, slug: 'legacy_test' }
    });
    assert(result.success === true && result.tier === 2 && result.strategy === 'programmatic',
        59, 'Negative: Legacy resolveVisualAssetLegacy still works for backwards compatibility');
}

// 60. IO Validator rejects invalid sha256
{
    const testManifest = {
        id: 'test-neg-60', title: 'Test', subject: 'Biology', chapter: 'Ch1',
        cards: [{
            id: 'card-1',
            source: { chapter: 'Ch1', evidence_ids: ['ev-1'] },
            asset: { path: 'media/x.png', width: 400, height: 300, source_type: 'approved_local', sha256: 'invalid_hash', provenance_note: 'test' },
            mode: 'hide_all_guess_one',
            regions: [{ id: 'r-1', shape: 'rectangle', coordinates: [10, 10, 100, 100], answer: 'A', label: 'ए' }]
        }]
    };
    const result = validateImageOcclusionContent(testManifest);
    // Should pass validation but with warnings about invalid hash
    assert(result.isValid === true && result.warnings.some(w => w.includes('sha256')),
        60, 'Negative: IO Validator warns on invalid SHA-256 hash format');
}

// ═══════════════════════════════════════════════════════════
// CHANGE ISOLATION TESTS (~5)
// ═══════════════════════════════════════════════════════════

console.log('\n--- CHANGE ISOLATION TESTS ---\n');

// 61. Routing engine still produces notes for all subjects
{
    const routing = evaluateArtifactRouting({ subject: 'Biology', chapter: 'Cell Structure', ioCandidateCount: 0 });
    assert(routing.notes === true, 61, 'Change Isolation: Notes generation unaffected by Phase 6 visual pipeline changes');
}

// 62. Routing engine still produces basic Anki
{
    const routing = evaluateArtifactRouting({ subject: 'Math', chapter: 'LCM-HCF', basicCandidateCount: 5 });
    assert(routing.basic === true, 62, 'Change Isolation: Basic Anki generation unaffected');
}

// 63. Routing engine still produces cloze Anki
{
    const routing = evaluateArtifactRouting({ subject: 'Physics', chapter: 'Circuits', clozeCandidateCount: 5 });
    assert(routing.cloze === true, 63, 'Change Isolation: Cloze Anki generation unaffected');
}

// 64. Routing engine still produces mindmap when eligible
{
    const routing = evaluateArtifactRouting({ subject: 'Biology', chapter: 'Cell', mindmapCandidateCount: 3, relationalTopologyDepth: 3 });
    assert(routing.mindmap === true, 64, 'Change Isolation: MindMap generation unaffected');
}

// 65. Routing engine still produces slideDeck when eligible
{
    const routing = evaluateArtifactRouting({ subject: 'Biology', chapter: 'Cell', deckWorthiness: 80 });
    assert(routing.slideDeck === true, 65, 'Change Isolation: SlideDeck generation unaffected');
}

// ═══════════════════════════════════════════════════════════
// SCHEMA VALIDATION TESTS (~3 bonus)
// ═══════════════════════════════════════════════════════════

console.log('\n--- SCHEMA VALIDATION TESTS ---\n');

// 66. Asset manifest schema exists and is valid JSON
{
    const schemaPath = path.join(RESOURCES, 'asset-manifest-schema.json');
    let valid = false;
    try {
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        valid = schema.title === 'StudySourceCoreAssetManifest' && schema.required.includes('assets');
    } catch (e) {}
    assert(valid, 66, 'Schema: asset-manifest-schema.json exists and has correct structure');
}

// 67. Subject visual rules file exists and covers all subjects
{
    const rulesPath = path.join(RESOURCES, 'subject-visual-rules.json');
    let valid = false;
    try {
        const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
        const subjects = rules.subjects || rules;
        valid = subjects.Biology && subjects.Chemistry && subjects.Geography && subjects.Physics && subjects.Reasoning;
    } catch (e) {}
    assert(valid, 67, 'Schema: subject-visual-rules.json exists and covers all major subjects');
}

// 68. IO Schema accepts Phase 6 provenance and target types
{
    const schemaPath = path.join(RESOURCES, 'image-occlusion-schema.json');
    let valid = false;
    try {
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        const sourceTypes = schema.properties.cards.items.properties.asset.properties.source_type.enum;
        valid = sourceTypes.includes('approved_local') && sourceTypes.includes('source_embedded');
        // Also check sha256 field exists
        valid = valid && schema.properties.cards.items.properties.asset.properties.sha256;
    } catch (e) {}
    assert(valid, 68, 'Schema: image-occlusion-schema.json includes Phase 6 provenance types and sha256 field');
}

// ═══════════════════════════════════════════════════════════
// PHASE 6.1 BOUNDARY HARDENING TESTS (69–88)
// ═══════════════════════════════════════════════════════════

console.log('\n--- PHASE 6.1 BOUNDARY HARDENING TESTS ---\n');

// 69. Resolver: External input in Phase 6 returns NO_EXTERNAL_FALLBACK
{
    const result = resolveApprovedAsset({
        targetMediaDir: path.join(SCRATCH, 'neg_69'),
        externalSpec: { buffer: Buffer.from('external image'), source: 'web' }
    });
    assert(result.success === false && result.status === 'NO_EXTERNAL_FALLBACK',
        69, 'Phase 6.1 Resolver: External asset input fails closed with NO_EXTERNAL_FALLBACK');
}

// 70. Resolver: Programmatic input in Phase 6 returns NO_PROGRAMMATIC_FALLBACK
{
    const result = resolveApprovedAsset({
        targetMediaDir: path.join(SCRATCH, 'neg_70'),
        programmaticSpec: { title: 'Programmatic Diagram', width: 800, height: 600 }
    });
    assert(result.success === false && result.status === 'NO_PROGRAMMATIC_FALLBACK',
        70, 'Phase 6.1 Resolver: Programmatic spec fails closed with NO_PROGRAMMATIC_FALLBACK');
}

// 71. Resolver: resolveVisualAsset({ phase6: false }) without legacy flag fails closed
{
    const result = resolveVisualAsset({
        phase6: false,
        targetMediaDir: path.join(SCRATCH, 'neg_71'),
        candidate: { target_title: 'Unapproved diagram' }
    });
    assert(result.success === false && result.status === 'NO_APPROVED_ASSET',
        71, 'Phase 6.1 Resolver: phase6: false does not silently enable legacy fallback');
}

// 72. Approval vs Eligibility: discoverAssets initializes occlusion_eligible to false
{
    const result = discoverAssets({
        subject: 'Biology',
        chapter: 'Cell Structure',
        diagramsRoot: fixtures.diagramsRoot
    });
    assert(result.status === 'ASSETS_DISCOVERED' && result.assets.length > 0 && result.assets[0].occlusion_eligible === false && result.assets[0].status === 'approved',
        72, 'Phase 6.1 Approval vs Eligibility: Discovered asset is approved in drop folder but occlusion_eligible is false');
}

// 73. Approval vs Eligibility: applyEligibilityToAsset sets occlusion_eligible to true after passing checks
{
    const validAsset = {
        source_provenance: 'approved_local',
        subject: 'Biology',
        chapter: 'Cell Structure',
        width: 400,
        height: 300,
        local_path: 'Biology/cell_structure_mitosis.png',
        absolute_path: path.join(fixtures.diagramsRoot, 'Biology', 'cell_structure_mitosis.png'),
        sha256: hashFile(path.join(fixtures.diagramsRoot, 'Biology', 'cell_structure_mitosis.png')),
        status: 'approved',
        asset_type: 'image/png',
        occlusion_eligible: false
    };
    const eligResult = applyEligibilityToAsset(validAsset, { subject: 'Biology', chapter: 'Cell Structure' });
    assert(eligResult.eligible === true && validAsset.occlusion_eligible === true && validAsset.rejection_reason === null,
        73, 'Phase 6.1 Approval vs Eligibility: Eligibility engine confirms occlusion_eligible: true');
}

// 74. Approval vs Eligibility: Low-res asset in approved drop folder is rejected by eligibility
{
    const lowResAsset = {
        source_provenance: 'approved_local',
        subject: 'Biology',
        chapter: 'Cell Structure',
        width: 50,
        height: 50,
        local_path: 'Biology/tiny_icon.png',
        absolute_path: path.join(fixtures.diagramsRoot, 'Biology', 'tiny_icon.png'),
        sha256: hashFile(path.join(fixtures.diagramsRoot, 'Biology', 'tiny_icon.png')),
        status: 'approved',
        asset_type: 'image/png',
        occlusion_eligible: false
    };
    const eligResult = applyEligibilityToAsset(lowResAsset, { subject: 'Biology', chapter: 'Cell Structure' });
    assert(eligResult.eligible === false && lowResAsset.occlusion_eligible === false && lowResAsset.rejection_reason.includes('INADEQUATE_RESOLUTION'),
        74, 'Phase 6.1 Approval vs Eligibility: Low-res asset in approved folder remains occlusion_eligible: false');
}

// 75. Hash Integrity: Missing SHA-256 is a hard failure in canonical Phase 6
{
    const assetWithoutHash = {
        source_provenance: 'approved_local',
        subject: 'Biology',
        chapter: 'Cell Structure',
        width: 400,
        height: 300,
        local_path: 'Biology/cell.png',
        status: 'approved',
        asset_type: 'image/png'
    };
    const elig = evaluateOcclusionEligibility(assetWithoutHash, { subject: 'Biology', chapter: 'Cell Structure' });
    assert(elig.eligible === false && elig.failures.includes('MISSING_OR_INVALID_SHA256_HASH'),
        75, 'Phase 6.1 Hash Gate: Missing SHA-256 hash fails closed with MISSING_OR_INVALID_SHA256_HASH');
}

// 76. Hash Integrity: Invalid SHA-256 format is a hard failure
{
    const assetWithBadHash = {
        source_provenance: 'approved_local',
        subject: 'Biology',
        chapter: 'Cell Structure',
        width: 400,
        height: 300,
        local_path: 'Biology/cell.png',
        sha256: 'not-a-valid-64-char-hex-hash',
        status: 'approved',
        asset_type: 'image/png'
    };
    const elig = evaluateOcclusionEligibility(assetWithBadHash, { subject: 'Biology', chapter: 'Cell Structure' });
    assert(elig.eligible === false && elig.failures.includes('MISSING_OR_INVALID_SHA256_HASH'),
        76, 'Phase 6.1 Hash Gate: Invalid SHA-256 format fails closed');
}

// 77. Hash Integrity: SHA-256 mismatch against disk content fails closed
{
    const diskFile = path.join(fixtures.diagramsRoot, 'Biology', 'cell_structure_mitosis.png');
    const assetWithMismatch = {
        source_provenance: 'approved_local',
        subject: 'Biology',
        chapter: 'Cell Structure',
        width: 400,
        height: 300,
        local_path: 'Biology/cell_structure_mitosis.png',
        absolute_path: diskFile,
        sha256: '0'.repeat(64), // Deliberately incorrect hash
        status: 'approved',
        asset_type: 'image/png'
    };
    const elig = evaluateOcclusionEligibility(assetWithMismatch, { subject: 'Biology', chapter: 'Cell Structure' });
    assert(elig.eligible === false && elig.failures.some(f => f.includes('SHA256_HASH_MISMATCH')),
        77, 'Phase 6.1 Hash Gate: SHA-256 hash mismatch against disk file fails closed');
}

// 78. Chapter Scoping: Generic term "system" alone does not match Math / Number System
{
    const score = computeMatchScore('digestive_system.png', 'Number System');
    assert(score === 0,
        78, 'Phase 6.1 Chapter Scoping: digestive_system.png does not match Math/Number System on generic "system"');
}

// 79. Chapter Scoping: Generic "voltage.png" does not match Physics / Current Electricity without concept
{
    const score = computeMatchScore('voltage.png', 'Current Electricity');
    assert(score === 0,
        79, 'Phase 6.1 Chapter Scoping: voltage.png does not match Current Electricity without concept relation');
}

// 80. Chapter Scoping: "voltage.png" matches Current Electricity when concept is explicitly "voltage"
{
    const score = computeMatchScore('voltage.png', 'Current Electricity', 'voltage');
    assert(score > 0,
        80, 'Phase 6.1 Chapter Scoping: voltage.png matches Current Electricity when concept is explicitly voltage');
}

// 81. Chapter Scoping: discoverAssets for Math/Number System rejects non-distinctive asset
{
    // Write an unrelated "operating_system.png" into Math directory
    const mathDir = path.join(fixtures.diagramsRoot, 'Math');
    fs.writeFileSync(path.join(mathDir, 'operating_system.png'), fixtures.highResPng);

    const discovery = discoverAssets({
        subject: 'Math',
        chapter: 'Number System',
        diagramsRoot: fixtures.diagramsRoot
    });
    // Should be NO_APPROVED_ASSET because operating_system only has generic "system"
    assert(discovery.status === 'NO_APPROVED_ASSET' && discovery.assets.length === 0,
        81, 'Phase 6.1 Chapter Scoping: discoverAssets ignores operating_system.png for Number System');
}

// 82. Visual Need False Positives: History text with "working class" does NOT discover classification_diagram
{
    const result = discoverVisualNeeds({
        subject: 'History',
        chapter: 'Industrial Revolution',
        evidenceContent: 'The rise of the working class and the middle class transformed 19th-century British society.'
    });
    const hasClassification = result.visual_needs.some(n => n.category === 'classification_diagram');
    assert(hasClassification === false,
        82, 'Phase 6.1 Visual Need: History text with "working class" does NOT discover classification_diagram');
}

// 83. Visual Need False Positives: Political Science text with "welfare state" does NOT discover map
{
    const result = discoverVisualNeeds({
        subject: 'Political Science',
        chapter: 'Theories of State',
        evidenceContent: 'The welfare state provides comprehensive social security and public services to all citizens.'
    });
    const hasMap = result.visual_needs.some(n => n.category === 'map');
    assert(hasMap === false,
        83, 'Phase 6.1 Visual Need: Political Science text with "welfare state" does NOT discover map');
}

// 84. Visual Need False Positives: Physics text with "voltage difference" without circuit does NOT discover circuit
{
    const result = discoverVisualNeeds({
        subject: 'Physics',
        chapter: 'Electrostatics',
        evidenceContent: 'The electric potential and voltage difference between two parallel conducting plates in equilibrium.'
    });
    const hasCircuit = result.visual_needs.some(n => n.category === 'circuit');
    assert(hasCircuit === false,
        84, 'Phase 6.1 Visual Need: Physics electrostatic text with voltage does NOT discover circuit');
}

// 85. Visual Need False Positives: Chemistry text with "study group" does NOT discover classification_diagram
{
    const result = discoverVisualNeeds({
        subject: 'Chemistry',
        chapter: 'Introduction',
        evidenceContent: 'Students formed a study group to discuss laboratory safety rules and procedures.'
    });
    const hasClassification = result.visual_needs.some(n => n.category === 'classification_diagram');
    assert(hasClassification === false,
        85, 'Phase 6.1 Visual Need: Chemistry text with "study group" does NOT discover classification_diagram');
}

// 86. Source-Grounded Invariant: Ambiguous text without matching approved asset yields NO_APPROVED_ASSET
{
    const needs = discoverVisualNeeds({
        subject: 'History',
        chapter: 'World War I',
        evidenceContent: 'The boundary and territory of European empires in the early 20th century.'
    });
    // Visual need for map might be discovered, but no approved asset exists in History
    const discovery = discoverAssets({
        subject: 'History',
        chapter: 'World War I',
        diagramsRoot: fixtures.diagramsRoot,
        visualNeeds: needs.visual_needs
    });
    assert(discovery.status === 'NO_APPROVED_ASSET',
        86, 'Phase 6.1 Source-Grounded: Discovered visual need without approved asset strictly yields NO_APPROVED_ASSET');
}

// 87. Target Semantics: Empty target regions array returns NO_VALID_OCCLUSION_TARGETS
{
    const asset = {
        source_provenance: 'approved_local',
        subject: 'Biology',
        chapter: 'Cell Structure',
        width: 400,
        height: 300,
        local_path: 'Biology/cell.png',
        sha256: 'a'.repeat(64),
        status: 'approved',
        asset_type: 'image/png'
    };
    const elig = evaluateOcclusionEligibility(asset, {
        subject: 'Biology',
        chapter: 'Cell Structure',
        targetRegions: []
    });
    assert(elig.eligible === false && elig.failures.includes('NO_VALID_OCCLUSION_TARGETS'),
        87, 'Phase 6.1 Target Semantics: Empty target regions returns NO_VALID_OCCLUSION_TARGETS');
}

// 88. Target Semantics: Regions lacking semantic targets returns NO_VALID_OCCLUSION_TARGETS
{
    const asset = {
        source_provenance: 'approved_local',
        subject: 'Biology',
        chapter: 'Cell Structure',
        width: 400,
        height: 300,
        local_path: 'Biology/cell.png',
        sha256: 'a'.repeat(64),
        status: 'approved',
        asset_type: 'image/png'
    };
    const elig = evaluateOcclusionEligibility(asset, {
        subject: 'Biology',
        chapter: 'Cell Structure',
        targetRegions: [{ id: 'r1', shape: 'rectangle', coordinates: [0, 0, 10, 10] }] // No answer/label/target_type
    });
    assert(elig.eligible === false && elig.failures.includes('NO_VALID_OCCLUSION_TARGETS'),
        88, 'Phase 6.1 Target Semantics: Regions lacking valid targets returns NO_VALID_OCCLUSION_TARGETS');
}

// 89. Abstract visuals are blocked when not justified
{
    const res = isOcclusionAppropriate('timeline', 'Math');
    assert(res.appropriate === false && res.reason === 'CATEGORY_NOT_IO_SUITABLE',
        89, 'Phase 6.1 Abstract gating: Unjustified abstract visuals remain blocked (timeline in Math)');
}

// 90. Abstract visuals are permitted when pedagogically justified
{
    const res = isOcclusionAppropriate('timeline', 'Math', { hasPedagogicalValue: true });
    assert(res.appropriate === true && res.reason === 'PEDAGOGICALLY_JUSTIFIED',
        90, 'Phase 6.1 Abstract gating: Pedagogically justified abstract visuals are permitted (timeline in Math)');
}

// 91. Existing subject preferred categories continue working unchanged
{
    const res = isOcclusionAppropriate('map', 'History');
    assert(res.appropriate === true && res.reason === 'SUBJECT_PREFERRED',
        91, 'Phase 6.1 Abstract gating: Subject preferred categories continue working unchanged (map in History)');
}


// ═══════════════════════════════════════════════════════════
// CLEANUP & RESULTS
// ═══════════════════════════════════════════════════════════

cleanupTestFixtures();

console.log(`\n====================================================`);
console.log(`Visual Pipeline Test Suite Results: ${passed} Passed, ${failed} Failed (Total: ${passed + failed})`);
console.log(`====================================================\n`);

if (failed > 0) {
    process.exit(1);
}
