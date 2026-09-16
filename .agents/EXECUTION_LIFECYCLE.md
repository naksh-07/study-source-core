# StudySourceCore — 3-Wave Execution Lifecycle & Orchestration Protocol

> **Canonical Path**: `.agents/EXECUTION_LIFECYCLE.md`  
> **Governance Model**: 3-Wave Phased Progression & Resource-Bounded Concurrency  
> **Status**: AUTHORITATIVE / ENFORCED

---

## 1. Master Lifecycle Architecture

StudySourceCore enforces a deterministic, 3-wave execution lifecycle. Each phase operates under strict preconditions, bounded concurrency budgets, and rigorous completion gates.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              MISSION INITIALIZATION                                    │
│                              • Verify input study source existence                     │
│                              • Extract scratch/evidence-pack.md & SHA-256 hash         │
│                              • Run scripts/routing_engine.js                           │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ WAVE 1: Parallel Specialized Generation                                                │
│ Concurrency Cap: Max 4 Active Workers | Timeout: 180s per subagent                     │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────────────────┐ │
│ │ core-notes           │ │ core-basic-anki      │ │ Subject APKG Author (if STEM)    │ │
│ │ core-mindmap         │ │ core-cloze-anki      │ │ (math / reasoning /              │ │
│ │ core-slide-deck      │ │ core-image-occlusion │ │  physics / chemistry)            │ │
│ └──────────────────────┘ └──────────────────────┘ └──────────────────────────────────┘ │
│ Preconditions: routing_manifest.json generated; tracks marked enabled.                 │
│ Completion Gate: All active subagents return handoff.md with verified artifacts on disk│
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ WAVE 2: Sequential Packaging & Compilation                                             │
│ Concurrency: Single-Threaded (Parent Orchestrator CLI invocation)                      │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ 1. export_anki.js: Compiles Basic/Cloze/IO -> <Chapter>_Anki.apkg                 │ │
│ │ 2. Intermediate Archiving: Move TSVs to .build/source-artifacts/                   │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│ Preconditions: Wave 1 TSVs / JSON items validate against Draft-07 schemas.             │
│ Completion Gate: SQLite integrity check returns "ok"; .apkg file size > 0.             │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ WAVE 3: Post-Packaging Quality Gates & Physical Auditing                               │
│ Concurrency Cap: Max 2 Active Workers | Timeout: 120s per subagent                     │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────────────────┐ │
│ │ bm-qa                │ │ bm-graph             │ │ adversarial-apkg-reviewer        │ │
│ │ (Cross-Artifact QA)  │ │ (Vault Graph Links)  │ │ (Security & Invariant Audit)     │ │
│ └──────────────────────┘ └──────────────────────┘ └──────────────────────────────────┘ │
│ Preconditions: All final compiled deliverables physically exist on disk.               │
│ Completion Gate: 0 hard invariant violations; QA Report certifies PASS.               │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              MISSION FINAL RELEASE                                     │
│                              • Write final execution manifest to .build/               │
│                              • Clean up temporary scratch directories                  │
│                              • Emit final parent completion summary                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Parent Orchestrator vs. Subagent Specialist Duties

To prevent architectural degradation and maintain clear separation of concerns, the boundary between orchestrator and worker is strictly defined:

| Dimension | Parent Orchestrator (`study-source-core`) | Subagent Specialists (`core-*`, `*-apkg-author`, `bm-*`) |
|---|---|---|
| **Role** | Control-Plane Master & Execution Coordinator | Data-Plane Domain Expert & Content Creator |
| **Allowed Actions** | • Ingest raw source and extract evidence pack<br>• Compute SHA-256 hash and lineage<br>• Execute `routing_engine.js`<br>• Dispatch subagents adhering to concurrency limits<br>• Execute packaging scripts in Wave 2<br>• Validate physical artifact completion<br>• Manage 1-retry protocol upon failure | • Read `scratch/evidence-pack.md`<br>• Author domain-specific deliverables<br>• Perform internal schema validation<br>• Write structured `handoff.md`<br>• Correct errors when prompted with targeted diagnostics |
| **Strictly Prohibited** | • **Parent Self-Execution Ban**: Directly writing notes, flashcards, SVG masks, or problem JSON<br>• Modifying specialist deliverables directly<br>• Exceeding 4 concurrent subagent dispatches | • Re-parsing raw source PDFs<br>• Mutating files owned by sibling specialists<br>• Bypassing schema validation<br>• Writing unparenthesized English explanations |

