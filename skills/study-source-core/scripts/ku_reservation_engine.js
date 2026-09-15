/**
 * StudySourceCore Knowledge Unit (KU) Reservation Engine (`ku_reservation_engine.js`)
 * 
 * Milestone 2 — Stream 1: Knowledge Reservation, Deduplication, and Subject Boundary.
 * 
 * Core Capabilities:
 * 1. Generates deterministic KU IDs: ku.<subject_slug>.<topic_slug>.<normalized_concept_slug>.
 * 2. Generates canonical semantic identities (normalized proposition string and digest).
 * 3. Manages reservation states: RESERVED, ACTIVE, SUPPRESSED, REJECTED.
 * 4. Binds KUs cryptographically to Evidence Pack chunk hashes and 11-field CLRs.
 * 5. Manages assigned target modalities: [ 'notes', 'basic', 'cloze', 'imageOcclusion', 'mindmap', 'slideDeck', 'procedural' ].
 * 6. Enforces fail-closed reservation integrity and pre-dispatch track allocation.
 */

const crypto = require('crypto');
const {
    computeSha256,
    isValidSha256,
    validateContentLineageRecord,
    createContentLineageRecord,
    ORIGIN_TIERS
} = require('./content_lineage_record');

/**
 * Reservation State Lifecycle Constants
 */
const RESERVATION_STATES = {
    RESERVED: 'RESERVED',
    ACTIVE: 'ACTIVE',
    SUPPRESSED: 'SUPPRESSED',
    REJECTED: 'REJECTED'
};

const VALID_RESERVATION_STATES = new Set(Object.values(RESERVATION_STATES));

/**
 * Canonical Target Modalities
 */
const TARGET_MODALITIES = [
    'notes',
    'basic',
    'cloze',
    'imageOcclusion',
    'mindmap',
    'slideDeck',
    'procedural'
];

const VALID_TARGET_MODALITIES = new Set(TARGET_MODALITIES);

/**
 * Modality normalization map
 */
const MODALITY_ALIASES = {
    'note': 'notes',
    'notes': 'notes',
    'obsidian': 'notes',
    'basic': 'basic',
    'flashcard': 'basic',
    'basic_anki': 'basic',
    'cloze': 'cloze',
    'cloze_anki': 'cloze',
    'image_occlusion': 'imageOcclusion',
    'imageocclusion': 'imageOcclusion',
    'imageOcclusion': 'imageOcclusion',
    'io': 'imageOcclusion',
    'mindmap': 'mindmap',
    'map': 'mindmap',
    'mermaid': 'mindmap',
    'slide_deck': 'slideDeck',
    'slidedeck': 'slideDeck',
    'slideDeck': 'slideDeck',
    'slides': 'slideDeck',
    'procedural': 'procedural',
    'studylab': 'procedural',
    'questions': 'procedural',
    'question_bank': 'procedural',
    'apkg': 'procedural'
};

/**
 * Sanitizes input string into a lowercase deterministic slug.
 */
