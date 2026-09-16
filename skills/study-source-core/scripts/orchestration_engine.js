/**
 * StudySourceCore vNext Orchestration & Task Graph Engine (`orchestration_engine.js`)
 * 
 * Provides deterministic, machine-readable task graph management, single-writer enforcement,
 * parent self-execution prevention, dependency barriers, failure isolation, targeted retries,
 * bounded concurrency (MAX=4), atomic checkpointing, crash-resilient recovery, and
 * physical completion evidence generation.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { evaluateArtifactRouting } = require('./routing_engine');
const { getCanonicalArtifactPaths, getVaultRoot, resolveChapterDir } = require('./path_resolver');
const { getArtifactRegistry } = require('./artifact_registry');
const { planContextSlice, verifyContextProvenance } = require('./context_planner');
const { resolveModelRouting, MODEL_CLASSES, TASK_COMPLEXITY } = require('./model_routing_policy');
const { classifyFailure, canRetryTask, getTargetedRetryPlan, GLOBAL_RESOURCE_LIMITS, FAILURE_CLASSES, RETRY_CLASSES } = require('./retry_policy');
const { 
    initExecutionState, 
    saveExecutionState, 
    loadExecutionState,
    updateTaskState,
    checkpointTaskStart,
    checkpointTaskComplete,
    checkpointTaskRetry,
    checkpointTaskFail,
    validateStateTransition,
    CURRENT_PIPELINE_VERSION
} = require('./execution_state');
const { AntigravityHostAdapter } = require('./antigravity_adapter');

/**
 * Standard required fields in specialist handoff contract.
 */
const REQUIRED_HANDOFF_FIELDS = [
    'status',
    'agent',
    'task_id',
    'inputs_consumed',
    'outputs_produced',
    'output_paths',
    'validation_result',
    'warnings',
    'errors',
    'dependencies_satisfied',
    'retry_count'
];

/**
 * Computes deterministic SHA-256 fingerprint for a task.
 */
