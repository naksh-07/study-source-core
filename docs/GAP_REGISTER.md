# StudySourceCore Gap Register (`docs/GAP_REGISTER.md`)

## 1. Overview & Purpose

This document is the **authoritative, durable register of known discrepancies, schema drifts, pending architectural migrations, and tooling gaps** between the target StudySourceCore architecture and the current repository implementation baseline.

Every identified gap is tracked with:
- Unique Identifier (`GAP-XX`)
- Category & Subsystem
- Severity (`P0 Blocker`, `P1 Critical`, `P2 High`, `P3 Medium`)
- Exact Empirical Evidence (file path, line number, or audit finding)
- Technical Impact
- Intended Resolution (governed by ADRs and target specifications)
- Target Roadmap Phase (Phases 1–10)
- Verification & Closure Method

---

## 2. Summary Dashboard

| Gap ID | Category | Severity | Title | Target Phase | Status |
|---|---|---|---|---|---|
| **GAP-01** | Architecture / IR | **P1 Critical** | Semantic Learning IR Intermediate Storage Layer Missing | Phase 1 | **Resolved** (Milestone 1) |
| **GAP-02** | Architecture / Render | **P1 Critical** | `Questions.md` Authoring Coupling (Non-Projection) | Phase 7 | **Resolved** (Milestone 3) |
| **GAP-03** | Packaging / Anki | **P2 High** | Dual APKG (v1.0) vs Unified APKG (v1.1) Packaging | Phase 8 / v1.1 | **Governed Baseline** (v1.0 Baseline) |
| **GAP-04** | Schemas / StudyLab | **P1 Critical** | Hint Structure Schema Drift (Flat vs Nested 3-Tier) | Phase 1 | **Resolved** (Post-M4 Patch) |
| **GAP-05** | Testing / Harness | **P1 Critical** | Adversarial Test Suite Import Reference Bug | Phase 9 | **Resolved** (Milestone 4) |
| **GAP-06** | Configuration / Subject | **P2 High** | Subject Keying Discrepancy (`Math` vs `Maths`) | Phase 3 | **Resolved** (Milestone 2) |
| **GAP-07** | Tooling / Runtime | **P2 High** | Dynamic Artifact Output Directory Isolation | Phase 10 | **Resolved** (Phase 10) |
| **GAP-08** | Validation / Release | **P2 High** | Missing Completion-Evidence File Validator Enforcement | Phase 9 | **Resolved** (Milestone 4) |
| **GAP-09** | Validation / Flashcards | **P3 Medium** | Basic Card Non-Zero Candidate Threshold Drift | Phase 5 | **Resolved** (Milestone 3) |
| **GAP-10** | Provenance / Data | **P1 Critical** | 11-Field Content Lineage Record (CLR) Persistence | Phase 2 | **Resolved** (Milestone 1) |
| **GAP-11** | Tooling / Adapter | **P2 High** | Antigravity Native Subagent Registration Adapter | Phase 10 | **Resolved** (Phase 10) |
| **GAP-12** | Certification / CI | **P1 Critical** | ADV-01..15 Independent Certification Pipeline Integration | Phase 9 | **Resolved** (Milestone 4) |
| **GAP-13** | Schema / Anti-Leak | **P0 Critical** | Canonical Contracts Deep Anti-Leak & Parameter Space Audit | Audit Track 1 | **Resolved** (Track 1) |
| **GAP-14** | Vault / Parity | **P1 High** | Production Vault Sibling Parity for Map/Europe | Audit Track 4 | **Resolved** (Track 4) |
| **GAP-15** | Fixtures / Hints | **P1 High** | Test Fixture Pedagogical Completeness & 3-Tier Hints | Audit Track 3 | **Resolved** (Track 3) |
| **GAP-16** | Routing / Matrix | **P2 High** | 9-Subject Matrix Routing & Zero Silent Omission | Audit Track 5 | **Resolved** (Track 5) |
| **GAP-17** | Windows / Lifecycle | **P2 High** | Windows File Handles & Transient Lifecycle Retries | Audit Track 6 | **Resolved** (Track 6) |
| **GAP-18** | Packaging / Memory | **P0 Blocker** | Zero-Heap Streaming APKG Compilation (`better-sqlite3` + `archiver`) | Adversarial Audit | **Resolved** (`52cb2fd`) |
| **GAP-19** | Policy / Language | **P0 Blocker** | Configurable Language Policy (`hinglish`, `en`, `hi`, `bilingual`) | Adversarial Audit | **Resolved** (`52cb2fd`) |
| **GAP-20** | Validation / Hints | **P0 Blocker** | Question Bank Tier 3 Hint Leak Scan & 17-Dimension Enforcement | Adversarial Audit | **Resolved** (`2275762`) |
| **GAP-21** | Contracts / Fail-Closed | **P0 Blocker** | Fail-Closed Procedural Contract Resolution (`CANONICAL_CONTRACT_REQUIRED`) | Adversarial Audit | **Resolved** (`2275762`) |
| **GAP-22** | Security / Visual | **P0 Blocker** | Asset Discovery Path Traversal Guard & Blocking IO SHA-256 Check | Adversarial Audit | **Resolved** (`2275762`) |
| **GAP-23** | Flashcards / Dedup | **P0 Blocker** | Basic vs. Cloze 1:1 Verbatim Fact Deduplication | Adversarial Audit | **Resolved** (`2275762`) |
| **GAP-24** | Vault / Cartography | **P0 Blocker** | `Map/Europe` Multi-Layer Cartographic SVG & Comprehensive Notes | Adversarial Audit | **Resolved** (`2275762`) |
| **GAP-25** | Orchestration / Lineage | **P1 Critical** | Re-Throw `CONTEXT_PROVENANCE_FAILURE` & Routing Policy Guards | Adversarial Audit | **Resolved** (`2275762`) |
| **GAP-26** | Ingestion / PDF | **P1 Critical** | PyMuPDF/OCR Page-Range Slicing (`--page-start` / `--page-end`) | Adversarial Audit | **Resolved** (`2275762`) |
| **GAP-27** | UI / MCP | **P2 High** | Anki Dark Mode (`.nightMode`) CSS & MCP Server v1.1.0 Expansion | Adversarial Audit | **Resolved** (v1.1.0) |
| **GAP-28** | Multi-Agent / Tools | **P1 Critical** | Subagent Tool Frontmatter, Wave 3 Auto-Context Resolution & Sibling Parity | Orchestration Audit | **Resolved** (`v1.1.0`) |
| **GAP-29** | Testing / Anti-Tamper | **P0 Blocker** | Master Smoke Test & Anti-Tamper Architectural Integrity Harness (`npm run smoke`) | Verification & Integrity | **Resolved** (`v1.2.0-beta.2`) |

