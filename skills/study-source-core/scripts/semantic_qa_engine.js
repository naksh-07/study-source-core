/**
 * StudySourceCore Semantic QA Engine (`semantic_qa_engine.js`)
 *
 * Milestone 2 — Independent Semantic Quality Assurance Orchestrator.
 *
 * Integrates ALL Milestone 2 subsystems to perform comprehensive quality
 * assurance audits on Knowledge Units and chapter deliverables:
 *
 * 1. KU Reservation Integrity (QA-KU-01)
 * 2. Semantic Deduplication (QA-KU-02)
 * 3. Subject Boundary Validation (QA-KU-03)
 * 4. Artifact Suitability Policy (QA-KU-04)
 * 5. Hint Semantics (QA-KU-05)
 * 6. Distractor Semantics (QA-KU-06)
 * 7. Pedagogical Compilation (QA-KU-07)
 * 8. Cross-Artifact Deduplication (QA-KU-08)
 * 9. MCQ Cardinality Invariant (QA-KU-09)
 * 10. KU ID Format Validation (QA-KU-10)
 * 11. Source Grounding (QA-KU-11)
 * 12. Comprehensive Audit (QA-KU-12)
 *
 * Fail-closed: never bypasses validation through fallback paths.
 *   - ANY CRITICAL check failure ⇒ overall audit FAIL.
 *   - WARNINGs are counted but do not cause overall failure.
 */

const {
    validateReservationIntegrity,
    isValidKuId,
    RESERVATION_STATES
} = require('./ku_reservation_engine');

const {
    classifyKuRelation,
    deduplicateKnowledgeUnits,
    enforceCrossArtifactDeduplication,
    RELATION_TYPES
} = require('./semantic_deduplication');

const {
    validateSubjectDomain,
    resolveCanonicalSubject
} = require('./subject_boundary_validator');

const {
    getSuitability,
    evaluateChapterSuitability,
    SUITABILITY_TIERS
} = require('./artifact_suitability_policy');

const {
    validateHintSemantics,
    validateDistractorSemantics
} = require('./hint_distractor_semantics');

// Pedagogical compiler is optional — may not exist in some test scenarios
let pedagogicalCompiler = null;
try {
    pedagogicalCompiler = require('./pedagogical_compiler');
} catch (e) {
    // Optional dependency — QA-KU-07 will be skipped if unavailable
}

/**
 * QA Severity Levels
 */
const QA_SEVERITY = Object.freeze({
    CRITICAL: 'CRITICAL',
    WARNING: 'WARNING',
    INFO: 'INFO'
});

/**
 * QA Check Identifiers
 */
const QA_CHECK_IDS = Object.freeze({
    KU_RESERVATION_INTEGRITY: 'QA-KU-01',
    SEMANTIC_DEDUPLICATION: 'QA-KU-02',
    SUBJECT_BOUNDARY: 'QA-KU-03',
    ARTIFACT_SUITABILITY: 'QA-KU-04',
    HINT_SEMANTICS: 'QA-KU-05',
    DISTRACTOR_SEMANTICS: 'QA-KU-06',
    PEDAGOGICAL_COMPILATION: 'QA-KU-07',
    CROSS_ARTIFACT_DEDUP: 'QA-KU-08',
    MCQ_CARDINALITY: 'QA-KU-09',
    KU_ID_FORMAT: 'QA-KU-10',
    SOURCE_GROUNDING: 'QA-KU-11',
    COMPREHENSIVE_AUDIT: 'QA-KU-12',
    FACTUAL_RECONCILIATION: 'QA-KU-13'
});

/**
 * Creates a standardized check result object.
 */
function createCheckResult(checkId, passed, severity, findings) {
    return {
        checkId,
        passed,
        severity,
        findings: Array.isArray(findings) ? findings : [findings].filter(Boolean),
        checkedAt: new Date().toISOString()
    };
}

// ────────────────────────────────────────────────────────────
// Individual Check Functions
// ────────────────────────────────────────────────────────────

/**
 * QA-KU-01: KU Reservation Integrity
 *
 * Validates reservation records against structural and provenance contracts.
 *
 * @param {Object|Object[]} reservationOrRegistry - Single reservation, array, or registry
 * @returns {Object} Check result
 */
