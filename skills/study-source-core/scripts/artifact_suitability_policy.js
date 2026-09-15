/**
 * StudySourceCore Artifact Suitability Policy (`artifact_suitability_policy.js`)
 * 
 * Implements Milestone 2 Pedagogical Policy:
 * - Subject x Artifact Suitability Matrix across 5 distinct tiers:
 *     1. CORE: Mandatory, high-yield primary study deliverable for this subject.
 *     2. USEFUL: Valuable secondary deliverable, recommended for comprehensive retention.
 *     3. CONDITIONAL: Generated only when prerequisite source evidence triggers are satisfied.
 *     4. LOW_VALUE: Low educational leverage for this subject type; suppressed by default.
 *     5. SHOULD_NOT_GENERATE: Strictly forbidden / anti-pattern for this domain.
 * - Explicit rules across all 9 canonical subjects:
 *     - STEM Procedural (Math, Physics, Chemistry, Reasoning):
 *         - Requires proceduralQuestionBank and procedural items.
 *         - Math Anki flashcards strictly exclude numerical calculations.
 *     - Pure Declarative (Geography, History, Political Science):
 *         - Marks procedural APKG and question banks as SHOULD_NOT_GENERATE.
 *     - Image Occlusion is CONDITIONAL on diagram / visual asset presence.
 *     - Mind Map is CONDITIONAL on relational depth >= 2.
 *     - Slide Deck is CONDITIONAL on narrative pacing >= 5 slides.
 * - Provides:
 *     - `getSuitability(subject, artifactKey)`
 *     - `evaluateChapterSuitability(subject, evidencePackOrStats)`
 */

const SUITABILITY_TIERS = Object.freeze({
    CORE: 'CORE',
    USEFUL: 'USEFUL',
    CONDITIONAL: 'CONDITIONAL',
    LOW_VALUE: 'LOW_VALUE',
    SHOULD_NOT_GENERATE: 'SHOULD_NOT_GENERATE'
});

const CANONICAL_SUBJECTS = Object.freeze([
    'Biology',
    'Chemistry',
    'Geography',
    'History',
    'Map',
    'Math',
    'Physics',
    'Political Science',
    'Reasoning'
]);

const SUBJECT_ALIASES = Object.freeze({
    'math': 'Math',
    'mathematics': 'Math',
    'maths': 'Math',
    'physics': 'Physics',
    'phys': 'Physics',
    'chemistry': 'Chemistry',
    'chem': 'Chemistry',
    'reasoning': 'Reasoning',
    'logical reasoning': 'Reasoning',
    'logical_reasoning': 'Reasoning',
    'logic': 'Reasoning',
    'biology': 'Biology',
    'bio': 'Biology',
    'geography': 'Geography',
    'geo': 'Geography',
    'history': 'History',
    'hist': 'History',
    'political science': 'Political Science',
    'political_science': 'Political Science',
    'polity': 'Political Science',
    'map': 'Map',
    'maps': 'Map',
    'cartography': 'Map',
    'geography/map': 'Map'
});

const SUBJECT_CATEGORIES = Object.freeze({
    'Math': 'STEM_PROCEDURAL',
    'Physics': 'STEM_PROCEDURAL',
    'Chemistry': 'STEM_PROCEDURAL',
    'Reasoning': 'STEM_PROCEDURAL',
    'Biology': 'GENERIC_DECLARATIVE',
    'Geography': 'GENERIC_DECLARATIVE',
    'History': 'GENERIC_DECLARATIVE',
    'Political Science': 'GENERIC_DECLARATIVE',
    'Map': 'GENERIC_DECLARATIVE'
});

