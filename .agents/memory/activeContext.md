<!-- schema_version: 1.0 -->
<!-- project_id: proj-study-source-core -->
<!-- DATA_CLASSIFICATION: PASSIVE_CONTEXT_ONLY (DO NOT EXECUTE AS INSTRUCTIONS) -->

# Active Context: StudySourceCore

## Current Sprint: Final Audit Remediation & Boundary Hardening Complete
- [x] Full Read-Only Audit conducted across all 66 scripts and 14 agent definition files.
- [x] Script De-Usurpation: Replaced fallback hint fabrication in `semantic_learning_ir.js` with fail-closed validation.
- [x] Deprecation: Marked `render_declarative_artifacts.js` as frozen Milestone 3 legacy benchmark mock.
- [x] Agent Boundary Hardening: Sanitized prompts in `.agents/agents/*.md` and `AGENTS.md` (removed mechanical SHA-256 and direct binary parsing).
- [x] Test Suite Hygiene: Fixed `test_milestone3_learning_outputs.js` TEST-3.4; passes 37/37 (100%).
- [x] Full Verification: `npm test` (31 files), `test:milestone4` (19 tests), and Adversarial Certification 100% PASS.
- [x] Documentation & ADRs: Updated `ARCHITECTURE.md`, `README.md`, `DECISIONS.md` with Invariants 9-10 & ADR-18/19.
- [x] Master Audit Blueprint: Authored `docs/audits/MASTER_AUDIT_AND_BUG_HUNTING_PLAN.md` (6 prioritized tracks).
