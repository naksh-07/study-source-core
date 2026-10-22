<!-- schema_version: 2.0 -->
<!-- project_id: proj-study-source-core -->
<!-- DATA_CLASSIFICATION: PASSIVE_CONTEXT_ONLY (DO NOT EXECUTE AS INSTRUCTIONS) -->

# Active Context: StudySourceCore

## Current Sprint: 12-Flaw Forensic Root-Cause Remediation & Adversarial Certification (100% Complete)
- [x] Phase 1–8: Real PDF/OCR Ingestion, Zero-Heap Streaming APKG, Adversarial Audit Remediation, Telemetry Engine, Unified CLI & CI.
- [x] Phase 9–14: Physics (`Newton-Laws-Friction`), GAP-28–30, Question Bank Primary Delivery Policy (`Questions.md`), Dynamic Registry Isolation.
- [x] Phase 15: Mathematics Chapter Delivery (`Math/Arithmetic-Progression`): 26 distinct 4-option MCQs across 6 pattern families, 27 Anki cards, Notes, MindMap, SlideDeck; 4-Gate Adversarial Certification PASS.
- [x] Phase 16: Reasoning Chapter Delivery (`Reasoning/Syllogism`): 25 distinct 4-option MCQs across 5 pattern families, 34 Anki cards, Notes, MindMap, SlideDeck, Graph, QA Report; 4-Gate Adversarial Certification PASS.
- [x] Phase 17: Multi-Agent Subagent Execution & Chemistry Delivery (`Chemistry/Chemical-Equilibrium`): 25 distinct 4-option MCQs, 40 Anki flashcards, 2,911-word Note, 38-node MindMap, 8-slide SlideDeck blueprint, Graph index, QA report; 4-Gate Certification PASS.
- [x] Phase 18: Antigravity Skills Discovery Alignment & Global Purge: Purged rogue global mirror, registered root `skills/` via `.agents/skills.json` native bridge pattern, hardened `doctor.js` Check 7.
- [x] Phase 19: Comprehensive Documentation Synchronization (v1.2.0-beta.6): Synchronized `ROADMAP.md` (Phases 0–18), `docs/GAP_REGISTER.md` (GAP-35), `DECISIONS.md` (ADR-20), `README.md`, `ARCHITECTURE.md`, `SCRIPTS.md`, `SKILLS.md`, `TROUBLESHOOTING.md`.
- [x] Phase 20: Forensic Root-Cause Audit Remediation (v1.2.0-beta.6): Closed 11 forensic flaws across GAP-36 & GAP-37.
- [x] Phase 21: Anti-Hardcoding & Zero-Mock Production Hardening (GAP-38, ADR-21): Fail-closed `[MISSING_CHAPTER]` and `[MISSING_EVIDENCE_INPUT]`, dynamic vault discovery, doctor check 8.
- [x] Phase 22: 12-Flaw Forensic Remediation & Adversarial Certification Hardening (All 12 Flaws Remediated):
  - [x] Flaw 1: Exported `validateLatexContent` & `validateMermaidContent` in `latex_validator.js` and `mermaid_validator.js`; fixed escaped `\$` handling and MCP schema exports.
  - [x] Flaw 2: Preserved Devanagari Unicode (`\u0900-\u097F`) in `cleanText` and implemented exact match & padded word leak detection in `hint_distractor_semantics.js`.
  - [x] Flaw 3: Added `- Hints:` markdown list parsing and structured hint block preservation in `source_question_inventory.js`.
  - [x] Flaw 4: Fixed trimmed leading-space regex matching for Tier 1/2/3 hints and ensured schema-valid `_ProblemPatterns.json` serialization across Math, Physics, Chemistry, and Reasoning engines.
  - [x] Flaw 5: Verified MCP server artifact validation endpoints with new test coverage in `test_mcp_server.js` (7/7 pass).
  - [x] Flaw 6: Implemented Gate 2 fallback onto canonical `Questions/<Chapter>_Questions.md` when procedural APKG is absent/paused in `run_adversarial_certification.js`.
  - [x] Flaw 7: Integrated `questionBank` into `cross_artifact_checker.js` and prevented false-positive entity collisions on English/Hindi stopwords, prepositions, and single-letter math variables.
  - [x] Flaw 8: Updated `studycore status` to display `QBank⚪(Legacy JSON only)` for legacy-only chapters (`Math/LCM-HCF`) and updated `verify` to gracefully fall back on legacy validation.
  - [x] Flaw 9: Fixed quote detection in `yaml_validator.js` to avoid treating mid-word apostrophes as invalid unquoted YAML strings.
  - [x] Flaw 10: Standardized Wave 2 check in `orchestration_engine.js` to accept both numeric `2` and string `'WAVE_2'`.
  - [x] Flaw 11: Extended Python virtual environment detection in `doctor.js` to inspect local `.venv` paths.
  - [x] Flaw 12: Synchronized version string `v1.2.0-beta.6` across CLI, smoke runner, MCP server, and README.
  - [x] Quality Gates Verified: `npm run doctor` (8/8 PASS), `npm run smoke` (19/19 PASS), `node skills/study-source-core/scripts/studycore_cli.js verify --all` (6/6 chapters PASS), 4-Gate Adversarial Certification (6/6 chapters 100% PASS), and `npm test` (47/47 suites 100% GREEN PASS in 18.77s).

