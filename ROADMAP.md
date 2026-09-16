# StudySourceCore — Master Engineering Implementation Roadmap (Phases 0–10)

> **Canonical Document**: `ROADMAP.md`  
> **Status**: AUTHORITATIVE / GOVERNED BASELINE  
> **Version**: 1.0.0-ROADMAP  
> **Target Release**: StudySourceCore v1.0.0 (Production Stable)  
> **Governance Authority**: StudySourceCore Master Governance Board  

---

## 1. Roadmap Architecture & Execution Model

The StudySourceCore implementation roadmap is structured into eleven strictly sequenced phases (Phases 0 through 10). Each phase possesses unambiguous entry dependencies, concrete machine-verifiable deliverables, immutable invariants, and rigorous exit certification gates.

No phase may be initiated until all of its prerequisite phases have passed their explicit exit criteria. Speculative refactoring, ahead-of-phase implementation, and circular dependencies are strictly forbidden.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              11-PHASE IMPLEMENTATION LIFECYCLE                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [ PHASE 0: Product & Governance Freeze + Baseline ] ─────────────► COMPLETED          │
│                           │                                                            │
│                           ▼                                                            │
│  [ PHASE 1: Semantic Learning IR Definition & Normalization ] ────► COMPLETED          │
│                           │                                                            │
│                           ▼                                                            │
│  [ PHASE 2: Evidence Pack Ingestion & Content Lineage (CLR) ] ────► COMPLETED          │
│                           │                                                            │
│                           ▼                                                            │
│  [ PHASE 3: Knowledge Unit Reservation & Deduplication Engine ] ──► COMPLETED          │
│                           │                                                            │
│                           ▼                                                            │
│  [ PHASE 4: Pedagogical Compiler (4-Stage Scaffolding) ] ─────────► COMPLETED          │
│                           │                                                            │
│                           ▼                                                            │
│  ┌────────────────────────┴────────────────────────┬────────────────────────────────┐  │
│  │                                                 │                                │  │
│  ▼                                                 ▼                                ▼  │
│  [ PHASE 5: Declarative Renders ]   [ PHASE 6: Visual Pipeline ]   [ PHASE 7: StudyLab ]
│  (COMPLETED)                        (COMPLETED)                    (COMPLETED)         │
│  │                                                 │                                │  │
│  └────────────────────────┬────────────────────────┴────────────────────────────────┘  │
│                           │                                                            │
│                           ▼                                                            │
│  [ PHASE 8: Binary Packaging Compilers (Dual APKG v1.0) ] ────────► COMPLETED          │
│                           │                                                            │
│                           ▼                                                            │
│  [ PHASE 9: Independent Certification & Adversarial Harness ] ────► COMPLETED          │
│                           │                                                            │
│                           ▼                                                            │
│  [ PHASE 10: Antigravity Host Adapter, Concurrency & Recovery ] ──► COMPLETED          │
│                           │                                                            │
│                           ▼                                                            │
│              🏆 v1.0 PRODUCTION STABLE RELEASE CERTIFIED ◄── (CURRENT STATUS: ACTIVE)   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase-by-Phase Detailed Specifications

---

### Phase 0: Product & Governance Freeze + Implementation Baseline
- **Status**: **COMPLETED / CERTIFIED**
- **Objective**: Establish the authoritative governance, architectural charter, learning principles, and baseline test status without modifying downstream operational code.
- **Dependencies**: None.
- **Deliverables**:
  - `PRODUCT.md`: Foundational product charter, 10 Immutable Principles, scope horizons.
  - `ARCHITECTURE.md`: Canonical 6-tier architecture, ownership matrix, runtime invariants.
  - `ROADMAP.md`: Master 11-phase implementation plan with readiness gates and exit criteria.
  - `docs/LEARNING_PRINCIPLES.md`: Authoritative pedagogy documentation (4-stage scaffolding, cognitive load, 17 dimensions, sustainable review burden).
  - `.agents/DECISIONS.md`: Authoritative ADR records (ADR-01 through ADR-17).
  - Empirical baseline defect audit classifying pre-existing P0/P1/P2 issues.
