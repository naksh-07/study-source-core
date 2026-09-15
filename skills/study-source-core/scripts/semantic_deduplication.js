/**
 * StudySourceCore Semantic Deduplication & Cross-Artifact Policy Engine (`semantic_deduplication.js`)
 * 
 * Milestone 2 — Stream 1: Knowledge Reservation, Deduplication, and Subject Boundary.
 * 
 * Core Capabilities:
 * 1. Classifies pairs and sets of KUs as SAME_KU, RELATED_KU, or DIFFERENT_KU.
 * 2. Multi-tier semantic similarity: normalized concept tokens, proposition overlap, n-gram & Jaccard analysis.
 * 3. Enforces cross-artifact duplication control: prevents identical factual propositions
 *    from being emitted redundantly as independent cards in both Basic and Cloze without pedagogical justification.
 * 4. Preserves legitimate STEM procedural variants (1 Pattern != 1 Question).
 */

const {
    ORIGIN_TIERS,
    computeSha256
} = require('./content_lineage_record');

const {
    normalizePropositionText,
    generateCanonicalSemanticIdentity,
    getReservationRegistry,
    toSlug
} = require('./ku_reservation_engine');

/**
 * Relation Classification Constants
 */
const RELATION_TYPES = {
    SAME_KU: 'SAME_KU',
    RELATED_KU: 'RELATED_KU',
    DIFFERENT_KU: 'DIFFERENT_KU'
};

/**
 * Stopwords for English and Hindi educational content
 */
const STOP_WORDS = new Set([
    // English
    'the', 'is', 'are', 'was', 'were', 'of', 'in', 'and', 'to', 'a', 'an', 'that', 'for',
    'with', 'on', 'at', 'by', 'from', 'as', 'into', 'like', 'through', 'after', 'over',
    'between', 'out', 'against', 'during', 'without', 'before', 'under', 'around', 'among',
    'what', 'which', 'who', 'whom', 'this', 'these', 'those', 'it', 'its', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'but', 'if', 'or', 'because',
    // Hindi
    'का', 'की', 'के', 'में', 'पर', 'है', 'हैं', 'था', 'थी', 'थे', 'होता', 'होती', 'होते',
    'एक', 'से', 'को', 'द्वारा', 'और', 'या', 'तथा', 'एवं', 'जो', 'जिसमें', 'जिसके', 'होने',
    'करना', 'करता', 'करती', 'करते', 'यह', 'वह', 'इस', 'उस', 'भी', 'ने', 'तो', 'ही'
]);

/**
 * Common educational concept synonyms
 */
const CONCEPT_SYNONYMS = {
    'multiplied': 'times',
    'multiply': 'times',
    'divided': 'div',
    'divide': 'div',
    'equals': 'equal',
    'equate': 'equal',
    'definition': 'def',
    'formula': 'form'
};

/**
 * Lightweight stemming for English educational words
 */
function stemWord(word) {
    if (!word || word.length <= 3) return word;
    let s = word;
    if (CONCEPT_SYNONYMS[s]) return CONCEPT_SYNONYMS[s];
    if (s.endsWith('ies')) return s.slice(0, -3) + 'y';
    if (s.endsWith('es') && !s.endsWith('ies')) return s.slice(0, -2);
    if (s.endsWith('s') && !s.endsWith('ss') && !s.endsWith('us')) return s.slice(0, -1);
    if (s.endsWith('ing')) return s.slice(0, -3);
    if (s.endsWith('ed')) return s.slice(0, -2);
    if (s.endsWith('tion')) return s.slice(0, -4);
    if (s.endsWith('ly')) return s.slice(0, -2);
    return CONCEPT_SYNONYMS[s] || s;
}

/**
 * Tokenizes text into normalized word tokens, filtering common stopwords and stemming.
 */