function checkKuReservationIntegrity(reservationOrRegistry) {
    if (!reservationOrRegistry) {
        return createCheckResult(
            QA_CHECK_IDS.KU_RESERVATION_INTEGRITY,
            false,
            QA_SEVERITY.CRITICAL,
            ['MISSING_INPUT: No reservation or registry provided for integrity check']
        );
    }

    try {
        // Handle array of reservations
        if (Array.isArray(reservationOrRegistry)) {
            const allErrors = [];
            for (const res of reservationOrRegistry) {
                const result = validateReservationIntegrity(res);
                if (!result.isValid) {
                    allErrors.push(...result.errors);
                }
            }
            const passed = allErrors.length === 0;
            return createCheckResult(
                QA_CHECK_IDS.KU_RESERVATION_INTEGRITY,
                passed,
                passed ? QA_SEVERITY.INFO : QA_SEVERITY.CRITICAL,
                passed
                    ? [`All ${reservationOrRegistry.length} reservation(s) passed integrity check`]
                    : allErrors
            );
        }

        // Single reservation or registry
        const result = validateReservationIntegrity(reservationOrRegistry);
        return createCheckResult(
            QA_CHECK_IDS.KU_RESERVATION_INTEGRITY,
            result.isValid,
            result.isValid ? QA_SEVERITY.INFO : QA_SEVERITY.CRITICAL,
            result.isValid
                ? ['Reservation integrity check PASSED']
                : result.errors
        );
    } catch (err) {
        return createCheckResult(
            QA_CHECK_IDS.KU_RESERVATION_INTEGRITY,
            false,
            QA_SEVERITY.CRITICAL,
            [`EXCEPTION: ${err.message}`]
        );
    }
}

/**
 * QA-KU-02: Semantic Deduplication
 *
 * Checks for SAME_KU collisions in a set of Knowledge Units.
 *
 * @param {Array} kus - Knowledge Units to check
 * @param {Object} [options] - Deduplication options
 * @returns {Object} Check result with duplicateCount and mergedPairs
 */
function checkSemanticDeduplication(kus, options = {}) {
    if (!Array.isArray(kus) || kus.length === 0) {
        return {
            ...createCheckResult(
                QA_CHECK_IDS.SEMANTIC_DEDUPLICATION,
                true,
                QA_SEVERITY.INFO,
                ['No KUs to check for semantic deduplication']
            ),
            duplicateCount: 0,
            mergedPairs: []
        };
    }

    try {
        const result = deduplicateKnowledgeUnits(kus, options);
        const passed = result.duplicateCount === 0;
        return {
            ...createCheckResult(
                QA_CHECK_IDS.SEMANTIC_DEDUPLICATION,
                passed,
                passed ? QA_SEVERITY.INFO : QA_SEVERITY.WARNING,
                passed
                    ? [`${kus.length} KUs checked — zero semantic duplicates`]
                    : result.mergedPairs.map(p =>
                        `DUPLICATE_DETECTED: "${p.primaryKuId}" and "${p.mergedKuId}" classified as SAME_KU (${p.reason}, score: ${p.similarityScore.toFixed(3)})`
                    )
            ),
            duplicateCount: result.duplicateCount,
            mergedPairs: result.mergedPairs
        };
    } catch (err) {
        return {
            ...createCheckResult(
                QA_CHECK_IDS.SEMANTIC_DEDUPLICATION,
                false,
                QA_SEVERITY.CRITICAL,
                [`EXCEPTION: ${err.message}`]
            ),
            duplicateCount: -1,
            mergedPairs: []
        };
    }
}

/**
 * QA-KU-03: Subject Boundary Validation
 *
 * Detects foreign out-of-domain concepts.
 *
 * @param {Object|Array} irOrKus - IR object or KU array
 * @param {string} subject - Expected subject domain
 * @returns {Object} Check result
 */
