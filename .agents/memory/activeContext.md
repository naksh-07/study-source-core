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