function extractTokens(text, filterStopwords = true) {
    if (!text || typeof text !== 'string') return [];
    const normalized = normalizePropositionText(text);
    // Match word sequences in Latin and Devanagari scripts
    const rawTokens = normalized.match(/[\p{L}\p{N}]+/gu) || [];
    if (!filterStopwords) {
        return rawTokens.map(stemWord);
    }
    return rawTokens
        .filter(t => t.length > 1 && !STOP_WORDS.has(t))
        .map(stemWord);
}

/**
 * Extracts word n-grams (e.g. bigrams) from tokens.
 */
function extractWordNgrams(tokens, n = 2) {
    if (!Array.isArray(tokens) || tokens.length < n) return [];
    const ngrams = [];
    for (let i = 0; i <= tokens.length - n; i++) {
        ngrams.push(tokens.slice(i, i + n).join(' '));
    }
    return ngrams;
}

/**
 * Extracts character n-grams (e.g. trigrams) from text.
 */
function extractCharNgrams(text, n = 3) {
    if (!text || typeof text !== 'string') return [];
    const normalized = normalizePropositionText(text).replace(/\s+/g, ' ');
    if (normalized.length < n) return [normalized];
    const ngrams = [];
    for (let i = 0; i <= normalized.length - n; i++) {
        ngrams.push(normalized.substring(i, i + n));
    }
    return ngrams;
}

/**
 * Computes standard Jaccard similarity between two sets/arrays: |A ∩ B| / |A ∪ B|.
 */
