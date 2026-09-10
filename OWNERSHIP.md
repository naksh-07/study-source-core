# StudySourceCore — Single Responsibility & Ownership Charter

> **Canonical Path**: `.agents/OWNERSHIP.md`  
> **Governance Model**: Strict Single Responsibility Principle (SRP) & Single-Writer Rule  
> **Status**: AUTHORITATIVE / ENFORCED

---

## 1. Architectural Principles of Ownership

To eliminate race conditions, file corruption, and duplicate cognitive effort in multi-agent workflows, StudySourceCore enforces two fundamental governance laws:

### 1.1 The Single-Writer Rule
> **Law**: Exactly **one** designated specialist subagent owns and writes to each target deliverable file. No secondary writer, peer agent, or concurrent process is permitted to modify or overwrite an artifact owned by another agent.

- Every file path in the deliverable tree maps to a single owner.
- Multi-writer collisions trigger an immediate build failure and pipeline abort.
- Downstream quality and audit agents (e.g., `bm-qa`, `adversarial-apkg-reviewer`) may only write to their own dedicated audit reports (`Audit/QA_Report.md`, `Audit/Adversarial_APKG_Audit.md`), never directly mutating the artifacts under review.

### 1.2 The Parent Self-Execution Ban
> **Law**: The Parent Orchestrator is **strictly forbidden** from directly generating, authoring, or mutating specialized study artifacts. The parent owns only intake, evidence pack extraction, routing manifest generation, subagent dispatch, wave gating, physical completion verification, and handoff aggregation.

- If a deliverable is required (e.g., `Notes/<Chapter>_Notes.md`), the parent **must** dispatch the task to `core-notes`.
- The parent cannot take shortcuts by inlining notes, authoring flashcards, or generating SVG masks directly.
- Violation of this ban represents a severe architectural defect and results in immediate audit failure.

---

## 2. Complete Task & Deliverable Ownership Matrix

The table below establishes the exhaustive, 1-to-1 mapping across all 18 core responsibilities in the StudySourceCore pipeline:

The authoritative artifact ownership, writer, validator, dependency, and execution metadata is defined in `resources/artifact-registry.json`.

---

## 3. Detailed Component Ownership Breakdown

### 3.1 Parent Orchestrator vs. Specialist Subagents
```
Parent Orchestrator (study-source-core)
│
├── [Intake & SSoT] ──► Extracts scratch/evidence-pack.md & calculates SHA-256
├── [Routing] ────────► Runs scripts/routing_engine.js to generate routing_manifest.json
├── [Dispatch Wave 1] ─► Launches max 4 concurrent subagents (Notes, Anki, Mindmap, etc.)
├── [Gating Wave 1] ───► Receives handoffs, checks file existence and schema validity
├── [Dispatch Wave 2] ─► Executes packaging scripts (export_anki.js)
├── [Dispatch Wave 3] ─► Launches audit subagents (bm-qa, adversarial-apkg-reviewer)
└── [Final QA] ────────► Verifies physical deliverables, emits master execution verdict
```

### 3.2 Subject-Specific Specialization
When processing STEM or specialized procedural domains, generic agents defer to dedicated domain specialists.

The complete list of supported subjects, their domains, and their mapped specialist agents is canonically defined in `resources/subject-skill-manifest.json`.

---

## 4. Blast Radius Containment & Failure Isolation

When a subagent fails validation or encounters an unrecoverable error during its execution wave:

1. **Failure Containment**: The failure of one specialist (e.g., `core-image-occlusion` failing SVG validation) is strictly isolated. Valid sibling artifacts (e.g., `Notes/<Chapter>_Notes.md`, `Basic/<Chapter>_Basic.tsv`) are preserved.
2. **Targeted 1-Retry Policy**: The parent orchestrator extracts exact AJV or parser error diagnostics and prompts the failing subagent for a single targeted retry.
3. **Graceful Track Suppression**: If Attempt 2 fails, the failing track is marked `FAILED` in the build manifest, dependent packaging for that track is aborted, but non-dependent sibling artifacts proceed to Wave 3 audit.
4. **Truthful Reporting**: The final build report explicitly records the failed track with its diagnostic logs and sets the overall build verdict to `PARTIAL_SUCCESS` or `FAILED`, never masking the failure.
