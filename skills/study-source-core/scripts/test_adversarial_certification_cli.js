/**
 * StudySourceCore Adversarial Certification CLI Test Suite
 * (`test_adversarial_certification_cli.js`)
 * 
 * Verifies that run_adversarial_certification.js functions properly as a standalone CLI tool
 * and as an imported module, upholding fail-closed release gating on errors.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { ensureAllTestFixtures } = require('./ensure_test_fixtures');
const { getVaultRoot } = require('./path_resolver');
const { certifyChapter } = require('./run_adversarial_certification');

const SCRATCH_DIR = path.resolve(__dirname, 'scratch/cert_cli_test');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(testId, description, testFn) {
    totalTests++;
    console.log(`\n[TEST ${testId}] ${description}`);
    try {
        await testFn();
        console.log(`  ✅ PASS`);
        passedTests++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${err.message}`);
        failedTests++;
        throw err;
    }
}

async function main() {
    console.log('================================================================================');
    console.log('  TEST: ADVERSARIAL CERTIFICATION CLI & GATE SUITE');
    console.log('================================================================================');

    if (!fs.existsSync(SCRATCH_DIR)) {
        fs.mkdirSync(SCRATCH_DIR, { recursive: true });
    }

    // Ensure fixtures are created
    await ensureAllTestFixtures();
    const vaultRoot = getVaultRoot(__dirname);
    const mathDir = path.join(vaultRoot, 'Study Materials/Math/LCM-HCF');

    // Create valid .completion-evidence.json for LCM-HCF in mathDir
    const mathDeclApkg = path.join(mathDir, 'LCM-HCF_Anki.apkg');
    const mathProcApkg = path.join(mathDir, 'StudyLab', 'LCM-HCF_StudyLab_Procedural.apkg');
    const mathNotes = path.join(mathDir, 'Notes', 'LCM-HCF_Notes.md');

    const validEvidence = {
        meta: {
            overall_verdict: "SUCCESS",
            completed_count: 3,
            verified_timestamp: new Date().toISOString(),
            schema_version: "1.0.0"
        },
        artifacts: [
            {
                task_id: "task-notes",
                target_path: mathNotes,
                bytes: fs.existsSync(mathNotes) ? fs.statSync(mathNotes).size : 100,
                physical_status: "VERIFIED_ON_DISK"
            },
            {
                task_id: "task-apkg",
                target_path: mathDeclApkg,
                bytes: fs.existsSync(mathDeclApkg) ? fs.statSync(mathDeclApkg).size : 100,
                physical_status: "VERIFIED_ON_DISK"
            },
            {
                task_id: "task-proc-apkg",
                target_path: mathProcApkg,
                bytes: fs.existsSync(mathProcApkg) ? fs.statSync(mathProcApkg).size : 100,
                physical_status: "VERIFIED_ON_DISK"
            }
        ]
    };
    const mathEvidencePath = path.join(mathDir, '.completion-evidence.json');
    if (!fs.existsSync(mathEvidencePath)) {
        fs.writeFileSync(mathEvidencePath, JSON.stringify(validEvidence, null, 2), 'utf8');
    }

    // ----------------------------------------------------
    // TEST 1: Programmatic Certification of Valid Chapter
    // ----------------------------------------------------
    await runTest('CLI-01', 'Programmatic certifyChapter returns PASS on fully validated chapter', async () => {
        const reportPath = path.join(SCRATCH_DIR, 'math_cert_report.json');
        const report = await certifyChapter({
            chapter: 'LCM-HCF',
            subject: 'Math',
            chapterDir: mathDir,
            outputReport: reportPath
        });

        assert.strictEqual(report.release_verdict, 'PASS', `Expected PASS verdict, got ${report.release_verdict}`);
        assert.strictEqual(report.summary.passed_gates, 4, 'All 4 gates must pass');
        assert(fs.existsSync(reportPath), 'Certification report JSON must be written to disk');
    });

    // ----------------------------------------------------
    // TEST 2: CLI Command Line Execution with Exit Code 0
    // ----------------------------------------------------
    await runTest('CLI-02', 'CLI execution passes with exit code 0 on valid chapter', async () => {
        const cliScript = path.resolve(__dirname, 'run_adversarial_certification.js');
        const reportPath = path.join(SCRATCH_DIR, 'cli_math_report.json');

        const cmd = `node "${cliScript}" --chapter "LCM-HCF" --subject "Math" --chapter-dir "${mathDir}" --output-report "${reportPath}"`;
        const output = execSync(cmd, { encoding: 'utf8' });
        assert(output.includes('FINAL CERTIFICATION VERDICT: 🟢 PASS'), 'CLI output must include PASS verdict');
        assert(fs.existsSync(reportPath), 'CLI must write report');
    });

    // ----------------------------------------------------
    // TEST 3: Negative Path: Missing Chapter Fails with Non-Zero Exit
    // ----------------------------------------------------
    await runTest('CLI-03', 'CLI execution fails with non-zero exit code on non-existent chapter', async () => {
        const cliScript = path.resolve(__dirname, 'run_adversarial_certification.js');
        const badDir = path.join(SCRATCH_DIR, 'non_existent_chapter');

        let exitedWithCode1 = false;
        try {
            execSync(`node "${cliScript}" --chapter "Ghost" --subject "Math" --chapter-dir "${badDir}"`, {
                stdio: 'pipe',
                encoding: 'utf8'
            });
        } catch (err) {
            exitedWithCode1 = (err.status === 1);
        }
        assert(exitedWithCode1, 'CLI must exit with code 1 on failed certification');
    });

    // ----------------------------------------------------
    // TEST 4: Negative Path: Gate 1 Blocks on Missing Completion Evidence
    // ----------------------------------------------------
    await runTest('CLI-04', 'Certifier blocks release when .completion-evidence.json is missing', async () => {
        const missingEvidenceDir = path.join(SCRATCH_DIR, 'no_evidence_chapter');
        if (!fs.existsSync(missingEvidenceDir)) fs.mkdirSync(missingEvidenceDir, { recursive: true });

        const report = await certifyChapter({
            chapter: 'NoEvidence',
            subject: 'Math',
            chapterDir: missingEvidenceDir
        });

        assert.strictEqual(report.release_verdict, 'BLOCKED', 'Must block release when completion evidence is missing');
        assert.strictEqual(report.gates.gate_1_completion_evidence.status, 'FAIL', 'Gate 1 must fail');
    });

    console.log('\n================================================================================');
    console.log(`  CERTIFICATION CLI SCORECARD: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
    console.log('  Overall Verdict: 🟢 ALL CLI CERTIFICATION INVARIANTS UPHELD');
    console.log('================================================================================\n');
}

if (require.main === module) {
    main().catch(err => {
        console.error("Fatal CLI test failure:", err);
        process.exit(1);
    });
}

module.exports = { main };
