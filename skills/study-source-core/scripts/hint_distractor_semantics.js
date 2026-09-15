/**
 * StudySourceCore Hint & Distractor Semantics Engine (`hint_distractor_semantics.js`)
 * 
 * Implements Milestone 2 Verification Protocols:
 * 
 * 1. 3-Tier Progressive Hint Semantics:
 *    - Tier 1: Schema / Conceptual (principle, qualitative law, structural archetype).
 *    - Tier 2: Method / Formula (governing equation, transformation rule, algebraic strategy).
 *    - Tier 3: Structural Setup (symbolic or numerical substitution prior to final calculation).
 * 
 * 2. Anti-Leak Semantics (ADV-11 / ADV-KU-08):
 *    - Detects exact verbatim match, numerical equivalence, option letter disclosures,
 *      or normalized semantic answer disclosures.
 *    - Prevents hints from spoiling active retrieval.
 * 
 * 3. Anti-Boilerplate Invariant (ADV-KU-09):
 *    - Intercepts and rejects non-pedagogical generic clichés (e.g. "Think carefully", "Use the formula").
 *    - Enforces substantive character/word thresholds and inter-tier progression distinctness.
 * 
 * 4. Distractor Semantics (ADV-KU-10):
 *    - Validates that MCQ distractors model authentic pedagogical misconceptions:
 *      sign errors, inverted reciprocals, scaling factor slips, off-by-one, or domain near-misses.
 *    - Rejects arbitrary noise, unphysical values, and duplicate/sub-4 options.
 * 
 * Public API:
 *    - `validateHintSemantics(hints, terminalAnswer, options, context)`
 *    - `validateDistractorSemantics(options, correctKey, context)`
 *    - `detectHintLeak(hintText, terminalAnswer, options, correctOption)`
 *    - `detectHintBoilerplate(hintText)`
 *    - `analyzeDistractorQuality(options, correctOption, context)`
 */

/**
 * Common generic boilerplate phrases that violate ADV-KU-09.
 */
const BOILERPLATE_PATTERNS = [
    /\bthink\s+carefully\b/i,
    /\buse\s+(the\s+)?formula\b/i,
    /\bapply\s+(the\s+)?formula\b/i,
    /\buse\s+(the\s+)?relevant\s+formula\b/i,
    /\brefer\s+to\s+(the\s+)?(book|textbook|notes|lesson)\b/i,
    /\blook\s+at\s+(the\s+)?problem\b/i,
    /\bsolve\s+(it\s+)?step\s+by\s+step\b/i,
    /\bremember\s+the\s+(rule|formula|law|theorem)\b/i,
    /\buse\s+logic\b/i,
    /\bthink\s+logically\b/i,
    /\bcalculate\s+the\s+answer\b/i,
    /\btry\s+your\s+best\b/i,
    /\bread\s+carefully\b/i,
    /\bapply\s+what\s+you\s+learned\b/i,
    /\bcheck\s+your\s+work\b/i,
    /\breview\s+(the\s+)?material\b/i,
    /\bbasic\s+math\b/i,
    /\bstandard\s+approach\b/i,
    /\bjust\s+do\s+it\b/i,
    /\bfollow\s+the\s+steps\b/i,
    /\bpay\s+attention\b/i
];

/**
 * Words representing numbers for verbal numerical leak detection.
 */
const NUMBER_WORD_MAP = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
    'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
    'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
    'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
    'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30,
    'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
    'eighty': 80, 'ninety': 90, 'hundred': 100,
    'half': 0.5, 'quarter': 0.25
};

/**
 * Strips formatting, punctuation, and LaTeX tags to obtain clean normalized text.
 */
