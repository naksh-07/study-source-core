# StudySourceCore — Product Specification & Governance Charter

> **Canonical Document**: `PRODUCT.md`  
> **Status**: AUTHORITATIVE / FROZEN BASELINE  
> **Version**: 1.0.0-PROD  
> **Governance Authority**: StudySourceCore Master Governance Board  

---

## 1. Product Identity

**StudySourceCore** is a source-first, evidence-grounded cognitive compiler for human learning.

Rather than acting as an unconstrained generative text summarizer or a bulk flashcard dumper, StudySourceCore functions as an educational compiler: it ingests authoritative primary source materials (textbooks, authentic previous-year question papers, syllabus manuals) and compiles them into a structured, pedagogically sound, multimodal learning ecosystem.

```text
[AUTHORIZED SOURCE]
        ↓  (Parent Extraction)
[EVIDENCE PACK]  <-- Single Source of Truth
        ↓  (Semantic IR Formulation)
[SEMANTIC LEARNING IR]  <-- Canonical Learning Representation [TARGET]
        ↓  (Instructional Scaffolding)
[PEDAGOGICAL COMPILER]  <-- 4-Stage Scaffolding & 3-Tier Hints [TARGET]
        ↓  (Format Projections)
[RENDERERS]  <-- Notes, TSV, APKG, MindMap, Slides [CURRENT]
        ↓  (Independent Audit & Release Gate)
[INDEPENDENT CERTIFICATION]  <-- Adversarial Harness & Lineage Check [CURRENT/TARGET]
```

---

## 2. The Problem StudySourceCore Solves

Students and competitive examination candidates face four chronic failure modes when using standard AI tools and traditional study methods:

1. **Hallucinatory Study Summaries**: Standard LLMs routinely invent plausible-sounding facts, fabricate non-existent exam questions, distort mathematical derivation steps, and attribute questions to false examination shifts.
2. **Cognitive Overload via Card Dumping**: Naive flashcard generators create hundreds of low-yield, over-atomized, or multi-part cards, overwhelming the learner's working memory without improving retention.
3. **The Procedural/Declarative Collapse**: Existing flashcard platforms treat all knowledge as declarative facts. A mathematical formula or physical law is presented as a rote recall card, bypassing the cognitive requirements of problem categorization, method selection, and algorithmic calculation.
4. **Format Lock-in & Semantic Fragmentation**: Learning content is typically authored directly inside proprietary formats (Anki `.apkg` files, Notion pages, Obsidian Markdown). If the rendering format needs to change, the pedagogical intelligence must be rewritten from scratch.

StudySourceCore eliminates these failure modes through rigorous source-grounded compilation, explicit separation of declarative vs. procedural cognitive faculties, and strict decoupling of semantic learning data from presentation renderers.

---

## 3. Why Source-First?

In high-stakes competitive examinations (e.g., RRB ALP, SSC CGL, State Engineering and Civil Services), syllabus boundaries and authentic question patterns are authoritative. 

- **Zero Fabrication**: A student cannot afford to memorize a "plausible" historical date or practice a "hallucinated" physics formula that contradicts the official curriculum.
- **Authentic Exam Anchors**: Actual Previous Year Questions (PYQs) exhibit specific structural distractor design, trap density, and numerical tolerances that synthetic AI prompts fail to replicate.
- **Epistemic Traceability**: Every formula, definition, and practice problem must be verifiable against the primary textbook or official answer key. If a question is challenged, the system must produce the exact page, paragraph, and line offset from the source evidence pack.

---

## 4. Product Philosophy: Learning Yield > Raw Generation

Generating study artifacts is **not** the end goal. The sole objective is **durable, efficient human cognitive retention and procedural mastery**.

- **Anti-Slop Invariant**: Conversational commentary, filler text, motivational introductions, and meta-dialogue ("In this chapter, we will explore...") are strictly purged.
- **Cognitive Budgeting**: Generating 25 high-yield, deeply considered questions that span the core problem families of a chapter is vastly superior to generating 150 trivial, permutations.
- **Desirable Difficulty**: The compiler embeds deliberate cognitive effort (retrieval practice, method discrimination, trap recognition) rather than making materials artificially effortless to consume.
- **Single Cognitive Job**: Each artifact format and card archetype is assigned exactly one psychological responsibility. Mixing multiple cognitive demands into a single item is treated as an architectural defect.

---

## 5. Architectural Relationships & Boundaries

