# StudySourceCore: System Architecture & Capability Model

> **Authoritative Specification**: [`ARCHITECTURE.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/ARCHITECTURE.md)  
> **Product Charter**: [`PRODUCT.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/PRODUCT.md)  
> **Roadmap**: [`ROADMAP.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/ROADMAP.md)  
> **Pedagogy Principles**: [`docs/LEARNING_PRINCIPLES.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/LEARNING_PRINCIPLES.md)  
> **Status**: HARMONIZED WITH v1.0 BASELINE  

---

## 1. High-Level Mental Model & Canonical 6-Tier Architecture

**StudySourceCore** is the master multi-agent execution and orchestration engine designed to transform authorized educational sources into parallel, high-yield sibling study artifacts.

It operates on the canonical six-tier architecture:
`AUTHORIZED SOURCE → EVIDENCE PACK → SEMANTIC LEARNING IR → PEDAGOGICAL COMPILER → RENDERERS → INDEPENDENT CERTIFICATION`.

Core System Laws:
1. **Single Source of Truth**: The raw source is parsed and extracted once into an immutable **Canonical Evidence Pack** (`scratch/evidence-pack.md`).
2. **Deterministic Gating & Zero Silent Omission**: Artifacts are generated if and only if justified by source content. If an artifact is suppressed, an explicit machine-readable suppression reason is recorded.
3. **Hard Layer Isolation & Media Independence**: Declarative content, procedural content contracts, runtime generation molds, and learner state persistence remain strictly decoupled. Renderers are projections, never sources of semantic truth.
4. **Physical Verification Gates**: No task is certified as complete based solely on conversational subagent responses; artifacts must physically exist on disk, contain non-zero bytes, conform to schema, and validate against SQLite database assertions.

```text
                                 ┌───────────────────────┐
                                 │   Authorized Source   │
                                 │  (PDF / Textbook / MD) │
                                 └───────────┬───────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │     StudySourceCore       │
                               │ Ingestion & Single Pack   │
                               └─────────────┬─────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │  Canonical Evidence Pack  │
                               │ (scratch/evidence-pack.md)│
                               └─────────────┬─────────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               ▼                             ▼                             ▼
     ┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
     │ Knowledge Layer  │          │ Declarative Mem  │          │   Visual Layer   │
     │   (core-notes)   │          │  (Basic / Cloze) │          │  (IO / MindMap / │
     │  Notes/*.md      │          │   *.tsv -> .apkg │          │    SlideDeck)    │
     └──────────────────┘          └──────────────────┘          └──────────────────┘
               │                             │                             │
               └─────────────────────────────┼─────────────────────────────┘
                                             ▼
                               ┌───────────────────────────┐
                               │  StudyLab Procedural Br.  │
                               │ (math/reasoning/phys/chem)│
                               │  ProblemPatterns & APKG   │
                               └─────────────┬─────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │ Artifact Completion Gate  │
                               │  & Lineage Verification   │
                               └───────────────────────────┘
```

### 1.1 Enterprise-Grade Scalability & Maintainability
StudySourceCore is engineered to industry standards for production workloads:
- **Scalability (Explicit DAG & Wave Execution)**: Built on an Explicit Task Graph (DAG) with wave-based execution constraints. Wave 1 limits parallel subagents (Max 4 concurrent workers) to prevent API rate-limit exhaustion and memory bottlenecks, allowing the system to scale reliably across complex chapters.
- **Maintainability (Hard Layer & Blast-Radius Isolation)**: Enforces a strict **Single-Writer Rule** preventing race conditions. Employs **Hard Layer Isolation** (decoupling extraction, generation, and packaging) and **Blast-Radius Containment** (if a non-critical specialist like `core-mindmap` fails, sibling branches remain unaffected, averting total system crashes).

---

## 2. "Why This Exists" Capability Model

Every capability in the system fulfills an explicit educational or architectural need.