function cleanText(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/\$+/g, ' ')
        .replace(/\\(frac|sqrt|text|mathrm|mathbf)\{([^}]+)\}/g, ' $2 ')
        .replace(/[\\^_{}()]/g, ' ')
        .replace(/[^\w\s.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Safely parses a number from a string or value.
 */
function parseNumericValue(val) {
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (!val || typeof val !== 'string') return null;

    const cleaned = cleanText(val).replace(/,/g, '');
    
    // Check fraction like 1/2 or 3/4
    const fracMatch = cleaned.match(/^([+-]?\d+(?:\.\d+)?)\s*\/\s*([+-]?\d+(?:\.\d+)?)$/);
    if (fracMatch) {
        const denom = parseFloat(fracMatch[2]);
        if (denom !== 0) return parseFloat(fracMatch[1]) / denom;
    }

    // Check percentage like 50%
    const pctMatch = cleaned.match(/^([+-]?\d+(?:\.\d+)?)\s*%$/);
    if (pctMatch) {
        return parseFloat(pctMatch[1]) / 100;
    }

    // Extract first valid floating point number
    const numMatch = cleaned.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
    if (numMatch) {
        const parsed = parseFloat(numMatch[0]);
        return isNaN(parsed) ? null : parsed;
    }

    // Check verbal number
    const lower = cleaned.toLowerCase().trim();
    if (NUMBER_WORD_MAP[lower] !== undefined) {
        return NUMBER_WORD_MAP[lower];
    }

    return null;
}

/**
 * Detects if hint text contains boilerplate according to ADV-KU-09.
 * 
 * @param {string} hintText 
 * @returns {{ isBoilerplate: boolean, reason: string | null }}
 */
function detectHintBoilerplate(hintText) {
    if (!hintText || typeof hintText !== 'string') {
        return { isBoilerplate: true, reason: 'EMPTY_OR_NON_STRING_HINT' };
    }

    const trimmed = hintText.trim();
    if (trimmed.length < 15) {
        return {
            isBoilerplate: true,
            reason: `INSUFFICIENT_LENGTH: Hint length (${trimmed.length} chars) is below minimum 15 characters`
        };
    }

    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 3) {
        return {
            isBoilerplate: true,
            reason: `INSUFFICIENT_WORD_COUNT: Hint contains only ${words.length} words (minimum 3 required)`
        };
    }

    for (const pattern of BOILERPLATE_PATTERNS) {
        if (pattern.test(trimmed)) {
            return {
                isBoilerplate: true,
                reason: `GENERIC_BOILERPLATE_DETECTED: Matched prohibited pattern "${pattern.toString()}"`
            };
        }
    }

    return { isBoilerplate: false, reason: null };
}

/**
 * Detects if a hint leaks the terminal answer, numerical value, or correct option key (ADV-11 / ADV-KU-08).
 * 
 * @param {string} hintText - Hint content to inspect
 * @param {any} terminalAnswer - Target answer
 * @param {Array} [options] - MCQ options array if applicable
 * @param {any} [correctOption] - Correct option text or index
 * @returns {{ hasLeak: boolean, leakType: string | null, details: string | null }}
 */
function detectHintLeak(hintText, terminalAnswer, options = [], correctOption = null) {
    if (!hintText || typeof hintText !== 'string') {
        return { hasLeak: false, leakType: null, details: null };
    }

    const cleanHint = cleanText(hintText).toLowerCase();
    const rawHint = hintText.toLowerCase();

    // 1. Determine target answers to inspect
    const candidateAnswers = [];
    if (terminalAnswer !== undefined && terminalAnswer !== null) {
        candidateAnswers.push(terminalAnswer);
    }
    if (correctOption !== undefined && correctOption !== null) {
        candidateAnswers.push(correctOption);
    }

    // If correct option is an index (0, 1, 2, 3), map to option value and letter
    let correctLetter = null;
    let correctValue = null;

    if (Array.isArray(options) && options.length > 0) {
        if (typeof correctOption === 'number' && correctOption >= 0 && correctOption < options.length) {
            correctValue = options[correctOption];
            correctLetter = String.fromCharCode(65 + correctOption);
            candidateAnswers.push(correctValue);
        } else if (typeof correctOption === 'string') {
            const letterMatch = correctOption.trim().match(/^([A-D])$/i);
            if (letterMatch) {
                correctLetter = letterMatch[1].toUpperCase();
                const idx = correctLetter.charCodeAt(0) - 65;
                if (idx >= 0 && idx < options.length) {
                    correctValue = options[idx];
                    candidateAnswers.push(correctValue);
                }
            } else {
                // Match option text
                const idx = options.findIndex(o => cleanText(o).toLowerCase() === cleanText(correctOption).toLowerCase());
                if (idx >= 0) {
                    correctLetter = String.fromCharCode(65 + idx);
                    correctValue = options[idx];
                }
            }
        }
    }

    // 2. Exact verbatim / normalized substring match
    for (const target of candidateAnswers) {
        const cleanTarget = cleanText(target).toLowerCase();
        if (cleanTarget.length >= 2) {
            // Check word boundary match to avoid false positive on sub-tokens
            const escaped = cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const wordRegex = new RegExp(`\\b${escaped}\\b`, 'i');
            if (wordRegex.test(cleanHint) || cleanHint.includes(` ${cleanTarget} `) || cleanHint.startsWith(`${cleanTarget} `) || cleanHint.endsWith(` ${cleanTarget}`)) {
                return {
                    hasLeak: true,
                    leakType: 'EXACT_MATCH_LEAK',
                    details: `Hint contains exact terminal answer "${cleanTarget}"`
                };
            }
        }
    }

    // 3. Option Letter Leak Check (e.g. "Choose Option B", "Answer is (C)")
    if (correctLetter) {
        const optionLeakRegexes = [
            new RegExp(`\\b(?:option|choice|letter|select|choose|pick)\\s+[\\(\\[]?${correctLetter}[\\)\\]]?\\b`, 'i'),
            new RegExp(`\\b[\\(\\[]?${correctLetter}[\\)\\]]?\\s+is\\s+(?:the\\s+)?(?:correct|answer|true|right)\\b`, 'i'),
            new RegExp(`\\b(?:answer|solution)\\s+is\\s+[\\(\\[]?${correctLetter}[\\)\\]]?\\b`, 'i'),
            new RegExp(`\\bcorrect\\s+choice\\s+is\\s+${correctLetter}\\b`, 'i')
        ];

        for (const regex of optionLeakRegexes) {
            if (regex.test(rawHint)) {
                return {
                    hasLeak: true,
                    leakType: 'OPTION_LETTER_LEAK',
                    details: `Hint discloses correct option letter "${correctLetter}"`
                };
            }
        }
    }

    // 4. Numerical Equivalence Leak Check
    const targetNumeric = parseNumericValue(terminalAnswer) !== null 
        ? parseNumericValue(terminalAnswer) 
        : parseNumericValue(correctValue);

    if (targetNumeric !== null && typeof targetNumeric === 'number' && !isNaN(targetNumeric)) {
        // Extract all numeric tokens from hint
        const hintNumbers = (cleanHint.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) || [])
            .map(n => parseFloat(n))
            .filter(n => !isNaN(n));

        for (const num of hintNumbers) {
            // Check numerical equivalence with relative tolerance
            const diff = Math.abs(num - targetNumeric);
            const tol = Math.max(1e-6, Math.abs(targetNumeric) * 1e-4);
            if (diff < tol) {
                // If it's 0, 1, or 2, verify it's not simply a step counter like "step 1" or "equation (2)"
                if ((targetNumeric === 1 || targetNumeric === 2 || targetNumeric === 0) &&
                    (cleanHint.includes(`step ${num}`) || cleanHint.includes(`equation ${num}`) || cleanHint.includes(`part ${num}`))) {
                    continue;
                }
                return {
                    hasLeak: true,
                    leakType: 'NUMERICAL_EQUIVALENCE_LEAK',
                    details: `Hint contains numerically equivalent target value: ${num} (target: ${targetNumeric})`
                };
            }
        }

        // Check fraction verbal forms for common values
        if (Math.abs(targetNumeric - 0.5) < 1e-6 && /\b(half|1\/2)\b/i.test(cleanHint)) {
            return {
                hasLeak: true,
                leakType: 'NUMERICAL_EQUIVALENCE_LEAK',
                details: 'Hint contains fraction equivalent "half" / "1/2" for target 0.5'
            };
        }
        if (Math.abs(targetNumeric - 0.25) < 1e-6 && /\b(quarter|1\/4)\b/i.test(cleanHint)) {
            return {
                hasLeak: true,
                leakType: 'NUMERICAL_EQUIVALENCE_LEAK',
                details: 'Hint contains fraction equivalent "quarter" / "1/4" for target 0.25'
            };
        }
    }

    // 5. Normalized Semantic Disclosure Check
    const semanticAnswerPhrases = [
        /(?:the\s+)?final\s+answer\s+is\s+([^\n.,;]+)/i,
        /(?:yielding|gives|gives\s+us|resulting\s+in)\s+([^\n.,;]+)/i,
        /(?:evaluates|simplifies)\s+to\s+([^\n.,;]+)/i
    ];

    for (const phraseRegex of semanticAnswerPhrases) {
        const match = rawHint.match(phraseRegex);
        if (match && match[1]) {
            const captured = cleanText(match[1]).toLowerCase();
            for (const target of candidateAnswers) {
                const cleanTarget = cleanText(target).toLowerCase();
                if (cleanTarget.length >= 2 && captured.includes(cleanTarget)) {
                    return {
                        hasLeak: true,
                        leakType: 'SEMANTIC_NORMALIZED_LEAK',
                        details: `Hint grammatically discloses result: "${match[0].trim()}"`
                    };
                }
            }
        }
    }

    return { hasLeak: false, leakType: null, details: null };
}

