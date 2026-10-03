const assert = require('assert');
const { evaluateArtifactRouting } = require('./routing_engine');

let passCount = 0;
function runAssertion(name, fn) {
    try {
        fn();
        passCount++;
        console.log(`✅ PASS: ${name}`);
    } catch (e) {
        console.error(`❌ FAIL: ${name} - ${e.message}`);
        throw e;
    }
}

// 1. Fail-closed on missing required context
runAssertion("Missing Subject throws Error", () => {
    assert.throws(() => {
        evaluateArtifactRouting({ chapter: "Algebra" });
    }, /MISSING_REQUIRED_CONTEXT: subject must be provided/);
});

runAssertion("Missing Chapter throws Error", () => {
    assert.throws(() => {
        evaluateArtifactRouting({ subject: "Math" });
    }, /MISSING_REQUIRED_CONTEXT: chapter must be provided/);
});

// 2. Missing policy resolves canonical subject policy
runAssertion("Missing Policy defaults to canonical subject policy", () => {
    const result = evaluateArtifactRouting({
        subject: "Math",
        chapter: "Algebra"
    });
    assert.strictEqual(result.notes, true);
    assert.strictEqual(result.basic, true);
    assert.strictEqual(result.cloze, true);
    assert.strictEqual(result.mindmap, true);
    assert.strictEqual(result.slideDeck, true);
    assert.strictEqual(result.imageOcclusion, false);
    assert.strictEqual(result.suppressions.imageOcclusion, 'NO_IO_CANDIDATES');
    assert.strictEqual(result.proceduralQuestionBank, true);
});

// 3. Incomplete policy
runAssertion("Incomplete Policy falls back deterministically", () => {
    const result = evaluateArtifactRouting({
        subject: "Math",
        chapter: "Algebra",
        artifactPolicy: {
            notes: true,
            basic: true
        }
    });
    assert.strictEqual(result.notes, true);
    assert.strictEqual(result.basic, true);
    assert.strictEqual(result.procedural_mode, 'markdown');
});

// 4. Explicit false suppresses all designated artifacts
runAssertion("Explicit False suppresses artifacts", () => {
    const result = evaluateArtifactRouting({
        subject: "Math",
        chapter: "Algebra",
        artifactPolicy: {
            notes: false, basic: false, cloze: false, imageOcclusion: false, mindmap: false, slideDeck: false,
            problemPatterns: false, practiceQuestions: false, proceduralApkg: false, apkg: false, bmGraph: false, bmQa: false
        }
    });
    assert.strictEqual(result.notes, false);
    assert.strictEqual(result.basic, false);
    assert.strictEqual(result.cloze, false);
    assert.strictEqual(result.imageOcclusion, false);
    assert.strictEqual(result.mindmap, false);
    assert.strictEqual(result.slideDeck, false);
    assert.strictEqual(result.practiceQuestions, false);
    assert.strictEqual(result.problemPatterns, false);
    assert.strictEqual(result.apkg, false);
    assert.strictEqual(result.bmGraph, false);
    assert.strictEqual(result.bmQa, false);
    assert.strictEqual(result.suppressions.notes, 'SUPPRESSED_BY_SUBJECT_POLICY');
    assert.strictEqual(result.suppressions.basic, 'SUPPRESSED_BY_SUBJECT_POLICY');
});

// 5. Explicit true + zero evidence triggers candidate gates
runAssertion("Explicit True + No Evidence triggers candidate gates", () => {
    const result = evaluateArtifactRouting({
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
    assert.strictEqual(result.basic, false);
    assert.strictEqual(result.cloze, false);
    assert.strictEqual(result.imageOcclusion, false);
    assert.strictEqual(result.apkg, false);
    assert.strictEqual(result.bmGraph, false);
    assert.strictEqual(result.bmQa, false);
    assert.strictEqual(result.suppressions.basic, 'ZERO_BASIC_CANDIDATES');
    assert.strictEqual(result.suppressions.cloze, 'ZERO_CLOZE_CANDIDATES');
    assert.strictEqual(result.suppressions.imageOcclusion, 'NO_IO_CANDIDATES');
    assert.strictEqual(result.suppressions.apkg, 'NO_DECLARATIVE_CARDS_AVAILABLE');
});

// 6. Explicit true + valid evidence enables all artifacts
runAssertion("Explicit True + Valid Evidence passes all gates", () => {
    const result = evaluateArtifactRouting({
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
    assert.strictEqual(result.notes, true);
    assert.strictEqual(result.basic, true);
    assert.strictEqual(result.cloze, true);
    assert.strictEqual(result.imageOcclusion, true);
    assert.strictEqual(result.mindmap, true);
    assert.strictEqual(result.slideDeck, true);
    assert.strictEqual(result.apkg, true);
    assert.strictEqual(result.bmGraph, true);
    assert.strictEqual(result.bmQa, true);
});

console.log(`\n🎉 All ${passCount} routing test assertions passed successfully!`);