const ARTIFACT_KEY_ALIASES = Object.freeze({
    'notes': 'notes',
    'note': 'notes',
    'basic': 'basic',
    'cloze': 'cloze',
    'imageOcclusion': 'imageOcclusion',
    'image_occlusion': 'imageOcclusion',
    'io': 'imageOcclusion',
    'mindmap': 'mindmap',
    'mind_map': 'mindmap',
    'slideDeck': 'slideDeck',
    'slide_deck': 'slideDeck',
    'slides': 'slideDeck',
    'apkg': 'apkg',
    'anki': 'apkg',
    'proceduralApkg': 'proceduralApkg',
    'procedural_apkg': 'proceduralApkg',
    'studylab_apkg': 'proceduralApkg',
    'proceduralQuestionBank': 'proceduralQuestionBank',
    'procedural_question_bank': 'proceduralQuestionBank',
    'questionBank': 'proceduralQuestionBank',
    'questions': 'proceduralQuestionBank',
    'problemPatterns': 'problemPatterns',
    'problem_patterns': 'problemPatterns',
    'problemPatternsJson': 'problemPatterns',
    'practiceQuestions': 'practiceQuestions',
    'practice_questions': 'practiceQuestions',
    'bmGraph': 'bmGraph',
    'graph': 'bmGraph',
    'bm_graph': 'bmGraph',
    'bmQa': 'bmQa',
    'qa': 'bmQa',
    'bm_qa': 'bmQa',
    'qaReport': 'bmQa'
});

/**
 * Authoritative 9-Subject x 13-Artifact Suitability Matrix.
 */
