# StudyLab Cognitive Error Modeling & Diagnostic Taxonomies (`error-taxonomies.md`)
**Version**: `2.0.0`  
**Classification**: Cognitive Diagnostic Architecture & Remediation Specification  
**Status**: Authoritative Reference

---

## 1. Overview & Pedagogical Mission

In procedural learning, identifying *that* a learner made an error is trivial; understanding *why* they made it is transformative.

StudyLab implements a structured **14-Category Diagnostic Error Taxonomy** across all 4 procedural disciplines (Mathematics, Reasoning, Physics, Chemistry). By mapping every distractor option in MCQs, intermediate step failure in DAGs, and numerical deviation to an explicit diagnostic category, StudyLab enables real-time cognitive modeling and precision automated remediation.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 COGNITIVE TELEMETRY & REMEDIATION FLOW                           │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Learner Attempt ──▶ Telemetry Vector (Correct, Latency, Hints, Distractor ID, Step Nodes)        │
│       │                                                                                          │
│       ▼                                                                                          │
│ Error Taxonomy Mapping ──▶ Diagnoses Specific Cognitive Breakdown (ERR_01 to ERR_14)            │
│       │                                                                                          │
│       ▼                                                                                          │
│ Cognitive State Evaluator ──▶ Determines 1 of 7 Canonical Learner Skill States                   │
│       │                                                                                          │
│       ▼                                                                                          │
│ Adaptive Remediation Router ──▶ Concept Check, Strategy Drill, Faded Example, or Advance         │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 14-Category Domain Diagnostic Taxonomies

| Category Code | Mathematics Error Taxonomy | Reasoning Error Taxonomy | Physics Error Taxonomy | Chemistry Error Taxonomy |
|---|---|---|---|---|
| **`ERR_01`** | `CALCULATION_ARITHMETIC_SLIP` | `MISSED_EXPLICIT_CONDITION` | `WRONG_PHYSICAL_PRINCIPLE` | `CONCEPTUAL_MISUNDERSTANDING` |
| **`ERR_02`** | `FORMULA_SUBSTITUTION_ERROR` | `INVALID_DEDUCTIVE_STEP` | `WRONG_EQUATION_SELECTION` | `UNBALANCED_EQUATION_SETUP` |
| **`ERR_03`** | `CONCEPTUAL_MISUNDERSTANDING` | `FALSE_PREMISE_ASSUMPTION` | `SIGN_CONVENTION_ERROR` | `STOICHIOMETRIC_RATIO_ERROR` |
| **`ERR_04`** | `SIGN_CONVENTION_CONFUSION` | `DIRECTION_FRAME_CONFUSION` | `UNIT_CONVERSION_OMISSION` | `LIMITING_REAGENT_OMISSION` |
| **`ERR_05`** | `FRACTION_NORMALIZATION_FAIL` | `OVERLAPPING_COUNT_ERROR` | `VECTOR_SCALAR_CONFUSION` | `UNIT_DIMENSION_ERROR` |
| **`ERR_06`** | `REMAINDER_OFFSET_TRAP` | `POSSIBILITY_DEFINITE_CONFUSION` | `FREE_BODY_DIAGRAM_OMISSION` | `CALCULATION_ARITHMETIC_SLIP` |
| **`ERR_07`** | `COPRIME_CONDITION_VIOLATION`| `PARITY_INTERVAL_MISCOUNT` | `MASS_ACCELERATION_MISALIGN` | `ICE_EQUILIBRIUM_EXPRESSION` |
| **`ERR_08`** | `UNIT_CONVERSION_FAILURE` | `BLOOD_RELATION_GENDER_TRAP`| `NORMAL_FORCE_INCLINE_TRAP` | `PH_LOG_EXPONENT_CALCULATION` |
| **`ERR_09`** | `INTERMEDIATE_STEP_ABORT` | `CYCLIC_ORDER_INVERSION` | `ENERGY_LOSS_OMISSION` | `REGIOSELECTIVITY_SUBSTRATE_TRAP` |
| **`ERR_10`** | `WRONG_METHOD_SELECTION` | `MATRIX_CASE_SPLIT_FAILURE`| `CIRCUIT_SERIES_PARALLEL_CONFUSION` | `CARBOCATION_REARRANGEMENT_MISS`|
| **`ERR_11`** | `RATIO_ORDER_INVERSION` | `SYLLOGISM_MIDDLE_TERM_FALLACY`| `OPTICS_FOCAL_SIGN_TRAP` | `OXIDATION_NUMBER_BALANCE_SLIP` |
| **`ERR_12`** | `WORD_PROBLEM_PARAM_EXTRACTION`| `RANKING_EXTREME_END_OFFSET`| `ASYMPTOTIC_SANITY_FAILURE` | `PERIODIC_EXCEPTION_RULE_MISS` |
| **`ERR_13`** | `ALGEBRAIC_FACTORING_ERROR` | `PREMATURE_TERMINATION` | `DIMENSIONAL_INCONSISTENCY` | `FARADAY_CONSTANT_UNIT_SLIP` |
| **`ERR_14`** | `SANITY_CHECK_OMISSION` | `CRITICAL_LOGIC_OVERREACH` | `REPRESENTATION_MISINTERPRETATION` | `REVERSIBLE_PROCESS_DIRECTION` |

