# StudySourceCore — Master Engineering Implementation Roadmap (Phases 0–22)

> **Canonical Document**: `ROADMAP.md`  
> **Status**: AUTHORITATIVE / GOVERNED BASELINE  
> **Version**: 1.2.0-beta.6-ROADMAP  
> **Target Release**: StudySourceCore v1.2.0 (Production Stable)  
> **Governance Authority**: StudySourceCore Master Governance Board  

---

## 1. Roadmap Architecture & Execution Model

The StudySourceCore implementation roadmap is structured into sequenced phases across two major eras:
1. **Foundational Architecture (Phases 0 through 10)**: Core IR definitions, CLR cryptographic provenance, compiler pipelines, binary packaging, and host adapters.
2. **Production Maturation, Forensic Remediation & Anti-Mock Hardening (Phases 11 through 22)**: STEM practice suites, canonical Question Bank primary delivery (`Questions.md`), anti-leak recalibration, autonomous multi-agent write enforcement, native Antigravity skills discovery, sequential test harness, anti-hardcoding purity, and 12-flaw adversarial certification hardening.

No phase may be initiated until all of its prerequisite phases have passed their explicit exit criteria. Speculative refactoring, ahead-of-phase implementation, and circular dependencies are strictly forbidden.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              MASTER IMPLEMENTATION LIFECYCLE                           │
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
│  [ PHASES 11–14: Physics Delivery & Question Bank Primary Policy ]► COMPLETED          │
│                           │                                                            │
│                           ▼                                                            │
│  [ PHASE 15: Mathematics Delivery & Anti-Leak Recalibration ] ────► COMPLETED          │
│                           │                                                            │
│                           ▼                                                            │
│  [ PHASE 16: Reasoning Delivery (Syllogism 25 MCQs) ] ────────────► COMPLETED          │
│                           │                                                            │
│                           ▼                                                            │
│  [ PHASE 17: Multi-Agent Subagent Execution & Chemistry Delivery] ─► COMPLETED          │
│                           │                                                            │
│                           ▼                                                            │
│  [ PHASE 18: Antigravity Skills Discovery Bridge & Global Purge ] ─► COMPLETED          │
│                           │                                                            │
│                           ▼                                                            │
│       🏆 v1.2.0-beta.6 PRODUCTION BASELINE CERTIFIED ◄── (CURRENT STATUS: ACTIVE)      │
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

### Phase 11–14: Physics Production Delivery & Question Bank Primary Policy
- **Status**: **COMPLETED / CERTIFIED** (Milestone 5 - GAP-28, GAP-29, GAP-30)
- **Objective**: Deliver complete production study suite for Physics calculational mechanics and establish canonical Markdown Question Banks (`Questions.md`) as the active primary practice deliverable.
- **Dependencies**: Phase 10 Complete.
- **Deliverables**:
  - `Study Materials/Physics/Newton-Laws-Friction/`: Complete 8-deliverable suite (2,400+ word Note, 20 Basic, 20 Cloze, 28-node MindMap, 8-slide SlideDeck, 20-problem Question Bank, 23-card Declarative APKG, StudyLab Procedural APKG).
  - GAP-30 Operational Policy: Designated canonical Markdown Question Banks (`Questions.md`) as the primary active practice deliverable; temporarily suspended automated procedural binary APKG packaging.
  - Master Smoke Test & Anti-Tamper Integrity Harness (`scripts/run_master_smoke_test.js`, 18 zero-mock gates, `npm run smoke`).
- **Invariants Enforced**:
  - 6-Stage calculational physics pipeline (FBD, Coordinates, Law, Solve, SI, Sanity).
  - All STEM practice questions delivered with complete 5-dimension pedagogical metadata and 3-tier hints.
- **Exit Criteria**:
  - 18/18 Master Smoke Test gates pass.
  - 4/4 4-Gate Adversarial Certification passes for Physics.
- **Readiness State**: `COMPLETED`

---

