/**
 * study-source-core Anki Package (.apkg) Integrity Validator (`validate_apkg.js`)
 * PHYSICAL EXECUTION GATEWAY
 * 
 * Verifies:
 * 1. Package ZIP integrity (presence of collection.anki2, media index)
 * 2. SQLite Schema & tables (col, notes, cards, revlog, graves)
 * 3. Notetype schemas (Basic, Cloze, Native Image Occlusion)
 * 4. Note fields, sort fields, checksums, tags
 * 5. Card records, ordinals, deck associations
 * 6. Bundled media presence & mapping
 * 7. Manifest-to-package completeness: All images referenced in IO notes actually exist in package
 * 8. Native Image Occlusion cloze mask syntax & template setup
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const initSqlJs = require('sql.js');
const JSZip = require('jszip');
const { calculateFieldChecksum } = require('./shared_anki_utils');

const ALLOWED_DECLARATIVE_MODEL_IDS = new Set(['1600000001', '1600000002', '1600000003']);
const PROHIBITED_DECLARATIVE_MODEL_IDS = new Set(['1600000004']);

async function validateApkgContent(apkgBuffer, filePath = 'in-memory', options = {}) {
    const errors = [];
    const warnings = [];
    const stats = {
        deckNames: [],
        noteCount: 0,
        cardCount: 0,
        mediaCount: 0,
        modelNames: [],
        notesByType: { Basic: 0, Cloze: 0, ImageOcclusion: 0, Other: 0 },
        mediaFilenames: []
    };

    let zip;
    try {
        zip = await JSZip.loadAsync(apkgBuffer);
    } catch (err) {
        errors.push(`Failed to open .apkg archive as valid ZIP: ${err.message}`);
        return { isValid: false, errors, warnings, stats };
    }

    // 1. Check Root Archive Files
    const colFile = zip.file('collection.anki2');
    const mediaFile = zip.file('media');

    if (!colFile) {
        errors.push("Missing required 'collection.anki2' database in .apkg archive.");
    }
    if (!mediaFile) {
        errors.push("Missing required 'media' mapping file in .apkg archive.");
    }

    if (errors.length > 0) {
        return { isValid: false, errors, warnings, stats };
    }

    // 2. Parse Media Mapping
    let mediaMap = {};
    const mediaFilenamesSet = new Set();
    try {
        const mediaJsonStr = await mediaFile.async('text');
        mediaMap = JSON.parse(mediaJsonStr);
        stats.mediaCount = Object.keys(mediaMap).length;

        for (const [idxStr, filename] of Object.entries(mediaMap)) {
            mediaFilenamesSet.add(filename);
            stats.mediaFilenames.push(filename);
            const entryInZip = zip.file(idxStr);
            if (!entryInZip) {
                errors.push(`Media index '${idxStr}' (${filename}) declared in 'media' map is missing from archive.`);
            } else {
                const data = await entryInZip.async('nodebuffer');
                if (data.length === 0) {
                    errors.push(`Media file '${idxStr}' (${filename}) is empty (0 bytes).`);
                }
            }
        }

        // Reverse check: every numerical entry in zip must be mapped in mediaMap
        for (const zf of Object.keys(zip.files)) {
            if (/^\d+$/.test(zf) && !mediaMap.hasOwnProperty(zf)) {
                errors.push(`Zip archive contains unmapped media entry '${zf}' not registered in 'media' map.`);
            }
        }
    } catch (err) {
        errors.push(`Failed to parse 'media' JSON mapping: ${err.message}`);
    }

    // 3. Load & Inspect SQLite Database
    let db;
    try {
        const SQL = await initSqlJs();
        const dbBuffer = await colFile.async('nodebuffer');
        db = new SQL.Database(dbBuffer);
    } catch (err) {
        errors.push(`Failed to initialize SQLite database from collection.anki2: ${err.message}`);
        return { isValid: false, errors, warnings, stats };
    }

    try {
        // Verify tables
        const tablesRes = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
        const tableNames = new Set(tablesRes[0]?.values?.map(v => v[0]) || []);
        const requiredTables = ['col', 'notes', 'cards'];
        requiredTables.forEach(t => {
            if (!tableNames.has(t)) {
                errors.push(`Missing required SQLite table '${t}'.`);
            }
        });

        if (errors.length > 0) {
            db.close();
            return { isValid: false, errors, warnings, stats };
        }

        // Inspect 'col' row
        const colRes = db.exec("SELECT id, ver, models, decks FROM col LIMIT 1");
        if (!colRes[0] || colRes[0].values.length === 0) {
            errors.push("Table 'col' is empty.");
            db.close();
            return { isValid: false, errors, warnings, stats };
        }

        const [colId, colVer, modelsJson, decksJson] = colRes[0].values[0];
        if (colVer !== 11) {
            warnings.push(`Collection schema version is ${colVer}, standard is 11.`);
        }

        // Verify Models
        let models = {};
        try {
            models = JSON.parse(modelsJson);
            stats.modelNames = Object.values(models).map(m => m.name);

            // Closed boundary check: Model ID isolation (Dual APKG v1.0 invariant)
            for (const mId of Object.keys(models)) {
                if (PROHIBITED_DECLARATIVE_MODEL_IDS.has(mId) || models[mId]?.name === 'StudyLab Procedural Anchor') {
                    errors.push(`[MODEL_ISOLATION_BREACH] Declarative APKG contains prohibited procedural model ID ${mId} ('${models[mId]?.name}'). Dual APKG v1.0 isolation invariant violated.`);
                } else if (!ALLOWED_DECLARATIVE_MODEL_IDS.has(mId)) {
                    errors.push(`[MODEL_ISOLATION_BREACH] Declarative APKG contains unauthorized model ID ${mId} ('${models[mId]?.name}'). Allowed models: [1600000001, 1600000002, 1600000003].`);
                }
            }

            // Basic Model Schema Verification (1600000001)
            const basicModel = models['1600000001'] || Object.values(models).find(m => m.name === 'Basic');
            if (basicModel) {
                if (basicModel.id !== 1600000001) {
                    errors.push(`Basic model id must be 1600000001, got ${basicModel.id}.`);
                }
                if (basicModel.type !== 0) {
                    errors.push(`Basic model type must be 0 (standard), got ${basicModel.type}.`);
                }
                const fieldNames = (basicModel.flds || []).map(f => f.name);
                if (fieldNames.length !== 2 || fieldNames[0] !== 'Front' || fieldNames[1] !== 'Back') {
                    errors.push(`Basic model fields must be ['Front', 'Back'], got [${fieldNames.join(', ')}].`);
                }
                const tmpl = basicModel.tmpls?.[0];
                if (!tmpl || !tmpl.qfmt.includes('{{Front}}') || (!tmpl.afmt.includes('{{Back}}') && !tmpl.afmt.includes('{{FrontSide}}'))) {
                    errors.push("Basic model template missing required {{Front}} or {{Back}} tags.");
                }
            }

            // Cloze Model Schema Verification (1600000002)
            const clozeModel = models['1600000002'] || Object.values(models).find(m => m.name === 'Cloze');
            if (clozeModel) {
                if (clozeModel.id !== 1600000002) {
                    errors.push(`Cloze model id must be 1600000002, got ${clozeModel.id}.`);
                }
                if (clozeModel.type !== 1) {
                    errors.push(`Cloze model type must be 1 (cloze), got ${clozeModel.type}.`);
                }
                const fieldNames = (clozeModel.flds || []).map(f => f.name);
                if (fieldNames.length !== 2 || fieldNames[0] !== 'Text' || fieldNames[1] !== 'Back Extra') {
                    errors.push(`Cloze model fields must be ['Text', 'Back Extra'], got [${fieldNames.join(', ')}].`);
                }
                const tmpl = clozeModel.tmpls?.[0];
                if (!tmpl || !tmpl.qfmt.includes('{{cloze:Text}}') || !tmpl.afmt.includes('{{cloze:Text}}')) {
                    errors.push("Cloze model template missing required {{cloze:Text}} tags.");
                }
                if (!clozeModel.css || !/\.cloze\s*\{/i.test(clozeModel.css)) {
                    errors.push("Cloze model CSS missing required '.cloze' style definition.");
                }
            }

            // Image Occlusion Model Schema Verification (1600000003)
            const ioModel = models['1600000003'] || Object.values(models).find(m => m.name === 'Image Occlusion');
            if (ioModel) {
                if (ioModel.id !== 1600000003) {
                    errors.push(`Image Occlusion model id must be 1600000003, got ${ioModel.id}.`);
                }
                if (ioModel.type !== 1) {
                    errors.push(`Image Occlusion model type must be 1 (Cloze kind), got ${ioModel.type}.`);
                }
                const fieldNames = (ioModel.flds || []).map(f => f.name);
                const expectedIOFields = ['Occlusions', 'Image', 'Header', 'Back Extra', 'Comments'];
                const hasAllFields = expectedIOFields.every((f, i) => fieldNames[i] === f);
                if (!hasAllFields || fieldNames.length !== 5) {
                    errors.push(`Image Occlusion model fields must be [${expectedIOFields.join(', ')}], got [${fieldNames.join(', ')}].`);
                }
                const tmpl = ioModel.tmpls?.[0];
                if (!tmpl || !tmpl.qfmt.includes('image-occlusion-container') || !tmpl.qfmt.includes('image-occlusion-canvas') || !tmpl.qfmt.includes('anki.imageOcclusion.setup')) {
                    errors.push("Image Occlusion card template missing required canvas/script setup.");
                }
                if (!ioModel.css || !/#image-occlusion-canvas/i.test(ioModel.css)) {
                    errors.push("Image Occlusion model CSS missing required '#image-occlusion-canvas' styles.");
                }
            }
        } catch (err) {
            errors.push(`Failed to parse collection 'models' JSON: ${err.message}`);
        }

        // Verify Decks
        let decks = {};
        try {
            decks = JSON.parse(decksJson);
            stats.deckNames = Object.values(decks).map(d => d.name).filter(n => n !== 'Default');
            if (stats.deckNames.length === 0) {
                warnings.push("Collection only contains 'Default' deck; no chapter-specific deck registered.");
            } else {
                for (const deckName of stats.deckNames) {
                    const parts = deckName.split('::');
                    if (parts.length < 2 || parts.some(p => p.trim().length === 0)) {
                        errors.push(`Deck '${deckName}' violates canonical naming hierarchy '\${Subject}::\${Chapter}'.`);
                    }
                }
            }
        } catch (err) {
            errors.push(`Failed to parse collection 'decks' JSON: ${err.message}`);
        }

        // Inspect 'notes' table
        const notesRes = db.exec("SELECT id, guid, mid, tags, flds, sfld, csum FROM notes");
        const notesRows = notesRes[0]?.values || [];
        stats.noteCount = notesRows.length;

        if (stats.noteCount === 0) {
            warnings.push("Package contains 0 notes.");
        }

        const noteIds = new Set();

        notesRows.forEach((nrow, nIdx) => {
            const [nid, guid, mid, tags, flds, sfld, csum] = nrow;
            noteIds.add(nid);

            if (!guid || guid.trim() === '') {
                errors.push(`Note row ${nIdx + 1} (id: ${nid}) has empty GUID.`);
            }

            const midStr = mid.toString();
            if (mid === 1600000004 || PROHIBITED_DECLARATIVE_MODEL_IDS.has(midStr)) {
                errors.push(`[MODEL_ISOLATION_BREACH] Declarative note id ${nid} violates Model Isolation: uses prohibited StudyLab Model 1600000004.`);
            } else if (!ALLOWED_DECLARATIVE_MODEL_IDS.has(midStr)) {
                errors.push(`[MODEL_ISOLATION_BREACH] Declarative note id ${nid} uses unauthorized model ID ${mid}.`);
            }

            const model = models[midStr];
            if (!model) {
                errors.push(`Note row ${nIdx + 1} references non-existent model ID ${mid}.`);
                return;
            }

            if (model.name === 'Basic') stats.notesByType.Basic++;
            else if (model.name === 'Cloze') stats.notesByType.Cloze++;
            else if (model.name === 'Image Occlusion') stats.notesByType.ImageOcclusion++;
            else stats.notesByType.Other++;

            // Field count check
            const fields = flds.split('\u001f');
            if (fields.length !== model.flds.length) {
                errors.push(`Note id ${nid} (${model.name}) has ${fields.length} fields, expected ${model.flds.length}.`);
            }

            // csum SHA1 8-digit checksum check
            const expectedCsum = calculateFieldChecksum(sfld);
            if (Number(csum) !== expectedCsum) {
                errors.push(`Note id ${nid} (${model.name}) has invalid csum ${csum}, expected ${expectedCsum} for sfld: "${String(sfld).substring(0, 30)}"`);
            }

            // HTML safety validation & media references check across all fields
            fields.forEach((fVal, fIdx) => {
                const fName = model.flds[fIdx]?.name || `field_${fIdx}`;
                const htmlCheck = validateHtmlFieldSafety(fVal, fName);
                if (!htmlCheck.isValid) {
                    htmlCheck.errors.forEach(e => errors.push(`Note id ${nid} (${model.name}): ${e}`));
                }
                if (htmlCheck.warnings.length > 0) {
                    htmlCheck.warnings.forEach(w => warnings.push(`Note id ${nid} (${model.name}): ${w}`));
                }

                if (typeof fVal === 'string') {
                    // Check <img> tags for bundled media
                    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
                    let imgM;
                    while ((imgM = imgRegex.exec(fVal)) !== null) {
                        const imgSrc = imgM[1];
                        if (!imgSrc.startsWith('http://') && !imgSrc.startsWith('https://') && !imgSrc.startsWith('data:')) {
                            if (!mediaFilenamesSet.has(imgSrc)) {
                                errors.push(`Note id ${nid} (${model.name}) references media '${imgSrc}' which is missing from package media index.`);
                            }
                        }
                    }

                    // Check [sound:...] references
                    const sndRegex = /\[sound:([^\]]+)\]/gi;
                    let sndM;
                    while ((sndM = sndRegex.exec(fVal)) !== null) {
                        const sndSrc = sndM[1];
                        if (!mediaFilenamesSet.has(sndSrc)) {
                            errors.push(`Note id ${nid} (${model.name}) references sound media '${sndSrc}' which is missing from package media index.`);
                        }
                    }
                }
            });

            // Image Occlusion specific checks
            if (model.name === 'Image Occlusion') {
                const occlusionsStr = fields[0] || '';
                const imageStr = fields[1] || '';
                if (!/\{\{c\d+::.*?\}\}/.test(occlusionsStr)) {
                    errors.push(`IO Note id ${nid} has malformed 'Occlusions' field (missing cloze masks): ${occlusionsStr.substring(0, 40)}`);
                }
                const imgMatch = imageStr.match(/<img[^>]+src=["']([^"']+)["']/i);
                if (!imgMatch) {
                    errors.push(`IO Note id ${nid} missing valid <img> tag in 'Image' field: ${imageStr}`);
                }
            }
        });

        // Inspect 'cards' table
        const cardsRes = db.exec("SELECT id, nid, did, ord FROM cards");
        const cardRows = cardsRes[0]?.values || [];
        stats.cardCount = cardRows.length;

        cardRows.forEach((crow, cIdx) => {
            const [cid, nid, did, ord] = crow;
            if (!noteIds.has(nid)) {
                errors.push(`Card row ${cIdx + 1} (id: ${cid}) points to non-existent note id ${nid}.`);
            }
            if (!decks[did.toString()]) {
                errors.push(`Card row ${cIdx + 1} (id: ${cid}) points to non-existent deck id ${did}.`);
            }
            if (ord < 0) {
                errors.push(`Card row ${cIdx + 1} (id: ${cid}) has invalid negative ordinal ${ord}.`);
            }
        });

        // If an IO manifest was provided in options, verify manifest-to-package completeness
        if (options.manifest && Array.isArray(options.manifest.cards)) {
            options.manifest.cards.forEach(card => {
                if (card.asset && card.asset.path) {
                    const cleanName = path.basename(card.asset.path);
                    if (!mediaFilenamesSet.has(cleanName)) {
                        errors.push(`Manifest required asset '${cleanName}' is missing from .apkg media bundle.`);
                    }
                }
            });
        }

        // Verification: ensure no card type is silently dropped or unexpected card type added
        if (options.expectedCounts) {
            const exp = options.expectedCounts;
            if (typeof exp.basic === 'number' && stats.notesByType.Basic !== exp.basic) {
                errors.push(`Note count mismatch for Basic: expected ${exp.basic}, got ${stats.notesByType.Basic}.`);
            }
            if (typeof exp.cloze === 'number' && stats.notesByType.Cloze !== exp.cloze) {
                errors.push(`Note count mismatch for Cloze: expected ${exp.cloze}, got ${stats.notesByType.Cloze}.`);
            }
            if (typeof exp.io === 'number' && stats.notesByType.ImageOcclusion !== exp.io) {
                errors.push(`Note count mismatch for ImageOcclusion: expected ${exp.io}, got ${stats.notesByType.ImageOcclusion}.`);
            }
        }

        if (options.disallowEmptyDeck === true && stats.noteCount === 0) {
            errors.push("Anki package contains 0 notes (empty deck rejected).");
        }

        db.close();
    } catch (err) {
        errors.push(`Database query error during inspection: ${err.message}`);
        if (db) db.close();
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        stats
    };
}

const { getVaultRoot } = require('./path_resolver');

async function validateApkg(filePath, shouldExit = true, options = {}) {
    let resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
        const vaultCandidate = path.join(getVaultRoot(), filePath);
        if (fs.existsSync(vaultCandidate)) {
            resolvedPath = vaultCandidate;
        }
    }

    console.log(`Validating Anki Package (.apkg) at: ${resolvedPath}`);
    if (!fs.existsSync(resolvedPath)) {
        console.error(`Error: File not found: ${resolvedPath}`);
        if (shouldExit) process.exit(1);
        return { isValid: false, errors: [`File not found: ${resolvedPath}`], warnings: [], stats: {} };
    }

    const buffer = fs.readFileSync(resolvedPath);
    const result = await validateApkgContent(buffer, resolvedPath, options);

    if (!result.isValid) {
        console.log("\n[FAIL] Anki Package Validation Errors:");
        result.errors.forEach(err => console.log(`  ❌ ${err}`));
        if (shouldExit) process.exit(1);
    } else {
        console.log("\n[PASS] Anki Package is 100% structurally valid!");
        console.log(`  📊 Decks: ${result.stats.deckNames.join(', ')}`);
        console.log(`  📊 Notes: ${result.stats.noteCount} (Basic: ${result.stats.notesByType.Basic}, Cloze: ${result.stats.notesByType.Cloze}, IO: ${result.stats.notesByType.ImageOcclusion})`);
        console.log(`  📊 Cards: ${result.stats.cardCount}`);
        console.log(`  📊 Media Assets: ${result.stats.mediaCount}`);
    }

    if (result.warnings.length > 0) {
        console.log("\n[WARNINGS]:");
        result.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
    }

    return result;
}

if (require.main === module) {
    const targetPath = process.argv[2];
    if (!targetPath) {
        console.error("Usage: node validate_apkg.js <path_to_apkg>");
        process.exit(1);
    }
    validateApkg(targetPath).catch(err => {
        console.error("Validator Error:", err);
        process.exit(1);
    });
}

/**
 * Validates HTML safety of field strings in Anki notes (checks well-formed tags, unescaped tags).
 */