/**
 * Validates the full 3-tier progressive hint structure according to ADV-11 and ADV-KU-09.
 * 
 * Enforces:
 * - Presence of all 3 distinct tiers: tier_1_conceptual, tier_2_method, tier_3_setup.
 * - Anti-leak invariance on Tier 1 and Tier 2 (terminal answer immunity).
 * - Anti-leak on Tier 3 (Tier 3 sets up formula substitution but must NOT state terminal evaluation).
 * - Anti-boilerplate invariant (ADV-KU-09) on all tiers.
 * - Distinctness across tiers (Tier 1 != Tier 2 != Tier 3).
 * 
 * @param {Object|Array} hints - 3-Tier hints object or array
 * @param {any} terminalAnswer - Correct answer
 * @param {Array} [options] - MCQ options
 * @param {Object} [context] - Context configuration
 * @returns {{ isValid: boolean, errors: string[], warnings: string[], tiers: Object }}
 */
function validateHintSemantics(hints, terminalAnswer, options = [], context = {}) {
    const errors = [];
    const warnings = [];

    // Normalize input to standard 3-tier structure
    let normalized = null;
    if (Array.isArray(hints)) {
        if (hints.length < 3) {
            errors.push(`HINT_INCOMPLETE_TIERS: Hints array must have at least 3 tiers, found ${hints.length}`);
        }
        normalized = {
            tier_1_conceptual: hints[0] || '',
            tier_2_method: hints[1] || '',
            tier_3_setup: hints[2] || ''
        };
    } else if (hints && typeof hints === 'object') {
        normalized = {
            tier_1_conceptual: hints.tier_1_conceptual || hints.tier_1 || hints.tier1 || '',
            tier_2_method: hints.tier_2_method || hints.tier_2 || hints.tier2 || '',
            tier_3_setup: hints.tier_3_setup || hints.tier_3 || hints.tier3 || ''
        };
    } else {
        errors.push('HINT_STRUCTURE_MISSING: Hints must be provided as a 3-tier object or array');
        return { isValid: false, errors, warnings, tiers: null };
    }

    const tierKeys = [
        { key: 'tier_1_conceptual', name: 'Tier 1 (Conceptual/Schema)', allowsSetupNumbers: false },
        { key: 'tier_2_method', name: 'Tier 2 (Method/Formula)', allowsSetupNumbers: false },
        { key: 'tier_3_setup', name: 'Tier 3 (Structural Setup)', allowsSetupNumbers: true }
    ];

    const tierTexts = [];

    for (const tier of tierKeys) {
        const text = normalized[tier.key];
        tierTexts.push(text);

        // 1. Mandatory presence check
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            errors.push(`HINT_MISSING_TIER: ${tier.name} is missing or empty`);
            continue;
        }

        // 2. Anti-Boilerplate Invariant (ADV-KU-09)
        const bp = detectHintBoilerplate(text);
        if (bp.isBoilerplate) {
            errors.push(`ADV_KU_09_BOILERPLATE_VIOLATION: ${tier.name} failed anti-boilerplate audit: ${bp.reason}`);
        }

        // 3. Anti-Leak Semantics (ADV-11 / ADV-KU-08)
        const leak = detectHintLeak(text, terminalAnswer, options, context.correctOption);
        if (leak.hasLeak) {
            errors.push(`ADV_KU_08_HINT_ANSWER_LEAKAGE: ${tier.name} leaks terminal answer (${leak.leakType}): ${leak.details}`);
        }
    }

    // 4. Inter-tier Progressive Distinctness Check
    if (tierTexts[0] && tierTexts[1] && cleanText(tierTexts[0]) === cleanText(tierTexts[1])) {
        errors.push('HINT_PROGRESSION_STALL: Tier 1 and Tier 2 contain identical text; progressive hints must be distinct');
    }
    if (tierTexts[1] && tierTexts[2] && cleanText(tierTexts[1]) === cleanText(tierTexts[2])) {
        errors.push('HINT_PROGRESSION_STALL: Tier 2 and Tier 3 contain identical text; progressive hints must be distinct');
    }
    if (tierTexts[0] && tierTexts[2] && cleanText(tierTexts[0]) === cleanText(tierTexts[2])) {
        errors.push('HINT_PROGRESSION_STALL: Tier 1 and Tier 3 contain identical text; progressive hints must be distinct');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        tiers: normalized
    };
}