const SUBJECT_ARTIFACT_MATRIX = Object.freeze({
    'Math': Object.freeze({
        notes: SUITABILITY_TIERS.CORE,
        proceduralQuestionBank: SUITABILITY_TIERS.CORE,
        problemPatterns: SUITABILITY_TIERS.CORE,
        practiceQuestions: SUITABILITY_TIERS.CORE,
        proceduralApkg: SUITABILITY_TIERS.USEFUL,
        basic: SUITABILITY_TIERS.USEFUL, // With constraint: EXCLUDE numerical calculations!
        cloze: SUITABILITY_TIERS.USEFUL, // Formula definitions / properties only
        imageOcclusion: SUITABILITY_TIERS.CONDITIONAL, // Geometric figures, coordinate graphs
        mindmap: SUITABILITY_TIERS.CONDITIONAL, // Concept taxonomy (e.g. number sets)
        slideDeck: SUITABILITY_TIERS.CONDITIONAL, // Narrative pacing >= 5 slides
        apkg: SUITABILITY_TIERS.USEFUL,
        bmGraph: SUITABILITY_TIERS.USEFUL,
        bmQa: SUITABILITY_TIERS.CORE
    }),
    'Physics': Object.freeze({
        notes: SUITABILITY_TIERS.CORE,
        proceduralQuestionBank: SUITABILITY_TIERS.CORE,
        problemPatterns: SUITABILITY_TIERS.CORE,
        practiceQuestions: SUITABILITY_TIERS.CORE,
        proceduralApkg: SUITABILITY_TIERS.USEFUL,
        basic: SUITABILITY_TIERS.USEFUL,
        cloze: SUITABILITY_TIERS.USEFUL,
        imageOcclusion: SUITABILITY_TIERS.CONDITIONAL, // FBDs, ray diagrams, circuits
        mindmap: SUITABILITY_TIERS.CONDITIONAL,
        slideDeck: SUITABILITY_TIERS.CONDITIONAL,
        apkg: SUITABILITY_TIERS.USEFUL,
        bmGraph: SUITABILITY_TIERS.USEFUL,
        bmQa: SUITABILITY_TIERS.CORE
    }),
    'Chemistry': Object.freeze({
        notes: SUITABILITY_TIERS.CORE,
        proceduralQuestionBank: SUITABILITY_TIERS.CORE,
        problemPatterns: SUITABILITY_TIERS.CORE,
        practiceQuestions: SUITABILITY_TIERS.CORE,
        proceduralApkg: SUITABILITY_TIERS.USEFUL,
        basic: SUITABILITY_TIERS.USEFUL,
        cloze: SUITABILITY_TIERS.USEFUL,
        imageOcclusion: SUITABILITY_TIERS.CONDITIONAL, // Molecular structures, apparatus, reaction schemes
        mindmap: SUITABILITY_TIERS.CONDITIONAL,
        slideDeck: SUITABILITY_TIERS.CONDITIONAL,
        apkg: SUITABILITY_TIERS.USEFUL,
        bmGraph: SUITABILITY_TIERS.USEFUL,
        bmQa: SUITABILITY_TIERS.CORE
    }),
    'Reasoning': Object.freeze({
        notes: SUITABILITY_TIERS.CORE,
        proceduralQuestionBank: SUITABILITY_TIERS.CORE,
        problemPatterns: SUITABILITY_TIERS.CORE,
        practiceQuestions: SUITABILITY_TIERS.CORE,
        proceduralApkg: SUITABILITY_TIERS.USEFUL,
        basic: SUITABILITY_TIERS.USEFUL,
        cloze: SUITABILITY_TIERS.USEFUL,
        imageOcclusion: SUITABILITY_TIERS.CONDITIONAL, // Venn diagrams, direction maps, spatial grids
        mindmap: SUITABILITY_TIERS.CONDITIONAL,
        slideDeck: SUITABILITY_TIERS.CONDITIONAL,
        apkg: SUITABILITY_TIERS.USEFUL,
        bmGraph: SUITABILITY_TIERS.USEFUL,
        bmQa: SUITABILITY_TIERS.CORE
    }),
    'Geography': Object.freeze({
        notes: SUITABILITY_TIERS.CORE,
        basic: SUITABILITY_TIERS.CORE,
        cloze: SUITABILITY_TIERS.CORE,
        apkg: SUITABILITY_TIERS.CORE,
        imageOcclusion: SUITABILITY_TIERS.CONDITIONAL, // Physical relief, drainage maps, climate zones
        mindmap: SUITABILITY_TIERS.CONDITIONAL,
        slideDeck: SUITABILITY_TIERS.CONDITIONAL,
        bmGraph: SUITABILITY_TIERS.USEFUL,
        bmQa: SUITABILITY_TIERS.CORE,
        proceduralQuestionBank: SUITABILITY_TIERS.SHOULD_NOT_GENERATE,
        problemPatterns: SUITABILITY_TIERS.SHOULD_NOT_GENERATE,
        practiceQuestions: SUITABILITY_TIERS.SHOULD_NOT_GENERATE,
        proceduralApkg: SUITABILITY_TIERS.SHOULD_NOT_GENERATE
    }),
    'History': Object.freeze({
        notes: SUITABILITY_TIERS.CORE,
        basic: SUITABILITY_TIERS.CORE,
        cloze: SUITABILITY_TIERS.CORE,
        apkg: SUITABILITY_TIERS.CORE,
        imageOcclusion: SUITABILITY_TIERS.CONDITIONAL, // Historical boundary maps, archaeological sites
        mindmap: SUITABILITY_TIERS.CONDITIONAL,
        slideDeck: SUITABILITY_TIERS.CONDITIONAL,
        bmGraph: SUITABILITY_TIERS.USEFUL,
        bmQa: SUITABILITY_TIERS.CORE,
        proceduralQuestionBank: SUITABILITY_TIERS.SHOULD_NOT_GENERATE,
        problemPatterns: SUITABILITY_TIERS.SHOULD_NOT_GENERATE,
        practiceQuestions: SUITABILITY_TIERS.SHOULD_NOT_GENERATE,
        proceduralApkg: SUITABILITY_TIERS.SHOULD_NOT_GENERATE
    }),
    'Political Science': Object.freeze({
        notes: SUITABILITY_TIERS.CORE,
        basic: SUITABILITY_TIERS.CORE,
        cloze: SUITABILITY_TIERS.CORE,
        apkg: SUITABILITY_TIERS.CORE,
        imageOcclusion: SUITABILITY_TIERS.CONDITIONAL, // Constitutional organograms, governance hierarchies
        mindmap: SUITABILITY_TIERS.CONDITIONAL,
        slideDeck: SUITABILITY_TIERS.CONDITIONAL,
        bmGraph: SUITABILITY_TIERS.USEFUL,
        bmQa: SUITABILITY_TIERS.CORE,
        proceduralQuestionBank: SUITABILITY_TIERS.SHOULD_NOT_GENERATE,
        problemPatterns: SUITABILITY_TIERS.SHOULD_NOT_GENERATE,
        practiceQuestions: SUITABILITY_TIERS.SHOULD_NOT_GENERATE,
        proceduralApkg: SUITABILITY_TIERS.SHOULD_NOT_GENERATE
    }),
    'Biology': Object.freeze({
        notes: SUITABILITY_TIERS.CORE,
        basic: SUITABILITY_TIERS.CORE,
        cloze: SUITABILITY_TIERS.CORE,
        imageOcclusion: SUITABILITY_TIERS.CORE, // Primary visual/anatomical domain
        apkg: SUITABILITY_TIERS.CORE,
        mindmap: SUITABILITY_TIERS.CONDITIONAL,
        slideDeck: SUITABILITY_TIERS.CONDITIONAL,
        bmGraph: SUITABILITY_TIERS.USEFUL,
        bmQa: SUITABILITY_TIERS.CORE,
        proceduralQuestionBank: SUITABILITY_TIERS.SHOULD_NOT_GENERATE,
        problemPatterns: SUITABILITY_TIERS.SHOULD_NOT_GENERATE,
        practiceQuestions: SUITABILITY_TIERS.SHOULD_NOT_GENERATE,
        proceduralApkg: SUITABILITY_TIERS.SHOULD_NOT_GENERATE
    }),
    'Map': Object.freeze({
        imageOcclusion: SUITABILITY_TIERS.CORE, // Cartographic masking is the primary artifact
        notes: SUITABILITY_TIERS.CORE,
        basic: SUITABILITY_TIERS.CORE,
        cloze: SUITABILITY_TIERS.USEFUL,
        apkg: SUITABILITY_TIERS.CORE,
        mindmap: SUITABILITY_TIERS.CONDITIONAL,
        slideDeck: SUITABILITY_TIERS.CONDITIONAL,
        bmGraph: SUITABILITY_TIERS.USEFUL,
        bmQa: SUITABILITY_TIERS.CORE,
        proceduralQuestionBank: SUITABILITY_TIERS.SHOULD_NOT_GENERATE,
        problemPatterns: SUITABILITY_TIERS.SHOULD_NOT_GENERATE,
        practiceQuestions: SUITABILITY_TIERS.SHOULD_NOT_GENERATE,
        proceduralApkg: SUITABILITY_TIERS.SHOULD_NOT_GENERATE
    })
});

