# StudySourceCore: Teamwork-Informed Orchestration Gap Analysis
**Document ID**: `DOC-STUDYSOURCECORE-GAP-001`  
**Status**: APPROVED / CANONICAL BASELINE  
**Authoritative Scope**: Orchestration, Runtime Task Graph, Dispatch Gating, Completion Verification & Governance  

---

## Executive Summary

This document presents an exhaustive forensic comparison between **StudySourceCore's current implementation** and the **Teamwork Preview / Adaptive Orchestrator v4 Foundation** multi-agent patterns. The objective is to identify exact runtime, architectural, and verification gaps, establish why each gap matters, and specify minimal deterministic fixes while maintaining absolute preservation of all frozen contracts (Anki models 1600000001–1600000004, FSRS logic, content schemas, StudyLab procedural contracts, domain boundaries, and generic artifact semantics).

---

## Section A: Current StudySourceCore Architecture

StudySourceCore is organized around a 3-wave execution model:
1. **Source Ingestion & Evidence Extraction**: The parent orchestrator parses the raw source and generates an evidence pack (`scratch/evidence-pack.md`).
2. **Wave 1 (Parallel Generation)**: 14 subagents are defined across generic content specialists (`core-notes`, `core-basic-anki`, `core-cloze-anki`, `core-image-occlusion`, `core-mindmap`, `core-slide-deck`) and StudyLab procedural specialists (`math-apkg-author`, `reasoning-apkg-author`, `physics-numerical-apkg-author`, `chemistry-numerical-apkg-author`).
3. **Wave 2 (Sequential Packaging)**: Single-threaded CLI scripts (`export_anki.js`, `export_studylab_procedural_anki.js`) compile TSVs and JSON into `.apkg` packages.
4. **Wave 3 (Post-Packaging Audit)**: Downstream QA agents (`bm-qa`, `bm-graph`, `adversarial-apkg-reviewer`) and physical validators verify the outputs.

### The Runtime Reality (Forensic Audit Finding)
While the documentation specifies full multi-agent orchestration, the runtime dispatch layer historically relied heavily on prompt guidance. Because `routing_engine.js` was primarily structured as a library module without an explicit execution DAG, parent LLMs would frequently bypass subagent invocation (`invoke_subagent`), falling into **silent self-execution** where the parent generated the specialist deliverables itself.

---

## Section B: Teamwork-Derived Architectural Patterns

From the reverse-engineered Teamwork / Adaptive Orchestrator v4 foundation, the following core patterns provide the benchmark for robust multi-agent orchestration:

1. **Deterministic Task Graph (DAG)**: Execution is modeled as an explicit, machine-readable graph of tasks with typed inputs, outputs, preconditions, status codes, and dependencies.
2. **Explicit Dependency Barriers**: Parallel waves of independent tasks synchronize at deterministic barrier points before sequential downstream phases begin.
3. **Mandatory Single-Writer Matrix**: Every deliverable path maps to exactly one writer. Overlapping writes trigger immediate build rejection.
4. **Parent Self-Execution Ban**: The orchestrator coordinates, routes, gates, packages, and verifies, but is programmatically prohibited from generating specialist-owned artifacts.
5. **Machine-Readable Dispatch & Handoff Contract**: Routing produces an unambiguous dispatch plan; subagents return standardized structured handoffs that are programmatically parsed.
6. **Physical Completion Evidence**: Completion is never certified by conversational claims ("done", "looks good"); it requires physical disk assertions (path exists, bytes > 0, owner matches, schema valid, SQLite integrity passes).
7. **Blast-Radius Failure Containment & Targeted 1-Retry**: A failing lane does not crash sibling tasks. The failed task is retried with structured error diagnostics; persistent failure isolates the track and preserves valid sibling deliverables.
8. **Cryptographic Lineage & Change Detection**: Evidence pack SHA-256 hashes prevent redundant PDF parsing and skip unnecessary artifact rebuilds when inputs are unchanged.
9. **Rapid Workforce Collapse**: Subagents terminate immediately upon handoff submission, observing hard concurrency caps ($\le 4$ active, $\le 10$ total launches).

---

## Section C: What StudySourceCore Already Does Correctly

StudySourceCore has already established several best-in-class architectural components:

