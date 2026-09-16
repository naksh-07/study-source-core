/**
 * StudySourceCore Antigravity Host Adapter (`antigravity_adapter.js`)
 * 
 * Implements Phase 10 Host Adapter bridging abstract StudySourceCore specialist tasks
 * to native Antigravity capabilities (subagent dispatch, tools, worker lifecycle).
 * 
 * Explicitly maintains distinct identity dimensions:
 *   logical_task_id != worker_id != conversation_id != mission_id != wave_id
 * 
 * Enforces:
 *   - Parent Self-Execution Ban
 *   - Single-Writer / Single-Owner per logical task
 *   - 11-field machine-readable handoff translation
 */

const crypto = require('crypto');
const path = require('path');
const { loadAllAgentDefinitions, buildAntigravityRegistrationPayload } = require('./register_antigravity_subagents');

/**
 * Model routing class mapping from StudySourceCore to Antigravity subagent model tiers.
 */
const ANTIGRAVITY_MODEL_MAP = {
    CHEAP: 'flash',
    DEFAULT: 'inherit',
    STRONG: 'pro'
};

/**
 * Antigravity Host Adapter Class
 */
class AntigravityHostAdapter {
    constructor(options = {}) {
        this.missionId = options.missionId || `mission_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        this.activeWorkers = new Map(); // worker_id -> WorkerState
        this.taskWorkerMap = new Map(); // logical_task_id -> worker_id
        this.registeredAgents = options.registeredAgents || loadAllAgentDefinitions();
        this.parentIdentities = new Set([
            'parent',
            'study-source-core',
            'orchestrator',
            'parent-orchestrator',
            'adaptive-orchestrator'
        ]);
    }

    /**
     * Asserts that the parent worker is not attempting to execute a specialist child task.
     */
    assertNoParentSelfExecution(logicalTaskId, ownerAgent, executorIdentity) {
        const normExecutor = String(executorIdentity || '').toLowerCase().trim();
        const normOwner = String(ownerAgent || '').toLowerCase().trim();

        if (this.parentIdentities.has(normExecutor) && !this.parentIdentities.has(normOwner)) {
            throw new Error(`[PARENT_SELF_EXECUTION_VIOLATION] Parent '${executorIdentity}' is strictly prohibited from executing child specialist task '${logicalTaskId}' owned by '${ownerAgent}'.`);
        }
    }

    /**
     * Generates a deterministic, unique Worker Identity.
     */
    createWorkerIdentity(logicalTaskId, ownerAgent, attempt = 1) {
        const nonce = crypto.randomBytes(3).toString('hex');
        return `worker_${ownerAgent}_${logicalTaskId}_att${attempt}_${nonce}`;
    }

    /**
     * Allocates and binds a worker to a logical task with Single-Writer guarantee.
     */
    bindWorkerToTask({
        logicalTaskId,
        ownerAgent,
        writerAgent,
        waveId,
        attempt = 1,
        callerIdentity = 'orchestrator'
    }) {
        // 1. Enforce Parent Self-Execution Ban
        const effectiveWriter = writerAgent || ownerAgent;
        this.assertNoParentSelfExecution(logicalTaskId, ownerAgent, effectiveWriter);

        // 2. Enforce Single-Writer / Single-Owner: only 1 active worker per logical task
        if (this.taskWorkerMap.has(logicalTaskId)) {
            const existingWorkerId = this.taskWorkerMap.get(logicalTaskId);
            const existing = this.activeWorkers.get(existingWorkerId);
            if (existing && existing.status === 'RUNNING') {
                throw new Error(`[SINGLE_WRITER_COLLISION] Logical task '${logicalTaskId}' already has an active executing worker '${existingWorkerId}'.`);
            }
        }

        const workerId = this.createWorkerIdentity(logicalTaskId, ownerAgent, attempt);
        const workerState = {
            worker_id: workerId,
            logical_task_id: logicalTaskId,
            owner_agent: ownerAgent,
            writer_agent: writerAgent || ownerAgent,
            wave_id: waveId,
            attempt,
            status: 'ALLOCATED',
            conversation_id: null,
            created_at: new Date().toISOString(),
            started_at: null,
            completed_at: null
        };

        this.activeWorkers.set(workerId, workerState);
        this.taskWorkerMap.set(logicalTaskId, workerId);

        return workerState;
    }

    /**
     * Builds the Antigravity `invoke_subagent` specification payload for a task.
     */
    buildSubagentInvocationSpec(workerState, task, contextPlan, modelRouting) {
        const agentDef = this.registeredAgents.get(task.owner_agent);
        const mappedModel = ANTIGRAVITY_MODEL_MAP[modelRouting ? modelRouting.model_class : 'DEFAULT'] || 'inherit';

        const prompt = [
            `# Specialist Mandate: ${task.owner_agent}`,
            `Logical Task ID: ${task.task_id}`,
            `Worker ID: ${workerState.worker_id}`,
            `Mission ID: ${this.missionId}`,
            `Wave: ${task.wave}`,
            `Attempt: ${workerState.attempt}`,
            '',
            `## Target File Output (Single-Writer)`,
            `Primary Target: ${task.target_path || 'None (in-memory / report)'}`,
            '',
            `## Context Slice & Provenance`,
            `Context Strategy: ${(contextPlan && contextPlan.context_strategy) || 'TASK_SCOPED'}`,
            `Slice Hash: ${(contextPlan && contextPlan.slice_hash) || 'None'}`,
            `Evidence Hash: ${(contextPlan && contextPlan.source_hash) || 'None'}`,
            '',
            `## Scoped Content`,
            (contextPlan && contextPlan.context_slice_content) ? contextPlan.context_slice_content : (task.contextSlice || ''),
            '',
            task.promptConstraints ? `## Adaptive Retry Directives\n${JSON.stringify(task.promptConstraints, null, 2)}` : '',
            '',
            `## Mandatory Handoff Contract`,
            `You MUST conclude your execution by outputting a valid 11-field JSON handoff block:`,
            '```json',
            JSON.stringify({
                status: 'SUCCESS',
                agent: task.owner_agent,
                task_id: task.task_id,
                inputs_consumed: task.inputs || [],
                outputs_produced: task.expected_outputs || [],
                output_paths: task.target_path ? [task.target_path] : [],
                validation_result: { passed: true, errors: [], warnings: [] },
                warnings: [],
                errors: [],
                dependencies_satisfied: true,
                retry_count: workerState.attempt - 1
            }, null, 2),
            '```'
        ].join('\n');

