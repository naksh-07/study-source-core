# Current Implementation Baseline (`docs/CURRENT_IMPLEMENTATION.md`)

## 1. Overview & Baseline State

This document provides a factual, transparent assessment of the StudySourceCore repository as of **v1.2.0-beta.6 Production Baseline**.

It details the code, scripts, schemas, subagent definitions, and test suites that are actively implemented, passing, and functional in the repository today.

### Baseline Health Summary
- **Core Test Suite**: **47 of 47 test suites passing (100% pass rate)** via `npm test` using sequential fail-closed harness `scripts/run_all_tests.js` in ~18 seconds.
- **Master Smoke Test & Anti-Tamper Integrity**: **19 of 19 zero-mock gates passing (100% pass rate)** via `npm run smoke` in ~5.5 seconds.
- **Environment Doctor Diagnostics**: 8 automated checks passing via `npm run doctor` (validating Node.js, npm, git, dependencies, paths, permissions, MCP server, `.agents/skills.json` discovery, and production scripts anti-mock purity).
- **Targeted Test Suites**:
  - `npm run smoke`: 19-gate zero-mock architectural anti-tamper, anti-hardcoding, and 5-domain end-to-end verification.
  - `npm run telemetry`: Live span tracing, token load budgeting, and latency percentile scorecard.
  - `npm run certify -- --chapter <Chapter> --subject <Subject>`: Standalone 4-Gate Adversarial Certification CLI (with Gate 2 Question Bank fallback).
  - `npm run test:milestone4`: Closed-boundary model isolation, physical completion evidence gate, and adversarial certification.
  - `npm run test:phase10`: Concurrency clamping (MAX_CONCURRENT_WORKERS = 4), crash-resilient atomic checkpoints, and runtime adversarial matrix.
  - `npm run test:legacy`: Direct Node runner executing the original 28 standalone validation scripts.
- **Primary Runtime Engine**: Node.js v20+ / v22+ LTS (ES modules and CommonJS interop).
- **Core Dependencies**: `ajv` (JSON Schema validation), `archiver` + `better-sqlite3` (zero-heap streaming compiler), `jszip`, `sql.js`, `zod` (runtime schema parsing), `@modelcontextprotocol/sdk` (MCP server integration).
- **Active Primary Practice Deliverable**: Canonical Markdown Question Banks (`Questions/<Chapter>_Questions.md`) adhering to GAP-30/ADR-22 with strict 4-option MCQs (`(A)`, `(B)`, `(C)`, `(D)`) and non-leaking hints; procedural APKGs permanently paused by default in production. Gate 2 in adversarial certification actively audits Question Banks.
- **Certified Chapter Catalog**: 6 fully verified production chapters:
  1. `Map / Europe`: Cartographic multi-layer SVG, Notes, 20 Basic, 20 Cloze, IO manifest, 40-note Anki APKG.
  2. `Math / LCM-HCF`: Notes, 20 Basic, 20 Cloze, Practice Questions, Anki APKG, StudyLab APKG (`QBank⚪(Legacy JSON only)` status).
  3. `Math / Arithmetic-Progression`: Notes, Basic TSV, Cloze TSV, MindMap, SlideDeck, 26 distinct 4-option MCQs across 6 pattern families, Anki APKG.
  4. `Physics / Newton-Laws-Friction`: Notes, Basic TSV, Cloze TSV, MindMap, SlideDeck, Question Bank, 23-card Anki APKG, StudyLab APKG.
  5. `Reasoning / Syllogism`: Notes, Basic TSV, Cloze TSV, MindMap, SlideDeck, 25 distinct 4-option MCQs across 5 pattern families, Anki APKG, Graph Index, QA Report.
  6. `Chemistry / Chemical-Equilibrium`: Notes (2,911 words), Basic TSV, Cloze TSV, MindMap (38 nodes), SlideDeck (8 slides), 25 distinct 4-option MCQs across 5 pattern families, Anki APKG, Graph Index, QA Report (Authored by 8 live subagents, 4/4 Adversarial Certification PASS).
- **Deficiencies & Resolutions**: Fully tracked in [`docs/GAP_REGISTER.md`](./GAP_REGISTER.md) (GAP-01 through GAP-39, 100% resolved).

---

## 2. Directory Layout & Repository Inventory

