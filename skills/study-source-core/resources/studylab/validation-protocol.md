# StudyLab Multi-Tier Validation Protocol (Levels 1–7) (`validation-protocol.md`)
**Version**: `2.1.0`  
**Engine**: `validate_studylab_levels_1_6.js`  
**Classification**: Authoritative Multi-Tier Validation Architecture  
**Status**: Release-Blocking

---

## 1. Architectural Philosophy & The Decoupling Invariant

Traditional Anki package validators only check low-level SQLite syntax and media references. In StudyLab's procedural learning architecture, binary format correctness is necessary but completely insufficient.

The StudyLab Multi-Tier Validator (`validate_studylab_levels_1_6.js`) strictly separates low-level container serialization from deep pedagogical contracts across **7 independent validation tiers**:

```
+--------------------------------------------------------------------------------------------------+
¦                               7-TIER MULTI-LEVEL VALIDATION STACK                                ¦
+--------------------------------------------------------------------------------------------------¦
¦ Level 1: PACKAGE STRUCTURE  --? ZIP, SQLite tables (col, notes, cards), Model 1600000004, HTML.  ¦
¦ Level 2: SCHEMA VALIDATION  --? Ajv JSON Schema conformance, checked arithmetic, integer bounds. ¦
¦ Level 3: MODALITY INTEGRITY --? Anti-Fallback Invariant: Prohibits textboxes, enforces >=4 opts. ¦
¦ Level 4: COVERAGE COMPLETE  --? Question Type != Instance; chapter skill & problem type coverage.¦
¦ Level 5: LEARNING COMPLETE  --? 3-State DFS Acyclic DAGs, 3-Tier hints, Hint Anti-Leak regex.    ¦
¦ Level 6: ADAPTIVE SEMANTICS --? Decision points, 14-category error taxonomies, remediation paths.¦
¦ Level 7: PRACTICE DEPTH     --? Detects shallow 1-problem-per-type, enforces variant quality.    ¦
+--------------------------------------------------------------------------------------------------+
```

> [!IMPORTANT]
> **THE DECOUPLING INVARIANT**:
> *"A package can PASS Level 1 and Level 2 with 100% valid JSON and SQLite tables, but **FAIL Level 4** (missing chapter skills), **FAIL Level 5** (cyclic DAG or hint leaking answer), or **FAIL Level 7** (shallow copy-paste template without variant progression). All 7 levels must unanimously emit `PASS` for release approval."*

---

## 2. Level 1: Package Structure Validation

Level 1 validates the physical `.apkg` container, SQLite database integrity, note model registrations, and HTML rendering safety.

```
APKG Archive (.zip)
  +-- collection.anki2 (SQLite 3 DB)
  ¦     +-- col   --? Model ID: 1600000004 ("StudyLab Procedural Anchor")
  ¦     +-- notes --? ProceduralPayload, TopicTitle, Domain, Provenance
  ¦     +-- cards --? did, nid, ord >= 0
  +-- media (JSON mapping / static assets)
```

### 2.1 Level 1 Verification Checklist & Invariants
1. **ZIP Archive Integrity**: Valid, uncorrupted ZIP archive containing SQLite database entry `collection.anki2`.
2. **SQLite Database Schema**: Tables `col`, `notes`, `cards`. Model ID `1600000004` (`StudyLab Procedural Anchor`) registered in `col.models` with required field `ProceduralPayload` at ordinal 0.
3. **Note & Card Integrity**: Non-empty `guid` ($\ge 8$ chars), field separator `\u001f`, valid foreign keys, non-negative ordinals.
4. **HTML Rendering Safety**: Scans rendered fields for unclosed tags, `<script>`, and inline handlers.

---

## 3. Level 2: Schema Conformance & Checked Arithmetic

Level 2 parses the `ProceduralPayload` JSON and validates it against formal Draft-07 schemas using `Ajv`.
- `studylab-apkg-schema.json`: Root anchor schema.
- `studylab-rich-content-contract.schema.json`: Full `inline_contract` blueprint.
- `studylab-provenance.schema.json`: Exam and source provenance metadata.

---

## 4. Level 3: Modality Integrity & Anti-Fallback Invariant

