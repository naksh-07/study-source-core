# StudyLab Problem Patterns & Procedural Intelligence Specification (`problem-patterns.md`)
**Version**: `2.0.0`  
**Classification**: Canonical Problem Intelligence Reference  
**Status**: Authoritative Architecture

---

## 1. The 10-Tier Canonical Content Hierarchy

StudyLab procedural problem modeling organizes knowledge across a 10-tier strict hierarchy. This hierarchy guarantees that low-level instance variations never obscure high-level curricular standards.

```
Tier 1:  SUBJECT                ──▶ e.g., Mathematics, Reasoning, Physics, Chemistry
  │
Tier 2:  CHAPTER / MODULE       ──▶ e.g., LCM & HCF, Kinematics in 1D, Chemical Equilibrium
  │
Tier 3:  TOPIC                  ──▶ e.g., HCF of Fractions, Stopping Distance, Buffer pH
  │
Tier 4:  CONCEPT                ──▶ e.g., Prime Factorization, Work-Energy Theorem, ICE Tables
  │
Tier 5:  SKILL                  ──▶ e.g., Extract Coprime Multipliers, Resolve Incline Normal Force
  │
Tier 6:  QUESTION TYPE          ──▶ e.g., Product-HCF-LCM Relationship, Incline Friction Braking
  │
Tier 7:  ARCHETYPE / MOLD       ──▶ e.g., pat-lcm-hcf-001, mold.phys.stopping_dist.v1
  │
Tier 8:  STRUCTURAL VARIANT     ──▶ e.g., Var-A: Coprime Multiplier, Var-B: Inverse Ratio Form
  │
Tier 9:  PRACTICE ITEM (OBJECT) ──▶ e.g., lcm-hcf-pq-01 (Solvable item with authentic PYQ numbers)
  │
Tier 10: RUNTIME INSTANCE       ──▶ Dynamic seeded variation generated on-the-fly during study
```

### 1.1 The Inviolable Invariant: $\text{Question Type} \ne \text{Instance}$
- Changing numerical coefficients (e.g. changing $48 \to 72$) produces a new **Runtime Instance**, NOT a new Question Type.
- Changing context or labels while preserving exact mathematical relations produces an **Isomorphic Variant**.
- A new **Question Type** requires a genuinely distinct deep problem structure, governing algorithm, or decision path.

---

## 2. The 16 Canonical Parameter Domains

Parameter domains define how procedural variables are sampled and bounded during card generation. Defined in `studylab-rich-content-contract.schema.json` and Rust runtime engine `rslib/procedural/src/problems/contract.rs`.

| # | Domain Type | JSON Spec & Parameters | Formula / Generation Logic | Hardening & Safety Invariants |
|---|---|---|---|---|
| **1** | `integer_range` | `{"type": "integer_range", "min": 1, "max": 100, "step": 1, "non_zero": true}` | Samples $x \in [min, max]$ with step $s$. | $min \le max$; $step > 0$; safe within $[-2^{63}, 2^{63}-1]$; rejects 0 if `non_zero: true`. |
| **2** | `float_range` | `{"type": "float_range", "min": 0.5, "max": 10.0, "precision": 2}` | Samples float rounded to $p$ decimals. | $min \le max$; rejects `NaN` and $\pm\infty$; $0 \le precision \le 10$. |
| **3** | `discrete_choice` | `{"type": "discrete_choice", "values": [12, 18, 24, 36]}` | Uniformly samples one value from array. | `values` array must be non-empty. |
| **4** | `derived_linear` | `{"type": "derived_linear", "a_param": "a", "x_param": "x", "b_param": "b"}` | Computes $target = a \cdot x + b$. | Checked integer multiplication & addition; prevents 64-bit overflow. |
| **5** | `derived_product` | `{"type": "derived_product", "a_param": "hcf", "b_param": "lcm"}` | Computes $target = a \cdot b$. | Saturating arithmetic on numeric types. |
| **6** | `derived_sum` | `{"type": "derived_sum", "a_param": "p1", "b_param": "p2"}` | Computes $target = a + b$. | Checked addition with saturating bounds. |
| **7** | `derived_difference` | `{"type": "derived_difference", "a_param": "total", "b_param": "part"}` | Computes $target = a - b$. | Checked subtraction. |
| **8** | `derived_quotient` | `{"type": "derived_quotient", "a_param": "prod", "b_param": "n1", "precision": 0}` | Computes $target = a / b$. | Division-by-zero protection (returns fallback or 0.0 if $b=0$). |
| **9** | `derived_signed_string`| `{"type": "derived_signed_string", "param": "b"}` | Formats string as `+ b` or `- |b|`. | Uses `unsigned_abs()` to prevent `i64::MIN` negation overflow panic. |
| **10** | `derived_power` | `{"type": "derived_power", "base_param": "r", "exponent": 2}` | Computes $target = base^{exponent}$. | Checked exponentiation; $0 \le exponent \le 10$. |
| **11** | `derived_percentage` | `{"type": "derived_percentage", "base_param": "cp", "rate_param": "prof"}` | Computes $target = (base \cdot rate) / 100$. | Guarded floating-point arithmetic. |
| **12** | `derived_hypotenuse` | `{"type": "derived_hypotenuse", "a_param": "leg_a", "b_param": "leg_b"}` | Computes $target = \sqrt{a^2 + b^2}$. | Positive square root evaluated safely. |
| **13** | `derived_pythagorean_leg`| `{"type": "derived_pythagorean_leg", "c_param": "hyp", "a_param": "leg_a"}` | Computes $target = \sqrt{\max(0, c^2 - a^2)}$. | Guarded against $c < a$ (returns 0 instead of NaN). |
| **14** | `permutation_choice` | `{"type": "permutation_choice", "pool": ["A","B","C","D"], "count": 2}` | Samples ordered permutation of $k$ items. | $pool$ non-empty; $1 \le count \le pool.len()$. |
| **15** | `prime_factor_grid` | `{"type": "prime_factor_grid", "base_primes": [2,3,5], "min_exponents": [1,1,1], "max_exponents": [3,2,1]}` | Computes $N = \prod p_i^{e_i}$. | Valid prime bases; exponent limits $\le 63$. |
| **16** | `coprime_pair` | `{"type": "coprime_pair", "min": 2, "max": 20}` | Generates $(a, b)$ such that $\gcd(a, b) = 1$. | Rejection sampling with max 20 attempts; $min < max$. |

