/**
 * StudySourceCore Completion Evidence Release Gate Test Suite (`test_completion_evidence_gate.js`)
 * 
 * Verifies GAP-08 physical release gate behavior:
 * - Positive path: Valid evidence + matching disk files -> PASS
 * - Negative paths: Missing file, zero-byte file, corrupted JSON, missing artifact on disk,
 *                   byte size mismatch, SHA-256 mismatch -> All FAIL CLOSED.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
    validateCompletionEvidenceFile,
    validateChapterCompletionEvidence,
    computeFileSha256
} = require('./validate_completion_evidence');

const SCRATCH_DIR = path.resolve(__dirname, 'scratch/completion_evidence_test');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(testId, description, testFn) {
    totalTests++;
    console.log(`\n[TEST ${testId}] ${description}`);
    try {
        testFn();
        console.log(`  ✅ PASS`);
        passedTests++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${err.message}`);
        failedTests++;
        throw err;
    }
}

function setupScratchFiles() {
    if (fs.existsSync(SCRATCH_DIR)) {
        fs.rmSync(SCRATCH_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });

    // Create real dummy artifact on disk
    const artPath = path.join(SCRATCH_DIR, 'test_artifact.md');
    const artContent = '# Test Knowledge Notes\nContent for testing physical verification.\n';
    fs.writeFileSync(artPath, artContent, 'utf8');

    const artBytes = Buffer.byteLength(artContent, 'utf8');
    const artSha = crypto.createHash('sha256').update(artContent).digest('hex');

    return { artPath, artContent, artBytes, artSha };
}

function main() {
    console.log('================================================================================');
    console.log('  GAP-08: COMPLETION EVIDENCE HARD RELEASE GATE AUDIT');
    console.log('================================================================================');

    const fixture = setupScratchFiles();

    // ----------------------------------------------------
    // TEST 1: Valid completion evidence passes
    // ----------------------------------------------------
    runTest('EVI-01', 'Valid completion evidence file passes physical disk verification', () => {
        const validDoc = {
            meta: {
                overall_verdict: "SUCCESS",
                completed_count: 1,
                skipped_count: 0,
                failed_count: 0,
                verified_timestamp: new Date().toISOString(),
                schema_version: "1.0.0"
            },
            artifacts: [
                {
                    task_id: "task-notes",
                    target_path: fixture.artPath,
                    bytes: fixture.artBytes,
                    sha256: fixture.artSha,
                    physical_status: "VERIFIED_ON_DISK",
                    errors: []
                }
            ]
        };

        const eviPath = path.join(SCRATCH_DIR, '.completion-evidence.json');
        fs.writeFileSync(eviPath, JSON.stringify(validDoc, null, 2), 'utf8');

        const res = validateCompletionEvidenceFile(eviPath);
        assert.strictEqual(res.isValid, true, `Expected valid result, got: ${res.errors.join('; ')}`);
        assert.strictEqual(res.stats.verifiedOnDisk, 1);
        assert.strictEqual(res.stats.mismatches, 0);
    });

    // ----------------------------------------------------
    // TEST 2: Missing completion evidence file fails closed
    // ----------------------------------------------------
    runTest('EVI-02', 'Missing completion evidence file fails closed', () => {
        const missingPath = path.join(SCRATCH_DIR, 'non_existent_evidence.json');
        const res = validateCompletionEvidenceFile(missingPath);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('[MISSING_COMPLETION_EVIDENCE]')));
    });

    // ----------------------------------------------------
    // TEST 3: Zero-byte completion evidence file fails closed
    // ----------------------------------------------------
    runTest('EVI-03', 'Zero-byte completion evidence file fails closed', () => {
        const zeroPath = path.join(SCRATCH_DIR, 'zero_byte.json');
        fs.writeFileSync(zeroPath, '', 'utf8');
        const res = validateCompletionEvidenceFile(zeroPath);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('[ZERO_BYTE_COMPLETION_EVIDENCE]')));
    });

    // ----------------------------------------------------
    // TEST 4: Corrupted JSON completion evidence fails closed
    // ----------------------------------------------------
    runTest('EVI-04', 'Corrupted JSON completion evidence fails closed', () => {
        const corruptPath = path.join(SCRATCH_DIR, 'corrupt.json');
        fs.writeFileSync(corruptPath, '{"meta": { INVALID JSON', 'utf8');
        const res = validateCompletionEvidenceFile(corruptPath);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('[CORRUPTED_COMPLETION_EVIDENCE]')));
    });

    // ----------------------------------------------------
    // TEST 5: Missing meta schema fields fails closed
    // ----------------------------------------------------
    runTest('EVI-05', 'Missing required schema fields in completion evidence fails closed', () => {
        const invalidSchemaPath = path.join(SCRATCH_DIR, 'invalid_schema.json');
        fs.writeFileSync(invalidSchemaPath, JSON.stringify({ meta: {}, artifacts: [] }), 'utf8');
        const res = validateCompletionEvidenceFile(invalidSchemaPath);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('[INVALID_COMPLETION_EVIDENCE_SCHEMA]')));
    });

    // ----------------------------------------------------
    // TEST 6: Declared artifact missing on disk fails closed
    // ----------------------------------------------------
    runTest('EVI-06', 'Declared artifact missing on disk fails closed', () => {
        const ghostDoc = {
            meta: {
                overall_verdict: "SUCCESS",
                completed_count: 1,
                verified_timestamp: new Date().toISOString()
            },
            artifacts: [
                {
                    task_id: "task-ghost",
                    target_path: path.join(SCRATCH_DIR, "ghost_file.tsv"),
                    bytes: 100,
                    sha256: "deadbeef"
                }
            ]
        };
        const eviPath = path.join(SCRATCH_DIR, 'ghost_evidence.json');
        fs.writeFileSync(eviPath, JSON.stringify(ghostDoc, null, 2), 'utf8');
        const res = validateCompletionEvidenceFile(eviPath);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('[ARTIFACT_MISSING_ON_DISK]')));
    });

    // ----------------------------------------------------
    // TEST 7: Byte count mismatch fails closed
    // ----------------------------------------------------
    runTest('EVI-07', 'Declared artifact byte size mismatch fails closed', () => {
        const sizeMismatchDoc = {
            meta: {
                overall_verdict: "SUCCESS",
                completed_count: 1,
                verified_timestamp: new Date().toISOString()
            },
            artifacts: [
                {
                    task_id: "task-notes",
                    target_path: fixture.artPath,
                    bytes: fixture.artBytes + 999, // Intentional mismatch
                    sha256: fixture.artSha
                }
            ]
        };
        const eviPath = path.join(SCRATCH_DIR, 'size_mismatch_evidence.json');
        fs.writeFileSync(eviPath, JSON.stringify(sizeMismatchDoc, null, 2), 'utf8');
        const res = validateCompletionEvidenceFile(eviPath);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('[BYTE_SIZE_MISMATCH]')));
    });

    // ----------------------------------------------------
    // TEST 8: SHA-256 hash mismatch fails closed
    // ----------------------------------------------------
    runTest('EVI-08', 'Declared artifact SHA-256 hash mismatch fails closed', () => {
        const hashMismatchDoc = {
            meta: {
                overall_verdict: "SUCCESS",
                completed_count: 1,
                verified_timestamp: new Date().toISOString()
            },
            artifacts: [
                {
                    task_id: "task-notes",
                    target_path: fixture.artPath,
                    bytes: fixture.artBytes,
                    sha256: "0000000000000000000000000000000000000000000000000000000000000000" // Tampered
                }
            ]
        };
        const eviPath = path.join(SCRATCH_DIR, 'hash_mismatch_evidence.json');
        fs.writeFileSync(eviPath, JSON.stringify(hashMismatchDoc, null, 2), 'utf8');
        const res = validateCompletionEvidenceFile(eviPath);
        assert.strictEqual(res.isValid, false);
        assert(res.errors.some(e => e.includes('[HASH_MISMATCH]')));
    });

    // ----------------------------------------------------
    // TEST 9: validateChapterCompletionEvidence discovers and validates
    // ----------------------------------------------------
    runTest('EVI-09', 'validateChapterCompletionEvidence automatically resolves chapter directory file', () => {
        const res = validateChapterCompletionEvidence(SCRATCH_DIR);
        assert.strictEqual(res.isValid, true);
        assert.strictEqual(res.stats.verifiedOnDisk, 1);
    });

    console.log('\n================================================================================');
    console.log(`  COMPLETION EVIDENCE SCORECARD: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
    console.log('  Overall Verdict: 🟢 ALL COMPLETION EVIDENCE INVARIANTS UPHELD');
    console.log('================================================================================\n');
}

if (require.main === module) {
    main();
}

module.exports = { main };
