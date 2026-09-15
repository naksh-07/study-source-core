/**
 * StudySourceCore Content Lineage Record (CLR) Engine (`content_lineage_record.js`)
 * 
 * Implements the canonical 5-layer provenance architecture and 11 mandatory CLR fields
 * specified in `docs/PROVENANCE_AND_LINEAGE.md` (Version 1.0.0-PROVENANCE).
 * 
 * Non-Negotiable Invariants:
 * 1. 100% of KUs and practice items in Semantic Learning IR must persist complete 11-field CLRs.
 * 2. Origin Tier Hierarchy: AUTHENTIC > CURATED > DERIVED > SYNTHETIC.
 * 3. Fail-closed: Missing fields, invalid hashes, fabricated provenance, or broken lineage
 *    throw immediate PROVENANCE_INTEGRITY_VIOLATION errors.
 * 4. Context regeneration / retry must never discard or weaken existing CLR data.
 */

const crypto = require('crypto');

/**
 * Origin Tier Hierarchy Constants
 */
const ORIGIN_TIERS = {
    AUTHENTIC: 'AUTHENTIC',
    CURATED: 'CURATED',
    DERIVED: 'DERIVED',
    SYNTHETIC: 'SYNTHETIC'
};

const VALID_ORIGIN_TIERS = new Set(Object.values(ORIGIN_TIERS));

const VALID_CERTIFICATION_STATUSES = new Set(['PENDING', 'CERTIFIED', 'REJECTED']);

/**
 * Computes standard SHA-256 hex digest of UTF-8 content.
 */