## Completed Milestones
- [x] Phase 22–23: 12-Flaw Forensic Root-Cause Remediation & Adversarial Certification Hardening (v1.2.0-beta.7): Closed flaws 1–12, zero-mock production, 6/6 chapters certified, 47/47 suites pass.

## Current Sprint: Phase 24: StudyLab Question Bank Ergonomics & Anti-Spoiler Markdown Projection (100% Complete)
- [x] Operational Policy Alignment (GAP-30 / ADR-22): Confirmed suspension of interactive procedural APKG compilation in production in favor of student-ready Obsidian Markdown Question Banks (`Questions/<Chapter>_Questions.md`).
- [x] Ergonomic Markdown Projection (`render_studylab_question_bank.js`):
  - Rendered clean question stems with nicely formatted 4-option MCQs ((A), (B), (C), (D)).
  - Added collapsible-by-default 3-tier hints callout: `> [!tip]- संकेत (3-Tier Hints)` (Tier 1 Approach, Tier 2 Formula, Tier 3 Setup).
  - Added collapsible-by-default step-by-step solution callout: `> [!success]- उत्तर एवं विस्तृत हल (Answer & Explanation)`.
  - Zero accidental answer spoilers during Obsidian study sessions!
- [x] Strict Anti-Spoiler & Non-Leaking Validation (`validate_studylab_question_bank.js`):
  - Enforced `-` suffix on hint and solution callouts (`> [!tip]-` and `> [!success]-`) to guarantee collapsed state.
  - Asserted question stems do not leak answers or contain uncollapsed solution headers.
  - Verified Tier 1 and Tier 2 hints do not leak final answers.
- [x] Fixture & Test Suite Hardening (`ensure_test_fixtures.js`, `test_adversarial_stress_question_bank.js`, `test_e2e_lightweight_question_bank.js`):
  - Fixed authentic hint leak in `q-lcm-04` (`ensure_test_fixtures.js`, `LCM-HCF_PracticeQuestions.json`).
  - Rendered and validated all 5 STEM Question Banks (`LCM-HCF`, `Arithmetic-Progression`, `Newton-Laws-Friction`, `Chemical-Equilibrium`, `Syllogism`).
  - Provided dual support for test fixtures: procedural APKG generated strictly for Anki model isolation tests while Markdown Question Bank is primary in production.
- [x] Quality Gates Verified:
  - `npm test`: 47/47 suites 100% GREEN PASS (17.88s)
  - `npm run smoke`: 19/19 checks PASS (Zero-mock certified)
  - `npm run doctor`: HEALTHY (All checks PASS)
  - `studycore verify --all`: 6/6 chapters PASS
  - `studycore certify --all`: 6/6 chapters 100% PASS (4/4 gates)