### Phase 15: Mathematics Delivery & Anti-Leak Recalibration
- **Status**: **COMPLETED / CERTIFIED** (Milestone 6 - GAP-31)
- **Objective**: Harden the mathematical authoring pipeline, eliminate false-positive hint leakage detections on problem input parameters, and deliver an authentic 26-MCQ Arithmetic Progression study package.
- **Dependencies**: Phase 11–14 Complete.
- **Deliverables**:
  - `Study Materials/Math/Arithmetic-Progression/`: Complete verified suite featuring 26 distinct student-grade 4-option MCQs across 6 canonical AP families (CBSE/SSC/CDS).
  - Recalibrated `hintLeaksAnswer` in `scripts/validate_studylab_question_bank.js` eliminating input parameter assignment false-positives ($a=2, d=-3$) while retaining robust answer-leak defense.
  - Replaced hardcoded fallback strings in `scripts/author_math_studylab.js` with dynamic chapter-aware pattern generation.
  - Added `[WARN: QUESTION_DENSITY_LOW]` threshold guard ($< 15$ questions) and fixed pattern resolution in `cross_artifact_checker.js`.
- **Invariants Enforced**:
  - `1 Pattern != 1 Question` invariant strictly upheld across all 26 practice items.
  - Zero terminal answer leaks in hint tiers 1 and 2.
- **Exit Criteria**:
  - 4/4 Adversarial Certification PASS on Math/Arithmetic-Progression.
  - 18/18 Smoke Test PASS, 47/47 Vitest PASS.
- **Readiness State**: `COMPLETED`

---

### Phase 16: Reasoning Delivery (Syllogism 25 MCQs)
- **Status**: **COMPLETED / CERTIFIED** (Milestone 7)
- **Objective**: Implement 7-layer cognitive thinking flow for logical reasoning and author a 25-MCQ student-grade Syllogism chapter.
- **Dependencies**: Phase 15 Complete.
- **Deliverables**:
  - `Study Materials/Reasoning/Syllogism/`: Complete 8-deliverable sibling package including 25 distinct 4-option MCQs (SSC/RRB/IBPS standards) with Euler/Venn step-by-step deduction DAGs.
  - 2,600+ word Obsidian note, 20 Basic TSV, 20 Cloze TSV, 32-node MindMap, 8-slide presentation blueprint, 34-card Declarative APKG, Graph Index, and QA Report.
- **Invariants Enforced**:
  - 4-Tier constraint classification (Definite, Conditional, Negative, Possibility).
  - Acyclicity in multi-statement syllogistic deduction graphs.
- **Exit Criteria**:
  - 4/4 Adversarial Certification PASS on Reasoning/Syllogism.
  - 18/18 Smoke Test PASS, 47/47 Vitest PASS.
- **Readiness State**: `COMPLETED`

---

### Phase 17: Multi-Agent Subagent Execution & Chemistry Delivery
- **Status**: **COMPLETED / CERTIFIED** (Milestone 8 - GAP-32, GAP-33, GAP-34)
- **Objective**: Programmatically enforce the Parent Self-Execution Ban via live subagent dispatch (`invoke_subagent`), equip subagents with write tools, and deliver a 25-MCQ Chemical Equilibrium chapter.
- **Dependencies**: Phase 16 Complete.
- **Deliverables**:
  - Subagent Write Tool Enforcement: Updated `.agents/agents/*.md` with explicit write tool frontmatters (`tools: [view_file, write_to_file, replace_file_content, run_command, send_message]`).
  - `studycore dispatch` CLI command providing deduplicated dispatch payloads.
  - `Study Materials/Chemistry/Chemical-Equilibrium/`: Authored by 8 live subagents visible in the UI sidebar; includes 25 distinct 4-option MCQs across 5 pattern families (Kc ICE, Kp-Kc, Le Chatelier, Qc quotient, ionic pH/buffer), 40 Anki flashcards, 2,911-word Note, 38-node MindMap, 8-slide SlideDeck blueprint.
  - LaTeX math block extraction filter in `scripts/cross_artifact_checker.js` eliminating false-positive variable state collisions.
  - `SKIPPED` state transition support in `scripts/execution_state.js`.
- **Invariants Enforced**:
  - Parent Self-Execution Ban strictly enforced; all specialist files written directly by subagents.
  - Chemical stoichiometry and equilibrium expressions verified for physical validity.
- **Exit Criteria**:
  - 4/4 Adversarial Certification PASS on Chemistry/Chemical-Equilibrium.
  - 18/18 Smoke Test PASS, 47/47 Vitest PASS.
