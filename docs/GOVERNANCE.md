# StudySourceCore Governance Model (`docs/GOVERNANCE.md`)

## 1. Overview & Purpose

StudySourceCore is a multi-agent system coordinating 14 specialized subagents across 9 canonical academic domains, producing durable learning artifacts in Obsidian Markdown, Anki APKG packages (using internal SQLite format), and canonical Semantic Learning Intermediate Representations (IR).

To prevent configuration drift, conflicting instructions, duplicate schema definitions, and cognitive confusion across human contributors and AI agents, StudySourceCore enforces a **strict, multi-tiered governance model**.

---

## 2. Documentation Authority Hierarchy

All documents in the repository belong to exactly one tier in the authority hierarchy. When a contradiction or ambiguity arises between two documents, the document in the higher tier strictly supersedes the document in the lower tier.

```
+---------------------------------------------------------------------------------+
| TIER 0: Master Architectural Anchors (Root Governance)                          |
|   PRODUCT.md        - Product Identity, Principles, Non-Goals, Boundaries       |
|   ARCHITECTURE.md   - 6-Tier Architecture, Subsystems, Invariants, Matrix       |
|   ROADMAP.md        - 11 Implementation Phases (Phases 0-10), Release Gates     |
+----------------------------------------+----------------------------------------+
                                         |
                                         v (governs)
+---------------------------------------------------------------------------------+
| TIER 1: Canonical Technical Specifications (`docs/`)                            |
|   LEARNING_PRINCIPLES.md           ORCHESTRATION_AND_EXECUTION.md               |
|   SUBJECT_POLICIES.md              RENDERING_PIPELINE.md                        |
|   STUDYLAB_SPECIFICATION.md        ANKI_INTEGRATION.md                          |
|   KNOWLEDGE_UNITS.md               SECURITY_AND_TRUST.md                        |
|   VISUAL_LEARNING.md               GOVERNANCE.md                                |
|   PROVENANCE_AND_LINEAGE.md        GAP_REGISTER.md                              |
|   VALIDATION_AND_CERTIFICATION.md  CURRENT_IMPLEMENTATION.md                    |
+----------------------------------------+----------------------------------------+
                                         |
                                         v (governs)
+---------------------------------------------------------------------------------+
| TIER 2: Machine Contracts, Agents & Operational Schemas (`.agents/`)            |
|   .agents/AGENTS.md                - Master Subagent Index & 14-Section Template|
|   .agents/RESOURCES.md             - Master Resource & Schema Registry          |
|   .agents/DECISIONS.md             - Architecture Decision Records (ADR-01..17) |
|   .agents/FREEZE_MAP.md            - Modification Freeze Registry               |
|   .agents/agents/*.md              - 14 Individual Specialist Subagent Prompts  |
|   skills/study-source-core/resources/*.json - Canonical JSON Schemas            |
|   skills/study-source-core/subject-skills/*/SKILL.md - Domain DNA Skills        |
+----------------------------------------+----------------------------------------+
                                         |
                                         v (reference only)
+---------------------------------------------------------------------------------+
| TIER 3: Historical Audits, Exploratory Research & Archives                      |
|   docs/STUDYSOURCECORE_*           - Historical Research & Architectural Audits |
|   docs/AGENTS_DOCUMENTATION_*      - Historical Subagent Audits                 |
|   docs/STUDYSOURCECORE_TEAMWORK_*  - Legacy Teamwork Findings & Postmortems     |
+---------------------------------------------------------------------------------+
```

### Authority Resolution Rules
1. **Tier 0 Supremacy**: If any file contradicts `PRODUCT.md`, `ARCHITECTURE.md`, or `ROADMAP.md`, the conflicting file is in violation and must be updated.
2. **Tier 1 Authority**: Technical specifications in `docs/` are the authoritative reference for specific subsystems (e.g. `docs/SUBJECT_POLICIES.md` owns the Subject $\times$ Artifact matrix; `docs/ANKI_INTEGRATION.md` owns Anki model IDs).
3. **Tier 2 Operational Alignment**: Agent prompts (`.agents/agents/*.md`) and JSON schemas must adhere to Tier 1 specifications. Agents must not invent independent requirements.
4. **Tier 3 Non-Authoritative Status**: Historical audits and legacy docs are read-only references. They provide historical rationale but hold zero normative authority.

---

## 3. The Single-Rule Ownership Principle

