# Master Agents Registry (`AGENTS.md`)

## 1. Overview & Architecture

StudySourceCore coordinates 14 specialized, single-responsibility subagents to transform raw study sources into parallel, high-yield sibling study artifacts. Every agent adheres strictly to the **Single-Writer Rule** (exactly one designated agent writes to each target deliverable) and the **Parent Self-Execution Ban** (the parent orchestrator coordinates, routes, gates, and audits, but never authors specialist deliverables).

The 14 agents are categorized into three operational classes:
1. **Generic Content Specialists (6 agents)**: Produce core chapter study artifacts in Wave 1 parallel generation (`core-notes`, `core-basic-anki`, `core-cloze-anki`, `core-image-occlusion`, `core-mindmap`, `core-slide-deck`).
2. **StudyLab Procedural Specialists (4 agents)**: Author domain-specific STEM and analytical practice patterns, solution DAGs, 3-tier hints, and interactive APKG packages (`math-apkg-author`, `reasoning-apkg-author`, `physics-numerical-apkg-author`, `chemistry-numerical-apkg-author`).
3. **Downstream QA & Audit Specialists (4 agents)**: Execute semantic cross-artifact consistency checks, vault graph linking, contract gap analysis, and independent adversarial APKG verification (`bm-graph`, `bm-qa`, `mold-gap-auditor`, `adversarial-apkg-reviewer`).

---

## 2. Master Agent Index

The authoritative artifact ownership, writer, validator, dependency, and execution metadata is defined in `resources/artifact-registry.json`.

| # | Agent ID | Agent File Link | Category | Primary Role |
|---|---|---|---|---|
| 1 | `core-notes` | [01-source-ingestion / `core-notes.md`](agents/core-notes.md) | Generic Content | Knowledge Notes Architect |
| 2 | `core-basic-anki` | [02-flashcard-author / `core-basic-anki.md`](agents/core-basic-anki.md) | Generic Content | Basic Flashcard Specialist |
| 3 | `core-cloze-anki` | [03-cloze-author / `core-cloze-anki.md`](agents/core-cloze-anki.md) | Generic Content | Cloze Flashcard Specialist |
| 4 | `core-image-occlusion` | [04-image-occlusion / `core-image-occlusion.md`](agents/core-image-occlusion.md) | Generic Content | Image Occlusion Specialist |
| 5 | `core-mindmap` | [05-mindmap-author / `core-mindmap.md`](agents/core-mindmap.md) | Generic Content | MindMap Specialist |
| 6 | `core-slide-deck` | [06-slide-deck / `core-slide-deck.md`](agents/core-slide-deck.md) | Generic Content | SlideDeck Specialist |
| 7 | `bm-graph` | [07-graph-linker / `bm-graph.md`](agents/bm-graph.md) | Downstream QA | Graph Linker Specialist |
| 8 | `bm-qa` | [08-cross-artifact-qa / `bm-qa.md`](agents/bm-qa.md) | Downstream QA | Cross-Artifact QA Specialist |
| 9 | `math-apkg-author` | [09-math-specialist / `math-apkg-author.md`](agents/math-apkg-author.md) | StudyLab Specialist | Track B Mathematics APKG Author |
| 10 | `reasoning-apkg-author` | [10-reasoning-specialist / `reasoning-apkg-author.md`](agents/reasoning-apkg-author.md) | StudyLab Specialist | Track C Reasoning APKG Author |
| 11 | `physics-numerical-apkg-author` | [11-physics-specialist / `physics-numerical-apkg-author.md`](agents/physics-numerical-apkg-author.md) | StudyLab Specialist | Track D Physics Numerical APKG Author |
| 12 | `chemistry-numerical-apkg-author` | [12-chemistry-specialist / `chemistry-numerical-apkg-author.md`](agents/chemistry-numerical-apkg-author.md) | StudyLab Specialist | Track E Chemistry Numerical APKG Author |
| 13 | `mold-gap-auditor` | [13-mold-gap-auditor / `mold-gap-auditor.md`](agents/mold-gap-auditor.md) | Downstream QA | Mold & Gap Auditor |
| 14 | `adversarial-apkg-reviewer` | [14-adversarial-reviewer / `adversarial-apkg-reviewer.md`](agents/adversarial-apkg-reviewer.md) | Downstream QA | Independent Adversarial Reviewer |

