# StudySourceCore — Provenance & Content Lineage Record (CLR) Specification

> **Canonical Document**: `docs/PROVENANCE_AND_LINEAGE.md`  
> **Status**: AUTHORITATIVE / FROZEN BASELINE  
> **Version**: 1.0.0-PROVENANCE  
> **Governance Authority**: StudySourceCore Master Governance Board  

---

## 1. The Provenance Imperative

In automated educational compilation, **provenance is the bedrock of epistemic trust**. If an AI system generates a study card, the student must have 100% cryptographic certainty that:
1. The fact, formula, or problem statement genuinely appears in the authorized syllabus textbook.
2. The question was not hallucinated by a large language model.
3. If an official exam paper is cited (e.g., *RRB ALP 2018 Stage 1*), the citation is authentic and verifiable.

---

## 2. The Provenance Origin Hierarchy

Every fact, question, and formula within the system is strictly classified into one of four hierarchical provenance tiers:

$$\text{AUTHENTIC} \succ \text{CURATED} \succ \text{DERIVED} \succ \text{SYNTHETIC}$$

| Origin Tier | Classification Name | Criteria & Authority | Example |
|---|---|---|---|
| **1 (Highest)** | `AUTHENTIC` | Direct, verbatim extraction from an official, verified previous-year examination paper or official answer key. | `[RRB ALP 2018 Shift 2 Q14]` |
| **2** | `CURATED` | Problem or proposition extracted directly from an authorized textbook (NCERT, State Board, or vetted syllabus notes). | `[NCERT Class 10 Ch 12 Ex 4]` |
| **3** | `DERIVED` | Isomorphic mathematical or logical variant created by modifying parameters within verified, solvability-preserving domains. | Coprime parameter change ($a=12, b=18 \to a=15, b=25$) |
| **4 (Lowest)** | `SYNTHETIC` | Algorithmic test fixture created to test extreme edge cases or boundary conditions. | Boundary check card ($\mu_s = 0.0$ frictionless limit) |

> [!IMPORTANT]
> **Authentic Questions Take Absolute Precedence**:  
> In procedural STEM packaging, authentic PYQs must be preserved in their entirety. Synthetic questions may never replace or dilute eligible authentic exam problems.

---

## 3. Current Provenance Implementation [CURRENT]

The current repository implements robust file-level cryptographic provenance via `scripts/artifact_provenance.js`:

1. **Source Evidence Locking**: Upon ingesting raw source files, the parent orchestrator computes the SHA-256 hash of both the source document and the generated `scratch/evidence-pack.md`, saving these in `scratch/provenance.json`.
2. **Artifact Manifest**: Every chapter directory contains `.build/artifact-manifest.json` recording:
   - Filepaths of all generated sibling deliverables.
   - SHA-256 hashes of each deliverable.
   - Validation status and timestamp.
   - Originating evidence pack SHA-256 hash.
3. **Lineage Verification**: Prior to packaging, `verifyArtifactLineage(chapterDir)` verifies that all files exist and match their recorded hashes. Any mismatch raises a `STALE_ARTIFACT_HASH` error.

---

## 4. Target: The Content Lineage Record (CLR) [TARGET — Phase 2]

While current file-level hashes verify that whole files have not changed, **Target Phase 2** introduces fine-grained, node-level **Content Lineage Records (CLRs)**. 

The CLR establishes a bidirectional, unbroken cryptographic chain connecting every individual card or equation back to its exact textbook origin:

$$\text{source\_chunk\_id} \longrightarrow \text{KU\_id} \longrightarrow \text{compiler\_operation} \longrightarrow \text{deliverable\_card\_id}$$

### The 5-Layer Provenance Architecture & 11 Canonical CLR Fields

