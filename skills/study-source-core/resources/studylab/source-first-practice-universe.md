# Source-First Practice Universe Specification (`source-first-practice-universe.md`)

## 1. Core Principle & Practice Philosophy

**STUDYLAB PRACTICE MUST BE SOURCE-FIRST.**

The StudyLab Procedural APKG is **NOT** a generic question bank and **NOT** primarily a synthetic random-number generator.
It is a curated procedural practice universe built primarily from **IMPORTANT, DISTINCT, REAL SOURCE / EXAM QUESTIONS**, enriched with StudyLab deep semantics.

Generated variants are a **SECONDARY / OPTIONAL** fallback layer.

---

## 2. Practice Tier Hierarchy & Resolution Priority

When authoring, assembling, or evaluating a StudyLab practice universe, content must be resolved in strict order of priority:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             PRACTICE UNIVERSE RESOLUTION ORDER                           │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. IMPORTANT DISTINCT SOURCE QUESTIONS (Primary Foundation)                              │
│    • Real historical exam questions (PYQs) and core standard authoritative problems.      │
│    • Preserves authentic problem setups, context, constraints, nuances, and traps.       │
│    • MUST NOT be collapsed or deduplicated into generic single examples.                │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. CANONICAL REPRESENTATIVE QUESTIONS (Curricular Bridge)                                │
│    • Authored standard representations where source material lacks full archetype depth. │
│    • Serves as the golden benchmark for problem classes without direct PYQ coverage.     │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. GENERATED VARIANTS (Secondary / Optional Layer)                                       │
│    • Parameterized algorithmic permutations produced from valid procedural molds.        │
│    • Useful for targeted remediation and infinite drill, but NOT a substitute for       │
│      distinct source coverage.                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Tripartite Conceptual Separation

StudyLab authoring and validation strictly separates three distinct concepts across all manifests, metrics, and models:

```
           ┌──────────────────────────────────────────────────────────────┐
           │                      QUESTION TYPE                           │
           │  Abstract procedural archetype and core problem structure    │
           │  (e.g., "Two-Stage Successive Percentage Discount")          │
           └──────────────────────────────┬───────────────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
┌───────────────────────────────────┐           ┌───────────────────────────────────┐
│          SOURCE QUESTION          │           │        GENERATED INSTANCE         │
│  Real, distinct problem from exam │           │  Synthetic variation generated    │
│  or textbook with unique context, │           │  from mold with altered numeric   │
│  numbers, wording, or traps.      │           │  parameters.                      │
└───────────────────────────────────┘           └───────────────────────────────────┘
```

### Tripartite Invariants:
1. **Cardinality Distinction**:
   - `question_type_count`: The number of unique pedagogical deep problem structures.
   - `source_question_count`: The number of distinct real source/exam problems preserved.
   - `canonical_question_count`: The number of distinct canonical representative items.
   - `generated_variant_count`: The number of algorithmic parameter variations available or pre-generated.
   - `instance_count`: Total solvable problem instances in the universe ($= \text{source} + \text{canonical} + \text{generated}$).

2. **Non-Equivalence Invariant**:
   $$\text{Question Type} \neq \text{Source Question} \neq \text{Generated Instance}$$
   A package with 10 Question Types and 200 random number instances has **Question-Type Count = 10, Instance Count = 200**, NOT 200 Question Types.

---

## 4. No-Collapsing Rule for Distinct Source Questions

Authors and automated pipelines **MUST NOT** deduplicate or collapse distinct real source questions solely because:
- The underlying mathematical formula is identical.
- The solution method belongs to the same pattern family.
- The question type classification is shared.

### When Source Questions MUST Remain Distinct:
Two source questions must be retained as separate, distinct entries in `PracticeQuestions.json` and the APKG whenever they differ in any of the following dimensions:
1. **Wording & Presentation**: Different verbal framing or terminology.
2. **Context & Scenario**: Different real-world setting (e.g., salary increment vs area mensuration).
3. **Reasoning Path & Decision Points**: Different intermediate branch choices.
4. **Active Constraints**: Different domain boundaries (e.g., coprime requirement vs non-zero fraction).
5. **Trap Density**: Different distractor designs and cognitive traps.
6. **Required Transformations**: Different algebraic or unit-conversion setups.
7. **Exam History**: Different examination origin, shift, or year.

---

## 5. Modality Preservation & Anti-Fallback

1. **MCQ Preservation**: If a source problem appeared as a multiple-choice question with distinct options, it must be authored as an authentic `mcq` with $\ge 4$ options. Options must not be discarded to turn it into a generic blank.
2. **Numerical Preservation**: Problems requiring precise integer or decimal computation must use `numerical` with explicit tolerance and physical unit constraints.
3. **Stepwise Preservation**: Complex multi-step reasoning problems must use `stepwise` with full DAG solution graphs.
4. **Absolute Anti-Fallback**: Generic textboxes (`<input type="text">`, "Type your answer...") are categorically forbidden across all questions.

---

## 6. Multi-Dimensional Package Readiness Metrics

To prevent superficial "100% coverage" illusions where only 1 question per type exists without practice depth, StudyLab packages report a 4-dimensional readiness breakdown:

| Readiness Metric | Formula / Definition | Release Target |
|---|---|---|
| **Structural Coverage** | $\frac{\text{covered\_question\_types}}{\text{required\_question\_types}} \times 100\%$ | $100\%$ |
| **Source Depth** | $\frac{\text{source\_question\_count}}{\text{required\_source\_benchmark}} \times 100\%$ | $\ge 80\%$ |
| **Variant Depth** | $\frac{\text{generated\_variant\_count}}{\text{target\_variant\_benchmark}} \times 100\%$ | Optional / Supplemental |
| **Mock Readiness** | $\min(\text{Structural Coverage}, \text{Source Depth}, \text{Learning Completeness})$ | $\ge 90\%$ |

---

## 7. Provenance & Source Grounding

Every source question in `PracticeQuestions.json` must record rigorous provenance:
```json
{
  "source": "SSC CGL Tier-1 2023",
  "exam": "SSC CGL",
  "year": 2023,
  "shift": "Shift 1",
  "question_number": "Q05"
}
```
If a question is canonical rather than directly cited from a specific past paper:
```json
{
  "source": "Canonical Representative Problem",
  "standard": "Standard Indian Quantitative Curricula (CBSE / NCERT / SSC Standard)"
}
```