### 5.1 StudyLab Relationship [CURRENT / TARGET]
- **What StudyLab Is**: StudyLab is the procedural semantic learning subsystem within StudySourceCore. It is dedicated to domains requiring algorithmic deduction and numerical calculation (Mathematics, Physics numericals, Chemistry stoichiometry/mechanisms, and Logical reasoning).
- **How It Fits**: StudyLab is **not** a separate external orchestrator. It is a first-class branch within StudySourceCore. While declarative specialists produce factual notes and flashcards, StudyLab specialists author Problem Pattern catalogs (`ProblemPatterns.json`), authentic practice item inventories (`PracticeQuestions.json`), human-readable Question Banks (`Questions.md`), and interactive procedural packages (`StudyLab_Procedural.apkg`).

### 5.2 Anki Relationship [CURRENT]
- **Anki is a Renderer, NOT the Semantic Store**: Anki desktop and mobile apps provide a world-class spaced repetition rendering runtime. However, SQLite database tables (`collection.anki2`) and Anki note models (`1600000001`–`1600000004`) are downstream projection targets.
- **Media Decoupling**: Canonical learning content exists in the Semantic Learning IR, completely decoupled from Anki fields, HTML card templates, and SQLite schemas. If Anki were replaced tomorrow with a web-based runtime, zero learning content would be lost or modified.

### 5.3 Antigravity Relationship [CURRENT]
- **Antigravity is the Host Adapter**: Google Antigravity provides the autonomous multi-agent execution environment, terminal tooling, and subagent dispatch mechanisms (`invoke_subagent`, `run_command`, `manage_task`).
- **Clean Decoupling**: StudySourceCore's core pedagogical contracts, JSON schemas, AST validators, and packaging engines are self-contained and run portably in any Node.js environment. The Antigravity adapter simply orchestrates agent worker pools, injects context slices, and enforces concurrency bounds.

---

## 6. The 10 Immutable Principles (Product Laws)

These 10 principles are the foundational, inviolable laws of StudySourceCore. They take precedence over subagent preferences, speed optimizations, or prompt shortcuts.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                      THE 10 IMMUTABLE PRODUCT PRINCIPLES                         │
├────┬────────────────────────────────────────┬─────────────────────────────────────┤
│ #  │ Principle                              │ Inviolable Rule                     │
├────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 1  │ Source First / Zero Fabrication        │ No facts, formulas, or PYQs may be  │
│    │                                        │ generated without source text       │
├────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 2  │ Subject-Aware Pedagogical Justification│ Generation modalities must match the│
│    │                                        │ subject domain DNA (Math != History)│
├────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 3  │ Semantic Independence from Renderers   │ Typed Semantic IR is the sole truth;│
│    │                                        │ Renderers are downstream projections│
├────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 4  │ Generation != Certification            │ Producing subagents never certify;  │
│    │                                        │ Independent QA holds veto authority │
├────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 5  │ Sustainable Learning / Review Burden   │ Limit review friction; reject fixed │
│    │                                        │ 1/3/7/21/60 review schedules        │
├────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 6  │ Complete Provenance                    │ Cryptographic lineage from source   │
│    │                                        │ chunk to final rendered card        │
├────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 7  │ Fail Closed                            │ Missing prerequisites trigger       │
│    │                                        │ explicit suppression, not fallbacks │
├────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 8  │ Single Cognitive Job                   │ Exactly 1 retrieval or calculational│
│    │                                        │ task per card/item                  │
├────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 9  │ Single Writer                          │ Exactly 1 agent owns write authority│
│    │                                        │ over each deliverable file path     │
├────┼────────────────────────────────────────┼─────────────────────────────────────┤
│ 10 │ Parent Orchestrator Does Not Author    │ Parent routes and gates; forbidden  │
│    │                                        │ from authoring specialist content   │
└────┴────────────────────────────────────────┴─────────────────────────────────────┘
```

---

## 7. Supported Artifact Families & Intended Cognitive Jobs

| Artifact Family | Current File Pattern | Primary Cognitive Job | Downstream Delivery Target |
|---|---|---|---|
| **Knowledge Notes** | `Notes/<Chapter>_Notes.md` | Conceptual synthesis, hierarchical mental modeling, reference lookup | Obsidian Vault, NotebookLM |
| **Basic Flashcards** | `Basic/<Chapter>_Basic.tsv` | Atomic factual recall, term-definition retrieval | Anki Desktop (Model 1600000001) |
| **Cloze Flashcards** | `Cloze/<Chapter>_Cloze.tsv` | Contextual keyword recognition, relational propositions, formulas | Anki Desktop (Model 1600000002) |
| **Image Occlusion** | `ImageOcclusion/<Chapter>_IO_Manifest.json` | Spatial-visual memory, anatomical, circuit, and cartographic recall | Anki Desktop (Model 1600000003) |
| **MindMap** | `MindMap/<Chapter>.mindmap.json` | Non-linear relational concept topologies and cross-link exploration | Mermaid, Obsidian Canvas, Visualizers |
| **Slide Deck** | `SlideDeck/<Chapter>_SlideDeckPrompt.md` | Presentation pacing, multimodal review, NotebookLM visual walkthroughs | Marp CLI, NotebookLM Slides |
| **Question Bank View** | `Questions/<Chapter>_Questions.md` | Human-readable comprehensive problem set, worked examples, and hints | Student Review, Obsidian, Print |
| **Declarative APKG** | `<Chapter>_Anki.apkg` | Spaced retrieval of factual and visual memories | Anki Mobile & Desktop |
| **StudyLab Procedural APKG** | `StudyLab/<Chapter>_StudyLab_Procedural.apkg` | Interactive algorithmic problem solving, step verification, 3-tier hints | Anki Mobile & Desktop (StudyLab Mode) |

---

## 8. Product Scope Horizons

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                RELEASE SCOPE HORIZONS                                  │
├────────────────────────────┬────────────────────────────┬──────────────────────────────┤
│ v1.0 Core Baseline         │ v1.1 Enhancements          │ Post-v1.0 Expansions         │
│ [CURRENT / TARGET]         │ [PLANNED]                  │ [DEFERRED]                   │
├────────────────────────────┼────────────────────────────┼──────────────────────────────┤
│ • Canonical 6-Tier Pipeline│ • Unified APKG packaging   │ • Centralized SQLite semantic│
│ • Dual APKG packaging      │ • Interactive hint engine  │   database (procedural.db)   │
│ • 14 Specialist Agents     │ • Cross-chapter graph links│ • Standalone Student CLI app │
│ • 9 Subject Skills         │ • Adaptive quiz balancing  │ • Browser-based Web StudyLab │
│ • Antigravity native host  │ • Expanded visual rules    │ • Cloud sync & live telemetry│
│ • Local filesystem output  │ • Performance tuning       │ • Multi-user state management│
│ • 17 Procedural Dimensions │ • Heuristic hint checker   │ • Audio/video lecture intake │
└────────────────────────────┴────────────────────────────┴──────────────────────────────┘
```