- **Invariants Enforced**:
  - Zero speculative refactoring of runtime scripts.
  - No alteration of frozen schemas or APKG compilers.
  - Complete documentation authority with zero internal contradictions.
- **Exit Criteria**:
  - Core test suite (`npm test`) passes 100% (18/18 test files at baseline freeze).
  - Known pre-existing failures outside `npm test` are transparently inventoried and classified.
  - All governance files cross-link consistently with one authoritative location per rule.
- **Readiness State**: `COMPLETED`

---

### Phase 1: Semantic Learning IR Definition & Schema Normalization
- **Status**: **COMPLETED / CERTIFIED** (Milestone 1)
- **Objective**: Formalize the medium-neutral, typed Semantic Learning IR specifications, schemas, and validators, preserving all 17 procedural dimensions.
- **Dependencies**: Phase 0 Complete.
- **Deliverables**:
  - `schemas/semantic-learning-ir.schema.json`: Unified Draft-07 schema governing Conceptual KUs, Declarative Units, and Procedural Problem Schemas.
  - `scripts/validate_semantic_ir.js`: Independent AST and schema validator for IR instances.
  - Test suite `scripts/test_semantic_ir.js` validating schema conformance and normalization of the 17 procedural dimensions.
- **Invariants Enforced**:
  - Preservation of all 17 procedural dimensions (deep structure, traps, algorithms, hints, derivations, etc.).
  - Total decoupling of IR from downstream renderers (no TSV syntax, no HTML, no Marp tags in IR).
- **Exit Criteria**:
  - 100% valid schema round-tripping across all 9 subject domains.
  - Unit tests confirm zero data loss when converting existing procedural JSON into normalized IR.
- **Readiness State**: `COMPLETED`

---

### Phase 2: Evidence Pack Ingestion & Content Lineage Record (CLR)
- **Status**: **COMPLETED / CERTIFIED** (Milestone 1)
- **Objective**: Upgrade the evidence extraction engine to produce fine-grained source chunk indices and initialize cryptographic Content Lineage Records (CLRs).
- **Dependencies**: Phase 1 Complete.
- **Deliverables**:
  - `scripts/evidence_ingestion_engine.js`: Source ingestion parser emitting chunked, indexed evidence packs.
  - `scripts/content_lineage_record.js`: Bidirectional lineage tracer mapping `source_chunk_id → IR_node_id → deliverable_card_id`.
  - Upgraded `scratch/evidence-pack.md` format with embedded chunk headers and byte offsets.
- **Invariants Enforced**:
  - Single Source of Truth (SSoT): No specialist agent may read raw source files directly.
  - Zero Fabrication: Every extracted chunk has an immutable SHA-256 hash.
- **Exit Criteria**:
  - CLR engine successfully traces 100% of generated IR nodes back to authentic source chunks.
  - Lineage audit fails closed if an ungrounded synthetic node is detected.
- **Readiness State**: `COMPLETED`

---

### Phase 3: Knowledge Unit (KU) Reservation & Deduplication Engine
- **Status**: **COMPLETED / CERTIFIED** (Milestone 2)
- **Objective**: Implement a pre-dispatch KU reservation and collision prevention engine to ensure distinct agents do not duplicate coverage or leave conceptual gaps.
- **Dependencies**: Phase 2 Complete.
- **Deliverables**:
  - `scripts/ku_reservation_engine.js`: Pre-dispatch allocation of conceptual and procedural KUs to specialist tracks.
  - `scripts/semantic_deduplication.js`: Cross-track semantic deduplication preventing identical facts from appearing across Basic, Cloze, and StudyLab.
- **Invariants Enforced**:
  - `1 Pattern != 1 Question`: All distinct solvable source questions are assigned unique anchors.
  - Single Cognitive Job: Each KU is assigned to its pedagogically optimal modality.