---

## 3. Detailed Gap Register Entries

---

### GAP-01: Semantic Learning IR Intermediate Storage Layer Missing
- **Category**: Architecture / Semantic IR
- **Severity**: **P1 Critical**
- **Evidence**:
  - `skills/study-source-core/scripts/test_math_production_path.js`: Mathematical subagents previously emitted formatted Markdown and directly invoked APKG packaging without persisting an intermediate normalized JSON AST.
  - Absence of intermediate canonical IR persistence in production pipeline.
- **Impact**:
  - Tightly couples authoring agents to specific output file formats (Markdown, Anki).
  - Prevents multi-format rendering from a single canonical source of truth.
  - Limits programmatic reasoning, automated hint validation, and parameter perturbation.
- **Intended Resolution**:
  - Implement Tier 3 of the 6-Tier Architecture (`SEMANTIC LEARNING IR`).
  - Specialists emit canonical JSON representations (`PracticeQuestions.json`, `ProblemPatterns.json`).
  - Governed by ADR-01, ADR-11, and `docs/STUDYLAB_SPECIFICATION.md`.
- **Target Phase**: **Phase 1: Semantic Learning IR Foundation**
- **Status**: **Resolved** (Milestone 1)
- **Resolution Details**: Implemented Draft-07 Semantic Learning IR schema (`schemas/semantic-learning-ir.schema.json`) and independent AST validator (`scripts/validate_semantic_ir.js`). Mathematical, reasoning, and numerical specialists serialize intermediate normalized JSON representations into chapter `Optional/*_PracticeQuestions.json` and `Optional/*_ProblemPatterns.json` before triggering APKG compilers or Markdown projections. Verified in `test_foundation_layer.js` and `test_milestone2_semantic_layer.js`.
- **Verification Method**:
  - Unit tests asserting `PracticeQuestions.json` validates against `practice-questions-schema.json` and `semantic-learning-ir.schema.json` before any renderer runs. Verified via `test_foundation_layer.js`.

---

### GAP-02: `Questions.md` Authoring Coupling (Non-Projection)
- **Category**: Architecture / Rendering Pipeline
- **Severity**: **P1 Critical**
- **Evidence**:
  - `.agents/agents/math-apkg-author.md` and related specialist agents include instructions to author `Questions/<Chapter>_Questions.md` directly.
  - `skills/study-source-core/resources/studylab-question-bank-contract.md` treats Markdown as the authoring artifact rather than a rendered projection.
- **Impact**:
  - Violates the core architectural principle: *"Markdown is an ephemeral or rendered artifact, not the source of truth for structured educational knowledge."*
  - Dual-source divergence: Markdown questions drift from compiled APKG flashcard data.
- **Intended Resolution**:
  - Decouple authoring from Markdown formatting.
  - Specialist agents author the Semantic Learning IR; a deterministic renderer (`renderQuestionsMarkdown`) generates `Questions.md` from the IR.
  - Governed by ADR-02 and `docs/RENDERING_PIPELINE.md`.
- **Target Phase**: **Phase 7: StudyLab Procedural Compilers & Markdown Question Banks**
- **Status**: **Resolved** (Milestone 3)
- **Resolution Details**: Decoupled authoring from Markdown formatting via `render_studylab_question_bank.js` (`renderQuestionBankToMarkdown`). Canonical `PracticeQuestions.json` remains the sole source of truth; specialist agents emit semantic JSON while `Questions.md` is strictly generated as a read-only Markdown view. Verified by `test_milestone3_learning_outputs.js` (TEST-3.3, OUT-13) and `test_studylab_question_bank.js`.
- **Verification Method**:
  - Test asserting zero manual edits allowed in `Questions.md`; output is 100% deterministically generated from `PracticeQuestions.json`.

---

### GAP-03: Dual APKG (v1.0) vs Unified APKG (v1.1) Packaging
- **Category**: Packaging / Anki Integration
- **Severity**: **P2 High**
- **Evidence**:
  - `skills/study-source-core/scripts/test_unified_anki_packaging.js` implements experimental unified packaging.
  - Production workflows emit two separate decks: `<Chapter>_Anki.apkg` (Model IDs 1600000001–1600000003) and `StudyLab/<Chapter>_StudyLab_Procedural.apkg` (Model ID 1600000004).
- **Impact**:
  - Users have two separate deck packages per chapter in v1.0.
  - Rushing unified packaging in v1.0 risks regressions across existing working pipelines.
- **Intended Resolution**:
  - Maintain **Dual APKG as the stable v1.0 standard** (Zero-Risk Baseline).
  - Explicitly schedule **Unified Single APKG for v1.1** under ADR-17.
  - Keep unified packaging code isolated in `test_unified_anki_packaging.js` until Phase 8.
- **Target Phase**: **Phase 8 (Unified APKG v1.1 Milestone)**
- **Status**: **Governed Baseline** (v1.0 Baseline Preserved)
- **Resolution Details**: Maintained Dual APKG architecture as the immutable v1.0 standard under ADR-14. Enforced closed-boundary Model ID isolation (Models 1600000001–1600000003 for Declarative Anki and Model 1600000004 for StudyLab Procedural Anki) via `scripts/test_phase8_model_isolation_closed_boundary.js`. Experimental single APKG code is safely isolated in `test_unified_anki_packaging.js` and formally deferred to v1.1 milestone per ADR-17.
- **Verification Method**:
  - Passing `test_phase8_model_isolation_closed_boundary.js` asserting zero Model ID bleeding, clean SQLite compilation, and collision-free profile imports.

