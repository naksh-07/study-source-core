---
name: physics-study
description: Subject-specific Physics layer for study-source-core. Defines Physics knowledge architecture (20 Domain DNA types), 5 distinct knowledge layers, physical model understanding, concept-formula relationships, deep-structure numerical problem families, 7-level practice progression, 14 error categories, conditional performance outputs, and domain audit checks.
---

# Physics Subject Skill (`physics-study`)

## 1. Subject Mission & Core Inheritance

`physics-study` is the specialized Physics domain layer for `study-source-core`.

This Skill inherits all universal rules, source boundary policy, source execution modes (`SOURCE_ONLY` default), Plan/Approval workflow (Mode A $\rightarrow$ Mode B), conditional artifact policy (evaluating Notes, Basic, Cloze), Basic/Cloze TSV file separation, tool-agnostic principles, and Core technical validation from `study-source-core`.

This document defines ONLY the subject-specific knowledge architecture, memory selection logic, performance architecture, domain audit rules, and conditional output contracts for Physics.

### Primary Objective
Physics is a **CONCEPTUAL + MATHEMATICAL + PROCEDURAL + PATTERN-RECOGNITION + VISUALIZATION + TRANSFER** discipline. The central goal is NOT "remember every formula", but:  
`Understand Physical Model → Identify Governing Principle → Select Mathematical Representation → Execute Accurately → Transfer to New Problems`



> *This skill inherits all core policies, StudyLab invariants, 3-tier hints, options contracts, error taxonomies, and universal language contracts directly from study-source-core. Do not duplicate core definitions here.*

---

## 2. Physics 5 Knowledge Layers & 20 Domain DNA Types

### A. The 5 Distinct Knowledge Layers
1. **FACTUAL MEMORY (Anki)**: Units, dimensions, physical constants, definitions, named laws, scientist contributions.
2. **CONCEPTUAL / MENTAL MODELS (Obsidian Notes)**: Physical principles, physical meaning of equations, mental visual models.
3. **MATHEMATICAL / PROCEDURAL (Obsidian Notes & Problem Patterns)**: Vector operations, calculus applications, equation derivations, formula manipulation.
4. **PATTERN-RECOGNITION / PROBLEM-SOLVING (Problem Patterns)**: Deep-structure problem categorization, setup rules, decision trees, trap identification.
5. **TRANSFER / PRACTICE PROGRESSION (Problem Patterns)**: Multi-concept integration, boundary condition analysis, novel physical setups.

### B. The 20 Domain DNA Knowledge Types
1. **Definition** | 2. **Physical Concept / Mental Model** | 3. **Law / Principle** | 4. **Physical Quantity** | 5. **Formula / Equation** | 6. **Physical Constant** | 7. **Derivation** | 8. **Graph / Diagram** | 9. **Experiment / Apparatus** | 10. **Cause $\rightarrow$ Effect** | 11. **Comparison** | 12. **System / State / Process** | 13. **Boundary Condition** | 14. **Approximation / Idealization** | 15. **Problem Topology** | 16. **Solving Method / Algorithm** | 17. **Shortcut / Special Case Rule** | 18. **Examiner Trap / Distractor Pattern** | 19. **Real-World Application** | 20. **Order of Magnitude / Estimation**.

---

## 3. Physics Note Architecture

A Physics note (`[Chapter]_Notes.md`) is a **physical and mathematical reference model**:

