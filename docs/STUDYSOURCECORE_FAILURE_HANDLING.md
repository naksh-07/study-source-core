# StudySourceCore: Failure Propagation, Recovery & Blast Radius Isolation

## 1. Core Failure Handling Philosophy

StudySourceCore enforces **blast radius containment without false success**:
1. **Isolated Worker Failure**: If a single specialist fails (e.g. `core-mindmap` errors out or produces invalid JSON), healthy sibling branches (e.g. `core-notes` and `core-basic-anki`) are preserved and not destroyed.
2. **Strict Anti-False-Pass Invariant**: A mission MUST NOT return a final `GREEN` / `PASS` verdict if any expected artifact failed generation or validation.
3. **No Silent Degrades**: An invalid or missing artifact must never be silently omitted, nor may an MCQ question with invalid options be silently converted to a plain text card.

---

## 2. Failure Matrix Across Major Capabilities

| Failed Component | Blast Radius / Affected Scope | Preserved Artifacts | Recovery Action | Final Release Status |
|---|---|---|---|---|
| **Notes (`core-notes`)** | Knowledge note deliverable | Anki TSVs, MindMap, StudyLab JSONs | Retry `core-notes` once with specific formatting error context. If still failing, abort release. | **RELEASE BLOCKING (FAIL)** — Notes are mandatory. |
| **Basic TSV (`core-basic-anki`)** | `Basic/` TSV and Declarative `.apkg` assembly | `Notes/`, `MindMap/`, `SlideDeck/`, `StudyLab/` | If Cloze/IO cards exist, Declarative APKG compiles without Basic cards (with warning). If Basic was sole card source, APKG is suppressed. | **PARTIAL PASS WITH WARNING** (if other cards exist) / **FAIL** (if all declarative cards fail). |
| **MindMap (`core-mindmap`)** | `MindMap/<Chapter>.mindmap.json` | `Notes/`, `Anki.apkg`, `SlideDeck/`, `StudyLab/` | Retry schema validation once. If invalid topology persists, mark MindMap as `FAILED_VALIDATION` in manifest. | **NON-BLOCKING WARNING** for non-visual chapters; **RELEASE BLOCKING (FAIL)** if chapter explicitly required MindMap. |
| **StudyLab JSON (`PracticeQuestions.json`)** | `Optional/*` and StudyLab Procedural APKG | `Notes/`, `Anki.apkg`, `MindMap/`, `SlideDeck/` | Retry specialist once with schema violation log. If failing, block StudyLab APKG compilation; do not generate corrupted binary. | **RELEASE BLOCKING (FAIL)** for procedural domains (Maths, Reasoning, Phys/Chem numericals). |
| **MCQ Options Validation** | Question payload & procedural card anchor | All non-MCQ cards and generic artifacts | Reject question anchor immediately if `< 4` options or missing correct answer. Never downgrade to generic text input. | **RELEASE BLOCKING (FAIL)** for the affected procedural package. |
| **APKG Compiler (`export_anki.js`)** | Binary `.apkg` output | Intermediate TSV files in `Basic/` and `Cloze/` (preserved for debugging) | Abort intermediate deletion. Log SQLite/JSZip error details. Intermediate TSVs preserved in chapter directory. | **RELEASE BLOCKING (FAIL)** — Missing binary deliverable. |
| **Build Manifest (`artifact-manifest.json`)** | Lineage and verification metadata | All physical artifacts on disk | Regenerate manifest via `artifact_provenance.js` by rescanning valid on-disk artifacts. | **RECOVERABLE** — Manifest regenerated automatically. |

---

## 3. Targeted Retry Protocol

To prevent infinite loops while allowing recovery from transient formatting errors, StudySourceCore enforces a strict **1-Retry Rule**:

```text
Specialist Dispatched
       │
       ▼
Receives Handoff & Validates Deliverable
       │
       ├─────────────────────────► [PASS] ──► Proceed to Next Wave
       │
       ▼ [FAIL]
Attempt 1 Failed:
  1. Extract exact validation error (e.g. "Line 14: Column count 2 != 3").
  2. Send targeted correction message to subagent.
  3. Re-execute validation.
       │
       ├─────────────────────────► [PASS] ──► Proceed to Next Wave
       │
       ▼ [FAIL]
Attempt 2 Failed:
  1. Mark specialist as FAILED.
  2. Record error details in execution-state.json and artifact-manifest.json.
  3. Abort dependent packaging steps.
  4. Emit Truthful Failure Report with overall verdict FAIL.
```

---

## 4. Truthful Final Failure Report Format

When any component fails, the orchestrator outputs the standardized failure block:

```text
================================================================================
🔴 STUDYSOURCECORE EXECUTION FAILED
================================================================================
Chapter:       [Chapter Name]
Subject:       [Subject Name]
Failed Stream: [e.g. StudyLab Practice Questions Validation]
Responsible:   [e.g. math-apkg-author]
Error Details: [e.g. Option 'C' missing text in question 'pq-math-lcm-04']
Blast Radius:  StudyLab Procedural APKG compilation aborted.
Preserved:     Notes (VALID), Basic Anki (VALID), MindMap (VALID).
Verdict:       🔴 RELEASE BLOCKED — MANUAL CORRECTION REQUIRED
================================================================================
```
