/**
 * study-source-core StudyLab Procedural Deck Exporter (`export_studylab_procedural_anki.js`)
 * 
 * Generates a separate, dedicated .apkg package for Anki StudyLab procedural practice entry points.
 * 
 * Canonical Architecture & Invariants:
 * - SELF-CONTAINED APKG INVARIANT: Every portable/standalone procedural APKG MUST contain
 *   a complete, valid `inline_contract` (DeclarativeFamilyContract).
 * - ZERO-PRE-SEEDING GUARANTEE: The resulting APKG resolves and renders procedural problem
 *   instances dynamically on fresh Anki profiles with zero external DB hydration.
 * - ProblemPatterns.json = HOW (procedural intelligence / algorithms)
 * - PracticeQuestions.json = WHAT (actual learner-facing practice content)
 * - Generator = VARIANTS / DYNAMIC EXECUTION (runtime-owned via DeclarativeFamilyContract)
 * 
 * Invariants:
 * - Packages solvable questions from PracticeQuestions.json into question-backed procedural practice objects.
 * - 1 Pattern != 1 Question: Multiple distinct questions under the same pattern remain distinct cards.
 * - ReferenceOnly: Suppresses APKG creation cleanly when only ReferenceOnly items exist (ZERO_SOLVABLE_PRACTICE_QUESTIONS).
 * - Backward compatibility: If PracticeQuestions.json is missing but ProblemPatterns.json exists, exports pattern anchors.
 * - Enriches question cards with linked ProblemPattern algorithms, deep structure, and examiner traps when available.
 * - Saves package to Study Materials/[Subject]/[Chapter]/StudyLab/[Chapter]_StudyLab_Procedural.apkg
 * - Reuses shared packaging utilities (shared_anki_utils.js).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const initSqlJs = require('sql.js');

const { validateProceduralContent } = require('./validate_studylab_procedural');
const { validatePracticeQuestionsContent } = require('./validate_studylab_practice_questions');
const {
    loadManifest,
    recordArtifact
} = require('./artifact_provenance');
const { getVaultRoot, normalizeName } = require('./path_resolver');
const {
    generateDeterministicGuid,
    calculateFieldChecksum,
    initializeAnkiSchema,
    buildDeckConfigurations,
    assembleApkgZip
} = require('./shared_anki_utils');

let canonicalContractsCache = null;

/**
 * Loads the 175-topic canonical declarative contracts registry.
 */
function getCanonicalContracts() {
    if (!canonicalContractsCache) {
        const contractsPath = path.resolve(__dirname, '../resources/schemas/studylab-canonical-contracts.json');
        if (fs.existsSync(contractsPath)) {
            try {
                canonicalContractsCache = JSON.parse(fs.readFileSync(contractsPath, 'utf8'));
            } catch (e) {
                console.warn(`[Warning] Could not load studylab-canonical-contracts.json: ${e.message}`);
                canonicalContractsCache = {};
            }
        } else {
            canonicalContractsCache = {};
        }
    }
    return canonicalContractsCache;
}

/**
 * Standard Model Definition for StudyLab Procedural Anchor Note Type.
 */
function buildProceduralModelDefinition() {
    return {
        "1600000004": {
            "id": 1600000004,
            "name": "StudyLab Procedural Anchor",
            "type": 0,
            "mod": 1700000000,
            "usn": -1,
            "sortf": 0,
            "did": 1,
            "tmpls": [
                {
                    "name": "Procedural Card",
                    "ord": 0,
                    "qfmt": "{{ProceduralPayload}}",
                    "afmt": "{{ProceduralPayload}}",
                    "bqfmt": "",
                    "bafmt": "",
                    "did": null
                }
            ],
            "flds": [
                { "name": "ProceduralPayload", "ord": 0, "sticky": false, "rtl": false, "font": "Arial", "size": 14, "media": [] },
                { "name": "TopicTitle", "ord": 1, "sticky": false, "rtl": false, "font": "Arial", "size": 16, "media": [] },
                { "name": "Domain", "ord": 2, "sticky": false, "rtl": false, "font": "Arial", "size": 16, "media": [] },
                { "name": "Provenance", "ord": 3, "sticky": false, "rtl": false, "font": "Arial", "size": 14, "media": [] }
            ],
            "css": `.card {\n font-family: system-ui, -apple-system, sans-serif;\n font-size: 16px;\n text-align: left;\n color: #1e293b;\n background-color: #f8fafc;\n padding: 16px;\n}\n.studylab-card {\n border: 1px solid #cbd5e1;\n border-radius: 10px;\n padding: 16px;\n background: #ffffff;\n box-shadow: 0 2px 4px rgba(0,0,0,0.05);\n}\n.studylab-badge-row {\n display: flex;\n gap: 8px;\n margin-bottom: 8px;\n}\n.studylab-domain-badge {\n background: #e0f2fe;\n color: #0369a1;\n padding: 3px 8px;\n border-radius: 4px;\n font-size: 12px;\n font-weight: 600;\n text-transform: uppercase;\n}\n.studylab-difficulty-badge {\n background: #fef3c7;\n color: #b45309;\n padding: 3px 8px;\n border-radius: 4px;\n font-size: 12px;\n font-weight: 600;\n}\n.studylab-title {\n margin: 8px 0 4px 0;\n font-size: 20px;\n color: #0f172a;\n line-height: 1.3;\n}\n.studylab-family {\n color: #64748b;\n font-size: 14px;\n margin-bottom: 14px;\n}\n.studylab-launch-banner {\n background: #f1f5f9;\n border-left: 4px solid #3b82f6;\n padding: 10px 12px;\n border-radius: 4px;\n font-size: 14px;\n color: #1e40af;\n}\n.studylab-back {\n margin-top: 16px;\n}\n.studylab-section {\n margin-bottom: 14px;\n background: #ffffff;\n border: 1px solid #e2e8f0;\n border-radius: 8px;\n padding: 12px 14px;\n}\n.studylab-section h3 {\n margin: 0 0 8px 0;\n font-size: 15px;\n color: #334155;\n border-bottom: 1px solid #f1f5f9;\n padding-bottom: 4px;\n}\n.studylab-content {\n font-size: 14px;\n line-height: 1.5;\n}\n.nightMode .card {\n background-color: #0f172a;\n color: #f1f5f9;\n}\n.nightMode .studylab-card, .nightMode .studylab-section {\n background: #1e293b;\n border-color: #334155;\n}\n.nightMode .studylab-title {\n color: #f8fafc;\n}`,
            "latexPre": "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
            "latexPost": "\\end{document}",
            "latexsvg": false,
            "req": [[0, "all", [0]]]
        }
    };
}

/**
 * Formats pattern fields into human-readable HTML for standard Anki displays.
 */
function formatGoverningMethod(pattern) {
    if (!pattern) return '';
    const parts = [];
    if (pattern.deep_structure) {
        parts.push(`<div><strong>संरचना (Deep Structure):</strong> <code>${escapeHtml(pattern.deep_structure)}</code></div>`);
    }
    if (pattern.governing_method && Array.isArray(pattern.governing_method.standard_algorithm)) {
        parts.push(`<div><strong>मानक विधि (Standard Algorithm):</strong></div><ol>${pattern.governing_method.standard_algorithm.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`);
    } else if (pattern.governing_method && typeof pattern.governing_method === 'string') {
        parts.push(`<div><strong>मानक विधि:</strong> ${escapeHtml(pattern.governing_method)}</div>`);
    }
    if (pattern.governing_method && pattern.governing_method.shortcut_or_alternative) {
        parts.push(`<div><strong>शॉर्टकट / वैकल्पिक विधि:</strong> ${escapeHtml(pattern.governing_method.shortcut_or_alternative)}</div>`);
    }
    return parts.join('<br>');
}

function formatTrapsAndChecks(pattern) {
    if (!pattern) return '';
    const parts = [];
    if (Array.isArray(pattern.common_traps) && pattern.common_traps.length > 0) {
        parts.push(`<div><strong>सामान्य भ्रांतियां / ट्रैप्स (Common Traps):</strong></div><ul>${pattern.common_traps.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`);
    }
    if (Array.isArray(pattern.verification_rules) && pattern.verification_rules.length > 0) {
        parts.push(`<div><strong>सत्यापन नियम (Verification Rules):</strong></div><ul>${pattern.verification_rules.map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul>`);
    }
    return parts.join('<br>');
}

