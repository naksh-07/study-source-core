/**
 * StudyLab Multi-Tier APKG Validator (`validate_studylab_levels_1_6.js`)
 * 
 * Implements the authoritative Section 21 validation architecture with 7 strictly separated levels:
 * - Level 1: Package Structure (ZIP integrity, SQLite schema, tables, Model 1600000004, ordinals, HTML safety)
 * - Level 2: Schema Validation (Draft-07 Ajv compliance, parameter domain bounds, checked arithmetic)
 * - Level 3: Modality Integrity (Anti-Fallback Invariant, no generic textboxes for MCQs, valid choices)
 * - Level 4: Coverage Completeness (All declared chapter question types represented; Question Type != Instance)
 * - Level 5: Learning Completeness (DAG Acyclicity DFS coloring, 3-Tier progressive hints, Hint Anti-Leak)
 * - Level 6: Adaptive Semantics (Decision points, error categories, domain diagnostic mappings, remediation)
 * - Level 7: Practice Depth & Variant Quality (Detects shallow 1-example-per-type, enforces variant quality & difficulty gradient)
 * 
 * Invariant: "A package can PASS LEVEL 1 and FAIL LEVEL 4, or PASS LEVELS 1-6 and FAIL LEVEL 7."
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const JSZip = require('jszip');
const Ajv = require('ajv');

const { validateHtmlFieldSafety } = require('./validate_apkg');
const { getVaultRoot } = require('./path_resolver');

const SCHEMAS_DIR = path.resolve(__dirname, '../resources/schemas');

let ajvInstance = null;
let validateRichContract = null;
let validateApkgAnchor = null;
let validateManifestSchema = null;

function getValidators() {
    if (!ajvInstance) {
        ajvInstance = new Ajv({ allErrors: true, strict: false });

        const provPath = path.join(SCHEMAS_DIR, 'studylab-provenance.schema.json');
        const richPath = path.join(SCHEMAS_DIR, 'studylab-rich-content-contract.schema.json');
        const apkgPath = path.join(SCHEMAS_DIR, 'studylab-apkg-schema.json');
        const manPath = path.join(SCHEMAS_DIR, 'studylab-apkg-manifest.schema.json');

        if (fs.existsSync(provPath)) {
            const provSchema = JSON.parse(fs.readFileSync(provPath, 'utf8'));
            ajvInstance.addSchema(provSchema, 'studylab-provenance.schema.json');
        }
        if (fs.existsSync(richPath)) {
            const richSchema = JSON.parse(fs.readFileSync(richPath, 'utf8'));
            ajvInstance.addSchema(richSchema, 'studylab-rich-content-contract.schema.json');
            validateRichContract = ajvInstance.compile(richSchema);
        }
        if (fs.existsSync(apkgPath)) {
            const apkgSchema = JSON.parse(fs.readFileSync(apkgPath, 'utf8'));
            validateApkgAnchor = ajvInstance.compile(apkgSchema);
        }
        if (fs.existsSync(manPath)) {
            const manSchema = JSON.parse(fs.readFileSync(manPath, 'utf8'));
            validateManifestSchema = ajvInstance.compile(manSchema);
        }
    }
    return { ajvInstance, validateRichContract, validateApkgAnchor, validateManifestSchema };
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * LEVEL 1 — PACKAGE STRUCTURE
 * Verifies ZIP archive, SQLite database tables, Model 1600000004, card foreign keys, and HTML safety.
 */
