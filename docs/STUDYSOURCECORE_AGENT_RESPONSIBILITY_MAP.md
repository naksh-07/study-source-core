# StudySourceCore: Canonical Agent Responsibility Map

> [!NOTE]
> **Epistemic Classification: NORMATIVE_INVARIANT**  
> **Authority Dimension**: Semantic / Conceptual Specification  
> **Operational Living Owner**: [`.agents/AGENTS.md`](../.agents/AGENTS.md) and [`.agents/OWNERSHIP.md`](../.agents/OWNERSHIP.md)  
> **Retention Notice**: Retained at this exact path (> 2,000 bytes) for backward-compatibility with `test_final_audit_harness.js` Stage 5.1.


## 1. Authoritative Agent Responsibility Matrix

This matrix establishes the non-overlapping ownership boundaries, explicit triggers, inputs, outputs, and negative boundaries across all 14 specialist subagents.

| Agent | Owns | Does | Does NOT do | Input | Output | Trigger |
|---|---|---|---|---|---|---|
| **`core-notes`** | Knowledge Note architecture & Obsidian formatting | Authors complete, source-grounded Markdown notes (`Notes/<Chapter>_Notes.md`) with Hindi-first bilingual prose, callouts, and clean math blocks | Does NOT author Anki TSV files, JSON manifests, or APKG binaries | Canonical evidence pack (`scratch/evidence-pack.md`) | `Notes/<Chapter>_Notes.md` | Mandatory for all standard study material requests |
| **`core-basic-anki`** | Atomic factual recall cards | Generates strict 3-column TSV cards (Front, Back, Tags) in Hindi-first format with single-concept questions | Does NOT generate Cloze deletions, Image Occlusions, or procedural math cards | Evidence pack atomic facts & definitions | `Basic/<Chapter>_Basic.tsv` | `basicCandidateCount > 0` |
| **`core-cloze-anki`** | Contextual in-sentence retrieval cards | Generates strict 3-column TSV cards (Text with `{{c1::...}}`, Extra, Tags) focusing on key relations and formulas | Does NOT generate Basic Q&A cards or procedural payloads | Evidence pack core relationships & formulas | `Cloze/<Chapter>_Cloze.tsv` | `clozeCandidateCount > 0` |
| **`core-image-occlusion`** | Visual-spatial diagram recall | Authors Image Occlusion JSON manifests and binds coordinate regions to resolved PNG/SVG assets | Does NOT generate text-only flashcards or MindMap graphs | Visual assets & visual profile from evidence pack | `ImageOcclusion/<Chapter>_ImageOcclusion.json` + media | Visual worthiness `HIGH`/`MEDIUM` & visual targets exist |
| **`core-mindmap`** | Hierarchical & relational visual graphs | Authors canonical `MindMap/<Chapter>.mindmap.json` adhering to `map-schema.md` with hierarchical branches ($\ge 2$ depth) and cross-links | Does NOT author markdown notes, slide prompts, or flashcards | Concept hierarchy and taxonomy from evidence pack | `MindMap/<Chapter>.mindmap.json` | Source contains relational topology / concept taxonomy |
| **`core-slide-deck`** | Multi-modal presentation prompts | Authors structured NotebookLM slide deck generation prompt (`SlideDeck/<Chapter>_SlideDeckPrompt.md`) across 12 required sections | Does NOT author Anki decks or procedural code | Narrative overview & visual profile from evidence pack | `SlideDeck/<Chapter>_SlideDeckPrompt.md` | Slide deck worthiness `HIGH`/`MEDIUM` |
| **`bm-graph`** | Vault-wide Wikilink & heading anchor graph linking | Analyzes cross-chapter note references and proposes high-value bidirectional Wikilinks | Does NOT modify core note text or generate cards | Knowledge note & vault index | Proposed Wikilink patch block | Non-trivial content (`noteWords >= 350` or `evidenceChars >= 800`) |
| **`bm-qa`** | Cross-artifact semantic & formatting audit | Audits semantic consistency across Notes, Anki, MindMap, and StudyLab; flags gaps or contradictions | Does NOT author original artifacts or overwrite valid content | All generated chapter artifacts | Semantic QA audit report | Non-trivial package (`noteWords >= 400` or `totalArtifacts >= 3`) |
| **`math-apkg-author`** | Mathematics procedural APKGs & practice question inventories | Authors `ProblemPatterns.json/.md`, `PracticeQuestions.json`, and compiles `StudyLab/<Chapter>_StudyLab_Procedural.apkg` for Math topics | Does NOT generate non-math content or generic declarative flashcards | Math evidence pack, authentic questions, formulas | `Optional/*` and `StudyLab/*.apkg` | Subject is Mathematics & solvable questions exist |
| **`reasoning-apkg-author`** | Reasoning procedural APKGs & constraint models | Authors procedural contracts and compiles `StudyLab_Procedural.apkg` for Syllogisms, Seating, Matrix Puzzles, and Coded Relations | Does NOT author numerical math or physics content | Reasoning evidence pack & puzzle rules | `Optional/*` and `StudyLab/*.apkg` | Subject is Reasoning & solvable puzzles/questions exist |
| **`physics-numerical-apkg-author`** | Numerical Physics procedural APKGs & free-body models | Authors 6-stage numerical physics contracts (FBD, kinematics, energy, circuits) and compiles StudyLab APKGs | Does NOT handle descriptive/theoretical physics without calculation | Physics numerical evidence pack & SI units | `Optional/*` and `StudyLab/*.apkg` | Subject is Physics & numerical problems exist |
| **`chemistry-numerical-apkg-author`** | Numerical & Mechanism Chemistry procedural APKGs | Authors stoichiometry, equilibrium, pH, and reaction mechanism contracts and compiles StudyLab APKGs | Does NOT handle rote descriptive inorganic facts | Chemistry evidence pack & equations | `Optional/*` and `StudyLab/*.apkg` | Subject is Chemistry & numericals/mechanisms exist |
| **`mold-gap-auditor`** | Declarative mold registry audit & gap analysis | Audits canonical 533 contract registry against chapter topics; establishes reuse vs extend vs create boundaries | Does NOT author final user-facing notes or cards | Problem patterns & contract registry | Mold audit scorecard & gap report | Schema verification or complex procedural domain auditing |
| **`adversarial-apkg-reviewer`** | Independent 15-point adversarial attack & verification | Executes 15 adversarial checks (ADV-01 to ADV-15), DAG cycle detection, hint leak detection, and schema validation | Does NOT author or edit artifact files | Final compiled APKG & manifest | Independent Pass/Fail verification verdict | High-risk procedural export, release freezes, or QA audit |

---

## 2. Cross-Agent Operational Rules

1. **Strict Non-Interference**: A specialist must only write to its designated directory scope. Under no circumstances may `core-notes` modify Anki TSVs, nor may `math-apkg-author` edit `Notes/<Chapter>_Notes.md`.
2. **Single Ingestion Point**: No specialist is permitted to re-read or independently re-parse the raw source PDF. All specialists consume `scratch/evidence-pack.md`.
3. **Parent Synthesis & Gating**: The parent orchestrator evaluates routing gates and initiates dispatches. Specialists do not recursively spawn other specialists without parent authorization.
> **Canonical Terminology**: See [OWNERSHIP.md#1-architectural-principles-of-ownership](../.agents/OWNERSHIP.md#1-architectural-principles-of-ownership) for the authoritative Single-Writer Rule, Parent Self-Execution Ban, and dispatch terminology definitions.