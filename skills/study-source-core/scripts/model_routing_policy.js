/**
 * StudySourceCore Phase 7 Policy-Driven Model Routing Engine (`model_routing_policy.js`)
 * 
 * Maps task attributes, domain reasoning depth, context size, and recovery state
 * to capability-based model classes (CHEAP, DEFAULT, STRONG) without provider-specific
 * hardcoding or vendor lock-in.
 * 
 * Non-Negotiable Invariants:
 * 1. Policy-driven: selection is deterministic based on declared rules, not LLM guess.
 * 2. Specialist-aware: recognizes high-reasoning procedural tasks vs. declarative recall.
 * 3. Proportional: simple tasks do not consume STRONG models unnecessarily; complex tasks do not get forced into CHEAP models.
 * 4. Recovery-aware: escalates model class on content/contract validation failures.
 */

const MODEL_CLASSES = {
    CHEAP: 'CHEAP',       // High throughput, low cost (fast syntax, TSV format, simple extractions)
    DEFAULT: 'DEFAULT',   // Balanced general capability (Notes synthesis, MindMaps, SlideDecks)
    STRONG: 'STRONG'      // Deep reasoning, strict constraint satisfaction (Procedural STEM, DAGs, Adversarial QA, Recovery)
};

const TASK_COMPLEXITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
};

const PROCEDURAL_SPECIALISTS = new Set([
    'math-apkg-author',
    'physics-numerical-apkg-author',
    'chemistry-numerical-apkg-author',
    'reasoning-apkg-author'
]);

const PROCEDURAL_ARTIFACT_KEYS = new Set([
    'proceduralQuestionBank',
    'proceduralApkg',
    'problemPatterns',
    'practiceQuestions'
]);

/**
 * Resolves task complexity based on artifact key, specialist, and subject.
 */
function resolveTaskComplexity(artifactKey, specialist, subject = null) {
    if (specialist === 'adversarial-apkg-reviewer' || artifactKey === 'bmQa') {
        return TASK_COMPLEXITY.CRITICAL;
    }

    if (PROCEDURAL_SPECIALISTS.has(specialist) || PROCEDURAL_ARTIFACT_KEYS.has(artifactKey)) {
        return TASK_COMPLEXITY.HIGH;
    }

    if (artifactKey === 'bmGraph' || artifactKey === 'notes' || artifactKey === 'mindmap' || artifactKey === 'slideDeck' || artifactKey === 'imageOcclusion') {
        return TASK_COMPLEXITY.MEDIUM;
    }

    if (artifactKey === 'basic' || artifactKey === 'cloze' || artifactKey === 'apkg') {
        return TASK_COMPLEXITY.LOW;
    }

    return TASK_COMPLEXITY.MEDIUM;
}

/**
 * Resolves the appropriate model class and capability requirements for a task.
 * 
 * @param {Object} taskConfig
 * @param {string} taskConfig.artifactKey - e.g. 'notes', 'basic', 'proceduralQuestionBank'
 * @param {string} taskConfig.specialist - Specialist identifier
 * @param {string} [taskConfig.subject] - Subject domain (e.g. 'Math', 'Physics', 'History')
 * @param {string} [taskConfig.contextBudget='MEDIUM'] - Budget tier from context planner ('SMALL', 'MEDIUM', 'LARGE', 'VERY_LARGE')
 * @param {number} [taskConfig.attempt=1] - Current attempt number
 * @param {string} [taskConfig.lastFailureClass=null] - Failure classification from previous attempt (if retry)
 * @returns {Object} Policy routing decision
 */
