# StudySourceCore: Canonical Data Lifecycle & Lineage

## 1. The 6-Stage End-to-End Data Flow

The StudySourceCore data pipeline transforms raw learning inputs into permanent study artifacts through 6 strictly sequenced stages:

```text
  [Stage 1: Ingestion]      Authorized Source PDF / Textbook / Markdown
                                         │
                                         ▼
  [Stage 2: Extraction]     Single Canonical Evidence Pack (scratch/evidence-pack.md)
                            + SHA-256 Evidence Hash
                                         │
                                         ▼
  [Stage 3: Gating]         Deterministic Eligibility Routing (routing_engine.js)
                                         │
                                         ▼
  [Stage 4: Generation]     Parallel Specialist Authoring (Wave 1)
                            ├── Notes/<Chapter>_Notes.md
                            ├── Basic/<Chapter>_Basic.tsv
                            ├── Cloze/<Chapter>_Cloze.tsv
                            ├── ImageOcclusion/<Chapter>_ImageOcclusion.json
                            ├── MindMap/<Chapter>.mindmap.json
                            ├── SlideDeck/<Chapter>_SlideDeckPrompt.md
                            └── Optional/<Chapter>_PracticeQuestions.json
                                         │
                                         ▼
  [Stage 5: Packaging]      APKG Deck Assembly & Intermediate Archival (Wave 2)
                            ├── <Chapter>_Anki.apkg
                            ├── StudyLab/<Chapter>_StudyLab_Procedural.apkg
                            └── .build/source-artifacts/ (Archived TSVs)
                                         │
                                         ▼
  [Stage 6: Verification]   Physical Artifact Completion Gate & Manifest Audit
                            └── .build/artifact-manifest.json (Immutable build record)
```

---

## 2. Detailed Lifecycle Stages

### Stage 1: Source Ingestion
- **Action**: Ingest raw source files from `Sources/<Subject>/...`.
- **Guarantee**: Source files are read-only. No modifications are ever written to `Sources/`.
- **Deduplication**: Read once into memory; raw text buffer reused across subsequent extraction steps.

### Stage 2: Canonical Evidence Pack Extraction
- **Action**: The parent orchestrator parses headings, definitions, key relationships, visual regions, and practice questions into `scratch/evidence-pack.md`.
- **Evidence Hash**: A cryptographic SHA-256 hash of the evidence pack is calculated (`calculateSha256(evidenceContent)`).
- **Lineage Invariant**: Every downstream artifact records this evidence hash in its frontmatter or build manifest. If the evidence changes, all downstream artifacts must be re-validated.

### Stage 3: Deterministic Gating & Profiling
- **Action**: `routing_engine.js` inspects evidence statistics:
  - Factual candidate count (`basicCandidateCount`, `clozeCandidateCount`)
  - Visual worthiness and structures (`visualProfile`)
  - Solvable practice questions count (`solvableCount`)
  - Note complexity indicators
- **Output**: Boolean dispatch flags and explicit suppression reasons recorded in the execution context.

### Stage 4: Parallel Artifact Generation (Wave 1)
- **Action**: Dispatches required specialists using `invoke_subagent`.
- **Isolation**: Each specialist writes exclusively to its target folder:
  - `Notes/`: Conceptual markdown note.
  - `Basic/` & `Cloze/`: Intermediate TSV files.
  - `ImageOcclusion/`: JSON manifests and image masks.
  - `MindMap/`: Hierarchical JSON graph.
  - `SlideDeck/`: Presentation prompt markdown.
  - `Optional/`: Structured practice questions and problem patterns.
- **Single-Writer Rule**: Specialists never write to shared files.

### Stage 5: Deck Packaging & Intermediate Archival (Wave 2)
- **Action**:
  1. `exportChapterToAnki`: Assembles `Basic`, `Cloze`, and `ImageOcclusion` into `<Chapter>_Anki.apkg`.
  2. `exportStudyLabProceduralAnki`: Compiles `PracticeQuestions.json` and `ProblemPatterns.json` into `StudyLab/<Chapter>_StudyLab_Procedural.apkg` and companion `.manifest.json`.
- **Archival Rule**: Upon successful APKG compilation and pre-validation:
  - `Basic/` and `Cloze/` directories are moved to `.build/source-artifacts/` to keep the user-facing folder uncluttered while preserving exact recovery inputs.
  - If APKG compilation fails, intermediate TSVs remain in root to allow debugging.

### Stage 6: Physical Verification Gate & Manifest Finalization (Wave 3)
- **Action**: Programmatic test harnesses execute on physical disk files.
- **Manifest Record**: `artifact_provenance.js` writes the complete build manifest to `.build/artifact-manifest.json`:
  ```json
  {
    "chapter": "LCM-HCF",
    "subject": "Mathematics",
    "evidence_hash": "a1b2c3d4...",
    "build_timestamp": "2026-08-27T21:45:00Z",
    "artifacts": {
      "notes": { "path": "Notes/LCM-HCF_Notes.md", "status": "VALID", "hash": "..." },
      "anki_apkg": { "path": "LCM-HCF_Anki.apkg", "status": "VALID", "cards": 12 },
      "studylab_apkg": { "path": "StudyLab/LCM-HCF_StudyLab_Procedural.apkg", "status": "VALID", "cards": 8 },
      "mindmap": { "path": "MindMap/LCM-HCF.mindmap.json", "status": "VALID" },
      "slide_deck": { "status": "SUPPRESSED", "reason": "DECK_WORTHINESS_BELOW_THRESHOLD" }
    }
  }
  ```
- **Completion Check**: Missing expected artifacts trigger an immediate build `FAIL`.
> **Canonical Terminology**: See [OWNERSHIP.md#1-architectural-principles-of-ownership](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/OWNERSHIP.md#1-architectural-principles-of-ownership) for the authoritative Single-Writer Rule, Parent Self-Execution Ban, and dispatch terminology definitions.