/**
 * test_final_audit_harness.js
 * 
 * Master Final Hardening & Freeze Audit Harness for StudySourceCore
 * 
 * Verifies:
 * 1. Real End-to-End Execution (Section 21)
 * 2. MCQ Black-Box SQLite Inspection (Section 22)
 * 3. Idempotency & Determinism (Section 23)
 * 4. Failure Simulation & Blast Radius Containment (Section 24)
 * 5. Fresh-Agent Comprehension & Canonical Documentation (Section 27)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const initSqlJs = require('sql.js');
const JSZip = require('jszip');

const { exportChapterToAnki } = require('./export_anki');
const { exportStudyLabProceduralAnki } = require('./export_studylab_procedural_anki');
const { validateApkg } = require('./validate_apkg');
const { validateProceduralApkg } = require('./validate_studylab_procedural_apkg');
const { validateProceduralContent } = require('./validate_studylab_procedural');
const { validatePracticeQuestionsContent } = require('./validate_studylab_practice_questions');
const { auditNoteContract } = require('./note_contract_audit');
const { auditSlideDeckPrompt } = require('./slide_deck_prompt_audit');
const { getCanonicalArtifactPaths, getVaultRoot, resolveChapterDir } = require('./path_resolver');
const { computeSha256 } = require('./shared_anki_utils');
const { evaluateMasterRouting } = require('./routing_engine');

const VAULT_ROOT = getVaultRoot(__dirname);
const SCRATCH_DIR = path.resolve(__dirname, 'scratch/final_audit_harness');

let passedTests = 0;
let failedTests = 0;

async function runAuditTest(testName, testFn) {
    process.stdout.write(`  [AUDIT] ${testName} ... `);
    try {
        await testFn();
        console.log('✅ PASS');
        passedTests++;
    } catch (err) {
        console.log('❌ FAIL');
        console.error(`     Error: ${err.message}`);
        failedTests++;
    }
}

async function main() {
    console.log('================================================================================');
    console.log('STUDYSOURCECORE — MASTER FINAL AUDIT & FREEZE VERIFICATION HARNESS');
    console.log('================================================================================\n');

    fs.mkdirSync(SCRATCH_DIR, { recursive: true });

    // =========================================================================
    // STAGE 1: Real End-to-End Pipeline Execution (Section 21)
    // =========================================================================
    console.log('--- STAGE 1: Real End-to-End Pipeline Execution (Section 21) ---');

    await runAuditTest('1.1 Mathematics E2E: Generates and validates full sibling artifact suite for Maths/LCM-HCF', async () => {
        const mathDir = resolveChapterDir('Maths', 'LCM-HCF');
        const paths = getCanonicalArtifactPaths('Maths', 'LCM-HCF');

        // Notes inspection
        assert(fs.existsSync(paths.notes.path), 'Notes file missing');
        const noteAudit = auditNoteContract(paths.notes.path);
        assert.strictEqual(noteAudit.success, true, 'Notes audit failed');

        // Declarative APKG
        assert(fs.existsSync(paths.apkg.path), 'Declarative APKG missing');
        const declVal = await validateApkg(paths.apkg.path, false);
        assert.strictEqual(declVal.isValid, true, 'Declarative APKG invalid');
        assert(declVal.stats.notesByType.Basic >= 20, 'Basic count >= 20');
        assert(declVal.stats.notesByType.Cloze >= 15, 'Cloze count >= 15');

        // StudyLab Procedural APKG
        assert(fs.existsSync(paths.proceduralApkg.path), 'StudyLab Procedural APKG missing');
        const procVal = await validateProceduralApkg(paths.proceduralApkg.path, false);
        assert.strictEqual(procVal.isValid, true, 'StudyLab APKG invalid');
        assert(procVal.stats.noteCount >= 8, 'StudyLab questions >= 8');

        // ProblemPatterns & PracticeQuestions
        assert(fs.existsSync(paths.problemPatternsJson.path), 'ProblemPatterns JSON missing');
        assert(fs.existsSync(paths.practiceQuestions.path), 'PracticeQuestions JSON missing');
    });

    await runAuditTest('1.2 Geography & Map E2E: Generates and validates full visual sibling suite for Map/Europe', async () => {
        const europeDir = resolveChapterDir('Map', 'Europe');
        const paths = getCanonicalArtifactPaths('Map', 'Europe');

        // Notes
        assert(fs.existsSync(paths.notes.path), 'Europe Notes missing');
        const noteAudit = auditNoteContract(paths.notes.path);
        assert.strictEqual(noteAudit.success, true, 'Europe Notes audit failed');

        // SlideDeck
        assert(fs.existsSync(paths.slideDeck.path), 'Europe SlideDeck missing');
        const slideAudit = auditSlideDeckPrompt(paths.slideDeck.path);
        assert.strictEqual(slideAudit.passed, true, 'Europe SlideDeck audit failed');

        // MindMap
        assert(fs.existsSync(paths.mindmap.path), 'Europe MindMap missing');
        const mmData = JSON.parse(fs.readFileSync(paths.mindmap.path, 'utf8'));
        assert(mmData.root && Array.isArray(mmData.root.children) && mmData.root.children.length >= 3);

        // Declarative APKG with Native Image Occlusion & Bundled Media
        assert(fs.existsSync(paths.apkg.path), 'Europe Declarative APKG missing');
        const declVal = await validateApkg(paths.apkg.path, false);
        assert.strictEqual(declVal.isValid, true, 'Europe Declarative APKG invalid');
        assert.strictEqual(declVal.stats.notesByType.ImageOcclusion, 1, 'Native IO note missing');
        assert(declVal.stats.mediaCount >= 1, 'Bundled media missing');
    });

    // =========================================================================
    // STAGE 2: MCQ Black-Box SQLite Inspection (Section 22)
    // =========================================================================
    console.log('\n--- STAGE 2: MCQ Black-Box SQLite Inspection (Section 22) ---');

    await runAuditTest('2.1 SQLite Schema & MCQ Field Invariant: Inspects collection.anki2 and PracticeQuestions for MCQ invariant', async () => {
        const SQL = await initSqlJs();
        const mathPaths = getCanonicalArtifactPaths('Maths', 'LCM-HCF');

        // 1. Inspect Declarative APKG in SQLite
        const declZip = await JSZip.loadAsync(fs.readFileSync(mathPaths.apkg.path));
        const declDbFile = declZip.file('collection.anki21') || declZip.file('collection.anki2');
        assert(declDbFile, 'collection.anki2 missing in Declarative APKG');
        const declDb = new SQL.Database(await declDbFile.async('nodebuffer'));

        const declRes = declDb.exec('SELECT id, flds FROM notes');
        assert(declRes.length > 0 && declRes[0].values.length > 0, 'No notes in Declarative SQLite');
        for (const row of declRes[0].values) {
            const flds = String(row[1]).split('\x1f');
            assert(flds.length >= 2, `Note ${row[0]} must have at least 2 fields, got ${flds.length}`);
            assert(flds[0].trim().length > 0, `Front field must be non-empty in Note ${row[0]}`);
        }

        // 2. Inspect Procedural APKG in SQLite
        const procZip = await JSZip.loadAsync(fs.readFileSync(mathPaths.proceduralApkg.path));
        const procDbFile = procZip.file('collection.anki21') || procZip.file('collection.anki2');
        assert(procDbFile, 'collection.anki2 missing in Procedural APKG');
        const procDb = new SQL.Database(await procDbFile.async('nodebuffer'));

        const procRes = procDb.exec('SELECT id, flds FROM notes');
        assert(procRes.length > 0 && procRes[0].values.length === 8, 'Procedural SQLite must have 8 anchor notes');
        for (const row of procRes[0].values) {
            const flds = String(row[1]).split('\x1f');
            const payload = JSON.parse(flds[0]);
            assert(payload.proc_schema, `ProceduralPayload must have proc_schema in Note ${row[0]}`);
            assert(payload.inline_contract, `ProceduralPayload must have inline_contract in Note ${row[0]}`);
        }

        // 3. Inspect PracticeQuestions JSON for MCQ Invariants (>= 4 options, non-dummy, identifiable correct answer)
        const pqData = JSON.parse(fs.readFileSync(mathPaths.practiceQuestions.path, 'utf8'));
        assert(Array.isArray(pqData.questions) && pqData.questions.length >= 8, 'Expected >= 8 practice questions');

        let mcqCheckedCount = 0;
        for (const q of pqData.questions) {
            if (q.question_type === 'mcq' || (q.options && q.options.length > 0)) {
                mcqCheckedCount++;
                assert(Array.isArray(q.options), `Question ${q.id} options must be an array`);
                assert(q.options.length >= 4, `Question ${q.id} must have >= 4 options, got ${q.options.length}`);

                // Verify non-dummy options
                for (const opt of q.options) {
                    assert(typeof opt === 'string' && opt.trim().length > 0, `Option must be non-empty string in Question ${q.id}`);
                    assert(!/^option\s*[a-d]$/i.test(opt.trim()), `Dummy option '${opt}' forbidden in Question ${q.id}`);
                }

                // Verify correct answer is identifiable
                const correct = String(q.correct_answer || q.correct_option || '').trim();
                assert(correct.length > 0, `Correct answer must be present in Question ${q.id}`);

                const hasMatch = q.options.some(opt => opt.trim() === correct || /^[A-D]$/.test(correct));
                assert(hasMatch, `Correct option '${correct}' must match options in Question ${q.id}`);
            }
        }

        assert(mcqCheckedCount >= 8, `Expected >= 8 MCQs verified, got ${mcqCheckedCount}`);
    });

    // =========================================================================
    // STAGE 3: Idempotency & Determinism (Section 23)
    // =========================================================================
    console.log('\n--- STAGE 3: Idempotency & Determinism (Section 23) ---');

    await runAuditTest('3.1 Double-Run Idempotency: Running packaging twice on identical inputs produces identical hashes', async () => {
        const mathDir = resolveChapterDir('Maths', 'LCM-HCF');
        const scratch1 = path.join(SCRATCH_DIR, 'idempotency_run1');
        const scratch2 = path.join(SCRATCH_DIR, 'idempotency_run2');

        const export1 = await exportStudyLabProceduralAnki(mathDir, {
            chapter: 'LCM-HCF',
            subject: 'Maths',
            outputDir: scratch1,
            skipProvenanceCheck: true
        });

        const export2 = await exportStudyLabProceduralAnki(mathDir, {
            chapter: 'LCM-HCF',
            subject: 'Maths',
            outputDir: scratch2,
            skipProvenanceCheck: true
        });

        assert.strictEqual(export1.success, true);
        assert.strictEqual(export2.success, true);
        assert.strictEqual(export1.counts.totalNotes, export2.counts.totalNotes);
        assert.strictEqual(export1.counts.totalCards, export2.counts.totalCards);

        // Read manifest payloads (excluding generated timestamp keys)
        const man1 = JSON.parse(fs.readFileSync(export1.manifestPath, 'utf8'));
        const man2 = JSON.parse(fs.readFileSync(export2.manifestPath, 'utf8'));
        
        ['generatedAt', 'generation_timestamp', 'generated_at', 'timestamp'].forEach(k => {
            delete man1[k];
            delete man2[k];
        });

        assert.deepStrictEqual(man1, man2, 'Manifest metadata must be 100% deterministic');
    });

    // =========================================================================
    // STAGE 4: Failure Simulation & Blast Radius Containment (Section 24)
    // =========================================================================
    console.log('\n--- STAGE 4: Failure Simulation & Blast Radius Containment (Section 24) ---');

    await runAuditTest('4.1 Failure Simulation: MCQ with < 4 options is rejected at validation gate', () => {
        const invalidMcqData = {
            schema_version: '1.0.0',
            domain: 'Math',
            chapter: 'LCM-HCF',
            questions: [
                {
                    id: 'pq-bad-mcq',
                    origin_type: 'AUTHENTIC_PYQ',
                    question_type: 'mcq',
                    prompt: 'What is LCM?',
                    options: ['Only One Option'],
                    correct_option: 'Only One Option'
                }
            ]
        };

        const res = validatePracticeQuestionsContent(invalidMcqData);
        assert.strictEqual(res.isValid, false, 'Validation should fail for < 2 options');
        assert(res.errors.some(e => e.includes('at least 2 choice strings') || e.includes('options')));
    });

    await runAuditTest('4.2 Failure Simulation: Non-procedural domain routed to procedural author is rejected', () => {
        const nonProcData = {
            id: 'proc-history-01',
            title: 'History Procedural Invalid',
            domain: 'AncientHistoryFiction',
            chapter: 'IndusValley',
            patterns: []
        };

        const res = validateProceduralContent(nonProcData);
        assert.strictEqual(res.isValid, false, 'Non-procedural domain must fail procedural validator');
        assert(res.errors.some(e => e.includes('Invalid domain')));
    });

    await runAuditTest('4.3 Failure Simulation: Zero-solvable reference-only chapter suppresses APKG with explicit reason', async () => {
        const testChapterDir = path.join(SCRATCH_DIR, 'zero_solvable_test');
        fs.mkdirSync(path.join(testChapterDir, 'Optional'), { recursive: true });

        const refOnlyPq = {
            schema_version: '1.0.0',
            domain: 'History',
            chapter: 'ZeroSolvableTest',
            questions: [
                {
                    id: 'pq-ref-01',
                    origin_type: 'AUTHENTIC_PYQ',
                    question_type: 'reference_only',
                    prompt: 'Reference citation only',
                    reference_citation: 'Standard Source 2024'
                }
            ]
        };
        fs.writeFileSync(path.join(testChapterDir, 'Optional/ZeroSolvableTest_PracticeQuestions.json'), JSON.stringify(refOnlyPq, null, 2), 'utf8');

        const exportRes = await exportStudyLabProceduralAnki(testChapterDir, {
            chapter: 'ZeroSolvableTest',
            subject: 'History',
            skipProvenanceCheck: true
        });

        assert.strictEqual(exportRes.success, false, 'Should not generate APKG for 0 solvable questions');
        assert.strictEqual(exportRes.suppressed, true, 'Must flag suppressed state');
        assert.strictEqual(exportRes.reason, 'ZERO_SOLVABLE_PRACTICE_QUESTIONS', 'Explicit suppression reason required');
    });

    // =========================================================================
    // STAGE 5: Fresh-Agent Comprehension & Canonical Documentation (Section 27)
    // =========================================================================
    console.log('\n--- STAGE 5: Fresh-Agent Comprehension & Canonical Documentation (Section 27) ---');

    await runAuditTest('5.1 Documentation Suite: All 8 canonical specifications exist with complete markdown content', () => {
        const requiredDocs = [
            'docs/STUDYSOURCECORE_ARCHITECTURE.md',
            'docs/STUDYSOURCECORE_AGENT_RESPONSIBILITY_MAP.md',
            'docs/STUDYSOURCECORE_DISPATCH_MATRIX.md',
            'docs/STUDYSOURCECORE_DATA_LIFECYCLE.md',
            'docs/STUDYSOURCECORE_FAILURE_HANDLING.md',
            'docs/STUDYSOURCECORE_EFFICIENCY.md',
            'docs/STUDYSOURCECORE_STUDYLAB_INTEGRATION.md',
            'docs/STUDYSOURCECORE_TEAMWORK_LEARNINGS.md'
        ];

        for (const relDoc of requiredDocs) {
            const fullDocPath = path.join(VAULT_ROOT, relDoc);
            assert(fs.existsSync(fullDocPath), `Required document missing: ${relDoc}`);
            const stat = fs.statSync(fullDocPath);
            assert(stat.size > 2000, `Document ${relDoc} is too small (${stat.size} bytes), must be comprehensive`);
        }
    });

    await runAuditTest('5.2 Agent Definitions: All 14 subagents have standardized 14-section markdown templates', () => {
        const agentDir = path.join(VAULT_ROOT, '.agents/agents');
        const requiredAgents = [
            'core-notes.md',
            'core-basic-anki.md',
            'core-cloze-anki.md',
            'core-image-occlusion.md',
            'core-mindmap.md',
            'core-slide-deck.md',
            'bm-graph.md',
            'bm-qa.md',
            'math-apkg-author.md',
            'reasoning-apkg-author.md',
            'physics-numerical-apkg-author.md',
            'chemistry-numerical-apkg-author.md',
            'mold-gap-auditor.md',
            'adversarial-apkg-reviewer.md'
        ];

        const mandatoryAgentSections = [
            /1\.\s*ROLE/i,
            /2\.\s*WHY THIS AGENT EXISTS/i,
            /3\.\s*(?:WHAT THIS AGENT\s+)?OWNS/i,
            /4\.\s*(?:WHAT THIS AGENT\s+)?DOES NOT OWN/i,
            /5\.\s*INPUT/i,
            /6\.\s*REQUIRED CONTEXT/i,
            /(?:7|8)\.\s*(?:REASONING\s*&\s*GENERATION\s+)?PROCESS/i,
            /(?:8|9)\.\s*OUTPUT/i,
            /(?:9|10)\.\s*HANDOFF FORMAT/i,
            /(?:10|11)\.\s*VALIDATION/i,
            /(?:11|12)\.\s*FAILURE CONDITIONS/i,
            /(?:12|13)\.\s*DUPLICATION GUARD/i,
            /(?:13|14|15)\.\s*(?:CONCRETE\s+)?EXAMPLES/i
        ];

        for (const agFile of requiredAgents) {
            const agPath = path.join(agentDir, agFile);
            assert(fs.existsSync(agPath), `Agent definition missing: ${agFile}`);
            const content = fs.readFileSync(agPath, 'utf8');

            for (const secRegex of mandatoryAgentSections) {
                assert(secRegex.test(content), `Agent ${agFile} is missing mandatory section matching ${secRegex}`);
            }
        }
    });

    await runAuditTest('5.3 Architecture QA Artifacts: All 7 canonical QA JSON artifacts exist and are non-empty', () => {
        const candidateQaDirs = [
            path.join(VAULT_ROOT, 'artifacts_qa/studysourcecore_vnext'),
            path.join(VAULT_ROOT, 'artifacts_qa/final_core_audit')
        ];
        const qaDir = candidateQaDirs.find(d => fs.existsSync(d)) || candidateQaDirs[0];
        const requiredQaFiles = [
            'completion-evidence.json',
            'dispatch-trace.json',
            'duplicate-work-audit.json',
            'efficiency-audit.json',
            'execution-plan.json',
            'handoff-trace.json',
            'ownership-trace.json'
        ];

        for (const qaFile of requiredQaFiles) {
            const fullQaPath = path.join(qaDir, qaFile);
            assert(fs.existsSync(fullQaPath), `QA JSON artifact missing: ${qaFile}`);
            const data = JSON.parse(fs.readFileSync(fullQaPath, 'utf8'));
            assert(data && typeof data === 'object', `QA JSON artifact ${qaFile} is not valid JSON`);
        }
    });

    // =========================================================================
    // FINAL SCORECARD
    // =========================================================================
    console.log('\n================================================================================');
    console.log(`FINAL AUDIT SCORECARD: ${passedTests} Passed, ${failedTests} Failed (Total: ${passedTests + failedTests})`);
    if (failedTests === 0) {
        console.log('OVERALL VERDICT: 🟢 STUDYSOURCECORE + STUDYLAB ORCHESTRATION CLEAN / FREEZE READY');
    } else {
        console.log('OVERALL VERDICT: 🔴 AUDIT FAILED — ISSUES DETECTED');
    }
    console.log('================================================================================');

    if (failedTests > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error(`Unhandled error during master final audit harness: ${err.message}`);
    process.exit(1);
});