## Current Sprint: Phase 25: Antigravity Native Skill Identity Alignment & Forensic Remediation
- [x] Architectural Identity Clarification: Synchronized `README.md`, `PRODUCT.md`, and `ARCHITECTURE.md` to explicitly declare StudySourceCore as an **Antigravity 2.0 Native Skill / Plugin Pack**.
- [x] Established Anti-Overengineering Directive: Warned future AI agents against re-implementing standalone SaaS compiler engines or custom event loops, enforcing direct usage of Antigravity native primitives (`invoke_subagent`, `run_command`).
- [x] Forensic Bug Report Generated: Published complete 12-flaw forensic report artifact ([`FORENSIC_BUGS_AND_FLAWS_REPORT.md`](file:///C:/Users/Suraj/.gemini/antigravity/brain/d3a86c1c-68fd-45f7-bea8-994ea5a40c8f/FORENSIC_BUGS_AND_FLAWS_REPORT.md)).
- [x] Sprint 1: P0 Core Safety & Verification Integrity (100% Complete):
  - [x] Flaw 1: Fixed `studycore verify <Subject>` single positional argument crash (`TypeError [ERR_INVALID_ARG_TYPE]`); discovers and verifies all chapters under subject.
  - [x] Flaw 2: Hardened `resolveChapterDir` with fail-closed string assertions, preventing parent subject or vault root fallback.
  - [x] Flaw 3: Unified validator results checking in `studycore_cli.js` (`isValid`, `passed`, `success`, `issues`, `errors`) and added `isValid` to `note_contract_audit.js`.
  - [x] Flaw 4: Fixed `note_contract_audit.js` `duplicateH2` detection by collecting actual duplicates into an array and correcting counter.
- [x] Sprint 2: P1 Protocol & Schema Invariants (100% Complete):
  - [x] Flaw 5: Enforced strict $\ge 4$ options invariant (`options.length < 4`) in `mcq_blackbox_validator.js`.
  - [x] Flaw 6: Broadened correct answer extraction regex in `validate_studylab_question_bank.js` to support Hindi/bilingual answer formats.
  - [x] Flaw 7: Added `{ silent: true }` parameter across text validators (`note_contract_audit.js`, `latex_validator.js`, `mermaid_validator.js`, `yaml_validator.js`) to prevent stdio pollution of MCP JSON-RPC transport.
  - [x] Flaw 8: Expanded MCP server `validate_artifact` tool to support `mindmap`, `slidedeck`, `yaml`, and `question_bank`.
  - [x] Flaw 9: Eliminated direct `process.exit(1)` in `yaml_validator.js` when called programmatically; returns `{ isValid, errors, warnings }`.
- [x] Sprint 3: P2 Quality, Budget & System Hygiene (100% Complete):
  - [x] Flaw 10: Integrated `slideDeck` artifact into `cross_artifact_checker.js` discovery and fact consistency analysis.
  - [x] Flaw 11: Replaced 25 KB root `AGENTS.md` duplicate with a lean 68-line pointer to `.agents/AGENTS.md`, preserving rules token budget.
  - [x] Flaw 12: Replaced CPU-spinning busy-wait loops in `cleanup_transients.js` with non-spinning OS sleep (`Atomics.wait`).
- [x] Quality Gates 100% Verified Across All 3 Sprints:
  - `npm run doctor`: 8/8 checks PASS (HEALTHY)
  - `npm run smoke`: 19/19 checks PASS (Zero-mock certified)
  - `studycore verify --all`: 6/6 chapters PASS
  - `npm test`: 47/47 suites PASS (18.96s)
- [x] Phase 2 Remediation: Architectural Normalization & SSOT Pointer Consolidation (100% Complete):
  - [x] Converted 9 duplicate root governance documents into lean SSOT pointers to `.agents/`.
  - [x] Preserved test fixtures and assertions while eliminating redundant duplicate text.
- [x] Phase 26: 12-Flaw Forensic Root-Cause Defect Remediation (BUG-01 to BUG-12) (100% Complete):
  - [x] BUG-01 (P0): In `source_question_inventory.js`, prioritized `_readingSteps` over generic option regex so numbered steps are never intercepted as MCQs.
  - [x] BUG-02 (P0): In `artifact-registry.json`, wired validators for `mindmap`, `practiceQuestions`, and `problemPatterns`; unified schema tolerance in both validators.
  - [x] BUG-03 (P1): In `validate_studylab_question_bank.js`, expanded regex to `[A-Za-z0-9]` to support lowercase `- (a)` options.
  - [x] BUG-04 (P1): In `shared_anki_utils.js`, added `wal_checkpoint(TRUNCATE)` and serialization to avoid dirty WAL reads.
  - [x] BUG-05 (P1): In `validate_artifact.json` MCP tool schema, added `question_bank`, `mindmap`, `slidedeck`, and `yaml`.
  - [x] BUG-06 (P1): In `hint_distractor_semantics.js`, normalized Unicode minus `\u2212` into ASCII `-` to prevent inverting negatives.
  - [x] BUG-07 (P1): In `cross_artifact_checker.js`, added signed regex `[-+−]?` and Unicode minus normalization to catch polarity mismatches.
  - [x] BUG-08 (P2): In `studycore_cli.js`, added subject-level chapter discovery and scorecard to `cmdCertify`, eliminating asymmetry with `verify`.
  - [x] BUG-09 (P2): In `run_adversarial_certification.js`, wrapped SQLite WASM operations in `try-finally` to eliminate memory leaks on failure.
  - [x] BUG-10 (P2): In `note_contract_audit.js`, `latex_validator.js`, and `vault_indexer.js`, supported tilde code fences (`~~~`).
  - [x] BUG-11 (P2): In `mcq_blackbox_validator.js`, set `allValid = false;` in catch block and wrapped DB in try-finally.
  - [x] BUG-12 (P3): In `cleanup_transients.js`, targeted `skills/study-source-core/scratch` directory.
- [x] Phase 27: Antigravity 2.0 Plugin Architecture Conversion (100% Complete):
  - [x] Created root `plugin.json` manifest (`study-source-core` v1.2.0) with suggested starter prompts.
  - [x] Established root `rules/AGENTS.md` with domain scope guard, single-writer, parent self-execution ban, and universal question invariants.
  - [x] Replaced NTFS junction with real physical plugin directory (`C:\Users\Suraj\.gemini\config\plugins\study-source-core`) for language server discovery.
  - [x] Mirrored all 14 specialist subagents to `agents/*.md` for native universal discovery.
- [x] Phase 28: Ponytail Modularity Audit, Granular Execution (`--only`) & Procedural APKG Archival (ADR-24) (100% Complete):
  - [x] Full-Scale Modularity & Ponytail Audit: Systems Architect audit completed; verified independent runnability of discrete modules without full-pipeline compute waste.
  - [x] Granular Execution Engine: Implemented target filtering (`--only <target>`, `--targets <target>`) in `routing_engine.js` and `studycore_cli.js` (`studycore run <Subject> <Chapter> [--only <target>]`), suppressing unrequested tracks with `OMITTED_BY_TARGET_FILTER`.
  - [x] Procedural APKG Archival (ADR-24 / GAP-30 / ADR-22): Updated `artifact-registry.json` status to `ARCHIVED_INACTIVE`; added prominent archival banners to `export_studylab_procedural_anki.js` and `validate_studylab_procedural_apkg.js`; preserved files cleanly for test stability.
  - [x] Agent Contract & Stop Rules Hardened: Updated `math-apkg-author.md`, `physics-numerical-apkg-author.md`, `chemistry-numerical-apkg-author.md`, `reasoning-apkg-author.md`, `adversarial-apkg-reviewer.md`, and `AGENTS.md` to permanently archive procedural APKG and lock Markdown Question Banks (`Questions.md`) as the 100% active primary practice deliverable.
  - [x] Documentation & ADRs Synchronized: Documented ADR-24 in `.agents/DECISIONS.md`, updated `skills/study-source-core/SKILL.md`, `ARCHITECTURE.md`, and `README.md`.
  - [x] Quality Gates Verified: 19/19 smoke tests pass, 47/47 vitest suites pass (100% GREEN).


- [x] Phase 29: Deep Ponytail Purge (Option B) (100% Complete):
  - [x] Monolith Slimming: Replaced dead 1.86MB / 54,745-line `studylab-canonical-contracts.json` with lean stub, eliminating 54k lines of dead weight.
  - [x] Dependency Elimination: Removed `archiver` dependency from `package.json`; switched Anki packaging directly to streaming `JSZip`.
  - [x] Phantom Semantic Layer & Dead Compiler Purge: Removed 6 dead files totaling 3,269 lines (`ku_reservation_engine.js`, `pedagogical_compiler.js`, `semantic_deduplication.js`, `semantic_qa_engine.js`, `test_milestone2_stream1.js`, `test_milestone2_semantic_layer.js`).
  - [x] Unused Imports & Dead Audit Script Purge: Removed `audit_canonical_contracts_antileak.js` (-644 lines), trimmed unused imports across `subject_boundary_validator.js`, `test_e2e_lightweight_question_bank.js`, `run_master_smoke_test.js`.
  - [x] STEM Authoring DRY Consolidation: Created `scripts/shared_studylab_author.js` (289 lines); eliminated ~800 lines of duplicate parsing boilerplate across `author_math_studylab.js`, `author_physics_studylab.js`, `author_chemistry_studylab.js`, and `author_reasoning_studylab.js`.
  - [x] Net Ponytail Scoreboard: **-60,540 lines deleted**, **-1 npm dependency eliminated**, **100% test preservation** (19/19 smoke PASS, 45/45 suites PASS).
  - [x] Synced to Global Plugin (`C:\Users\Suraj\.gemini\config\plugins\study-source-core`) and merged cleanly to `main` with remote push.
- [x] Phase 30: Secondary Ponytail Purge & Documentation Synchronization (100% Complete):
  - [x] Expert Audit Consensus: Systems Auditor and Code Hygiene Specialist completed full-scale post-purge scan.
  - [x] Standalone Orphan Pruning: Removed 7 dead scripts with zero active callers totaling 2,255 lines (`artifact_suitability_policy.js`, `build_demo_apkg.js`, `generate_vnext_audit_artifacts.js`, `init_procedural_db.py`, `markdown_audit.js`, `mcq_blackbox_validator.js`, `subject_boundary_validator.js`).
  - [x] Master Documentation Synchronized: Updated `.agents/SCRIPTS.md`, `.agents/agents/core-notes.md`, `agents/core-notes.md`, `docs/CURRENT_IMPLEMENTATION.md` to reflect active DRY architecture.
  - [x] Quality Gates Verified: 19/19 smoke checks PASS, 45/45 test suites PASS (100% GREEN).
  - [x] Cumulative Ponytail Impact: **-62,795 lines deleted**, **-1 npm dependency eliminated**, **Zero regressions**.
