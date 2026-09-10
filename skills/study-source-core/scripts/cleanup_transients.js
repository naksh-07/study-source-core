#!/usr/bin/env node
/**
 * study-source-core Automated Transient Cleanup Engine (`cleanup_transients.js`)
 * 
 * Safely cleans up run-specific temporary artifacts across workspace scratch directories
 * and chapter working trees while strictly preserving:
 *  - Source materials (`Sources/**`)
 *  - Canonical deliverables (`Notes/`, `*.apkg`, `StudyLab/`, `Optional/`, `MindMap/`, `SlideDeck/`)
 *  - Permanent test fixtures (`scratch/fixtures/**`)
 *  - Provenance manifests (`.build/artifact-manifest.json` / `artifact-manifest.json`)
 *  - Execution state on failed/incomplete runs (for deterministic resumption)
 */

const fs = require('fs');
const path = require('path');
const { getVaultRoot } = require('./path_resolver');
const { getArtifactRegistry } = require('./artifact_registry');

// Build protected directory set from artifact registry (single source of truth)
let PROTECTED_DIRS;
try {
    const _reg = getArtifactRegistry();
    PROTECTED_DIRS = new Set(
        Object.values(_reg).map(d => d.output_dir).filter(Boolean)
    );
    PROTECTED_DIRS.add('Sources');
} catch (e) {
    // Fallback to known safe set if registry unavailable
    PROTECTED_DIRS = new Set(['Sources', 'Notes', 'StudyLab', 'Optional', 'Basic', 'Cloze', 'ImageOcclusion', 'MindMap', 'SlideDeck', 'Graph', 'Audit']);
}

// Transient file patterns
const TRANSIENT_FILE_PATTERNS = [
    /^evidence-pack.*\.md$/i,
    /^chunk-.*\.md$/i,
    /^rejected-.*\.json$/i,
    /^.*\.tmp$/i,
    /^temp-.*$/i
];

/**
 * Checks if a filename matches transient patterns.
 */
function isTransientFilename(filename, isSuccess = true) {
    if (filename === 'execution-state.json') {
        return isSuccess === true; // Only transient on successful completion
    }
    return TRANSIENT_FILE_PATTERNS.some(pat => pat.test(filename));
}

/**
 * Safely cleans transient files from the target directory and its scratch subdirectories.
 * 
 * @param {Object} [options]
 * @param {string} [options.targetDir] - Root directory to clean (defaults to vault root)
 * @param {boolean} [options.isSuccess=true] - Whether the run succeeded (if false, preserves execution-state.json)
 * @param {boolean} [options.preserveExecutionState=false] - Explicitly preserve execution-state.json
 * @param {boolean} [options.dryRun=false] - Simulate cleanup without deleting files
 * @param {boolean} [options.verbose=false] - Log detailed operations
 * @returns {Object} Cleanup summary
 */
function cleanTransients(options = {}) {
    const vaultRoot = getVaultRoot(__dirname);
    const targetDir = path.resolve(options.targetDir || options.scratchDir || vaultRoot);
    const isFailed = options.isFailedOrIncomplete === true || options.failed === true || options.isSuccess === false || options.preserveExecutionState === true;
    const isSuccess = !isFailed;
    const dryRun = options.dryRun === true;
    const verbose = options.verbose === true;

    const summary = {
        success: true,
        targetDir,
        isSuccess,
        deletedFiles: [],
        preservedFiles: [],
        errors: []
    };

    // Locate scratch directories to clean
    const candidateDirs = [];

    // Explicit scratch directory passed in options
    if (options.scratchDir) {
        const customScratch = path.resolve(options.scratchDir);
        if (fs.existsSync(customScratch) && !candidateDirs.includes(customScratch)) {
            candidateDirs.push(customScratch);
        }
    }

    // 1. Vault root scratch
    const rootScratch = path.join(targetDir, 'scratch');
    if (fs.existsSync(rootScratch) && fs.statSync(rootScratch).isDirectory() && !candidateDirs.includes(rootScratch)) {
        candidateDirs.push(rootScratch);
    }

    // 2. Skill-local scratch
    const skillScratch = path.join(__dirname, 'scratch');
    if (fs.existsSync(skillScratch) && fs.statSync(skillScratch).isDirectory() && !candidateDirs.includes(skillScratch)) {
        candidateDirs.push(skillScratch);
    }

    // 3. Target dir itself if it is a scratch directory
    if ((targetDir.endsWith('scratch') || targetDir.includes('scratch')) && fs.existsSync(targetDir) && !candidateDirs.includes(targetDir)) {
        candidateDirs.push(targetDir);
    }

    // Process each candidate directory
    for (const sDir of candidateDirs) {
        try {
            cleanDirectoryTransients(sDir, isSuccess, dryRun, verbose, summary);
        } catch (err) {
            summary.errors.push(`Error cleaning ${sDir}: ${err.message}`);
        }
    }

    // Also scan for loose *.tmp files in targetDir root
    try {
        const rootEntries = fs.readdirSync(targetDir, { withFileTypes: true });
        for (const entry of rootEntries) {
            if (entry.isFile() && entry.name.endsWith('.tmp')) {
                const absFile = path.join(targetDir, entry.name);
                if (!dryRun) {
                    fs.unlinkSync(absFile);
                }
                summary.deletedFiles.push(absFile);
            }
        }
    } catch (err) {
        summary.errors.push(`Error scanning root for .tmp: ${err.message}`);
    }

    summary.removed = summary.deletedFiles;
    summary.preserved = summary.preservedFiles;

    return summary;
}

