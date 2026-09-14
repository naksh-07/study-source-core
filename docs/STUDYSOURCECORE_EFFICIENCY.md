# StudySourceCore: Computation Deduplication, Efficiency & Caching

## 1. Computation Deduplication & Ledger

To maximize execution speed and eliminate token waste, StudySourceCore classifies all pipeline operations and audits any repeated executions across 11 core computational steps.

### Computation Ledger & Repeat Classification Matrix

| Computation Step | Owner | Target Frequency | Reusable Output | Repeat Classification | Architectural Rationale & Optimization |
|---|---|---|---|---|---|
| **1. PDF Parsing** | Parent Orchestrator | Exactly 1 per source | In-memory text buffer | `REDUNDANT` if repeated | Parsed once during Ingestion; raw text cached in memory and written to `scratch/evidence-pack.md`. Specialists must NOT re-parse PDFs. |
| **2. Text Extraction** | Parent Orchestrator | Exactly 1 per source | `scratch/evidence-pack.md` | `REDUNDANT` if repeated | Full text extracted once; specialists receive pre-structured markdown. |
| **3. Topic Segmentation** | Parent Orchestrator | Exactly 1 per source | Evidence pack section headers | `REDUNDANT` if repeated | Section boundaries defined once in evidence pack. |
| **4. Concept Extraction** | `core-notes` & `core-mindmap` | 1 per domain perspective | Note headings & MindMap tree | `ACCEPTABLE` | Notes extract prose definitions; MindMap extracts structural graph branches. Both consume identical evidence pack. |
| **5. Question Extraction** | Subject APKG Author | Exactly 1 per chapter | `PracticeQuestions.json` | `REDUNDANT` if repeated | Solvable questions extracted once with full formulas and options. |
| **6. Classification** | Routing Engine (`routing_engine.js`) | Exactly 1 evaluation | Gating decision object | `ACCEPTABLE` | Fast in-memory rule check based on candidate counts. |
| **7. Provenance Extraction** | `artifact_provenance.js` | 1 per artifact creation | SHA-256 evidence hash | `REQUIRED` | Lineage tracking requires hashing generated deliverables against source hash. |
| **8. Mold Discovery** | `mold-gap-auditor` / APKG Author | 1 per family archetype | Procedural contract definition | `ACCEPTABLE` | Reuses canonical mold registry (`studylab-canonical-contracts.json`); extends only on novel patterns. |
| **9. Artifact Generation** | Specialist Subagents | Exactly 1 per eligible artifact | Physical deliverable files | `REDUNDANT` if repeated | Each specialist runs once per wave. Retried only on validation failure. |
| **10. APKG Compilation** | `export_anki.js` & `export_studylab_procedural_anki.js` | Exactly 1 per deck type | Binary `.apkg` files | `REDUNDANT` if repeated | Compiles directly from validated intermediate files into SQLite/ZIP. |
| **11. Validation** | Deterministic Validators | 2 times (Pre-pack & Final QA) | Pass/Fail report | `VALIDATION` | Pre-validation guards intermediate archival; post-pack black-box test verifies binary SQLite DB integrity. |

---

## 2. Proven Deduplication Mechanisms

### 1. In-Memory Preloading (`preloadedContent`)
In `cross_artifact_checker.js` and validation scripts, artifacts loaded during generation are cached in an in-memory dictionary. Subsequent semantic and linting checks consume the cached text without performing redundant disk I/O.

### 2. Upstream Evidence Pack Handoff
Instead of each subagent reading multi-megabyte source PDFs:
$$\text{Source PDF} \xrightarrow[\text{1 Time}]{\text{Ingest}} \text{Evidence Pack (Markdown)} \xrightarrow[\text{Parallel Read}]{\text{Shared Buffer}} \text{All 14 Specialists}$$

### 3. Hash-Based Idempotency Guard
Before recompiling an APKG, `artifact_provenance.js` compares the current evidence pack hash with the recorded hash in `.build/artifact-manifest.json`. If the hash and configuration match, regeneration is skipped.
> **Canonical Terminology**: See [OWNERSHIP.md#1-architectural-principles-of-ownership](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/OWNERSHIP.md#1-architectural-principles-of-ownership) for the authoritative Single-Writer Rule, Parent Self-Execution Ban, and dispatch terminology definitions.