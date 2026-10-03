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