---

## 3. Detailed Agent Profiles

> **Note**: Artifact ownership, output paths, and validation scripts are canonically defined in `resources/artifact-registry.json`.


### 1. `core-notes` — Knowledge Notes Architect
- **Definition File**: `.agents/agents/core-notes.md`
- **Role**: Transforms extracted evidence into comprehensive, well-structured Obsidian Markdown study notes with full frontmatter metadata.
- **Why Exists**: Isolates conceptual note architecture and hierarchical synthesis from flashcard atomization, ensuring durable notes with callouts, tables, and bilingual terms.
- **Does Not Own**: Anki TSVs, Image Occlusion manifests, Slide decks, Procedural APKGs.
- **Input**: `scratch/evidence-pack.md` and chapter metadata.
- **Required Context**: `skills/study-source-core/resources/note-architecture.md`, `skills/study-source-core/resources/source-policy.md`.
- **Invocation Trigger**: Invoked when eligible according to the Subject Artifact Policy in Wave 1 parallel generation.
- **Process**: Read evidence pack $\to$ construct frontmatter $\to$ synthesize single H1 and mandatory sections $\to$ add optional justified sections $\to$ AST self-audit $\to$ write `Notes/<Chapter>_Notes.md` $\to$ return handoff.
- **Failure Conditions**: Missing frontmatter fields, broken heading hierarchy, multiple H1s, English-only prose, hallucinations.
- **Duplication Guard**: Evaluates evidence SHA-256 hash before re-authoring; points to `.agents/resources/note-architecture.md`.

### 2. `core-basic-anki` — Basic Flashcard Specialist
- **Definition File**: `.agents/agents/core-basic-anki.md`
- **Role**: Authors atomic Question & Answer Anki flashcards for factual, definitional, and conceptual recall in strict 3-column TSV format.
- **Why Exists**: Factual retention requires atomic active retrieval pairs without conversational bloat or multi-part question confusion.
- **Does Not Own**: Cloze cards, Image Occlusions, Notes, APKG compilation.
- **Input**: `scratch/evidence-pack.md` and chapter metadata.
- **Required Context**: `skills/study-source-core/resources/anki-core-rules.md`.
- **Invocation Trigger**: Subject Artifact Policy; suppressed if deemed unnecessary by the Subject Skill.
- **Process**: Extract atomic candidate facts $\to$ format 3-column TSV $\to$ escape inner tabs/newlines $\to$ write `Basic/<Chapter>_Basic.tsv` $\to$ return handoff.
- **Failure Conditions**: 2-column or 4-column TSV rows, unescaped raw newlines, English-only explanations, empty cards.
- **Duplication Guard**: Suppresses output with `ZERO_BASIC_CANDIDATES` rather than creating empty files; points to `.agents/resources/anki-core-rules.md`.

### 3. `core-cloze-anki` — Cloze Flashcard Specialist
- **Definition File**: `.agents/agents/core-cloze-anki.md`
- **Role**: Authors contextual fill-in-the-blank Cloze deletion Anki flashcards (`{{c1::...}}`) for high-yield keywords, formulas, and terminology.
- **Why Exists**: Retains relational facts, formulas, and sequences in their natural grammatical context without answer leakage.
- **Does Not Own**: Basic flashcards, Image Occlusions, Notes, APKG compilation.
- **Input**: `scratch/evidence-pack.md` and chapter metadata.
- **Required Context**: `skills/study-source-core/resources/anki-core-rules.md`.
- **Invocation Trigger**: Subject Artifact Policy; suppressed if deemed unnecessary by the Subject Skill.
- **Process**: Extract declarative statements $\to$ apply `{{c1::target::hint}}` syntax $\to$ add pedagogical notes in Extra column $\to$ write `Cloze/<Chapter>_Cloze.tsv` $\to$ return handoff.
- **Failure Conditions**: Missing `{{c1::}}` markers, over-clozing entire sentences, broken TSV delimiters.
- **Duplication Guard**: Suppresses output with `ZERO_CLOZE_CANDIDATES`; points to `.agents/resources/anki-core-rules.md`.

