/**
 * study-source-core Artifact Provenance & State Engine (`artifact_provenance.js`)
 * 
 * Manages deterministic artifact provenance, lineage verification, validation states,
 * and eligibility-aware cleanup.
 * 
 * Manifest Location:
 *   Study Materials/[Subject]/[Chapter]/.build/artifact-manifest.json
 *   (with backwards-compatible fallback to Study Materials/[Subject]/[Chapter]/artifact-manifest.json)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getArtifactRegistry } = require('./artifact_registry');

/**
 * Computes SHA-256 digest of buffer, string, or file path.
 */
function computeSha256(input) {
    if (!input) return '';
    let buffer;
    if (Buffer.isBuffer(input)) {
        buffer = input;
    } else if (typeof input === 'string') {
        if (fs.existsSync(input) && fs.statSync(input).isFile()) {
            buffer = fs.readFileSync(input);
        } else {
            buffer = Buffer.from(input, 'utf-8');
        }
    } else {
        buffer = Buffer.from(JSON.stringify(input), 'utf-8');
    }
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Returns canonical path to artifact-manifest.json in chapter directory.
 * Checks for .build/ directory first, then falls back to root chapter folder.
 */
function getManifestPath(chapterDir) {
    const resolvedDir = path.resolve(chapterDir);
    const buildPath = path.join(resolvedDir, '.build', 'artifact-manifest.json');
    if (fs.existsSync(buildPath)) {
        return buildPath;
    }
    return path.join(resolvedDir, 'artifact-manifest.json');
}

/**
 * Loads artifact-manifest.json if present.
 */
function loadManifest(chapterDir) {
    const manifestPath = getManifestPath(chapterDir);
    if (fs.existsSync(manifestPath)) {
        try {
            return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        } catch (err) {
            console.warn(`[Provenance] Failed to parse manifest at ${manifestPath}: ${err.message}`);
            return null;
        }
    }
    return null;
}

/**
 * Saves artifact-manifest.json.
 */
function saveManifest(chapterDir, manifest, options = {}) {
    const resolvedDir = path.resolve(chapterDir);
    if (!fs.existsSync(resolvedDir)) {
        fs.mkdirSync(resolvedDir, { recursive: true });
    }
    
    let manifestPath;
    const buildDir = path.join(resolvedDir, '.build');
    if (options.useBuildDir || fs.existsSync(path.join(buildDir, 'artifact-manifest.json'))) {
        if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
        manifestPath = path.join(buildDir, 'artifact-manifest.json');
    } else {
        manifestPath = getManifestPath(resolvedDir);
    }

    manifest.updatedAt = new Date().toISOString();
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    return manifestPath;
}

/**
 * Initializes or updates chapter manifest for a generation run.
 */
function initManifest(chapterDir, options = {}) {
    const existing = loadManifest(chapterDir) || {};
    const manifest = {
        chapter: options.chapter || existing.chapter || path.basename(chapterDir),
        subject: options.subject || existing.subject || path.basename(path.dirname(chapterDir)),
        evidenceHash: options.evidenceHash || existing.evidenceHash || null,
        generationRunId: options.generationRunId || existing.generationRunId || `run_${Date.now()}`,
        updatedAt: new Date().toISOString(),
        artifacts: existing.artifacts || {},
        suppressions: options.suppressions || existing.suppressions || {}
    };
    saveManifest(chapterDir, manifest, options);
    return manifest;
}

/**
 * Records or updates an artifact in the chapter manifest with its content hash and validation result.
 */
function recordArtifact(chapterDir, {
    artifactType,
    filePath,
    evidenceHash,
    status = 'VALIDATED',
    lastValidationResult = 'PASS',
    generationRunId = null
}) {
    const resolvedChapterDir = path.resolve(chapterDir);
    let manifest = loadManifest(resolvedChapterDir);
    if (!manifest) {
        manifest = initManifest(resolvedChapterDir, {
            evidenceHash,
            generationRunId: generationRunId || `run_${Date.now()}`
        });
    }

    if (evidenceHash && (!manifest.evidenceHash || manifest.evidenceHash !== evidenceHash)) {
        manifest.evidenceHash = evidenceHash;
    }

    const resolvedFile = path.resolve(filePath);
    let artifactHash = '';
    if (fs.existsSync(resolvedFile) && fs.statSync(resolvedFile).isFile()) {
        artifactHash = computeSha256(resolvedFile);
    }

    const relPath = path.relative(resolvedChapterDir, resolvedFile).replace(/\\/g, '/');

    manifest.artifacts[artifactType] = {
        artifactType,
        path: relPath,
        artifactHash,
        evidenceHash: evidenceHash || manifest.evidenceHash,
        generationRunId: generationRunId || manifest.generationRunId,
        status,
        lastValidationResult,
        generatedAt: new Date().toISOString()
    };

    saveManifest(resolvedChapterDir, manifest);
    return manifest.artifacts[artifactType];
}

/**
 * Verifies that all participating artifacts in the chapter directory:
 * 1. Share the exact same Evidence Pack hash (no mixed versions)
 * 2. Passed physical validation (lastValidationResult === 'PASS')
 * 3. Match their recorded on-disk content hash
 */
function verifyArtifactLineage(chapterDir, options = {}) {
    const resolvedChapterDir = path.resolve(chapterDir);
    const manifest = loadManifest(resolvedChapterDir);

    const errors = [];
    const warnings = [];

    if (!manifest) {
        throw new Error(`Missing artifact-manifest.json in ${resolvedChapterDir}. Untrusted artifact state. Validation failed closed.`);
    }

    const targetEvidenceHash = manifest.evidenceHash;
    if (!targetEvidenceHash) {
        errors.push("Manifest missing master evidenceHash. Cannot verify lineage.");
    }

    const artifacts = manifest.artifacts || {};
    const participatingTypes = options.participatingTypes || ['basic', 'cloze'];
    if (options.includeImageOcclusion && artifacts.imageOcclusion) {
        participatingTypes.push('imageOcclusion');
    }

    const activeArtifacts = {};

    for (const type of participatingTypes) {
        const entry = artifacts[type];
        if (!entry) {
            // Optional artifact might simply not exist
            if (type === 'imageOcclusion') continue;
            // Basic/Cloze are required for flashcard exports if declared
            continue;
        }

        const rel = entry.path || entry.filePath || '';
        let absFilePath = path.join(resolvedChapterDir, rel);
        if (!fs.existsSync(absFilePath)) {
            // Check fallback in internal .build/source-artifacts/
            const buildArchivedPath = path.join(resolvedChapterDir, '.build', 'source-artifacts', rel);
            if (fs.existsSync(buildArchivedPath)) {
                absFilePath = buildArchivedPath;
            } else {
                errors.push(`Declared artifact '${type}' file not found at ${absFilePath}.`);
                continue;
            }
        }

        // 1. Evidence Lineage check
        if (entry.evidenceHash !== targetEvidenceHash) {
            errors.push(`Stale artifact detected: '${type}' was generated from evidence '${entry.evidenceHash}', but current manifest evidence is '${targetEvidenceHash}'.`);
        }

        // 2. Validation Gate check
        if (entry.lastValidationResult !== 'PASS') {
            errors.push(`Artifact '${type}' has not passed validation (lastValidationResult: '${entry.lastValidationResult}', status: '${entry.status}').`);
        }

        // 3. Content Hash check
        const currentHash = computeSha256(absFilePath);
        if (entry.artifactHash && currentHash !== entry.artifactHash) {
            errors.push(`Artifact '${type}' content hash mismatch. Expected ${entry.artifactHash}, on disk is ${currentHash}.`);
        }

        activeArtifacts[type] = entry;
    }

    return {
        isValid: errors.length === 0,
        isManifested: true,
        errors,
        warnings,
        evidenceHash: targetEvidenceHash,
        activeArtifacts
    };
}

/**
 * Safely cleans up stale optional artifacts when routing explicitly suppresses them.
 * 
 * Rules:
 * - Only cleans within chapter directory
 * - Only cleans the suppressed artifact type directory/file
 * - Updates manifest to record suppression decisions and remove suppressed entries
 */
function cleanSuppressedArtifacts(chapterDir, routing = {}) {
    const resolvedChapterDir = path.resolve(chapterDir);
    if (!fs.existsSync(resolvedChapterDir)) return;

    const manifest = loadManifest(resolvedChapterDir);
    let manifestModified = false;

    if (routing.suppressions && manifest) {
        manifest.suppressions = Object.assign(manifest.suppressions || {}, routing.suppressions);
        manifestModified = true;
    }

    // Registry-driven suppression cleanup: iterate all registered artifacts
    const registry = getArtifactRegistry();
    const chapterName = manifest ? manifest.chapter : path.basename(resolvedChapterDir);

    for (const [trackKey, def] of Object.entries(registry)) {
        const isSuppressed = routing[trackKey] === false || routing[trackKey] === 'SUPPRESS' || routing[trackKey] === 'NONE';
        if (!isSuppressed) continue;

        if (def.output_dir) {
            // Directory-based artifact (e.g., Basic/, Cloze/, MindMap/, etc.)
            const artifactDir = path.join(resolvedChapterDir, def.output_dir);
            if (fs.existsSync(artifactDir)) {
                fs.rmSync(artifactDir, { recursive: true, force: true });
                console.log(`[STALE-CLEANUP] ${trackKey} suppressed this run. Removed stale prior-run artifact.`);
                if (manifest && manifest.artifacts && manifest.artifacts[trackKey]) {
                    delete manifest.artifacts[trackKey];
                    manifestModified = true;
                }
            }
        } else {
            // File-based artifact at chapter root (e.g., {chapter}_Anki.apkg)
            const fileName = def.file_pattern.replace('{chapter}', chapterName);
            const filePath = path.join(resolvedChapterDir, fileName);
            if (fs.existsSync(filePath)) {
                fs.rmSync(filePath, { force: true });
                console.log(`[STALE-CLEANUP] ${trackKey} suppressed this run. Removed stale prior-run package.`);
                if (manifest && manifest.artifacts && manifest.artifacts[trackKey]) {
                    delete manifest.artifacts[trackKey];
                    manifestModified = true;
                }
            }
        }
    }

    if (manifest && manifestModified) {
        saveManifest(resolvedChapterDir, manifest);
    }
}

/**
 * Safely archives intermediate source packaging files into internal .build/source-artifacts/
 */
function archivePackagingIntermediates(chapterDir, options = {}) {
    const resolvedChapterDir = path.resolve(chapterDir);
    const buildSourceDir = path.join(resolvedChapterDir, '.build', 'source-artifacts');
    const archived = [];

    const registry = getArtifactRegistry();
    const apkgDef = registry['apkg'];
    const apkgDeps = apkgDef ? new Set(apkgDef.dependencies) : new Set();
    const dirsToArchive = Object.values(registry)
        .filter(def => apkgDeps.has(def.task_id) && def.output_dir)
        .map(def => def.output_dir);
    for (const d of dirsToArchive) {
        const srcDir = path.join(resolvedChapterDir, d);
        if (fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory()) {
            const destDir = path.join(buildSourceDir, d);
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
            
            const files = fs.readdirSync(srcDir, { withFileTypes: true });
            for (const file of files) {
                if (file.isFile()) {
                    const srcFile = path.join(srcDir, file.name);
                    const destFile = path.join(destDir, file.name);
                    fs.copyFileSync(srcFile, destFile);
                    archived.push(destFile);
                } else if (file.isDirectory() && d === 'ImageOcclusion' && file.name === 'media') {
                    // Copy media dir
                    const srcMedia = path.join(srcDir, 'media');
                    const destMedia = path.join(destDir, 'media');
                    if (!fs.existsSync(destMedia)) fs.mkdirSync(destMedia, { recursive: true });
                    const mFiles = fs.readdirSync(srcMedia);
                    for (const mf of mFiles) {
                        fs.copyFileSync(path.join(srcMedia, mf), path.join(destMedia, mf));
                        archived.push(path.join(destMedia, mf));
                    }
                }
            }
        }
    }
    return archived;
}

/**
 * Cleans packaging intermediates from user-facing directory ONLY after successful APKG validation.
 * 
 * Rules:
 * - Before deleting, verifies that APKG exists and is non-empty
 * - Preserves provenance in .build/artifact-manifest.json
 * - Preserves source files in .build/source-artifacts/ for deterministic re-export
 * - Never deletes deliverables (Notes, .apkg, StudyLab, Optional, MindMap, SlideDeck)
 * - If APKG is missing or invalid, ABORTS deletion completely to protect recovery inputs
 */
function cleanPackagingIntermediates(chapterDir, options = {}) {
    const resolvedChapterDir = path.resolve(chapterDir);
    const manifest = loadManifest(resolvedChapterDir);
    const chapterName = options.chapter || (manifest ? manifest.chapter : path.basename(resolvedChapterDir));
    const apkgPath = options.apkgPath || path.join(resolvedChapterDir, `${chapterName}_Anki.apkg`);

    // 1. Strict Verification Gate: APKG must physically exist and be non-empty
    if (!fs.existsSync(apkgPath) || fs.statSync(apkgPath).size === 0) {
        return {
            success: false,
            cleaned: false,
            reason: 'APKG_NOT_VERIFIED: Package does not exist or is 0 bytes. Preserving recovery inputs.'
        };
    }

    // 2. Archive to internal .build/source-artifacts/ if requested (default true)
    let archived = [];
    if (options.archive !== false) {
        archived = archivePackagingIntermediates(resolvedChapterDir, options);
    }

    // 3. Remove intermediate directories from user-facing chapter root
    const removed = [];
    const registry = getArtifactRegistry();
    const apkgDef = registry['apkg'];
    const apkgDeps = apkgDef ? new Set(apkgDef.dependencies) : new Set();
    const ioDef = registry['imageOcclusion'];
    const dirsToRemove = Object.values(registry)
        .filter(def => apkgDeps.has(def.task_id) && def.output_dir)
        .filter(def => options.includeImageOcclusion !== false || def.task_id !== (ioDef ? ioDef.task_id : ''))
        .map(def => def.output_dir);

    for (const d of dirsToRemove) {
        const targetPath = path.join(resolvedChapterDir, d);
        if (fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { recursive: true, force: true });
            removed.push(targetPath);
        }
    }

    // 4. Update manifest with packaging status
    if (manifest) {
        manifest.packaging = Object.assign(manifest.packaging || {}, {
            intermediatesCleaned: true,
            archivedLocation: '.build/source-artifacts',
            cleanedAt: new Date().toISOString()
        });
        saveManifest(resolvedChapterDir, manifest, { useBuildDir: true });
    }

    return {
        success: true,
        cleaned: true,
        removed,
        archived,
        apkgPath
    };
}

module.exports = {
    computeSha256,
    getManifestPath,
    loadManifest,
    saveManifest,
    initManifest,
    recordArtifact,
    verifyArtifactLineage,
    cleanSuppressedArtifacts,
    archivePackagingIntermediates,
    cleanPackagingIntermediates
};
