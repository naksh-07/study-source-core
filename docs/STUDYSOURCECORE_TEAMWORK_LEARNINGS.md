# StudySourceCore: Teamwork Reverse-Engineering & Multi-Agent Learnings

## Executive Overview

This document presents the reverse-engineering analysis of the official **Teamwork Preview / Adaptive Orchestrator v4 Foundation** multi-agent orchestration patterns and documents their systematic application to **StudySourceCore**.

The goal of StudySourceCore orchestration is to achieve **deterministic, evidence-driven, non-duplicative, and verifiable artifact delivery** across generic study materials (Notes, Basic/Cloze Anki, Image Occlusion, MindMap, SlideDeck) and StudyLab procedural packages.

---

## 1. Analysis Across 14 Multi-Agent Orchestration Dimensions

| # | Dimension | Teamwork Preview Reference Pattern | StudySourceCore Pattern | Classification | Architectural Justification |
|---|---|---|---|---|---|
| **1** | **Task Decomposition** | Breaks user goals into decoupled, domain-specific tracks with explicit sub-goals. | Decomposes raw source into independent cognitive layers (Notes, Flashcards, Maps, Slides, Practice Decks). | **KEEP** | Domain decomposition maps directly to educational cognitive layers without over-fragmentation. |
| **2** | **Specialist Selection** | Matches task requirements to pre-registered domain agents using capability metadata. | Routes subject domain (Maths, Physics, Chem, Reasoning) to specialized authors (`math-apkg-author`, etc.). | **KEEP** | Specialist skills maintain deep domain models without polluting generic note generation. |
| **3** | **Dispatch Gating** | Pre-planning and post-planning gates; prohibits tool calls or execution before dispatch criteria check. | Mandatory Dispatch Gate evaluates candidate counts, visual profile, and complexity thresholds before invoking agents. | **IMPROVE** | Hardened to eliminate silent omissions: if an artifact is eligible, dispatch is mandatory, else explicit suppression is recorded. |
| **4** | **Parallel vs Sequential** | Parallelizes independent exploratory lanes; serializes shared-state writes and verification waves. | Parallelizes sibling artifact extraction (`Notes`, `Basic`, `Cloze`, `MindMap`, `SlideDeck`), serializes packaging & QA. | **KEEP** | Artifact files are disjoint per directory (`Notes/`, `MindMap/`, `StudyLab/`), enabling safe parallel generation. |
| **5** | **Ownership Boundaries** | Strict single-writer rule per module; disjoint directory scopes prevent filesystem write collisions. | Each specialist exclusively owns its target deliverable (e.g. `core-notes` owns `Notes/[Chapter]_Notes.md`). | **IMPROVE** | Codified in all 14 agent definition files with explicit `OWNS` and `DOES NOT OWN` boundary clauses. |
| **6** | **Structured Handoffs** | Standardized markdown/JSON handoff block returning status, findings, risks, and outputs. | Standardized 9-field Handoff Block (`STATUS`, `AGENT`, `INPUT`, `OUTPUT`, `PATH`, `VALIDATION`, `WARNINGS`, `SUPPRESSIONS`, `DEPENDENCIES`). | **IMPROVE** | Enforces machine-parseable status so the parent never assumes completion from unstructured prose. |
| **7** | **Shared Context** | Centralized project brief and shared blackboard; prevents subagents from doing duplicate discovery. | Single Canonical Evidence Pack (`scratch/evidence-pack.md`); extracted once from source by orchestrator. | **IMPROVE** | Upstream single-read policy eliminates redundant PDF parsing across 14 specialist invocations. |
| **8** | **Result Aggregation** | Parent synthesizes specialist deliverables and compiles consolidated deliverable manifest. | `artifact_provenance.js` aggregates hashes, card counts, and file paths into `artifact-manifest.json`. | **KEEP** | Provides complete cryptographic lineage and traceable build history. |
| **9** | **Failure Propagation** | Blast-radius containment: isolated worker failure does not crash unrelated lanes; blocks final signoff. | Partial execution preserves valid sibling artifacts while marking the failed branch as `BLOCKED` / `FAILED`. | **IMPROVE** | Strict anti-false-pass rule: any failed expected artifact triggers overall verification `FAIL`. |
| **10** | **Retry Behavior** | Max 1 targeted retry with diagnostic error context before declaring failure; no infinite retry loops. | 1 targeted retry with schema error details; aborts on second failure and flags for human review. | **KEEP** | Prevents token runaway and infinite loops on broken source material. |
| **11** | **Completion Criteria** | Objective, checkable conditions (tests pass, files exist, schema validates) rather than self-certification. | Physical Artifact Completion Gate: File existence + non-empty + schema validation + provenance check. | **IMPROVE** | Prohibits "looks good" self-certification; requires physical disk and SQLite database assertions. |
| **12** | **Evidence Requirements** | Claims must cite line numbers, AST nodes, or execution outputs. | Cards and problem patterns must cite source lines/sections and preserve authentic provenance. | **KEEP** | Grounded study content prevents hallucinated facts and synthetic question distortion. |
| **13** | **Deduplication** | In-memory caching and content hashing to avoid repeating expensive parser/AST passes. | Single source parse + in-memory AST/text buffer + hash-based change detection. | **IMPROVE** | Full computation ledger categorizing work into `REQUIRED`, `VALIDATION`, `ACCEPTABLE`, and `REDUNDANT`. |
| **14** | **Subagent Lifecycle** | Aggressive workforce collapse: subagents terminated or idled immediately after handoff; max concurrency caps. | Strict caps: Max 4 concurrent subagents, max 10 launches per mission, instant collapse on handoff receipt. | **KEEP** | Matches Antigravity resource governance limits to prevent credit exhaustion. |

