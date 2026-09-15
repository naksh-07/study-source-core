/**
 * StudySourceCore Subject Domain Centroid & Boundary Validator (`subject_boundary_validator.js`)
 * 
 * Milestone 2 — Stream 1: Knowledge Reservation, Deduplication, and Subject Boundary.
 * 
 * Core Capabilities:
 * 1. Authoritative domain centroid taxonomies and technical lexicons for all 9 subjects:
 *    - Math, Physics, Chemistry, Reasoning, Geography, Biology, History, Map, Political Science.
 * 2. Detects foreign out-of-domain concepts in a chapter (e.g., Newton's laws or electric circuits in Math LCM-HCF).
 * 3. Fail-closed behavior: flags boundary violations even when schema, IDs, and provenance are syntactically valid.
 * 4. Provides `validateSubjectDomain(irOrKus, subject)` and `getDomainLexicon(subject)`.
 */

const { toSlug } = require('./semantic_learning_ir');

/**
 * 9 Canonical Subjects
 */
const CANONICAL_SUBJECTS = {
    Math: 'Math',
    Physics: 'Physics',
    Chemistry: 'Chemistry',
    Reasoning: 'Reasoning',
    Geography: 'Geography',
    Biology: 'Biology',
    History: 'History',
    Map: 'Map',
    'Political Science': 'Political Science'
};

const VALID_CANONICAL_SUBJECTS = new Set(Object.values(CANONICAL_SUBJECTS));

/**
 * Subject alias resolution table
 */
const SUBJECT_ALIASES = {
    'math': 'Math',
    'maths': 'Math',
    'mathematics': 'Math',
    'physics': 'Physics',
    'phys': 'Physics',
    'chemistry': 'Chemistry',
    'chem': 'Chemistry',
    'reasoning': 'Reasoning',
    'logic': 'Reasoning',
    'logical reasoning': 'Reasoning',
    'logical_reasoning': 'Reasoning',
    'geography': 'Geography',
    'geo': 'Geography',
    'biology': 'Biology',
    'bio': 'Biology',
    'history': 'History',
    'hist': 'History',
    'map': 'Map',
    'maps': 'Map',
    'cartography': 'Map',
    'geography/map': 'Map',
    'political science': 'Political Science',
    'political_science': 'Political Science',
    'polity': 'Political Science',
    'civics': 'Political Science'
};

/**
 * Resolves raw subject string to canonical subject name.
 */
function resolveCanonicalSubject(subject) {
    if (!subject || typeof subject !== 'string') {
        throw new Error('SUBJECT_BOUNDARY_ERROR: Subject must be provided as a non-empty string');
    }
    const trimmed = subject.trim();
    if (VALID_CANONICAL_SUBJECTS.has(trimmed)) {
        return trimmed;
    }
    const lower = trimmed.toLowerCase();
    if (SUBJECT_ALIASES[lower]) {
        return SUBJECT_ALIASES[lower];
    }
    throw new Error(`UNKNOWN_SUBJECT_DOMAIN: "${subject}" is not one of the 9 canonical StudySourceCore subjects: ${Array.from(VALID_CANONICAL_SUBJECTS).join(', ')}`);
}

/**
 * Subject Domain Centroid Taxonomies
 */