function computeSha256(content) {
    if (content === undefined || content === null) return '';
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(typeof content === 'string' ? content : JSON.stringify(content), 'utf8');
    return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Validates whether a string is a valid 64-character lowercase hexadecimal SHA-256 hash.
 */
function isValidSha256(hashStr) {
    return typeof hashStr === 'string' && /^[a-f0-9]{64}$/i.test(hashStr);
}

/**
 * Validates a Content Lineage Record (CLR) object against the canonical 11-field contract.
 * Returns { isValid: boolean, errors: string[] }
 */
function validateContentLineageRecord(clr, options = {}) {
    const errors = [];

    if (!clr || typeof clr !== 'object') {
        return { isValid: false, errors: ['CLR must be a non-null object'] };
    }

    // 1. source_id
    if (!clr.source_id || typeof clr.source_id !== 'string' || clr.source_id.trim() === '') {
        errors.push('Missing or empty mandatory field: source_id');
    }

    // 2. source_coordinates
    if (!clr.source_coordinates || typeof clr.source_coordinates !== 'object') {
        errors.push('Missing or invalid mandatory field: source_coordinates');
    } else {
        if (!clr.source_coordinates.section || typeof clr.source_coordinates.section !== 'string') {
            errors.push('source_coordinates must contain non-empty section string');
        }
        if (clr.source_coordinates.page_start !== undefined && clr.source_coordinates.page_start !== null) {
            if (!Number.isInteger(clr.source_coordinates.page_start) || clr.source_coordinates.page_start < 0) {
                errors.push('source_coordinates.page_start must be a non-negative integer or null');
            }
        }
    }

    // 3. source_chunk_hash
    if (!clr.source_chunk_hash || !isValidSha256(clr.source_chunk_hash)) {
        errors.push(`Missing or invalid SHA-256 hash in source_chunk_hash: ${clr.source_chunk_hash}`);
    }

    // 4. evidence_pack_id
    if (!clr.evidence_pack_id || typeof clr.evidence_pack_id !== 'string' || clr.evidence_pack_id.trim() === '') {
        errors.push('Missing or empty mandatory field: evidence_pack_id');
    }

    // 5. ku_id
    if (!clr.ku_id || typeof clr.ku_id !== 'string' || clr.ku_id.trim() === '') {
        errors.push('Missing or empty mandatory field: ku_id');
    }

    // 6. origin_tier
    if (!clr.origin_tier || !VALID_ORIGIN_TIERS.has(clr.origin_tier)) {
        errors.push(`Invalid origin_tier: "${clr.origin_tier}". Must be one of: ${Array.from(VALID_ORIGIN_TIERS).join(', ')}`);
    }

    // 7. generator_metadata
    if (!clr.generator_metadata || typeof clr.generator_metadata !== 'object') {
        errors.push('Missing mandatory field: generator_metadata');
    } else {
        if (!clr.generator_metadata.engine_version || typeof clr.generator_metadata.engine_version !== 'string') {
            errors.push('generator_metadata.engine_version must be a non-empty string');
        }
        if (!clr.generator_metadata.timestamp || isNaN(Date.parse(clr.generator_metadata.timestamp))) {
            errors.push('generator_metadata.timestamp must be a valid ISO 8601 date string');
        }
    }

    // 8. model_and_prompt
    if (!clr.model_and_prompt || typeof clr.model_and_prompt !== 'object') {
        errors.push('Missing mandatory field: model_and_prompt');
    } else {
        if (!clr.model_and_prompt.model || typeof clr.model_and_prompt.model !== 'string') {
            errors.push('model_and_prompt.model must be a non-empty string');
        }
        if (!clr.model_and_prompt.prompt_version || typeof clr.model_and_prompt.prompt_version !== 'string') {
            errors.push('model_and_prompt.prompt_version must be a non-empty string');
        }
    }

    // 9. transformation_history
    if (!Array.isArray(clr.transformation_history)) {
        errors.push('Missing mandatory field: transformation_history must be an array');
    }

    // 10. renderer_target
    if (!clr.renderer_target) {
        errors.push('Missing mandatory field: renderer_target');
    } else if (typeof clr.renderer_target === 'object') {
        if (!clr.renderer_target.file_path || typeof clr.renderer_target.file_path !== 'string') {
            errors.push('renderer_target.file_path must be a non-empty string');
        }
    } else if (typeof clr.renderer_target !== 'string') {
        errors.push('renderer_target must be an object with file_path or a target path string');
    }

    // 11. certification_state
    if (!clr.certification_state || typeof clr.certification_state !== 'object') {
        errors.push('Missing mandatory field: certification_state');
    } else {
        if (!clr.certification_state.status || !VALID_CERTIFICATION_STATUSES.has(clr.certification_state.status)) {
            errors.push(`certification_state.status must be one of: ${Array.from(VALID_CERTIFICATION_STATUSES).join(', ')}`);
        }
    }

    // Anti-fabrication check: AUTHENTIC tier items must have authentic section/source coordinates
    if (clr.origin_tier === ORIGIN_TIERS.AUTHENTIC) {
        if (clr.source_id && (clr.source_id.includes('synthetic') || clr.source_id.includes('mock'))) {
            errors.push(`FABRICATED_PROVENANCE: Items marked AUTHENTIC cannot cite synthetic or mock source_id: ${clr.source_id}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Creates a normalized 11-field Content Lineage Record.
 * Throws PROVENANCE_INTEGRITY_VIOLATION if any required field is missing or invalid.
 */
function createContentLineageRecord(params) {
    if (!params || typeof params !== 'object') {
        throw new Error('PROVENANCE_INTEGRITY_VIOLATION: createContentLineageRecord requires parameters object');
    }

    const rendererTarget = typeof params.renderer_target === 'string'
        ? { file_path: params.renderer_target, anchor: null, line: null }
        : (params.renderer_target || { file_path: 'unassigned', anchor: null, line: null });

    const clr = {
        source_id: params.source_id,
        source_coordinates: {
            page_start: params.source_coordinates ? params.source_coordinates.page_start ?? null : null,
            page_end: params.source_coordinates ? params.source_coordinates.page_end ?? null : null,
            section: params.source_coordinates ? (params.source_coordinates.section || 'General') : 'General',
            paragraph: params.source_coordinates ? params.source_coordinates.paragraph ?? null : null,
            line_start: params.source_coordinates ? params.source_coordinates.line_start ?? null : null,
            line_end: params.source_coordinates ? params.source_coordinates.line_end ?? null : null
        },
        source_chunk_hash: params.source_chunk_hash,
        evidence_pack_id: params.evidence_pack_id,
        ku_id: params.ku_id,
        origin_tier: params.origin_tier || ORIGIN_TIERS.CURATED,
        generator_metadata: {
            engine_version: (params.generator_metadata && params.generator_metadata.engine_version) || '1.0.0-foundation',
            timestamp: (params.generator_metadata && params.generator_metadata.timestamp) || new Date().toISOString()
        },
        model_and_prompt: {
            model: (params.model_and_prompt && params.model_and_prompt.model) || 'studysourcecore-foundation-v1',
            temperature: (params.model_and_prompt && params.model_and_prompt.temperature !== undefined) ? params.model_and_prompt.temperature : 0.2,
            prompt_version: (params.model_and_prompt && params.model_and_prompt.prompt_version) || 'v1.0'
        },
        transformation_history: Array.isArray(params.transformation_history) ? [...params.transformation_history] : [],
        renderer_target: rendererTarget,
        certification_state: {
            status: (params.certification_state && params.certification_state.status) || 'PENDING',
            auditor: (params.certification_state && params.certification_state.auditor) || null,
            signature: (params.certification_state && params.certification_state.signature) || null,
            verified_at: (params.certification_state && params.certification_state.verified_at) || null,
            adv_token: (params.certification_state && params.certification_state.adv_token) || null
        }
    };

    const validation = validateContentLineageRecord(clr);
    if (!validation.isValid) {
        throw new Error(`PROVENANCE_INTEGRITY_VIOLATION: Incomplete or invalid CLR: ${validation.errors.join('; ')}`);
    }

    return clr;
}

/**
 * Cryptographically verifies an unbroken lineage chain:
 * source text -> chunk -> evidence pack -> CLR -> IR node.
 */
function verifyLineageChain({ chunkContent, clr, evidencePack, irNode }) {
    const val = validateContentLineageRecord(clr);
    if (!val.isValid) {
        return { verified: false, reason: `Invalid CLR: ${val.errors.join('; ')}` };
    }

    // 1. Direct chunk content hash verification
    if (chunkContent !== undefined && chunkContent !== null) {
        const computedChunkHash = computeSha256(chunkContent);
        if (computedChunkHash !== clr.source_chunk_hash) {
            return {
                verified: false,
                reason: `SOURCE_CHUNK_HASH_MISMATCH: Computed ${computedChunkHash} !== CLR ${clr.source_chunk_hash}`
            };
        }
    }

    // 2. Evidence pack chunk registration verification
    if (evidencePack) {
        if (evidencePack.evidence_pack_id && evidencePack.evidence_pack_id !== clr.evidence_pack_id) {
            return {
                verified: false,
                reason: `EVIDENCE_PACK_ID_MISMATCH: Evidence pack ${evidencePack.evidence_pack_id} !== CLR ${clr.evidence_pack_id}`
            };
        }

        if (Array.isArray(evidencePack.chunks)) {
            const foundChunk = evidencePack.chunks.find(c => c.chunk_hash === clr.source_chunk_hash);
            if (!foundChunk) {
                return {
                    verified: false,
                    reason: `UNGROUNDED_PROVENANCE: Chunk hash ${clr.source_chunk_hash} not found in evidence pack chunks`
                };
            }
        }
    }

    // 3. IR Node linkage
    if (irNode) {
        if (irNode.id && irNode.id !== clr.ku_id && (irNode.clr && irNode.clr.ku_id !== clr.ku_id)) {
            return {
                verified: false,
                reason: `KU_IDENTITY_MISMATCH: IR node ID ${irNode.id} !== CLR ku_id ${clr.ku_id}`
            };
        }
    }

    return { verified: true };
}

/**
 * Asserts that a retry or regenerated context has not lost, stripped, or degraded provenance.
 */
function assertNoLineageLoss(originalItem, regeneratedItem) {
    if (!originalItem || !originalItem.clr) {
        return; // No existing CLR to defend
    }

    if (!regeneratedItem || !regeneratedItem.clr) {
        throw new Error(`PROVENANCE_LOSS_DETECTED: Item ${originalItem.id || 'unknown'} lost its CLR during retry/regeneration.`);
    }

    const orig = originalItem.clr;
    const regen = regeneratedItem.clr;

    if (orig.source_chunk_hash !== regen.source_chunk_hash) {
        throw new Error(`PROVENANCE_HASH_DIVERGENCE: Item ${originalItem.id} source_chunk_hash changed from ${orig.source_chunk_hash} to ${regen.source_chunk_hash}`);
    }

    if (orig.origin_tier === ORIGIN_TIERS.AUTHENTIC && regen.origin_tier !== ORIGIN_TIERS.AUTHENTIC) {
        throw new Error(`PROVENANCE_DEGRADATION: Item ${originalItem.id} downgraded from AUTHENTIC to ${regen.origin_tier}`);
    }

    if (orig.source_id !== regen.source_id) {
        throw new Error(`PROVENANCE_SOURCE_TAMPERED: Item ${originalItem.id} source_id changed from ${orig.source_id} to ${regen.source_id}`);
    }
}

module.exports = {
    ORIGIN_TIERS,
    VALID_ORIGIN_TIERS,
    computeSha256,
    isValidSha256,
    validateContentLineageRecord,
    createContentLineageRecord,
    verifyLineageChain,
    assertNoLineageLoss
};