- **Exit Criteria**:
  - Zero duplicate question anchors within a chapter.
  - Zero overlapping factual recall cards between Basic and Cloze decks.
- **Readiness State**: `COMPLETED`

---

### Phase 4: Pedagogical Compiler (4-Stage Scaffolding & 3-Tier Hints)
- **Status**: **COMPLETED / CERTIFIED** (Milestone 2)
- **Objective**: Construct the pedagogical compiler that transforms Semantic IR nodes into sequenced instruction, 4-stage procedural scaffolding, and 3-tier non-leaking hints.
- **Dependencies**: Phase 3 Complete.
- **Deliverables**:
  - `scripts/pedagogical_compiler.js`: Core instructional compiler.
  - `scripts/hint_scaffolding_engine.js`: Generates Tier 1 (Approach), Tier 2 (Formula), and Tier 3 (Setup) hints.
  - `scripts/distractor_generator.js`: Trap-driven plausible distractor synthesis enforcing MCQ $\ge 4$ options.
- **Invariants Enforced**:
  - Procedural Scaffolding: `Worked Example → Faded Completion → Independent Practice → Transfer`.
  - Inviolable Hint Invariant: Tier 1 and Tier 2 hints must NEVER leak the final numeric answer or option key.
  - Inviolable MCQ Invariant: Minimum 4 distinct non-empty options.
- **Exit Criteria**:
  - 100% of compiled procedural questions pass the 3-tier hint non-leakage verification.
  - Zero MCQs compiled with fewer than 4 options.
- **Readiness State**: `COMPLETED`

---

### Phase 5: Declarative Content Specialists & Renderers Refactoring
- **Status**: **COMPLETED / CERTIFIED** (Milestone 3)
- **Objective**: Refactor generic content specialists (`core-notes`, `core-basic-anki`, `core-cloze-anki`, `core-mindmap`, `core-slide-deck`) to consume compiled pedagogical IR and write pure projections.
- **Dependencies**: Phase 4 Complete.
- **Deliverables**:
  - Refactored `agents/core-notes.md` and renderer emitting Obsidian Markdown with callouts and tables.
  - Refactored `agents/core-basic-anki.md` and `core-cloze-anki.md` emitting clean 3-column TSVs.
  - Refactored `agents/core-mindmap.md` emitting valid concept trees and Mermaid diagrams.
  - Refactored `agents/core-slide-deck.md` emitting strict 5–15 slide Marp presentations.
- **Invariants Enforced**:
  - Renderers are write-only projections; zero semantic divergence from IR.
  - Single-Writer Rule strictly maintained.
- **Exit Criteria**:
  - All rendered files pass dedicated AST validators (`note_contract_audit.js`, `validate_tsv.js`, `validate_map.js`, `slide_deck_prompt_audit.js`).
- **Readiness State**: `COMPLETED`

---

### Phase 6: Visual Pipeline Hardening & Image Occlusion Fail-Closed Invariant
- **Status**: **COMPLETED / CERTIFIED** (Milestone 3)
- **Objective**: Harden the visual learning asset resolver and Image Occlusion specialist to enforce fail-closed suppression in the absence of approved local images.
- **Dependencies**: Phase 4 Complete.
- **Deliverables**:
  - `scripts/resolve_visual_asset.js` (hardened): Enforces strict local drop-folder checks with SHA-256 verification.
  - `agents/core-image-occlusion.md`: Emits normalized SVG masks only for verified assets.
- **Invariants Enforced**:
  - Map and visual learning fail closed with `NO_APPROVED_ASSET` if no local image is verified.
  - Zero AI image generation fallback for technical or historical diagrams.
- **Exit Criteria**:
  - 88/88 tests in `test_visual_asset_pipeline.js` pass with zero regressions.
  - Missing asset scenarios suppress Image Occlusion cleanly without failing the build.
- **Readiness State**: `COMPLETED`

---

