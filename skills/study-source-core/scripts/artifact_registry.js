const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '..', 'resources', 'artifact-registry.json');

const REQUIRED_FIELDS = [
    'task_id',
    'task_name',
    'wave',
    'owner_agent',
    'writer_agent',
    'artifactKey',
    'dependencies',
    'output_dir',
    'file_pattern'
];

let registryCache = null;

function loadRegistry() {
    if (registryCache) return registryCache;

    if (!fs.existsSync(REGISTRY_PATH)) {
        throw new Error(`[ARTIFACT_REGISTRY_ERROR] Registry file not found at ${REGISTRY_PATH}`);
    }

    let raw;
    try {
        raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
    } catch (e) {
        throw new Error(`[ARTIFACT_REGISTRY_ERROR] Failed to read registry file: ${e.message}`);
    }

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        throw new Error(`[ARTIFACT_REGISTRY_ERROR] Registry file is not valid JSON: ${e.message}`);
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('[ARTIFACT_REGISTRY_ERROR] Registry must be a JSON object');
    }

    const seenTaskIds = new Set();
    const resolvedRegistry = {};

    for (const [trackKey, taskDef] of Object.entries(parsed)) {
        if (typeof taskDef !== 'object' || taskDef === null) {
            throw new Error(`[ARTIFACT_REGISTRY_ERROR] Definition for '${trackKey}' must be an object`);
        }

        // Validate required fields
        for (const field of REQUIRED_FIELDS) {
            if (!(field in taskDef)) {
                throw new Error(`[ARTIFACT_REGISTRY_ERROR] Missing required field '${field}' in artifact '${trackKey}'`);
            }
        }

        // Validate uniqueness of task_id
        if (seenTaskIds.has(taskDef.task_id)) {
            throw new Error(`[ARTIFACT_REGISTRY_ERROR] Duplicate task_id '${taskDef.task_id}' found in artifact '${trackKey}'`);
        }
        seenTaskIds.add(taskDef.task_id);

        // Validate wave
        if (!Number.isInteger(taskDef.wave) || taskDef.wave < 1) {
            throw new Error(`[ARTIFACT_REGISTRY_ERROR] Invalid wave '${taskDef.wave}' in artifact '${trackKey}'. Must be an integer >= 1`);
        }

        // Validate dependencies
        if (!Array.isArray(taskDef.dependencies)) {
            throw new Error(`[ARTIFACT_REGISTRY_ERROR] Dependencies for '${trackKey}' must be an array`);
        }
        
        resolvedRegistry[trackKey] = taskDef;
    }

    // Secondary pass to validate dependency references
    for (const [trackKey, taskDef] of Object.entries(resolvedRegistry)) {
        for (const dep of taskDef.dependencies) {
            if (!seenTaskIds.has(dep)) {
                throw new Error(`[ARTIFACT_REGISTRY_ERROR] Unknown dependency task_id '${dep}' referenced in artifact '${trackKey}'`);
            }
        }
    }
    
    // Validate cyclic dependencies (simple DFS)
    const visited = new Set();
    const recursionStack = new Set();
    
    function checkCycle(task_id) {
        if (recursionStack.has(task_id)) {
            throw new Error(`[ARTIFACT_REGISTRY_ERROR] Circular dependency detected involving task_id '${task_id}'`);
        }
        if (visited.has(task_id)) return;
        
        visited.add(task_id);
        recursionStack.add(task_id);
        
        // Find the definition for this task_id
        const def = Object.values(resolvedRegistry).find(t => t.task_id === task_id);
        if (def) {
            for (const dep of def.dependencies) {
                checkCycle(dep);
            }
        }
        
        recursionStack.delete(task_id);
    }
    
    for (const task_id of seenTaskIds) {
        checkCycle(task_id);
    }

    registryCache = resolvedRegistry;
    return registryCache;
}

function getArtifactRegistry() {
    return loadRegistry();
}

function getArtifactDefinition(trackKey) {
    const registry = loadRegistry();
    if (!registry[trackKey]) {
        throw new Error(`[ARTIFACT_REGISTRY_ERROR] Unknown artifact track '${trackKey}' requested`);
    }
    return registry[trackKey];
}

module.exports = {
    getArtifactRegistry,
    getArtifactDefinition
};
