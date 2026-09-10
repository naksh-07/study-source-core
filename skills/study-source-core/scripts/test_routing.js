const { evaluateArtifactRouting } = require('./routing_engine');

function runTest(name, context) {
    try {
        console.log(`=== ${name} ===`);
        const result = evaluateArtifactRouting(context);
        console.log("PASS (Returned result):", JSON.stringify(result, null, 2));
    } catch (e) {
        console.log("FAIL CLOSED (Threw Error):", e.message);
    }
}

// 1. Missing policy
runTest("MISSING POLICY", {
    subject: "Math",
    chapter: "Algebra"
});

// 2. Incomplete policy
runTest("INCOMPLETE POLICY", {
    subject: "Math",
    chapter: "Algebra",
    artifactPolicy: {
        notes: true,
        basic: true,
        // missing cloze etc.
    }
});

// 3. Explicit false
runTest("EXPLICIT FALSE", {
    subject: "Math",
    chapter: "Algebra",
    artifactPolicy: {
        notes: false, basic: false, cloze: false, imageOcclusion: false, mindmap: false, slideDeck: false,
        problemPatterns: false, practiceQuestions: false, proceduralApkg: false, apkg: false, bmGraph: false, bmQa: false
    }
});

// 4. Explicit true + zero evidence
runTest("EXPLICIT TRUE + NO EVIDENCE", {
    subject: "Math",
    chapter: "Algebra",
    artifactPolicy: {
        notes: true, basic: true, cloze: true, imageOcclusion: true, mindmap: true, slideDeck: true,
        problemPatterns: true, practiceQuestions: true, proceduralApkg: true, apkg: true, bmGraph: true, bmQa: true
    },
    basicCandidateCount: 0,
    clozeCandidateCount: 0,
    visualProfile: null,
    proceduralProfile: null,
    solvableQuestionsCount: 0,
    actionablePatternCount: 0
});

// 5. Explicit true + valid evidence
runTest("EXPLICIT TRUE + VALID EVIDENCE", {
    subject: "Math",
    chapter: "Algebra",
    artifactPolicy: {
        notes: true, basic: true, cloze: true, imageOcclusion: true, mindmap: true, slideDeck: true,
        problemPatterns: true, practiceQuestions: true, proceduralApkg: true, apkg: true, bmGraph: true, bmQa: true
    },
    basicCandidateCount: 5,
    clozeCandidateCount: 5,
    visualProfile: { io_worthiness: 'HIGH', io_candidates: [1], deck_worthiness: 'HIGH', dominant_structures: [1] },
    proceduralProfile: { patterns: [1], practiceQuestions: [1] },
    solvableQuestionsCount: 5,
    actionablePatternCount: 5,
    noteWordCount: 500,
    evidenceChars: 1000,
    candidateVaultTargets: ['x']
});