```
StudySourceCore/
├── ARCHITECTURE.md                  # Tier 0: 6-Tier Architecture & System Invariants
├── PRODUCT.md                       # Tier 0: Product Identity, Principles & Non-Goals
├── ROADMAP.md                       # Tier 0: 11 Implementation Phases (Phases 0–10 Certified)
├── README.md                        # Master repository overview and quickstart
├── CONTRIBUTING.md                  # Developer guidelines and contribution protocol
│
├── docs/                            # Tier 1: Canonical Technical Specifications & Audits
│   ├── LEARNING_PRINCIPLES.md       # Cognitive load, 4-stage progression, 17 dimensions
│   ├── SUBJECT_POLICIES.md          # 9-subject policy matrix & suppression codes
│   ├── STUDYLAB_SPECIFICATION.md    # StudyLab procedural IR, 3-tier hints, DAGs
│   ├── KNOWLEDGE_UNITS.md           # Knowledge Units (KU), deduplication, reservations
│   ├── VISUAL_LEARNING.md           # 9-stage visual pipeline, IO coordinate constraints
│   ├── PROVENANCE_AND_LINEAGE.md    # 4-tier provenance hierarchy & 11-field CLR schema
│   ├── VALIDATION_AND_CERTIFICATION.md # 5 quality stages, 15 adversarial checks (ADV-01..15)
│   ├── ORCHESTRATION_AND_EXECUTION.md  # Subagent DAGs, Parent Self-Execution Ban
│   ├── RENDERING_PIPELINE.md        # 7 format renderers, projection philosophy
│   ├── ANKI_INTEGRATION.md          # Dual APKG v1.0, Model IDs 1600000001–1600000004
│   ├── SECURITY_AND_TRUST.md        # Zero-trust model, path traversal, injection defenses
│   ├── GOVERNANCE.md                # Authority hierarchy, ADR protocol, single-rule ownership
│   ├── GAP_REGISTER.md              # Authoritative register of known gaps and resolutions
│   ├── CURRENT_IMPLEMENTATION.md    # Active baseline assessment & test inventory
│   ├── audits/                      # Historical audit reports & verification proofs (11 files)
│   ├── archive/                     # Retired drafts & archive indexes
│   └── target_architecture/         # Forward-looking target architecture specifications
│   └── STUDYSOURCECORE_*            # Test-retained legacy specifications with epistemic annotations
│
├── .agents/                         # Tier 2: Machine Governance & Subagent Definitions
│   ├── README.md                    # Agent Operations Manual
│   ├── AGENTS.md                    # Master Subagent Registry & 14-Section Template
│   ├── OWNERSHIP.md                 # Single-Writer Rule & Parent Self-Execution Ban
│   ├── DATA_FLOW.md                 # End-to-end 6-stage transformation pipeline
│   ├── EXECUTION_LIFECYCLE.md       # 3-Wave execution protocol & concurrency limits
│   ├── FREEZE_MAP.md                # 5-Tier component governance & freeze boundaries
│   ├── DECISIONS.md                 # Architecture Decision Records (ADR-01 through ADR-20)
│   ├── TROUBLESHOOTING.md           # Diagnostic decision trees & error triage
│   ├── SKILLS.md                    # Skills Registry
│   ├── RESOURCES.md                 # Schemas & Contracts Index
│   ├── SCRIPTS.md                   # Executable Scripts Registry
│   ├── skills.json                  # Native Antigravity skills discovery config ("skills")
│   └── agents/                      # 14 specialist subagent definition prompts
│
├── skills/
│   └── study-source-core/           # StudySourceCore Skill & Tooling Implementation
│       ├── SKILL.md                 # Master skill prompt and operational instructions
│       ├── package.json             # NPM dependencies and 27-suite test harness
│       ├── resources/               # Authoritative JSON Schemas and markdown contracts
│       ├── scripts/                 # Core implementation scripts, tools, and test suites
│       └── subject-skills/          # Domain DNA skills (Math, Physics, Chemistry, etc.)
│
├── Sources/                         # Ingested study source materials (PDFs, raw texts)
├── Study Materials/                 # Production study vault deliverables
└── scratch/                         # Ephemeral evidence packs, IR artifacts, transients
```

---

## 3. Core Script Catalog (`scripts/`)

The implementation logic is partitioned into focused, single-responsibility scripts under `skills/study-source-core/scripts/`:

