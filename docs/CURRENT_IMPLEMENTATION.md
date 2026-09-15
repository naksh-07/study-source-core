# Current Implementation Baseline (`docs/CURRENT_IMPLEMENTATION.md`)

## 1. Overview & Baseline State

This document provides a factual, transparent baseline assessment of the StudySourceCore repository as of **Phase 0 completion**.

It details the code, scripts, schemas, subagent definitions, and tests that are actively implemented and functional today, clearly separated from future target milestones.

### Baseline Health Summary
- **Core Test Suite**: **18 of 18 tests passing (100% pass rate)** via `npm test`.
- **Primary Runtime Engine**: Node.js v18+ (ES modules and CommonJS interop).
- **Core Dependencies**: `ajv` (JSON Schema validation), `jszip` (zip packaging), `sql.js` (pure WebAssembly/JS SQLite engine), `@modelcontextprotocol/sdk` (MCP server integration).
- **Active Packaging Standard**: **Dual APKG (v1.0)** emitting `<Chapter>_Anki.apkg` (Models 1600000001–1600000003) and `StudyLab/<Chapter>_StudyLab_Procedural.apkg` (Model 1600000004).
- **Known Deficiencies**: Cataloged in [`docs/GAP_REGISTER.md`](./GAP_REGISTER.md).

---

## 2. Directory Layout & Repository Inventory

```
AI Notes/
├── ARCHITECTURE.md                  # Tier 0: 6-Tier Architecture & System Invariants
├── PRODUCT.md                       # Tier 0: Product Identity, Principles & Non-Goals
├── ROADMAP.md                       # Tier 0: 11 Implementation Phases (Phases 0–10)
├── README.md                        # Master repository overview and quick start
├── CONTRIBUTING.md                  # Developer guidelines and contribution protocol
│
├── docs/                            # Tier 1 Canonical Specifications & Tier 3 Archives
│   ├── LEARNING_PRINCIPLES.md       # Cognitive load, 4-stage progression, 17 dimensions
│   ├── SUBJECT_POLICIES.md          # 9-subject policy matrix & suppression codes
│   ├── STUDYLAB_SPECIFICATION.md    # StudyLab procedural IR, 3-tier hints, DAGs
│   ├── KNOWLEDGE_UNITS.md           # Knowledge Units (KU), deduplication, reservations
│   ├── VISUAL_LEARNING.md           # 9-stage visual pipeline, IO coordinate constraints
│   ├── PROVENANCE_AND_LINEAGE.md    # 4-tier provenance hierarchy & CLR schema
│   ├── VALIDATION_AND_CERTIFICATION.md # 5 quality stages, 15 adversarial checks (ADV-01..15)
│   ├── ORCHESTRATION_AND_EXECUTION.md  # Subagent DAGs, Parent Self-Execution Ban
│   ├── RENDERING_PIPELINE.md        # 7 format renderers, projection philosophy
│   ├── ANKI_INTEGRATION.md          # Dual APKG v1.0, Model IDs 1600000001–1600000004
│   ├── SECURITY_AND_TRUST.md        # Zero-trust model, path traversal, injection defenses
│   ├── GOVERNANCE.md                # Authority hierarchy, ADR protocol, single-rule ownership
│   ├── audits/                      # Historical audit reports & verification proofs (11 files)
│   ├── archive/                     # Retired drafts & archive indexes (README.md)
│   ├── target_architecture/         # Forward-looking target architecture (VNEXT_ORCHESTRATION_SPEC.md)
│   └── STUDYSOURCECORE_*            # Test-retained legacy specifications with epistemic annotations
│
├── .agents/                         # Tier 2 Machine Governance & Subagent Definitions
│   ├── AGENTS.md                    # Master Subagent Registry & 14-Section Template
│   ├── RESOURCES.md                 # Authoritative resource index & schema map
│   ├── DECISIONS.md                 # Architecture Decision Records (ADR-01 through ADR-17)
│   ├── FREEZE_MAP.md                # Tier 1 and Tier 2 freeze governance registry
│   ├── agents/                      # 14 specialist subagent definition prompts
│   │   ├── core-notes.md            # Specialist 1: Obsidian Notes Architect
│   │   ├── core-basic-anki.md       # Specialist 2: Basic TSV Flashcards
│   │   ├── core-cloze-anki.md       # Specialist 3: Cloze TSV Flashcards
│   │   ├── core-image-occlusion.md  # Specialist 4: Image Occlusion Manifests
│   │   ├── core-mindmap.md          # Specialist 5: MindMap Hierarchies
│   │   ├── core-slide-deck.md       # Specialist 6: Marp Slide Decks & NotebookLM
│   │   ├── bm-graph.md              # Specialist 7: Graph Linker & Wikilinks
│   │   ├── bm-qa.md                 # Specialist 8: Semantic Cross-Artifact QA
│   │   ├── math-apkg-author.md      # Specialist 9: Track B Mathematics Specialist
│   │   ├── reasoning-apkg-author.md # Specialist 10: Track C Reasoning Specialist
│   │   ├── physics-numerical-apkg-author.md # Specialist 11: Track D Physics Specialist
│   │   ├── chemistry-numerical-apkg-author.md # Specialist 12: Track E Chemistry Specialist
│   │   ├── mold-gap-auditor.md      # Specialist 13: Procedural Mold & Gap Auditor
│   │   └── adversarial-apkg-reviewer.md # Specialist 14: Independent Adversarial Reviewer
│   │
│   └── skills/study-source-core/    # StudySourceCore Skill & Tooling Implementation
│       ├── SKILL.md                 # Master skill prompt and operational instructions
│       ├── package.json             # NPM dependencies and test script runner
│       ├── resources/               # Authoritative JSON Schemas and markdown contracts
│       ├── scripts/                 # Core implementation scripts, tools, and test suites
│       └── subject-skills/          # Domain DNA skills (Math, Physics, Chemistry, etc.)
│
├── Sources/                         # Ingested study source materials (PDFs, raw texts)
├── Study Materials/                 # Production study vault deliverables
└── scratch/                         # Ephemeral evidence packs, IR artifacts, transients
```

