/**
 * study-source-core Unified Anki Deck Exporter (`export_anki.js`)
 * 
 * Packages Basic, Cloze, and Native Image Occlusion flashcards into ONE unified Anki deck package (.apkg).
 * 
 * Features:
 * - Direct consumption of canonical artifacts:
 *     - Basic: [Chapter]_Basic.tsv (if eligible)
 *     - Cloze: [Chapter]_Cloze.tsv (if eligible)
 *     - Image Occlusion: [Chapter]_ImageOcclusion.json & media/ (if eligible)
 * - Empty Short-Circuit (Finding 1): If total cards is 0, suppresses APKG creation (no empty APKG)
 * - Provenance & Validation Gate: Rejects stale, mismatched, or unvalidated artifacts
 * - Strict 3-column TSV assertion
 * - Explicit missing-media assertions (no silent skips)
 * - Official Native Image Occlusion notetype integration (Anki 23.10+ / 24+ standard)
 * - Shared utilities integration (shared_anki_utils.js)
 * - Deterministic SQLite database (collection.anki2) & media mapping
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load sql.js
const initSqlJs = require('sql.js');

const { validateTsvContent } = require('./validate_tsv');
const { validateImageOcclusionContent } = require('./validate_image_occlusion');
const { validateApkgContent } = require('./validate_apkg');
const {
    loadManifest,
    verifyArtifactLineage,
    recordArtifact,
    cleanPackagingIntermediates,
    computeSha256
} = require('./artifact_provenance');
const { getVaultRoot, normalizeName } = require('./path_resolver');
const {
    generateDeterministicGuid,
    calculateFieldChecksum,
    initializeAnkiSchema,
    buildDeckConfigurations,
    assembleApkgZip
} = require('./shared_anki_utils');

/**
 * Extracts distinct cloze numbers (e.g. [1, 2]) from cloze text.
 */
