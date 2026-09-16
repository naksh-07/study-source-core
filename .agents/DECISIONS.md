# StudySourceCore — Architectural Decision Records (ADRs)

> **Canonical Path**: `.agents/DECISIONS.md`  
> **Index Range**: ADR-01 through ADR-17  
> **Status**: AUTHORITATIVE / CONSOLIDATED

---

## Master ADR Summary Table

| ADR # | Title | Core Invariant Established | Date |
|---|---|---|---|
| **ADR-01** | Single Source of Truth via `scratch/evidence-pack.md` | Cryptographic SHA-256 evidence lineage; zero independent PDF parsing | 2026-08-01 |
| **ADR-02** | Strict Single-Writer Rule & Parent Self-Execution Ban | 1 responsibility = 1 canonical writer; parent forbidden from generating deliverables | 2026-08-03 |
| **ADR-03** | 3-Wave Execution Lifecycle & Hard Resource Caps | Concurrency $\le 4$; total launches $\le 10$; wave separation | 2026-08-05 |
| **ADR-04** | Deterministic Gating & Zero Silent Omission | Explicit track suppressions with auditable reason codes in `routing_manifest.json` | 2026-08-08 |
| **ADR-05** | Hard Layer Isolation: SQLite vs APKG vs Frontend | DB schemas, Anki model IDs `1600000001`–`1600000004`, and runtimes isolated & frozen | 2026-08-10 |
| **ADR-06** | Native Level 1-7 StudyLab Integration | First-class procedural branch; zero secondary orchestrators or circular dispatch | 2026-08-12 |
| **ADR-07** | Source-First Practice Hierarchy & `1 Pattern != 1 Question` | $\text{authentic\_pyq} \succ \text{curated} \succ \text{derived} \succ \text{synthetic}$; distinct questions preserved | 2026-08-15 |
| **ADR-08** | Inviolable MCQ Hard Invariant ($\ge 4$ Options) | Minimum 4 options, 1 correct, meaningful distractors, physical SQLite persistence | 2026-08-18 |
| **ADR-09** | 1-Retry Targeted Correction & Blast Radius Isolation | 1 targeted retry with AJV diagnostics; single-track failure isolation | 2026-08-20 |
| **ADR-10** | Physical Completion Gating & Dual-Language Contract | Byte size $> 0$; SQLite integrity; Hindi-first prose with English technical terms | 2026-08-22 |
| **ADR-11** | Canonical 6-Tier Pipeline & Semantic IR Decoupling | Typed IR is authoritative learning store; renderers are write-only projections | 2026-08-28 |
| **ADR-12** | Preservation & Normalization of 17 Procedural Dimensions | All 17 dimensions normalized into typed IR; zero schema flattening | 2026-08-29 |
| **ADR-13** | 4-Stage Procedural Progression & Interleaving Boundary | Worked Example → Fading → Practice → Transfer; sequencing decoupled to runtime | 2026-08-30 |
| **ADR-14** | Dual APKG Architecture for v1.0 / Unified Target for v1.1 | Model 1600000004 strictly isolated to StudyLab deck; unified APKG in v1.1 | 2026-09-01 |
| **ADR-15** | Fail-Closed Visual Learning Policy | Missing approved local asset triggers explicit suppression (NO_APPROVED_ASSET) | 2026-09-03 |
| **ADR-16** | Content Lineage Record (CLR) Evolution | Source chunk → IR node → rendered card bidirectional cryptographic lineage | 2026-09-05 |
| **ADR-17** | Scope Boundaries & Deferred Runtimes | In-memory/file IR in v1.0; SQLite semantic DB, CLI, and web UI deferred post-v1.0 | 2026-09-07 |

---

## ADR-01: Single Source of Truth via `scratch/evidence-pack.md` & Cryptographic Lineage

### Context
In multi-agent systems, if downstream specialists re-parse raw source documents independently, discrepancies arise due to differing OCR interpretations, chunking strategies, and formatting assumptions. This leads to factual divergence across sibling study deliverables.

### Decision
Extract a single, authoritative `scratch/evidence-pack.md` and `scratch/provenance.json` containing the SHA-256 hash of both the source and the evidence. All Wave 1 subagents must consume this evidence pack exclusively. Direct parsing of source files by subagents is strictly forbidden.

### Consequences
- **Positive**: Absolute cross-artifact factual consistency; zero token waste on redundant document extraction; unambiguous cryptographic audit trail.
- **Negative**: The upstream evidence extraction step must be exhaustive; any omitted formula or fact is unavailable to downstream specialists.

---

## ADR-02: Strict Single-Writer Rule & Parent Self-Execution Ban

