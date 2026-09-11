/**
 * StudySourceCore Phase 7 Failure Classification & Adaptive Retry Policy (`retry_policy.js`)
 * 
 * Provides deterministic failure diagnosis, retry class assignment, targeted
 * parameter adaptation, and strict enforcement of global resource limits.
 * 
 * Non-Negotiable Invariants:
 * 1. Absolute Launch Limit: MAX 10 total launches per mission tree. Retries count toward limits.
 * 2. Absolute Concurrency Limit: MAX 4 concurrent workers.
 * 3. Parent Self-Execution Ban: Retries must never shortcut through parent execution.
 * 4. Blast Radius Isolation: Failure in one artifact isolates locally without invalidating siblings.
 * 5. Targeted Adaptation: Retries modify context, model class, or constraints rather than blindly repeating.
 */

const RETRY_CLASSES = {
    LOW: { name: 'LOW', defaultMaxRetries: 1 },
    MEDIUM: { name: 'MEDIUM', defaultMaxRetries: 1 },
    HIGH: { name: 'HIGH', defaultMaxRetries: 2 },
    CRITICAL: { name: 'CRITICAL', defaultMaxRetries: 0 }
};

const FAILURE_CLASSES = {
    TRANSIENT_TOOL_FAILURE: 'TRANSIENT_TOOL_FAILURE',
    MODEL_OUTPUT_MALFORMED: 'MODEL_OUTPUT_MALFORMED',
    INCOMPLETE_OUTPUT: 'INCOMPLETE_OUTPUT',
    SCHEMA_VALIDATION_FAILURE: 'SCHEMA_VALIDATION_FAILURE',
    CONTENT_VALIDATION_FAILURE: 'CONTENT_VALIDATION_FAILURE',
    CONTRACT_VIOLATION: 'CONTRACT_VIOLATION',
    CONTEXT_OVERFLOW: 'CONTEXT_OVERFLOW',
    SPECIALIST_FAILURE: 'SPECIALIST_FAILURE',
    TIMEOUT: 'TIMEOUT',
    SOURCE_PROVENANCE_FAILURE: 'SOURCE_PROVENANCE_FAILURE',
    SLICE_PROVENANCE_CORRUPTION: 'SLICE_PROVENANCE_CORRUPTION',
    SECURITY_BOUNDARY_VIOLATION: 'SECURITY_BOUNDARY_VIOLATION'
};

const FAILURE_TO_RETRY_CLASS_MAP = {
    [FAILURE_CLASSES.TRANSIENT_TOOL_FAILURE]: RETRY_CLASSES.LOW,
    [FAILURE_CLASSES.MODEL_OUTPUT_MALFORMED]: RETRY_CLASSES.MEDIUM,
    [FAILURE_CLASSES.INCOMPLETE_OUTPUT]: RETRY_CLASSES.MEDIUM,
    [FAILURE_CLASSES.SCHEMA_VALIDATION_FAILURE]: RETRY_CLASSES.MEDIUM,
    [FAILURE_CLASSES.TIMEOUT]: RETRY_CLASSES.MEDIUM,
    [FAILURE_CLASSES.SLICE_PROVENANCE_CORRUPTION]: RETRY_CLASSES.MEDIUM,
    [FAILURE_CLASSES.CONTENT_VALIDATION_FAILURE]: RETRY_CLASSES.HIGH,
    [FAILURE_CLASSES.CONTRACT_VIOLATION]: RETRY_CLASSES.HIGH,
    [FAILURE_CLASSES.CONTEXT_OVERFLOW]: RETRY_CLASSES.HIGH,
    [FAILURE_CLASSES.SPECIALIST_FAILURE]: RETRY_CLASSES.HIGH,
    [FAILURE_CLASSES.SOURCE_PROVENANCE_FAILURE]: RETRY_CLASSES.CRITICAL,
    [FAILURE_CLASSES.SECURITY_BOUNDARY_VIOLATION]: RETRY_CLASSES.CRITICAL // Retries explicitly set to 0 for security
};