### 4. `core-image-occlusion` — Image Occlusion Specialist
- **Definition File**: `.agents/agents/core-image-occlusion.md`
- **Role**: Discovers visual diagram candidates, normalizes coordinates, and creates SVG mask manifests for Anki Image Occlusion cards.
- **Why Exists**: Spatial memory (geography boundaries, physiological organs, circuit layouts) requires geometric coordinate masking.
- **Does Not Own**: Text flashcards, Notes, Slide decks, APKG compilation.
- **Input**: Visual assets from source and evidence pack visual profile.
- **Required Context**: `skills/study-source-core/resources/image-occlusion-contract.md`, `skills/study-source-core/resources/image-occlusion-schema.json`.
- **Invocation Trigger**: Subject Artifact Policy; suppressed if deemed unnecessary by the Subject Skill.
- **Process**: Discover diagrams $\to$ calculate normalized $[x, y, w, h]$ bounding boxes $\to$ define Hindi-first labels $\to$ author JSON manifest $\to$ write files $\to$ return handoff.
- **Failure Conditions**: Coordinates outside $[0..100]$ bounds, missing media files, $> 15$ regions (cognitive overload).
- **Duplication Guard**: Suppresses with `NO_IO_CANDIDATES` or `IO_WORTHINESS_BELOW_THRESHOLD`; points to `.agents/resources/image-occlusion-contract.md`.

### 5. `core-mindmap` — MindMap Specialist
- **Definition File**: `.agents/agents/core-mindmap.md`
- **Role**: Synthesizes multi-branch relational topic hierarchies into clean, navigable Mermaid mindmaps and JSON concept trees.
- **Why Exists**: Complex non-linear conceptual topologies require spatial representation beyond linear text notes.
- **Does Not Own**: Text study notes, flashcards, slide decks, APKGs.
- **Input**: `scratch/evidence-pack.md` and concept taxonomy.
- **Required Context**: `skills/study-source-core/resources/map-core-rules.md`, `skills/study-source-core/resources/map-schema.md`.
- **Invocation Trigger**: Source contains multi-branch relational topology (depth $\ge 2$); suppressed with `NO_RELATIONAL_TOPOLOGY`.
- **Process**: Extract taxonomy tree $\to$ construct root node and child branches $\to$ add cross-links $\to$ write deliverable $\to$ return handoff.
- **Failure Conditions**: Flat single-level tree (depth $< 2$), syntax errors, missing root node.
- **Duplication Guard**: Suppresses generation with `NO_RELATIONAL_TOPOLOGY` when linear; points to `.agents/resources/map-schema.md`.

### 6. `core-slide-deck` — SlideDeck Specialist
- **Definition File**: `.agents/agents/core-slide-deck.md`
- **Role**: Authors pedagogical Marp presentation slide decks and NotebookLM visual prompts across a strict 5–15 slide budget.
- **Why Exists**: Lecture delivery and fast visual review demand dedicated slide pacing, layout directives, and visual prompts.
- **Does Not Own**: Obsidian notes, flashcards, APKGs.
- **Input**: `scratch/evidence-pack.md` and visual profile.
- **Required Context**: `skills/study-source-core/resources/slide-deck-core-rules.md`, `skills/study-source-core/resources/visual-learning-contract.md`.
- **Invocation Trigger**: `deck_worthiness >= threshold`; suppressed with `DECK_WORTHINESS_BELOW_THRESHOLD`.
- **Process**: Determine narrative pacing $\to$ author 12 mandatory sections $\to$ enforce 5–15 slide budget $\to$ write deliverable $\to$ return handoff.
- **Failure Conditions**: Missing mandatory sections, slide budget $< 5$ or $> 15$, text overflow ($> 8$ bullets per slide).
- **Duplication Guard**: Suppresses run with `DECK_WORTHINESS_BELOW_THRESHOLD`; points to `.agents/resources/slide-deck-core-rules.md`.