---

## 3. Deep-Dive Taxonomy Specifications by Discipline

### 3.1 Track B: Mathematics Diagnostics

1. `ERR_01: CALCULATION_ARITHMETIC_SLIP`: Correct formula and setup, but basic multiplication, division, or addition arithmetic error.
2. `ERR_02: FORMULA_SUBSTITUTION_ERROR`: Correct general formula identified, but variables substituted into wrong positions.
3. `ERR_03: CONCEPTUAL_MISUNDERSTANDING`: Fundamental confusion between distinct mathematical operations (e.g. taking HCF when LCM was required).
4. `ERR_04: SIGN_CONVENTION_CONFUSION`: Mismanaging negative numbers during algebraic expansion or transposition.
5. `ERR_05: FRACTION_NORMALIZATION_FAIL`: Applying operations to numerator/denominator without finding LCM of denominators.
6. `ERR_06: REMAINDER_OFFSET_TRAP`: Forgetting to subtract remainder $k$ before finding HCF, or adding remainder after LCM.
7. `ERR_07: COPRIME_CONDITION_VIOLATION`: Selecting non-coprime factor pairs $(a, b)$ where $\gcd(a, b) > 1$ when determining number of possible pairs.
8. `ERR_08: UNIT_CONVERSION_FAILURE`: Neglecting to convert $\text{km/h} \to \text{m/s}$, $\text{hours} \to \text{seconds}$, or $\text{cm}^2 \to \text{m}^2$.
9. `ERR_09: INTERMEDIATE_STEP_ABORT`: Halting after finding intermediate multiplier $x$ instead of computing required final quantity $3x$.
10. `ERR_10: WRONG_METHOD_SELECTION`: Using slow factorization where division algorithm or modular arithmetic was required, causing timeout.
11. `ERR_11: RATIO_ORDER_INVERSION`: Reversing antecedent and consequent ($A:B \to B:A$).
12. `ERR_12: WORD_PROBLEM_PARAM_EXTRACTION`: Misinterpreting English narrative phrasing (e.g., "exceeds by", "diminished by").
13. `ERR_13: ALGEBRAIC_FACTORING_ERROR`: Incorrect splitting of middle terms or incorrect sign in $(a-b)^2$.
14. `ERR_14: SANITY_CHECK_OMISSION`: Submitting impossible values (e.g. HCF greater than given numbers, negative distance).

### 3.2 Track C: Reasoning Diagnostics

