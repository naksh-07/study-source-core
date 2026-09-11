/**
 * study-source-core Asset Discovery Engine
 * 
 * Chapter-scoped asset discovery from the approved local Diagram Drop Folder.
 * Scans Sources/Diagrams/{Subject}/ for approved visual assets, matches to
 * visual needs, generates integrity hashes, and produces structured manifests.
 * 
 * HARD INVARIANT: NEVER falls back to web search, AI generation, or external sources.
 * If no approved asset exists, returns NO_APPROVED_ASSET.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp', '.bmp', '.gif']);

/**
 * Generic domain terms that appear across many subjects and chapters.
 * A match on these terms alone is insufficient to bind an asset to a chapter.
 */
const GENERIC_CHAPTER_TERMS = new Set([
    'system',
    'theory',
    'structure',
    'structures',
    'types',
    'principles',
    'fundamentals',
    'basics',
    'introduction',
    'overview',
    'elements',
    'properties',
    'functions',
    'applications',
    'general',
    'methods',
    'processes',
    'diagram',
    'diagrams',
    'chart',
    'charts',
    'figure',
    'figures',
    'model',
    'models',
    'analysis',
    'notes'
]);

/**
 * Calculates SHA-256 hash of a file.
 */
function hashFile(filePath) {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Gets MIME type from file extension.
 */
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.png': return 'image/png';
        case '.jpg': case '.jpeg': return 'image/jpeg';
        case '.svg': return 'image/svg+xml';
        case '.webp': return 'image/webp';
        case '.bmp': return 'image/bmp';
        case '.gif': return 'image/gif';
        default: return 'application/octet-stream';
    }
}

/**
 * Extracts basic image dimensions from common formats.
 */
