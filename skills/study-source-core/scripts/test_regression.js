const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const JSZip = require('jszip');
const { exportChapterToAnki } = require('./export_anki.js');
const { exportStudyLabProceduralAnki } = require('./export_studylab_procedural_anki.js');

async function checkApkg(dbBuffer) {
    const SQL = await initSqlJs();
    const db = new SQL.Database(dbBuffer);
    const res = db.exec("SELECT decks FROM col");
    if (!res.length) throw new Error("No col table or decks");
    const decksStr = res[0].values[0][0];
    const decks = JSON.parse(decksStr);
    for (const key of Object.keys(decks)) {
        const deck = decks[key];
        const requiredFields = ['id', 'mod', 'name', 'usn', 'desc', 'dyn', 'conf', 'extendNew', 'extendRev', 'collapsed', 'browserCollapsed', 'lrnToday', 'revToday', 'newToday', 'timeToday'];
        for (const field of requiredFields) {
            if (!(field in deck)) {
                throw new Error("Missing required field: " + field);
            }
        }
        if (!Array.isArray(deck.lrnToday) || deck.lrnToday.length !== 2) throw new Error("lrnToday must be [int, int]");
    }
    return true;
}

async function run() {
    console.log("Running Regression Test: Anki strict decks JSON schema");
    
    const dummyChapter = path.join(__dirname, 'scratch', 'test_regression_chapter');
    const slOptDir = path.join(dummyChapter, 'Optional');

    try {
        await exportChapterToAnki(dummyChapter, { disableStdout: true });
        const normalApkgPath = path.join(dummyChapter, 'test_regression_chapter_Anki.apkg');
        const normalApkgBuf = fs.readFileSync(normalApkgPath);
        const zip = await JSZip.loadAsync(normalApkgBuf);
        const colBuffer = await zip.file('collection.anki2').async('nodebuffer');
        await checkApkg(colBuffer);
        console.log("Normal APKG passed regression test");
    } catch (e) {
        console.error("Normal APKG failed: " + e.message);
        process.exit(1);
    }

    try {
        await exportStudyLabProceduralAnki(path.join(slOptDir, 'test_regression_chapter_ProblemPatterns.json'), dummyChapter, { disableStdout: true });
        const slApkgPath = path.join(dummyChapter, 'StudyLab', 'LCM-HCF_StudyLab_Procedural.apkg');
        const slApkgBuf = fs.readFileSync(slApkgPath);
        const zipSl = await JSZip.loadAsync(slApkgBuf);
        const colBufferSl = await zipSl.file('collection.anki2').async('nodebuffer');
        await checkApkg(colBufferSl);
        console.log("StudyLab Procedural APKG passed regression test");
    } catch (e) {
        console.error("StudyLab APKG failed: " + e.message);
        process.exit(1);
    }
    console.log("Regression Test OK.");
}
run();