1. **Single Source of Truth (SSoT)**: `scratch/evidence-pack.md` provides a centralized canonical context for all downstream generation.
2. **Physical Packaging & SQLite Validation**: `export_anki.js` and `export_studylab_procedural_anki.js` build real, valid SQLite databases with strict model ID isolation (`1600000001`–`1600000004`).
3. **Deep Decoupled StudyLab Validators (L1–L7)**: `validate_studylab_levels_1_6.js` and `validate_studylab_levels_1_7.js` provide genuine pedagogical and structural checks (including solution graph DAG acyclicity, 3-tier hints, and Level 7 difficulty dispersion).
4. **Adversarial Audit Harness**: 15 explicit security and invariant attack checks (`test_adversarial_auditor.js`).
5. **Deterministic Path Resolution**: `path_resolver.js` handles cross-platform path resolution, Unicode Hindi names, and subject aliases.
6. **Hard Resource Limits**: Clear governance limiting concurrency to max 4 subagents and max 10 total launches per mission.

---

## Section D: Exact Gaps Across 20 Core Dimensions

| # | Dimension | Current State | Teamwork Pattern | Gap Classification | Exact Architectural Gap |
|---|---|---|---|---|---|
| **1** | **Plan → Route → Dispatch → Handoff → Verify** | Lifecycle documented in Markdown, but lacks unified runtime executor. | Unified state machine transitions through explicit lifecycle states. | **GAP-01** | No single orchestrator module that drives the state machine deterministically through all 9 states. |
| **2** | **Explicit Execution/Task Graph** | Routing returns boolean flags; tasks are implicit. | Explicit Task objects with IDs, dependencies, owners, and validation rules. | **GAP-02** | Absence of a formal Task DAG object (`task_id`, `owner`, `inputs`, `outputs`, `dependencies`, `status`). |
| **3** | **Dependency Barriers** | Wave 1 to Wave 2 transition is prompt-managed. | Programmatic barrier waits for all Wave 1 tasks to reach terminal state before Wave 2 starts. | **GAP-03** | Lack of an executable barrier function that blocks packaging until all producer tasks succeed or cleanly suppress. |
| **4** | **Parallel Execution of Independent Work** | Wave 1 parallel generation is documented, but parent may serialize. | Engine identifies independent DAG nodes and dispatches them concurrently (up to cap 4). | **GAP-04** | No programmatic scheduler to group and execute independent tasks in parallel batches. |
| **5** | **Single-Writer Ownership** | Documented in `OWNERSHIP.md`, but not enforced programmatically at runtime. | Runtime registry validates that no two active tasks target the same output filepath. | **GAP-05** | No pre-dispatch runtime collision check preventing multiple tasks from claiming identical file paths. |
| **6** | **Parent vs Specialist Boundaries** | Documented in `OWNERSHIP.md`. | Strict runtime isolation: parent orchestrator cannot author specialist files. | **GAP-06** | Lack of an active runtime guard asserting that specialist-owned deliverables were written by designated subagents. |
| **7** | **Structured Handoff Protocol** | Handoff template exists in markdown documentation. | Machine-readable handoff parser validates all 11 required fields. | **GAP-07** | Handoff blocks are not programmatically validated against a strict schema upon receipt. |
| **8** | **Shared Evidence-Pack Context** | Implemented as `scratch/evidence-pack.md`. | Evidence pack includes cryptographic checksum and section indices. | **GAP-08** | Evidence pack metadata lacks automated AST boundary indexing for specialist slicing. |
| **9** | **Failure Isolation** | Concept defined; implementation in scripts is ad-hoc. | Failed task isolates its lane; sibling artifacts are preserved; downstream dependents are marked `BLOCKED`. | **GAP-09** | Missing automated DAG cascade: marking only downstream dependent tasks as `BLOCKED` while preserving independent siblings. |
| **10** | **Targeted Retry** | 1-retry rule documented in `EXECUTION_LIFECYCLE.md`. | Diagnostic error payload attached to retry prompt; second failure marks `FAILED`. | **GAP-10** | No programmatic retry counter and diagnostic context generator in the execution graph. |
| **11** | **Duplicate-Work Prevention** | Computation ledger documented in `STUDYSOURCECORE_EFFICIENCY.md`. | Active runtime check skips task if input fingerprint matches existing validated output. | **GAP-11** | Missing runtime task fingerprint comparison before dispatch. |
| **12** | **Source-Read-Once Behavior** | Evidence pack extracted once by parent. | Upstream hash recorded; specialist attempts to re-read raw source are flagged. | **GAP-12** | Specialists have filesystem access that could theoretically allow re-reading raw PDFs. |
| **13** | **Artifact Fingerprint / Change Detection** | Basic SHA-256 in `artifact_provenance.js`. | Composite fingerprint (source hash + task config + generator version). | **GAP-13** | Provenance manifest only tracks evidence hash; does not track task-level configuration hashes. |
| **14** | **Incremental Execution** | All-or-nothing rebuilds in test scripts. | Only outdated or failed DAG nodes are executed; valid up-to-date artifacts are skipped. | **GAP-14** | Pipeline lacks selective re-execution of single dirty tasks. |
| **15** | **Runtime Dispatch Evidence** | System prompt Counter reads "Subagents: 0" when parent self-executes. | Observable dispatch ledger recording every native subagent invocation. | **GAP-15** | Absence of a machine-readable `dispatch-trace.json` recording native invocation proof. |
| **16** | **Completion Evidence** | Basic file check in `validate_all_artifacts.js`. | Tripartite physical completion proof: File Existence + Byte Count + Owner Verification + Schema/SQLite Pass. | **GAP-16** | Verification does not cross-check deliverable writer identity against the task owner. |
| **17** | **Agent Lifecycle / Collapse** | Concurrency cap documented. | Subagents explicitly terminated/idled immediately upon handoff reception. | **GAP-17** | No programmatic hook verifying workforce collapse post-handoff. |
| **18** | **Fresh-Agent Operability** | Documentation spread across multiple `.agents/` files with minor discrepancies. | Single-source-of-truth canonical documentation without contradictions. | **GAP-18** | Minor section numbering mismatch in agent definitions (e.g. `7. INVOCATION TRIGGER` vs `8. PROCESS`). |
| **19** | **Static vs Runtime Verification Gap** | Tests verify static file outputs or mock objects; runtime dispatch wasn't tested. | Test harness exercises the real dispatch, handoff, failure, and retry engine with real state. | **GAP-19** | Previous test suite lacked tests for runtime dispatch engine, parent self-execution prevention, and dependency barriers. |
| **20** | **Prevention of Parent Self-Execution** | Rule stated in markdown prompt. | Programmatic invariant throws exception if parent generates specialist content. | **GAP-20** | The orchestrator had no mechanical check to halt execution if a specialist artifact was produced without a dispatch event. |

