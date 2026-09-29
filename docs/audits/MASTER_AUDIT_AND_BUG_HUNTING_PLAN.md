# Master Audit & Bug Hunting Roadmap

> **Document**: `docs/audits/MASTER_AUDIT_AND_BUG_HUNTING_PLAN.md`  
> **Status**: AUTHORITATIVE AUDIT BLUEPRINT  
> **Target Version**: StudySourceCore v1.0.1 Hardening  
> **Governance Authority**: StudySourceCore Engineering & QA  
> **Scope**: Systematic forensic audits and bug hunting across schemas, test suites, fixtures, routing matrices, and runtime lifecycles.

---

## 1. Executive Summary & Audit Mandate

Following the successful implementation and verification of **Strict Script De-Usurpation** (ADR-18) and **Mechanical vs Cognitive Separation** (ADR-19), the core pipeline (`npm test`, `test:milestone4`, and `run_adversarial_certification.js`) is 100% certified.

However, an exhaustive scan across all 66 scripts, 533 contracts, 6 authentic test fixtures, and standalone test harnesses revealed latent architectural drift, stale test expectations, and candidate contract leaks in outer layers.

This document establishes the **Master 6-Track Audit & Bug Hunting Roadmap**. Each track is scoped with clear attack vectors, inspection targets, execution steps, and acceptance criteria. Audits will be executed sequentially, one by one.

---

## 2. Master 6-Track Audit Matrix (Execution Complete)

| Track | Priority | Target Subsystem | Core Bug / Risk Surface | Status | Formal Audit Report |
|---|---|---|---|---|---|
| **Track 1** | **P0 (Critical)** | Canonical Contracts Registry (`studylab-canonical-contracts.json`) | Latent answer leakage in Tier 1/2 hints; unbounded parameter domains | 🟢 **COMPLETED** | [`CANONICAL_CONTRACTS_LEAK_AUDIT_REPORT.md`](CANONICAL_CONTRACTS_LEAK_AUDIT_REPORT.md) |
| **Track 2** | **P0 (Critical)** | Standalone Test Suites & Invariant Alignment | Stale test assertions, missing helpers, fail-closed fixture rejections | 🟢 **COMPLETED** | [`MASTER_AUDIT_EXECUTION_REPORT.md`](MASTER_AUDIT_EXECUTION_REPORT.md) |
| **Track 3** | **P1 (High)** | Test Fixtures Pedagogical Completeness | Missing 3-tier hints in question inventories (`[MISSING_AUTHORITATIVE_HINTS]`) | 🟢 **COMPLETED** | [`MASTER_AUDIT_EXECUTION_REPORT.md`](MASTER_AUDIT_EXECUTION_REPORT.md) |
| **Track 4** | **P1 (High)** | Production Vault & Pluralization Parity | `Math` vs `Maths` path mismatches; missing sibling artifacts in `Map/Europe` | 🟢 **COMPLETED** | [`MASTER_AUDIT_EXECUTION_REPORT.md`](MASTER_AUDIT_EXECUTION_REPORT.md) |
| **Track 5** | **P2 (Medium)** | 9-Subject Matrix Routing & Gating | Non-STEM track suppression codes; zero silent omission verification | 🟢 **COMPLETED** | [`SUBJECT_ROUTING_MATRIX_AUDIT.md`](SUBJECT_ROUTING_MATRIX_AUDIT.md) |
| **Track 6** | **P2 (Medium)** | Windows File Handles & Transient Lifecycle | Dangling `sql.js` handles causing `EBUSY` / `EPERM` locks during cleanup | 🟢 **COMPLETED** | [`WINDOWS_TRANSIENT_LIFECYCLE_AUDIT.md`](WINDOWS_TRANSIENT_LIFECYCLE_AUDIT.md) |

> 📜 **Master Execution Synthesis**: Full details across all 6 tracks are published in [`docs/audits/MASTER_AUDIT_EXECUTION_REPORT.md`](MASTER_AUDIT_EXECUTION_REPORT.md).

---

## 3. Detailed Audit Track Specifications

### Track 1: Canonical Contracts Deep Anti-Leak & Parameter Space Audit (P0)

