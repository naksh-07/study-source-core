/**
 * StudySourceCore vNext Orchestration & Task Graph Engine (`orchestration_engine.js`)
 * 
 * Provides deterministic, machine-readable task graph management, single-writer enforcement,
 * parent self-execution prevention, dependency barriers, failure isolation, targeted retries,
 * and physical completion evidence generation.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { evaluateArtifactRouting } = require('./routing_engine');
const { getCanonicalArtifactPaths, getVaultRoot, resolveChapterDir } = require('./path_resolver');
const { getArtifactRegistry } = require('./artifact_registry');

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

    const routing = evaluateArtifactRouting(context);
    const paths = getCanonicalArtifactPaths(subject, chapter, customRoot);
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

        tasks.push({
            task_id: taskDef.task_id,
            track_key: trackKey,
            task_name: taskDef.task_name,
            wave: taskDef.wave,
            owner_agent: resolvedOwner,
            writer_agent: resolvedWriter,
            target_path: targetFilePath,
            inputs: ['scratch/evidence-pack.md'],
            expected_outputs: targetFilePath ? [targetFilePath] : [],
            dependencies: activeDependencies,
            status: isEligible ? 'PLANNED' : 'SKIPPED',
            suppression_reason: isEligible ? null : suppressionReason,
            validation_rule: taskDef.validator,
            retry_budget: 1,
            current_retries: 0,
            input_fingerprint: taskFingerprint
        });
    }

    return {
        chapter,
        subject,
        evidenceHash,
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
    const parentIdentities = ['parent', 'study-source-core', 'orchestrator', 'parent-orchestrator'];
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

    if (task.status === 'SKIPPED') {
        return {
            isValid: true,
            status: 'SKIPPED',
            reason: task.suppression_reason,
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
 * Executes a simulated or real task workflow with explicit dependency barriers,
 * failure isolation, and 1-retry budget.
 * 
 * @param {Object} graph - Task Graph built by buildExecutionTaskGraph
 * @param {Function} taskExecutor - Async function (task, retryCount) => handoffObject
 * @returns {Object} Complete workflow execution summary and observable traces
 */
