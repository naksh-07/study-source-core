/**
 * StudySourceCore Phase 7 Execution State Tracker (`execution_state.js`)
 * 
 * Manages persistent task graph checkpointing, model decisions, context plans,
 * attempts, and failure records in `scratch/execution-state.json`.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_STATE_PATH = path.resolve(__dirname, 'scratch/execution-state.json');

/**
 * Initializes a clean execution state structure.
 */
function initExecutionState(options = {}) {
    const chapter = options.chapter || 'Chapter';
    const subject = options.subject || 'Subject';
    const evidenceHash = options.evidenceHash || options.evidence_hash || null;
    const missionId = options.mission_id || options.missionRunId || `run_${Date.now()}`;

    const state = {
        mission_id: missionId,
        missionRunId: missionId,
        chapter,
        subject,
        evidenceHash,
        evidence_hash: evidenceHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completed_tasks: [],
        tasks: {},
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

    if (options.storage_dir) {
        state._storageDir = options.storage_dir;
        saveExecutionState(state, options.storage_dir);
    }

    return state;
}

/**
 * Persists execution state to disk.
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
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');

    // Also mirror to scratch/execution-state.json if target was a directory and didn't end in scratch
    if (target && !target.endsWith('.json') && !target.endsWith('scratch')) {
        const scratchPath = path.join(target, 'scratch', 'execution-state.json');
        fs.mkdirSync(path.dirname(scratchPath), { recursive: true });
        fs.writeFileSync(scratchPath, JSON.stringify(state, null, 2), 'utf8');
    }

    return filePath;
}

/**
 * Loads execution state from disk if it exists.
 */
function loadExecutionState(targetDirOrPath = null) {
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

    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            return null;
        }
    }
    return null;
}

/**
 * Records or updates a task in the execution state.
 */
function updateTaskState(state, taskId, taskUpdate) {
    if (!state.tasks[taskId]) {
        state.tasks[taskId] = {
            task_id: taskId,
            status: 'PLANNED',
            attempts: [],
            created_at: new Date().toISOString()
        };
        state.metrics.total_tasks = Object.keys(state.tasks).length;
    }

    const task = state.tasks[taskId];
    Object.assign(task, taskUpdate);
    task.updated_at = new Date().toISOString();

    // Recalculate metrics
    let completed = 0;
    let failed = 0;
    let skipped = 0;
    let blocked = 0;

    for (const t of Object.values(state.tasks)) {
        if (t.status === 'COMPLETED') completed++;
        else if (t.status === 'FAILED') failed++;
        else if (t.status === 'SKIPPED') skipped++;
        else if (t.status === 'BLOCKED') blocked++;
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