#### 1.1 Context & Objective
In Phase 3 remediation, an active answer leak was uncovered and patched in line 54737 for `contract.chemistry.stoichiometry.limiting_reagent`. Given that `studylab-canonical-contracts.json` contains 533 contracts across Math, Physics, Chemistry, and Reasoning, any unpatched answer reveal in Tier 1 or Tier 2 hints will trigger a runtime fatal error under our new fail-closed invariant (`[HINT_ANSWER_LEAKAGE_FATAL]`).

#### 1.2 Inspection Targets
- `skills/study-source-core/resources/schemas/studylab-canonical-contracts.json`
- `skills/study-source-core/scripts/validate_studylab_procedural.js`
- `skills/study-source-core/scripts/validate_studylab_levels_1_6.js`

#### 1.3 Audit Checklist & Attack Vectors
1. **Tier 1 (Conceptual Approach) Anti-Leak**: Check if any Tier 1 hint contains numbers, equations with solved values, or direct option keys (e.g., `(A)`, `(B)`, `उत्तर:`, `Answer is`).
2. **Tier 2 (Governing Formula) Anti-Leak**: Check if any Tier 2 hint substitutes actual question parameters or computes final numerical values.
3. **Option Match Leak**: String-match normalized hint text against all MCQ option choices. If an exact match is found, flag as high-confidence leak.
4. **Parameter Domain Hazards**: Scan parameter generation specs for division by zero (`denominator: 0`), negative square roots without complex support, or degenerate triangles/polygons.
5. **Solution DAG Acyclicity**: Run graph cycle checks across all 533 contract step dependencies.

#### 1.4 Deliverables & Acceptance Criteria
- Automated script: `scripts/audit_canonical_contracts_antileak.js`.
- Output report: `docs/audits/CANONICAL_CONTRACTS_LEAK_AUDIT_REPORT.md`.
- Acceptance: **0 hint leaks, 0 circular DAGs, 0 unbounded parameter hazards across all 533 contracts**.

---

### Track 2: Standalone Test Suites & Invariant Alignment Audit (P0)

#### 2.1 Context & Objective
The primary `npm test` suite runs 28 test files. However, the repository contains over 12 standalone test suites designed for specific subsystems. Recent architectural shifts (fail-closed de-usurpation, prompt sanitization, completion evidence schema) have caused several standalone test suites to fail due to stale expectations or unaligned mock data.

#### 2.2 Inspection Targets
- `skills/study-source-core/scripts/test_e2e_lightweight_question_bank.js`
- `skills/study-source-core/scripts/test_vnext_adversarial.js`
- `skills/study-source-core/scripts/test_final_audit_harness.js`
- `skills/study-source-core/scripts/test_non_studylab_regression.js`
- `skills/study-source-core/scripts/test_l1_l7_proof_suite.js`

#### 2.3 Audit Checklist & Attack Vectors
1. **`test_e2e_lightweight_question_bank.js`**:
   - Bug: Test T4.1.1 fails with `[MISSING_AUTHORITATIVE_HINTS] Question 'sqi.math.lcm-hcf.rrb_alp_1' lacks 3-tier progressive hints`.
   - Action: Supply authentic 3-tier progressive hints in the test input fixture to honor the fail-closed invariant without synthetic fallbacks.
2. **`test_vnext_adversarial.js`**:
   - Bug: ATTACK-C fails (`getDomainSpecialistAgent is not defined`), ATTACK-E & ATTACK-O fail (`MISSING_SPECIALIST_AGENT`), ATTACK-K fails with code mismatch (`SUPPRESSED_BY_SUBJECT_POLICY` vs `ZERO_PRACTICE_QUESTIONS`).
   - Action: Reconcile helper functions with modern `orchestration_engine.js` and align suppression error codes.
3. **`test_final_audit_harness.js`**:
   - Bug: Stage 1 fails on `Basic count >= 20` (fixture has 2); Stage 5 fails looking for un-dotted `completion-evidence.json`.
   - Action: Modernize assertions to reflect calibrated chapter sizes and canonical `.completion-evidence.json` naming.