- **Readiness State**: `COMPLETED`

---

### Phase 18: Antigravity Skills Discovery Alignment & Global Purge
- **Status**: **COMPLETED / CERTIFIED** (Milestone 9 - GAP-35)
- **Objective**: Connect the repository's internal `skills/` directory to Google Antigravity via native discovery configuration (`.agents/skills.json`), purge shadowing global mirrors, and harden vault root path resolution.
- **Dependencies**: Phase 17 Complete.
- **Deliverables**:
  - `.agents/skills.json`: Native Antigravity discovery manifest referencing `$schema: "https://antigravity.google/schemas/skills-config.json"` and registering `"path": "skills"`.
  - Purged duplicate global mirror (`~/.gemini/config/skills/study-source-core`) to prevent dual-source drift.
  - `scripts/doctor.js`: Added Check 7 ("Antigravity Skill Discovery Config (.agents/skills.json)").
  - `scripts/path_resolver.js`: Hardened `getVaultRoot` with `STUDYCORE_VAULT_ROOT` environment override and multi-marker upward traversal.
- **Invariants Enforced**:
  - Repository as Single Source of Truth (SSoT) for all skills and schemas.
  - Out-of-the-box discovery on clean repository clones.
- **Exit Criteria**:
  - `npm run doctor` reports Check 7 PASS.
  - 18/18 Master Smoke Test PASS, 47/47 Vitest PASS.
- **Readiness State**: `COMPLETED`

---

### Phase 19: Comprehensive Documentation Synchronization
- **Status**: **COMPLETED / CERTIFIED** (Milestone 10 - GAP-35)
- **Objective**: Eliminate documentation drift across all architectural specifications, ADRs, indexes, and troubleshooting guides.
- **Dependencies**: Phase 18 Complete.
- **Deliverables**:
  - Synchronized `ROADMAP.md`, `docs/GAP_REGISTER.md`, `DECISIONS.md`, `README.md`, `ARCHITECTURE.md`, `SCRIPTS.md`, `SKILLS.md`, `TROUBLESHOOTING.md`, `docs/CURRENT_IMPLEMENTATION.md`, and `docs/INDEX.md`.
- **Exit Criteria**:
  - Zero broken file references or stale roadmap status.
- **Readiness State**: `COMPLETED`

---

### Phase 20: Forensic Root-Cause Audit Remediation & Ghost Runner Fix
- **Status**: **COMPLETED / CERTIFIED** (Milestone 11 - GAP-36 & GAP-37)
- **Objective**: Fix 11 critical forensic flaws, eliminate the "ghost runner" Vitest illusion, and establish a fail-closed sequential test harness.
- **Dependencies**: Phase 19 Complete.
- **Deliverables**:
  - `scripts/run_all_tests.js`: Sequential test runner executing all 47 suites deterministically with zero worker-pool race conditions.
  - Fixed Devanagari Unicode matra preservation (`\p{M}`) across Anki exporters and semantic deduplication.
  - Standardized root `.gitattributes` to enforce LF line endings.
  - Upgraded `studycore verify --all` to dynamically discover and audit all 6 production chapters.
  - Added strict fail-closed assertions to `test_routing.js`.
- **Exit Criteria**:
  - 47/47 test suites PASS via `run_all_tests.js`.
  - 6/6 chapters verified via `studycore verify --all`.
- **Readiness State**: `COMPLETED`

---

### Phase 21: Anti-Hardcoding & Zero-Mock Production Hardening
- **Status**: **COMPLETED / CERTIFIED** (Milestone 12 - GAP-38, ADR-21)
- **Objective**: Purge all mock chapter fallbacks and test fixtures from production authoring engines; enforce dynamic vault link resolution.
- **Dependencies**: Phase 20 Complete.
- **Deliverables**:
  - Fail-closed validation (`[MISSING_CHAPTER]`, `[MISSING_EVIDENCE_INPUT]`) across Math, Physics, Chemistry, and Reasoning author engines.
  - Removed static `candidateVaultTargets` array from CLI in favor of dynamic filesystem scanning.
  - Added Check 1.4 to `run_master_smoke_test.js` (19/19 gates) and Check 8 to `doctor.js`.
