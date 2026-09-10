# StudyLab Section 20 Companion Manifest Specification (`manifest-spec.md`)
**Version**: `2.0.0`  
**Classification**: Canonical Technical Reference Specification  
**Status**: Authoritative & Release-Blocking

---

## 1. Overview & Architectural Role

Every procedural StudyLab practice package (`.apkg`) compiled under Model ID `1600000004` (`StudyLab Procedural Anchor`) MUST be accompanied by a companion manifest file named:
```
[Chapter]_StudyLab_Procedural.manifest.json
```

The Companion Manifest provides an external, machine-readable pedagogical contract and audit trail that allows downstream runtimes (Anki desktop, StudyLab Rust core, and web runners), automated CI/CD validators, and analytics systems to inspect curriculum completeness, question type distribution, difficulty calibration, and modality integrity without unzipping and parsing the internal SQLite collection.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 COMPANION MANIFEST INGESTION PIPELINE                            │
├───────────────────────────────────────┬──────────────────────────────────────────────────────────┤
│ PROCEDURAL APKG ([Chapter].apkg)      │ COMPANION MANIFEST ([Chapter].manifest.json)             │
├───────────────────────────────────────┼──────────────────────────────────────────────────────────┤
│ • Model ID: 1600000004                │ • 20 Required Root Properties                            │
│ • SQLite: col, notes, cards           │ • Calibrated Difficulty Coverage (Min, Max, Mean, Bands) │
│ • Embedded inline_contract payload    │ • Mathematical Coverage Summary & Uncovered Skills       │
│ • Zero external hydration dependency  │ • Per-Question-Type Pedagogical Matrix                   │
│ • Ephemeral runtime card generation   │ • Complete Item Provenance & Note GUID Table             │
└───────────────────────────────────────┴──────────────────────────────────────────────────────────┘
```

---

## 2. The 20 Required Schema Properties

The companion manifest conforms strictly to JSON Schema Draft-07 (`studylab-apkg-manifest.schema.json`). All 20 properties listed below are **mandatory**. Omitting any required property causes an immediate Level 2 Schema Validation failure (`FAIL`).

```json
{
  "$schema": "studylab-apkg-manifest.schema.json",
  "manifest_version": "2.0.0",
  "package_type": "studylab_procedural_practice",
  "package_classification": "SELF_CONTAINED_PORTABLE",
  "self_contained_verified": true,
  "subject": "Mathematics",
  "chapter": "LCM-HCF",
  "deck_name": "Maths::LCM-HCF::StudyLab Procedural",
  "deck_id": 1709214001,
  "apkg_file": "LCM-HCF_StudyLab_Procedural.apkg",
  "generation_timestamp": "2026-08-27T14:45:00.000Z",
  "generation_version": "2.0.0",
  "contract_version": "2.0.0",
  "concept_count": 8,
  "skill_count": 12,
  "question_type_count": 10,
  "archetype_count": 14,
  "variant_count": 28,
  "object_count": 16,
  "difficulty_coverage": { ... },
  "coverage_summary": { ... },
  "question_types": [ ... ],
  "items": [ ... ]
}
```

### 2.1 Property Definitions & Value Constraints

| # | Property Name | JSON Type | Allowed Values / Constraints | Canonical Semantic Description |
|---|---|---|---|---|
| **1** | `$schema` | `string` | `"studylab-apkg-manifest.schema.json"` | URI or relative schema reference for Draft-07 validation. |
| **2** | `manifest_version` | `string` | `"2.0.0"` | Exact specification version of the manifest format. |
| **3** | `package_type` | `string` | `"studylab_procedural_practice"`, `"studylab_procedural_anchors"`, `"studylab_practice_questions"` | Identifies whether the package contains question-backed cards, pattern anchors, or raw practice items. |
| **4** | `package_classification` | `string` | `"SELF_CONTAINED_PORTABLE"`, `"HYDRATION_DEPENDENT"` | Standalone packages must be `SELF_CONTAINED_PORTABLE`. |
| **5** | `self_contained_verified`| `boolean` | `true` (for production release) | Cryptographically/structurally asserts all note payloads carry valid `inline_contract`. |
| **6** | `subject` | `string` | e.g., `"Mathematics"`, `"Reasoning"`, `"Physics"`, `"Chemistry"` | Canonical subject domain title. |
| **7** | `chapter` | `string` | Normalized slug or name (e.g. `"LCM-HCF"`, `"Kinematics"`) | Target curriculum chapter or module. |
| **8** | `deck_name` | `string` | `<Subject>::<Chapter>::StudyLab Procedural` | Hierarchical Anki deck namespace matching `col.decks`. |
| **9** | `deck_id` | `integer` | 32-bit positive integer ($> 0$) | Deterministic Anki deck ID computed from deck name. |
| **10** | `apkg_file` | `string` | `[Chapter]_StudyLab_Procedural.apkg` | Target binary package filename. |
| **11** | `generation_timestamp` | `string` | ISO 8601 UTC timestamp (`YYYY-MM-DDTHH:mm:ss.sssZ`) | Generation and compilation timestamp. |
| **12** | `generation_version` | `string` | Semantic version string (e.g., `"2.0.0"`) | Compiler software version. |
| **13** | `contract_version` | `string` | Semantic version string (e.g., `"2.0.0"`) | Core schema contract specification version. |
| **14** | `concept_count` | `integer` | $\ge 1$ | Total distinct underlying conceptual principles represented. |
| **15** | `skill_count` | `integer` | $\ge 1$ | Total distinct procedural problem-solving skills represented. |
| **16** | `question_type_count` | `integer`| $\ge 1$ | Total distinct deep-structure question types (**Question Type $\ne$ Instance**). |
| **17** | `source_question_count` | `integer` | $\ge 0$ | Total distinct authentic source/exam questions preserved. |
| **18** | `canonical_question_count` | `integer` | $\ge 0$ | Total distinct canonical representative questions. |
| **19** | `generated_variant_count` | `integer` | $\ge 0$ | Total procedural generated variants supported. |
| **20** | `instance_count` | `integer` | $\ge 1$ | Total problem instances in the universe ($= \text{source} + \text{canonical} + \text{generated}$). |
| **21** | `archetype_count` | `integer` | $\ge \text{question\_type\_count}$ | Total procedural generation archetypes declared across contracts. |
| **22** | `variant_count` | `integer` | $\ge \text{archetype\_count}$ | Total parameter and structural variants supported by the package. |
| **23** | `object_count` | `integer` | $\ge 1$ | Total physical note/card records packaged into the APKG. |
| **24** | `difficulty_coverage` | `object` | Sub-object containing `min`, `max`, `mean`, and `bands` | Quantitative distribution of difficulty calibrated across items. |
| **25** | `readiness_breakdown` | `object` | `{ structural_coverage, source_depth, variant_depth, mock_readiness }` | Multi-dimensional package readiness scorecard. |

---

## 3. Difficulty Coverage Calibration Formulas

The `difficulty_coverage` object quantifies curriculum difficulty across the standard 5-point calibrated scale ($1.0 = \text{Foundational}$ to $5.0 = \text{Olympiad / Extreme Advanced}$).

```json
"difficulty_coverage": {
  "min": 1.5,
  "max": 4.5,
  "mean": 2.85,
  "bands": {
    "1": 2,
    "2": 6,
    "3": 5,
    "4": 3,
    "5": 0
  }
}
```

### 3.1 Mathematical Definitions

Given a set of $N$ practice items in the package, where item $i$ has assigned difficulty $D_i \in [1.0, 5.0]$:

1. **Minimum Calibrated Difficulty ($D_{\min}$)**:
   $$D_{\min} = \min_{1 \le i \le N} D_i$$
2. **Maximum Calibrated Difficulty ($D_{\max}$)**:
   $$D_{\max} = \max_{1 \le i \le N} D_i$$
3. **Mean Calibrated Difficulty ($\bar{D}$)**:
   $$\bar{D} = \frac{1}{N} \sum_{i=1}^{N} D_i \quad \text{(rounded to 2 decimal places)}$$
4. **Discrete Band Distribution ($\text{Band}_k$)**:
   $$\text{Band}_k = \sum_{i=1}^{N} \mathbb{I}\left(\max(1, \min(5, \lfloor D_i \rfloor)) = k\right) \quad \text{for } k \in \{1, 2, 3, 4, 5\}$$
   Where $\lfloor \cdot \rfloor$ denotes the floor function and $\mathbb{I}(\cdot)$ is the indicator function.

### 3.2 Difficulty Tier Calibration Standard

| Band Key | Numeric Range | Pedagogical Level | Cognitive Demand (Bloom's Taxonomy) |
|---|---|---|---|
| `"1"` | $[1.0, 1.99]$ | **Foundational / Direct Recall** | Direct formula substitution, single-step arithmetic, basic definitions. |
| `"2"` | $[2.0, 2.99]$ | **Intermediate / Standard Core** | Standard two-step calculation, standard PYQ problem representations. |
| `"3"` | $[3.0, 3.99]$ | **Advanced / Multi-Concept** | Multiple constraint handling, intermediate conversions, trap navigation. |
| `"4"` | $[4.0, 4.99]$ | **Hard / Competitive Traps** | Inverse parameter deduction, case splitting, subtle boundary conditions. |
| `"5"` | $[5.0, 5.00]$ | **Olympiad / Extreme Transfer** | Novel context transfer, cross-domain multi-concept synthesis. |

---

## 4. Coverage Summary Algorithm

The `coverage_summary` object reflects the pedagogical breadth of the package relative to the declared chapter syllabus.

```json
"coverage_summary": {
  "total_chapter_skills": 12,
  "covered_skills": 12,
  "coverage_percentage": 100.0,
  "uncovered_skills": [],
  "modality_breakdown": {
    "mcq": 14,
    "numerical": 2,
    "stepwise": 0,
    "reference_only": 0
  }
}
```

### 4.1 Coverage Calculation Algorithm

```typescript
function calculateCoverageSummary(
    declaredSkills: Set<string>,
    packagedSkills: Set<string>,
    modalityCounts: { mcq: number; numerical: number; stepwise: number; reference_only: number }
): CoverageSummary {
    const totalChapterSkills = Math.max(declaredSkills.size, packagedSkills.size, 1);
    const coveredSkills = packagedSkills.size;
    
    // Exact coverage ratio expressed as a percentage rounded to 1 decimal place
    const coveragePercentage = Number(((coveredSkills / totalChapterSkills) * 100).toFixed(1));
    
    // Compute symmetric difference for missing skills
    const uncoveredSkills = Array.from(declaredSkills).filter(skillId => !packagedSkills.has(skillId));

    return {
        total_chapter_skills: totalChapterSkills,
        covered_skills: coveredSkills,
        coverage_percentage: coveragePercentage,
        uncovered_skills: uncoveredSkills,
        modality_breakdown: {
            mcq: modalityCounts.mcq,
            numerical: modalityCounts.numerical,
            stepwise: modalityCounts.stepwise,
            reference_only: modalityCounts.reference_only
        }
    };
}
```

### 4.2 Release Criteria for Coverage
- **100% Coverage Target**: For standard core exam topics, `coverage_percentage` MUST equal `100.0` and `uncovered_skills` MUST be empty `[]`.
- **Coverage Warning**: If `coverage_percentage < 100.0`, Level 4 validation logs explicit warnings identifying every uncovered skill ID.

---

## 5. Per-Question-Type Status Matrix

The `question_types` array provides a structured breakdown for every canonical problem type included in the package.

```json
"question_types": [
  {
    "type_id": "pat-lcm-hcf-001",
    "name": "Product of Two Numbers and LCM-HCF Relationship",
    "object_types": ["mcq"],
    "required_interaction": "mcq_discrete_options",
    "coverage": {
      "instance_count": 3,
      "authentic_pyq_count": 2,
      "synthetic_count": 1
    },
    "hint_status": "COMPLETE_3_TIER",
    "solution_status": "COMPLETE_STEP_GRAPH",
    "diagnostic_status": "EXPLICIT_TAXONOMY_MAPPED",
    "remediation_status": "REMEDIATION_PATH_DECLARED"
  }
]
```

### 5.1 Field Schema & Allowed Enums

| Field Name | Type | Allowed Enums / Format | Required Constraint |
|---|---|---|---|
| `type_id` | `string` | Slug / Pattern ID (e.g. `"pat-lcm-hcf-001"`) | Unique across the array. |
| `name` | `string` | Human-readable title in bilingual/English format | Non-empty string ($\le 120$ chars). |
| `object_types` | `array` | Array of strings: `["mcq"]`, `["numerical"]`, `["stepwise"]`, `["reference_only"]` | Must contain at least 1 valid modality. |
| `required_interaction` | `string` | `"mcq_discrete_options"`, `"numerical_input"`, `"stepwise_dag_navigation"`, `"concept_decision_cards"`, `"strategy_selection_drill"` | Modality binding for UI renderer. |
| `coverage` | `object` | `{ "instance_count": N, "authentic_pyq_count": N, "synthetic_count": N }` | $N_{\text{total}} = N_{\text{authentic}} + N_{\text{synthetic}}$. |
| `hint_status` | `string` | `"COMPLETE_3_TIER"`, `"PARTIAL"`, `"MISSING"` | Production packages require `"COMPLETE_3_TIER"`. |
| `solution_status` | `string` | `"COMPLETE_STEP_GRAPH"`, `"STANDARD_TEXT"`, `"MISSING"` | Production packages require `"COMPLETE_STEP_GRAPH"`. |
| `diagnostic_status` | `string` | `"EXPLICIT_TAXONOMY_MAPPED"`, `"STANDARD"`, `"MISSING"` | Asserts mapping to 14-point error taxonomies. |
| `remediation_status` | `string`| `"REMEDIATION_PATH_DECLARED"`, `"STANDARD"`, `"MISSING"` | Asserts fallback/scaffolding pathway exists. |

---

## 6. Items Table Specification

The `items` array indexes every physical card/note compiled into the `.apkg`.

```json
"items": [
  {
    "note_id": 1709214001101,
    "card_id": 1709214001201,
    "guid": "nK8xL2vP9qR1",
    "practice_question_id": "lcm-hcf-pq-01",
    "pattern_id": "pat-lcm-hcf-001",
    "schema_id": "schema.math.number_system.lcm_hcf.v1",
    "problem_type": "Product-LCM-HCF Relationship",
    "question_type": "mcq",
    "origin_type": "AUTHENTIC_PYQ",
    "domain": "mathematics",
    "problem_family": "family.math.number_system.lcm_hcf",
    "difficulty": 2.5,
    "has_inline_contract": true,
    "is_self_contained": true
  }
]
```

### 6.1 Field Definitions

- `note_id`: Deterministic 64-bit integer note ID in SQLite `notes.id`.
- `card_id`: Deterministic 64-bit integer card ID in SQLite `cards.id`.
- `guid`: 12-character alphanumeric globally unique identifier in SQLite `notes.guid`.
- `practice_question_id`: Canonical identifier from `PracticeQuestions.json`.
- `pattern_id`: Canonical pattern identifier from `ProblemPatterns.json`.
- `schema_id`: Bound declarative schema identifier from contract registry.
- `problem_type`: Human-readable problem classification.
- `question_type`: Modality identifier (`mcq`, `numerical`, `stepwise`).
- `origin_type`: Origin classification (`AUTHENTIC_PYQ`, `SOURCE_CURATED`, `SYNTHETIC_VARIATION`).
- `domain`: Subject domain (`mathematics`, `reasoning`, `physics`, `chemistry`).
- `problem_family`: Declarative family identifier (`family.[domain].[chapter]`).
- `difficulty`: Item-level difficulty rating ($1.0 - 5.0$).
- `has_inline_contract`: Boolean asserting presence of full `inline_contract` in payload.
- `is_self_contained`: Boolean asserting zero external hydration dependency.

---

## 7. Complete Canonical Manifest Example

```json
{
  "$schema": "studylab-apkg-manifest.schema.json",
  "manifest_version": "2.0.0",
  "package_version": "2.0.0",
  "package_type": "studylab_procedural_practice",
  "package_classification": "SELF_CONTAINED_PORTABLE",
  "self_contained_verified": true,
  "subject": "Mathematics",
  "chapter": "LCM-HCF",
  "deck_name": "Maths::LCM-HCF::StudyLab Procedural",
  "deck_id": 1709214001,
  "apkg_file": "LCM-HCF_StudyLab_Procedural.apkg",
  "generation_timestamp": "2026-08-27T14:45:00.000Z",
  "generation_version": "2.0.0",
  "contract_version": "2.0.0",
  "concept_count": 8,
  "skill_count": 12,
  "question_type_count": 10,
  "archetype_count": 14,
  "variant_count": 28,
  "object_count": 16,
  "difficulty_coverage": {
    "min": 1.5,
    "max": 4.5,
    "mean": 2.85,
    "bands": {
      "1": 2,
      "2": 6,
      "3": 5,
      "4": 3,
      "5": 0
    }
  },
  "coverage_summary": {
    "total_chapter_skills": 12,
    "covered_skills": 12,
    "coverage_percentage": 100.0,
    "uncovered_skills": [],
    "modality_breakdown": {
      "mcq": 14,
      "numerical": 2,
      "stepwise": 0,
      "reference_only": 0
    }
  },
  "question_types": [
    {
      "type_id": "pat-lcm-hcf-001",
      "name": "Product of Two Numbers and LCM-HCF Relationship",
      "object_types": ["mcq"],
      "required_interaction": "mcq_discrete_options",
      "coverage": {
        "instance_count": 3,
        "authentic_pyq_count": 2,
        "synthetic_count": 1
      },
      "hint_status": "COMPLETE_3_TIER",
      "solution_status": "COMPLETE_STEP_GRAPH",
      "diagnostic_status": "EXPLICIT_TAXONOMY_MAPPED",
      "remediation_status": "REMEDIATION_PATH_DECLARED"
    }
  ],
  "items": [
    {
      "note_id": 1709214001101,
      "card_id": 1709214001201,
      "guid": "nK8xL2vP9qR1",
      "practice_question_id": "lcm-hcf-pq-01",
      "pattern_id": "pat-lcm-hcf-001",
      "schema_id": "schema.math.number_system.lcm_hcf.v1",
      "problem_type": "Product-LCM-HCF Relationship",
      "question_type": "mcq",
      "origin_type": "AUTHENTIC_PYQ",
      "domain": "mathematics",
      "problem_family": "family.math.number_system.lcm_hcf",
      "difficulty": 2.5,
      "has_inline_contract": true,
      "is_self_contained": true
    }
  ]
}
```
