# StudySourceCore — Orchestration Engine & Execution Lifecycle

> **Canonical Document**: `docs/ORCHESTRATION_AND_EXECUTION.md`  
> **Status**: AUTHORITATIVE / FROZEN BASELINE  
> **Version**: 1.0.0-ORCHESTRATION  
> **Governance Authority**: StudySourceCore Master Governance Board  

---

## 1. Orchestration Philosophy: Explicit DAG vs. Agent Swarm

StudySourceCore rejects emergent, conversational agent swarms where agents chat uncontrolled in circular loops. Instead, it operates on a **Deterministic Task Graph (DAG)** execution model:
- Tasks, dependencies, inputs, outputs, and ownership are computed deterministically prior to dispatch.
- Execution progresses across explicit waves separated by synchronization barriers.
- Every task produces a structured 11-field handoff object validated against schema.

---

## 2. Parent Orchestrator & Specialist Subagents

### 2.1 The Parent Orchestrator (`study-source-core`)
The parent orchestrator acts as the mission controller and control-plane governor.
- **Owns**: Raw source ingestion, evidence formulation, candidate routing, task graph formulation, dependency barrier enforcement, compiler dispatch, and physical completion gating.
- **Parent Self-Execution Ban**: The parent orchestrator is strictly barred from authoring study deliverables. The function `assertNoParentSelfExecution(task, writerAgent)` throws an immediate fatal exception if the parent attempts to write notes, flashcards, or question files.

### 2.2 The 14 Specialist Subagents
Specialist subagents own specific pedagogical transformations:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               14 SPECIALIST AGENTS MATRIX                              │
├────┬──────────────────────────────────┬────────┬───────────────────────────────────────┤
│ #  │ Agent ID                         │ Wave   │ Primary Responsibility                │
├────┼──────────────────────────────────┼────────┼───────────────────────────────────────┤
│ 1  │ `core-notes`                     │ Wave 1 │ Knowledge Notes synthesis (Obsidian)  │
│ 2  │ `core-basic-anki`                │ Wave 1 │ Basic Q&A flashcards (3-column TSV)   │
│ 3  │ `core-cloze-anki`                │ Wave 1 │ Contextual cloze flashcards (TSV)     │
│ 4  │ `core-image-occlusion`           │ Wave 1 │ Visual diagram coordinate masks (JSON)│
│ 5  │ `core-mindmap`                   │ Wave 1 │ Hierarchical concept trees (JSON/Mermaid)│
│ 6  │ `core-slide-deck`                │ Wave 1 │ Marp presentation slides (5–15 slides)│
│ 7  │ `math-apkg-author`               │ Wave 1 │ Math problem patterns & practice items│
│ 8  │ `reasoning-apkg-author`          │ Wave 1 │ Reasoning constraints & deduction DAGs│
│ 9  │ `physics-numerical-apkg-author`  │ Wave 1 │ Physics 6-stage numerical calculations│
│ 10 │ `chemistry-numerical-apkg-author`│ Wave 1 │ Chemistry stoichiometry & ICE tables  │
│ 11 │ `export_anki.js`                 │ Wave 2 │ Declarative Anki package compiler     │
│ 12 │ `bm-graph`                       │ Wave 3 │ Vault knowledge graph Wikilinker      │
│ 13 │ `bm-qa`                          │ Wave 3 │ Cross-artifact semantic consistency QA│
│ 14 │ `adversarial-apkg-reviewer`      │ Wave 3 │ 15-point adversarial APKG attack gate │
└────┴──────────────────────────────────┴────────┴───────────────────────────────────────┘
```

---

## 3. Ownership & The Single-Writer Rule

StudySourceCore enforces the **Single-Writer Rule**:
- Exactly one agent owns write authority over each deliverable file path in the workspace.
- The orchestrator maintains `singleWriterMap` mapping canonical filepaths to assigned writer agents.
- If two tasks target the same file, or an agent writes outside its assigned directory, the build halts with a `SINGLE_WRITER_VIOLATION`.

---

## 4. Resource Bounds & Operational Invariants

To prevent rate-limit throttling, memory exhaustion, and runaway subagent creation, the execution engine enforces hard operational bounds:

| Resource Constraint | Hard Cap | System Action Upon Violation |
|---|---|---|
| **Max Concurrent Subagents** | **$\le 4$ Active Workers** | Additional tasks queue at barrier until a worker terminates. |
| **Max Total Launches** | **$\le 10$ Mission Launches** | Pipeline halts with `MAX_LAUNCH_LIMIT_EXCEEDED` to stop infinite loops. |
| **Workforce Collapse** | **Immediate Termination** | Subagents are killed immediately upon emitting valid handoff reports. |
| **Execution Timeout** | **180 Seconds per Task** | Worker killed on timeout; targeted retry triggered once. |

---

## 5. Context Planning & Slicing (`context_planner.js`)

Specialist subagents are not fed the entire textbook or repository context:
- `planContextSlice()` extracts only the specific evidence paragraphs, candidate counts, and subject rules required for that specialist's task.
- This prevents context window pollution, reduces token latency by up to 70%, and enforces strict isolation between unrelated subject tracks.

---

## 6. Targeted 1-Retry Error Protocol & Blast Radius Isolation

When a specialist subagent generates an invalid output (e.g., malformed JSON or unescaped TSV tabs):
1. **Error Diagnostic Capture**: The orchestrator captures exact AJV schema paths and line numbers.
2. **Targeted Single Retry**: The specialist is reinvoked with the diagnostic error log. Only the failing task is retried.
3. **Blast Radius Isolation**: If Attempt 2 fails, the failing lane is isolated and marked `FAILED`. Sibling deliverables that passed validation are strictly preserved and proceed to Wave 2 packaging. The build emits a Truthful Failure Report with overall verdict `PARTIAL_SUCCESS`.

---

## 7. Checkpointing & State Persistence: Current vs. Target

- **[CURRENT] Execution State Tracking**: `scripts/execution_state.js` records task lifecycle transitions (`INIT`, `START`, `RETRY`, `FAIL`, `COMPLETE`) to disk under `scratch/execution_state.json`.
- **[TARGET — Phase 10] Crash-Resilient Checkpoint Recovery**: Phase 10 will harden state persistence so that if an external system crash or timeout occurs mid-mission, the orchestrator can resume execution directly from the last valid barrier without re-executing completed Wave 1 tasks.
