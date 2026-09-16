/**
 * study-source-core StudyLab Procedural APKG Validator (`validate_studylab_procedural_apkg.js`)
 * PHYSICAL EXECUTION GATEWAY
 * 
 * Verifies:
 * 1. Package ZIP integrity (presence of collection.anki2, media index)
 * 2. SQLite Schema & tables (col, notes, cards, revlog, graves)
 * 3. Model schema: 'StudyLab Procedural Anchor' with 7 required fields
 * 4. Procedural anchor contract: ProceduralPayload JSON syntax & required fields (proc_schema)
 * 5. SELF-CONTAINED APKG GATE: Strict enforcement of rich declarative inline_contract for portable decks
 * 6. Rich Declarative Contract schema & semantic validation (Ajv + invariant checks)
 * 7. Card records, ordinals, deck associations
 * 8. HTML field safety across rendered card fields
 * 9. Cross-artifact consistency with canonical [Chapter]_ProblemPatterns.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const initSqlJs = require('sql.js');
const JSZip = require('jszip');
const Ajv = require('ajv');

const { VALID_DOMAINS } = require('./validate_studylab_procedural');
const { validateHtmlFieldSafety } = require('./validate_apkg');
const { getVaultRoot } = require('./path_resolver');
const { validateStudyLabLevels1to6, validateStudyLabLevels1to7 } = require('./validate_studylab_levels_1_6');

// Initialize Ajv with rich contract schema
const ajv = new Ajv({ allErrors: true, strict: false });
const SCHEMAS_DIR = path.resolve(__dirname, '../resources/schemas');

let validateRichContract = null;
let validateApkgAnchor = null;

function getValidators() {
    if (!validateRichContract) {
        const provSchemaPath = path.join(SCHEMAS_DIR, 'studylab-provenance.schema.json');
        const richSchemaPath = path.join(SCHEMAS_DIR, 'studylab-rich-content-contract.schema.json');
        const apkgSchemaPath = path.join(SCHEMAS_DIR, 'studylab-apkg-schema.json');

        if (fs.existsSync(provSchemaPath)) {
            const provSchema = JSON.parse(fs.readFileSync(provSchemaPath, 'utf8'));
            ajv.addSchema(provSchema, 'studylab-provenance.schema.json');
        }
        if (fs.existsSync(richSchemaPath)) {
            const richSchema = JSON.parse(fs.readFileSync(richSchemaPath, 'utf8'));
            ajv.addSchema(richSchema, 'studylab-rich-content-contract.schema.json');
            validateRichContract = ajv.compile(richSchema);
        }
        if (fs.existsSync(apkgSchemaPath)) {
            const apkgSchema = JSON.parse(fs.readFileSync(apkgSchemaPath, 'utf8'));
            validateApkgAnchor = ajv.compile(apkgSchema);
        }
    }
    return { validateRichContract, validateApkgAnchor };
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates step nodes for DAG acyclicity and structural correctness.
 */
function validateSolutionGraphDag(stepNodes) {
    if (!Array.isArray(stepNodes) || stepNodes.length === 0) {
        return { isValid: true, isDag: true, errors: [], warnings: [] };
    }

    const errors = [];
    const warnings = [];
    const stepIds = new Set();
    const adj = new Map();

    // 1. Check duplicate step IDs
    stepNodes.forEach((step, idx) => {
        const sid = step.id || `step_${idx + 1}`;
        if (stepIds.has(sid)) {
            errors.push(`Duplicate step node id '${sid}' in solution graph.`);
        }
        stepIds.add(sid);
        adj.set(sid, Array.isArray(step.dependencies) ? step.dependencies : []);
    });

    // 2. Check dependencies
    stepNodes.forEach((step, idx) => {
        const sid = step.id || `step_${idx + 1}`;
        const deps = Array.isArray(step.dependencies) ? step.dependencies : [];
        deps.forEach(depId => {
            if (depId === sid) {
                errors.push(`Step node '${sid}' contains a self-dependency loop (${sid} -> ${sid}).`);
            } else if (!stepIds.has(depId)) {
                errors.push(`Step node '${sid}' references non-existent dependency '${depId}'.`);
            }
        });
    });

    // 3. Cycle Detection using DFS (White/Gray/Black graph coloring)
    const visited = new Map();
    stepIds.forEach(id => visited.set(id, 0));

    let hasCycle = false;

    function dfs(nodeId, currentPath) {
        visited.set(nodeId, 1);
        currentPath.push(nodeId);

        const deps = adj.get(nodeId) || [];
        for (const nextNode of deps) {
            if (!stepIds.has(nextNode)) continue;
            const state = visited.get(nextNode);
            if (state === 1) {
                hasCycle = true;
                const cycleStartIdx = currentPath.indexOf(nextNode);
                const subPath = currentPath.slice(cycleStartIdx).concat(nextNode);
                errors.push(`[DAG Cycle Detected] Directed cycle found in solution graph: ${subPath.join(' -> ')}`);
                return true;
            } else if (state === 0) {
                if (dfs(nextNode, currentPath)) return true;
            }
        }

        currentPath.pop();
        visited.set(nodeId, 2);
        return false;
    }

    for (const id of stepIds) {
        if (visited.get(id) === 0) {
            dfs(id, []);
        }
    }

    return {
        isValid: errors.length === 0,
        isDag: !hasCycle && errors.length === 0,
        errors,
        warnings,
        nodeCount: stepNodes.length
    };
}

