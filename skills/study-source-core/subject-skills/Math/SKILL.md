---
name: math-study
description: Subject-specific Mathematics layer for study-source-core. Defines mathematical knowledge architecture (11 Domain DNA types), E-M-D difficulty classification, deep structure problem recognition, method selection decision rules, 7-level practice progression, 14 error categories, conditional performance outputs, and domain audit checks.
---

# Mathematics Subject Skill (`math-study`)

## 1. Subject Mission & Core Inheritance

`math-study` is the specialized Mathematics domain layer for `study-source-core`.

This Skill inherits all universal rules, source boundary policy, source execution modes (`SOURCE_ONLY` default), Plan/Approval workflow (Mode A $\rightarrow$ Mode B), conditional artifact policy (evaluating Notes, Basic, Cloze), Basic/Cloze TSV file separation, tool-agnostic principles, and Core technical validation from `study-source-core`.

This document defines ONLY the subject-specific knowledge architecture, memory selection logic, performance architecture, domain audit rules, and conditional output contracts for Mathematics.

### Primary Objective
Mathematics is a **PROCEDURAL + CONCEPTUAL + PATTERN RECOGNITION + EXECUTION** discipline. The goal is NOT "remember every formula", but:  
`Recognize Problem Pattern → Select Best Method → Execute Accurately → Verify Solution → Avoid Examiner Traps`



> *This skill inherits all core policies, StudyLab invariants, 3-tier hints, options contracts, error taxonomies, and universal language contracts directly from study-source-core. Do not duplicate core definitions here.*

---

## 2. Mathematics Knowledge Architecture (11 Domain DNA Types)

Categorize all source content into 11 Domain DNA Types:

1. **Definition**: Core mathematical definitions (e.g., Prime Number, Matrix Rank, Limit, Derivative).
2. **Theorem / Principle**: Fundamental theorems and assertions (e.g., Pythagoras, Bayes, Taylor, Fermat).
3. **Property**: Mathematical properties (e.g., Logarithm properties, Matrix transpose identities).
4. **Formula / Identity**: Standard formulas, equations, and algebraic identities.
5. **Derivation**: Logical step-by-step mathematical proofs or formula derivations.
6. **Problem Type**: Distinct problem category classified by deep structure.
7. **Solving Method / Algorithm**: Standard procedural steps to solve a problem type.
8. **Short Trick / Alternative Method**: Faster shortcut methods or alternative execution paths.
9. **Examiner Trap / Confusion Point**: Misleading problem statements, sign traps, boundary conditions.
10. **Application**: Real-world or cross-topic application scenarios.
11. **Verification Rule**: Quick sanity checks to verify calculated answers.

---

## 3. Mathematics Note Architecture

A Mathematics note (`[Chapter]_Notes.md`) is a **structured mathematical reference model**:

### Flexible Section Architecture
```markdown
# [Chapter Title] ([गणित अध्याय])

## 1. Chapter Overview & Core DNA
- Primary mathematical domain (Algebra / Calculus / Geometry / Arithmetic / Probability).
- Governing principles, foundational assumptions, and overall scope.

## 2. Definitions, Theorems & Foundational Properties
- Definitions, theorems, and mathematical properties organized by subtopic.

## 3. Master Formula & Identity Bank
- Grouped formulas with symbol explanations, conditions, and validity bounds.

## 4. Problem Pattern Topologies & Solved Archetypes
- Problem types categorized by deep structure, showing standard algorithm and shortcut.

## 5. Method Selection & Decision Trees
- Decision logic: `WHEN to use Method A vs Method B`.

## 6. Examiner Traps, Common Errors & Verification Rules
- Known calculation traps, sign errors, domain constraints, and verification shortcuts.

## 7. 5-Minute Quick Revision Zone
- High-yield formulas, core identities, and recognition signals.
```

---

## 4. Mathematics Memory Architecture (Anki Selection Rules)