async function executeTaskWorkflow(graph, taskExecutor) {
    const traces = {
        executionPlan: [],
        dispatchTrace: [],
        ownershipTrace: [],
        handoffTrace: [],
        duplicateWorkAudit: [],
        completionEvidence: [],
        efficiencyAudit: {}
    };

    const taskStatusMap = new Map();
    let totalInvocations = 0;
    let duplicateInvocations = 0;
    let skippedCount = 0;
    let completedCount = 0;
    let failedCount = 0;
    let blockedCount = 0;

    // Initialize statuses
    for (const task of graph.tasks) {
        taskStatusMap.set(task.task_id, task.status);
        traces.executionPlan.push({
            task_id: task.task_id,
            name: task.task_name,
            wave: task.wave,
            owner: task.owner_agent,
            initial_status: task.status,
            suppression_reason: task.suppression_reason
        });
    }

    // Process tasks based on dependency resolution rather than hardcoded waves
    let pendingTasks = [...graph.tasks];

    while (pendingTasks.length > 0) {
        const readyTasks = pendingTasks.filter(task => {
            if (taskStatusMap.get(task.task_id) === 'SKIPPED') return true;
            
            // Task is ready if ALL its dependencies have a final status
            return task.dependencies.every(depId => {
                const depStatus = taskStatusMap.get(depId);
                return depStatus === 'COMPLETED' || depStatus === 'SKIPPED' || depStatus === 'FAILED' || depStatus === 'BLOCKED';
            });
        });

        if (readyTasks.length === 0) {
            // Unresolvable dependencies (circular or missing)
            for (const task of pendingTasks) {
                taskStatusMap.set(task.task_id, 'BLOCKED');
                blockedCount++;
                traces.dispatchTrace.push({
                    task_id: task.task_id,
                    agent: task.owner_agent,
                    action: 'BLOCKED',
                    unmet_dependency: 'UNRESOLVABLE_GRAPH'
                });
            }
            break;
        }

        // Execute ready tasks
        for (const task of readyTasks) {
            pendingTasks = pendingTasks.filter(t => t.task_id !== task.task_id);

            if (taskStatusMap.get(task.task_id) === 'SKIPPED') {
                skippedCount++;
                traces.dispatchTrace.push({
                    task_id: task.task_id,
                    agent: task.owner_agent,
                    action: 'SKIPPED',
                    reason: task.suppression_reason
                });
                continue;
            }

            // Check dependencies: if any active dependency failed/blocked, mark this task BLOCKED
            const unmetDependency = task.dependencies.find(depId => {
                const depStatus = taskStatusMap.get(depId);
                return depStatus === 'FAILED' || depStatus === 'BLOCKED';
            });

            if (unmetDependency) {
                taskStatusMap.set(task.task_id, 'BLOCKED');
                blockedCount++;
                traces.dispatchTrace.push({
                    task_id: task.task_id,
                    agent: task.owner_agent,
                    action: 'BLOCKED',
                    unmet_dependency: unmetDependency
                });
                continue;
            }

            // Pre-dispatch Ownership & Single-Writer Assertion
            assertNoParentSelfExecution(task, task.writer_agent);
            traces.ownershipTrace.push({
                task_id: task.task_id,
                target_path: task.target_path,
                designated_owner: task.owner_agent,
                designated_writer: task.writer_agent,
                status: 'OWNERSHIP_VERIFIED'
            });

            // Dispatch Task to Executor
            let executionSuccess = false;
            let currentAttempt = 0;
            let handoff = null;

            while (currentAttempt <= task.retry_budget && !executionSuccess) {
                totalInvocations++;
                traces.dispatchTrace.push({
                    task_id: task.task_id,
                    agent: task.owner_agent,
                    action: currentAttempt === 0 ? 'DISPATCH' : 'RETRY_DISPATCH',
                    attempt: currentAttempt + 1,
                    timestamp: new Date().toISOString()
                });

                try {
                    handoff = await taskExecutor(task, currentAttempt);
                    const handoffVal = validateStructuredHandoff(handoff);

                    if (!handoffVal.isValid) {
                        throw new Error(`[HANDOFF_SCHEMA_ERROR] ${handoffVal.errors.join('; ')}`);
                    }

                    traces.handoffTrace.push({
                        task_id: task.task_id,
                        agent: handoff.agent,
                        status: handoff.status,
                        output_paths: handoff.output_paths,
                        attempt: currentAttempt + 1
                    });

                    // Validate physical completion evidence
                    const completionVal = await validateCompletionEvidence(task, handoff);
                    if (completionVal.isValid) {
                        executionSuccess = true;
                        taskStatusMap.set(task.task_id, 'COMPLETED');
                        completedCount++;
                        traces.completionEvidence.push({
                            task_id: task.task_id,
                            target_path: task.target_path,
                            bytes: completionVal.fileSize,
                            status: 'VERIFIED_ON_DISK'
                        });
                    } else {
                        throw new Error(`[COMPLETION_EVIDENCE_ERROR] ${completionVal.errors.join('; ')}`);
                    }
                } catch (err) {
                    currentAttempt++;
                    if (currentAttempt > task.retry_budget) {
                        taskStatusMap.set(task.task_id, 'FAILED');
                        failedCount++;
                        traces.completionEvidence.push({
                            task_id: task.task_id,
                            target_path: task.target_path,
                            status: 'FAILED',
                            errors: [err.message]
                        });
                    }
                }
            }
        }
    }

    // Calculate efficiency metrics
    traces.efficiencyAudit = {
        total_tasks: graph.tasks.length,
        total_subagent_invocations: totalInvocations,
        duplicate_invocations: duplicateInvocations,
        completed_tasks: completedCount,
        skipped_tasks: skippedCount,
        blocked_tasks: blockedCount,
        failed_tasks: failedCount,
        max_concurrent_workers: 4,
        max_total_launches_cap: 10,
        within_resource_budget: totalInvocations <= 10
    };

    const overallVerdict = failedCount === 0 && blockedCount === 0 ? 'SUCCESS' : (completedCount > 0 ? 'PARTIAL_SUCCESS' : 'FAILED');

    return {
        overallVerdict,
        taskStatusMap: Object.fromEntries(taskStatusMap),
        traces
    };
}

/**
 * Creates a standard specialist dispatcher for real specialist execution.
 * Routes domain specialist tasks to their registered specialist authors.
 */
function createSpecialistTaskDispatcher(context = {}) {
    return async function specialistTaskDispatcher(task, retryCount) {
        if (task.owner_agent === 'math-apkg-author') {
            const { executeMathSpecialistTask } = require('./author_math_studylab');
            return await executeMathSpecialistTask(task, { ...context, retryCount });
        }

        if (task.owner_agent === 'physics-numerical-apkg-author') {
            const { executePhysicsSpecialistTask } = require('./author_physics_studylab');
            return await executePhysicsSpecialistTask(task, { ...context, retryCount });
        }

        if (context.fallbackExecutor) {
            return await context.fallbackExecutor(task, retryCount);
        }

        // Generic fallback for non-specialist sibling tasks
        return {
            status: 'SUCCESS',
            agent: task.owner_agent,
            task_id: task.task_id,
            inputs_consumed: ['scratch/evidence-pack.md'],
            outputs_produced: task.target_path ? [task.target_path] : [],
            output_paths: task.target_path ? [task.target_path] : [],
            validation_result: { passed: true },
            warnings: [],
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
    executeTaskWorkflow,
    createSpecialistTaskDispatcher
};