---

## 3. The 7 Canonical Constraint Specifications

Constraints enforce mathematical, physical, or logical validity across sampled parameters before an instance is rendered.

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

### 3.1 Constraint Definitions & Semantics

1. **`not_equal`**: Enforces $param\_a \neq param\_b$. Used to prevent degenerate cases (e.g. equal speeds in relative velocity).
2. **`non_zero`**: Enforces $param \neq 0$. Prevents division-by-zero singularities and trivial zero solutions.
3. **`divisible`**: Enforces $numerator \pmod{denominator} == 0$ where $denominator \ne 0$. Used for clean integer division in word problems.
4. **`greater_than`**: Enforces $param\_a > param\_b$. Used for hypotenuse vs legs, upstream vs stream speed.
5. **`less_than`**: Enforces $param\_a < param\_b$. Used for remainder vs divisor ($r < d$).
6. **`sum_equals`**: Enforces $param\_a + param\_b = target$. Used for supplementary angles ($180^\circ$) or total mixture volume.
7. **`predicate`**: Executes a named domain validator (e.g., `"is_valid_triangle"`, `"is_valid_stoichiometric_state"`).

---

## 4. The 30 Canonical Answer Derivations

Answer derivations declare the mathematical computation that produces the exact target answer from sampled parameters.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 30 CANONICAL DERIVATION OPERATORS                                │
├────────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Category                       │ Operators                                                       │
├────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ 1. Direct Extraction (2)       │ `direct_param`, `direct_string_param`                            │
│ 2. Algebraic (4)               │ `linear_two_step`, `linear_variables_both_sides`,                │
│                                │ `linear_distributive`, `linear_fractional`                      │
│ 3. Arithmetic & Number (7)     │ `quotient`, `product`, `percentage_amount`, `lcm_array`,          │
│                                │ `gcd_array`, `remainder`, `arithmetic_series_sum`                │
│ 4. Geometry & Mensuration (4)  │ `pythagoras_hypotenuse`, `pythagoras_leg`,                      │
│                                │ `triangle_area`, `circle_area`                                  │
│ 5. Physics Kinematics (5)      │ `kinematic_velocity`, `kinematic_displacement`,                  │
│                                │ `kinematic_stopping_distance`, `kinematic_time`,                 │
│                                │ `kinematic_work_energy`                                         │
│ 6. Chemistry Stoichiometry (7) │ `stoichiometric_moles_to_mass`, `stoichiometric_mass_to_moles`,  │
│                                │ `stoichiometric_mole_ratio`, `stoichiometric_mass_to_mass`,      │
│                                │ `equilibrium_kc`, `ideal_gas_law_pressure`,                      │
│                                │ `ideal_gas_law_volume`                                          │
│ 7. Symbolic Logic (1)          │ `symbolic_logic_evaluation`                                     │
└────────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 4.1 Algebraic Derivations (Category 2)
- **`linear_two_step`**: Solves $ax + b = c \implies x = \frac{c - b}{a}$.
- **`linear_variables_both_sides`**: Solves $ax + b = cx + d \implies x = \frac{d - b}{a - c}$.
- **`linear_distributive`**: Solves $a(bx + c) = d \implies x = \frac{\frac{d}{a} - c}{b}$.
- **`linear_fractional`**: Solves $\frac{x}{a} + b = c \implies x = a(c - b)$.