function extractClozeOrdinals(text) {
    const matches = text.match(/\{\{c(\d+)::/g) || [];
    const ordinals = new Set();
    matches.forEach(m => {
        const num = parseInt(m.replace('{{c', '').replace('::', ''), 10);
        if (!isNaN(num) && num > 0) {
            ordinals.add(num - 1); // 0-indexed ordinal
        }
    });
    return ordinals.size > 0 ? Array.from(ordinals).sort((a, b) => a - b) : [0];
}

/**
 * Standard Model Definitions for Anki Collection
 */
function buildModelDefinitions() {
    return {
        "1600000001": {
            "id": 1600000001,
            "name": "Basic",
            "type": 0,
            "mod": 1700000000,
            "usn": -1,
            "sortf": 0,
            "did": 1,
            "tmpls": [
                {
                    "name": "Card 1",
                    "ord": 0,
                    "qfmt": "{{Front}}",
                    "afmt": "{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}",
                    "bqfmt": "",
                    "bafmt": "",
                    "did": null
                }
            ],
            "flds": [
                { "name": "Front", "ord": 0, "sticky": false, "rtl": false, "font": "Arial", "size": 20, "media": [] },
                { "name": "Back", "ord": 1, "sticky": false, "rtl": false, "font": "Arial", "size": 20, "media": [] }
            ],
            "css": ".card {\n font-family: arial;\n font-size: 20px;\n text-align: center;\n color: black;\n background-color: white;\n}\n",
            "latexPre": "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
            "latexPost": "\\end{document}",
            "latexsvg": false,
            "req": [[0, "all", [0]]]
        },
        "1600000002": {
            "id": 1600000002,
            "name": "Cloze",
            "type": 1,
            "mod": 1700000000,
            "usn": -1,
            "sortf": 0,
            "did": 1,
            "tmpls": [
                {
                    "name": "Cloze",
                    "ord": 0,
                    "qfmt": "{{cloze:Text}}",
                    "afmt": "{{cloze:Text}}<br>\n{{Back Extra}}",
                    "bqfmt": "",
                    "bafmt": "",
                    "did": null
                }
            ],
            "flds": [
                { "name": "Text", "ord": 0, "sticky": false, "rtl": false, "font": "Arial", "size": 20, "media": [] },
                { "name": "Back Extra", "ord": 1, "sticky": false, "rtl": false, "font": "Arial", "size": 20, "media": [] }
            ],
            "css": ".card {\n font-family: arial;\n font-size: 20px;\n text-align: center;\n color: black;\n background-color: white;\n}\n.cloze {\n font-weight: bold;\n color: #0284c7;\n}\n.nightMode .cloze {\n color: #38bdf8;\n}\n",
            "latexPre": "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
            "latexPost": "\\end{document}",
            "latexsvg": false,
            "req": [[0, "any", [0]]]
        },
        "1600000003": {
            "id": 1600000003,
            "name": "Image Occlusion",
            "type": 1,
            "mod": 1700000000,
            "usn": -1,
            "sortf": 2,
            "did": 1,
            "original_stock_kind": 6,
            "tmpls": [
                {
                    "name": "Image Occlusion",
                    "ord": 0,
                    "qfmt": "{{#Header}}<div>{{Header}}</div>{{/Header}}\n<div style=\"display: none\">{{cloze:Occlusions}}</div>\n<div id=\"err\"></div>\n<div id=\"image-occlusion-container\">\n    {{Image}}\n    <canvas id=\"image-occlusion-canvas\"></canvas>\n</div>\n<script>\ntry {\n    anki.imageOcclusion.setup();\n} catch (exc) {\n    document.getElementById(\"err\").innerHTML = `Error loading image occlusion<br><br>${exc}`;\n}\n</script>",
                    "afmt": "{{#Header}}<div>{{Header}}</div>{{/Header}}\n<div style=\"display: none\">{{cloze:Occlusions}}</div>\n<div id=\"err\"></div>\n<div id=\"image-occlusion-container\">\n    {{Image}}\n    <canvas id=\"image-occlusion-canvas\"></canvas>\n</div>\n<script>\ntry {\n    anki.imageOcclusion.setup();\n} catch (exc) {\n    document.getElementById(\"err\").innerHTML = `Error loading image occlusion<br><br>${exc}`;\n}\n</script>\n<div><button id=\"toggle\">Toggle Masks</button></div>\n{{#Back Extra}}<div>{{Back Extra}}</div>{{/Back Extra}}",
                    "bqfmt": "",
                    "bafmt": "",
                    "did": null
                }
            ],
            "flds": [
                { "name": "Occlusions", "ord": 0, "sticky": false, "rtl": false, "font": "Arial", "size": 20, "media": [] },
                { "name": "Image", "ord": 1, "sticky": false, "rtl": false, "font": "Arial", "size": 20, "media": [] },
                { "name": "Header", "ord": 2, "sticky": false, "rtl": false, "font": "Arial", "size": 20, "media": [] },
                { "name": "Back Extra", "ord": 3, "sticky": false, "rtl": false, "font": "Arial", "size": 20, "media": [] },
                { "name": "Comments", "ord": 4, "sticky": false, "rtl": false, "font": "Arial", "size": 20, "media": [] }
            ],
            "css": "#image-occlusion-canvas {\n    --inactive-shape-color: #ffeba2;\n    --active-shape-color: #ff8e8e;\n    --inactive-shape-border: 1px #212121;\n    --active-shape-border: 1px #212121;\n    --highlight-shape-color: #ff8e8e00;\n    --highlight-shape-border: 1px #ff8e8e;\n}\n\n.card {\n    font-family: arial;\n    font-size: 20px;\n    text-align: center;\n    color: black;\n    background-color: white;\n}\n",
            "latexPre": "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
            "latexPost": "\\end{document}",
            "latexsvg": false,
            "req": [[0, "any", [0]]]
        }
    };
}

/**
 * Serializes Image Occlusion regions into official Anki cloze occlusion string.
 */
function serializeOcclusions(regions) {
    return regions.map((r, idx) => {
        const clozeIndex = idx + 1;
        let shapeStr = '';
        if (r.shape === 'rectangle' && r.coordinates) {
            const [x, y, w, h] = r.coordinates;
            shapeStr = `rect:left=${x}:top=${y}:width=${w}:height=${h}`;
        } else if (r.shape === 'ellipse' && r.coordinates) {
            const [cx, cy, rx, ry] = r.coordinates;
            shapeStr = `ellipse:left=${cx - rx}:top=${cy - ry}:width=${2 * rx}:height=${2 * ry}:rx=${rx}:ry=${ry}`;
        } else if (r.shape === 'polygon' && r.points) {
            const pts = r.points.map(p => `${p[0]},${p[1]}`).join(' ');
            shapeStr = `polygon:points=${pts}`;
        }
        return `{{c${clozeIndex}::${shapeStr}}}`;
    }).join(' ');
}

/**
 * Parses a TSV file into raw records with strict column count assertion.
 */
function parseTsvFile(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const val = validateTsvContent(content, filePath);
    if (!val.isValid) {
        throw new Error(`TSV Validation failed for ${filePath}: ${val.errors.join('; ')}`);
    }

    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length <= 1) return []; // Only header

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const cols = line.split('\t');
        if (cols.length !== 3) {
            throw new Error(`Strict TSV parse error in ${filePath} at line ${i + 1}: expected exactly 3 columns, found ${cols.length}. Line content: "${line}"`);
        }
        rows.push({
            col0: cols[0],
            col1: cols[1],
            col2: cols[2]
        });
    }
    return rows;
}

