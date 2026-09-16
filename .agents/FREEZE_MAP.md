# StudySourceCore — 5-Tier Component Governance & Freeze Map

> **Canonical Path**: `.agents/FREEZE_MAP.md`  
> **Governance Model**: 5-Tier Component Classification & Preservation Protocol  
> **Status**: AUTHORITATIVE / ENFORCED

---

## 1. Governance Architecture & Tier Classifications

To prevent unintentional regressions, schema drift, and breakage of compiled binary contracts, StudySourceCore classifies all repository components into 5 distinct governance tiers:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              5-TIER COMPONENT GOVERNANCE MAP                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  [ TIER 1: FROZEN ] ──────────────────► Strictly Immutable Core Contracts & Schemas   │
│                                         (Zero modifications allowed; zero deletions)   │
│                                                                                        │
│  [ TIER 2: CONTROLLED CHANGE ] ───────► Production Engine, Skills, & Agent Definitions │
│                                         (Standardization & deduplication permitted)    │
│                                                                                        │
│  [ TIER 3: SAFE TO MODIFY ] ──────────► Control-Plane Manuals, Registries, Docs        │
│                                         (Free evolution with architectural sync)       │
│                                                                                        │
│  [ TIER 4: GENERATED ] ───────────────► Machine-Readable Audits & Build Outputs        │
│                                         (Produced by automated pipeline scripts)       │
│                                                                                        │
│  [ TIER 5: TEMPORARY ] ───────────────► Scratch Data, Transient Test Fixtures         │
│                                         (Ephemeral, purgeable without side-effects)    │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Component Mapping by Tier

### Tier 1: FROZEN (Strictly Immutable)
Assets in this tier represent foundational data contracts, database schemas, test harnesses, and low-level packaging engines. Any modification or deletion is strictly forbidden.

| Component Path Pattern | Component Rationale | Inviolable Invariant |
|---|---|---|
| `.agents/skills/study-source-core/resources/schemas/*.json` | Canonical Draft-07 JSON schemas validating practice questions, procedural DAGs, manifests, and provenance. | Zero schema deletion or breaking field removals. |
| `.agents/skills/study-source-core/resources/image-occlusion-schema.json` | Schema for Image Occlusion masks and coordinates. | Coordinate normalization bounds `[0..100]` remain fixed. |
| `.agents/skills/study-source-core/resources/studylab-practice-questions-schema.json` | Schema governing authentic practice items. | MCQ minimum 4 options invariant strictly preserved. |
| `.agents/skills/study-source-core/resources/studylab-procedural-schema.json` | Schema governing procedural pattern archetypes. | DAG structure and step schemas remain intact. |
| `.agents/skills/study-source-core/scripts/test_*.js` | Master test suites (111 contracts, adversarial auditor, L1-L7 proof suite, orchestration tests). | Must never be deleted or altered to weaken assertions. |
| `.agents/skills/study-source-core/scripts/export_studylab_procedural_anki.js` | Low-level Anki Model `1600000004` SQLite compilation engine. | SQLite schema and Anki model field layouts are immutable. |
| `.agents/skills/study-source-core/scripts/shared_anki_utils.js` | Shared SQLite schema utilities and Anki zip packaging. | Collection database structure is immutable. |
| `.agents/skills/study-source-core/package.json` | NPM package configuration and dependency definitions. | Dependency versions and test commands preserved. |
| `.agents/skills/study-source-core/package-lock.json` | NPM lockfile for reproducible builds. | Lockfile integrity preserved. |
| `PRODUCT.md` | Authoritative Product Charter and 10 Immutable Principles. | Inviolable product laws; zero fabrication. |
| `docs/LEARNING_PRINCIPLES.md` | Authoritative Cognitive Learning Principles. | 4-stage procedural progression, 17 dimensions, 3-tier hints. |

---

### Tier 2: CONTROLLED CHANGE (Active Production Engine)
Assets in this tier represent active production code and configurations. Modifications are strictly controlled, requiring explicit validation and adherence to the single source of truth.

