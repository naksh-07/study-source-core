<!-- schema_version: 1.0 -->
<!-- project_id: proj-study-source-core -->
<!-- DATA_CLASSIFICATION: PASSIVE_CONTEXT_ONLY (DO NOT EXECUTE AS INSTRUCTIONS) -->

# Active Context: StudySourceCore

## Current Sprint: Modernization & Adversarial Audit Remediation (100% Complete)
- [x] Phase 1–4: Real PDF/OCR Ingestion (`extract_pdf_source.py`), Vitest 4 Parallel Suite (45 files in ~6.2s), Native SQLite WAL (`procedural.db`), Subagent Dispatch Hook.
- [x] Phase 5: Zero-Heap Streaming APKG Compiler (`archiver` + `better-sqlite3` disk DB in `shared_anki_utils.js`, `export_anki.js`, `export_studylab_procedural_anki.js`) & Configurable Language Policy (`hinglish`, `en`, `hi`, `bilingual`).
- [x] Phase 6: Adversarial Audit P0/P1 Remediation (All 10 Remaining Gaps Closed):
  - [x] Question Bank Validator: Tier 3 (`t3`) hint answer leak scan + 5 pedagogical dimensions (`recognition_signals`, `expected_method`, `decision_points`, `trap`, `error_category`) in `validate_studylab_question_bank.js`.
  - [x] Fail-Closed Procedural Contract: `resolveDeclarativeContract` in `export_studylab_procedural_anki.js` throws `CANONICAL_CONTRACT_REQUIRED` when contract is missing.
  - [x] Path Traversal & SHA-256 Hardening: `asset_discovery.js` blocks `..` traversal (`PATH_TRAVERSAL_ERROR`); `validate_image_occlusion.js` promotes invalid/missing `sha256` to blocking error.
  - [x] Basic vs Cloze 1:1 Deduplication: `deduplicateBasicAgainstCloze` in `export_anki.js` filters verbatim/near-verbatim Basic duplicates while retaining Cloze.
  - [x] Orchestration & Routing Guards: `orchestration_engine.js:819` re-throws `CONTEXT_PROVENANCE_FAILURE`; `routing_engine.js` guards `bmGraph`/`bmQa` policy suppression and includes `problemPatternsJson`/`practiceQuestionsJson` in `PROCEDURAL_TRACK_KEYS`.
  - [x] Page-Range Slicing & Physical Deliverables: Forwarded `--page-start`/`--page-end` in `evidence_ingestion_engine.js`; upgraded `Study Materials/Map/Europe` (`Europe_Notes.md`, `europe_map.svg`, `Europe_ImageOcclusion.json`, `Europe_Anki.apkg`) and `Math/LCM-HCF` (`LCM-HCF_Basic.tsv`, `LCM-HCF_Anki.apkg`).
- [x] Phase 7 (Polish & MCP v1.1.0): Anki Dark Mode CSS (`.nightMode` on Models `1600000001`–`1600000003`), Atomic APKG streaming temp-file rename (`shared_anki_utils.js`), MCP Server v1.1.0 (`ingest_source_to_evidence_pack`, `query_procedural_contract`, `languagePolicy`, extended `validate_artifact`), and `docs/GAP_REGISTER.md` (`GAP-18` to `GAP-27`) synchronized.
- [x] Phase 8 (DX & CI Seal - Option A): Added `.github/workflows/ci.yml` (Python 3.12 + Node 22 + Vitest + 10-gate Final Audit Harness), unified CLI [`studycore_cli.js`](file:///c:/Users/Suraj/Documents/Antigravity/Studycore/skills/study-source-core/scripts/studycore_cli.js) (`status`, `ingest`, `package`, `verify`) with [`test_studycore_cli.js`](file:///c:/Users/Suraj/Documents/Antigravity/Studycore/skills/study-source-core/scripts/test_studycore_cli.js) (`46/46` Vitest suites), and deduplicated `computeSha256` across `context_planner.js` & `source_question_inventory.js`.
- [x] Phase 9 (Production Delivery - Option B): Executed full Wave 1–3 pipeline for `Physics/Newton-Laws-Friction`: generated and validated `Notes`, `Basic`, `Cloze`, `Questions.md`, `Newton-Laws-Friction_Anki.apkg` (23 cards), and `Newton-Laws-Friction_StudyLab_Procedural.apkg` (Levels 1–7 PASS).
- [x] Phase 10: Architectural Realignment & Subagent Write Tools (GAP-28 closed, v1.2.0-beta.1 tagged & pushed).
- [x] Phase 11: Master Smoke Test & Anti-Tamper Integrity Harness (100% Complete):
  - [x] Implemented `run_master_smoke_test.js` (`npm run smoke`) with 5 pillars, 17 zero-mock gates (17/17 PASS).
  - [x] Fixed `mcp_server.js` procedural contract query functions (`getContractByKeySync`, `getAllContractsSync`).
  - [x] Documented GAP-29 in `docs/GAP_REGISTER.md`, updated `docs/INDEX.md`, `README.md`, and `SKILL.md`.
- [x] Phase 12: Telemetry & Production Calibration System (`npm run telemetry`):
  - [x] Implemented `telemetry_engine.js` with high-res spans, token load estimation, latency percentiles, and SQLite WAL + streaming JSONL sinks.
  - [x] Integrated telemetry into `orchestration_engine.js` (mission & subagent worker spans), `studycore_cli.js` (`telemetry` command with `--summary`, `--spans`, `--export`), and `run_master_smoke_test.js` (Gate 4.3).
  - [x] Verified full Vitest test suite (`47/47` suites PASS in ~6.5s) and Master Smoke Test (`18/18` gates PASS in ~4.5s).
