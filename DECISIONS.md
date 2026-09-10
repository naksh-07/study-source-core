# StudySourceCore — Architectural Decision Records (ADRs)

> **Canonical Path**: `.agents/DECISIONS.md`  
> **Index Range**: ADR-01 through ADR-10  
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