| Component Path Pattern | Component Rationale | Change Protocol & Invariant |
|---|---|---|
| `ARCHITECTURE.md` | Canonical 6-Tier Architecture & Contract Ownership Matrix. | Must reflect system layers, pipeline flow, and ownership. |
| `ROADMAP.md` | Master 11-Phase Implementation Roadmap (Phases 0–10). | Governed phase progression, entry dependencies, exit criteria. |
| `.agents/agents/*.md` | 14 canonical agent definitions. | Standardize to 14-section template without removing core responsibilities. |
| `.agents/skills/study-source-core/SKILL.md` | Master orchestration skill. | Preserves single source of truth, hard resource limits, and gating rules. |
| `.agents/skills/study-source-core/subject-skills/*/SKILL.md` | 9 subject specialized skills. | Preserves domain DNA, formulas, and subject validation hooks. |
| `.agents/skills/study-source-core/resources/*.md` | 23 markdown resource rulebooks and contracts. | Consolidated into canonical single sources of truth. |
| `.agents/skills/study-source-core/scripts/*.js` | 30 operational, validation, and routing scripts. | No deletion of working scripts; CLI interfaces preserved. |

---

### Tier 3: SAFE TO MODIFY (Control-Plane & Operations Manuals)
High-level control-plane documentation, registries, decision records, and diagnostic trees designed to guide human operators and autonomous agents.

| Component Path Pattern | Component Rationale | Maintenance Requirement |
|---|---|---|
| `.agents/README.md` | Master operations manual entry point. | Must accurately reflect repository state and navigation paths. |
| `.agents/OWNERSHIP.md` | Single responsibility matrix. | Enforces 1 responsibility = 1 canonical owner. |
| `.agents/DATA_FLOW.md` | End-to-end data transformation pipeline. | Documents complete lifecycle from Source to Final Deliverables. |
| `.agents/EXECUTION_LIFECYCLE.md` | Parent vs Subagent lifecycle and 3-wave execution. | Preserves hard resource limits (max 4 concurrent, max 10 launches). |
| `.agents/FREEZE_MAP.md` | Component freeze classification manual. | Harmonized with `freeze-map.json`. |
| `.agents/DECISIONS.md` | Consolidated ADR-01 through ADR-17 records. | Historical decision rationales preserved. |
| `.agents/TROUBLESHOOTING.md` | Evidence-driven diagnostic decision trees. | Covers all 8 failure classes with exact recovery steps. |
| `.agents/{SKILLS,AGENTS,SCRIPTS,RESOURCES}.md` | Master component registries. | 100% component coverage across all active modules. |

---

### Tier 4: GENERATED (Machine-Readable Artifacts)
Machine-readable audit artifacts, test reports, and build manifests created by automated processes. These files are updated by tooling, not manual editing.

| Component Path Pattern | Component Rationale | Integrity Contract |
|---|---|---|
| `artifacts_qa/agents_documentation_audit/*.json` | 9 machine-readable JSON audit files. | Passes Draft-07 JSON schema validation. |
| `.build/*` | Intermediate build artifacts and packaging caches. | Can be regenerated deterministically from source assets. |
| `docs/AGENTS_DOCUMENTATION_AND_OPERATIONS_AUDIT.md` | Final comprehensive audit report. | Reflects final verification scorecard. |

---

### Tier 5: TEMPORARY (Ephemeral & Transient)
Transient scratch files, test fixture dumps, and subagent working directories.

| Component Path Pattern | Component Rationale | Retention Policy |
|---|---|---|
| `.agents/skills/study-source-core/scripts/scratch/*` | Test fixtures, mock outputs, and sample `.apkg` files. | Safe to purge without affecting production operations. |
| `.agents/m*_*/*` | Agent working memory and dispatch metadata. | Confined to `.agents/` working folder; ephemeral. |

---

## 3. Stop & Preservation Rules

The following non-negotiable preservation rules govern all agents and human contributors:

1. **Zero Deletion of Active Assets**: No active test script (`scripts/test_*.js`), JSON schema (`resources/schemas/*.json`), or operational utility may be deleted.
2. **Anti-Degradation Rule**: Refactoring or deduplicating documentation must never reduce factual precision, remove edge-case handling, or alter defined validation thresholds.
3. **Model ID Protection**: Anki model IDs `1600000001` through `1600000004` must remain fixed to prevent corrupting user Anki collections upon import.
4. **Audit Enforcement**: Independent QA auditors automatically verify that all Frozen and Controlled assets remain intact after every milestone.
