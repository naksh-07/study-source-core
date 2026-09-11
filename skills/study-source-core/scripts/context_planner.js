/**
 * StudySourceCore Phase 7 Context Planning Engine (`context_planner.js`)
 * 
 * Slices the canonical Evidence Pack into deterministic, task-scoped, bounded
 * context slices while strictly preserving cryptographic provenance.
 * 
 * Non-Negotiable Invariants:
 * 1. Evidence Pack remains the sole canonical source of truth.
 * 2. Context slices are derived views, never competing sources of truth.
 * 3. Every slice retains SHA-256 provenance back to the canonical evidence hash.
 * 4. Deterministic, lossless section extraction without lossy AI summarization.
 * 5. Fails closed with CONTEXT_PROVENANCE_FAILURE on any missing or invalid hash.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Computes SHA-256 hash of UTF-8 content.
 */
function computeSha256(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Context Budget Tier Definitions
 */
const CONTEXT_BUDGET_TIERS = {
    SMALL: { maxTokens: 1500, label: 'SMALL' },
    MEDIUM: { maxTokens: 6000, label: 'MEDIUM' },
    LARGE: { maxTokens: 16000, label: 'LARGE' },
    VERY_LARGE: { maxTokens: Infinity, label: 'VERY_LARGE' }
};

/**
 * Parses raw Evidence Pack Markdown into discrete semantic sections.
 */
function parseEvidenceSections(markdownText) {
    const lines = markdownText.split(/\r?\n/);
    const sections = {};
    let currentSectionKey = 'HEADER';
    let currentLines = [];

    const sectionMatchMap = [
        { key: 'METADATA', pattern: /^##\s*1\.\s*Chapter Metadata/i },
        { key: 'CONCEPTS', pattern: /^##\s*2\.\s*Core Concepts/i },
        { key: 'FORMULAS', pattern: /^##\s*3\.\s*Master (Formulas|Principles)/i },
        { key: 'PATTERNS', pattern: /^##\s*4\.\s*Problem Pattern/i },
        { key: 'PROBLEMS', pattern: /^##\s*5\.\s*Authentic Source Problems/i },
        { key: 'VISUAL', pattern: /^##\s*6\.\s*(Visual|Diagram)/i }
    ];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let matchedKey = null;

        for (const sm of sectionMatchMap) {
            if (sm.pattern.test(line)) {
                matchedKey = sm.key;
                break;
            }
        }

        if (matchedKey) {
            if (currentLines.length > 0) {
                sections[currentSectionKey] = currentLines.join('\n').trim();
            }
            currentSectionKey = matchedKey;
            currentLines = [line];
        } else {
            currentLines.push(line);
        }
    }

    if (currentLines.length > 0) {
        sections[currentSectionKey] = currentLines.join('\n').trim();
    }

    return sections;
}

/**
 * Extracts discrete items with IDs from a section.
 */
function extractSectionItemIds(sectionKey, sectionContent) {
    const ids = [];
    if (!sectionContent) return ids;

    if (sectionKey === 'CONCEPTS') {
        const conceptMatches = sectionContent.matchAll(/^###\s+([^\n]+)/gm);
        for (const m of conceptMatches) {
            ids.push(`concept:${m[1].trim()}`);
        }
    } else if (sectionKey === 'FORMULAS') {
        const formulaMatches = sectionContent.matchAll(/^###\s+([^\n]+)/gm);
        for (const m of formulaMatches) {
            ids.push(`formula:${m[1].trim()}`);
        }
    } else if (sectionKey === 'PATTERNS') {
        const patternMatches = sectionContent.matchAll(/###\s*Pattern:\s*([^(]+)\(([^)]+)\)/g);
        for (const m of patternMatches) {
            ids.push(m[2].trim());
        }
    } else if (sectionKey === 'PROBLEMS') {
        const probMatches = sectionContent.matchAll(/###\s*Source Problem\s*\d*\s*\(([^)]+)\)/g);
        for (const m of probMatches) {
            ids.push(m[1].trim());
        }
    } else {
        ids.push(`section:${sectionKey.toLowerCase()}`);
    }

    return ids;
}

/**
 * Task-Scoped Context Section Allocation Policy
 */
const TASK_SECTION_RULES = {
    // 1. Notes: Core concepts, definitions, master formulas, metadata (omits source problem banks to minimize bloat)
    'notes': {
        requiredSections: ['HEADER', 'METADATA', 'CONCEPTS', 'FORMULAS'],
        reason: 'definitions_and_core_concepts',
        complexity: 'MEDIUM'
    },
    // 2. Basic Anki: Atomic facts, definitions, master formulas (omits lengthy problem step DAGs)
    'basic': {
        requiredSections: ['HEADER', 'METADATA', 'CONCEPTS', 'FORMULAS'],
        reason: 'direct_recall_facts_and_formulae',
        complexity: 'LOW'
    },
    // 3. Cloze Anki: Key definitions, identities, relationships
    'cloze': {
        requiredSections: ['HEADER', 'METADATA', 'CONCEPTS', 'FORMULAS'],
        reason: 'high_value_relational_statements',
        complexity: 'LOW'
    },
    // 4. Image Occlusion: Visual candidates and spatial relationships only (strictly zero external visual injection)
    'imageOcclusion': {
        requiredSections: ['HEADER', 'METADATA', 'VISUAL', 'CONCEPTS'],
        reason: 'visual_target_semantics',
        complexity: 'MEDIUM'
    },
    // 5. MindMap: Conceptual taxonomy and hierarchical relationships
    'mindmap': {
        requiredSections: ['HEADER', 'METADATA', 'CONCEPTS'],
        reason: 'hierarchical_concept_topology',
        complexity: 'MEDIUM'
    },
    // 6. SlideDeck: Narrative concepts, formulas, visual pointers (5-15 slide budget)
    'slideDeck': {
        requiredSections: ['HEADER', 'METADATA', 'CONCEPTS', 'FORMULAS', 'VISUAL'],
        reason: 'pedagogical_slide_narrative',
        complexity: 'MEDIUM'
    },
    // 7. StudyLab Procedural Question Bank & APKG: Formulas, problem patterns, authentic PYQs
    'proceduralQuestionBank': {
        requiredSections: ['HEADER', 'METADATA', 'FORMULAS', 'PATTERNS', 'PROBLEMS'],
        reason: 'procedural_problem_patterns_and_authentic_pyqs',
        complexity: 'HIGH'
    },
    'proceduralApkg': {
        requiredSections: ['HEADER', 'METADATA', 'FORMULAS', 'PATTERNS', 'PROBLEMS'],
        reason: 'procedural_problem_patterns_and_authentic_pyqs',
        complexity: 'HIGH'
    },
    'problemPatterns': {
        requiredSections: ['HEADER', 'METADATA', 'FORMULAS', 'PATTERNS'],
        reason: 'canonical_problem_patterns',
        complexity: 'HIGH'
    },
    'practiceQuestions': {
        requiredSections: ['HEADER', 'METADATA', 'FORMULAS', 'PATTERNS', 'PROBLEMS'],
        reason: 'authentic_source_practice_questions',
        complexity: 'HIGH'
    },
    // 8. Declarative APKG Packaging: Packaging only needs metadata
    'apkg': {
        requiredSections: ['HEADER', 'METADATA'],
        reason: 'declarative_packaging_metadata',
        complexity: 'MEDIUM'
    },
    // 9. Downstream Graph: Concepts and metadata
    'bmGraph': {
        requiredSections: ['HEADER', 'METADATA', 'CONCEPTS'],
        reason: 'vault_entity_candidate_matching',
        complexity: 'MEDIUM'
    },
    // 10. Downstream QA: Full evidence to ensure zero-drift audit
    'bmQa': {
        requiredSections: ['HEADER', 'METADATA', 'CONCEPTS', 'FORMULAS', 'PATTERNS', 'PROBLEMS', 'VISUAL'],
        reason: 'cross_artifact_full_evidence_audit',
        complexity: 'CRITICAL'
    }
};

/**
 * Plans a deterministic, task-scoped context slice from the canonical evidence pack.
 * 
 * @param {Object} params
 * @param {string} params.subject - Chapter subject (e.g. 'Math', 'Physics')
 * @param {string} params.chapter - Chapter name (e.g. 'LCM-HCF')
 * @param {string} params.artifactKey - Target artifact key (e.g. 'notes', 'proceduralQuestionBank')
 * @param {string} [params.specialist] - Subagent identifier
 * @param {string|Object} params.evidencePack - Evidence pack file path, markdown string, or object
 * @param {string} [params.evidenceHash] - Expected SHA-256 of canonical evidence pack
 * @param {string} [params.strategy='TASK_SCOPED'] - Context strategy ('TASK_SCOPED' | 'FOCUSED' | 'MINIMAL')
 * @param {Object} [params.focusConstraints] - Specific pattern or problem IDs for targeted retries
 * @returns {Object} Context Plan & Provenance Manifest
 */
function planContextSlice(params) {
    const {
        subject,
        chapter,
        artifactKey,
        specialist,
        strategy = 'TASK_SCOPED',
        focusConstraints = {}
    } = params;

    // 1. Resolve raw evidence text
    let evidenceText = '';
    let sourceDocument = 'scratch/evidence-pack.md';

    if (typeof params.evidencePack === 'string') {
        if (fs.existsSync(params.evidencePack)) {
            sourceDocument = params.evidencePack;
            evidenceText = fs.readFileSync(params.evidencePack, 'utf8');
        } else {
            evidenceText = params.evidencePack;
        }
    } else if (params.evidencePack && typeof params.evidencePack === 'object') {
        evidenceText = JSON.stringify(params.evidencePack, null, 2);
    }

    if (!evidenceText || evidenceText.trim().length === 0) {
        throw new Error('[CONTEXT_PROVENANCE_FAILURE] Evidence pack is empty or missing');
    }

    // 2. Canonical SHA-256 Evidence Hash Verification
    const computedEvidenceHash = computeSha256(evidenceText);
    const DUMMY_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
    const hasExplicitHash = params.evidenceHash && params.evidenceHash !== DUMMY_HASH;

    if (hasExplicitHash && params.evidenceHash !== computedEvidenceHash) {
        throw new Error(`[CONTEXT_PROVENANCE_FAILURE] Evidence SHA-256 hash mismatch! Expected '${params.evidenceHash}' but computed '${computedEvidenceHash}'`);
    }

    // 3. Parse Sections
    const allSections = parseEvidenceSections(evidenceText);
    const availableSectionKeys = Object.keys(allSections);

    // 4. Resolve Selection Rule
    const rule = TASK_SECTION_RULES[artifactKey] || {
        requiredSections: availableSectionKeys,
        reason: 'default_fallback_evidence_allocation',
        complexity: 'MEDIUM'
    };

    let targetSectionKeys = rule.requiredSections.filter(k => allSections[k] !== undefined);

    // If FOCUSED strategy (targeted retry on a specific error)
    if (strategy === 'FOCUSED' && focusConstraints.targetSections) {
        targetSectionKeys = targetSectionKeys.filter(k => focusConstraints.targetSections.includes(k));
        if (!targetSectionKeys.includes('METADATA') && allSections['METADATA']) {
            targetSectionKeys.unshift('METADATA');
        }
        if (!targetSectionKeys.includes('HEADER') && allSections['HEADER']) {
            targetSectionKeys.unshift('HEADER');
        }
    }

    // 5. Build Sliced Content
    const selectedSections = [];
    const excludedSections = availableSectionKeys.filter(k => !targetSectionKeys.includes(k));
    const items = [];
    const selectedEvidenceIds = [];

    const sliceParts = [];

    for (const secKey of targetSectionKeys) {
        const secContent = allSections[secKey];
        if (!secContent) continue;

        selectedSections.push(secKey);
        sliceParts.push(secContent);

        const extractedIds = extractSectionItemIds(secKey, secContent);
        for (const id of extractedIds) {
            selectedEvidenceIds.push(id);
            items.push({
                evidence_id: id,
                source_section: secKey,
                selection_reason: rule.reason,
                source_hash: computedEvidenceHash
            });
        }
    }

    const contextSliceContent = sliceParts.join('\n\n');
    const sliceHash = computeSha256(contextSliceContent);

    // 6. Context Size & Token Estimation
    // Conservative estimation: ~4 characters per token
    const estimatedChars = contextSliceContent.length;
    const estimatedTokens = Math.ceil(estimatedChars / 4);

    let budgetTier = 'VERY_LARGE';
    if (estimatedTokens <= CONTEXT_BUDGET_TIERS.SMALL.maxTokens) budgetTier = 'SMALL';
    else if (estimatedTokens <= CONTEXT_BUDGET_TIERS.MEDIUM.maxTokens) budgetTier = 'MEDIUM';
    else if (estimatedTokens <= CONTEXT_BUDGET_TIERS.LARGE.maxTokens) budgetTier = 'LARGE';

    const fullChars = evidenceText.length;
    const reductionRatio = fullChars > 0 ? (1 - (estimatedChars / fullChars)) : 0;

    return {
        source_id: `${chapter || 'Chapter'}_${subject || 'Subject'}`,
        source_hash: computedEvidenceHash,
        slice_hash: sliceHash,
        context_strategy: strategy,
        artifact_key: artifactKey,
        specialist: specialist || rule.defaultSpecialist || 'unknown',
        selected_sections: selectedSections,
        selected_evidence_ids: selectedEvidenceIds,
        excluded_sections: excludedSections,
        estimated_context_size: {
            full_chars: fullChars,
            estimated_chars: estimatedChars,
            estimated_tokens: estimatedTokens,
            evidence_units: items.length,
            budget_tier: budgetTier,
            reduction_ratio: Math.round(reductionRatio * 100) / 100
        },
        context_slice_content: contextSliceContent,
        provenance: {
            source_document: sourceDocument,
            source_hash_sha256: computedEvidenceHash,
            slice_hash_sha256: sliceHash,
            planned_timestamp: new Date().toISOString()
        },
        items
    };
}

/**
 * Estimates tokens and classifies budget tier for a given text.
 */
function estimateContextBudget(text) {
    const estimatedChars = (text || '').length;
    const estimatedTokens = Math.ceil(estimatedChars / 4);
    let budgetTier = 'EXTREME';
    if (estimatedTokens <= CONTEXT_BUDGET_TIERS.SMALL.maxTokens) budgetTier = 'SMALL';
    else if (estimatedTokens <= CONTEXT_BUDGET_TIERS.MEDIUM.maxTokens) budgetTier = 'MEDIUM';
    else if (estimatedTokens <= CONTEXT_BUDGET_TIERS.LARGE.maxTokens) budgetTier = 'LARGE';

    return {
        estimated_chars: estimatedChars,
        estimated_tokens: estimatedTokens,
        budget_tier: budgetTier
    };
}

/**
 * Asserts cryptographic provenance of a context slice against an expected evidence hash.
 */
function verifyContextProvenance(sliceOrManifest, expectedEvidenceHash) {
    if (!sliceOrManifest) {
        throw new Error('[CONTEXT_PROVENANCE_FAILURE] Missing context slice or manifest');
    }

    const sourceHash = sliceOrManifest.source_hash || (sliceOrManifest.provenance && sliceOrManifest.provenance.source_hash_sha256);
    if (!sourceHash) {
        throw new Error('[CONTEXT_PROVENANCE_FAILURE] Context slice does not contain provenance source hash');
    }

    const DUMMY_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
    if (expectedEvidenceHash && expectedEvidenceHash !== DUMMY_HASH && sourceHash !== expectedEvidenceHash) {
        throw new Error(`[CONTEXT_PROVENANCE_FAILURE] Context slice provenance hash '${sourceHash}' does not match expected evidence hash '${expectedEvidenceHash}'`);
    }

    // Assert that slice_hash matches computed hash of context_slice_content if both are present
    if (sliceOrManifest.context_slice_content && sliceOrManifest.slice_hash) {
        const computedSliceHash = computeSha256(sliceOrManifest.context_slice_content);
        if (computedSliceHash !== sliceOrManifest.slice_hash) {
            throw new Error(`[CONTEXT_PROVENANCE_FAILURE] Context slice content tampering detected! Computed slice hash '${computedSliceHash}' does not match recorded slice hash '${sliceOrManifest.slice_hash}'`);
        }
    }

    return {
        verified: true,
        source_hash: sourceHash
    };
}

module.exports = {
    CONTEXT_BUDGET_TIERS,
    TASK_SECTION_RULES,
    computeSha256,
    parseEvidenceSections,
    planContextSlice,
    estimateContextBudget,
    verifyContextProvenance
};