function resolveModelRouting(taskConfig) {
    const {
        artifactKey,
        specialist,
        subject,
        contextBudget = 'MEDIUM',
        attempt = 1,
        lastFailureClass = null
    } = taskConfig;

    const complexity = taskConfig.taskComplexity || resolveTaskComplexity(artifactKey, specialist, subject);
    const requiredCapabilities = [];
    let modelClass = MODEL_CLASSES.DEFAULT;
    let reason = 'STANDARD_DEFAULT_WORKLOAD';

    // 1. Recovery Escalation Check
    const isRetry = attempt > 1;
    const isSevereFailure = lastFailureClass === 'CONTENT_VALIDATION_FAILURE' ||
                            lastFailureClass === 'CONTRACT_VIOLATION' ||
                            lastFailureClass === 'SPECIALIST_FAILURE' ||
                            lastFailureClass === 'CONTEXT_OVERFLOW';

    if (isRetry && isSevereFailure) {
        modelClass = MODEL_CLASSES.STRONG;
        reason = `RECOVERY_ESCALATION_ATTEMPT_${attempt}_AFTER_${lastFailureClass}`;
        requiredCapabilities.push('deep_reasoning', 'error_recovery', 'strict_constraint_adherence');
        return {
            model_class: modelClass,
            task_complexity: complexity,
            context_budget: contextBudget,
            reason,
            required_capabilities: requiredCapabilities,
            policy_version: '1.0.0'
        };
    }

    // 2. Base Complexity Routing
    switch (complexity) {
        case TASK_COMPLEXITY.LOW:
            modelClass = MODEL_CLASSES.CHEAP;
            reason = 'LOW_COMPLEXITY_MECHANICAL_EXTRACTION';
            requiredCapabilities.push('fast_tsv_formatting', 'basic_recall');
            break;

        case TASK_COMPLEXITY.MEDIUM:
            modelClass = MODEL_CLASSES.DEFAULT;
            reason = 'MEDIUM_COMPLEXITY_SYNTHESIS';
            requiredCapabilities.push('structured_markdown', 'hierarchical_synthesis');
            if (artifactKey === 'imageOcclusion') {
                requiredCapabilities.push('coordinate_mask_precision');
            }
            break;

        case TASK_COMPLEXITY.HIGH:
            // High reasoning procedural tasks:
            // Math coprime factorization, physics numerical pipelines, chemistry equilibrium ICE tables, reasoning logic flow
            modelClass = MODEL_CLASSES.STRONG;
            reason = 'HIGH_REASONING_PROCEDURAL_TASK';
            requiredCapabilities.push('procedural_derivation', 'solution_dag_construction', '3_tier_hint_generation', 'anti_leak');
            break;

        case TASK_COMPLEXITY.CRITICAL:
            modelClass = MODEL_CLASSES.STRONG;
            reason = 'CRITICAL_AUDIT_AND_ADVERSARIAL_VERIFICATION';
            requiredCapabilities.push('cross_artifact_consistency', 'adversarial_fuzzing', 'contract_gap_detection');
            break;

        default:
            modelClass = MODEL_CLASSES.DEFAULT;
            reason = 'DEFAULT_FALLBACK_ROUTING';
            break;
    }

    // 3. Context Size Moderation Override
    // Even if complexity is LOW, if context is VERY_LARGE, upgrade from CHEAP to DEFAULT to prevent truncation/hallucination
    if (modelClass === MODEL_CLASSES.CHEAP && contextBudget === 'VERY_LARGE') {
        modelClass = MODEL_CLASSES.DEFAULT;
        reason = 'CONTEXT_SCALE_UPGRADE_FROM_CHEAP_TO_DEFAULT';
    }

    return {
        model_class: modelClass,
        task_complexity: complexity,
        context_budget: contextBudget,
        reason,
        required_capabilities: requiredCapabilities,
        policy_version: '1.0.0'
    };
}

function escalateModelClass(currentClass) {
    if (currentClass === MODEL_CLASSES.CHEAP) return MODEL_CLASSES.DEFAULT;
    if (currentClass === MODEL_CLASSES.DEFAULT) return MODEL_CLASSES.STRONG;
    return MODEL_CLASSES.STRONG;
}

module.exports = {
    MODEL_CLASSES,
    TASK_COMPLEXITY,
    resolveTaskComplexity,
    resolveModelRouting,
    escalateModelClass
};