/**
 * Canonical constraints applied to specific subject-artifact combinations.
 */
const SUBJECT_ARTIFACT_CONSTRAINTS = Object.freeze({
    'Math::basic': ['STRICTLY_EXCLUDE_NUMERICAL_CALCULATIONS'],
    'Math::cloze': ['STRICTLY_EXCLUDE_NUMERICAL_CALCULATIONS'],
    'Geography::proceduralApkg': ['PURE_DECLARATIVE_PROHIBITION'],
    'History::proceduralApkg': ['PURE_DECLARATIVE_PROHIBITION'],
    'Political Science::proceduralApkg': ['PURE_DECLARATIVE_PROHIBITION'],
    'Biology::proceduralApkg': ['PURE_DECLARATIVE_PROHIBITION'],
    'Map::proceduralApkg': ['PURE_DECLARATIVE_PROHIBITION']
});

/**
 * Normalizes input subject name to canonical form.
 */
function normalizeSubject(subject) {
    if (!subject || typeof subject !== 'string') {
        throw new Error('MISSING_SUBJECT: Subject must be provided as a non-empty string.');
    }
    const clean = subject.trim();
    if (CANONICAL_SUBJECTS.includes(clean)) {
        return clean;
    }
    const lower = clean.toLowerCase();
    if (SUBJECT_ALIASES[lower]) {
        return SUBJECT_ALIASES[lower];
    }
    throw new Error(`UNKNOWN_SUBJECT: Subject "${subject}" is not recognized among the 9 canonical subjects.`);
}

/**
 * Normalizes input artifact key to canonical form.
 */