- **[CURRENT] Existing Repository State**: Operates via Evidence Pack extraction, 14 subagent specifications, 3-wave execution, Dual APKG packaging, and physical disk verification.
- **[TARGET] v1.0 Production Target**: Formally adopts the 6-Tier Architecture, Typed Semantic Learning IR schema normalization, 4-Stage Scaffolding, Content Lineage Records (CLRs), and the 15-Point Adversarial Verification harness.
- **[PLANNED] v1.1 Target**: Introduces Unified APKG packaging (combining declarative and procedural models into a single file without breaking model isolation) and heuristic lexical hint leakage detection.
- **[DEFERRED] Post-v1.0 Scope**: Centralized relational SQLite semantic store, standalone desktop CLI application, browser-based web review runtime, and live cloud telemetry are formally deferred.

---

## 9. Explicit Non-Goals

To preserve engineering focus and prevent scope creep, StudySourceCore explicitly declares what it is **NOT**:

1. **NOT a General-Purpose Web Scraper**: The system does not crawl arbitrary web pages or synthesize random blogs. It operates strictly on verified local educational sources.
2. **NOT a Conversational Chatbot / Virtual Tutor**: StudySourceCore is a deterministic batch compiler that produces permanent, portable study assets. It is not an interactive conversational agent that debates or chats with students.
3. **NOT a Full Learning Management System (LMS)**: StudySourceCore does not host student profiles, manage classroom grades, issue certificates, or process subscription payments.
4. **NOT an OCR or Document Digitization Utility**: Raw image OCR and noisy scan cleanup belong upstream. StudySourceCore assumes the ingested source is legible text, searchable PDF, or markdown.
5. **NOT a Universal Flashcard Generator for General Knowledge**: The system is calibrated specifically for rigorous, structured academic and competitive examination syllabi (STEM, Humanities, State/National PSCs). It is not designed for trivia, language immersion, or corporate onboarding decks.