Level 3 enforces authentic interaction modalities:
- **Multiple Choice**: $\ge 4$ discrete option buttons, 1 correct option, authentic misconception distractors.
- **Numerical / Quantitative**: Numeric input with SI units and numerical tolerances.
- **Stepwise**: Procedural step DAG interaction.
- **ConceptCheck / StrategyDrill / WorkedExample**: Specialized pedagogical interactions.
- **Absolute Anti-Fallback**: Rejects `<input type="text">`, "Type your answer...", and placeholder blanks.

---

## 5. Level 4: Coverage Completeness ($\text{Question Type} \neq \text{Instance}$)

Level 4 enforces that declared `question_type_count` reflects genuine structural problem topologies rather than superficial numeric permutations.

---

## 6. Level 5: Learning Completeness (DFS DAGs & Progressive Hints)

- **DFS 3-State Acyclicity**: Evaluates node states (White: unvisited, Gray: active recursion, Black: processed). Rejects self-loops, 2-node cycles, multi-node cycles, and dangling step references.
- **3-Tier Progressive Hints**: `hint_principle` (T1), `hint_operation` (T2), `hint_intermediate` (T3).
- **Hint Anti-Leak Regex**: Rejects premature answer leaks in Tiers 1 and 2 matching `/?????\s*(?:??|:)\s*(\d+)/i`, `/answer\s*(?:is|:)\s*(\d+)/i`, or `/=\s*(\d{2,})/`.

---

## 7. Level 6: Adaptive Semantics & Diagnostics

- Verifies domain binding (`mathematics`, `reasoning`, `physics`, `chemistry`).
- Enforces non-empty `decision_points` and `error_categories` taxonomies mapped to 14 domain-specific error codes (`ERR01` to `ERR14`).
- Validates `target_latency_model` bounds and enforces zero transient runtime state in packages.

---

## 8. Level 7: Practice Depth & Variant Quality

Level 7 evaluates whether the declared chapter problem space has adequate practice depth:
1. **Shallow Coverage Detection**: Flags chapters where question types lack variant depth (intercepts shallow 1-example-per-type coverage).
2. **Meaningful Variant Quality**: Distinguishes structural mutations, parameter range transitions, constraint boundary shifts, and representation changes from superficial numeric substitutions.
3. **Difficulty Dispersion**: Enforces valid difficulty boundaries $[1.0, 5.0]$ and rejects multi-item packages with uniform flat difficulty ($min = max$).

---

## 9. 15-Check Adversarial Auditor Harness

Implemented in `test_adversarial_auditor.js`:
- **ADV-01**: Incomplete Chapter Coverage Interception
- **ADV-02**: Superficial Numerical Variation Inflation
- **ADV-03**: Generic Textbox Intrusion (Absolute Anti-Fallback)
- **ADV-04**: MCQ Options Loss / Dummy Options
- **ADV-05**: Pipeline Crosstalk & Model Isolation
- **ADV-06**: Cross-Domain Rule Contamination
- **ADV-07**: Diagnostic Granularity / Collapse Prevention
- **ADV-08**: Runtime Attempt Intelligibility & Adaptive Telemetry
- **ADV-09**: Problem Space Self-Explanation & Manifest Integrity
- **ADV-10**: Premature Hint Answer Leak & DAG Cycles
- **ADV-11**: One-Example-Per-Type Shallow Coverage Detection (L7)
- **ADV-12**: Inappropriate Descriptive Theory Content Rejection
- **ADV-13**: Missing Solution Graph / Answer-Only Bypass
- **ADV-14**: Duplicate Package Generation & Unnecessary Processing
- **ADV-15**: Generic StudySourceCore Declarative Pipeline Regression Protection

---

## 10. Canonical Scorecard Output Example

```
================================================================================
  STUDYLAB MULTI-TIER APKG VALIDATION SCORECARD (LEVELS 1-7)
  Package: Percentage_StudyLab_Procedural.apkg
  Overall Verdict: ? PASS (100% Validated)
================================================================================
  Level 1 [Package Structure               ]: ? PASS (0 errors, 0 warnings)
  Level 2 [Schema Validation               ]: ? PASS (0 errors, 0 warnings)
  Level 3 [Modality Integrity              ]: ? PASS (0 errors, 0 warnings)
  Level 4 [Coverage Completeness           ]: ? PASS (0 errors, 0 warnings)
  Level 5 [Learning Completeness           ]: ? PASS (0 errors, 0 warnings)
  Level 6 [Adaptive Semantics              ]: ? PASS (0 errors, 0 warnings)
  Level 7 [Practice Depth & Variant Quality]: ? PASS (0 errors, 0 warnings)
================================================================================
```
