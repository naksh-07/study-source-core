const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const JSZip = require('jszip');

async function validateMcqBlackBox(apkgPath) {
    console.log(`\n====================================================`);
    console.log(`Running Black-Box MCQ Validator on: ${apkgPath}`);
    console.log(`====================================================\n`);

    if (!fs.existsSync(apkgPath)) {
        console.error(`❌ FAIL: APKG not found at ${apkgPath}`);
        return false;
    }

    const buffer = fs.readFileSync(apkgPath);
    const zip = await JSZip.loadAsync(buffer);
    
    if (!zip.file('collection.anki2')) {
        console.error(`❌ FAIL: collection.anki2 missing from APKG`);
        return false;
    }

    const dbBuffer = await zip.file('collection.anki2').async('nodebuffer');
    const SQL = await initSqlJs();
    const db = new SQL.Database(dbBuffer);

    const notes = db.exec(`SELECT id, flds FROM notes`);
    if (!notes || notes.length === 0) {
        console.error(`❌ FAIL: No notes found in APKG`);
        return false;
    }

    let mcqCount = 0;
    let allValid = true;

    for (const row of notes[0].values) {
        const id = row[0];
        const flds = row[1];
        const parts = flds.split('\x1f');
        const payloadStr = parts[0];

        try {
            const payload = JSON.parse(payloadStr);
            const contract = payload.inline_contract;
            if (!contract) continue;

            const baseModality = contract.question_type || contract.modality || contract.card_type;
            const modality = contract.contract ? (contract.contract.modality || baseModality) : baseModality;

            if (modality === 'mcq' || (contract.contract && contract.contract.modality === 'mcq')) {
                mcqCount++;
                const actualContract = contract.contract || contract;
                const options = actualContract.options || (actualContract.rendering_metadata ? actualContract.rendering_metadata.options : null);
                
                if (!options || !Array.isArray(options)) {
                    console.error(`❌ FAIL Note ${id}: MCQ is missing options array in payload.`);
                    allValid = false;
                } else if (options.length < 3) {
                    console.error(`❌ FAIL Note ${id}: MCQ has fewer than 3 options (${options.length}).`);
                    allValid = false;
                } else {
                    console.log(`✅ Note ${id}: Valid MCQ with ${options.length} discrete options.`);
                }
            }
        } catch (e) {
            console.error(`❌ FAIL Note ${id}: Could not parse ProceduralPayload JSON. ${e.message}`);
        }
    }

    if (mcqCount === 0) {
        console.warn(`⚠️ Warning: No MCQ questions found in APKG to validate.`);
    }

    console.log(`\n====================================================`);
    if (allValid && mcqCount > 0) {
        console.log(`✅ SUCCESS: All ${mcqCount} MCQs contain discrete rendered options in the payload.`);
        return true;
    } else {
        console.log(`❌ FAILED: MCQ Black-Box Contract broken.`);
        return false;
    }
}

const args = process.argv.slice(2);
if (args.length > 0) {
    validateMcqBlackBox(args[0]).then(success => process.exit(success ? 0 : 1));
} else {
    module.exports = { validateMcqBlackBox };
}
