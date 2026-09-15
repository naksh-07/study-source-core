# StudySourceCore — End-to-End Data Flow & Schema Contracts

> **Canonical Architecture**: [`ARCHITECTURE.md`](../ARCHITECTURE.md)  
> **Product Charter**: [`PRODUCT.md`](../PRODUCT.md)  
> **Implementation Roadmap**: [`ROADMAP.md`](../ROADMAP.md)  
> **Canonical Path**: `.agents/DATA_FLOW.md`  
> **Architecture**: 6-Stage Deterministic Data Transformation Pipeline  
> **Status**: AUTHORITATIVE / ENFORCED

---

## 1. Pipeline Architectural Overview

The StudySourceCore data pipeline executes a rigorous 6-stage transformation, converting unstructured or semi-structured educational source material into an integrated, multi-modal collection of study deliverables.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        STAGE 1: Source Ingestion & Evidence Formulation                │
│                        Input: Raw Source (PDF / Markdown / HTML / TXT)                 │
│                        Output: scratch/evidence-pack.md & scratch/provenance.json       │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ (SHA-256 Checksum Computed)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        STAGE 2: Deterministic Routing & Evaluation                      │
│                        Input: scratch/evidence-pack.md                                 │
│                        Output: scratch/routing_manifest.json                           │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ (Track Eligibility Evaluated)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        STAGE 3: Parallel Specialized Generation (Wave 1)               │
│                        Dispatched to: core-notes, core-basic-anki, core-cloze-anki,   │
│                                       core-image-occlusion, core-mindmap,              │
│                                       core-slide-deck, Subject APKG Authors            │
│                        Outputs: Notes/*.md, Basic/*.tsv, Cloze/*.tsv, IO/*,            │
│                                 MindMaps/*.md, SlideDecks/*.md, Optional/*.json,       │
│                                 StudyLab/<Chapter>_StudyLab_Procedural.apkg            │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ (Handoff Reports & Schema Checks)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        STAGE 4: Sequential Compilation & Packaging (Wave 2)            │
│                        Executed by: export_anki.js                                     │
│                        Outputs: <Chapter>_Anki.apkg                                    │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ (APKG File Existence & SQLite Validation)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        STAGE 5: Post-Packaging Quality Gates & Auditing (Wave 3)       │
│                        Dispatched to: bm-qa, bm-graph, adversarial-apkg-reviewer       │
│                        Outputs: Audit/QA_Report.md, Graph/Graph_Index.json,            │
│                                 Audit/Adversarial_APKG_Audit.md                        │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ (Physical Completion Gate Verified)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        STAGE 6: Final Deliverable Release & Archival                   │
│                        Outputs: Verified Deliverable Tree & .build/ Manifests          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Single-Writer Rule & Data Flow Governance
Every data stream and target deliverable file adheres to the **Single-Writer Rule**:
- Exactly one specialist subagent writes to each target path (`Notes/`, `Basic/`, `Cloze/`, `ImageOcclusion/`, `MindMaps/`, `SlideDecks/`, `Optional/`).
- The Parent Orchestrator is banned from direct self-execution of specialist files.
- Wave 1 independent outputs synchronize at Dependency Barrier 1 before Wave 2 packaging begins.

---


## 2. Detailed Transformation Stages & Schemas

### Stage 1: Source Ingestion & Evidence Pack Formulation
The Parent Orchestrator ingests the raw source document, performs layout parsing, strips extraneous artifacts, normalizes mathematical formulas into standard $\LaTeX$, and generates a single immutable evidence pack.

- **Primary Output**: `scratch/evidence-pack.md`
- **Metadata Output**: `scratch/provenance.json`

#### Provenance Schema (`scratch/provenance.json`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "EvidenceProvenance",
  "type": "object",
  "required": ["source_name", "source_hash_sha256", "evidence_hash_sha256", "extracted_timestamp", "total_characters", "detected_subject", "chapter_title"],
  "properties": {
    "source_name": { "type": "string" },
    "source_hash_sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
    "evidence_hash_sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
    "extracted_timestamp": { "type": "string", "format": "date-time" },
    "total_characters": { "type": "integer", "minimum": 1 },
    "detected_subject": { 
      "type": "string", 
      "enum": ["Biology", "Chemistry", "Geography", "History", "Map", "Math", "Physics", "Political Science", "Reasoning", "General"] 
    },
    "chapter_title": { "type": "string" }
  }
}
```

---

### Stage 2: Deterministic Routing & Evaluation
The orchestration script `scripts/routing_engine.js` enforces the explicit artifact policy provided by the Subject Skill and verifies candidate yields to generate the routing manifest.

- **Primary Output**: `scratch/routing_manifest.json`

#### Routing Manifest Schema (`scratch/routing_manifest.json`)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "RoutingManifest",
  "type": "object",
  "required": ["chapter_id", "subject", "tracks", "suppressions"],
  "properties": {
    "chapter_id": { "type": "string" },
    "subject": { "type": "string" },
    "tracks": {
      "type": "object",
      "required": ["notes", "basic_anki", "cloze_anki", "image_occlusion", "mindmap", "slide_deck", "studylab_procedural"],
      "properties": {
        "notes": { "type": "boolean" },
        "basic_anki": {
          "type": "object",
          "required": ["enabled", "candidate_count"],
          "properties": {
            "enabled": { "type": "boolean" },
            "candidate_count": { "type": "integer" }
          }
        },
        "cloze_anki": {
          "type": "object",
          "required": ["enabled", "candidate_count"],
          "properties": {
            "enabled": { "type": "boolean" },
            "candidate_count": { "type": "integer" }
          }
        },
        "image_occlusion": {
          "type": "object",
          "required": ["enabled", "io_worthiness", "candidate_images"],
          "properties": {
            "enabled": { "type": "boolean" },
            "io_worthiness": { "type": "string", "enum": ["HIGH", "MEDIUM", "LOW"] },
            "candidate_images": { "type": "integer" }
          }
        },
        "mindmap": {
          "type": "object",
          "required": ["enabled", "topology_depth"],
          "properties": {
            "enabled": { "type": "boolean" },
            "topology_depth": { "type": "integer" }
          }
        },
        "slide_deck": {
          "type": "object",
          "required": ["enabled", "deck_worthiness"],
          "properties": {
            "enabled": { "type": "boolean" },
            "deck_worthiness": { "type": "string", "enum": ["HIGH", "MEDIUM", "LOW"] }
          }
        },
        "studylab_procedural": {
          "type": "object",
          "required": ["enabled", "solvable_question_count", "assigned_specialist"],
          "properties": {
            "enabled": { "type": "boolean" },
            "solvable_question_count": { "type": "integer" },
            "assigned_specialist": { "type": ["string", "null"] }
          }
        }
      }
    },
    "suppressions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["track", "reason_code", "detail"],
        "properties": {
          "track": { "type": "string" },
          "reason_code": { "type": "string" },
          "detail": { "type": "string" }
        }
      }
    }
  }
}
```

---

### Stage 3: Specialized Generation (Wave 1 Artifacts)

#### 3.1 Note Architecture Contract (`Notes/<Chapter>_Notes.md`)
Synthesized by `core-notes`. Must contain YAML frontmatter and structured markdown:
```markdown
---
title: "<Chapter Title>"
subject: "<Subject>"
tags: [study-notes, <subject-tag>]
source_hash: "<sha256>"
last_updated: "YYYY-MM-DD"
---

# <Chapter Title>

## 1. Conceptual Framework & Core Invariants
...

## 2. Comprehensive Deep-Dive & Mechanics
...

## 3. High-Yield Summary & Quick Revision Table
...
```

#### 3.2 Basic & Cloze Anki TSV Format (`Basic/*.tsv`, `Cloze/*.tsv`)
Generated by `core-basic-anki` and `core-cloze-anki`. TSV files use strict 3-column tab (`\t`) delimiters with bilingual formatting:
- **Basic Format**: `Front \t Back \t Tags`
  - **Column 1 (Front)**: Clear prompt, question, or recall trigger.
  - **Column 2 (Back)**: Hindi-first explanation with technical English terms in parentheses `( )`.
  - **Column 3 (Tags)**: Space-separated tags (e.g., `Biology CellStructure`).
- **Cloze Format**: `Text \t Extra \t Tags`
  - **Column 1 (Text)**: Clear sentence containing one or more `{{c1::cloze deletion::hint}}` markers.
  - **Column 2 (Extra)**: Hindi-first pedagogical explanation with technical English terms in parentheses `( )`.
  - **Column 3 (Tags)**: Space-separated tags (e.g., `Biology CellStructure`).

```tsv
What is the primary function of Mitochondria?	माइटोकॉन्ड्रिया (Mitochondria) कोशिका का ऊर्जा घर (Powerhouse of the cell) कहलाता है क्योंकि यह एटीपी (ATP - Adenosine Triphosphate) का उत्पादन करता है।	Biology::CellStructure
The powerhouse of the cell is {{c1::Mitochondria}}, which produces {{c2::ATP}}.	माइटोकॉन्ड्रिया (Mitochondria) कोशिकीय श्वसन (Cellular Respiration) के माध्यम से ऊर्जा उत्पन्न करता है।	Biology::CellStructure
```

#### 3.3 Image Occlusion Manifest (`ImageOcclusion/<Chapter>_IO_Manifest.json`)
Conforms strictly to `.agents/skills/study-source-core/resources/image-occlusion-schema.json`:
```json
{
  "chapter_id": "Bio_Ch03_CellStructure",
  "image_filename": "cell_diagram.png",
  "image_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "masks": [
    {
      "id": "mask_01",
      "shape": "rect",
      "x": 24.5,
      "y": 18.2,
      "width": 15.0,
      "height": 8.5,
      "label": "Nucleus",
      "explanation_hi": "केंद्रक (Nucleus) कोशिका की सभी गतिविधियों को नियंत्रित करता है।"
    }
  ]
}
```



### Stage 4 & 5: Sequential Compilation & Packaging (Wave 2)
The packaging script `export_anki.js` compiles standard card TSVs and IO manifests into standalone `.apkg` files containing valid SQLite `collection.anki2` databases. StudyLab APKGs are compiled independently by the StudyLab agents during Wave 1.

#### Model IDs & Packaging Mapping
- **Model `1600000001`**: Standard Basic Q&A Card
- **Model `1600000002`**: Standard Cloze Deletion Card
- **Model `1600000003`**: Image Occlusion Card
- **Model `1600000004`**: StudyLab Level 1-7 Interactive Procedural Card

#### Procedural APKG Companion Manifest (`StudyLab/<Chapter>_StudyLab_Procedural.manifest.json`)
```json
{
  "apkg_filename": "LCM-HCF_StudyLab_Procedural.apkg",
  "model_id": 1600000004,
  "card_count": 18,
  "subject": "Math",
  "generated_timestamp": "2026-08-28T00:33:00Z",
  "sqlite_integrity_check": "ok",
  "levels_included": [1, 2, 3, 4, 5, 6, 7],
  "source_evidence_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

---

### Stage 6: Post-Packaging Quality Gates & Graph Ingestion (Wave 3)
1. `bm-qa` performs cross-artifact verification and outputs `Audit/QA_Report.md`.
2. `adversarial-apkg-reviewer` audits the compiled APKG against SQL injection, hint leakage, and option invariants, outputting `Audit/Adversarial_APKG_Audit.md`.
3. `bm-graph` extracts entity relationships and creates `Graph/<Chapter>_Graph_Index.json`.

#### Cross-Artifact QA Report Schema (`Audit/QA_Report.md`)
```markdown
# QA & Cross-Artifact Audit Report

- **Chapter**: <Chapter Name>
- **Evidence Hash**: <sha256>
- **Timestamp**: YYYY-MM-DDTHH:MM:SSZ
- **Verdict**: PASS | FAIL

## 1. Source Fidelity & Zero Hallucination Audit
...

## 2. Invariant & Bilingual Compliance Audit
...

## 3. Physical Artifact Verification Summary
| Artifact Path | Size (Bytes) | Integrity Status |
|---|---|---|
| Notes/Ch01_Notes.md | 14,210 | VALID |
| Ch01_Anki.apkg | 88,412 | VALID |
| StudyLab/Ch01_StudyLab_Procedural.apkg | 142,800 | VALID |
```
