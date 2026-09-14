# StudySourceCore vNext: Unified Orchestration & Execution Architecture
**Document ID**: `DOC-STUDYSOURCECORE-VNEXT-001`  
**Status**: CANONICAL PRODUCTION ARCHITECTURE  
**Scope**: Execution Lifecycle, Task Graph DAG, Single-Writer Matrix, Dispatch Engine & Completion Evidence  

---

## 1. Executive Architectural Model

StudySourceCore vNext unifies all 14 specialized subagents, packaging scripts, and validation gates into a deterministic, machine-readable orchestration lifecycle:

```text
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
14: │                                   STUDYSOURCECORE vNEXT PIPELINE                                  │
15: ├───────────────────────────────────────────────────────────────────────────────────────────────────┤
16: │                                                                                                   │
17: │   [ RAW STUDY SOURCE ]                                                                            │
18: │            │                                                                                      │
19: │            ▼                                                                                      │
20: │   ┌─────────────────────────────┐                                                                 │
21: │   │ 1. INGEST & EVIDENCE PACK   │ ──► Parent Orchestrator reads source once; extracts SHA-256     │
22: │   │ (scratch/evidence-pack.md)  │     lineage into scratch/provenance.json                        │
23: │   └──────────────┬──────────────┘                                                                 │
24: │                  │                                                                                │
25: │                  ▼                                                                                │
26: │   ┌─────────────────────────────┐                                                                 │
27: │   │ 2. PLAN & ROUTE             │ ──► Orchestration engine builds explicit Task Graph DAG         │
28: │   │ (execution_plan.json)       │     evaluating candidate counts and track eligibility           │
29: │   └──────────────┬──────────────┘                                                                 │
30: │                  │                                                                                │
31: │                  ▼                                                                                │
32: │   ┌─────────────────────────────┐                                                                 │
33: │   │ 3. DISPATCH (Wave 1)        │ ──► Mandatory subagent invocation (Max 4 concurrent);           │
34: │   │ (dispatch-trace.json)       │     PARENT SELF-EXECUTION IS STRICTLY PROHIBITED                │
35: │   └──────────────┬──────────────┘                                                                 │
36: │                  │                                                                                │
37: │       ┌──────────┴──────────┐                                                                     │
38: │       ▼                     ▼                                                                     │
39: │  [ Generic Track ]   [ StudyLab Track ]                                                           │
40: │  • core-notes        • math-apkg-author                                                           │
41: │  • core-basic-anki   • reasoning-apkg-author                                                      │
42: │  • core-cloze-anki   • physics-numerical-apkg-author                                               │
43: │  • core-io           • chemistry-numerical-apkg-author                                             │
44: │  • core-mindmap                                                                                   │
45: │  • core-slide-deck                                                                                │
46: │       │                     │                                                                     │
47: │       └──────────┬──────────┘                                                                     │
48: │                  │                                                                                │
49: │                  ▼                                                                                │
50: │   ┌─────────────────────────────┐                                                                 │
51: │   │ 4. STRUCTURED HANDOFF       │ ──► Programmatic 11-field handoff validation;                   │
52: │   │ (handoff-trace.json)        │     specialist workforce instantly collapses                    │
53: │   └──────────────┬──────────────┘                                                                 │
54: │                  │                                                                                │
55: │                  ▼ (Dependency Barrier 1: All Wave 1 Tasks in Terminal State)                     │
56: │   ┌─────────────────────────────┐                                                                 │
57: │   │ 5. PACKAGING (Wave 2)       │ ──► Single-threaded compilation (export_anki.js &               │
58: │   │ (export_*.js)               │     export_studylab_procedural_anki.js); archives intermediates   │
59: │   └──────────────┬──────────────┘                                                                 │
60: │                  │                                                                                │
61: │                  ▼ (Dependency Barrier 2: Binary APKGs on Disk with Non-Zero Bytes)                │
62: │   ┌─────────────────────────────┐                                                                 │
63: │   │ 6. QA & AUDIT (Wave 3)      │ ──► Downstream verification (bm-qa, bm-graph,                   │
64: │   │ (QA_Report / Adv_Audit)     │     adversarial-apkg-reviewer, L1-L7 multi-tier validators)     │
65: │   └──────────────┬──────────────┘                                                                 │
66: │                  │                                                                                │
67: │                  ▼                                                                                │
68: │   ┌─────────────────────────────┐                                                                 │
69: │   │ 7. COMPLETION GATE          │ ──► Tripartite Verification (Disk + Size + Owner + Schema Pass) │
70: │   │ (completion-evidence.json)  │     Emits master execution verdict: 🟢 PRODUCTION HARDENED       │
71: │   └─────────────────────────────┘                                                                 │
72: │                                                                                                   │
73: └───────────────────────────────────────────────────────────────────────────────────────────────────┘
74: ```
75: 
76: ### System Architecture (DAG & Wave Execution)
77: 
78: ```mermaid
79: graph TD
80:     %% Define Styles
81:     classDef source fill:#1e1e1e,stroke:#333,stroke-width:2px,color:#fff;
82:     classDef orchestrator fill:#0d47a1,stroke:#333,stroke-width:2px,color:#fff;
83:     classDef data fill:#2e7d32,stroke:#333,stroke-width:1px,color:#fff;
84:     classDef agent fill:#e65100,stroke:#333,stroke-width:1px,color:#fff;
85:     classDef validator fill:#d81b60,stroke:#333,stroke-width:1px,color:#fff;
86: 
87:     %% Nodes
88:     A[Raw Study Source<br/>PDF/Text]:::source -->|Ingest| B(Parent Orchestrator):::orchestrator
89:     B -->|Extracts Once| C[(scratch/evidence-pack.md)]:::data
90:     
91:     C -->|Wave 1: Parallel Dispatch| D{Routing Engine DAG}:::orchestrator
92:     
93:     D -->|task-notes| E1[core-notes]:::agent
94:     D -->|task-basic| E2[core-basic-anki]:::agent
95:     D -->|task-io| E3[core-image-occlusion]:::agent
96:     D -->|task-studylab| E4[math/reasoning-apkg-author]:::agent
97:     
98:     E1 -->|Handoff JSON| V1[Physical Validation & Schema Gate]:::validator
99:     E2 -->|Handoff JSON| V1
100:     E3 -->|Handoff JSON| V1
101:     E4 -->|Handoff JSON| V1
102:     
103:     V1 -->|Wave 2: Sequential| P1[export_anki.js / export_studylab.js]:::agent
104:     P1 -->|Binary output| DB[(Compiled .apkg & Notes)]:::data
105:     
106:     DB -->|Wave 3: QA & Audit| Q1[bm-qa / bm-graph]:::validator
107:     Q1 --> F((Tripartite Completion Gate)):::orchestrator
108: ```