4. **`test_non_studylab_regression.js`**:
   - Bug: Fails looking for `Europe.mindmap.json` and `Europe_SlideDeckPrompt.md` in `Study Materials/Map/Europe`.
   - Action: Determine if `Map/Europe` is meant to carry full sibling deliverables or if the test should test against dedicated test fixtures.

#### 2.4 Deliverables & Acceptance Criteria
- Full execution of all 12 standalone test suites.
- Acceptance: **100% PASS across every standalone test file without weakening any fail-closed security assertions**.

---

### Track 3: Test Fixtures Pedagogical Completeness & Schema Audit (P1)

#### 3.1 Context & Objective
With scripts now forbidden from fabricating fallback hints or synthetic solution DAGs, test fixtures must be self-sufficient and pedagogically sound. Any missing field in a fixture will cause downstream compilers or test runs to halt.

#### 3.2 Inspection Targets
- `skills/study-source-core/resources/fixtures/math_lcm_hcf_source_fixture.json`
- `skills/study-source-core/resources/fixtures/fresh_math_ap_source_fixture.json`
- `skills/study-source-core/resources/fixtures/fresh_physics_kinematics_source_fixture.json`
- `skills/study-source-core/resources/fixtures/physics_work_energy_power_source_fixture.json`
- `skills/study-source-core/resources/fixtures/reasoning_syllogism_seating_source_fixture.json`
- `skills/study-source-core/resources/fixtures/chemistry_chemical_equilibrium_source_fixture.json`

#### 3.3 Audit Checklist & Attack Vectors
1. **3-Tier Hint Presence**: Assert 100% of questions in every fixture contain non-empty, progressive `hints` (`tier1_approach`, `tier2_formula`, `tier3_setup`).
2. **MCQ Invariant ($\ge 4$ Options)**: Assert every multiple-choice question contains $\ge 4$ distinct options, exactly 1 correct answer flag, and zero dummy placeholders (`"Option A"`, `"dummy"`).
3. **Solution DAG Completeness**: Verify each question references a valid pattern with an acyclic solution graph.
4. **Source Provenance Integrity**: Verify that `source_provenance` contains authentic exam, year, and shift metadata.

#### 3.4 Deliverables & Acceptance Criteria
- Automated audit script: `scripts/audit_test_fixtures.js`.
- Acceptance: **All 6 fixtures pass schema validation with zero missing hint exceptions**.

---

### Track 4: Production Vault & Pluralization Parity Audit (P1)

#### 4.1 Context & Objective
Discrepancies in directory naming (`Math` vs `Maths`, `Map` vs `Maps`, `Polity` vs `Political Science`) lead to silent test skips or brittle path lookups. Furthermore, production folders in `Study Materials/` must serve as canonical golden standards.

#### 4.2 Inspection Targets
- `Study Materials/Math/LCM-HCF/`
- `Study Materials/Map/Europe/`
- `Study Materials/Physics/Newton-Laws-Friction/`
- `skills/study-source-core/scripts/path_resolver.js`
- `skills/study-source-core/scripts/test_l1_l7_proof_suite.js`

#### 4.3 Audit Checklist & Attack Vectors
1. **Path Pluralization Audit**:
   - `test_l1_l7_proof_suite.js` line 92 searches `Study Materials/Maths/...`, causing it to skip `LCM-HCF`.
   - Audit all references in `scripts/` for hardcoded pluralized subject names.
2. **Europe Chapter Sibling Completeness**:
   - `Study Materials/Map/Europe/` currently contains `Notes/` and `Europe_Anki.apkg`, but lacks `MindMap/` and `SlideDeck/`.
   - Provide complete, verified sibling artifacts for `Map/Europe` to establish a true visual reference chapter.
3. **Hash Lineage Verification**:
   - Verify that all `.apkg` files in `Study Materials/` match the hashes recorded in their companion `.completion-evidence.json` and certification reports.

#### 4.4 Deliverables & Acceptance Criteria
- Path alignment across all scripts.
- `test_l1_l7_proof_suite.js` actively executes against production packages instead of skipping.
- Acceptance: **Zero skipped production packages, zero path mismatch warnings**.

---

### Track 5: 9-Subject Matrix Routing & Gating Audit (P2)