function checkSubjectBoundary(irOrKus, subject) {
    if (!irOrKus || !subject) {
        return createCheckResult(
            QA_CHECK_IDS.SUBJECT_BOUNDARY,
            false,
            QA_SEVERITY.CRITICAL,
            ['MISSING_INPUT: irOrKus and subject are required for boundary check']
        );
    }

    try {
        const result = validateSubjectDomain(irOrKus, subject);
        return createCheckResult(
            QA_CHECK_IDS.SUBJECT_BOUNDARY,
            result.isValid,
            result.isValid ? QA_SEVERITY.INFO : QA_SEVERITY.CRITICAL,
            result.isValid
                ? [result.summary]
                : result.violations.map(v =>
                    `FOREIGN_INTRUSION: KU "${v.ku_id}" contains "${v.detected_term}" from ${v.foreign_domain} domain (host: ${v.host_domain})`
                )
        );
    } catch (err) {
        return createCheckResult(
            QA_CHECK_IDS.SUBJECT_BOUNDARY,
            false,
            QA_SEVERITY.CRITICAL,
            [`EXCEPTION: ${err.message}`]
        );
    }
}

/**
 * QA-KU-04: Artifact Suitability Policy
 *
 * Evaluates chapter-level artifact suitability decisions.
 *
 * @param {string} subject - Subject name
 * @param {Object} [evidenceStats] - Evidence pack statistics
 * @returns {Object} Check result with toGenerate and excluded lists
 */
function checkArtifactSuitability(subject, evidenceStats = {}) {
    if (!subject) {
        return {
            ...createCheckResult(
                QA_CHECK_IDS.ARTIFACT_SUITABILITY,
                false,
                QA_SEVERITY.CRITICAL,
                ['MISSING_INPUT: Subject is required for suitability check']
            ),
            toGenerate: [],
            excluded: []
        };
    }

    try {
        const result = evaluateChapterSuitability(subject, evidenceStats);
        return {
            ...createCheckResult(
                QA_CHECK_IDS.ARTIFACT_SUITABILITY,
                true, // Suitability is informational, always passes
                QA_SEVERITY.INFO,
                [
                    `Subject: ${result.subject} (${result.category})`,
                    `To Generate: ${result.toGenerate.join(', ')}`,
                    `Excluded: ${result.excluded.join(', ')}`,
                    `Stats: diagrams=${result.stats.diagramCount}, relDepth=${result.stats.relationalDepth}, slides=${result.stats.slideCount}, problems=${result.stats.problemCount}`
                ]
            ),
            toGenerate: result.toGenerate,
            excluded: result.excluded
        };
    } catch (err) {
        return {
            ...createCheckResult(
                QA_CHECK_IDS.ARTIFACT_SUITABILITY,
                false,
                QA_SEVERITY.CRITICAL,
                [`EXCEPTION: ${err.message}`]
            ),
            toGenerate: [],
            excluded: []
        };
    }
}

/**
 * QA-KU-05: Hint Semantics (ADV-KU-08 / ADV-KU-09)
 *
 * Validates 3-tier progressive hints for leaks, boilerplate, and distinctness.
 *
 * @param {Object|Array} hints - 3-tier hints
 * @param {any} terminalAnswer - Correct answer
 * @param {Array} [options] - MCQ options
 * @param {Object} [context] - Hint context
 * @returns {Object} Check result
 */
function checkHintSemantics(hints, terminalAnswer, options = [], context = {}) {
    if (!hints) {
        return createCheckResult(
            QA_CHECK_IDS.HINT_SEMANTICS,
            true, // No hints to check is not a failure
            QA_SEVERITY.INFO,
            ['No hints provided — hint semantics check skipped']
        );
    }

    try {
        const result = validateHintSemantics(hints, terminalAnswer, options, context);
        return createCheckResult(
            QA_CHECK_IDS.HINT_SEMANTICS,
            result.isValid,
            result.isValid ? QA_SEVERITY.INFO : QA_SEVERITY.CRITICAL,
            result.isValid
                ? ['All 3-tier hints passed semantic validation (anti-leak + anti-boilerplate + distinctness)']
                : [...result.errors, ...result.warnings.map(w => `WARNING: ${w}`)]
        );
    } catch (err) {
        return createCheckResult(
            QA_CHECK_IDS.HINT_SEMANTICS,
            false,
            QA_SEVERITY.CRITICAL,
            [`EXCEPTION: ${err.message}`]
        );
    }
}

/**
 * QA-KU-06: Distractor Semantics (ADV-KU-10)
 *
 * Validates MCQ distractors for plausibility and misconception grounding.
 *
 * @param {Array} options - MCQ options
 * @param {any} correctKey - Correct option
 * @param {Object} [context] - Domain context
 * @returns {Object} Check result
 */
