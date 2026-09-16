/**
 * StudySourceCore Semantic Learning IR Independent Validator (`validate_semantic_ir.js`)
 * 
 * Executes comprehensive schema, AST, and pedagogical invariant verification:
 * 1. Draft-07 Ajv schema conformance against `semantic-learning-ir.schema.json`.
 * 2. Strict versioning assertion (schema_version === "1.0.0").
 * 3. Identifier uniqueness (KUs, Relationships, Practice Items).
 * 4. Referential integrity across KUs and prerequisite DAGs.
 * 5. Full 11-field Content Lineage Record (CLR) completeness on all items.
 * 6. Non-leaking progressive hint invariants (Tier 1 & Tier 2 terminal answer immunity).
 * 7. MCQ options invariant (>= 4 choices).
 * 8. Deterministic serialization round-trip verification.
 * 
 * Fail-closed: Never bypasses validation through fallback paths.
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const { validateContentLineageRecord } = require('./content_lineage_record');
const { serializeSemanticIR, computeIRHash } = require('./semantic_learning_ir');

const SCHEMA_PATH = path.join(__dirname, '..', 'resources', 'schemas', 'semantic-learning-ir.schema.json');

let ajvValidator = null;
function getAjvValidator() {
    if (!ajvValidator) {
        const ajv = new Ajv({ allErrors: true, strict: false });
        const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
        ajvValidator = ajv.compile(schema);
    }
    return ajvValidator;
}

/**
 * Checks whether a hint string leaks the final terminal answer.
 */
function hintLeaksTerminalAnswer(hintText, answerOrOption) {
    if (!hintText || !answerOrOption) return false;
    const cleanHint = hintText.toLowerCase().trim();
    const cleanTarget = String(answerOrOption).toLowerCase().trim();

    // Ignore single common digits or very short words (e.g. 'a', 'the', '1', '2') to avoid false positives
    if (cleanTarget.length <= 1) return false;

    // Direct verbatim leak of multi-character answer
    if (cleanTarget.length >= 2 && cleanHint.includes(cleanTarget)) {
        // Regex word boundary match if alphanumeric
        const escaped = cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
        return pattern.test(cleanHint);
    }

    return false;
}

/**
 * Validates a Semantic Learning IR instance.
 * Returns { isValid: boolean, errors: string[], warnings: string[] }
 */
