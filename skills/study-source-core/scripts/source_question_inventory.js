/**
 * StudySourceCore Canonical Source Question Inventory Layer (`source_question_inventory.js`)
 * 
 * Authoritative representation of extracted authentic source questions.
 * 
 * Core Invariants:
 * 1. ZERO-DROP PRESERVATION: Every legitimate distinct source question must receive a stable unique
 *    source-question identity and preserve:
 *      - original question text
 *      - original options for MCQs (lossless)
 *      - source / provenance (exam, year, shift, paper, book, section)
 *      - source question number / reference when available
 *      - question type when determinable
 * 2. ANTI-COLLAPSING RULE: Distinct source questions must NEVER be deduplicated, merged, or
 *    dropped merely because they share a pattern, method, formula, or concept (1 Pattern != 1 Question).
 * 3. EXPLICIT REMOVAL AUDIT: Only exact/true duplicates or genuinely invalid/incomplete extractions
 *    may be removed, and EVERY removal must be explicitly recorded with a structured reason.
 * 4. UNBOUNDED CAPACITY: Never hardcodes question counts (such as 40, 50, 100, or 8).
 * 5. SINGLE AUTHORITATIVE SOURCE: Downstream semantic and procedural engines consume this inventory
 *    without replacing it with a smaller representative-question subset.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SCHEMA_VERSION = '1.0.0';

/**
 * Computes SHA-256 hash of UTF-8 content.
 */
function computeSha256(content) {
    return crypto.createHash('sha256').update(content || '', 'utf8').digest('hex');
}

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
 * Normalizes question text for fingerprinting (collapses whitespace, lowercases).
 */