function getImageDimensions(filePath) {
    try {
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();

        if (ext === '.png' && buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
            return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
        }
        if ((ext === '.jpg' || ext === '.jpeg') && buffer.length > 2) {
            let offset = 2;
            while (offset < buffer.length) {
                if (buffer[offset] !== 0xFF) break;
                const marker = buffer[offset + 1];
                if (marker === 0xC0 || marker === 0xC2) {
                    return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
                }
                const length = buffer.readUInt16BE(offset + 2);
                offset += 2 + length;
            }
        }
        if (ext === '.svg') {
            const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 4096));
            const vbMatch = text.match(/viewBox=["']\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
            if (vbMatch) return { width: Math.round(parseFloat(vbMatch[1])), height: Math.round(parseFloat(vbMatch[2])) };
            const wMatch = text.match(/width=["'](\d+)/i);
            const hMatch = text.match(/height=["'](\d+)/i);
            if (wMatch && hMatch) return { width: parseInt(wMatch[1], 10), height: parseInt(hMatch[1], 10) };
        }
    } catch (e) {}
    return { width: 0, height: 0 };
}

/**
 * Scans a directory for image files (non-recursive single level).
 */
function scanForImages(dirPath) {
    if (!fs.existsSync(dirPath)) return [];
    try {
        return fs.readdirSync(dirPath)
            .filter(f => {
                const ext = path.extname(f).toLowerCase();
                return SUPPORTED_IMAGE_EXTENSIONS.has(ext);
            })
            .map(f => path.join(dirPath, f));
    } catch (e) {
        return [];
    }
}

/**
 * Computes semantic match score between an asset filename and a chapter/concept.
 * Deterministic matching hardened against generic coincidences.
 * 
 * Rules:
 * 1. Exact chapter match (score += 50)
 * 2. Distinctive non-generic chapter words (score += 15 each)
 * 3. Generic terms alone give 0 score unless accompanied by distinctive terms or exact match
 * 4. Distinctive concept match (score += 30 exact, +10 word)
 * 5. Standalone generic terms like "voltage.png" without concept or chapter relationship yield 0
 */
function computeMatchScore(filename, chapter, concept = '') {
    const name = path.basename(filename, path.extname(filename)).toLowerCase().replace(/[_\-\.]/g, ' ');
    const chapterLower = (chapter || '').toLowerCase().replace(/[_\-\.]/g, ' ');
    const conceptLower = (concept || '').toLowerCase().replace(/[_\-\.]/g, ' ');

    let score = 0;
    let hasDistinctiveMatch = false;

    // Exact chapter match (multi-word exact match is highly distinctive)
    if (chapterLower.length > 2 && name.includes(chapterLower)) {
        score += 50;
        hasDistinctiveMatch = true;
    }

    // Chapter word matching with generic term suppression
    const nameTokens = new Set(name.split(/\s+/).filter(w => w.length > 0));
    const chapterWords = chapterLower.split(/\s+/).filter(w => w.length > 2);
    
    let matchedDistinctiveWords = 0;
    let matchedGenericWords = 0;

    for (const word of chapterWords) {
        if (nameTokens.has(word) || name.includes(word)) {
            if (GENERIC_CHAPTER_TERMS.has(word)) {
                matchedGenericWords++;
            } else {
                matchedDistinctiveWords++;
                score += 15;
                hasDistinctiveMatch = true;
            }
        }
    }

    // If only generic words matched and no distinctive word or exact chapter match occurred, reject
    if (!hasDistinctiveMatch && matchedGenericWords > 0) {
        return 0;
    }

    // Add score for generic terms only if distinctive terms already matched
    if (hasDistinctiveMatch && matchedGenericWords > 0) {
        score += Math.min(matchedGenericWords * 5, 10);
    }

    // Concept match
    if (conceptLower && conceptLower.length > 2) {
        if (name.includes(conceptLower)) {
            score += 30;
            hasDistinctiveMatch = true;
        } else {
            const conceptWords = conceptLower.split(/\s+/).filter(w => w.length > 2);
            for (const word of conceptWords) {
                if (nameTokens.has(word) || name.includes(word)) {
                    if (!GENERIC_CHAPTER_TERMS.has(word)) {
                        score += 10;
                        hasDistinctiveMatch = true;
                    }
                }
            }
        }
    }

    return hasDistinctiveMatch ? Math.min(score, 100) : 0;
}

/**
 * Main asset discovery function.
 * Scans the approved local Diagram Drop Folder for a given subject/chapter.
 * 
 * @param {Object} options
 * @param {string} options.subject - Subject name (must match Sources/Diagrams/{Subject}/)
 * @param {string} options.chapter - Chapter name for scoping
 * @param {string} [options.concept] - Optional concept for finer matching
 * @param {string} [options.diagramsRoot] - Override root path (default: Sources/Diagrams)
 * @param {Array} [options.visualNeeds] - Visual needs from discovery engine
 * @returns {Object} Discovery result with assets array and manifest
 */
function discoverAssets(options = {}) {
    const { subject, chapter, concept = '', diagramsRoot, visualNeeds = [] } = options;

    if (!subject || !chapter) {
        throw new Error('MISSING_REQUIRED_CONTEXT: subject and chapter must be provided');
    }

    // Resolve the diagrams root
    const root = diagramsRoot || path.join(__dirname, '..', 'Sources', 'Diagrams');
    const subjectDir = path.join(root, subject);

    // Check if subject directory exists
    if (!fs.existsSync(subjectDir)) {
        return {
            subject,
            chapter,
            status: 'NO_APPROVED_ASSET',
            reason: `Subject directory not found: ${subject}`,
            assets: [],
            manifest: buildManifest(subject, chapter, [])
        };
    }

    // Scan for images in the subject directory
    const allImages = scanForImages(subjectDir);

    if (allImages.length === 0) {
        return {
            subject,
            chapter,
            status: 'NO_APPROVED_ASSET',
            reason: `No image assets found in Sources/Diagrams/${subject}/`,
            assets: [],
            manifest: buildManifest(subject, chapter, [])
        };
    }

    // Match assets to chapter scope
    const matchedAssets = [];

    for (const imagePath of allImages) {
        const score = computeMatchScore(imagePath, chapter, concept);

        if (score > 0) {
            const sha256 = hashFile(imagePath);
            const dims = getImageDimensions(imagePath);
            const relativePath = path.relative(root, imagePath);

            matchedAssets.push({
                asset_id: `asset-${sha256.substring(0, 12)}`,
                subject,
                chapter,
                concept: concept || null,
                source_provenance: 'approved_local',
                local_path: relativePath,
                absolute_path: imagePath,
                asset_type: getMimeType(imagePath),
                visual_purpose: null,
                status: 'approved',
                sha256,
                width: dims.width,
                height: dims.height,
                occlusion_eligible: false, // Discovered in approved drop folder, but eligibility requires evaluation
                rejection_reason: 'PENDING_ELIGIBILITY_EVALUATION',
                matched_visual_need: null,
                match_score: score
            });
        }
    }

    // Sort by match score descending
    matchedAssets.sort((a, b) => b.match_score - a.match_score);

    // Assign visual needs if provided
    if (visualNeeds.length > 0 && matchedAssets.length > 0) {
        for (const asset of matchedAssets) {
            for (const need of visualNeeds) {
                // Simple category assignment based on subject rules
                asset.matched_visual_need = need.category;
                asset.visual_purpose = `${need.category} for ${chapter}`;
                break;
            }
        }
    }

    const hasAssets = matchedAssets.length > 0;

    return {
        subject,
        chapter,
        status: hasAssets ? 'ASSETS_DISCOVERED' : 'NO_APPROVED_ASSET',
        reason: hasAssets ? `${matchedAssets.length} approved asset(s) found` : `No matching assets for chapter '${chapter}' in Sources/Diagrams/${subject}/`,
        assets: matchedAssets,
        manifest: buildManifest(subject, chapter, matchedAssets)
    };
}

/**
 * Verifies integrity of a previously discovered asset.
 * 
 * @param {Object} assetEntry - Asset manifest entry
 * @param {string} [diagramsRoot] - Override root path
 * @returns {Object} Integrity check result: { intact, status, reason }
 */
function verifyAssetIntegrity(assetEntry, diagramsRoot) {
    if (!assetEntry || !assetEntry.local_path) {
        return { intact: false, status: 'missing', reason: 'No asset entry or local_path provided' };
    }

    const root = diagramsRoot || path.join(__dirname, '..', 'Sources', 'Diagrams');
    const fullPath = assetEntry.absolute_path || path.join(root, assetEntry.local_path);

    if (!fs.existsSync(fullPath)) {
        return { intact: false, status: 'missing', reason: `Asset file not found: ${fullPath}` };
    }

    if (assetEntry.sha256) {
        const currentHash = hashFile(fullPath);
        if (currentHash !== assetEntry.sha256) {
            return { intact: false, status: 'changed', reason: `Hash mismatch: expected ${assetEntry.sha256}, got ${currentHash}` };
        }
    }

    return { intact: true, status: 'same', reason: 'Asset exists and hash matches' };
}

/**
 * Builds a manifest object from discovered assets.
 */
function buildManifest(subject, chapter, assets) {
    return {
        manifest_version: '1.0.0',
        subject,
        chapter,
        generated_at: new Date().toISOString(),
        assets: assets.map(a => {
            const { absolute_path, match_score, ...rest } = a;
            return rest;
        })
    };
}

module.exports = {
    discoverAssets,
    verifyAssetIntegrity,
    buildManifest,
    scanForImages,
    computeMatchScore,
    hashFile,
    getMimeType,
    getImageDimensions,
    SUPPORTED_IMAGE_EXTENSIONS
};
