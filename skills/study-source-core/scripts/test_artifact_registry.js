const fs = require('fs');
const path = require('path');
const { getArtifactRegistry } = require('./artifact_registry');

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

function expectThrow(name, fn, expectedErrMsgSnippet) {
    try {
        fn();
        console.error(`[FAIL] ${name} (Expected to throw but didn't)`);
        process.exitCode = 1;
    } catch (e) {
        if (!e.message.includes(expectedErrMsgSnippet)) {
            console.error(`[FAIL] ${name} (Threw wrong error: ${e.message}, expected snippet: ${expectedErrMsgSnippet})`);
            process.exitCode = 1;
        } else {
            console.log(`[PASS] ${name}`);
        }
    }
}

console.log("=== Running Artifact Registry Tests ===");

// A. Valid registry loads
runTest("Valid registry loads successfully", () => {
    const registry = getArtifactRegistry();
    if (!registry['notes']) throw new Error("Expected 'notes' artifact to exist in registry");
    if (registry['notes'].task_id !== 'task-core-notes') throw new Error("Unexpected task_id for notes");
});

console.log("=== Artifact Registry Tests Complete ===");