/**
 * Recursively scans and cleans transient files in a directory while honoring protection rules.
 */
function cleanDirectoryTransients(dirPath, isSuccess, dryRun, verbose, summary) {
    if (!fs.existsSync(dirPath)) return;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        // Protected Directories - NEVER touch
        if (entry.isDirectory()) {
            // Protect permanent test fixtures
            if (entry.name === 'fixtures' || fullPath.includes(path.join('scratch', 'fixtures'))) {
                summary.preservedFiles.push(fullPath);
                continue;
            }
            // Protect Sources and Study Materials deliverables (registry-driven)
            if (PROTECTED_DIRS.has(entry.name)) {
                summary.preservedFiles.push(fullPath);
                continue;
            }

            // Recurse into subdirectories
            cleanDirectoryTransients(fullPath, isSuccess, dryRun, verbose, summary);

            // Remove empty scratch subdirectories (except permanent test dirs)
            try {
                const remaining = fs.readdirSync(fullPath);
                if (remaining.length === 0 && !fullPath.includes('fixtures')) {
                    if (!dryRun) {
                        fs.rmdirSync(fullPath);
                    }
                }
            } catch (e) {}
            continue;
        }

        // Protected Files - NEVER touch
        if (entry.name === 'artifact-manifest.json') {
            summary.preservedFiles.push(fullPath);
            continue;
        }

        // Check if execution-state.json should be preserved
        if (entry.name === 'execution-state.json' && !isSuccess) {
            summary.preservedFiles.push(fullPath);
            if (verbose) {
                console.log(`[Transient Cleanup] Preserving execution-state.json on incomplete/failed run: ${fullPath}`);
            }
            continue;
        }

        // Check if file is transient
        if (isTransientFilename(entry.name, isSuccess)) {
            if (!dryRun) {
                fs.unlinkSync(fullPath);
            }
            summary.deletedFiles.push(fullPath);
            if (verbose) {
                console.log(`[Transient Cleanup] Removed: ${fullPath}`);
            }
        }
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const isFailed = args.includes('--failed') || args.includes('--incomplete');
    const dryRun = args.includes('--dry-run');
    const targetDir = args.find(a => !a.startsWith('--')) || null;

    console.log(`\n====================================================`);
    console.log(`study-source-core Automated Transient Cleanup`);
    console.log(`Status Mode: ${isFailed ? 'FAILED/INCOMPLETE (Preserving Resume State)' : 'SUCCESSFUL'}`);
    if (dryRun) console.log(`Mode: DRY RUN (No files will be deleted)`);
    console.log(`====================================================\n`);

    const result = cleanTransients({
        targetDir,
        isSuccess: !isFailed,
        dryRun,
        verbose: true
    });

    console.log(`\nDeleted Transients: ${result.deletedFiles.length}`);
    result.deletedFiles.forEach(f => console.log(`  🗑️  ${f}`));
    console.log(`Preserved Items: ${result.preservedFiles.length}`);
    if (result.errors.length > 0) {
        console.log(`Errors: ${result.errors.length}`);
        result.errors.forEach(e => console.log(`  ❌ ${e}`));
    }
    console.log(`\nCleanup Complete.\n`);
}

module.exports = {
    cleanTransients,
    isTransientFilename
};