---

## 2. Detailed Classification & Adoption Ledger

### A. Patterns Adopted & Improved (`IMPROVE`)

1. **Mandatory Dispatch Gating with Zero Silent Omissions**:
   - *Problem in naive orchestration*: Orchestrators sometimes skip MindMaps or StudyLab decks without documenting why.
   - *Teamwork Learning*: Gating must be an explicit, deterministic evaluation.
   - *StudySourceCore Rule*: The routing engine (`routing_engine.js`) evaluates candidate counts and writes explicit suppression codes (e.g. `NO_RELATIONAL_TOPOLOGY`, `ZERO_SOLVABLE_PRACTICE_QUESTIONS`) to `artifact-manifest.json`.

2. **Single Canonical Evidence Pack**:
   - *Problem in naive orchestration*: Each specialist independently loads and re-parses the large source PDF/textbook.
   - *Teamwork Learning*: Upstream coordinator parses the raw input once and publishes an immutable evidence pack.
   - *StudySourceCore Rule*: Raw source is ingested once into `scratch/evidence-pack.md` containing extracted facts, visual descriptions, formulas, and authentic questions. All 14 specialists consume this single surface.

3. **Physical Artifact Completion Gate**:
   - *Problem in naive orchestration*: Parent reports success because an agent returned text, even if the file on disk was corrupted or missing.
   - *Teamwork Learning*: Acceptance criteria must be objectively verified by programmatic tools.
   - *StudySourceCore Rule*: Verification script checks: `File Exists` + `Size > 0` + `Schema Passes` + `APKG SQLite Integrity Valid` + `Evidence Hash Matches`.

4. **Structured Handoff Contracts**:
   - *Problem in naive orchestration*: Subagents return conversational text, making it difficult for the parent to reliably detect missing artifacts.
   - *Teamwork Learning*: Strict schema-defined handoff blocks.
   - *StudySourceCore Rule*: All 14 agents must return the 9-field markdown block.

---

### B. Patterns Kept Unchanged (`KEEP`)

1. **Independent Sibling Parallelism**:
   - Generic study artifacts (`Notes/`, `Basic/`, `Cloze/`, `MindMap/`, `SlideDeck/`, `StudyLab/`) write to separate directories. Spawning parallel specialists for these independent lanes is safe and optimal.

2. **Cryptographic Artifact Provenance**:
   - Manifest tracking with SHA-256 evidence hashes and artifact lineage ensures build reproducibility.

3. **Adaptive Hard Resource Caps**:
   - Global limits of max 4 concurrent agents and max 10 total launches prevent runaway execution.

---

### C. Patterns Rejected / Not Applicable (`NOT APPLICABLE` / `REMOVE`)

1. **Massive Swarm Routing (100+ agents)**:
   - *Why Rejected*: High-school/exam study notes have clean, well-bounded scope (1 chapter = 5–8 artifacts). Spawning dozens of micro-agents introduces coordination overhead with zero quality gain.

2. **Recursive Hierarchical Delegation (> 3 levels)**:
   - *Why Rejected*: A 2-tier tree (Parent Orchestrator $\to$ 14 Specialist Subagents) is optimal. Sub-delegation inside specialists creates hidden latencies and debugging complexity.

3. **Dynamic Schema Morphing**:
   - *Why Rejected*: Product schemas (Anki model, Note format, MindMap JSON, StudyLab procedural contract) are **FROZEN**. Orchestration conforms to schemas; schemas do not change dynamically.

---

## 3. Summary of Future Improvements (Post-Freeze)

The following items are cataloged for future research but are strictly out of scope for the current frozen production release:
- Real-time collaborative canvas rendering for MindMaps in web browser runtime.
- Multi-modal audio flashcard export using neural text-to-speech models.
- Cross-vault knowledge graph semantic clustering across multiple separate subjects.
> **Canonical Terminology**: See [OWNERSHIP.md#1-architectural-principles-of-ownership](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/OWNERSHIP.md#1-architectural-principles-of-ownership) for the authoritative Single-Writer Rule, Parent Self-Execution Ban, and dispatch terminology definitions.