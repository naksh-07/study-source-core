/**
 * StudySourceCore Unified Anki Packaging & Output Hygiene Test Suite
 * (`test_unified_anki_packaging.js`)
 * 
 * Verifies all 13 required positive and negative packaging criteria:
 * 
 * POSITIVE:
 * 1. Basic TSV + Cloze TSV -> one APKG
 * 2. Basic + Cloze + IO TSV -> one APKG
 * 3. Basic-only case -> one APKG
 * 4. No-IO case -> one APKG (no empty IO artifact)
 * 5. Successful APKG validation deletes generated TSVs
 * 6. Final artifact registry contains APKG as permanent artifact (lineage/provenance verified)
 * 
 * NEGATIVE:
 * 7. APKG build failure preserves TSVs
 * 8. APKG validation failure preserves TSVs
 * 9. Missing APKG does not trigger TSV cleanup
 * 10. Empty / invalid APKG does not trigger cleanup
 * 11. Cleanup cannot delete unrelated files (Notes, Questions.md, etc.)
 * 12. IO absence does not create an invalid empty IO artifact
 * 13. No card type is silently omitted from the unified APKG
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const { exportChapterToAnki, parseTsvFile } = require('./export_anki');
const { validateApkg, validateApkgContent } = require('./validate_apkg');
const {
    cleanPackagingIntermediates,
    initManifest,
    recordArtifact,
    loadManifest,
    computeSha256,
    verifyArtifactLineage
} = require('./artifact_provenance');
const { getArtifactRegistry } = require('./artifact_registry');
const { buildExecutionTaskGraph, executeTaskWorkflow, createSpecialistTaskDispatcher } = require('./orchestration_engine');

const SCRATCH_BASE = path.resolve(__dirname, 'scratch/unified_anki_packaging_tests');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(name, fn) {
    totalTests++;
    process.stdout.write(`  [TEST-${totalTests}] ${name} ... `);
    try {
        await fn();
        console.log('✅ PASS');
        passedTests++;
    } catch (err) {
        console.log('❌ FAIL');
        console.error(`     Error: ${err.message}`);
        failedTests++;
    }
}

function setupScratchChapter(chapterName) {
    const chapterDir = path.join(SCRATCH_BASE, chapterName);
    if (fs.existsSync(chapterDir)) {
        fs.rmSync(chapterDir, { recursive: true, force: true });
    }
    fs.mkdirSync(chapterDir, { recursive: true });
    return chapterDir;
}

function createDummyBasicTsv(chapterDir, chapterName, count = 3) {
    const basicDir = path.join(chapterDir, 'Basic');
    fs.mkdirSync(basicDir, { recursive: true });
    const filePath = path.join(basicDir, `${chapterName}_Basic.tsv`);
    let content = 'Front\tBack\tTags\n';
    for (let i = 1; i <= count; i++) {
        content += `प्रश्न ${i} (Question ${i})\tउत्तर ${i} (Answer ${i})\tTag${i}\n`;
    }
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
}

function createDummyClozeTsv(chapterDir, chapterName, count = 2) {
    const clozeDir = path.join(chapterDir, 'Cloze');
    fs.mkdirSync(clozeDir, { recursive: true });
    const filePath = path.join(clozeDir, `${chapterName}_Cloze.tsv`);
    let content = 'Text\tExtra\tTags\n';
    for (let i = 1; i <= count; i++) {
        content += `यह {{c1::मुख्य शब्द ${i} (keyword ${i})}} है।\tविवरण ${i}\tTag${i}\n`;
    }
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
}

function createDummyIoManifest(chapterDir, chapterName) {
    const ioDir = path.join(chapterDir, 'ImageOcclusion');
    const mediaDir = path.join(ioDir, 'media');
    fs.mkdirSync(mediaDir, { recursive: true });

    // Dummy 1x1 PNG image
    const imagePath = path.join(mediaDir, 'test_diagram.png');
    const pngBuffer = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');
    fs.writeFileSync(imagePath, pngBuffer);

    const manifest = {
        id: `io-${chapterName}`,
        title: `${chapterName} Visual IO`,
        subject: 'Geography',
        chapter: chapterName,
        language: 'hi',
        cards: [
            {
                id: 'card-1',
                source: {
                    chapter: chapterName,
                    evidence_ids: ['ev-1']
                },
                asset: {
                    path: 'test_diagram.png',
                    width: 800,
                    height: 600
                },
                mode: 'hide_all_guess_one',
                regions: [
                    { id: 'r1', shape: 'rectangle', coordinates: [10, 10, 30, 20], answer: 'भाग 1 (Part 1)' },
                    { id: 'r2', shape: 'rectangle', coordinates: [50, 50, 25, 25], answer: 'भाग 2 (Part 2)' }
                ],
                header: `${chapterName} Diagram`,
                extra: 'Visual explanation',
                tags: ['Geo::Test']
            }
        ]
    };

    const manifestPath = path.join(ioDir, `${chapterName}_ImageOcclusion.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    return { manifestPath, imagePath };
}

async function main() {
    console.log('================================================================================');
    console.log('STUDYSOURCECORE — UNIFIED ANKI PACKAGING & OUTPUT HYGIENE TEST SUITE');
    console.log('================================================================================\n');

    if (fs.existsSync(SCRATCH_BASE)) {
        fs.rmSync(SCRATCH_BASE, { recursive: true, force: true });
    }
    fs.mkdirSync(SCRATCH_BASE, { recursive: true });

    // -------------------------------------------------------------------------
    // POSITIVE TESTS
    // -------------------------------------------------------------------------
    console.log('--- SECTION 1: POSITIVE UNIFIED PACKAGING TESTS ---');

    await runTest('Positive 1: Basic TSV + Cloze TSV -> ONE unified APKG', async () => {
        const chapter = 'test_basic_cloze';
        const dir = setupScratchChapter(chapter);
        createDummyBasicTsv(dir, chapter, 4);
        createDummyClozeTsv(dir, chapter, 3);

        const res = await exportChapterToAnki(dir, {
            chapter,
            subject: 'Science',
            cleanIntermediates: false // Keep for count check
        });

        assert.strictEqual(res.success, true);
        assert.strictEqual(res.counts.basicNotes, 4);
        assert.strictEqual(res.counts.clozeNotes, 3);
        assert.strictEqual(res.counts.ioNotes, 0);
        assert.strictEqual(res.counts.totalNotes, 7);
        assert.strictEqual(res.counts.totalCards, 7);

        assert(fs.existsSync(res.outputPath), 'Unified APKG must exist on disk');
        const val = await validateApkg(res.outputPath, false);
        assert.strictEqual(val.isValid, true);
        assert.strictEqual(val.stats.notesByType.Basic, 4);
        assert.strictEqual(val.stats.notesByType.Cloze, 3);
        assert.strictEqual(val.stats.notesByType.ImageOcclusion, 0);
    });

    await runTest('Positive 2: Basic + Cloze + Image Occlusion -> ONE unified APKG', async () => {
        const chapter = 'test_all_three';
        const dir = setupScratchChapter(chapter);
        createDummyBasicTsv(dir, chapter, 5);
        createDummyClozeTsv(dir, chapter, 2);
        createDummyIoManifest(dir, chapter);

        const res = await exportChapterToAnki(dir, {
            chapter,
            subject: 'Geography',
            cleanIntermediates: false
        });

        assert.strictEqual(res.success, true);
        assert.strictEqual(res.counts.basicNotes, 5);
        assert.strictEqual(res.counts.clozeNotes, 2);
        assert.strictEqual(res.counts.ioNotes, 1);
        assert.strictEqual(res.counts.totalNotes, 8);
        assert.strictEqual(res.counts.totalCards, 9); // 5 basic + 2 cloze + 2 IO regions
        assert.strictEqual(res.counts.mediaFiles, 1);

        const val = await validateApkg(res.outputPath, false);
        assert.strictEqual(val.isValid, true);
        assert.strictEqual(val.stats.notesByType.Basic, 5);
        assert.strictEqual(val.stats.notesByType.Cloze, 2);
        assert.strictEqual(val.stats.notesByType.ImageOcclusion, 1);
        assert.strictEqual(val.stats.mediaCount, 1);
    });

    await runTest('Positive 3: Basic-only case -> ONE valid APKG without Cloze or IO', async () => {
        const chapter = 'test_basic_only';
        const dir = setupScratchChapter(chapter);
        createDummyBasicTsv(dir, chapter, 6);

        const res = await exportChapterToAnki(dir, {
            chapter,
            subject: 'History',
            cleanIntermediates: false
        });

        assert.strictEqual(res.success, true);
        assert.strictEqual(res.counts.basicNotes, 6);
        assert.strictEqual(res.counts.clozeNotes, 0);
        assert.strictEqual(res.counts.ioNotes, 0);
        assert.strictEqual(res.counts.totalNotes, 6);

        const val = await validateApkg(res.outputPath, false);
        assert.strictEqual(val.isValid, true);
        assert.strictEqual(val.stats.notesByType.Basic, 6);
        assert.strictEqual(val.stats.notesByType.Cloze, 0);
        assert.strictEqual(val.stats.notesByType.ImageOcclusion, 0);
    });

    await runTest('Positive 4: No-IO case gracefully omits Image Occlusion without errors', async () => {
        const chapter = 'test_no_io';
        const dir = setupScratchChapter(chapter);
        createDummyBasicTsv(dir, chapter, 3);
        createDummyClozeTsv(dir, chapter, 3);

        const res = await exportChapterToAnki(dir, {
            chapter,
            subject: 'Math',
            cleanIntermediates: false
        });

        assert.strictEqual(res.success, true);
        assert.strictEqual(res.counts.ioNotes, 0);
        assert.strictEqual(res.counts.mediaFiles, 0);

        const val = await validateApkg(res.outputPath, false);
        assert.strictEqual(val.isValid, true);
        assert.strictEqual(val.stats.notesByType.ImageOcclusion, 0);
        assert.strictEqual(val.stats.mediaCount, 0);
    });

    await runTest('Positive 5: Successful APKG validation deletes generated TSVs from user-facing directory (Hygiene)', async () => {
        const chapter = 'test_hygiene_success';
        const dir = setupScratchChapter(chapter);
        const basicPath = createDummyBasicTsv(dir, chapter, 3);
        const clozePath = createDummyClozeTsv(dir, chapter, 2);

        const evHash = computeSha256(fs.readFileSync(basicPath));
        initManifest(dir, { chapter, subject: 'Polity', evidenceHash: evHash });
        recordArtifact(dir, { artifactType: 'basic', filePath: basicPath, evidenceHash: evHash, status: 'VALIDATED', lastValidationResult: 'PASS' });
        recordArtifact(dir, { artifactType: 'cloze', filePath: clozePath, evidenceHash: evHash, status: 'VALIDATED', lastValidationResult: 'PASS' });

        // Run with default cleanIntermediates (now true!)
        const res = await exportChapterToAnki(dir, {
            chapter,
            subject: 'Polity'
        });

        assert.strictEqual(res.success, true);
        assert(fs.existsSync(res.outputPath), 'APKG must exist');

        // User-facing Basic/ and Cloze/ must be deleted
        assert(!fs.existsSync(basicPath), 'User-facing Basic TSV must be deleted');
        assert(!fs.existsSync(clozePath), 'User-facing Cloze TSV must be deleted');
        assert(!fs.existsSync(path.join(dir, 'Basic')), 'User-facing Basic/ dir must be deleted');
        assert(!fs.existsSync(path.join(dir, 'Cloze')), 'User-facing Cloze/ dir must be deleted');

        // Archived copies must exist in .build/source-artifacts/
        const archivedBasic = path.join(dir, '.build', 'source-artifacts', 'Basic', `${chapter}_Basic.tsv`);
        const archivedCloze = path.join(dir, '.build', 'source-artifacts', 'Cloze', `${chapter}_Cloze.tsv`);
        assert(fs.existsSync(archivedBasic), 'Archived Basic TSV must exist in .build/source-artifacts/');
        assert(fs.existsSync(archivedCloze), 'Archived Cloze TSV must exist in .build/source-artifacts/');

        // Manifest must be preserved and show intermediatesCleaned: true
        const manifest = loadManifest(dir);
        assert(manifest, 'Manifest must exist');
        assert.strictEqual(manifest.packaging?.intermediatesCleaned, true);
    });

    await runTest('Positive 6: Final artifact registry contains APKG as permanent artifact & lineage verifies', async () => {
        const reg = getArtifactRegistry();
        assert(reg.apkg, 'APKG must be registered in artifact registry');
        assert.strictEqual(reg.apkg.wave, 2);
        assert.strictEqual(reg.apkg.file_pattern, '{chapter}_Anki.apkg');
        assert.strictEqual(reg.apkg.owner_agent, 'export_anki.js');

        const chapter = 'test_registry_lineage';
        const dir = setupScratchChapter(chapter);
        const basicPath = createDummyBasicTsv(dir, chapter, 2);
        const evHash = computeSha256(fs.readFileSync(basicPath));

        initManifest(dir, { chapter, subject: 'Science', evidenceHash: evHash });
        recordArtifact(dir, { artifactType: 'basic', filePath: basicPath, evidenceHash: evHash, status: 'VALIDATED', lastValidationResult: 'PASS' });

        const res = await exportChapterToAnki(dir, { chapter, subject: 'Science' });
        assert.strictEqual(res.success, true);

        // Lineage verification succeeds even after user-facing TSVs are cleaned
        const lineage = verifyArtifactLineage(dir, { participatingTypes: ['basic', 'apkg'] });
        assert.strictEqual(lineage.isValid, true, `Lineage must be valid: ${lineage.errors.join('; ')}`);
    });

    // -------------------------------------------------------------------------
    // NEGATIVE TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 2: NEGATIVE TESTS & SAFETY INVARIANTS ---');

    await runTest('Negative 7: APKG build failure preserves TSVs for recovery/debugging', async () => {
        const chapter = 'test_build_fail_preserves_tsvs';
        const dir = setupScratchChapter(chapter);

        // Write a malformed TSV (e.g. only 2 columns instead of 3)
        const basicDir = path.join(dir, 'Basic');
        fs.mkdirSync(basicDir, { recursive: true });
        const corruptTsv = path.join(basicDir, `${chapter}_Basic.tsv`);
        fs.writeFileSync(corruptTsv, 'Front\tBack\nOnlyTwoCols\tAnswer\n', 'utf8');

        let exportThrew = false;
        try {
            await exportChapterToAnki(dir, { chapter, subject: 'Science' });
        } catch (e) {
            exportThrew = true;
        }

        assert.strictEqual(exportThrew, true, 'Export must throw on corrupt TSV');
        assert(fs.existsSync(corruptTsv), 'Corrupt TSV must be preserved for debugging/recovery');
    });

    await runTest('Negative 8: APKG validation failure preserves TSVs', async () => {
        const chapter = 'test_val_fail_preserves_tsvs';
        const dir = setupScratchChapter(chapter);
        const basicPath = createDummyBasicTsv(dir, chapter, 2);

        // Force failure by referencing non-existent image
        const ioDir = path.join(dir, 'ImageOcclusion');
        fs.mkdirSync(ioDir, { recursive: true });
        const manifest = {
            id: 'io-bad',
            title: 'Bad IO',
            cards: [{ id: 'c1', asset: { path: 'non_existent_img.png' }, regions: [{ id: 'r1', coordinates: [1, 1, 2, 2] }] }]
        };
        fs.writeFileSync(path.join(ioDir, `${chapter}_ImageOcclusion.json`), JSON.stringify(manifest), 'utf8');

        let threw = false;
        try {
            await exportChapterToAnki(dir, { chapter, subject: 'Science', skipProvenanceCheck: true });
        } catch (e) {
            threw = true;
        }

        assert.strictEqual(threw, true, 'Packaging must throw on missing IO media asset');
        assert(fs.existsSync(basicPath), 'Basic TSV must remain preserved on packaging failure');
    });

    await runTest('Negative 9: Missing APKG does not trigger TSV cleanup', async () => {
        const chapter = 'test_missing_apkg_no_cleanup';
        const dir = setupScratchChapter(chapter);
        const basicPath = createDummyBasicTsv(dir, chapter, 2);

        const fakeApkg = path.join(dir, 'non_existent.apkg');
        const cleanRes = cleanPackagingIntermediates(dir, {
            chapter,
            apkgPath: fakeApkg
        });

        assert.strictEqual(cleanRes.cleaned, false, 'Cleanup must abort when APKG is missing');
        assert(cleanRes.reason.includes('APKG_NOT_VERIFIED'));
        assert(fs.existsSync(basicPath), 'Source TSV must remain intact');
    });

    await runTest('Negative 10: Empty / 0-byte APKG does not trigger cleanup', async () => {
        const chapter = 'test_empty_apkg_no_cleanup';
        const dir = setupScratchChapter(chapter);
        const basicPath = createDummyBasicTsv(dir, chapter, 2);

        const emptyApkg = path.join(dir, `${chapter}_Anki.apkg`);
        fs.writeFileSync(emptyApkg, Buffer.alloc(0)); // 0-byte file

        const cleanRes = cleanPackagingIntermediates(dir, {
            chapter,
            apkgPath: emptyApkg
        });

        assert.strictEqual(cleanRes.cleaned, false, 'Cleanup must abort when APKG is 0 bytes');
        assert(cleanRes.reason.includes('APKG_NOT_VERIFIED'));
        assert(fs.existsSync(basicPath), 'Source TSV must remain intact');
    });

    await runTest('Negative 11: Cleanup cannot delete unrelated permanent files (Notes, Questions.md, etc.)', async () => {
        const chapter = 'test_protect_permanent_files';
        const dir = setupScratchChapter(chapter);
        const basicPath = createDummyBasicTsv(dir, chapter, 2);

        // Create permanent deliverable files & dirs
        const notesDir = path.join(dir, 'Notes');
        fs.mkdirSync(notesDir, { recursive: true });
        const notesFile = path.join(notesDir, `${chapter}_Notes.md`);
        fs.writeFileSync(notesFile, '# Notes Content', 'utf8');

        const questionsFile = path.join(dir, 'Questions.md');
        fs.writeFileSync(questionsFile, '# Questions Content', 'utf8');

        const mindmapDir = path.join(dir, 'MindMap');
        fs.mkdirSync(mindmapDir, { recursive: true });
        const mindmapFile = path.join(mindmapDir, `${chapter}.mindmap.json`);
        fs.writeFileSync(mindmapFile, '{}', 'utf8');

        const res = await exportChapterToAnki(dir, { chapter, subject: 'Science' });
        assert.strictEqual(res.success, true);

        // Permanent deliverables MUST still exist!
        assert(fs.existsSync(notesFile), 'Notes.md must NEVER be deleted');
        assert(fs.existsSync(questionsFile), 'Questions.md must NEVER be deleted');
        assert(fs.existsSync(mindmapFile), 'MindMap must NEVER be deleted');
        assert(fs.existsSync(notesDir), 'Notes/ dir must NEVER be deleted');
        assert(fs.existsSync(mindmapDir), 'MindMap/ dir must NEVER be deleted');

        // Only temporary TSVs removed
        assert(!fs.existsSync(basicPath), 'Basic TSV was cleaned up');
    });

    await runTest('Negative 12: IO absence does not create an invalid empty IO artifact', async () => {
        const chapter = 'test_io_absence_no_empty_artifact';
        const dir = setupScratchChapter(chapter);
        createDummyBasicTsv(dir, chapter, 3);

        const res = await exportChapterToAnki(dir, { chapter, subject: 'History', cleanIntermediates: false });
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.counts.ioNotes, 0);

        // APKG inspection: must have 0 IO notes
        const val = await validateApkg(res.outputPath, false);
        assert.strictEqual(val.isValid, true);
        assert.strictEqual(val.stats.notesByType.ImageOcclusion, 0, 'No fake/empty IO notes must exist');
        assert(!fs.existsSync(path.join(dir, 'ImageOcclusion')), 'No fake ImageOcclusion dir created');
    });

    await runTest('Negative 13: No card type is silently omitted from the unified APKG', async () => {
        const chapter = 'test_no_card_omitted';
        const dir = setupScratchChapter(chapter);
        createDummyBasicTsv(dir, chapter, 7);
        createDummyClozeTsv(dir, chapter, 4);
        createDummyIoManifest(dir, chapter); // 1 note with 2 regions

        const res = await exportChapterToAnki(dir, { chapter, subject: 'Geography', cleanIntermediates: false });
        assert.strictEqual(res.success, true);

        const val = await validateApkg(res.outputPath, false, {
            expectedCounts: { basic: 7, cloze: 4, io: 1 }
        });
        assert.strictEqual(val.isValid, true);
        assert.strictEqual(val.stats.notesByType.Basic, 7, 'Exact 7 Basic notes must be present');
        assert.strictEqual(val.stats.notesByType.Cloze, 4, 'Exact 4 Cloze notes must be present');
        assert.strictEqual(val.stats.notesByType.ImageOcclusion, 1, 'Exact 1 IO note must be present');
    });

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n================================================================================');
    console.log(`TEST SUITE SUMMARY: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
    console.log('================================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(err => {
        console.error('Fatal Test Runner Error:', err);
        process.exit(1);
    });
}

module.exports = { main };