### 3.1 Routing, Policies & Orchestration
| Script File | Purpose | Active Status | Primary Dependencies |
|---|---|---|---|
| `subject_policy_resolver.js` | Resolves Subject $\times$ Artifact policies, applies domain aliases, emits suppression codes. | `[CURRENT]` Production | None (Pure JS) |
| `routing_engine.js` | Determines subagent execution matrix based on evidence pack profile and subject policy. | `[CURRENT]` Production | `subject_policy_resolver.js` |
| `orchestration_engine.js` | Executes multi-agent dispatch DAG, manages checkpoint state, enforces resource limits (max 4 workers). | `[CURRENT]` Production | `routing_engine.js`, `execution_state.js` |
| `execution_state.js` | Manages persistent orchestration checkpoint state with atomic writes (.tmp $\to$ fsync $\to$ rename) and SHA-256 state checksum. | `[CURRENT]` Production | Node `fs`, `path`, `crypto` |
| `antigravity_adapter.js` | Antigravity host adapter decoupling tasks, workers, and conversations; enforces Parent Self-Execution Ban. | `[CURRENT]` Production | `orchestration_engine.js` |
| `register_antigravity_subagents.js` | Compiles Antigravity-compatible subagent tool definitions from `.agents/agents/*.md`. | `[CURRENT]` Production | Node `fs`, `path` |
| `path_resolver.js` | Computes standardized file paths for all chapter artifacts based on registry rules; traverses upward with multi-marker detection (`Study Materials`+`Sources`, `.agents`, `agents`, `.git`+`skills`) and prioritizes `STUDYCORE_VAULT_ROOT` environment override. | `[CURRENT]` Production | `artifact_registry.js` |
| `artifact_registry.js` | Authoritative reader and validator for `artifact-registry.json`. | `[CURRENT]` Production | `path_resolver.js` |

### 3.2 Ingestion, Lineage & Semantic Learning IR
| Script File | Purpose | Active Status | Primary Dependencies |
|---|---|---|---|
| `evidence_pack_ingestion.js` | Parses and indexes source evidence packs into immutable, coordinate-tracked chunks. | `[CURRENT]` Production | Node `crypto`, `fs` |
| `content_lineage_record.js` | Canonical 11-field Content Lineage Record (CLR) engine establishing bidirectional cryptographic traces. | `[CURRENT]` Production | Node `crypto` |
| `semantic_learning_ir.js` | Normalizes study concepts and problems into typed, medium-neutral Semantic Learning IR instances. | `[CURRENT]` Production | `content_lineage_record.js` |
| `validate_semantic_ir.js` | Independent AST and Draft-07 JSON schema validator for Semantic Learning IR nodes. | `[CURRENT]` Production | `ajv` |

### 3.3 Knowledge Engine & Pedagogical Compiler
| Script File | Purpose | Active Status | Primary Dependencies |
|---|---|---|---|
| `ku_reservation_engine.js` | Pre-dispatch allocation of conceptual and procedural Knowledge Units (KUs) with collision prevention. | `[CURRENT]` Production | Pure JS |
| `semantic_deduplication.js` | Cross-track semantic deduplication preserving the `1 Pattern != 1 Question` invariant. | `[CURRENT]` Production | Node `crypto` |
| `pedagogical_compiler.js` | Instructional compiler transforming IR nodes into 4-stage scaffolding (Example $\to$ Faded $\to$ Practice $\to$ Transfer). | `[CURRENT]` Production | Pure JS |
| `hint_distractor_semantics.js` | Audits 3-tier progressive hints against answer leaks and synthesizes trap-driven plausible distractors ($\ge 4$ options). | `[CURRENT]` Production | Pure JS |
| `subject_boundary_validator.js` | Enforces domain centroid taxonomies and detects foreign subject contamination across outputs. | `[CURRENT]` Production | Pure JS |
| `artifact_suitability_policy.js` | Enforces the $9\text{-subject} \times 13\text{-artifact}$ eligibility matrix and suppression codes. | `[CURRENT]` Production | Pure JS |
| `semantic_qa_engine.js` | Integrated semantic QA harness executing cross-artifact audits with fail-closed gating. | `[CURRENT]` Production | All pedagogical subsystems |

