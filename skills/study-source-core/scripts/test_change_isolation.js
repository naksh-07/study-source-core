const assert = require('assert');
const { evaluateArtifactRouting } = require('../scripts/routing_engine.js');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
    try {
        fn();
        console.log(`  ✅ PASS: ${name}`);
        testsPassed++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}`);
        testsFailed++;
    }
}

const defaultPolicy = { notes: true, basic: true, cloze: true, imageOcclusion: true, mindmap: true, slideDeck: true, problemPatterns: true, practiceQuestions: true, proceduralApkg: true, apkg: true, bmGraph: true, bmQa: true };

function runAllTests() {
    console.log('====================================================');
    console.log('Running study-source-core Change Isolation Test Suite');
    console.log('====================================================\n');

    runTest('Scenario 1: Change Math Policy → Other Subjects Unaffected', () => {
        const mathRouting = evaluateArtifactRouting({
            subject: 'Mathematics',
            chapter: 'Test',
            basicCandidateCount: 5,
            clozeCandidateCount: 5,
            visualProfile: { dominant_structures: ['test'] },
            artifactPolicy: { ...defaultPolicy, cloze: false }
        });

        const bioRouting = evaluateArtifactRouting({
            subject: 'Biology',
            chapter: 'Test',
            basicCandidateCount: 5,
            clozeCandidateCount: 5,
            visualProfile: { dominant_structures: ['test'] },
            artifactPolicy: { ...defaultPolicy }
        });

        assert.strictEqual(mathRouting.basic, true, 'Math basic should be true');
        assert.strictEqual(mathRouting.cloze, false, 'Math cloze should be false');
        assert.strictEqual(bioRouting.basic, true, 'Biology basic should remain true (baseline)');
        assert.strictEqual(bioRouting.cloze, true, 'Biology cloze should remain true (baseline)');
    });

    runTest('Scenario 2: Change Biology Policy → Math StudyLab Untouched', () => {
        const bioRouting = evaluateArtifactRouting({
            subject: 'Biology',
            chapter: 'Test',
            basicCandidateCount: 5,
            clozeCandidateCount: 5,
            visualProfile: { dominant_structures: ['test'] },
            artifactPolicy: { ...defaultPolicy, basic: false }
        });

        const mathRouting = evaluateArtifactRouting({
            subject: 'Mathematics',
            chapter: 'Test',
            basicCandidateCount: 5,
            clozeCandidateCount: 5,
            visualProfile: { dominant_structures: ['test'] },
            practiceQuestionsCount: 1, solvableQuestionsCount: 1,
            artifactPolicy: { ...defaultPolicy }
        });

        assert.strictEqual(bioRouting.basic, false, 'Biology basic should be false');
        assert.strictEqual(mathRouting.proceduralApkg, true, 'Math StudyLab proceduralApkg should be true');
        assert.strictEqual(mathRouting.practiceQuestions, true, 'Math StudyLab practiceQuestions should be true');
    });

    runTest('Scenario 3: Math StudyLab Changes → Generic Agents Untouched', () => {
        const historyRouting = evaluateArtifactRouting({
            subject: 'History',
            chapter: 'Test',
            basicCandidateCount: 5,
            clozeCandidateCount: 5,
            visualProfile: { dominant_structures: ['test'] },
            artifactPolicy: { ...defaultPolicy }
        });

        assert.strictEqual(historyRouting.notes, true, 'History notes should be true');
        assert.strictEqual(historyRouting.basic, true, 'History basic should be true');
        assert.strictEqual(historyRouting.cloze, true, 'History cloze should be true');
    });

    runTest('Scenario 4: Generic Notes Change → StudyLab Untouched', () => {
        const mathRouting = evaluateArtifactRouting({
            subject: 'Mathematics',
            chapter: 'Test',
            basicCandidateCount: 5,
            clozeCandidateCount: 5,
            visualProfile: { dominant_structures: ['test'] },
            practiceQuestionsCount: 1, solvableQuestionsCount: 1,
            artifactPolicy: { ...defaultPolicy, notes: false }
        });

        assert.strictEqual(mathRouting.notes, false, 'Math notes should be false');
        assert.strictEqual(mathRouting.proceduralApkg, true, 'Math StudyLab proceduralApkg should remain true');
    });

    runTest('Scenario 5: Single Subject Artifact Policy → Only That Subject Affected', () => {
        const geoRouting = evaluateArtifactRouting({
            subject: 'Geography',
            chapter: 'Test',
            basicCandidateCount: 5,
            clozeCandidateCount: 5,
            visualProfile: { dominant_structures: ['test'] },
            artifactPolicy: { ...defaultPolicy, mindmap: true }
        });

        const polSciRouting = evaluateArtifactRouting({
            subject: 'Political Science',
            chapter: 'Test',
            basicCandidateCount: 5,
            clozeCandidateCount: 5,
            visualProfile: { dominant_structures: ['test'] },
            artifactPolicy: { ...defaultPolicy }
        });

        assert.strictEqual(geoRouting.mindmap, true, 'Geography mindmap should be true');
        assert.strictEqual(polSciRouting.basic, true, 'PolSci basic should retain default (true)');
    });

    runTest('Scenario 6: Disable Artifact for One Subject → Others Retain', () => {
        const historyRouting = evaluateArtifactRouting({
            subject: 'History',
            chapter: 'Test',
            basicCandidateCount: 5,
            clozeCandidateCount: 5,
            visualProfile: { dominant_structures: ['test'] },
            artifactPolicy: { ...defaultPolicy, basic: false }
        });

        const bioRouting = evaluateArtifactRouting({
            subject: 'Biology',
            chapter: 'Test',
            basicCandidateCount: 5,
            clozeCandidateCount: 5,
            visualProfile: { dominant_structures: ['test'] },
            artifactPolicy: { ...defaultPolicy }
        });

        assert.strictEqual(historyRouting.basic, false, 'History basic should be false');
        assert.strictEqual(bioRouting.basic, true, 'Biology basic should remain true');
    });

    runTest('Scenario 7: StudyLab Dispatch → Strictly Follows Policy', () => {
        const bioRouting = evaluateArtifactRouting({
            subject: 'Biology',
            chapter: 'Test',
            basicCandidateCount: 5,
            clozeCandidateCount: 5,
            visualProfile: { dominant_structures: ['test'] },
            practiceQuestionsCount: 1, solvableQuestionsCount: 1,
            artifactPolicy: { ...defaultPolicy, problemPatterns: false, practiceQuestions: false, proceduralApkg: false }
        });

        const mathRouting = evaluateArtifactRouting({
            subject: 'Mathematics',
            chapter: 'Test',
            basicCandidateCount: 5,
            clozeCandidateCount: 5,
            visualProfile: { dominant_structures: ['test'] },
            practiceQuestionsCount: 1, solvableQuestionsCount: 1,
            artifactPolicy: { ...defaultPolicy, problemPatterns: true, practiceQuestions: true, proceduralApkg: true }
        });

        assert.strictEqual(bioRouting.proceduralApkg, false, 'Biology proceduralApkg should be false per policy');
        assert.strictEqual(bioRouting.suppressions.proceduralApkg, 'SUPPRESSED_BY_SUBJECT_POLICY', 'Biology should cite policy suppression');
        assert.strictEqual(mathRouting.proceduralApkg, true, 'Mathematics proceduralApkg should be true per policy');
    });

    runTest('Additional: Eligibility-vs-Activation Tests', () => {
        const case1 = evaluateArtifactRouting({
            subject: 'History',
            chapter: 'Test',
            basicCandidateCount: 0,
            artifactPolicy: { ...defaultPolicy, basic: true }
        });
        assert.strictEqual(case1.basic, false, 'Candidate-count suppression: basic should be false when count is 0');
        assert.strictEqual(case1.suppressions.basic, 'ZERO_BASIC_CANDIDATES', 'Should report ZERO_BASIC_CANDIDATES suppression');

        const case2 = evaluateArtifactRouting({
            subject: 'History',
            chapter: 'Test',
            basicCandidateCount: 5,
            artifactPolicy: { ...defaultPolicy, basic: true }
        });
        assert.strictEqual(case2.basic, true, 'basic=true + count=5 → basic=true');

        const case3 = evaluateArtifactRouting({
            subject: 'History',
            chapter: 'Test',
            basicCandidateCount: 5,
            artifactPolicy: { ...defaultPolicy, basic: false }
        });
        assert.strictEqual(case3.basic, false, 'basic=false + count=5 → basic=false');

        const case4 = evaluateArtifactRouting({
            subject: 'History',
            chapter: 'Test',
            clozeCandidateCount: 0,
            artifactPolicy: { ...defaultPolicy, cloze: true }
        });
        assert.strictEqual(case4.cloze, false, 'Candidate-count suppression: cloze should be false when count is 0');
        assert.strictEqual(case4.suppressions.cloze, 'ZERO_CLOZE_CANDIDATES', 'Should report ZERO_CLOZE_CANDIDATES suppression');
    });

    console.log(`\n====================================================`);
    console.log(`Test Suite Results: ${testsPassed} Passed, ${testsFailed} Failed (Total: ${testsPassed + testsFailed})`);
    console.log(`====================================================\n`);

    if (testsFailed > 0) process.exit(1);
    else process.exit(0);
}

runAllTests();
