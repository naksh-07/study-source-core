/**
 * study-source-core Visual Need Discovery Engine
 * 
 * Deterministic visual-need discovery layer that inspects the Evidence Pack
 * and identifies concepts where visual representation materially improves learning.
 * 
 * Returns structured visual_needs[] array with subject/chapter/concept/visual_type.
 * Uses subject-aware visual rules to be selective — does NOT force every chapter to produce IO.
 */

const fs = require('fs');
const path = require('path');

// Load subject-aware visual rules
const rulesPath = path.join(__dirname, '..', 'resources', 'subject-visual-rules.json');
let subjectVisualRules = {};
try {
    subjectVisualRules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    if (subjectVisualRules.subjects) subjectVisualRules = subjectVisualRules.subjects;
} catch (e) {}

/**
 * Canonical visual need categories (16 types).
 */
const VISUAL_NEED_CATEGORIES = new Set([
    'anatomical_diagram',
    'process_diagram',
    'cycle',
    'map',
    'geographical_feature',
    'scientific_apparatus',
    'graph',
    'coordinate_geometry',
    'ray_diagram',
    'circuit',
    'chemical_structure',
    'reaction_scheme',
    'classification_diagram',
    'timeline',
    'flowchart',
    'logical_arrangement'
]);

/**
 * Keyword-to-category mapping for deterministic discovery.
 * Each entry maps a keyword pattern (case-insensitive) to its visual category.
 */
const KEYWORD_CATEGORY_MAP = [
    // Anatomical
    { pattern: /\b(anatomy|organ|heart|lung|kidney|brain|cell|tissue|skeletal|muscular|circulatory|digestive|nervous|endocrine|reproductive)\b/i, category: 'anatomical_diagram' },
    // Process
    { pattern: /\b(process|mechanism|pathway|procedure|step[s]?\s*(?:of|in|for)|stages?\s*(?:of|in)|pipeline)\b/i, category: 'process_diagram' },
    // Cycle
    { pattern: /\b(cycle|cyclic|water\s*cycle|carbon\s*cycle|nitrogen\s*cycle|krebs|calvin|rock\s*cycle|life\s*cycle)\b/i, category: 'cycle' },
    // Map
    { pattern: /\b(map|continent|country|district|boundary|border|borders|territory|region|atlas|cartograph|state\s+(?:boundary|boundaries|borders?|map|territory))\b/i, category: 'map' },
    // Geographical feature
    { pattern: /\b(mountain|river|valley|plateau|plain|desert|coast|island|strait|peninsula|delta|glacier|volcano|ocean|sea|lake|relief)\b/i, category: 'geographical_feature' },
    // Scientific apparatus
    { pattern: /\b(apparatus|experiment|setup|laboratory|lab\s*equipment|instrument|beaker|flask|burette|pipette|telescope|microscope|galvanometer|ammeter|voltmeter)\b/i, category: 'scientific_apparatus' },
    // Graph
    { pattern: /\b(graph|plot|curve|bar\s*chart|pie\s*chart|histogram|scatter|line\s*graph|data\s*visualization)\b/i, category: 'graph' },
    // Coordinate geometry
    { pattern: /\b(coordinate|cartesian|x[\-\s]*axis|y[\-\s]*axis|origin|quadrant|slope|intercept|locus|parabola|hyperbola|ellipse)\b/i, category: 'coordinate_geometry' },
    // Ray diagram
    { pattern: /\b(ray\s*diagram|refraction|reflection|lens|mirror|prism|optic|focal\s*point|image\s*formation|concave|convex)\b/i, category: 'ray_diagram' },
    // Circuit
    { pattern: /\b(circuit|resistor|capacitor|inductor|diode|transistor|ohm|series\s+circuit|parallel\s+circuit|circuit\s+diagram|circuit\s+board|electric\s+circuit|battery|switch|LED)\b/i, category: 'circuit' },
    // Chemical structure
    { pattern: /\b(molecular\s*structure|structural\s*formula|benzene|methane|ethanol|isomer|functional\s*group|bond\s*angle|hybridization|orbital|electron\s*config)\b/i, category: 'chemical_structure' },
    // Reaction scheme
    { pattern: /\b(reaction\s*scheme|reaction\s*mechanism|SN[12]|E[12]|addition|elimination|substitution|oxidation|reduction|electrolysis|catalysis|equilibrium)\b/i, category: 'reaction_scheme' },
    // Classification diagram
    { pattern: /\b(classification|taxonomy|taxonomic|hierarchy|hierarchical\s+classification|kingdom|phylum|taxonomic\s+class|genus|species|periodic\s*table|functional\s+group|periodic\s+group|classification\s+group)\b/i, category: 'classification_diagram' },
    // Timeline
    { pattern: /\b(timeline|chronolog|era|period|century|decade|dynasty|reign|epoch|historic\s*event)\b/i, category: 'timeline' },
    // Flowchart
    { pattern: /\b(flowchart|flow\s*chart|decision\s*tree|algorithm|workflow|if[\-\s]*then|branching|sequence)\b/i, category: 'flowchart' },
    // Logical arrangement
    { pattern: /\b(seating\s*arrangement|circular\s*arrangement|linear\s*arrangement|venn\s*diagram|matrix|grid|puzzle|logical\s*structure|arrangement)\b/i, category: 'logical_arrangement' }
];