### 2.1 Inviolable Laws: Single-Writer Rule & Parent Self-Execution Ban
1. **The Single-Writer Rule**: Exactly one designated specialist subagent owns and writes to each target deliverable file. No secondary writer, peer agent, or parent orchestrator is permitted to modify or overwrite an artifact owned by another agent.
2. **The Parent Self-Execution Ban**: The Parent Orchestrator coordinates, routes, gates, packages, and verifies, but is **strictly prohibited** from directly generating specialist-owned artifacts (e.g. notes, flashcards, problem patterns, SVG masks). If a deliverable is required, dispatch to the designated specialist is mandatory.
3. **Dependency Barriers**: Wave 1 tasks execute concurrently in disjoint directories. Wave 2 packaging halts at Dependency Barrier 1 until all active Wave 1 tasks reach terminal state (`COMPLETED`, `SKIPPED`, `FAILED`). Wave 3 audits halt at Dependency Barrier 2 until binary packages exist on disk.

---


## 3. Wave Progression Rules & Concurrency Controls

### 3.1 Why Wave 1 is Parallel
During Wave 1, all specialized generators consume the identical, immutable `scratch/evidence-pack.md`. Because each agent writes to its own isolated file directory (`Notes/`, `Basic/`, `Cloze/`, `ImageOcclusion/`, `MindMaps/`, `SlideDecks/`, `Optional/`), there are zero cross-file write conflicts. Parallel execution maximizes pipeline throughput while respecting the global concurrency cap ($\le 4$).

### 3.2 Why Wave 2 is Sequential
Anki APKG compilation requires creating and packing SQLite databases (`collection.anki2`) and archiving media files into zip containers. Running multiple packaging scripts concurrently can cause SQLite lock contention and temporary file collisions. Therefore, Wave 2 packaging scripts execute sequentially in single-threaded mode under the direct orchestration of the parent.

### 3.3 Why Wave 3 is Post-Packaging
Quality auditing and vault graph integration require the completed, compiled deliverables to physically exist on disk. `adversarial-apkg-reviewer` inspects the actual compiled SQLite tables inside the `.apkg` file, while `bm-qa` verifies cross-artifact consistency across notes, flashcards, and presentation slides simultaneously.

---

## 4. Resource Limits, Timeouts & Retry Budgets

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             HARD RESOURCE CONSTRAINTS                                  │
│  • Max Concurrent Subagents: 4                                                         │
│  • Max Total Subagent Launches per Mission: 10                                         │
│  • Subagent Execution Timeout: 180 seconds                                             │
│  • Maximum Retry Attempts per Specialist: 1                                            │
│  • Immediate Workforce Collapse: Terminate worker subagents upon handoff receipt        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 The 1-Retry Targeted Correction Protocol
If a subagent produces an artifact that fails automated schema validation or quality checks:

1. **Attempt 1 Failure**: The orchestrator intercepts the failure, captures the exact AJV validation errors, line numbers, or invariant violations, and dispatches a targeted correction prompt to the subagent.
2. **Attempt 2 Execution**: The subagent reads the error diagnostics, applies targeted corrections, and resubmits `handoff.md`.
3. **Escalation & Containment**:
   - If Attempt 2 succeeds: Pipeline proceeds normally.
   - If Attempt 2 fails: The specialist is marked `FAILED`. The parent isolates the blast radius, aborts dependent packaging for that single track, preserves valid sibling tracks, and emits a Truthful Failure Report.

---

## 5. Physical Artifact Completion Gate

Before a mission is declared complete, the orchestrator executes physical verification checks:

1. **File Existence & Non-Zero Byte Check**: Every enabled deliverable path must exist on disk and possess size $> 0$ bytes.
2. **Schema & Integrity Verification**:
   - Practice questions pass AJV Draft-07 validation against `studylab-practice-questions-schema.json`.
   - Mindmaps parse cleanly via `mermaid_validator.js`.
   - Compiled APKGs pass SQLite `PRAGMA integrity_check` returning `ok`.
3. **Invariant Checks**:
   - All MCQ items possess $\ge 4$ options in SQLite fields.
   - Zero English-only explanatory prose.
   - Model IDs strictly match `1600000001`–`1600000004`.

---

## 6. Structured Handoff Schema

> **Anchor**: `#structured-handoff-schema`

Every specialist subagent MUST return this canonical structured handoff block upon completion. This is the **single source of truth** for handoff format across all agents.

```text
### HANDOFF REPORT
- STATUS:        [PASS | FAIL | BLOCKED]
- AGENT:         [Specialist ID/Name]
- TASK_ID:       [Mission-scoped unique identifier]
- SCOPE:         [Assigned artifact description and domain boundary]
- INPUTS:        [Path(s) consumed, e.g. scratch/evidence-pack.md]
- OUTPUTS:       [Artifact description(s) generated]
- OUTPUT_PATHS:  [Concrete file path(s) on disk]
- VALIDATION:    [Results of automated schema/integrity checks]
- WARNINGS:      [Constraints, limits, risks, or suppression reasons]
- ERRORS:        [Failure details if STATUS != PASS; empty otherwise]
- EVIDENCE:      [Citations, SHA-256 hashes, sample output, or validation traces]
```

The parent orchestrator MUST NOT begin synthesis until all required specialist handoffs have arrived.