### 3.4 Specialist Authors & Declarative Renderers
| Script File | Purpose | Active Status | Primary Dependencies |
|---|---|---|---|
| `author_math_studylab.js` | Authors mathematical problem patterns, solution DAGs, and 3-tier hints into canonical IR. | `[CURRENT]` Production | `semantic_learning_ir.js` |
| `author_physics_studylab.js` | Authors numerical physics items (FBDs, coordinates, kinematics) into canonical IR. | `[CURRENT]` Production | `semantic_learning_ir.js` |
| `author_chemistry_studylab.js`| Authors stoichiometry, equilibrium ICE tables, and reaction steps into canonical IR. | `[CURRENT]` Production | `semantic_learning_ir.js` |
| `author_reasoning_studylab.js`| Authors logic puzzles, syllogisms, and deduction DAGs into canonical IR. | `[CURRENT]` Production | `semantic_learning_ir.js` |
| `render_declarative_artifacts.js` | Deterministically projects Notes (Markdown), Basic/Cloze TSVs, MindMap (Mermaid/JSON), and Slide Decks. | `[CURRENT]` Production | Pure JS string templating |
| `render_studylab_question_bank.js` | Renders human-readable Markdown Question Banks (`Questions.md`) as read-only projections of canonical IR. | `[CURRENT]` Production | Pure JS string templating |

### 3.5 Packaging & Export Compilers
| Script File | Purpose | Active Status | Primary Dependencies |
|---|---|---|---|
| `export_anki.js` | Compiles Basic, Cloze, and IO cards into `<Chapter>_Anki.apkg` (Models 1600000001–1600000003). | `[CURRENT]` Production | `sql.js`, `jszip` |
| `export_studylab_procedural_anki.js` | Compiles procedural items into `StudyLab/<Chapter>_StudyLab_Procedural.apkg` (Model 1600000004). | `[CURRENT]` Production | `sql.js`, `jszip`, `shared_anki_utils.js` |
| `shared_anki_utils.js` | Shared SQLite schema generation, note insertion, and zip packaging routines. | `[CURRENT]` Production | `sql.js`, `jszip` |

### 3.6 Independent Certification & Verification
| Script File | Purpose | Active Status | Primary Dependencies |
|---|---|---|---|
| `run_adversarial_certification.js` | Standalone 4-Gate Adversarial Certifier CLI (Physical Evidence, ADV-01..15, Binary SQLite, Cross-Artifact QA). | `[CURRENT]` Production | `validate_completion_evidence.js`, `sql.js` |
| `validate_completion_evidence.js` | 4-point Physical Verification Protocol release gate validating byte counts, SHA-256 hashes, and subagent run status. | `[CURRENT]` Production | Node `fs`, `crypto` |
| `validate_studylab_procedural.js` | Validates procedural item JSON against `studylab-procedural-schema.json`. | `[CURRENT]` Production | `ajv` |
| `validate_studylab_question_bank.js` | Validates rendered `Questions.md` against question bank contract rules. | `[CURRENT]` Production | Node `fs`, regex parser |
| `validate_tsv.js` | Asserts strict 3-column format, escapes, and non-empty values in Anki TSV files; supports suppression codes. | `[CURRENT]` Production | Node `fs` |
| `validate_image_occlusion.js` | Validates Image Occlusion JSON against bounds ($[0..100]$) and max regions ($\le 15$). | `[CURRENT]` Production | `ajv` |
| `validate_map.js` | Asserts Mermaid mindmap syntax, hierarchy depth ($\ge 2$), and node limits. | `[CURRENT]` Production | Regex / AST parser |
| `latex_validator.js` | Audits LaTeX math blocks for balanced delimiters (`$...$`, `$$...$$`) and syntax errors. | `[CURRENT]` Production | Regex parser |
| `source_invariant_checker.js` | Verifies evidence SHA-256 hashes against original source documents. | `[CURRENT]` Production | Node `crypto` |

### 3.7 Model Context Protocol & Evidence Ingestion
| Script File | Purpose | Active Status | Primary Dependencies |
|---|---|---|---|
| `mcp_server.js` | Exposes 6 deterministic tools via stdio (`export_anki_package`, `export_studylab_procedural_package`, `validate_artifact`, `resolve_subject_policy`, `ingest_source_to_evidence_pack`, `query_procedural_contract`). | `[CURRENT]` Production | `@modelcontextprotocol/sdk`, `zod`, `better-sqlite3` |
| `evidence_ingestion_engine.js` | Multi-format source extractor (PDF/OCR/JSON/Markdown) with physical page coordinate tracking and SHA-256 chunking. | `[CURRENT]` Production | Node `crypto`, `fs`, `child_process` |
| `extract_pdf_source.py` | PyMuPDF-based text and visual asset extractor with Tesseract OCR fallback for scanned pages. | `[CURRENT]` Production | Python `fitz`, `pytesseract` |
| `procedural_db_client.js` | High-performance synchronous client for `procedural.db` using WAL mode and 5000ms busy timeout. | `[CURRENT]` Production | `better-sqlite3` |