### 7. `bm-graph` — Graph Linker Specialist
- **Definition File**: `.agents/agents/bm-graph.md`
- **Role**: Indexes Obsidian notes and synthesizes cross-note entity links to construct an interconnected vault knowledge graph.
- **Why Exists**: Builds semantic bridges across discrete chapters without mutating notes during initial generation.
- **Does Not Own**: Primary note text authoring, flashcards, APKG compilation.
- **Input**: `Notes/<Chapter>_Notes.md` and vault target index.
- **Required Context**: `skills/study-source-core/resources/note-architecture.md`. Complexity gate: `noteWordCount >= 350` or `evidenceChars >= 800`.
- **Invocation Trigger**: Wave 3 post-packaging; note meets word count and candidate vault targets exist.
- **Process**: Discover candidate terms in note matching vault index $\to$ filter trivial words $\to$ generate link patches $\to$ return handoff.
- **Failure Conditions**: Dead Wikilinks pointing to non-existent notes, circular redundant links.
- **Duplication Guard**: Suppresses run with `NO_CANDIDATE_GRAPH_TARGETS` or `TRIVIAL_CONTENT_BELOW_GRAPH_THRESHOLD`.

### 8. `bm-qa` — Cross-Artifact QA Specialist
- **Definition File**: `.agents/agents/bm-qa.md`
- **Role**: Audits factual consistency and semantic parity across Notes, Anki decks, MindMaps, SlideDecks, and StudyLab packages.
- **Why Exists**: Independent branch generation risks subtle factual drift; `bm-qa` ensures zero divergence from source evidence.
- **Does Not Own**: Modifying deliverables directly, compiling APKGs.
- **Input**: All generated sibling deliverables and `scratch/evidence-pack.md`.
- **Required Context**: `skills/study-source-core/resources/validation-rules.md`, `skills/study-source-core/resources/source-policy.md`. Complexity gate: `noteWordCount >= 400` or `totalArtifacts >= 3`.
- **Invocation Trigger**: Wave 3 post-packaging; content exceeds complexity threshold.
- **Process**: Ingest all sibling deliverables $\to$ cross-check formulas, numbers, and dates against evidence pack $\to$ run checkers $\to$ compile report $\to$ return handoff.
- **Failure Conditions**: Contradictions between sibling files, hallucinations, unverified claims.
- **Duplication Guard**: Suppresses run with `TRIVIAL_CONTENT_BELOW_QA_THRESHOLD`; points to `.agents/resources/validation-rules.md`.

### 9. `math-apkg-author` — Track B Mathematics APKG Author
- **Definition File**: `.agents/agents/math-apkg-author.md`
- **Role**: Authors mathematical problem pattern catalogs, practice question inventories, Solution DAGs, 3-tier hints, and compiles StudyLab APKGs.
- **Why Exists**: Embeds deep mathematical solvers, integer constraints, coprime factorizations, and procedural practice progression.
- **Does Not Own**: Non-math study notes, basic flashcards, slide decks.
- **Input**: `scratch/evidence-pack.md` (Math domain) and authentic PYQs.
- **Required Context**: `skills/study-source-core/subject-skills/Math/SKILL.md`, `skills/study-source-core/resources/studylab-procedural-contract.md`, `skills/study-source-core/resources/studylab/anti-fallback-invariant.md`.
- **Invocation Trigger**: Subject === 'Math' AND solvable practice questions exist in source evidence.
- **Process**: Extract solvable math questions $\to$ map to canonical problem families $\to$ author JSON manifests $\to$ compile APKG $\to$ validate $\to$ return handoff.
- **Failure Conditions**: Incomplete solution DAG, Tier 1/2 hint leaking final answer, MCQ with $< 4$ options, generic flashcard fallback.
- **Duplication Guard**: Preserves discrete identities (`1 Pattern != 1 Question`); points to `.agents/RESOURCES.md`.