---

### GAP-04: Hint Structure Schema Drift (Flat vs Nested 3-Tier)
- **Category**: Schemas / StudyLab Contracts
- **Severity**: **P1 Critical**
- **Evidence**:
  - `skills/study-source-core/resources/studylab-procedural-schema.json` defined hints with properties: `tier1_conceptual`, `tier2_strategic`, `tier3_concrete_first_step`.
  - Some procedural sample generators and `test_studylab_question_bank.js` emitted flat keys: `hint_1`, `hint_2`, `solution_walkthrough`.
- **Impact**:
  - Schema validation failure when strict validation is enabled.
  - Inconsistent UI rendering of hint tiers in Anki Model 1600000004.
- **Intended Resolution**:
  - Harmonize all generators and schemas to the canonical nested 3-tier structure (`hints.tier1_conceptual`, `hints.tier2_strategic`, `hints.tier3_next_step`).
  - Provide a backward-compatible adapter during transition.
  - Governed by ADR-04 and `docs/STUDYLAB_SPECIFICATION.md`.
- **Target Phase**: **Phase 1: Semantic Learning IR Foundation**
- **Status**: **Resolved** (Post-M4 Patch)
- **Resolution Details**: Harmonized all schemas, author generators, validators, and renderers to canonical hint tier keys (`hints.tier1_conceptual`, `hints.tier2_strategic`, and `hints.tier3_next_step`). Updated `schemas/semantic-learning-ir.schema.json`, `schemas/studylab-question-bank.schema.json`, and all downstream procedural compilers. Regenerated Math LCM-HCF and Map Europe APKGs post-patch. Closed in commit `344ca5d`.
- **Verification Method**:
  - Schema validation test asserting 100% compliance of all practice items against `studylab-procedural-schema.json` and 4-gate adversarial certification runner passing 4/4 gates cleanly. Verified via `test_contracts.js` and `npm run certify`.

---

### GAP-05: Adversarial Test Suite Import Reference Bug
- **Category**: Testing / Independent Certification
- **Severity**: **P1 Critical**
- **Evidence**:
  - `skills/study-source-core/scripts/test_adversarial_apkg.js` (outside `npm test`) references a module or export path that fails on direct execution due to an unaligned path relative to root.
- **Impact**:
  - The 15-point adversarial attack harness cannot be executed as part of routine CI without manual environment tweaking.
- **Intended Resolution**:
  - Repair the import paths and module exports in `test_adversarial_apkg.js`.
  - Wire it into the official `npm test` script in `package.json`.
  - Governed by ADR-05 and `docs/VALIDATION_AND_CERTIFICATION.md`.
- **Target Phase**: **Phase 9: Independent Certification & Adversarial Verification Harness**
- **Status**: **Resolved** (Milestone 4)
- **Resolution Details**: Repaired `test_adversarial_auditor.js` across all 15 attack vectors (ADV-01 through ADV-15): fixed missing exam_metadata/hints in synthetic checks, restored shallow coverage detection in Level 7 validator, made fixture paths robust to both root and `.build/source-artifacts/` packaging lifecycles, and integrated `test_adversarial_auditor.js` into `package.json` under `"test"` and `"test:milestone4"`.
- **Verification Method**:
  - `node scripts/test_adversarial_auditor.js` exits with code 0 with 15/15 checks passing (100% success rate). Verified in CI via `npm test`.

---

### GAP-06: Subject Keying Discrepancy (`Math` vs `Maths`)
- **Category**: Configuration / Subject Policies
- **Severity**: **P2 High**
- **Evidence**:
  - Directory name in `skills/study-source-core/subject-skills/` is `Math/`.
  - Legacy configuration references in some historical scripts used `Maths`.
  - `test_subject_policy_resolver.js` handled aliases dynamically, but strict static typing required a single canonical key.
- **Impact**:
  - Potential silent policy resolution failure if an alias is not recognized in strict mode.
- **Intended Resolution**:
  - Establish `Math` as the canonical Subject ID across all registries, schemas, and directories.
  - Formalize aliases (`Maths`, `Mathematics`) strictly in the resolver alias normalization map.
  - Governed by ADR-09 and `docs/SUBJECT_POLICIES.md`.
- **Target Phase**: **Phase 3: Knowledge Unit (KU) Reservation & Subject Hardening**
- **Status**: **Resolved** (Milestone 2)
- **Resolution Details**: Formalized `Math` as the canonical Subject ID in `subject-skill-manifest.json` and directory structure. Standardized aliases (`Maths`, `Mathematics`) in `subject_policy_resolver.js` alias normalization lookup map. Added subject boundary validator (`subject_boundary_validator.js`) with domain centroid taxonomies. Verified in `test_subject_policy_resolver.js`.
- **Verification Method**:
  - Automated test verifying all subject alias lookups resolve to canonical `Math`. Verified via `test_subject_policy_resolver.js`.

---

### GAP-07: Dynamic Artifact Output Directory Isolation
- **Category**: Tooling / Runtime Operations
- **Severity**: **P2 High**
- **Evidence**:
  - Several generation scripts assume a static relative output path (e.g. `./Notes/`, `./StudyLab/`).
  - Antigravity execution environments and CI sandboxes use isolated dynamic artifact directories (e.g. `<appDataDir>\brain\<conversation-id>\...`).
- **Impact**:
  - Output files written to unexpected working directories or failing with permission errors in sandboxed environments.
- **Intended Resolution**:
  - Implement dynamic output directory configuration via environment variable `STUDYSOURCE_OUTPUT_DIR` or CLI parameter `--output-dir`.
  - Fall back safely to repository workspace root if unspecified.
  - Governed by ADR-15 and `docs/SECURITY_AND_TRUST.md`.