To reconcile high-precision research foundations with machine verification, StudySourceCore stratifies provenance into **five distinct metadata layers**, ensuring that source coordinates, generation context, transformation history, and certification evidence never conflate:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        THE 5-LAYER PROVENANCE & LINEAGE ARCHITECTURE                   │
├────────────────────────────────┬───────────────────────────────────────────────────────┤
│ Layer                          │ Core Properties & Semantic Scope                      │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ **1. Core Source Provenance**  │ • `source_id`: Canonical document identifier          │
│    (Where did the fact come    │ • `source_coordinates`: Physical locator (page/line)  │
│     from in the textbook?)     │ • `source_chunk_hash`: SHA-256 chunk fingerprint      │
│                                │ • `evidence_pack_id`: Evidence pack container ID      │
│                                │ • `origin_tier`: AUTHENTIC, CURATED, DERIVED, SYNTH. │
│                                │ • `ku_id`: Stable Knowledge Unit Semantic Identity    │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ **2. Authoring & Generation**  │ • `generator_metadata`: Extraction engine version     │
│    (How and when was this IR   │ • `model_and_prompt`: Subagent model & prompt contract│
│     node synthesized?)         │ • `authoring_subagent`: Designated agent ID           │
│                                │ • `pedagogical_purpose`: Intended learning outcome    │
│                                │ • `scaffolding_stage`: Worked/Faded/Independent/Transf│
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ **3. Mutation & Transformation**│ • `transformation_history`: Ordered log of mutations  │
│    (How was the authentic fact │ • `derived_from_node_id`: Parent IR node if derived   │
│     adapted or scaffolded?)    │ • `parameter_perturbation_log`: Domain bounds audit   │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ **4. Target Projection**       │ • `renderer_target`: Output file path & row/line      │
│    (Where does this appear in  │ • `deliverable_card_id`: Anki note GUID or TSV row    │
│     the user's study vault?)   │ • `format_type`: Notes, Basic, Cloze, IO, Questions   │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ **5. Validation & Certification│ • `validator_signatures`: Ajv & AST audit stamps      │
│    (Who verified this and is   │ • `certification_state`: Cryptographic release signoff│
│     it certified for release?) │ • `adv_compliance_hash`: ADV-01..15 verification token│
└────────────────────────────────┴───────────────────────────────────────────────────────┘
```

#### The 11 Canonical CLR Fields:
The 11 mandatory fields embedded in every compiled Knowledge Unit and practice item in the Semantic IR are:

1. `source_id`: Canonical identifier of the primary source document (e.g., `src.ncert.physics.class11`).
2. `source_coordinates`: Exact physical location (`page_start: 142`, `page_end: 143`, `section: "5.4 Friction"`, `paragraph: 3`). First-class physical coordinates guarantee instant auditability against the physical textbook.
3. `source_chunk_hash`: Immutable SHA-256 fingerprint of the specific source text paragraph or formula.
4. `evidence_pack_id`: Identifier of the chapter evidence pack (`evp.physics.laws_of_motion.v1`).
5. `ku_id`: Stable Semantic Identity of the Knowledge Unit (`ku.physics.friction.incline_static`).
6. `origin_tier`: Classification enum (`AUTHENTIC`, `CURATED`, `DERIVED`, `SYNTHETIC`).
7. `generator_metadata`: Version of the extraction engine and ISO 8601 generation timestamp.
8. `model_and_prompt`: Subagent model name, temperature, and prompt contract version used during authoring.
9. `transformation_history`: Ordered array of transformations applied (e.g., `bilingual_translation`, `3_tier_hint_synthesis`, `faded_step_masking`).
10. `renderer_target`: Target deliverable path where this item is projected (`Basic/Laws_Basic.tsv` line 14, `Questions/Laws_Questions.md` section 2).
11. `certification_state`: Cryptographic signature of the independent auditor verifying schema compliance, acyclic DAGs, non-leaking hints, and ADV-01..15 release readiness.

---

## 5. Provenance Invariants & Release Gates

1. **No Unanchored Artifacts**: Any generated flashcard, note section, or practice problem that lacks a verified upstream `source_chunk_hash` is rejected during Wave 3 certification.
2. **Hash Mismatch Blocks Packaging**: If an intermediate file is modified manually after generation, the cryptographic checksum fails, immediately aborting Wave 2 binary compilation.
3. **Zero Fabricated Provenance**: Subagents are programmatically forbidden from inventing exam citations or arbitrary book references. Any missing exam citation must be marked `origin: "curated_source"` rather than inventing an exam shift.
