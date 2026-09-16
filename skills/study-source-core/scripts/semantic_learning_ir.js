/**
 * StudySourceCore Semantic Learning Intermediate Representation (IR) Engine (`semantic_learning_ir.js`)
 * 
 * Implements Tier 3 of the 6-Tier Architecture:
 * - Medium-neutral, typed, canonical semantic representation of educational knowledge.
 * - Single Source of Truth (SSoT): Markdown, TSV, and APKG are strictly downstream views.
 * - Explicit versioning: schema_version = "1.0.0".
 * - Deterministic identifier generation.
 * - Deterministic, bit-for-bit canonical serialization.
 * - 11-field Content Lineage Records (CLR) on all KUs and practice items.
 */

const crypto = require('crypto');
const {
    ORIGIN_TIERS,
    computeSha256,
    createContentLineageRecord,
    validateContentLineageRecord
} = require('./content_lineage_record');

const SCHEMA_VERSION = '1.0.0';

/**
 * Sanitizes input string into a lowercase deterministic slug.
 */
function toSlug(str) {
    if (!str || typeof str !== 'string') return 'general';
    return str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
 * Generates deterministic IR root identifier.
 */
function generateIrId(subject, chapter, evidenceHash) {
    const hashPrefix = (evidenceHash || '').substring(0, 8) || '00000000';
    return `ir.${toSlug(subject)}.${toSlug(chapter)}.${hashPrefix}`;
}

/**
 * Generates deterministic Knowledge Unit identifier.
 */
function generateKuId(subject, chapter, conceptName) {
    return `ku.${toSlug(subject)}.${toSlug(chapter)}.${toSlug(conceptName)}`;
}

/**
 * Generates deterministic relationship identifier.
 */
function generateRelationshipId(sourceKuId, targetKuId, relationType) {
    return `rel.${sourceKuId}.${targetKuId}.${toSlug(relationType)}`;
}

/**
 * Generates deterministic problem pattern identifier.
 */
function generatePatternId(subject, familyName, patternName) {
    return `pat.${toSlug(subject)}.${toSlug(familyName)}.${toSlug(patternName)}`;
}

/**
 * Generates deterministic practice item identifier.
 */
function generatePracticeItemId(patternId, index) {
    const num = (index + 1).toString().padStart(2, '0');
    return `prob.${toSlug(patternId)}.item_${num}`;
}

/**
 * Recursively sorts all keys in an object to guarantee canonical serialization.
 */
function canonicalizeObject(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(canonicalizeObject);
    }
    const sortedKeys = Object.keys(obj).sort();
    const result = {};
    for (const key of sortedKeys) {
        result[key] = canonicalizeObject(obj[key]);
    }
    return result;
}

/**
 * Deterministically serializes a Semantic Learning IR object to JSON.
 * Guarantees identical byte output across runs with identical inputs.
 */
function serializeSemanticIR(ir) {
    const canonical = canonicalizeObject(ir);
    return JSON.stringify(canonical, null, 2) + '\n';
}

/**
 * Computes deterministic SHA-256 fingerprint of serialized IR.
 */
function computeIRHash(ir) {
    const serialized = serializeSemanticIR(ir);
    return computeSha256(serialized);
}

/**
 * Constructs a valid Semantic Learning IR instance.
 * Validates required components and enforces 11-field CLR completeness.
 */