**Every operational rule, numerical threshold, schema constraint, or architectural invariant must have exactly ONE canonical owner file.**

### Rules:
1. **No Duplication of Normative Rules**: A document must never restate or copy a full specification owned by another document. It must provide a hyperlinked cross-reference.
### 3.1 The Master Authority Matrix

| # | Rule / Subsystem Domain | Canonical Document (Primary Owner) | Secondary References | Implementation Source | Test Source | Status |
|---|---|---|---|---|---|---|
| 1 | Product Identity & Non-Goals | [`PRODUCT.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/PRODUCT.md) | `README.md`, `ARCHITECTURE.md` | Product Charters | `test_change_isolation.js` | `[CURRENT]` |
| 2 | 6-Tier Architecture & Boundaries | [`ARCHITECTURE.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/ARCHITECTURE.md) | `PRODUCT.md`, `docs/GOVERNANCE.md` | Core Pipeline Engine | `test_orchestration.js` | `[CURRENT]` |
| 3 | 11-Phase Implementation Roadmap | [`ROADMAP.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/ROADMAP.md) | `docs/GAP_REGISTER.md` | Project Lifecycle | Release Gates | `[CURRENT]` |
| 4 | Cognitive Load & Pedagogy | [`docs/LEARNING_PRINCIPLES.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/LEARNING_PRINCIPLES.md) | `docs/STUDYLAB_SPECIFICATION.md` | Compiler Logic | ADV-04, ADV-08 | `[TARGET]` |
| 5 | Subject Policies (9 Subjects) | [`docs/SUBJECT_POLICIES.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/SUBJECT_POLICIES.md) | `.agents/RESOURCES.md` | `subject_policy_resolver.js` | `test_subject_policy_resolver.js`| `[CURRENT]` |
| 6 | StudyLab Procedural 17 Dimensions| [`docs/STUDYLAB_SPECIFICATION.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/STUDYLAB_SPECIFICATION.md)| `ARCHITECTURE.md` | `author_*_studylab.js` | `test_studylab_question_bank.js` | `[CURRENT]` |
| 7 | Knowledge Units & Deduplication | [`docs/KNOWLEDGE_UNITS.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/KNOWLEDGE_UNITS.md) | `ARCHITECTURE.md` | KU Reservation Engine | Dedup Validators | `[TARGET]` |
| 8 | Visual Learning & IO Masks | [`docs/VISUAL_LEARNING.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/VISUAL_LEARNING.md) | `docs/SUBJECT_POLICIES.md` | `validate_image_occlusion.js` | `test_visual_asset_pipeline.js` | `[CURRENT]` |
| 9 | Provenance Hierarchy & CLR | [`docs/PROVENANCE_AND_LINEAGE.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/PROVENANCE_AND_LINEAGE.md)| `docs/SECURITY_AND_TRUST.md` | `artifact_provenance.js` | `test_artifact_registry.js` | `[CURRENT/TARGET]`|
| 10 | Quality Stages & ADV-01..15 | [`docs/VALIDATION_AND_CERTIFICATION.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/VALIDATION_AND_CERTIFICATION.md)| `docs/GAP_REGISTER.md` | `validate_*.js` | `test_phase8_independent_verification.js`| `[CURRENT/TARGET]`|
| 11 | Subagent DAGs & Concurrency | [`docs/ORCHESTRATION_AND_EXECUTION.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/ORCHESTRATION_AND_EXECUTION.md)| `.agents/AGENTS.md` | `orchestration_engine.js` | `test_orchestration.js` | `[CURRENT]` |
| 12 | Format Renderers & Projection | [`docs/RENDERING_PIPELINE.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/RENDERING_PIPELINE.md) | `ARCHITECTURE.md` | `render_studylab_question_bank.js`| `test_studylab_question_bank.js`| `[CURRENT/TARGET]`|
| 13 | Anki Packaging & Model IDs | [`docs/ANKI_INTEGRATION.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/ANKI_INTEGRATION.md) | `docs/STUDYLAB_SPECIFICATION.md`| `export_anki.js` | `test_regression.js` | `[CURRENT]` |
| 14 | Zero-Trust Security & Pathing | [`docs/SECURITY_AND_TRUST.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/SECURITY_AND_TRUST.md) | `docs/GOVERNANCE.md` | `path_resolver.js` | Path Containment Tests | `[CURRENT]` |
| 15 | Governance, ADRs & Single-Rule | [`docs/GOVERNANCE.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/GOVERNANCE.md) | All Documents | Governance Board | `test_change_isolation.js` | `[CURRENT]` |
| 16 | Known Discrepancies & Gaps | [`docs/GAP_REGISTER.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/GAP_REGISTER.md) | `ROADMAP.md` | Issue Tracking | Gating Assertions | `[CURRENT]` |
| 17 | Baseline State & Test Status | [`docs/CURRENT_IMPLEMENTATION.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/CURRENT_IMPLEMENTATION.md)| `README.md` | Repository Scripts | `npm test` (18/18) | `[CURRENT]` |
| 18 | Specialist Subagents (14 Agents)| [`.agents/AGENTS.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/.agents/AGENTS.md) | `.agents/agents/*.md` | Subagent Prompts | `test_vnext_orchestration.js` | `[CURRENT]` |

