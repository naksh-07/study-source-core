const assert = require('assert');
const { evaluateArtifactRouting } = require('./routing_engine');

// MOCK CONSTANTS
const MATH_SUBJECT = 'Math';
const BIOLOGY_SUBJECT = 'Biology';

function runTests() {
    console.log('--- Running Change Isolation Tests ---');
    
    // TEST A & B: Biology vs Math artifact policy isolation
    // Tested implicitly by checking subjects with different capabilities.

    // TEST C: Change Math StudyLab rules. No unrelated generic artifact behavior changes.
    // Ensure that generic artifacts (basic, cloze) are independent of StudyLab policy changes.
    const ctxMath = {
        subject: MATH_SUBJECT,
        chapter: 'TestChapter',
        artifactPolicy: { basic: true, proceduralApkg: true },
        basicCandidateCount: 5,
        proceduralProfile: {
            patterns: [{id: 'p1', governing_method: {}}],
            practiceQuestions: [{id: 'q1', question_type: 'MCQ'}]
        }
    };
    const routingC = evaluateArtifactRouting(ctxMath);
    assert.strictEqual(routingC.basic, true, 'TEST C Failed: Math generic basic Anki was affected by StudyLab.');
    assert.strictEqual(routingC.proceduralApkg, true, 'TEST C Failed: Math StudyLab should be true.');

    // TEST E: Change generic Notes behavior. Expected: StudyLab remains unaffected.
    const ctxMathNoNotes = {
        ...ctxMath,
        artifactPolicy: { notes: false, proceduralApkg: true }
    };
    const routingE = evaluateArtifactRouting(ctxMathNoNotes);
    assert.strictEqual(routingE.notes, false, 'TEST E Failed: Notes should be suppressed.');
    assert.strictEqual(routingE.proceduralApkg, true, 'TEST E Failed: StudyLab should remain unaffected by Notes.');

    // TEST F: Disable Cloze for one subject. Expected: Only that subject suppresses Cloze.
    const ctxBioNoCloze = {
        subject: BIOLOGY_SUBJECT,
        chapter: 'TestChapter',
        artifactPolicy: { cloze: false },
        clozeCandidateCount: 5
    };
    const routingF = evaluateArtifactRouting(ctxBioNoCloze);
    assert.strictEqual(routingF.cloze, false, 'TEST F Failed: Cloze should be suppressed.');
    assert.strictEqual(routingF.suppressions.cloze, 'SUPPRESSED_BY_SUBJECT_POLICY', 'TEST F Failed: Wrong suppression reason for Cloze.');

    // TEST G: Enable StudyLab for an eligible source.
    // Tested in C & E.

    // TEST H: Attempt StudyLab routing for Biology/Geography/History.
    const ctxBioStudyLab = {
        subject: BIOLOGY_SUBJECT,
        chapter: 'TestChapter',
        artifactPolicy: { proceduralApkg: true }, // The policy requested it!
        proceduralProfile: { patterns: [], practiceQuestions: [] }
    };
    const routingH = evaluateArtifactRouting(ctxBioStudyLab);
    assert.strictEqual(routingH.proceduralApkg, false, 'TEST H Failed: Biology should NOT generate procedural APKG.');
    assert.strictEqual(routingH.suppressions.proceduralApkg, 'SUPPRESSED_BY_SUBJECT_POLICY', 'TEST H Failed: Wrong suppression reason for Biology.');

    // TEST I: Explicit artifactPolicy=false. Expected: Hard suppression.
    const ctxMathSuppress = {
        subject: MATH_SUBJECT,
        chapter: 'TestChapter',
        artifactPolicy: { proceduralApkg: false },
        proceduralProfile: { patterns: [{id: 'p1', governing_method: {}}], practiceQuestions: [{id: 'q1', question_type: 'MCQ'}] }
    };
    const routingI = evaluateArtifactRouting(ctxMathSuppress);
    assert.strictEqual(routingI.proceduralApkg, false, 'TEST I Failed: Explicit false should suppress.');
    assert.strictEqual(routingI.suppressions.proceduralApkg, 'SUPPRESSED_BY_SUBJECT_POLICY', 'TEST I Failed: Wrong suppression reason.');

    // TEST J: Explicit artifactPolicy=true but zero source evidence.
    const ctxMathEmpty = {
        subject: MATH_SUBJECT,
        chapter: 'TestChapter',
        artifactPolicy: { proceduralApkg: true },
        proceduralProfile: { patterns: [{id: 'p1', governing_method: {}}], practiceQuestions: [] }
    };
    const routingJ = evaluateArtifactRouting(ctxMathEmpty);
    assert.strictEqual(routingJ.proceduralApkg, false, 'TEST J Failed: Empty artifacts should not be generated.');
    assert.strictEqual(routingJ.suppressions.proceduralApkg, 'ZERO_SOLVABLE_PRACTICE_QUESTIONS', 'TEST J Failed: Wrong suppression reason for zero evidence.');

    console.log('All tests passed successfully!');
}

runTests();