### Context
Uncontrolled write access to shared folders or allowing the orchestrator to author artifacts directly leads to file overwrites, unvalidated shortcuts, and broken separation of concerns.

### Decision
Enforce the **Single-Writer Rule**: exactly one designated specialist subagent owns each deliverable file path. Enforce the **Parent Self-Execution Ban**: the parent orchestrator is strictly prohibited from authoring study deliverables; it owns only control-plane coordination, gating, and packaging.

### Consequences
- **Positive**: Eliminates write-collision race conditions; guarantees that every deliverable is synthesized by its dedicated domain expert.
- **Negative**: Requires formal subagent dispatch even for small tasks, adding slight orchestration overhead.

---

## ADR-03: 3-Wave Execution Lifecycle & Hard Resource Caps

### Context
Unbounded concurrent agent spawning can exhaust system memory, cause rate-limit throttling, and lead to race conditions during database compilation.

### Decision
Enforce a 3-wave phased execution lifecycle (Wave 1: Parallel Generation; Wave 2: Sequential Packaging; Wave 3: Post-Packaging Audit). Impose hard resource limits: maximum 4 concurrent subagents, maximum 10 total launches per mission tree, and immediate workforce collapse upon handoff.

### Consequences
- **Positive**: Bounded memory footprint; zero SQLite database lock contention; predictable execution timeline.
- **Negative**: Waves must wait for previous wave completion gates before progressing.

---

## ADR-04: Deterministic Gating & Zero Silent Omission via `routing_engine.js`

### Context
When a source document lacks content for a specific deliverable modality (e.g., no diagrams for Image Occlusion), naive agents might fail, generate empty files, or silently omit the deliverable without explanation.

### Decision
Execute `routing_engine.js` prior to Wave 1. If candidate counts for a track equal 0 (or fall below worthiness thresholds), the track is explicitly suppressed and recorded in `scratch/routing_manifest.json` with an auditable reason code (`ZERO_BASIC_CANDIDATES`, `NO_IO_CANDIDATES`, etc.). Suppressed tracks do not fail the build.

### Consequences
- **Positive**: Transparent, auditable routing decisions; eliminates empty 0-byte files and false-positive build failures.
- **Negative**: Routing heuristics in `routing_engine.js` must be carefully tuned to prevent premature suppression.

---

## ADR-05: Hard Layer Isolation: SQLite vs. APKG Payload vs. Frontend Runtime

### Context
Tightly coupling database storage, Anki deck packaging, and web-based UI rendering leads to brittle systems where a UI change breaks backend data structures.

### Decision
Enforce strict physical layer isolation. SQLite database schemas (`collection.anki2`), Anki Model IDs `1600000001` through `1600000004`, and frontend UI rendering runtimes are decoupled and placed in Tier 1 (`FROZEN`).

### Consequences
- **Positive**: Backward compatibility across all exported APKG decks; guarantees long-term stability of user Anki collections.
- **Negative**: Adding new card fields requires creating a new Anki model ID rather than mutating existing models.

---

## ADR-06: Native Level 1-7 StudyLab Integration without External Orchestrators

### Context
StudyLab was previously treated as an external subsystem requiring separate manual orchestration, causing circular dispatches and fragmented workflows.

### Decision
Integrate StudyLab Procedural Packaging as a first-class native branch within StudySourceCore. The parent evaluates eligibility and dispatches the domain specialist (`math-apkg-author`, `reasoning-apkg-author`, `physics-numerical-apkg-author`, `chemistry-numerical-apkg-author`) directly without intermediate orchestrators.

### Consequences
- **Positive**: Unified build pipeline; single-pass generation of both standard Anki decks and interactive Level 1-7 procedural packages.
- **Negative**: Procedural domain knowledge and schemas must be encapsulated and maintained within dedicated Subject Skills, while StudySourceCore remains a thin orchestration layer.

---

## ADR-07: Source-First Practice Hierarchy & `1 Pattern != 1 Question`

### Context
Automated question generation often succumbs to synthetic hallucination or collapses multiple distinct practice questions into a single generic template.

### Decision
Enforce the Source-First Practice Hierarchy: $\text{authentic\_pyq} \succ \text{curated\_source} \succ \text{derived\_variant} \succ \text{synthetic\_schema}$. Enforce the principle `1 Pattern != 1 Question`: if multiple distinct solvable questions in the source share an underlying mathematical method, all distinct questions must be preserved and assigned discrete card anchors.

### Consequences
- **Positive**: High pedagogical fidelity; preserves authentic exam questions exactly as presented in authorized sources.
- **Negative**: Requires specialists to extract and maintain larger collections of discrete problem instances.

---