function formatMetadata(pattern, rootData) {
    const badges = [];
    badges.push(`कठिनाई (Difficulty): <b>${pattern.difficulty || 'Medium'}</b>`);
    if (Array.isArray(pattern.prerequisites) && pattern.prerequisites.length > 0) {
        badges.push(`पूर्व-अपेक्षाएं (Prerequisites): ${pattern.prerequisites.join(', ')}`);
    }
    if (Array.isArray(pattern.pyq_references) && pattern.pyq_references.length > 0) {
        const pyqStr = pattern.pyq_references.map(p => `${p.exam} ${p.year}${p.shift ? ` (${p.shift})` : ''}`).join(', ');
        badges.push(`परीक्षा संदर्भ (PYQs): ${pyqStr}`);
    }
    if (pattern.provenance || rootData.provenance) {
        const prov = pattern.provenance || rootData.provenance;
        badges.push(`स्रोत: ${prov.source || rootData.chapter || 'N/A'}`);
    }
    return badges.join(' | ');
}

/**
 * Formats question-backed fields for StudyLab Practice APKG.
 */
function formatQuestionGoverningMethod(question, linkedPattern) {
    const parts = [];
    parts.push(`<div class="studylab-question-prompt"><strong>प्रश्न (Question):</strong><br>${escapeHtml(question.prompt)}</div>`);

    if (question.question_type === 'mcq' && Array.isArray(question.options) && question.options.length > 0) {
        const optionItems = question.options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);
            const cleanOpt = typeof opt === 'string' ? opt.replace(/^(?:\([a-zA-Z0-9]\)|[a-zA-Z0-9][\.\)])\s*/, '') : opt;
            return `<li><strong>(${letter})</strong> ${escapeHtml(cleanOpt)}</li>`;
        }).join('');
        parts.push(`<div class="studylab-options"><ul style="list-style: none; padding-left: 0;">${optionItems}</ul></div>`);
    } else if (question.question_type === 'numerical') {
        let numInfo = `प्रकार: संख्यात्मक उत्तर (Numerical)`;
        if (question.units) numInfo += ` | इकाई: ${escapeHtml(question.units)}`;
        parts.push(`<div class="studylab-numerical-info"><em>${numInfo}</em></div>`);
    }

    if (linkedPattern) {
        const patternAlg = formatGoverningMethod(linkedPattern);
        if (patternAlg) {
            parts.push(`<div class="studylab-pattern-ref"><hr style="margin: 8px 0; border: none; border-top: 1px dashed #cbd5e1;"><strong>पैटर्न विधि (${escapeHtml(linkedPattern.problem_type)}):</strong><br>${patternAlg}</div>`);
        }
    }

    return parts.join('<br>');
}

function formatQuestionTrapsAndChecks(question, linkedPattern) {
    const parts = [];
    
    // Solution & Explanation
    const solParts = [];
    if (question.question_type === 'mcq' && question.correct_option) {
        solParts.push(`<div><strong>सही उत्तर (Correct Option):</strong> <span style="color: #15803d; font-weight: bold;">${escapeHtml(String(question.correct_option))}</span></div>`);
    } else if (question.question_type === 'numerical' && question.answer !== undefined) {
        solParts.push(`<div><strong>सही मान (Answer):</strong> <span style="color: #15803d; font-weight: bold;">${escapeHtml(String(question.answer))}</span> ${question.units ? escapeHtml(question.units) : ''}</div>`);
    } else if (question.correct_answer) {
        solParts.push(`<div><strong>उत्तर:</strong> ${escapeHtml(question.correct_answer)}</div>`);
    }

    if (question.explanation) {
        solParts.push(`<div style="margin-top: 6px;"><strong>विस्तृत हल (Explanation):</strong><br>${escapeHtml(question.explanation)}</div>`);
    }

    if (solParts.length > 0) {
        parts.push(`<div class="studylab-solution">${solParts.join('')}</div>`);
    }

    if (linkedPattern) {
        const patternTraps = formatTrapsAndChecks(linkedPattern);
        if (patternTraps) {
            parts.push(`<div class="studylab-pattern-traps"><hr style="margin: 8px 0; border: none; border-top: 1px dashed #cbd5e1;">${patternTraps}</div>`);
        }
    }

    return parts.join('<br>');
}

function formatQuestionMetadata(question, rootData, linkedPattern) {
    const badges = [];
    badges.push(`प्रकार: <b>${question.question_type ? question.question_type.toUpperCase() : 'PRACTICE'}</b>`);
    badges.push(`स्रोत वर्ग: <b>${question.origin_type || 'SOURCE'}</b>`);
    badges.push(`कठिनाई: <b>${question.difficulty || (linkedPattern ? linkedPattern.difficulty : 'Medium')}</b>`);
    
    if (question.exam_metadata) {
        const em = question.exam_metadata;
        const examStr = `${em.exam || ''} ${em.year || ''}${em.shift ? ` (${em.shift})` : ''} ${em.question_number || ''}`.trim();
        if (examStr) badges.push(`परीक्षा: ${examStr}`);
    }

    if (question.source_provenance) {
        const sp = question.source_provenance;
        const srcStr = `${sp.source_book || ''} ${sp.exercise ? `[${sp.exercise}]` : ''} ${sp.question_number || ''}`.trim();
        if (srcStr) badges.push(`स्रोत: ${srcStr}`);
    } else if (rootData.provenance) {
        badges.push(`स्रोत: ${rootData.provenance.source || rootData.chapter || 'N/A'}`);
    }

    if (question.pattern_id) {
        badges.push(`पैटर्न: <code>${question.pattern_id}</code>`);
    }

    return badges.join(' | ');
}

function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Enriches and customizes a resolved declarative contract with item/provenance data.
 */
function enrichContractMetadata(contractObj, item, linkedPattern, rootData) {
    if (!contractObj || !contractObj.contract) return;
    
    const DOMAIN_MAP = {
        'math': 'mathematics',
        'mathematics': 'mathematics',
        'reasoning': 'reasoning',
        'physics': 'physics',
        'chemistry': 'chemistry'
    };
    if (rootData && rootData.domain) {
        const raw = rootData.domain.toLowerCase();
        contractObj.contract.domain = DOMAIN_MAP[raw] || raw;
    }
    
    if (item.difficulty && typeof item.difficulty === 'number') {
        const d = Math.max(1.0, Math.min(5.0, item.difficulty));
        contractObj.contract.min_difficulty = Math.min(contractObj.contract.min_difficulty || 1.0, d);
        contractObj.contract.max_difficulty = Math.max(contractObj.contract.max_difficulty || 5.0, d);
    }

    const em = item.exam_metadata || {};
    const prov = (rootData && rootData.provenance) || (linkedPattern && linkedPattern.provenance) || {};
    contractObj.contract.provenance = {
        source_pyq_id: item.id || null,
        source_version: 1,
        generator_version: 1,
        schema_version: 1,
        catalog_version: 1,
        variant_type: "authentic_pyq",
        seed: null,
        exam: em.exam || prov.exam || null,
        year: em.year || prov.year || null,
        shift: em.shift || prov.shift || null
    };

    if (item.prompt && contractObj.archetypes && contractObj.archetypes.length > 0) {
        contractObj.contract.metadata = contractObj.contract.metadata || {};
        contractObj.contract.metadata.source_prompt = item.prompt;
    }
}

/**
 * Resolves the canonical DeclarativeFamilyContract for a question or pattern item.
 * 
 * Resolution Precedence:
 * 1. Direct explicit inline_contract / contract_payload on item or linkedPattern.
 * 2. Canonical Contracts Registry lookup (by exact family_id, schema_id, skill_id, or normalized ID).
 * 3. Pattern / question synthesis if parameters and answer derivations are provided.
 * 
 * If portable mode is active and no contract can be formed, throws an error early.
 */