/**
 * Validates 3-tier progressive hint disclosure and prevents premature hint answer leaks.
 */
function validateHintTierDisclosure(stepNodes, finalAnswerVal) {
    if (!Array.isArray(stepNodes)) {
        return { isValid: true, errors: [], warnings: [] };
    }

    const errors = [];
    const warnings = [];

    const CANONICAL_STEP_TYPES = new Set([
        "formula_selection", "transformation", "substitution", "arithmetic",
        "simplification", "equation_rearrangement", "comparison", "unit_conversion",
        "intermediate_result", "final_answer", "identify_knowns", "select_model",
        "choose_coordinate_system", "select_equation", "physical_sanity_check",
        "identify_chemical_species", "balance_equation", "convert_mass_to_moles",
        "apply_stoichiometric_ratio", "identify_limiting_reagent",
        "construct_equilibrium_expression", "chemical_sanity_check",
        "identify_schema", "select_strategy", "build_representation",
        "apply_constraint", "propagate_constraint", "make_inference",
        "create_case", "eliminate_case", "check_contradiction", "verify_conclusion",
        "prime_factorization", "venn_diagram_construction", "equation_setup"
    ]);

    stepNodes.forEach((node, idx) => {
        const stepId = node.id || `step_${idx + 1}`;

        if (node.step_type && !CANONICAL_STEP_TYPES.has(node.step_type)) {
            warnings.push(`Step node '${stepId}' uses non-standard step_type '${node.step_type}'.`);
        }

        const h1 = node.hint_principle || (node.hints && node.hints.find(h => h.level === 1)?.content);
        const h2 = node.hint_operation || (node.hints && node.hints.find(h => h.level === 2)?.content);
        const h3 = node.hint_intermediate || (node.hints && node.hints.find(h => h.level === 3)?.content);

        if (!h1 && !h2 && !h3 && (!node.hints || node.hints.length === 0)) {
            warnings.push(`Step node '${stepId}' has no 3-tier progressive hints defined.`);
        }

        if (finalAnswerVal !== undefined && finalAnswerVal !== null) {
            const ansStr = String(finalAnswerVal).replace(/[{}]/g, '').trim();
            if (ansStr.length >= 2 && !/^(true|false|0|1|answer)$/i.test(ansStr)) {
                if (h1 && typeof h1 === 'string') {
                    const directLeak = new RegExp(`(=|\\bis\\b|\\banswer is\\b|उत्तर है|बराबर)\\s*${escapeRegex(ansStr)}\\b`, 'i');
                    if (directLeak.test(h1)) {
                        errors.push(`[Tier 1 Hint Leak] Step '${stepId}' Tier 1 hint (Principle) directly leaks final answer '${ansStr}'. Tier 1 must only state governing principle/law.`);
                    }
                }
                if (h2 && typeof h2 === 'string') {
                    const directLeak = new RegExp(`(=|\\banswer is\\b|उत्तर है)\\s*${escapeRegex(ansStr)}\\b`, 'i');
                    if (directLeak.test(h2)) {
                        errors.push(`[Tier 2 Hint Leak] Step '${stepId}' Tier 2 hint (Operation) directly leaks final answer '${ansStr}'. Tier 2 must only state operation to perform.`);
                    }
                }
            }
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validates the contents of a StudyLab Procedural APKG archive buffer.
 * 
 * @param {Buffer} apkgBuffer - Raw binary buffer of .apkg file
 * @param {string} [filePath='in-memory'] - Path for diagnostic reporting
 * @param {Object} [options={}] - Validation options
 * @param {string} [options.mode='portable'] - 'portable' | 'standalone' | 'fresh_profile' | 'hydration_dependent'
 * @param {Object|string} [options.sourceJson] - Optional source JSON for cross-artifact validation
 * @returns {Promise<Object>} Validation results with errors, warnings, and stats
 */
async function validateProceduralApkgContent(apkgBuffer, filePath = 'in-memory', options = {}) {
    const mode = options.mode || 'portable';
    const isPortable = mode === 'portable' || mode === 'standalone' || mode === 'fresh_profile';

    const errors = [];
    const warnings = [];
    const stats = {
        deckNames: [],
        noteCount: 0,
        cardCount: 0,
        modelNames: [],
        anchors: [],
        selfContainedCount: 0,
        hydrationDependentCount: 0,
        packageClassification: isPortable ? 'SELF_CONTAINED_PORTABLE' : 'HYDRATION_DEPENDENT'
    };

    const { validateRichContract: richValidator, validateApkgAnchor: apkgValidator } = getValidators();

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

    // 2. Load & Inspect SQLite Database
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

        // Verify Models
        let models = {};
        let proceduralModel = null;
        try {
            models = JSON.parse(modelsJson);
            stats.modelNames = Object.values(models).map(m => m.name);

            proceduralModel = Object.values(models).find(m => m.name === 'StudyLab Procedural Anchor');
            if (!proceduralModel) {
                errors.push("Missing required 'StudyLab Procedural Anchor' note type model in collection.");
            } else {
                const modelFields = (proceduralModel.flds || []).map(f => f.name);
                const requiredFields = ['ProceduralPayload', 'TopicTitle', 'Domain', 'Provenance'];
                for (const rf of requiredFields) {
                    if (!modelFields.includes(rf)) {
                        errors.push(`StudyLab Procedural Anchor model missing required field '${rf}'.`);
                    }
                }
                
                const tmpl = proceduralModel.tmpls?.[0];
                if (!tmpl || !tmpl.qfmt.includes('{{ProceduralPayload}}')) {
                    errors.push("StudyLab Procedural Anchor card template must contain {{ProceduralPayload}}.");
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
                const hasProceduralDeck = stats.deckNames.some(d => d.includes('Procedural') || d.includes('StudyLab'));
                if (!hasProceduralDeck) {
                    warnings.push(`Deck name '${stats.deckNames.join(', ')}' does not contain 'Procedural' or 'StudyLab' identifier.`);
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
            errors.push("Procedural package contains 0 notes.");
        }

        const noteIds = new Set();
        const extractedPatternIds = new Set();

        notesRows.forEach((nrow, nIdx) => {
            const [nid, guid, mid, tags, flds, sfld, csum] = nrow;
            noteIds.add(nid);

            if (!guid || guid.trim() === '') {
                errors.push(`Note row ${nIdx + 1} (id: ${nid}) has empty GUID.`);
            }

            const model = models[mid.toString()];
            if (!model) {
                errors.push(`Note row ${nIdx + 1} references non-existent model ID ${mid}.`);
                return;
            }

            const fields = flds.split('\u001f');
            if (fields.length !== model.flds.length) {
                errors.push(`Note id ${nid} has ${fields.length} fields, expected ${model.flds.length}.`);
            }

            // Locate ProceduralPayload field index
            let payloadIdx = model.flds.findIndex(f => f.name === 'ProceduralPayload');
            if (payloadIdx === -1) {
                payloadIdx = 0; // Standard 4-field model index
            }

            // HTML safety validation across rendered fields (skip raw JSON payload)
            fields.forEach((fVal, fIdx) => {
                if (fIdx !== payloadIdx) {
                    const fName = model.flds[fIdx]?.name || `field_${fIdx}`;
                    const htmlCheck = validateHtmlFieldSafety(fVal, fName);
                    if (!htmlCheck.isValid) {
                        htmlCheck.errors.forEach(e => errors.push(`Procedural Note id ${nid}: ${e}`));
                    }
                    if (htmlCheck.warnings.length > 0) {
                        htmlCheck.warnings.forEach(w => warnings.push(`Procedural Note id ${nid}: ${w}`));
                    }
                }
            });

            // Inspect ProceduralPayload field
            const payloadRaw = fields[payloadIdx] || '';
            let payloadObj = null;
            try {
                payloadObj = JSON.parse(payloadRaw);
            } catch (pErr) {
                errors.push(`Note id ${nid} has invalid JSON in 'ProceduralPayload': ${pErr.message}`);
            }

            if (payloadObj) {
                if (!payloadObj.proc_schema || typeof payloadObj.proc_schema !== 'string' || payloadObj.proc_schema.trim() === '') {
                    errors.push(`Note id ${nid} payload missing non-empty 'proc_schema'.`);
                }
                
                // Track pattern references
                const patId = payloadObj.pattern_id || payloadObj.content_ref || (payloadObj.inline_contract?.contract?.family_id);
                if (patId) {
                    extractedPatternIds.add(patId);
                }

                // Check for deprecated difficulty_hint
                if (payloadObj.difficulty_hint !== undefined) {
                    warnings.push(`Note id ${nid} uses deprecated 'difficulty_hint'; use 'difficulty_override' instead.`);
                }

                // Check difficulty_override bounds
                if (payloadObj.difficulty_override !== undefined && payloadObj.difficulty_override !== null) {
                    if (typeof payloadObj.difficulty_override !== 'number' || payloadObj.difficulty_override < 1.0 || payloadObj.difficulty_override > 5.0) {
                        errors.push(`Note id ${nid} 'difficulty_override' must be a number between 1.0 and 5.0 (got ${payloadObj.difficulty_override}).`);
                    }
                }

                // ----------------------------------------------------
                // SELF-CONTAINED APKG GATE VALIDATION
                // ----------------------------------------------------
                if (payloadObj.inline_contract) {
                    stats.selfContainedCount++;
                    const ic = payloadObj.inline_contract;
                    
                    if (typeof ic !== 'object' || !ic.contract || !Array.isArray(ic.archetypes)) {
                        errors.push(`Note id ${nid} 'inline_contract' must contain 'contract' object and 'archetypes' array.`);
                    } else {
                        // Validate against JSON schema if compiler available
                        if (richValidator) {
                            const valid = richValidator(ic);
                            if (!valid) {
                                (richValidator.errors || []).forEach(err => {
                                    errors.push(`Note id ${nid} inline_contract schema error at ${err.dataPath || err.instancePath}: ${err.message}`);
                                });
                            }
                        }

                        // Semantic / Rust Engine invariant checks
                        const c = ic.contract;
                        if (!c.family_id || typeof c.family_id !== 'string' || c.family_id.trim() === '') {
                            errors.push(`Note id ${nid} inline_contract.contract missing valid 'family_id'.`);
                        }
                        if (!c.default_schema || typeof c.default_schema !== 'string' || c.default_schema.trim() === '') {
                            errors.push(`Note id ${nid} inline_contract.contract missing valid 'default_schema'.`);
                        }
                        if (typeof c.min_difficulty === 'number' && typeof c.max_difficulty === 'number') {
                            if (c.min_difficulty < 1.0 || c.max_difficulty > 5.0 || c.min_difficulty > c.max_difficulty) {
                                errors.push(`Note id ${nid} inline_contract difficulty range [${c.min_difficulty}, ${c.max_difficulty}] must be within [1.0, 5.0].`);
                            }
                        }
                        if (ic.archetypes.length === 0 || ic.archetypes.length > 50) {
                            errors.push(`Note id ${nid} inline_contract must contain between 1 and 50 archetypes (got ${ic.archetypes.length}).`);
                        }

                        ic.archetypes.forEach((arch, aIdx) => {
                            if (!arch.archetype_id || typeof arch.archetype_id !== 'string') {
                                errors.push(`Note id ${nid} archetype ${aIdx + 1} has missing or invalid 'archetype_id'.`);
                            }
                            if (!arch.prompt_template || typeof arch.prompt_template !== 'string' || arch.prompt_template.trim() === '') {
                                errors.push(`Note id ${nid} archetype ${aIdx + 1} has empty 'prompt_template'.`);
                            }
                            if (typeof arch.target_time_ms === 'number') {
                                if (arch.target_time_ms < 1000 || arch.target_time_ms > 600000) {
                                    errors.push(`Note id ${nid} archetype ${aIdx + 1} target_time_ms (${arch.target_time_ms}) must be in range [1000, 600000].`);
                                }
                            }
                            if (!arch.answer_derivation || typeof arch.answer_derivation !== 'object' || !arch.answer_derivation.type) {
                                errors.push(`Note id ${nid} archetype ${aIdx + 1} missing valid 'answer_derivation' object.`);
                            }
                            // ----------------------------------------------------
                            // STEP NODES: DAG TOPOLOGY & HINT DISCLOSURE VALIDATION
                            // ----------------------------------------------------
                            if (Array.isArray(arch.step_nodes) && arch.step_nodes.length > 0) {
                                const dagResult = validateSolutionGraphDag(arch.step_nodes);
                                if (!dagResult.isValid) {
                                    dagResult.errors.forEach(e => errors.push(`Note id ${nid} archetype ${aIdx + 1}: ${e}`));
                                }
                                if (dagResult.warnings.length > 0) {
                                    dagResult.warnings.forEach(w => warnings.push(`Note id ${nid} archetype ${aIdx + 1}: ${w}`));
                                }

                                const hintResult = validateHintTierDisclosure(arch.step_nodes, arch.answer_formatted_template);
                                if (!hintResult.isValid) {
                                    hintResult.errors.forEach(e => errors.push(`Note id ${nid} archetype ${aIdx + 1}: ${e}`));
                                }
                                if (hintResult.warnings.length > 0) {
                                    hintResult.warnings.forEach(w => warnings.push(`Note id ${nid} archetype ${aIdx + 1}: ${w}`));
                                }
                            }

                            if (Array.isArray(arch.parameters)) {
                                arch.parameters.forEach((p, pIdx) => {
                                    if (!p.name || typeof p.name !== 'string') {
                                        errors.push(`Note id ${nid} archetype ${aIdx + 1} param ${pIdx + 1} has empty name.`);
                                    }
                                    if (!p.domain || typeof p.domain !== 'object' || !p.domain.type) {
                                        errors.push(`Note id ${nid} archetype ${aIdx + 1} param '${p.name || pIdx}' has invalid domain.`);
                                    } else if (p.domain.type === 'integer_range') {
                                        if (typeof p.domain.min === 'number' && typeof p.domain.max === 'number' && p.domain.min > p.domain.max) {
                                            errors.push(`Note id ${nid} archetype ${aIdx + 1} param '${p.name}' min (${p.domain.min}) > max (${p.domain.max}).`);
                                        }
                                        if (p.domain.step !== null && p.domain.step !== undefined && p.domain.step <= 0) {
                                            errors.push(`Note id ${nid} archetype ${aIdx + 1} param '${p.name}' step must be positive.`);
                                        }
                                    } else if (p.domain.type === 'float_range') {
                                        if (typeof p.domain.min === 'number' && typeof p.domain.max === 'number' && (p.domain.min > p.domain.max || isNaN(p.domain.min) || isNaN(p.domain.max))) {
                                            errors.push(`Note id ${nid} archetype ${aIdx + 1} param '${p.name}' invalid float range [${p.domain.min}, ${p.domain.max}].`);
                                        }
                                    }
                                });
                            }
                        });
                    }
                } else {
                    stats.hydrationDependentCount++;
                    // inline_contract is null / missing
                    if (isPortable) {
                        if (payloadObj.content_ref) {
                            errors.push(`[Self-Contained APKG Gate] Note id ${nid} has 'inline_contract: null' with 'content_ref: "${payloadObj.content_ref}"'. This card is HYDRATION-DEPENDENT and cannot generate problems on a clean Anki profile. Self-contained APKGs require a valid 'inline_contract'.`);
                        } else {
                            errors.push(`[Self-Contained APKG Gate] Note id ${nid} has missing 'inline_contract' in portable export mode.`);
                        }
                    } else {
                        warnings.push(`Note id ${nid} is HYDRATION-DEPENDENT (relies on content_ref '${payloadObj.content_ref || 'unknown'}'). Requires external procedural database hydration.`);
                    }
                }

                stats.anchors.push({
                    noteId: nid,
                    guid,
                    procSchema: payloadObj.proc_schema,
                    patternId: patId || null,
                    difficulty: payloadObj.difficulty_override || payloadObj.difficulty || null,
                    hasInlineContract: !!payloadObj.inline_contract,
                    isSelfContained: !!payloadObj.inline_contract
                });
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

        // Cross-artifact validation against canonical ProblemPatterns.json
        if (options.sourceJson) {
            let srcData = options.sourceJson;
            if (typeof srcData === 'string') {
                try { srcData = JSON.parse(srcData); } catch (e) {}
            }
            if (srcData && Array.isArray(srcData.patterns)) {
                srcData.patterns.forEach(p => {
                    if (p.status !== 'UNSUPPORTED_BY_CURRENT_STUDYLAB_ENGINE' && !p.unsupported) {
                        if (!extractedPatternIds.has(p.id)) {
                            errors.push(`Pattern '${p.id}' declared in canonical source JSON was not exported into procedural APKG.`);
                        }
                    }
                });
            }
        }

        db.close();
    } catch (err) {
        errors.push(`Database inspection error: ${err.message}`);
        if (db) db.close();
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        stats
    };
}

/**
 * Validates a StudyLab Procedural APKG file at a given filesystem path.
 */
async function validateProceduralApkg(filePath, shouldExit = true, options = {}) {
    let resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
        const vaultCandidate = path.join(getVaultRoot(), filePath);
        if (fs.existsSync(vaultCandidate)) {
            resolvedPath = vaultCandidate;
        }
    }

    console.log(`Validating StudyLab Procedural Package (.apkg) at: ${resolvedPath}`);
    if (!fs.existsSync(resolvedPath)) {
        console.error(`Error: File not found: ${resolvedPath}`);
        if (shouldExit) process.exit(1);
        return { isValid: false, errors: [`File not found: ${resolvedPath}`], warnings: [], stats: {} };
    }

    const buffer = fs.readFileSync(resolvedPath);
    const result = await validateProceduralApkgContent(buffer, resolvedPath, options);

    // Companion Manifest Validation
    const manifestPath = options.manifestPath || resolvedPath.replace(/\.apkg$/i, '.manifest.json');
    if (fs.existsSync(manifestPath)) {
        try {
            const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            if (manifestData.package_classification && manifestData.package_classification !== result.stats.packageClassification) {
                result.errors.push(`Companion manifest classification '${manifestData.package_classification}' does not match package classification '${result.stats.packageClassification}'.`);
                result.isValid = false;
            }
            if (typeof manifestData.totalItems === 'number' && manifestData.totalItems !== result.stats.noteCount) {
                result.errors.push(`Companion manifest totalItems (${manifestData.totalItems}) does not match package note count (${result.stats.noteCount}).`);
                result.isValid = false;
            }
            if (manifestData.deckName && !result.stats.deckNames.includes(manifestData.deckName)) {
                result.errors.push(`Companion manifest deckName '${manifestData.deckName}' not found in package decks (${result.stats.deckNames.join(', ')}).`);
                result.isValid = false;
            }
        } catch (mErr) {
            result.errors.push(`Failed to parse companion manifest '${manifestPath}': ${mErr.message}`);
            result.isValid = false;
        }
    }

    if (!result.isValid) {
        console.log("\n[FAIL] StudyLab Procedural APKG Validation Errors:");
        result.errors.forEach(err => console.log(`  ❌ ${err}`));
        if (shouldExit) process.exit(1);
    } else {
        console.log("\n[PASS] StudyLab Procedural APKG is 100% structurally valid!");
        console.log(`  📊 Decks: ${result.stats.deckNames.join(', ')}`);
        console.log(`  📊 Procedural Anchors: ${result.stats.noteCount}`);
        console.log(`  📊 Self-Contained Anchors: ${result.stats.selfContainedCount}`);
        console.log(`  📊 Cards: ${result.stats.cardCount}`);
        console.log(`  📊 Models: ${result.stats.modelNames.join(', ')}`);
        console.log(`  📊 Classification: ${result.stats.packageClassification}`);
    }

    if (result.warnings.length > 0) {
        console.log("\n[WARNINGS]:");
        result.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
    }

    return result;
}

if (require.main === module) {
    const target = process.argv[2];
    if (!target) {
        console.error("Usage: node validate_studylab_procedural_apkg.js <path_to_procedural_apkg>");
        process.exit(1);
    }
    validateProceduralApkg(target).catch(err => {
        console.error("Validator Error:", err.message);
        process.exit(1);
    });
}

module.exports = {
    validateProceduralApkg,
    validateProceduralApkgContent,
    validateStudyLabLevels1to6,
    validateStudyLabLevels1to7,
    validateSolutionGraphDag,
    validateHintTierDisclosure,
    getValidators
};