---

## 3. Core Script Catalog (`scripts/`)

The implementation logic is partitioned into focused, single-responsibility scripts under `.agents/skills/study-source-core/scripts/`:

### 3.1 Routing, Policies & Orchestration
| Script File | Purpose | Active Status | Primary Dependencies |
|---|---|---|---|
| `subject_policy_resolver.js` | Resolves Subject $\times$ Artifact policies, applies domain aliases, emits suppression codes. | `[CURRENT]` Production | None (Pure JS) |
| `routing_engine.js` | Determines subagent execution matrix based on evidence pack profile and subject policy. | `[CURRENT]` Production | `subject_policy_resolver.js` |
| `orchestration_engine.js` | Executes multi-agent dispatch DAG, manages checkpoint state, enforces resource limits. | `[CURRENT]` Production | `routing_engine.js`, `execution_state.js` |
| `execution_state.js` | Manages persistent orchestration checkpoint state and resume tokens. | `[CURRENT]` Production | Node `fs`, `path` |
| `path_resolver.js` | Computes standardized file paths for all chapter artifacts based on registry rules. | `[CURRENT]` Production | `artifact_registry.js` |
| `artifact_registry.js` | Authoritative reader and validator for `artifact-registry.json`. | `[CURRENT]` Production | `path_resolver.js` |

### 3.2 Specialist Procedural Authors & Compilers
| Script File | Purpose | Active Status | Primary Dependencies |
|---|---|---|---|
| `author_math_studylab.js` | Authors mathematical problem patterns, solution DAGs, and 3-tier hints. | `[CURRENT]` Production | `export_studylab_procedural_anki.js` |
| `author_physics_studylab.js` | Authors numerical physics calculational items (FBDs, coordinates, kinematics). | `[CURRENT]` Production | `export_studylab_procedural_anki.js` |
| `author_chemistry_studylab.js`| Authors stoichiometry, equilibrium ICE tables, and reaction steps. | `[CURRENT]` Production | `export_studylab_procedural_anki.js` |
| `author_reasoning_studylab.js`| Authors logic puzzles, syllogisms, and seating arrangements with deduction DAGs. | `[CURRENT]` Production | `export_studylab_procedural_anki.js` |
| `render_studylab_question_bank.js` | Renders Markdown Question Banks (`Questions.md`) from procedural JSON items. | `[CURRENT]` Production | Pure JS string templating |