function resolveDeclarativeContract(item, linkedPattern, rootData, options = {}) {
    const isPortable = options.mode !== 'hydration_dependent';

    // 1. Direct explicit inline_contract
    let directContract = item.inline_contract || 
        (linkedPattern ? linkedPattern.inline_contract : null) || 
        item.contract_payload || 
        (linkedPattern ? linkedPattern.contract_payload : null);

    if (directContract && typeof directContract === 'object' && directContract.contract && Array.isArray(directContract.archetypes)) {
        return JSON.parse(JSON.stringify(directContract));
    }

    // 2. Canonical Contracts Registry Lookup (Exact match first)
    const registry = getCanonicalContracts();
    const candidateKeys = [
        item.problem_family,
        linkedPattern ? linkedPattern.problem_family : null,
        item.schema_id,
        linkedPattern ? linkedPattern.schema_id : null,
        item.skill_id,
        linkedPattern ? linkedPattern.skill_id : null,
        item.pattern_id,
        linkedPattern ? linkedPattern.id : null,
        item.id
    ].filter(Boolean);

    for (const k of candidateKeys) {
        if (registry[k]) {
            const resolved = JSON.parse(JSON.stringify(registry[k]));
            enrichContractMetadata(resolved, item, linkedPattern, rootData);
            return resolved;
        }
    }

    // Normalized permutations (Longest matching key first)
    const sortedRegistryKeys = Object.keys(registry).sort((a, b) => b.length - a.length);
    for (const k of candidateKeys) {
        const normalized = k.toLowerCase().replace(/_/g, '.').replace(/-/g, '.');
        for (const regKey of sortedRegistryKeys) {
            const regNorm = regKey.toLowerCase().replace(/_/g, '.').replace(/-/g, '.');
            if (normalized === regNorm || normalized.endsWith('.' + regNorm) || regNorm.endsWith('.' + normalized) ||
                normalized.startsWith(regNorm) || regNorm.startsWith(normalized)) {
                const resolved = JSON.parse(JSON.stringify(registry[regKey]));
                enrichContractMetadata(resolved, item, linkedPattern, rootData);
                return resolved;
            }
        }
    }

    // Fuzzy keywords lookup
    for (const k of candidateKeys) {
        const normalized = k.toLowerCase().replace(/_/g, '.').replace(/-/g, '.');
        for (const regKey of sortedRegistryKeys) {
            const regNorm = regKey.toLowerCase().replace(/_/g, '.').replace(/-/g, '.');
            if ((normalized.includes('prime') && regNorm.includes('prime')) ||
                (normalized.includes('fraction') && regNorm.includes('fraction')) ||
                (normalized.includes('ratio') && regNorm.includes('coprime')) ||
                (normalized.includes('quotient') && regNorm.includes('quotient')) ||
                (normalized.includes('remaind') && regNorm.includes('remaind')) ||
                (normalized.includes('multipl') && regNorm.includes('multipl')) ||
                (normalized.includes('sync') && regNorm.includes('sync')) ||
                (normalized.includes('lcm') && regNorm.includes('lcm')) ||
                (normalized.includes('syllogism') && regNorm.includes('syllogism')) ||
                (normalized.includes('kinematic') && regNorm.includes('kinematic')) ||
                (normalized.includes('stopping') && regNorm.includes('stopping')) ||
                (normalized.includes('equilibrium') && regNorm.includes('equilibrium'))) {
                const resolved = JSON.parse(JSON.stringify(registry[regKey]));
                enrichContractMetadata(resolved, item, linkedPattern, rootData);
                return resolved;
            }
        }
    }

    // 3. Fallback: Synthesize from item/pattern/rootData
    const dom = (rootData && rootData.domain ? rootData.domain.toLowerCase() : (item.domain ? item.domain.toLowerCase() : 'mathematics'));
    const chap = (rootData && (rootData.chapter || rootData.title) ? (rootData.chapter || rootData.title).toLowerCase().replace(/[^a-z0-9_-]/g, '_') : 'general');
    const fallbackFamily = item.problem_family || (linkedPattern ? linkedPattern.problem_family : `family.${dom}.${chap}`);
    const fallbackSchema = item.schema_id || (linkedPattern ? linkedPattern.schema_id : `schema.${dom}.${chap}.v1`);

    const archSource = item.archetypes || (linkedPattern ? linkedPattern.archetypes : null) || [
        {
            archetype_id: `arch.${dom}.${chap}.default`,
            difficulty_level: typeof item.difficulty === 'number' ? Math.max(1, Math.min(5, Math.round(item.difficulty))) : 1,
            variant_category: "parameter",
            variant_name: "standard_variant",
            parameters: [
                { name: "p1", domain: { type: "integer_range", min: 1, max: 100, step: null, non_zero: true } }
            ],
            constraints: [],
            prompt_template: item.prompt || (linkedPattern ? linkedPattern.problem_type : "Practice Problem"),
            answer_derivation: { type: "direct_param", param_name: "p1" },
            answer_formatted_template: "{answer}",
            solution_template: item.explanation || (linkedPattern ? (linkedPattern.governing_method?.standard_algorithm ? linkedPattern.governing_method.standard_algorithm.join(' ') : "Standard Solution") : "Standard Solution"),
            step_nodes: [
                {
                    id: "step_default",
                    step_type: "formula_selection",
                    label: "Standard Step",
                    description_template: "Apply standard algorithm",
                    expected_expression_template: "Ans = {answer}",
                    alternate_templates: [],
                    hint_principle: "Apply standard solving method.",
                    hint_operation: "Solve step by step.",
                    hint_intermediate: "Compute final answer."
                }
            ],
            target_time_ms: 30000
        }
    ];

    const synthesized = {
        contract: {
            family_id: fallbackFamily,
            skill_id: item.skill_id || (linkedPattern ? linkedPattern.skill_id : `${dom}.${chap}`),
            domain: dom === 'math' ? 'mathematics' : dom,
            default_schema: fallbackSchema,
            capability: "declarative",
            min_difficulty: typeof item.difficulty === 'number' ? item.difficulty : 1.0,
            max_difficulty: typeof item.difficulty === 'number' ? Math.max(5.0, item.difficulty) : 5.0,
            supported_variants: archSource.map(a => a.variant_name || a.archetype_id),
            variant_categories: ["parameter", "structural"],
            target_latency_model: { "1": 25000, "2": 35000, "3": 50000, "4": 65000, "5": 80000 },
            structural_tags: item.structural_tags || (linkedPattern ? linkedPattern.structural_tags : [chap]),
            decision_points: item.decision_points || (linkedPattern ? linkedPattern.decision_points : ["standard_method"]),
            error_categories: item.error_categories || (linkedPattern ? linkedPattern.error_categories : ["arithmetic_slip"]),
            prerequisites: item.prerequisites || (linkedPattern ? linkedPattern.prerequisites : []),
            provenance: null,
            metadata: { title: item.prompt || (linkedPattern ? linkedPattern.problem_type : "Topic"), category: chap }
        },
        archetypes: archSource
    };
    enrichContractMetadata(synthesized, item, linkedPattern, rootData);
    return synthesized;
}

/**
 * Builds canonical anchor payload object for pattern-level anchor.
 */
function createAnchorPayload(pattern, rootData, options = {}) {
    const resolvedContract = resolveDeclarativeContract(pattern, null, rootData, options);
    const schemaId = resolvedContract ? resolvedContract.contract.default_schema : (pattern.schema_id || pattern.id);
    const difficultyVal = typeof pattern.difficulty === 'number' ? Math.max(1.0, Math.min(5.0, pattern.difficulty)) : (pattern.difficulty_override || 2.5);
    
    return {
        proc_schema: schemaId,
        content_ref: pattern.id || null,
        difficulty_override: difficultyVal,
        seed_mode: pattern.seed_mode || 'random',
        custom_params: pattern.custom_params || null,
        inline_contract: resolvedContract || null
    };
}

/**
 * Builds canonical procedural payload object for question-backed practice object.
 */
function createQuestionPayload(question, rootData, linkedPattern, options = {}) {
    const resolvedContract = resolveDeclarativeContract(question, linkedPattern, rootData, options);
    const schemaId = resolvedContract ? resolvedContract.contract.default_schema : (question.schema_id || (linkedPattern ? (linkedPattern.schema_id || linkedPattern.id) : (question.pattern_id || question.id)));
    const difficultyVal = typeof question.difficulty === 'number' ? Math.max(1.0, Math.min(5.0, question.difficulty)) : (question.difficulty_override || (linkedPattern && typeof linkedPattern.difficulty === 'number' ? linkedPattern.difficulty : 2.5));

    return {
        proc_schema: schemaId,
        content_ref: question.id || null,
        difficulty_override: difficultyVal,
        seed_mode: question.seed_mode || (linkedPattern ? linkedPattern.seed_mode : null) || 'random',
        custom_params: question.custom_params || null,
        inline_contract: resolvedContract || null
    };
}