## ADR-08: Inviolable MCQ Hard Invariant ($\ge 4$ Options)

### Context
Subagents occasionally generate truncated MCQs (2 or 3 options) or omit distractors, producing malformed cards that fail downstream user assessments.

### Decision
Enforce a hard schema invariant: every MCQ must have at least 4 distinct, non-empty options with exactly 1 correct answer and 3 pedagogically valid distractors. All 4 options must be physically compiled into SQLite note fields (`flds`). Truncated MCQs trigger a hard validation failure.

### Consequences
- **Positive**: Zero malformed multiple-choice cards in exported decks; consistent exam-style practice experience.
- **Negative**: Questions with binary true/false choices must be modeled under dedicated non-MCQ card archetypes.

---

## ADR-09: 1-Retry Targeted Error Correction Protocol & Blast Radius Isolation

### Context
Infinite retry loops waste execution tokens, while immediate pipeline termination on minor formatting errors discards valuable completed work.

### Decision
Enforce a strict 1-Retry Targeted Error Correction protocol. Upon an initial validation failure, the parent provides exact schema diagnostic errors for a single retry attempt. If Attempt 2 fails, the failing track is isolated, valid sibling tracks are preserved, and a Truthful Failure Report is emitted.

### Consequences
- **Positive**: Fast recovery from minor syntax errors; prevents infinite retry loops; isolates failure blast radius.
- **Negative**: If a critical track fails twice, the overall build verdict reflects `PARTIAL_SUCCESS` or `FAILED`.

---

## ADR-10: Physical Verification & Artifact Completion Gating with Dual-Language Contract

### Context
Declaring builds complete based solely on in-memory agent logs leads to silent deployment of 0-byte or corrupted files. Furthermore, language drift (pure English explanations) violates regional pedagogy requirements.

### Decision
Require physical artifact verification (file existence, non-zero bytes, SQLite integrity check, AJV Draft-07 validation) before marking any mission complete. Enforce the Dual-Language Contract: all explanatory prose must be Hindi-first with technical English terms in parentheses `( )`.

### Consequences
- **Positive**: 100% guarantee of deliverable integrity on disk; optimal bilingual learning outcomes for target students.
- **Negative**: Requires strict bilingual checking scripts and physical disk inspection prior to mission completion.

---

## ADR-11: Canonical 6-Tier Architecture & Semantic IR Decoupling from Renderers

### Context
Coupling educational content representation to output formats (Markdown files, TSV decks, Marp presentation slides, and Anki APKG binaries) causes format quirks to leak into pedagogical design. Furthermore, treating human-readable views like `Questions.md` as the primary semantic data store creates ambiguous authority.

### Decision
Establish the canonical six-tier pipeline:
`AUTHORIZED SOURCE → EVIDENCE PACK → SEMANTIC LEARNING IR → PEDAGOGICAL COMPILER → RENDERERS → INDEPENDENT CERTIFICATION`.
The Typed Semantic Learning IR is the sole authoritative representation of learning content. Renderers are strictly downstream, format-specific projections. Under no circumstances may a renderer become a second source of semantic truth. Specifically, `Questions.md` is a rendered view, NOT the canonical question store.

### Consequences
- **Positive**: Complete media independence; identical learning structures can be projected into Anki, Obsidian, NotebookLM, or future web runtimes with zero semantic drift.
- **Negative**: Requires formal compilation steps from Semantic IR into rendered files.

---

## ADR-12: Preservation & Normalization of 17 Procedural Dimensions into Typed IR

### Context
Naively flattening procedural STEM problem types into simple Question-Answer pairs destroys essential cognitive metadata (solution DAGs, decision rules, common misconceptions, parameter domains, and verification checks).

### Decision
Preserve all seventeen canonical procedural dimensions established in `studylab-procedural-schema.json` and `studylab-procedural-contract.md` (`problem_family`, `problem_type`, `deep_structure`, `recognition_signals`, `representation`, `governing_method`, `decision_points`, `common_traps`, `verification_rules`, `difficulty_dimensions`, `variation_opportunities`, `transfer_opportunities`, `error_categories`, `prerequisites`, `representative_examples`, `pyq_references`, `parameter_domains`). Normalize these dimensions into the Typed Semantic Learning IR rather than discarding them.

### Consequences
- **Positive**: Maintains high-order pedagogical intelligence; powers 3-tier hints, diagnostic error logging, and dynamic parameter variation.
- **Negative**: Requires procedural specialist agents to populate detailed JSON schemas.

---

## ADR-13: 4-Stage Procedural Learning Progression & Separation of Interleaving

### Context
Expecting students to solve complex numerical or deductive problems through unguided active retrieval causes working memory overload. Conversely, hardcoding interleaved problem sequences into static chapter decks limits practice adaptability.