function computeJaccardSimilarity(setA, setB) {
    const a = setA instanceof Set ? setA : new Set(setA);
    const b = setB instanceof Set ? setB : new Set(setB);

    if (a.size === 0 && b.size === 0) return 1.0;
    if (a.size === 0 || b.size === 0) return 0.0;

    let intersectionCount = 0;
    for (const elem of a) {
        if (b.has(elem)) {
            intersectionCount++;
        }
    }

    const unionCount = a.size + b.size - intersectionCount;
    return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Computes containment score: |A ∩ B| / min(|A|, |B|).
 */
function computeContainment(setA, setB) {
    const a = setA instanceof Set ? setA : new Set(setA);
    const b = setB instanceof Set ? setB : new Set(setB);

    const minSize = Math.min(a.size, b.size);
    if (minSize === 0) return 0.0;

    let intersectionCount = 0;
    for (const elem of a) {
        if (b.has(elem)) {
            intersectionCount++;
        }
    }

    return intersectionCount / minSize;
}

/**
 * Normalizes mathematical formula string for equivalence comparison.
 */
function normalizeFormulaString(formulaStr) {
    if (!formulaStr || typeof formulaStr !== 'string') return '';
    return formulaStr
        .replace(/\s+/g, '')
        .replace(/\\times/g, '*')
        .replace(/\\cdot/g, '*')
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
        .replace(/[{}]/g, '')
        .toLowerCase();
}

/**
 * Checks if two formulas are mathematically / syntactically equivalent.
 */
function areFormulasEquivalent(formA, formB) {
    const normA = normalizeFormulaString(typeof formA === 'string' ? formA : (formA.latex || formA.formula || ''));
    const normB = normalizeFormulaString(typeof formB === 'string' ? formB : (formB.latex || formB.formula || ''));
    if (!normA || !normB) return false;
    return normA === normB;
}

/**
 * Extracts semantic features from a KU or practice item.
 */
function extractSemanticFeatures(ku) {
    if (!ku) return { tokens: [], ngrams: [], charNgrams: [], formulas: [], isProcedural: false, text: '' };

    const texts = [];
    if (ku.title) texts.push(ku.title);
    if (ku.definition) texts.push(ku.definition);
    if (ku.stem) texts.push(ku.stem);
    if (Array.isArray(ku.propositions)) {
        texts.push(...ku.propositions);
    } else if (typeof ku.propositions === 'string') {
        texts.push(ku.propositions);
    }

    const fullText = texts.join(' ');
    const tokens = extractTokens(fullText);
    const wordBigrams = extractWordNgrams(tokens, 2);
    const charTrigrams = extractCharNgrams(fullText, 3);

    const formulas = [];
    if (Array.isArray(ku.formulas)) {
        for (const f of ku.formulas) {
            formulas.push(normalizeFormulaString(typeof f === 'string' ? f : (f.latex || f.formula || '')));
        }
    }

    const isProcedural = ku.ku_type === 'procedural' ||
        Boolean(ku.pattern_id) ||
        Boolean(ku.solution_dag) ||
        Boolean(ku.hints) ||
        Boolean(ku.question_type);

    return {
        id: ku.id || '',
        title: ku.title || '',
        pattern_id: ku.pattern_id || null,
        question_type: ku.question_type || null,
        stem: ku.stem || '',
        answer: ku.answer || ku.numerical_answer || ku.correct_option || null,
        options: Array.isArray(ku.options) ? [...ku.options] : [],
        tokens,
        wordBigrams,
        charTrigrams,
        formulas,
        isProcedural,
        canonicalIdentity: ku.canonical_semantic_identity || generateCanonicalSemanticIdentity(ku),
        text: fullText
    };
}

/**
 * Checks if two STEM procedural items represent legitimate distinct variants
 * under the '1 Pattern != 1 Question' invariant.
 */
function isStemProceduralVariant(featA, featB) {
    if (!featA.isProcedural || !featB.isProcedural) {
        return false;
    }

    // If patterns match, or both are procedural items in the same chapter/family
    const sharedPattern = featA.pattern_id && featB.pattern_id && featA.pattern_id === featB.pattern_id;

    // Check stem differences
    const normStemA = normalizePropositionText(featA.stem);
    const normStemB = normalizePropositionText(featB.stem);

    // If stems are meaningfully distinct
    const stemTokensA = extractTokens(normStemA);
    const stemTokensB = extractTokens(normStemB);
    const stemSimilarity = computeJaccardSimilarity(stemTokensA, stemTokensB);

    // Distinct numerical parameters or answers
    const hasDifferentAnswers = featA.answer !== null && featB.answer !== null && featA.answer !== featB.answer;
    const hasDifferentTypes = featA.question_type && featB.question_type && featA.question_type !== featB.question_type;

    // If stems differ (similarity < 0.90) OR answers differ OR question types differ,
    // they are distinct practice questions!
    if (stemSimilarity < 0.90 || hasDifferentAnswers || hasDifferentTypes) {
        return true;
    }

    return false;
}

/**
 * Classifies the semantic relationship between two Knowledge Units.
 * Returns { relation: 'SAME_KU' | 'RELATED_KU' | 'DIFFERENT_KU', similarityScore, metrics, reason }
 */
function classifyKuRelation(kuA, kuB, options = {}) {
    if (!kuA || !kuB) {
        throw new Error('SEMANTIC_DEDUPLICATION_ERROR: classifyKuRelation requires two KU objects');
    }

    // 1. Exact ID match
    if (kuA.id && kuB.id && kuA.id === kuB.id) {
        return {
            relation: RELATION_TYPES.SAME_KU,
            similarityScore: 1.0,
            metrics: { tokenJaccard: 1.0, bigramJaccard: 1.0, charJaccard: 1.0, containment: 1.0 },
            reason: 'EXACT_KU_ID_MATCH'
        };
    }

    const featA = extractSemanticFeatures(kuA);
    const featB = extractSemanticFeatures(kuB);

    // 2. STEM Procedural Variant Protection (1 Pattern != 1 Question)
    if (featA.isProcedural && featB.isProcedural) {
        if (isStemProceduralVariant(featA, featB)) {
            return {
                relation: RELATION_TYPES.RELATED_KU,
                similarityScore: computeJaccardSimilarity(featA.tokens, featB.tokens),
                metrics: {
                    tokenJaccard: computeJaccardSimilarity(featA.tokens, featB.tokens),
                    isProceduralVariant: true,
                    sharedPattern: featA.pattern_id === featB.pattern_id
                },
                reason: 'STEM_PROCEDURAL_VARIANT_PRESERVED_1_PATTERN_NOT_EQUAL_1_QUESTION'
            };
        }
    }

    // 3. Exact Canonical Semantic Identity Match
    if (featA.canonicalIdentity && featB.canonicalIdentity && featA.canonicalIdentity === featB.canonicalIdentity) {
        return {
            relation: RELATION_TYPES.SAME_KU,
            similarityScore: 1.0,
            metrics: { tokenJaccard: 1.0, bigramJaccard: 1.0, charJaccard: 1.0, containment: 1.0 },
            reason: 'EXACT_CANONICAL_SEMANTIC_IDENTITY_MATCH'
        };
    }

    // 4. Exact Formula Match with High Concept Overlap
    const hasFormulaMatch = featA.formulas.length > 0 && featB.formulas.length > 0 &&
        featA.formulas.some(fa => featB.formulas.some(fb => areFormulasEquivalent(fa, fb)));

    // 5. Multi-tier similarity computation
    const tokenJaccard = computeJaccardSimilarity(featA.tokens, featB.tokens);
    const bigramJaccard = computeJaccardSimilarity(featA.wordBigrams, featB.wordBigrams);
    const charJaccard = computeJaccardSimilarity(featA.charTrigrams, featB.charTrigrams);
    const containment = computeContainment(featA.tokens, featB.tokens);

    // Composite similarity score
    const compositeScore = (0.40 * tokenJaccard) + (0.35 * bigramJaccard) + (0.25 * charJaccard);

    const metrics = {
        compositeScore,
        tokenJaccard,
        bigramJaccard,
        charJaccard,
        containment,
        hasFormulaMatch
    };

    // If formulas match exactly and some conceptual overlap exists
    if (hasFormulaMatch && (tokenJaccard >= 0.35 || containment >= 0.50)) {
        return {
            relation: RELATION_TYPES.SAME_KU,
            similarityScore: Math.max(compositeScore, 0.90),
            metrics,
            reason: 'IDENTICAL_FORMULA_AND_CONCEPTUAL_COLLISION'
        };
    }

    // High similarity threshold for SAME_KU
    const sameKuThreshold = options.sameKuThreshold !== undefined ? options.sameKuThreshold : 0.70;
    const containmentThreshold = options.containmentThreshold !== undefined ? options.containmentThreshold : 0.75;

    if (compositeScore >= sameKuThreshold || (tokenJaccard >= 0.50 && containment >= containmentThreshold) || containment >= 0.82) {
        const finalScore = Math.max(compositeScore, containment);
        return {
            relation: RELATION_TYPES.SAME_KU,
            similarityScore: finalScore,
            metrics,
            reason: `HIGH_SEMANTIC_PROPOSITION_COLLISION_${(finalScore * 100).toFixed(1)}%`
        };
    }

    // Moderate similarity threshold for RELATED_KU
    const relatedKuThreshold = options.relatedKuThreshold !== undefined ? options.relatedKuThreshold : 0.35;
    if (compositeScore >= relatedKuThreshold || tokenJaccard >= 0.30 || containment >= 0.50) {
        return {
            relation: RELATION_TYPES.RELATED_KU,
            similarityScore: compositeScore,
            metrics,
            reason: `RELATED_CONCEPT_OVERLAP_${(compositeScore * 100).toFixed(1)}%`
        };
    }

    // Otherwise DIFFERENT_KU
    return {
        relation: RELATION_TYPES.DIFFERENT_KU,
        similarityScore: compositeScore,
        metrics,
        reason: 'DISTINCT_CONCEPTS_BELOW_RELATION_THRESHOLD'
    };
}

/**
 * Helper to determine which origin tier is higher.
 * AUTHENTIC > CURATED > DERIVED > SYNTHETIC
 */
function isHigherOriginTier(tierA, tierB) {
    const ranks = {
        [ORIGIN_TIERS.AUTHENTIC]: 4,
        [ORIGIN_TIERS.CURATED]: 3,
        [ORIGIN_TIERS.DERIVED]: 2,
        [ORIGIN_TIERS.SYNTHETIC]: 1
    };
    return (ranks[tierA] || 0) > (ranks[tierB] || 0);
}

/**
 * Deduplicates an array of Knowledge Units, merging SAME_KU collisions while
 * preserving distinct STEM procedural variants.
 */
function deduplicateKnowledgeUnits(kus, options = {}) {
    if (!Array.isArray(kus)) {
        throw new Error('SEMANTIC_DEDUPLICATION_ERROR: deduplicateKnowledgeUnits requires an array of KUs');
    }

    const uniqueKus = [];
    const mergedPairs = [];
    let duplicateCount = 0;

    for (const candidate of kus) {
        let merged = false;

        for (let i = 0; i < uniqueKus.length; i++) {
            const existing = uniqueKus[i];
            const classification = classifyKuRelation(existing, candidate, options);

            if (classification.relation === RELATION_TYPES.SAME_KU) {
                duplicateCount++;
                merged = true;

                // Determine primary vs secondary based on origin tier and completeness
                const existingTier = (existing.clr && existing.clr.origin_tier) || 'CURATED';
                const candidateTier = (candidate.clr && candidate.clr.origin_tier) || 'CURATED';

                let primary = existing;
                let secondary = candidate;

                if (isHigherOriginTier(candidateTier, existingTier)) {
                    primary = candidate;
                    secondary = existing;
                    uniqueKus[i] = primary; // Replace existing with candidate as primary
                }

                // Merge target modalities
                const existingMods = new Set(primary.target_modalities || ['notes']);
                for (const mod of (secondary.target_modalities || [])) {
                    existingMods.add(mod);
                }
                primary.target_modalities = Array.from(existingMods);

                // Merge propositions
                const propSet = new Set(Array.isArray(primary.propositions) ? primary.propositions : []);
                for (const p of (Array.isArray(secondary.propositions) ? secondary.propositions : [])) {
                    propSet.add(p);
                }
                primary.propositions = Array.from(propSet);

                // Merge formulas
                if (Array.isArray(secondary.formulas)) {
                    primary.formulas = primary.formulas || [];
                    for (const f of secondary.formulas) {
                        const exists = primary.formulas.some(pf => areFormulasEquivalent(pf, f));
                        if (!exists) primary.formulas.push(f);
                    }
                }

                // Record merge in CLR transformation history
                if (primary.clr && Array.isArray(primary.clr.transformation_history)) {
                    primary.clr.transformation_history.push(`deduplication_merged:${secondary.id || 'candidate'}`);
                }

                mergedPairs.push({
                    primaryKuId: primary.id,
                    mergedKuId: secondary.id,
                    reason: classification.reason,
                    similarityScore: classification.similarityScore
                });

                break;
            }
        }

        if (!merged) {
            // Clone or wrap to preserve original without mutating unexpected references
            uniqueKus.push({ ...candidate });
        }
    }

    // Build reservation registry for deduplicated set
    const deduplicatedRegistry = getReservationRegistry();
    for (const ku of uniqueKus) {
        if (ku.source_chunk_hash && ku.evidence_pack_id && ku.clr) {
            try {
                deduplicatedRegistry.register({
                    ku_id: ku.id,
                    subject: ku.subject || (ku.clr && ku.clr.source_id) || 'General',
                    topic: ku.topic || 'General',
                    concept_name: ku.title || ku.id,
                    canonical_semantic_identity: ku.canonical_semantic_identity || generateCanonicalSemanticIdentity(ku),
                    semantic_digest: computeSha256(ku.canonical_semantic_identity || generateCanonicalSemanticIdentity(ku)),
                    target_modalities: ku.target_modalities || ['notes'],
                    source_chunk_hash: ku.source_chunk_hash,
                    evidence_pack_id: ku.evidence_pack_id,
                    state: ku.state || 'ACTIVE',
                    state_history: [{ from_state: null, to_state: ku.state || 'ACTIVE', reason: 'deduplicated registration', timestamp: new Date().toISOString() }],
                    metadata: ku.metadata || {},
                    clr: ku.clr
                });
            } catch (e) {
                // Ignore registration duplicate error if already in registry
            }
        }
    }

    return {
        uniqueKus,
        duplicateCount,
        mergedPairs,
        deduplicatedRegistry
    };
}

/**
 * Enforces cross-artifact deduplication:
 * Prevents identical factual propositions from being emitted redundantly
 * as independent cards in both Basic and Cloze without pedagogical justification.
 */
function enforceCrossArtifactDeduplication(kus, plannedArtifacts = {}, options = {}) {
    if (!Array.isArray(kus)) {
        throw new Error('SEMANTIC_DEDUPLICATION_ERROR: enforceCrossArtifactDeduplication requires an array of KUs');
    }

    const compliantKus = [];
    const conflictsResolved = [];
    let violationsCount = 0;

    for (const ku of kus) {
        const item = { ...ku };
        const mods = new Set(item.target_modalities || []);

        const hasBasic = mods.has('basic');
        const hasCloze = mods.has('cloze');

        // Check if both Basic and Cloze are targeted for this identical proposition
        if (hasBasic && hasCloze) {
            const hasJustification = Boolean(
                item.metadata && (
                    item.metadata.pedagogical_justification ||
                    item.metadata.allow_dual_modality ||
                    item.metadata.contrast_pair
                )
            ) || (options.allowedDualModalities && options.allowedDualModalities.has(item.id));

            if (!hasJustification) {
                violationsCount++;

                // Determine optimal factual modality:
                // If it has multiple variables, relational law, or formulas -> Cloze is pedagogically superior.
                // If it is an atomic term, date, or standalone definition -> Basic is pedagogically superior.
                const isRelationalOrFormula = (item.formulas && item.formulas.length > 0) ||
                    (item.propositions && item.propositions.some(p => p.includes('=') || p.includes('>') || p.includes('<') || p.includes('depends on') || p.includes('is proportional to')));

                let resolvedModality;
                let suppressedModality;

                if (isRelationalOrFormula) {
                    resolvedModality = 'cloze';
                    suppressedModality = 'basic';
                    mods.delete('basic');
                } else {
                    resolvedModality = 'basic';
                    suppressedModality = 'cloze';
                    mods.delete('cloze');
                }

                item.target_modalities = Array.from(mods);

                if (item.clr && Array.isArray(item.clr.transformation_history)) {
                    item.clr.transformation_history.push(`cross_artifact_dedup:suppressed_${suppressedModality}_in_favor_of_${resolvedModality}`);
                }

                conflictsResolved.push({
                    ku_id: item.id,
                    proposition: item.canonical_semantic_identity || generateCanonicalSemanticIdentity(item),
                    resolvedModality,
                    suppressedModality,
                    reason: `REDUNDANT_FACTUAL_PROJECTION_RESOLVED_TO_${resolvedModality.toUpperCase()}`
                });
            }
        }

        compliantKus.push(item);
    }

    return {
        compliantKus,
        conflictsResolved,
        violationsCount
    };
}

module.exports = {
    RELATION_TYPES,
    STOP_WORDS,
    extractTokens,
    extractWordNgrams,
    extractCharNgrams,
    computeJaccardSimilarity,
    computeContainment,
    normalizeFormulaString,
    areFormulasEquivalent,
    extractSemanticFeatures,
    isStemProceduralVariant,
    classifyKuRelation,
    deduplicateKnowledgeUnits,
    enforceCrossArtifactDeduplication
};