### 10. `reasoning-apkg-author` — Track C Reasoning APKG Author
- **Definition File**: `.agents/agents/reasoning-apkg-author.md`
- **Role**: Authors logical deduction, syllogism, seating arrangement, and matrix puzzle problem patterns and compiles StudyLab APKGs.
- **Why Exists**: Implements a 7-layer cognitive thinking pipeline with 4-tier constraint classification and step-by-step deduction nodes.
- **Does Not Own**: Essay notes, basic TSVs, slide decks.
- **Input**: `scratch/evidence-pack.md` (Reasoning domain).
- **Required Context**: `skills/study-source-core/subject-skills/Reasoning/SKILL.md`, `skills/study-source-core/resources/studylab-procedural-contract.md`.
- **Invocation Trigger**: Subject === 'Reasoning' AND solvable practice questions/puzzles exist.
- **Process**: Extract puzzles $\to$ classify constraints $\to$ construct deduction graphs $\to$ author JSONs $\to$ compile APKG $\to$ validate $\to$ return handoff.
- **Failure Conditions**: Logical ambiguity resulting in multiple solutions, MCQ options $< 4$, hint answer leaks.
- **Duplication Guard**: Preserves distinct puzzle scenarios; points to `.agents/RESOURCES.md`.

### 11. `physics-numerical-apkg-author` — Track D Physics Numerical APKG Author
- **Definition File**: `.agents/agents/physics-numerical-apkg-author.md`
- **Role**: Authors numerical Physics problem patterns, practice questions, and compiles StudyLab APKGs strictly for calculational topics.
- **Why Exists**: Enforces a 6-stage calculational pipeline (FBD, Coordinates, Law, Solve, SI, Sanity) with strict dimensional analysis. Qualitative theory is excluded.
- **Does Not Own**: Qualitative non-calculational physics facts, generic notes, basic TSVs.
- **Input**: `scratch/evidence-pack.md` (Physics domain).
- **Required Context**: `skills/study-source-core/subject-skills/Physics/SKILL.md`, `skills/study-source-core/resources/studylab-procedural-contract.md`.
- **Invocation Trigger**: Subject === 'Physics' AND numerical calculational problems exist; suppressed if descriptive-only (`DESCRIPTIVE_ONLY_NO_NUMERICALS`).
- **Process**: Extract numericals $\to$ apply 6-stage pipeline $\to$ author JSON manifests $\to$ compile APKG $\to$ validate $\to$ return handoff.
- **Failure Conditions**: Descriptive questions in procedural deck, dimensional mismatches, unphysical values (speed $> c$, negative mass).
- **Duplication Guard**: Preserves distinct physical setups; points to `.agents/RESOURCES.md`.

### 12. `chemistry-numerical-apkg-author` — Track E Chemistry Numerical APKG Author
- **Definition File**: `.agents/agents/chemistry-numerical-apkg-author.md`
- **Role**: Authors stoichiometry, equilibrium ICE tables, reaction mechanisms, and compiles StudyLab APKGs strictly for calculational/mechanistic topics.
- **Why Exists**: Structures chemical calculations ($K_c/K_p$, pH, Nernst) and reaction mechanisms ($S_N1/S_N2$) without rote descriptive facts.
- **Does Not Own**: Rote descriptive facts (ore colors, discovery dates), generic notes, basic TSVs.
- **Input**: `scratch/evidence-pack.md` (Chemistry domain).
- **Required Context**: `skills/study-source-core/subject-skills/Chemistry/SKILL.md`, `skills/study-source-core/resources/studylab-procedural-contract.md`.
- **Invocation Trigger**: Subject === 'Chemistry' AND calculational or mechanistic problems exist; suppressed if rote-only (`DESCRIPTIVE_ROTE_NO_CALCULATIONS`).
- **Process**: Extract chemical problems $\to$ build ICE tables and reaction step DAGs $\to$ author JSON manifests $\to$ compile APKG $\to$ validate $\to$ return handoff.
- **Failure Conditions**: Unbalanced equations, invalid stoichiometry, non-calculational facts in procedural deck.
- **Duplication Guard**: Preserves distinct chemical reaction systems; points to `.agents/RESOURCES.md`.

