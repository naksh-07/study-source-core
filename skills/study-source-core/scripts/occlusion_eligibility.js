/**
 * study-source-core Occlusion Eligibility Engine
 * 
 * Deterministic eligibility rules for Image Occlusion candidate assets.
 * An asset is rejected when it fails any of the defined criteria.
 * 
 * Returns: { eligible: boolean, reason: string, checks: Object }
 */

const path = require('path');
const fs = require('fs');

// Load subject visual rules for subject-aware eligibility
const rulesPath = path.join(__dirname, '..', 'resources', 'subject-visual-rules.json');
let subjectVisualRules = {};
try {
    const parsed = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    subjectVisualRules = parsed.subjects || parsed;
} catch (e) {}

/**
 * Minimum image dimensions for occlusion eligibility.
 */
const MIN_DIMENSION = 200; // pixels

/**
 * Valid provenance classes.
 */
const VALID_PROVENANCE = new Set([
    'source_embedded',
    'source_extracted',
    'user_supplied',
    'approved_local',
    'derived'
]);

/**
 * Canonical occlusion target types.
 */
const VALID_TARGET_TYPES = new Set([
    'labels',
    'structures',
    'components',
    'arrows',
    'process_stages',
    'map_locations',
    'graph_features',
    'equations',
    'terminology',
    'relationships'
]);

/**
 * Evaluates whether an asset is eligible for Image Occlusion.
 * 
 * @param {Object} asset - Asset metadata from discovery/manifest
 * @param {Object} [options] - Additional context
 * @param {string} [options.subject] - Subject name for subject-aware rules
 * @param {string} [options.chapter] - Chapter name for linkage check
 * @param {Array} [options.targetRegions] - Proposed occlusion target regions
 * @returns {Object} { eligible: boolean, reason: string, checks: Object }
 */
function evaluateOcclusionEligibility(asset, options = {}) {
    const { subject, chapter, targetRegions } = options;
    const checks = {};
    const failures = [];

    // 1. Asset existence
    checks.asset_exists = !!asset && typeof asset === 'object';
    if (!checks.asset_exists) {
        return { eligible: false, reason: 'NO_ASSET_PROVIDED', checks };
    }

    // 2. Provenance check
    checks.has_provenance = !!asset.source_provenance && VALID_PROVENANCE.has(asset.source_provenance);
    if (!checks.has_provenance) {
        failures.push('MISSING_OR_INVALID_PROVENANCE');
    }

    // 3. Subject linkage
    checks.has_subject = !!asset.subject && typeof asset.subject === 'string' && asset.subject.trim().length > 0;
    if (!checks.has_subject) {
        failures.push('MISSING_SUBJECT_LINKAGE');
    }

    // 4. Chapter linkage
    checks.has_chapter = !!asset.chapter && typeof asset.chapter === 'string' && asset.chapter.trim().length > 0;
    if (!checks.has_chapter) {
        failures.push('MISSING_CHAPTER_LINKAGE');
    }

    // 5. Chapter scope enforcement (no silent cross-chapter reuse)
    if (chapter && asset.chapter && asset.chapter !== chapter) {
        checks.chapter_scope_valid = false;
        failures.push('CROSS_CHAPTER_REUSE_BLOCKED');
    } else {
        checks.chapter_scope_valid = true;
    }

    // 6. Resolution check (minimum dimensions)
    const width = asset.width || 0;
    const height = asset.height || 0;
    checks.adequate_resolution = width >= MIN_DIMENSION && height >= MIN_DIMENSION;
    if (!checks.adequate_resolution) {
        failures.push(`INADEQUATE_RESOLUTION (${width}x${height}, minimum ${MIN_DIMENSION}x${MIN_DIMENSION})`);
    }

    // 7. File path / existence
    checks.has_path = !!asset.local_path && typeof asset.local_path === 'string' && asset.local_path.trim().length > 0;
    if (!checks.has_path) {
        failures.push('MISSING_FILE_PATH');
    }

    // 8. Hash integrity
    checks.has_hash = !!asset.sha256 && typeof asset.sha256 === 'string' && /^[a-f0-9]{64}$/.test(asset.sha256);
    if (!checks.has_hash) {
        // Warning, not hard failure — hash is strongly recommended but not blocking
        checks.hash_warning = 'SHA256_HASH_MISSING_OR_INVALID';
    }

    // 9. Target regions check (if provided)
    if (targetRegions !== undefined) {
        checks.has_target_regions = Array.isArray(targetRegions) && targetRegions.length > 0;
        if (!checks.has_target_regions) {
            failures.push('NO_MEANINGFUL_TARGET_REGIONS');
        }
    }

    // 10. Status check
    if (asset.status === 'rejected') {
        checks.not_rejected = false;
        failures.push(`ASSET_PREVIOUSLY_REJECTED: ${asset.rejection_reason || 'unknown reason'}`);
    } else if (asset.status === 'missing') {
        checks.not_rejected = false;
        failures.push('ASSET_STATUS_MISSING');
    } else {
        checks.not_rejected = true;
    }

    // 11. Asset type check (must be an image type)
    const imageTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/bmp', 'image/gif'];
    checks.is_image_type = !!asset.asset_type && imageTypes.includes(asset.asset_type);
    if (!checks.is_image_type && asset.asset_type) {
        failures.push(`NON_IMAGE_ASSET_TYPE: ${asset.asset_type}`);
    }

    // Determine eligibility
    const eligible = failures.length === 0;
    const reason = eligible ? 'ELIGIBLE' : failures.join('; ');

    return { eligible, reason, checks, failures };
}

/**
 * Checks if a visual category is appropriate for IO based on subject rules.
 * 
 * @param {string} category - Visual need category
 * @param {string} subject - Subject name
 * @returns {Object} { appropriate: boolean, is_preferred: boolean }
 */
function isOcclusionAppropriate(category, subject) {
    const rules = subjectVisualRules[subject] || {};
    const preferred = rules.preferred_visual_categories || [];
    const isPreferred = preferred.includes(category);

    // IO-suppressed categories (abstract, text-only)
    const suppressed = new Set(['timeline', 'flowchart']); // These are typically better as text
    if (suppressed.has(category) && !isPreferred) {
        return { appropriate: false, is_preferred: false, reason: 'CATEGORY_NOT_IO_SUITABLE' };
    }

    return { appropriate: true, is_preferred: isPreferred, reason: isPreferred ? 'SUBJECT_PREFERRED' : 'ACCEPTABLE' };
}

/**
 * Validates an occlusion target type.
 */
function isValidTargetType(targetType) {
    return VALID_TARGET_TYPES.has(targetType);
}

module.exports = {
    evaluateOcclusionEligibility,
    isOcclusionAppropriate,
    isValidTargetType,
    VALID_PROVENANCE,
    VALID_TARGET_TYPES,
    MIN_DIMENSION
};