const DOMAIN_CENTROIDS = {
    Math: [
        'Number Systems & Number Theory',
        'LCM and HCF & Coprimes',
        'Arithmetic (Percentages, Profit & Loss, Ratio & Proportion)',
        'Time, Speed, Distance & Time and Work',
        'Algebra & Polynomials & Quadratic Equations',
        'Geometry (Triangles, Circles, Polygons)',
        'Coordinate Geometry & Trigonometry',
        'Mensuration (Surface Areas & Volumes)',
        'Statistics & Probability',
        'Sequences & Series (AP, GP, HP)'
    ],
    Physics: [
        'Kinematics & Rectilinear / Projectile Motion',
        'Newton\'s Laws of Motion & Free Body Diagrams',
        'Friction & Circular Motion',
        'Work, Energy and Power & Conservation Laws',
        'Rotational Dynamics & Moment of Inertia',
        'Gravitation & Planetary Motion',
        'Mechanics of Solids and Fluids',
        'Thermodynamics & Kinetic Theory of Gases',
        'Oscillations (SHM) & Waves',
        'Electrostatics & Coulomb\'s Law & Capacitance',
        'Current Electricity & Ohm\'s / Kirchhoff\'s Laws',
        'Magnetism & Electromagnetic Induction & AC',
        'Ray and Wave Optics',
        'Modern Physics (Photoelectric Effect, Atoms & Nuclei, Semiconductors)'
    ],
    Chemistry: [
        'Atomic Structure & Quantum Numbers',
        'Periodic Table & Chemical Periodicity',
        'Chemical Bonding & Molecular Structure',
        'States of Matter & Gas Laws',
        'Chemical Thermodynamics & Thermochemistry',
        'Chemical and Ionic Equilibrium & Le Chatelier\'s Principle',
        'Redox Reactions & Electrochemistry (Nernst Equation)',
        'Chemical Kinetics & Rate Laws',
        'Surface Chemistry & Solutions',
        'Inorganic Chemistry (p-block, d-block, f-block, Coordination Compounds)',
        'Organic Chemistry Principles & Reaction Mechanisms (SN1, SN2)',
        'Hydrocarbons & Functional Groups (Haloalkanes, Alcohols, Carbonyls)',
        'Biomolecules & Polymers'
    ],
    Reasoning: [
        'Syllogism & Deductive Venn Diagrams',
        'Seating Arrangements (Circular, Linear, Rectangular, Parallel Rows)',
        'Analytical Puzzles (Floor, Scheduling, Matrix, Box Puzzles)',
        'Blood Relations & Family Trees',
        'Direction & Distance Sense',
        'Order, Ranking & Position Tracking',
        'Coding-Decoding & Alphanumeric Symbol Series',
        'Mathematical Inequalities (A > B >= C)',
        'Input-Output Machine Stepping',
        'Critical Reasoning (Statements & Assumptions, Course of Action, Cause & Effect)',
        'Data Sufficiency'
    ],
    Geography: [
        'Geomorphology & Plate Tectonics & Continental Drift',
        'Internal Structure of Earth & Rocks and Minerals',
        'Landforms (Fluvial, Aeolian, Glacial, Karst, Coastal)',
        'Climatology (Atmospheric Layers, Winds, Pressure Belts, Cyclones)',
        'Monsoons and Indian Climatic Regimes',
        'Oceanography (Ocean Currents, Salinity, Tides, Relief)',
        'Drainage Systems of India (Himalayan & Peninsular Rivers)',
        'Soils, Natural Vegetation & Forests of India',
        'Agriculture, Cropping Patterns & Irrigation',
        'Mineral, Energy Resources & Industrial Clusters'
    ],
    Biology: [
        'Cell Biology & Cell Organelles (Mitochondria, Chloroplasts, Ribosomes)',
        'Cell Cycle & Cell Division (Mitosis, Meiosis)',
        'Biomolecules & Enzymes',
        'Genetics & Mendelian Inheritance & DNA / RNA',
        'Molecular Basis of Inheritance (Transcription, Translation)',
        'Plant Physiology (Photosynthesis, Transpiration, Mineral Nutrition)',
        'Human Physiology (Digestion, Respiration, Circulation, Excretion)',
        'Human Nervous & Endocrine Systems',
        'Reproduction in Organisms & Human Reproduction',
        'Ecology, Ecosystems & Biodiversity Conservation'
    ],
    History: [
        'Ancient India (Indus Valley / Harappan Civilization, Vedic Age)',
        'Religious Movements (Buddhism, Jainism, Mahajanapadas)',
        'Mauryan Empire & Post-Mauryan Kingdoms',
        'Gupta Dynasty & Harshavardhana',
        'Medieval India (Delhi Sultanate, Bhakti & Sufi Movements)',
        'Mughal Empire & Administration',
        'Maratha Confederacy & Deccan Kingdoms',
        'Modern India: Colonial Penetration & British East India Company',
        'Revolt of 1857 & Socio-Religious Reform Movements',
        'Indian National Movement (Congress, Swadeshi, Non-Cooperation, Civil Disobedience, Quit India)',
        'Constitutional Developments & Partition / Independence (1947)'
    ],
    Map: [
        'Cartographic Principles & Coordinate Grids (Latitude, Longitude)',
        'Map Scales, Projections & Topographic Symbols',
        'International Land Borders & Line of Control / LAC',
        'Coastal Features, Straits, Channels & Maritime Boundaries (Palk Strait, 10 Degree Channel)',
        'Mountain Passes & Trans-Himalayan Routes (Nathu La, Zoji La, Karakoram)',
        'Spatial Distribution of Indian States & Union Territories',
        'River Courses & Confluences on Physical Maps',
        'National Parks, Wildlife Sanctuaries & Biosphere Reserves on Map',
        'Ports, Harbours & Strategic Maritime Straits'
    ],
    'Political Science': [
        'Constitutional Framework & Historical Underpinnings',
        'Preamble & Salient Features of the Indian Constitution',
        'Fundamental Rights (Articles 12–35) & Writs (Habeas Corpus, Mandamus)',
        'Directive Principles of State Policy (DPSP) & Fundamental Duties',
        'Union Executive (President, Vice-President, Prime Minister, Cabinet)',
        'Union Legislature (Parliament, Lok Sabha, Rajya Sabha, Lawmaking)',
        'Judiciary (Supreme Court, High Courts, Judicial Review, PIL)',
        'State Executive and Legislature (Governor, Chief Minister)',
        'Local Self-Government (Panchayati Raj 73rd & Municipalities 74th Amendments)',
        'Constitutional Bodies (Election Commission, UPSC, CAG, Finance Commission)',
        'Emergency Provisions (Articles 352, 356, 360) & Constitutional Amendments'
    ]
};