### 1. Source Ingestion
- **PURPOSE**: Read raw educational material (PDF, OCR text, notes) safely without truncation or data corruption.
- **OWNER**: `StudySourceCore` (Parent Orchestrator).
- **INPUT**: Filepath to raw source in `Sources/<Subject>/...`.
- **OUTPUT**: In-memory text/AST structure and raw page buffers.
- **TRIGGER**: User requests study material generation for a chapter.
- **NON-GOALS**: Does not generate study cards or summarize concepts directly.
- **DEPENDENCIES**: Filesystem access, PDF extraction utilities.
- **HANDOFF**: Raw text stream passed to Evidence Extraction.
- **VALIDATION**: File existence, non-empty read assertion.

### 2. Evidence Extraction
- **PURPOSE**: Extract an immutable, structured evidence pack (`scratch/evidence-pack.md`) containing definitions, formulas, diagrams, and authentic practice questions once.
- **OWNER**: `StudySourceCore` (Parent Orchestrator).
- **INPUT**: Ingested source text.
- **OUTPUT**: `scratch/evidence-pack.md` and SHA-256 hash.
- **TRIGGER**: Successful source ingestion.
- **NON-GOALS**: Does not author formatted notes or compile APKGs.
- **DEPENDENCIES**: Ingested source text.
- **HANDOFF**: `scratch/evidence-pack.md` published to workspace for specialist consumption.
- **VALIDATION**: Character length check, formula extraction check, SHA-256 computation.

### 3. Subject Routing
- **PURPOSE**: Deterministically evaluate chapter eligibility, candidate counts, and select domain specialist subagents.
- **OWNER**: `StudySourceCore` (`scripts/routing_engine.js`).
- **INPUT**: Evidence pack metadata, candidate counts, visual profile, subject domain.
- **OUTPUT**: Routing decision object with boolean flags and explicit suppression reasons.
- **TRIGGER**: Completion of evidence extraction.
- **NON-GOALS**: Does not author content.
- **DEPENDENCIES**: Evidence pack metadata.
- **HANDOFF**: Gating flags passed to Subagent Dispatcher.
- **VALIDATION**: Deterministic rules in `routing_engine.js`.

### 4. Knowledge Notes (`Notes`)
- **PURPOSE**: Provide a comprehensive, source-grounded Obsidian Markdown note representing the conceptual knowledge layer.
- **OWNER**: `core-notes`.
- **INPUT**: Canonical evidence pack (`scratch/evidence-pack.md`).
- **OUTPUT**: `Study Materials/<Subject>/<Chapter>/Notes/<Chapter>_Notes.md`.
- **TRIGGER**: Study material request (Mandatory for all standard study requests).
- **NON-GOALS**: Does not author Anki TSV cards or JSON manifests.
- **DEPENDENCIES**: Evidence pack.
- **HANDOFF**: Structured handoff report + written `.md` file.
- **VALIDATION**: `note_contract_audit.js` (single H1, YAML frontmatter, no empty sections).

### 5. Basic Flashcards (`Basic`)
- **PURPOSE**: Generate atomic question-answer retrieval pairs in Hindi-first format for rapid factual recall.
- **OWNER**: `core-basic-anki`.
- **INPUT**: Evidence pack facts and definitions.
- **OUTPUT**: `Study Materials/<Subject>/<Chapter>/Basic/<Chapter>_Basic.tsv` (3-column: Front, Back, Tags).
- **TRIGGER**: `basicCandidateCount > 0`.
- **NON-GOALS**: Does not generate fill-in-the-blank clozes or procedural items.
- **DEPENDENCIES**: Evidence pack.
- **HANDOFF**: Structured handoff report + 3-column TSV.
- **VALIDATION**: `validate_tsv.js` (strict 3-column verification, Hindi prose check).