---

## Section E: Why Each Gap Matters

- **GAP-01 & GAP-02 (State Machine & Task DAG)**: Without an explicit DAG, orchestration is opaque. The system cannot reliably determine execution order, parallelism, or blockages.
- **GAP-05 & GAP-06 (Single-Writer & Self-Execution Ban)**: If the parent self-executes or multiple agents write to the same directory, race conditions corrupt outputs, and specialized prompts/domain expertise are bypassed.
- **GAP-07 & GAP-16 (Handoff & Completion Evidence)**: Accepting conversational promises ("I have finished the notes") leads to silent build failures. True completion requires byte-level and schema-level verification on disk.
- **GAP-09 & GAP-10 (Failure Isolation & Targeted Retry)**: In naive pipelines, one card formatting error crashes the entire chapter build. Isolation preserves valid notes and mindmaps while retrying only the broken flashcard deck.
- **GAP-11 & GAP-14 (Duplicate Work & Incremental Execution)**: Re-parsing 100-page textbooks and rebuilding 500-card SQLite decks on every minor edit wastes tokens, memory, and time.
- **GAP-15 & GAP-19 (Dispatch Evidence & Verification Gap)**: Claiming multi-agent orchestration without runtime proof is a critical audit failure. The system must prove that dispatch actually occurred.

---

## Section F: Proposed Minimal Fix

Implement a lightweight, non-bloated **Orchestration & Dispatch Engine (`orchestration_engine.js`)**:

1. **Explicit Task DAG**: Defines tasks with `task_id`, `owner`, `wave`, `inputs`, `outputs`, `dependencies`, `validation_requirement`, and `status` (`PLANNED`, `EXECUTED`, `SKIPPED`, `BLOCKED`, `RETRIED`, `COMPLETED`, `FAILED`).
2. **Single-Writer & Ownership Guard**: Validates before dispatch that each output file has exactly 1 writer and that the parent orchestrator is banned from writing specialist files.
3. **Dispatch & Completion Evidence Engine**: Emits machine-readable `dispatch-trace.json`, `ownership-trace.json`, `handoff-trace.json`, and `completion-evidence.json`.
4. **Handoff Contract Parser**: Programmatically validates the 11-field handoff block from subagents.
5. **Dependency Barrier & Failure Isolation Manager**: Executes Wave 1 tasks in parallel (max 4 concurrent), pauses at the Wave 2 barrier, isolates failures, executes a single targeted retry, and blocks only dependent packaging tasks on persistent failure.
6. **Task-Level Hash Fingerprinting**: Computes composite input hashes to enable true incremental execution and skip duplicate work.

---

## Section G: Files Affected

### 1. New Production Modules
- `.agents/skills/study-source-core/scripts/orchestration_engine.js` (Core vNext Task Graph, Dispatch, Handoff & Completion Engine)