/**
 * Exclusive Domain Signature Terms
 * These phrases belong uniquely to a specific domain and indicate foreign intrusions
 * if detected in unrelated subject chapters.
 */
const EXCLUSIVE_SIGNATURES = {
    Physics: [
        "newton's first law",
        "newton's second law",
        "newton's third law",
        "newton's law of motion",
        "newton's laws of motion",
        "newton's law of gravitation",
        "coulomb's law",
        "electric flux",
        "magnetic flux",
        "kirchhoff's current law",
        "kirchhoff's voltage law",
        "kirchhoff's laws",
        "photoelectric effect",
        "simple harmonic motion",
        "moment of inertia",
        "terminal velocity",
        "lorentz force",
        "faraday's law of electromagnetic induction",
        "snell's law",
        "electric potential difference",
        "capacitance of capacitor",
        "carnot engine",
        "frictional force coefficient",
        "work-energy theorem",
        "biot-savart law",
        "ampere's circuital law",
        "centripetal acceleration",
        "angular momentum conservation",
        "doppler effect in sound",
        "total internal reflection",
        "free body diagram"
    ],
    Chemistry: [
        "stoichiometry",
        "le chatelier's principle",
        "nernst equation",
        "covalent bond",
        "electronegativity",
        "sp3 hybridisation",
        "sp2 hybridisation",
        "esterification",
        "haloalkane",
        "carboxylic acid",
        "redox titration",
        "molarity",
        "molality",
        "buffer solution",
        "arrhenius equation",
        "periodic table trend",
        "oxidation state of",
        "iupac nomenclature",
        "solubility product ksp",
        "activation energy ea",
        "reaction mechanism sn1",
        "reaction mechanism sn2",
        "galvanic cell",
        "electrochemical series",
        "coordination sphere",
        "ligand field"
    ],
    Biology: [
        "mitochondria",
        "chloroplast",
        "photosynthesis in plants",
        "light reaction of photosynthesis",
        "endoplasmic reticulum",
        "ribosome organelle",
        "mitosis division",
        "meiosis division",
        "nephron of kidney",
        "hemoglobin oxygen transport",
        "dna replication fork",
        "transcription in nucleus",
        "translation at ribosome",
        "alveoli in lungs",
        "pituitary gland",
        "thyroid gland",
        "synaptic cleft",
        "neuron action potential",
        "reflex arc pathway",
        "xylem and phloem",
        "golgi apparatus",
        "cardiac ventricles and atria",
        "mendelian monohybrid cross",
        "krebs cycle"
    ],
    History: [
        "mughal empire",
        "battle of plassey",
        "battle of buxar",
        "revolt of 1857",
        "british east india company",
        "governor-general of india",
        "viceroy of india",
        "treaty of salbai",
        "treaty of bassein",
        "ashokan edicts",
        "mauryan dynasty",
        "delhi sultanate",
        "slave dynasty",
        "khilji dynasty",
        "tughlaq dynasty",
        "non-cooperation movement",
        "civil disobedience movement",
        "quit india movement",
        "swadeshi movement",
        "indus valley civilization",
        "harappan seals",
        "vedic age",
        "subhash chandra bose ina"
    ],
    'Political Science': [
        "fundamental rights article",
        "directive principles of state policy",
        "article 370",
        "article 21",
        "article 14",
        "article 32",
        "article 356",
        "article 360",
        "writ of habeas corpus",
        "writ of mandamus",
        "writ of certiorari",
        "writ of quo warranto",
        "lok sabha and rajya sabha",
        "chief justice of india",
        "supreme court collegium",
        "constitutional amendment act",
        "panchayati raj 73rd amendment",
        "election commission of india",
        "comptroller and auditor general",
        "president's rule under article",
        "no-confidence motion",
        "speaker of lok sabha"
    ],
    Geography: [
        "plate tectonics theory",
        "continental drift theory",
        "geomorphological landforms",
        "troposphere layer",
        "stratosphere ozone layer",
        "monsoon trough",
        "intertropical convergence zone",
        "alluvial soil profile",
        "black cotton soil regur",
        "western ghats orography",
        "peninsular plateau shield",
        "brahmaputra river basin",
        "cyclonic depression bay of bengal",
        "weathering and erosion cycle",
        "oceanic trench subduction"
    ],
    Map: [
        "cartographic map projection",
        "palk strait maritime border",
        "tropic of cancer coordinates",
        "nathu la pass border",
        "zoji la pass route",
        "ten degree channel",
        "duncan passage",
        "radcliffe line border",
        "macmahon line border",
        "topographical map contour interval",
        "latitudinal and longitudinal extent",
        "gulf of mannar biosphere"
    ],
    Math: [
        "lcm and hcf",
        "coprime factorization",
        "prime factorization method",
        "quadratic equation roots",
        "pythagorean triplet",
        "arithmetic progression nth term",
        "geometric progression sum",
        "trigonometric identity sin cos",
        "surface area and volume of cylinder",
        "definite integral calculus",
        "permutations and combinations ncr"
    ],
    Reasoning: [
        "syllogism statement conclusion",
        "seating arrangement circular table",
        "circular arrangement facing center",
        "blood relation family tree",
        "direction sense test cardinal directions",
        "coding decoding pattern",
        "data sufficiency statements",
        "statement and assumption deduction",
        "venn diagram deduction logic"
    ]
};