### Phase 7: StudyLab Procedural Authors & Question Bank View Renderer
- **Status**: **COMPLETED / CERTIFIED** (Milestone 3)
- **Objective**: Align procedural authors (`math`, `reasoning`, `physics`, `chemistry`) to produce canonical IR practice items and project human-readable Question Bank views (`Questions.md`).
- **Dependencies**: Phase 4 Complete.
- **Deliverables**:
  - Domain specialists authoring `Optional/*_PracticeQuestions.json` and `Optional/*_ProblemPatterns.json`.
  - `scripts/render_studylab_question_bank.js`: Projects `Questions/<Chapter>_Questions.md` as an ergonomic study view from canonical IR.
- **Invariants Enforced**:
  - `Questions.md` is a rendered view, NOT the canonical store.
  - Problem family domain constraints, coprime factorizations, and FBDs strictly preserved.
- **Exit Criteria**:
  - All 4 domain paths pass production test suites (`test_math_production_path.js`, etc.).
  - `validate_studylab_question_bank.js` passes with zero structural defects.
- **Readiness State**: `COMPLETED`

---

### Phase 8: Binary Packaging Compilers (Dual APKG v1.0, SQLite Isolation)
- **Status**: **COMPLETED / CERTIFIED** (Milestone 4 - Dual APKG v1.0 Baseline)
- **Objective**: Package validated intermediate files into production-grade Anki `.apkg` packages while strictly isolating Model IDs 1600000001–1600000003 from Model 1600000004.
- **Dependencies**: Phases 5, 6, and 7 Complete.
- **Deliverables**:
  - `scripts/export_anki.js`: Packages Declarative Anki deck (`<Chapter>_Anki.apkg`).
  - `scripts/export_studylab_procedural_anki.js`: Packages Procedural Anki deck (`StudyLab/<Chapter>_StudyLab_Procedural.apkg`).
  - `.build/` intermediate archiving protocol and disk cleanup.
- **Invariants Enforced**:
  - Dual APKG architecture maintained for v1.0.
  - Model 1600000004 strictly isolated to procedural decks; zero procedural card bleeding into declarative decks.
  - Clean directory hygiene: Packaging cleans transient files without deleting permanent notes.
- **Exit Criteria**:
  - `validate_apkg.js` and `validate_studylab_procedural_apkg.js` confirm 100% structural and schema integrity.
  - Fresh profile simulation confirms zero pre-seeding dependencies.
- **Readiness State**: `COMPLETED`

---

### Phase 9: Independent Certification & Adversarial Verification Harness
- **Status**: **COMPLETED / CERTIFIED** (Milestone 4 - 4-Gate Certifier CLI)
- **Objective**: Unify the 15-point adversarial attack harness (ADV-01 through ADV-15), cross-artifact semantic QA (`bm-qa`), and vault graph linking (`bm-graph`) into an unyielding release gatekeeper.
- **Dependencies**: Phase 8 Complete.
- **Deliverables**:
  - `scripts/test_adversarial_auditor.js` (reconciled): Resolves fixture drift and enforces L1–L7 validation.
  - `scripts/cross_artifact_checker.js`: Cross-checks numbers, dates, and formulas across Notes, Flashcards, and Question Banks.
  - `scripts/link_audit.js`: Verifies vault Wikilink connectivity without orphan dead-ends.
  - `scripts/run_adversarial_certification.js`: Standalone 4-Gate adversarial certifier CLI with machine-readable certification report.
- **Invariants Enforced**:
  - Generation != Certification.
  - Any adversarial check failure vetoes artifact release.
- **Exit Criteria**:
  - 15/15 adversarial checks pass with zero invariant breaches.
  - Cross-artifact semantic check confirms 100% consistency across sibling deliverables.
- **Readiness State**: `COMPLETED`

---