function normalizeArtifactKey(artifactKey) {
    if (!artifactKey || typeof artifactKey !== 'string') {
        throw new Error('MISSING_ARTIFACT_KEY: Artifact key must be provided as a non-empty string.');
    }
    const clean = artifactKey.trim();
    if (ARTIFACT_KEY_ALIASES[clean]) {
        return ARTIFACT_KEY_ALIASES[clean];
    }
    const lower = clean.toLowerCase();
    if (ARTIFACT_KEY_ALIASES[lower]) {
        return ARTIFACT_KEY_ALIASES[lower];
    }
    return clean;
}

/**
 * Retrieves the static suitability tier and metadata for a subject x artifact combination.
 * 
 * @param {string} subject - Subject name or alias
 * @param {string} artifactKey - Target artifact key
 * @returns {Object} Suitability descriptor with tier, constraints, and primitive string coercion
 */
function getSuitability(subject, artifactKey) {
    const canonicalSubject = normalizeSubject(subject);
    const canonicalKey = normalizeArtifactKey(artifactKey);

    const subjectMap = SUBJECT_ARTIFACT_MATRIX[canonicalSubject];
    if (!subjectMap || !(canonicalKey in subjectMap)) {
        throw new Error(`UNKNOWN_ARTIFACT_KEY: Artifact "${artifactKey}" (resolved: "${canonicalKey}") is not defined in matrix.`);
    }

    const tier = subjectMap[canonicalKey];
    const constraintKey = `${canonicalSubject}::${canonicalKey}`;
    const constraints = SUBJECT_ARTIFACT_CONSTRAINTS[constraintKey] || [];

    const descriptor = {
        subject: canonicalSubject,
        artifactKey: canonicalKey,
        tier,
        category: SUBJECT_CATEGORIES[canonicalSubject],
        constraints,
        toString() { return this.tier; },
        valueOf() { return this.tier; },
        [Symbol.toPrimitive](hint) { return this.tier; }
    };

    return descriptor;
}

/**
 * Convenient helper returning just the primitive tier string.
 */
function getSuitabilityTier(subject, artifactKey) {
    return getSuitability(subject, artifactKey).tier;
}

/**
 * Evaluates chapter-level suitability decisions dynamically against source evidence or chapter statistics.
 * 
 * Rules enforced:
 * 1. Image Occlusion: CONDITIONAL on diagram presence (diagrams count > 0).
 * 2. Mind Map: CONDITIONAL on relational depth >= 2.
 * 3. Slide Deck: CONDITIONAL on narrative pacing >= 5 slides.
 * 4. STEM Procedural (Math, Physics, Chemistry, Reasoning):
 *    - Requires proceduralQuestionBank and procedural practice items.
 *    - Math Anki flashcards strictly exclude numerical calculations.
 * 5. Pure Declarative (Geography, History, Polity):
 *    - Procedural APKG and question banks strictly marked SHOULD_NOT_GENERATE.
 * 
 * @param {string} subject - Canonical or aliased subject name
 * @param {Object} evidencePackOrStats - Evidence pack or chapter statistics object
 * @returns {Object} Dynamic evaluation report with resolved generate flags, justifications, and constraints.
 */
