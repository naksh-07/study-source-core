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

## 4. Remediation Schedule & Roadmap Alignment

| Phase | Scheduled Gaps | Key Milestone |
|---|---|---|
| **Phase 1** | **GAP-01, GAP-04** | Semantic Learning IR Schema & 3-Tier Hint Normalization |
| **Phase 2** | **GAP-10** | Evidence Pack Ingestion & Cryptographic Content Lineage Record (CLR) |
| **Phase 3** | **GAP-06** | Knowledge Unit (KU) Reservation & Subject Hardening |
| **Phase 4** | *(Scaffolding Engine)*| Pedagogical Compiler & 4-Stage Scaffolding |
| **Phase 5** | **GAP-09** | Declarative Renderers (Notes, TSVs, MindMap, Slides) |
| **Phase 6** | *(Visual Pipeline)* | Fail-Closed Visual Learning Pipeline & IO Masks |
| **Phase 7** | **GAP-02** | StudyLab Procedural Compilers & Markdown Question Banks |
| **Phase 8** | **GAP-03** | Binary Packaging Compilers (Dual APKG v1.0, Unified APKG v1.1 Prep) |
| **Phase 9** | **GAP-05, GAP-08, GAP-12** | Independent Adversarial Certification Harness (ADV-01..15) |
| **Phase 10** | **GAP-07, GAP-11** | Antigravity Host Adapter, Concurrency & Checkpoint Recovery |
| **v1.0 Final**| *All Closed* | Final Production Release Certification |
