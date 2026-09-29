# StudySourceCore — Master Documentation Index (`INDEX.md`)

> **Canonical Architecture**: [`ARCHITECTURE.md`](../ARCHITECTURE.md)  
> **Master Agent Index**: [`.agents/AGENTS.md`](../.agents/AGENTS.md)  
> **Primary Antigravity Skill**: [`skills/study-source-core/SKILL.md`](../skills/study-source-core/SKILL.md)  
> **Status**: Certified / 100% Verified Production Baseline (`v1.2.0-beta.2`)  
> **Author**: `naksh-07` (Suraj)

---

## 1. Architectural Architecture & Core Boundaries

StudySourceCore is an Antigravity-native multi-agent study asset synthesis ecosystem structured around four foundational layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│  1. PRIMARY ORCHESTRATOR SKILL                                         │
│     skills/study-source-core/SKILL.md                                  │
│     - Evidence extraction (extract_pdf_source.py / OCR)                 │
│     - Subject policy routing (subject_policy_resolver.js)              │
│     - 3-Wave task DAG coordination (orchestration_engine.js)           │
│     - Parent Self-Execution Ban (never authors specialist deliverables)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Dispatches via Adaptive v4 DAG
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  2. PROJECT-LEVEL SUBAGENTS                                            │
│     .agents/agents/*.md  (14 Designated Single-Responsibility Agents)  │
│     - Wave 1 Specialists: core-notes, core-basic-anki, core-cloze-anki,│
│       core-image-occlusion, core-mindmap, core-slide-deck, and STEM    │
│       specialists (math, physics, chemistry, reasoning)                │
│     - Wave 3 Downstream QA: bm-graph, bm-qa, mold-gap-auditor,         │
│       adversarial-apkg-reviewer                                        │
│     - Full write tool permissions (write_to_file, replace, run_command)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Calls deterministic tools
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  3. DETERMINISTIC ENGINE & MCP SERVER (v1.1.0)                         │
│     skills/study-source-core/scripts/mcp_server.js                     │
│     - export_anki_package (Zero-heap streaming compiler)               │
│     - export_studylab_procedural_package (15-point certified compiler) │
│     - validate_artifact (10 contract validators)                       │
│     - resolve_subject_policy (Deterministic runtime policies)          │
│     - ingest_source_to_evidence_pack (PyMuPDF & OCR page slicing)      │
│     - query_procedural_contract (Native SQLite WAL procedural.db)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Driven by unified CLI
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  4. UNIFIED CLI DRIVER                                                 │
│     skills/study-source-core/scripts/studycore_cli.js                  │
│     - studycore status: Full vault chapter artifact & badge inspection │
│     - studycore ingest: Ingest raw source to Evidence Pack             │
│     - studycore package: Compile Declarative & StudyLab APKGs          │
│     - studycore verify: Validate chapter deliverables or run 10-gate   │
│       Master Final Audit Harness (--all)                               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Master Document Navigation Hub

### Layer A: Core Antigravity & Agent Operations
- [`.agents/AGENTS.md`](../.agents/AGENTS.md) — Authoritative Master Agent Registry (all 14 subagent profiles and ownership boundaries).
- [`.agents/agents/*.md`](../.agents/agents) — The 14 individual subagent definition markdown specifications equipped with write tool frontmatters.
- [`.agents/RESOURCES.md`](../.agents/RESOURCES.md) — Universal Language Contract (Hindi-first Hinglish), schemas, Model IDs, and resource registers.
- [`.agents/OWNERSHIP.md`](../.agents/OWNERSHIP.md) — Single-Writer Rule and immutable artifact ownership matrices.
- [`.agents/EXECUTION_LIFECYCLE.md`](../.agents/EXECUTION_LIFECYCLE.md) — 3-Wave execution flow, task DAG transitions, and structured handoff schemas.
- [`.agents/DECISIONS.md`](../.agents/DECISIONS.md) — Architectural Decision Records (ADR-01 through ADR-18).

### Layer B: System Architecture & Specifications
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — Complete 6-tier architecture specification and data flow.
- [`PRODUCT.md`](../PRODUCT.md) — Product charter, core pedagogical tenets, and user experience invariants.
- [`ROADMAP.md`](../ROADMAP.md) — Engineering phases, test milestones, and v1.0/v1.1 feature timelines.
- [`docs/STUDYLAB_SPECIFICATION.md`](STUDYLAB_SPECIFICATION.md) — Formal specification for StudyLab STEM procedural practice engines.
- [`docs/ANKI_INTEGRATION.md`](ANKI_INTEGRATION.md) — Anki database schema (`collection.anki2`), dark mode CSS, and zero-heap streaming binary compilers.
- [`docs/GAP_REGISTER.md`](GAP_REGISTER.md) — Complete historical gap tracking ledger (GAP-01 through GAP-29, all closed).

### Layer C: Pedagogical Design & Learning Theory
- [`docs/LEARNING_PRINCIPLES.md`](LEARNING_PRINCIPLES.md) — Cognitive load theory, desirable difficulties, active recall, and spaced retrieval.
- [`docs/VISUAL_LEARNING.md`](VISUAL_LEARNING.md) — Coordinate normalization, SVG masks, Marp slide deck constraints, and visual prompt design.
- [`docs/KNOWLEDGE_UNITS.md`](KNOWLEDGE_UNITS.md) — Knowledge Unit (KU) formalization and domain boundaries.
- [`docs/SUBJECT_POLICIES.md`](SUBJECT_POLICIES.md) — Subject-specific artifact eligibility matrices and domain capability flags.

### Layer D: Quality Assurance & Independent Certification
- [`docs/VALIDATION_AND_CERTIFICATION.md`](VALIDATION_AND_CERTIFICATION.md) — Multi-tier verification harness and contract validators.
- [`docs/SECURITY_AND_TRUST.md`](SECURITY_AND_TRUST.md) — Path traversal defense, SHA-256 cryptographic provenance, and fail-closed invariants.
- [`skills/study-source-core/scripts/telemetry_engine.js`](../skills/study-source-core/scripts/telemetry_engine.js) — Telemetry & Observability Engine (Structured Spans, Token Economy, SQLite WAL Store, and Calibration Analytics).
- [`skills/study-source-core/scripts/run_master_smoke_test.js`](../skills/study-source-core/scripts/run_master_smoke_test.js) — 18-Gate Master Smoke Test & Anti-Tamper Architectural Integrity Harness (`npm run smoke`).
- [`skills/study-source-core/scripts/test_final_audit_harness.js`](../skills/study-source-core/scripts/test_final_audit_harness.js) — 10-Gate Master Final Audit and Freeze Verification Harness.

---

## 3. Production Deliverables Directory (`Study Materials/`)

The workspace maintains production-ready chapter deliverables structured as follows:

| Subject | Chapter | Verified Deliverables | Badges Status |
|---|---|---|---|
| **Map** | `Europe` | 7 Deliverables (Notes, Basic TSV, Cloze TSV, Image Occlusion JSON+SVG, MindMap JSON, SlideDeck Prompt, Declarative APKG) | `Notes✅ Basic✅ Cloze✅ IO✅ Map✅ Deck✅ Anki✅` |
| **Math** | `LCM-HCF` | 6 Deliverables (Notes, Basic TSV, Cloze TSV, Question Bank Markdown, Declarative APKG, StudyLab Procedural APKG) | `Notes✅ Basic✅ Cloze✅ QBank✅ Anki✅ StudyLab✅` |
| **Physics** | `Newton-Laws-Friction` | 8 Deliverables (Notes, Basic TSV, Cloze TSV, MindMap JSON, SlideDeck Prompt, Question Bank, Declarative APKG, StudyLab Procedural APKG, Graph Index, QA Report) | `Notes✅ Basic✅ Cloze✅ Map✅ Deck✅ QBank✅ Anki✅ StudyLab✅` |

---

## 4. Verification & Testing Commands

```bash
# Run the 18-Gate Master Smoke Test & Anti-Tamper Integrity Harness (Zero Mocks, ~4.5s)
npm run smoke

# Inspect Runtime Telemetry, Token Economy & Production Calibration Scorecard
npm run telemetry

# Inspect Live Telemetry Span Timeline
node skills/study-source-core/scripts/studycore_cli.js telemetry --spans

# Run all 47 Vitest test suites (100% green, ~6.5s)
npm test

# Run the 10-Gate Master Final Audit Harness
node skills/study-source-core/scripts/test_final_audit_harness.js

# Inspect vault chapter deliverables status
node skills/study-source-core/scripts/studycore_cli.js status

# Verify a specific chapter against all contracts
node skills/study-source-core/scripts/studycore_cli.js verify Physics Newton-Laws-Friction
```