function computeTaskFingerprint(evidenceHash, taskConfig, generatorVersion = '2.4.0') {
    const raw = `${evidenceHash}:${JSON.stringify(taskConfig)}:${generatorVersion}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Builds the explicit execution Task Graph DAG for a given chapter context.
 */
function buildExecutionTaskGraph(context = {}) {
    const {
        subject,
        chapter,
        evidenceHash = '0000000000000000000000000000000000000000000000000000000000000000',
        customRoot = null,
        specialist_agent = null
    } = context;

    if (!subject || !chapter) {
        throw new Error('MISSING_REQUIRED_CONTEXT: subject and chapter must be provided');
    }

    // GAP-07: Dynamic Artifact Output Directory Isolation
    const outputDirEnv = process.env.STUDYSOURCE_OUTPUT_DIR;
    const effectiveCustomRoot = customRoot || context.outputDir || (outputDirEnv ? path.resolve(outputDirEnv) : null);

    const routing = evaluateArtifactRouting(context);
    const paths = getCanonicalArtifactPaths(subject, chapter, effectiveCustomRoot);
    let domainSpecialist = specialist_agent;
    if (!domainSpecialist) {
        try {
            const manifestPath = path.join(__dirname, '..', 'resources', 'subject-skill-manifest.json');
            if (fs.existsSync(manifestPath)) {
                const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                if (m && m.subjects && m.subjects[subject]) {
                    domainSpecialist = m.subjects[subject].specialist_agent;
                }
            }
        } catch (e) {}
    }

    const tasks = [];
    const singleWriterMap = new Map(); // filepath -> task_id

    // Iterate through all candidate tracks
    for (const [trackKey, taskDef] of Object.entries(getArtifactRegistry())) {
        const isEligible = routing[trackKey] === true;
        const suppressionReason = routing.suppressions ? routing.suppressions[trackKey] || null : null;

        // Resolve specialist owner
        if (isEligible && (taskDef.owner_agent === '$DOMAIN_SPECIALIST' || taskDef.writer_agent === '$DOMAIN_SPECIALIST') && !domainSpecialist) {
            throw new Error('MISSING_SPECIALIST_AGENT');
        }
        const resolvedOwner = taskDef.owner_agent === '$DOMAIN_SPECIALIST' ? domainSpecialist : taskDef.owner_agent;
        const resolvedWriter = taskDef.writer_agent === '$DOMAIN_SPECIALIST' ? domainSpecialist : taskDef.writer_agent;

        // Resolve target file path
        let targetFilePath = null;
        if (paths[taskDef.artifactKey]) {
            targetFilePath = paths[taskDef.artifactKey].path || null;
        }

        // Single-Writer Rule pre-check: exactly 1 task may write to any target filepath
        if (targetFilePath && isEligible) {
            if (singleWriterMap.has(targetFilePath)) {
                throw new Error(`[SINGLE_WRITER_COLLISION] Conflict on '${targetFilePath}' between '${singleWriterMap.get(targetFilePath)}' and '${taskDef.task_id}'`);
            }
            singleWriterMap.set(targetFilePath, taskDef.task_id);
        }

        const taskFingerprint = computeTaskFingerprint(evidenceHash, {
            track: trackKey,
            subject,
            chapter,
            targetPath: targetFilePath
        });

        // Filter active dependencies: only depend on tasks that are actually in the graph
        const activeDependencies = taskDef.dependencies.filter(depId => {
            const registry = getArtifactRegistry();
            const depTrack = Object.keys(registry).find(k => registry[k].task_id === depId);
            return depTrack && routing[depTrack] === true;
        });

        let defaultEvidencePath = 'scratch/evidence-pack.md';
        if (effectiveCustomRoot) {
            const cand1 = path.join(effectiveCustomRoot, 'evidence-pack.md');
            const cand2 = path.join(effectiveCustomRoot, 'scratch', 'evidence-pack.md');
            if (fs.existsSync(cand1)) {
                defaultEvidencePath = cand1;
            } else if (fs.existsSync(cand2)) {
                defaultEvidencePath = cand2;
            } else {
                defaultEvidencePath = cand2;
            }
        }

        tasks.push({
            task_id: taskDef.task_id,
            track_key: trackKey,
            artifactKey: taskDef.artifactKey || trackKey,
            task_name: taskDef.task_name,
            wave: taskDef.wave,
            owner_agent: resolvedOwner,
            writer_agent: resolvedWriter,
            target_path: targetFilePath,
            inputs: [defaultEvidencePath],
            expected_outputs: targetFilePath ? [targetFilePath] : [],
            dependencies: activeDependencies,
            status: isEligible ? 'PLANNED' : 'SKIPPED',
            suppression_reason: isEligible ? null : suppressionReason,
            validation_rule: taskDef.validator,
            retry_budget: typeof taskDef.retry_budget === 'number' ? taskDef.retry_budget : undefined,
            current_retries: 0,
            input_fingerprint: taskFingerprint
        });
    }

    const isLegacySimulation = (
        evidenceHash === '0000000000000000000000000000000000000000000000000000000000000000' &&
        !context.evidencePack &&
        context.isProduction !== true
    );
    const compatibilityMode = context.compatibilityMode !== undefined ? context.compatibilityMode : isLegacySimulation;

    return {
        chapter,
        subject,
        evidenceHash,
        compatibilityMode,
        context: {
            ...context,
            customRoot: effectiveCustomRoot
        },
        tasks,
        singleWriterMap: Object.fromEntries(singleWriterMap),
        waveBreakdown: {
            wave1: tasks.filter(t => t.wave === 1),
            wave2: tasks.filter(t => t.wave === 2),
            wave3: tasks.filter(t => t.wave === 3)
        }
    };
}

/**
 * Validates a structured handoff object from a subagent.
 */
function validateStructuredHandoff(handoff) {
    if (!handoff || typeof handoff !== 'object') {
        return { isValid: false, errors: ['Handoff report must be a non-null JSON object'] };
    }

    const errors = [];
    for (const field of REQUIRED_HANDOFF_FIELDS) {
        if (!(field in handoff)) {
            errors.push(`Missing mandatory handoff field: '${field}'`);
        }
    }

    if (handoff.status && !['SUCCESS', 'SUPPRESSED', 'FAILED'].includes(handoff.status)) {
        errors.push(`Invalid handoff status: '${handoff.status}'. Must be SUCCESS, SUPPRESSED, or FAILED.`);
    }

    if (handoff.status === 'SUCCESS') {
        if (!Array.isArray(handoff.output_paths) || handoff.output_paths.length === 0) {
            errors.push("Successful handoff must contain non-empty 'output_paths' array.");
        }
        if (!handoff.validation_result || typeof handoff.validation_result !== 'object') {
            errors.push("Successful handoff must contain 'validation_result' object.");
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        status: handoff.status || 'INVALID'
    };
}

/**
 * Asserts that the parent orchestrator is NOT generating specialist-owned artifacts.
 */
function assertNoParentSelfExecution(task, writerAgent) {
    const parentIdentities = ['parent', 'study-source-core', 'orchestrator', 'parent-orchestrator', 'adaptive-orchestrator'];
    const isSpecialistTask = task.owner_agent !== 'parent' && task.owner_agent !== 'orchestrator';

    if (isSpecialistTask && parentIdentities.includes(String(writerAgent).toLowerCase().trim())) {
        throw new Error(`[PARENT_SELF_EXECUTION_VIOLATION] Parent orchestrator is strictly forbidden from writing specialist artifact for task '${task.task_id}' (Owner: ${task.owner_agent})`);
    }
}

/**
 * Validates physical completion evidence on disk.
 */
async function validateCompletionEvidence(task, handoff = null, customRoot = null) {
    const errors = [];
    const targetPath = task.target_path;

    if (task.status === 'SKIPPED' || (handoff && handoff.status === 'SUPPRESSED')) {
        return {
            isValid: true,
            status: 'SKIPPED',
            reason: task.suppression_reason || (handoff && handoff.warnings && handoff.warnings[0]) || 'SUPPRESSED',
            errors: []
        };
    }

    // 1. Writer Ownership Verification
    if (handoff) {
        if (handoff.agent !== task.owner_agent && handoff.agent !== task.writer_agent) {
            errors.push(`[OWNERSHIP_MISMATCH] Handoff agent '${handoff.agent}' does not match task designated owner '${task.owner_agent}'`);
        }
        try {
            assertNoParentSelfExecution(task, handoff.agent);
        } catch (e) {
            errors.push(e.message);
        }
    }

    // 2. Physical File Existence Check
    if (!targetPath || !fs.existsSync(targetPath)) {
        errors.push(`[FILE_NOT_FOUND] Expected deliverable does not exist on disk: '${targetPath}'`);
        return { isValid: false, status: 'FAILED', errors };
    }

    // 3. Non-Zero Byte Check
    const stat = fs.statSync(targetPath);
    if (stat.size === 0) {
        errors.push(`[ZERO_BYTE_ARTIFACT] Deliverable file is empty (0 bytes): '${targetPath}'`);
        return { isValid: false, status: 'FAILED', errors };
    }

    // 4. Schema / Format Validation Assertion
    try {
        if (task.validation_rule) {
            const registry = getArtifactRegistry();
            const trackKey = Object.keys(registry).find(k => registry[k].task_id === task.task_id);
            const def = trackKey ? registry[trackKey] : null;

            if (def && def.validator_export && def.validator_format !== 'none') {
                const valModule = require('./' + task.validation_rule);
                const func = valModule[def.validator_export];
                let res;
                
                if (def.validator_format === 'parsed_json') {
                    res = func(JSON.parse(fs.readFileSync(targetPath, 'utf8')));
                } else if (def.validator_format === 'content_and_basename') {
                    res = func(fs.readFileSync(targetPath, 'utf8'), path.basename(targetPath));
                } else if (def.validator_format === 'async_path') {
                    res = await func(targetPath, false);
                } else if (def.validator_format === 'parsed_json_fallback') {
                    if (func) {
                        res = func(JSON.parse(fs.readFileSync(targetPath, 'utf8')));
                    } else {
                        JSON.parse(fs.readFileSync(targetPath, 'utf8'));
                        res = { isValid: true, errors: [] };
                    }
                } else {
                    res = func(targetPath);
                }

                if (res && !res.isValid) errors.push(...(res.errors || []));
            } else if (targetPath.endsWith('.json')) {
                JSON.parse(fs.readFileSync(targetPath, 'utf8'));
            }
        } else if (targetPath.endsWith('.json')) {
            JSON.parse(fs.readFileSync(targetPath, 'utf8'));
        }
    } catch (valErr) {
        errors.push(`[VALIDATOR_EXCEPTION] Validator crashed: ${valErr.message}`);
    }

    return {
        isValid: errors.length === 0,
        status: errors.length === 0 ? 'COMPLETED' : 'FAILED',
        fileSize: stat.size,
        targetPath,
        errors
    };
}

/**
 * Executes a function with a hard timeout cap.
 */
function executeWithTimeout(fn, timeoutMs, taskId) {
    if (!timeoutMs || timeoutMs <= 0 || timeoutMs === Infinity) {
        return fn();
    }

    return new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                reject(new Error(`[TASK_TIMEOUT] Task '${taskId}' timed out after ${timeoutMs}ms`));
            }
        }, timeoutMs);

        Promise.resolve()
            .then(fn)
            .then(
                res => {
                    if (!settled) {
                        settled = true;
                        clearTimeout(timer);
                        resolve(res);
                    }
                },
                err => {
                    if (!settled) {
                        settled = true;
                        clearTimeout(timer);
                        reject(err);
                    }
                }
            );
    });
}

/**
 * Executes a simulated or real task workflow with bounded concurrency (MAX=4),
 * explicit dependency barriers, failure isolation, and 1-retry budget.
 * 
 * @param {Object} graph - Task Graph built by buildExecutionTaskGraph
 * @param {Function} taskExecutor - Async function (task, retryCount) => handoffObject
 * @param {Object} options - Runtime options (resume, taskTimeoutMs, maxConcurrentWorkers)
 * @returns {Object} Complete workflow execution summary and observable traces
 */
async function executeTaskWorkflow(graph, taskExecutor, options = {}) {
    const traces = {
        executionPlan: [],
        dispatchTrace: [],
        ownershipTrace: [],
        handoffTrace: [],
        duplicateWorkAudit: [],
        completionEvidence: [],
        taskTimestamps: {},
        efficiencyAudit: {}
    };

    const hostAdapter = new AntigravityHostAdapter({
        missionId: (graph.context && graph.context.missionId) || `mission_${Date.now()}`
    });

    let storageDir = null;
    if (graph.context && graph.context.customRoot) {
        storageDir = path.join(graph.context.customRoot, 'scratch');
    } else if (graph.context && graph.context.storage_dir) {
        storageDir = graph.context.storage_dir;
    }

    const isResume = (options && options.resume === true) || (graph.context && graph.context.resume === true);
    let executionState = null;

    const taskStatusMap = new Map();
    let totalInvocations = 0;
    let duplicateInvocations = 0;
    let skippedCount = 0;
    let completedCount = 0;
    let failedCount = 0;
    let blockedCount = 0;

    if (isResume) {
        executionState = loadExecutionState(storageDir, { failClosed: true, validate: true });
        if (!executionState) {
            throw new Error('[RESUME_FAILED] No valid existing checkpoint found to resume from.');
        }

        if (executionState.chapter !== graph.chapter || executionState.subject !== graph.subject) {
            throw new Error(`[RESUME_MISMATCH] Checkpoint subject/chapter (${executionState.subject}/${executionState.chapter}) does not match current run (${graph.subject}/${graph.chapter})`);
        }

        if (graph.evidenceHash && executionState.evidenceHash && executionState.evidenceHash !== graph.evidenceHash &&
            executionState.evidenceHash !== '0000000000000000000000000000000000000000000000000000000000000000') {
            throw new Error(`[RESUME_PROVENANCE_MISMATCH] Checkpoint evidence hash does not match current source`);
        }

        if (executionState.pipeline_version !== CURRENT_PIPELINE_VERSION) {
            throw new Error(`[CHECKPOINT_VERSION_MISMATCH] Pipeline version mismatch: checkpoint ${executionState.pipeline_version}, engine ${CURRENT_PIPELINE_VERSION}`);
        }

        totalInvocations = executionState.metrics.total_launches || 0;
    } else {
        executionState = initExecutionState({
            chapter: graph.chapter,
            subject: graph.subject,
            evidenceHash: graph.evidenceHash,
            storage_dir: storageDir
        });
    }

    // Initialize/Reconstruct statuses
    for (const task of graph.tasks) {
        let initialStatus = task.status;

        if (isResume && executionState.tasks[task.task_id]) {
            const saved = executionState.tasks[task.task_id];
            // If completed, verify physical artifact still exists on disk
            if (saved.status === 'COMPLETED' || saved.status === 'SUCCEEDED') {
                if (task.target_path && fs.existsSync(task.target_path) && fs.statSync(task.target_path).size > 0) {
                    initialStatus = 'COMPLETED';
                    completedCount++;
                    traces.completionEvidence.push({
                        task_id: task.task_id,
                        target_path: task.target_path,
                        bytes: fs.statSync(task.target_path).size,
                        status: 'VERIFIED_ON_DISK_RESUMED'
                    });
                } else {
                    initialStatus = 'PLANNED'; // Re-queue if artifact missing
                }
            } else if (saved.status === 'SKIPPED') {
                initialStatus = 'SKIPPED';
                skippedCount++;
            } else {
                // If interrupted mid-flight (RUNNING / RETRYING)
                initialStatus = 'PLANNED';
            }

            // Restore retry counts (never reset on resume!)
            if (executionState.retry_counts && executionState.retry_counts[task.task_id]) {
                task.current_retries = executionState.retry_counts[task.task_id];
            }
        }

        taskStatusMap.set(task.task_id, initialStatus);
        if (!isResume) {
            updateTaskState(executionState, task.task_id, {
                status: task.status,
                task_name: task.task_name,
                wave: task.wave,
                owner_agent: task.owner_agent,
                writer_agent: task.writer_agent,
                target_path: task.target_path,
                suppression_reason: task.suppression_reason
            });
        }

        traces.executionPlan.push({
            task_id: task.task_id,
            name: task.task_name,
            wave: task.wave,
            owner: task.owner_agent,
            initial_status: initialStatus,
            suppression_reason: task.suppression_reason
        });
    }

    // Concurrency parameters
    const MAX_CONCURRENT = Math.min(
        GLOBAL_RESOURCE_LIMITS.MAX_CONCURRENT_WORKERS,
        options.maxConcurrentWorkers || 4
    );
    const taskTimeoutMs = (options && options.taskTimeoutMs) || (graph.context && graph.context.taskTimeoutMs) || 180000;
    const maxTotalLaunches = (options && options.maxTotalLaunches) || GLOBAL_RESOURCE_LIMITS.MAX_TOTAL_LAUNCHES;

    let pendingTasks = graph.tasks.filter(t => {
        const s = taskStatusMap.get(t.task_id);
        return s !== 'COMPLETED' && s !== 'SKIPPED';
    });

    const runningTasks = new Map(); // taskId -> Promise
    let peakObservedConcurrency = 0;
    let schedulerError = null;

    /**
     * Executes a single task instance within the worker pool with retries.
     */
    async function executeSingleTask(task) {
        traces.taskTimestamps[task.task_id] = {
            start_time: Date.now()
        };

        // Enforce Parent Self-Execution Ban before dispatch
        assertNoParentSelfExecution(task, task.writer_agent);
        traces.ownershipTrace.push({
            task_id: task.task_id,
            target_path: task.target_path,
            designated_owner: task.owner_agent,
            designated_writer: task.writer_agent,
            status: 'OWNERSHIP_VERIFIED'
        });

        // Context Planning Layer
        let contextPlan = null;
        try {
            let evidenceSource = (graph.context && graph.context.evidencePack) || task.evidencePack;
            if (!evidenceSource && graph.context && graph.context.customRoot) {
                const candidateDirect = path.join(graph.context.customRoot, 'evidence-pack.md');
                const candidateScratch = path.join(graph.context.customRoot, 'scratch', 'evidence-pack.md');
                if (fs.existsSync(candidateDirect)) {
                    evidenceSource = candidateDirect;
                } else if (fs.existsSync(candidateScratch)) {
                    evidenceSource = candidateScratch;
                }
            }
            if (!evidenceSource && task.inputs && task.inputs[0] && fs.existsSync(task.inputs[0])) {
                evidenceSource = task.inputs[0];
            }
            if (!evidenceSource) {
                evidenceSource = 'scratch/evidence-pack.md';
            }
            const evidenceHash = (graph.context && graph.context.evidenceHash) || task.evidenceHash || graph.evidenceHash;
            contextPlan = planContextSlice({
                subject: graph.subject,
                chapter: graph.chapter,
                artifactKey: task.artifactKey || task.track_key,
                specialist: task.owner_agent,
                evidencePack: evidenceSource,
                evidenceHash: evidenceHash,
                strategy: 'TASK_SCOPED',
                compatibilityMode: graph.compatibilityMode === true
            });
            task.contextSlice = contextPlan.context_slice_content;
            task.contextPlan = contextPlan;
            traces.contextPlans = traces.contextPlans || [];
            traces.contextPlans.push({
                task_id: task.task_id,
                strategy: contextPlan.context_strategy,
                budget_tier: contextPlan.estimated_context_size.budget_tier,
                estimated_tokens: contextPlan.estimated_context_size.estimated_tokens,
                reduction_ratio: contextPlan.estimated_context_size.reduction_ratio,
                slice_hash: contextPlan.slice_hash
            });
        } catch (planErr) {
            if (planErr.message && planErr.message.includes('CONTEXT_PROVENANCE_FAILURE')) {
                throw planErr; // Fail closed on provenance corruption!
            }
        }

        // Policy-Driven Model Routing Layer
        let modelRouting = resolveModelRouting({
            artifactKey: task.artifactKey || task.track_key,
            specialist: task.owner_agent,
            subject: graph.subject,
            contextBudget: (contextPlan && contextPlan.estimated_context_size && contextPlan.estimated_context_size.budget_tier) || 'MEDIUM',
            attempt: (task.current_retries || 0) + 1
        });
        task.modelRouting = modelRouting;
        traces.modelRoutings = traces.modelRoutings || [];
        traces.modelRoutings.push({
            task_id: task.task_id,
            attempt: (task.current_retries || 0) + 1,
            model_class: modelRouting.model_class,
            task_complexity: modelRouting.task_complexity,
            reason: modelRouting.reason
        });

        let executionSuccess = false;
        let currentAttempt = task.current_retries || 0;
        let handoff = null;
        let lastFailureClass = null;

        while (!executionSuccess) {
            // Enforce Global Launch Ceiling (max 10 launches mission-wide by default)
            const maxTotalLaunches = (options && options.maxTotalLaunches) || GLOBAL_RESOURCE_LIMITS.MAX_TOTAL_LAUNCHES;
            if (totalInvocations >= maxTotalLaunches) {
                const limitMsg = `RESOURCE_LIMIT_EXCEEDED: Global launch limit (${maxTotalLaunches}) exhausted`;
                taskStatusMap.set(task.task_id, 'FAILED');
                checkpointTaskFail(executionState, task.task_id, new Error(limitMsg));
                failedCount++;
                traces.completionEvidence.push({
                    task_id: task.task_id,
                    target_path: task.target_path,
                    status: 'FAILED',
                    errors: [limitMsg]
                });
                break;
            }

            totalInvocations++;
            executionState.metrics.total_launches = totalInvocations;

            // Bind worker via Host Adapter
            const workerState = hostAdapter.bindWorkerToTask({
                logicalTaskId: task.task_id,
                ownerAgent: task.owner_agent,
                writerAgent: task.writer_agent,
                waveId: task.wave,
                attempt: currentAttempt + 1,
                callerIdentity: 'orchestrator'
            });
            hostAdapter.recordWorkerStart(workerState.worker_id);

            // Escalate model routing if retry attempt > 0
            if (currentAttempt > 0) {
                modelRouting = resolveModelRouting({
                    artifactKey: task.artifactKey || task.track_key,
                    specialist: task.owner_agent,
                    subject: graph.subject,
                    contextBudget: (contextPlan && contextPlan.estimated_context_size && contextPlan.estimated_context_size.budget_tier) || 'MEDIUM',
                    attempt: currentAttempt + 1,
                    lastFailureClass
                });
                task.modelRouting = modelRouting;
                traces.modelRoutings.push({
                    task_id: task.task_id,
                    attempt: currentAttempt + 1,
                    model_class: modelRouting.model_class,
                    task_complexity: modelRouting.task_complexity,
                    reason: modelRouting.reason
                });
            }

            checkpointTaskStart(executionState, task, modelRouting.model_class, (contextPlan && contextPlan.context_strategy) || 'TASK_SCOPED');

            traces.dispatchTrace.push({
                task_id: task.task_id,
                worker_id: workerState.worker_id,
                agent: task.owner_agent,
                action: currentAttempt === 0 ? 'DISPATCH' : 'RETRY_DISPATCH',
                attempt: currentAttempt + 1,
                model_class: modelRouting.model_class,
                context_strategy: (contextPlan && contextPlan.context_strategy) || 'TASK_SCOPED',
                timestamp: new Date().toISOString()
            });

            try {
                // Execute worker with hard timeout cap
                handoff = await executeWithTimeout(
                    () => taskExecutor(task, currentAttempt),
                    taskTimeoutMs,
                    task.task_id
                );

                const handoffVal = validateStructuredHandoff(handoff);
                if (!handoffVal.isValid) {
                    throw new Error(`[HANDOFF_SCHEMA_ERROR] ${handoffVal.errors.join('; ')}`);
                }

                traces.handoffTrace.push({
                    task_id: task.task_id,
                    worker_id: workerState.worker_id,
                    agent: handoff.agent,
                    status: handoff.status,
                    output_paths: handoff.output_paths,
                    attempt: currentAttempt + 1
                });

                // Physical Completion Evidence Check
                const completionVal = await validateCompletionEvidence(task, handoff);
                if (completionVal.isValid) {
                    executionSuccess = true;
                    const isSuppressed = (handoff && handoff.status === 'SUPPRESSED') || completionVal.status === 'SKIPPED';
                    const statusToSet = isSuppressed ? 'SKIPPED' : 'COMPLETED';
                    taskStatusMap.set(task.task_id, statusToSet);

                    if (isSuppressed) {
                        skippedCount++;
                        updateTaskState(executionState, task.task_id, {
                            status: 'SKIPPED',
                            suppression_reason: (handoff && handoff.warnings && handoff.warnings[0]) || 'SUPPRESSED'
                        });
                    } else {
                        completedCount++;
                        checkpointTaskComplete(executionState, task.task_id, {
                            output_paths: handoff.output_paths,
                            validator: task.validation_rule,
                            validator_result: completionVal,
                            attempt: currentAttempt + 1
                        });
                    }

                    traces.completionEvidence.push({
                        task_id: task.task_id,
                        target_path: task.target_path,
                        bytes: completionVal.fileSize || 0,
                        status: isSuppressed ? 'SKIPPED' : 'VERIFIED_ON_DISK'
                    });

                    // Auditable Decision Trail
                    traces.decisionTrail = traces.decisionTrail || [];
                    traces.decisionTrail.push({
                        task_id: task.task_id,
                        source_hash: (contextPlan && contextPlan.source_hash) || graph.evidenceHash,
                        context_strategy: (contextPlan && contextPlan.context_strategy) || 'TASK_SCOPED',
                        selected_evidence: (contextPlan && contextPlan.selected_evidence_ids) || [],
                        context_size: (contextPlan && contextPlan.estimated_context_size) || {},
                        model_class: modelRouting.model_class,
                        specialist: task.owner_agent,
                        attempt: currentAttempt + 1,
                        validator: task.validation_rule,
                        result: 'PASS'
                    });

                    hostAdapter.collapseWorker(workerState.worker_id, 'SUCCEEDED');
                } else {
                    throw new Error(`[COMPLETION_EVIDENCE_ERROR] ${completionVal.errors.join('; ')}`);
                }
            } catch (err) {
                currentAttempt++;
                task.current_retries = currentAttempt;
                hostAdapter.collapseWorker(workerState.worker_id, 'FAILED');

                // Classify failure & evaluate retry policy
                const classification = classifyFailure(err);
                lastFailureClass = classification.failure_class;

                const effectiveMaxRetries = (options && options.maxRetriesPerTask !== undefined)
                    ? options.maxRetriesPerTask
                    : (GLOBAL_RESOURCE_LIMITS.MAX_RETRIES_PER_TASK !== undefined ? GLOBAL_RESOURCE_LIMITS.MAX_RETRIES_PER_TASK : 1);
                const retryDecision = canRetryTask(task, classification, currentAttempt, totalInvocations, { maxRetriesPerTask: effectiveMaxRetries });

                traces.retryTrace = traces.retryTrace || [];
                traces.retryTrace.push({
                    task_id: task.task_id,
                    attempt: currentAttempt,
                    failure_class: classification.failure_class,
                    retry_class: classification.retry_class,
                    can_retry: retryDecision.canRetry,
                    reason: retryDecision.reason,
                    error: err.message
                });

                if (retryDecision.canRetry) {
                    const adaptation = getTargetedRetryPlan(task, classification, currentAttempt + 1, contextPlan || {});
                    task.promptConstraints = adaptation.prompt_constraints;

                    checkpointTaskRetry(executionState, task.task_id, {
                        attempt: currentAttempt,
                        failure_class: classification.failure_class,
                        retry_class: classification.retry_class,
                        reason: retryDecision.reason,
                        error: err.message,
                        model_class: modelRouting.model_class,
                        context_strategy: adaptation.context_strategy || (contextPlan && contextPlan.context_strategy) || 'TASK_SCOPED',
                        adaptation_directives: adaptation.adaptation_directives,
                        adaptation_reason: adaptation.adaptation_reason
                    });

                    if (adaptation.context_strategy === 'FOCUSED' && contextPlan) {
                        try {
                            const evidenceSource = (graph.context && graph.context.evidencePack) || 'scratch/evidence-pack.md';
                            contextPlan = planContextSlice({
                                subject: graph.subject,
                                chapter: graph.chapter,
                                artifactKey: task.artifactKey || task.track_key,
                                specialist: task.owner_agent,
                                evidencePack: evidenceSource,
                                evidenceHash: graph.evidenceHash,
                                strategy: 'FOCUSED',
                                compatibilityMode: graph.compatibilityMode === true
                            });
                            task.contextSlice = contextPlan.context_slice_content;
                            task.contextPlan = contextPlan;
                        } catch (e) {}
                    }
                } else {
                    taskStatusMap.set(task.task_id, 'FAILED');
                    checkpointTaskFail(executionState, task.task_id, err);
                    failedCount++;
                    traces.completionEvidence.push({
                        task_id: task.task_id,
                        target_path: task.target_path,
                        status: 'FAILED',
                        errors: [err.message, retryDecision.reason]
                    });
                    break;
                }
            }
        }

        traces.taskTimestamps[task.task_id].end_time = Date.now();
        traces.taskTimestamps[task.task_id].duration_ms = traces.taskTimestamps[task.task_id].end_time - traces.taskTimestamps[task.task_id].start_time;
    }

    // =========================================================================
    // BOUNDED CONCURRENCY POOL SCHEDULER LOOP (MAX_CONCURRENT <= 4)
    // =========================================================================
    while (pendingTasks.length > 0 || runningTasks.size > 0) {
        // 1. Check for tasks blocked by failed dependencies
        const tasksToBlock = [];
        for (const task of pendingTasks) {
            const hasFailedDep = (task.dependencies || []).some(depId => {
                const s = taskStatusMap.get(depId);
                return s === 'FAILED' || s === 'BLOCKED';
            });
            if (hasFailedDep) {
                tasksToBlock.push(task);
            }
        }

        for (const task of tasksToBlock) {
            pendingTasks = pendingTasks.filter(t => t.task_id !== task.task_id);
            taskStatusMap.set(task.task_id, 'BLOCKED');
            updateTaskState(executionState, task.task_id, { status: 'BLOCKED', unmet_dependency: 'FAILED_PREREQUISITE' });
            blockedCount++;
            traces.dispatchTrace.push({
                task_id: task.task_id,
                agent: task.owner_agent,
                action: 'BLOCKED',
                unmet_dependency: 'FAILED_PREREQUISITE'
            });
        }

        // 2. Identify runnable tasks whose dependencies are completed or skipped
        const runnableTasks = pendingTasks.filter(task => {
            if (taskStatusMap.get(task.task_id) === 'SKIPPED') return true;
            return (task.dependencies || []).every(depId => {
                const depStatus = taskStatusMap.get(depId);
                return depStatus === 'COMPLETED' || depStatus === 'SKIPPED';
            });
        });

        // 3. Launch ready tasks into available concurrency slots
        while (runnableTasks.length > 0 && runningTasks.size < MAX_CONCURRENT) {
            const taskToRun = runnableTasks.shift();
            pendingTasks = pendingTasks.filter(t => t.task_id !== taskToRun.task_id);

            // If task was statically skipped, bypass execution
            if (taskStatusMap.get(taskToRun.task_id) === 'SKIPPED') {
                updateTaskState(executionState, taskToRun.task_id, { status: 'SKIPPED', suppression_reason: taskToRun.suppression_reason });
                skippedCount++;
                traces.dispatchTrace.push({
                    task_id: taskToRun.task_id,
                    agent: taskToRun.owner_agent,
                    action: 'SKIPPED',
                    reason: taskToRun.suppression_reason
                });
                continue;
            }

            // Launch worker promise
            const promise = executeSingleTask(taskToRun).finally(() => {
                runningTasks.delete(taskToRun.task_id);
            });

            runningTasks.set(taskToRun.task_id, promise);
            peakObservedConcurrency = Math.max(peakObservedConcurrency, runningTasks.size);
        }

        // 4. Wait for at least one worker to complete before scheduling next slot
        if (runningTasks.size > 0) {
            await Promise.race(runningTasks.values());
        } else if (pendingTasks.length > 0) {
            // No workers running and no runnable tasks found -> Unresolvable graph/cycle
            for (const task of pendingTasks) {
                taskStatusMap.set(task.task_id, 'BLOCKED');
                updateTaskState(executionState, task.task_id, { status: 'BLOCKED', unmet_dependency: 'UNRESOLVABLE_GRAPH' });
                blockedCount++;
                traces.dispatchTrace.push({
                    task_id: task.task_id,
                    agent: task.owner_agent,
                    action: 'BLOCKED',
                    unmet_dependency: 'UNRESOLVABLE_GRAPH'
                });
            }
            pendingTasks = [];
            break;
        }
    }

    // Clean workforce collapse: all workers terminal
    traces.efficiencyAudit = {
        total_tasks: graph.tasks.length,
        total_subagent_invocations: totalInvocations,
        duplicate_invocations: duplicateInvocations,
        completed_tasks: completedCount,
        skipped_tasks: skippedCount,
        blocked_tasks: blockedCount,
        failed_tasks: failedCount,
        max_concurrent_workers: MAX_CONCURRENT,
        max_observed_concurrency: peakObservedConcurrency,
        within_concurrency_bound: peakObservedConcurrency <= MAX_CONCURRENT,
        max_total_launches_cap: maxTotalLaunches,
        within_resource_budget: totalInvocations <= maxTotalLaunches
    };

    const overallVerdict = failedCount === 0 && blockedCount === 0 ? 'SUCCESS' : (completedCount > 0 ? 'PARTIAL_SUCCESS' : 'FAILED');

    // GAP-08: Physical Completion Evidence Serialization
    const completionEvidenceDoc = {
        meta: {
            overall_verdict: overallVerdict,
            completed_count: completedCount,
            skipped_count: skippedCount,
            failed_count: failedCount,
            verified_timestamp: new Date().toISOString(),
            schema_version: "1.0.0"
        },
        artifacts: traces.completionEvidence.map(c => {
            let sha256 = null;
            let byteSize = c.bytes || 0;
            if (c.target_path && fs.existsSync(c.target_path)) {
                try {
                    const buf = fs.readFileSync(c.target_path);
                    byteSize = buf.length;
                    sha256 = crypto.createHash('sha256').update(buf).digest('hex');
                } catch (e) {}
            }
            return {
                task_id: c.task_id,
                target_path: c.target_path,
                bytes: byteSize,
                sha256,
                physical_status: c.status,
                errors: c.errors || []
            };
        })
    };

    let evidenceTargetDir = null;
    if (graph.context && graph.context.customRoot) {
        evidenceTargetDir = graph.context.customRoot;
    } else if (graph.context && graph.context.chapterDir) {
        evidenceTargetDir = graph.context.chapterDir;
    } else if (storageDir) {
        evidenceTargetDir = storageDir;
    }

    if (evidenceTargetDir && fs.existsSync(evidenceTargetDir)) {
        try {
            fs.writeFileSync(
                path.join(evidenceTargetDir, '.completion-evidence.json'),
                JSON.stringify(completionEvidenceDoc, null, 2),
                'utf8'
            );
        } catch (e) {
            console.warn(`[orchestration_engine] Warning: Could not write .completion-evidence.json: ${e.message}`);
        }
    }

    if (storageDir) {
        saveExecutionState(executionState, storageDir);
    }

    return {
        overallVerdict,
        taskStatusMap: Object.fromEntries(taskStatusMap),
        executionState,
        traces
    };
}

/**
 * Creates a standard specialist dispatcher for real specialist execution.
 * Routes domain specialist tasks to their registered specialist authors.
 */
function createSpecialistTaskDispatcher(context = {}) {
    return async function specialistTaskDispatcher(task, retryCount) {
        const enrichedContext = {
            ...context,
            retryCount,
            contextSlice: task.contextSlice || context.contextSlice,
            contextPlan: task.contextPlan || context.contextPlan,
            modelRouting: task.modelRouting || context.modelRouting,
            evidenceHash: context.evidenceHash || (task.contextPlan && task.contextPlan.source_hash)
        };

        if (task.owner_agent === 'math-apkg-author') {
            const { executeMathSpecialistTask } = require('./author_math_studylab');
            return await executeMathSpecialistTask(task, enrichedContext);
        }

        if (task.owner_agent === 'physics-numerical-apkg-author') {
            const { executePhysicsSpecialistTask } = require('./author_physics_studylab');
            return await executePhysicsSpecialistTask(task, enrichedContext);
        }

        if (task.owner_agent === 'chemistry-numerical-apkg-author') {
            const { executeChemistrySpecialistTask } = require('./author_chemistry_studylab');
            return await executeChemistrySpecialistTask(task, enrichedContext);
        }

        if (task.owner_agent === 'reasoning-apkg-author') {
            const { executeReasoningSpecialistTask } = require('./author_reasoning_studylab');
            return await executeReasoningSpecialistTask(task, enrichedContext);
        }

        if (task.owner_agent === 'export_anki.js' || task.task_id === 'task-export-anki') {
            const { exportChapterToAnki } = require('./export_anki');
            const targetPath = task.target_path;
            const chapterDir = targetPath ? path.dirname(targetPath) : resolveChapterDir(context.subject, context.chapter, context.customRoot);
            const exportRes = await exportChapterToAnki(chapterDir, {
                chapter: context.chapter,
                subject: context.subject,
                outputPath: targetPath,
                cleanIntermediates: true
            });
            if (exportRes.suppressed) {
                return {
                    status: 'SUPPRESSED',
                    agent: task.owner_agent,
                    task_id: task.task_id,
                    inputs_consumed: task.inputs || ['scratch/evidence-pack.md'],
                    outputs_produced: [],
                    output_paths: [],
                    validation_result: { passed: true, suppressed: true },
                    warnings: [exportRes.reason || 'SUPPRESSED'],
                    errors: [],
                    dependencies_satisfied: true,
                    retry_count: retryCount
                };
            }
            return {
                status: 'SUCCESS',
                agent: task.owner_agent,
                task_id: task.task_id,
                inputs_consumed: task.inputs || ['scratch/evidence-pack.md'],
                outputs_produced: [exportRes.outputPath],
                output_paths: [exportRes.outputPath],
                validation_result: { passed: true, counts: exportRes.counts },
                warnings: [],
                errors: [],
                dependencies_satisfied: true,
                retry_count: retryCount
            };
        }

        if (context.fallbackExecutor) {
            return await context.fallbackExecutor(task, retryCount);
        }

        // Generic fallback for non-specialist sibling tasks
        return {
            status: 'SUPPRESSED',
            agent: task.owner_agent,
            task_id: task.task_id,
            inputs_consumed: ['scratch/evidence-pack.md'],
            outputs_produced: [],
            output_paths: [],
            validation_result: { passed: true },
            warnings: [`Suppressed by specialist dispatcher: task owned by ${task.owner_agent}`],
            errors: [],
            dependencies_satisfied: true,
            retry_count: retryCount
        };
    };
}

module.exports = {
    REQUIRED_HANDOFF_FIELDS,
    buildExecutionTaskGraph,
    computeTaskFingerprint,
    validateStructuredHandoff,
    assertNoParentSelfExecution,
    validateCompletionEvidence,
    executeWithTimeout,
    executeTaskWorkflow,
    createSpecialistTaskDispatcher
};
