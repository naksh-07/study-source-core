# StudyLab Procedural & Practice Content Contract (`studylab-procedural-contract.md`)
**Phase 40 Canonical Authoring Specification**

This document defines the exhaustive, authoritative specification, data models, runtime boundaries, capability classifications, parameter domains, answer derivations, solution graphs, and validation standards for **Machine-Readable Procedural Knowledge & Authentic Practice Content (StudyLab Phase 40 Core Architecture)** within `study-source-core`.

---

## 1. Core Content Architecture: Phase 40 System Model

StudyLab enforces a strict separation across architectural layers:

```text
Source Content (PYQ / Curated Sources)
      │
      ▼
PracticeItem / ProblemPattern
      │
      ▼
Rich Declarative Contract (DeclarativeFamilyContract)
      │
      ▼
APKG ProceduralPayload (ProceduralCardAnchor: routing / inline_contract)
      │
      ▼
StudyLab Runtime Mold (Declarative / Domain Solvers)
      │
      ▼
ProblemInstance (Ephemeral Seeded Practice Item)
```

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        PHASE 40 ARCHITECTURAL BOUNDARIES                         │
├──────────────────────────┬───────────────────────────────────────────────────────┤
│ Layer                    │ Scope & Canonical Representation                      │
├──────────────────────────┼───────────────────────────────────────────────────────┤
│ 1. Source Content        │ PracticeItem / ProblemPatterns                        │
│                          │ (Solvable questions, deep structure, authentic PYQs)  │
├──────────────────────────┼───────────────────────────────────────────────────────┤
│ 2. Rich Content Contract │ DeclarativeFamilyContract                             │
│                          │ (Family metadata, archetypes, parameter domains,      │
│                          │  constraints, derivations, step nodes, target latency)│
├──────────────────────────┼───────────────────────────────────────────────────────┤
│ 3. APKG Anchor           │ ProceduralPayload / ProceduralCardAnchor              │
│                          │ (Routing, optional inline_contract, difficulty, seed) │
├──────────────────────────┼───────────────────────────────────────────────────────┤
│ 4. Runtime Generation    │ ProblemInstance / PracticeSessionObject               │
│                          │ (Transient seeded instance & active review session)   │
├──────────────────────────┼───────────────────────────────────────────────────────┤
│ 5. Learner Persistence   │ SkillState / PracticeAttempt / RemediationQueue / FSRS│
│    (STRICTLY RUNTIME-ONLY│ (Stored in procedural runtime DB: procedural.db)      │
└──────────────────────────┴───────────────────────────────────────────────────────┘
```

### Core Invariants:
1. **`1 Pattern != 1 Question`**: A single problem pattern/schema can contain multiple distinct source questions ($Q_1, Q_2, \dots, Q_n$). All distinct solvable source questions remain distinct and must **NEVER** be collapsed or deduplicated merely because they share a family, schema, pattern, or archetype.
2. **Complementary Sibling Artifacts**: `ProblemPatterns.json` (HOW) and `PracticeQuestions.json` (WHAT) reside side-by-side inside `Study Materials/[Subject]/[Chapter]/Optional/` alongside human-readable `[Chapter]_ProblemPatterns.md`.
3. **Additive Non-Destructive Guarantee**: Procedural and practice question artifacts do NOT replace Notes, Basic flashcards, Cloze cards, or declarative `.apkg` packages.
4. **Evidence-Grounded**: All problem types, algorithms, and questions must be strictly extracted from the authorized source material without synthetic hallucination or fabricated exam citations.
5. **Hindi-First Language Policy**: Explanatory prose, step-by-step algorithms, decision rules, error logs, and solutions adhere to Hindi-first standards (standard English technical terms in parentheses `( )`). Technical equations, variables, and units remain in natural technical form.
6. **Hard Learner-State Isolation**: `SkillState`, `PracticeAttempt` history, mistake logs, historical latency logs, mastery scores, confidence levels, remediation queues, scheduling intervals, FSRS parameters, and transient review session state are strictly runtime-managed (`procedural.db`) and MUST NEVER be encoded into static authoring JSON or APKG payloads.

---


### SOURCE-FIRST StudyLab Lineage Invariant
- Distinct eligible real source questions are mandatory.
- Generated/mold variants are optional and must never be required for L7/pass.
- Create/retain a canonical source-question inventory/lineage from the authorized evidence.
- L7 must reconcile that inventory against the final APKG so dropped/collapsed eligible source questions fail validation.
- Do NOT restore any generated-variant/shallow-coverage threshold.

## 2. Canonical APKG Note Type & Card Anchor Contract

The StudyLab procedural flashcard package (`[Chapter]_StudyLab_Procedural.apkg`) uses a dedicated procedural note type designed for dynamic runtime interception:

```text
Note Type:
StudyLab Procedural Anchor

Fields (Total 4):
1. ProceduralPayload
2. TopicTitle
3. Domain
4. Provenance

Template:
Front and Back ONLY render {{ProceduralPayload}}
```

### Canonical Card Anchor Schema (`ProceduralCardAnchor`):
Defined in `schemas/studylab-apkg-schema.json`:

```typescript
export type SeedMode =
  | 'random'
  | 'daily'
  | { fixed: number };

export interface ProceduralCardAnchor {
  proc_schema: string;
  seed_mode?: SeedMode;
  difficulty_override?: number | null;
  inline_contract?: DeclarativeFamilyContract | null;
}
```

### Self-Contained APKG Invariant & Resolution Precedence:

The StudyLab runtime (`rslib/procedural/src/service/mod.rs:463-550`) resolves card anchors in strict precedence order:

1. **Tier 1 (Top Precedence): Modern Rich APKG Path (`inline_contract`)**:
   - `inline_contract` carries the complete declarative blueprint (`DeclarativeFamilyContract`).
   - The engine validates the contract, dynamically registers the problem family into the runtime registry, and generates the problem instance on-the-fly.
   - **MANDATORY FOR PORTABLE / STANDALONE APKGS**: Guaranteed to work after standard Anki `.apkg` import on a clean/fresh profile with zero external database pre-seeding.

2. **Tier 2 (Fallback): Legacy Catalog Path (`proc_schema`)**:
   - Dispatches to built-in hardcoded Rust problem families in `ProblemRegistry`.

### Field Definitions & Semantics:
- **`proc_schema` (Required, `string`)**: Canonical schema or problem family identifier (e.g. `"schema.math.number_system.lcm_hcf.v1"`, `"percentage_successive"`, `"seating_circular"`).
- **`inline_contract` (Mandatory for Portable APKGs, `DeclarativeFamilyContract`)**: Full self-contained declarative family contract bundled directly in the anchor. When present, cards generate dynamically with zero pre-seeded database dependencies.
- **`difficulty_override` (Optional, `number`)**: Floating-point difficulty target between `1.0` and `5.0` overriding the archetype default.
- **`seed_mode` (Optional, `SeedMode`)**:
  - `'random'` (default): Generates dynamic spaced variations on each review.
  - `'daily'`: Generates a deterministic variation synchronized for the calendar day.
  - `{ fixed: number }`: Pinned numerical seed for benchmark testing or deterministic verification.

---

## 3. Rich Declarative Family Contract (`DeclarativeFamilyContract`)

Defined in `schemas/studylab-rich-content-contract.schema.json` and `rslib/procedural/src/problems/contract.rs:764-909`:

```typescript
export interface DeclarativeFamilyContract {
  contract: ProblemFamilyContract;
  archetypes: DeclarativeArchetype[];
}

export interface ProblemFamilyContract {
  family_id: string;             // e.g. "family.math.number_system.lcm_hcf"
  skill_id: string;              // e.g. "math.number_system.lcm_hcf"
  domain: "mathematics" | "reasoning" | "physics" | "chemistry";
  default_schema: string;        // e.g. "schema.math.number_system.lcm_hcf.v1"
  capability: ProblemFamilyCapability; // "declarative" | "constraint_solver" | "symbolic_logic" | "domain_physics" | "domain_chemistry" | "domain_geometry" | "specialized"
  min_difficulty: number;        // 1.0 to 5.0 (default 1.0)
  max_difficulty: number;        // 1.0 to 5.0 (default 5.0)
  supported_variants: string[];  // e.g. ["lcm_two_numbers", "hcf_two_numbers"]
  variant_categories: VariantCategory[]; // ["parameter", "isomorphic", "structural", "contextual", "multi_concept", "transfer"]
  target_latency_model: Record<number, number>; // { 1: 25000, 2: 35000, 3: 50000, 4: 65000, 5: 80000 }
  structural_tags: string[];     // ["number_system", "arithmetic", "factors"]
  decision_points: string[];     // ["prime_factorization", "division_method"]
  error_categories: string[];    // ["common_factor_omission", "arithmetic_slip"]
  prerequisites: string[];       // ["prime_numbers", "divisibility"]
  provenance?: ContentProvenance | null;
  metadata?: Record<string, unknown>;
}

export interface DeclarativeArchetype {
  archetype_id: string;          // e.g. "math.ns.lcm_two_num"
  difficulty_level: number;       // 1 to 5
  variant_category: VariantCategory;
  variant_name: string;          // e.g. "lcm_two_numbers"
  parameters: ParameterSpec[];
  constraints: ConstraintSpec[];
  prompt_template: string;       // LaTeX-ready template with {param} placeholders
  answer_derivation: AnswerDerivation;
  answer_formatted_template: string; // e.g. "{answer}"
  solution_template: string;     // Detailed step-by-step Hindi-first explanation
  step_nodes: StepNodeSpec[];    // 3-tier progressive hint nodes
  target_time_ms: number;        // e.g. 25000 (1000 to 600000)
}
```

---

## 4. Parameter Domains: The 16 Canonical Variants

Defined in `rslib/procedural/src/problems/contract.rs:180-268` (`#[serde(tag = "type", rename_all = "snake_case")]`). All 16 variants must adhere to strict arithmetic hardening rules:

```typescript
export type ParameterDomain =
  | { type: "integer_range"; min: number; max: number; step?: number | null; non_zero?: boolean | null }
  | { type: "float_range"; min: number; max: number; precision: number }
  | { type: "discrete_choice"; values: unknown[] }
  | { type: "derived_linear"; a_param: string; x_param: string; b_param: string }
  | { type: "derived_product"; a_param: string; b_param: string }
  | { type: "derived_sum"; a_param: string; b_param: string }
  | { type: "derived_difference"; a_param: string; b_param: string }
  | { type: "derived_quotient"; a_param: string; b_param: string; precision?: number | null }
  | { type: "derived_signed_string"; param: string }
  | { type: "derived_power"; base_param: string; exponent: number }
  | { type: "derived_percentage"; base_param: string; rate_param: string }
  | { type: "derived_hypotenuse"; a_param: string; b_param: string }
  | { type: "derived_pythagorean_leg"; c_param: string; a_param: string }
  | { type: "permutation_choice"; pool: string[]; count: number }
  | { type: "prime_factor_grid"; base_primes: number[]; min_exponents: number[]; max_exponents: number[] }
  | { type: "coprime_pair"; min: number; max: number };
```

### Exhaustive Specifications & Hardening Rules:

| # | Variant Type | Parameters | Formula / Behavior | Hardening Invariants |
|---|---|---|---|---|
| 1 | `integer_range` | `min`, `max`, `step`, `non_zero` | Random integer in $[min, max]$ with optional step | $min \le max$; $step > 0$; $max.checked\_sub(min)$ no overflow; non-zero if requested |
| 2 | `float_range` | `min`, `max`, `precision` | Random float rounded to $precision$ decimals | $min \le max$; rejects NaN and $\pm\infty$; $0 \le precision \le 10$ |
| 3 | `discrete_choice` | `values` | Uniform random choice from array | $!values.is\_empty()$ |
| 4 | `derived_linear` | `a_param`, `x_param`, `b_param` | $target = a \cdot x + b$ | Saturating arithmetic; rejects missing parameters |
| 5 | `derived_product` | `a_param`, `b_param` | $target = a \cdot b$ | Saturating arithmetic on integers/floats |
| 6 | `derived_sum` | `a_param`, `b_param` | $target = a + b$ | Saturating arithmetic |
| 7 | `derived_difference` | `a_param`, `b_param` | $target = a - b$ | Saturating arithmetic |
| 8 | `derived_quotient` | `a_param`, `b_param`, `precision` | $target = a / b$ | Guarded against $b = 0$ (returns 0.0 or safe fallback) |
| 9 | `derived_signed_string` | `param` | String formatted as `+ b` or `- |b|` | Uses `unsigned_abs()` to prevent `i64::MIN` negation overflow panic |
| 10 | `derived_power` | `base_param`, `exponent` | $target = base^{exp}$ | $0 \le exp \le 10$; checked integer power |
| 11 | `derived_percentage` | `base_param`, `rate_param` | $target = (base \cdot rate) / 100$ | Guarded floating-point arithmetic |
| 12 | `derived_hypotenuse` | `a_param`, `b_param` | $target = \sqrt{a^2 + b^2}$ | Evaluates hypotenuse; rounded to int or 2 decimals |
| 13 | `derived_pythagorean_leg` | `c_param`, `a_param` | $target = \sqrt{\max(0, c^2 - a^2)}$ | Guarded against $c < a$ (returns 0) |
| 14 | `permutation_choice` | `pool`, `count` | Random selection of $count$ distinct items | $!pool.is\_empty()$; $0 < count \le pool.len()$ |
| 15 | `prime_factor_grid` | `base_primes`, `min_exponents`, `max_exponents` | $N = \prod p_i^{e_i}$ | $base\_primes > 0$; $1 \le min\_e \le max\_e \le 63$; checked power |
| 16 | `coprime_pair` | `min`, `max` | Produces $(a, b) \in [min, max]$ with $\gcd(a, b) = 1$ | $min \le max$; rejection sampling with max 20 attempts |

---

## 5. Constraints: The 7 Canonical Variants (`ConstraintSpec`)

Defined in `schemas/studylab-rich-content-contract.schema.json` and `rslib/procedural/src/problems/contract.rs:474-495`:

```typescript
export type ConstraintSpec =
  | { type: "not_equal"; param_a: string; param_b: string }
  | { type: "non_zero"; param: string }
  | { type: "divisible"; numerator: string; denominator: string }
  | { type: "greater_than"; param_a: string; param_b: string }
  | { type: "less_than"; param_a: string; param_b: string }
  | { type: "sum_equals"; param_a: string; param_b: string; target: number }
  | { type: "predicate"; name: string };
```

### Exact Parameter Shapes & Semantic Meaning:
1. **`not_equal`**: `{ type: "not_equal", param_a: "val_a", param_b: "val_b" }` — Enforces $param\_a \ne param\_b$.
2. **`non_zero`**: `{ type: "non_zero", param: "val_a" }` — Enforces $param \ne 0$.
3. **`divisible`**: `{ type: "divisible", numerator: "num", denominator: "den" }` — Enforces $numerator \pmod{denominator} == 0$ with $denominator \ne 0$.
4. **`greater_than`**: `{ type: "greater_than", param_a: "hyp", param_b: "leg" }` — Enforces $param\_a > param\_b$.
5. **`less_than`**: `{ type: "less_than", param_a: "rem", param_b: "div" }` — Enforces $param\_a < param\_b$.
6. **`sum_equals`**: `{ type: "sum_equals", param_a: "angle1", param_b: "angle2", target: 180 }` — Enforces $param\_a + param\_b = target$.
7. **`predicate`**: `{ type: "predicate", name: "is_valid_triangle" }` — Calls named domain validation predicate.

---

## 6. Answer Derivations: The 30 Canonical Variants (`AnswerDerivation`)

Defined in `schemas/studylab-rich-content-contract.schema.json` and `rslib/procedural/src/problems/contract.rs:496-661`:

### Category 1: Direct Parameter Extraction (2 variants)
1. `direct_param`: `{ type: "direct_param", param_name: "ans" }` — Extracts numerical value of parameter directly.
2. `direct_string_param`: `{ type: "direct_string_param", param_name: "species" }` — Extracts string representation directly.

### Category 2: Algebraic Derivations (4 variants)
3. `linear_two_step`: `{ type: "linear_two_step", c_param: "val_c", b_param: "val_b", a_param: "val_a" }`
   $$x = \frac{c - b}{a} \quad \text{for } ax + b = c$$
4. `linear_variables_both_sides`: `{ type: "linear_variables_both_sides", d_param: "val_d", b_param: "val_b", a_param: "val_a", c_param: "val_c" }`
   $$x = \frac{d - b}{a - c} \quad \text{for } ax + b = cx + d$$
5. `linear_distributive`: `{ type: "linear_distributive", d_param: "val_d", a_param: "val_a", c_param: "val_c", b_param: "val_b" }`
   $$x = \frac{\frac{d}{a} - c}{b} \quad \text{for } a(bx + c) = d$$
6. `linear_fractional`: `{ type: "linear_fractional", c_param: "val_c", b_param: "val_b", a_param: "val_a" }`
   $$x = a(c - b) \quad \text{for } \frac{x}{a} + b = c$$

### Category 3: Arithmetic & Number Theory (7 variants)
7. `quotient`: `{ type: "quotient", numerator_param: "num", denominator_param: "den" }` — $target = \frac{num}{den}$.
8. `product`: `{ type: "product", a_param: "val_a", b_param: "val_b" }` — $target = a \cdot b$.
9. `percentage_amount`: `{ type: "percentage_amount", base_param: "base", percent_param: "rate" }` — $target = \frac{base \cdot rate}{100}$.
10. `lcm_array`: `{ type: "lcm_array", params: ["num1", "num2"] }` — $\text{LCM}(p_1, p_2, \dots)$.
11. `gcd_array`: `{ type: "gcd_array", params: ["num1", "num2"] }` — $\text{GCD}(p_1, p_2, \dots)$.
12. `remainder`: `{ type: "remainder", dividend_param: "n", divisor_param: "d" }` — $target = n \pmod d$.
13. `arithmetic_series_sum`: `{ type: "arithmetic_series_sum", n_param: "n", a_param: "a", d_param: "d" }` — $S_n = \frac{n}{2}[2a + (n-1)d]$.

### Category 4: Geometry & Mensuration (4 variants)
14. `pythagoras_hypotenuse`: `{ type: "pythagoras_hypotenuse", a_param: "leg_a", b_param: "leg_b" }` — $c = \sqrt{a^2 + b^2}$.
15. `pythagoras_leg`: `{ type: "pythagoras_leg", c_param: "hyp", a_param: "leg_a" }` — $b = \sqrt{c^2 - a^2}$.
16. `triangle_area`: `{ type: "triangle_area", base_param: "base", height_param: "height" }` — $A = \frac{1}{2} \cdot base \cdot height$.
17. `circle_area`: `{ type: "circle_area", radius_param: "radius", pi_approx: 3.141592653589793 }` — $A = \pi \cdot r^2$.

### Category 5: Physics Kinematics & Energy (5 variants)
18. `kinematic_velocity`: `{ type: "kinematic_velocity", u_param: "u", a_param: "a", t_param: "t" }` — $v = u + at$.
19. `kinematic_displacement`: `{ type: "kinematic_displacement", u_param: "u", a_param: "a", t_param: "t" }` — $s = ut + \frac{1}{2}at^2$.
20. `kinematic_stopping_distance`: `{ type: "kinematic_stopping_distance", u_param: "u", a_param: "a" }` — $d = \frac{u^2}{2a}$.
21. `kinematic_time`: `{ type: "kinematic_time", u_param: "u", v_param: "v", a_param: "a" }` — $t = \frac{v - u}{a}$.
22. `kinematic_work_energy`: `{ type: "kinematic_work_energy", mass_param: "m", velocity_param: "v" }` — $E_k = \frac{1}{2}mv^2$.

### Category 6: Chemistry Stoichiometry & Gases (7 variants)
23. `stoichiometric_moles_to_mass`: `{ type: "stoichiometric_moles_to_mass", moles_param: "n", molar_mass_param: "M" }` — $m = n \cdot M$.
24. `stoichiometric_mass_to_moles`: `{ type: "stoichiometric_mass_to_moles", mass_param: "m", molar_mass_param: "M" }` — $n = \frac{m}{M}$.
25. `stoichiometric_mole_ratio`: `{ type: "stoichiometric_mole_ratio", moles_a_param: "n_a", coeff_a: 1.0, coeff_b: 2.0 }` — $n_b = n_a \cdot \frac{coeff\_b}{coeff\_a}$.
26. `stoichiometric_mass_to_mass`: `{ type: "stoichiometric_mass_to_mass", mass_a_param: "m_a", molar_mass_a: "M_a", coeff_a: 1.0, coeff_b: 2.0, molar_mass_b: "M_b" }` — $m_b = \frac{m_a}{M_a} \cdot \frac{coeff\_b}{coeff\_a} \cdot M_b$.
27. `equilibrium_kc`: `{ type: "equilibrium_kc", conc_products: [["c_c", 1.0]], conc_reactants: [["c_a", 1.0], ["c_b", 1.0]] }` — $K_c = \frac{[C]^c}{[A]^a [B]^b}$.
28. `ideal_gas_law_pressure`: `{ type: "ideal_gas_law_pressure", moles_param: "n", temp_param: "T", vol_param: "V", r_const: 0.0821 }` — $P = \frac{nRT}{V}$.
29. `ideal_gas_law_volume`: `{ type: "ideal_gas_law_volume", moles_param: "n", temp_param: "T", press_param: "P", r_const: 0.0821 }` — $V = \frac{nRT}{P}$.

### Category 7: Symbolic Logic (1 variant)
30. `symbolic_logic_evaluation`: `{ type: "symbolic_logic_evaluation", p_param: "p_val", q_param: "q_val", operator: "AND" }`
    - Operators: `AND`, `OR`, `IMPLIES`, `EQUIV`, `XOR`, `NOT_P`.

---

## 7. Four-Domain Authoring Standards

### 1. Mathematics (`domain: "mathematics"`, `capability: "declarative"`)
- **Core Mechanics**: Method selection trees, structural variation, parameter variation, algebraic inverse transfer, calculation diagnostics.
- **Solving Flow**:
  $$\text{Pattern Recognition} \to \text{Method Selection (Formula vs Factorization vs Shortcut)} \to \text{Parameter Execution} \to \text{Sanity Verification}$$
- **Diagnostics**: Track calculation slips, sign confusion, common factor omission, domain boundary misses.

### 2. Reasoning (`domain: "reasoning"`, `capability: "declarative" | "symbolic_logic" | "constraint_solver"`)
- **Core Mechanics**: Representation grids, constraint extraction, anchor placement, case splitting, trap checking, structural transfer.
- **Engines Supported**:
  - *Declarative*: Direct relational conversion ($A \implies B \equiv \neg B \implies \neg A$).
  - *SymbolicLogic*: Syllogisms with Minimal Overlap Venn Diagrams, All+Some deduction, Either-Or conditions.
  - *ConstraintSolver*: 1D linear tracks, circular seating, 2D matrix matching grids, generational blood relations.
- **Diagnostics**: Converse fallacy, directional confusion, unspecified gender assumptions.

### 3. Physics (`domain: "physics"`, `capability: "domain_physics" | "declarative"`)
- **Core Mechanics**: Physical system grounding, spatial frame setup, free-body diagram (FBD), governing conservation law, vector equation setup, calculation, unit and asymptotic limit verification.
- **Required 6-Stage Pipeline**:
  $$\text{Physical Model} \to \text{Spatial / FBD Setup} \to \text{Governing Principle} \to \text{Equation Setup} \to \text{Calculation} \to \text{Dimensional / Boundary Sanity}$$
- **Sanity Invariants**: Dimensional homogeneity $[M^a L^b T^c]$; asymptotic boundary checks ($\mu \to 0$, $m_2 \gg m_1$, $t \to \infty$).

### 4. Chemistry (`domain: "chemistry"`, `capability: "domain_chemistry" | "declarative"`)
- **Core Rule**: Strictly 3 distinct branches — **NEVER force Organic or Inorganic into numerical stoichiometric molds**.
- **The 3 Specialized Branches**:
  1. **Physical Chemistry (Numerical / Stoichiometric)**:
     - Focus: Thermodynamics, Equilibrium ICE tables ($K_c/K_p$), Kinetics, Electrochemistry, Ideal Gas Laws.
     - Flow: `model_setup` $\to$ `equation_selection` $\to$ `intermediate_quantity` $\to$ `calculation` $\to$ `conservation_check`.
  2. **Organic Chemistry (Mechanistic / Transformational)**:
     - Focus: Reaction mechanisms ($S_N1, S_N2, E1, E2$), functional group roadmaps, nucleophile/electrophile interactions, carbocation stability, stereochemistry.
     - Flow: `substrate_recognition` $\to$ `mechanism_pathway` $\to$ `reagent_interpretation` $\to$ `product_prediction` $\to$ `exception_handling`.
  3. **Inorganic Chemistry (Taxonomic / Qualitative / Trend Deduction)**:
     - Focus: Periodic table trends, electronic configuration anomalies, coordination complexes, oxidation states, qualitative analysis.
     - Flow: `trend_reasoning` $\to$ `exception_handling` $\to$ `qualitative_deduction`.

---

## 8. Variant Contract & Diversity Rules

StudyLab supports 6 canonical variant categories:
1. **`parameter`**: Numerical value substitution preserving solvability invariants.
2. **`isomorphic`**: Entity, context, and variable label replacement preserving algebraic structure.
3. **`structural`**: Inversion of given and unknown variables ($v = u+at \implies t = \frac{v-u}{a}$).
4. **`contextual`**: Transferring the same mathematical model into a different application domain.
5. **`multi_concept`**: Combining 2 or more distinct sub-schemas (e.g. LCM + Modular Arithmetic).
6. **`transfer`**: Abstract model application in novel reasoning domains.

> [!IMPORTANT]
> **Parameter Variation $\neq$ Structural Diversity**:
> A source question may produce multiple procedural instances, but different source questions must remain distinct when their reasoning structure differs. Preserve **$1 \text{ Pattern} \neq 1 \text{ Question}$**.

---

## 9. Solution Graph & 3-Tier Progressive Hints

Defined in `schemas/studylab-solution-graph.schema.json` and `rslib/procedural/src/problems/steps/step_graph.rs:6-331`:

### A. Graph Topology:
- Directed Acyclic Graph (DAG) validated for cycle prevention (`validate_topology()`).
- Each step node declares `dependencies: string[]` pointing to prerequisite step IDs.
- Exactly one terminal step with `is_final: true`.

### B. 32 Canonical Step Types (`StepType`):
```text
 1. formula_selection              17. balance_equation
 2. transformation                 18. convert_mass_to_moles
 3. substitution                   19. apply_stoichiometric_ratio
 4. arithmetic                     20. identify_limiting_reagent
 5. simplification                 21. construct_equilibrium_expression
 6. equation_rearrangement         22. chemical_sanity_check
 7. comparison                     23. identify_schema
 8. unit_conversion                24. select_strategy
 9. intermediate_result            25. build_representation
10. final_answer                   26. apply_constraint
11. identify_knowns                27. propagate_constraint
12. select_model                   28. make_inference
13. choose_coordinate_system       29. create_case
14. select_equation                30. eliminate_case
15. physical_sanity_check          31. check_contradiction
16. identify_chemical_species      32. verify_conclusion
```

### C. 3-Tier Progressive Hint Structure:
```text
┌───────────────────┬────────────────────────────────────────────────────────┐
│ Tier              │ Purpose & Disclosure Boundary                          │
├───────────────────┼────────────────────────────────────────────────────────┤
│ Tier 1: Principle │ Governing rule, law, theorem, or general method        │
│ Tier 2: Operation │ Specific algebraic, physical, or logical step to take  │
│ Tier 3: Intermed. │ Partial calculation result or intermediate formula     │
└───────────────────┴────────────────────────────────────────────────────────┘
```
- **Inviolable Invariant**: Tier 3 may reveal an intermediate relation or partial value, but must **NEVER** directly leak the final answer.

---

## 10. Scaffolding Contract & Diagnostic Metadata

StudyLab defines scaffolding metadata to guide runtime hint disclosure and independence scaling:

```typescript
export interface ScaffoldingSpec {
  initial_independence_multiplier: number; // e.g. 1.0 (full) down to 0.4 (heavy scaffolding)
  allowed_hint_tiers: number[];             // [1, 2, 3]
  auto_remediation_threshold: number;       // e.g. 2 consecutive failures
}
```

### Scaffolding Metadata vs Learner State:
- **Authoring Scope**: Authors define *what hints exist*, *step dependencies*, and *difficulty baselines*.
- **Runtime Scope**: The engine computes real-time learner mastery, adaptive hint disclosure, and FSRS scheduling. Authors do **NOT** supply learner attempt data.

---

## 11. Versioned Domain Diagnostic Evidence (`VersionedDomainEvidence`)

Defined in `schemas/studylab-domain-evidence.schema.json` and `rslib/procedural/src/skills/domain_evidence.rs:6-190`:

```typescript
export interface VersionedDomainEvidence {
  version: 1;
  domain: "math" | "reasoning" | "physics" | "chemistry";
  evidence: DomainEvidencePayload;
}
```

### Domain Evidence Payloads:
- **`MathEvidence`**: `{ pattern_recognition?, method_selection?, execution?, verification?, structural_transfer? }`
- **`ReasoningEvidence`**: `{ pattern_recognition?, representation?, constraint_extraction?, decision_path?, deduction?, trap_checking?, structural_transfer? }`
- **`PhysicsEvidence`**: `{ physical_model_selection?, representation?, govern---

## 13. Canonical Dataset Ingestion vs APKG Packaging Workflow

StudyLab uses distinct file formats for different stages of the content lifecycle:

```text
1. Source PDF / Text
       │
       ▼
2. scratch/evidence-pack.md (Single Authorized Evidence Pack)
       │
       ├──────────────────────────────────────────┐
       ▼                                          ▼
3. Optional/[Chapter]_ProblemPatterns.json   3. Optional/[Chapter]_PracticeQuestions.json
   (HOW: Schemas, algorithms, traps)            (WHAT: Solvable MCQs, numericals, PYQs)
       │                                          │
       └──────────────────┬───────────────────────┘
                          │
                          ▼
4. Rich Declarative Packaging / Inline Contract Assembly
                          │
                          ▼
5. StudyLab/[Chapter]_StudyLab_Procedural.apkg
   (Note Type: "StudyLab Procedural Anchor", Field: ProceduralPayload)
```

### Separation of Concerns:
- **`[Chapter]_ProblemPatterns.json`**: Describes problem topology, recognition signals, governing algorithms, and error taxonomy.
- **`[Chapter]_PracticeQuestions.json`**: Contains the full collection of solvable source questions adhering to `schemas/studylab-practice-item.schema.json`.
- **`[Chapter]_StudyLab_Procedural.apkg`**: Contains procedural card anchors with `proc_schema` and rich `inline_contract`.

---

## 14. Phase 40 Validation Limits & Invariants

Defined in `schemas/studylab-validation-contract.json` and `rslib/procedural/src/problems/contract.rs:791-908`:

### Structural Limits & Bounds:
- **String Lengths**: `family_id` $\le 256$ bytes; `default_schema` $\le 256$ bytes; `archetype_id` $\le 256$ bytes; `parameter_name` $\le 64$ bytes; `prompt_template` $\le 10\,000$ bytes; `solution_template` $\le 20\,000$ bytes; `step_nodes` descriptions $\le 2\,000$ bytes.
- **Difficulty Range**: `min_difficulty` $\ge 1.0$, `max_difficulty` $\le 5.0$, `min_difficulty <= max_difficulty`.
- **Target Time Bounds**: `target_time_ms` $\in [1\,000, 600\,000]$ ($1\text{s}$ to $10\text{min}$).
- **Collection Counts**:
  - Archetypes per Family: $1 \le N \le 50$
  - Parameters per Archetype: $0 \le N \le 50$
  - Constraints per Archetype: $0 \le N \le 50$
  - Step Nodes per Archetype: $0 \le N \le 20$

### Arithmetic & Topology Safety Rules:
- **IntegerRange**: `min <= max`, `step > 0`, `max.checked_sub(min).is_some()`.
- **FloatRange**: `min <= max`, `!min.is_nan() && !max.is_nan()`, finite bounds.
- **DiscreteChoice**: `!values.is_empty()`.
- **PermutationChoice**: `!pool.is_empty()`, `0 < count <= pool.len()`.
- **PrimeFactorGrid**: `!base_primes.is_empty()`, `base_prime != 0`, `1 <= min_e <= max_e <= 63`.
- **CoprimePair**: `min <= max`, `max.checked_sub(min).is_some()`.
- **SolutionGraph DAG**: All dependency IDs must exist; graph must be strictly acyclic; terminal step must have `is_final = true`.

---

## 15. The 175-Topic Capability Map

Defined in `schemas/studylab-topic-capability-map.json`:

```text
Universe Summary:
- Mathematics: 59 topics  (Capability: declarative)
- Reasoning:   30 topics  (Capability: declarative, symbolic_logic, constraint_solver)
- Physics:     40 topics  (Capability: domain_physics, declarative)
- Chemistry:   46 topics  (18 Physical, 14 Inorganic, 14 Organic)
Total: 175 Topics
```

### Topic Routing Rule:
When authoring content for any topic in the 175-topic catalog:
1. Lookup the topic ID in `schemas/studylab-topic-capability-map.json`.
2. Determine the required domain and capability mold.
3. Build the `DeclarativeFamilyContract` or practice items matching the designated schema.

---

## 16. Canonical Concrete Examples

### Example 1: Mathematics Rich Procedural Card Anchor (LCM-HCF)
```json
{
  "proc_schema": "schema.math.number_system.lcm_hcf.v1",
  "difficulty_override": 1.0,
  "seed_mode": "random",
  "inline_contract": {
    "contract": {
      "family_id": "family.math.number_system.lcm_hcf",
      "skill_id": "math.number_system.lcm_hcf",
      "domain": "mathematics",
      "default_schema": "schema.math.number_system.lcm_hcf.v1",
      "capability": "declarative",
      "min_difficulty": 1.0,
      "max_difficulty": 5.0,
      "supported_variants": ["lcm_two_numbers", "hcf_two_numbers"],
      "variant_categories": ["parameter", "isomorphic", "structural"],
      "target_latency_model": { "1": 25000, "2": 35000, "3": 50000, "4": 65000, "5": 80000 },
      "structural_tags": ["number_system", "arithmetic", "factors"],
      "decision_points": ["prime_factorization", "division_method"],
      "error_categories": ["common_factor_omission", "arithmetic_slip"],
      "prerequisites": ["prime_numbers", "divisibility"]
    },
    "archetypes": [
      {
        "archetype_id": "math.ns.lcm_two_num",
        "difficulty_level": 1,
        "variant_category": "parameter",
        "variant_name": "lcm_two_numbers",
        "parameters": [
          { "name": "num1", "domain": { "type": "integer_range", "min": 6, "max": 24, "step": null, "non_zero": true } },
          { "name": "num2", "domain": { "type": "integer_range", "min": 8, "max": 36, "step": null, "non_zero": true } }
        ],
        "constraints": [
          { "type": "not_equal", "param_a": "num1", "param_b": "num2" }
        ],
        "prompt_template": "Find the Least Common Multiple (LCM) of \\({num1}\\) and \\({num2}\\).",
        "answer_derivation": { "type": "lcm_array", "params": ["num1", "num2"] },
        "answer_formatted_template": "{answer}",
        "solution_template": "दिए गए संख्याओं {num1} और {num2} का अभाज्य गुणनखंड (Prime Factorization) करें। प्रत्येक अभाज्य गुणनखंड की उच्चतम घात लें। LCM = {answer}.",
        "step_nodes": [
          {
            "id": "step_factorize",
            "step_type": "arithmetic",
            "label": "Prime Factorization",
            "description_template": "{num1} और {num2} का अभाज्य गुणनखंड निकालें",
            "expected_expression_template": "LCM({num1}, {num2}) = {answer}",
            "alternate_templates": [],
            "hint_principle": "Prime factorization reveals the base components of both numbers.",
            "hint_operation": "Write each number as a product of prime powers.",
            "hint_intermediate": "Examine common and distinct prime factors."
          }
        ],
        "target_time_ms": 25000
      }
    ]
  }
}
```

### Example 2: Physics Rich Procedural Card Anchor (Kinematics Stopping Distance)
```json
{
  "proc_schema": "schema.physics.kinematics.stopping_distance.v1",
  "difficulty_override": 2.0,
  "seed_mode": "random",
  "inline_contract": {
    "contract": {
      "family_id": "family.physics.kinematics.stopping_distance",
      "skill_id": "physics.kinematics.stopping_distance",
      "domain": "physics",
      "default_schema": "schema.physics.kinematics.stopping_distance.v1",
      "capability": "domain_physics",
      "min_difficulty": 1.0,
      "max_difficulty": 4.0,
      "supported_variants": ["stopping_distance_direct"],
      "variant_categories": ["parameter", "isomorphic"],
      "target_latency_model": { "1": 25000, "2": 35000, "3": 50000, "4": 65000, "5": 80000 },
      "structural_tags": ["kinematics", "motion_1d", "work_energy"],
      "decision_points": ["third_equation_of_motion"],
      "error_categories": ["sign_convention_error", "unit_conversion_error"],
      "prerequisites": ["equations_of_motion"]
    },
    "archetypes": [
      {
        "archetype_id": "phys.kin.stopping_dist",
        "difficulty_level": 2,
        "variant_category": "parameter",
        "variant_name": "stopping_distance_direct",
        "parameters": [
          { "name": "u", "domain": { "type": "integer_range", "min": 10, "max": 40, "step": 2, "non_zero": true } },
          { "name": "a", "domain": { "type": "integer_range", "min": 2, "max": 8, "step": 1, "non_zero": true } }
        ],
        "constraints": [],
        "prompt_template": "A vehicle moving at \\({u}\\text{ m/s}\\) undergoes uniform deceleration of \\({a}\\text{ m/s}^2\\). Find its stopping distance in meters.",
        "answer_derivation": { "type": "kinematic_stopping_distance", "u_param": "u", "a_param": "a" },
        "answer_formatted_template": "{answer} m",
        "solution_template": "गति के तीसरे समीकरण \\(v^2 = u^2 - 2as\\) का उपयोग करें। विराम अवस्था में \\(v = 0\\), अतः \\(s = \\frac{u^2}{2a}\\) = {answer} m.",
        "step_nodes": [
          {
            "id": "step_stopping_formula",
            "step_type": "select_equation",
            "label": "Stopping Distance Equation",
            "description_template": "Apply v^2 = u^2 - 2as with final velocity v = 0",
            "expected_expression_template": "s = {u}^2 / (2 * {a}) = {answer}",
            "alternate_templates": [],
            "hint_principle": "Third equation of motion connects velocity, acceleration, and displacement.",
            "hint_operation": "Set final velocity v = 0 and solve for displacement s.",
            "hint_intermediate": "s = u^2 / (2a)"
          }
        ],
        "target_time_ms": 35000
      }
    ]
  }
}
```

### Example 3: Chemistry Practice Item (Stoichiometry Authentic PYQ)
```json
{
  "id": "chem_stoich_pyq_001",
  "origin": {
    "origin_type": "AUTHENTIC_PYQ",
    "pyq_id": "RRB-ALP-2024-C1-Q14",
    "exam": "RRB ALP",
    "year": 2024,
    "shift": "Shift 1"
  },
  "domain": "chemistry",
  "chapter": "Chemical Reactions & Stoichiometry",
  "skill_id": "chemistry.stoichiometry.mole_concept",
  "schema_id": "schema.chemistry.stoichiometry.mass_moles.v1",
  "problem_family_id": "family.chemistry.stoichiometry.molar_mass",
  "question_type": {
    "type": "mcq",
    "options": ["2.5 moles", "5.0 moles", "1.0 mole", "0.5 mole"],
    "correct_option": "2.5 moles",
    "explanation": "Molar mass of CaCO3 = 40 + 12 + 3(16) = 100 g/mol. Moles = 250 / 100 = 2.5 moles."
  },
  "prompt": "Calculate the number of moles present in 250 g of pure Calcium Carbonate (\\(\\text{CaCO}_3\\)). (Atomic masses: Ca = 40, C = 12, O = 16)",
  "difficulty": 2.0,
  "structural_tags": ["stoichiometry", "mole_concept", "molar_mass"],
  "decision_points": ["calculate_molar_mass", "apply_moles_formula"],
  "error_categories": ["molar_mass_calculation_error", "arithmetic_error"],
  "prerequisites": ["atomic_masses", "molar_mass_definition"],
  "provenance": {
    "source_pyq_id": "RRB-ALP-2024-C1-Q14",
    "source_version": 1,
    "generator_version": 1,
    "schema_version": 1,
    "catalog_version": 1,
    "variant_type": "authentic",
    "exam": "RRB ALP",
    "year": 2024,
    "shift": "Shift 1"
  },
  "created_at": 1724371200,
  "metadata": {}
}
```

---

## 17. Behavioral Rules for Content Authors

When authoring procedural study content:
1. **Inspect Canonical Catalog Identifiers**: Always check existing catalog IDs in `schemas/studylab-topic-capability-map.json`.
2. **Reuse Existing Schema/Family IDs**: Never invent new IDs when canonical ones exist (`family.<domain>.<subtopic>.<archetype>`).
3. **Preserve Source Provenance**: Faithfully record `exam`, `year`, and `shift`.
4. **Preserve Distinct Source Questions**: Never collapse multiple questions into one anchor ($1 \text{ Pattern} \ne 1 \text{ Question}$).
5. **Keep APKG Minimal or Bundled**: Procedural packages contain either minimal routing anchors or self-contained `inline_contract` objects.
6. **Keep Learner History Runtime-Only**: Never embed learner attempts, mastery, or error history in APKG or static JSON files.
7. **Adhere Strictly to JSON Schemas**: All authored files must validate against the schemas in `resources/schemas/`.