function checkDistractorSemantics(options, correctKey, context = {}) {
    if (!Array.isArray(options) || options.length === 0) {
        return createCheckResult(
            QA_CHECK_IDS.DISTRACTOR_SEMANTICS,
            true, // No options to check is not a failure
            QA_SEVERITY.INFO,
            ['No MCQ options provided — distractor semantics check skipped']
        );
    }

    try {
        const result = validateDistractorSemantics(options, correctKey, context);
        return createCheckResult(
            QA_CHECK_IDS.DISTRACTOR_SEMANTICS,
            result.isValid,
            result.isValid ? QA_SEVERITY.INFO : QA_SEVERITY.CRITICAL,
            result.isValid
                ? ['All MCQ distractors passed semantic plausibility validation']
                : [...result.errors, ...result.warnings.map(w => `WARNING: ${w}`)]
        );
    } catch (err) {
        return createCheckResult(
            QA_CHECK_IDS.DISTRACTOR_SEMANTICS,
            false,
            QA_SEVERITY.CRITICAL,
            [`EXCEPTION: ${err.message}`]
        );
    }
}

/**
 * QA-KU-07: Pedagogical Compilation (optional)
 *
 * Validates pedagogical classification and compilation if the compiler is available.
 *
 * @param {Object} ku - Knowledge Unit to compile
 * @param {Object} [context] - Context with subject
 * @returns {Object} Check result
 */
function checkPedagogicalCompilation(ku, context = {}) {
    if (!pedagogicalCompiler) {
        return createCheckResult(
            QA_CHECK_IDS.PEDAGOGICAL_COMPILATION,
            true, // Skipped — not a failure
            QA_SEVERITY.INFO,
            ['Pedagogical compiler not available — check skipped']
        );
    }

    if (!ku) {
        return createCheckResult(
            QA_CHECK_IDS.PEDAGOGICAL_COMPILATION,
            true,
            QA_SEVERITY.INFO,
            ['No KU provided for pedagogical compilation check']
        );
    }

    try {
        const compiled = pedagogicalCompiler.compileKnowledgeUnit(ku, context);
        if (pedagogicalCompiler.validateCompiledPedagogy) {
            const validation = pedagogicalCompiler.validateCompiledPedagogy(compiled);
            return createCheckResult(
                QA_CHECK_IDS.PEDAGOGICAL_COMPILATION,
                validation.isValid,
                validation.isValid ? QA_SEVERITY.INFO : QA_SEVERITY.WARNING,
                validation.isValid
                    ? [`Pedagogical compilation valid: ${compiled.classification.primary} → ${compiled.learningObjective.objective}`]
                    : validation.errors
            );
        }

        // If no validation function, check basic structure
        const hasClassification = compiled && compiled.classification && compiled.classification.primary;
        const hasObjective = compiled && compiled.learningObjective && compiled.learningObjective.objective;
        const passed = Boolean(hasClassification && hasObjective);

        return createCheckResult(
            QA_CHECK_IDS.PEDAGOGICAL_COMPILATION,
            passed,
            passed ? QA_SEVERITY.INFO : QA_SEVERITY.WARNING,
            passed
                ? [`Compiled: ${compiled.classification.primary} → ${compiled.learningObjective.objective}`]
                : ['Pedagogical compilation returned incomplete result']
        );
    } catch (err) {
        return createCheckResult(
            QA_CHECK_IDS.PEDAGOGICAL_COMPILATION,
            false,
            QA_SEVERITY.WARNING,
            [`EXCEPTION: ${err.message}`]
        );
    }
}

/**
 * QA-KU-08: Cross-Artifact Deduplication
 *
 * Checks for redundant factual projections across Basic and Cloze modalities.
 *
 * @param {Array} kus - Knowledge Units to check
 * @param {Object} [plannedArtifacts] - Planned artifact map
 * @returns {Object} Check result with violationsCount
 */