/**
 * Normalizes text for domain scanning.
 */
function prepareTextForDomainScan(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[*_`#$\[\]()]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Detects foreign out-of-domain terms in a text string relative to the host subject.
 */
function detectForeignIntruders(text, hostSubject) {
    const canonicalHost = resolveCanonicalSubject(hostSubject);
    const preparedText = prepareTextForDomainScan(text);
    const intrusions = [];

    if (!preparedText) return intrusions;

    for (const [domain, signatures] of Object.entries(EXCLUSIVE_SIGNATURES)) {
        // Skip host subject's own signatures
        if (domain === canonicalHost) continue;

        // Allow legitimate overlapping pairs:
        // - Geography and Map share geographical coordinate concepts
        if ((canonicalHost === 'Geography' && domain === 'Map') || (canonicalHost === 'Map' && domain === 'Geography')) {
            continue;
        }

        for (const sig of signatures) {
            const sigPrepared = prepareTextForDomainScan(sig);
            // Search for whole-phrase presence
            if (preparedText.includes(sigPrepared)) {
                // Find snippet around matched term
                const matchIndex = preparedText.indexOf(sigPrepared);
                const start = Math.max(0, matchIndex - 40);
                const end = Math.min(preparedText.length, matchIndex + sigPrepared.length + 40);
                const snippet = '...' + preparedText.substring(start, end) + '...';

                intrusions.push({
                    foreignDomain: domain,
                    hostDomain: canonicalHost,
                    term: sig,
                    matchedText: sigPrepared,
                    confidence: 0.95,
                    severity: 'CRITICAL',
                    snippet
                });
            }
        }
    }

    return intrusions;
}

/**
 * Validates Knowledge Units or full Semantic Learning IR against domain boundaries.
 * Fail-closed behavior: flags boundary violations even when schema, IDs, and provenance are valid.
 * 
 * Returns: { isValid: boolean, subject, canonicalSubject, violations: Array, summary: string }
 */
function validateSubjectDomain(irOrKus, subject = null, options = {}) {
    let targetSubject = subject;
    let itemsToScan = [];

    if (!irOrKus) {
        throw new Error('SUBJECT_BOUNDARY_ERROR: validateSubjectDomain requires IR object or KU array');
    }

    // Determine if full IR object or array
    if (Array.isArray(irOrKus)) {
        itemsToScan = irOrKus;
    } else if (typeof irOrKus === 'object') {
        if (irOrKus.context && irOrKus.context.subject) {
            targetSubject = targetSubject || irOrKus.context.subject;
        }
        if (Array.isArray(irOrKus.knowledge_units)) {
            itemsToScan.push(...irOrKus.knowledge_units);
        }
        if (Array.isArray(irOrKus.practice_items)) {
            itemsToScan.push(...irOrKus.practice_items);
        }
        if (Array.isArray(irOrKus.problem_patterns)) {
            itemsToScan.push(...irOrKus.problem_patterns);
        }
    }

    if (!targetSubject) {
        throw new Error('SUBJECT_BOUNDARY_ERROR: Subject must be provided directly or in IR context');
    }

    const canonicalSubject = resolveCanonicalSubject(targetSubject);
    const violations = [];

    for (const item of itemsToScan) {
        const kuId = item.id || 'unassigned';
        const conceptName = item.title || item.concept_name || item.name || kuId;

        // Gather all text from item
        const texts = [];
        if (item.title) texts.push(item.title);
        if (item.definition) texts.push(item.definition);
        if (item.stem) texts.push(item.stem);
        if (item.explanation) texts.push(item.explanation);
        if (Array.isArray(item.propositions)) {
            texts.push(...item.propositions);
        }
        if (Array.isArray(item.formulas)) {
            texts.push(...item.formulas.map(f => typeof f === 'string' ? f : (f.latex || f.formula || f.name || '')));
        }
        if (item.hints) {
            if (typeof item.hints === 'object') {
                texts.push(Object.values(item.hints).join(' '));
            }
        }

        const combinedText = texts.join(' ');
        const itemIntrusions = detectForeignIntruders(combinedText, canonicalSubject);

        for (const intrusion of itemIntrusions) {
            violations.push({
                ku_id: kuId,
                concept_name: conceptName,
                foreign_domain: intrusion.foreignDomain,
                host_domain: canonicalSubject,
                detected_term: intrusion.term,
                confidence: intrusion.confidence,
                severity: intrusion.severity,
                snippet: intrusion.snippet
            });
        }
    }

    const isValid = violations.length === 0;
    const summary = isValid
        ? `Subject domain boundary check passed for ${canonicalSubject} across ${itemsToScan.length} item(s). Zero foreign intrusions.`
        : `FAIL_CLOSED: Detected ${violations.length} foreign out-of-domain intrusion(s) in ${canonicalSubject}: ` +
          violations.map(v => `[${v.ku_id}] Foreign term "${v.detected_term}" from ${v.foreign_domain}`).join('; ');

    if (!isValid && options.throwOnError) {
        throw new Error(`SUBJECT_BOUNDARY_VIOLATION: ${summary}`);
    }

    return {
        isValid,
        subject: targetSubject,
        canonicalSubject,
        scannedItemsCount: itemsToScan.length,
        violationsCount: violations.length,
        violations,
        summary
    };
}

/**
 * Retrieves the comprehensive domain centroid taxonomy and lexicon definition for a subject.
 */
function getDomainLexicon(subject) {
    const canonical = resolveCanonicalSubject(subject);
    return {
        subject,
        canonicalSubject: canonical,
        centroids: [...(DOMAIN_CENTROIDS[canonical] || [])],
        signatures: [...(EXCLUSIVE_SIGNATURES[canonical] || [])]
    };
}

module.exports = {
    CANONICAL_SUBJECTS,
    VALID_CANONICAL_SUBJECTS,
    DOMAIN_CENTROIDS,
    EXCLUSIVE_SIGNATURES,
    resolveCanonicalSubject,
    detectForeignIntruders,
    validateSubjectDomain,
    getDomainLexicon
};
