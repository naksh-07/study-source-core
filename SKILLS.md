# Master Skills Registry (`SKILLS.md`)

## 1. Overview & Architecture

StudySourceCore employs a modular, hierarchical skills architecture designed to provide domain-grounded intelligence and strict structural contracts across all stages of study source processing. Skills are organized into four functional tiers:

1. **Master Core Skill (`study-source-core`)**: The foundational execution skill governing orchestration, deterministic gating, resource limits, multi-agent dispatch, evidence extraction, and physical artifact verification.
2. **Subject Skills (9 Domains)**: Deep pedagogical domain knowledge models covering Biology, Chemistry, Geography, History, Map, Math, Physics, Political Science, and Reasoning.
3. **Supporting Skills & Resource Contracts**: Formatting, structural, and presentation contracts for Notes, Basic/Cloze Anki, Image Occlusion, Slide Decks, Maps, and Workflow Recovery.
4. **StudyLab Skills & Specifications**: Advanced procedural learning contracts governing Level 1 through Level 7 practice progression, solution DAGs, 3-tier hints, and adversarial validation.

```
                              ┌───────────────────────────────────┐
                              │         study-source-core         │
                              │       (Master Core Skill)         │
                              └─────────────────┬─────────────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ▼                                      ▼                                      ▼
┌──────────────────┐                  ┌──────────────────┐                  ┌──────────────────┐
│  Subject Skills  │                  │ Supporting Rules │                  │  StudyLab Skills │
│   (9 Domains)    │                  │  (Core Contracts)│                  │ (L1–L7 Practice) │
├──────────────────┤                  ├──────────────────┤                  ├──────────────────┤
│ • Biology        │                  │ • Note Arch      │                  │ • Procedural Ctr │
│ • Chemistry      │                  │ • Anki Core      │                  │ • Practice Univ  │
│ • Geography      │                  │ • Image Occlusion│                  │ • Anti-Fallback  │
│ • History        │                  │ • Slide Deck     │                  │ • Error Taxonomy │
│ • Map            │                  │ • Map Schema     │                  │ • Problem Pattern│
│ • Math           │                  │ • Source Policy  │                  │ • Validation Ptr │
│ • Physics        │                  │ • Agent Recovery │                  │ • Manifest Spec  │
│ • Political Sci  │                  │ • Tool Orchestr  │                  │ • Domain Boundary│
│ • Reasoning      │                  │ • Workflow Spec  │                  └──────────────────┘
└──────────────────┘                  └──────────────────┘
```

---

## 2. Core Skill Registry

### Master Core Skill: `study-source-core`
- **Path**: `skills/study-source-core/SKILL.md`
- **Status**: `CONTROLLED_CHANGE` (Core operations manual)
- **Role**: Top-level multi-agent execution skill transforming authorized study sources into parallel, high-yield sibling study artifacts.
- **Foundational Principles**:
  1. **Single Source of Truth**: All subagents derive strictly from `scratch/evidence-pack.md` (SHA-256 verified). Raw PDFs are never independently re-parsed.
  2. **Deterministic Gating & Zero Silent Omission**: Unused tracks are explicitly suppressed via `routing_engine.js` with documented bypass codes (`ZERO_BASIC_CANDIDATES`, `NO_IO_CANDIDATES`, etc.) without failing the build.
  3. **Hard Resource Limits**: Maximum 4 concurrent subagents globally, maximum 10 total launches per mission tree, and immediate workforce collapse upon handoff receipt.
  4. **Single-Writer Rule & Parent Self-Execution Ban**: Exactly one specialist writes to each deliverable. The parent orchestrator is banned from self-executing specialist tasks.
  5. **MCQ Hard Invariant**: Minimum 4 distinct, non-empty, pedagogically plausible options with exactly 1 correct answer.
  6. **Universal Language Contract**: Explanatory prose in Hindi-first with technical terms in English parentheses `( )`.
  7. **Physical Verification Gates**: Every expected deliverable must physically exist on disk with size $> 0$ and pass independent test harnesses.