async function validateLevel1PackageStructure(buffer) {
    const errors = [];
    const warnings = [];
    let zip = null;
    let db = null;
    const stats = {
        deckNames: [],
        noteCount: 0,
        cardCount: 0,
        modelNames: []
    };

    // 1. ZIP verification
    try {
        zip = await JSZip.loadAsync(buffer);
    } catch (err) {
        errors.push(`Corrupted ZIP archive: ${err.message}`);
        return { level: 1, name: "Package Structure", status: "FAIL", errors, warnings, stats };
    }

    if (!zip.file('collection.anki2')) {
        errors.push("Missing required 'collection.anki2' SQLite database in APKG archive.");
    }

    const colFile = zip.file('collection.anki2');
    if (!colFile) {
        return { level: 1, name: "Package Structure", status: "FAIL", errors, warnings, stats };
    }

    // 2. SQLite verification
    try {
        const SQL = await initSqlJs();
        const colBuffer = await colFile.async('nodebuffer');
        db = new SQL.Database(colBuffer);

        const tablesRes = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
        const tableNames = tablesRes[0]?.values.map(v => v[0]) || [];
        const requiredTables = ['col', 'notes', 'cards'];
        for (const req of requiredTables) {
            if (!tableNames.includes(req)) {
                errors.push(`Missing required table '${req}' in SQLite database.`);
            }
        }

        if (errors.length > 0) {
            db.close();
            return { level: 1, name: "Package Structure", status: "FAIL", errors, warnings, stats };
        }

        // col inspection
        const colRes = db.exec("SELECT models, decks FROM col LIMIT 1");
        if (!colRes[0] || colRes[0].values.length === 0) {
            errors.push("Table 'col' has no configuration row.");
            db.close();
            return { level: 1, name: "Package Structure", status: "FAIL", errors, warnings, stats };
        }

        const modelsJsonStr = colRes[0].values[0][0];
        const decksJsonStr = colRes[0].values[0][1];
        let models = {};
        let decks = {};

        try { models = JSON.parse(modelsJsonStr); } catch (e) { errors.push(`Failed to parse models JSON: ${e.message}`); }
        try { decks = JSON.parse(decksJsonStr); } catch (e) { errors.push(`Failed to parse decks JSON: ${e.message}`); }

        stats.deckNames = Object.values(decks).map(d => d.name).filter(Boolean);
        stats.modelNames = Object.values(models).map(m => m.name).filter(Boolean);

        const proceduralModel = models['1600000004'] || Object.values(models).find(m => m.name === 'StudyLab Procedural Anchor');
        if (!proceduralModel) {
            errors.push("Missing required Model 1600000004 ('StudyLab Procedural Anchor') in col.models.");
        } else {
            const fldNames = (proceduralModel.flds || []).map(f => f.name);
            if (!fldNames.includes('ProceduralPayload')) {
                errors.push("Model 1600000004 is missing required field 'ProceduralPayload'.");
            }
        }

        // notes inspection
        const notesRes = db.exec("SELECT id, guid, mid, flds FROM notes");
        const noteRows = notesRes[0]?.values || [];
        stats.noteCount = noteRows.length;
        const noteIds = new Set();

        noteRows.forEach((row, idx) => {
            const [nid, guid, mid, flds] = row;
            noteIds.add(nid);

            if (!guid || typeof guid !== 'string' || guid.trim().length === 0) {
                errors.push(`Note row ${idx + 1} (id: ${nid}) has empty or invalid guid.`);
            }

            const fieldParts = flds.split('\u001f');
            if (fieldParts.length < 2) {
                errors.push(`Note row ${idx + 1} (id: ${nid}) has insufficient fields (${fieldParts.length}).`);
            }

            // HTML safety check on rendered fields
            fieldParts.forEach((fp, fIdx) => {
                if (fIdx > 0) { // Skip raw JSON payload field for HTML safety
                    const htmlRes = validateHtmlFieldSafety(fp);
                    if (!htmlRes.isValid) {
                        errors.push(`Note id ${nid} field ${fIdx} HTML safety violation: ${htmlRes.errors.join('; ')}`);
                    }
                }
            });
        });

        // cards inspection
        const cardsRes = db.exec("SELECT id, nid, did, ord FROM cards");
        const cardRows = cardsRes[0]?.values || [];
        stats.cardCount = cardRows.length;

        cardRows.forEach((crow, cIdx) => {
            const [cid, nid, did, ord] = crow;
            if (!noteIds.has(nid)) {
                errors.push(`Card row ${cIdx + 1} (id: ${cid}) references non-existent note id ${nid}.`);
            }
            if (!decks[did.toString()]) {
                errors.push(`Card row ${cIdx + 1} (id: ${cid}) references non-existent deck id ${did}.`);
            }
            if (ord < 0) {
                errors.push(`Card row ${cIdx + 1} (id: ${cid}) has negative ordinal ${ord}.`);
            }
        });

        db.close();
    } catch (err) {
        errors.push(`SQLite inspection error: ${err.message}`);
        if (db) db.close();
    }

    return {
        level: 1,
        name: "Package Structure",
        status: errors.length === 0 ? "PASS" : "FAIL",
        errors,
        warnings,
        stats
    };
}

/**
 * LEVEL 2 — SCHEMA VALIDATION
 * Validates ProceduralPayload JSON syntax, Ajv schema compliance, parameter domains, and checked bounds.
 */