- **Target Phase**: **Phase 10: Antigravity Host Adapter, Concurrency & Checkpoint Recovery**
- **Status**: **Resolved** (Phase 10)
- **Resolution Details**: Implemented dynamic artifact output directory resolution in `orchestration_engine.js` and `antigravity_adapter.js` supporting both CLI argument `--output-dir <path>` and environment variable `STUDYSOURCE_OUTPUT_DIR`, safely falling back to workspace root when unspecified. Verified artifact directory isolation, atomic directory creation, clean writes, and verification across custom paths in `test_phase10_runtime_adversarial.js` (RT-14) and `test_phase10_concurrency_and_recovery.js`.
- **Verification Method**:
  - Test running end-to-end generation with `--output-dir` and `STUDYSOURCE_OUTPUT_DIR` pointed to arbitrary sandboxed directories. Verified via RT-14 in `test_phase10_runtime_adversarial.js`.

---

### GAP-08: Missing Completion-Evidence File Validator Enforcement
- **Category**: Validation / Release Gating
- **Severity**: **P2 High**
- **Evidence**:
  - The 4-point Physical Verification Protocol mandates a `.completion-evidence.json` file recording byte counts, SHA-256 hashes, and subagent run status.
  - In the current Phase 0 baseline, this check is validated in `test_change_isolation_vnext.js` via mock fixtures, but not enforced as a hard release gate in standard production runs.
- **Impact**:
  - A run could theoretically be marked complete even if an artifact failed to write or was silently dropped.
- **Intended Resolution**:
  - Enforce physical existence and non-zero byte count of `.completion-evidence.json` as a mandatory exit condition for all chapter pipelines.
  - Governed by ADR-05 and `docs/VALIDATION_AND_CERTIFICATION.md`.
- **Target Phase**: **Phase 9: Independent Certification & Adversarial Verification Harness**
- **Status**: **Resolved** (Milestone 4)
- **Resolution Details**: Created `skills/study-source-core/scripts/validate_completion_evidence.js` implementing the 4-point physical verification protocol (`validateCompletionEvidenceFile` and `validateChapterCompletionEvidence`). Updated `orchestration_engine.js` to automatically compute SHA-256 hashes and byte counts of all generated physical deliverables on disk and serialize `.completion-evidence.json` upon pipeline completion. Created comprehensive test suite `test_completion_evidence_gate.js` validating schema compliance, physical byte/hash match, subagent status assertions, and missing/empty file rejection (9/9 PASS, 100%).
- **Verification Method**:
  - `node scripts/test_completion_evidence_gate.js` exits with code 0 across 9 verification scenarios. Integrated into `npm test` and `npm run test:milestone4`.

---

### GAP-09: Basic Card Non-Zero Candidate Threshold Drift
- **Category**: Validation / Flashcards
- **Severity**: **P3 Medium**
- **Evidence**:
  - `skills/study-source-core/resources/validation-rules.md` specifies that when Basic cards are eligible, `count >= 1`.
  - In procedural STEM chapters, Basic cards are frequently suppressed with `ZERO_BASIC_CANDIDATES`.
  - Current validator sometimes throws a warning instead of accepting valid suppression codes.
- **Impact**:
  - False-positive validation warnings during procedural STEM processing.
- **Intended Resolution**:
  - Standardize suppression code handling: If `status === "SUPPRESSED"` and `reason === "ZERO_BASIC_CANDIDATES"`, validator returns `PASS` with zero cards.
  - Governed by ADR-08 and `docs/SUBJECT_POLICIES.md`.
- **Target Phase**: **Phase 5: Declarative Renderers (Notes, TSVs, MindMap, Slides)**
- **Status**: **Resolved** (Milestone 3)
- **Resolution Details**: Updated `validate_tsv.js` to recognize `status: "SUPPRESSED"` and `reason: "ZERO_BASIC_CANDIDATES"` / `"ZERO_CLOZE_CANDIDATES"` across options, JSON suppression payloads, and file header comment directives (`# status: SUPPRESSED`). Suppressed zero-card header-only TSVs pass cleanly with 0 errors and 0 warnings. Verified by `test_milestone3_learning_outputs.js` (TEST-1.7, OUT-12).
- **Verification Method**:
  - Test verifying suppressed basic deck returns clean passing validation.

---

### GAP-10: 11-Field Content Lineage Record (CLR) Persistence
- **Category**: Provenance / Data Model
- **Severity**: **P1 Critical**
- **Evidence**:
  - Legacy questions and notes previously stored basic frontmatter metadata (`source`, `chapter`).
  - Full 11-field Content Lineage Record (including `source_sha256`, `passage_index`, `pedagogical_purpose`, `faded_stage`, `solver_dag_signature`) was defined in specification (`docs/PROVENANCE_AND_LINEAGE.md`) but was not yet persisted per question entity in the IR.
- **Impact**:
  - Limits programmatic audit of question origin, preventing automated detection of synthetic items masquerading as authentic PYQs.
- **Intended Resolution**:
  - Implement strict CLR schema in `PracticeQuestions.json` and persist for all items.
  - Governed by ADR-03, ADR-16, and `docs/PROVENANCE_AND_LINEAGE.md`.
- **Target Phase**: **Phase 2: Evidence Pack Ingestion & Content Lineage Record (CLR)**
- **Status**: **Resolved** (Milestone 1)
- **Resolution Details**: Implemented canonical 11-field Content Lineage Record (CLR) engine in `skills/study-source-core/scripts/content_lineage_record.js` adhering to Version 1.0.0-PROVENANCE. Enforces 11 mandatory fields (`source_file`, `source_sha256`, `extraction_timestamp`, `passage_index`, `origin_tier`, `source_verbatim_quote`, `curation_notes`, `pedagogical_purpose`, `bloom_level`, `faded_stage`, `solver_dag_signature`) across all KUs and practice items in Semantic Learning IR with fail-closed validation. Verified in `test_foundation_layer.js` (TEST-1.2, TEST-1.3).
- **Verification Method**:
  - Validation test asserting every item in `PracticeQuestions.json` contains a valid, schema-compliant CLR object. Verified via `test_foundation_layer.js`.