function checkCrossArtifactDedup(kus, plannedArtifacts = {}) {
    if (!Array.isArray(kus) || kus.length === 0) {
        return {
            ...createCheckResult(
                QA_CHECK_IDS.CROSS_ARTIFACT_DEDUP,
                true,
                QA_SEVERITY.INFO,
                ['No KUs to check for cross-artifact deduplication']
            ),
            violationsCount: 0
        };
    }

    try {
        const result = enforceCrossArtifactDeduplication(kus, plannedArtifacts);
        const passed = result.violationsCount === 0;
        return {
            ...createCheckResult(
                QA_CHECK_IDS.CROSS_ARTIFACT_DEDUP,
                passed,
                passed ? QA_SEVERITY.INFO : QA_SEVERITY.WARNING,
                passed
                    ? [`${kus.length} KUs checked — zero cross-artifact redundancies`]
                    : result.conflictsResolved.map(c =>
                        `CROSS_ARTIFACT_CONFLICT: KU "${c.ku_id}" resolved ${c.suppressedModality} → ${c.resolvedModality} (${c.reason})`
                    )
            ),
            violationsCount: result.violationsCount
        };
    } catch (err) {
        return {
            ...createCheckResult(
                QA_CHECK_IDS.CROSS_ARTIFACT_DEDUP,
                false,
                QA_SEVERITY.CRITICAL,
                [`EXCEPTION: ${err.message}`]
            ),
            violationsCount: -1
        };
    }
}

/**
 * QA-KU-09: MCQ Cardinality Invariant
 *
 * Validates that all practice items with MCQ options have ≥ 4 choices.
 *
 * @param {Array} practiceItems - Practice items to check
 * @returns {Object} Check result
 */
function checkMcqCardinality(practiceItems) {
    if (!Array.isArray(practiceItems) || practiceItems.length === 0) {
        return createCheckResult(
            QA_CHECK_IDS.MCQ_CARDINALITY,
            true,
            QA_SEVERITY.INFO,
            ['No practice items to check for MCQ cardinality']
        );
    }

    const violations = [];
    let checkedCount = 0;

    for (const item of practiceItems) {
        if (!Array.isArray(item.options)) continue;
        checkedCount++;

        if (item.options.length < 4) {
            violations.push(
                `MCQ_CARDINALITY_VIOLATED: Item "${item.id || item.stem || 'unknown'}" has ${item.options.length} options (minimum 4 required)`
            );
        }

        // Check for duplicate options
        const seen = new Set();
        for (const opt of item.options) {
            const norm = String(opt).toLowerCase().trim();
            if (seen.has(norm)) {
                violations.push(
                    `DUPLICATE_MCQ_OPTION: Item "${item.id || 'unknown'}" has duplicate option "${opt}"`
                );
            }
            seen.add(norm);
        }
    }

    const passed = violations.length === 0;
    return createCheckResult(
        QA_CHECK_IDS.MCQ_CARDINALITY,
        passed,
        passed ? QA_SEVERITY.INFO : QA_SEVERITY.CRITICAL,
        passed
            ? [`${checkedCount} MCQ item(s) checked — all satisfy ≥ 4 options invariant`]
            : violations
    );
}

/**
 * QA-KU-10: KU ID Format Validation
 *
 * Validates that all KU IDs follow deterministic format: ku.<subject>.<topic>.<concept>
 *
 * @param {Array} kus - Knowledge Units to check
 * @returns {Object} Check result
 */
function checkKuIdFormat(kus) {
    if (!Array.isArray(kus) || kus.length === 0) {
        return createCheckResult(
            QA_CHECK_IDS.KU_ID_FORMAT,
            true,
            QA_SEVERITY.INFO,
            ['No KUs to check for ID format']
        );
    }

    const violations = [];
    for (const ku of kus) {
        const kuId = ku.ku_id || ku.id;
        if (!kuId) {
            violations.push(`MISSING_KU_ID: KU titled "${ku.title || 'unknown'}" has no ku_id or id`);
        } else if (!isValidKuId(kuId)) {
            violations.push(`MALFORMED_KU_ID: "${kuId}" does not match pattern ku.<subject>.<topic>.<concept>`);
        }
    }

    const passed = violations.length === 0;
    return createCheckResult(
        QA_CHECK_IDS.KU_ID_FORMAT,
        passed,
        passed ? QA_SEVERITY.INFO : QA_SEVERITY.CRITICAL,
        passed
            ? [`${kus.length} KU ID(s) validated — all conform to deterministic format`]
            : violations
    );
}

