/**
 * study-source-core Visual Asset Resolution Engine
 * 
 * Implements the deterministic 5-tier asset resolution cascade:
 *  1. Existing source-provided visual asset
 *  2. Programmatically generated visual asset
 *  3. AI-generated pedagogical visual
 *  4. Suitable external visual asset (with lightweight provenance)
 *  5. Graceful IO suppression if no reliable asset is obtainable
 * 
 * All resolved assets are normalized into the chapter's ImageOcclusion/media/ directory
 * and return standardized asset metadata (dimensions, sha256, mime, source reference).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Calculates SHA-256 hash of a buffer or file.
 */
function calculateSha256(bufferOrPath) {
    let buffer;
    if (typeof bufferOrPath === 'string') {
        buffer = fs.readFileSync(bufferOrPath);
    } else {
        buffer = bufferOrPath;
    }
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Determines MIME type from file extension or content.
 */
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.svg': return 'image/svg+xml';
        case '.webp': return 'image/webp';
        default: return 'application/octet-stream';
    }
}

/**
 * Simple parser to extract dimensions from PNG, JPEG, or SVG headers.
 */
function getImageDimensions(buffer, ext = '.png') {
    try {
        const extClean = ext.toLowerCase();
        if (extClean === '.png') {
            // PNG width is at offset 16 (4 bytes), height at offset 20 (4 bytes)
            if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
                const width = buffer.readUInt32BE(16);
                const height = buffer.readUInt32BE(20);
                return { width, height };
            }
        } else if (extClean === '.svg') {
            const svgText = buffer.toString('utf-8');
            const widthMatch = svgText.match(/width=["'](\d+)(?:px)?["']/i) || svgText.match(/viewBox=["'][\d\s.]+[\d\s.]+\s+(\d+)\s+(\d+)["']/i);
            const heightMatch = svgText.match(/height=["'](\d+)(?:px)?["']/i);
            const viewBoxMatch = svgText.match(/viewBox=["']\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);

            if (viewBoxMatch) {
                return {
                    width: Math.round(parseFloat(viewBoxMatch[1])),
                    height: Math.round(parseFloat(viewBoxMatch[2]))
                };
            }
            if (widthMatch && heightMatch) {
                return {
                    width: parseInt(widthMatch[1], 10),
                    height: parseInt(heightMatch[1], 10)
                };
            }
        } else if (extClean === '.jpg' || extClean === '.jpeg') {
            // Scan JPEG SOF0 / SOF2 markers
            let offset = 2;
            while (offset < buffer.length) {
                if (buffer[offset] !== 0xFF) break;
                const marker = buffer[offset + 1];
                if (marker === 0xC0 || marker === 0xC2) { // SOF0 / SOF2
                    const height = buffer.readUInt16BE(offset + 5);
                    const width = buffer.readUInt16BE(offset + 7);
                    return { width, height };
                }
                const length = buffer.readUInt16BE(offset + 2);
                offset += 2 + length;
            }
        }
    } catch (err) {
        // Fallback default
    }
    return { width: 1920, height: 1080 };
}

/**
 * Creates a minimal valid 1x1 PNG or generates a clean SVG template for programmatic visual assets.
 */
function createProgrammaticSvg(title, width = 1200, height = 800, regions = []) {
    let shapesSvg = '';
    regions.forEach((r, idx) => {
        const color = `hsl(${(idx * 65) % 360}, 70%, 80%)`;
        const strokeColor = `hsl(${(idx * 65) % 360}, 80%, 40%)`;
        if (r.shape === 'rectangle' && r.coordinates) {
            const [x, y, w, h] = r.coordinates;
            shapesSvg += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" stroke="${strokeColor}" stroke-width="2" rx="4"/>\n`;
            if (r.label) {
                shapesSvg += `  <text x="${x + w / 2}" y="${y + h / 2 + 5}" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#222">${r.label}</text>\n`;
            }
        } else if (r.shape === 'ellipse' && r.coordinates) {
            const [cx, cy, rx, ry] = r.coordinates;
            shapesSvg += `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}" stroke="${strokeColor}" stroke-width="2"/>\n`;
            if (r.label) {
                shapesSvg += `  <text x="${cx}" y="${cy + 5}" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#222">${r.label}</text>\n`;
            }
        } else if (r.shape === 'polygon' && r.points) {
            const ptsStr = r.points.map(p => `${p[0]},${p[1]}`).join(' ');
            shapesSvg += `  <polygon points="${ptsStr}" fill="${color}" stroke="${strokeColor}" stroke-width="2"/>\n`;
        }
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  <text x="30" y="45" font-family="sans-serif" font-size="22" font-weight="bold" fill="#0f172a">${title}</text>
  <line x1="30" y1="60" x2="${width - 30}" y2="60" stroke="#94a3b8" stroke-width="1.5"/>
${shapesSvg}
</svg>`;
}

/**
 * Normalizes and persists an asset into the target chapter media directory.
 * Returns the canonical Asset object.
 */
function normalizeAsset({
    sourceBuffer,
    sourcePath,
    targetMediaDir,
    filename,
    sourceType,
    provenanceNote,
    widthOverride,
    heightOverride
}) {
    if (!fs.existsSync(targetMediaDir)) {
        fs.mkdirSync(targetMediaDir, { recursive: true });
    }

    const buffer = sourceBuffer || (sourcePath ? fs.readFileSync(sourcePath) : null);
    if (!buffer) {
        throw new Error("Cannot normalize asset: no buffer or valid sourcePath provided.");
    }

    const sha256 = calculateSha256(buffer);
    const ext = path.extname(filename || sourcePath || '.png');
    const safeFilename = filename || `asset_${sha256.substring(0, 10)}${ext}`;
    const destFilePath = path.join(targetMediaDir, safeFilename);

    // Caching check: if destination exists and matches hash, avoid rewriting
    if (!fs.existsSync(destFilePath) || calculateSha256(destFilePath) !== sha256) {
        fs.writeFileSync(destFilePath, buffer);
    }

    const dims = getImageDimensions(buffer, ext);
    const finalWidth = widthOverride || dims.width;
    const finalHeight = heightOverride || dims.height;

    return {
        asset_id: `asset-${sha256.substring(0, 12)}`,
        path: `media/${safeFilename}`,
        original_name: safeFilename,
        mime_type: getMimeType(safeFilename),
        width: finalWidth,
        height: finalHeight,
        sha256: sha256,
        source_type: sourceType,
        provenance_note: provenanceNote || `${sourceType} asset recorded at ${new Date().toISOString()}`
    };
}

/**
 * Main Asset Resolution Function.
 * Implements 5-tier fallback cascade.
 * 
 * @param {Object} options
 * @param {string} options.targetMediaDir - Destination directory (e.g. Study Materials/.../ImageOcclusion/media)
 * @param {Object} [options.candidate] - Candidate metadata from evidence pack
 * @param {string} [options.sourceAssetPath] - Path to existing source diagram
 * @param {Object} [options.programmaticSpec] - Spec for deterministic generation
 * @param {Buffer|string} [options.aiGeneratedData] - AI image buffer or filepath
 * @param {Object} [options.externalSpec] - External asset metadata & URL/buffer
 * @returns {Object} Resolution result: { success: boolean, asset?: Object, suppressed?: boolean, reason?: string }
 */
function resolveVisualAsset(options) {
    const {
        targetMediaDir,
        candidate = {},
        sourceAssetPath,
        programmaticSpec,
        aiGeneratedData,
        externalSpec
    } = options;

    // Tier 1: Source-Provided Asset
    if (sourceAssetPath && fs.existsSync(sourceAssetPath)) {
        try {
            const asset = normalizeAsset({
                sourcePath: sourceAssetPath,
                targetMediaDir,
                filename: path.basename(sourceAssetPath),
                sourceType: 'source_provided',
                provenanceNote: candidate.provenance_note || `Source-provided diagram: ${path.basename(sourceAssetPath)}`
            });
            return { success: true, asset, tier: 1, strategy: 'source_provided' };
        } catch (err) {
            console.warn(`[AssetEngine] Tier 1 failed for ${sourceAssetPath}: ${err.message}. Falling to Tier 2.`);
        }
    }

    // Tier 2: Programmatic Generation
    if (programmaticSpec && programmaticSpec.title) {
        try {
            const width = programmaticSpec.width || 1600;
            const height = programmaticSpec.height || 1200;
            const svgContent = createProgrammaticSvg(
                programmaticSpec.title,
                width,
                height,
                programmaticSpec.regions || []
            );
            const filename = programmaticSpec.filename || `${(programmaticSpec.slug || 'diagram').toLowerCase()}.svg`;
            const asset = normalizeAsset({
                sourceBuffer: Buffer.from(svgContent, 'utf-8'),
                targetMediaDir,
                filename,
                sourceType: 'programmatic',
                provenanceNote: programmaticSpec.provenance_note || `Programmatically generated visual diagram (${width}x${height})`,
                widthOverride: width,
                heightOverride: height
            });
            return { success: true, asset, tier: 2, strategy: 'programmatic' };
        } catch (err) {
            console.warn(`[AssetEngine] Tier 2 failed: ${err.message}. Falling to Tier 3.`);
        }
    }

    // Tier 3: AI-Generated Pedagogical Visual
    if (aiGeneratedData) {
        try {
            const buffer = Buffer.isBuffer(aiGeneratedData)
                ? aiGeneratedData
                : (typeof aiGeneratedData === 'string' && fs.existsSync(aiGeneratedData)
                    ? fs.readFileSync(aiGeneratedData)
                    : null);

            if (buffer) {
                const filename = candidate.filename || `ai_pedagogical_${Date.now()}.png`;
                const asset = normalizeAsset({
                    sourceBuffer: buffer,
                    targetMediaDir,
                    filename,
                    sourceType: 'ai_generated',
                    provenanceNote: candidate.provenance_note || `AI pedagogical visual synthesized from authorized evidence`
                });
                return { success: true, asset, tier: 3, strategy: 'ai_generated' };
            }
        } catch (err) {
            console.warn(`[AssetEngine] Tier 3 failed: ${err.message}. Falling to Tier 4.`);
        }
    }

    // Tier 4: External Visual Asset
    if (externalSpec && (externalSpec.buffer || externalSpec.filePath)) {
        try {
            const buffer = externalSpec.buffer || fs.readFileSync(externalSpec.filePath);
            const filename = externalSpec.filename || path.basename(externalSpec.filePath || 'external_asset.png');
            const provNote = `External asset: ${externalSpec.source || 'Open Educational Source'} (${externalSpec.source_url || 'N/A'}), License: ${externalSpec.license || 'Personal Educational Use'}, Retrieved: ${externalSpec.retrieved_at || new Date().toISOString()}`;

            const asset = normalizeAsset({
                sourceBuffer: buffer,
                targetMediaDir,
                filename,
                sourceType: 'external',
                provenanceNote: provNote
            });
            return { success: true, asset, tier: 4, strategy: 'external' };
        } catch (err) {
            console.warn(`[AssetEngine] Tier 4 failed: ${err.message}. Falling to Tier 5.`);
        }
    }

    // Tier 5: Graceful Suppression
    const reason = candidate.target_title
        ? `No reliable visual substrate could be resolved for target '${candidate.target_title}'. IO gracefully suppressed.`
        : "No visual asset provided or resolvable. Image Occlusion suppressed.";

    return {
        success: false,
        suppressed: true,
        tier: 5,
        strategy: 'suppress',
        reason
    };
}

module.exports = {
    resolveVisualAsset,
    normalizeAsset,
    createProgrammaticSvg,
    calculateSha256,
    getImageDimensions,
    getMimeType
};