const GLOBAL_RESOURCE_LIMITS = {
    MAX_CONCURRENT_WORKERS: 4,
    MAX_TOTAL_LAUNCHES: 10
};

/**
 * Classifies an error string or Error object into a canonical failure class.
 * 
 * @param {Error|string|Array} errorOrErrors
 * @returns {Object} { failure_class, retry_class, error_message, is_terminal }
 */
function classifyFailure(errorOrErrors) {
    let msg = '';
    if (Array.isArray(errorOrErrors)) {
        msg = errorOrErrors.map(e => typeof e === 'string' ? e : (e.message || JSON.stringify(e))).join('; ');
    } else if (typeof errorOrErrors === 'string') {
        msg = errorOrErrors;
    } else if (errorOrErrors && errorOrErrors.message) {
        msg = errorOrErrors.message;
    } else {
        msg = String(errorOrErrors || 'Unknown failure');
    }

    // 1. Security Violations (Non-Retryable / Terminal)
    if (msg.includes('PARENT_SELF_EXECUTION_VIOLATION') ||
        msg.includes('SINGLE_WRITER_COLLISION') ||
        msg.includes('OWNERSHIP_VIOLATION') ||
        msg.includes('OWNERSHIP_MISMATCH')) {
        return {
            failure_class: FAILURE_CLASSES.SECURITY_BOUNDARY_VIOLATION,
            retry_class: RETRY_CLASSES.CRITICAL.name,
            error_message: msg,
            is_terminal: true, // Never retry security boundary breach
            suggested_action: 'ABORT_TASK_AND_REPAIR_DISPATCH_IDENTITY'
        };
    }

    // 2. Provenance Violations (Distinguish canonical source loss vs recoverable slice corruption)
    if (msg.includes('CONTEXT_PROVENANCE_FAILURE') ||
        msg.includes('SLICE_PROVENANCE_CORRUPTION') ||
        msg.includes('Evidence SHA-256 hash mismatch') ||
        msg.includes('SHA-256 mismatch') ||
        msg.includes('hash mismatch') ||
        msg.includes('LINEAGE_BREACH') ||
        msg.includes('PROVENANCE_MISSING') ||
        msg.includes('tampering detected') ||
        msg.includes('dummy hash')) {
        const isSliceCorruptionOnly = msg.includes('SLICE_PROVENANCE_CORRUPTION') || msg.includes('Context slice content tampering detected') || msg.includes('slice hash mismatch');
        if (isSliceCorruptionOnly) {
            return {
                failure_class: FAILURE_CLASSES.SLICE_PROVENANCE_CORRUPTION,
                retry_class: RETRY_CLASSES.MEDIUM.name,
                error_message: msg,
                is_terminal: false,
                suggested_action: 'REGENERATE_DERIVED_SLICE_FROM_CANONICAL_EVIDENCE'
            };
        }
        return {
            failure_class: FAILURE_CLASSES.SOURCE_PROVENANCE_FAILURE,
            retry_class: RETRY_CLASSES.CRITICAL.name,
            error_message: msg,
            is_terminal: true, // Canonical provenance failure is terminal
            suggested_action: 'CANONICAL_SOURCE_UNAVAILABLE_OR_TAMPERED_ABORT'
        };
    }

    // 3. Content Validation Failures
    if (msg.includes('MCQ_INVARIANT_VIOLATION') ||
        msg.includes('Hint Leak') ||
        msg.includes('DAG Cycle Detected') ||
        msg.includes('unphysical') ||
        msg.includes('Option count') ||
        msg.includes('Missing chemical units') ||
        msg.includes('CONTENT_ERROR') ||
        msg.includes('semantic parity')) {
        return {
            failure_class: FAILURE_CLASSES.CONTENT_VALIDATION_FAILURE,
            retry_class: RETRY_CLASSES.HIGH.name,
            error_message: msg,
            is_terminal: false,
            suggested_action: 'ESCALATE_MODEL_AND_INJECT_DIAGNOSTIC_FEEDBACK'
        };
    }

    // 4. Contract Violations
    if (msg.includes('LANG_DRIFT') ||
        msg.includes('HANDOFF_SCHEMA_ERROR') ||
        msg.includes('CONTRACT_VIOLATION') ||
        msg.includes('Dual-Language')) {
        return {
            failure_class: FAILURE_CLASSES.CONTRACT_VIOLATION,
            retry_class: RETRY_CLASSES.HIGH.name,
            error_message: msg,
            is_terminal: false,
            suggested_action: 'STRICT_CONTRACT_REINFORCEMENT'
        };
    }

    // 5. Context Overflow
    if (msg.includes('Context exhausted') ||
        msg.includes('context_length_exceeded') ||
        msg.includes('maximum context length') ||
        msg.includes('CONTEXT_OVERFLOW')) {
        return {
            failure_class: FAILURE_CLASSES.CONTEXT_OVERFLOW,
            retry_class: RETRY_CLASSES.HIGH.name,
            error_message: msg,
            is_terminal: false,
            suggested_action: 'FOCUS_CONTEXT_SLICE_TO_TARGET_ITEMS'
        };
    }

    // 6. Schema / Format Failures
    if (msg.includes('TSV') ||
        msg.includes('Column count') ||
        msg.includes('SCHEMA_ERROR') ||
        msg.includes('schema validation') ||
        msg.includes('JSON_PARSE_ERROR')) {
        return {
            failure_class: FAILURE_CLASSES.SCHEMA_VALIDATION_FAILURE,
            retry_class: RETRY_CLASSES.MEDIUM.name,
            error_message: msg,
            is_terminal: false,
            suggested_action: 'INJECT_SCHEMA_RULES_INTO_PROMPT'
        };
    }

    // 7. Incomplete Output / Zero Byte
    if (msg.includes('ZERO_BYTE_ARTIFACT') ||
        msg.includes('FILE_NOT_FOUND') ||
        msg.includes('INCOMPLETE_OUTPUT') ||
        msg.includes('Missing expected deliverable')) {
        return {
            failure_class: FAILURE_CLASSES.INCOMPLETE_OUTPUT,
            retry_class: RETRY_CLASSES.MEDIUM.name,
            error_message: msg,
            is_terminal: false,
            suggested_action: 'RETRY_WITH_OUTPUT_FLUSH_ASSERTION'
        };
    }

    // 8. Model Output Malformed
    if (msg.includes('SyntaxError') ||
        msg.includes('MALFORMED_OUTPUT') ||
        msg.includes('Unterminated string')) {
        return {
            failure_class: FAILURE_CLASSES.MODEL_OUTPUT_MALFORMED,
            retry_class: RETRY_CLASSES.MEDIUM.name,
            error_message: msg,
            is_terminal: false,
            suggested_action: 'STRICT_JSON_OR_TSV_DELIMITER_CONSTRAINTS'
        };
    }

    // 9. Timeout
    if (msg.includes('timed out') || msg.includes('TIMEOUT')) {
        return {
            failure_class: FAILURE_CLASSES.TIMEOUT,
            retry_class: RETRY_CLASSES.MEDIUM.name,
            error_message: msg,
            is_terminal: false,
            suggested_action: 'EXTEND_TIMEOUT_OR_SHRINK_BATCH'
        };
    }

    // 10. Transient Tool Failure
    if (msg.includes('EBUSY') || msg.includes('ENOENT') || msg.includes('ECONNRESET')) {
        return {
            failure_class: FAILURE_CLASSES.TRANSIENT_TOOL_FAILURE,
            retry_class: RETRY_CLASSES.LOW.name,
            error_message: msg,
            is_terminal: false,
            suggested_action: 'EXPONENTIAL_BACKOFF_RETRY'
        };
    }

    // Default: General Specialist Failure
    return {
        failure_class: FAILURE_CLASSES.SPECIALIST_FAILURE,
        retry_class: RETRY_CLASSES.HIGH.name,
        error_message: msg,
        is_terminal: false,
        suggested_action: 'RETRY_WITH_CONSTRAINED_ERROR_CONTEXT'
    };
}