---

### GAP-11: Antigravity Native Subagent Registration Adapter
- **Category**: Tooling / Antigravity Platform Adapter
- **Severity**: **P2 High**
- **Evidence**:
  - Specialist subagents are defined as Markdown files under `.agents/agents/*.md`.
  - Dynamic runtime registration into Antigravity subagent tool schemas relies on manual config or prompt inheritance.
- **Impact**:
  - Subagents cannot be automatically loaded via native Antigravity `define_subagent` calls without custom adapter boilerplate.
- **Intended Resolution**:
  - Create a lightweight adapter script (`scripts/register_antigravity_subagents.js`) that reads `.agents/agents/*.md` and generates Antigravity-compatible subagent registration manifests.
  - Governed by ADR-14 and `ARCHITECTURE.md`.
- **Target Phase**: **Phase 10: Antigravity Host Adapter, Concurrency & Checkpoint Recovery**
- **Status**: **Resolved** (Phase 10)
- **Resolution Details**: Created `scripts/register_antigravity_subagents.js` which parses all 14 specialist subagents from `.agents/agents/*.md`, extracts YAML frontmatter, validates against the standard 14-section agent template, and compiles Antigravity-compatible tool definitions (`define_subagent` specifications) with model class mappings (`CHEAP` $\to$ `flash_lite`, `DEFAULT` $\to$ `inherit`, `STRONG` $\to$ `pro`), capability flags, and tool bindings. Created `antigravity_adapter.js` implementing Antigravity task dispatching, concurrency clamping, single-writer exclusivity, and parent self-execution enforcement.
- **Verification Method**:
  - Adapter script parses all 14 agent definition files and emits valid registration payloads matching Antigravity schema. Verified via programmatic inspection and RT-01..RT-18 in `test_phase10_runtime_adversarial.js`.

---

### GAP-12: ADV-01..15 Independent Certification Pipeline Integration
- **Category**: Certification / Release CI
- **Severity**: **P1 Critical**
- **Evidence**:
  - Adversarial certification checks are documented and partially implemented in isolation, but not executed as an integrated pre-packaging release gate in the main pipeline runner.
- **Impact**:
  - Defective APKG packages (e.g. hint answer leaks, circular DAGs, < 4 MCQ options) could bypass checks and be deployed to user study decks.
- **Intended Resolution**:
  - Integrate the 15-point attack harness (`scripts/run_adversarial_certification.js`) directly into the pipeline exit gate.
  - Block `.apkg` release if any of ADV-01 through ADV-15 fail.
  - Governed by ADR-05 and `docs/VALIDATION_AND_CERTIFICATION.md`.
- **Target Phase**: **Phase 9: Independent Certification & Adversarial Verification Harness**
- **Status**: **Resolved** (Milestone 4)
- **Resolution Details**: Created standalone 4-Gate adversarial certifier CLI (`skills/study-source-core/scripts/run_adversarial_certification.js`) implementing independent binary packaging audit: Gate 1 (Physical Completion Evidence verification), Gate 2 (Adversarial Security Matrix ADV-01..15), Gate 3 (Low-Level Binary Packaging PKG-01..15 SQLite schema & Model ID isolation), and Gate 4 (Cross-Artifact Semantic Consistency). Added CLI test harness `test_adversarial_certification_cli.js` (4/4 PASS, 100%) and wired CLI into `package.json` under `"scripts": { "certify": "node scripts/run_adversarial_certification.js" }` and test runner targets.
- **Verification Method**:
  - `npm run certify -- <chapterDir>` executes 4-Gate audit and outputs structured sign-off report with exit code 0 on pass or code 1 on failure. Verified via `test_adversarial_certification_cli.js` in CI.

---

### GAP-13: Canonical Contracts Deep Anti-Leak & Parameter Space Audit
- **Category**: Schema / Anti-Leak
- **Severity**: **P0 Critical**
- **Evidence**:
  - `studylab-canonical-contracts.json` contained 533 contracts, 1,004 parameters, and 1,599 hints that required systematic anti-leak and DAG acyclicity verification after ADR-18 fail-closed invariant introduction.
- **Intended Resolution**:
  - Scan all 533 contracts for premature numerical/option leakage in Tier 1 & 2 hints, cycle detection in solution DAGs, and parameter domain hazards.
- **Target Phase**: **Audit Track 1**
- **Status**: **Resolved** (Track 1)
- **Resolution Details**: Created `scripts/audit_canonical_contracts_antileak.js`. Scanned all 533 contracts (1,004 params, 1,599 hints). Verified 0 hint leaks, 0 DAG cycles, and 0 parameter hazards. Refined `sn1_vs_sn2` regex check to avoid false positives. Authored formal report at `docs/audits/CANONICAL_CONTRACTS_LEAK_AUDIT_REPORT.md`.
- **Verification Method**: `node scripts/audit_canonical_contracts_antileak.js` (100% PASS).

---

### GAP-14: Production Vault Sibling Parity for Map/Europe
- **Category**: Vault / Parity
- **Severity**: **P1 High**
- **Evidence**:
  - `Study Materials/Map/Europe` lacked canonical `MindMap` (`Europe.mindmap.json`) and `SlideDeck` (`Europe_SlideDeckPrompt.md`), causing regression test failures.
- **Intended Resolution**:
  - Author complete sibling deliverables adhering to `map-schema.md` (depth $\ge 3$) and `slide-deck-core-rules.md` (12 mandatory sections).
- **Target Phase**: **Audit Track 4**
- **Status**: **Resolved** (Track 4)
- **Resolution Details**: Subagents `core-mindmap` and `core-slide-deck` authored `Europe.mindmap.json` (42 nodes, 4 branches, depth 3, interactive quiz) and `Europe_SlideDeckPrompt.md` (12 mandatory sections, 8 slides). Both verified via `slide_deck_prompt_audit.js` (100% pass).
- **Verification Method**: `node scripts/slide_deck_prompt_audit.js "Study Materials/Map/Europe/SlideDeck/Europe_SlideDeckPrompt.md"` (100% PASS).