1. `ERR_01: MISSED_EXPLICIT_CONDITION`: Overlooking a directly stated negative constraint or definite anchor.
2. `ERR_02: INVALID_DEDUCTIVE_STEP`: Treating an unproven possibility as a definite logical deduction.
3. `ERR_03: FALSE_PREMISE_ASSUMPTION`: Introducing external real-world knowledge into a formal syllogism.
4. `ERR_04: DIRECTION_FRAME_CONFUSION`: Inverting Left/Right perspective when facing South, Center, or Away from Center.
5. `ERR_05: OVERLAPPING_COUNT_ERROR`: Double counting common elements or failing to subtract intersection in linear rankings ($L + R - 1$).
6. `ERR_06: POSSIBILITY_DEFINITE_CONFUSION`: Marking a conclusion "definitely follows" when it only "possibly follows".
7. `ERR_07: PARITY_INTERVAL_MISCOUNT`: Off-by-one errors when counting intermediate people between two positions.
8. `ERR_08: BLOOD_RELATION_GENDER_TRAP`: Assuming person's gender from their name rather than explicit relational operators.
9. `ERR_09: CYCLIC_ORDER_INVERSION`: Inverting clockwise vs counter-clockwise sequence in circular seating.
10. `ERR_10: MATRIX_CASE_SPLIT_FAILURE`: Failing to branch into parallel sub-cases when multiple possibilities open.
11. `ERR_11: SYLLOGISM_MIDDLE_TERM_FALLACY`: Attempting to connect two premises where the middle term is undistributed.
12. `ERR_12: RANKING_EXTREME_END_OFFSET`: Misidentifying the reference end ("from top" vs "from bottom").
13. `ERR_13: PREMATURE_TERMINATION`: Answering before verifying that all entities satisfy remaining constraints.
14. `ERR_14: CRITICAL_LOGIC_OVERREACH`: Choosing an assumption that is broader or stronger than the minimal implicit premise.

### 3.3 Track D: Physics Diagnostics

1. `ERR_01: WRONG_PHYSICAL_PRINCIPLE`: Applying kinematics to a system with non-constant acceleration, or applying energy conservation where non-conservative work occurs.
2. `ERR_02: WRONG_EQUATION_SELECTION`: Using $v = u + at$ when time $t$ is neither given nor required (should use $v^2 = u^2 + 2as$).
3. `ERR_03: SIGN_CONVENTION_ERROR`: Inconsistent coordinate axes (e.g., taking upward velocity as positive and gravity $g$ as positive).
4. `ERR_04: UNIT_CONVERSION_OMISSION`: Using grams instead of kg, cm instead of meters, or minutes instead of seconds in SI formulas.
5. `ERR_05: VECTOR_SCALAR_CONFUSION`: Adding vector magnitudes directly without resolving into orthogonal $x, y$ components.
6. `ERR_06: FREE_BODY_DIAGRAM_OMISSION`: Missing an active contact force (normal reaction, friction, tension) during force balance.
7. `ERR_07: MASS_ACCELERATION_MISALIGN`: Applying $F = ma$ to an isolated component without accounting for total accelerating system mass.
8. `ERR_08: NORMAL_FORCE_INCLINE_TRAP`: Assuming $N = mg$ on an inclined plane instead of $N = mg\cos\theta$.
9. `ERR_09: ENERGY_LOSS_OMISSION`: Assuming kinetic energy is conserved in an inelastic collision.
10. `ERR_10: CIRCUIT_SERIES_PARALLEL_CONFUSION`: Treating parallel resistors as series ($R_{eq} = R_1 + R_2$ instead of $1/R_1 + 1/R_2$).
11. `ERR_11: OPTICS_FOCAL_SIGN_TRAP`: Assigning positive focal length to a concave mirror or negative to a convex lens under Cartesian conventions.
12. `ERR_12: ASYMPTOTIC_SANITY_FAILURE`: Accepting answers that violate physical limits (e.g. speed $v > c$, efficiency $\eta > 100\%$, negative absolute temperature).
13. `ERR_13: DIMENSIONAL_INCONSISTENCY`: Adding quantities with mismatched dimensions (e.g., adding velocity $[LT^{-1}]$ to acceleration $[LT^{-2}]$).
14. `ERR_14: REPRESENTATION_MISINTERPRETATION`: Misreading graph slopes (e.g., treating $v-t$ slope as velocity instead of acceleration).