/**
 * Analyzes MCQ distractors for authentic pedagogical misconception modeling (ADV-KU-10).
 * 
 * @param {Array} options - List of MCQ options
 * @param {any} correctKey - Correct option value, index, or letter
 * @param {Object} [context] - Subject and domain context
 * @returns {Object} Distractor quality analysis
 */
function analyzeDistractorQuality(options, correctKey, context = {}) {
    if (!Array.isArray(options)) {
        return { isValid: false, reason: 'OPTIONS_NOT_AN_ARRAY', distractors: [] };
    }

    // Resolve correct option value
    let correctValue = null;
    let correctIndex = -1;

    if (typeof correctKey === 'number' && correctKey >= 0 && correctKey < options.length) {
        correctIndex = correctKey;
        correctValue = options[correctKey];
    } else if (typeof correctKey === 'string' && /^[A-D]$/i.test(correctKey.trim())) {
        correctIndex = correctKey.trim().toUpperCase().charCodeAt(0) - 65;
        if (correctIndex >= 0 && correctIndex < options.length) {
            correctValue = options[correctIndex];
        }
    } else {
        correctIndex = options.findIndex(o => cleanText(o).toLowerCase() === cleanText(correctKey).toLowerCase());
        if (correctIndex >= 0) {
            correctValue = options[correctIndex];
        }
    }

    const correctNumeric = parseNumericValue(correctValue);
    const distractorAnalyses = [];

    options.forEach((opt, idx) => {
        if (idx === correctIndex) return;

        const optStr = String(opt).trim();
        const optClean = cleanText(optStr);
        const optNumeric = parseNumericValue(opt);

        const classification = {
            index: idx,
            optionLetter: String.fromCharCode(65 + idx),
            text: optStr,
            misconceptionType: 'UNKNOWN',
            isPlausible: true,
            notes: []
        };

        // Check for placeholder / garbage distractor
        if (/^(option\s+[A-D]|choice\s+[A-D]|dummy|test|placeholder|\?{2,}|asdf)$/i.test(optClean)) {
            classification.isPlausible = false;
            classification.misconceptionType = 'ARTIFICIAL_PLACEHOLDER';
            classification.notes.push('Distractor is a raw artificial placeholder, violating ADV-KU-10');
            distractorAnalyses.push(classification);
            return;
        }

        // Numerical Misconception Modeling
        if (correctNumeric !== null && optNumeric !== null) {
            const diff = Math.abs(optNumeric - correctNumeric);
            const sum = optNumeric + correctNumeric;

            // 1. Sign Error (e.g. +15 vs -15)
            if (Math.abs(sum) < 1e-6 && correctNumeric !== 0) {
                classification.misconceptionType = 'SIGN_ERROR';
                classification.notes.push('Models coordinate sign convention or direction reversal error');
            }
            // 2. Inverted Reciprocal Ratio (e.g. 4/3 vs 3/4)
            else if (correctNumeric !== 0 && Math.abs(optNumeric - (1 / correctNumeric)) < 0.05) {
                classification.misconceptionType = 'RECIPROCAL_INVERSION';
                classification.notes.push('Models denominator/numerator inversion misconception');
            }
            // 3. Scaling Factor of 2 (omitted 1/2 factor e.g. KE = mv^2 instead of 1/2 mv^2)
            else if (Math.abs(optNumeric - (2 * correctNumeric)) < 1e-4 || Math.abs(optNumeric - (0.5 * correctNumeric)) < 1e-4) {
                classification.misconceptionType = 'FACTOR_OF_TWO_SLIP';
                classification.notes.push('Models common omitted or doubled coefficient (e.g. 1/2 factor slip)');
            }
            // 4. Metric Prefix / Order of Magnitude Slip (factor of 10)
            else if (Math.abs(optNumeric - (10 * correctNumeric)) < 1e-4 || Math.abs(optNumeric - (0.1 * correctNumeric)) < 1e-4) {
                classification.misconceptionType = 'METRIC_PREFIX_SLIP';
                classification.notes.push('Models decimal place or metric unit conversion slip');
            }
            // 5. Off-by-one Slip (e.g. n vs n+1 or n-1 in counting / sequences)
            else if (Math.abs(diff - 1) < 1e-6) {
                classification.misconceptionType = 'OFF_BY_ONE_ERROR';
                classification.notes.push('Models boundary fencepost / off-by-one counting error');
            }
            // 6. Near-miss arithmetic slip
            else if (diff <= Math.max(5, Math.abs(correctNumeric) * 0.5)) {
                classification.misconceptionType = 'NEAR_MISS_ARITHMETIC';
                classification.notes.push('Plausible numerical near-miss within computational neighborhood');
            }
            // 7. Order-of-magnitude absurdity check
            else {
                const ratio = Math.abs(optNumeric) / (Math.abs(correctNumeric) || 1);
                if (ratio > 1e5 || (ratio < 1e-5 && optNumeric !== 0)) {
                    classification.isPlausible = false;
                    classification.misconceptionType = 'ABSURD_ORDER_OF_MAGNITUDE';
                    classification.notes.push(`Distractor scale (${optNumeric}) is absurdly disconnected from answer (${correctNumeric})`);
                } else {
                    classification.misconceptionType = 'GENERAL_NUMERICAL_DISTRACTOR';
                    classification.notes.push('Competent domain-specific numerical alternative');
                }
            }

            // Check non-physical negative values for positive domains
            if (context.isNonNegativePhysicalQuantity && optNumeric < 0) {
                classification.isPlausible = false;
                classification.notes.push('Negative value is physically impossible for strictly non-negative quantity');
            }
        } else {
            // Qualitative / Verbal distractor
            if (optClean.length < 2) {
                classification.isPlausible = false;
                classification.misconceptionType = 'EMPTY_OR_TRIVIAL';
                classification.notes.push('Verbal distractor is too short or empty');
            } else {
                classification.misconceptionType = 'CONCEPTUAL_DISTRACTOR';
                classification.notes.push('Plausible qualitative conceptual alternative');
            }
        }

        distractorAnalyses.push(classification);
    });

    return {
        correctIndex,
        correctValue,
        distractors: distractorAnalyses
    };
}