---

### GAP-15: Test Fixture Pedagogical Completeness & 3-Tier Hints
- **Category**: Fixtures / Pedagogical Integrity
- **Severity**: **P1 High**
- **Evidence**:
  - `math_lcm_hcf_source_fixture.json` lacked authentic 3-tier progressive hints, triggering `[MISSING_AUTHORITATIVE_HINTS]` fail-closed errors under ADR-18.
- **Intended Resolution**:
  - Enrich all fixture candidate problems with authentic bilingual 3-tier hints without synthetic fallbacks.
- **Target Phase**: **Audit Track 3**
- **Status**: **Resolved** (Track 3)
- **Resolution Details**: Subagent `math-apkg-author` enriched `math_lcm_hcf_source_fixture.json` and `fresh_math_ap_source_fixture.json` with genuine bilingual progressive hints (Tier 1 Approach, Tier 2 Formula, Tier 3 Setup) with zero answer reveals.
- **Verification Method**: `node scripts/test_e2e_lightweight_question_bank.js` (45/45 PASS, 100%).

---

### GAP-16: 9-Subject Matrix Routing & Zero Silent Omission
- **Category**: Routing / Gating Matrix
- **Severity**: **P2 High**
- **Evidence**:
  - 63-cell matrix across 9 subjects and 7 deliverable tracks required deterministic eligibility and suppression code verification.
- **Intended Resolution**:
  - Audit all 63 cells to ensure zero silent omissions and explicit canonical suppression codes (`NO_IO_CANDIDATES`, `NO_DECLARATIVE_CARDS_AVAILABLE`, etc.).
- **Target Phase**: **Audit Track 5**
- **Status**: **Resolved** (Track 5)
- **Resolution Details**: Created `scripts/test_subject_routing_matrix.js`. Audited all 63 cells: 49 eligible, 14 suppressed, 0 failed. Authored `docs/audits/SUBJECT_ROUTING_MATRIX_AUDIT.md`.
- **Verification Method**: `node scripts/test_subject_routing_matrix.js` (63/63 PASS, 100%).

---

### GAP-17: Windows File Handles & Transient Lifecycle Retries
- **Category**: Windows / Concurrency Lifecycle
- **Severity**: **P2 High**
- **Evidence**:
  - Rapid successive packaging operations could encounter transient Windows `EBUSY`/`EPERM` locks or unclosed `sql.js` database handles.
- **Intended Resolution**:
  - Implement `safeUnlinkSync` and `safeRmdirSync` with synchronous exponential backoff, ensure all `sql.js` handles call `db.close()`, and stress-test 10 rapid cycles.
- **Target Phase**: **Audit Track 6**
- **Status**: **Resolved** (Track 6)
- **Resolution Details**: Enhanced `cleanup_transients.js` with exponential-backoff retries. Closed SQLite instance in `mcq_blackbox_validator.js`. Created `scripts/test_track6_transient_lifecycle.js` and confirmed 10/10 rapid packaging stress cycles passed without error. Authored `docs/audits/WINDOWS_TRANSIENT_LIFECYCLE_AUDIT.md`.
- **Verification Method**: `node scripts/test_track6_transient_lifecycle.js` (10/10 PASS, 100%).

---

### GAP-18: Zero-Heap Streaming APKG Compilation (`better-sqlite3` + `archiver`)
- **Category**: Packaging / Memory Scalability
- **Severity**: **P0 Blocker**
- **Evidence**: `docs/audits/INDEPENDENT_PROFESSIONAL_ADVERSARIAL_AUDIT.md` (`P0-1`, `P0-2`) — In-memory WASM `sql.js` + `jszip.generateAsync({ type: 'nodebuffer' })` buffered entire SQLite collections and media assets in V8 heap.
- **Resolution Details**: Added disk-backed `createAnkiDatabase` (`better-sqlite3`) and `assembleApkgStream` (`archiver`) in `skills/study-source-core/scripts/shared_anki_utils.js`, wired into both `export_anki.js` and `export_studylab_procedural_anki.js` (Commit `52cb2fd`).
- **Verification Method**: `npx vitest run` (45/45 suites PASS).

---

### GAP-19: Configurable Language Policy (`hinglish`, `en`, `hi`, `bilingual`)
- **Category**: Policy / Language
- **Severity**: **P0 Blocker**
- **Evidence**: `docs/audits/INDEPENDENT_PROFESSIONAL_ADVERSARIAL_AUDIT.md` (`Ped-P0-1`) — Hardcoded Hindi-first language policy blocked pure English or conversational Hinglish preferences.
- **Resolution Details**: Added `supported_language_policies: ["hinglish", "en", "hi", "bilingual"]` with default `"hinglish"` in `resources/subject-skill-manifest.json` and `scripts/subject_policy_resolver.js` (Commit `52cb2fd`).
- **Verification Method**: `node scripts/test_subject_policy_resolver.js` (PASS).

---

### GAP-20: Question Bank Tier 3 Hint Leak Scan & 17-Dimension Enforcement
- **Category**: Validation / Pedagogical Integrity
- **Severity**: **P0 Blocker**
- **Evidence**: `docs/audits/INDEPENDENT_PROFESSIONAL_ADVERSARIAL_AUDIT.md` (`Ped-P0-2`, `P1-7`) — `validate_studylab_question_bank.js` only checked `t1`/`t2` hints for answer leaks and omitted 5 of the 17 required pedagogical dimensions.
- **Resolution Details**: Updated `scripts/validate_studylab_question_bank.js` (lines 195–245) to scan `t3` via `hintLeaksAnswer(t3, answer)` and enforce `recognition_signals`, `expected_method`, `decision_points`, `trap`, and `error_category` (Commit `2275762`).
- **Verification Method**: `node scripts/test_studylab_question_bank.js` (30/30 PASS).