function normalizeTextForFingerprint(text) {
    if (!text || typeof text !== 'string') return '';
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Computes a deterministic raw fingerprint for exact duplicate detection.
 * Considers normalized text + sorted normalized options + source reference if available.
 */
function computeQuestionFingerprint(text, options = [], correctAnswer = null) {
    const normText = normalizeTextForFingerprint(text);
    const normOptions = Array.isArray(options)
        ? options.map(o => normalizeTextForFingerprint(String(o))).sort().join('|')
        : '';
    const normAns = correctAnswer !== null && correctAnswer !== undefined
        ? normalizeTextForFingerprint(String(correctAnswer))
        : '';
    const payload = `${normText}###${normOptions}###${normAns}`;
    return computeSha256(payload);
}

/**
 * Generates a stable, deterministic source question identifier.
 */
function generateSourceQuestionId(subject, chapter, rawIdOrRef, fingerprint) {
    const subjSlug = toSlug(subject);
    const chapSlug = toSlug(chapter);
    if (rawIdOrRef && typeof rawIdOrRef === 'string' && rawIdOrRef.trim().length > 0) {
        const cleanRef = rawIdOrRef.trim().replace(/[^a-zA-Z0-9_.-]/g, '_');
        return `sqi.${subjSlug}.${chapSlug}.${cleanRef}`;
    }
    const fpPrefix = (fingerprint || '00000000').substring(0, 8);
    return `sqi.${subjSlug}.${chapSlug}.${fpPrefix}`;
}

/**
 * Constructs a single canonical Source Question Inventory item.
 */
function createSourceQuestionItem(params, context = {}) {
    const subject = context.subject || params.subject || 'General';
    const chapter = context.chapter || params.chapter || 'Overview';

    const rawText = params.question_text || params.statement || params.prompt || params.stem || params.question || '';
    const questionText = typeof rawText === 'string' ? rawText.trim() : String(rawText).trim();

    const options = Array.isArray(params.options) ? params.options.map(o => String(o).trim()) : [];
    const questionNumber = params.question_number || params.question_num || params.q_num || params.number || null;

    const answer = params.correct_answer !== undefined ? params.correct_answer : params.answer;
    const rawFingerprint = params.raw_fingerprint || computeQuestionFingerprint(questionText, options, answer);

    const rawId = params.source_question_id || params.source_id || params.id || params.item_id || null;
    const sourceQuestionId = rawId && String(rawId).startsWith('sqi.')
        ? String(rawId)
        : generateSourceQuestionId(subject, chapter, rawId, rawFingerprint);

    // Determine question type
    let questionType = params.question_type || params.raw_type || params.type;
    if (!questionType) {
        if (options.length > 0) {
            questionType = 'mcq';
        } else if (params.correct_answer !== undefined || params.answer !== undefined) {
            const ansStr = String(params.correct_answer || params.answer || '');
            questionType = /^-?\d+(\.\d+)?$/.test(ansStr.trim()) ? 'numerical' : 'structured';
        } else {
            questionType = 'unknown';
        }
    }
    questionType = String(questionType).toLowerCase();

    // Canonical provenance
    let provenance = params.provenance || params.source_provenance || {};
    if (typeof provenance !== 'object' || provenance === null) {
        provenance = { source: String(provenance) };
    }
    const sourceTitle = provenance.source || params.source || params.source_title || context.source_title || 'Authentic Source Evidence';
    const exam = provenance.exam || params.exam || null;
    const year = provenance.year || params.year || null;
    const shift = provenance.shift || params.shift || null;
    const page = provenance.page !== undefined ? params.page : (params.page !== undefined ? params.page : null);
    const origin = provenance.origin || params.origin || (exam ? 'authentic_pyq' : 'curated_source');

    const canonicalProvenance = {
        source: sourceTitle,
        exam,
        year,
        shift,
        page,
        origin
    };

    const correctAnswer = params.correct_answer !== undefined
        ? params.correct_answer
        : (params.answer !== undefined ? params.answer : (params.correct_option !== undefined ? params.correct_option : null));

    const difficulty = typeof params.difficulty === 'number'
        ? Math.max(1.0, Math.min(5.0, params.difficulty))
        : (parseFloat(params.difficulty) || 2.0);

    const patternRef = params.pattern_ref || params.pattern_id || params.schema_id || null;
    const solutionSteps = Array.isArray(params.source_solution_steps || params.solution_steps || params.steps)
        ? (params.source_solution_steps || params.solution_steps || params.steps).map(s => String(s).trim())
        : [];
    const prerequisites = Array.isArray(params.prerequisites)
        ? params.prerequisites.map(p => String(p).trim())
        : [];

    return {
        source_question_id: sourceQuestionId,
        question_number: questionNumber ? String(questionNumber) : null,
        question_text: questionText,
        question_type: questionType,
        options,
        correct_answer: correctAnswer !== null ? String(correctAnswer).trim() : null,
        difficulty,
        pattern_ref: patternRef ? String(patternRef).trim() : null,
        provenance: canonicalProvenance,
        prerequisites,
        solution_steps: solutionSteps,
        raw_fingerprint: rawFingerprint
    };
}

/**
 * Builds the canonical Source Question Inventory from raw input.
 * 
 * Extracts from:
 * - fixture.source_question_inventory
 * - fixture.source_problems
 * - fixture.source_questions
 * - fixture.practice_problems
 * - fixture.practice_questions
 * - fixture.questions
 * - or raw array of problem objects
 * 
 * Strict Deduplication Policy:
 * - Only exact/true duplicates (identical raw_fingerprint) or invalid/empty extractions are removed.
 * - Every removal is explicitly recorded with a structured reason in `removals`.
 * - Distinct questions sharing a pattern/method are 100% preserved.
 * - Question counts are NEVER capped or sliced.
 */
function buildSourceQuestionInventory(rawInput, context = {}, options = {}) {
    const subject = context.subject || (rawInput && rawInput.subject) || 'General';
    const chapter = context.chapter || (rawInput && rawInput.chapter) || 'Overview';
    const domain = context.domain || (rawInput && rawInput.domain) || subject;
    const sourceId = context.source_id || (rawInput && rawInput.source_id) || 'src.study.generic';
    const sourceHash = context.source_hash || (rawInput && rawInput.source_hash) || null;

    let candidateList = [];

    // 1. Resolve raw question items
    if (Array.isArray(rawInput)) {
        candidateList = rawInput;
    } else if (rawInput && typeof rawInput === 'object') {
        if (rawInput.source_question_inventory && Array.isArray(rawInput.source_question_inventory.questions)) {
            // Already an inventory
            candidateList = rawInput.source_question_inventory.questions;
        } else if (Array.isArray(rawInput.source_problems)) {
            candidateList = rawInput.source_problems;
        } else if (Array.isArray(rawInput.source_questions)) {
            candidateList = rawInput.source_questions;
        } else if (Array.isArray(rawInput.practice_problems)) {
            candidateList = rawInput.practice_problems;
        } else if (Array.isArray(rawInput.practice_questions)) {
            candidateList = rawInput.practice_questions;
        } else if (Array.isArray(rawInput.questions)) {
            candidateList = rawInput.questions;
        }
    } else if (typeof rawInput === 'string') {
        // Parse from markdown text if markdown string provided
        candidateList = parseInventoryItemsFromMarkdownText(rawInput, { subject, chapter });
    }

    const seenFingerprints = new Map(); // raw_fingerprint -> first question_id
    const seenQuestionIds = new Set();
    const validQuestions = [];
    const removals = [];

    let totalExtracted = candidateList.length;

    for (let i = 0; i < candidateList.length; i++) {
        const rawItem = candidateList[i];
        if (!rawItem || typeof rawItem !== 'object') {
            removals.push({
                item_id: `item_${i + 1}`,
                reason: 'UNPARSEABLE_CORRUPT_EXTRACTION',
                details: 'Raw extraction item is null or not an object',
                duplicate_of: null,
                timestamp: new Date().toISOString()
            });
            continue;
        }

        const rawText = rawItem.question_text || rawItem.statement || rawItem.prompt || rawItem.stem || rawItem.question || '';
        if (typeof rawText !== 'string' || rawText.trim().length === 0) {
            removals.push({
                item_id: rawItem.id || rawItem.source_id || `item_${i + 1}`,
                reason: 'EMPTY_QUESTION_TEXT',
                details: 'Extraction produced zero question statement / prompt characters',
                duplicate_of: null,
                timestamp: new Date().toISOString()
            });
            continue;
        }

        // Create normalized item
        const item = createSourceQuestionItem(rawItem, { subject, chapter, ...context });

        // Check for EXACT TRUE DUPLICATE
        if (seenFingerprints.has(item.raw_fingerprint)) {
            const firstId = seenFingerprints.get(item.raw_fingerprint);
            removals.push({
                item_id: item.source_question_id,
                reason: 'EXACT_TRUE_DUPLICATE',
                details: `Exact content and options match with existing item '${firstId}'`,
                duplicate_of: firstId,
                timestamp: new Date().toISOString()
            });
            continue;
        }

        // Ensure unique source_question_id
        let finalId = item.source_question_id;
        let suffix = 1;
        while (seenQuestionIds.has(finalId)) {
            finalId = `${item.source_question_id}_${suffix}`;
            suffix++;
        }
        item.source_question_id = finalId;

        seenFingerprints.set(item.raw_fingerprint, finalId);
        seenQuestionIds.add(finalId);
        validQuestions.push(item);
    }

    const inventoryHash = computeSha256(JSON.stringify(validQuestions));
    const inventoryId = `sqi.${toSlug(subject)}.${toSlug(chapter)}.${inventoryHash.substring(0, 12)}`;

    const inventory = {
        schema_version: SCHEMA_VERSION,
        inventory_id: inventoryId,
        subject,
        chapter,
        domain,
        source_id: sourceId,
        source_hash: sourceHash,
        total_extracted: totalExtracted,
        valid_questions_count: validQuestions.length,
        removed_count: removals.length,
        questions: validQuestions,
        removals,
        created_at: new Date().toISOString()
    };

    return inventory;
}

/**
 * Losslessly renders the Source Question Inventory into Evidence Pack Markdown Section 5.
 */
function renderInventoryToEvidenceMarkdown(inventory) {
    const lines = [];
    lines.push('## 5. Authentic Source Problems & PYQs');
    lines.push('');

    const questions = Array.isArray(inventory.questions) ? inventory.questions : [];

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const idx = i + 1;
        lines.push(`### Source Problem ${idx} (${q.source_question_id})`);
        if (q.question_number) {
            lines.push(`- Question Number: ${q.question_number}`);
        }
        if (q.provenance && q.provenance.exam) {
            lines.push(`- Exam: ${q.provenance.exam}`);
        } else if (q.provenance && q.provenance.source) {
            lines.push(`- Exam: ${q.provenance.source}`);
        }
        if (q.pattern_ref) {
            lines.push(`- Pattern Ref: ${q.pattern_ref}`);
        }
        lines.push(`- Type: ${q.question_type}`);

        // Multi-line safe statement emission
        const statementLines = q.question_text.split(/\r?\n/);
        lines.push(`- Statement: ${statementLines[0]}`);
        for (let s = 1; s < statementLines.length; s++) {
            lines.push(statementLines[s]);
        }

        if (Array.isArray(q.options) && q.options.length > 0) {
            lines.push('- Options:');
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            q.options.forEach((opt, oIdx) => {
                const label = oIdx < alphabet.length ? alphabet[oIdx] : String(oIdx + 1);
                lines.push(`  - (${label}) ${opt}`);
            });
        }

        if (q.correct_answer !== null && q.correct_answer !== undefined) {
            lines.push(`- Correct Answer: ${q.correct_answer}`);
        }
        lines.push(`- Difficulty: ${q.difficulty}`);

        if (Array.isArray(q.solution_steps) && q.solution_steps.length > 0) {
            lines.push('- Solution Steps:');
            q.solution_steps.forEach((st, sIdx) => {
                lines.push(`  ${sIdx + 1}. ${st}`);
            });
        }

        if (Array.isArray(q.prerequisites) && q.prerequisites.length > 0) {
            lines.push(`- Prerequisites: ${q.prerequisites.join(', ')}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Parses inventory items from Evidence Pack markdown Section 5 text.
 */
function parseInventoryItemsFromMarkdownText(markdownText, context = {}) {
    const lines = markdownText.split(/\r?\n/);
    const questions = [];

    let currentSection = null;
    let currentItem = null;

    function flushCurrentItem() {
        if (currentItem) {
            questions.push({
                source_question_id: currentItem.source_id,
                question_number: currentItem.question_number,
                statement: currentItem.statement,
                question_text: currentItem.statement,
                raw_type: currentItem.raw_type,
                options: currentItem.options,
                correct_answer: currentItem.correct_answer,
                difficulty: currentItem.difficulty,
                pattern_ref: currentItem.pattern_ref,
                exam: currentItem.exam,
                prerequisites: currentItem.prerequisites,
                source_solution_steps: currentItem.source_solution_steps
            });
            currentItem = null;
        }
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith('## 5. Authentic Source Problems')) {
            currentSection = 'PROBLEMS';
            continue;
        } else if (trimmed.startsWith('## ') && currentSection === 'PROBLEMS') {
            // New major section, flush and exit
            flushCurrentItem();
            currentSection = null;
            continue;
        }

        if (currentSection === 'PROBLEMS') {
            if (trimmed.startsWith('### Source Problem') || trimmed.startsWith('### Problem')) {
                flushCurrentItem();
                const m = trimmed.match(/###\s*(?:Source Problem\s*\d+|Problem)\s*(?:\(([^)]+)\)|:\s*([^\n]+))/);
                const id = m ? (m[1] || m[2] || '').trim() : `item-${questions.length + 1}`;
                currentItem = {
                    source_id: id,
                    question_number: null,
                    statement: '',
                    options: [],
                    source_solution_steps: [],
                    prerequisites: [],
                    raw_type: 'unknown',
                    difficulty: 2.0,
                    exam: null,
                    pattern_ref: null,
                    _readingStatement: false,
                    _readingSteps: false
                };
            } else if (currentItem) {
                if (trimmed.startsWith('- Question Number:')) {
                    currentItem._readingStatement = false;
                    currentItem._readingSteps = false;
                    currentItem.question_number = trimmed.substring(18).trim();
                } else if (trimmed.startsWith('- Source Question ID:')) {
                    currentItem._readingStatement = false;
                    currentItem._readingSteps = false;
                    currentItem.source_id = trimmed.substring(21).trim();
                } else if (trimmed.startsWith('- Exam:')) {
                    currentItem._readingStatement = false;
                    currentItem._readingSteps = false;
                    currentItem.exam = trimmed.substring(7).trim();
                } else if (trimmed.startsWith('- Pattern Ref:')) {
                    currentItem._readingStatement = false;
                    currentItem._readingSteps = false;
                    currentItem.pattern_ref = trimmed.substring(14).trim();
                } else if (trimmed.startsWith('- Type:')) {
                    currentItem._readingStatement = false;
                    currentItem._readingSteps = false;
                    currentItem.raw_type = trimmed.substring(7).trim().toLowerCase();
                } else if (trimmed.startsWith('- Statement:')) {
                    currentItem.statement = trimmed.substring(12).trim();
                    currentItem._readingStatement = true;
                    currentItem._readingSteps = false;
                } else if (trimmed.startsWith('- Correct Answer:')) {
                    currentItem._readingStatement = false;
                    currentItem._readingSteps = false;
                    currentItem.correct_answer = trimmed.substring(17).trim();
                } else if (trimmed.startsWith('- Difficulty:')) {
                    currentItem._readingStatement = false;
                    currentItem._readingSteps = false;
                    currentItem.difficulty = parseFloat(trimmed.substring(13).trim()) || 2.0;
                } else if (trimmed.startsWith('- Prerequisites:')) {
                    currentItem._readingStatement = false;
                    currentItem._readingSteps = false;
                    currentItem.prerequisites = trimmed.substring(16).split(',').map(s => s.trim()).filter(Boolean);
                } else if (trimmed.startsWith('- Solution Steps:')) {
                    currentItem._readingStatement = false;
                    currentItem._readingSteps = true;
                } else if (trimmed.startsWith('- Options:')) {
                    currentItem._readingStatement = false;
                    currentItem._readingSteps = false;
                } else if (/^[\s-]*\([A-Za-z0-9]+\)\s*/.test(trimmed)) {
                    currentItem._readingStatement = false;
                    currentItem._readingSteps = false;
                    const optText = trimmed.replace(/^[\s-]*\([A-Za-z0-9]+\)\s*/, '').trim();
                    currentItem.options.push(optText);
                } else if (currentItem._readingSteps && /^\d+\.\s*/.test(trimmed)) {
                    currentItem.source_solution_steps.push(trimmed.replace(/^\d+\.\s*/, '').trim());
                } else if (currentItem._readingStatement && !trimmed.startsWith('- ') && !trimmed.startsWith('### ') && !trimmed.startsWith('## ')) {
                    if (trimmed.length > 0) {
                        currentItem.statement += '\n' + trimmed;
                    }
                }
            }
        }
    }

    flushCurrentItem();
    return questions;
}

/**
 * Validates canonical Source Question Inventory object.
 */
function validateSourceQuestionInventory(inventory) {
    const errors = [];
    const warnings = [];

    if (!inventory || typeof inventory !== 'object') {
        return { isValid: false, errors: ['Source Question Inventory must be a non-null object'], warnings };
    }

    if (inventory.schema_version !== SCHEMA_VERSION) {
        errors.push(`Invalid schema_version '${inventory.schema_version}'. Expected '${SCHEMA_VERSION}'`);
    }

    if (!inventory.inventory_id || typeof inventory.inventory_id !== 'string') {
        errors.push("Missing or invalid 'inventory_id'");
    }

    if (!inventory.subject) errors.push("Missing 'subject'");
    if (!inventory.chapter) errors.push("Missing 'chapter'");

    if (!Array.isArray(inventory.questions)) {
        errors.push("'questions' must be an array");
    } else {
        const ids = new Set();
        inventory.questions.forEach((q, idx) => {
            const prefix = `questions[${idx}] (${q.source_question_id || 'unknown'})`;
            if (!q.source_question_id) {
                errors.push(`${prefix}: Missing 'source_question_id'`);
            } else if (ids.has(q.source_question_id)) {
                errors.push(`${prefix}: Duplicate 'source_question_id' detected: '${q.source_question_id}'`);
            } else {
                ids.add(q.source_question_id);
            }

            if (!q.question_text || q.question_text.trim().length === 0) {
                errors.push(`${prefix}: Missing or empty 'question_text'`);
            }

            if (!q.question_type) {
                errors.push(`${prefix}: Missing 'question_type'`);
            }

            if (q.question_type === 'mcq') {
                if (!Array.isArray(q.options) || q.options.length < 2) {
                    errors.push(`${prefix}: MCQ questions must contain at least 2 options`);
                }
            }

            if (!q.provenance || typeof q.provenance !== 'object' || !q.provenance.source) {
                errors.push(`${prefix}: Missing valid 'provenance' object with 'source' field`);
            }
        });
    }

    if (!Array.isArray(inventory.removals)) {
        errors.push("'removals' must be an array");
    } else {
        inventory.removals.forEach((r, idx) => {
            const prefix = `removals[${idx}]`;
            if (!r.item_id) errors.push(`${prefix}: Missing 'item_id'`);
            if (!r.reason) errors.push(`${prefix}: Missing explicit 'reason'`);
            if (!r.timestamp) errors.push(`${prefix}: Missing 'timestamp'`);
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        questionCount: inventory.questions ? inventory.questions.length : 0,
        removedCount: inventory.removals ? inventory.removals.length : 0
    };
}

module.exports = {
    SCHEMA_VERSION,
    computeSha256,
    toSlug,
    computeQuestionFingerprint,
    generateSourceQuestionId,
    createSourceQuestionItem,
    buildSourceQuestionInventory,
    renderInventoryToEvidenceMarkdown,
    parseInventoryItemsFromMarkdownText,
    validateSourceQuestionInventory
};