### 2. Updated Production Scripts
- `.agents/skills/study-source-core/scripts/routing_engine.js` (Enhanced CLI JSON stdout and task graph bridge)
- `.agents/skills/study-source-core/scripts/artifact_provenance.js` (Enhanced task fingerprinting and incremental execution)

### 3. Canonical Architecture & Operations Documentation
- `docs/STUDYSOURCECORE_VNEXT_ORCHESTRATION.md` (Target vNext Orchestration Specification)
- `.agents/EXECUTION_LIFECYCLE.md` (Hardened with task graph, handoff contract, and barrier rules)
- `.agents/OWNERSHIP.md` (Single-Writer matrix and Parent Self-Execution Ban)
- `.agents/DATA_FLOW.md` (Updated with explicit task lifecycle and handoff flows)
- `.agents/TROUBLESHOOTING.md` (Updated with dispatch and barrier diagnostics)
- `docs/STUDYSOURCECORE_ARCHITECTURE.md` (Canonical mental model update)
- `docs/STUDYSOURCECORE_DISPATCH_MATRIX.md` (Updated with task IDs and dependency barriers)
- `docs/STUDYSOURCECORE_FAILURE_HANDLING.md` (Hardened failure cascade and retry protocol)
- `docs/STUDYSOURCECORE_EFFICIENCY.md` (Task-level ledger and incremental execution)
- `docs/STUDYSOURCECORE_TEAMWORK_LEARNINGS.md` (Cleaned formatting and updated findings)

### 4. New Test Suites & Quality Artifacts
- `.agents/skills/study-source-core/scripts/test_vnext_orchestration.js` (TEST-01 through TEST-15)
- `.agents/skills/study-source-core/scripts/test_vnext_adversarial.js` (Attacks A through O)
- `.agents/skills/study-source-core/scripts/test_fresh_agent_simulation.js` (12 Canonical Comprehension Questions)
- `artifacts_qa/studysourcecore_vnext/*.json` (7 Machine-Readable Audit Reports)
- `docs/STUDYSOURCECORE_VNEXT_FINAL_AUDIT.md` (Final Verification Report)

---

## Section H: Frozen Components Explicitly Excluded

The following assets are **T1: FROZEN** and strictly untouched:
- Anki Note Models `1600000001` (Basic), `1600000002` (Cloze), `1600000003` (Image Occlusion), `1600000004` (StudyLab Procedural Anchor)
- SQLite database schema structures in `shared_anki_utils.js` and `export_*.js`
- JSON Schema Draft-07 contracts in `.agents/skills/study-source-core/resources/schemas/`
- StudyLab Procedural Level 1–7 validation logic in `validate_studylab_levels_1_6.js`
- 9 Subject Domain Skills in `.agents/skills/study-source-core/subject-skills/`
- Existing valid artifact file formats and bilingual Hindi-first language policies

---

## Section I: Risks & Mitigations

| Risk | Potential Impact | Deterministic Mitigation |
|---|---|---|
| **R1: Architectural Bloat** | Extra layers slow down execution or increase token overhead. | Lightweight single-file engine (`orchestration_engine.js`) using pure JavaScript with zero new external dependencies. |
| **R2: Over-Serialization** | Unnecessary barriers reduce parallel throughput. | Tasks are explicitly tagged by wave. Independent Wave 1 tasks execute concurrently up to concurrency cap ($\le 4$). |
| **R3: Test Regression** | Hardening breaks existing test expectations. | Run existing 111-contract test suite continuously; new orchestration tests run alongside existing tests. |
| **R4: False-Pass on Dispatch** | Parent logs a fake subagent call without actual dispatch. | Verification requires physical task handoff object with unique session GUID and matching filesystem timestamp. |

---

## Section J: Verification Method

The hardening pass will be verified through a 5-pillar validation matrix:
1. **Full Regression Suite**: All 111 contracts in `test_contracts.js` pass with 0 failures.
2. **Orchestration Suite (`test_vnext_orchestration.js`)**: Tests TEST-01 to TEST-15 verify actual dispatch, self-execution ban, task graph dependencies, single-writer enforcement, handoff validation, and incremental execution.
3. **Adversarial Runtime Suite (`test_vnext_adversarial.js`)**: Attacks A through O deliberately trigger invalid behaviors (self-execution, overlapping writes, missing artifacts, stale inputs) and verify deterministic failure interception.
4. **Fresh-Agent Simulation (`test_fresh_agent_simulation.js`)**: Evaluates fresh agent comprehension against 12 canonical questions, proving 0 contradictions.
5. **Efficiency Audit**: 7 JSON reports in `artifacts_qa/studysourcecore_vnext/` prove deduplication, single source read, and zero redundant execution.

---
**Approval Status**: APPROVED FOR IMPLEMENTATION