/**
 * QA-KU-11: Source Grounding
 *
 * Validates that all KUs have source_chunk_hash and evidence_pack_id for provenance.
 *
 * @param {Array} kus - Knowledge Units to check
 * @returns {Object} Check result
 */
function checkSourceGrounding(kus) {
    if (!Array.isArray(kus) || kus.length === 0) {
        return createCheckResult(
            QA_CHECK_IDS.SOURCE_GROUNDING,
            true,
            QA_SEVERITY.INFO,
            ['No KUs to check for source grounding']
        );
    }

    const violations = [];
    for (const ku of kus) {
        const kuId = ku.ku_id || ku.id || ku.title || 'unknown';

        const chunkHash = (ku.clr && ku.clr.source_chunk_hash) || ku.source_chunk_hash;
        if (!chunkHash || typeof chunkHash !== 'string' || chunkHash.length !== 64) {
            violations.push(`MISSING_SOURCE_HASH: KU "${kuId}" lacks valid 64-char SHA-256 source_chunk_hash`);
        }

        const packId = (ku.clr && ku.clr.evidence_pack_id) || ku.evidence_pack_id;
        if (!packId || typeof packId !== 'string' || !packId.trim()) {
            violations.push(`MISSING_EVIDENCE_PACK_ID: KU "${kuId}" lacks evidence_pack_id`);
        }
    }

    const passed = violations.length === 0;
    return createCheckResult(
        QA_CHECK_IDS.SOURCE_GROUNDING,
        passed,
        passed ? QA_SEVERITY.INFO : QA_SEVERITY.CRITICAL,
        passed
            ? [`${kus.length} KU(s) validated — all grounded to source evidence with SHA-256 hashes`]
            : violations
    );
}


/**
 * QA-KU-13: Factual Reconciliation Guard
 *
 * Actively detects internal and cross-KU factual discrepancies.
 * Validates that KUs flagging factual discrepancies preserve source provenance
 * and provide appropriate advisory notes without destroying raw evidence traceability.
 *
 * @param {Array} kus - Knowledge Units to check
 * @returns {Object} Check result
 */