/**
 * Determines whether a task can be retried based on failure classification,
 * attempt count, and global mission limits.
 * 
 * @param {Object} task
 * @param {Object} classification - Result of classifyFailure()
 * @param {number} attemptCount - Number of attempts already executed (1-based)
 * @param {number} totalInvocationsSoFar - Mission-wide launch counter
 * @returns {Object} { canRetry, maxRetriesAllowed, reason }
 */
function canRetryTask(task, classification, attemptCount, totalInvocationsSoFar) {
    // 1. Check Global Mission Launch Limit (Hard Invariant: max 10 launches total)
    if (totalInvocationsSoFar >= GLOBAL_RESOURCE_LIMITS.MAX_TOTAL_LAUNCHES) {
        return {
            canRetry: false,
            maxRetriesAllowed: 0,
            reason: 'RESOURCE_LIMIT_EXCEEDED: Global 10-launch mission budget exhausted'
        };
    }

    // 2. Terminal Failures (e.g. Security Boundary Violations)
    if (classification.is_terminal) {
        return {
            canRetry: false,
            maxRetriesAllowed: 0,
            reason: `TERMINAL_FAILURE: ${classification.failure_class} cannot be safely retried without manual intervention`
        };
    }

    // 3. Resolve Max Retries for Class
    const retryConfig = RETRY_CLASSES[classification.retry_class] || RETRY_CLASSES.MEDIUM;
    let allowedRetries = retryConfig.defaultMaxRetries;

    // Respect custom task-specific retry budget if defined lower
    if (task && typeof task.retry_budget === 'number') {
        allowedRetries = Math.min(allowedRetries, task.retry_budget);
    }

    // Check if attempt limit reached (attemptCount = 1 means 0 retries so far; retries = attemptCount - 1)
    const retriesConsumed = attemptCount; // If attempt 1 failed, next attempt is 2 (retry 1)
    if (allowedRetries === 0 || retriesConsumed > allowedRetries) {
        return {
            canRetry: false,
            maxRetriesAllowed: allowedRetries,
            reason: `RETRY_BUDGET_EXHAUSTED: Retries consumed (${retriesConsumed}) reach or exceed max allowed ${allowedRetries} for ${classification.retry_class}`
        };
    }

    return {
        canRetry: true,
        maxRetriesAllowed: allowedRetries,
        reason: `RETRY_PERMITTED: Attempt ${retriesConsumed + 1} within ${classification.retry_class} limit of ${allowedRetries}`
    };
}

