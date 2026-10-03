# Master Agents Registry (`AGENTS.md`)
<!-- schema_version: 2.0 -->
<!-- project_id: proj-study-source-core -->
<!-- DATA_CLASSIFICATION: PASSIVE_CONTEXT_ONLY -->

- **Canonical Project ID**: `proj-study-source-core`
- **Architecture**: Antigravity 2.0 Native Skill & MCP Extension (`skills/study-source-core`)
- **Authoritative Subagent Registry**: [`.agents/AGENTS.md`](file:///c:/Users/Suraj/Documents/Antigravity/Studycore/.agents/AGENTS.md)
- **Authoritative Artifact Registry**: [`skills/study-source-core/resources/artifact-registry.json`](file:///c:/Users/Suraj/Documents/Antigravity/Studycore/skills/study-source-core/resources/artifact-registry.json)

## 1. Overview & Architecture

StudySourceCore coordinates 14 specialized, single-responsibility subagents to transform raw study sources into parallel, high-yield sibling study artifacts. Every agent adheres strictly to the **Single-Writer Rule** (exactly one designated agent writes to each target deliverable) and the **Parent Self-Execution Ban** (the parent orchestrator coordinates, routes, gates, and audits, but never authors specialist deliverables).

The 14 agents are categorized into three operational classes:
1. **Generic Content Specialists (6 agents)**: Produce core chapter study artifacts in Wave 1 parallel generation (`core-notes`, `core-basic-anki`, `core-cloze-anki`, `core-image-occlusion`, `core-mindmap`, `core-slide-deck`).
2. **StudyLab Procedural Specialists (4 agents)**: Author domain-specific STEM and analytical practice patterns, solution DAGs, 3-tier hints, and canonical Markdown Question Banks (`math-apkg-author`, `reasoning-apkg-author`, `physics-numerical-apkg-author`, `chemistry-numerical-apkg-author`). *Operational Policy*: Binary Procedural APKG packaging is temporarily suspended in production; canonical Markdown Question Banks (`Questions.md`) serve as the active primary practice deliverable.
3. **Downstream QA & Audit Specialists (4 agents)**: Execute semantic cross-artifact consistency checks, vault graph linking, contract gap analysis, and independent adversarial APKG verification (`bm-graph`, `bm-qa`, `mold-gap-auditor`, `adversarial-apkg-reviewer`).

---

## 2. Master Agent Index

The authoritative artifact ownership, writer, validator, dependency, and execution metadata is defined in `skills/study-source-core/resources/artifact-registry.json`.

| # | Agent ID | Agent File Link | Category | Primary Role |
|---|---|---|---|---|
| 1 | `core-notes` | [01-source-ingestion / `core-notes.md`](.agents/agents/core-notes.md) | Generic Content | Knowledge Notes Architect |
| 2 | `core-basic-anki` | [02-flashcard-author / `core-basic-anki.md`](.agents/agents/core-basic-anki.md) | Generic Content | Basic Flashcard Specialist |
| 3 | `core-cloze-anki` | [03-cloze-author / `core-cloze-anki.md`](.agents/agents/core-cloze-anki.md) | Generic Content | Cloze Flashcard Specialist |
| 4 | `core-image-occlusion` | [04-image-occlusion / `core-image-occlusion.md`](.agents/agents/core-image-occlusion.md) | Generic Content | Image Occlusion Specialist |
| 5 | `core-mindmap` | [05-mindmap-author / `core-mindmap.md`](.agents/agents/core-mindmap.md) | Generic Content | MindMap Specialist |
| 6 | `core-slide-deck` | [06-slide-deck / `core-slide-deck.md`](.agents/agents/core-slide-deck.md) | Generic Content | SlideDeck Specialist |
| 7 | `bm-graph` | [07-graph-linker / `bm-graph.md`](.agents/agents/bm-graph.md) | Downstream QA | Graph Linker Specialist |
| 8 | `bm-qa` | [08-cross-artifact-qa / `bm-qa.md`](.agents/agents/bm-qa.md) | Downstream QA | Cross-Artifact QA Specialist |
| 9 | `math-apkg-author` | [09-math-specialist / `math-apkg-author.md`](.agents/agents/math-apkg-author.md) | StudyLab Specialist | Track B Mathematics Question Bank Specialist (APKG Paused) |
| 10 | `reasoning-apkg-author` | [10-reasoning-specialist / `reasoning-apkg-author.md`](.agents/agents/reasoning-apkg-author.md) | StudyLab Specialist | Track C Reasoning Question Bank Specialist (APKG Paused) |
| 11 | `physics-numerical-apkg-author` | [11-physics-specialist / `physics-numerical-apkg-author.md`](.agents/agents/physics-numerical-apkg-author.md) | StudyLab Specialist | Track D Physics Numerical Question Bank Specialist (APKG Paused) |
| 12 | `chemistry-numerical-apkg-author` | [12-chemistry-specialist / `chemistry-numerical-apkg-author.md`](.agents/agents/chemistry-numerical-apkg-author.md) | StudyLab Specialist | Track E Chemistry Numerical Question Bank Specialist (APKG Paused) |
| 13 | `mold-gap-auditor` | [13-mold-gap-auditor / `mold-gap-auditor.md`](.agents/agents/mold-gap-auditor.md) | Downstream QA | Mold & Gap Auditor |
| 14 | `adversarial-apkg-reviewer` | [14-adversarial-reviewer / `adversarial-apkg-reviewer.md`](.agents/agents/adversarial-apkg-reviewer.md) | Downstream QA | Independent Adversarial Reviewer |

---
## 3. Detailed Agent Profiles & Invariants

> **Authoritative Specification**: Full 14-section agent contracts and execution templates reside canonically in [`.agents/AGENTS.md`](file:///c:/Users/Suraj/Documents/Antigravity/Studycore/.agents/AGENTS.md) and individual specialist prompts in [`.agents/agents/`](file:///c:/Users/Suraj/Documents/Antigravity/Studycore/.agents/agents).

---

## 4. Architectural Invariants & Non-Negotiables

1. **Antigravity Native Skill**:
   `study-source-core` is an Antigravity 2.0 Skill and MCP tool server, NOT an independent daemon or simulated OS. Workflow orchestration and subagent dispatch are handled natively by Antigravity.
2. **Single-Writer Rule**:
   Exactly one designated agent writes to each target deliverable. No concurrent writes to the same artifact.
3. **Parent Self-Execution Ban**:
   The parent orchestrator coordinates, routes, gates, and audits, but never authors specialist deliverables directly.
4. **Universal Question Contract**:
   Every practice question must provide at least 4 distinct MCQ options (`A, B, C, D`). Tier 1 and Tier 2 hints must never leak final answers.
5. **Fail-Closed Verification**:
   All quality gates (`note_contract_audit.js`, `validate_tsv.js`, `latex_validator.js`, `mermaid_validator.js`, `validate_studylab_question_bank.js`, `cross_artifact_checker.js`) fail closed with non-zero exit code or `{ isValid: false }`.
6. **Zero Hardcoded Context & Anti-Mock Invariant**:
   Subagents, production scripts, and authoring engines are strictly forbidden from hardcoding chapter names, topics, or static vault target paths. Production authoring scripts must never fall back to sample test fixtures or mock data.
7. **Lean Memory Architecture (v2.0)**:
   - Root `AGENTS.md` is a lean index + key invariants (< 70 lines).
   - Working memory `.agents/memory/activeContext.md` $\le$ 150 lines.
   - Authoritative deep agent profiles live exclusively in [`.agents/AGENTS.md`](file:///c:/Users/Suraj/Documents/Antigravity/Studycore/.agents/AGENTS.md).
