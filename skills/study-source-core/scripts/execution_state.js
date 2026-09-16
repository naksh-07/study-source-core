/**
 * StudySourceCore Phase 10 Execution State Tracker (`execution_state.js`)
 * 
 * Manages persistent task graph checkpointing, worker state transitions,
 * atomic file persistence, checksum verification, and crash-resilient resume.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_STATE_PATH = path.resolve(__dirname, 'scratch/execution-state.json');
const CURRENT_PIPELINE_VERSION = '1.0.0';
const CURRENT_CHECKPOINT_VERSION = '1.0.0';

/**
 * Worker State Machine definition.
 */
const WORKER_STATES = {
    PENDING: 'PENDING',
    QUEUED: 'QUEUED',
    RUNNING: 'RUNNING',
    SUCCEEDED: 'SUCCEEDED',
    COMPLETED: 'COMPLETED', // Normalized alias of SUCCEEDED
    FAILED: 'FAILED',
    RETRY_PENDING: 'RETRY_PENDING',
    RETRYING: 'RETRYING',   // Normalized alias of RETRY_PENDING
    CANCELLED: 'CANCELLED',
    BLOCKED: 'BLOCKED',
    SKIPPED: 'SKIPPED'
};

/**
 * Permitted state transitions.
 */
const PERMITTED_TRANSITIONS = {
    PENDING: ['QUEUED', 'SKIPPED', 'BLOCKED', 'RUNNING', 'FAILED'],
    QUEUED: ['RUNNING', 'CANCELLED', 'BLOCKED', 'FAILED'],
    RUNNING: ['SUCCEEDED', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETRY_PENDING', 'RETRYING'],
    SUCCEEDED: [], // Terminal
    COMPLETED: [], // Terminal
    FAILED: ['RETRY_PENDING', 'RETRYING', 'QUEUED', 'RUNNING'],
    RETRY_PENDING: ['QUEUED', 'RUNNING', 'FAILED', 'COMPLETED', 'SUCCEEDED'],
    RETRYING: ['QUEUED', 'RUNNING', 'FAILED', 'COMPLETED', 'SUCCEEDED'],
    CANCELLED: ['QUEUED'],
    BLOCKED: ['QUEUED', 'RUNNING'],
    SKIPPED: []    // Terminal
};

/**
 * Normalizes state aliases.
 */
function normalizeState(state) {
    if (!state) return 'PENDING';
    const s = String(state).toUpperCase().trim();
    if (s === 'PLANNED') return 'PENDING';
    return s;
}

/**
 * Validates state transition according to transition matrix.
 */
function validateStateTransition(currentStatus, nextStatus, taskId = 'unknown') {
    const from = normalizeState(currentStatus);
    const to = normalizeState(nextStatus);

    if (from === to) return true;

    const allowed = PERMITTED_TRANSITIONS[from];
    if (!allowed || !allowed.includes(to)) {
        throw new Error(`[INVALID_STATE_TRANSITION] Task '${taskId}' cannot transition from '${from}' to '${to}'. Permitted: [${(allowed || []).join(', ')}]`);
    }
    return true;
}

/**
 * Computes SHA-256 integrity checksum of execution state.
 */
function computeStateChecksum(state) {
    const clone = JSON.parse(JSON.stringify(state));
    delete clone.state_checksum;
    delete clone.updatedAt;
    delete clone.updated_at;
    const raw = JSON.stringify(clone);
    return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Initializes a clean execution state structure.
 */
function initExecutionState(options = {}) {
    const chapter = options.chapter || 'Chapter';
    const subject = options.subject || 'Subject';
    const evidenceHash = options.evidenceHash || options.evidence_hash || null;
    const missionId = options.mission_id || options.missionRunId || `run_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const pipelineVersion = options.pipeline_version || CURRENT_PIPELINE_VERSION;

    const state = {
        mission_id: missionId,
        missionRunId: missionId,
        run_id: missionId,
        chapter,
        subject,
        pipeline_version: pipelineVersion,
        checkpoint_version: CURRENT_CHECKPOINT_VERSION,
        evidenceHash,
        evidence_hash: evidenceHash,
        current_wave: options.current_wave || 'WAVE_1',
        createdAt: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_tasks: [],
        failed_tasks: [],
        retry_counts: {},
        dependency_state: {},
        artifact_state: {},
        certification_state: null,
        worker_states: {},
        tasks: {},
        task_states: {},
        metrics: {
            total_tasks: 0,
            total_launches: 0,
            completed_tasks: 0,
            skipped_tasks: 0,
            failed_tasks: 0,
            blocked_tasks: 0,
            max_concurrent_workers: 4,
            launch_ceiling: 10
        }
    };

    // Keep task_states and tasks synchronized
    state.task_states = state.tasks;

    if (options.storage_dir) {
        state._storageDir = options.storage_dir;
        saveExecutionState(state, options.storage_dir);
    }

    return state;
}

/**
 * Atomically persists execution state to disk.
 * Strategy: write to unique .tmp file -> fsync -> validate syntax -> atomic rename.
 */
function saveExecutionState(state, targetDirOrPath = null) {
    let filePath = DEFAULT_STATE_PATH;
    const target = targetDirOrPath || state._storageDir;
    if (target) {
        if (target.endsWith('.json')) {
            filePath = target;
        } else {
            filePath = path.join(target, 'execution-state.json');
        }
    }

    state.updatedAt = new Date().toISOString();
    state.updated_at = state.updatedAt;
    state.task_states = state.tasks;
    state.state_checksum = computeStateChecksum(state);

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const tempFile = `${filePath}.tmp.${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const payload = JSON.stringify(state, null, 2);

    try {
        const fd = fs.openSync(tempFile, 'w');
        fs.writeSync(fd, payload, 0, 'utf8');
        try {
            fs.fsyncSync(fd);
        } catch (e) {}
        fs.closeSync(fd);

        // Verify written temp file can be parsed
        const readBack = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
        if (!readBack || !readBack.mission_id) {
            throw new Error('State validation failed on temporary checkpoint file');
        }

        // Atomic rename overwrites target file
        fs.renameSync(tempFile, filePath);
    } catch (err) {
        if (fs.existsSync(tempFile)) {
            try { fs.unlinkSync(tempFile); } catch (e) {}
        }
        throw new Error(`[ATOMIC_CHECKPOINT_WRITE_FAILED] Failed to atomically save state to '${filePath}': ${err.message}`);
    }

    // Also mirror to scratch/execution-state.json if target was a directory and didn't end in scratch
    if (target && !target.endsWith('.json') && !target.endsWith('scratch')) {
        const scratchPath = path.join(target, 'scratch', 'execution-state.json');
        fs.mkdirSync(path.dirname(scratchPath), { recursive: true });
        const scratchTemp = `${scratchPath}.tmp.${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        try {
            fs.writeFileSync(scratchTemp, payload, 'utf8');
            fs.renameSync(scratchTemp, scratchPath);
        } catch (e) {
            if (fs.existsSync(scratchTemp)) {
                try { fs.unlinkSync(scratchTemp); } catch (u) {}
            }
        }
    }

    return filePath;
}

/**
 * Validates checkpoint integrity and structure (Fail-Closed).
 */
function validateCheckpointStructure(state, options = {}) {
    if (!state || typeof state !== 'object') {
        throw new Error('[CORRUPT_CHECKPOINT] Checkpoint state is empty or not a valid object');
    }

    const requiredFields = ['mission_id', 'pipeline_version', 'tasks'];
    for (const field of requiredFields) {
        if (!state[field]) {
            throw new Error(`[CORRUPT_CHECKPOINT] Missing mandatory field: '${field}'`);
        }
    }

    // Pipeline version check
    if (options.expectedPipelineVersion && state.pipeline_version !== options.expectedPipelineVersion) {
        throw new Error(`[CHECKPOINT_VERSION_MISMATCH] Checkpoint pipeline version '${state.pipeline_version}' does not match expected '${options.expectedPipelineVersion}'`);
    }

    // Checksum verification if present
    if (state.state_checksum) {
        const computed = computeStateChecksum(state);
        if (computed !== state.state_checksum) {
            throw new Error(`[CORRUPT_CHECKPOINT] Checksum mismatch: stored '${state.state_checksum}', computed '${computed}'`);
        }
    }

    // Task state validity check
    for (const [taskId, taskData] of Object.entries(state.tasks)) {
        if (!taskData || !taskData.status) {
            throw new Error(`[CORRUPT_CHECKPOINT] Task '${taskId}' has missing or empty status`);
        }
        const norm = normalizeState(taskData.status);
        if (!WORKER_STATES[norm]) {
            throw new Error(`[CORRUPT_CHECKPOINT] Task '${taskId}' has invalid state '${taskData.status}'`);
        }
    }

    return true;
}

/**
 * Loads execution state from disk with fail-closed validation options.
 */
function loadExecutionState(targetDirOrPath = null, options = {}) {
    let filePath = DEFAULT_STATE_PATH;
    if (targetDirOrPath) {
        if (targetDirOrPath.endsWith('.json')) {
            filePath = targetDirOrPath;
        } else {
            const directPath = path.join(targetDirOrPath, 'execution-state.json');
            const scratchPath = path.join(targetDirOrPath, 'scratch', 'execution-state.json');
            if (fs.existsSync(directPath)) {
                filePath = directPath;
            } else if (fs.existsSync(scratchPath)) {
                filePath = scratchPath;
            } else {
                filePath = directPath;
            }
        }
    }

    if (!fs.existsSync(filePath)) {
        return null;
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
        if (options.failClosed || options.throwOnCorrupt) {
            throw new Error(`[CORRUPT_CHECKPOINT] File '${filePath}' is zero bytes (truncated)`);
        }
        return null;
    }

    let raw;
    try {
        raw = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
        if (options.failClosed || options.throwOnCorrupt) {
            throw new Error(`[CORRUPT_CHECKPOINT] Failed to read '${filePath}': ${e.message}`);
        }
        return null;
    }

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        if (options.failClosed || options.throwOnCorrupt) {
            throw new Error(`[CORRUPT_CHECKPOINT] Malformed JSON in '${filePath}': ${e.message}`);
        }
        return null;
    }

    // Ensure synchronized alias
    parsed.task_states = parsed.tasks;

    if (options.validate || options.failClosed) {
        validateCheckpointStructure(parsed, options);
    }

    return parsed;
}

/**
 * Records or updates a task in the execution state with deterministic state transition validation.
 */
function updateTaskState(state, taskId, taskUpdate) {
    if (!state.tasks[taskId]) {
        state.tasks[taskId] = {
            task_id: taskId,
            status: 'PENDING',
            attempts: [],
            created_at: new Date().toISOString(),
            history: []
        };
        state.metrics.total_tasks = Object.keys(state.tasks).length;
    }

    const task = state.tasks[taskId];
    const previousStatus = task.status;
    const nextStatus = taskUpdate.status || previousStatus;

    // Validate state transition if status is changing
    if (nextStatus !== previousStatus) {
        validateStateTransition(previousStatus, nextStatus, taskId);
        task.history = task.history || [];
        task.history.push({
            from: previousStatus,
            to: nextStatus,
            timestamp: new Date().toISOString()
        });
    }

    Object.assign(task, taskUpdate);
    task.updated_at = new Date().toISOString();

    // Recalculate metrics
    let completed = 0;
    let failed = 0;
    let skipped = 0;
    let blocked = 0;

    for (const t of Object.values(state.tasks)) {
        const norm = normalizeState(t.status);
        if (norm === 'COMPLETED' || norm === 'SUCCEEDED') completed++;
        else if (norm === 'FAILED') failed++;
        else if (norm === 'SKIPPED') skipped++;
        else if (norm === 'BLOCKED') blocked++;
    }

    state.metrics.completed_tasks = completed;
    state.metrics.failed_tasks = failed;
    state.metrics.skipped_tasks = skipped;
    state.metrics.blocked_tasks = blocked;

    return task;
}

function checkpointTaskStart(state, task, modelClass, contextStrategy) {
    const taskState = state.tasks[task.task_id] || {};
    const attempts = taskState.attempts || [];
    const updated = updateTaskState(state, task.task_id, {
        status: 'RUNNING',
        model_class: modelClass,
        context_strategy: contextStrategy,
        owner_agent: task.owner_agent,
        attempts
    });
    if (state._storageDir) {
        saveExecutionState(state, state._storageDir);
    }
    return updated;
}

function checkpointTaskComplete(state, taskId, result = {}) {
    if (!state.completed_tasks) state.completed_tasks = [];
    if (!state.completed_tasks.includes(taskId)) {
        state.completed_tasks.push(taskId);
    }
    const updated = updateTaskState(state, taskId, {
        status: 'COMPLETED',
        output_paths: result.output_paths || result.outputs_produced || [],
        validator: result.validator || null,
        validator_result: result.validator_result || { passed: true },
        attempt: result.attempt || 1
    });
    if (state._storageDir) {
        saveExecutionState(state, state._storageDir);
    }
    return updated;
}

function checkpointTaskRetry(state, taskId, retryInfo = {}) {
    const task = state.tasks[taskId] || {};
    const attempts = task.attempts || [];
    attempts.push(retryInfo);

    state.retry_counts = state.retry_counts || {};
    state.retry_counts[taskId] = (state.retry_counts[taskId] || 0) + 1;

    const updated = updateTaskState(state, taskId, {
        status: 'RETRYING',
        retry_info: retryInfo,
        attempts: attempts,
        model_class: retryInfo.model_class || task.model_class,
        context_strategy: retryInfo.context_strategy || task.context_strategy
    });
    if (state._storageDir) {
        saveExecutionState(state, state._storageDir);
    }
    return updated;
}

function checkpointTaskFail(state, taskId, error) {
    const msg = error ? (error.message || String(error)) : 'Unknown error';
    if (!state.failed_tasks) state.failed_tasks = [];
    if (!state.failed_tasks.includes(taskId)) {
        state.failed_tasks.push(taskId);
    }
    const updated = updateTaskState(state, taskId, {
        status: 'FAILED',
        error: msg
    });
    if (state._storageDir) {
        saveExecutionState(state, state._storageDir);
    }
    return updated;
}

module.exports = {
    DEFAULT_STATE_PATH,
    CURRENT_PIPELINE_VERSION,
    CURRENT_CHECKPOINT_VERSION,
    WORKER_STATES,
    PERMITTED_TRANSITIONS,
    normalizeState,
    validateStateTransition,
    computeStateChecksum,
    validateCheckpointStructure,
    initExecutionState,
    createExecutionState: initExecutionState,
    saveExecutionState,
    loadExecutionState,
    updateTaskState,
    checkpointTaskStart,
    checkpointTaskComplete,
    checkpointTaskRetry,
    checkpointTaskFail
};
