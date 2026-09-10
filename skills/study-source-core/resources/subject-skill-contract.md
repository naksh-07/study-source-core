# Subject Skill Contract & Core Inheritance

A Subject Skill operates on top of `study-source-core`. It provides subject-specific intelligence, domain knowledge models, memory selection logic, performance architectures, and subject audit rules without overriding Core source boundary or tool abstraction contracts.

---

## 1. Tool-Agnostic Subject Skill Contract

Every Subject Skill must be structured around the **9-Part Tool-Agnostic Contract**:

1. **SUBJECT MISSION**: Defines subject identity, domain DNA, and multi-layer boundaries.
2. **SUBJECT KNOWLEDGE ARCHITECTURE**: Defines domain knowledge typology and Note skeleton.
3. **SUBJECT MEMORY ARCHITECTURE**: Defines card selection logic for Basic, Cloze, Comparative, and Mnemonic cards.
4. **SUBJECT PERFORMANCE ARCHITECTURE**: Defines deep-structure recognition, decision rules, problem patterns, setups, and error log taxonomy (conditional layer).
5. **SUBJECT-SPECIFIC OUTPUT EXTENSIONS**: Defines the deterministic artifact eligibility via `runtime-policy.json`. Dictates which mandatory outputs (`Notes.md`, `Basic.tsv`, `Cloze.tsv`), conditional sister outputs (`ImageOcclusion.json`, `SlideDeckPrompt.md`, `mindmap.json`), and StudyLab procedural outputs (`ProblemPatterns.md`, `PracticeQuestions.json`) are permitted.
6. **SUBJECT-SPECIFIC AUDIT**: Defines intellectual and domain completeness checks.
7. **SUBJECT-SPECIFIC PYQ INTERPRETATION**: Defines how PYQ evidence is integrated as a performance source in `SOURCE_PLUS_PYQ` mode.
8. **SUBJECT-SPECIFIC EXCEPTIONS & SPECIAL CASES**: Defines domain-specific exception structures (`Rule → Expected → Exception → Reason → Consequence`).
9. **SUBJECT-SPECIFIC VISUAL LEARNING & SLIDE DECK GRAMMAR**: Defines domain visual representations, diagram types, slide deck layout containers, visual contrast matrices, and examiner trap highlights for NotebookLM slide generation and Image Occlusion.

---

## 2. Core vs Subject Responsibility Matrix

| Responsibility | Owned by `study-source-core` (Universal) | Owned by Subject Skill (Domain-Specific) |
|---|---|---|
| **Source Authority & Scope** | Core enforces source boundary, allowed scope, and file reading. | Subject Skill interprets domain-specific terminology and structures. |
| **Execution Modes** | Core manages `SOURCE_ONLY`, `SOURCE_PLUS_PYQ`, `SOURCE_PLUS_EXTERNAL`, `FACT_CHECK`. | Subject Skill defines how PYQ/external evidence ranks testability for that domain. |
| **Workflow & Approval** | Core manages Plan Mode (A) and Generate Mode (B) approval gates. | Subject Skill provides domain inputs for Knowledge, Memory, Performance, and Visual plans. |
| **4-Layer Boundaries** | Core defines universal boundaries for Knowledge, Memory, Performance, Audit. | Subject Skill fills the 4 layers with domain DNA, problem patterns, and error taxonomies. |
| **Output File Contracts** | Core mandates Chapter-First output architecture (`Study Materials/[Subject]/[Chapter]/`), mandatory (`Notes.md`, `Basic.tsv`, `Cloze.tsv`), conditional (`ImageOcclusion/`, `MindMap/`, `SlideDeck/`), and optional schemas (`ProblemPatterns.md` + `ProblemPatterns.json`). | Subject Skill justifies optional outputs (`ProblemPatterns.md` & `ProblemPatterns.json`, `Comparative.tsv`, etc.). |
| **Mind Map Architecture** | Core defines universal MindMap rules, quality standards (visual compression layer, 3-7 branches, no paragraphs), and validation. The Renderer is subject-agnostic and only renders MapData. | Subject Skill decides WHAT knowledge structures should be represented for that subject. The Generator converts source + Subject Skill into MapData. |
| **Visual Learning & Slide Deck Architecture** | Core defines universal slide deck rules, layout containers (split-screen, cards, timelines), pacing (8–15 slides), and prompt structure for NotebookLM. | Subject Skill defines domain visual models (e.g. FBDs, Reaction networks, Spatial cross-sections), visual contrast layouts, and high-yield visual focus. |
| **Image Occlusion Architecture** | Core defines canonical IO manifest schema (`.json`), geometric bounds (rect, ellipse, polygon), and validation. | Subject Skill identifies domain spatial/diagrammatic recall anchors (e.g. anatomy, maps, circuits, flows). |
| **Language Contract** | Core mandates Hindi-first study material language policy for ALL mandatory and optional outputs (with English technical terms in parentheses). | Subject Skill specializes domain presentation style while inheriting Core Hindi-first language rule. |
| **Anki Mechanics** | Core enforces TSV formatting, 3 columns, tab delimiters, Basic/Cloze separation. | Subject Skill defines domain card priority, formula handling, and memory selection. |
| **Validation & Audit** | Core performs Technical Validation (syntax, format, path compliance, language compliance). | Subject Skill performs Subject Audit (domain completeness, logical integrity). |
| **Tool Abstraction** | Core enforces tool-agnostic operation across all environments. | Subject Skill describes WHAT to extract and HOW to reason, never hardcoding software. |

---

## 3. What Subject Skills MUST NOT Redefine
Subject Skills MUST NOT redefine:
- Universal Chapter-First output directory structure (`Study Materials/[Subject]/[Chapter Folder]/`).
- Universal Hindi-first study material language policy for explanatory prose.
- Universal source boundary policy or source-only default mode.
- Mandatory approval workflow or Mode A / Mode B gates.
- Artifact routing decisions via LLM prompt output. Artifact routing is strictly controlled by `runtime-policy.json`.
- Basic and Cloze TSV file separation and schema specifications.
- Image Occlusion canonical schema or geometric boundary definitions.
- Universal Anki atomicity (5–10 second recall target).
- Technical TSV delimiter syntax or column headers.
- Tool-agnostic execution principles.