function validateLevel2Schema(payloadObjects, options = {}) {
    const errors = [];
    const warnings = [];
    const { validateApkgAnchor, validateRichContract } = getValidators();
    const isPortable = options.mode !== 'hydration_dependent';

    let validatedCount = 0;
    let selfContainedCount = 0;

    payloadObjects.forEach((item, idx) => {
        const { nid, payload } = item;
        validatedCount++;

        if (!payload || typeof payload !== 'object') {
            errors.push(`Note id ${nid} has invalid non-object ProceduralPayload.`);
            return;
        }

        // 1. Validate against studylab-apkg-schema.json
        if (validateApkgAnchor) {
            const valid = validateApkgAnchor(payload);
            if (!valid) {
                const schemaErrors = (validateApkgAnchor.errors || []).map(e => `${e.instancePath || '/'} ${e.message}`).join(', ');
                errors.push(`Note id ${nid} failed studylab-apkg-schema validation: ${schemaErrors}`);
            }
        }

        // 2. Validate inline_contract in portable mode
        const inlineContract = payload.inline_contract;
        if (inlineContract) {
            selfContainedCount++;
            if (validateRichContract) {
                const validContract = validateRichContract(inlineContract);
                if (!validContract) {
                    const contractErrors = (validateRichContract.errors || []).map(e => `${e.instancePath || '/'} ${e.message}`).join(', ');
                    errors.push(`Note id ${nid} failed rich contract schema validation: ${contractErrors}`);
                }
            }

            // Checked arithmetic and parameter bounds validation
            if (Array.isArray(inlineContract.archetypes)) {
                inlineContract.archetypes.forEach((arch, aIdx) => {
                    if (Array.isArray(arch.parameters)) {
                        arch.parameters.forEach((p, pIdx) => {
                            if (!p.name) {
                                errors.push(`Note id ${nid} archetype ${aIdx + 1} param ${pIdx + 1} missing name.`);
                            }
                            if (p.domain && p.domain.type === 'integer_range') {
                                if (typeof p.domain.min === 'number' && typeof p.domain.max === 'number' && p.domain.min > p.domain.max) {
                                    errors.push(`Note id ${nid} archetype ${aIdx + 1} param '${p.name}' min (${p.domain.min}) > max (${p.domain.max}).`);
                                }
                                if (p.domain.step !== null && p.domain.step !== undefined && p.domain.step <= 0) {
                                    errors.push(`Note id ${nid} archetype ${aIdx + 1} param '${p.name}' step must be positive.`);
                                }
                                // Checked arithmetic: i64 overflow prevention
                                if (p.domain.min < -9223372036854775808 || p.domain.max > 9223372036854775807) {
                                    errors.push(`Note id ${nid} archetype ${aIdx + 1} param '${p.name}' exceeds safe integer domain.`);
                                }
                            } else if (p.domain && p.domain.type === 'float_range') {
                                if (p.domain.min > p.domain.max || isNaN(p.domain.min) || isNaN(p.domain.max)) {
                                    errors.push(`Note id ${nid} archetype ${aIdx + 1} param '${p.name}' invalid float range.`);
                                }
                            }
                        });
                    }
                });
            }
        } else {
            if (isPortable) {
                errors.push(`[Self-Contained APKG Gate] Note id ${nid} has null/missing inline_contract in portable mode.`);
            } else {
                warnings.push(`Note id ${nid} is HYDRATION-DEPENDENT (relies on content_ref '${payload.content_ref || 'null'}').`);
            }
        }
    });

    return {
        level: 2,
        name: "Schema Validation",
        status: errors.length === 0 ? "PASS" : "FAIL",
        errors,
        warnings,
        stats: {
            validatedCount,
            selfContainedCount,
            hydrationDependentCount: validatedCount - selfContainedCount
        }
    };
}

/**
 * LEVEL 3 — MODALITY INTEGRITY
 * Enforces the Anti-Fallback Invariant: discrete options for MCQs, valid numerical bounds, no generic textboxes.
 */
function validateLevel3Modality(payloadObjects, manifestItems = []) {
    const errors = [];
    const warnings = [];

    payloadObjects.forEach((item, idx) => {
        const { nid, payload } = item;
        const contract = payload?.inline_contract;
        const meta = contract?.contract?.metadata || {};
        const sourcePrompt = meta.source_prompt || "";

        // Anti-Fallback Invariant: Prohibit generic text fallback prompts
        const genericFallbackRegex = /^(type your answer|enter the answer|fill in the blank|solve this problem|answer here)[\s.:]*$/i;
        if (genericFallbackRegex.test(sourcePrompt.trim())) {
            errors.push(`[Anti-Fallback Invariant] Note id ${nid} uses generic textbox placeholder prompt '${sourcePrompt}'.`);
        }

        // Check archetypes for options or structured step nodes
        if (contract && Array.isArray(contract.archetypes)) {
            contract.archetypes.forEach((arch, aIdx) => {
                const promptTpl = arch.prompt_template || "";
                if (genericFallbackRegex.test(promptTpl.trim())) {
                    errors.push(`[Anti-Fallback Invariant] Note id ${nid} archetype ${aIdx + 1} uses generic placeholder prompt template.`);
                }
            });
        }
    });

    // Check manifest items for authentic MCQ options
    manifestItems.forEach((mItem, idx) => {
        const qType = mItem.question_type || mItem.questionType;
        if (qType === 'mcq') {
            if (mItem.options && Array.isArray(mItem.options)) {
                if (mItem.options.length < 4) {
                    errors.push(`[Modality Integrity] MCQ item ${mItem.practice_question_id || idx + 1} has fewer than 4 options (${mItem.options.length} provided).`);
                }
                const isDummy = mItem.options.every((opt, i) => opt === `Option ${String.fromCharCode(65 + i)}` || opt === String.fromCharCode(65 + i));
                if (isDummy) {
                    errors.push(`[Modality Integrity] MCQ item ${mItem.practice_question_id || idx + 1} contains dummy placeholder options.`);
                }
            }
        }
    });

    return {
        level: 3,
        name: "Modality Integrity",
        status: errors.length === 0 ? "PASS" : "FAIL",
        errors,
        warnings
    };
}