/**
 * Computes targeted adaptations for the next retry attempt.
 * 
 * @param {Object} task
 * @param {Object} classification
 * @param {number} nextAttemptNumber
 * @param {Object} currentContextPlan
 * @returns {Object} Targeted adaptation parameters
 */
function getTargetedRetryPlan(task, classification, nextAttemptNumber, currentContextPlan = {}) {
    const adaptations = {
        attempt: nextAttemptNumber,
        failure_class: classification.failure_class,
        retry_class: classification.retry_class,
        model_class: 'STRONG', // Default to STRONG on retried complex errors
        context_strategy: currentContextPlan.context_strategy || 'TASK_SCOPED',
        prompt_constraints: [],
        reason: '',
        adaptation_reason: ''
    };

    switch (classification.failure_class) {
        case FAILURE_CLASSES.CONTEXT_OVERFLOW:
            adaptations.context_strategy = 'FOCUSED';
            adaptations.model_class = 'STRONG';
            adaptations.prompt_constraints.push('CRITICAL_RETRY_DIRECTIVE: CONTEXT_OVERFLOW - Batch size minimized to fit within strict token window.');
            adaptations.reason = 'CONTEXT_OVERFLOW_SHRINK_TO_FOCUSED_STRATEGY';
            break;

        case FAILURE_CLASSES.CONTENT_VALIDATION_FAILURE:
            adaptations.model_class = 'STRONG';
            adaptations.prompt_constraints.push(`CRITICAL VALIDATION ERROR FROM PREVIOUS ATTEMPT: ${classification.error_message}. Ensure strict mathematical/chemical consistency, 4+ options per MCQ, and no answer leakage in hints.`);
            adaptations.reason = 'CONTENT_FAILURE_UPGRADE_MODEL_AND_INJECT_DIAGNOSTICS';
            break;

        case FAILURE_CLASSES.SCHEMA_VALIDATION_FAILURE:
            adaptations.prompt_constraints.push(`CRITICAL SCHEMA ERROR: ${classification.error_message}. Format exact columns/JSON properties strictly.`);
            adaptations.reason = 'SCHEMA_FAILURE_INJECT_EXACT_SCHEMA_ERROR';
            break;

        case FAILURE_CLASSES.CONTRACT_VIOLATION:
            adaptations.prompt_constraints.push(`CRITICAL CONTRACT VIOLATION: ${classification.error_message}. Enforce Hindi-first terms in English in brackets, and preserve all required structured handoff fields.`);
            adaptations.reason = 'CONTRACT_FAILURE_ENFORCE_DUAL_LANG';
            break;

        case FAILURE_CLASSES.SLICE_PROVENANCE_CORRUPTION:
            adaptations.context_strategy = 'REGENERATED';
            adaptations.model_class = 'STRONG';
            adaptations.prompt_constraints.push('CRITICAL PROVENANCE DIRECTIVE: Context slice corrupted or tampered. Regenerate cleanly from canonical Evidence Pack.');
            adaptations.reason = 'SLICE_CORRUPTION_REGENERATE_FROM_CANONICAL_SOURCE';
            break;

        case FAILURE_CLASSES.SECURITY_BOUNDARY_VIOLATION:
            adaptations.prompt_constraints.push(`TERMINAL SECURITY ERROR: ${classification.error_message}. Automatic retries are forbidden.`);
            adaptations.reason = 'SECURITY_BOUNDARY_VIOLATION_TERMINAL';
            break;

        case FAILURE_CLASSES.SOURCE_PROVENANCE_FAILURE:
            adaptations.prompt_constraints.push(`TERMINAL PROVENANCE ERROR: ${classification.error_message}. Source evidence is missing or tampered.`);
            adaptations.reason = 'SOURCE_PROVENANCE_FAILURE_TERMINAL';
            break;

        case FAILURE_CLASSES.TRANSIENT_TOOL_FAILURE:
            adaptations.prompt_constraints.push(`TRANSIENT TOOL FAILURE: ${classification.error_message}. Retry with exponential backoff.`);
            adaptations.reason = 'TRANSIENT_TOOL_EXPONENTIAL_BACKOFF';
            break;

        default:
            adaptations.prompt_constraints.push(`PREVIOUS ATTEMPT FAILED: ${classification.error_message}`);
            adaptations.reason = 'DEFAULT_TARGETED_RETRY_ADAPTATION';
            break;
    }

    adaptations.adaptation_directives = adaptations.prompt_constraints;
    adaptations.adaptation_reason = adaptations.reason;
    return adaptations;
}

module.exports = {
    RETRY_CLASSES,
    FAILURE_CLASSES,
    GLOBAL_RESOURCE_LIMITS,
    classifyFailure,
    canRetryTask,
    getTargetedRetryPlan
};
