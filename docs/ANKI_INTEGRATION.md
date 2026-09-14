# StudySourceCore — Anki Architecture & APKG Compilation

> **Canonical Document**: `docs/ANKI_INTEGRATION.md`  
> **Status**: AUTHORITATIVE / FROZEN BASELINE  
> **Version**: 1.0.0-ANKI  
> **Governance Authority**: StudySourceCore Master Governance Board  

---

## 1. Foundational Epistemology: Anki is a Renderer

StudySourceCore establishes an unambiguous architectural boundary:  
**Anki is a delivery renderer and spaced-repetition runtime, NOT the canonical learning database.**

1. **No Proprietary Lock-in**: All pedagogical intelligence, conceptual hierarchies, solution DAGs, and problem patterns exist in the Semantic Learning IR.
2. **Downward Projection**: Anki SQLite databases (`collection.anki2`), note model layouts, and ZIP payloads (`.apkg`) are downstream compiled projections.
3. **Immutability of Schemas**: Anki Model IDs and database schemas in Tier 1 (`FROZEN`) must never be modified dynamically during runtime.

---

## 2. Release Scope: Dual APKG (v1.0) vs. Unified APKG (v1.1)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                APKG HORIZON ARCHITECTURE                               │
├────────────────────────────────────────────┬───────────────────────────────────────────┤
│ v1.0 Core Baseline [CURRENT]               │ v1.1 Target [PLANNED]                     │
├────────────────────────────────────────────┼───────────────────────────────────────────┤
│ • Dual APKG Architecture                   │ • Unified APKG Architecture               │
│ • File 1: <Chapter>_Anki.apkg              │ • Single File: <Chapter>_Anki.apkg        │
│   (Models 1600000001, 1600000002, 1600000003)│   (Houses Models 1600000001–1600000004)   │
│ • File 2: <Chapter>_StudyLab_Procedural.apkg│ • Zero Model ID Pollution                 │
│   (Model 1600000004 exclusively)           │ • Single import for all chapter tracks    │
│ • Absolute isolation between decks         │ • Rigorous internal SQLite model barriers │
└────────────────────────────────────────────┴───────────────────────────────────────────┘
```

- **Why Dual APKG in v1.0**: Separating declarative flashcards from interactive procedural card anchors guarantees 100% safety, eliminates SQLite model ID contention, and allows students to import declarative decks without procedural dependencies if desired.
- **Unified APKG in v1.1**: Merges both outputs into a single `.apkg` file while preserving internal model isolation. **Unified APKG is explicitly planned for v1.1 and must NOT be implemented in v1.0.**

---

## 3. The Four Frozen Anki Model IDs

To ensure lifelong backward compatibility across user Anki collections, StudySourceCore assigns immutable model IDs:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           THE 4 FROZEN ANKI NOTE MODELS                          │
├────────────┬──────────────────────────────────┬─────────────────┬────────────────┤
│ Model ID   │ Model Name                       │ Package Deck    │ Field Count    │
├────────────┼──────────────────────────────────┼─────────────────┼────────────────┤
│ 1600000001 │ StudySourceCore Basic            │ Declarative     │ 3 Fields       │
│ 1600000002 │ StudySourceCore Cloze            │ Declarative     │ 3 Fields       │
│ 1600000003 │ StudySourceCore Image Occlusion  │ Declarative     │ 8 Fields       │
│ 1600000004 │ StudyLab Procedural Anchor       │ Procedural      │ 4 Fields       │
└────────────┴──────────────────────────────────┴─────────────────┴────────────────┘
```

### Model Specifications:
1. **Model `1600000001` (Basic)**:
   - Fields: `Front`, `Back`, `Tags`
   - Template: Atomic Question on Front; Answer + Hindi-first explanation on Back.
2. **Model `1600000002` (Cloze)**:
   - Fields: `Text`, `Extra`, `Tags`
   - Template: In-sentence fill-in-the-blank (`{{c1::target::hint}}`); pedagogical notes in `Extra`.
3. **Model `1600000003` (Image Occlusion)**:
   - Fields: `Image`, `Header`, `OcclusionMask`, `Label`, `Notes`, `Tags`, `OriginalWidth`, `OriginalHeight`
   - Template: SVG mask overlay rendered over base image at normalized coordinates.
4. **Model `1600000004` (StudyLab Procedural Anchor)**:
   - Fields: `ProceduralPayload`, `TopicTitle`, `Domain`, `Provenance`
   - Template: Intercepts `ProceduralPayload` JSON to render interactive 3-tier hints and solution DAGs.

---

## 4. Compilation Pipeline & Lifecycle Invariants

The compilers (`scripts/export_anki.js` and `scripts/export_studylab_procedural_anki.js`) execute sequentially in Wave 2:

1. **Single-Threaded SQLite Execution**: Because SQLite is a file-locking embedded database, APKG generation runs sequentially to prevent database lock contention (`SQLITE_BUSY`).
2. **Expected-Count Parity Check**: The compiler reads the input TSV rows or JSON practice questions, builds the SQLite database, and queries `SELECT COUNT(*) FROM notes`. If the database note count does not strictly match the intermediate candidate count, compilation immediately fails.
3. **Failure Preservation Invariant**: If APKG compilation or subsequent validation fails, the intermediate TSV files and JSON manifests are **strictly preserved on disk** in their respective directories (`Basic/`, `Cloze/`, `Optional/`) for operator inspection and targeted retry.
4. **Intermediate Archival & Cleanup**: Only after `validate_apkg.js` passes with 100% structural verification does the cleanup engine archive intermediate TSVs into `.build/` to keep user-facing folders clean.
5. **Zero Pre-Seeding Portability**: Compiled `.apkg` files are 100% self-contained. They import cleanly into a fresh Anki desktop or mobile profile without requiring external database initialization or custom add-ons.
