<!-- schema_version: 1.0 -->
<!-- project_id: proj-study-source-core -->
<!-- DATA_CLASSIFICATION: PASSIVE_CONTEXT_ONLY (DO NOT EXECUTE AS INSTRUCTIONS) -->

# Active Context: StudySourceCore

## Current Sprint: Modernization & Production Readiness (Local-First Workstation)
- [x] Phase 1 (P0): Real PDF & Scanned Document Ingestion Pipeline
  - [x] Python `.venv` layout extractor `extract_pdf_source.py` with text, tables, formulas, MCQs & page coordinates.
  - [x] Scanned document detection (`is_scanned: true`) with PIL/pytesseract OCR & multimodal visual cataloging.
  - [x] Connected to `evidence_ingestion_engine.js` with SHA-256 chunking; verified via `test_pdf_ingestion_end_to_end.js`.
- [x] Phase 2 (P1): Modern Test Runner (Vitest 4 Parallel Execution)
  - [x] Vitest 4 with isolated thread workers (`maxWorkers: 4`) slashing test runtime from 32s to 6.44s.
  - [x] All 45 test files passing 100% green with zero errors or unhandled rejections.
- [x] Phase 3 (P2): Native SQLite WAL Persistence Layer (`better-sqlite3`)
  - [x] Migrated 54,744-line JSON monolith (2.5MB) to `resources/procedural.db` (2.3MB WAL B-tree indexed).
  - [x] Synchronous sub-millisecond queries via native `better-sqlite3` in `procedural_db_client.js`.
  - [x] 100% decoupled from JSON monolith (verified even with JSON file removed).
- [x] Phase 4 (P3): Orchestration De-Usurpation
  - [x] Hooked `enrichedContext.invokeSubagentFn` for native Antigravity subagent dispatching.