### 3.3 Packaging & Export Compilers
| Script File | Purpose | Active Status | Primary Dependencies |
|---|---|---|---|
| `export_anki.js` | Compiles Basic, Cloze, and IO cards into `<Chapter>_Anki.apkg` (Models 1600000001–1600000003). | `[CURRENT]` Production | `sql.js`, `jszip` |
| `export_studylab_procedural_anki.js` | Compiles procedural items into `StudyLab/<Chapter>_StudyLab_Procedural.apkg` (Model 1600000004). | `[CURRENT]` Production | `sql.js`, `jszip`, `shared_anki_utils.js` |
| `shared_anki_utils.js` | Shared SQLite schema generation, note insertion, and zip packaging routines. | `[CURRENT]` Production | `sql.js`, `jszip` |

### 3.4 Deterministic Validators & Audits
| Script File | Purpose | Active Status | Primary Dependencies |
|---|---|---|---|
| `validate_studylab_procedural.js` | Validates procedural item JSON against `studylab-procedural-schema.json`. | `[CURRENT]` Production | `ajv` |
| `validate_studylab_question_bank.js` | Validates rendered `Questions.md` against question bank contract rules. | `[CURRENT]` Production | Node `fs`, regex parser |
| `validate_tsv.js` | Asserts strict 3-column format, escapes, and non-empty values in Anki TSV files. | `[CURRENT]` Production | Node `fs` |
| `validate_image_occlusion.js` | Validates Image Occlusion JSON against bounds ($[0..100]$) and max regions ($\le 15$). | `[CURRENT]` Production | `ajv` |
| `validate_map.js` | Asserts Mermaid mindmap syntax, hierarchy depth ($\ge 2$), and node limits. | `[CURRENT]` Production | Regex / AST parser |
| `latex_validator.js` | Audits LaTeX math blocks for balanced delimiters (`$...$`, `$$...$$`) and syntax errors. | `[CURRENT]` Production | Regex parser |
| `source_invariant_checker.js` | Verifies evidence SHA-256 hashes against original source documents. | `[CURRENT]` Production | Node `crypto` |

---

## 4. Active Machine Schemas & Contracts (`resources/`)

| Schema / Contract File | Format | Version | Canonical Responsibility |
|---|---|---|---|
| `artifact-registry.json` | JSON | 1.0.0 | Authoritative index of all 8 artifact types, owners, validators, and paths. |
| `studylab-procedural-schema.json` | JSON Schema | 1.0.0 | Validates the 17 procedural dimensions, solution DAGs, 3-tier hints, and MCQs. |
| `studylab-practice-questions-schema.json` | JSON Schema | 1.0.0 | Validates individual practice items in Question Banks. |
| `image-occlusion-schema.json` | JSON Schema | 1.0.0 | Validates IO manifests, normalized $[x,y,w,h]$ bounds, and label dictionaries. |
| `asset-manifest-schema.json` | JSON Schema | 1.0.0 | Validates extracted visual assets and metadata. |
| `subject-skill-manifest.json` | JSON | 1.0.0 | Manifest defining subject domains and registered capabilities. |
| `subject-visual-rules.json` | JSON | 1.0.0 | Visual extraction rules per subject (e.g. diagrams required vs prohibited). |

---

## 5. Test Suite Status & Execution (`package.json`)

The official test suite is executed via `npm test` inside `.agents/skills/study-source-core/`. All 18 tests run deterministically and pass:

```bash
cd .agents/skills/study-source-core
npm test
```