### Decision
Enforce the 4-Stage Procedural Progression across all procedural learning items:
`Worked Example (Schema Acquisition) → Faded Completion (Guided Practice) → Independent Practice (Full Retrieval) → Transfer (Boundary Generalization)`.
Separate interleaving responsibilities: authoring-time tools produce problem patterns, recognition signals, and confusion pairs; runtime schedulers manage the dynamic interleaving of problem sequences during review sessions. Fixed review intervals (e.g., arbitrary `1/3/7/21/60` schedules) are strictly forbidden.

### Consequences
- **Positive**: Optimal cognitive load management; structured transition from novice to expert; flexible runtime practice scheduling.
- **Negative**: Increases authoring volume per problem family to cover all 4 instructional stages.

---

## ADR-14: Dual APKG Architecture for v1.0 and Unified APKG Target for v1.1

### Context
Merging Declarative Anki flashcard models (Basic `1600000001`, Cloze `1600000002`, Image Occlusion `1600000003`) with the interactive StudyLab Procedural Anchor model (`1600000004`) in v1.0 risks schema pollution and breaking changes in legacy user collections.

### Decision
Maintain a strict Dual APKG architecture for v1.0:
1. `<Chapter>_Anki.apkg`: Houses strictly Models `1600000001`, `1600000002`, and `1600000003`.
2. `StudyLab/<Chapter>_StudyLab_Procedural.apkg`: Houses strictly Model `1600000004`.
Model 1600000004 cards are strictly forbidden from declarative packages. A Unified APKG consolidating both models without breaking isolation is established as an explicit **v1.1 milestone target**.

### Consequences
- **Positive**: Zero risk of model collision or corruption in v1.0; clean backward compatibility with standard Anki desktop and mobile apps.
- **Negative**: Students import two discrete APKG files per STEM chapter in v1.0.

---

## ADR-15: Fail-Closed Visual Learning Policy (No Unapproved Asset Generation)

### Context
Allowing agents to synthesize ungrounded AI diagrams or fall back to generic stock images for technical, anatomical, or cartographic topics produces misleading, factually inaccurate study materials.

### Decision
Enforce a strict Fail-Closed policy for visual learning: Image Occlusion and cartographic map artifacts require a verified, approved local asset residing in the designated chapter drop folder with a matching SHA-256 hash. If no approved local asset exists, the track fails closed immediately with the explicit suppression code `NO_APPROVED_ASSET`. Synthetic AI diagram generation for technical or map learning is strictly prohibited.

### Consequences
- **Positive**: 100% diagram factual accuracy; zero visual hallucination.
- **Negative**: Image Occlusion cards are omitted for chapters lacking approved local image files.

---

## ADR-16: Content Lineage Record (CLR) Evolution for Deep Provenance

### Context
Simple top-level SHA-256 checksums on whole files confirm that a file has not changed, but fail to prove that a specific generated card or formula originated from a specific page, paragraph, or equation in the source textbook.

### Decision
Evolve provenance verification from flat document SHA-256 checks to fine-grained Content Lineage Records (CLRs). Every Knowledge Unit in the Semantic IR, and every rendered flashcard or question, must record a bidirectional lineage mapping: `source_chunk_id → IR_node_id → deliverable_card_id`, capturing source page offsets and exact text fingerprints.

### Consequences
- **Positive**: Unambiguous auditability; instant tracing of any student-reported defect back to the exact textbook passage; automated zero-fabrication verification.
- **Negative**: Requires extraction and compiler tooling to generate and track fine-grained chunk IDs.

---

## ADR-17: Scope Boundaries & Deferred Runtimes (SQLite Semantic DB & Web UI Post-v1.0)

### Context
Attempting to implement a centralized relational semantic database, an interactive desktop terminal CLI, and a browser-based StudyLab web application concurrently with the core multi-agent engine causes architectural thrashing and delays core stability.

### Decision
Formally defer the following components to post-v1.0 horizons:
1. SQLite as the authoritative persistent semantic store (`procedural.db`): In v1.0, the Semantic IR is persisted via validated JSON files (`scratch/`, `Optional/`) and verified in memory.
2. Interactive Student CLI and Web StudyLab Runtime: In v1.0, delivery targets are exclusively self-contained Anki `.apkg` packages and Obsidian Markdown vaults.
3. Multi-user state synchronization and live telemetry: Strictly post-v1.0.

### Consequences
- **Positive**: Laser focus on rock-solid multi-agent orchestration, pedagogical compilation, and flawless binary packaging for v1.0.
- **Negative**: Interactive in-browser practice and centralized querying require post-v1.0 releases.

