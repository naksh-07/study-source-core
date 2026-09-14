# StudySourceCore — Autonomous Study Asset Orchestration Engine

> **Canonical Architecture**: [`ARCHITECTURE.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/ARCHITECTURE.md)  
> **Product Charter**: [`PRODUCT.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/PRODUCT.md)  
> **Implementation Roadmap**: [`ROADMAP.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/ROADMAP.md)  
> **Learning Principles**: [`docs/LEARNING_PRINCIPLES.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/LEARNING_PRINCIPLES.md)  
> **Version**: v1.0 Production Baseline  
> **Status**: Active / Production Baseline  
> **Architecture**: 14-Agent Multi-Agent System with 6-Tier Pipeline & 3-Wave Execution

---

## What is this?

**StudySourceCore** is a production-grade, deterministic multi-agent orchestration engine that ingests authorized study sources (PDFs, textbook chapters, exam papers) and synthesizes a complete ecosystem of high-yield study deliverables in parallel — automatically.

It operates on the canonical six-tier architecture:
`AUTHORIZED SOURCE → EVIDENCE PACK → SEMANTIC LEARNING IR → PEDAGOGICAL COMPILER → RENDERERS → INDEPENDENT CERTIFICATION`.

One source in → seven parallel artifacts out.

```
Raw Source (PDF / Markdown)
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│  Parent Orchestrator — Evidence Extraction + Routing Engine  │
│  Produces: scratch/evidence-pack.md  (SHA-256 locked)        │
└────────────────────────┬─────────────────────────────────────┘
                         │
        ┌────────────────┴─────────────────┐
        ▼                                 ▼
STANDARD TRACK                    STUDYLAB TRACK
(Parallel Wave 1)                 (Parallel Wave 1)
  core-notes                        math-apkg-author
  core-basic-anki                   reasoning-apkg-author
  core-cloze-anki                   physics-numerical-apkg-author
  core-image-occlusion              chemistry-numerical-apkg-author
  core-mindmap
  core-slide-deck
        │                                 │
        └──────────────┬──────────────────┘
                       ▼
          WAVE 2: Sequential Packaging
          export_anki.js + export_studylab_procedural_anki.js
                       │
                       ▼
          WAVE 3: QA & Physical Audit
          bm-qa · bm-graph · adversarial-apkg-reviewer
                       │
                       ▼
         ✅ Verified Sibling Deliverables
```

---

## Deliverables Generated (per chapter)

| Track | Output | Format |
|---|---|---|
| Notes | `Notes/<Chapter>_Notes.md` | Obsidian Markdown + YAML frontmatter |
| Basic Flashcards | `Basic/<Chapter>_Basic.tsv` | 3-column TSV → Anki import |
| Cloze Flashcards | `Cloze/<Chapter>_Cloze.tsv` | Cloze `{{c1::}}` TSV → Anki import |
| Image Occlusion | `ImageOcclusion/<Chapter>_IO.json` | SVG bounding-box manifest |
| MindMap | `MindMap/<Chapter>_MindMap.md` | Mermaid + JSON concept tree |
| Slide Deck | `SlideDeck/<Chapter>_SlideDeck.md` | Marp presentation |
| StudyLab APKG | `StudyLab/<Chapter>_StudyLab_Procedural.apkg` | Anki `.apkg` binary (Level 1–7 hints) |

---

## Repository Structure