### STRICT ANKI EXCLUSIONS FOR MATHEMATICS
- **NEVER put numerical calculations into Anki cards** (*e.g., "Solve $2x^2 + 5x + 3 = 0$" is FORBIDDEN in Anki*).
- **NEVER put long multi-step derivations into Anki**.
- **NEVER put full problem solutions into Anki**.

### Allowed Anki Candidates:
1. **Definitions & Terminologies**: Basic concepts (*Basic TSV*).
2. **High-Yield Formulas & Identities**: Essential mathematical formulas (*Basic / Cloze TSV*).
3. **Mathematical Properties**: Exponent, log, or matrix properties (*Basic / Cloze TSV*).
4. **Pattern Recognition Signals**: `IF problem shows X, THEN apply Y` (*Basic TSV*).
5. **Source-Provided Mnemonics**: ONLY source-grounded memory devices (*Mnemonic TSV*).

---

## 5. Mathematics Performance Architecture & StudyLab Procedural Packaging

> [!IMPORTANT]
> **STUDYLAB PROCEDURAL PACKAGING SUPPORT (SECTION 24 COMPLIANCE)**  
> **This subject supports StudyLab procedural packaging.**  
> When generating StudyLab APKG content for Mathematics, you MUST use the subject-specific procedural rules, the 10 canonical question types, the options contract, 3-tier progressive hints, and the adaptive error taxonomy specified below.  
> StudyLab changes MUST NOT contaminate or break the generic declarative Anki pipeline (`export_anki.js`).

When the chapter contains numerical problem families, procedural setups, deep-structure problem topologies, or reusable problem-solving patterns, generate the **Dual Sibling Procedural Artifacts**:
1. **`[Chapter]_ProblemPatterns.md`**: The human-readable reference model written in Hindi-first explanatory prose.
2. **`[Chapter]_ProblemPatterns.json`**: The canonical machine-readable StudyLab procedural artifact strictly conforming to `studylab-procedural-schema.json`.

---

### A. The 10 Canonical Mathematics Question Types

Every Mathematics chapter in the StudyLab curriculum must be modeled across the following **10 distinct procedural question types** (numerical variation alone is strictly forbidden from masquerading as distinct types):

1. **Direct Computation (`MATH_DIRECT_COMPUTE`)**:
   - *Pedagogical Purpose*: Assess fluent algorithmic execution of the primary formula or standard method.
   - *Example*: Calculate $\text{LCM}(48, 72)$ via prime factorization or evaluate the discriminant of $3x^2 - 5x + 2 = 0$.
   - *Interaction*: Numerical input with absolute tolerance or discrete 4-option MCQ with calculation error distractors.

2. **Reverse / Inverse Problems (`MATH_REVERSE_PROBLEM`)**:
   - *Pedagogical Purpose*: Given the computed result or output property, deduce the initial parameters, co-prime components, or original equations.
   - *Example*: Given $\text{HCF}=12$, $\text{LCM}=2160$, and sum of numbers $=324$, determine the two numbers.
   - *Derivation*: Parameter system solving $H(a+b) = S$, $Hab = L$, $\gcd(a,b)=1$.

3. **Relationship & Identity Problems (`MATH_RELATIONSHIP`)**:
   - *Pedagogical Purpose*: Apply algebraic, geometric, or arithmetic identities linking multiple properties.
   - *Example*: Apply $N_1 \times N_2 = \text{HCF} \times \text{LCM}$; find $N_2$ when $N_1=84$, $\text{HCF}=14$, $\text{LCM}=420$.
   - *Interaction*: Discrete MCQ or formulaic substitution.

4. **Word Problems / Contextual Applications (`MATH_WORD_PROBLEM`)**:
   - *Pedagogical Purpose*: Extract mathematical parameters and deep structure from authentic real-world narratives (rates, cycles, tiling, packaging).
   - *Example*: Find the minimum number of square tiles of identical size required to pave a room of dimensions $15\text{ m } 17\text{ cm} \times 9\text{ m } 2\text{ cm}$.