### 4.2 Arithmetic & Number Theory Derivations (Category 3)
- **`quotient`**: $x = a / b$.
- **`product`**: $x = a \cdot b$.
- **`percentage_amount`**: $x = (base \cdot rate) / 100$.
- **`lcm_array`**: Evaluates $\text{LCM}(p_1, p_2, \dots, p_k)$.
- **`gcd_array`**: Evaluates $\gcd(p_1, p_2, \dots, p_k)$.
- **`remainder`**: $x = n \pmod d$.
- **`arithmetic_series_sum`**: $S_n = \frac{n}{2}[2a + (n-1)d]$.

### 4.3 Geometry & Mensuration Derivations (Category 4)
- **`pythagoras_hypotenuse`**: $c = \sqrt{a^2 + b^2}$.
- **`pythagoras_leg`**: $b = \sqrt{c^2 - a^2}$.
- **`triangle_area`**: $A = \frac{1}{2} b h$.
- **`circle_area`**: $A = \pi r^2$.

### 4.4 Physics Derivations (Category 5)
- **`kinematic_velocity`**: $v = u + at$.
- **`kinematic_displacement`**: $s = ut + \frac{1}{2}at^2$.
- **`kinematic_stopping_distance`**: $d = \frac{u^2}{2a}$.
- **`kinematic_time`**: $t = \frac{v - u}{a}$.
- **`kinematic_work_energy`**: $E_k = \frac{1}{2}mv^2$.

### 4.5 Chemistry Derivations (Category 6)
- **`stoichiometric_moles_to_mass`**: $m = n \cdot M$.
- **`stoichiometric_mass_to_moles`**: $n = m / M$.
- **`stoichiometric_mole_ratio`**: $n_b = n_a \cdot (coeff_b / coeff_a)$.
- **`stoichiometric_mass_to_mass`**: $m_b = (m_a / M_a) \cdot (coeff_b / coeff_a) \cdot M_b$.
- **`equilibrium_kc`**: $K_c = \prod [P_i]^{c_i} / \prod [R_j]^{r_j}$.
- **`ideal_gas_law_pressure`**: $P = (nRT) / V$.
- **`ideal_gas_law_volume`**: $V = (nRT) / P$.

### 4.6 Symbolic Logic Derivation (Category 7)
- **`symbolic_logic_evaluation`**: Evaluates truth table for operator $\in \{\text{AND}, \text{OR}, \text{IMPLIES}, \text{EQUIV}, \text{XOR}, \text{NOT\_P}\}$.

---

## 5. The 32 Canonical DAG Step Types

Every node in the solution DAG must declare one of the 32 canonical step types:

```
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

---

## 6. Progressive 3-Tier Hints & Scaffolding Multipliers

Hints reduce cognitive load (Sweller 1988) by providing structured metacognitive guidance during impasse without trivializing the problem.

```
Tier 1: PRINCIPLE / RECOGNITION (Signal)
  └─ Directs attention to governing theorem (e.g. "Use the Product-HCF-LCM identity: N_1 × N_2 = HCF × LCM").
     ❌ MUST NOT reveal problem-specific numbers or final answers.

Tier 2: STRATEGY / OPERATION (Setup)
  └─ Demonstrates equation setup with given values (e.g. "Substitute N_1 = 84, HCF = 14, LCM = 420: 84 × N_2 = 14 × 420").
     ❌ MUST NOT perform final arithmetic evaluation.

Tier 3: INTERMEDIATE STEP (Execution)
  └─ Evaluates penultimate step (e.g. "N_2 = 5880 / 84").
     ❌ MUST NOT state the final answer value directly.
```

### 6.1 Scaffolding Multiplier Configuration

```json
"scaffolding": {
  "initial_independence_multiplier": 1.0,
  "allowed_hint_tiers": [1, 2, 3],
  "auto_remediation_threshold": 2
}
```

- **`initial_independence_multiplier`**: $1.0$ for unassisted attempts. Drops by $0.2$ per hint unlocked.
- **`auto_remediation_threshold`**: Number of consecutive failures before routing to a concept check card.