- **Canonical Resources**:
  - `skills/study-source-core/resources/workflow.md`
  - `skills/study-source-core/resources/validation-rules.md`
  - `skills/study-source-core/resources/tool-orchestration.md`
  - `skills/study-source-core/resources/agent-recovery.md`
  - `skills/study-source-core/resources/large-source-orchestration.md`
  - `skills/study-source-core/resources/source-policy.md`
- **Owned Agents**: `core-notes`, `core-basic-anki`, `core-cloze-anki`, `core-image-occlusion`, `core-mindmap`, `core-slide-deck`, `bm-graph`, `bm-qa`.

---

## 3. Subject Skills Registry (9 Domains)

| # | Subject Skill | Path | Primary Role & Domain Rules | Associated Specialists | Status |
|---|---|---|---|---|---|
| 1 | **Biology** | `skills/study-source-core/subject-skills/Biology/SKILL.md` | 15 Domain DNA classifications, Structure-Function-Process-Regulation 4-tier pedagogical model, anatomical diagram occlusion, morphological vs physiological isolation. | `core-notes`, `core-basic-anki`, `core-cloze-anki`, `core-image-occlusion`, `bm-qa` | `CONTROLLED_CHANGE` |
| 2 | **Chemistry** | `skills/study-source-core/subject-skills/Chemistry/SKILL.md` | Physical Chemistry stoichiometry with mandatory ICE tables, Organic $S_N1/S_N2$ reaction mechanisms with electron arrow push tracking, Inorganic periodic trends, LaTeX chemical equation formatting. | `chemistry-numerical-apkg-author`, `core-notes`, `core-basic-anki`, `core-cloze-anki` | `CONTROLLED_CHANGE` |
| 3 | **Geography** | `skills/study-source-core/subject-skills/Geography/SKILL.md` | Spatial distribution and causal geomorphology modeling, atmospheric pressure belts and oceanic circulation, Indian drainage basins, physical map plate occlusion. | `core-notes`, `core-basic-anki`, `core-cloze-anki`, `core-image-occlusion` | `CONTROLLED_CHANGE` |
| 4 | **History** | `skills/study-source-core/subject-skills/History/SKILL.md` | Strict chronological ordering and date normalization, multi-causal historical analysis (Political, Economic, Religious, Social), primary source attribution, dynastic lineage maps. | `core-notes`, `core-basic-anki`, `core-cloze-anki`, `core-mindmap` | `CONTROLLED_CHANGE` |
| 5 | **Map** | `skills/study-source-core/subject-skills/Map/SKILL.md` | Visual-spatial map hierarchy, normalized bounding box coordinates, Image Occlusion mask alignment for cartography, landmark validation against `validate_map.js`. | `core-image-occlusion`, `core-notes` | `CONTROLLED_CHANGE` |
| 6 | **Math** | `skills/study-source-core/subject-skills/Math/SKILL.md` | 11 Domain DNA types, 10 Canonical procedural question types, `1 Pattern != 1 Question` invariant, 3-tier progressive hints (Concept, Strategy, Method), Solution DAGs, 14 error categories. | `math-apkg-author`, `core-notes`, `core-basic-anki`, `core-cloze-anki` | `CONTROLLED_CHANGE` |
| 7 | **Physics** | `skills/study-source-core/subject-skills/Physics/SKILL.md` | 6-Stage calculational pipeline (FBD, Coordinates, Governing Law, Algebraic Solve, SI Substitution, Sanity Check), dimensional analysis, prohibition of descriptive fallback. | `physics-numerical-apkg-author`, `core-notes`, `core-basic-anki`, `core-cloze-anki` | `CONTROLLED_CHANGE` |
| 8 | **Political Science** | `skills/study-source-core/subject-skills/Political Science/SKILL.md` | Constitutional article and amendment citation mapping, institutional power separation, landmark Supreme Court judicial doctrines, comparative governance systems. | `core-notes`, `core-basic-anki`, `core-cloze-anki`, `core-mindmap` | `CONTROLLED_CHANGE` |
| 9 | **Reasoning** | `skills/study-source-core/subject-skills/Reasoning/SKILL.md` | 7-Layer cognitive thinking flow, 4-tier constraint classification (Definite, Conditional, Negative, Possibility), Venn syllogisms, matrix puzzle grids, distractor traps. | `reasoning-apkg-author`, `core-notes`, `core-basic-anki`, `core-cloze-anki` | `CONTROLLED_CHANGE` |