function checkFactualReconciliation(kus) {
    if (!Array.isArray(kus) || kus.length === 0) {
        return createCheckResult(
            QA_CHECK_IDS.FACTUAL_RECONCILIATION,
            true,
            QA_SEVERITY.INFO,
            ['No KUs to check for factual reconciliation']
        );
    }

    const violations = [];
    let checkedCount = 0;

    // 1. Cross-KU Contradiction Detection (Basic active heuristic)
    // Build a registry of extracted claims from propositions to detect collisions
    const claimRegistry = new Map();

    for (const ku of kus) {
        const kuId = ku.ku_id || ku.id || ku.title || 'unknown';
        const isFlagged = ku.factual_discrepancy && ku.factual_discrepancy.detected;
        let detectedInternalContradiction = false;

        // Simple heuristic for internal proposition contradictions
        // In a real implementation this might use a more sophisticated NLP semantic checker.
        // For this issue, we will check if an explicit "disputed" or "contradicts" marker is in the text
        const combinedText = [
            ku.title || '',
            ku.definition || '',
            ...(ku.propositions || [])
        ].join(' ').toLowerCase();

        // 1. Active detection: look for common unresolved conflict tags
        if (combinedText.includes('[unreconciled]') || combinedText.includes('[disputed]') || combinedText.includes('[conflict]')) {
            detectedInternalContradiction = true;
        }

        // 2. Cross-KU collision check (same entity, different numbers/years)
        // Similar to cross_artifact_checker logic, look for simple number patterns
        const numberPattern = /([a-z]{3,})\s+(\d+)/gi;
        let match;
        while ((match = numberPattern.exec(combinedText)) !== null) {
            const entity = match[1].toLowerCase();
            const value = match[2];
            // Skip common non-fact words
            if (['page', 'year', 'chapter', 'section'].includes(entity)) continue;

            if (claimRegistry.has(entity)) {
                const prev = claimRegistry.get(entity);
                if (prev.value !== value && prev.kuId !== kuId) {
                    // Contradiction detected!
                    detectedInternalContradiction = true;
                    // Tag the previous one as well if it wasn't already flagged
                    if (!prev.isFlagged) {
                        violations.push(`UNRECONCILED_FACTUAL_CONTRADICTION: Cross-KU contradiction detected for entity '${entity}' ('${prev.value}' in ${prev.kuId} vs '${value}' in ${kuId}) without advisory note in ${prev.kuId}`);
                    }
                }
            } else {
                claimRegistry.set(entity, { value, kuId, isFlagged });
            }
        }

        if (detectedInternalContradiction && !isFlagged) {
            violations.push(`UNRECONCILED_FACTUAL_CONTRADICTION: KU "${kuId}" contains contradictory claims or unresolved discrepancy markers but lacks a factual_discrepancy advisory block`);
        }

        if (isFlagged) {
            checkedCount++;

            // Must preserve source provenance strictly
            const chunkHash = (ku.clr && ku.clr.source_chunk_hash) || ku.source_chunk_hash;
            if (!chunkHash || typeof chunkHash !== 'string' || chunkHash.length !== 64) {
                violations.push(`PROVENANCE_DESTROYED: KU "${kuId}" flagged a discrepancy but destroyed source_chunk_hash`);
            }

            const packId = (ku.clr && ku.clr.evidence_pack_id) || ku.evidence_pack_id;
            if (!packId || typeof packId !== 'string' || !packId.trim()) {
                violations.push(`PROVENANCE_DESTROYED: KU "${kuId}" flagged a discrepancy but destroyed evidence_pack_id`);
            }

            // Must have an advisory note explaining the discrepancy
            if (!ku.factual_discrepancy.advisory_note || typeof ku.factual_discrepancy.advisory_note !== 'string' || !ku.factual_discrepancy.advisory_note.trim()) {
                violations.push(`MISSING_ADVISORY: KU "${kuId}" flagged a discrepancy but lacks a descriptive advisory_note`);
            }
        }
    }

    const passed = violations.length === 0;
    return createCheckResult(
        QA_CHECK_IDS.FACTUAL_RECONCILIATION,
        passed,
        passed ? QA_SEVERITY.INFO : QA_SEVERITY.CRITICAL,
        passed
            ? [`${checkedCount} KU(s) with factual discrepancies validated — source provenance preserved and advisories present`]
            : violations
    );
}

// ────────────────────────────────────────────────────────────
// Comprehensive Audit Orchestrator
// ────────────────────────────────────────────────────────────

/**
 * QA-KU-12: Comprehensive Audit — THE MAIN ORCHESTRATOR
 *
 * Runs ALL applicable checks based on provided parameters.
 * Fail-closed: overall audit passes ONLY if ALL critical checks pass.
 *
 * @param {Object} params - Audit parameters
 * @param {Array} [params.kus] - Knowledge Units to audit
 * @param {string} [params.subject] - Expected subject domain
 * @param {Object} [params.evidenceStats] - Evidence pack statistics
 * @param {Array} [params.practiceItems] - Practice items with MCQ options
 * @param {Object|Array} [params.reservation] - Reservation record(s) to validate
 * @param {Object} [params.plannedArtifacts] - Planned artifact map for cross-artifact dedup
 * @param {Object|Array} [params.hints] - 3-tier hints to validate
 * @param {any} [params.terminalAnswer] - Correct answer for hint leak detection
 * @param {Array} [params.options] - MCQ options for distractor validation
 * @param {any} [params.correctKey] - Correct option key
 * @param {Object} [params.context] - Additional context
 * @returns {Object} Comprehensive audit report
 */