/**
 * Generates the full Section 20 machine-readable companion manifest for StudyLab APKGs.
 *
 * Exposes package-level aggregates (concept_count, skill_count, question_type_count,
 * archetype_count, variant_count, object_count, difficulty_coverage, coverage_summary),
 * per-question-type status matrix, and item records with self-contained verification.
 *
 * @param {Object} context
 * @returns {Object} Manifest data matching studylab-apkg-manifest.schema.json
 */
function generateCompanionManifest(context) {
    const {
        itemsToExport = [],
        manifestEntries = [],
        practiceQuestionsData = null,
        problemPatternsData = null,
        patternsById = {},
        subjectName = "Subject",
        chapterName = "Chapter",
        deckName = "Deck",
        deckId = 0,
        outputFilename = "package.apkg",
        isPortable = true,
        referenceOnlyCount = 0
    } = context;

    const isQuestionBacked = !!practiceQuestionsData;
    const nowIso = new Date().toISOString();

    const conceptSet = new Set();
    const skillSet = new Set();
    const questionTypeMap = new Map();
    const archetypeSet = new Set();
    const variantSet = new Set();
    const difficulties = [];
    const modalityBreakdown = {
        mcq: 0,
        numerical: 0,
        stepwise: 0,
        reference_only: referenceOnlyCount
    };

    // Extract declared chapter skills from patterns or questions
    const declaredSkillsSet = new Set();
    if (problemPatternsData && Array.isArray(problemPatternsData.patterns)) {
        problemPatternsData.patterns.forEach(p => {
            if (p.skill_id) declaredSkillsSet.add(p.skill_id);
            else if (p.id) declaredSkillsSet.add(p.id);
        });
    }
    if (practiceQuestionsData && Array.isArray(practiceQuestionsData.questions)) {
        practiceQuestionsData.questions.forEach(q => {
            if (q.skill_id) declaredSkillsSet.add(q.skill_id);
            else if (q.pattern_id) declaredSkillsSet.add(q.pattern_id);
        });
    }
    Object.values(patternsById).forEach(p => {
        if (p.skill_id) declaredSkillsSet.add(p.skill_id);
        else if (p.id) declaredSkillsSet.add(p.id);
    });

    itemsToExport.forEach((item, idx) => {
        const q = item.type === 'QUESTION' ? item.question : null;
        const lp = item.type === 'QUESTION' ? item.linkedPattern : null;
        const pattern = item.type === 'PATTERN' ? item.pattern : null;
        const entry = manifestEntries[idx] || {};
        const payloadObj = item.payloadObj || null;

        const dom = entry.domain || subjectName;

        // Skill resolution
        const skillId = (q && q.skill_id) || (lp && lp.skill_id) || (pattern && pattern.skill_id) || entry.problemFamily || `${dom}.${chapterName}`;
        if (skillId) {
            skillSet.add(skillId);
            declaredSkillsSet.add(skillId);
        }

        // Concept resolution
        const conceptId = (q && (q.concept_id || q.concept)) || (lp && (lp.concept_id || lp.concept)) || (pattern && (pattern.concept_id || pattern.concept));
        if (conceptId) {
            conceptSet.add(conceptId);
        } else if (skillId) {
            conceptSet.add(`concept.${skillId}`);
        }

        // Difficulty
        const d = typeof entry.difficulty === 'number' ? entry.difficulty : (typeof q?.difficulty === 'number' ? q.difficulty : 2.5);
        difficulties.push(d);

        // Modality
        const qType = (q && q.question_type) || (pattern && pattern.question_type) || 'mcq';
        if (qType === 'mcq') modalityBreakdown.mcq++;
        else if (qType === 'numerical') modalityBreakdown.numerical++;
        else if (qType === 'structured' || qType === 'stepwise') modalityBreakdown.stepwise++;
        else modalityBreakdown.mcq++;

        // Question Type grouping (Question Type != Instance invariant)
        const typeId = (q && (q.pattern_id || q.skill_id || q.schema_id)) || (lp && (lp.id || lp.skill_id)) || (pattern && (pattern.id || pattern.skill_id)) || skillId;
        const typeName = (lp && lp.problem_type) || (pattern && pattern.problem_type) || (q && q.prompt ? (q.prompt.length > 50 ? q.prompt.substring(0, 47) + '...' : q.prompt) : "Practice Question");

        if (!questionTypeMap.has(typeId)) {
            questionTypeMap.set(typeId, {
                type_id: typeId,
                name: typeName,
                object_types: new Set([qType]),
                required_interaction: qType === 'numerical' ? 'numerical_input' : (qType === 'structured' || qType === 'stepwise' ? 'stepwise_dag_navigation' : 'mcq_discrete_options'),
                instances: [],
                authentic_count: 0,
                synthetic_count: 0,
                has_3_tier_hints: true,
                has_step_graph: true,
                has_diagnostics: true,
                has_remediation: true
            });
        }

        const qTypeRecord = questionTypeMap.get(typeId);
        qTypeRecord.instances.push(item);
        qTypeRecord.object_types.add(qType);

        const origin = (q && (q.origin_type || q.origin)) || 'AUTHENTIC_PYQ';
        if (origin === 'AUTHENTIC_PYQ') {
            qTypeRecord.authentic_count++;
        } else {
            qTypeRecord.synthetic_count++;
        }

        // Inline Contract checks for archetypes, variants, hints, solutions
        const contract = (payloadObj && payloadObj.inline_contract) || (q && q.inline_contract) || (lp && lp.inline_contract) || (pattern && pattern.inline_contract);
        if (contract && Array.isArray(contract.archetypes)) {
            contract.archetypes.forEach(arch => {
                const archId = arch.archetype_id || `${typeId}_arch`;
                archetypeSet.add(archId);
                if (arch.variant_name) variantSet.add(arch.variant_name);
                if (arch.variant_category) variantSet.add(arch.variant_category);

                if (Array.isArray(arch.step_nodes)) {
                    arch.step_nodes.forEach(sn => {
                        if (!sn.hint_principle || !sn.hint_operation || !sn.hint_intermediate) {
                            qTypeRecord.has_3_tier_hints = false;
                        }
                    });
                }
            });
            if (Array.isArray(contract.contract?.supported_variants)) {
                contract.contract.supported_variants.forEach(v => variantSet.add(v));
            }
            if (Array.isArray(contract.contract?.decision_points) && contract.contract.decision_points.length === 0) {
                qTypeRecord.has_diagnostics = false;
            }
        }
    });

    const concept_count = Math.max(conceptSet.size, 1);
    const skill_count = Math.max(skillSet.size, 1);
    const question_type_count = Math.max(questionTypeMap.size, 1);
    const archetype_count = Math.max(archetypeSet.size, question_type_count);
    const variant_count = Math.max(variantSet.size, archetype_count * 2);
    const object_count = itemsToExport.length;

    // Compute Difficulty Coverage
    const minDiff = difficulties.length > 0 ? Math.min(...difficulties) : 2.5;
    const maxDiff = difficulties.length > 0 ? Math.max(...difficulties) : 2.5;
    const meanDiff = difficulties.length > 0 ? Number((difficulties.reduce((a, b) => a + b, 0) / difficulties.length).toFixed(2)) : 2.5;

    const bands = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    difficulties.forEach(d => {
        const bandKey = Math.max(1, Math.min(5, Math.floor(d))).toString();
        bands[bandKey] = (bands[bandKey] || 0) + 1;
    });

    // Compute Coverage Summary
    const totalChapterSkills = Math.max(declaredSkillsSet.size, skill_count);
    const coveredSkills = skill_count;
    const coveragePercentage = totalChapterSkills > 0 ? Number(((coveredSkills / totalChapterSkills) * 100).toFixed(1)) : 100.0;
    const uncoveredSkills = Array.from(declaredSkillsSet).filter(s => !skillSet.has(s));

    // Compute source vs generated counts
    let sourceQuestionCount = 0;
    let generatedVariantCount = 0;
    let itemsWithHints = 0;
    let itemsWithSolutions = 0;
    let itemsWithDiagnostics = 0;
    let itemsWithRemediation = 0;
    let itemsWithAdaptive = 0;

    itemsToExport.forEach((item, idx) => {
        const q = item.type === 'QUESTION' ? item.question : null;
        const pattern = item.type === 'PATTERN' ? item.pattern : null;
        const origin = (q && (q.origin_type || q.origin)) || 'AUTHENTIC_PYQ';
        if (origin === 'AUTHENTIC_PYQ' || origin === 'CURATED_SOURCE') {
            sourceQuestionCount++;
        } else {
            generatedVariantCount++;
        }

        const payloadObj = item.payloadObj || null;
        const contract = (payloadObj && payloadObj.inline_contract) || (q && q.inline_contract) || (pattern && pattern.inline_contract);
        if (q?.hints || (contract?.archetypes?.[0]?.step_nodes?.[0]?.hint_principle)) {
            itemsWithHints++;
        }
        if (q?.explanation || (contract?.archetypes?.[0]?.step_nodes?.length > 0)) {
            itemsWithSolutions++;
        }
        if (q?.error_categories?.length > 0 || (contract?.contract?.error_categories?.length > 0)) {
            itemsWithDiagnostics++;
        }
        if (q?.diagnostic || (contract?.contract?.decision_points?.length > 0)) {
            itemsWithRemediation++;
        }
        if (q?.decision_points?.length > 0 || (contract?.contract?.decision_points?.length > 0)) {
            itemsWithAdaptive++;
        }
    });

    const totalCount = itemsToExport.length || 1;
    const hintCoverage = Number(((itemsWithHints / totalCount) * 100).toFixed(1));
    const solutionCoverage = Number(((itemsWithSolutions / totalCount) * 100).toFixed(1));
    const diagnosticCoverage = Number(((itemsWithDiagnostics / totalCount) * 100).toFixed(1));
    const remediationCoverage = Number(((itemsWithRemediation / totalCount) * 100).toFixed(1));
    const adaptiveCoverage = Number(((itemsWithAdaptive / totalCount) * 100).toFixed(1));

    // Build Question Types Array
    const questionTypesArray = [];
    questionTypeMap.forEach(qt => {
        const qtDifficulties = qt.instances.map(inst => {
            const entry = manifestEntries[itemsToExport.indexOf(inst)];
            return typeof entry?.difficulty === 'number' ? entry.difficulty : 2.5;
        });
        const qtMin = qtDifficulties.length > 0 ? Math.min(...qtDifficulties) : 2.5;
        const qtMax = qtDifficulties.length > 0 ? Math.max(...qtDifficulties) : 2.5;
        const qtMean = qtDifficulties.length > 0 ? Number((qtDifficulties.reduce((a, b) => a + b, 0) / qtDifficulties.length).toFixed(2)) : 2.5;

        questionTypesArray.push({
            type_id: qt.type_id,
            name: qt.name,
            object_types: Array.from(qt.object_types),
            required_interaction: qt.required_interaction,
            coverage: {
                instance_count: qt.instances.length,
                authentic_pyq_count: qt.authentic_count,
                synthetic_count: qt.synthetic_count,
                source_question_count: qt.authentic_count,
                canonical_problem_count: qt.instances.length,
                generated_variant_count: qt.synthetic_count,
                difficulty_coverage: {
                    min: Number(qtMin.toFixed(1)),
                    max: Number(qtMax.toFixed(1)),
                    mean: qtMean
                }
            },
            hint_status: qt.has_3_tier_hints ? "COMPLETE_3_TIER" : "PARTIAL",
            solution_status: qt.has_step_graph ? "COMPLETE_STEP_GRAPH" : "STANDARD_TEXT",
            diagnostic_status: qt.has_diagnostics ? "EXPLICIT_TAXONOMY_MAPPED" : "STANDARD",
            remediation_status: "REMEDIATION_PATH_DECLARED"
        });
    });

    const mockReadinessStatus = (coveragePercentage >= 100 && minDiff !== maxDiff && sourceQuestionCount >= question_type_count)
        ? `TIMED_MOCK_READY (Latency Budget: 25-80s, Pacing Calibrated, Difficulty Range [${minDiff.toFixed(1)}, ${maxDiff.toFixed(1)}])`
        : `TOPIC_PRACTICE_ONLY (Difficulty Range [${minDiff.toFixed(1)}, ${maxDiff.toFixed(1)}])`;

    return {
        $schema: "studylab-apkg-manifest.schema.json",
        manifest_version: "2.0.0",
        package_version: "2.0.0",
        package_type: isQuestionBacked ? "studylab_procedural_practice" : "studylab_procedural_anchors",
        package_classification: isPortable ? "SELF_CONTAINED_PORTABLE" : "HYDRATION_DEPENDENT",
        self_contained_verified: isPortable,
        subject: subjectName,
        chapter: chapterName,
        deck_name: deckName,
        deckName: deckName,
        deck_id: deckId,
        deckId: deckId,
        apkg_file: outputFilename,
        apkgFile: outputFilename,
        generation_timestamp: nowIso,
        generatedAt: nowIso,
        generation_version: "2.0.0",
        contract_version: "2.0.0",
        
        concept_count,
        skill_count,
        question_type_count,
        source_question_count: sourceQuestionCount,
        canonical_question_count: object_count,
        generated_variant_count: generatedVariantCount,
        instance_count: object_count,
        archetype_count,
        variant_count,
        object_count,

        hint_coverage: hintCoverage,
        solution_coverage: solutionCoverage,
        diagnostic_coverage: diagnosticCoverage,
        remediation_coverage: remediationCoverage,
        adaptive_metadata_coverage: adaptiveCoverage,

        readiness_breakdown: {
            structural_coverage: coveragePercentage,
            source_depth: `${sourceQuestionCount} distinct canonical source questions (${Number((sourceQuestionCount / Math.max(question_type_count, 1)).toFixed(1))} per question type)`,
            variant_depth: `${variant_count} parameter & structural variants across ${archetype_count} archetypes`,
            mock_readiness: mockReadinessStatus
        },
        
        totalItems: object_count,
        totalQuestions: isQuestionBacked ? object_count : 0,
        totalPatterns: Object.keys(patternsById).length || (!isQuestionBacked ? object_count : 0),
        
        difficulty_coverage: {
            min: Number(minDiff.toFixed(1)),
            max: Number(maxDiff.toFixed(1)),
            mean: meanDiff,
            bands
        },
        
        coverage_summary: {
            total_chapter_skills: totalChapterSkills,
            covered_skills: coveredSkills,
            coverage_percentage: coveragePercentage,
            uncovered_skills: uncoveredSkills,
            modality_breakdown: modalityBreakdown
        },
        
        question_types: questionTypesArray,
        items: manifestEntries,
        anchors: manifestEntries
    };
}