---

## 4. Supporting Skills & Resource Contracts

| Skill / Contract Name | Path | Type | Purpose & Scope | Referenced By |
|---|---|---|---|---|
| `anki-core-rules` | `skills/study-source-core/resources/anki-core-rules.md` | `CORE_RULES` | Canonical formatting rules for Basic (`Front \t Back \t Tags`) and Cloze (`Text \t Extra \t Tags`) TSVs. | `core-basic-anki`, `core-cloze-anki`, `validate_tsv.js` |
| `note-architecture` | `skills/study-source-core/resources/note-architecture.md` | `CONTRACT` | Structural guidelines for Obsidian notes: YAML frontmatter, single H1, heading monotonicity, defensive callouts ($\le 2$). | `core-notes`, `bm-graph`, `note_contract_audit.js` |
| `image-occlusion-contract` | `skills/study-source-core/resources/image-occlusion-contract.md` | `CONTRACT` | Image occlusion coordinate normalization ($[0..100]$ range), bounding box rules, SVG mask manifest schema. | `core-image-occlusion`, `validate_image_occlusion.js` |
| `slide-deck-core-rules` | `skills/study-source-core/resources/slide-deck-core-rules.md` | `CORE_RULES` | Presentation deck rules for Marp/NotebookLM: 12 mandatory sections, strict 5–15 slide budget, visual directives. | `core-slide-deck`, `slide_deck_prompt_audit.js` |
| `visual-learning-contract` | `skills/study-source-core/resources/visual-learning-contract.md` | `CONTRACT` | Visual asset discovery, image processing, media resolution, and SHA-256 asset hash binding. | `core-image-occlusion`, `resolve_visual_asset.js` |
| `map-core-rules` | `skills/study-source-core/resources/map-core-rules.md` | `CORE_RULES` | Geospatial entity extraction, coordinate datum normalization, cartographic labeling standards. | `core-image-occlusion`, `Map/SKILL.md` |
| `map-schema` | `skills/study-source-core/resources/map-schema.md` | `CONTRACT` | Map metadata JSON specifications, bounding boxes, and landmark schemas. | `core-image-occlusion`, `validate_map.js` |
| `map-validation-rules` | `skills/study-source-core/resources/map-validation-rules.md` | `CONTRACT` | Geospatial bounding box verification, coordinate range boundaries, landmark validation rules. | `validate_map.js` |
| `source-policy` | `skills/study-source-core/resources/source-policy.md` | `POLICY` | Source ground truth invariance, anti-hallucination mandate, citation requirements, copyright hygiene. | `study-source-core`, `bm-qa`, `source_invariant_checker.js` |
| `workflow` | `skills/study-source-core/resources/workflow.md` | `POLICY` | End-to-end 10-phase pipeline execution workflow specification. | `study-source-core` |
| `validation-rules` | `skills/study-source-core/resources/validation-rules.md` | `CONTRACT` | Cross-artifact validation criteria, pass/fail quality gates, and error thresholds. | `bm-qa`, `cross_artifact_checker.js` |
| `tool-orchestration` | `skills/study-source-core/resources/tool-orchestration.md` | `POLICY` | Subagent dispatch limits, tool call budgets, and concurrency caps (max 4 concurrent, max 10 total). | `study-source-core` |
| `agent-recovery` | `skills/study-source-core/resources/agent-recovery.md` | `POLICY` | Agent failure isolation, 1-retry targeted error correction protocol, and circuit breaker mechanics. | `study-source-core`, all agents |
| `large-source-orchestration` | `skills/study-source-core/resources/large-source-orchestration.md` | `POLICY` | Chunking strategies, token budgeting, and multi-pass intake for large source PDFs. | `study-source-core` |
| `subject-skill-contract` | `skills/study-source-core/resources/subject-skill-contract.md` | `CONTRACT` | Standardized interface contracts, hooks, and lifecycle policies for all 9 subject skills. | All 9 subject skills |

