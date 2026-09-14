# StudySourceCore — Rendering Architecture & Artifact Hygiene

> **Canonical Document**: `docs/RENDERING_PIPELINE.md`  
> **Status**: AUTHORITATIVE / FROZEN BASELINE  
> **Version**: 1.0.0-RENDERING  
> **Governance Authority**: StudySourceCore Master Governance Board  

---

## 1. The Rendering Philosophy: Projections of Semantic Truth

In StudySourceCore, **renderers are strictly one-way serializers (projections)**.

```text
[SEMANTIC LEARNING IR] ──► [PEDAGOGICAL COMPILER] ──► [RENDERER] ──► [PHYSICAL ARTIFACT]
(Canonical Truth)          (Scaffolding & Hints)      (Serializer)   (Disk File)
```

### Inviolable Invariant: Renderers Cannot Create Competing Semantic Truth
No renderer is permitted to invent new formulas, modify question parameters, or introduce facts absent from the Semantic Learning IR. If a card or section requires alteration, the edit must occur upstream in the Semantic IR or Evidence Pack, which is then recompiled through the renderers.

---

## 2. The Primary Format Renderers

### 2.1 Notes Renderer (`core-notes`)
- **Output Target**: `Study Materials/<Subject>/<Chapter>/Notes/<Chapter>_Notes.md`
- **Projection Format**: Obsidian-flavored GitHub Markdown with strict YAML frontmatter.
- **Structural Specifications**: Exactly one H1 (`# <Chapter Title>`), sequential heading hierarchy ($H1 \to H2 \to H3$, no heading level skipping), callout boxes (`> [!NOTE]`), comparison tables, and Hindi-first bilingual technical terminology.

### 2.2 Question Bank View Renderer (`render_studylab_question_bank.js`)
- **Output Target**: `Study Materials/<Subject>/<Chapter>/Questions/<Chapter>_Questions.md`
- **Projection Format**: Human-readable Markdown reading view.
- **Core Principle**: **`Questions.md` is a rendered view, NOT the canonical question store.** It formats problem prompts, worked examples, formulas, hints, and derivations for comfortable reading by students and educators. Canonical problem definitions reside strictly in the Semantic IR (`PracticeQuestions.json`).

### 2.3 Declarative TSV Renderers (`core-basic-anki`, `core-cloze-anki`)
- **Output Targets**:
  - `Basic/<Chapter>_Basic.tsv` (3 columns: `Front \t Back \t Tags`)
  - `Cloze/<Chapter>_Cloze.tsv` (3 columns: `Text \t Extra \t Tags`)
- **Escaping Protocol**: Inner tabs and raw newlines are strictly escaped (`\n` and `\t` literals). Tag columns contain comma-separated topic metadata.

### 2.4 Image Occlusion Manifest Renderer (`core-image-occlusion`)
- **Output Target**: `ImageOcclusion/<Chapter>_IO_Manifest.json`
- **Projection Format**: Draft-07 JSON manifest recording the base image file path, SHA-256 hash, and an array of normalized $[x, y, w, h]$ bounding boxes ($0.0 \le \text{coord} \le 100.0$) with Hindi-first label text.

### 2.5 MindMap Concept Tree Renderer (`core-mindmap`)
- **Output Target**: `MindMap/<Chapter>.mindmap.json`
- **Projection Format**: Hierarchical nested JSON concept tree with depth $\ge 2$ and cross-branch semantic relationship links, accompanied by an inlined Mermaid mindmap diagram.

### 2.6 Presentation Deck Renderer (`core-slide-deck`)
- **Output Target**: `SlideDeck/<Chapter>_SlideDeckPrompt.md`
- **Projection Format**: Marp Markdown presentation slides adhering strictly to a **5–15 slide budget**, pacing directives, visual prompts for NotebookLM, and zero conversational filler.

### 2.7 Declarative & Procedural APKG Compilers (`export_*.js`)
- **Output Targets**:
  - `<Chapter>_Anki.apkg` (Declarative models: Basic `1600000001`, Cloze `1600000002`, IO `1600000003`)
  - `StudyLab/<Chapter>_StudyLab_Procedural.apkg` (Model `1600000004`)
- **Projection Format**: Standard ZIP archives containing SQLite `collection.anki2` database tables and media payloads.

---

## 3. Artifact Hygiene: Permanent Artifacts vs. Build Intermediates

StudySourceCore enforces strict separation between durable learning deliverables and transient build intermediates:

```
Study Materials/<Subject>/<Chapter>/
├── Notes/                                 <-- PERMANENT: Conceptual Knowledge Notes
│   └── <Chapter>_Notes.md
├── Questions/                             <-- PERMANENT: Question Bank View
│   └── <Chapter>_Questions.md
├── StudyLab/                              <-- PERMANENT: Procedural APKG Package
│   ├── <Chapter>_StudyLab_Procedural.apkg
│   └── <Chapter>_StudyLab_Procedural.manifest.json
├── <Chapter>_Anki.apkg                    <-- PERMANENT: Declarative APKG Package
└── .build/                                <-- TRANSIENT BUILD INTERMEDIATES (Archived)
    ├── artifact-manifest.json
    ├── basic_cards.tsv
    └── cloze_cards.tsv
```

### Hygiene Protocol & Invariants:
1. **Clean Packaging Cleanup**: Upon successful Wave 2 compilation and independent verification of `<Chapter>_Anki.apkg`, intermediate TSVs are archived into `.build/` or cleaned to prevent cluttering the student's study folder.
2. **Failure Preservation Invariant**: If packaging or validation fails, intermediate TSVs and JSON manifests are **strictly preserved** on disk to allow debugging and manual recovery.
3. **Protected Files Invariant**: The cleanup engine is programmatically forbidden from modifying or deleting permanent files (`Notes/*.md`, `Questions/*.md`, `MindMap/*.json`, `SlideDeck/*.md`).
