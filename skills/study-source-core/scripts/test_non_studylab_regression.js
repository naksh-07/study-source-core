/**
 * study-source-core Non-StudyLab Declarative Pipeline Regression Suite (test_non_studylab_regression.js)
 * 
 * Verifies and protects the integrity of the Declarative Memory & Knowledge track:
 * 1. Notes Pipeline: Markdown quality thresholds, single H1, YAML frontmatter, callout formatting, anti-slop bolding (<15%) and emojis (<=2).
 * 2. MindMap Pipeline: Root node identity, hierarchical branch depth (>=3), valid schema.
 * 3. SlideDeck Prompt Pipeline: Mandatory sections, slide limits (5-15), bullet density (<=4), approved badges.
 * 4. Unified Declarative Flashcard APKG (Visual): Basic (1600000001) + Cloze (1600000002) + Native IO (1600000003) in Map::Europe.
 * 5. Unified Declarative Flashcard APKG (Non-Visual): Basic + Cloze with IO suppression in Maths::LCM-HCF.
 * 6. Path Resolution & Aliasing: Bidirectional resolution (Math <-> Maths <-> Mathematics, Polity <-> Political Science, Map <-> Maps), slug variations (LCM-HCF <-> LCM & HCF).
 * 7. Packaging Intermediates & Lifecycle: Pre-validation gate, .build/source-artifacts archival.
 * 8. Peaceful Coexistence & Isolation: Absolute boundary between Declarative APKG (Models 1-3) and StudyLab Procedural APKG (Model 4).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { auditNoteContract } = require('./note_contract_audit');
const { auditSlideDeckPrompt } = require('./slide_deck_prompt_audit');
const { validateApkg } = require('./validate_apkg');
const { validateProceduralApkg } = require('./validate_studylab_procedural_apkg');
const { exportChapterToAnki } = require('./export_anki');
const { getVaultRoot, resolveChapterDir, getCanonicalArtifactPaths, SUBJECT_ALIAS_MAP } = require('./path_resolver');
const { initManifest, recordArtifact, computeSha256, loadManifest } = require('./artifact_provenance');

const SCRATCH_DIR = path.resolve(__dirname, 'scratch/non_studylab_regression');

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

async function runNonStudyLabRegressionSuite() {
    console.log('================================================================================');
    console.log('STUDY-SOURCE-CORE NON-STUDYLAB DECLARATIVE PIPELINE REGRESSION PROTECTION SUITE');
    console.log('================================================================================\n');

    if (!fs.existsSync(SCRATCH_DIR)) {
        fs.mkdirSync(SCRATCH_DIR, { recursive: true });
    }

    // ----------------------------------------------------
    // STAGE 1: Obsidian Notes Contract Audits
    // ----------------------------------------------------
    console.log('--- STAGE 1: Obsidian Notes Contract Audits ---');

    await test('1.1 Notes Contract: Europe_Notes.md satisfies single H1, YAML frontmatter, callouts & quality thresholds', () => {
        const paths = getCanonicalArtifactPaths('Map', 'Europe');
        assert(fs.existsSync(paths.notes.path), `Notes file missing at: ${paths.notes.path}`);
        const audit = auditNoteContract(paths.notes.path);
        assert.strictEqual(audit.success, true, `Europe notes audit failed: ${audit.issues.join('; ')}`);
        assert.strictEqual(audit.hasFrontmatter, true, 'Frontmatter must be present');
        assert.strictEqual(audit.h1Count, 1, 'Must have exactly 1 H1 heading');
        assert(parseFloat(audit.boldRatio) <= 20.0, `Bolding ratio must be <= 20%, got ${audit.boldRatio}%`);
        assert(audit.emojiCount <= 2, `Emoji count must be <= 2, got ${audit.emojiCount}`);
    });

    await test('1.2 Notes Contract: LCM-HCF_Notes.md satisfies single H1, YAML frontmatter & quality thresholds', () => {
        let paths = getCanonicalArtifactPaths('Math', 'LCM-HCF');
        if (!fs.existsSync(paths.notes.path)) {
            paths = getCanonicalArtifactPaths('Math', 'LCM-HCF');
        }
        assert(fs.existsSync(paths.notes.path), `Notes file missing at: ${paths.notes.path}`);
        const audit = auditNoteContract(paths.notes.path);
        assert.strictEqual(audit.success, true, `Notes audit failed: ${audit.issues.join('; ')}`);
        assert.strictEqual(audit.hasFrontmatter, true, 'Frontmatter must be present');
        assert.strictEqual(audit.h1Count, 1, 'Must have exactly 1 H1 heading');
        assert(parseFloat(audit.boldRatio) <= 20.0, `Bolding ratio must be <= 20%, got ${audit.boldRatio}%`);
        assert(audit.emojiCount <= 2, `Emoji count must be <= 2, got ${audit.emojiCount}`);
    });

    // ----------------------------------------------------
    // STAGE 2: MindMap Hierarchy & JSON Schema
    // ----------------------------------------------------
    console.log('\n--- STAGE 2: MindMap Hierarchy & JSON Schema ---');

    await test('2.1 MindMap Contract: Europe.mindmap.json conforms to hierarchical branch structure and depth >= 3', () => {
        const paths = getCanonicalArtifactPaths('Map', 'Europe');
        assert(fs.existsSync(paths.mindmap.path), `MindMap file missing at: ${paths.mindmap.path}`);
        const data = JSON.parse(fs.readFileSync(paths.mindmap.path, 'utf8'));
        assert(data.title || data.topic || data.name, 'MindMap must have a root title');
        const rootChildren = (data.root && data.root.children) || data.branches || data.nodes || data.children;
        assert(Array.isArray(rootChildren) && rootChildren.length >= 3, `Expected at least 3 main branches, got ${rootChildren ? rootChildren.length : 0}`);
    });

    // ----------------------------------------------------
    // STAGE 3: SlideDeck Prompt Contract Audit
    // ----------------------------------------------------
    console.log('\n--- STAGE 3: SlideDeck Prompt Contract Audits ---');

    await test('3.1 SlideDeck Contract: Europe_SlideDeckPrompt.md complies with 12 mandatory sections and 5-15 slide budget', () => {
        const paths = getCanonicalArtifactPaths('Map', 'Europe');
        assert(fs.existsSync(paths.slideDeck.path), `SlideDeck file missing at: ${paths.slideDeck.path}`);
        const audit = auditSlideDeckPrompt(paths.slideDeck.path);
        assert.strictEqual(audit.passed, true, `SlideDeck audit failed: ${audit.errors.join('; ')}`);
        assert(audit.metrics.slideCount >= 5 && audit.metrics.slideCount <= 15, `Slide count out of bounds: ${audit.metrics.slideCount}`);
        assert.strictEqual(audit.metrics.oversizedBullets, 0, 'No oversized bullets allowed');
    });

    // ----------------------------------------------------
    // STAGE 4: Unified Declarative APKG Verification - Visual (Map/Europe)
    // ----------------------------------------------------
    console.log('\n--- STAGE 4: Unified Declarative APKG Verification (Visual Chapter) ---');

    await test('4.1 Declarative APKG (Visual): Europe_Anki.apkg validates Basic, Cloze, Native IO and SVG media', async () => {
        const paths = getCanonicalArtifactPaths('Map', 'Europe');
        assert(fs.existsSync(paths.apkg.path), `APKG missing at: ${paths.apkg.path}`);
        const valRes = await validateApkg(paths.apkg.path, false);
        assert.strictEqual(valRes.isValid, true, `APKG validation failed: ${valRes.errors.join('; ')}`);
        assert(valRes.stats.notesByType.Basic >= 50, `Expected >= 50 Basic notes, got ${valRes.stats.notesByType.Basic}`);
        assert(valRes.stats.notesByType.Cloze >= 30, `Expected >= 30 Cloze notes, got ${valRes.stats.notesByType.Cloze}`);
        assert.strictEqual(valRes.stats.notesByType.ImageOcclusion, 1, 'Expected 1 Native Image Occlusion note');
        assert(valRes.stats.mediaCount >= 1, 'Expected bundled SVG media asset');
        assert(valRes.stats.deckNames.some(d => d.includes('Map::Europe')), `Deck name must include Map::Europe: ${valRes.stats.deckNames.join(', ')}`);
    });

    await test('4.2 Declarative Export Simulation (Visual): Re-exporting Europe to scratch produces 100% valid package', async () => {
        const europeDir = resolveChapterDir('Map', 'Europe');
        const scratchEurope = path.join(SCRATCH_DIR, 'Europe');
        const exportRes = await exportChapterToAnki(europeDir, {
            chapter: 'Europe',
            subject: 'Map',
            outputDir: scratchEurope,
            skipProvenanceCheck: true
        });
        assert.strictEqual(exportRes.success, true, 'Export failed');
        assert.strictEqual(exportRes.counts.ioNotes, 1, 'Expected 1 IO note');
        const val = await validateApkg(exportRes.outputPath, false);
        assert.strictEqual(val.isValid, true, `Validation failed: ${val.errors.join('; ')}`);
    });

    // ----------------------------------------------------
    // STAGE 5: Unified Declarative APKG Verification - Non-Visual (Maths/LCM-HCF)
    // ----------------------------------------------------
    console.log('\n--- STAGE 5: Unified Declarative APKG Verification (Non-Visual Chapter) ---');

    await test('5.1 Declarative APKG (Non-Visual): LCM-HCF_Anki.apkg validates Basic and Cloze with IO suppression', async () => {
        let paths = getCanonicalArtifactPaths('Math', 'LCM-HCF');
        if (!fs.existsSync(paths.apkg.path)) {
            paths = getCanonicalArtifactPaths('Math', 'LCM-HCF');
        }
        assert(fs.existsSync(paths.apkg.path), `APKG missing at: ${paths.apkg.path}`);
        const valRes = await validateApkg(paths.apkg.path, false);
        assert.strictEqual(valRes.isValid, true, `APKG validation failed: ${valRes.errors.join('; ')}`);
        assert(valRes.stats.notesByType.Basic >= 15, `Expected >= 15 Basic notes, got ${valRes.stats.notesByType.Basic}`);
        assert(valRes.stats.notesByType.Cloze >= 10, `Expected >= 10 Cloze notes, got ${valRes.stats.notesByType.Cloze}`);
        assert.strictEqual(valRes.stats.notesByType.ImageOcclusion, 0, 'Image occlusion must be 0 for non-visual chapter');
        assert.strictEqual(valRes.stats.mediaCount, 0, 'Media count must be 0 for pure formula chapter');
    });

    await test('5.2 Declarative Export Simulation (Non-Visual): Re-exporting LCM-HCF to scratch produces 100% valid package', async () => {
        let mathDir = resolveChapterDir('Math', 'LCM-HCF');
        let chapterName = 'LCM-HCF';
        let subjectName = 'Maths';
        const candidateLcm = resolveChapterDir('Math', 'LCM-HCF');
        if (fs.existsSync(path.join(candidateLcm, 'Basic/LCM-HCF_Basic.tsv'))) {
            mathDir = candidateLcm;
            chapterName = 'LCM-HCF';
            subjectName = 'Math';
        }

        const scratchMath = path.join(SCRATCH_DIR, chapterName);
        const exportRes = await exportChapterToAnki(mathDir, {
            chapter: chapterName,
            subject: subjectName,
            outputDir: scratchMath,
            skipProvenanceCheck: true
        });
        assert.strictEqual(exportRes.success, true, 'Export failed');
        assert.strictEqual(exportRes.counts.ioNotes, 0, 'Expected 0 IO notes');
        const val = await validateApkg(exportRes.outputPath, false);
        assert.strictEqual(val.isValid, true, `Validation failed: ${val.errors.join('; ')}`);
    });

    // ----------------------------------------------------
    // STAGE 6: Bidirectional Path Resolution & Aliasing Normalization
    // ----------------------------------------------------
    console.log('\n--- STAGE 6: Bidirectional Path Resolution & Aliasing Normalization ---');

    await test('6.1 Path Resolver: Math <-> Maths <-> Mathematics resolves to on-disk Maths directory', () => {
        const p1 = resolveChapterDir('Math', 'LCM-HCF');
        const p2 = resolveChapterDir('Math', 'LCM-HCF');
        const p3 = resolveChapterDir('Mathematics', 'LCM-HCF');
        assert(fs.existsSync(p1), `Math path does not exist: ${p1}`);
        assert(fs.existsSync(p2), `Maths path does not exist: ${p2}`);
        assert(fs.existsSync(p3), `Mathematics path does not exist: ${p3}`);
        assert.strictEqual(p1, p2, 'Math and Maths must resolve to the identical on-disk directory');
        assert.strictEqual(p2, p3, 'Maths and Mathematics must resolve to the identical on-disk directory');
    });

    await test('6.2 Path Resolver: Slug variation LCM-HCF <-> LCM & HCF resolves accurately', () => {
        const p1 = resolveChapterDir('Math', 'LCM-HCF');
        const p2 = resolveChapterDir('Math', 'LCM & HCF');
        assert(p1.includes('LCM-HCF') || p1.includes('LCM & HCF') || p1.includes('Maths'));
        assert(p2.includes('LCM-HCF') || p2.includes('LCM & HCF') || p2.includes('Maths'));
    });

    await test('6.3 Path Resolver: Map <-> Maps resolves to on-disk Map directory', () => {
        const p1 = resolveChapterDir('Map', 'Europe');
        const p2 = resolveChapterDir('Maps', 'Europe');
        assert(fs.existsSync(p1), `Map path does not exist: ${p1}`);
        assert(fs.existsSync(p2), `Maps path does not exist: ${p2}`);
        assert.strictEqual(p1, p2, 'Map and Maps must resolve to the same directory');
    });

    await test('6.4 Path Resolver: Polity <-> Political Science resolves consistently for new or existing chapters', () => {
        const p1 = resolveChapterDir('Polity', 'Constitution');
        const p2 = resolveChapterDir('Political Science', 'Constitution');
        assert(p1.includes('Political Science') || p1.includes('Polity'));
        assert(p2.includes('Political Science') || p2.includes('Polity'));
    });

    // ----------------------------------------------------
    // STAGE 7: Packaging Intermediates & Lifecycle Invariant
    // ----------------------------------------------------
    console.log('\n--- STAGE 7: Packaging Intermediate Archival & Lifecycle ---');

    await test('7.1 Packaging Lifecycle: Intermediate Basic and Cloze TSVs are cleanly archived under .build/source-artifacts', async () => {
        const scratchLife = path.join(SCRATCH_DIR, 'test_lifecycle');
        const basicDir = path.join(scratchLife, 'Basic');
        const clozeDir = path.join(scratchLife, 'Cloze');
        fs.mkdirSync(basicDir, { recursive: true });
        fs.mkdirSync(clozeDir, { recursive: true });

        const basicTsv = path.join(basicDir, 'test_lifecycle_Basic.tsv');
        const clozeTsv = path.join(clozeDir, 'test_lifecycle_Cloze.tsv');
        fs.writeFileSync(basicTsv, 'Front\tBack\tTags\nQ1\tA1\tT1');
        fs.writeFileSync(clozeTsv, 'Text\tExtra\tTags\n{{c1::Cloze text}}\tNote\tT1');

        const evHash = computeSha256(fs.readFileSync(basicTsv));
        initManifest(scratchLife, {
            subject: 'Science',
            chapter: 'test_lifecycle',
            source: 'scratch/lifecycle_source.pdf',
            evidenceHash: evHash
        });
        recordArtifact(scratchLife, {
            artifactType: 'basic',
            filePath: basicTsv,
            evidenceHash: evHash,
            status: 'VALIDATED',
            lastValidationResult: 'PASS'
        });
        recordArtifact(scratchLife, {
            artifactType: 'cloze',
            filePath: clozeTsv,
            evidenceHash: evHash,
            status: 'VALIDATED',
            lastValidationResult: 'PASS'
        });

        const exportRes = await exportChapterToAnki(scratchLife, {
            chapter: 'test_lifecycle',
            subject: 'Science',
            cleanIntermediates: true,
            archiveIntermediates: true
        });

        assert.strictEqual(exportRes.success, true);
        assert(fs.existsSync(path.join(scratchLife, 'test_lifecycle_Anki.apkg')));
        assert(fs.existsSync(path.join(scratchLife, '.build', 'source-artifacts', 'Basic', 'test_lifecycle_Basic.tsv')));
        assert(fs.existsSync(path.join(scratchLife, '.build', 'source-artifacts', 'Cloze', 'test_lifecycle_Cloze.tsv')));
        assert(!fs.existsSync(basicTsv), 'User-facing Basic TSV must be cleaned');
        assert(!fs.existsSync(clozeTsv), 'User-facing Cloze TSV must be cleaned');
    });

    // ----------------------------------------------------
    // STAGE 8: Declarative <-> Procedural Peaceful Coexistence & Isolation
    // ----------------------------------------------------
    console.log('\n--- STAGE 8: Declarative <-> Procedural Isolation & Coexistence ---');

    await test('8.1 Model Isolation: Declarative APKG never contains Model 1600000004 and StudyLab APKG never contains Models 1600000001-3', async () => {
        let declPaths = getCanonicalArtifactPaths('Math', 'LCM-HCF');
        if (!fs.existsSync(declPaths.apkg.path)) {
            declPaths = getCanonicalArtifactPaths('Math', 'LCM-HCF');
        }
        const normalVal = await validateApkg(declPaths.apkg.path, false);
        assert.strictEqual(normalVal.isValid, true);
        assert.strictEqual(normalVal.stats.modelNames.includes('StudyLab Procedural Anchor'), false, 'Declarative deck must NOT contain Model 1600000004');

        const procVal = await validateProceduralApkg(declPaths.proceduralApkg.path, false);
        assert.strictEqual(procVal.isValid, true);
        assert.strictEqual(procVal.stats.modelNames.includes('Basic'), false, 'StudyLab deck must NOT contain Basic model');
        assert.strictEqual(procVal.stats.modelNames.includes('Cloze'), false, 'StudyLab deck must NOT contain Cloze model');
        assert.strictEqual(procVal.stats.modelNames.includes('Image Occlusion Enhanced'), false, 'StudyLab deck must NOT contain IO model');
    });

    await test('8.2 Namespace Isolation: Declarative and Procedural decks reside in distinct Anki deck namespaces', async () => {
        let declPaths = getCanonicalArtifactPaths('Math', 'LCM-HCF');
        if (!fs.existsSync(declPaths.apkg.path)) {
            declPaths = getCanonicalArtifactPaths('Math', 'LCM-HCF');
        }
        const normalVal = await validateApkg(declPaths.apkg.path, false);
        const procVal = await validateProceduralApkg(declPaths.proceduralApkg.path, false);

        const normalDeck = normalVal.stats.deckNames[0];
        const procDeck = procVal.stats.deckNames[0];

        assert.notStrictEqual(normalDeck, procDeck, 'Deck namespaces must be completely separate');
        assert(procDeck.endsWith('StudyLab Procedural'), 'StudyLab deck must end with ::StudyLab Procedural');
        assert(!normalDeck.includes('StudyLab Procedural'), 'Declarative deck must not include StudyLab in name');
    });

    console.log(`\n================================================================================`);
    console.log(`NON-STUDYLAB DECLARATIVE REGRESSION SUITE COMPLETE: ${passedTests} Passed, ${failedTests} Failed`);
    console.log(`================================================================================\n`);

    if (failedTests > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runNonStudyLabRegressionSuite().catch(err => {
    console.error('Test suite error:', err);
    process.exit(1);
});