- **Exit Criteria**:
  - `npm run doctor` Check 8 PASS.
  - 19/19 Master Smoke Test PASS, 47/47 test suites PASS.
- **Readiness State**: `COMPLETED`

---

### Phase 22: 12-Flaw Forensic Remediation & Adversarial Certification Hardening
- **Status**: **COMPLETED / CERTIFIED** (Milestone 13 - GAP-39, ADR-22)
- **Objective**: Remediate 12 forensic flaws across MCP validators, Devanagari hint leak detection, inventory parsing, Gate 2 Question Bank audit fallback, and stopword entity collision filtering.
- **Dependencies**: Phase 21 Complete.
- **Deliverables**:
  - `latex_validator.js` & `mermaid_validator.js`: Exported `validateLatexContent` & `validateMermaidContent`; isolated escaped `\$` literal dollars.
  - `hint_distractor_semantics.js`: Preserved Devanagari range `\u0900-\u097F` and added exact match & word boundary leak detection.
  - `source_question_inventory.js`: Added `- Hints:` markdown list parsing and item hint preservation.
  - `author_*_studylab.js`: Trimmed-line regex fix for Tier 1/2/3 hints and valid `{ id, title, patterns }` JSON serialization.
  - `run_adversarial_certification.js`: Gate 2 fallback onto canonical `Questions/<Chapter>_Questions.md` when procedural APKG is absent/paused.
  - `cross_artifact_checker.js`: Expanded `IGNORED_ENTITIES` with English/Hindi prepositions and isolated Kelvin matching (`kelvin|केल्विन`) to eliminate algebraic variable collisions (`2k`).
  - `studycore_cli.js`: Added `QBank⚪(Legacy JSON only)` status indicator and fallback legacy validation in `studycore verify`.
  - `yaml_validator.js`: Refined unquoted mid-word apostrophe handling.
  - `doctor.js`: Added local `.venv` Python executable search.
  - Version string synchronized to `v1.2.0-beta.6` across CLI, smoke runner, MCP server, and README.
- **Invariants Enforced**:
  - Procedural APKG compilation remains paused/off by default in production.
  - Canonical Markdown Question Bank (`Questions.md`) is the active primary practice deliverable with strict 4-option MCQs.
  - Gate 2 actively audits Question Banks when APKG is paused.
- **Exit Criteria**:
  - `npm run doctor` 8/8 PASS.
  - `npm run smoke` 19/19 PASS.
  - `studycore verify --all` 6/6 Chapters PASS.
  - 4-Gate Adversarial Certification 6/6 Chapters 100% PASS (4/4 Gates).
  - 47/47 Test Suites 100% GREEN PASS.
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
| **Phase 11–14** | Physics Delivery & Question Bank Primary Policy (GAP-28..30) | Phase 10 | **COMPLETED / CERTIFIED** |
| **Phase 15** | Mathematics Chapter Delivery & Parameter Leak Hardening (GAP-31) | Phase 11–14 | **COMPLETED / CERTIFIED** |
| **Phase 16** | Reasoning Chapter Delivery (Syllogism 25-MCQ Suite) | Phase 15 | **COMPLETED / CERTIFIED** |
| **Phase 17** | Multi-Agent Subagent Autonomous Write & Chemistry Delivery (GAP-32..34) | Phase 16 | **COMPLETED / CERTIFIED** |
| **Phase 18** | Antigravity Skills Discovery Bridge & Global Purge (GAP-35) | Phase 17 | **COMPLETED / CERTIFIED** |
| **Phase 19** | Comprehensive Documentation Synchronization | Phase 18 | **COMPLETED / CERTIFIED** |
| **Phase 20** | Forensic Root-Cause Audit Remediation & Ghost Runner Fix (GAP-36..37) | Phase 19 | **COMPLETED / CERTIFIED** |
| **Phase 21** | Anti-Hardcoding & Zero-Mock Production Hardening (GAP-38, ADR-21) | Phase 20 | **COMPLETED / CERTIFIED** |
| **Phase 22** | 12-Flaw Forensic Remediation & Adversarial Certification Hardening (GAP-39, ADR-22) | Phase 21 | **COMPLETED / CERTIFIED** |

