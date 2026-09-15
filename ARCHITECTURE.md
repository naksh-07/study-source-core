# StudySourceCore — System Architecture & Technical Specification

> **Canonical Document**: `ARCHITECTURE.md`  
> **Status**: AUTHORITATIVE / FROZEN BASELINE  
> **Version**: 1.0.0-ARCH  
> **Governance Authority**: StudySourceCore Master Governance Board  

---

## 1. The Canonical 6-Tier Architecture

StudySourceCore enforces a strictly decoupled, unidirectional six-tier execution pipeline. In this architecture, conceptual learning representations are isolated from presentation renderers, and artifact generation is strictly separated from independent certification.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 1. AUTHORIZED SOURCE                                   │
│            Authoritative Textbook PDF, Syllabus Markdown, or Authentic PYQ Paper       │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ [Parent Ingestion — Single Read]
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   2. EVIDENCE PACK                                     │
│                  scratch/evidence-pack.md + SHA-256 Cryptographic Hash                 │
│         Exhaustive, unsummarized factual, mathematical, and diagrammatic evidence      │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ [Semantic IR Formulation]
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              3. SEMANTIC LEARNING IR                                   │
│           Authoritative, Medium-Neutral Typed Learning Representation [TARGET]         │
│   • Conceptual KUs (Taxonomies, Glossaries, Formulas, Proposition Dependencies)        │
│   • Declarative Units (Atomic QA Pairs, Cloze Contexts, Bounding Boxes)                │
│   • Procedural Units (Problem Families, Solution DAGs, 17 Dimensions, Parameter Domains│
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ [Pedagogical Compilation]
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               4. PEDAGOGICAL COMPILER                                  │
│                 Instructional Scaffolding & Cognitive Load Management [TARGET]         │
│   • 4-Stage Scaffolding (Worked Example → Faded Completion → Independent → Transfer)   │
│   • 3-Tier Non-Leaking Hints (Conceptual Approach → Method/Formula → Setup Scaffold)   │
│   • Distractor Synthesis (Plausible, Trap-Driven MCQ Options with >= 4 Choices)        │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ [Renderer Projection Dispatch]
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                     5. RENDERERS                                       │
│              Format Projections Only — Never a Secondary Source of Truth [CURRENT]     │
│  ├── Notes Renderer (Obsidian Markdown + Frontmatter)                                  │
│  ├── Question Bank View Renderer (Questions/<Chapter>_Questions.md)                    │
│  ├── Declarative TSV Renderer (Basic & Cloze TSVs)                                     │
│  ├── Visual Manifest Renderer (Image Occlusion JSON + SVG Masks)                       │
│  ├── Concept Tree Renderer (MindMap JSON & Mermaid Diagrams)                           │
│  ├── Presentation Renderer (Marp Markdown Slide Decks)                                 │
│  ├── Declarative APKG Compiler (export_anki.js: Models 1600000001–1600000003)          │
│  └── Procedural APKG Compiler (export_studylab_procedural_anki.js: Model 1600000004)   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ [Physical Verification Barrier]
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             6. INDEPENDENT CERTIFICATION                               │
│         Release Gatekeepers — Full Veto Authority Across All Artifacts [CURRENT/TARGET]│
│  ├── Physical 4-Point Gating (Disk existence, non-zero bytes, ownership, schema)       │
│  ├── Deep Binary SQLite Inspection (Table schema, note counts, card model validation)  │
│  ├── 15-Point Adversarial Attack Harness (ADV-01 to ADV-15: DAGs, Hint Leaks, Options) │
│  ├── Cross-Artifact Semantic QA (bm-qa: Zero cross-file factual or numerical drift)    │
│  └── Content Lineage Record (CLR) Verification (End-to-end source chunk traceability)  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Exhaustive Layer-by-Layer Architectural Specifications

### 2.1 Tier 1: Authorized Source [CURRENT]
- **What Counts as Source Material**: Standard textbook chapters (NCERT, State Boards), authoritative exam board syllabus guides, authentic Previous Year Question (PYQ) test papers with official answer keys, or vetted teacher lecture notes.
- **Storage Location**: Canonical source directory `Sources/<Subject>/...`.
- **Single-Read Invariant**: The parent orchestrator ingests the raw source file exactly once. Subagent specialists are **strictly prohibited** from independently accessing or re-parsing raw PDF/source files. This eliminates divergent OCR parsing errors, chunking inconsistencies, and token waste.

### 2.2 Tier 2: Evidence Pack (`scratch/evidence-pack.md`) [CURRENT]
- **Role**: The single, authoritative factual grounding layer for all downstream tasks.
- **Structure**: Contains raw extracted definitions, verbatim formulas, authentic question texts, options, answer keys, coordinate profiles, and data tables.
- **Source Coordinates**: Every extracted evidence segment records source coordinates: chapter title, page numbers, exercise/section headers, and paragraph offsets.
- **Evidence Integrity**: Accompanied by `scratch/provenance.json` recording the cryptographic SHA-256 hashes of both the raw source file and the generated evidence pack.
- **Why Specialists Must Not Reinterpret the Raw Source**: If six different subagents parse a PDF independently, subtle discrepancies emerge (e.g., one reads $\mu = 0.4$ while another reads $\mu = 0.14$; one truncates historical dates). Ingesting once into the Evidence Pack guarantees absolute cross-artifact factual coherence.

### 2.3 Tier 3: Semantic Learning IR (Intermediate Representation) [TARGET — Phase 1]
- **Why It Exists**: To provide an authoritative, medium-neutral, typed representation of learning content.
- **Why Markdown is Insufficient as Canonical Semantic Storage**:
  1. *Lack of Formal Typing*: Markdown text cannot enforce numerical ranges, coprime constraints, or required schema fields at compile time.
  2. *Brittle Parsing*: Extracting structured data from markdown via regex or AST walking breaks easily when formatting, linebreaks, or bolding change.
  3. *Coupling to Presentation*: Markdown inherently mixes content semantics with visual styling (headings, callouts, tables).
  4. *Relational Blindness*: Complex mathematical solution DAGs, 3-tier hints, and prerequisite dependency graphs cannot be cleanly validated or traversed in flat text files.
- **Core Entities in Semantic IR**:
  - **Conceptual Knowledge Units (KUs)**: Discrete conceptual propositions, hierarchical taxonomies, bilingual terminology mappings, and dependency prerequisites.
  - **Declarative Recall Units**: Atomic question-answer propositions, contextual cloze deletions (`{{c1::...}}`), and diagram bounding boxes.
  - **Procedural Units**: The 17 normalized procedural dimensions (problem family, deep structure, recognition signals, governing algorithms, decision rules, common traps, verification formulas, parameter domains, solution DAGs, 3-tier hints).
  - **Pedagogical Metadata**: Difficulty dimensions (conceptual, computational, trap density), target solving latency, cognitive load estimates.
- **Renderer Independence**: The Semantic IR is 100% agnostic to target delivery formats. It knows nothing of Anki model IDs, TSV columns, Marp slide directives, or HTML tags.

### 2.4 Tier 4: Pedagogical Compiler [TARGET — Phase 4]
- **Role**: Transforms static IR structures into pedagogically active, sequenced instruction.
- **Cognitive Scaffolding Engine**: Implements the 4-Stage Procedural Progression:
  1. *Stage 1: Worked Example* (Schema acquisition; full expert model).
  2. *Stage 2: Faded Completion* (Guided practice; backward fading of final steps).
  3. *Stage 3: Independent Practice* (Autonomous problem solving; full retrieval).
  4. *Stage 4: Transfer* (Far practice; novel surface parameters and boundary conditions).
- **3-Tier Hint Synthesis**: Enforces the progressive hint ladder:
  - *Tier 1 (Conceptual Approach)*: Activates the governing schema without revealing formulas.
  - *Tier 2 (Governing Method)*: Provides the formula and variable definitions without numbers.
  - *Inviolable Rule*: Under no circumstances may any hint tier (Tier 1, Tier 2, or Tier 3) leak the final terminal answer or select the correct option key. Tier 3 provides structural setup or intermediate steps, but terminal answer immunity is strictly preserved.
- **Error-Driven Distractor Construction**: For MCQs, synthesizes plausible, trap-driven distractors based on the `common_traps` and `error_categories` dimensions. Enforces the inviolable MCQ invariant: **Minimum 4 options**.
- **Semantic Deduplication**: Prevents identical concepts or formulas from being redundantly atomized across sibling tracks.

### 2.5 Tier 5: Renderers (Format Projections) [CURRENT]
- **Role**: Format-specific serializers that project compiled pedagogical structures into physical files. Renderers are **write-only views** and possess zero semantic authority:
  - **Notes Renderer**: Emits Obsidian-flavored Markdown with YAML frontmatter, callouts, and bilingual terms (`Notes/<Chapter>_Notes.md`).
  - **Basic TSV Renderer**: Serializes atomic QA pairs into strict 3-column TSVs (`Basic/<Chapter>_Basic.tsv`).
  - **Cloze TSV Renderer**: Serializes contextual cloze statements into strict 3-column TSVs (`Cloze/<Chapter>_Cloze.tsv`).
  - **Image Occlusion Manifest Renderer**: Emits normalized SVG bounding boxes and target manifests (`ImageOcclusion/<Chapter>_IO_Manifest.json`).
  - **Question Bank View Renderer**: Serializes problem inventories, solution graphs, and worked examples into human-readable Markdown (`Questions/<Chapter>_Questions.md`). **`Questions.md` is a rendered view, NOT the canonical store.**
  - **Concept Tree Renderer**: Emits hierarchical JSON concept trees and Mermaid diagrams (`MindMap/<Chapter>.mindmap.json`).
  - **Presentation Deck Renderer**: Emits Marp Markdown slide decks across a 5–15 slide budget (`SlideDeck/<Chapter>_SlideDeckPrompt.md`).
  - **Declarative APKG Compiler**: `export_anki.js` packages Basic, Cloze, and IO notes into `<Chapter>_Anki.apkg` (Models 1600000001–1600000003).
  - **Procedural APKG Compiler**: `export_studylab_procedural_anki.js` packages Procedural Card Anchors into `StudyLab/<Chapter>_StudyLab_Procedural.apkg` (Model 1600000004).
  - **Future UI / CLI Runtimes [DEFERRED]**: Web-based StudyLab runtimes and desktop CLI study shells will consume the Semantic IR as additional projections.
- **Inviolable Invariant**: No renderer may create, alter, or compete with semantic truth.

### 2.6 Tier 6: Independent Certification [CURRENT / TARGET]
- **Core Law**: **Generation != Certification**. The authoring agent or compilation script cannot certify its own output.
- **Certification Layers**:
  1. *Physical 4-Point Completion Gate*: Asserts file existence, non-zero byte size, single-writer ownership, and AJV schema validation.
  2. *Deep SQLite Binary Inspection*: Unpacks compiled `.apkg` files, parses `col` and `notes` tables, verifies model IDs, and checks that MCQ cards physically contain $\ge 4$ options.
  3. *15-Point Adversarial Attack Harness (ADV-01 to ADV-15)*: Validates solution DAG acyclicity, detects hint answer leaks, tests distractor entropy, and verifies parameter domains.
  4. *Cross-Artifact Semantic QA (`bm-qa`)*: Cross-checks formulas, numbers, and dates across sibling files to ensure zero drift.
  5. *Content Lineage Record (CLR) Audit [TARGET — Phase 2]*: Verifies that 100% of generated items trace back to verified source chunks.
- **Veto Authority**: Any certification failure triggers an immediate build halt or isolated lane rejection; invalid artifacts are never released.

### 2.7 The Antigravity Adapter [CURRENT]
- **Role**: Connects StudySourceCore's core architecture to Google Antigravity's multi-agent execution environment.
- **Subagent Lifecycle**: Translates orchestrator task graph nodes into `invoke_subagent` calls, handles background task notifications, and collects 11-field handoff reports.
- **Hard Resource Caps**: Enforces local operational constraints:
  - **Maximum 4 concurrent worker subagents** (prevents rate limits and memory thrashing).
  - **Maximum 10 total mission launches** (bounds execution cost and prevents runaways).
  - **Deterministic workforce collapse**: Workers terminate immediately upon task handoff.
- **Decoupling**: Antigravity is strictly the host environment. The underlying schemas, AST validators, compilers, and SQLite packagers remain completely portable.

---

## 3. Contract Ownership Matrix

Every system capability, data structure, and file deliverable has exactly one authoritative owner:

| System Layer / Deliverable | Authoritative Spec / Contract | Primary Owner Agent / Script | Release Validator |
|---|---|---|---|
| **Product Principles & Scope** | [`PRODUCT.md`](./PRODUCT.md) | Governance Board | Independent Audit |
| **System Architecture** | [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Systems Architect | Fresh-Agent Simulation |
| **Pedagogical Principles** | [`docs/LEARNING_PRINCIPLES.md`](./docs/LEARNING_PRINCIPLES.md) | Pedagogy Architect | `bm-qa` |
| **Architectural Decisions** | [`.agents/DECISIONS.md`](.agents/DECISIONS.md) | Systems Architect | ADR-01..17 Invariants |
| **Artifact Registry** | `.agents/skills/study-source-core/resources/artifact-registry.json` | Orchestrator Engine | `test_artifact_registry.js` |
| **Subject Policies** | `resources/subject-skill-manifest.json` & `docs/SUBJECT_POLICIES.md` | Subject Skills | `subject_policy_resolver.js` |
| **Evidence Pack** | `resources/source-policy.md` | Parent Orchestrator | Lineage Audit (`artifact_provenance.js`) |
| **Knowledge Notes** | `resources/note-architecture.md` | `core-notes` | `note_contract_audit.js` |
| **Basic Flashcards** | `resources/anki-core-rules.md` | `core-basic-anki` | `validate_tsv.js` |
| **Cloze Flashcards** | `resources/anki-core-rules.md` | `core-cloze-anki` | `validate_tsv.js` |
| **Image Occlusion** | `resources/image-occlusion-contract.md` & `docs/VISUAL_LEARNING.md` | `core-image-occlusion` | `validate_image_occlusion.js` |
| **MindMap Concept Tree** | `resources/map-schema.md` | `core-mindmap` | `validate_map.js` |
| **Slide Deck Presentation** | `resources/slide-deck-core-rules.md` | `core-slide-deck` | `slide_deck_prompt_audit.js` |
| **StudyLab Practice Items** | `resources/studylab-practice-questions-schema.json` | Domain Specialist | `validate_studylab_practice_questions.js` |
| **StudyLab Procedural Patterns** | `resources/studylab-procedural-schema.json` & `docs/STUDYLAB_SPECIFICATION.md` | Domain Specialist | `validate_studylab_procedural.js` |
| **Question Bank View** | `resources/studylab-question-bank-contract.md` | Domain Specialist | `validate_studylab_question_bank.js` |
| **Declarative APKG** | `resources/anki-core-rules.md` & `docs/ANKI_INTEGRATION.md` | `export_anki.js` | `validate_apkg.js` |
| **StudyLab Procedural APKG** | `resources/studylab-procedural-contract.md` | `export_studylab_procedural_anki.js` | `validate_studylab_procedural_apkg.js` |
| **Knowledge Graph Linking** | `resources/note-architecture.md` | `bm-graph` | `link_audit.js` |
| **Cross-Artifact Consistency** | `resources/validation-rules.md` & `docs/VALIDATION_AND_CERTIFICATION.md` | `bm-qa` | `cross_artifact_checker.js` |
| **Adversarial Verification** | `resources/studylab/validation-protocol.md` | `adversarial-apkg-reviewer` | 15-Point Harness (ADV-01..15) |

---

## 4. Orchestration Invariants & Execution Waves [CURRENT]

The execution lifecycle executes across three synchronized waves governed by deterministic dependency barriers:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                     WAVE 1: PARALLEL SPECIALIST GENERATION                             │
│  Max 4 Concurrent Workers | Parent Self-Execution Prohibited | Single-Writer Enforced   │
│                                                                                        │
│  [core-notes]        [core-basic]       [core-cloze]         [core-image-occlusion]    │
│  Notes/*.md          Basic/*.tsv        Cloze/*.tsv          ImageOcclusion/*.json     │
│                                                                                        │
│  [core-mindmap]      [core-slide-deck]  [$DOMAIN_SPECIALIST]                           │
│  MindMap/*.json      SlideDeck/*.md     Optional/*_PracticeQuestions.json              │
│                                         Optional/*_ProblemPatterns.json                │
│                                         Questions/*_Questions.md                      │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼ [DEPENDENCY BARRIER 1: All Wave 1 Tasks Done]
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                     WAVE 2: SEQUENTIAL BINARY PACKAGING                                │
│  Single-Threaded SQLite Safety | Byte Verification | Intermediates Preserved/Archived   │
│                                                                                        │
│  ├── export_anki.js ─────────────► <Chapter>_Anki.apkg (Models 1600000001–1600000003)  │
│  └── export_studylab_anki ──────► StudyLab/<Chapter>_StudyLab_Procedural.apkg (1600000004)│
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼ [DEPENDENCY BARRIER 2: APKGs on Disk]
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                     WAVE 3: POST-PACKAGING QA & ADVERSARIAL AUDIT                      │
│  Independent Release Gatekeepers | Release Veto Authority | Lineage Reconciliation    │
│                                                                                        │
│  ├── bm-graph ───────────────────► Graph/<Chapter>_Graph_Index.json                    │
│  ├── bm-qa ──────────────────────► Audit/QA_Report.md                                  │
│  └── adversarial-apkg-reviewer ──► Audit/Adversarial_APKG_Audit.md                     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 The Single-Writer Rule
Every deliverable path is assigned to exactly one agent in `artifact-registry.json`. The orchestrator constructs a pre-dispatch `singleWriterMap`. Any duplicate target destination raises an immediate `SINGLE_WRITER_VIOLATION` exception before subagents are launched.

### 4.2 Parent Self-Execution Ban
The parent orchestrator (`study-source-core`) owns control-plane coordination, ingestion, routing, gating, and compiler dispatch. Any attempt by the parent to author specialist study files raises an immediate runtime exception: `PARENT_SELF_EXECUTION_VIOLATION`.

### 4.3 1-Retry Targeted Error Correction & Blast Radius Isolation
If a specialist subagent generates an invalid output:
1. The orchestrator captures exact AJV schema diagnostics (failing field, path, error description).
2. The failing specialist is reinvoked exactly once with the error log for a targeted correction attempt.
3. If Attempt 2 fails, the failing lane is isolated. Valid sibling artifacts are preserved and proceed to Wave 2 packaging. A Truthful Failure Report is emitted, and the overall mission verdict reflects `PARTIAL_SUCCESS` or `FAILED`.

### 4.4 Physical 4-Point Completion Gating
A task is never marked `COMPLETE` based on conversational subagent text. Completion requires four physical disk assertions:
1. `existsSync(target_path) === true`
2. `statSync(target_path).size > 0` bytes
3. `singleWriterMap[target_path] === executing_agent`
4. Schema validator passes with zero errors and zero unhandled exceptions.

---

## 5. Storage Layer & Scope Invariants

1. **Dual APKG Architecture for v1.0 [CURRENT]**:
   - `<Chapter>_Anki.apkg`: Bundles Basic (1600000001), Cloze (1600000002), and Image Occlusion (1600000003) notes.
   - `StudyLab/<Chapter>_StudyLab_Procedural.apkg`: Bundles Procedural Card Anchors (Model 1600000004) with embedded solution DAGs and 3-tier hints.
   - Model isolation is absolute. Model 1600000004 cards are strictly forbidden from declarative packages.
   - A Unified APKG consolidating both models without breaking isolation is an explicit **v1.1 milestone target** [PLANNED].

2. **Semantic Store Scope [TARGET vs DEFERRED]**:
   - In **v1.0**, the Semantic Learning IR is persisted via structured JSON artifacts (`scratch/`, `Optional/`) and verified in memory.
   - Centralized relational SQLite storage (`procedural.db`) as an authoritative persistent semantic database is explicitly **DEFERRED** to post-v1.0.

3. **Runtime UI & CLI Scope [DEFERRED]**:
   - Interactive desktop terminal CLI shells, web review runtimes, and mobile cloud sync belong to **post-v1.0** ecosystem expansion.
   - v1.0 focuses exclusively on generating self-contained, portable Anki packages and Obsidian-compatible Markdown vaults.