function validateSemanticIR(ir, options = {}) {
    const errors = [];
    const warnings = [];

    if (!ir || typeof ir !== 'object') {
        const msg = 'IR must be a non-null object';
        if (options.shouldThrow) throw new Error(`IR_VALIDATION_FAILURE: ${msg}`);
        return { isValid: false, errors: [msg], warnings };
    }

    // 1. Schema Version Check
    if (ir.schema_version !== '1.0.0') {
        errors.push(`UNSUPPORTED_SCHEMA_VERSION: Expected "1.0.0", got "${ir.schema_version}"`);
    }

    // 2. Ajv Schema Conformance
    try {
        const validate = getAjvValidator();
        const valid = validate(ir);
        if (!valid && validate.errors) {
            for (const err of validate.errors) {
                errors.push(`Schema violation at ${err.instancePath}: ${err.message}`);
            }
        }
    } catch (err) {
        errors.push(`AJV_SCHEMA_COMPILATION_ERROR: ${err.message}`);
    }

    // 3. Identifier Uniqueness Checks
    const kuIds = new Set();
    const practiceItemIds = new Set();
    const relIds = new Set();

    if (Array.isArray(ir.knowledge_units)) {
        for (const ku of ir.knowledge_units) {
            if (kuIds.has(ku.id)) {
                errors.push(`DUPLICATE_SEMANTIC_ID: Duplicate Knowledge Unit id: "${ku.id}"`);
            }
            kuIds.add(ku.id);

            // 4. 11-Field CLR Check on each KU
            if (!ku.clr) {
                errors.push(`INCOMPLETE_CLR: Knowledge Unit "${ku.id}" lacks a CLR`);
            } else {
                const clrRes = validateContentLineageRecord(ku.clr);
                if (!clrRes.isValid) {
                    errors.push(`INVALID_CLR on KU "${ku.id}": ${clrRes.errors.join('; ')}`);
                }
                if (ku.clr.ku_id && ku.clr.ku_id !== ku.id) {
                    errors.push(`CLR_ID_MISMATCH on KU "${ku.id}": CLR ku_id "${ku.clr.ku_id}" !== KU id "${ku.id}"`);
                }
            }
        }
    }

    if (Array.isArray(ir.practice_items)) {
        for (const item of ir.practice_items) {
            if (practiceItemIds.has(item.id)) {
                errors.push(`DUPLICATE_SEMANTIC_ID: Duplicate Practice Item id: "${item.id}"`);
            }
            practiceItemIds.add(item.id);

            // 11-Field CLR Check on Practice Item
            if (!item.clr) {
                errors.push(`INCOMPLETE_CLR: Practice Item "${item.id}" lacks a CLR`);
            } else {
                const clrRes = validateContentLineageRecord(item.clr);
                if (!clrRes.isValid) {
                    errors.push(`INVALID_CLR on Item "${item.id}": ${clrRes.errors.join('; ')}`);
                }
            }

            // MCQ Invariant (>= 4 options)
            if (item.question_type === 'mcq') {
                if (!Array.isArray(item.options) || item.options.length < 4) {
                    errors.push(`MCQ_INVARIANT_VIOLATION: Practice item "${item.id}" has ${item.options ? item.options.length : 0} options (minimum 4 required)`);
                }
            }

            // Pedagogical Non-Leaking 3-Tier Hint Invariant
            if (item.hints) {
                const terminalAnswers = [
                    item.answer,
                    item.correct_option
                ].filter(Boolean);

                for (const target of terminalAnswers) {
                    if (hintLeaksTerminalAnswer(item.hints.tier1_conceptual, target)) {
                        errors.push(`HINT_ANSWER_LEAKAGE: Practice item "${item.id}" Tier 1 hint leaks answer "${target}"`);
                    }
                    if (hintLeaksTerminalAnswer(item.hints.tier2_strategic, target)) {
                        errors.push(`HINT_ANSWER_LEAKAGE: Practice item "${item.id}" Tier 2 hint leaks answer "${target}"`);
                    }
                }
            }
        }
    }

    if (Array.isArray(ir.relationships)) {
        for (const rel of ir.relationships) {
            if (relIds.has(rel.id)) {
                errors.push(`DUPLICATE_SEMANTIC_ID: Duplicate Relationship id: "${rel.id}"`);
            }
            relIds.add(rel.id);

            // Referential Integrity: source and target must exist in KUs
            if (!kuIds.has(rel.source_ku_id)) {
                errors.push(`BROKEN_REFERENTIAL_INTEGRITY: Relationship "${rel.id}" references non-existent source_ku_id: "${rel.source_ku_id}"`);
            }
            if (!kuIds.has(rel.target_ku_id)) {
                errors.push(`BROKEN_REFERENTIAL_INTEGRITY: Relationship "${rel.id}" references non-existent target_ku_id: "${rel.target_ku_id}"`);
            }
        }
    }

    // 5. Deterministic Serialization Round-Trip Verification
    try {
        const serialized1 = serializeSemanticIR(ir);
        const parsed = JSON.parse(serialized1);
        const serialized2 = serializeSemanticIR(parsed);
        if (serialized1 !== serialized2) {
            errors.push('SERIALIZATION_NON_DETERMINISTIC: Round-trip serialization produced diverging output');
        }
    } catch (e) {
        errors.push(`SERIALIZATION_ERROR: Failed round-trip serialization test: ${e.message}`);
    }

    const isValid = errors.length === 0;

    if (!isValid && options.shouldThrow) {
        throw new Error(`SEMANTIC_IR_VALIDATION_FAILED:\n  - ${errors.join('\n  - ')}`);
    }

    return {
        isValid,
        errors,
        warnings
    };
}

module.exports = {
    validateSemanticIR,
    hintLeaksTerminalAnswer,
    getAjvValidator
};