/**
 * Validates MCQ distractor semantics according to ADV-KU-10.
 * 
 * Enforces:
 * - Minimum 4 options (MCQ Cardinality Invariant).
 * - All options discrete and unique (no duplicate choices).
 * - Exact inclusion of correctKey.
 * - Distractors are plausible domain misconceptions rather than artificial noise or absurd out-of-order numbers.
 * 
 * @param {Array} options - List of MCQ options
 * @param {any} correctKey - Correct option value, index, or letter
 * @param {Object} [context] - Context configuration
 * @returns {{ isValid: boolean, errors: string[], warnings: string[], distractorAnalysis: Object }}
 */
function validateDistractorSemantics(options, correctKey, context = {}) {
    const errors = [];
    const warnings = [];

    // 1. Array check & minimum 4 options invariant
    if (!Array.isArray(options)) {
        errors.push('MCQ_OPTIONS_INVALID: Options must be an array');
        return { isValid: false, errors, warnings, distractorAnalysis: null };
    }

    if (options.length < 4) {
        errors.push(`MCQ_CARDINALITY_INVARIANT_VIOLATED: Must have at least 4 options, found ${options.length}`);
    }

    // 2. Uniqueness check
    const seen = new Map();
    options.forEach((opt, idx) => {
        const norm = cleanText(opt).toLowerCase();
        if (norm.length === 0) {
            errors.push(`EMPTY_OPTION: Option at index ${idx} is empty or whitespace-only`);
            return;
        }
        if (seen.has(norm)) {
            errors.push(`DUPLICATE_OPTION: Option at index ${idx} ("${opt}") duplicates option at index ${seen.get(norm)}`);
        } else {
            seen.set(norm, idx);
        }
    });

    // 3. Correct answer inclusion check
    const analysis = analyzeDistractorQuality(options, correctKey, context);
    if (analysis.correctIndex === -1) {
        errors.push(`MISSING_CORRECT_OPTION: Correct key "${correctKey}" does not match any option in the list`);
    }

    // 4. Distractor Plausibility Analysis (ADV-KU-10)
    for (const d of analysis.distractors) {
        if (!d.isPlausible) {
            errors.push(`ADV_KU_10_IMPLAUSIBLE_DISTRACTOR: Option ${d.optionLetter} ("${d.text}") failed quality check: ${d.notes.join('; ')}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        distractorAnalysis: analysis
    };
}

module.exports = {
    BOILERPLATE_PATTERNS,
    NUMBER_WORD_MAP,
    cleanText,
    parseNumericValue,
    detectHintBoilerplate,
    detectHintLeak,
    validateHintSemantics,
    analyzeDistractorQuality,
    validateDistractorSemantics
};