5. **Multi-Step & Multi-Body Problems (`MATH_MULTI_STEP`)**:
   - *Pedagogical Purpose*: Require sequential multi-stage execution where the output of Step 1 becomes the mandatory input for Step 2.
   - *Example*: 4 runners start together on a circular track of circumference $1200\text{ m}$ at speeds $6, 8, 10, 12\text{ m/s}$; find when they first meet at the starting point AND how many rounds the slowest runner completed.

6. **Method-Selection & Strategy Drills (`MATH_METHOD_SELECTION`)**:
   - *Pedagogical Purpose*: Present a problem state and assess the learner's ability to choose the most efficient method (e.g. Standard Division Method vs Prime Factorization vs Modular Remainder Shortcut vs Formula Substitution).
   - *Interaction*: Discrete MCQ with explicit strategy options and rationale feedback.

7. **Examiner Trap Questions (`MATH_TRAP_QUESTION`)**:
   - *Pedagogical Purpose*: Specifically target boundary conditions, non-coprime pitfalls, sign traps, or constant remainder offsets ($k = d_i - r_i$).
   - *Example*: Find the greatest 4-digit number which when divided by $12, 15, 20, 54$ leaves remainders $4, 7, 12, 46$ respectively (requires subtracting constant difference $k=8$ from the highest 4-digit multiple of $\text{LCM}$).

8. **Representation Variants (`MATH_REPRESENTATION_VARIANT`)**:
   - *Pedagogical Purpose*: Test the same mathematical deep structure represented in alternative modalities (algebraic polynomial expressions, decimal/fraction representations, geometric areas).
   - *Example*: Find the $\text{HCF}$ and $\text{LCM}$ of polynomials $(x^2 - 9)(x^2 + 5x + 6)$ and $(x^2 - 4)(x^2 - 2x - 3)$, or $\text{HCF}(0.63, 1.05, 2.1)$.

9. **Transfer Problems (`MATH_TRANSFER_PROBLEM`)**:
   - *Pedagogical Purpose*: Apply the mathematical concept in a disparate topic domain (e.g. applying LCM in modular arithmetic, periodic gear cycles, or astronomy planetary alignments).

10. **Mixed / Interleaved Problems (`MATH_MIXED_INTERLEAVED`)**:
    - *Pedagogical Purpose*: Problem statements where concept cues are subtle or combined with neighboring topics, preventing mechanical single-rule repetition and training discrimination.

---

### B. Options Contract & Distractor Integrity (Mandatory for Choice-Based Tasks)

1. **Mandatory Discrete Options**: For all choice-based questions (MCQ, Concept Check, Strategy Drill), provide an array of $\ge 4$ distinct options.
2. **Strict Anti-Fallback Rule**: NEVER replace choice-based options with a generic textbox. Generic "Type your answer..." textboxes are strictly forbidden.
3. **Cognitive Distractor Taxonomies**: Every distractor must map to a genuine mathematical misconception:
   - *Sign Error Distractor*: Inverted sign ($\pm x$).
   - *Intermediate Result Distractor*: Stopping at Step 1 (e.g. reporting the tile side length $\text{HCF}=41\text{ cm}$ instead of the total tile count $814$).
   - *Formula Confusion Distractor*: Using Arithmetic series sum instead of Geometric, or dividing instead of multiplying.
   - *Unit Conversion Distractor*: Off by powers of 10 (e.g. failing to convert meters to centimeters).
   - *Boundary Miss Distractor*: Pairs counted without filtering $\gcd(a,b)=1$.
4. **Distractor Rationales**: Include `distractor_rationales` explaining why each incorrect option was selected.

---

### C. 3-Tier Progressive Hint Contract

Every procedural mathematics problem must include structured 3-tier progressive hints:
- **Tier 1 (Principle / Recognition)**: Identifies the governing theorem, identity, or problem pattern (e.g. "दो संख्याओं का गुणनफल उनके ल.स.प. (LCM) और म.स.प. (HCF) के गुणनफल के बराबर होता है।"). No numbers or calculations revealed.
- **Tier 2 (Operation / Strategy)**: Identifies the exact operational step to perform (e.g. "$N_2 = \frac{\text{HCF} \times \text{LCM}}{N_1}$ सूत्र में मान रखकर अज्ञात संख्या ज्ञात कीजिए।").
- **Tier 3 (Intermediate Step / Scaffolding)**: Provides intermediate partial calculation (e.g. "अंश का मान $14 \times 420 = 5880$ प्राप्त होता है। अब $84$ से विभाजित कीजिए।").
- **Strict Anti-Leak Invariant**: Hints MUST NEVER disclose the final answer value ($70$).

