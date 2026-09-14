# StudySourceCore: Canonical Dispatch Matrix

## 1. Single Source of Truth for Dispatch

This matrix defines the exact deterministic trigger, selected agent, priority, execution mode, input requirements, deliverable expectations, completion conditions, and suppression rules across all StudySourceCore capabilities.

| Capability / Artifact | Trigger Condition | Selected Agent | Priority | Execution Mode | Required Input | Expected Output | Completion Condition | Suppression Condition & Code |
|---|---|---|---|---|---|---|---|---|
| **Knowledge Notes** | Study material request for authorized source | `core-notes` | **P0** (Critical) | Parallel (Wave 1) | `scratch/evidence-pack.md` | `Notes/<Chapter>_Notes.md` | File exists on disk, size > 0, valid YAML frontmatter, passes `note_contract_audit.js` | None. Mandatory for all valid study requests. |
| **Basic Flashcards** | `basicCandidateCount > 0` | `core-basic-anki` | **P1** | Parallel (Wave 1) | Evidence pack atomic facts | `Basic/<Chapter>_Basic.tsv` | Strict 3-column TSV exists, valid UTF-8, passes `validate_tsv.js` | `basicCandidateCount === 0`<br>Code: `ZERO_BASIC_CANDIDATES` |
| **Cloze Flashcards** | `clozeCandidateCount > 0` | `core-cloze-anki` | **P1** | Parallel (Wave 1) | Evidence pack relationships & formulas | `Cloze/<Chapter>_Cloze.tsv` | Strict 3-column TSV exists with `{{c1::...}}`, passes `validate_tsv.js` | `clozeCandidateCount === 0`<br>Code: `ZERO_CLOZE_CANDIDATES` |
| **Image Occlusion** | `io_worthiness === 'HIGH' \| 'MEDIUM'` AND `io_candidates.length > 0` | `core-image-occlusion` | **P1** | Parallel (Wave 1) | Resolved image asset & visual candidate regions | `ImageOcclusion/<Chapter>_ImageOcclusion.json` + media | Valid JSON schema, all bounding boxes within dimensions, passes `validate_image_occlusion.js` | `io_worthiness` below threshold or no candidates.<br>Code: `NO_IO_CANDIDATES` / `IO_WORTHINESS_BELOW_THRESHOLD` |
| **Declarative APKG** | $\ge 1$ card generated across Basic, Cloze, or IO | `export_anki.js` (Orchestrator utility) | **P2** | Sequential (Wave 2) | Validated `Basic/`, `Cloze/`, `ImageOcclusion/` files | `Study Materials/.../<Chapter>_Anki.apkg` | Valid `.apkg` ZIP, valid SQLite DB, Models 1600000001-3 present, passes `validate_apkg.js` | Zero declarative cards available.<br>Code: `NO_DECLARATIVE_CARDS_AVAILABLE` |
| **Visual MindMap** | Chapter has relational topology / concept taxonomy (depth $\ge 2$) | `core-mindmap` | **P1** | Parallel (Wave 1) | Concept hierarchy from evidence pack | `MindMap/<Chapter>.mindmap.json` | JSON file exists on disk, passes `validate_map.js`, root node valid, depth $\ge 2$ | Source has no hierarchical/relational structure.<br>Code: `NO_RELATIONAL_TOPOLOGY` |
| **Slide Deck Prompt** | `deck_worthiness === 'HIGH' \| 'MEDIUM'` | `core-slide-deck` | **P2** | Parallel (Wave 1) | Narrative overview from evidence pack | `SlideDeck/<Chapter>_SlideDeckPrompt.md` | Markdown file exists, passes `slide_deck_prompt_audit.js` (12 mandatory sections) | Low visual narrative value.<br>Code: `DECK_WORTHINESS_BELOW_THRESHOLD` |
| **StudyLab Practice Questions** | $\ge 1$ authentic solvable source questions exist | Subject APKG Author (`math-apkg-author`, `reasoning-apkg-author`, `physics-numerical-apkg-author`, `chemistry-numerical-apkg-author`) | **P1** | Parallel (Wave 1) | Evidence pack question inventory | `Optional/<Chapter>_PracticeQuestions.json` | Valid JSON schema, $100\%$ pattern linkage, passes `validate_studylab_practice_questions.js` | Zero questions found in source.<br>Code: `ZERO_PRACTICE_QUESTIONS` |
| **StudyLab Problem Patterns** | Procedural patterns discovered in source | Subject APKG Author | **P1** | Parallel (Wave 1) | Evidence pack methods & algorithms | `Optional/<Chapter>_ProblemPatterns.json` & `.md` | Valid JSON schema (`studylab-pattern-archetype.schema.json`) | Non-procedural domain.<br>Code: `ZERO_PROCEDURAL_PATTERNS` |
| **StudyLab Procedural APKG** | Procedural chapter AND $\ge 1$ solvable practice questions | Subject APKG Author via `export_studylab_procedural_anki.js` | **P2** | Sequential (Wave 2) | Validated `PracticeQuestions.json` / `ProblemPatterns.json` | `StudyLab/<Chapter>_StudyLab_Procedural.apkg` + `.manifest.json` | Valid `.apkg`, Model 1600000004 present, solution graphs valid, passes `validate_studylab_procedural_apkg.js` | Zero solvable questions or non-procedural domain.<br>Code: `ZERO_SOLVABLE_PRACTICE_QUESTIONS` |
| **Graph Linking** | Candidate vault targets exist AND non-trivial content | `bm-graph` | **P3** | Sequential (Wave 3) | Generated note + vault index | Wikilink patch proposal | Wikilinks validated against existing vault targets | Trivial content or zero graph targets.<br>Code: `NO_CANDIDATE_GRAPH_TARGETS` / `TRIVIAL_CONTENT_BELOW_GRAPH_THRESHOLD` |
| **Cross-Artifact QA** | Non-trivial package (`noteWords >= 400` or `totalArtifacts >= 3`) | `bm-qa` | **P3** | Sequential (Wave 3) | All generated artifacts for chapter | Semantic QA report | All cross-artifact invariants satisfied | Trivial 1-artifact note.<br>Code: `TRIVIAL_CONTENT_BELOW_QA_THRESHOLD` |
| **Adversarial APKG Audit** | High-risk procedural export, release freezes | `adversarial-apkg-reviewer` | **P3** | Sequential (Wave 3) | Compiled Procedural APKG & manifest | 15-point audit scorecard | All 15 adversarial checks (ADV-01 to ADV-15) pass | Non-procedural chapter or standard development run |