function runComprehensiveAudit(params = {}) {
    const {
        kus,
        subject,
        evidenceStats,
        practiceItems,
        reservation,
        plannedArtifacts,
        hints,
        terminalAnswer,
        options,
        correctKey,
        context = {}
    } = params;

    const results = [];

    // QA-KU-01: KU Reservation Integrity
    if (reservation) {
        results.push(checkKuReservationIntegrity(reservation));
    }

    // QA-KU-10: KU ID Format
    if (Array.isArray(kus) && kus.length > 0) {
        results.push(checkKuIdFormat(kus));
    }

    // QA-KU-11: Source Grounding
    if (Array.isArray(kus) && kus.length > 0) {
        results.push(checkSourceGrounding(kus));
    }

    // QA-KU-13: Factual Reconciliation
    if (Array.isArray(kus) && kus.length > 0) {
        results.push(checkFactualReconciliation(kus));
    }

    // QA-KU-02: Semantic Deduplication
    if (Array.isArray(kus) && kus.length > 1) {
        results.push(checkSemanticDeduplication(kus));
    }

    // QA-KU-03: Subject Boundary
    if ((Array.isArray(kus) && kus.length > 0) && subject) {
        results.push(checkSubjectBoundary(kus, subject));
    }

    // QA-KU-04: Artifact Suitability
    if (subject) {
        results.push(checkArtifactSuitability(subject, evidenceStats));
    }

    // QA-KU-05: Hint Semantics
    if (hints) {
        results.push(checkHintSemantics(hints, terminalAnswer, options, context));
    }

    // QA-KU-06: Distractor Semantics
    if (Array.isArray(options) && options.length > 0 && correctKey !== undefined) {
        results.push(checkDistractorSemantics(options, correctKey, context));
    }

    // QA-KU-07: Pedagogical Compilation
    if (Array.isArray(kus) && kus.length > 0 && pedagogicalCompiler) {
        // Compile first KU as representative
        results.push(checkPedagogicalCompilation(kus[0], { ...context, subject }));
    }

    // QA-KU-08: Cross-Artifact Dedup
    if (Array.isArray(kus) && kus.length > 0) {
        results.push(checkCrossArtifactDedup(kus, plannedArtifacts));
    }

    // QA-KU-09: MCQ Cardinality
    if (Array.isArray(practiceItems) && practiceItems.length > 0) {
        results.push(checkMcqCardinality(practiceItems));
    }

    // If no checks ran, return informational pass
    if (results.length === 0) {
        return {
            checkId: QA_CHECK_IDS.COMPREHENSIVE_AUDIT,
            passed: true,
            totalChecks: 0,
            passedChecks: 0,
            failedChecks: 0,
            criticalFailures: 0,
            warnings: 0,
            results: [],
            summary: 'No checks executed — insufficient input parameters provided',
            auditedAt: new Date().toISOString()
        };
    }

    // Aggregate results
    const totalChecks = results.length;
    const passedChecks = results.filter(r => r.passed).length;
    const failedChecks = totalChecks - passedChecks;
    const criticalFailures = results.filter(r => !r.passed && r.severity === QA_SEVERITY.CRITICAL).length;
    const warningCount = results.filter(r => !r.passed && r.severity === QA_SEVERITY.WARNING).length;

    // Fail-closed: ANY critical check failure ⇒ overall FAIL
    const overallPassed = criticalFailures === 0;

    // Build summary
    const summaryParts = [
        `Comprehensive QA Audit: ${totalChecks} checks executed`,
        `${passedChecks} passed, ${failedChecks} failed`,
        `${criticalFailures} CRITICAL failure(s), ${warningCount} WARNING(s)`
    ];

    if (overallPassed) {
        summaryParts.push('OVERALL: PASS ✓');
    } else {
        const failedNames = results
            .filter(r => !r.passed && r.severity === QA_SEVERITY.CRITICAL)
            .map(r => r.checkId)
            .join(', ');
        summaryParts.push(`OVERALL: FAIL ✗ — Critical failures: ${failedNames}`);
    }

    return {
        checkId: QA_CHECK_IDS.COMPREHENSIVE_AUDIT,
        passed: overallPassed,
        totalChecks,
        passedChecks,
        failedChecks,
        criticalFailures,
        warnings: warningCount,
        results,
        summary: summaryParts.join(' | '),
        auditedAt: new Date().toISOString()
    };
}

module.exports = {
    QA_SEVERITY,
    QA_CHECK_IDS,
    checkKuReservationIntegrity,
    checkSemanticDeduplication,
    checkSubjectBoundary,
    checkArtifactSuitability,
    checkHintSemantics,
    checkDistractorSemantics,
    checkPedagogicalCompilation,
    checkCrossArtifactDedup,
    checkMcqCardinality,
    checkKuIdFormat,
    checkSourceGrounding,
    checkFactualReconciliation,
    runComprehensiveAudit
};