### 3.4 Track E: Chemistry Diagnostics

1. `ERR_01: CONCEPTUAL_MISUNDERSTANDING`: Confusing molarity (mol/L) with molality (mol/kg) or normality (eq/L).
2. `ERR_02: UNBALANCED_EQUATION_SETUP`: Performing stoichiometric calculations using an unbalanced chemical equation.
3. `ERR_03: STOICHIOMETRIC_RATIO_ERROR`: Direct mass-to-mass comparison without converting to mole ratios.
4. `ERR_04: LIMITING_REAGENT_OMISSION`: Calculating theoretical yield based on excess reactant rather than limiting reactant.
5. `ERR_05: UNIT_DIMENSION_ERROR`: Using gas constant $R = 8.314\text{ J/(mol}\cdot\text{K)}$ with pressure in atmospheres and volume in liters (should use $0.0821\text{ L}\cdot\text{atm/(mol}\cdot\text{K)}$).
6. `ERR_06: CALCULATION_ARITHMETIC_SLIP`: Arithmetic error in multi-step molar mass summation.
7. `ERR_07: ICE_EQUILIBRIUM_EXPRESSION`: Omitting stoichiometric exponents in $K_c = [C]^c / [A]^a [B]^b$ or including pure solids/liquids.
8. `ERR_08: PH_LOG_EXPONENT_CALCULATION`: Sign error in $\text{pH} = -\log[H^+]$ or failing to convert $\text{pOH} \to \text{pH}$ ($14 - \text{pOH}$).
9. `ERR_09: REGIOSELECTIVITY_SUBSTRATE_TRAP`: Predicting anti-Markovnikov addition in the absence of peroxides, or predicting $S_N2$ on a tertiary halide.
10. `ERR_10: CARBOCATION_REARRANGEMENT_MISS`: Overlooking hydride or methyl shifts to form more stable $3^\circ$ carbocations.
11. `ERR_11: OXIDATION_NUMBER_BALANCE_SLIP`: Incorrect electron balance in ion-electron redox equations.
12. `ERR_12: PERIODIC_EXCEPTION_RULE_MISS`: Neglecting half-filled/fully-filled orbital stability (e.g. Ionization Energy: $N > O$, $Be > B$).
13. `ERR_13: FARADAY_CONSTANT_UNIT_SLIP`: Misapplying $Q = It = n F$ or forgetting valence factor $z$.
14. `ERR_14: REVERSIBLE_PROCESS_DIRECTION`: Applying Le Chatelier's principle in the wrong direction for exothermic/endothermic heat perturbations.

---

## 4. The 7 Canonical Learner Cognitive States