---

## 2. Dispatch Wave Progression

```text
WAVE 1: PARALLEL GENERATION (Disjoint Scopes)
┌──────────────┬──────────────────┬──────────────────┬─────────────────┬──────────────┐
│  core-notes  │ core-basic-anki  │ core-cloze-anki  │  core-mindmap   │ Domain APKG  │
│ (Notes/*.md) │  (Basic/*.tsv)   │  (Cloze/*.tsv)   │ (MindMap/*.json)│ Author (Opt) │
└──────┬───────┴────────┬─────────┴────────┬─────────┴────────┬────────┴──────┬───────┘
       │                │                  │                  │               │
       └────────────────┴──────────────────┼──────────────────┴───────────────┘
                                           ▼
WAVE 2: SEQUENTIAL PACKAGING & VALIDATION
┌──────────────────────────────────────────┬──────────────────────────────────────────┐
│        export_anki.js (Declarative)      │    export_studylab_procedural_anki.js    │
│       Produces [Chapter]_Anki.apkg       │  Produces [Chapter]_StudyLab_Proc.apkg   │
└────────────────────┬─────────────────────┴────────────────────┬─────────────────────┘
                     │                                          │
                     └─────────────────────┬────────────────────┘
                                           ▼
WAVE 3: POST-PACKAGING AUDIT & VERIFICATION
┌──────────────────────────────────────────┬──────────────────────────────────────────┐
│           Physical Validation            │               bm-qa Audit                │
│    (validate_tsv, validate_apkg, etc.)   │     (Cross-Artifact Semantic Check)      │
└──────────────────────────────────────────┴──────────────────────────────────────────┘
```
> **Canonical Terminology**: See [OWNERSHIP.md#1-architectural-principles-of-ownership](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/OWNERSHIP.md#1-architectural-principles-of-ownership) for the authoritative Single-Writer Rule, Parent Self-Execution Ban, and dispatch terminology definitions.