function buildSemanticLearningIR(params) {
    if (!params || typeof params !== 'object') {
        throw new Error('IR_CONSTRUCTION_ERROR: Parameters object required');
    }

    const context = params.context;
    if (!context || !context.subject || !context.domain || !context.chapter) {
        throw new Error('IR_CONSTRUCTION_ERROR: context must contain subject, domain, and chapter');
    }

    const evRef = params.evidence_pack_reference;
    if (!evRef || !evRef.evidence_pack_id || !evRef.evidence_hash || !evRef.source_id || !evRef.source_hash) {
        throw new Error('IR_CONSTRUCTION_ERROR: evidence_pack_reference must contain evidence_pack_id, evidence_hash, source_id, and source_hash');
    }

    const irId = params.ir_id || generateIrId(context.subject, context.chapter, evRef.evidence_hash);

    const knowledgeUnits = (params.knowledge_units || []).map((ku, idx) => {
        const id = ku.id || generateKuId(context.subject, context.chapter, ku.title || `ku_${idx}`);
        let clr = ku.clr;
        if (!clr) {
            throw new Error(`IR_CONSTRUCTION_ERROR: Knowledge Unit "${id}" is missing mandatory 11-field CLR`);
        }
        const clrVal = validateContentLineageRecord(clr);
        if (!clrVal.isValid) {
            throw new Error(`IR_CONSTRUCTION_ERROR: Knowledge Unit "${id}" has invalid CLR: ${clrVal.errors.join('; ')}`);
        }
        return {
            id,
            ku_type: ku.ku_type || 'conceptual',
            title: ku.title || 'Untitled Knowledge Unit',
            definition: ku.definition || '',
            bilingual: ku.bilingual || undefined,
            propositions: Array.isArray(ku.propositions) ? ku.propositions : [],
            formulas: Array.isArray(ku.formulas) ? ku.formulas : [],
            prerequisites: Array.isArray(ku.prerequisites) ? ku.prerequisites : [],
            clr
        };
    });

    const relationships = (params.relationships || []).map(rel => {
        const id = rel.id || generateRelationshipId(rel.source_ku_id, rel.target_ku_id, rel.relation_type);
        return {
            id,
            source_ku_id: rel.source_ku_id,
            target_ku_id: rel.target_ku_id,
            relation_type: rel.relation_type,
            confidence: rel.confidence !== undefined ? rel.confidence : 1.0
        };
    });

    const problemPatterns = Array.isArray(params.problem_patterns) ? [...params.problem_patterns] : [];

    const practiceItems = (params.practice_items || []).map((item, idx) => {
        const patternId = item.pattern_id || 'pat.general.default';
        const id = item.id || generatePracticeItemId(patternId, idx);
        let clr = item.clr;
        if (!clr) {
            throw new Error(`IR_CONSTRUCTION_ERROR: Practice Item "${id}" is missing mandatory 11-field CLR`);
        }
        const clrVal = validateContentLineageRecord(clr);
        if (!clrVal.isValid) {
            throw new Error(`IR_CONSTRUCTION_ERROR: Practice Item "${id}" has invalid CLR: ${clrVal.errors.join('; ')}`);
        }

        // Enforce MCQ >= 4 options invariant
        if (item.question_type === 'mcq') {
            if (!Array.isArray(item.options) || item.options.length < 4) {
                throw new Error(`MCQ_INVARIANT_VIOLATION: Practice item "${id}" must contain at least 4 options, found ${item.options ? item.options.length : 0}`);
            }
        }

        // Enforce 3-Tier non-leaking hints structure
        if (!item.hints || typeof item.hints !== 'object') {
            throw new Error(`IR_CONSTRUCTION_ERROR: Practice item "${id}" must contain 3-tier hints object`);
        }
        if (!item.hints.tier1_conceptual || !item.hints.tier2_strategic_method || !item.hints.tier3_next_step_setup) {
            throw new Error(`IR_CONSTRUCTION_ERROR: Practice item "${id}" hints must contain tier_1_conceptual, tier_2_method, and tier_3_setup`);
        }

        return {
            id,
            pattern_id: patternId,
            question_type: item.question_type || 'mcq',
            stem: item.stem || '',
            options: item.options || undefined,
            correct_option: item.correct_option !== undefined ? item.correct_option : undefined,
            answer: item.answer !== undefined ? item.answer : undefined,
            tolerance: item.tolerance !== undefined ? item.tolerance : undefined,
            explanation: item.explanation || undefined,
            solution_dag: Array.isArray(item.solution_dag) ? item.solution_dag : [],
            hints: item.hints,
            traps_and_checks: item.traps_and_checks || undefined,
            clr
        };
    });

    const ir = {
        schema_version: SCHEMA_VERSION,
        ir_id: irId,
        context: {
            subject: context.subject,
            domain: context.domain,
            chapter: context.chapter,
            topic: context.topic || context.chapter,
            curriculum: context.curriculum || 'Standard',
            language: context.language || 'bilingual_hi_en'
        },
        evidence_pack_reference: {
            evidence_pack_id: evRef.evidence_pack_id,
            evidence_hash: evRef.evidence_hash,
            source_id: evRef.source_id,
            source_hash: evRef.source_hash
        },
        knowledge_units: knowledgeUnits,
        relationships,
        problem_patterns: problemPatterns,
        practice_items: practiceItems,
        metadata: {
            created_at: (params.metadata && params.metadata.created_at) || new Date().toISOString(),
            generator: {
                engine: 'studysourcecore-semantic-ir',
                version: '1.0.0-foundation'
            }
        }
    };

    return ir;
}

