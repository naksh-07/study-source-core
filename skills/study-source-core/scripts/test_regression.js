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

    fs.mkdirSync(path.join(dummyChapter, 'Basic'), { recursive: true });
    fs.mkdirSync(path.join(dummyChapter, 'Cloze'), { recursive: true });
    fs.mkdirSync(slOptDir, { recursive: true });
    fs.writeFileSync(path.join(dummyChapter, 'Basic', 'test_regression_chapter_Basic.tsv'), "Front\tBack\tTags\nWhat is A?\tB\tTest\n", 'utf8');
    fs.writeFileSync(path.join(dummyChapter, 'Cloze', 'test_regression_chapter_Cloze.tsv'), "Text\tExtra\tTags\nThis is {{c1::test}}\tNote\tTest\n", 'utf8');

    const dummyPatterns = {
        id: "proc-reg-01",
        title: "Regression Topic",
        chapter: "test_regression_chapter",
        domain: "Math",
        patterns: [
            {
                id: "pat-reg-01",
                domain: "Math",
                problem_type: "Regression Type",
                problem_family: "reg_family",
                skill_id: "math.number_system.lcm_hcf",
                deep_structure: "Regression deep structure",
                recognition_signals: ["signal 1"],
                common_traps: ["trap 1"],
                difficulty: "Easy",
                governing_method: { standard_algorithm: ["step 1"] }
            }
        ]
    };
    fs.writeFileSync(path.join(slOptDir, 'test_regression_chapter_ProblemPatterns.json'), JSON.stringify(dummyPatterns, null, 2), 'utf8');

    try {
        await exportChapterToAnki(dummyChapter, { disableStdout: true, skipProvenanceCheck: true });
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
        await exportStudyLabProceduralAnki(path.join(slOptDir, 'test_regression_chapter_ProblemPatterns.json'), {
            chapter: 'test_regression_chapter',
            subject: 'Math',
            outputDir: path.join(dummyChapter, 'StudyLab'),
            outputFilename: 'LCM-HCF_StudyLab_Procedural.apkg',
            disableStdout: true
        });
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
