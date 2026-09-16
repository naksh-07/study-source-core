/**
 * StudySourceCore Completion Evidence Release Gate Validator (`validate_completion_evidence.js`)
 * 
 * Implements GAP-08: Hard Physical On-Disk Release Gate.
 * Enforces the 4-Point Physical Verification Protocol:
 * 1. Physical existence of `.completion-evidence.json` (no in-memory mock self-reports).
 * 2. Non-zero byte and strict JSON schema validity.
 * 3. Physical on-disk existence and non-zero byte check for every declared artifact.
 * 4. Byte count and cryptographic SHA-256 integrity verification against actual disk files.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function computeFileSha256(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Validates a specific .completion-evidence.json file on disk.
 * 
 * @param {string} evidencePath - Absolute or relative path to .completion-evidence.json
 * @param {Object} [options]
 * @returns {Object} Validation result { isValid, errors, warnings, stats }
 */
function validateCompletionEvidenceFile(evidencePath, options = {}) {
    const errors = [];
    const warnings = [];
    const stats = {
        evidencePath,
        overallVerdict: null,
        totalDeclared: 0,
        verifiedOnDisk: 0,
        skippedCount: 0,
        mismatches: 0
    };

    const resolvedPath = path.resolve(evidencePath);

    // 1. Physical Existence Check
    if (!fs.existsSync(resolvedPath)) {
        errors.push(`[MISSING_COMPLETION_EVIDENCE] Completion evidence file does not exist: '${resolvedPath}'`);
        return { isValid: false, errors, warnings, stats };
    }

    // 2. Non-zero Byte Check
    const stat = fs.statSync(resolvedPath);
    if (stat.size === 0) {
        errors.push(`[ZERO_BYTE_COMPLETION_EVIDENCE] Completion evidence file is 0 bytes: '${resolvedPath}'`);
        return { isValid: false, errors, warnings, stats };
    }

    // 3. JSON Schema & Syntax Verification
    let data;
    try {
        const raw = fs.readFileSync(resolvedPath, 'utf8');
        data = JSON.parse(raw);
    } catch (err) {
        errors.push(`[CORRUPTED_COMPLETION_EVIDENCE] Failed to parse JSON in '${resolvedPath}': ${err.message}`);
        return { isValid: false, errors, warnings, stats };
    }

    if (!data || typeof data !== 'object') {
        errors.push(`[INVALID_COMPLETION_EVIDENCE_SCHEMA] Root must be a JSON object.`);
        return { isValid: false, errors, warnings, stats };
    }

    if (!data.meta || typeof data.meta !== 'object') {
        errors.push(`[INVALID_COMPLETION_EVIDENCE_SCHEMA] Missing required 'meta' object.`);
    } else {
        stats.overallVerdict = data.meta.overall_verdict;
        if (!data.meta.overall_verdict) {
            errors.push(`[INVALID_COMPLETION_EVIDENCE_SCHEMA] 'meta.overall_verdict' is required.`);
        }
        if (typeof data.meta.completed_count !== 'number' && typeof data.meta.artifact_count !== 'number') {
            errors.push(`[INVALID_COMPLETION_EVIDENCE_SCHEMA] 'meta.completed_count' must be a number.`);
        }
        if (!data.meta.verified_timestamp && !data.meta.timestamp) {
            errors.push(`[INVALID_COMPLETION_EVIDENCE_SCHEMA] 'meta.verified_timestamp' is required.`);
        }
    }

    if (!Array.isArray(data.artifacts)) {
        errors.push(`[INVALID_COMPLETION_EVIDENCE_SCHEMA] Missing required 'artifacts' array.`);
        return { isValid: false, errors, warnings, stats };
    }

    stats.totalDeclared = data.artifacts.length;
    const baseDir = options.baseDir || path.dirname(resolvedPath);

    // 4. Physical Disk Assertion for Each Declared Artifact
    data.artifacts.forEach((art, idx) => {
        const artId = art.task_id || art.artifact_id || `artifact_${idx + 1}`;
        const rawTarget = art.target_path;

        if (!rawTarget) {
            errors.push(`[INVALID_COMPLETION_EVIDENCE_SCHEMA] Artifact '${artId}' is missing 'target_path'.`);
            return;
        }

        const isSkipped = art.physical_status === 'SKIPPED' || art.status === 'SKIPPED';
        if (isSkipped) {
            stats.skippedCount++;
            return;
        }

        const resolvedTarget = path.isAbsolute(rawTarget) ? rawTarget : path.resolve(baseDir, rawTarget);

        // a. File must physically exist on disk
        if (!fs.existsSync(resolvedTarget)) {
            errors.push(`[ARTIFACT_MISSING_ON_DISK] Declared artifact '${artId}' does not exist on disk: '${resolvedTarget}'`);
            stats.mismatches++;
            return;
        }

        // b. Non-zero byte verification
        const artStat = fs.statSync(resolvedTarget);
        if (artStat.size === 0) {
            errors.push(`[ZERO_BYTE_ARTIFACT] Declared artifact '${artId}' exists but is 0 bytes on disk: '${resolvedTarget}'`);
            stats.mismatches++;
            return;
        }

        // c. Byte size check (if declared)
        if (typeof art.bytes === 'number' && art.bytes > 0) {
            if (artStat.size !== art.bytes) {
                errors.push(`[BYTE_SIZE_MISMATCH] Declared artifact '${artId}' byte size mismatch: declared ${art.bytes} bytes, actual disk size ${artStat.size} bytes for '${resolvedTarget}'`);
                stats.mismatches++;
            }
        }

        // d. SHA-256 hash check (if declared)
        if (art.sha256) {
            const actualHash = computeFileSha256(resolvedTarget);
            if (actualHash !== art.sha256) {
                errors.push(`[HASH_MISMATCH] Declared artifact '${artId}' SHA-256 mismatch: declared ${art.sha256}, actual disk hash ${actualHash} for '${resolvedTarget}'`);
                stats.mismatches++;
            }
        }

        stats.verifiedOnDisk++;
    });

    const isValid = errors.length === 0;
    return {
        isValid,
        errors,
        warnings,
        stats
    };
}

/**
 * Searches for and validates completion evidence in a chapter directory.
 * 
 * @param {string} chapterDir - Path to chapter directory
 * @param {Object} [options]
 * @returns {Object} Validation result
 */
function validateChapterCompletionEvidence(chapterDir, options = {}) {
    const resolvedDir = path.resolve(chapterDir);
    const candidates = [
        path.join(resolvedDir, '.completion-evidence.json'),
        path.join(resolvedDir, 'completion-evidence.json'),
        path.join(resolvedDir, '.build', '.completion-evidence.json'),
        path.join(resolvedDir, '.build', 'completion-evidence.json')
    ];

    const foundPath = candidates.find(p => fs.existsSync(p));
    if (!foundPath) {
        return {
            isValid: false,
            errors: [`[MISSING_COMPLETION_EVIDENCE] No .completion-evidence.json found in chapter directory: '${resolvedDir}'`],
            warnings: [],
            stats: { chapterDir: resolvedDir, evidenceFound: false }
        };
    }

    return validateCompletionEvidenceFile(foundPath, { baseDir: resolvedDir, ...options });
}

module.exports = {
    validateCompletionEvidenceFile,
    validateChapterCompletionEvidence,
    computeFileSha256
};