### Passing Test Inventory (18 of 18)
1. `test_subject_policy_resolver.js`: Validates subject policy resolution, matrix states, and alias handling across all 9 subjects.
2. `test_routing.js`: Asserts subagent dispatch routing matches subject policies and evidence profiles.
3. `test_orchestration.js`: Tests DAG execution, wave sequencing, and Single-Writer enforcement.
4. `test_artifact_registry.js`: Validates integrity of `artifact-registry.json` against all artifact rules.
5. `test_change_isolation.js`: Asserts changes do not breach freeze boundaries or mutate frozen contracts.
6. `test_change_isolation_vnext.js`: Hardens change isolation checks for upcoming orchestration extensions.
7. `test_contracts.js`: Validates all canonical JSON schemas against Ajv and test fixtures.
8. `test_regression.js`: Tests backward compatibility of basic and cloze card TSV generators.
9. `test_vnext_orchestration.js`: Tests vNext subagent DAG routing and task dependency resolution.
10. `test_r1_r5_verification.js`: Validates Release Criteria R1 through R5 (physical existence, schemas, counts).
11. `test_studylab_question_bank.js`: Validates Markdown Question Bank rendering and parsing.
12. `test_math_production_path.js`: Tests end-to-end Math procedural authoring, hint validation, and APKG export.
13. `test_physics_production_path.js`: Tests end-to-end Physics numerical calculational authoring and export.
14. `test_chemistry_production_path.js`: Tests end-to-end Chemistry stoichiometry/equilibrium authoring and export.
15. `test_reasoning_production_path.js`: Tests end-to-end Reasoning puzzle deduction DAG authoring and export.
16. `test_phase7_context_routing.js`: Validates context bundle sizing and token budgeting per subagent.
17. `test_phase8_independent_verification.js`: Validates independent adversarial APKG verification logic.
18. `test_unified_anki_packaging.js`: Validates experimental unified packaging prototype (v1.1 candidate).

> [!NOTE]
> **Implementation Baseline Verification vs Target Architecture**:  
> Passing `npm test` (18 of 18 test files) proves that the **current implementation baseline** is structurally stable and regression-free. It does NOT indicate that target architecture components (such as the Semantic Learning IR, Content Lineage Records, or Unified Single APKG) have already been implemented. Those capabilities are scheduled for Phases 1 through 10 in [`ROADMAP.md`](../ROADMAP.md).
>
> **Fresh-Agent Simulation Scope**:  
> Running `node scripts/test_fresh_agent_simulation.js` verifies comprehension across a **hardcoded 14-document canonical subset** (`.agents/README.md`, `.agents/OWNERSHIP.md`, `.agents/DATA_FLOW.md`, `.agents/EXECUTION_LIFECYCLE.md`, `.agents/FREEZE_MAP.md`, `.agents/DECISIONS.md`, `.agents/TROUBLESHOOTING.md`, and 7 `docs/STUDYSOURCECORE_*` files). It serves as a historical core comprehension check and does not evaluate the full expanded Tier 0 and Tier 1 documentation tree.

---

## 6. Baseline Tooling & Dependencies

Defined in `.agents/skills/study-source-core/package.json`:
- `"ajv": "^8.20.0"`: Strict JSON Schema draft-07/2020-12 validator.
- `"jszip": "^3.10.1"`: Pure JavaScript ZIP archive generation for `.apkg` packages.
- `"sql.js": "^1.14.2"`: Pure WebAssembly port of SQLite 3, used to build Anki databases without native binary compilation.
- `"@modelcontextprotocol/sdk": "^1.30.0"`: MCP server SDK for tool exposure to Antigravity.

---

## 7. Next Actions & Roadmap Transition

With Phase 0 complete and the authoritative documentation set established, implementation proceeds under strict phase governance:
- Refer to [`ROADMAP.md`](../ROADMAP.md) for the execution sequence of Phases 1 through 10.
- Refer to [`docs/GAP_REGISTER.md`](./GAP_REGISTER.md) for the active list of gaps to be resolved in Phase 1.
