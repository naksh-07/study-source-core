const fs = require('fs');
const path = require('path');
const { buildExecutionTaskGraph } = require('./orchestration_engine');

// We will temporarily inject a test-artifact into the artifact-registry.json
const registryPath = path.join(__dirname, '..', 'resources', 'artifact-registry.json');
const originalRegistryContent = fs.readFileSync(registryPath, 'utf8');

function runTest(name, fn) {
    try {
        fn();
        console.log(`[PASS] ${name}`);
    } catch (e) {
        console.error(`[FAIL] ${name}`);
        console.error(`  -> Error: ${e.message}`);
        process.exitCode = 1;
    }
}

console.log("=== Running Dynamic Artifact Architecture Test ===");

runTest("Dynamic Artifact is routed and executed without Core code changes", () => {
    try {
        // 1. Modify registry externally (as if a new artifact capability was registered)
        const registry = JSON.parse(originalRegistryContent);
        registry['testArtifact'] = {
            task_id: 'task-test-artifact',
            task_name: 'Test Artifact Capability',
            wave: 1,
            owner_agent: 'test-agent',
            writer_agent: 'test-agent',
            validator: 'test_validator.js',
            artifactKey: 'testArtifact',
            dependencies: []
        };
        fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');

        // Clear the cache in artifact_registry to reload
        const registryModulePath = require.resolve('./artifact_registry');
        delete require.cache[registryModulePath];
        
        // Clear orchestration engine cache so it re-imports the registry
        const orchestrationModulePath = require.resolve('./orchestration_engine');
        delete require.cache[orchestrationModulePath];
        const { buildExecutionTaskGraph: buildExecutionTaskGraphReloaded } = require('./orchestration_engine');

        // 2. Mock explicit policy request for this new artifact
        // (Subject Policy determines eligibility, so we simulate the Subject declaring it eligible)
        const context = {
            subject: 'Math',
            chapter: 'Algebra',
            evidenceHash: 'abc1234',
            specialist_agent: 'math-apkg-author',
            artifactPolicy: {
                testArtifact: true
            }
        };

        // 3. Build generic execution graph
        const graph = buildExecutionTaskGraphReloaded(context);
        
        // 4. Assert it appears in the task graph with correct execution metadata
        const testTask = graph.tasks.find(t => t.task_id === 'task-test-artifact');
        if (!testTask) throw new Error("Test artifact was not present in the task graph");
        
        if (testTask.status !== 'PLANNED') throw new Error("Test artifact should be PLANNED");
        if (testTask.owner_agent !== 'test-agent') throw new Error("Test artifact has wrong owner");
        if (testTask.validation_rule !== 'test_validator.js') throw new Error("Test artifact has wrong validator");

    } finally {
        // Restore registry
        fs.writeFileSync(registryPath, originalRegistryContent, 'utf8');
        const registryModulePath = require.resolve('./artifact_registry');
        delete require.cache[registryModulePath];
        const orchestrationModulePath = require.resolve('./orchestration_engine');
        delete require.cache[orchestrationModulePath];
    }
});

console.log("=== Dynamic Artifact Tests Complete ===");
