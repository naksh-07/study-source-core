const assert = require('assert');
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const JSZip = require('jszip');

const { exportChapterToAnki } = require('./export_anki');
const { exportStudyLabProceduralAnki } = require('./export_studylab_procedural_anki');
const { validateApkgContent } = require('./validate_apkg');
const { ensureAllTestFixtures } = require('./ensure_test_fixtures');
const { getVaultRoot, getCanonicalArtifactPaths } = require('./path_resolver');

const SCRATCH_DIR = path.resolve(__dirname, 'scratch/model_isolation_test');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(testId, description, testFn) {
    totalTests++;
    console.log(`\n[TEST ${testId}] ${description}`);
    try {
        await testFn();
        console.log(`  ✅ PASS`);
        passedTests++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${err.message}`);
        failedTests++;
        throw err;
    }
}

async function main() {
    console.log('================================================================================');
    console.log('  PHASE 8: MODEL ID ISOLATION & CLOSED BOUNDARY AUDIT');
    console.log('================================================================================');

    if (!fs.existsSync(SCRATCH_DIR)) {
        fs.mkdirSync(SCRATCH_DIR, { recursive: true });
    }

    // Ensure canonical fixtures are ready
    await ensureAllTestFixtures();

    const vaultRoot = getVaultRoot(__dirname);
    const europeDir = path.join(vaultRoot, 'Study Materials/Map/Europe');
    const mathDir = path.join(vaultRoot, 'Study Materials/Math/LCM-HCF');
    const mathPqPath = path.join(mathDir, 'Optional/LCM-HCF_PracticeQuestions.json');

    // ----------------------------------------------------
    // TEST 1: Declarative APKG Normal Export (1600000001..3 only)
    // ----------------------------------------------------
    await runTest('MOD-01', 'Declarative APKG exports only allowed models (1600000001..3)', async () => {
        const outPath = path.join(SCRATCH_DIR, 'decl_normal.apkg');
        const res = await exportChapterToAnki(europeDir, {
            chapter: 'Europe',
            subject: 'Map',
            outputPath: outPath,
            skipProvenanceCheck: true,
            cleanIntermediates: false
        });
        assert(res.success, 'Declarative export should succeed');

        const buf = fs.readFileSync(outPath);
        const val = await validateApkgContent(buf, outPath);
        assert(val.isValid, `Validation should pass: ${val.errors.join('; ')}`);
        assert.deepStrictEqual(val.stats.modelNames.sort(), ['Basic', 'Cloze', 'Image Occlusion'].sort());
    });

    // ----------------------------------------------------
    // TEST 2: Declarative APKG Injected with Model 1600000004 Fails Closed
    // ----------------------------------------------------
    await runTest('MOD-02', 'Declarative APKG injected with Model 1600000004 in modelsConfig fails closed', async () => {
        const injectedModels = {
            '1600000001': { id: 1600000001, name: 'Basic', flds: [{ name: 'Front' }, { name: 'Back' }] },
            '1600000004': { id: 1600000004, name: 'StudyLab Procedural Anchor', flds: [{ name: 'ProceduralPayload' }] }
        };

        let threw = false;
        try {
            await exportChapterToAnki(europeDir, {
                chapter: 'Europe',
                subject: 'Map',
                outputPath: path.join(SCRATCH_DIR, 'decl_injected_proc.apkg'),
                modelsConfigOverride: injectedModels,
                skipProvenanceCheck: true
            });
        } catch (err) {
            threw = true;
            assert(err.message.includes('[MODEL_ISOLATION_BREACH]'), `Expected MODEL_ISOLATION_BREACH, got: ${err.message}`);
            assert(err.message.includes('1600000004'), `Expected mention of 1600000004 in error: ${err.message}`);
        }
        assert(threw, 'Export must throw on prohibited procedural model 1600000004');
    });

    // ----------------------------------------------------
    // TEST 3: Declarative APKG Injected with Unknown Model ID Fails Closed
    // ----------------------------------------------------
    await runTest('MOD-03', 'Declarative APKG injected with unknown model ID fails closed', async () => {
        const injectedModels = {
            '1600000001': { id: 1600000001, name: 'Basic', flds: [{ name: 'Front' }, { name: 'Back' }] },
            '9999999999': { id: 9999999999, name: 'Foreign Rogue Model', flds: [{ name: 'RogueField' }] }
        };

        let threw = false;
        try {
            await exportChapterToAnki(europeDir, {
                chapter: 'Europe',
                subject: 'Map',
                outputPath: path.join(SCRATCH_DIR, 'decl_injected_rogue.apkg'),
                modelsConfigOverride: injectedModels,
                skipProvenanceCheck: true
            });
        } catch (err) {
            threw = true;
            assert(err.message.includes('[MODEL_ISOLATION_BREACH]'), `Expected MODEL_ISOLATION_BREACH, got: ${err.message}`);
        }
        assert(threw, 'Export must throw on unknown foreign model ID');
    });

    // ----------------------------------------------------
    // TEST 4: Declarative APKG Injected with Note using Model 1600000004 Fails Closed
    // ----------------------------------------------------
    await runTest('MOD-04', 'Declarative APKG injected with note using mid 1600000004 fails closed', async () => {
        let threw = false;
        try {
            await exportChapterToAnki(europeDir, {
                chapter: 'Europe',
                subject: 'Map',
                outputPath: path.join(SCRATCH_DIR, 'decl_injected_note_mid.apkg'),
                testInjectedNoteMid: 1600000004,
                skipProvenanceCheck: true
            });
        } catch (err) {
            threw = true;
            assert(err.message.includes('[MODEL_ISOLATION_BREACH]'), `Expected MODEL_ISOLATION_BREACH, got: ${err.message}`);
        }
        assert(threw, 'Export must throw on note using prohibited procedural model 1600000004');
    });

    // ----------------------------------------------------
    // TEST 5: Procedural APKG Normal Export (1600000004 only)
    // ----------------------------------------------------
    await runTest('MOD-05', 'Procedural APKG exports only allowed model (1600000004)', async () => {
        const outDir = path.join(SCRATCH_DIR, 'proc_normal');
        const res = await exportStudyLabProceduralAnki(mathPqPath, {
            outputDir: outDir,
            outputFilename: 'LCM-HCF_StudyLab_Procedural.apkg',
            manifestFilename: 'LCM-HCF_StudyLab_Procedural.manifest.json'
        });
        assert(res.success, 'Procedural export should succeed');

        const apkgPath = path.join(outDir, 'LCM-HCF_StudyLab_Procedural.apkg');
        const zip = await JSZip.loadAsync(fs.readFileSync(apkgPath));
        const colFile = zip.file('collection.anki2');
        const SQL = await initSqlJs();
        const db = new SQL.Database(await colFile.async('nodebuffer'));

        const colRes = db.exec('SELECT models FROM col LIMIT 1');
        const models = JSON.parse(colRes[0].values[0][0]);
        const modelIds = Object.keys(models);
        assert.deepStrictEqual(modelIds, ['1600000004'], 'Procedural deck must only contain model 1600000004');

        const notesRes = db.exec('SELECT DISTINCT mid FROM notes');
        const noteMids = notesRes[0].values.map(v => v[0]);
        assert.deepStrictEqual(noteMids, [1600000004], 'Procedural notes must only use mid 1600000004');
        db.close();
    });

    // ----------------------------------------------------
    // TEST 6: Procedural APKG Injected with Model 1600000001 Fails Closed
    // ----------------------------------------------------
    await runTest('MOD-06', 'Procedural APKG injected with Model 1600000001 fails closed', async () => {
        const injectedModels = {
            '1600000004': { id: 1600000004, name: 'StudyLab Procedural Anchor', flds: [{ name: 'ProceduralPayload' }] },
            '1600000001': { id: 1600000001, name: 'Basic', flds: [{ name: 'Front' }, { name: 'Back' }] }
        };

        let threw = false;
        try {
            await exportStudyLabProceduralAnki(mathPqPath, {
                outputDir: path.join(SCRATCH_DIR, 'proc_injected'),
                outputFilename: 'proc_injected_basic.apkg',
                modelsConfigOverride: injectedModels
            });
        } catch (err) {
            threw = true;
            assert(err.message.includes('[MODEL_ISOLATION_BREACH]'), `Expected MODEL_ISOLATION_BREACH, got: ${err.message}`);
            assert(err.message.includes('1600000001'), `Expected mention of 1600000001 in error: ${err.message}`);
        }
        assert(threw, 'Procedural export must throw on prohibited declarative model 1600000001');
    });

    // ----------------------------------------------------
    // TEST 7: Procedural APKG Injected with Note using Model 1600000001 Fails Closed
    // ----------------------------------------------------
    await runTest('MOD-07', 'Procedural APKG injected with note using mid 1600000001 fails closed', async () => {
        let threw = false;
        try {
            await exportStudyLabProceduralAnki(mathPqPath, {
                outputDir: path.join(SCRATCH_DIR, 'proc_injected_note'),
                outputFilename: 'proc_injected_note.apkg',
                testInjectedNoteMid: 1600000001
            });
        } catch (err) {
            threw = true;
            assert(err.message.includes('[MODEL_ISOLATION_BREACH]'), `Expected MODEL_ISOLATION_BREACH, got: ${err.message}`);
        }
        assert(threw, 'Procedural export must throw on note using prohibited declarative model 1600000001');
    });

    // ----------------------------------------------------
    // TEST 8: Dual-Deck Fresh Profile Coexistence Simulation
    // ----------------------------------------------------
    await runTest('MOD-08', 'Dual-Deck Fresh Profile Coexistence Simulation (Zero Collisions)', async () => {
        const declPaths = getCanonicalArtifactPaths('Map', 'Europe');
        const procPaths = getCanonicalArtifactPaths('Math', 'LCM-HCF');

        assert(fs.existsSync(declPaths.apkg.path), `Europe APKG missing: ${declPaths.apkg.path}`);
        assert(fs.existsSync(procPaths.proceduralApkg.path), `Procedural APKG missing: ${procPaths.proceduralApkg.path}`);

        const declZip = await JSZip.loadAsync(fs.readFileSync(declPaths.apkg.path));
        const procZip = await JSZip.loadAsync(fs.readFileSync(procPaths.proceduralApkg.path));

        const SQL = await initSqlJs();
        const declDb = new SQL.Database(await declZip.file('collection.anki2').async('nodebuffer'));
        const procDb = new SQL.Database(await procZip.file('collection.anki2').async('nodebuffer'));

        const unifiedDb = new SQL.Database();
        unifiedDb.run(`
            CREATE TABLE col (id integer primary key, crt integer, mod integer, scm integer, ver integer, dty integer, usn integer, ls integer, conf text, models text, decks text, dconf text, tags text);
            CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null);
            CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null, factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null);
        `);

        const declColRow = declDb.exec('SELECT models, decks FROM col LIMIT 1')[0].values[0];
        const procColRow = procDb.exec('SELECT models, decks FROM col LIMIT 1')[0].values[0];

        const declModels = JSON.parse(declColRow[0]);
        const procModels = JSON.parse(procColRow[0]);
        const declDecks = JSON.parse(declColRow[1]);
        const procDecks = JSON.parse(procColRow[1]);

        const declModelKeys = new Set(Object.keys(declModels));
        const procModelKeys = new Set(Object.keys(procModels));
        for (const k of procModelKeys) {
            assert(!declModelKeys.has(k), `Fatal model ID collision between declarative and procedural: ${k}`);
        }

        const mergedModels = { ...declModels, ...procModels };
        const mergedDecks = { ...declDecks, ...procDecks };

        unifiedDb.run(
            "INSERT INTO col VALUES (1, 1700000000, 1700000000, 1700000000, 11, 0, 0, 0, '{}', ?, ?, '{}', '{}')",
            [JSON.stringify(mergedModels), JSON.stringify(mergedDecks)]
        );

        const declNotes = declDb.exec('SELECT id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data FROM notes')[0].values;
        const declCards = declDb.exec('SELECT id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data FROM cards')[0].values;

        const insertNoteStmt = unifiedDb.prepare('INSERT INTO notes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        declNotes.forEach(r => insertNoteStmt.run(r));

        const insertCardStmt = unifiedDb.prepare('INSERT INTO cards VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        declCards.forEach(r => insertCardStmt.run(r));

        const procNotes = procDb.exec('SELECT id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data FROM notes')[0].values;
        const procCards = procDb.exec('SELECT id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data FROM cards')[0].values;

        const existingNoteIds = new Set(declNotes.map(n => n[0]));
        const existingGuids = new Set(declNotes.map(n => n[1]));
        const existingCardIds = new Set(declCards.map(c => c[0]));

        procNotes.forEach(r => {
            const [nid, guid] = r;
            assert(!existingNoteIds.has(nid), `Fatal Note ID collision between declarative and procedural: ${nid}`);
            assert(!existingGuids.has(guid), `Fatal GUID collision between declarative and procedural: ${guid}`);
            insertNoteStmt.run(r);
        });

        procCards.forEach(r => {
            const [cid] = r;
            assert(!existingCardIds.has(cid), `Fatal Card ID collision between declarative and procedural: ${cid}`);
            insertCardStmt.run(r);
        });

        insertNoteStmt.free();
        insertCardStmt.free();

        const colCheck = unifiedDb.exec('SELECT models FROM col LIMIT 1');
        const finalModels = JSON.parse(colCheck[0].values[0][0]);
        const finalModelIds = Object.keys(finalModels).sort();
        assert.deepStrictEqual(finalModelIds, ['1600000001', '1600000002', '1600000003', '1600000004']);

        const orphanCardsRes = unifiedDb.exec('SELECT count(*) FROM cards WHERE nid NOT IN (SELECT id FROM notes)');
        const orphanCards = orphanCardsRes[0].values[0][0];
        assert.strictEqual(orphanCards, 0, 'There must be zero orphan cards in unified collection');

        const orphanNotesRes = unifiedDb.exec('SELECT count(*) FROM notes WHERE id NOT IN (SELECT nid FROM cards)');
        const orphanNotes = orphanNotesRes[0].values[0][0];
        assert.strictEqual(orphanNotes, 0, 'There must be zero orphan notes in unified collection');

        const countsByModelRes = unifiedDb.exec('SELECT mid, count(*) FROM notes GROUP BY mid ORDER BY mid');
        const countsByModel = Object.fromEntries(countsByModelRes[0].values);
        console.log('     Unified Profile Notes by Model:', countsByModel);
        assert(countsByModel[1600000001] > 0, 'Basic notes present');
        assert(countsByModel[1600000002] > 0, 'Cloze notes present');
        assert(countsByModel[1600000003] > 0, 'IO notes present');
        assert(countsByModel[1600000004] > 0, 'StudyLab Procedural notes present');

        declDb.close();
        procDb.close();
        unifiedDb.close();
    });

    console.log('\n================================================================================');
    console.log(`  MODEL ISOLATION SCORECARD: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
    console.log('  Overall Verdict: 🟢 ALL MODEL ISOLATION INVARIANTS UPHELD');
    console.log('================================================================================\n');
}

if (require.main === module) {
    main().catch(err => {
        console.error('Fatal test failure:', err);
        process.exit(1);
    });
}

module.exports = { main };