### Flexible Section Architecture
```markdown
# [Chapter Title] ([भौतिकी अध्याय])

## 1. Chapter Overview & Physical Model
- Primary physics domain (Mechanics / Thermodynamics / Electromagnetism / Optics / Modern Physics).
- Core physical phenomena, idealizations, and governing principles.

## 2. Core Concepts, Definitions & Physical Quantities
- Concepts, mental models, scalar/vector classification, SI units, and dimensional formulas.

## 3. Laws, Principles & Governing Equations
- Fundamental laws, physical meaning of equations, symbol definitions, and validity bounds.

## 4. Derivations & Mathematical Models
- Logical derivations from first principles.

## 5. Graphical Analysis & Visual Diagrams
- Graph interpretations ($s-t, v-t, p-V$), slope meanings, and area-under-curve significance.

## 6. Problem Topologies & Solved Archetypes
- Problem types categorized by deep structure, showing standard algorithm and shortcut.

## 7. Method Selection & Decision Trees
- Decision logic: `WHEN to use Energy Conservation vs Impulse-Momentum`.

## 8. Exceptions, Boundary Conditions & Examiner Traps
- Idealization limits, vector component traps, sign conventions, and sanity checks.

## 9. 5-Minute Quick Revision Zone
- High-yield formulas, units, dimensions, and visual graphs.
```

---

## 4. Physics Memory Architecture (Anki Selection Rules)

### STRICT ANKI EXCLUSIONS FOR PHYSICS
- **NEVER put numerical calculations into Anki cards**.
- **NEVER put long mathematical derivations into Anki**.
- **NEVER put full multi-step physics problem solutions into Anki**.

### Allowed Anki Candidates:
1. **Definitions & Named Laws**: Core physics definitions (*Basic TSV*).
2. **Physical Quantities & Dimensions**: SI units, dimensional formulas, scalar/vector nature (*Basic / Cloze TSV*).
3. **Fundamental Constants**: Values and units (*Basic TSV*).
4. **Formula Recognition**: Key equations and physical meanings (*Basic / Cloze TSV*).
5. **Graph Interpretations**: Meaning of slope and area under curve (*Basic TSV*).
6. **Source-Provided Mnemonics**: ONLY source-grounded memory devices (*Mnemonic TSV*).

---

## 5. Physics Performance Architecture & StudyLab Procedural Packaging

> [!IMPORTANT]
> **STUDYLAB PROCEDURAL PACKAGING SUPPORT (SECTION 24 COMPLIANCE)**  
> **This subject supports StudyLab procedural packaging.**  
> When generating StudyLab APKG content for Physics numericals, you MUST use the subject-specific 6-stage procedural pipeline, multi-representation framework, 10 canonical question types, options contract, 3-tier progressive hints, and adaptive error taxonomy specified below.  
> StudyLab changes MUST NOT contaminate or break the generic declarative Anki pipeline (`export_anki.js`).

When the chapter contains numerical problem families, physical model topologies, or reusable problem-solving patterns, generate the **Dual Sibling Procedural Artifacts**:
1. **`[Chapter]_ProblemPatterns.md`**: The human-readable reference model written in Hindi-first explanatory prose.
2. **`[Chapter]_ProblemPatterns.json`**: The canonical machine-readable StudyLab procedural artifact strictly conforming to `studylab-procedural-schema.json`.

> [!CAUTION]
> **DO NOT TREAT PHYSICS AS BLIND FORMULA PLUGGING.**  
> Physics problem solving is fundamentally grounded in mental physical models, spatial/vector coordinate frames, conservation principles, SI unit discipline, and dimensional/boundary sanity checks.

---

### A. The 6-Stage Physical Numerical Pipeline

Every procedural physics numerical must follow the 6-stage execution pipeline:
$$\text{Physical Model} \longrightarrow \text{Representation (FBD/Graph)} \longrightarrow \text{Governing Law} \longrightarrow \text{Vector/Scalar Equations} \longrightarrow \text{Execution} \longrightarrow \text{Dimensional / Boundary Sanity}$$