/**
 * Packages all chapter flashcards (Basic + Cloze + IO) into a unified .apkg deck.
 * 
 * @param {string} chapterDir - Path to chapter directory (e.g. "Study Materials/Map/Europe")
 * @param {Object} [options]
 * @returns {Promise<Object>} Export summary
 */
async function exportChapterToAnki(chapterDir, options = {}) {
    const resolvedChapterDir = path.resolve(chapterDir);
    if (!fs.existsSync(resolvedChapterDir)) {
        throw new Error(`Chapter directory not found: ${resolvedChapterDir}`);
    }

    const chapterName = normalizeName(options.chapter || path.basename(resolvedChapterDir));
    const subjectName = normalizeName(options.subject || path.basename(path.dirname(resolvedChapterDir)));
    const deckName = options.deckName || `${subjectName}::${chapterName}`;
    const deckId = Math.abs(parseInt(crypto.createHash('md5').update(deckName).digest('hex').substring(0, 8), 16)) || 1700000001;

    console.log(`\n====================================================`);
    console.log(`Assembling Unified Anki Deck: ${deckName}`);
    console.log(`Chapter Path: ${resolvedChapterDir}`);
    console.log(`====================================================\n`);

    // 1. Locate artifacts (search chapter root first, then loose root files, then .build/source-artifacts fallback)
    let basicTsvPath = path.join(resolvedChapterDir, 'Basic', `${chapterName}_Basic.tsv`);
    if (!fs.existsSync(basicTsvPath)) {
        const looseNamed = path.join(resolvedChapterDir, `${chapterName}_Basic.tsv`);
        const looseGeneric = path.join(resolvedChapterDir, 'basic.tsv');
        const buildBasic = path.join(resolvedChapterDir, '.build', 'source-artifacts', 'Basic', `${chapterName}_Basic.tsv`);
        const buildLoose = path.join(resolvedChapterDir, '.build', 'source-artifacts', `${chapterName}_Basic.tsv`);
        if (fs.existsSync(looseNamed)) basicTsvPath = looseNamed;
        else if (fs.existsSync(looseGeneric)) basicTsvPath = looseGeneric;
        else if (fs.existsSync(buildBasic)) basicTsvPath = buildBasic;
        else if (fs.existsSync(buildLoose)) basicTsvPath = buildLoose;
    }

    let clozeTsvPath = path.join(resolvedChapterDir, 'Cloze', `${chapterName}_Cloze.tsv`);
    if (!fs.existsSync(clozeTsvPath)) {
        const looseNamed = path.join(resolvedChapterDir, `${chapterName}_Cloze.tsv`);
        const looseGeneric = path.join(resolvedChapterDir, 'cloze.tsv');
        const buildCloze = path.join(resolvedChapterDir, '.build', 'source-artifacts', 'Cloze', `${chapterName}_Cloze.tsv`);
        const buildLoose = path.join(resolvedChapterDir, '.build', 'source-artifacts', `${chapterName}_Cloze.tsv`);
        if (fs.existsSync(looseNamed)) clozeTsvPath = looseNamed;
        else if (fs.existsSync(looseGeneric)) clozeTsvPath = looseGeneric;
        else if (fs.existsSync(buildCloze)) clozeTsvPath = buildCloze;
        else if (fs.existsSync(buildLoose)) clozeTsvPath = buildLoose;
    }

    let ioJsonPath = path.join(resolvedChapterDir, 'ImageOcclusion', `${chapterName}_ImageOcclusion.json`);
    let mediaDir = path.join(resolvedChapterDir, 'ImageOcclusion', 'media');
    if (!fs.existsSync(ioJsonPath)) {
        const looseNamed = path.join(resolvedChapterDir, `${chapterName}_ImageOcclusion.json`);
        const buildIo = path.join(resolvedChapterDir, '.build', 'source-artifacts', 'ImageOcclusion', `${chapterName}_ImageOcclusion.json`);
        const buildLoose = path.join(resolvedChapterDir, '.build', 'source-artifacts', `${chapterName}_ImageOcclusion.json`);
        if (fs.existsSync(looseNamed)) {
            ioJsonPath = looseNamed;
            const looseMedia = path.join(resolvedChapterDir, 'media');
            if (fs.existsSync(looseMedia)) mediaDir = looseMedia;
        } else if (fs.existsSync(buildIo)) {
            ioJsonPath = buildIo;
            mediaDir = path.join(resolvedChapterDir, '.build', 'source-artifacts', 'ImageOcclusion', 'media');
        } else if (fs.existsSync(buildLoose)) {
            ioJsonPath = buildLoose;
            mediaDir = path.join(resolvedChapterDir, '.build', 'source-artifacts', 'media');
        }
    }

    // 2. Provenance & Lineage Verification Gate
    const hasBasic = fs.existsSync(basicTsvPath);
    const hasCloze = fs.existsSync(clozeTsvPath);
    const hasIO = fs.existsSync(ioJsonPath);

    const manifest = loadManifest(resolvedChapterDir);
    if (manifest && !options.skipProvenanceCheck) {
        const participatingTypes = [];
        if (hasBasic) participatingTypes.push('basic');
        if (hasCloze) participatingTypes.push('cloze');
        if (hasIO) participatingTypes.push('imageOcclusion');

        const lineage = verifyArtifactLineage(resolvedChapterDir, {
            participatingTypes,
            includeImageOcclusion: hasIO
        });

        if (!lineage.isValid) {
            console.error("\n[EXPORT BLOCKED] Artifact Provenance & Lineage Verification Failed:");
            lineage.errors.forEach(e => console.error(`  ❌ ${e}`));
            throw new Error(`EXPORT BLOCKED: Stale or unvalidated artifact detected in ${resolvedChapterDir}.\n${lineage.errors.join('\n')}`);
        }
        console.log(`  🛡️  Provenance Verified: Evidence Hash [${lineage.evidenceHash ? lineage.evidenceHash.substring(0, 12) : 'N/A'}]`);
    } else if (!manifest && options.requireManifest) {
        throw new Error(`EXPORT BLOCKED: Missing artifact-manifest.json in ${resolvedChapterDir}. Cannot verify provenance.`);
    }

    // 3. Parse Basic TSV
    const basicRows = hasBasic ? parseTsvFile(basicTsvPath) : [];
    console.log(`  📦 Basic Cards Loaded: ${basicRows.length}`);

    // 4. Parse Cloze TSV
    const clozeRows = hasCloze ? parseTsvFile(clozeTsvPath) : [];
    console.log(`  📦 Cloze Notes Loaded: ${clozeRows.length}`);

    // 5. Parse Image Occlusion JSON & collect media (Strict Media Check)
    let ioManifest = null;
    const mediaFilesMap = new Map();
    let ioCardCount = 0;

    if (hasIO) {
        const ioContent = fs.readFileSync(ioJsonPath, 'utf-8');
        const val = validateImageOcclusionContent(ioContent, ioJsonPath);
        if (!val.isValid) {
            throw new Error(`Image Occlusion Validation failed for ${ioJsonPath}: ${val.errors.join('; ')}`);
        }
        ioManifest = JSON.parse(ioContent);
        if (Array.isArray(ioManifest.cards)) {
            for (const c of ioManifest.cards) {
                if (c.asset && c.asset.path) {
                    const cleanName = path.basename(c.asset.path);
                    const absMediaFile = path.join(mediaDir, cleanName);
                    
                    // Strict assertion: missing media is a fatal error
                    if (!fs.existsSync(absMediaFile)) {
                        throw new Error(`EXPORT FAIL: Missing IO media asset referenced in manifest: ${absMediaFile}`);
                    }
                    mediaFilesMap.set(cleanName, absMediaFile);
                }
                ioCardCount += (c.regions ? c.regions.length : 1);
            }
        }
        console.log(`  📦 Image Occlusion Notes: ${ioManifest.cards.length} (${ioCardCount} cards)`);
        console.log(`  🖼️  Bundled Media Files: ${mediaFilesMap.size}`);
    } else {
        console.log(`  ℹ️  No Image Occlusion manifest found (gracefully omitted).`);
    }

    // Finding 1 Short-Circuit: If no flashcard records exist across all types, do not produce empty APKG
    const totalInputNotes = basicRows.length + clozeRows.length + (ioManifest && Array.isArray(ioManifest.cards) ? ioManifest.cards.length : 0);
    if (totalInputNotes === 0) {
        console.warn(`[Finding 1 Short-Circuit] Zero flashcards found across Basic, Cloze, or ImageOcclusion for ${chapterName}. Suppressed empty APKG creation.`);
        if (options.throwOnEmpty) {
            throw new Error(`EXPORT BLOCKED: Zero flashcards found for ${chapterName}. Empty APKG generation is suppressed.`);
        }
        return {
            success: false,
            suppressed: true,
            reason: 'NO_FLASHCARD_RECORDS',
            deckName,
            deckId,
            counts: {
                basicNotes: 0,
                clozeNotes: 0,
                ioNotes: 0,
                totalNotes: 0,
                totalCards: 0,
                mediaFiles: 0
            }
        };
    }

    // 6. Initialize SQLite Database using shared utils
    const SQL = await initSqlJs();
    const db = new SQL.Database();

    initializeAnkiSchema(db);

    const { decksConfig, dconfConfig, globalConf, nowSecs, nowMs } = buildDeckConfigurations(
        deckId,
        deckName,
        `Study Source Core: ${deckName}`
    );

    const modelsConfig = buildModelDefinitions();

    // Insert col row
    const insertColStmt = db.prepare(`
        INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
        VALUES (1, ?, ?, ?, 11, 0, 0, 0, ?, ?, ?, ?, '{}')
    `);
    insertColStmt.run([
        nowSecs,
        nowMs,
        nowMs,
        JSON.stringify(globalConf),
        JSON.stringify(modelsConfig),
        JSON.stringify(decksConfig),
        JSON.stringify(dconfConfig)
    ]);
    insertColStmt.free();

    let noteIdCounter = 1700001000000;
    let cardIdCounter = 1700005000000;
    let totalCardsCreated = 0;
    let totalNotesCreated = 0;

    const insertNoteStmt = db.prepare(`
        INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
        VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, '')
    `);

    const insertCardStmt = db.prepare(`
        INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data)
        VALUES (?, ?, ?, ?, ?, -1, 0, 0, ?, 0, 2500, 0, 0, 0, 0, 0, 0, '')
    `);

    // 7. Insert Basic Notes & Cards (if present)
    basicRows.forEach((row, idx) => {
        const nid = noteIdCounter++;
        const guid = generateDeterministicGuid(`basic-${deckName}-${idx}-${row.col0}`);
        const tags = row.col2 ? ` ${row.col2.trim().split(/\s+/).join(' ')} ` : ` ${deckName.replace(/::/g, '_')} `;
        const flds = `${row.col0}\u001f${row.col1}`;
        const sfld = row.col0;
        const csum = calculateFieldChecksum(sfld);

        insertNoteStmt.run([nid, guid, 1600000001, nowSecs, tags, flds, sfld, csum]);
        totalNotesCreated++;

        const cid = cardIdCounter++;
        insertCardStmt.run([cid, nid, deckId, 0, nowSecs, totalCardsCreated + 1]);
        totalCardsCreated++;
    });

    // 8. Insert Cloze Notes & Cards (if present)
    clozeRows.forEach((row, idx) => {
        const nid = noteIdCounter++;
        const guid = generateDeterministicGuid(`cloze-${deckName}-${idx}-${row.col0}`);
        const tags = row.col2 ? ` ${row.col2.trim().split(/\s+/).join(' ')} ` : ` ${deckName.replace(/::/g, '_')} `;
        const flds = `${row.col0}\u001f${row.col1}`;
        const sfld = row.col0;
        const csum = calculateFieldChecksum(sfld);

        insertNoteStmt.run([nid, guid, 1600000002, nowSecs, tags, flds, sfld, csum]);
        totalNotesCreated++;

        const ordinals = extractClozeOrdinals(row.col0);
        ordinals.forEach(ord => {
            const cid = cardIdCounter++;
            insertCardStmt.run([cid, nid, deckId, ord, nowSecs, totalCardsCreated + 1]);
            totalCardsCreated++;
        });
    });

    // 9. Insert Native Image Occlusion Notes & Cards (if present)
    if (ioManifest && Array.isArray(ioManifest.cards)) {
        ioManifest.cards.forEach((card, idx) => {
            const nid = noteIdCounter++;
            const guid = generateDeterministicGuid(`io-${deckName}-${card.id || idx}`);
            const cardTags = Array.isArray(card.tags) && card.tags.length > 0
                ? ` ${card.tags.join(' ')} `
                : ` ${deckName.replace(/::/g, '_')} `;

            const imageName = card.asset && card.asset.path ? path.basename(card.asset.path) : 'image.png';
            const occlusionsStr = serializeOcclusions(card.regions || []);
            const imageField = `<img src="${imageName}">`;
            const headerField = card.header || ioManifest.title || '';
            const backExtraField = card.extra
                ? `${card.regions.map(r => `<b>${r.answer}</b>: ${r.label || ''}`).join('<br>')}<br><br>${card.extra}`
                : card.regions.map(r => `<b>${r.answer}</b>: ${r.label || ''}`).join('<br>');
            const commentsField = card.source && card.source.evidence_ids ? `Evidence: ${card.source.evidence_ids.join(', ')}` : '';

            const flds = `${occlusionsStr}\u001f${imageField}\u001f${headerField}\u001f${backExtraField}\u001f${commentsField}`;
            const sfld = headerField || occlusionsStr;
            const csum = calculateFieldChecksum(sfld);

            insertNoteStmt.run([nid, guid, 1600000003, nowSecs, cardTags, flds, sfld, csum]);
            totalNotesCreated++;

            (card.regions || []).forEach((region, rIdx) => {
                const cid = cardIdCounter++;
                insertCardStmt.run([cid, nid, deckId, rIdx, nowSecs, totalCardsCreated + 1]);
                totalCardsCreated++;
            });
        });
    }

    insertNoteStmt.free();
    insertCardStmt.free();

    // 10. Export SQLite binary buffer
    const dbBinaryData = db.export();
    const dbBuffer = Buffer.from(dbBinaryData);
    db.close();

    // 11. Assemble Zip Package (.apkg) via shared utility
    const apkgBuffer = await assembleApkgZip(dbBuffer, mediaFilesMap);

    // 12. Write .apkg file
    const outputFilename = options.outputFilename || `${chapterName}_Anki.apkg`;
    let outputPath = options.outputPath;
    if (!outputPath) {
        const targetDir = options.outputDir ? path.resolve(options.outputDir) : resolvedChapterDir;
        outputPath = path.join(targetDir, outputFilename);
    }

    const outputDirname = path.dirname(outputPath);
    if (!fs.existsSync(outputDirname)) {
        fs.mkdirSync(outputDirname, { recursive: true });
    }

    fs.writeFileSync(outputPath, apkgBuffer);

    // 13. Validate APKG immediately upon assembly before touching any source inputs
    const expectedCounts = {
        basic: basicRows.length,
        cloze: clozeRows.length,
        io: ioManifest && Array.isArray(ioManifest.cards) ? ioManifest.cards.length : 0
    };
    const valResult = await validateApkgContent(apkgBuffer, outputPath, {
        expectedCounts,
        disallowEmptyDeck: true
    });
    if (!valResult.isValid) {
        throw new Error(`EXPORT FAIL: Assembled .apkg failed post-build validation: ${valResult.errors.join('; ')}`);
    }

    // 14. Record APKG in provenance manifest if available
    if (manifest) {
        recordArtifact(resolvedChapterDir, {
            artifactType: 'apkg',
            filePath: outputPath,
            evidenceHash: manifest.evidenceHash,
            status: 'VALIDATED',
            lastValidationResult: 'PASS'
        });
    }

    // 15. Intermediate packaging cleanup (only after successful validation, defaults to true)
    let cleanupResult = null;
    const shouldClean = options.cleanIntermediates !== undefined ? options.cleanIntermediates : true;
    if (shouldClean) {
        cleanupResult = cleanPackagingIntermediates(resolvedChapterDir, {
            chapter: chapterName,
            apkgPath: outputPath,
            archive: options.archiveIntermediates !== false
        });
    }

    console.log(`\n====================================================`);
    console.log(`✅ Unified Anki Package Created Successfully!`);
    console.log(`   Output File: ${outputPath}`);
    console.log(`   Total Notes: ${totalNotesCreated} (Basic: ${basicRows.length}, Cloze: ${clozeRows.length}, IO: ${ioManifest ? ioManifest.cards.length : 0})`);
    console.log(`   Total Cards: ${totalCardsCreated}`);
    console.log(`   Bundled Media: ${mediaFilesMap.size}`);
    console.log(`   Package Size: ${(apkgBuffer.length / 1024).toFixed(1)} KB`);
    if (cleanupResult && cleanupResult.cleaned) {
        console.log(`   🧹 Packaging Intermediates Cleaned: ${cleanupResult.removed.length} dirs removed, ${cleanupResult.archived.length} files archived to .build/`);
    }
    console.log(`====================================================\n`);

    return {
        success: true,
        outputPath,
        deckName,
        deckId,
        cleanupResult,
        counts: {
            basicNotes: basicRows.length,
            clozeNotes: clozeRows.length,
            ioNotes: ioManifest ? ioManifest.cards.length : 0,
            totalNotes: totalNotesCreated,
            totalCards: totalCardsCreated,
            mediaFiles: mediaFilesMap.size
        }
    };
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const targetDir = args.find(a => !a.startsWith('--'));
    if (!targetDir) {
        console.error("Usage: node export_anki.js <path_to_chapter_dir> [--no-clean]");
        process.exit(1);
    }
    const cleanIntermediates = !args.includes('--no-clean');
    exportChapterToAnki(targetDir, { cleanIntermediates }).catch(err => {
        console.error("Export Error:", err.message);
        process.exit(1);
    });
}

module.exports = {
    exportChapterToAnki,
    serializeOcclusions,
    buildModelDefinitions,
    extractClozeOrdinals,
    generateDeterministicGuid,
    calculateFieldChecksum,
    parseTsvFile
};