/**
 * Discovers visual needs from evidence pack content.
 * 
 * @param {Object} options
 * @param {string} options.subject - The subject name
 * @param {string} options.chapter - The chapter name
 * @param {string} options.evidenceContent - Raw evidence pack text content
 * @param {Object} [options.visualProfile] - Transient visual profile from extraction
 * @returns {Object} Discovery result with visual_needs array
 */
function discoverVisualNeeds(options = {}) {
    const { subject, chapter, evidenceContent, visualProfile } = options;

    if (!subject || !chapter) {
        throw new Error('MISSING_REQUIRED_CONTEXT: subject and chapter must be provided');
    }

    if (!evidenceContent || typeof evidenceContent !== 'string' || evidenceContent.trim().length === 0) {
        return {
            subject,
            chapter,
            visual_needs: [],
            has_visual_need: false,
            discovery_status: 'NO_EVIDENCE_CONTENT',
            category_counts: {}
        };
    }

    const subjectRules = subjectVisualRules[subject] || {};
    const preferredCategories = new Set(subjectRules.preferred_visual_categories || []);

    // Discover visual needs by scanning evidence content
    const discoveredNeeds = [];
    const categoryCounts = {};
    const seenCategories = new Set();

    for (const { pattern, category } of KEYWORD_CATEGORY_MAP) {
        const matches = evidenceContent.match(new RegExp(pattern, 'gi'));
        if (matches && matches.length > 0) {
            // Weight by subject preference
            const isPreferred = preferredCategories.has(category);
            const relevance = isPreferred ? 'HIGH' : 'MEDIUM';

            if (!seenCategories.has(category)) {
                seenCategories.add(category);
                discoveredNeeds.push({
                    category,
                    subject,
                    chapter,
                    relevance,
                    match_count: matches.length,
                    is_subject_preferred: isPreferred,
                    sample_matches: matches.slice(0, 3).map(m => m.trim())
                });
            }

            categoryCounts[category] = (categoryCounts[category] || 0) + matches.length;
        }
    }

    // If visual profile provides explicit io_candidates, merge them
    if (visualProfile && Array.isArray(visualProfile.io_candidates)) {
        for (const candidate of visualProfile.io_candidates) {
            const cat = candidate.visual_category || 'process_diagram';
            if (!seenCategories.has(`profile_${cat}`)) {
                seenCategories.add(`profile_${cat}`);
                discoveredNeeds.push({
                    category: cat,
                    subject,
                    chapter,
                    relevance: 'HIGH',
                    match_count: 1,
                    is_subject_preferred: preferredCategories.has(cat),
                    sample_matches: [candidate.target_title || 'visual profile candidate'],
                    from_visual_profile: true
                });
            }
        }
    }

    // Sort by relevance (HIGH first), then match_count
    discoveredNeeds.sort((a, b) => {
        if (a.relevance === 'HIGH' && b.relevance !== 'HIGH') return -1;
        if (b.relevance === 'HIGH' && a.relevance !== 'HIGH') return 1;
        return b.match_count - a.match_count;
    });

    const hasVisualNeed = discoveredNeeds.length > 0;

    return {
        subject,
        chapter,
        visual_needs: discoveredNeeds,
        has_visual_need: hasVisualNeed,
        discovery_status: hasVisualNeed ? 'VISUAL_NEEDS_IDENTIFIED' : 'NO_VISUAL_NEEDS',
        category_counts: categoryCounts,
        subject_rules_applied: !!subjectRules.preferred_visual_categories
    };
}

/**
 * Classifies a single concept text into a visual need category.
 * 
 * @param {string} conceptText - Concept description text
 * @param {string} subject - Subject name for subject-aware weighting
 * @returns {Object|null} Classified category or null
 */
function classifyVisualNeed(conceptText, subject = '') {
    if (!conceptText || typeof conceptText !== 'string') return null;

    for (const { pattern, category } of KEYWORD_CATEGORY_MAP) {
        if (pattern.test(conceptText)) {
            const subjectRules = subjectVisualRules[subject] || {};
            const preferred = (subjectRules.preferred_visual_categories || []).includes(category);
            return {
                category,
                is_subject_preferred: preferred,
                relevance: preferred ? 'HIGH' : 'MEDIUM'
            };
        }
    }
    return null;
}

/**
 * Checks if a given visual category is valid.
 */
function isValidVisualCategory(category) {
    return VISUAL_NEED_CATEGORIES.has(category);
}

module.exports = {
    discoverVisualNeeds,
    classifyVisualNeed,
    isValidVisualCategory,
    VISUAL_NEED_CATEGORIES,
    KEYWORD_CATEGORY_MAP
};