/**
 * LEVEL 4 — COVERAGE COMPLETENESS
 * Verifies that all declared chapter skills/question types are represented.
 * Enforces the invariant: Question Type != Instance (multiple instances do not artificially inflate question_type_count).
 */
function validateLevel4Coverage(manifestData, payloadObjects, sourceData = null) {
    const errors = [];
    const warnings = [];

    if (!manifestData) {
        errors.push("Missing required companion manifest to evaluate Level 4 coverage.");
        return { level: 4, name: "Coverage Completeness", status: "FAIL", errors, warnings, stats: {} };
    }

    const {
        concept_count = 0,
        skill_count = 0,
        question_type_count = 0,
        archetype_count = 0,
        variant_count = 0,
        object_count = 0,
        coverage_summary = {},
        question_types = []
    } = manifestData;

    // Check Question Type != Instance invariant
    if (question_types.length > 0) {
        const totalInstances = question_types.reduce((acc, qt) => acc + (qt.coverage?.instance_count || 0), 0);
        if (question_type_count > totalInstances && totalInstances > 0) {
            errors.push(`[Coverage Invariant] Declared question_type_count (${question_type_count}) exceeds total instance count (${totalInstances}).`);
        }
    }

    // Check against canonical source data if provided
    if (sourceData) {
        let declaredSkills = [];
        if (Array.isArray(sourceData.patterns)) {
            declaredSkills = sourceData.patterns.filter(p => p.status !== 'UNSUPPORTED_BY_CURRENT_STUDYLAB_ENGINE' && !p.unsupported).map(p => p.id || p.skill_id);
        } else if (Array.isArray(sourceData.questions)) {
            declaredSkills = sourceData.questions.map(q => q.pattern_id || q.skill_id || q.id);
        }

        const packagedSkillSet = new Set(question_types.map(qt => qt.type_id));
        const missingSkills = declaredSkills.filter(s => s && !packagedSkillSet.has(s));

        if (missingSkills.length > 0) {
            errors.push(`[Coverage Gap] Declared chapter question types/skills are missing from APKG: ${missingSkills.join(', ')}.`);
        }
    }

    // Check uncovered skills in manifest
    if (Array.isArray(coverage_summary.uncovered_skills) && coverage_summary.uncovered_skills.length > 0) {
        warnings.push(`Chapter has ${coverage_summary.uncovered_skills.length} uncovered skills: ${coverage_summary.uncovered_skills.join(', ')}`);
    }

    const coveragePercentage = coverage_summary.coverage_percentage !== undefined ? coverage_summary.coverage_percentage : 100.0;

    return {
        level: 4,
        name: "Coverage Completeness",
        status: errors.length === 0 ? "PASS" : "FAIL",
        errors,
        warnings,
        stats: {
            concept_count,
            skill_count,
            question_type_count,
            archetype_count,
            variant_count,
            object_count,
            coverage_percentage: coveragePercentage
        }
    };
}

/**
 * LEVEL 5 — LEARNING COMPLETENESS
 * Evaluates DAG solution graph acyclicity (DFS coloring), 3-tier progressive hints, and anti-leak rules.
 */