---

## 4. Research-to-Decision Traceability Matrix

Every architectural rule in StudySourceCore traces directly back to empirical research findings and adversarial audits:

| # | Research Finding / Audit Principle | Architectural Decision | Authoritative Document | Implementation Consequence | Target Phase |
|---|---|---|---|---|---|
| 1 | **Cognitive Overload & Anki Fatigue**: Unbounded flashcard volume causes review collapse. | **ADR-08**: Sustainable review quotas; fail-closed card suppression. | [`docs/LEARNING_PRINCIPLES.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/LEARNING_PRINCIPLES.md) | Low-yield basic cards suppressed; max 15 IO masks per image. | Phase 4 / 5 |
| 2 | **Multi-Format Divergence**: Separate prompt passes cause notes to contradict flashcards. | **ADR-01**: 6-Tier Architecture & Canonical Semantic Learning IR. | [`ARCHITECTURE.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/ARCHITECTURE.md) | Single canonical evidence pack $\to$ Semantic IR $\to$ multi-renderers. | Phase 1 |
| 3 | **Markdown Coupling Hazard**: Markdown mixes visual styling with content semantics. | **ADR-02**: Markdown is a rendered projection, never canonical store. | [`docs/RENDERING_PIPELINE.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/RENDERING_PIPELINE.md) | `Questions.md` & `Notes.md` generated deterministically from IR. | Phase 5 / 7 |
| 4 | **Anki Decoupling**: Anki is a presentation runtime, not semantic knowledge storage. | **ADR-01 & ADR-17**: Anki as downstream renderer; Model IDs 1600000001–4. | [`docs/ANKI_INTEGRATION.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/ANKI_INTEGRATION.md) | Anki database schemas isolated from canonical educational content. | Phase 8 |
| 5 | **Information Atomicity & Collision**: Sibling tracks test identical facts redundantly. | **ADR-11**: Knowledge Unit (KU) reservations & deduplication. | [`docs/KNOWLEDGE_UNITS.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/KNOWLEDGE_UNITS.md) | Cross-track fact reservation prevents duplicate card authoring. | Phase 3 |
| 6 | **Procedural Problem Flattening**: 1 Pattern != 1 Question. Rote cards kill problem solving. | **ADR-04**: Preserves all 17 procedural dimensions in StudyLab schema. | [`docs/STUDYLAB_SPECIFICATION.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/STUDYLAB_SPECIFICATION.md)| 1 pattern compiles to Worked, Faded, Independent, Transfer items. | Phase 1 / 7 |
| 7 | **Hint Answer Leakage**: Clumsy hints reveal answers, reducing cognitive retrieval. | **ADR-04 & ADV-04**: Terminal answer immunity across all 3 hint tiers. | [`docs/LEARNING_PRINCIPLES.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/LEARNING_PRINCIPLES.md) | Tier 3 allows intermediate setups; ADV-04 verifies 0 final leaks. | Phase 1 / 9 |
| 8 | **Blocked vs Interleaved Practice**: Solving blocked identical problems degrades exam recall. | **ADR-04**: Interleaving strategy across problem families. | [`docs/LEARNING_PRINCIPLES.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/LEARNING_PRINCIPLES.md) | StudyLab items sequenced across distinct problem families. | Phase 4 / 8 |
| 9 | **Domain Epistemic Mismatch**: Generic card blends fail domain-specific learning. | **ADR-09**: Canonical 9-Subject Policy Matrix & suppression codes. | [`docs/SUBJECT_POLICIES.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/SUBJECT_POLICIES.md) | Biology gets IO/terms; Math gets procedural DAGs; History gets timelines. | Phase 3 |
| 10 | **Hallucinated Visual Diagrams**: AI image gen creates inaccurate maps and diagrams. | **ADR-10**: 9-stage visual pipeline with fail-closed drop-folder rule. | [`docs/VISUAL_LEARNING.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/VISUAL_LEARNING.md) | Authentic textbook assets only; `NO_APPROVED_ASSET` suppression. | Phase 6 |
| 11 | **Synthetic Masquerade Hazard**: Fake questions masquerading as authentic PYQs. | **ADR-03**: 4-Tier Provenance & 11-field Content Lineage Records (CLR). | [`docs/PROVENANCE_AND_LINEAGE.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/PROVENANCE_AND_LINEAGE.md)| SHA-256 chunk hash required; synthetic items explicitly tagged. | Phase 2 |
| 12 | **LLM Confirmation Bias**: Authors cannot impartially certify their own outputs. | **ADR-05**: Generation != Certification; independent adversarial harness. | [`docs/VALIDATION_AND_CERTIFICATION.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/VALIDATION_AND_CERTIFICATION.md)| `adversarial-apkg-reviewer` runs ADV-01..15; LLM cannot override. | Phase 9 |
| 13 | **Orchestration Loop Chaos**: Unbounded subagent spawning exhausts host resources. | **ADR-07**: Max 4 concurrent, max 10 total launches, 1-retry budget. | [`docs/ORCHESTRATION_AND_EXECUTION.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/ORCHESTRATION_AND_EXECUTION.md)| Strict process governance prevents runaway agent spawning. | Phase 10 |
| 14 | **Host System Vulnerabilities**: Untrusted formulas or escaped paths compromise host. | **ADR-15**: Zero-trust inputs, path containment, zero `eval()`. | [`docs/SECURITY_AND_TRUST.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/SECURITY_AND_TRUST.md) | Mathematical AST tokenization; path boundaries asserted strictly. | Phase 10 |
| 15 | **Packaging Regressions**: Over-eager single APKG packaging risks broken imports. | **ADR-17**: Dual APKG for v1.0 stability; Unified APKG deferred to v1.1. | [`docs/ANKI_INTEGRATION.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/docs/ANKI_INTEGRATION.md) | Declarative and procedural decks isolated; 0 schema collision risk. | Phase 8 / v1.1 |
| 16 | **Centralized DB Premature Burden**: Forcing SQLite as system DB adds heavy overhead. | **ADR-01 & ADR-17**: SQLite deferred to post-v1.0; used only in APKGs. | [`PRODUCT.md`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/PRODUCT.md) | File-based JSON IR for v1.0; relational SQLite DB post-v1.0. | Post-v1.0 |

---

## 4. Current vs Target Notation Standard

To prevent confusion between what the codebase does today versus what is planned for future phases, all technical documentation, code comments, and design specs must use explicit temporal tagging:

| Tag | Formal Definition | Usage Context |
|---|---|---|
| `[CURRENT]` | **Active Implementation Reality**. Exists in the codebase today, is actively executed, and passes verification. | Active scripts in `scripts/`, existing schemas, current tests. |
| `[TARGET]` | **Target Architecture**. Approved design to be implemented in Phases 1–10 of the active roadmap. | Semantic Learning IR specifications, Content Lineage Records, Question Bank renderer. |
| `[DEFERRED]` | **Scheduled for Post-v1.0 Milestone**. Formally accepted concept postponed to prevent v1.0 disruption. | Unified APKG packaging (deferred to v1.1 via ADR-17), cloud sync. |
| `[HISTORICAL]` | **Superseded / Deprecated Design**. Retained strictly for archival context and decision provenance. | Direct Markdown-as-source assumptions, old Teamwork orchestration scripts. |

### Rule:
If a section or paragraph describes future architecture without marking it `[TARGET]` or `[DEFERRED]`, it is considered a documentation defect.

---

## 5. Architectural Decision Record (ADR) Protocol

Any substantial change to architecture, data structures, pipeline stages, agent boundaries, or file formats requires an accepted Architecture Decision Record (ADR) in `.agents/DECISIONS.md`.

### 5.1 When an ADR is Required:
- Introducing, altering, or deprecating a JSON schema or data format.
- Adding, removing, or redefining any of the 14 specialist subagents.
- Changing the Subject $\times$ Artifact policy matrix.
- Changing the packaging model (e.g. Dual APKG vs Unified APKG).
- Modifying security constraints, path resolution, or privilege boundaries.
- Adding a new external dependency to `package.json`.

### 5.2 ADR Lifecycle
```
PROPOSED  -->  ACCEPTED  -->  SUPERSEDED
     |             |
     v             v
  REJECTED     DEFERRED
```

### 5.3 Required ADR Structure
Every ADR in `.agents/DECISIONS.md` must follow the standard 6-field schema:
1. **Title**: `ADR-XX: <Clear Descriptive Title>`
2. **Date & Status**: Date and status (`ACCEPTED`, `PROPOSED`, `SUPERSEDED`, `DEFERRED`).
3. **Context**: The engineering challenge, pedagogical requirement, or system limitation being addressed.
4. **Decision**: The precise technical choice made, including data structures, file locations, and invariant rules.
5. **Consequences**:
   - *Positive*: Benefits gained.
   - *Trade-offs / Costs*: Additional complexity, performance overhead, or maintenance costs.
6. **Compliance Verification**: How automated tests or validators verify adherence to this decision.

---

## 6. Schema & Contract Evolution Protocol

JSON Schemas under `skills/study-source-core/resources/*.json` define machine contracts for data interchange across agents, compilers, and renderers.

### Rules for Schema Changes:
1. **Semantic Versioning**: All schemas must define a `$schema` and `version` property following SemVer (`MAJOR.MINOR.PATCH`).
   - `PATCH`: Documentation fixes, description clarifications, non-semantic comment updates.
   - `MINOR`: Adding optional fields, expanding enum choices backward-compatibly.
   - `MAJOR`: Removing fields, renaming fields, tightening validation rules, or altering required properties.
2. **Validator Pre-requisite**: No schema modification may be committed without simultaneously updating or adding automated test coverage in `scripts/test_contracts.js` or `scripts/test_studylab_question_bank.js`.
3. **Vault Backward Compatibility**: Obsidian study vaults and existing Anki collections are durable personal assets. Schemas must never make existing user vaults unreadable. Breaking changes require automated migration scripts.

---

## 7. Subagent Governance & 14-Section Compliance

All 14 specialist subagents under `.agents/agents/*.md` are governed by strict contractual standards:

1. **Single-Writer Rule**: Exactly one agent owns write permissions for any given file.
2. **Parent Self-Execution Ban**: The orchestrator coordinates, routes, and gates, but never generates chapter content or specialist deliverables directly.
3. **14-Section Mandatory Template**: Every agent definition file must contain all 14 standard sections in exact numerical order (Role, Why Exists, Owns, Does Not Own, Input, Required Context, Invocation Trigger, Process, Output, Handoff Format, Validation, Failure Conditions, Duplication Guard, Examples).
4. **No Direct Execution of External Tools**: Generic Content and Procedural specialists are restricted to their designated file and memory operations.

---

## 8. Historical Document Policy

The repository contains numerous historical research notes, audit logs, and experimental orchestration documents under `docs/STUDYSOURCECORE_*` and `docs/AGENTS_DOCUMENTATION_*`.

### Retention & Integrity Rules:
1. **Read-Only Preservation**: Historical files are never deleted; they serve as archaeological proof and institutional memory of architectural evolution.
2. **Prominent Status Disclaimer**: Every historical document must contain a top-level disclaimer alerting human and AI readers to its archival status:
   ```markdown
   > [!NOTE]
   > **HISTORICAL ARCHIVE**: This document is an archival research record and does NOT represent the current authoritative architecture. For current architecture, refer to `ARCHITECTURE.md` and `PRODUCT.md`.
   ```
3. **No Active Linking from Production Paths**: Active production workflows, subagent prompts, and CI scripts must never reference historical documents as authoritative guidelines.

---

## 9. Governance Enforcement & Audit Points

| Governance Check | Tool / Mechanism | Frequency | Consequence of Failure |
|---|---|---|---|
| Single-Writer Compliance | `scripts/test_orchestration.js` | Every `npm test` run | Build failure / test block |
| Schema Contract Validity | `scripts/test_contracts.js` | Every `npm test` run | Build failure / test block |
| Authority Drift Audit | `scripts/test_change_isolation.js` | Every commit | Rejection of unauthorized edits |
| 14-Section Agent Compliance | Agent Linter / Audit Suite | Pre-release audit | Agent deployment veto |
| Independent APKG Attack Harness | `scripts/test_phase8_independent_verification.js` | Release gate | Package release veto |
