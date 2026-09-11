---
name: study-source-core
description: Master multi-agent orchestrator coordinating 14 specialist subagents to transform authorized study sources into parallel, high-yield study deliverables (Notes, Anki decks, Image Occlusions, MindMaps, Slide Decks, and StudyLab procedural packages).
---

# Study Source Core (`study-source-core`)

## 1. Mission

StudySourceCore is the master orchestration engine that transforms raw educational sources into parallel sibling study artifacts. The parent orchestrator owns **intake, evidence extraction, routing, dispatch, packaging, and physical verification** — never specialist content authoring.

**Mental Model**: `Parent = WHAT + WHEN + WHO` · `Specialist = HOW` · `Validator = IS IT CORRECT`


### Source-First Distinct Question Rule
- Authentic source questions and exam problems must be preserved with distinct identities.
- Distinct questions sharing an underlying method or pattern must NEVER be collapsed or deduplicated into generic single examples.
- Synthetic or generated variants are strictly secondary and must never displace authentic source problems.

## 2. Input / Output

- **Input**: Authorized study source (PDF/markdown) → single immutable Evidence Pack (`scratch/evidence-pack.md`) with SHA-256 hash.
- **Output**: Chapter-first deliverable tree under `Study Materials/[Subject]/[Chapter]/` containing Notes, Anki APKG, StudyLab Procedural APKG, MindMap, SlideDeck, and audit reports.

## 3. Lifecycle (3-Wave Pipeline)

| Wave | Mode | What Happens |
|------|------|--------------|
| **1** | Parallel (max 4 concurrent) | Specialist subagents author Notes, Anki TSVs, IO manifests, MindMaps, SlideDecks, StudyLab JSONs |
| **2** | Sequential | Packaging tools compile APKGs (`export_anki_package` / `export_studylab_procedural_package` or CLI `export_anki.js`) |
| **3** | Post-packaging | QA audits (`bm-qa`, `bm-graph`, `adversarial-apkg-reviewer`) and physical validation (`validate_artifact`) |

> Full specification → [`resources/workflow.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/.agents/skills/study-source-core/resources/workflow.md)

## 4. Routing & Dispatch

`study-source-core` strictly complies with **Adaptive Orchestrator v4 Foundation**. The MANDATORY DISPATCH GATE and artifact eligibility matrix are defined in [`resources/workflow.md#phase-45`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/.agents/skills/study-source-core/resources/workflow.md). Routing decisions are strictly governed by the deterministic, machine-readable `runtime-policy.json` provided by each Subject Skill. The policy is loaded and validated by `scripts/subject_policy_resolver.js` and consumed by `scripts/routing_engine.js`. Core routes based *only* on this resolved policy and strictly fails closed when the policy is missing, malformed, or invalid. Core MUST NOT invent, infer, or fallback to default policies.

The `subject-skill-manifest.json` acts exclusively as a metadata registry and capability directory, not a policy layer. Artifact policy is uniquely and entirely owned by the individual Subject Skills via their respective `runtime-policy.json` files. The LLM Subject Agent is no longer responsible for dynamically synthesizing this policy.

**Artifact Registry:**
Execution metadata for all artifacts is maintained in `resources/artifact-registry.json`. Core dynamically loads this registry to build the execution graph, resolve validators, construct file paths, and determine cleanup/archive behavior. Adding a new artifact requires updating the Artifact Registry entry and the respective Subject Policies (`runtime-policy.json` for each subject that should enable/disable it). Core routing, orchestration, policy resolution, path resolution, provenance, and cleanup all derive their behavior from the registry — no Core engine code changes are required.

**Context Minimization, Model Routing & Adaptive Retry (Phase 7):**
- **Task-Scoped Slicing & Provenance**: `scripts/context_planner.js` derives deterministic context slices per task (25%–60% token reduction) with SHA-256 provenance verification back to `scratch/evidence-pack.md`.
- **Policy-Driven Model Routing**: `scripts/model_routing_policy.js` maps tasks to capability classes (`CHEAP`, `DEFAULT`, `STRONG`) based on complexity and context budget.
- **Adaptive Retry & Hard Limits**: `scripts/retry_policy.js` classifies failures into 11 canonical failure modes and 4 retry classes (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), enforcing hard mission limits (max 4 concurrent, max 10 total launches) with targeted prompt adaptations.
- **Execution State Checkpointing**: `scripts/execution_state.js` maintains persistent task status and decision trail in `scratch/execution-state.json`.

## 5. Agent Ownership (Single-Writer Rule)

The authoritative artifact ownership, writer, validator, dependency, and execution metadata is defined in `resources/artifact-registry.json`.

> Full ownership matrix explanation → [`OWNERSHIP.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/OWNERSHIP.md)

## 6. Evidence & Context Rules

- **Single Source Parse**: Read source once → extract to `scratch/evidence-pack.md`. No multiple PDF parsing.
- **SOURCE_ONLY default**: Zero web searches or model memory injections unless explicitly requested.
- **Hindi-first language contract** → [`RESOURCES.md#universal-language-contract`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/RESOURCES.md#universal-language-contract)

## 7. Completion & Failure Gates

- **Completion**: Physical disk inspection — every expected artifact exists, size > 0, conforms to schema, passes validation.
- **Failure**: Missing files, 0-byte outputs, schema errors, or invariant violations prevent PASS.
- **HANDOFF REPORT contract** → [`EXECUTION_LIFECYCLE.md#structured-handoff-schema`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/EXECUTION_LIFECYCLE.md#structured-handoff-schema)
- **Validation scripts** → [`resources/workflow.md` Phase 6](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/.agents/skills/study-source-core/resources/workflow.md)

## 8. Canonical References

| Domain | Canonical Source |
|--------|-----------------|
| Full workflow (11 phases) | [`resources/workflow.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/.agents/skills/study-source-core/resources/workflow.md) |
| Ownership & Single-Writer Rule | [`OWNERSHIP.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/OWNERSHIP.md) |
| Execution lifecycle & handoff | [`EXECUTION_LIFECYCLE.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/EXECUTION_LIFECYCLE.md) |
| Agent registry (14 agents) | [`AGENTS.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/AGENTS.md) |
| Resource & schema registry | [`RESOURCES.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/RESOURCES.md) |
| Anki core rules & model IDs | [`resources/anki-core-rules.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/.agents/skills/study-source-core/resources/anki-core-rules.md) |

| Note architecture | [`resources/note-architecture.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/.agents/skills/study-source-core/resources/note-architecture.md) |
| Subject domain knowledge | [`subject-skills/<Subject>/SKILL.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/.agents/skills/study-source-core/subject-skills/) |

## 9. Stop Rules

- The parent coordinates, routes, gates, and audits — **never** authors specialist deliverables.
- Deep domain knowledge lives in `subject-skills/<Subject>/SKILL.md` and `resources/`.
- Do not add framework layers, agents, or redesign StudySourceCore beyond this scope.