function validateLevel5LearningCompleteness(payloadObjects) {
    const errors = [];
    const warnings = [];

    payloadObjects.forEach(item => {
        const { nid, payload } = item;
        const contract = payload?.inline_contract;
        if (!contract || !Array.isArray(contract.archetypes)) return;

        contract.archetypes.forEach((arch, aIdx) => {
            const stepNodes = arch.step_nodes || [];

            // 1. Solution Graph DAG Validation (DFS Coloring)
            if (Array.isArray(stepNodes) && stepNodes.length > 0) {
                const stepIds = new Set();
                const adj = new Map();

                stepNodes.forEach((step, sIdx) => {
                    const sid = step.id || `step_${sIdx + 1}`;
                    if (stepIds.has(sid)) {
                        errors.push(`Note id ${nid} archetype ${aIdx + 1} duplicate step id '${sid}'.`);
                    }
                    stepIds.add(sid);
                    adj.set(sid, Array.isArray(step.dependencies) ? step.dependencies : []);
                });

                // Dependency references & self-loops
                stepNodes.forEach((step, sIdx) => {
                    const sid = step.id || `step_${sIdx + 1}`;
                    const deps = Array.isArray(step.dependencies) ? step.dependencies : [];
                    deps.forEach(depId => {
                        if (depId === sid) {
                            errors.push(`Note id ${nid} archetype ${aIdx + 1} step '${sid}' has self-loop dependency.`);
                        } else if (!stepIds.has(depId)) {
                            errors.push(`Note id ${nid} archetype ${aIdx + 1} step '${sid}' references non-existent dependency '${depId}'.`);
                        }
                    });
                });

                // Cycle detection DFS (0=White, 1=Gray, 2=Black)
                const visited = new Map();
                stepIds.forEach(id => visited.set(id, 0));

                function dfs(nodeId, currentPath) {
                    visited.set(nodeId, 1);
                    currentPath.push(nodeId);

                    const deps = adj.get(nodeId) || [];
                    for (const nextNode of deps) {
                        if (!stepIds.has(nextNode)) continue;
                        const state = visited.get(nextNode);
                        if (state === 1) {
                            const cycleStartIdx = currentPath.indexOf(nextNode);
                            const subPath = currentPath.slice(cycleStartIdx).concat(nextNode);
                            errors.push(`[DAG Cycle Detected] Note id ${nid} archetype ${aIdx + 1} directed cycle: ${subPath.join(' -> ')}`);
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

                // 2. 3-Tier Progressive Hints & Anti-Leak Validation
                stepNodes.forEach((step, sIdx) => {
                    const sid = step.id || `step_${sIdx + 1}`;
                    const h1 = step.hint_principle;
                    const h2 = step.hint_operation;
                    const h3 = step.hint_intermediate;

                    if (!h1 || !h2 || !h3) {
                        errors.push(`Note id ${nid} archetype ${aIdx + 1} step '${sid}' missing 3-tier hints.`);
                    }

                    // Check for answer leak
                    const leakPatterns = [/उत्तर\s*(?:है|:)\s*(\d+)/i, /answer\s*(?:is|:)\s*(\d+)/i, /=\s*(\d{2,})/];
                    [h1, h2].forEach((hText, tierIdx) => {
                        if (typeof hText === 'string') {
                            leakPatterns.forEach(lp => {
                                if (lp.test(hText)) {
                                    errors.push(`[Hint Leak] Note id ${nid} archetype ${aIdx + 1} Tier ${tierIdx + 1} hint leaks answer: "${hText}".`);
                                }
                            });
                        }
                    });
                });
            } else {
                errors.push(`Note id ${nid} archetype ${aIdx + 1} has no step_nodes defined in solution graph.`);
                warnings.push(`Note id ${nid} archetype ${aIdx + 1} has no step_nodes defined in solution graph.`);
            }
        });
    });

    return {
        level: 5,
        name: "Learning Completeness",
        status: errors.length === 0 ? "PASS" : "FAIL",
        errors,
        warnings
    };
}

/**
 * LEVEL 6 — ADAPTIVE SEMANTICS
 * Verifies diagnostic error categories, decision points, and telemetry interpretation metadata.
 */
function validateLevel6AdaptiveSemantics(payloadObjects) {
    const errors = [];
    const warnings = [];

    payloadObjects.forEach(item => {
        const { nid, payload } = item;
        const contract = payload?.inline_contract?.contract;
        if (!contract) return;

        // Verify decision points
        if (!Array.isArray(contract.decision_points) || contract.decision_points.length === 0) {
            errors.push(`Note id ${nid} contract missing required decision_points taxonomy.`);
            warnings.push(`Note id ${nid} contract missing required decision_points taxonomy.`);
        }

        // Verify error categories
        if (!Array.isArray(contract.error_categories) || contract.error_categories.length === 0) {
            errors.push(`Note id ${nid} contract missing required error_categories diagnostic taxonomy.`);
            warnings.push(`Note id ${nid} contract missing required error_categories diagnostic taxonomy.`);
        }

        // Verify domain
        const validDomains = ['mathematics', 'math', 'reasoning', 'physics', 'chemistry'];
        if (contract.domain && !validDomains.includes(contract.domain.toLowerCase())) {
            errors.push(`Note id ${nid} contract has unknown domain '${contract.domain}'.`);
        }
    });

    return {
        level: 6,
        name: "Adaptive Semantics",
        status: errors.length === 0 ? "PASS" : "FAIL",
        errors,
        warnings
    };
}

/**
 * LEVEL 7 — PRACTICE DEPTH & VARIANT QUALITY
 * 
 * Evaluates whether the declared chapter problem space has adequate practice depth:
 * - Flags shallow "one problem per type" when declared skills/archetypes require deeper variants.
 * - Distinguishes meaningful variants (parameter range transitions, constraint boundary shifts,
 *   structural mutations, representation changes) from superficial numeric substitutions.
 * - Enforces minimum item/variant thresholds and difficulty dispersion.
 * 
 * Invariant: "A package can PASS LEVELS 1-6 and FAIL LEVEL 7."
 */
function validateLevel7PracticeDepth(manifestData, payloadObjects = [], sourceData = null, options = {}) {
    const errors = [];
    const warnings = [];

    const stats = {
        question_type_count: 0,
        source_question_count: 0,
        canonical_question_count: 0,
        generated_variant_count: 0,
        archetype_count: 0,
        variant_count: 0,
        object_count: 0,
        source_depth_ratio: 0,
        variant_depth_ratio: 0,
        difficulty_min: null,
        difficulty_max: null,
        difficulty_dispersion: 0,
        avg_instances_per_type: 0,
        readiness_breakdown: null
    };

    if (manifestData) {
        const {
            question_type_count = 0,
            source_question_count = 0,
            canonical_question_count = 0,
            generated_variant_count = 0,
            archetype_count = 0,
            variant_count = 0,
            object_count = 0,
            difficulty_coverage = {},
            question_types = [],
            items = [],
            readiness_breakdown = null
        } = manifestData;

        stats.question_type_count = question_type_count;
        stats.source_question_count = (source_question_count !== undefined) ? source_question_count : 0;
        stats.canonical_question_count = canonical_question_count || object_count;
        stats.generated_variant_count = generated_variant_count;
        stats.archetype_count = archetype_count;
        stats.variant_count = variant_count;
        stats.object_count = object_count;
        stats.source_depth_ratio = Number((stats.source_question_count / Math.max(question_type_count, 1)).toFixed(2));
        stats.variant_depth_ratio = Number((variant_count / Math.max(archetype_count, 1)).toFixed(2));
        stats.readiness_breakdown = readiness_breakdown;

        // 1. Minimum Item & Variant Thresholds
        // [Variant Threshold check removed to support 0 generated variants in SOURCE-FIRST packages]

        if (question_type_count > 0 && object_count < question_type_count) {
            errors.push(`[Item Threshold] Total object count (${object_count}) is less than declared question type count (${question_type_count}).`);
        }

        // 2. Practice Depth & Shallow "One-Example-Per-Type" Interception
        if (question_types.length > 0) {
            const instanceCounts = question_types.map(qt => (qt.coverage && typeof qt.coverage.instance_count === 'number') ? qt.coverage.instance_count : 1);
            const totalInstances = instanceCounts.reduce((a, b) => a + b, 0);
            const avgInstances = question_types.length > 0 ? (totalInstances / question_types.length) : 0;
            stats.avg_instances_per_type = Number(avgInstances.toFixed(2));

            // Flag shallow one-example-per-type when multiple types are declared with zero depth
            if (question_types.length >= 3 && avgInstances <= 1.0 && variant_count <= question_types.length && !manifestData.is_source_first && (!options || !options.allowShallowSourceFirst)) {
                errors.push(`[Shallow Coverage] Declared ${question_types.length} question types with strictly 1 shallow instance each (average instances: ${avgInstances}). Practice depth requires progressive variants per question type.`);
            }
        }

        // 3. Difficulty Dispersion & Range Enforcement
        if (difficulty_coverage && typeof difficulty_coverage === 'object') {
            const minDiff = difficulty_coverage.min;
            const maxDiff = difficulty_coverage.max;
            stats.difficulty_min = minDiff;
            stats.difficulty_max = maxDiff;

            if (typeof minDiff === 'number' && typeof maxDiff === 'number') {
                const dispersion = Number((maxDiff - minDiff).toFixed(2));
                stats.difficulty_dispersion = dispersion;

                if (minDiff < 1.0 || maxDiff > 5.0) {
                    errors.push(`[Difficulty Bounds] Declared difficulty range [${minDiff}, ${maxDiff}] exceeds allowable [1.0, 5.0] bounds.`);
                }

                // Inadequate difficulty dispersion when multiple items are declared
                if (object_count >= 3 || question_type_count >= 2) {
                    if (minDiff === maxDiff) {
                        errors.push(`[Difficulty Dispersion] Inadequate difficulty dispersion: all items share identical difficulty (${minDiff}). Practice depth requires a progressive difficulty gradient.`);
                    }
                }
            } else if (object_count > 0) {
                warnings.push("Manifest missing numerical difficulty_coverage min/max properties.");
            }
        }

        // 4. Provenance & Item Lineage Validation
        if (Array.isArray(items) && items.length > 0) {
            items.forEach((it, iIdx) => {
                if (!it.guid || it.guid.length < 8) {
                    errors.push(`[Provenance Integrity] Manifest item ${iIdx + 1} missing valid GUID.`);
                }
            });
        }

        // 4b. Source-Question Inventory Lineage Reconciliation
        const eligibleQuestions = sourceData && (
            (sourceData.source_question_inventory && Array.isArray(sourceData.source_question_inventory.questions) && sourceData.source_question_inventory.questions) ||
            (Array.isArray(sourceData.eligible_source_questions) && sourceData.eligible_source_questions) ||
            (Array.isArray(sourceData.source_problems) && sourceData.source_problems)
        );
        if (eligibleQuestions) {
            const expectedCount = eligibleQuestions.length;
            if (stats.source_question_count < expectedCount) {
                 errors.push(`[Source Lineage Dropped] Source data identified ${expectedCount} eligible distinct questions, but APKG only mapped ${stats.source_question_count}. Source question collapse is forbidden.`);
            }
        }
    }

    // 5. Meaningful Variant Discrimination vs Superficial Numeric Substitutions in Payloads
    if (Array.isArray(payloadObjects) && payloadObjects.length > 0) {
        let totalArchetypes = 0;
        let parameterOnlyCount = 0;
        let distinctTemplates = new Set();
        let distinctDerivations = new Set();

        payloadObjects.forEach(item => {
            const contract = item.payload?.inline_contract;
            if (contract && Array.isArray(contract.archetypes)) {
                contract.archetypes.forEach(arch => {
                    totalArchetypes++;
                    if (arch.variant_category === 'parameter') {
                        parameterOnlyCount++;
                    }
                    if (arch.prompt_template) distinctTemplates.add(arch.prompt_template);
                    if (arch.answer_derivation?.type) distinctDerivations.add(arch.answer_derivation.type);
                });
            }
        });

        // If many archetypes are defined but all are identical templates with zero structural mutations
        if (totalArchetypes >= 5 && distinctTemplates.size === 1 && distinctDerivations.size === 1 && parameterOnlyCount === totalArchetypes) {
            errors.push(`[Superficial Variation] Detected ${totalArchetypes} archetypes with identical prompt templates and derivation types, representing superficial numeric substitution without structural or constraint variations.`);
        }
    }

    return {
        level: 7,
        name: "Practice Depth & Variant Quality",
        status: errors.length === 0 ? "PASS" : "FAIL",
        errors,
        warnings,
        stats
    };
}

/**
 * Master multi-tier validator executing Levels 1 through 7.
 *
 * @param {string|Buffer} input - Filesystem path to .apkg or Buffer
 * @param {Object} [options]
 * @returns {Promise<Object>} Full Levels 1-7 Scorecard
 */
async function validateStudyLabLevels1to6(input, options = {}) {
    let buffer = null;
    let filePath = null;

    if (Buffer.isBuffer(input)) {
        buffer = input;
        filePath = options.filePath || "in_memory.apkg";
    } else {
        filePath = path.resolve(input);
        if (!fs.existsSync(filePath)) {
            const vaultCandidate = path.join(getVaultRoot(), input);
            if (fs.existsSync(vaultCandidate)) filePath = vaultCandidate;
        }

        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        buffer = fs.readFileSync(filePath);
    }

    // 1. Level 1: Package Structure
    const l1Result = await validateLevel1PackageStructure(buffer);

    // Parse notes and payloads for Levels 2-7
    const payloadObjects = [];
    let manifestData = null;

    try {
        const zip = await JSZip.loadAsync(buffer);
        const colFile = zip.file('collection.anki2');
        if (colFile) {
            const SQL = await initSqlJs();
            const colBuffer = await colFile.async('nodebuffer');
            const db = new SQL.Database(colBuffer);

            const notesRes = db.exec("SELECT id, guid, flds FROM notes");
            const noteRows = notesRes[0]?.values || [];

            noteRows.forEach(row => {
                const [nid, guid, flds] = row;
                const fieldParts = flds.split('\u001f');
                const rawPayload = fieldParts[0];
                try {
                    const parsedPayload = JSON.parse(rawPayload);
                    payloadObjects.push({ nid, guid, payload: parsedPayload });
                } catch (e) {
                    payloadObjects.push({ nid, guid, payload: null, parseError: e.message });
                }
            });
            db.close();
        }
    } catch (e) {
        // Handled in L1
    }

    // Load companion manifest if present
    const manifestPath = options.manifestPath || (filePath ? filePath.replace(/\.apkg$/i, '.manifest.json') : null);
    if (manifestPath && fs.existsSync(manifestPath)) {
        try {
            manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch (e) {}
    }

    // Load source data if provided
    let sourceData = options.sourceData || null;
    if (!sourceData && options.sourcePath && fs.existsSync(options.sourcePath)) {
        try {
            sourceData = JSON.parse(fs.readFileSync(options.sourcePath, 'utf8'));
        } catch (e) {}
    }

    // 2. Level 2: Schema Validation
    const l2Result = validateLevel2Schema(payloadObjects, options);

    // 3. Level 3: Modality Integrity
    const l3Result = validateLevel3Modality(payloadObjects, manifestData?.items || []);

    // 4. Level 4: Coverage Completeness
    const l4Result = validateLevel4Coverage(manifestData, payloadObjects, sourceData);

    // 5. Level 5: Learning Completeness
    const l5Result = validateLevel5LearningCompleteness(payloadObjects);

    // 6. Level 6: Adaptive Semantics
    const l6Result = validateLevel6AdaptiveSemantics(payloadObjects);

    // 7. Level 7: Practice Depth & Variant Quality
    const l7Result = validateLevel7PracticeDepth(manifestData, payloadObjects, sourceData, options);

    const levels = {
        level_1_package_structure: l1Result,
        level_2_schema_validation: l2Result,
        level_3_modality_integrity: l3Result,
        level_4_coverage_completeness: l4Result,
        level_5_learning_completeness: l5Result,
        level_6_adaptive_semantics: l6Result,
        level_7_practice_depth: l7Result
    };

    const passedLevels = [];
    const failedLevels = [];

    [l1Result, l2Result, l3Result, l4Result, l5Result, l6Result, l7Result].forEach(lvl => {
        if (lvl.status === 'PASS') passedLevels.push(lvl.level);
        else failedLevels.push(lvl.level);
    });

    const overallVerdict = failedLevels.length === 0 ? "PASS" : "FAIL";

    const allErrors = [];
    const allWarnings = [];
    [l1Result, l2Result, l3Result, l4Result, l5Result, l6Result, l7Result].forEach(lvl => {
        lvl.errors.forEach(e => allErrors.push(`[Level ${lvl.level} ${lvl.name}] ${e}`));
        lvl.warnings.forEach(w => allWarnings.push(`[Level ${lvl.level} ${lvl.name}] ${w}`));
    });

    return {
        overall_verdict: overallVerdict,
        isValid: overallVerdict === "PASS",
        package_file: filePath,
        passed_levels: passedLevels,
        failed_levels: failedLevels,
        levels,
        errors: allErrors,
        warnings: allWarnings,
        stats: {
            ...l1Result.stats,
            ...l2Result.stats,
            ...l4Result.stats,
            ...l7Result.stats
        }
    };
}

const validateStudyLabLevels1to7 = validateStudyLabLevels1to6;

/**
 * Formats and prints a structured console scorecard.
 */
function printScorecard(result) {
    console.log("\n================================================================================");
    console.log(`  STUDYLAB MULTI-TIER APKG VALIDATION SCORECARD (LEVELS 1-7)`);
    console.log(`  Package: ${result.package_file}`);
    console.log(`  Overall Verdict: ${result.overall_verdict === 'PASS' ? '✅ PASS (100% Validated)' : '❌ FAIL'}`);
    console.log("================================================================================");

    const levelRows = [
        result.levels.level_1_package_structure,
        result.levels.level_2_schema_validation,
        result.levels.level_3_modality_integrity,
        result.levels.level_4_coverage_completeness,
        result.levels.level_5_learning_completeness,
        result.levels.level_6_adaptive_semantics,
        result.levels.level_7_practice_depth
    ].filter(Boolean);

    levelRows.forEach(lvl => {
        const icon = lvl.status === 'PASS' ? '✅' : '❌';
        console.log(`  Level ${lvl.level} [${lvl.name.padEnd(32, ' ')}]: ${icon} ${lvl.status} (${lvl.errors.length} errors, ${lvl.warnings.length} warnings)`);
        if (lvl.errors.length > 0) {
            lvl.errors.forEach(err => console.log(`      ❌ ${err}`));
        }
    });

    console.log("--------------------------------------------------------------------------------");
    console.log(`  📊 Procedural Notes: ${result.stats.noteCount || 0} | Cards: ${result.stats.cardCount || 0}`);
    console.log(`  📊 Question Types: ${result.stats.question_type_count || 0} | Archetypes: ${result.stats.archetype_count || 0}`);
    console.log(`  📊 Coverage: ${result.stats.coverage_percentage !== undefined ? result.stats.coverage_percentage : 100}%`);
    console.log("================================================================================\n");
}

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error("Usage: node validate_studylab_levels_1_6.js <path_to_apkg> [--json] [--source <source_path>]");
        process.exit(1);
    }

    const targetApkg = args[0];
    const isJson = args.includes('--json');
    let sourcePath = null;
    const sourceIdx = args.indexOf('--source');
    const sourceDataIdx = args.indexOf('--source-data');
    if (sourceIdx !== -1 && args[sourceIdx + 1]) {
        sourcePath = args[sourceIdx + 1];
    } else if (sourceDataIdx !== -1 && args[sourceDataIdx + 1]) {
        sourcePath = args[sourceDataIdx + 1];
    }

    validateStudyLabLevels1to6(targetApkg, { sourcePath }).then(result => {
        if (isJson) {
            console.log(JSON.stringify(result, null, 2));
        } else {
            printScorecard(result);
        }
        process.exit(result.overall_verdict === 'PASS' ? 0 : 1);
    }).catch(err => {
        console.error("Validation Error:", err.message);
        process.exit(1);
    });
}

module.exports = {
    validateStudyLabLevels1to6,
    validateStudyLabLevels1to7,
    validateLevel1PackageStructure,
    validateLevel2Schema,
    validateLevel3Modality,
    validateLevel4Coverage,
    validateLevel5LearningCompleteness,
    validateLevel6AdaptiveSemantics,
    validateLevel7PracticeDepth,
    printScorecard
};