### Phase 10: Antigravity Host Adapter, Concurrency & Checkpoint Recovery
- **Status**: **COMPLETED / CERTIFIED** (Phase 10 - Host Adapter & Recovery)
- **Objective**: Harden the Antigravity multi-agent runtime adapter, enforce resource caps, implement stateful checkpointing, and establish end-to-end mission verification.
- **Dependencies**: Phase 9 Complete.
- **Deliverables**:
  - `scripts/orchestration_engine.js` (hardened): Enforces hard resource caps ($\le 4$ concurrent workers, $\le 10$ mission launches).
  - `scripts/execution_state.js`: Atomic task checkpointing enabling resumption from mid-pipeline failures.
  - `scripts/register_antigravity_subagents.js`: Native Antigravity subagent tool registration adapter.
  - `scripts/antigravity_adapter.js`: Antigravity runtime host adapter with task decoupling and concurrency management.
  - End-to-end integration test suite `scripts/test_vnext_orchestration.js` and `scripts/test_phase10_concurrency_and_recovery.js`.
- **Invariants Enforced**:
  - Parent Self-Execution Ban programmatically asserted.
  - Blast-radius isolation with 1-retry budget.
  - Deterministic workforce collapse upon task completion.
- **Exit Criteria**:
  - Full end-to-end chapter generation completes across all 3 waves without deadlocks or rate limit exhaustion.
  - Checkpoint recovery resumes interrupted pipelines cleanly from disk state.
- **Readiness State**: `COMPLETED`

---

## 3. Scope Controls: What Must NOT Be Implemented in Phase 0

To protect architectural focus, the following items are strictly out of scope for Phase 0:

- ❌ DO NOT implement Semantic Learning IR runtime changes.
- ❌ DO NOT build new KU reservation or deduplication engines.
- ❌ DO NOT alter hint generation logic or distractor algorithms.
- ❌ DO NOT modify procedural scaffolding pipelines or subject author scripts.
- ❌ DO NOT alter visual asset resolvers or image occlusion scripts.
- ❌ DO NOT modify concurrency controls or checkpoint state mechanisms.
- ❌ DO NOT rewrite APKG packaging scripts or unify APKGs.
- ❌ DO NOT introduce SQLite as a persistent semantic store (`procedural.db`).
- ❌ DO NOT build student-facing CLI tools, web runtimes, or mobile interfaces.

---

## 4. Phase Readiness Summary Table

| Phase # | Phase Name | Direct Dependencies | Current Status |
|---|---|---|---|
| **Phase 0** | Product & Governance Freeze + Implementation Baseline | None | **COMPLETED / CERTIFIED** |
| **Phase 1** | Semantic Learning IR Definition & Schema Normalization | Phase 0 | **COMPLETED / CERTIFIED** |
| **Phase 2** | Evidence Pack Ingestion & Content Lineage Record (CLR) | Phase 1 | **COMPLETED / CERTIFIED** |
| **Phase 3** | Knowledge Unit (KU) Reservation & Deduplication Engine | Phase 2 | **COMPLETED / CERTIFIED** |
| **Phase 4** | Pedagogical Compiler (4-Stage Scaffolding & 3-Tier Hints) | Phase 3 | **COMPLETED / CERTIFIED** |
| **Phase 5** | Declarative Content Specialists & Renderers Refactoring | Phase 4 | **COMPLETED / CERTIFIED** |
| **Phase 6** | Visual Pipeline Hardening & Image Occlusion Fail-Closed Invariant | Phase 4 | **COMPLETED / CERTIFIED** |
| **Phase 7** | StudyLab Procedural Authors & Question Bank View Renderer | Phase 4 | **COMPLETED / CERTIFIED** |
| **Phase 8** | Binary Packaging Compilers (Dual APKG v1.0, SQLite Isolation) | Phases 5, 6, 7 | **COMPLETED / CERTIFIED** |
| **Phase 9** | Independent Certification & Adversarial Verification Harness | Phase 8 | **COMPLETED / CERTIFIED** |
| **Phase 10** | Antigravity Host Adapter, Concurrency & Checkpoint Recovery | Phase 9 | **COMPLETED / CERTIFIED** |