```
.agents/
├── README.md                       ← You are here
├── AGENTS.md                       ← Master Agent Registry (14 agents, 14-section spec)
├── OWNERSHIP.md                    ← Single Responsibility Matrix
├── DATA_FLOW.md                    ← End-to-End Pipeline & Message Schemas
├── EXECUTION_LIFECYCLE.md          ← 3-Wave Protocol, Concurrency Caps, Timeouts
├── FREEZE_MAP.md                   ← 5-Tier Component Governance
├── DECISIONS.md                    ← Architectural Decision Records (ADR-01–ADR-17)
├── TROUBLESHOOTING.md              ← Diagnostic Trees for 8 Failure Classes
├── SKILLS.md                       ← Skills Registry
├── RESOURCES.md                    ← Schemas & Contracts Index
├── SCRIPTS.md                      ← Executable Scripts Registry
│
├── agents/                         ← 14 Canonical Agent Specifications
│   ├── core-notes.md
│   ├── core-basic-anki.md
│   ├── core-cloze-anki.md
│   ├── core-image-occlusion.md
│   ├── core-mindmap.md
│   ├── core-slide-deck.md
│   ├── bm-graph.md
│   ├── bm-qa.md
│   ├── math-apkg-author.md
│   ├── reasoning-apkg-author.md
│   ├── physics-numerical-apkg-author.md
│   ├── chemistry-numerical-apkg-author.md
│   ├── mold-gap-auditor.md
│   └── adversarial-apkg-reviewer.md
│
└── skills/
    └── study-source-core/
        ├── SKILL.md                ← Master orchestration skill instructions
        ├── package.json
        ├── resources/              ← Schemas, contracts, rulebooks
        │   ├── schemas/            ← AJV Draft-07 JSON schemas (12 files)
        │   ├── studylab/           ← StudyLab contracts & validation protocols (7 files)
        │   ├── anki-core-rules.md
        │   ├── note-architecture.md
        │   ├── workflow.md         ← Full 11-phase workflow specification
        │   ├── validation-rules.md
        │   └── ...26 resource files total
        ├── scripts/                ← JS/Python CLI executables (60+ files)
        │   ├── routing_engine.js
        │   ├── export_anki.js
        │   ├── export_studylab_procedural_anki.js
        │   ├── validate_apkg.js
        │   ├── test_contracts.js
        │   └── ...
        └── subject-skills/         ← 9 Subject Domain Skills
            ├── Biology/SKILL.md
            ├── Chemistry/SKILL.md
            ├── Geography/SKILL.md
            ├── History/SKILL.md
            ├── Map/SKILL.md
            ├── Math/SKILL.md
            ├── Physics/SKILL.md
            ├── Political Science/SKILL.md
            └── Reasoning/SKILL.md
```

---

## The 14 Agents

StudySourceCore coordinates **14 specialized, single-responsibility subagents** across 3 operational classes.

### Generic Content Specialists (Wave 1)

| Agent | Deliverable | Suppression Code |
|---|---|---|
| `core-notes` | Obsidian Markdown notes with YAML frontmatter | — |
| `core-basic-anki` | Atomic Q&A flashcards (TSV) | `ZERO_BASIC_CANDIDATES` |
| `core-cloze-anki` | Cloze deletion flashcards (TSV) | `ZERO_CLOZE_CANDIDATES` |
| `core-image-occlusion` | SVG bounding-box IO manifest | `NO_IO_CANDIDATES` |
| `core-mindmap` | Mermaid mindmap + JSON tree | `NO_RELATIONAL_TOPOLOGY` |
| `core-slide-deck` | Marp presentation deck | `DECK_WORTHINESS_BELOW_THRESHOLD` |

### StudyLab Procedural Specialists (Wave 1)

| Agent | Domain | Suppression Code |
|---|---|---|
| `math-apkg-author` | 59 Math topics — coprime constraints, Solution DAGs, 3-tier hints | `ZERO_MATH_CANDIDATES` |
| `reasoning-apkg-author` | 30 Reasoning topics — syllogisms, seating, matrix puzzles | `ZERO_REASONING_CANDIDATES` |
| `physics-numerical-apkg-author` | 40 Physics topics — calculational only, 6-stage pipeline | `DESCRIPTIVE_ONLY_NO_NUMERICALS` |
| `chemistry-numerical-apkg-author` | Chemistry — stoichiometry, ICE tables, mechanisms | `DESCRIPTIVE_ROTE_NO_CALCULATIONS` |

### Downstream QA & Audit (Wave 3)

| Agent | Role |
|---|---|
| `bm-graph` | Vault knowledge graph — Obsidian cross-note Wikilinks |
| `bm-qa` | Cross-artifact factual consistency audit |
| `mold-gap-auditor` | Contract registry audit (REUSE / EXTEND / CREATE) |
| `adversarial-apkg-reviewer` | 15-point attack harness — DAG topology, hint leaks, MCQ invariants |

---

## Core Architectural Invariants