### 3.8 Unified CLI Driver & Observability
| Script File | Purpose | Active Status | Primary Dependencies |
|---|---|---|---|
| `studycore_cli.js` | Unified CLI driver (`doctor`, `status`, `ingest`, `dispatch`, `package`, `verify`, `telemetry`). | `[CURRENT]` Production | Node `path`, `fs`, child processes |
| `telemetry_engine.js` | Observability engine tracking execution spans, token budgets, SQLite WAL metrics, and latency percentiles. | `[CURRENT]` Production | `better-sqlite3`, Node `crypto` |
| `run_master_smoke_test.js` | 18-gate zero-mock architectural anti-tamper and end-to-end multi-agent verification harness (`npm run smoke`). | `[CURRENT]` Production | `@modelcontextprotocol/sdk`, Node `assert` |
| `doctor.js` | Automated environment diagnostic scanner verifying dependencies, Node/npm versions, and write permissions. | `[CURRENT]` Production | Node `child_process`, `fs` |

---

## 4. Active Machine Schemas & Contracts (`resources/`)

| Schema / Contract File | Format | Version | Canonical Responsibility |
|---|---|---|---|
| `artifact-registry.json` | JSON | 1.0.0 | Authoritative index of all 8 artifact types, owners, validators, and paths. |
| `schemas/semantic-learning-ir.schema.json` | JSON Schema | 1.0.0 | Draft-07 schema governing Conceptual KUs, Declarative Units, and Procedural Problem Schemas. |
| `studylab-procedural-schema.json` | JSON Schema | 1.0.0 | Validates the 17 procedural dimensions, solution DAGs, 3-tier hints, and MCQs. |
| `studylab-practice-questions-schema.json` | JSON Schema | 1.0.0 | Validates individual practice items in Question Banks. |
| `image-occlusion-schema.json` | JSON Schema | 1.0.0 | Validates IO manifests, normalized $[x,y,w,h]$ bounds, and label dictionaries. |
| `asset-manifest-schema.json` | JSON Schema | 1.0.0 | Validates extracted visual assets and metadata. |
| `subject-skill-manifest.json` | JSON | 1.0.0 | Manifest defining subject domains and registered capabilities. |
| `subject-visual-rules.json` | JSON | 1.0.0 | Visual extraction rules per subject (e.g. diagrams required vs prohibited). |

---

## 5. Test Suite Status & Execution (`package.json`)

The primary test harness runs via Vitest 4 with an isolated worker pool, executing all 47 test suites deterministically in ~6.5 seconds (100% pass rate):

```bash
cd skills/study-source-core

# Execute all 47 automated test suites via Vitest
npm test

# Run the 18-gate zero-mock Master Smoke Test & Anti-Tamper Harness
npm run smoke

# Inspect live telemetry, span tracing & token budgets
npm run telemetry

# Run standalone 4-Gate Adversarial Certification CLI on a target chapter
npm run certify -- --chapter Chemical-Equilibrium --subject Chemistry

# Run Milestone 4 Packaging & Model Isolation verification suite
npm run test:milestone4

# Run Phase 10 Antigravity Host Adapter, Concurrency & Recovery suite
npm run test:phase10

# Run legacy 28-script sequential test chain
npm run test:legacy
```

