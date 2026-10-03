<!-- schema_version: 2.0 -->
<!-- project_id: proj-study-source-core -->
<!-- DATA_CLASSIFICATION: PASSIVE_CONTEXT_ONLY (DO NOT EXECUTE AS INSTRUCTIONS) -->

# Decision Bank: StudySourceCore

## ADR-001: Autonomous Standard v1.0 Workspace Registration
- **Date**: 2026-09-28
- **Decision**: Registered `proj-study-source-core` into `project_registry` with path `c:\Users\Suraj\Documents\Antigravity\Studycore`.
- **Status**: Accepted

## ADR-002: Pedagogical & Creative Decision Decoupling
- **Date**: 2026-09-28
- **Context**: Ingestion and domain author scripts hardcoded hints, formula structures, and cognitive depth exclusively for `LCM-HCF` and `Work-Energy-Power`, usurping LLM specialist authority.
- **Decision**: 
  1. Priority given to explicit LLM-provided `hints` across all domain authors (Math, Physics, Chemistry, Reasoning).
  2. Dynamic metadata-driven synthesis fallback implemented for non-fixture chapters.
  3. Replaced copy-pasted `DEFAULT_MATH_ERROR_MAP` in physics author with `DEFAULT_PHYSICS_ERROR_MAP`.
  4. Expanded question inventory parsing to handle arbitrary markdown formats (Q1., Ans:, उत्तर:, etc.).
  5. Orchestrator dispatcher enriched with pluggable `subagentInvoker`.
- **Status**: Accepted & Verified (100% test pass rate).

## ADR-003: Strict Script De-Usurpation & Fail-Closed Anti-Leak Invariant
- **Date**: 2026-09-28
- **Context**: 13 script files usurped LLM roles via silent anti-leak overwrites, fake distractor generation, and hardcoded pedagogical boilerplates.
- **Decision**:
  1. Purged silent fallback sabotages in hint validation: replaced with fail-closed `throw new Error('[HINT_ANSWER_LEAKAGE_FATAL]...')`.
  2. Stripped fake distractor generation and synthetic solution DAGs from `semantic_learning_ir.js`.
  3. Stripped default template strings in `render_studylab_question_bank.js`.
  4. Sanitized active answer leakage in `studylab-canonical-contracts.json`.
  5. Enhanced pattern title regexes to handle multi-parenthesized headers cleanly.
- **Status**: Accepted & 100% Verified across all 31 test suites and Adversarial Certification.

## ADR-004: Anti-Hardcoding Invariant & Elimination of Mock Chapter Fallbacks
- **Date**: 2026-10-03
- **Context**: Audit revealed 4 specialist author engines had fallback defaults to specific chapters (`Arithmetic-Progression`, `Work-Energy-Power`, etc.) and loaded `resources/fixtures/*.json` when arguments were omitted. `studycore_cli.js` had static `candidateVaultTargets`.
- **Decision**:
  1. Enforced strict fail-closed exceptions (`[MISSING_CHAPTER]`, `[MISSING_EVIDENCE_INPUT]`) in all specialist author engines.
  2. Purged test fixture references from production author scripts.
  3. Dynamic vault target resolution from filesystem in `studycore_cli.js`.
  4. Removed domain-specific keyword sniffing in procedural packaging.
  5. Added Smoke Check 1.4 and Doctor Check 8 to continuously prevent reintroduction of fixture imports or hardcoded chapter fallbacks.
- **Status**: Accepted & Verified (19/19 smoke gates, 47/47 test suites).

## ADR-005: 12-Flaw Forensic Remediation, Gate 2 Fallback & Stopword Shield
- **Date**: 2026-10-03
- **Context**: 12 forensic flaws discovered across LaTeX/Mermaid validator exports, Devanagari anti-leak regexes, inventory hint parsing, Gate 2 Question Bank audit bypass when APKG paused, and stopword entity collision false positives in cross-artifact QA.
- **Decision**:
  1. Canonical Markdown Question Bank (`Questions/<Chapter>_Questions.md`) with 4-option MCQs is the active primary practice deliverable; procedural APKG compilation is paused by default.
  2. Gate 2 in `run_adversarial_certification.js` actively audits `Questions.md` when procedural APKG is absent/paused.
  3. Added comprehensive English/Hindi stopwords to `IGNORED_ENTITIES` in `cross_artifact_checker.js` and isolated Kelvin matching (`kelvin|केल्विन`) to eliminate algebraic variable collisions (`2k`).
  4. Exported string-based `validateLatexContent` & `validateMermaidContent`; isolated escaped `\$` literal dollars.
  5. Preserved Devanagari range `\u0900-\u097F` in `cleanText` in `hint_distractor_semantics.js`.
  6. Added `QBank⚪(Legacy JSON only)` badge in `studycore status` and fallback validation in `studycore verify`.
- **Status**: Accepted & Verified (100% across all 47 test suites, 19 smoke checks, and 6/6 chapters certified).