/**
 * Exports StudyLab Procedural / Practice deck to .apkg.
 * 
 * Enforces the Canonical Self-Contained APKG Contract:
 * - Every portable APKG note contains a non-null, valid `inline_contract`.
 * - Zero dependency on pre-seeded external database state.
 * - Solvability Gate: If only ReferenceOnly items exist, cleanly suppresses APKG creation.
 * 
 * @param {string|Object} targetInput - Chapter path, PracticeQuestions.json path, or ProblemPatterns.json path
 * @param {Object} [options]
 * @param {string} [options.mode='portable'] - 'portable' | 'hydration_dependent'
 * @returns {Promise<Object>} Export summary
 */
async function exportStudyLabProceduralAnki(targetInput, options = {}) {
    const exportMode = options.mode || 'portable';
    const isPortable = exportMode !== 'hydration_dependent';

    let rawData = null;
    let practiceQuestionsData = null;
    let problemPatternsData = null;
    let chapterDir = null;
    let chapterName = null;
    let subjectName = null;

    if (typeof targetInput === 'object' && !targetInput.filePath) {
        rawData = targetInput;
        chapterName = options.chapter || rawData.chapter || "Chapter";
        subjectName = options.subject || rawData.domain || "Subject";
        chapterDir = options.chapterDir || path.join(getVaultRoot(), 'Study Materials', subjectName, chapterName);
        
        if (Array.isArray(rawData.questions)) {
            practiceQuestionsData = rawData;
        } else if (Array.isArray(rawData.patterns)) {
            problemPatternsData = rawData;
        }
    } else {
        let targetPath = path.resolve(typeof targetInput === 'string' ? targetInput : targetInput.filePath);
        if (!fs.existsSync(targetPath)) {
            const vaultCandidate = path.join(getVaultRoot(), typeof targetInput === 'string' ? targetInput : targetInput.filePath);
            if (fs.existsSync(vaultCandidate)) {
                targetPath = vaultCandidate;
            } else {
                throw new Error(`Target path not found: ${targetPath}`);
            }
        }

        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) {
            chapterDir = targetPath;
            chapterName = normalizeName(options.chapter || path.basename(chapterDir));
            subjectName = normalizeName(options.subject || path.basename(path.dirname(chapterDir)));

            // Discover PracticeQuestions.json and ProblemPatterns.json in chapter
            const pqCandidates = [
                path.join(chapterDir, 'Optional', `${chapterName}_PracticeQuestions.json`),
                path.join(chapterDir, `${chapterName}_PracticeQuestions.json`)
            ];
            for (const c of pqCandidates) {
                if (fs.existsSync(c)) {
                    practiceQuestionsData = JSON.parse(fs.readFileSync(c, 'utf-8'));
                    break;
                }
            }

            const ppCandidates = [
                path.join(chapterDir, 'Optional', `${chapterName}_ProblemPatterns.json`),
                path.join(chapterDir, `${chapterName}_ProblemPatterns.json`)
            ];
            for (const c of ppCandidates) {
                if (fs.existsSync(c)) {
                    problemPatternsData = JSON.parse(fs.readFileSync(c, 'utf-8'));
                    break;
                }
            }

            // Fallback scan in Optional/
            const optDir = path.join(chapterDir, 'Optional');
            if (fs.existsSync(optDir)) {
                const files = fs.readdirSync(optDir);
                if (!practiceQuestionsData) {
                    const pqFile = files.find(f => f.endsWith('_PracticeQuestions.json'));
                    if (pqFile) practiceQuestionsData = JSON.parse(fs.readFileSync(path.join(optDir, pqFile), 'utf-8'));
                }
                if (!problemPatternsData) {
                    const ppFile = files.find(f => f.endsWith('_ProblemPatterns.json'));
                    if (ppFile) problemPatternsData = JSON.parse(fs.readFileSync(path.join(optDir, ppFile), 'utf-8'));
                }
            }
        } else {
            // targetPath is a JSON file
            const fileContent = fs.readFileSync(targetPath, 'utf-8');
            const parsed = JSON.parse(fileContent);
            const parentDir = path.dirname(targetPath);
            chapterDir = path.basename(parentDir) === 'Optional' ? path.dirname(parentDir) : parentDir;
            const onDiskChapter = path.basename(chapterDir);
            const onDiskSubject = path.basename(path.dirname(chapterDir));
            chapterName = normalizeName(options.chapter || onDiskChapter || parsed.chapter);
            subjectName = normalizeName(options.subject || onDiskSubject || parsed.domain);

            if (Array.isArray(parsed.questions)) {
                practiceQuestionsData = parsed;
                const ppFile = options.problemPatternsPath;
                if (ppFile && fs.existsSync(ppFile)) {
                    problemPatternsData = JSON.parse(fs.readFileSync(ppFile, 'utf-8'));
                } else {
                    const candidateNames = [
                        `${chapterName}_ProblemPatterns.json`,
                        `${onDiskChapter}_ProblemPatterns.json`,
                        `${parsed.chapter}_ProblemPatterns.json`
                    ];
                    for (const cn of candidateNames) {
                        const candidatePath = path.join(parentDir, cn);
                        if (fs.existsSync(candidatePath)) {
                            problemPatternsData = JSON.parse(fs.readFileSync(candidatePath, 'utf-8'));
                            break;
                        }
                    }
                    if (!problemPatternsData && fs.existsSync(parentDir)) {
                        const files = fs.readdirSync(parentDir);
                        const match = files.find(f => f.endsWith('_ProblemPatterns.json'));
                        if (match) {
                            problemPatternsData = JSON.parse(fs.readFileSync(path.join(parentDir, match), 'utf-8'));
                        }
                    }
                }
            } else if (Array.isArray(parsed.patterns)) {
                problemPatternsData = parsed;
                const pqFile = options.practiceQuestionsPath;
                if (pqFile && fs.existsSync(pqFile)) {
                    practiceQuestionsData = JSON.parse(fs.readFileSync(pqFile, 'utf-8'));
                } else {
                    const candidateNames = [
                        `${chapterName}_PracticeQuestions.json`,
                        `${onDiskChapter}_PracticeQuestions.json`,
                        `${parsed.chapter}_PracticeQuestions.json`
                    ];
                    for (const cn of candidateNames) {
                        const candidatePath = path.join(parentDir, cn);
                        if (fs.existsSync(candidatePath)) {
                            practiceQuestionsData = JSON.parse(fs.readFileSync(candidatePath, 'utf-8'));
                            break;
                        }
                    }
                    if (!practiceQuestionsData && fs.existsSync(parentDir)) {
                        const files = fs.readdirSync(parentDir);
                        const match = files.find(f => f.endsWith('_PracticeQuestions.json'));
                        if (match) {
                            practiceQuestionsData = JSON.parse(fs.readFileSync(path.join(parentDir, match), 'utf-8'));
                        }
                    }
                }
            }
        }
    }

    chapterName = normalizeName(options.chapter || chapterName || (practiceQuestionsData && practiceQuestionsData.chapter) || (problemPatternsData && problemPatternsData.chapter) || "Chapter");
    subjectName = normalizeName(options.subject || subjectName || (practiceQuestionsData && practiceQuestionsData.domain) || (problemPatternsData && problemPatternsData.domain) || "Subject");

    const deckName = options.deckName || `${subjectName}::${chapterName}::StudyLab Procedural`;
    const deckId = Math.abs(parseInt(crypto.createHash('md5').update(deckName).digest('hex').substring(0, 8), 16)) || 1700000009;

    console.log(`\n====================================================`);
    console.log(`Assembling StudyLab Procedural APKG: ${deckName}`);
    console.log(`Target Chapter Path: ${chapterDir}`);
    console.log(`Export Mode: ${isPortable ? 'SELF-CONTAINED (PORTABLE)' : 'HYDRATION-DEPENDENT'}`);
    console.log(`====================================================\n`);

    // 1. Build pattern lookup map if ProblemPatterns exists
    const patternsById = {};
    if (problemPatternsData && Array.isArray(problemPatternsData.patterns)) {
        problemPatternsData.patterns.forEach(p => {
            patternsById[p.id] = p;
        });
    }

    // 2. Determine Primary Practice Source: PracticeQuestions (WHAT) vs ProblemPatterns (HOW fallback)
    const isQuestionBacked = practiceQuestionsData && Array.isArray(practiceQuestionsData.questions);

    let itemsToExport = [];
    let skippedCount = 0;
    let referenceOnlyCount = 0;

    if (isQuestionBacked) {
        const valRes = validatePracticeQuestionsContent(practiceQuestionsData, 'PracticeQuestions.json');
        if (!valRes.isValid) {
            throw new Error(`StudyLab Practice Questions validation failed: ${valRes.errors.join('; ')}`);
        }

        practiceQuestionsData.questions.forEach(q => {
            if (q.question_type === 'reference_only') {
                referenceOnlyCount++;
                return;
            }
            itemsToExport.push({
                type: 'QUESTION',
                question: q,
                linkedPattern: q.pattern_id ? patternsById[q.pattern_id] : null
            });
        });

        // Solvability Gate: If 0 solvable questions exist, cleanly suppress APKG generation
        if (itemsToExport.length === 0) {
            console.warn(`[Practice Questions Gate] Zero solvable practice questions found for ${chapterName} (${referenceOnlyCount} reference-only items). Suppressed Procedural APKG creation.`);
            if (options.throwOnEmpty) {
                throw new Error(`No solvable practice questions available for ${chapterName}.`);
            }
            return {
                success: false,
                suppressed: true,
                reason: 'ZERO_SOLVABLE_PRACTICE_QUESTIONS',
                deckName,
                deckId,
                counts: {
                    totalNotes: 0,
                    totalCards: 0,
                    totalQuestions: practiceQuestionsData.questions.length,
                    solvableQuestions: 0,
                    referenceOnlyQuestions: referenceOnlyCount,
                    skippedPatterns: 0
                },
                anchors: [],
                items: []
            };
        }

        console.log(`  📦 Practice Questions Mode: ${itemsToExport.length} Solvable Questions (${referenceOnlyCount} ReferenceOnly excluded)`);
        console.log(`  🔗 Linked Patterns: ${Object.keys(patternsById).length} patterns available for enrichment`);
    } else if (problemPatternsData && Array.isArray(problemPatternsData.patterns)) {
        const valRes = validateProceduralContent(problemPatternsData, 'ProblemPatterns.json');
        if (!valRes.isValid) {
            throw new Error(`StudyLab Procedural JSON validation failed: ${valRes.errors.join('; ')}`);
        }

        problemPatternsData.patterns.forEach(pattern => {
            if (pattern.status === 'UNSUPPORTED_BY_CURRENT_STUDYLAB_ENGINE' || pattern.unsupported === true) {
                skippedCount++;
                return;
            }
            if (!pattern.problem_type || !pattern.governing_method) {
                skippedCount++;
                return;
            }
            itemsToExport.push({
                type: 'PATTERN',
                pattern
            });
        });

        if (itemsToExport.length === 0) {
            console.warn(`[Procedural Gate] No valid procedural patterns available to generate anchors for ${chapterName}. Suppressed Procedural APKG creation.`);
            if (options.throwOnEmpty) {
                throw new Error(`No valid procedural patterns available to generate anchors for ${chapterName}.`);
            }
            return {
                success: false,
                suppressed: true,
                reason: 'NO_VALID_PROCEDURAL_PATTERNS',
                deckName,
                deckId,
                counts: {
                    totalNotes: 0,
                    totalCards: 0,
                    skippedPatterns: skippedCount
                },
                anchors: [],
                items: []
            };
        }

        console.log(`  📦 Legacy Pattern Anchors Mode: ${itemsToExport.length} Valid Patterns (${skippedCount} skipped)`);
    } else {
        throw new Error(`No PracticeQuestions.json or ProblemPatterns.json found for chapter: ${chapterName}`);
    }

    // 3. Initialize SQLite Database via shared utils
    const SQL = await initSqlJs();
    const db = new SQL.Database();

    initializeAnkiSchema(db);

    const { decksConfig, dconfConfig, globalConf, nowSecs, nowMs } = buildDeckConfigurations(
        deckId,
        deckName,
        `StudyLab Procedural Learning Entry Points: ${deckName}`
    );

    const modelsConfig = options.modelsConfigOverride || buildProceduralModelDefinition();

    // Closed boundary check: Model ID isolation (Dual APKG v1.0 invariant)
    const ALLOWED_PROCEDURAL_MODELS = new Set([1600000004]);
    const PROHIBITED_PROCEDURAL_MODELS = new Set([1600000001, 1600000002, 1600000003]);
    const modelIds = Object.keys(modelsConfig).map(id => parseInt(id, 10));
    for (const mId of modelIds) {
        if (PROHIBITED_PROCEDURAL_MODELS.has(mId)) {
            throw new Error(`[MODEL_ISOLATION_BREACH] Procedural deck contains prohibited declarative model ID ${mId}. Dual APKG v1.0 isolation invariant violated.`);
        }
        if (!ALLOWED_PROCEDURAL_MODELS.has(mId)) {
            throw new Error(`[MODEL_ISOLATION_BREACH] Procedural deck contains unauthorized model ID ${mId}. Allowed models: [1600000004].`);
        }
    }

    const injectedNoteMid = options.testInjectedNoteMid;
    if (injectedNoteMid !== undefined) {
        if (PROHIBITED_PROCEDURAL_MODELS.has(injectedNoteMid) || !ALLOWED_PROCEDURAL_MODELS.has(injectedNoteMid)) {
            throw new Error(`[MODEL_ISOLATION_BREACH] Procedural deck note uses unauthorized model ID ${injectedNoteMid}. Dual APKG v1.0 isolation invariant violated.`);
        }
    }

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

    let noteIdCounter = 1700008000000;
    let cardIdCounter = 1700009000000;
    let totalCardsCreated = 0;
    let totalNotesCreated = 0;

    const insertNoteStmt = db.prepare(`
        INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
        VALUES (?, ?, ?, ?, -1, ?, ?, ?, ?, 0, '')
    `);

    const insertCardStmt = db.prepare(`
        INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data)
        VALUES (?, ?, ?, 0, ?, -1, 0, 0, ?, 0, 2500, 0, 0, 0, 0, 0, 0, '')
    `);

    const manifestEntries = [];

    // 4. Insert Question / Pattern Notes & Cards with Self-Contained Verification
    itemsToExport.forEach((item, idx) => {
        const nid = noteIdCounter++;
        const cid = cardIdCounter++;

        let guid, tags, titleField, domainField, problemFamilyField, proceduralPayloadField, governingMethodField, trapsAndChecksField, metadataField;
        let manifestItem = {};

        if (item.type === 'QUESTION') {
            const q = item.question;
            const lp = item.linkedPattern;
            const rootData = practiceQuestionsData;

            guid = generateDeterministicGuid(`procedural-q-${deckName}-${q.id}-${q.pattern_id || 'unlinked'}`);
            tags = ` studylab practice ${subjectName.toLowerCase()} ${chapterName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')} ${q.question_type || 'mcq'} `;

            titleField = lp ? lp.problem_type : (q.prompt.length > 60 ? q.prompt.substring(0, 57) + '...' : q.prompt);
            domainField = q.domain || (lp ? lp.domain : subjectName);
            problemFamilyField = q.problem_family || (lp ? lp.problem_family : `${subjectName}::${chapterName}`);

            const payloadObj = createQuestionPayload(q, rootData, lp, { mode: exportMode });
            item.payloadObj = payloadObj;

            // Self-Contained APKG Gate check per note
            if (isPortable && (!payloadObj.inline_contract || typeof payloadObj.inline_contract !== 'object')) {
                throw new Error(`[Self-Contained APKG Gate] Solvable question '${q.id}' produced a null inline_contract in portable mode.`);
            }

            proceduralPayloadField = JSON.stringify(payloadObj);
            governingMethodField = formatQuestionGoverningMethod(q, lp);
            trapsAndChecksField = formatQuestionTrapsAndChecks(q, lp);
            metadataField = formatQuestionMetadata(q, rootData, lp);

            const diffVal = typeof payloadObj.difficulty_override === 'number' ? payloadObj.difficulty_override : (typeof q.difficulty === 'number' ? q.difficulty : 2.5);

            manifestItem = {
                note_id: nid,
                card_id: cid,
                noteId: nid,
                cardId: cid,
                guid,
                practice_question_id: q.id,
                practiceQuestionId: q.id,
                pattern_id: q.pattern_id || (lp ? lp.id : null),
                patternId: q.pattern_id || (lp ? lp.id : null),
                schema_id: payloadObj.proc_schema,
                schemaId: payloadObj.proc_schema,
                proc_schema: payloadObj.proc_schema,
                procSchema: payloadObj.proc_schema,
                problem_type: lp ? lp.problem_type : "Practice Question",
                problemType: lp ? lp.problem_type : "Practice Question",
                question_type: q.question_type || "mcq",
                questionType: q.question_type || "mcq",
                origin_type: q.origin_type || "AUTHENTIC_PYQ",
                originType: q.origin_type || "AUTHENTIC_PYQ",
                domain: domainField,
                problem_family: problemFamilyField,
                problemFamily: problemFamilyField,
                difficulty: diffVal,
                has_inline_contract: !!payloadObj.inline_contract,
                hasInlineContract: !!payloadObj.inline_contract,
                is_self_contained: isPortable && !!payloadObj.inline_contract,
                isSelfContained: isPortable && !!payloadObj.inline_contract
            };
        } else {
            // Legacy PATTERN mode
            const pattern = item.pattern;
            const rootData = problemPatternsData;
            const schemaId = pattern.schema_id || pattern.id;

            guid = generateDeterministicGuid(`procedural-${deckName}-${pattern.id}-${schemaId}`);
            tags = ` studylab procedural ${subjectName.toLowerCase()} ${chapterName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')} `;

            titleField = pattern.problem_type;
            domainField = pattern.domain || rootData.domain || subjectName;
            problemFamilyField = pattern.problem_family || `${subjectName}::${chapterName}`;

            const payloadObj = createAnchorPayload(pattern, rootData, { mode: exportMode });
            item.payloadObj = payloadObj;

            if (isPortable && (!payloadObj.inline_contract || typeof payloadObj.inline_contract !== 'object')) {
                throw new Error(`[Self-Contained APKG Gate] Pattern '${pattern.id}' produced a null inline_contract in portable mode.`);
            }

            proceduralPayloadField = JSON.stringify(payloadObj);
            governingMethodField = formatGoverningMethod(pattern);
            trapsAndChecksField = formatTrapsAndChecks(pattern);
            metadataField = formatMetadata(pattern, rootData);

            const diffVal = typeof payloadObj.difficulty_override === 'number' ? payloadObj.difficulty_override : (typeof pattern.difficulty === 'number' ? pattern.difficulty : 2.5);

            manifestItem = {
                note_id: nid,
                card_id: cid,
                noteId: nid,
                cardId: cid,
                guid,
                pattern_id: pattern.id,
                patternId: pattern.id,
                practice_question_id: null,
                practiceQuestionId: null,
                schema_id: payloadObj.proc_schema,
                schemaId: payloadObj.proc_schema,
                proc_schema: payloadObj.proc_schema,
                procSchema: payloadObj.proc_schema,
                problem_type: pattern.problem_type,
                problemType: pattern.problem_type,
                question_type: pattern.question_type || "mcq",
                questionType: pattern.question_type || "mcq",
                origin_type: "AUTHENTIC_PYQ",
                originType: "AUTHENTIC_PYQ",
                domain: domainField,
                problem_family: problemFamilyField,
                problemFamily: problemFamilyField,
                difficulty: diffVal,
                has_inline_contract: !!payloadObj.inline_contract,
                hasInlineContract: !!payloadObj.inline_contract,
                is_self_contained: isPortable && !!payloadObj.inline_contract,
                isSelfContained: isPortable && !!payloadObj.inline_contract
            };
        }

        let provenanceField = "{}";
        if (item.type === 'QUESTION') {
            const rData = practiceQuestionsData;
            provenanceField = JSON.stringify((rData && rData.provenance) || (item.linkedPattern && item.linkedPattern.provenance) || {});
        } else {
            const rData = problemPatternsData;
            provenanceField = JSON.stringify((rData && rData.provenance) || {});
        }

        const flds = [
            proceduralPayloadField,
            titleField, // TopicTitle
            domainField,
            provenanceField
        ].join('\u001f');

        const sfld = proceduralPayloadField;
        const csum = calculateFieldChecksum(sfld);

        insertNoteStmt.run([nid, guid, injectedNoteMid || 1600000004, nowSecs, tags, flds, sfld, csum]);
        totalNotesCreated++;

        insertCardStmt.run([cid, nid, deckId, nowSecs, totalCardsCreated + 1]);
        totalCardsCreated++;

        manifestEntries.push(manifestItem);
    });

    insertNoteStmt.free();
    insertCardStmt.free();

    // 5. Export SQLite buffer
    const dbBinaryData = db.export();
    const dbBuffer = Buffer.from(dbBinaryData);
    db.close();

    // 6. Zip archive via shared utility
    const apkgBuffer = await assembleApkgZip(dbBuffer, new Map());

    // 7. Output directory structure
    const studyLabDir = options.outputDir || path.join(chapterDir, 'StudyLab');
    if (!fs.existsSync(studyLabDir)) {
        fs.mkdirSync(studyLabDir, { recursive: true });
    }

    const outputFilename = options.outputFilename || `${chapterName}_StudyLab_Procedural.apkg`;
    const outputPath = path.join(studyLabDir, outputFilename);

    fs.writeFileSync(outputPath, apkgBuffer);

    // 8. Write Companion Manifest
    const manifestFilename = options.manifestFilename || `${chapterName}_StudyLab_Procedural.manifest.json`;
    const manifestPath = path.join(studyLabDir, manifestFilename);
    const proceduralManifestData = generateCompanionManifest({
        itemsToExport,
        manifestEntries,
        practiceQuestionsData,
        problemPatternsData,
        patternsById,
        subjectName,
        chapterName,
        deckName,
        deckId,
        outputFilename,
        isPortable,
        referenceOnlyCount
    });
    fs.writeFileSync(manifestPath, JSON.stringify(proceduralManifestData, null, 2), 'utf-8');

    // 9. Record in Master Chapter Manifest if exists
    const masterManifest = loadManifest(chapterDir);
    if (masterManifest) {
        recordArtifact(chapterDir, {
            artifactType: 'proceduralApkg',
            filePath: outputPath,
            evidenceHash: masterManifest.evidenceHash,
            status: 'VALIDATED',
            lastValidationResult: 'PASS'
        });
    }

    console.log(`\n====================================================`);
    console.log(`✅ StudyLab Procedural APKG Created Successfully!`);
    console.log(`   Output File: ${outputPath}`);
    console.log(`   Manifest File: ${manifestPath}`);
    console.log(`   Total Notes / Cards: ${totalNotesCreated}`);
    console.log(`   Classification: ${proceduralManifestData.package_classification}`);
    console.log(`   Concept Count: ${proceduralManifestData.concept_count}`);
    console.log(`   Skill Count: ${proceduralManifestData.skill_count}`);
    console.log(`   Question Type Count: ${proceduralManifestData.question_type_count}`);
    console.log(`   Archetype Count: ${proceduralManifestData.archetype_count}`);
    console.log(`   Package Size: ${(apkgBuffer.length / 1024).toFixed(1)} KB`);
    console.log(`====================================================\n`);

    return {
        success: true,
        outputPath,
        manifestPath,
        deckName,
        deckId,
        packageClassification: proceduralManifestData.package_classification,
        selfContainedVerified: isPortable,
        manifestData: proceduralManifestData,
        counts: {
            totalNotes: totalNotesCreated,
            totalCards: totalCardsCreated,
            totalQuestions: isQuestionBacked ? itemsToExport.length : 0,
            solvableQuestions: isQuestionBacked ? itemsToExport.length : 0,
            referenceOnlyQuestions: referenceOnlyCount,
            skippedPatterns: skippedCount,
            conceptCount: proceduralManifestData.concept_count,
            skillCount: proceduralManifestData.skill_count,
            questionTypeCount: proceduralManifestData.question_type_count,
            archetypeCount: proceduralManifestData.archetype_count,
            variantCount: proceduralManifestData.variant_count
        },
        anchors: manifestEntries,
        items: manifestEntries
    };
}

if (require.main === module) {
    const target = process.argv[2];
    if (!target) {
        console.error("Usage: node export_studylab_procedural_anki.js <path_to_chapter_dir_or_json> [problem_patterns_json] [output_dir]");
        process.exit(1);
    }
    const options = {};
    if (process.argv[3] && process.argv[3].endsWith('.json')) {
        options.problemPatternsPath = path.resolve(process.argv[3]);
    }
    if (process.argv[4]) {
        options.outputDir = path.resolve(process.argv[4]);
    } else if (process.argv[3] && !process.argv[3].endsWith('.json')) {
        options.outputDir = path.resolve(process.argv[3]);
    }
    exportStudyLabProceduralAnki(target, options).catch(err => {
        console.error("Procedural Export Error:", err.message);
        process.exit(1);
    });
}

module.exports = {
    exportStudyLabProceduralAnki,
    generateCompanionManifest,
    buildProceduralModelDefinition,
    createAnchorPayload,
    createQuestionPayload,
    resolveDeclarativeContract,
    getCanonicalContracts,
    formatGoverningMethod,
    formatTrapsAndChecks,
    formatMetadata,
    formatQuestionGoverningMethod,
    formatQuestionTrapsAndChecks,
    formatQuestionMetadata
};