---

### GAP-21: Fail-Closed Procedural Contract Resolution (`CANONICAL_CONTRACT_REQUIRED`)
- **Category**: Contracts / Anti-Fallback Invariant
- **Severity**: **P0 Blocker**
- **Evidence**: `docs/audits/INDEPENDENT_PROFESSIONAL_ADVERSARIAL_AUDIT.md` (`P0-5`) — Missing contracts in `resolveDeclarativeContract` silently fell back to generic synthetic stubs.
- **Resolution Details**: Hardened `resolveDeclarativeContract` in `scripts/export_studylab_procedural_anki.js` (lines 389–395) to throw `[CANONICAL_CONTRACT_REQUIRED]` when a contract is absent from `procedural.db` and no explicit archetypes are supplied (Commit `2275762`).
- **Verification Method**: `node scripts/test_phase40_canonical.js` & `node scripts/test_l1_l7_proof_suite.js` (PASS).

---

### GAP-22: Asset Discovery Path Traversal Guard & Blocking IO SHA-256 Check
- **Category**: Security / Visual Pipeline
- **Severity**: **P0 Blocker**
- **Evidence**: `docs/audits/INDEPENDENT_PROFESSIONAL_ADVERSARIAL_AUDIT.md` (`P0-4`, `P1-6`, `P2-5`) — `asset_discovery.js` lacked `..` path traversal sanitization, and `validate_image_occlusion.js` emitted non-blocking warnings for invalid/missing `sha256`.
- **Resolution Details**: Added `[PATH_TRAVERSAL_ERROR]` check in `scripts/asset_discovery.js` (lines 222–231) and promoted invalid/missing `sha256` to blocking `errors.push(...)` in `scripts/validate_image_occlusion.js` (lines 128–143) (Commit `2275762`).
- **Verification Method**: `node scripts/test_visual_asset_pipeline.js` (102/102 PASS).

---

### GAP-23: Basic vs. Cloze 1:1 Verbatim Fact Deduplication
- **Category**: Flashcards / Retrieval Hygiene
- **Severity**: **P0 Blocker**
- **Evidence**: `docs/audits/INDEPENDENT_PROFESSIONAL_ADVERSARIAL_AUDIT.md` (`Ped-P0-3`) — Identical facts appeared in both Basic and Cloze decks (`Math/LCM-HCF` Card 1).
- **Resolution Details**: Implemented `deduplicateBasicAgainstCloze` in `scripts/export_anki.js` (lines 230–277) and replaced the duplicate row in `Study Materials/Math/LCM-HCF/Basic/LCM-HCF_Basic.tsv` and `scripts/ensure_test_fixtures.js` (Commit `2275762`).
- **Verification Method**: `node scripts/test_unified_anki_packaging.js` (14/14 PASS).

---

### GAP-24: `Map/Europe` Multi-Layer Cartographic SVG & Comprehensive Notes
- **Category**: Vault / Cartography & Notes
- **Severity**: **P0 Blocker**
- **Evidence**: `docs/audits/INDEPENDENT_PROFESSIONAL_ADVERSARIAL_AUDIT.md` (`Ped-P0-4`) — `Study Materials/Map/Europe` contained a 5-line rectangle SVG and 15-line stub note.
- **Resolution Details**: Upgraded `Europe_Notes.md`, `europe_map.svg`, `Europe_ImageOcclusion.json` (with 15 authentic European geographic regions and verified SHA-256 hash), and re-compiled `Europe_Anki.apkg` (Commit `2275762`).
- **Verification Method**: `node scripts/note_contract_audit.js "Study Materials/Map/Europe/Notes/Europe_Notes.md"` & `node scripts/test_non_studylab_regression.js` (PASS).

---

### GAP-25: Re-Throw `CONTEXT_PROVENANCE_FAILURE` & Routing Policy Guards
- **Category**: Orchestration & Routing
- **Severity**: **P1 Critical**
- **Evidence**: `docs/audits/INDEPENDENT_PROFESSIONAL_ADVERSARIAL_AUDIT.md` (`P1-1`, `P1-3`, `P1-4`) — `orchestration_engine.js:819` swallowed provenance errors in `catch (e) {}`, and `routing_engine.js` overwrote `bmGraph: false` / `bmQa: false` and omitted `*Json` keys from `PROCEDURAL_TRACK_KEYS`.
- **Resolution Details**: Re-threw `CONTEXT_PROVENANCE_FAILURE` in `scripts/orchestration_engine.js` and updated `scripts/routing_engine.js` (Commit `2275762`).
- **Verification Method**: `node scripts/test_phase7_context_routing.js` & `node scripts/test_phase8_independent_verification.js` (PASS).

---

### GAP-26: PyMuPDF/OCR Page-Range Slicing (`--page-start` / `--page-end`)
- **Category**: Ingestion / PDF Pipeline
- **Severity**: **P1 Critical**
- **Evidence**: `docs/audits/INDEPENDENT_PROFESSIONAL_ADVERSARIAL_AUDIT.md` (`P1-8`, `P2-6`) — `evidence_ingestion_engine.js` did not forward `page_start` / `page_end` to `extract_pdf_source.py`.
- **Resolution Details**: Forwarded `--page-start` and `--page-end` in `scripts/evidence_ingestion_engine.js` (lines 331–338, 612–618) (Commit `2275762`).
- **Verification Method**: `node scripts/test_pdf_ingestion_end_to_end.js` (PASS).

---

### GAP-27: Anki Dark Mode (`.nightMode`) CSS & MCP Server v1.1.0 Expansion
- **Category**: UI & MCP Tooling
- **Severity**: **P2 High**
- **Evidence**: `docs/audits/INDEPENDENT_PROFESSIONAL_ADVERSARIAL_AUDIT.md` (`P2-4`) — Declarative Anki models lacked `.nightMode` CSS rules, and `mcp_server.js` only exposed 4 tools.
- **Resolution Details**: Added `.nightMode.card, .nightMode .card` styling across Models `1600000001–1600000003` in `scripts/export_anki.js` and upgraded `scripts/mcp_server.js` to v1.1.0 with `ingest_source_to_evidence_pack`, `query_procedural_contract`, and extended `validate_artifact` types (`studylab_question_bank`, `image_occlusion`, `note_contract`).
- **Verification Method**: `npx vitest run` (45/45 suites PASS).

