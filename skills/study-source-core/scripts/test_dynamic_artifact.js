const { getArtifactRegistry, setRegistryCache, resetRegistryCache } = require('./artifact_registry');
const { buildExecutionTaskGraph } = require('./orchestration_engine');

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
        // 1. Inject dynamic capability into registry cache (in-memory, zero disk pollution)
        const baseRegistry = getArtifactRegistry();
        const registry = {
            ...baseRegistry,
            testArtifact: {
                task_id: 'task-test-artifact',
                task_name: 'Test Artifact Capability',
                wave: 1,
                owner_agent: 'test-agent',
                writer_agent: 'test-agent',
                validator: 'test_validator.js',
                artifactKey: 'testArtifact',
                output_dir: 'TestArtifacts',
                file_pattern: 'TestArtifacts/{chapter}_test.txt',
                dependencies: []
            }
        };
        setRegistryCache(registry);

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
        const graph = buildExecutionTaskGraph(context);
        
        // 4. Assert it appears in the task graph with correct execution metadata
        const testTask = graph.tasks.find(t => t.task_id === 'task-test-artifact');
        if (!testTask) throw new Error("Test artifact was not present in the task graph");
        
        if (testTask.status !== 'PLANNED') throw new Error("Test artifact should be PLANNED");
        if (testTask.owner_agent !== 'test-agent') throw new Error("Test artifact has wrong owner");
        if (testTask.validation_rule !== 'test_validator.js') throw new Error("Test artifact has wrong validator");

    } finally {
        // Cleanly reset registry cache
        resetRegistryCache();
    }
});

console.log("=== Dynamic Artifact Tests Complete ===");