---

## 2. Formal Lifecycle States

The execution state machine enforces strict, unidirectional transitions across 11 discrete states:

| State Code | State Name | Permitted Transitions | Invariant & Responsibilities |
|---|---|---|---|
| `S0_INIT` | `INITIALIZING` | $\to$ `S1_INGESTING`, `S10_FAILED` | Workspace path resolution, directory initialization, lock checks. |
| `S1_INGEST` | `INGESTING` | $\to$ `S2_PLANNING`, `S10_FAILED` | Raw source parsed once; `scratch/evidence-pack.md` and SHA-256 computed. |
| `S2_PLAN` | `PLANNING` | $\to$ `S3_ROUTING`, `S10_FAILED` | Artifact candidates counted; task topology evaluated. |
| `S3_ROUTE` | `ROUTING` | $\to$ `S4_DISPATCHING`, `S9_BLOCKED` | Explicit Task Graph DAG constructed; suppressions assigned reason codes. |
| `S4_DISPATCH` | `DISPATCHING` | $\to$ `S5_EXECUTING`, `S10_FAILED` | Subagents invoked via `invoke_subagent`; parent self-execution blocked. |
| `S5_EXECUTE` | `EXECUTING` | $\to$ `S6_HANDOFF`, `S5_EXECUTING` (retry) | Wave 1 parallel generation (max 4 concurrent); blast-radius isolated. |
| `S6_HANDOFF` | `HANDOFF` | $\to$ `S7_PACKAGING`, `S9_BLOCKED`, `S10_FAILED` | 11-field handoff block verified; workforce collapsed. |
| `S7_PACKAGE` | `PACKAGING` | $\to$ `S8_AUDITING`, `S10_FAILED` | Wave 2 sequential SQLite `.apkg` builds; intermediate archiving. |
| `S8_AUDIT` | `AUDITING` | $\to$ `S11_COMPLETED`, `S10_FAILED` | Wave 3 QA, cross-artifact checks, L1–L7 validation. |
| `S9_BLOCKED` | `BLOCKED` | $\to$ `S10_FAILED`, `S4_DISPATCHING` | Dependency failure or prerequisite missing; halts dependent branch. |
| `S10_FAIL` | `FAILED` | Terminal | Explicit diagnostic error emitted; partial valid artifacts preserved. |
| `S11_DONE` | `COMPLETED` | Terminal | Tripartite completion gate passed; master manifest published. |