1. **Single Source of Truth** — All generation derives from one SHA-256-locked `evidence-pack.md`. No subagent re-parses raw PDFs.
2. **Single-Writer Rule** — Exactly one agent owns each deliverable. No shared writes.
3. **Parent Self-Execution Ban** — The orchestrator coordinates & gates, never authors specialist content.
4. **Deterministic Gating** — Every suppressed track emits an explicit auditable reason code. Zero silent omissions.
5. **MCQ Hard Invariant** — Every MCQ has ≥ 4 distinct options with exactly 1 correct answer, physically persisted in SQLite.
6. **Hindi-first Language Contract** — Explanatory prose is Hindi-first; technical/domain terms appear in English in parentheses.
7. **Hard Resource Limits** — Max 4 concurrent subagents; max 10 total launches per mission.
8. **Physical Completion Gates** — Artifacts must exist on disk with `size > 0`, pass AJV schema validation, and SQLite integrity checks.

---

## Quickstart

```bash
# Install dependencies (from skills/study-source-core/)
cd skills/study-source-core
npm install

# Run full contract validation suite (111 contracts)
node scripts/test_contracts.js

# Run adversarial auditor against compiled APKGs
node scripts/test_adversarial_auditor.js

# Test Level 1-7 procedural proof suite
node scripts/test_l1_l7_proof_suite.js

# Validate routing engine against an evidence pack (dry run)
node scripts/routing_engine.js --evidence scratch/evidence-pack.md --dry-run

# Run all automated tests
npm test
```

---

## Key Design Decisions

See [`DECISIONS.md`](./DECISIONS.md) for the full Architectural Decision Record log (ADR-01 to ADR-10).

| ADR | Decision |
|---|---|
| ADR-01 | SHA-256 Evidence Lineage — single immutable evidence pack |
| ADR-02 | Single-Writer Rule & Parent Self-Execution Ban |
| ADR-03 | 3-Wave Pipeline with hard concurrency caps (≤ 4) |
| ADR-04 | Deterministic gating with auditable suppression codes |
| ADR-05 | Hard layer isolation — SQLite / APKG / frontend runtimes |
| ADR-06 | Native Level 1-7 StudyLab first-class integration |
| ADR-07 | Source-first practice hierarchy (`authentic_pyq ≻ curated ≻ synthetic`) |
| ADR-08 | MCQ Hard Invariant (≥ 4 options, 1 correct, SQLite-persisted) |
| ADR-09 | 1-retry targeted correction with blast-radius isolation |
| ADR-10 | Physical completion gating + Hindi-first dual-language contract |

---

## Operational Documents

| Document | Purpose |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | Master registry of all 14 agents (14-section standard spec) |
| [`OWNERSHIP.md`](./OWNERSHIP.md) | Single Responsibility Matrix — who writes what |
| [`DATA_FLOW.md`](./DATA_FLOW.md) | End-to-end 6-stage transformation pipeline & message schemas |
| [`EXECUTION_LIFECYCLE.md`](./EXECUTION_LIFECYCLE.md) | 3-Wave protocol, concurrency rules, timeout budgets |
| [`FREEZE_MAP.md`](./FREEZE_MAP.md) | 5-Tier governance — what is FROZEN vs MUTABLE |
| [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) | Diagnostic trees for 8 failure classes |
| [`SCRIPTS.md`](./SCRIPTS.md) | CLI script reference with exit codes & usage |
| [`RESOURCES.md`](./RESOURCES.md) | 38 JSON schemas and rulebooks index |
| [`skills/study-source-core/resources/workflow.md`](./skills/study-source-core/resources/workflow.md) | Full 11-phase workflow specification |

---

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Schema Validation**: AJV v8 (Draft-07 JSON Schema)
- **APKG Compilation**: `jszip` + `sql.js` (SQLite in-process)
- **MCP Server**: `@modelcontextprotocol/sdk` — exposes `export_anki_package`, `export_studylab_procedural_package`, `validate_artifact`, `resolve_subject_policy`
- **AI Platform**: Google Antigravity (AGY) with Gemini models
- **Presentation**: Marp (Markdown to slides)
- **Vault**: Obsidian (PKM with Wikilinks)

---

## License

Private academic research tool. Not for public redistribution.

---

*Built with Google Antigravity — an autonomous agentic AI coding assistant.*