        return {
            workerId: workerState.worker_id,
            subagentSpec: {
                TypeName: task.owner_agent,
                Role: (agentDef && agentDef.description) ? agentDef.description.slice(0, 40) : `${task.owner_agent} Specialist`,
                Prompt: prompt,
                Model: mappedModel,
                Workspace: 'inherit'
            }
        };
    }

    /**
     * Marks a worker as started and records its Antigravity conversation ID.
     */
    recordWorkerStart(workerId, conversationId = null) {
        const worker = this.activeWorkers.get(workerId);
        if (!worker) {
            throw new Error(`[UNKNOWN_WORKER] Worker '${workerId}' not found.`);
        }
        worker.status = 'RUNNING';
        worker.conversation_id = conversationId || `conv_${crypto.randomBytes(8).toString('hex')}`;
        worker.started_at = new Date().toISOString();
        return worker;
    }

    /**
     * Terminates and collapses a worker upon completion or failure.
     */
    collapseWorker(workerId, terminalStatus = 'TERMINATED') {
        const worker = this.activeWorkers.get(workerId);
        if (!worker) return null;

        worker.status = terminalStatus;
        worker.completed_at = new Date().toISOString();

        if (this.taskWorkerMap.get(worker.logical_task_id) === workerId) {
            this.taskWorkerMap.delete(worker.logical_task_id);
        }
        this.activeWorkers.delete(workerId);

        return worker;
    }

    /**
     * Extracts and validates an 11-field handoff block from subagent output text.
     */
    extractHandoffBlock(outputText) {
        if (!outputText) return null;
        const jsonMatch = outputText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[1]);
                if (parsed && typeof parsed === 'object' && parsed.status && parsed.agent && parsed.task_id) {
                    return parsed;
                }
            } catch (e) {}
        }
        return null;
    }
}

module.exports = {
    AntigravityHostAdapter,
    ANTIGRAVITY_MODEL_MAP
};