1. **Physical Model Formulation**: Identify the physical system, idealizations (point mass, massless string, ideal gas), and state transformations.
2. **Representation Setup**: Construct the appropriate diagram (FBD with resolved axes, ray diagram with Cartesian sign convention, circuit node map, or $v-t/p-V$ graph).
3. **Governing Law Selection**: Identify the foundational conservation principle or fundamental law (Newton's 2nd Law, Work-Energy Theorem, Momentum Conservation, First Law of Thermodynamics).
4. **Vector/Scalar Equation Setup**: Translate physical laws into scalar algebraic equations along chosen coordinate axes.
5. **Execution & Calculation**: Solve for unknown variables with explicit unit tracking.
6. **Dimensional & Asymptotic Sanity Check**: Verify dimensional homogeneity ($[M^a L^b T^c]$) and test boundary limits ($\mu \to 0$, $\theta \to 0^\circ$, $m_2 \gg m_1$).

---

### B. First-Class Multi-Representation Framework

Physics procedural archetypes must declare their primary representation format:
- **Verbal Representation**: Physical scenario narrative and contextual framing.
- **Diagrammatic Representation**: Free-Body Diagrams (FBD) with resolved forces, optical ray paths, or circuit schematics.
- **Graphical Representation**: Kinematic ($s-t, v-t, a-t$) and thermodynamic ($p-V, T-s$) graphs with explicit slope ($\frac{dy}{dx}$) and area-under-curve ($\int y\,dx$) physical meaning.
- **Symbolic / Algebraic Representation**: Parametric derivation of scaling laws (e.g. how $T$ scales with $L$ and $g$).
- **Tabular Representation**: Empirical state variables and experimental observation pairs.

---

### C. The 10 Canonical Physics Question Types

Every Physics chapter in the StudyLab curriculum must be modeled across the following **10 distinct procedural question types**:

1. **Kinematics Stopping Distance & Acceleration (`PHYS_KINEMATICS_MOTION`)**:
   - *Pedagogical Purpose*: Apply kinematic equations of motion ($v = u + at$, $s = ut + \frac{1}{2}at^2$, $v^2 = u^2 + 2as$) under uniform acceleration/retardation.
   - *Example*: Calculate the stopping distance of a $1200\text{ kg}$ car moving at $72\text{ km/h}$ under deceleration $a = 4\text{ m/s}^2$.

2. **Work-Energy & Variable Force (`PHYS_WORK_ENERGY`)**:
   - *Pedagogical Purpose*: Apply the Work-Energy Theorem ($W_{\text{net}} = \Delta K$) and evaluate work done by constant and position-dependent forces ($W = \int F(x)dx$).
   - *Example*: Find the kinetic energy of a particle subjected to force $F(x) = 3x^2 + 2x\text{ N}$ moving from $x=1\text{ m}$ to $x=3\text{ m}$.

3. **Dynamics & Incline Friction (`PHYS_DYNAMICS_FRICTION`)**:
   - *Pedagogical Purpose*: Resolve forces on inclined planes, calculate normal reaction $N = mg\cos\theta$, friction $f_k = \mu_k N$, and net acceleration $a = g(\sin\theta - \mu_k \cos\theta)$.

4. **Linear Momentum & Collisions (`PHYS_MOMENTUM_CONSERVATION`)**:
   - *Pedagogical Purpose*: Apply conservation of linear momentum ($\sum \vec{P}_i = \sum \vec{P}_f$), compute gun recoil velocity, and determine post-collision velocities using restitution coefficient $e$.

5. **Gravitation & Orbital Scaling (`PHYS_GRAVITATION_SCALING`)**:
   - *Pedagogical Purpose*: Evaluate variation of acceleration due to gravity with height $g_h = g(1 - 2h/R)$ and depth $g_d = g(1 - d/R)$, and calculate orbital velocity $v_o = \sqrt{GM/R}$ vs escape velocity $v_e = \sqrt{2gR}$.

6. **Thermodynamics & Heat Capacities (`PHYS_THERMODYNAMICS_PROCESSES`)**:
   - *Pedagogical Purpose*: Apply the First Law of Thermodynamics ($\Delta Q = \Delta U + W$), compute sensible heat $Q = mc\Delta T$, latent heat $Q = mL$, and work in isobaric/isothermal/adiabatic processes.

7. **Circuit Resistance & Joule Heating (`PHYS_CIRCUITS_OHM`)**:
   - *Pedagogical Purpose*: Calculate equivalent resistance in series/parallel/bridge networks, apply Ohm's law $V = IR$, and compute electric power $P = I^2 R = V^2/R$.

8. **Optics & Refraction / Lens Maker (`PHYS_OPTICS_GEOMETRIC`)**:
   - *Pedagogical Purpose*: Apply Snell's law $n_1 \sin\theta_1 = n_2 \sin\theta_2$, lens formula $\frac{1}{f} = \frac{1}{v} - \frac{1}{u}$, mirror formula $\frac{1}{f} = \frac{1}{v} + \frac{1}{u}$, and power $P = 1/f\text{ (in m)}$.

9. **Dimensional Analysis & Unit Consistency (`PHYS_DIMENSIONAL_ANALYSIS`)**:
   - *Pedagogical Purpose*: Test formula homogeneity using $[M^a L^b T^c]$ dimensions, deduce scaling exponents, and convert quantities between CGS and SI units.

10. **Asymptotic Limits & Sanity Drills (`PHYS_BOUNDARY_LIMITS`)**:
    - *Pedagogical Purpose*: Verify physical behavior at mathematical boundaries ($\mu \to 0 \implies \text{frictionless}$; $\theta \to 90^\circ \implies \text{free fall}$; $m_2 \gg m_1 \implies m_1 \text{ negligible}$).

---

### D. Options Contract & Physics Distractor Integrity

1. **Mandatory Options**: All choice-based physics items must provide $\ge 4$ distinct options.
2. **Strict Anti-Fallback**: Generic textboxes are strictly forbidden. Numerical items must specify explicit units and precision tolerances.
3. **Physics Cognitive Distractors**:
   - *Vector Sign Flip Distractor*: Inverting positive/negative direction ($\pm g$).
   - *Normal Reaction Error Distractor*: Using $N = mg$ on an incline instead of $mg\cos\theta$.
   - *Reciprocal Resistance Distractor*: Returning $\frac{1}{R_p}$ instead of $R_p$.
   - *Unit Prefix / Conversion Distractor*: Forgetting to convert $\text{km/h}$ to $\text{m/s}$ (factor $\frac{5}{18}$) or $\text{cm}$ to $\text{m}$.
   - *Cartesian Sign Convention Distractor*: Using positive focal length for concave mirrors.

---

### E. 3-Tier Progressive Hint Contract

- **Tier 1 (Principle / Recognition)**: Identifies the governing physical law or conservation principle (e.g. "कार्य-ऊर्जा प्रमेय (Work-Energy Theorem) $W_{\text{net}} = \Delta K$ का प्रयोग करें।"). No calculations or values revealed.
- **Tier 2 (Operation / Strategy)**: Identifies the exact equation and vector resolution step (e.g. "प्रारंभिक गतिज ऊर्जा $\frac{1}{2}mu^2$ को घर्षण द्वारा किए गए कार्य $f_k \cdot s$ के बराबर रखें।").
- **Tier 3 (Intermediate Step / Scaffolding)**: Discloses intermediate values (e.g. "मंदन $a = \mu g = 0.2 \times 9.8 = 1.96\text{ m/s}^2$ प्राप्त होता है। अब $v^2 = u^2 - 2as$ में $v=0$ रखें।").
- **Strict Anti-Leak Invariant**: Hints MUST NEVER disclose the final calculated value ($51.02\text{ m}$).

---

### F. Deep-Structure Problem Topology Model
For every distinct physics problem type, document in both Markdown and JSON:
- **Identity**:
  - `id`: Pattern identifier (e.g. `pat-phys-fric-001`).
  - `domain`: `"Physics"`.
  - `skill_id`: `"physics-study"`.
  - `schema_id`: Semantic archetype ID (e.g. `inclined-plane-friction`, `work-energy-variable-force`).
  - `problem_family`: Physical sub-domain / family (e.g. `Mechanics::Dynamics`, `Thermodynamics::Processes`, `Electromagnetism::Circuits`).
  - `problem_type`: Problem name in Hindi + English parentheses `( )`.
- **Physical Situation & Deep Structure (`deep_structure`)**: The governing physical law or equation system (e.g. $\sum \vec{F} = m\vec{a}, N = mg \cos\theta, f_k = \mu_k N, a = g(\sin\theta - \mu_k \cos\theta)$ or $W_{net} = \Delta K = \int F(x)dx$).
- **Recognition Signals (`recognition_signals`)**: Non-empty array of physical cues, parameters ($\theta, \mu, m, v, k$), or boundary keywords.
- **Physical Representation (`representation`)**: Spatial and vector setup (e.g. `मुक्त पिंड आरेख (Free-Body Diagram with Resolved Vector Components)`).
- **Governing Method (`governing_method`)**:
  - `standard_algorithm`: Non-empty array of step strings capturing coordinate system choice, force/vector resolution, equation setup, and solution execution.
  - `shortcut_or_alternative`: Accelerated special case formula (e.g. Angle of repose $\theta = \tan^{-1}\mu_s$, effective $g_{\text{eff}}$ in accelerating frames).
- **Decision Points (`decision_points`)**: Branching rules (e.g. coordinate choice along incline vs horizontal; static friction check $F_{\text{applied}} \le f_s(\max)$).
- **Common Examiner Traps (`common_traps`)**: Vector sign errors, normal reaction mistakes ($N = mg$ vs $mg\cos\theta$), friction direction inversion, unit mismatches (cm to m, grams to kg).
- **Physical Sanity & Verification Rules (`verification_rules`)**:
  - *Dimensional Analysis*: Units and dimensional formulas ($[M L T^{-2}]$ for force, $\text{m/s}^2$ for acceleration).
  - *Extreme / Boundary Limits*: Asymptotic checks (e.g. $\mu \to 0 \implies a = g\sin\theta$; $\theta \to 0^\circ \implies N = mg$; $m_2 \gg m_1$).
- **Difficulty Model**:
  - `difficulty`: Valid enum (`Easy`, `Medium`, `Difficult`, `Easy-Medium`, `Medium-Difficult`, `E`, `M`, `D`, `E/M`, `M/D`).
  - `difficulty_dimensions`: Object containing `conceptual`, `computational`, and `trap_density`.
- **Variation Opportunities (`variation_opportunities`)**: Physical variation dimensions:
  - *Parameter variation* (authentic source questions come first, generated variants are OPTIONAL and appended last without inflating primary count) (mass ratios, coefficient of friction, inclination angles)
  - *Representation variation* (schematic diagrams, $v-t$ graphs, energy bar charts)
  - *Reference frame variation* (inertial vs non-inertial pseudo-force frames)
  - *Multi-step / multi-body combinations* (pulley-block systems on rough inclines)
  - *Boundary cases* (limiting equilibrium, impending motion, zero-friction limits)
- **Transfer Opportunities (`transfer_opportunities`)**: Cross-domain physical applications (e.g. Banking of curved roads, circular motion with friction, orbital mechanics).
- **Error Intelligence (`error_categories`)**: Linked categories from the 14-Category Physics Error Log.
- **Prerequisites (`prerequisites`)**: Explicit physical laws and mathematical tools (e.g. Newton's Laws, Vector Resolution, Basic Calculus).
- **PYQ References (`pyq_references`)**: Structured array of actual exam questions (`exam`, `year`, `shift`, `question_number`, `source`).

### G. Method Selection Decision Trees
Format decision trees explicitly in Markdown and populate `decision_trees` array in JSON:
```text
IF [Forces and Acceleration involved]      ──► Use Newton's Second Law (ΣF = ma) & FBD
IF [Force is a function of position F(x)] ──► Use Work-Energy Theorem (W_net = ΔK)
IF [Impact / Collision with no ext force]  ──► Use Conservation of Linear Momentum (P_i = P_f)
```

### H. 7-Level Practice Progression
Structure practice recommendations in Markdown and populate `practice_progression` array in JSON:
1. *Level 1: Direct Formula Substitution* (`Easy`)
2. *Level 2: Single-Concept Manipulation* (`Easy-Medium`)
3. *Level 3: Multi-Concept Integration* (`Medium`)
4. *Level 4: Reverse / Inverse Problem Solving* (`Medium-Difficult`)
5. *Level 5: Boundary Condition & Special Case Analysis* (`Medium-Difficult`)
6. *Level 6: Pattern Recognition & Novel Contexts* (`Difficult`)
7. *Level 7: Timed & High-Pressure Optimization* (`Difficult`)

### I. 14-Category Physics Error Log & Adaptive Remediation Routing
Populate `error_log_taxonomy` array in JSON and link pattern errors:
1. *Formula Recall Error* $\rightarrow$ Remediate with Formula Card / Physical Meaning Check.
2. *Physical Concept Misunderstanding* $\rightarrow$ Remediate with Mental Model / Concept Check.
3. *Model Selection Error* $\rightarrow$ Remediate with Governing Principle Decision Drill.
4. *Vector Component / Direction Error* $\rightarrow$ Remediate with FBD Vector Resolution Drill.
5. *Sign Convention Error* $\rightarrow$ Remediate with Cartesian Coordinate Sign Scaffold.
6. *SI Unit / Dimension Conversion Error* $\rightarrow$ Remediate with Dimensional Homogeneity Drill.
7. *Algebraic Execution Error* $\rightarrow$ Remediate with Same Numerical / Lower Speed Target.
8. *Boundary Condition / Limit Miss* $\rightarrow$ Remediate with Asymptotic Boundary Drill.
9. *Graph Slope / Area Misinterpretation* $\rightarrow$ Remediate with Graphical Deduction Drill.
10. *Question Misinterpretation* $\rightarrow$ Remediate with Given/Unknown Extraction Scaffold.
11. *Formula Validity Over-extension* $\rightarrow$ Remediate with Idealization Validity Check.
12. *Verification Failure* $\rightarrow$ Remediate with Dimensional / Asymptotic Sanity Step.
13. *Trap Falling* $\rightarrow$ Remediate with Physics Trap Breakdown.
14. *Calculus / Mathematical Tool Error* $\rightarrow$ Remediate with Integration/Differentiation Scaffold.

---

## 6. Subject-Specific Output Extensions

All outputs are saved inside `Study Materials/Physics/[Chapter Folder]/` and follow the Core Hindi-first study material language policy:

---

## 7. Subject Domain Audit

In addition to Core technical validation, perform Physics Domain Audit:
1. **Physical Model Grounding**: Are mathematical equations explicitly linked to their physical meaning and mental models?
2. **Unit & Dimension Completeness**: Is every physical quantity accompanied by its SI unit and dimensional formula?
3. **Formula Validity Bounds**: Are idealizations (e.g., frictionless, point mass, ideal gas) explicitly stated for every equation?
4. **Calculation Exclusion from Anki**: Are standard flashcards 100% free of numerical multi-step calculations?

---

## 8. PYQ & External Mode Interpretation

In `SOURCE_PLUS_PYQ` mode:
- PYQs identify high-frequency numerical problem types, examiner trap patterns, and dimensional analysis questions.
- PYQ analysis enriches `[Chapter]_ProblemPatterns.md` under `Exam Frequencies & Traps`.
- PYQs MUST NOT alter static physical laws or definitions in `[Chapter]_Notes.md`.

---

## 9. Exceptions & Boundary Conditions

Structure physics exceptions and boundary limits explicitly:
`PHYSICAL LAW / FORMULA → IDEAL ASSUMPTION → BOUNDARY EXCEPTION → PHYSICAL REASON → CORRECT MODEL`  
*(Example: Ohm's Law $V = IR$ $\rightarrow$ Assumption: Constant temperature & linear conductor $\rightarrow$ Exception: Non-ohmic devices like Diodes and Transistors $\rightarrow$ Reason: Temperature/semiconductor carrier mobility change).*

---

## 10. Visual Map Architecture

### A. Natural Map Types & Knowledge Structures
- **Principle-Model-Equation Hierarchy**: Principle $\rightarrow$ Model $\rightarrow$ Formula $\rightarrow$ Variables $\rightarrow$ **Concept / Dependency Map**.
- **Model Selection & Physical Problem Families**: Scenario $\rightarrow$ Governing Law $\rightarrow$ **Problem-Family / Decision Map**.
- **Causal Relationships & Physical Effects**: Force $\rightarrow$ Acceleration $\rightarrow$ Velocity Change $\rightarrow$ **Causal / Concept Map**.

### B. Structures Prohibited from Ordinary Radial Maps
- ❌ **Full Mathematical Derivations**: Derivations belong in **Notes.md**, NEVER force into map nodes.
- ❌ **Multi-Step Calculation Algorithms**: Map only model selection rules, not numeric calculations.
- ❌ **Uncontextualized Formula Dumps**: Formula nodes must be linked to physical principles.

### C. Subject-Specific Semantics
- **Node Semantics**: Physical principle, model name, variable boundary in Hindi + English parentheses `( )` (max 8 words for formulas).
- **Edge Semantics**: `governs` (शासित करता है), `modeled by` (द्वारा मॉडल किया जाता है), `valid under` (के तहत मान्य), `depends on` (पर निर्भर है).

### D. Physics Failure Modes to Avoid
- Bloating map nodes with multi-line equation derivations.
- Turning conceptual physics graphs into flat radial trees without model-formula hierarchy.

---

## 11. Subject-Specific Visual Learning Grammar

```yaml
visual_learning_grammar:
  dominant_structures:
    - mechanics
    - vectors
    - fields
    - motion
    - energy transfer
    - experimental setup
    - conservation
  preferred_visual_forms:
    - free-body diagrams
    - coordinate systems
    - field diagrams
    - apparatus
    - motion profiles
    - energy-flow diagrams
  preferred_narrative_modes:
    - mental model to equation
    - visual thought experiment
    - graph-to-physical quantity deduction
    - problem topology breakdown
  high_value_visual_opportunities:
    - free-body diagrams with resolved vector components along defined axes
    - kinematics and thermodynamics graphs with highlighted slope and area-under-curve significance
    - electromagnetic field lines and vector cross products (Right-Hand Rule)
    - ray diagrams and optical bench setups with standard Cartesian sign conventions
    - circuit schematics showing current paths, node potentials, and loop directions
  visual_anti_patterns:
    - equation dumps without coordinate systems or free-body diagrams
    - disconnected formula lists without physical assumptions or validity bounds
    - dense multi-step algebraic calculations filling entire visual frames
    - abstract scalar equations for vector phenomena without directional framing
```

### Domain Visual Reasoning
- **Physical Model Before Math**: Establish the spatial frame, coordinates, and physical forces/fields before presenting mathematical equations.
- **Graph as Deduction Tool**: Visually link graph features (slopes, areas, intercepts) directly to their physical meanings ($\frac{dy}{dx}$ and $\int y\,dx$).
- **Boundary & Vector Discipline**: Explicitly represent vector directions, signs, and idealization validity limits.

---

## Multimodal Execution Triggers
- **Visual Inspection Rule**: Inspect graphs, equations, and physics diagrams natively when relevant. Do NOT use OCR if native multimodal understanding is sufficient. Do not inspect every image automatically.