The runtime cognitive engine evaluates telemetry vectors across successive attempts into 7 deterministic states:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               7 CANONICAL LEARNER COGNITIVE STATES                               │
├───────────────────────┬───────────────────────────────────────────┬──────────────────────────────┤
│ LEARNER COGNITIVE     │ TELEMETRY TRIGGER CRITERIA                │ ACTIONABLE REMEDIATION ROUTE │
│ STATE                 │                                           │                              │
├───────────────────────┼───────────────────────────────────────────┼──────────────────────────────┤
│ 1. `STRONG`           │ `correct = true` AND `latency <= target`  │ Advance to higher difficulty │
│                       │ AND `hints_used = 0`                      │ ($D + 0.5$) or transfer type.│
├───────────────────────┼───────────────────────────────────────────┼──────────────────────────────┤
│ 2. `SPEED_WEAKNESS`   │ `correct = true` AND `latency > 1.5x`     │ Strategy drill / shortcut    │
│    (Accurate but slow)│ AND `hints_used = 0`                      │ comparison training.         │
├───────────────────────┼───────────────────────────────────────────┼──────────────────────────────┤
│ 3. `WEAK`             │ `correct = false` (general failure)       │ Same skill at lower          │
│                       │                                           │ difficulty ($D - 0.5$).      │
├───────────────────────┼───────────────────────────────────────────┼──────────────────────────────┤
│ 4. `CONCEPT_WEAKNESS` │ Repeated errors across multiple           │ Concept check card +         │
│                       │ representation variants of same concept   │ prerequisite theory review.  │
├───────────────────────┼───────────────────────────────────────────┼──────────────────────────────┤
│ 5. `TRANSFER_WEAKNESS`│ Success on direct computation, but        │ Worked example + guided      │
│                       │ failure on novel context / word problem   │ contextual faded drill.      │
├───────────────────────┼───────────────────────────────────────────┼──────────────────────────────┤
│ 6. `STRATEGY_WEAKNESS`│ Suboptimal method choice leading to       │ Method comparison drill with │
│                       │ timeout or calculation arithmetic slip    │ explicit efficiency tradeoff.│
├───────────────────────┼───────────────────────────────────────────┼──────────────────────────────┤
│ 7. `HINT_DEPENDENCE`  │ `correct = true` BUT `hints_used >= 2`    │ Sibling problem instance     │
│                       │ on consecutive attempts                   │ with hints disabled.         │
└───────────────────────┴───────────────────────────────────────────┴──────────────────────────────┘
```

---

## 5. Telemetry Variables & Interpretation Rules

```typescript
export interface PracticeTelemetry {
  item_id: string;
  is_correct: boolean;
  latency_ms: number;
  target_latency_ms: number;
  hints_used: number; // 0, 1, 2, 3
  selected_option_id?: string;
  diagnosed_error_code?: string; // e.g. "ERR_06"
  step_node_results?: Array<{
    step_id: string;
    passed: boolean;
    attempts: number;
  }>;
}
```

### 5.1 Telemetry Interpretation Logic
1. **Accuracy ($\text{is\_correct}$)**: Primary threshold. A failure immediately routes to cognitive error diagnosis.
2. **Speed Ratio ($\text{latency\_ms} / \text{target\_latency\_ms}$)**:
   - $\le 1.0$: Optimal mastery.
   - $1.0 - 1.5$: Acceptable processing.
   - $> 1.5$: Speed weakness (procedural fluency lag or suboptimal method selection).
3. **Hint Penalty Weight**:
   - $0 \text{ hints}$: $1.0 \times \text{Mastery Score}$
   - $1 \text{ hint (Principle)}$: $0.8 \times \text{Mastery Score}$
   - $2 \text{ hints (Operation)}$: $0.5 \times \text{Mastery Score}$
   - $3 \text{ hints (Intermediate)}$: $0.2 \times \text{Mastery Score}$
4. **Distractor Misconception Key**:
   - In MCQs, each distractor $D_k$ is tagged with its specific `error_code`. Selecting $D_k$ directly informs the remediation router which sub-skill requires intervention.

---

## 6. Hard Learner-State Isolation Invariant

> [!CAUTION]
> **ARCHITECTURAL FIREWALL**:
> 1. **Authoring Scope (`study-source-core`)**:
>    - Authoring files (`ProblemPatterns.json`, `PracticeQuestions.json`, `.manifest.json`, and `.apkg` payloads) contain **STATIC DIAGNOSTIC BLUEPRINTS**: error taxonomies, hint tiers, decision trees, and target latency models.
> 2. **Runtime Scope (`procedural.db`)**:
>    - Dynamic learner progress (`SkillState`, attempt logs, mastery scores, FSRS intervals, hint history, remediation queues) is **STRICTLY RUNTIME-OWNED**.
> 3. **PROHIBITION**: Authoring artifacts MUST NEVER store hardcoded learner histories, attempt counts, or user states.