---

### GAP-28: Subagent Tool Frontmatter, Wave 3 Auto-Context Resolution & Sibling Parity
- **Category**: Multi-Agent Orchestration & Subagent Tool Permissions
- **Severity**: **P1 Critical**
- **Evidence**: Antigravity subagent loading protocol defaulted all 14 subagents to read-only when YAML frontmatters lacked `tools:`; `orchestration_engine.js` did not auto-populate `candidateVaultTargets` and `noteWordCount` into context leading to premature Wave 3 suppression; `Physics/Newton-Laws-Friction` lacked MindMap, SlideDeck, Graph, and QA Report siblings.
- **Resolution Details**: 
  1. Equipped all 14 `.agents/agents/*.md` definitions with explicit `tools: [write_to_file, replace_file_content, run_command, view_file, list_dir, send_message]` and `inheritMcp: true`.
  2. Auto-populated `candidateVaultTargets` and `noteWordCount` in `orchestration_engine.js` (`buildExecutionTaskGraph`).
  3. Archived duplicate root `agents/` folder into `.agents/legacy_backup/agents/` and updated root `AGENTS.md` and `SKILL.md` to point to `.agents/agents/*.md`.
  4. Authored canonical `MindMap/Newton-Laws-Friction.mindmap.json` (19 nodes, 4 cross-links, 3 quizzes), `SlideDeck/Newton-Laws-Friction_SlideDeckPrompt.md` (8 slides, 12 mandatory sections), `Graph/Newton-Laws-Friction_Graph_Index.json` (+ Obsidian Wikilinks in Note), and `Audit/QA_Report.md`.
- **Verification Method**: `npm test` (46/46 suites PASS), `test_final_audit_harness.js` (10/10 PASS), and `studycore verify Physics Newton-Laws-Friction` (8/8 deliverables PASS).

---

### GAP-29: Master Smoke Test & Anti-Tamper Architectural Integrity Harness
- **Category**: Testing, Verification & Anti-Tamper Enforcement
- **Severity**: **P0 Blocker**
- **Evidence**: Agents/subagents had a recurring tendency during automated sessions to edit validator script assertions or lower thresholds to artificially make tests green, later causing catastrophic downstream failures in production. Additionally:
  1. `scripts/mcp_server.js` crashed on `query_procedural_contract` due to importing undefined methods (`getContractById`, `getContractsByDomain`).
  2. `scripts/note_contract_audit.js` logged noisy stdout banners even when `--json` flag was active, corrupting CLI JSON output.
  3. Pre-existing bundled `.apkg` files in `Study Materials/` lacked `.nightMode` CSS across certain models.
- **Resolution Details**:
  1. Engineered a comprehensive 17-gate end-to-end smoke harness in `skills/study-source-core/scripts/run_master_smoke_test.js` (`npm run smoke`) validating every subject track (Physics, Math, Map/Geography, Chemistry, Reasoning), all CLI verbs (`status`, `ingest`, `package`, `verify`), all 6 MCP tools, raw SQLite schema inspection on `.apkg` packages, adversarial validation (ADV-01..15), and strict anti-leak gates with zero mocks.
  2. Wired `"smoke": "node scripts/run_master_smoke_test.js"` in both workspace root and `skills/study-source-core` `package.json`.
  3. Fixed `scripts/mcp_server.js` to synchronously bind `getContractByKeySync` and `getAllContractsSync`.
  4. Added `{ silent: true }` parameter in `scripts/note_contract_audit.js` and wired it into `scripts/studycore_cli.js` during `--json` operations.
  5. Re-compiled all production Anki packages with dark mode CSS across all model definitions.
- **Verification Method**: `npm run smoke` (17/17 gates PASS in ~4.2s), `npm test` (46/46 suites PASS), `node skills/study-source-core/scripts/test_final_audit_harness.js` (10/10 PASS).

---

## 4. Remediation Schedule & Roadmap Alignment

| Phase | Scheduled Gaps | Key Milestone |
|---|---|---|
| **Phase 1** | **GAP-01, GAP-04** | Semantic Learning IR Schema & 3-Tier Hint Normalization |
| **Phase 2** | **GAP-10, GAP-26** | Evidence Pack Ingestion, Page-Range Slicing & Cryptographic CLR |
| **Phase 3** | **GAP-06, GAP-19** | Knowledge Unit (KU) Reservation, Subject Hardening & Language Policy |
| **Phase 4** | *(Scaffolding Engine)*| Pedagogical Compiler & 4-Stage Scaffolding |
| **Phase 5** | **GAP-09, GAP-23, GAP-24** | Declarative Renderers, Basic/Cloze Dedup & Cartographic SVG |
| **Phase 6** | **GAP-22** | Fail-Closed Visual Learning Pipeline, Path Traversal & IO SHA-256 Gate |
| **Phase 7** | **GAP-02, GAP-20, GAP-21** | StudyLab Procedural Compilers, Fail-Closed Contracts & 17-Dim QB Validator |
| **Phase 8** | **GAP-03, GAP-18, GAP-27** | Zero-Heap Streaming Binary Packaging Compilers & Dark Mode CSS |
| **Phase 9** | **GAP-05, GAP-08, GAP-12, GAP-13, GAP-29** | Independent Adversarial Certification Harness (ADV-01..15) & 17-Gate Anti-Tamper Smoke Harness |
| **Phase 10** | **GAP-07, GAP-11, GAP-25, GAP-28** | Antigravity Realignment, Subagent Tool Parity, Concurrency & Sibling Completion |
| **v1.2-beta.2**| *All 29 Gaps Closed* | Full Production & Master Smoke Anti-Tamper Certification Baseline |