---

## 5. StudyLab Skills & Specifications

| Skill / Spec Name | Path | Type | Purpose & Scope | Referenced By |
|---|---|---|---|---|
| `studylab-procedural-contract` | `skills/study-source-core/resources/studylab-procedural-contract.md` | `CONTRACT` | Master procedural contract defining Levels 1 through 7 practice progression, solution DAGs, and interactive card models. | All StudyLab specialists, `validate_studylab_levels_1_6.js` |
| `source-first-practice-universe` | `skills/study-source-core/resources/studylab/source-first-practice-universe.md` | `POLICY` | Source-First Practice Universe hierarchy: $\text{authentic\_pyq} \succ \text{curated\_source} \succ \text{derived\_variant} \succ \text{synthetic\_schema}$. | `study-source-core`, all StudyLab specialists |
| `anti-fallback-invariant` | `skills/study-source-core/resources/studylab/anti-fallback-invariant.md` | `POLICY` | Inviolable ban on generic flashcard fallback for procedural topics; mandates rich interactive card models. | All StudyLab specialists, `adversarial-apkg-reviewer` |
| `problem-patterns` | `skills/study-source-core/resources/studylab/problem-patterns.md` | `TAXONOMY_MAP` | Pattern taxonomy from Level 0 Authentic to Level 5 Transfer across all STEM and analytical domains. | All StudyLab specialists |
| `domain-boundaries` | `skills/study-source-core/resources/studylab/domain-boundaries.md` | `CONTRACT` | Architectural separation of Concepts (Notes) vs Patterns (Procedural JSON) vs Practice Items (APKG). | `mold-gap-auditor`, `study-source-core` |
| `manifest-spec` | `skills/study-source-core/resources/studylab/manifest-spec.md` | `CONTRACT` | Specification for StudyLab procedural APKG companion manifest metadata (`.manifest.json`). | `export_studylab_procedural_anki.js`, `mold-gap-auditor` |
| `error-taxonomies` | `skills/study-source-core/resources/studylab/error-taxonomies.md` | `ERROR_TAXONOMY` | Classification of 14 procedural traps, calculation errors, cognitive misdirections, and distractor models. | All StudyLab specialists |
| `validation-protocol` | `skills/study-source-core/resources/studylab/validation-protocol.md` | `CONTRACT` | Step-by-step Level 1–7 procedural artifact verification test protocol and adversarial attack harness. | `validate_studylab_levels_1_6.js`, `adversarial-apkg-reviewer` |

---

## 6. Skill Modification & Governance Rules

1. **Frozen Assets**: Schemas in `skills/study-source-core/resources/schemas/*.json` and production Anki Model IDs (`1600000001`–`1600000004`) are strictly **FROZEN**. Modifying these schemas requires a full architectural RFC and regression sign-off.
2. **Controlled Change**: Subject skills and resource contracts in `skills/study-source-core/resources/*.md` may be updated to refine pedagogical heuristics, provided they maintain backward compatibility with existing validators.
3. **Single Source of Truth**: No skill may inline duplicate copies of the Universal Language Contract, MCQ Hard Invariant, or Hint Invariant. All skills must reference canonical anchors in `RESOURCES.md`.
4. **Deduplication Rule**: When modifying skills, ensure that all references point directly to canonical paths in `skills/study-source-core/resources/` or `skills/study-source-core/`.
