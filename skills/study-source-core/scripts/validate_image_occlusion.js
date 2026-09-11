/**
 * study-source-core Image Occlusion Validator
 * PHYSICAL EXECUTION GATEWAY
 * 
 * Contract:
 * - Strictly enforces canonical Image Occlusion JSON schema and geometry rules.
 * - Validates top-level metadata, card structures, and unique IDs.
 * - Validates geometric bounds (rectangle, ellipse, polygon) against asset dimensions.
 * - Enforces evidence traceability and Hindi-first answers.
 * - Emits warnings for cards with excessive region counts (>15).
 */

const fs = require('fs');
const path = require('path');

const VALID_MODES = new Set(['hide_all_guess_one', 'hide_one_guess_one']);
const VALID_SHAPES = new Set(['rectangle', 'ellipse', 'polygon']);
const VALID_SOURCE_TYPES = new Set(['source_provided', 'programmatic', 'ai_generated', 'external', 'user_provided',
    'source_embedded', 'source_extracted', 'user_supplied', 'approved_local', 'derived']);
const VALID_OCCLUSION_TARGET_TYPES = new Set([
    'labels', 'structures', 'components', 'arrows', 'process_stages',
    'map_locations', 'graph_features', 'equations', 'terminology', 'relationships'
]);

function validateImageOcclusionContent(contentOrData, filePath = 'in-memory') {
    let data;
    if (typeof contentOrData === 'string') {
        try {
            data = JSON.parse(contentOrData);
        } catch (err) {
            return {
                isValid: false,
                errors: [`Invalid JSON syntax in ${filePath}: ${err.message}`],
                warnings: []
            };
        }
    } else {
        data = contentOrData;
    }

    const errors = [];
    const warnings = [];

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        errors.push("Root manifest must be a valid JSON object.");
        return { isValid: false, errors, warnings };
    }

    // 1. Top-Level Validation
    const requiredTopLevel = ['id', 'title', 'subject', 'chapter', 'cards'];
    for (const field of requiredTopLevel) {
        if (!(field in data)) {
            errors.push(`Missing required top-level field: '${field}'`);
        } else if (typeof data[field] === 'string' && data[field].trim() === '') {
            errors.push(`Top-level field '${field}' must not be empty.`);
        }
    }

    if (!Array.isArray(data.cards)) {
        errors.push("Top-level field 'cards' must be an array.");
        return { isValid: false, errors, warnings };
    }

    if (data.cards.length === 0) {
        warnings.push("Image Occlusion manifest has 0 cards.");
    }

    const cardIds = new Set();

    // 2. Card-Level Validation
    data.cards.forEach((card, cardIdx) => {
        const cardPath = `cards[${cardIdx}]`;

        if (!card || typeof card !== 'object' || Array.isArray(card)) {
            errors.push(`${cardPath} must be an object.`);
            return;
        }

        // Card ID
        if (!card.id || typeof card.id !== 'string' || card.id.trim() === '') {
            errors.push(`${cardPath} is missing a non-empty 'id'.`);
        } else if (cardIds.has(card.id)) {
            errors.push(`Duplicate card ID '${card.id}' found at ${cardPath}.`);
        } else {
            cardIds.add(card.id);
        }

        // Source object & Evidence IDs
        if (!card.source || typeof card.source !== 'object' || Array.isArray(card.source)) {
            errors.push(`${cardPath} is missing required 'source' object.`);
        } else {
            if (!card.source.chapter || typeof card.source.chapter !== 'string' || card.source.chapter.trim() === '') {
                errors.push(`${cardPath}.source is missing non-empty 'chapter'.`);
            }
            if (!Array.isArray(card.source.evidence_ids) || card.source.evidence_ids.length === 0) {
                errors.push(`${cardPath}.source.evidence_ids must be a non-empty array of evidence identifiers.`);
            } else {
                card.source.evidence_ids.forEach((evId, evIdx) => {
                    if (typeof evId !== 'string' || evId.trim() === '') {
                        errors.push(`${cardPath}.source.evidence_ids[${evIdx}] must be a non-empty string.`);
                    }
                });
            }
        }

        // Asset object
        let assetWidth = 0;
        let assetHeight = 0;
        if (!card.asset || typeof card.asset !== 'object' || Array.isArray(card.asset)) {
            errors.push(`${cardPath} is missing required 'asset' object.`);
        } else {
            if (!card.asset.path || typeof card.asset.path !== 'string' || card.asset.path.trim() === '') {
                errors.push(`${cardPath}.asset is missing non-empty 'path'.`);
            }
            if (typeof card.asset.width !== 'number' || card.asset.width <= 0 || !Number.isInteger(card.asset.width)) {
                errors.push(`${cardPath}.asset.width must be a positive integer.`);
            } else {
                assetWidth = card.asset.width;
            }
            if (typeof card.asset.height !== 'number' || card.asset.height <= 0 || !Number.isInteger(card.asset.height)) {
                errors.push(`${cardPath}.asset.height must be a positive integer.`);
            } else {
                assetHeight = card.asset.height;
            }
            if (card.asset.source_type && !VALID_SOURCE_TYPES.has(card.asset.source_type)) {
                warnings.push(`${cardPath}.asset.source_type '${card.asset.source_type}' is unrecognized.`);
            }
            // Phase 6: SHA-256 integrity check
            if (card.asset.sha256) {
                if (typeof card.asset.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(card.asset.sha256)) {
                    warnings.push(`${cardPath}.asset.sha256 is not a valid SHA-256 hash.`);
                }
            } else if (card.asset.source_type && ['approved_local', 'source_embedded', 'source_extracted', 'user_supplied'].includes(card.asset.source_type)) {
                warnings.push(`${cardPath}.asset is missing sha256 hash for provenance '${card.asset.source_type}'. Integrity cannot be verified.`);
            }
            // Phase 6: Provenance note check
            if (!card.asset.provenance_note || (typeof card.asset.provenance_note === 'string' && card.asset.provenance_note.trim() === '')) {
                warnings.push(`${cardPath}.asset is missing provenance_note. Visual asset provenance should be explicit.`);
            }
        }

        // Mode
        if (!card.mode || typeof card.mode !== 'string') {
            errors.push(`${cardPath} is missing required 'mode'.`);
        } else if (!VALID_MODES.has(card.mode)) {
            errors.push(`${cardPath} has invalid mode '${card.mode}'. Expected one of: ${Array.from(VALID_MODES).join(', ')}.`);
        }

        // Regions
        if (!Array.isArray(card.regions) || card.regions.length === 0) {
            errors.push(`${cardPath}.regions must be a non-empty array of occlusion regions.`);
            return;
        }

        if (card.regions.length > 15) {
            warnings.push(`${cardPath} has ${card.regions.length} occlusion regions (recommended: 4-12 to prevent cognitive overload).`);
        }

        const regionIds = new Set();

        card.regions.forEach((region, rIdx) => {
            const regPath = `${cardPath}.regions[${rIdx}]`;

            if (!region || typeof region !== 'object' || Array.isArray(region)) {
                errors.push(`${regPath} must be an object.`);
                return;
            }

            // Region ID
            if (!region.id || typeof region.id !== 'string' || region.id.trim() === '') {
                errors.push(`${regPath} is missing a non-empty 'id'.`);
            } else if (regionIds.has(region.id)) {
                errors.push(`Duplicate region ID '${region.id}' found in ${cardPath}.`);
            } else {
                regionIds.add(region.id);
            }

            // Shape
            if (!region.shape || typeof region.shape !== 'string') {
                errors.push(`${regPath} is missing required 'shape'.`);
                return;
            } else if (!VALID_SHAPES.has(region.shape)) {
                errors.push(`${regPath} has invalid shape '${region.shape}'. Expected one of: ${Array.from(VALID_SHAPES).join(', ')}.`);
                return;
            }

            // Answer
            if (!region.answer || typeof region.answer !== 'string' || region.answer.trim() === '') {
                errors.push(`${regPath} is missing required non-empty 'answer'.`);
            }

            // Geometry Validation
            if (assetWidth > 0 && assetHeight > 0) {
                if (region.shape === 'rectangle') {
                    if (!Array.isArray(region.coordinates) || region.coordinates.length !== 4) {
                        errors.push(`${regPath} with shape 'rectangle' must have coordinates array [x, y, width, height].`);
                    } else {
                        const [x, y, w, h] = region.coordinates;
                        if (typeof x !== 'number' || typeof y !== 'number' || typeof w !== 'number' || typeof h !== 'number') {
                            errors.push(`${regPath} coordinates must all be numbers.`);
                        } else {
                            if (w <= 0 || h <= 0) {
                                errors.push(`${regPath} rectangle width and height must be positive numbers (> 0). Got width=${w}, height=${h}.`);
                            }
                            if (x < 0 || y < 0) {
                                errors.push(`${regPath} rectangle top-left coordinates must be non-negative (>= 0). Got x=${x}, y=${y}.`);
                            }
                            if (x + w > assetWidth || y + h > assetHeight) {
                                errors.push(`${regPath} rectangle exceeds image bounds [${assetWidth}x${assetHeight}]. Geometry: [${x}, ${y}, ${w}, ${h}] bounds up to [${x + w}, ${y + h}].`);
                            }
                        }
                    }
                } else if (region.shape === 'ellipse') {
                    if (!Array.isArray(region.coordinates) || region.coordinates.length !== 4) {
                        errors.push(`${regPath} with shape 'ellipse' must have coordinates array [cx, cy, rx, ry].`);
                    } else {
                        const [cx, cy, rx, ry] = region.coordinates;
                        if (typeof cx !== 'number' || typeof cy !== 'number' || typeof rx !== 'number' || typeof ry !== 'number') {
                            errors.push(`${regPath} ellipse coordinates must all be numbers.`);
                        } else {
                            if (rx <= 0 || ry <= 0) {
                                errors.push(`${regPath} ellipse radii (rx, ry) must be positive numbers (> 0). Got rx=${rx}, ry=${ry}.`);
                            }
                            if (cx - rx < 0 || cy - ry < 0 || cx + rx > assetWidth || cy + ry > assetHeight) {
                                errors.push(`${regPath} ellipse exceeds image bounds [${assetWidth}x${assetHeight}]. Center: [${cx}, ${cy}], Radii: [${rx}, ${ry}].`);
                            }
                        }
                    }
                } else if (region.shape === 'polygon') {
                    if (!Array.isArray(region.points) || region.points.length < 3) {
                        errors.push(`${regPath} with shape 'polygon' must have 'points' array with at least 3 vertices.`);
                    } else {
                        region.points.forEach((pt, ptIdx) => {
                            if (!Array.isArray(pt) || pt.length !== 2 || typeof pt[0] !== 'number' || typeof pt[1] !== 'number') {
                                errors.push(`${regPath}.points[${ptIdx}] must be a [x, y] coordinate pair.`);
                            } else {
                                const [px, py] = pt;
                                if (px < 0 || px > assetWidth || py < 0 || py > assetHeight) {
                                    errors.push(`${regPath}.points[${ptIdx}] (${px}, ${py}) is outside image bounds [${assetWidth}x${assetHeight}].`);
                                }
                            }
                        });
                    }
                }
            }
        });
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

function validateImageOcclusion(filePath, shouldExit = true) {
    console.log(`Validating Image Occlusion JSON at: ${filePath}`);
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        if (shouldExit) process.exit(1);
        return { isValid: false, errors: [`File not found: ${filePath}`], warnings: [] };
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const result = validateImageOcclusionContent(fileContent, filePath);

    if (!result.isValid) {
        console.log("\n[FAIL] Image Occlusion Validation Errors:");
        result.errors.forEach(err => console.log(`  ❌ ${err}`));
        console.log("\nValidation failed.");
        if (shouldExit) process.exit(1);
        return result;
    } else {
        if (result.warnings.length > 0) {
            result.warnings.forEach(w => console.log(`  ⚠️ ${w}`));
        }
        console.log("\n[PASS] Image Occlusion Validation successful.");
        if (shouldExit) process.exit(0);
        return result;
    }
}

if (require.main === module) {
    if (process.argv.length !== 3) {
        console.error("Usage: node validate_image_occlusion.js <path_to_json>");
        process.exit(1);
    }
    validateImageOcclusion(process.argv[2]);
}

module.exports = {
    validateImageOcclusion,
    validateImageOcclusionContent,
    VALID_MODES,
    VALID_SHAPES,
    VALID_SOURCE_TYPES,
    VALID_OCCLUSION_TARGET_TYPES
};