---

### D. Full Solution DAG Architecture

1. **Directed Acyclic Graph (DAG)**: Solutions must be structured as valid step DAGs with validated topological ordering.
2. **Step Node Schema**: Each node must specify `id`, `step_type` (e.g. `formula_selection`, `prime_factorization`, `algebraic_substitution`, `arithmetic_simplification`, `verification`), `label`, `description_template`, `expected_expression_template`, and 3-tier hints.
3. **Bilingual Explanatory Standard**: Written in clear Hindi-first explanatory prose with English mathematical terms in parentheses `( )`.

---

### E. Deep-Structure Problem Topology Model
For every distinct problem type, document in both Markdown and JSON:
- **Identity**:
  - `id`: Pattern identifier (e.g. `pat-lcm-hcf-001`).
  - `domain`: `"Math"`.
  - `skill_id`: `"math-study"`.
  - `schema_id`: Semantic archetype ID (e.g. `prime-factorization-indices`).
  - `problem_family`: Subtopic/family (e.g. `Arithmetic::LCM-HCF`, `Algebra::Quadratic`).
  - `problem_type`: Problem name in Hindi + English parentheses `( )`.
- **Deep Structure (`deep_structure`)**: The underlying mathematical model or governing equation (e.g. $N_i = \prod p_j^{a_{ij}}, \text{HCF} = \prod p_j^{\min(a_{ij})}, \text{LCM} = \prod p_j^{\max(a_{ij})}$).
- **Recognition Signals (`recognition_signals`)**: Non-empty array of keywords, algebraic cues, or givens that trigger this pattern.
- **Representation (`representation`)**: Diagrammatic/symbolic tool (e.g. `अभाज्य घातांक मैट्रिक्स (Prime Factor Index Grid)`).
- **Governing Method (`governing_method`)**:
  - `standard_algorithm`: Non-empty array of step strings in Hindi-first prose.
  - `shortcut_or_alternative`: Accelerated shortcut formula or alternative approach.
  - `sub_types`: Optional array of specific algebraic formula variations.
- **Decision Points (`decision_points`)**: Branching rules (`condition` $\rightarrow$ `action` / `method`).
- **Common Examiner Traps (`common_traps`)**: Non-empty array of sign errors, domain misses, or composite base pitfalls.
- **Verification Rules (`verification_rules`)**: Sanity checks (e.g. $\text{LCM} \pmod{\text{HCF}} = 0$, $K=1, 2, 3$ substitution).
- **Difficulty Model**:
  - `difficulty`: Valid enum (`Easy`, `Medium`, `Difficult`, `Easy-Medium`, `Medium-Difficult`, `E`, `M`, `D`, `E/M`, `M/D`).
  - `difficulty_dimensions`: Object containing `conceptual`, `computational`, and `trap_density`.
- **Variation Opportunities (`variation_opportunities`)**: Explicit mathematical variations:
  - *Parameter variation* (authentic source questions come first, generated variants are OPTIONAL and appended last without inflating primary count) (fractional exponents, decimals, large integers)
  - *Representation variation* (word problems, algebraic expressions, geometric ratios)
  - *Reverse forms* (given LCM & sum $\rightarrow$ find co-prime pairs)
  - *Boundary cases* (coprime numbers $H=1$, divisibility bounds)
  - *Multi-concept forms* (combining LCM with modular arithmetic)