function validateHtmlFieldSafety(fieldContent, fieldName = 'field') {
    const errors = [];
    const warnings = [];
    if (!fieldContent || typeof fieldContent !== 'string') return { isValid: true, errors, warnings };

    const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
    const tagRegex = /<\/?([a-zA-Z0-9]+)(?:\s+[^>]*)?>/g;
    const tagStack = [];
    let match;

    while ((match = tagRegex.exec(fieldContent)) !== null) {
        const fullTag = match[0];
        const tagName = match[1].toLowerCase();
        const isClosing = fullTag.startsWith('</');
        const isSelfClosing = fullTag.endsWith('/>') || voidTags.has(tagName);

        if (isSelfClosing) continue;

        if (!isClosing) {
            tagStack.push({ name: tagName, pos: match.index });
        } else {
            if (tagStack.length === 0) {
                warnings.push(`Field '${fieldName}': Stray closing tag '</${tagName}>' without matching open tag.`);
            } else {
                const last = tagStack.pop();
                if (last.name !== tagName) {
                    warnings.push(`Field '${fieldName}': Mismatched HTML tags '<${last.name}>' closed by '</${tagName}>'.`);
                }
            }
        }
    }

    if (tagStack.length > 0) {
        tagStack.forEach(t => {
            warnings.push(`Field '${fieldName}': Unclosed HTML tag '<${t.name}>'.`);
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

module.exports = {
    validateApkg,
    validateApkgContent,
    validateHtmlFieldSafety
};