function toSlug(str) {
    if (!str || typeof str !== 'string') return 'general';
    return str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
 * Normalizes modality name to canonical target modality.
 */
function normalizeModality(modality) {
    if (!modality || typeof modality !== 'string') return null;
    const cleaned = modality.trim().toLowerCase();
    if (MODALITY_ALIASES[cleaned]) {
        return MODALITY_ALIASES[cleaned];
    }
    if (VALID_TARGET_MODALITIES.has(modality)) {
        return modality;
    }
    return null;
}

/**
 * Generates deterministic KU identifier:
 * ku.<subject_slug>.<topic_slug>.<normalized_concept_slug>
 */
function generateDeterministicKuId(subject, topic, conceptName) {
    if (!subject || typeof subject !== 'string') {
        throw new Error('RESERVATION_PARAM_ERROR: subject is required for deterministic KU ID');
    }
    const subjectSlug = toSlug(subject);
    const topicSlug = toSlug(topic || 'general');
    const conceptSlug = toSlug(conceptName || 'concept');
    return `ku.${subjectSlug}.${topicSlug}.${conceptSlug}`;
}

/**
 * Validates deterministic KU ID format.
 */
function isValidKuId(kuId) {
    return typeof kuId === 'string' && /^ku\.[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+$/.test(kuId);
}

/**
 * Normalizes text for proposition comparison:
 * Strips markdown, punctuation, extra whitespace, normalizes Unicode NFKC.
 */
function normalizePropositionText(text) {
    if (!text || typeof text !== 'string') return '';
    let norm = text.normalize('NFKC').toLowerCase();
    // Strip cloze tags {{c1::content}} -> content
    norm = norm.replace(/\{\{c\d+::(.*?)\}\}/g, '$1');
    // Strip wikilinks [[link|text]] -> text, [[link]] -> link
    norm = norm.replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1');
    // Strip bold/italic markdown
    norm = norm.replace(/[*_~`#]+/g, ' ');
    // Strip HTML tags
    norm = norm.replace(/<[^>]+>/g, ' ');
    // Strip math delimiters $...$
    norm = norm.replace(/\$/g, '');
    // Replace non-alphanumeric (except core math operators +, -, *, /, =) with spaces
    norm = norm.replace(/[^\p{L}\p{N}+=/*-]/gu, ' ');
    // Collapse multiple spaces
    norm = norm.replace(/\s+/g, ' ').trim();
    return norm;
}

/**
 * Generates canonical semantic identity string for a proposition or KU.
 * Returns normalized canonical proposition string.
 */
function generateCanonicalSemanticIdentity(input) {
    if (!input) return '';

    if (typeof input === 'string') {
        return normalizePropositionText(input);
    }

    if (Array.isArray(input)) {
        return input
            .map(item => typeof item === 'string' ? normalizePropositionText(item) : generateCanonicalSemanticIdentity(item))
            .filter(Boolean)
            .sort()
            .join(' || ');
    }

    if (typeof input === 'object') {
        const parts = [];

        // Check explicit proposition array or string
        if (Array.isArray(input.propositions) && input.propositions.length > 0) {
            const propStr = input.propositions
                .map(p => normalizePropositionText(p))
                .filter(Boolean)
                .sort()
                .join(' ; ');
            if (propStr) parts.push(`prop:${propStr}`);
        } else if (typeof input.propositions === 'string' && input.propositions.trim()) {
            parts.push(`prop:${normalizePropositionText(input.propositions)}`);
        }

        // Definition
        if (input.definition && typeof input.definition === 'string') {
            const defNorm = normalizePropositionText(input.definition);
            if (defNorm) parts.push(`def:${defNorm}`);
        }

        // Question stem (for procedural items)
        if (input.stem && typeof input.stem === 'string') {
            const stemNorm = normalizePropositionText(input.stem);
            if (stemNorm) parts.push(`stem:${stemNorm}`);
        }

        // Formulas
        if (Array.isArray(input.formulas) && input.formulas.length > 0) {
            const formulaStr = input.formulas
                .map(f => typeof f === 'string' ? f : (f.latex || f.formula || f.name || ''))
                .map(f => normalizePropositionText(f))
                .filter(Boolean)
                .sort()
                .join(' ; ');
            if (formulaStr) parts.push(`form:${formulaStr}`);
        }

        // Title / Concept name fallback
        if (parts.length === 0 && (input.title || input.concept_name || input.name)) {
            const titleNorm = normalizePropositionText(input.title || input.concept_name || input.name);
            if (titleNorm) parts.push(`title:${titleNorm}`);
        }

        return parts.join(' || ');
    }

    return normalizePropositionText(String(input));
}

/**
 * Computes deterministic SHA-256 digest of canonical semantic identity.
 */
function computeSemanticDigest(semanticIdentity) {
    if (!semanticIdentity) return '';
    return computeSha256(semanticIdentity);
}

/**
 * In-Memory Knowledge Unit Reservation Registry
 */
class KuReservationRegistry {
    constructor(initialEntries = []) {
        this.reservations = new Map(); // kuId -> reservationRecord
        this.byChunkHash = new Map();   // chunkHash -> Set<kuId>
        this.byDigest = new Map();      // semanticDigest -> Set<kuId>
        this.byModality = new Map();    // modality -> Set<kuId>
        this.byState = new Map();       // state -> Set<kuId>

        for (const mod of TARGET_MODALITIES) {
            this.byModality.set(mod, new Set());
        }
        for (const st of Object.values(RESERVATION_STATES)) {
            this.byState.set(st, new Set());
        }

        if (Array.isArray(initialEntries)) {
            for (const entry of initialEntries) {
                this.register(entry);
            }
        }
    }

    get size() {
        return this.reservations.size;
    }

    has(kuId) {
        return this.reservations.has(kuId);
    }

    get(kuId) {
        return this.reservations.get(kuId) || null;
    }

    getAll() {
        return Array.from(this.reservations.values());
    }

    getByChunkHash(chunkHash) {
        const ids = this.byChunkHash.get(chunkHash);
        if (!ids) return [];
        return Array.from(ids).map(id => this.reservations.get(id)).filter(Boolean);
    }

    getBySemanticDigest(digest) {
        const ids = this.byDigest.get(digest);
        if (!ids) return [];
        return Array.from(ids).map(id => this.reservations.get(id)).filter(Boolean);
    }

    getByModality(modality) {
        const canonicalMod = normalizeModality(modality);
        if (!canonicalMod) return [];
        const ids = this.byModality.get(canonicalMod);
        if (!ids) return [];
        return Array.from(ids).map(id => this.reservations.get(id)).filter(Boolean);
    }

    getByState(state) {
        const ids = this.byState.get(state);
        if (!ids) return [];
        return Array.from(ids).map(id => this.reservations.get(id)).filter(Boolean);
    }

    register(reservation) {
        const kuId = reservation.ku_id;
        if (this.reservations.has(kuId)) {
            const existing = this.reservations.get(kuId);
            throw new Error(`RESERVATION_COLLISION_ERROR: KU "${kuId}" is already registered with state "${existing.state}"`);
        }

        this.reservations.set(kuId, reservation);

        // Index by chunk hash
        if (reservation.source_chunk_hash) {
            if (!this.byChunkHash.has(reservation.source_chunk_hash)) {
                this.byChunkHash.set(reservation.source_chunk_hash, new Set());
            }
            this.byChunkHash.get(reservation.source_chunk_hash).add(kuId);
        }

        // Index by semantic digest
        if (reservation.semantic_digest) {
            if (!this.byDigest.has(reservation.semantic_digest)) {
                this.byDigest.set(reservation.semantic_digest, new Set());
            }
            this.byDigest.get(reservation.semantic_digest).add(kuId);
        }

        // Index by modalities
        if (Array.isArray(reservation.target_modalities)) {
            for (const mod of reservation.target_modalities) {
                if (this.byModality.has(mod)) {
                    this.byModality.get(mod).add(kuId);
                }
            }
        }

        // Index by state
        if (this.byState.has(reservation.state)) {
            this.byState.get(reservation.state).add(kuId);
        }

        return reservation;
    }

    updateState(kuId, newState, reason = '') {
        const reservation = this.reservations.get(kuId);
        if (!reservation) {
            throw new Error(`RESERVATION_NOT_FOUND: Knowledge Unit "${kuId}" not found in registry`);
        }

        if (!VALID_RESERVATION_STATES.has(newState)) {
            throw new Error(`INVALID_RESERVATION_STATE: State "${newState}" is not valid. Must be one of: ${Array.from(VALID_RESERVATION_STATES).join(', ')}`);
        }

        const oldState = reservation.state;
        if (oldState === newState) return reservation;

        if (this.byState.has(oldState)) {
            this.byState.get(oldState).delete(kuId);
        }
        if (this.byState.has(newState)) {
            this.byState.get(newState).add(kuId);
        }

        reservation.state = newState;
        reservation.state_history.push({
            from_state: oldState,
            to_state: newState,
            reason: reason || 'state update',
            timestamp: new Date().toISOString()
        });

        return reservation;
    }

    release(kuId, reason = 'explicit release') {
        return this.updateState(kuId, RESERVATION_STATES.SUPPRESSED, reason);
    }

    toJSON() {
        return {
            schema_version: '1.0.0-ku-reservation',
            total_reservations: this.reservations.size,
            reservations: Array.from(this.reservations.values())
        };
    }
}

/**
 * Returns a new or populated KuReservationRegistry instance.
 */
function getReservationRegistry(initialEntries = []) {
    return new KuReservationRegistry(initialEntries);
}

/**
 * Validates a single KU reservation record against structural and provenance contracts.
 */
function validateReservationIntegrity(reservationOrRegistry) {
    const errors = [];

    if (!reservationOrRegistry) {
        return { isValid: false, errors: ['Reservation or registry input is null/undefined'] };
    }

    // If registry instance passed
    if (reservationOrRegistry instanceof KuReservationRegistry || (reservationOrRegistry.reservations instanceof Map)) {
        const all = reservationOrRegistry.getAll();
        for (const res of all) {
            const sub = validateReservationIntegrity(res);
            if (!sub.isValid) {
                errors.push(...sub.errors.map(e => `[${res.ku_id || 'unknown'}] ${e}`));
            }
        }
        return { isValid: errors.length === 0, errors };
    }

    const res = reservationOrRegistry;
    if (typeof res !== 'object') {
        return { isValid: false, errors: ['Reservation must be an object'] };
    }

    // 1. ku_id
    if (!res.ku_id || !isValidKuId(res.ku_id)) {
        errors.push(`Invalid or malformed ku_id: "${res.ku_id}". Must follow deterministic format ku.<subject>.<topic>.<concept>`);
    }

    // 2. state
    if (!res.state || !VALID_RESERVATION_STATES.has(res.state)) {
        errors.push(`Invalid reservation state: "${res.state}". Must be one of: ${Array.from(VALID_RESERVATION_STATES).join(', ')}`);
    }

    // 3. target_modalities
    if (!Array.isArray(res.target_modalities) || res.target_modalities.length === 0) {
        errors.push('target_modalities must be a non-empty array of valid modalities');
    } else {
        for (const mod of res.target_modalities) {
            if (!VALID_TARGET_MODALITIES.has(mod)) {
                errors.push(`Invalid target modality: "${mod}". Allowed: ${TARGET_MODALITIES.join(', ')}`);
            }
        }
    }

    // 4. source_chunk_hash
    if (!res.source_chunk_hash || !isValidSha256(res.source_chunk_hash)) {
        errors.push(`Invalid source_chunk_hash: "${res.source_chunk_hash}". Must be 64-char lowercase hexadecimal SHA-256`);
    }

    // 5. evidence_pack_id
    if (!res.evidence_pack_id || typeof res.evidence_pack_id !== 'string' || !res.evidence_pack_id.trim()) {
        errors.push('Missing or invalid evidence_pack_id');
    }

    // 6. canonical_semantic_identity
    if (!res.canonical_semantic_identity || typeof res.canonical_semantic_identity !== 'string' || !res.canonical_semantic_identity.trim()) {
        errors.push('Missing or empty canonical_semantic_identity');
    }

    // 7. semantic_digest
    if (!res.semantic_digest || !isValidSha256(res.semantic_digest)) {
        errors.push(`Invalid semantic_digest: "${res.semantic_digest}". Must be valid SHA-256`);
    }

    // 8. CLR Binding
    if (!res.clr || typeof res.clr !== 'object') {
        errors.push('Missing mandatory 11-field Content Lineage Record (CLR)');
    } else {
        const clrVal = validateContentLineageRecord(res.clr);
        if (!clrVal.isValid) {
            errors.push(`Incomplete or invalid CLR: ${clrVal.errors.join('; ')}`);
        } else {
            // Check cryptographic binding between reservation and CLR
            if (res.clr.source_chunk_hash !== res.source_chunk_hash) {
                errors.push(`CLR CHUNK HASH MISMATCH: CLR ${res.clr.source_chunk_hash} !== Reservation ${res.source_chunk_hash}`);
            }
            if (res.clr.ku_id !== res.ku_id) {
                errors.push(`CLR KU ID MISMATCH: CLR ${res.clr.ku_id} !== Reservation ${res.ku_id}`);
            }
            if (res.clr.evidence_pack_id !== res.evidence_pack_id) {
                errors.push(`CLR EVIDENCE PACK ID MISMATCH: CLR ${res.clr.evidence_pack_id} !== Reservation ${res.evidence_pack_id}`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Reserves a Knowledge Unit within the reservation engine.
 * 
 * Binds KU to Evidence Pack chunk hash, CLR, canonical semantic identity,
 * and target modalities. Fails closed if provenance or parameters are invalid.
 */
function reserveKnowledgeUnit(params, registry = null) {
    if (!params || typeof params !== 'object') {
        throw new Error('RESERVATION_INTEGRITY_ERROR: reserveKnowledgeUnit requires parameters object');
    }

    // 1. Resolve KU ID
    const kuId = params.ku_id || generateDeterministicKuId(
        params.subject,
        params.topic || params.chapter,
        params.concept_name || params.title
    );

    if (!isValidKuId(kuId)) {
        throw new Error(`RESERVATION_INTEGRITY_ERROR: Malformed or invalid ku_id: "${kuId}"`);
    }

    // 2. Canonical Semantic Identity & Digest
    const canonicalSemanticIdentity = params.canonical_semantic_identity ||
        generateCanonicalSemanticIdentity(params.propositions || params.definition || params.title || params.concept_name || params.stem);

    if (!canonicalSemanticIdentity || !canonicalSemanticIdentity.trim()) {
        throw new Error(`RESERVATION_INTEGRITY_ERROR: Could not generate canonical semantic identity for KU "${kuId}". Propositions or definition required.`);
    }

    const semanticDigest = params.semantic_digest || computeSemanticDigest(canonicalSemanticIdentity);

    // 3. Validate and normalize modalities
    const rawModalities = Array.isArray(params.target_modalities)
        ? params.target_modalities
        : (params.target_modality ? [params.target_modality] : ['notes']);

    const normalizedModalities = [];
    for (const raw of rawModalities) {
        const norm = normalizeModality(raw);
        if (!norm) {
            throw new Error(`RESERVATION_INTEGRITY_ERROR: Invalid target modality "${raw}". Allowed: ${TARGET_MODALITIES.join(', ')}`);
        }
        if (!normalizedModalities.includes(norm)) {
            normalizedModalities.push(norm);
        }
    }

    if (normalizedModalities.length === 0) {
        throw new Error(`RESERVATION_INTEGRITY_ERROR: Knowledge Unit "${kuId}" must have at least one valid target modality.`);
    }

    // 4. Validate source chunk hash
    const sourceChunkHash = params.source_chunk_hash;
    if (!sourceChunkHash || !isValidSha256(sourceChunkHash)) {
        throw new Error(`RESERVATION_INTEGRITY_ERROR: Missing or invalid source_chunk_hash: "${sourceChunkHash}"`);
    }

    // 5. Evidence Pack ID
    const evidencePackId = params.evidence_pack_id;
    if (!evidencePackId || typeof evidencePackId !== 'string' || !evidencePackId.trim()) {
        throw new Error(`RESERVATION_INTEGRITY_ERROR: Missing or empty evidence_pack_id for KU "${kuId}"`);
    }

    // 6. 11-Field Content Lineage Record (CLR)
    let clr = params.clr;
    if (!clr) {
        // Construct from provided params if complete
        clr = createContentLineageRecord({
            source_id: params.source_id || 'src.default',
            source_coordinates: params.source_coordinates || { section: params.topic || 'General' },
            source_chunk_hash: sourceChunkHash,
            evidence_pack_id: evidencePackId,
            ku_id: kuId,
            origin_tier: params.origin_tier || ORIGIN_TIERS.CURATED,
            generator_metadata: params.generator_metadata || {
                engine_version: '1.0.0-ku-reservation',
                timestamp: new Date().toISOString()
            },
            model_and_prompt: params.model_and_prompt || {
                model: 'studysourcecore-vnext-reservation',
                prompt_version: 'v1.0'
            },
            transformation_history: Array.isArray(params.transformation_history)
                ? [...params.transformation_history, 'ku_reservation']
                : ['ku_reservation'],
            renderer_target: params.renderer_target || `Notes/${params.chapter || params.topic || 'General'}_Notes.md#${toSlug(params.concept_name || 'concept')}`,
            certification_state: params.certification_state || { status: 'PENDING' }
        });
    }

    const clrValidation = validateContentLineageRecord(clr);
    if (!clrValidation.isValid) {
        throw new Error(`RESERVATION_INTEGRITY_ERROR: CLR validation failed for KU "${kuId}": ${clrValidation.errors.join('; ')}`);
    }

    if (clr.source_chunk_hash !== sourceChunkHash) {
        throw new Error(`RESERVATION_INTEGRITY_ERROR: CLR source_chunk_hash (${clr.source_chunk_hash}) !== reservation (${sourceChunkHash})`);
    }
    if (clr.ku_id !== kuId) {
        throw new Error(`RESERVATION_INTEGRITY_ERROR: CLR ku_id (${clr.ku_id}) !== reservation ku_id (${kuId})`);
    }
    if (clr.evidence_pack_id !== evidencePackId) {
        throw new Error(`RESERVATION_INTEGRITY_ERROR: CLR evidence_pack_id (${clr.evidence_pack_id}) !== reservation (${evidencePackId})`);
    }

    // 7. Initial State
    const state = params.state || RESERVATION_STATES.RESERVED;
    if (!VALID_RESERVATION_STATES.has(state)) {
        throw new Error(`RESERVATION_INTEGRITY_ERROR: Invalid initial reservation state: "${state}"`);
    }

    // 8. Construct Reservation Record
    const reservationRecord = {
        ku_id: kuId,
        subject: params.subject,
        topic: params.topic || params.chapter || 'general',
        concept_name: params.concept_name || params.title || 'concept',
        canonical_semantic_identity: canonicalSemanticIdentity,
        semantic_digest: semanticDigest,
        target_modalities: normalizedModalities,
        source_chunk_hash: sourceChunkHash,
        evidence_pack_id: evidencePackId,
        state,
        state_history: [
            {
                from_state: null,
                to_state: state,
                reason: params.reservation_reason || 'initial reservation',
                timestamp: new Date().toISOString()
            }
        ],
        metadata: {
            created_at: new Date().toISOString(),
            ku_type: params.ku_type || 'conceptual',
            origin_tier: clr.origin_tier,
            pedagogical_justification: params.pedagogical_justification || null
        },
        clr
    };

    // 9. Check registry if supplied
    if (registry) {
        if (registry.has(kuId)) {
            const existing = registry.get(kuId);
            throw new Error(`RESERVATION_COLLISION_ERROR: Knowledge Unit "${kuId}" is already reserved with state "${existing.state}"`);
        }
        registry.register(reservationRecord);
    }

    return reservationRecord;
}

/**
 * Releases or suppresses a Knowledge Unit reservation.
 */
function releaseReservation(kuIdOrParams, registry, reason = 'explicit release') {
    if (!registry) {
        throw new Error('RESERVATION_INTEGRITY_ERROR: releaseReservation requires a registry instance');
    }

    const kuId = typeof kuIdOrParams === 'string' ? kuIdOrParams : (kuIdOrParams && kuIdOrParams.ku_id);
    if (!kuId) {
        throw new Error('RESERVATION_INTEGRITY_ERROR: ku_id is required to release reservation');
    }

    return registry.release(kuId, reason);
}

module.exports = {
    RESERVATION_STATES,
    VALID_RESERVATION_STATES,
    TARGET_MODALITIES,
    VALID_TARGET_MODALITIES,
    toSlug,
    normalizeModality,
    generateDeterministicKuId,
    isValidKuId,
    normalizePropositionText,
    generateCanonicalSemanticIdentity,
    computeSemanticDigest,
    KuReservationRegistry,
    getReservationRegistry,
    validateReservationIntegrity,
    reserveKnowledgeUnit,
    releaseReservation
};