- **Transfer Opportunities (`transfer_opportunities`)**: Cross-topic mathematical applications (e.g. Polynomial GCD/LCM, cyclic event scheduling).
- **Error Intelligence (`error_categories`)**: Linked categories from the 14-Category Math Error Log.
- **Prerequisites (`prerequisites`)**: Explicit prerequisite concepts (e.g. Prime numbers, Laws of indices). Do not infer arbitrary prerequisites from weak evidence.
- **PYQ References (`pyq_references`)**: Structured array of actual PYQ occurrences (`exam`, `year`, `shift`, `question_number`, `source`). Do not invent PYQs.

### F. Method Selection Decision Trees
Format decision trees explicitly in Markdown and populate `decision_trees` array in JSON:
```text
IF [Given Condition A] ──► Use Method 1
IF [Given Condition B] ──► Use Method 2
IF [Given Condition C] ──► Use Method 3
```

### G. 7-Level Practice Progression
Structure practice recommendations in Markdown and populate `practice_progression` array in JSON across 7 levels:
1. *Level 1: Direct Formula Substitution* (`Easy`)
2. *Level 2: Single-Concept Manipulation* (`Easy-Medium`)
3. *Level 3: Multi-Concept Integration* (`Medium`)
4. *Level 4: Reverse / Inverse Problem Solving* (`Medium`)
5. *Level 5: Boundary Condition & Special Case Analysis* (`Medium-Difficult`)
6. *Level 6: Pattern Recognition & Novel Contexts* (`Difficult`)
7. *Level 7: Timed & High-Pressure Optimization* (`Difficult`)

### H. 14-Category Mathematics Error Log & Adaptive Remediation Routing
Populate `error_log_taxonomy` array in JSON and link pattern errors:
1. *Formula Recall Error* $\rightarrow$ Remediate with Formula Card / Concept Check.
2. *Formula Selection Error* $\rightarrow$ Remediate with Strategy Selection Drill.
3. *Concept Misunderstanding* $\rightarrow$ Remediate with Stepwise Worked Example.
4. *Sign Error* $\rightarrow$ Remediate with Targeted Trap Drill.
5. *Algebraic / Arithmetic Calculation Error* $\rightarrow$ Remediate with Same Archetype / Lower Speed Target.
6. *Domain / Boundary Condition Miss* $\rightarrow$ Remediate with Boundary Case Variant.
7. *Question Misinterpretation* $\rightarrow$ Remediate with Word Problem Breakdown.
8. *Unit / Dimension Conversion Error* $\rightarrow$ Remediate with Unit Conversion Drill.
9. *Step Omission* $\rightarrow$ Remediate with Scaffolding DAG.
10. *Pattern Misrecognition* $\rightarrow$ Remediate with Interleaved Recognition Drill.
11. *Time Pressure / Speed Error* $\rightarrow$ Remediate with Timed Speed Practice.
12. *Verification Failure* $\rightarrow$ Remediate with Sanity Check Verification Step.
13. *Trap Falling* (Examiner Distractor selection) $\rightarrow$ Remediate with Trap Analysis.
14. *Notational Confusion* $\rightarrow$ Remediate with Notation Glossary.

---

## 6. Subject-Specific Output Extensions

All outputs are saved inside `Study Materials/Math/[Chapter Folder]/` and follow the Core Hindi-first study material language policy.

### Runtime Artifact Policy

Artifact eligibility and generation policies for Mathematics are **100% deterministic** and are defined in the machine-readable `runtime-policy.json` file. The Subject Agent LLM does NOT synthesize or output artifact policies. Core consumes `runtime-policy.json` via the Subject Policy Resolver to determine routing.

---

## 7. Subject Domain Audit

In addition to Core technical validation, perform Mathematics Domain Audit:
1. **Pattern Completeness**: Are all major problem pattern families in the chapter represented in `[Chapter]_ProblemPatterns.md` when performance artifacts are generated?
2. **Formula Condition Checks**: Does every formula specify its validity conditions (e.g., $a \neq 0$, $x > 0$)?
3. **Calculation Exclusion from Anki**: Are standard flashcards 100% free of numerical multi-step calculations?
4. **Decision Logic Clarity**: Are method-selection rules clear and unambiguous?

---

## 8. PYQ & External Mode Interpretation