---

## 3. Explicit Task Graph Representation

Every unit of execution is modeled as a strongly-typed Task object:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "StudySourceCoreTask",
  "type": "object",
  "required": [
    "task_id",
    "task_name",
    "wave",
    "owner_agent",
    "writer_agent",
    "inputs",
    "expected_outputs",
    "dependencies",
    "status",
    "validation_rules",
    "retry_budget",
    "current_retries"
  ],
  "properties": {
    "task_id": { "type": "string", "pattern": "^task-[a-z0-9-]+$" },
    "task_name": { "type": "string" },
    "wave": { "type": "integer", "enum": [1, 2, 3] },
    "owner_agent": { "type": "string" },
    "writer_agent": { "type": "string" },
    "inputs": {
      "type": "array",
      "items": { "type": "string" }
    },
    "expected_outputs": {
      "type": "array",
      "items": { "type": "string" }
    },
    "dependencies": {
      "type": "array",
      "items": { "type": "string" }
    },
    "status": {
      "type": "string",
      "enum": ["PLANNED", "DISPATCHED", "EXECUTED", "SKIPPED", "BLOCKED", "RETRIED", "COMPLETED", "FAILED"]
    },
    "suppression_reason": { "type": ["string", "null"] },
    "validation_rules": {
      "type": "array",
      "items": { "type": "string" }
    },
    "retry_budget": { "type": "integer", "default": 1 },
    "current_retries": { "type": "integer", "default": 0 },
    "input_fingerprint": { "type": "string" },
    "execution_duration_ms": { "type": "integer" }
  }
}
```

---

## 4. Single-Writer & Ownership Matrix

To eliminate race conditions, file corruption, and duplicate cognitive work:

### Inviolable Law 1: The Single-Writer Rule
Exactly **one** designated agent owns and writes to each deliverable. No two active execution lanes may target the same filepath.

### Inviolable Law 2: The Parent Self-Execution Ban
The Parent Orchestrator owns coordination, routing, gating, packaging, and validation, but is **strictly forbidden** from generating specialist-owned artifacts.

| # | Artifact Identity | Target Path | Owner Agent | Allowed Writer | Allowed Validator | Input Requirements |
|---|---|---|---|---|---|---|
| **1** | Evidence Pack | `scratch/evidence-pack.md` | `parent-orchestrator` | `parent-orchestrator` | Ingestion validator | Raw source document |
| **2** | Routing Manifest | `scratch/routing_manifest.json` | `routing_engine` | `routing_engine` | Schema validator | Evidence pack metadata |
| **3** | Knowledge Notes | `Notes/<Chapter>_Notes.md` | `core-notes` | `core-notes` | `note_contract_audit.js` | Evidence pack text & AST |
| **4** | Basic Flashcards | `Basic/<Chapter>_Basic.tsv` | `core-basic-anki` | `core-basic-anki` | `validate_tsv.js` | Atomic factual candidates |
| **5** | Cloze Flashcards | `Cloze/<Chapter>_Cloze.tsv` | `core-cloze-anki` | `core-cloze-anki` | `validate_tsv.js` | Contextual cloze statements |
| **6** | Image Occlusion | `ImageOcclusion/<Chapter>_IO.json` | `core-image-occlusion` | `core-image-occlusion` | `validate_image_occlusion.js` | Resolved diagram & bounds |
| **7** | Visual MindMap | `MindMap/<Chapter>.mindmap.json` | `core-mindmap` | `core-mindmap` | `validate_map.js` | Relational concept topology |
| **8** | Slide Deck Prompt | `SlideDeck/<Chapter>_Slides.md` | `core-slide-deck` | `core-slide-deck` | `slide_deck_prompt_audit.js`| Pacing & visual layout |
| **9** | Practice Questions | `Optional/*_PracticeQuestions.json`| Domain APKG Author | Domain APKG Author | `validate_studylab_practice_questions.js` | Solvable source questions |
| **10**| Problem Patterns | `Optional/*_ProblemPatterns.json` | Domain APKG Author | Domain APKG Author | `validate_studylab_procedural.js` | Procedural algorithms |
| **11**| Declarative APKG | `<Chapter>_Anki.apkg` | `export_anki.js` | `export_anki.js` | `validate_apkg.js` | Validated Basic/Cloze/IO |
| **12**| StudyLab APKG | `StudyLab/*_Procedural.apkg` | `export_studylab_anki.js`| `export_studylab_anki.js`| `validate_studylab_levels_1_7.js`| Validated PQ/PP JSON |
| **13**| Vault Graph Index | `Graph/<Chapter>_Graph_Index.json`| `bm-graph` | `bm-graph` | `link_audit.js` | Completed Notes & Vault index|
| **14**| QA Audit Report | `Audit/QA_Report.md` | `bm-qa` | `bm-qa` | `cross_artifact_checker.js`| All sibling deliverables |
| **15**| Adversarial Report| `Audit/Adversarial_APKG_Audit.md`| `adversarial-reviewer`| `adversarial-reviewer`| 15-Point Attack Harness | Compiled StudyLab APKG |

---

## 5. Machine-Readable Structured Handoff Contract

Every subagent must conclude its turn by emitting a standardized 11-field machine-readable handoff block:

```markdown
```json
{
  "status": "SUCCESS" | "SUPPRESSED" | "FAILED",
  "agent": "<agent-id>",
  "task_id": "task-<id>",
  "inputs_consumed": ["scratch/evidence-pack.md"],
  "outputs_produced": ["Notes/Chapter_Notes.md"],
  "output_paths": ["c:/full/path/to/Notes/Chapter_Notes.md"],
  "validation_result": {
    "passed": true,
    "validator": "note_contract_audit.js",
    "errors": [],
    "warnings": []
  },
  "warnings": [],
  "errors": [],
  "dependencies_satisfied": true,
  "retry_count": 0
}
```
```

---

## 6. Dependency Barriers & Wave Progression Rules

Execution proceeds through three deterministic waves separated by hard synchronization barriers:

### Wave 1: Parallel Generation
- **Concurrency**: $\le 4$ active subagents concurrently.
- **Tasks**: `task-notes`, `task-basic`, `task-cloze`, `task-io`, `task-mindmap`, `task-slides`, `task-studylab-json`.
- **Barrier 1**: The engine halts execution until **all** active Wave 1 tasks reach a terminal state (`COMPLETED`, `SKIPPED`, or `FAILED`).

### Wave 2: Sequential Packaging
- **Concurrency**: Single-threaded CLI script execution.
- **Precondition**: All required producer artifacts exist on disk and pass pre-validation.
- **Tasks**: `task-export-anki`, `task-export-studylab-anki`.
- **Barrier 2**: The engine halts until APKG files are compiled, pass SQLite integrity check, and are verified with size $> 0$ bytes. Intermediates are safely archived to `.build/source-artifacts/`.

### Wave 3: Post-Packaging Audits & QA
- **Concurrency**: $\le 2$ active auditors concurrently.
- **Tasks**: `task-bm-qa`, `task-bm-graph`, `task-adversarial-audit`.
- **Signoff Gate**: Overall verification PASS requires 0 errors from all auditors.

---

## 7. Failure Isolation & Targeted 1-Retry Policy

When a task fails schema validation, syntax checking, or invariant assertions:

```text
┌─────────────────────────┐
│     Task Execution      │
└────────────┬────────────┘
             │
      [Validation Fail]
             │
             ▼
┌─────────────────────────┐     Retry <= 1     ┌─────────────────────────┐
│ Intercept Failure &     │ ─────────────────► │ Targeted Retry Prompt   │
│ Extract Diagnostics     │                    │ with Line/Schema Errors │
└────────────┬────────────┘                    └────────────┬────────────┘
             │                                              │
      [Retry Exceeded]                                      │ (Re-execute)
             │                                              ▼
             ▼                                 ┌─────────────────────────┐
┌─────────────────────────┐                    │ Re-evaluate Output      │
│ Mark Task FAILED        │                    └─────────────────────────┘
│ Isolate Blast Radius    │
│ Preserve Sibling Tracks │
│ Mark Dependents BLOCKED │
└─────────────────────────┘
```

1. **Failure Containment**: A failure in `core-image-occlusion` does NOT abort `core-notes` or `core-basic-anki`.
2. **Targeted Diagnostic Payload**: The retry prompt includes exact AJV schema error paths, failed regexes, or SQLite error codes.
3. **Selective Dependency Blocking**: If `task-studylab-json` fails twice, only `task-export-studylab-anki` is marked `BLOCKED`. Standard declarative packaging (`task-export-anki`) and notes proceed normally.

---

## 8. Duplicate-Work Prevention & Incremental Fingerprinting

To eliminate redundant computations and token waste:

1. **Source-Read-Once**: The Parent Orchestrator parses the raw source once. Specialists are supplied with `scratch/evidence-pack.md` and prohibited from re-reading raw PDFs.
2. **Task Composite Fingerprint**:
   $$\text{Fingerprint} = \text{SHA-256}(\text{EvidenceHash} + \text{TaskConfig} + \text{GeneratorVersion})$$
3. **Incremental Cache Gate**: Before dispatching a task, the engine compares the current input fingerprint against `.build/artifact-manifest.json`. If the fingerprint matches and the target output file physically exists with valid schema, the task status is marked `SKIPPED (UP_TO_DATE)` and subagent dispatch is bypassed.

---

## 9. Physical Completion Evidence Matrix

Completion is certified only when all 4 physical evidence criteria are satisfied simultaneously:

| Criterion | Verification Method | Enforcement Tool | Failure Action |
|---|---|---|---|
| **1. Physical Existence** | `fs.existsSync(filepath) === true` | `validateCompletionEvidence` | Task marked `FAILED` (`FILE_NOT_FOUND`) |
| **2. Non-Zero Bytes** | `fs.statSync(filepath).size > 0` | `validateCompletionEvidence` | Task marked `FAILED` (`ZERO_BYTE_ARTIFACT`) |
| **3. Writer Ownership** | Writer in handoff matches designated owner in Task Graph | `validateCompletionEvidence` | Task marked `FAILED` (`SINGLE_WRITER_VIOLATION`) |
| **4. Schema / SQLite Pass** | Passes dedicated validator script with 0 errors | `validate_*.js` | Task marked `FAILED` (`VALIDATION_ERROR`) |

---
**Approval Status**: APPROVED FOR IMMEDIATE ENGINE IMPLEMENTATION