### 6. Cloze Flashcards (`Cloze`)
- **PURPOSE**: Generate contextual deletion cards (`{{c1::...}}`) for in-sentence retrieval.
- **OWNER**: `core-cloze-anki`.
- **INPUT**: Evidence pack core relationships and formulas.
- **OUTPUT**: `Study Materials/<Subject>/<Chapter>/Cloze/<Chapter>_Cloze.tsv` (3-column: Text, Extra, Tags).
- **TRIGGER**: `clozeCandidateCount > 0`.
- **NON-GOALS**: Does not author Basic flashcards.
- **DEPENDENCIES**: Evidence pack.
- **HANDOFF**: Structured handoff report + 3-column TSV.
- **VALIDATION**: `validate_tsv.js` (valid `{{c1::...}}` syntax, non-empty Extra/Tags).

### 7. Image Occlusion (`ImageOcclusion`)
- **PURPOSE**: Generate high-yield visual-spatial recall masks over diagrams, anatomy, or geographical maps.
- **OWNER**: `core-image-occlusion`.
- **INPUT**: Visual assets from source and evidence pack visual profile.
- **OUTPUT**: `Study Materials/<Subject>/<Chapter>/ImageOcclusion/<Chapter>_ImageOcclusion.json` and media assets.
- **TRIGGER**: `io_worthiness === 'HIGH' || 'MEDIUM'` AND visual candidates exist.
- **NON-GOALS**: Does not generate non-visual text cards.
- **DEPENDENCIES**: Resolved visual asset (PNG/SVG).
- **HANDOFF**: Structured handoff report + IO JSON manifest.
- **VALIDATION**: `validate_image_occlusion.js` (valid bounding boxes within bounds, unique IDs).

### 8. MindMap (`MindMap`)
- **PURPOSE**: Build hierarchical and relational concept trees for visual structural mastery.
- **OWNER**: `core-mindmap`.
- **INPUT**: Hierarchical concept taxonomy from evidence pack.
- **OUTPUT**: `Study Materials/<Subject>/<Chapter>/MindMap/<Chapter>.mindmap.json`.
- **TRIGGER**: Source contains hierarchical/relational topology (depth $\ge 2$).
- **NON-GOALS**: Does not write narrative notes or question banks.
- **DEPENDENCIES**: Evidence pack concepts.
- **HANDOFF**: Structured handoff report + MindMap JSON.
- **VALIDATION**: `validate_map.js` (valid root node, hierarchy depth $\ge 2$, valid connections).

### 9. SlideDeck Prompt (`SlideDeck`)
- **PURPOSE**: Author high-impact NotebookLM slide deck presentation prompt for multi-modal review.
- **OWNER**: `core-slide-deck`.
- **INPUT**: Conceptual narrative and visual profile from evidence pack.
- **OUTPUT**: `Study Materials/<Subject>/<Chapter>/SlideDeck/<Chapter>_SlideDeckPrompt.md`.
- **TRIGGER**: `deck_worthiness === 'HIGH' || 'MEDIUM'`.
- **NON-GOALS**: Does not generate flashcard decks.
- **DEPENDENCIES**: Evidence pack.
- **HANDOFF**: Structured handoff report + slide deck markdown.
- **VALIDATION**: `slide_deck_prompt_audit.js` (12 mandatory sections, 5–15 slide budget).

### 10. StudyLab Practice Questions (`PracticeQuestions`)
- **PURPOSE**: Capture authentic solvable source questions, exam PYQs, and textbook exercises with strict pattern linkage and provenance.
- **OWNER**: Domain APKG Author (`math-apkg-author`, `reasoning-apkg-author`, `physics-numerical-apkg-author`, `chemistry-numerical-apkg-author`).
- **INPUT**: Evidence pack question inventory.
- **OUTPUT**: `Study Materials/<Subject>/<Chapter>/Optional/<Chapter>_PracticeQuestions.json`.
- **TRIGGER**: Chapter contains $\ge 1$ authentic solvable practice questions.
- **NON-GOALS**: Does not invent synthetic filler questions when authentic ones exist.
- **DEPENDENCIES**: Evidence pack.
- **HANDOFF**: Structured handoff report + PracticeQuestions JSON.
- **VALIDATION**: `validate_studylab_practice_questions.js` (schema validation, pattern coverage matrix).

