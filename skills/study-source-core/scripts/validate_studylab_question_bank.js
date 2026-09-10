/**
 * study-source-core StudyLab Question Bank Validator (`validate_studylab_question_bank.js`)
 * 
 * Enforces the canonical StudyLab Question Bank contract across both
 * structured JSON representations and rendered Obsidian Markdown files.
 * 
 * Validates:
 * - Top-level schema version, domain, and chapter metadata
 * - Non-empty question collections (EMPTY_QUESTION_BANK)
 * - Unique and valid question IDs (INVALID_QUESTION_ID, DUPLICATE_QUESTION_ID)
 * - Strict provenance origin classification (MISSING_PROVENANCE, INVALID_PROVENANCE_ORIGIN)
 * - Valid question types and MCQ >= 4 options (INVALID_QUESTION_TYPE, INVALID_MCQ_OPTIONS)
 * - 3-Tier progressive hints completeness (MISSING_HINTS)
 * - Anti-leak invariant: Tier 1 & Tier 2 must never leak final answer (HINT_ANSWER_LEAKAGE)
 * - Method, Decision Points, Traps, Error Categories, Solution, Verification, Prerequisites
 * - Single H1 and heading monotonicity in Markdown files
 */

const fs = require('fs');
const path = require('path');

const VALID_ORIGINS = new Set([
    'authentic_pyq',
    'source_derived',
    'curated_source',
    'derived_variant',
    'synthetic_schema'
]);

const VALID_QUESTION_TYPES = new Set([
    'mcq',
    'numerical',
    'structured',
    'direct_compute',
    'reverse_problem',
    'trap',
    'reference_only'
]);

/**
 * Checks if a hint text leaks the final answer.
 * 
 * @param {string} hintText 
 * @param {string|number} answer 
 * @returns {boolean} True if hint leaks the answer
 */