#### 5.1 Context & Objective
StudySourceCore supports 9 distinct subject domains (Math, Reasoning, Physics, Chemistry, Biology, History, Geography, Political Science, Map). Each subject has unique artifact eligibility rules defined in `subject_policy_resolver.js` and `artifact-registry.json`.

#### 5.2 Inspection Targets
- `skills/study-source-core/scripts/subject_policy_resolver.js`
- `skills/study-source-core/scripts/routing_engine.js`
- `skills/study-source-core/scripts/model_routing_policy.js`
- `skills/study-source-core/resources/subject-skill-manifest.json`

#### 5.3 Audit Checklist & Attack Vectors
1. **63-Cell Routing Determinism Matrix**:
   - Audit 9 subjects across 7 artifact tracks (Notes, Basic, Cloze, IO, MindMap, SlideDeck, StudyLab Procedural).
   - Verify that every cell resolves deterministically to either `ELIGIBLE` or an explicit suppression code.
2. **Zero Silent Omission Invariant**:
   - Assert that no track is ever omitted without an explicit entry in `routing_manifest.json`.
3. **Reason Code Uniformity**:
   - Ensure consistency between `SUPPRESSED_BY_SUBJECT_POLICY`, `ZERO_PRACTICE_QUESTIONS`, and `NO_APPROVED_ASSET`.

#### 5.4 Deliverables & Acceptance Criteria
- Automated matrix tester: `scripts/test_subject_routing_matrix.js`.
- Output report: `docs/audits/SUBJECT_ROUTING_MATRIX_AUDIT.md`.
- Acceptance: **63/63 cells pass with exact, deterministic status codes**.

---

### Track 6: Windows File Handles & Transient Lifecycle Audit (P2)

#### 6.1 Context & Objective
On Windows platforms, unclosed SQLite file handles or pending file streams cause operating system locks (`EBUSY` / `EPERM`) when deleting temporary directories (`.build/`, `scratch/`). This creates flakiness in long multi-mission execution runs.

#### 6.2 Inspection Targets
- `skills/study-source-core/scripts/cleanup_transients.js`
- `skills/study-source-core/scripts/export_anki.js`
- `skills/study-source-core/scripts/export_studylab_procedural_anki.js`
- `skills/study-source-core/scripts/execution_state.js`

#### 6.3 Audit Checklist & Attack Vectors
1. **SQLite Connection Lifecycle**:
   - Assert that `sql.js` database export buffers are finalized and references nulled before file movement.
2. **Retry-Wrapped Cleanup**:
   - Ensure `cleanup_transients.js` implements exponential backoff retry for Windows directory removal.
3. **High-Concurrency Stress**:
   - Run 10 rapid back-to-back packaging executions to assert zero unhandled `EBUSY` or file lock leaks.

#### 6.4 Deliverables & Acceptance Criteria
- Clean execution under Windows 11 without intermittent file locks.
- Acceptance: **10/10 rapid packaging runs succeed with 0 EBUSY / EPERM errors**.

---

## 4. Sequential Execution Order & Protocol

We will tackle these audits strictly one by one in the following order:

```
┌────────────────────────────────────────────────────────┐
│  STEP 1: Track 1 — Canonical Contracts Anti-Leak Scan  │ ◄── START HERE (P0)
│  Scan 533 contracts for latent leaks & domain hazards   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  STEP 2: Track 2 — Standalone Test Suites Alignment    │ (P0)
│  Synchronize 12 standalone test harnesses with ADRs    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  STEP 3: Track 3 — Test Fixtures Pedagogy Audit        │ (P1)
│  Ensure all 6 fixtures have complete 3-tier hints      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  STEP 4: Track 4 — Production Vault & Pluralization    │ (P1)
│  Normalize Math/Maths paths & complete Map/Europe      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  STEP 5: Track 5 — 9-Subject Matrix Routing Audit      │ (P2)
│  Assert 63-cell deterministic gating without leaks     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  STEP 6: Track 6 — Windows Lifecycle & Handle Audit    │ (P2)
│  Eliminate EBUSY locks & verify SQLite connection close│
└────────────────────────────────────────────────────────┘
```

Each step will produce its own formal audit report, implement necessary surgical remediations, verify tests, update documentation, and await user direction before moving to the next track.