### 11. Mold & Gap Analysis
- **PURPOSE**: Audit declarative contract coverage against domain capabilities and identify generation gaps without pre-seeding.
- **OWNER**: `mold-gap-auditor`.
- **INPUT**: Canonical contract registry and target chapter problem patterns.
- **OUTPUT**: Gap audit report and parameter domain specifications.
- **TRIGGER**: Complex procedural chapters or schema verification.
- **NON-GOALS**: Does not compile final binary APKGs.
- **DEPENDENCIES**: `studylab-canonical-contracts.json`.
- **HANDOFF**: Structured handoff report.
- **VALIDATION**: Contract coverage audit against Phase 40 bounds.

### 12. Procedural APKG Compilation (`StudyLab APKG`)
- **PURPOSE**: Compile rich, self-contained, portable Anki procedural practice packages containing embedded mathematical solution graphs, 3-tier hints, and parameter domains.
- **OWNER**: Domain APKG Author (`math-apkg-author`, etc.) via `export_studylab_procedural_anki.js`.
- **INPUT**: `PracticeQuestions.json` and/or `ProblemPatterns.json`.
- **OUTPUT**: `Study Materials/<Subject>/<Chapter>/StudyLab/<Chapter>_StudyLab_Procedural.apkg` and companion `.manifest.json`.
- **TRIGGER**: Solvable practice questions exist in procedural domains.
- **NON-GOALS**: Does not embed ephemeral learner state (`SkillState`, review logs).
- **DEPENDENCIES**: `sql.js`, `jszip`, canonical schemas.
- **HANDOFF**: Compiled `.apkg` and `.manifest.json`.
- **VALIDATION**: `validate_studylab_procedural_apkg.js` (SQLite integrity, Model ID 1600000004, card count $\ge 1$).

### 13. Physical Validation
- **PURPOSE**: Programmatically inspect all generated artifacts on disk before releasing.
- **OWNER**: `StudySourceCore` validation scripts.
- **INPUT**: On-disk artifact files.
- **OUTPUT**: Pass/Fail validation matrix.
- **TRIGGER**: Post-generation wave.
- **NON-GOALS**: Does not modify file content directly.
- **DEPENDENCIES**: Generated artifact files.
- **HANDOFF**: Final validation scorecard.
- **VALIDATION**: TSV parser, JSON Schema (Ajv), SQLite query, Markdown AST.

### 14. Downstream QA & Graph Linking
- **PURPOSE**: Perform cross-artifact semantic consistency audit and resolve high-value vault Wikilinks.
- **OWNER**: `bm-qa` and `bm-graph`.
- **INPUT**: Entire generated chapter package.
- **OUTPUT**: QA audit report and Wikilink proposals.
- **TRIGGER**: Non-trivial chapter complexity (`noteWordCount >= 400` or `totalArtifacts >= 3`).
- **NON-GOALS**: Does not rebuild or overwrite core artifacts.
- **DEPENDENCIES**: Completed chapter deliverables.
- **HANDOFF**: Structured QA signoff report.
- **VALIDATION**: Cross-artifact consistency rules.

---

## 3. Inviolable Architectural Boundaries

1. **APKG vs Learner State Boundary**:
   - APKG payloads contain only educational content, constraints, derivations, and hints.
   - Learner attempts, scheduling, and FSRS parameters live exclusively in runtime `procedural.db`.
2. **`1 Pattern != 1 Question`**:
   - Multiple distinct source questions under a single family maintain independent identities and card anchors.
3. **Language Boundary**:
   - Hindi-first for all conceptual explanations, step justifications, and hints. Standard English technical terms in parentheses `( )`.
> **Canonical Terminology**: See [OWNERSHIP.md#1-architectural-principles-of-ownership](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/OWNERSHIP.md#1-architectural-principles-of-ownership) for the authoritative Single-Writer Rule, Parent Self-Execution Ban, and dispatch terminology definitions.