function evaluateChapterSuitability(subject, evidencePackOrStats = {}) {
    const canonicalSubject = normalizeSubject(subject);
    const category = SUBJECT_CATEGORIES[canonicalSubject];
    const isStem = category === 'STEM_PROCEDURAL';

    // Normalize incoming stats/metrics
    const data = evidencePackOrStats || {};
    const diagramCount = (Array.isArray(data.diagrams) ? data.diagrams.length : 0)
        + (Array.isArray(data.visual_assets) ? data.visual_assets.length : 0)
        + (Array.isArray(data.figures) ? data.figures.length : 0)
        + (typeof data.diagram_count === 'number' ? data.diagram_count : 0)
        + (data.has_diagrams ? 1 : 0);

    const relationalDepth = typeof data.relational_depth === 'number'
        ? data.relational_depth
        : (typeof data.concept_tree_depth === 'number'
            ? data.concept_tree_depth
            : ((Array.isArray(data.relationships) && data.relationships.length >= 2) ? 2 : 1));

    const slideCount = typeof data.slide_count === 'number'
        ? data.slide_count
        : (typeof data.narrative_pacing === 'number'
            ? data.narrative_pacing
            : (Array.isArray(data.chunks) ? data.chunks.length : (data.estimated_slides || 6)));

    const problemCount = (Array.isArray(data.practice_problems) ? data.practice_problems.length : 0)
        + (Array.isArray(data.problems) ? data.problems.length : 0)
        + (Array.isArray(data.practice_items) ? data.practice_items.length : 0)
        + (typeof data.problem_count === 'number' ? data.problem_count : 0);

    const proceduralMode = (data.procedural_mode || data.proceduralMode || (isStem ? 'markdown' : 'none')).toLowerCase();

    const artifactDecisions = {};
    const subjectMap = SUBJECT_ARTIFACT_MATRIX[canonicalSubject];

    for (const [key, baseTier] of Object.entries(subjectMap)) {
        let generate = false;
        let reason = '';
        let tier = baseTier;
        const constraintKey = `${canonicalSubject}::${key}`;
        const constraints = [...(SUBJECT_ARTIFACT_CONSTRAINTS[constraintKey] || [])];

        switch (key) {
            case 'notes':
                generate = true;
                reason = 'CORE: Primary comprehensive knowledge synthesis and AST durable study notes';
                break;

            case 'bmQa':
                generate = true;
                reason = 'CORE: Authoritative cross-artifact semantic consistency and factual audit';
                break;

            case 'bmGraph':
                generate = true;
                reason = 'USEFUL: Vault knowledge graph semantic link synthesis';
                break;

            case 'imageOcclusion':
                if (tier === SUITABILITY_TIERS.CORE) {
                    if (diagramCount > 0) {
                        generate = true;
                        reason = 'CORE: Visual domain with detected diagrams/maps';
                    } else {
                        generate = false;
                        reason = 'CONDITIONAL_EXCLUDED: Visual domain artifact but 0 candidate diagrams found in source';
                    }
                } else if (tier === SUITABILITY_TIERS.CONDITIONAL) {
                    if (diagramCount > 0) {
                        generate = true;
                        reason = `CONDITIONAL_MET: Diagram presence satisfied (${diagramCount} detected visual assets)`;
                    } else {
                        generate = false;
                        reason = 'CONDITIONAL_EXCLUDED: Suppressed due to lack of source visual diagrams (IO_WORTHINESS_BELOW_THRESHOLD)';
                    }
                } else if (tier === SUITABILITY_TIERS.SHOULD_NOT_GENERATE) {
                    generate = false;
                    reason = 'PROHIBITED: Image occlusion not supported for this domain';
                }
                break;

            case 'mindmap':
                if (relationalDepth >= 2) {
                    generate = true;
                    reason = `CONDITIONAL_MET: Relational topology satisfied (relational depth ${relationalDepth} >= 2)`;
                } else {
                    generate = false;
                    reason = `CONDITIONAL_EXCLUDED: Insufficient relational topology (relational depth ${relationalDepth} < 2, linear hierarchy)`;
                }
                break;

            case 'slideDeck':
                if (slideCount >= 5) {
                    generate = true;
                    reason = `CONDITIONAL_MET: Narrative pacing satisfied (${slideCount} slides estimated >= 5 slide budget)`;
                } else {
                    generate = false;
                    reason = `CONDITIONAL_EXCLUDED: Narrative pacing below budget (${slideCount} slides < 5 minimum threshold)`;
                }
                break;

            case 'proceduralQuestionBank':
            case 'problemPatterns':
            case 'practiceQuestions':
                if (!isStem) {
                    tier = SUITABILITY_TIERS.SHOULD_NOT_GENERATE;
                    generate = false;
                    reason = `SHOULD_NOT_GENERATE: Pure declarative subject (${canonicalSubject}) forbids procedural question banks`;
                } else {
                    if (problemCount > 0 || data.has_problems || data.allow_procedural_synthesis) {
                        generate = true;
                        reason = `CORE: STEM procedural subject with ${problemCount} practice problems available`;
                    } else {
                        generate = false;
                        reason = 'MISSING_SOURCE_EVIDENCE: STEM procedural chapter contains 0 practice problems in source';
                    }
                }
                break;

            case 'proceduralApkg':
                if (!isStem) {
                    tier = SUITABILITY_TIERS.SHOULD_NOT_GENERATE;
                    generate = false;
                    reason = `SHOULD_NOT_GENERATE: Pure declarative subject (${canonicalSubject}) strictly forbids procedural APKG`;
                } else {
                    if (proceduralMode === 'none' || proceduralMode === 'markdown') {
                        generate = false;
                        reason = `PROCEDURAL_MODE_SUPPRESSED: Active procedural_mode ("${proceduralMode}") suppresses procedural APKG in favor of Markdown Question Bank`;
                    } else if (problemCount > 0 || data.has_problems) {
                        generate = true;
                        reason = `USEFUL: STEM procedural APKG compilation enabled under procedural_mode="${proceduralMode}"`;
                    } else {
                        generate = false;
                        reason = 'MISSING_SOURCE_EVIDENCE: Cannot compile procedural APKG with 0 procedural items';
                    }
                }
                break;

            case 'basic':
                if (isStem) {
                    generate = true;
                    reason = 'USEFUL: Conceptual and definitional atomic retrieval pairs';
                    if (canonicalSubject === 'Math') {
                        reason += ' (STRICTLY EXCLUDING numerical calculations)';
                    }
                } else {
                    generate = true;
                    reason = 'CORE: Primary declarative factual and definitional active recall flashcards';
                }
                break;

            case 'cloze':
                if (isStem) {
                    generate = true;
                    reason = 'USEFUL: Contextual recall for formulas, laws, and nomenclature';
                    if (canonicalSubject === 'Math') {
                        reason += ' (STRICTLY EXCLUDING numerical calculations)';
                    }
                } else {
                    generate = true;
                    reason = 'CORE: Contextual cloze retrieval for high-yield historical, geographical, or constitutional facts';
                }
                break;

            case 'apkg':
                if (isStem) {
                    generate = true;
                    reason = 'USEFUL: Packaging of declarative and conceptual flashcards into APKG';
                } else {
                    generate = true;
                    reason = 'CORE: Primary declarative spaced repetition packaging';
                }
                break;

            default:
                generate = (tier === SUITABILITY_TIERS.CORE || tier === SUITABILITY_TIERS.USEFUL);
                reason = `Default policy for tier ${tier}`;
                break;
        }

        artifactDecisions[key] = {
            artifactKey: key,
            tier,
            generate,
            reason,
            constraints
        };
    }

    const toGenerate = Object.keys(artifactDecisions).filter(k => artifactDecisions[k].generate);
    const excluded = Object.keys(artifactDecisions).filter(k => !artifactDecisions[k].generate);

    return {
        subject: canonicalSubject,
        category,
        isStem,
        stats: {
            diagramCount,
            relationalDepth,
            slideCount,
            problemCount,
            proceduralMode
        },
        artifacts: artifactDecisions,
        toGenerate,
        excluded,
        shouldGenerate(artifactKey) {
            const canonicalKey = normalizeArtifactKey(artifactKey);
            return !!(artifactDecisions[canonicalKey] && artifactDecisions[canonicalKey].generate);
        },
        getDecision(artifactKey) {
            const canonicalKey = normalizeArtifactKey(artifactKey);
            return artifactDecisions[canonicalKey] || null;
        }
    };
}

module.exports = {
    SUITABILITY_TIERS,
    CANONICAL_SUBJECTS,
    SUBJECT_ALIASES,
    SUBJECT_CATEGORIES,
    SUBJECT_ARTIFACT_MATRIX,
    SUBJECT_ARTIFACT_CONSTRAINTS,
    normalizeSubject,
    normalizeArtifactKey,
    getSuitability,
    getSuitabilityTier,
    evaluateChapterSuitability
};