### 13. `mold-gap-auditor` — Mold & Gap Auditor
- **Definition File**: `.agents/agents/mold-gap-auditor.md`
- **Role**: Audits procedural contract registries against topics, enforcing strict Reuse vs Extend vs Create boundaries and standalone portability.
- **Why Exists**: Prevents schema explosion and accidental mutation of frozen contracts while asserting zero pre-seeding standalone portability.
- **Does Not Own**: Authoring study notes, compiling APKGs, modifying production schemas directly.
- **Input**: `resources/schemas/studylab-canonical-contracts.json` and chapter practice deliverables.
- **Required Context**: `skills/study-source-core/resources/studylab/manifest-spec.md`, `skills/study-source-core/resources/studylab/domain-boundaries.md`.
- **Invocation Trigger**: Wave 1 complex chapter classification OR Wave 3 pre-release contract registry audit.
- **Process**: Match proposed contracts against canonical registry $\to$ classify `REUSE`/`EXTEND`/`CREATE` $\to$ verify parameter domain bounds $\to$ compile report $\to$ return handoff.
- **Failure Conditions**: Unbounded parameter domains (division by zero possible), redundant novel schema creation, missing step nodes.
- **Duplication Guard**: Enforces schema reuse to prevent duplicate contracts; points to `.agents/resources/studylab/manifest-spec.md`.

### 14. `adversarial-apkg-reviewer` — Independent Adversarial Reviewer
- **Definition File**: `.agents/agents/adversarial-apkg-reviewer.md`
- **Role**: Executes the 15-point attack harness (ADV-01 to ADV-15), validating DAG topology, detecting hint answer leaks, and issuing release sign-offs/vetoes.
- **Why Exists**: Overcomes authoring confirmation bias by operating as an independent adversarial challenger testing compiled binaries.
- **Does Not Own**: Authoring artifacts, modifying files, compiling APKGs.
- **Input**: Compiled `.apkg` binaries, `.manifest.json`, and intermediate JSON manifests.
- **Required Context**: `skills/study-source-core/resources/studylab/anti-fallback-invariant.md`, `skills/study-source-core/resources/studylab/validation-protocol.md`.
- **Invocation Trigger**: Wave 3 post-packaging release gate whenever a StudyLab Procedural APKG is generated.
- **Process**: Parse `.apkg` SQLite DB and ZIP structure $\to$ execute 15-point attack checks $\to$ assert DAG cycle absence and non-leaking hints $\to$ verify MCQ options ($\ge 4$) in SQLite $\to$ issue Pass/Fail $\to$ return handoff.
- **Failure Conditions**: Any breach across the 15 checks, circular DAG dependencies, hint leaking final answer, MCQ with $< 4$ options in SQLite.
- **Duplication Guard**: Evaluates package checksum; does not re-audit identical binary hashes; points to `.agents/RESOURCES.md`.

---

## 4. Standard 14-Section Template Compliance

Every agent definition file under `.agents/agents/*.md` must strictly contain the 14 standard sections in exact numerical order:

```markdown
---
name: <agent-id>
description: <concise summary of specialist role and responsibility>
---

# <Agent Title> (`<agent-id>`)

## 1. ROLE
## 2. WHY THIS AGENT EXISTS
## 3. OWNS
## 4. DOES NOT OWN
## 5. INPUT
## 6. REQUIRED CONTEXT
## 7. INVOCATION TRIGGER
## 8. PROCESS
## 9. OUTPUT
## 10. HANDOFF FORMAT
## 11. VALIDATION
## 12. FAILURE CONDITIONS
## 13. DUPLICATION GUARD
## 14. EXAMPLES
```

Any deviation in section naming, numbering, or omission of required sections constitutes an architectural lint error.
