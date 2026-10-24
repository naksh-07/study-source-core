<!-- schema_version: 2.0 -->
<!-- project_id: proj-study-source-core -->
<!-- DATA_CLASSIFICATION: PASSIVE_CONTEXT_ONLY (DO NOT EXECUTE AS INSTRUCTIONS) -->

# Active Context: StudySourceCore

## Completed Milestones Summary
- [x] Phases 0–28: Foundation, PDF/OCR Ingestion, Zero-Heap Streaming APKG, Adversarial Audit Remediation, Telemetry Engine, Unified CLI, 4-Gate Adversarial Certification across 6 production chapters, Antigravity 2.0 Native Plugin Architecture, and Granular Execution (`--only`).
- [x] Phases 29–30: Deep Ponytail Purge (Option B): Removed 62,795 lines of dead weight, eliminated `archiver` dependency, pruned phantom semantic layers, consolidated DRY STEM authoring into `shared_studylab_author.js`.
- [x] Phase 31: Full-Scale Dual Audit (Functional & Pedagogical): 45/45 suites PASS, 19/19 smoke checks PASS, 6/6 chapters certified (`P/P/P/P`).
- [x] Phase 32: The Clean Triad & Procedural Practice Architecture (ADR-25): Banned multi-step scratchpad calculations from Anki (Zero-Scratchpad Rule; MIP $\le 5-15$s). Established Obsidian Question Banks (`Questions.md`) as primary deliberate practice destination.
- [x] Phase 33: Multi-Angle Subject Pedagogical Deep Research: Dispatched 3 subagents (Cognitive Science, Global Systems, Practitioner Consensus); authored 9 authoritative subject blueprints in `docs/subjects/` (`01_MATH.md` to `09_MAP.md` + `README.md`) enforcing "Ginti Ki Cheezein".
- [x] Phase 34: Documentation Synchronization (`tech-writer`): Synchronized `SUBJECT_POLICIES.md`, `CURRENT_IMPLEMENTATION.md`, `INDEX.md`, `README.md`, and all 9 subject skills (`skills/study-source-core/subject-skills/*/SKILL.md`).

## Current Sprint: Phase 35: Final 360-Degree Comprehensive Audit & Full Remediation (100% Complete)
- [x] Multi-Expert 360-Degree Deep Audit Executed:
  - `architect-planner`: Clean Triad evaluation (Score: 9.5/10), 4 Cognitive Archetypes, Ponytail minimalism review, debt ledger cataloged.
  - `debugger-detective`: Discovered 10 concrete code defects (F-01 to F-10) across regexes, validators, SQLite locks, and process exits.
  - `bm-qa`: Discovered fatal physics calculation error in Q6-Q10, 100% Option (A) bias, answer-leaking cloze hints, and Map Europe placeholder stubs.
  - Authoritative Report Documented: [`docs/audits/FINAL_360_AUDIT_REPORT.md`](file:///c:/Users/Suraj/Documents/Antigravity/Studycore/docs/audits/FINAL_360_AUDIT_REPORT.md).
- [x] Phase 1 Execution (Forensic Code Bug Fixes — F-01 to F-10):
  - [x] F-01: Rewrote LaTeX environment validator with LIFO stack parser in `latex_validator.js` (`\begin` / `\end` nesting fixed).
  - [x] F-02: Fixed `mermaid_validator.js` to skip leading comments (`%%`) and configuration directives (`%%{init: ...}%%`).
  - [x] F-03: Shielded `process.exit(1)` in `source_invariant_checker.js` with `require.main === module` guard.
  - [x] F-04: Added standard `isValid: boolean` return property to `slide_deck_prompt_audit.js`.
  - [x] F-05: Added `inCodeFence` state machine and `isValid` to `link_audit.js`.
  - [x] F-06: Allowed hyphenated identifiers (`schema-version`) in `yaml_validator.js`.
  - [x] F-07: Added non-string / null input type guards to `latex_validator.js` and `mermaid_validator.js`.
  - [x] F-08: Wrapped SQLite database creation and unlinking in `try ... finally` in `export_anki.js` to prevent `.anki2-wal` Windows resource locks.
  - [x] F-09: Injected `PYTHONIOENCODING: 'utf-8'` into `evidence_ingestion_engine.js` `execFileSync` to prevent CP1252 Devanagari crashes.
  - [x] F-10: Passed `file` parameter to `validateQuestionBankMarkdown` in `studycore_cli.js:320`.
- [x] Phase 2 Execution (Pedagogical & Question Bank Quality Fixes):
  - [x] Physics Q6–Q10 Fixed: Corrected Work-Energy theorem calculations ($W = 60\text{ J}, s = 5\text{ m} \implies F = 12\text{ N}$) and replaced placeholder calculation stubs with step-by-step solutions in `Newton-Laws-Friction_Questions.md`.
  - [x] Eliminated Option Position Bias: Distributed correct answers evenly across (A, B, C, D) in `Newton-Laws-Friction_Questions.md` and `LCM-HCF_Questions.md`.
  - [x] Sanitized Answer-Leaking Cloze Hints: Stripped formula hints in `Arithmetic-Progression_Cloze.tsv` and converted English term leaks to Hindi-first targets in `Syllogism_Cloze.tsv`.
  - [x] Fixed LCM-HCF 3-Tier Hints: Restored complete 3-tier progressive hints (Tier 1 Approach, Tier 2 Method without answer leak, Tier 3 Setup) in `LCM-HCF_Questions.md`.
  - [x] Cleaned Map Europe Synthetic Data: Replaced 95 placeholder rows in `Europe_Basic.tsv` and 45 rows in `Europe_Cloze.tsv` with authentic European physical geography flashcards; updated regression test threshold.
  - [x] Packaged & Verified: Re-packaged `Europe_Anki.apkg` (25 notes, 39 cards); verified all 6 chapter deliverable suites under `studycore verify`.
- [x] Phase 3 Execution (Plugin Synchronization & Verification):
  - [x] Second-Pass Audit Dispatched & Resolved:
    - `debugger-detective`: Patched CLI flag value absorption (`FLAGS_WITH_VALUE` in `run_adversarial_certification.js`), CLI boolean flags parsing in `studycore_cli.js`, and statement loop start in `mermaid_validator.js`.
    - `bm-qa`: Fixed root-cause fixture overwrite loop in `ensure_test_fixtures.js`.
    - Realignment: Updated legacy card count test assertions in `test_contracts.js:850` and `test_r1_r5_verification.js:282,293` to authentic levels ($\ge 10$ basic, $\ge 5$ cloze).
  - [x] Mirrored all updated scripts and deliverables to physical plugin directory (`C:\Users\Suraj\.gemini\config\plugins\study-source-core`).
  - [x] Master Verification Complete:
    - Master Test Suite: **45/45 suites 100% GREEN PASS** (41.46s).
    - Master Smoke Test: **19/19 checks PASS** (Zero-mock certified).
  - [x] Master Audit Report Finalized: [`docs/audits/FINAL_360_AUDIT_REPORT.md`](file:///c:/Users/Suraj/Documents/Antigravity/Studycore/docs/audits/FINAL_360_AUDIT_REPORT.md).