In `SOURCE_PLUS_PYQ` mode:
- PYQs calibrate difficulty ratings (E / M / D) and identify examiner trap frequencies.
- PYQ trends enrich `[Chapter]_ProblemPatterns.md` with frequency rankings and exam context.
- PYQs MUST NOT alter static mathematical definitions or theorems in `[Chapter]_Notes.md`.

---

## 9. Exceptions & Special Cases

Structure mathematical exceptions and boundary cases explicitly:
`STANDARD FORMULA / RULE → VALIDITY CONDITION → BOUNDARY EXCEPTION → CONSEQUENCE`  
*(Example: Quadratic formula $\rightarrow$ Valid for $a \neq 0$ $\rightarrow$ If $a = 0$, equation becomes linear).*

---

## 10. Visual Map Architecture

### A. Natural Map Types & Knowledge Structures
- **Problem-Family Recognition & Method Selection**: Problem Type $\rightarrow$ Cue $\rightarrow$ Method $\rightarrow$ **Problem-Family / Decision Map**.
- **Mathematical Concept & Theorem Dependencies**: Theorem $\rightarrow$ Corollary $\rightarrow$ Application $\rightarrow$ **Concept / Dependency Map**.
- **Classification of Problem Patterns**: Pattern taxonomy $\rightarrow$ **Hierarchy / Radial Map**.

### B. Structures Prohibited from Ordinary Radial Maps
- ❌ **Complete Worked Solutions / Step-by-Step Proofs**: NEVER put worked numeric solutions or multi-step derivations in map nodes.
- ❌ **Raw Equation Dumps**: Equations belong in **Notes.md / ProblemPatterns.md**.
- ❌ **Linear Numerical Calculations**: Map only the decision rule, not the arithmetic steps.

### C. Subject-Specific Semantics
- **Node Semantics**: Problem type, recognition signal, method key (max 8 words for mathematical conditions).
- **Edge Semantics**: `recognized by` (द्वारा पहचाना जाता है), `solved via` (द्वारा हल होता है), `requires condition` (के लिए शर्त), `watch out for` (से बचें).

### D. Mathematical Failure Modes to Avoid
- Stuffing full algebraic derivations into diagram nodes.
- Defaulting to radial trees instead of Problem-Family Decision Maps.

---

## 11. Subject-Specific Visual Learning Grammar

```yaml
visual_learning_grammar:
  dominant_structures:
    - geometry
    - transformations
    - spatial relationships
    - graphs
    - patterns
    - algorithm/method selection
  preferred_visual_forms:
    - coordinate visuals
    - geometric constructions
    - graph progression
    - transformation diagrams
    - decision trees
  preferred_narrative_modes:
    - pattern recognition to method selection
    - visual geometric intuition
    - standard algorithm vs accelerated shortcut contrast
    - boundary condition and validity domain analysis
  high_value_visual_opportunities:
    - coordinate curve transformations, intercepts, and critical points (f'(x) = 0, inflection)
    - geometric construction diagrams with auxiliary lines and angle relationships
    - problem-solving method selection branching decision trees
    - standard algebraic method vs rapid shortcut side-by-side comparison boards
    - domain, range, and asymptote boundary visual envelopes
  visual_anti_patterns:
    - walls of algebraic manipulations without geometric or structural context
    - complete multi-step numeric solutions dumped onto visual slides
    - raw formula lists lacking symbol definitions, constraints, or validity bounds
    - text-only geometry proofs without accompanying geometric figures
```

### Domain Visual Reasoning
- **Pattern Recognition First**: Visually isolate problem archetype cues before branching into algorithms.
- **Method Contrast**: Use side-by-side boards to compare conventional algebraic procedures with high-speed shortcut rules.
- **Validity & Boundaries**: Frame formulas within explicit domain constraints ($x > 0$, denominator $\neq 0$).

---

## Multimodal Execution Triggers
- **Visual Inspection Rule**: Inspect mathematical notation, graphs, and visual worked layouts natively when relevant. Do NOT use OCR if native multimodal understanding is sufficient. Do not inspect every image automatically.
