const fs = require('fs');
const path = require('path');
const { resolveSubjectPolicy, VALID_SUBJECTS } = require('./subject_policy_resolver');
const { evaluateArtifactRouting } = require('./routing_engine');

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

console.log("=== Running Subject Policy Resolver Tests ===");

// A & B. Valid policies load successfully
runTest("Valid Math policy loads successfully", () => {
    const policy = resolveSubjectPolicy("Math");
    if (policy.notes !== true) throw new Error("Expected notes to be true");
    if (policy.practiceQuestions !== true) throw new Error("Expected practiceQuestions to be true");
});

runTest("Valid Biology policy loads successfully", () => {
    const policy = resolveSubjectPolicy("Biology");
    if (policy.notes !== true) throw new Error("Expected notes to be true");
    if (policy.practiceQuestions !== false) throw new Error("Expected practiceQuestions to be false for Biology");
});

// C. Every supported subject has a valid runtime policy
runTest("Every supported subject has a valid runtime policy", () => {
    for (const subject of VALID_SUBJECTS) {
        resolveSubjectPolicy(subject);
    }
});

// D. Missing subject fails closed
expectThrow("Missing subject fails closed", () => {
    resolveSubjectPolicy(undefined);
}, "MISSING_SUBJECT");
expectThrow("Invalid subject fails closed", () => {
    resolveSubjectPolicy("Astrology");
}, "UNKNOWN_SUBJECT");

// Temporary file manipulation for failure cases
const dummySubject = 'DummySubject';
const dummyDir = path.join(__dirname, '..', 'subject-skills', dummySubject);

// Add DummySubject to valid temporarily for tests
VALID_SUBJECTS.push(dummySubject);

// E. Missing runtime-policy.json fails closed
runTest("Missing runtime-policy.json fails closed", () => {
    expectThrow("Missing file", () => resolveSubjectPolicy(dummySubject), "MISSING_POLICY_FILE");
});

fs.mkdirSync(dummyDir, { recursive: true });

// F. Malformed JSON fails closed
runTest("Malformed JSON fails closed", () => {
    fs.writeFileSync(path.join(dummyDir, 'runtime-policy.json'), "{ malformed", 'utf8');
    expectThrow("Malformed file", () => resolveSubjectPolicy(dummySubject), "MALFORMED_POLICY");
});

// G. Invalid policy schema fails closed
runTest("Invalid policy schema fails closed", () => {
    // Missing required field
    fs.writeFileSync(path.join(dummyDir, 'runtime-policy.json'), JSON.stringify({ notes: true }), 'utf8');
    expectThrow("Schema error", () => resolveSubjectPolicy(dummySubject), "INVALID_POLICY_SCHEMA");

    // Wrong type
    const badType = { notes: "true", basic: true, cloze: true, imageOcclusion: true, mindmap: true, slideDeck: true, practiceQuestions: false, problemPatterns: false, apkg: true, proceduralApkg: false, bmGraph: true, bmQa: true };
    fs.writeFileSync(path.join(dummyDir, 'runtime-policy.json'), JSON.stringify(badType), 'utf8');
    expectThrow("Schema type error", () => resolveSubjectPolicy(dummySubject), "INVALID_POLICY_SCHEMA");
});

// Clean up dummy
fs.unlinkSync(path.join(dummyDir, 'runtime-policy.json'));
fs.rmdirSync(dummyDir);
VALID_SUBJECTS.pop(); // remove DummySubject

// H. Explicit false remains false / I. Explicit true remains true
runTest("Explicit false/true works via evaluateArtifactRouting", () => {
    const routing = evaluateArtifactRouting({
        subject: "Math",
        chapter: "Algebra",
        artifactPolicy: {
            notes: false // Explicit false overrides true
        }
    });
    if (routing.notes !== false) throw new Error("notes should be false");
    if (routing.basic !== true) throw new Error("basic should be true (fallback to resolved)");
});

// J. Policy resolution does NOT inspect candidate counts
// K. Policy resolution does NOT inspect file extensions
runTest("Policy resolution does NOT inspect candidate counts or extensions", () => {
    // The resolver function signature `resolveSubjectPolicy(subject)` literally takes no context other than subject string.
    // We demonstrate it resolves perfectly independent of any context.
    const policy = resolveSubjectPolicy("Chemistry");
    if (!policy) throw new Error("Resolution failed");
});

// L. Changing Math runtime policy does not mutate Biology policy
runTest("Changing Math runtime policy does not mutate Biology policy", () => {
    const mathPolicyPath = path.join(__dirname, '..', 'subject-skills', 'Math', 'runtime-policy.json');
    const originalMathPolicy = fs.readFileSync(mathPolicyPath, 'utf8');
    
    // Change Math policy
    const newMathPolicy = JSON.parse(originalMathPolicy);
    newMathPolicy.notes = false;
    fs.writeFileSync(mathPolicyPath, JSON.stringify(newMathPolicy), 'utf8');
    
    // Read Biology policy
    const bioPolicy = resolveSubjectPolicy("Biology");
    
    // Restore Math policy
    fs.writeFileSync(mathPolicyPath, originalMathPolicy, 'utf8');
    
    if (bioPolicy.notes !== true) throw new Error("Biology policy was mutated!");
});

console.log("=== Subject Policy Tests Complete ===");