### Core Test Inventory (Sample of Key Verified Suites)
1. `test_foundation_layer.js`: Validates Draft-07 Semantic Learning IR schemas, 11-field Content Lineage Records (CLR), and chunked evidence pack ingestion.
2. `test_subject_policy_resolver.js`: Validates subject policy resolution, matrix states, and alias handling across all 9 subjects.
3. `test_routing.js`: Asserts subagent dispatch routing matches subject policies and evidence profiles.
4. `test_orchestration.js`: Tests DAG execution, wave sequencing, and Single-Writer enforcement.
5. `test_artifact_registry.js`: Validates integrity of `artifact-registry.json` against all artifact rules.
6. `test_change_isolation.js` & `test_change_isolation_vnext.js`: Asserts changes do not breach freeze boundaries or mutate frozen contracts.
7. `test_contracts.js`: Validates all canonical JSON schemas against Ajv and test fixtures.
8. `test_regression.js`: Tests backward compatibility of basic and cloze card TSV generators.
9. `test_vnext_orchestration.js`: Tests vNext subagent DAG routing and task dependency resolution.
10. `test_r1_r5_verification.js`: Validates Release Criteria R1 through R5 (physical existence, schemas, counts).
11. `test_studylab_question_bank.js`: Validates Markdown Question Bank rendering and parsing.
12. `test_math_production_path.js`: Tests end-to-end Math procedural authoring, hint validation, and APKG export.
13. `test_physics_production_path.js`: Tests end-to-end Physics numerical calculational authoring and export.
14. `test_chemistry_production_path.js`: Tests end-to-end Chemistry stoichiometry/equilibrium authoring and export.
15. `test_reasoning_production_path.js`: Tests end-to-end Reasoning puzzle deduction DAG authoring and export.
16. `test_phase7_context_routing.js`: Validates context bundle sizing and token budgeting per subagent.
17. `test_phase8_independent_verification.js`: Validates independent adversarial APKG verification logic.
18. `test_unified_anki_packaging.js`: Validates experimental unified packaging prototype (v1.1 candidate).
19. `test_milestone2_stream1.js` & `test_milestone2_semantic_layer.js`: Validates KU reservations, deduplication, and pedagogical compilation.
20. `test_phase8_model_isolation_closed_boundary.js`: Asserts Model ID isolation between Declarative (Models 1600000001–3) and Procedural (Model 1600000004) APKGs.
21. `test_completion_evidence_gate.js`: Asserts 4-point Physical Verification Protocol release gate (`.completion-evidence.json`).
22. `test_adversarial_auditor.js`: Executes the complete 15-point adversarial attack harness (ADV-01 through ADV-15).
23. `test_adversarial_certification_cli.js`: Tests standalone 4-Gate adversarial certifier CLI and exit codes.
24. `test_phase10_concurrency_and_recovery.js`: Tests BoundedConcurrencyPool, task recovery, and checkpoint durability.
25. `test_phase10_runtime_adversarial.js`: Executes 18-point Runtime Adversarial Matrix (RT-01 through RT-18).
26. `test_telemetry.js`: Validates structured span tracing, token budgeting, and calibration metrics.
27. `test_mcp_server.js`: Connects to MCP Server via stdio and asserts tool discovery & execution across all deterministic tools.

---

## 6. Baseline Tooling & Dependencies

Defined in `skills/study-source-core/package.json`:
- `"@modelcontextprotocol/sdk": "^1.30.0"`: Standard Model Context Protocol SDK exposing the 6 deterministic tools to Antigravity and Claude Desktop.
- `"ajv": "^8.20.0"`: Strict JSON Schema Draft-07 / 2020-12 validator.
- `"archiver": "^8.0.0"`: High-performance streaming zip archive generator for APKG packaging.
- `"better-sqlite3": "^12.11.1"`: Synchronous, native C++ SQLite driver for high-throughput WAL querying of `procedural.db` and telemetry logs.
- `"jszip": "^3.10.1"`: Pure JavaScript ZIP archive generation for declarative `.apkg` packages.
- `"sql.js": "^1.14.2"`: Pure WebAssembly port of SQLite 3 for environment-agnostic database compilation.
- `"vitest": "^4.1.11"`: Isolated worker test runner executing 47 suites in ~6.5 seconds.
- `"zod": "^3.24.0"`: TypeScript-first runtime schema declaration and validation library.

---

## 7. Release State & Roadmap Transition

The **v1.2.0-beta.6 Production Baseline** is certified, passing all 47 automated test suites, passing the 18-gate zero-mock smoke test, achieving 4-Gate adversarial certification across 6 production chapters, and passing all 7 Environment Doctor checks:
- Refer to [`ROADMAP.md`](../ROADMAP.md) for detailed deliverables, invariants, and exit criteria across completed Phases 0 through 18.
- Refer to [`docs/GAP_REGISTER.md`](./GAP_REGISTER.md) for the resolution records of GAP-01 through GAP-35 (100% resolved and verified).
- Refer to [`docs/MCP_SERVER_API.md`](./MCP_SERVER_API.md) for full documentation of the 6 deterministic MCP tools.
- Production question delivery is standardized on canonical Markdown Question Banks (`Questions.md`) under GAP-30.
- Workspace skills discovery is standardized via native `.agents/skills.json` under GAP-35.