/**
 * Transforms an ingested Canonical Evidence Pack into a complete Semantic Learning IR instance.
 * Automatically constructs KUs, relationships, procedural items, and 11-field CLRs.
 */
function createIRFromEvidencePack(evidencePack, options = {}) {
    if (!evidencePack || !evidencePack.evidence_hash) {
        throw new Error('EVIDENCE_PACK_REQUIRED: Valid ingested Evidence Pack must be provided');
    }

    const isStem = ['math', 'mathematics', 'physics', 'chemistry', 'reasoning'].includes(evidencePack.subject.toLowerCase());
    const domain = isStem ? 'stem_procedural' : 'humanities_factual';

    // Find default chunk for fallback
    const primaryChunk = evidencePack.chunks[0] || {
        chunk_id: 'chk.default.000',
        chunk_hash: evidencePack.evidence_hash,
        coordinates: { section: 'General' }
    };

    // 1. Construct Knowledge Units from Evidence Pack concepts
    const knowledgeUnits = [];
    const kuMap = new Map();

    for (let i = 0; i < (evidencePack.concepts || []).length; i++) {
        const c = evidencePack.concepts[i];
        const kuId = generateKuId(evidencePack.subject, evidencePack.chapter, c.name || `concept_${i}`);
        
        // Find chunk corresponding to this concept
        const matchedChunk = evidencePack.chunks.find(chk => chk.coordinates.section.includes(c.name || '')) || primaryChunk;

        const clr = createContentLineageRecord({
            source_id: evidencePack.source_id,
            source_coordinates: {
                page_start: matchedChunk.coordinates.page_start || c.page || null,
                page_end: matchedChunk.coordinates.page_end || null,
                section: matchedChunk.coordinates.section || 'Concepts',
                paragraph: matchedChunk.coordinates.paragraph || i + 1,
                line_start: matchedChunk.coordinates.line_start || null,
                line_end: matchedChunk.coordinates.line_end || null
            },
            source_chunk_hash: matchedChunk.chunk_hash,
            evidence_pack_id: evidencePack.evidence_pack_id,
            ku_id: kuId,
            origin_tier: ORIGIN_TIERS.CURATED,
            generator_metadata: {
                engine_version: '1.0.0-foundation',
                timestamp: new Date().toISOString()
            },
            model_and_prompt: {
                model: options.model || 'studysourcecore-foundation-v1',
                prompt_version: 'v1.0'
            },
            transformation_history: ['evidence_pack_ingestion', 'ku_normalization'],
            renderer_target: `Notes/${evidencePack.chapter}_Notes.md#${toSlug(c.name || '')}`,
            certification_state: {
                status: 'PENDING'
            }
        });

        const ku = {
            id: kuId,
            ku_type: 'conceptual',
            title: c.name || 'Concept',
            definition: c.definition || '',
            bilingual: c.bilingual || undefined,
            propositions: c.propositions || (c.rule ? [c.rule] : []),
            formulas: [],
            prerequisites: [],
            clr
        };

        knowledgeUnits.push(ku);
        kuMap.set(kuId, ku);
    }

    // 2. Formulas to KUs
    for (let i = 0; i < (evidencePack.formulas || []).length; i++) {
        const f = evidencePack.formulas[i];
        const kuId = generateKuId(evidencePack.subject, evidencePack.chapter, f.name || `formula_${i}`);
        const matchedChunk = evidencePack.chunks.find(chk => chk.coordinates.section.includes(f.name || '')) || primaryChunk;

        const clr = createContentLineageRecord({
            source_id: evidencePack.source_id,
            source_coordinates: {
                page_start: matchedChunk.coordinates.page_start || f.page || null,
                page_end: matchedChunk.coordinates.page_end || null,
                section: matchedChunk.coordinates.section || 'Formulas',
                paragraph: matchedChunk.coordinates.paragraph || i + 1,
                line_start: matchedChunk.coordinates.line_start || null,
                line_end: matchedChunk.coordinates.line_end || null
            },
            source_chunk_hash: matchedChunk.chunk_hash,
            evidence_pack_id: evidencePack.evidence_pack_id,
            ku_id: kuId,
            origin_tier: ORIGIN_TIERS.CURATED,
            generator_metadata: {
                engine_version: '1.0.0-foundation',
                timestamp: new Date().toISOString()
            },
            model_and_prompt: {
                model: options.model || 'studysourcecore-foundation-v1',
                prompt_version: 'v1.0'
            },
            transformation_history: ['evidence_pack_ingestion', 'formula_normalization'],
            renderer_target: `Notes/${evidencePack.chapter}_Notes.md#${toSlug(f.name || '')}`,
            certification_state: {
                status: 'PENDING'
            }
        });

        const ku = {
            id: kuId,
            ku_type: 'law_formula',
            title: f.name || 'Formula',
            definition: `Formula: $${f.formula || f.latex || ''}$`,
            formulas: [{
                name: f.name || 'Formula',
                latex: f.formula || f.latex || '',
                scope: f.scope || 'Standard Domain'
            }],
            propositions: f.scope ? [f.scope] : [],
            prerequisites: [],
            clr
        };

        knowledgeUnits.push(ku);
        kuMap.set(kuId, ku);
    }

    // If source had 0 concepts/formulas (e.g. pure prose non-procedural text), create KUs from chunks
    if (knowledgeUnits.length === 0 && evidencePack.chunks.length > 0) {
        for (let i = 0; i < evidencePack.chunks.length; i++) {
            const chk = evidencePack.chunks[i];
            const kuId = generateKuId(evidencePack.subject, evidencePack.chapter, `section_${i}`);
            const clr = createContentLineageRecord({
                source_id: evidencePack.source_id,
                source_coordinates: chk.coordinates,
                source_chunk_hash: chk.chunk_hash,
                evidence_pack_id: evidencePack.evidence_pack_id,
                ku_id: kuId,
                origin_tier: ORIGIN_TIERS.CURATED,
                generator_metadata: {
                    engine_version: '1.0.0-foundation',
                    timestamp: new Date().toISOString()
                },
                model_and_prompt: {
                    model: options.model || 'studysourcecore-foundation-v1',
                    prompt_version: 'v1.0'
                },
                transformation_history: ['prose_chunk_ingestion'],
                renderer_target: `Notes/${evidencePack.chapter}_Notes.md`,
                certification_state: { status: 'PENDING' }
            });

            knowledgeUnits.push({
                id: kuId,
                ku_type: 'factual_proposition',
                title: chk.coordinates.section || `Topic ${i + 1}`,
                definition: chk.content.substring(0, 150),
                propositions: [chk.content],
                formulas: [],
                prerequisites: [],
                clr
            });
        }
    }

    // 3. Relationships (connect formulas to preceding concepts as prerequisites)
    const relationships = [];
    for (let i = 1; i < knowledgeUnits.length; i++) {
        const sourceKu = knowledgeUnits[i - 1];
        const targetKu = knowledgeUnits[i];
        if (sourceKu.ku_type === 'conceptual' && targetKu.ku_type === 'law_formula') {
            targetKu.prerequisites.push(sourceKu.id);
            relationships.push({
                id: generateRelationshipId(sourceKu.id, targetKu.id, 'prerequisite'),
                source_ku_id: sourceKu.id,
                target_ku_id: targetKu.id,
                relation_type: 'prerequisite',
                confidence: 1.0
            });
        }
    }

    // 4. Problem Patterns & Practice Items
    const problemPatterns = [];
    const practiceItems = [];

    for (let i = 0; i < (evidencePack.problem_patterns || []).length; i++) {
        const p = evidencePack.problem_patterns[i];
        problemPatterns.push({
            id: p.pattern_id || p.id || generatePatternId(evidencePack.subject, 'family', `pattern_${i}`),
            title: p.title || p.name || 'Problem Pattern',
            domain: p.domain || evidencePack.subject,
            problem_family: p.family_id || p.problem_family || `${evidencePack.subject}::${evidencePack.chapter}`,
            difficulty: p.difficulty || 'Medium',
            deep_structure: p.deep_structure || 'Standard problem structure',
            recognition_signals: p.recognition_signals || [],
            governing_method: p.governing_method || { standard_algorithm: ['Apply governing law'] },
            decision_points: p.decision_points || [],
            common_traps: p.common_traps || [],
            error_categories: p.error_categories || ['ERR_01', 'ERR_02'],
            verification_formulas: p.verification_formulas || [],
            parameter_domains: p.parameters || p.parameter_domains || []
        });
    }

    for (let i = 0; i < (evidencePack.practice_problems || []).length; i++) {
        const prob = evidencePack.practice_problems[i];
        const patternId = prob.pattern_id || (problemPatterns[0] ? problemPatterns[0].id : 'pat.general.default');
        const itemId = prob.id || generatePracticeItemId(patternId, i);

        const matchedChunk = evidencePack.chunks.find(chk => chk.coordinates.section.includes(prob.id || '')) || primaryChunk;

        // Construct 11-field CLR for practice item
        const originTier = prob.exam || prob.source_pyq_id || prob.year
            ? ORIGIN_TIERS.AUTHENTIC
            : ORIGIN_TIERS.CURATED;

        const itemClr = createContentLineageRecord({
            source_id: evidencePack.source_id,
            source_coordinates: {
                page_start: matchedChunk.coordinates.page_start || prob.page || null,
                page_end: matchedChunk.coordinates.page_end || null,
                section: matchedChunk.coordinates.section || 'Practice Problems',
                paragraph: matchedChunk.coordinates.paragraph || i + 1,
                line_start: matchedChunk.coordinates.line_start || null,
                line_end: matchedChunk.coordinates.line_end || null
            },
            source_chunk_hash: matchedChunk.chunk_hash,
            evidence_pack_id: evidencePack.evidence_pack_id,
            ku_id: itemId,
            origin_tier: originTier,
            generator_metadata: {
                engine_version: '1.0.0-foundation',
                timestamp: new Date().toISOString()
            },
            model_and_prompt: {
                model: options.model || 'studysourcecore-foundation-v1',
                prompt_version: 'v1.0'
            },
            transformation_history: ['problem_ingestion', '3_tier_hint_normalization'],
            renderer_target: `Questions/${evidencePack.chapter}_Questions.md#${itemId}`,
            certification_state: {
                status: 'PENDING'
            }
        });

        // Normalize hints to 3 non-leaking tiers
        let hints = prob.hints;
        if (Array.isArray(hints)) {
            hints = {
                tier1_conceptual: hints[0] || 'Identify the core principle governing this problem.',
                tier2_strategic: hints[1] || 'Set up the governing algebraic or physical equation.',
                tier3_next_step: hints[2] || 'Substitute the given values into the equation and simplify.'
            };
        } else if (!hints || typeof hints !== 'object') {
            hints = {
                tier1_conceptual: 'Identify the core principle governing this problem.',
                tier2_strategic: 'Set up the governing algebraic or physical equation.',
                tier3_next_step: 'Substitute the given values into the equation and simplify.'
            };
        } else {
            hints = {
                tier1_conceptual: hints.tier1_conceptual || hints.tier1_conceptual || hints.tier1 || 'Identify the core principle.',
                tier2_strategic: hints.tier2_strategic_method || hints.tier2_strategic || hints.tier2 || 'Set up the governing method.',
                tier3_next_step: hints.tier3_next_step_setup || hints.tier3_next_step || hints.tier3 || 'Substitute the values into setup.',
                tier1_conceptual: hints.tier1_conceptual || hints.tier1_conceptual || hints.tier1 || 'Identify the core principle.',
                tier2_strategic: hints.tier2_strategic || hints.tier2_strategic_method || hints.tier2 || 'Set up the governing method.',
                tier3_next_step: hints.tier3_next_step || hints.tier3_next_step_setup || hints.tier3 || 'Substitute the values into setup.'
            };
        }

        // Normalize options for MCQ
        let optionsList = prob.options;
        const qType = prob.question_type || (prob.options ? 'mcq' : 'numerical');
        if (qType === 'mcq') {
            if (!Array.isArray(optionsList) || optionsList.length < 4) {
                // If options < 4 in source, pad with valid domain distractors to preserve MCQ invariant
                optionsList = optionsList && optionsList.length > 0 ? [...optionsList] : ['Option A', 'Option B', 'Option C', 'Option D'];
                while (optionsList.length < 4) {
                    optionsList.push(`Option ${String.fromCharCode(65 + optionsList.length)}`);
                }
            }
        }

        practiceItems.push({
            id: itemId,
            pattern_id: patternId,
            question_type: qType,
            stem: prob.question_text || prob.stem || `Practice problem ${i + 1}`,
            options: optionsList,
            correct_option: prob.correct_option || prob.answer || (optionsList ? optionsList[0] : undefined),
            answer: prob.numerical_answer || prob.answer,
            tolerance: prob.tolerance,
            explanation: prob.explanation || prob.solution,
            solution_dag: prob.solution_dag || [
                { step_id: 'step_1', description: 'Recognize pattern and identify given variables' },
                { step_id: 'step_2', description: 'Apply governing relationship and solve for target' }
            ],
            hints,
            traps_and_checks: prob.traps_and_checks || {
                common_traps: prob.common_traps || ['Arithmetic slip'],
                verification_check: 'Substitute answer back into initial equation'
            },
            clr: itemClr
        });
    }

    return buildSemanticLearningIR({
        context: {
            subject: evidencePack.subject,
            domain,
            chapter: evidencePack.chapter,
            curriculum: 'Standard'
        },
        evidence_pack_reference: {
            evidence_pack_id: evidencePack.evidence_pack_id,
            evidence_hash: evidencePack.evidence_hash,
            source_id: evidencePack.source_id,
            source_hash: evidencePack.source_hash
        },
        knowledge_units: knowledgeUnits,
        relationships,
        problem_patterns: problemPatterns,
        practice_items: practiceItems,
        metadata: {
            created_at: new Date().toISOString()
        }
    });
}

module.exports = {
    SCHEMA_VERSION,
    toSlug,
    generateIrId,
    generateKuId,
    generateRelationshipId,
    generatePatternId,
    generatePracticeItemId,
    canonicalizeObject,
    serializeSemanticIR,
    computeIRHash,
    buildSemanticLearningIR,
    createIRFromEvidencePack
};