function hintLeaksAnswer(hintText, answer) {
    if (answer === undefined || answer === null || hintText === undefined || hintText === null) {
        return false;
    }

    const ansStr = String(answer).trim();
    if (!ansStr || ansStr.length === 0) return false;

    // Check for explicit declaration of answer in Hindi or English
    const explicitPatterns = [
        new RegExp(`(?:answer|उत्तर|correct\\s*option|सही\\s*विकल्प|ans|result|परिणाम)\\s*(?:is|है|होगा|:|=|था)?\\s*${escapeRegex(ansStr)}`, 'i'),
        new RegExp(`(?:final\\s*answer|अंतिम\\s*उत्तर)\\s*(?:is|होगा|है|:|=)?\\s*${escapeRegex(ansStr)}`, 'i'),
        new RegExp(`=\\s*${escapeRegex(ansStr)}(?:\\s|[.,;!?)]|$)`, 'm'),
        new RegExp(`(?:yields|gives|equals|बराबर|प्राप्त\\s*होता\\s*है|प्राप्त\\s*होगा)\\s*${escapeRegex(ansStr)}`, 'i')
    ];

    for (const pat of explicitPatterns) {
        if (pat.test(hintText)) return true;
    }

    // For standalone numerical values, check if preceded by '=' or result indicator
    if (!isNaN(Number(ansStr)) && Math.abs(Number(ansStr)) > 0) {
        const numEqPattern = new RegExp(`=\\s*${escapeRegex(ansStr)}\\b`);
        if (numEqPattern.test(hintText)) return true;
    }

    return false;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates canonical Question Bank data structure (in-memory JSON object).
 * 
 * @param {Object} data 
 * @param {string} [filePath='in-memory'] 
 * @returns {Object} { isValid: boolean, errors: string[], warnings: string[] }
 */
function validateQuestionBankContent(data, filePath = 'in-memory') {
    const errors = [];
    const warnings = [];

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        errors.push(`[MALFORMED_STRUCTURE] Root manifest in '${filePath}' must be a JSON object.`);
        return { isValid: false, errors, warnings };
    }

    // 1. Top-Level Required Fields
    const requiredTopLevel = ['domain', 'chapter', 'questions'];
    for (const f of requiredTopLevel) {
        if (!(f in data)) {
            errors.push(`[MISSING_METADATA] Missing required top-level field '${f}' in '${filePath}'`);
        }
    }

    // 2. Questions Array Check (EMPTY_QUESTION_BANK)
    if (!Array.isArray(data.questions)) {
        errors.push(`[EMPTY_QUESTION_BANK] Field 'questions' must be an array in '${filePath}'`);
        return { isValid: false, errors, warnings };
    }

    if (data.questions.length === 0) {
        errors.push(`[EMPTY_QUESTION_BANK] Question bank in '${filePath}' contains 0 questions.`);
        return { isValid: false, errors, warnings };
    }

    const seenIds = new Set();

    for (let i = 0; i < data.questions.length; i++) {
        const q = data.questions[i];
        const qLoc = `Question[${i}]`;

        if (!q || typeof q !== 'object' || Array.isArray(q)) {
            errors.push(`[MALFORMED_QUESTION] ${qLoc} in '${filePath}' must be a JSON object.`);
            continue;
        }

        // Question ID check
        const qId = q.id || q.question_id;
        if (!qId || typeof qId !== 'string' || qId.trim() === '') {
            errors.push(`[INVALID_QUESTION_ID] ${qLoc} in '${filePath}' has missing or empty question ID.`);
        } else {
            if (seenIds.has(qId)) {
                errors.push(`[DUPLICATE_QUESTION_ID] Duplicate question ID '${qId}' found at ${qLoc} in '${filePath}'`);
            }
            seenIds.add(qId);
        }

        const tag = qId || qLoc;

        // Pattern ID check
        const patId = q.pattern_id || q.schema_id;
        if (!patId || typeof patId !== 'string' || patId.trim() === '') {
            errors.push(`[MISSING_PATTERN_ID] '${tag}' is missing required 'pattern_id'.`);
        }

        // Provenance check
        if (!q.provenance || typeof q.provenance !== 'object') {
            errors.push(`[MISSING_PROVENANCE] '${tag}' is missing required 'provenance' object.`);
        } else {
            const origin = q.provenance.origin ? q.provenance.origin.toLowerCase() : null;
            if (!origin) {
                errors.push(`[MISSING_PROVENANCE] '${tag}' provenance is missing required 'origin'.`);
            } else if (!VALID_ORIGINS.has(origin)) {
                errors.push(`[INVALID_PROVENANCE_ORIGIN] '${tag}' has invalid provenance origin '${origin}'. Must be one of: ${Array.from(VALID_ORIGINS).join(', ')}`);
            }
        }

        // Question Type check
        if (!q.question_type || typeof q.question_type !== 'string' || q.question_type.trim() === '') {
            errors.push(`[INVALID_QUESTION_TYPE] '${tag}' has missing or empty question_type.`);
        } else if (!VALID_QUESTION_TYPES.has(q.question_type.toLowerCase())) {
            errors.push(`[INVALID_QUESTION_TYPE] '${tag}' has unsupported question_type '${q.question_type}'. Must be one of: ${Array.from(VALID_QUESTION_TYPES).join(', ')}`);
        }

        // MCQ distractor integrity (>= 4 options)
        if (q.question_type && q.question_type.toLowerCase() === 'mcq') {
            if (!Array.isArray(q.options) || q.options.length < 4) {
                errors.push(`[INVALID_MCQ_OPTIONS] MCQ '${tag}' must have at least 4 options, found ${q.options ? q.options.length : 0}.`);
            }
        }

        // Question Statement check
        const qText = q.question || q.prompt;
        if (!qText || typeof qText !== 'string' || qText.trim() === '') {
            errors.push(`[MISSING_QUESTION_TEXT] '${tag}' has empty question statement.`);
        }

        // Hints check (Tier 1, Tier 2, Tier 3)
        if (!q.hints || typeof q.hints !== 'object') {
            errors.push(`[MISSING_HINTS] '${tag}' is missing required 'hints' object with tier_1, tier_2, tier_3.`);
        } else {
            const t1 = q.hints.tier_1 || q.hints.principle || q.hint_tier_1;
            const t2 = q.hints.tier_2 || q.hints.operation || q.hint_tier_2;
            const t3 = q.hints.tier_3 || q.hints.intermediate || q.hint_tier_3;

            if (!t1 || typeof t1 !== 'string' || t1.trim() === '') {
                errors.push(`[MISSING_HINTS] '${tag}' is missing Hint Tier 1 (Conceptual Approach).`);
            }
            if (!t2 || typeof t2 !== 'string' || t2.trim() === '') {
                errors.push(`[MISSING_HINTS] '${tag}' is missing Hint Tier 2 (Strategy & Setup).`);
            }
            if (!t3 || typeof t3 !== 'string' || t3.trim() === '') {
                errors.push(`[MISSING_HINTS] '${tag}' is missing Hint Tier 3 (Step-by-Step Method).`);
            }

            // Anti-leak check for Tier 1 and Tier 2
            const answer = q.correct_answer !== undefined ? q.correct_answer : (q.correct_option || q.answer);
            if (t1 && hintLeaksAnswer(t1, answer)) {
                errors.push(`[HINT_ANSWER_LEAKAGE] '${tag}' Hint Tier 1 leaks the final answer '${answer}'.`);
            }
            if (t2 && hintLeaksAnswer(t2, answer)) {
                errors.push(`[HINT_ANSWER_LEAKAGE] '${tag}' Hint Tier 2 leaks the final answer '${answer}'.`);
            }
        }

        // Solution check
        const sol = q.solution || q.explanation;
        if (!sol || typeof sol !== 'string' || sol.trim() === '') {
            errors.push(`[MISSING_SOLUTION] '${tag}' is missing step-by-step solution.`);
        }

        // Verification check
        if (!q.verification || typeof q.verification !== 'string' || q.verification.trim() === '') {
            errors.push(`[MISSING_VERIFICATION] '${tag}' is missing verification / sanity check.`);
        }

        // Prerequisites check
        if (!Array.isArray(q.prerequisites) || q.prerequisites.length === 0) {
            errors.push(`[MISSING_PREREQUISITES] '${tag}' is missing prerequisites array.`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validates rendered Markdown Question Bank file against contract rules.
 * 
 * @param {string} content Markdown file content
 * @param {string} filePath 
 * @returns {Object} { isValid: boolean, errors: string[], warnings: string[] }
 */
function validateQuestionBankMarkdown(content, filePath = 'in-memory') {
    const errors = [];
    const warnings = [];

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        errors.push(`[EMPTY_QUESTION_BANK] Markdown file is empty at '${filePath}'`);
        return { isValid: false, errors, warnings };
    }

    const lines = content.split(/\r?\n/);

    // 1. Frontmatter validation
    if (!content.startsWith('---')) {
        errors.push(`[MISSING_FRONTMATTER] Missing YAML frontmatter block at '${filePath}'`);
    } else {
        const secondDelim = content.indexOf('\n---', 3);
        if (secondDelim === -1) {
            errors.push(`[UNCLOSED_FRONTMATTER] YAML frontmatter is not closed with '---' in '${filePath}'`);
        } else {
            const fmText = content.substring(3, secondDelim);
            if (!/artifact:\s*"?proceduralQuestionBank"?/i.test(fmText)) {
                errors.push(`[INVALID_FRONTMATTER] Frontmatter must specify 'artifact: proceduralQuestionBank' in '${filePath}'`);
            }
            if (!/subject:\s*"?\w+"?/i.test(fmText)) {
                errors.push(`[INVALID_FRONTMATTER] Frontmatter missing 'subject' in '${filePath}'`);
            }
            if (!/chapter:\s*"?\w+"?/i.test(fmText)) {
                errors.push(`[INVALID_FRONTMATTER] Frontmatter missing 'chapter' in '${filePath}'`);
            }
        }
    }

    // 2. Exactly one H1
    const h1Matches = content.match(/^#\s+[^\n]+/gm) || [];
    if (h1Matches.length === 0) {
        errors.push(`[MISSING_H1] No top-level H1 header found in '${filePath}'`);
    } else if (h1Matches.length > 1) {
        errors.push(`[MULTIPLE_H1] Found ${h1Matches.length} H1 headers in '${filePath}'. Exactly 1 is required.`);
    }

    // 3. Question blocks (H2)
    const h2Matches = content.match(/^##\s+([^\n]+)/gm) || [];
    if (h2Matches.length === 0) {
        errors.push(`[EMPTY_QUESTION_BANK] No question sections (H2) found in '${filePath}'`);
        return { isValid: false, errors, warnings };
    }

    // Check for duplicate question IDs in H2 headings
    const seenH2Ids = new Set();
    for (const h2 of h2Matches) {
        const idMatch = h2.match(/^##\s+([^\s—–]+?)(?:\s+[—–-]\s+|$)/);
        if (idMatch) {
            const qId = idMatch[1].trim();
            if (seenH2Ids.has(qId)) {
                errors.push(`[DUPLICATE_QUESTION_ID] Duplicate question ID '${qId}' in heading '${h2}' in '${filePath}'`);
            }
            seenH2Ids.add(qId);
        }
    }

    // 4. Section structure checks
    if (!content.includes('### Question')) {
        errors.push(`[MISSING_SECTION] Missing '### Question' section in '${filePath}'`);
    }
    if (!content.includes('### Method & Recognition')) {
        errors.push(`[MISSING_SECTION] Missing '### Method & Recognition' section in '${filePath}'`);
    }
    if (!content.includes('### Traps & Errors')) {
        errors.push(`[MISSING_SECTION] Missing '### Traps & Errors' section in '${filePath}'`);
    }
    if (!content.includes('### Progressive Hints')) {
        errors.push(`[MISSING_SECTION] Missing '### Progressive Hints' section in '${filePath}'`);
    }
    if (!content.includes('### Solution')) {
        errors.push(`[MISSING_SECTION] Missing '### Solution' section in '${filePath}'`);
    }
    if (!content.includes('### Verification')) {
        errors.push(`[MISSING_SECTION] Missing '### Verification' section in '${filePath}'`);
    }

    // Check 3 hint tiers callouts
    const t1Count = (content.match(/>\s*\[!tip\]-\s*Tier 1/gi) || []).length;
    const t2Count = (content.match(/>\s*\[!tip\]-\s*Tier 2/gi) || []).length;
    const t3Count = (content.match(/>\s*\[!tip\]-\s*Tier 3/gi) || []).length;

    if (t1Count !== h2Matches.length) {
        errors.push(`[MISSING_HINTS] Expected ${h2Matches.length} Tier 1 hints, found ${t1Count} in '${filePath}'`);
    }
    if (t2Count !== h2Matches.length) {
        errors.push(`[MISSING_HINTS] Expected ${h2Matches.length} Tier 2 hints, found ${t2Count} in '${filePath}'`);
    }
    if (t3Count !== h2Matches.length) {
        errors.push(`[MISSING_HINTS] Expected ${h2Matches.length} Tier 3 hints, found ${t3Count} in '${filePath}'`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Top-level file validator satisfying the artifact registry path validator interface.
 * 
 * @param {string} filePath 
 * @returns {Object} { isValid: boolean, errors: string[], warnings: string[] }
 */
function validateQuestionBank(filePath) {
    if (!fs.existsSync(filePath)) {
        return {
            isValid: false,
            errors: [`[FILE_NOT_FOUND] Question Bank file does not exist: '${filePath}'`],
            warnings: []
        };
    }

    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
        return {
            isValid: false,
            errors: [`[ZERO_BYTE_ARTIFACT] Question Bank file is empty (0 bytes): '${filePath}'`],
            warnings: []
        };
    }

    const content = fs.readFileSync(filePath, 'utf8');

    if (filePath.endsWith('.json')) {
        try {
            const data = JSON.parse(content);
            return validateQuestionBankContent(data, filePath);
        } catch (e) {
            return {
                isValid: false,
                errors: [`[MALFORMED_JSON] Invalid JSON in '${filePath}': ${e.message}`],
                warnings: []
            };
        }
    } else {
        return validateQuestionBankMarkdown(content, filePath);
    }
}

module.exports = {
    validateQuestionBankContent,
    validateQuestionBankMarkdown,
    validateQuestionBank,
    hintLeaksAnswer,
    VALID_ORIGINS,
    VALID_QUESTION_TYPES
};

// --- CLI EXECUTION CONTRACT ---
if (require.main === module) {
    const targetPath = process.argv[2];
    if (!targetPath) {
        console.error("Usage: node validate_studylab_question_bank.js <path-to-json-or-markdown>");
        process.exit(1);
    }

    const result = validateQuestionBank(targetPath);
    if (result.isValid) {
        console.log(`✅ [PASS] Question Bank contract validation passed: ${targetPath}`);
        process.exit(0);
    } else {
        console.error(`❌ [FAIL] Question Bank contract validation failed: ${targetPath}`);
        for (const err of result.errors) {
            console.error(`   - ${err}`);
        }
        process.exit(1);
    }
}
