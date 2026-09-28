<!-- schema_version: 1.0 -->
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
