# Four-Domain Procedural Boundaries & Scope Discipline (`domain-boundaries.md`)
**Version**: `2.0.0`  
**Classification**: Curricular Boundaries & Scope Governance  
**Status**: Authoritative Architectural Standard

---

## 1. The Dual-Pipeline Architecture & Scope Discipline

The StudyLab ecosystem maintains an absolute, non-negotiable division of labor between two distinct pipelines:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ARCHITECTURAL SYSTEM BOUNDARIES                                  │
├───────────────────────────────────────────────┬──────────────────────────────────────────────────┤
│ STUDYSOURCECORE GENERIC PIPELINE (FROZEN)     │ STUDYLAB PROCEDURAL PIPELINE (ACTIVE DOMAIN)     │
├───────────────────────────────────────────────┼──────────────────────────────────────────────────┤
│ • Notes (`[Chapter]_Notes.md`)                │ • Problem Patterns (`[Chapter]_ProblemPatterns`) │
│ • Combined Declarative APKG (`[Chapter]_Anki`)│ • Practice Questions (`[Chapter]_PracticeQ`)     │
│ • Basic TSV (`[Chapter]_Basic.tsv`)           │ • Procedural APKG (`[Chapter]_StudyLab_Proc`)    │
│ • Cloze TSV (`[Chapter]_Cloze.tsv`)           │ • Companion Manifest (`.manifest.json`)          │
│ • Image Occlusion (`[Chapter]_IO.tsv`)        │ • Model ID: `1600000004` (StudyLab Anchor)       │
│ • MindMaps & NotebookLM SlideDecks            │ • Scope: Maths, Reasoning, Phys/Chem Numericals  │
│ • Model IDs: `1600000001`, `1600000002`, `3`  │ • Target: Algorithmic Problem Solving & Traps    │
└───────────────────────────────────────────────┴──────────────────────────────────────────────────┘
```

### 1.1 The Frozen Generic Pipeline Invariant
- The declarative pipeline in `study-source-core` (`Notes.md`, `Basic.tsv`, `Cloze.tsv`, `Image Occlusion`, `MindMaps`, `SlideDecks`, and `[Chapter]_Anki.apkg`) is **FROZEN**.
- Model IDs `1600000001` (Basic), `1600000002` (Cloze), and `1600000003` (Image Occlusion) must remain untouched.
- Declarative flashcards test atomic memory retrieval without multi-step numerical calculation or algorithmic branching.

### 1.2 The Procedural Scope Invariant
StudyLab procedural APKG development (`Model 1600000004`) is strictly restricted to **4 domains**:
1. **Track B: Mathematics** (Broad procedural problem spaces)
2. **Track C: Reasoning** (Algorithmic logic, arrangements, constraint networks)
3. **Track D: Physics NUMERICALS ONLY** (Quantitative modeling, FBDs, kinematics, energy, circuits, optics)
4. **Track E: Chemistry NUMERICALS & MECHANISMS ONLY** (Stoichiometry, mole calculations, equilibrium, kinetics, electrochemistry, organic mechanisms)

---

## 2. Track B: Mathematics (59 Topics)

### 2.1 Scope & Boundaries
- Broad procedural coverage across Arithmetic, Algebra, Geometry, Mensuration, Trigonometry, Coordinate Geometry, and Commercial Math.
- Focuses on equation formulation, multi-stage calculation, method selection trees, and arithmetic sanity verification.

### 2.2 10 Canonical Question Types
1. **`MATH_DIRECT_COMPUTE`**: Direct execution of standard arithmetic or algebraic algorithms.
2. **`MATH_REVERSE_PROBLEM`**: Inverse parameter deduction (given result, find initial condition or multiplier).
3. **`MATH_RELATIONSHIP`**: Applying cross-property algebraic identities ($\text{LCM} \times \text{HCF} = A \times B$).
4. **`MATH_WORD_PROBLEM`**: Contextual narrative modeling (extracting parameters from real-world phrasing).
5. **`MATH_MULTI_STEP`**: Sequential multi-stage calculations requiring intermediate results.
6. **`MATH_METHOD_SELECTION`**: Metacognitive strategy drills (Prime Factorization vs Division Algorithm).
7. **`MATH_TRAP_QUESTION`**: Boundary and remainder offset pitfalls (e.g. remainder handling in HCF vs LCM).
8. **`MATH_REPRESENTATION_VARIANT`**: Algebraic vs decimal vs fraction representation conversion.
9. **`MATH_TRANSFER_PROBLEM`**: Cross-domain mathematical application (e.g. LCM applied to circular track laps).
10. **`MATH_MIXED_INTERLEAVED`**: Interleaved pattern discrimination across similar problem formulations.

---

## 3. Track C: Reasoning (30 Topics)

### 3.1 Scope & Boundaries
- Covers analytical reasoning, structural arrangements, logic networks, syllogisms, and relational deduction.
- Strictly emphasizes systematic algorithmic exploration over guessing.

### 3.2 The 7-Layer Thinking Flow
$$\text{Pattern Recognition} \to \text{Representation Setup} \to \text{Constraint Extraction} \to \text{Case Initiation} \to \text{Deductive Propagation} \to \text{Trap Check} \to \text{Conclusion}$$

### 3.3 The 4-Tier Constraint System
- **Definite Anchor**: Fixed spatial/relational anchor (e.g., *"A sits at extreme left end"*).
- **Conditional Implication**: Logical dependency (e.g., *"If P is on floor 2, Q must be on floor 5"*).
- **Negative Constraint**: Elimination rule (e.g., *"Neither R nor S can sit adjacent to T"*).
- **Hidden Bounds**: Parity, interval offsets, and capacity limits ($L + R - 1 = \text{Total}$).

### 3.4 10 Canonical Question Types
1. **`REAS_SYLLOGISM_STANDARD`**: Minimal overlap Venn diagram deduction.
2. **`REAS_SYLLOGISM_POSSIBILITY`**: Evaluating possibility vs definite conclusions and Either-Or cases.
3. **`REAS_SEATING_LINEAR`**: 1D line arrangements with directional orientation (North/South).
4. **`REAS_SEATING_CIRCULAR`**: Inward/outward facing circular arrangement loops.
5. **`REAS_PUZZLE_MATRIX`**: Multi-attribute entity matching grids ($N \times M$).
6. **`REAS_PUZZLE_STACK`**: Vertical floor and box stacking arrangements with interval bounds.
7. **`REAS_BLOOD_RELATIONS`**: Coded operator family tree decoding.
8. **`REAS_DIRECTION_SENSE`**: 2D displacement vectors, Pythagoras turns, and shadow geometry.
9. **`REAS_RANKING_ORDER`**: Overlapping linear position offsets and middle counts.
10. **`REAS_CRITICAL_LOGIC`**: Implicit premise identification and statement-assumption validation.

---

## 4. Track D: Physics Numericals Only (40 Topics)

### 4.1 Scope & Strict Boundaries
- **STRICTLY NUMERICAL & QUANTITATIVE MODELING ONLY**.
- Descriptive history (e.g. *"Discovery of electron"*, *"Biographies of physicists"*) is 100% excluded.
- Covers Kinematics, Dynamics, Work-Energy, Momentum, Gravitation, Thermodynamics, Current Electricity, and Geometric Optics.

### 4.2 The 6-Stage Numerical Modeling Pipeline
$$\text{Physical Model} \to \text{Spatial / FBD Representation} \to \text{Governing Conservation Law} \to \text{Vector / Scalar Equations} \to \text{Calculation} \to \text{Dimensional / Asymptotic Sanity}$$

### 4.3 10 Canonical Question Types
1. **`PHYS_KINEMATICS_MOTION`**: 1D/2D motion with constant acceleration equations.
2. **`PHYS_WORK_ENERGY`**: Work-energy theorem and mechanical energy conservation.
3. **`PHYS_DYNAMICS_FRICTION`**: Inclined plane force balance, normal force $N = mg\cos\theta$, and friction $\mu N$.
4. **`PHYS_MOMENTUM_CONSERVATION`**: 1D/2D recoil, elastic and inelastic collisions.
5. **`PHYS_GRAVITATION_SCALING`**: Kepler's laws, orbital speed, and escape velocity scaling relations.
6. **`PHYS_THERMODYNAMICS_PROCESSES`**: Gas laws ($PV=nRT$), $p\Delta V$ work, first law of thermodynamics, Carnot efficiency.
7. **`PHYS_CIRCUITS_OHM`**: Series-parallel resistor/capacitor networks, Kirchhoff's laws, and Joule heating.
8. **`PHYS_OPTICS_GEOMETRIC`**: Mirror and lens formula with Cartesian sign conventions.
9. **`PHYS_DIMENSIONAL_ANALYSIS`**: Checking dimensional homogeneity $[M^a L^b T^c]$ and deriving scaling exponents.
10. **`PHYS_BOUNDARY_LIMITS`**: Asymptotic physical sanity tests ($m_1 \gg m_2$, $\mu \to 0$, $t \to \infty$).

---

## 5. Track E: Chemistry Numericals & Mechanisms (46 Topics)

### 5.1 Scope & The 3-Branch Architecture
- Strictly restricted to Quantitative Physical Chemistry, Organic Reaction Mechanisms, and Inorganic Trend Deductions.
- Descriptive ore lists, mineral names, and alloy tables are 100% excluded.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE 3 CHEMISTRY PROCEDURAL BRANCHES                              │
├───────────────────────────────┬─────────────────────────────────┬────────────────────────────────┤
│ 1. PHYSICAL CHEMISTRY         │ 2. ORGANIC CHEMISTRY            │ 3. INORGANIC CHEMISTRY         │
│ (Quantitative / Stoichiometry)│ (Mechanistic / Selectivity)     │ (Trend Deduction / Complexes)  │
├───────────────────────────────┼─────────────────────────────────┼────────────────────────────────┤
│ • Mole-mass conversions       │ • Substrate pathway (SN1 vs SN2)│ • Periodic property anomalies  │
│ • Limiting reagent analysis   │ • Regioselectivity (Markovnikov)│ • Oxidation state balancing    │
│ • Equilibrium ICE tables (Kc) │ • Elimination (E1 vs E2, Zaitsev│ • Coordination number & CFSE   │
│ • pH, pOH, and buffer curves  │ • Carbocation rearrangements    │ • Electronic configurations    │
│ • Electrochemistry & Faraday  │ • Functional group roadmaps     │ • Qualitative ion analysis     │
└───────────────────────────────┴─────────────────────────────────┴────────────────────────────────┘
```

### 5.2 10 Canonical Question Types
1. **`CHEM_PHYS_MOLE_MASS`**: Avogadro conversions, molar mass, and empirical formulas.
2. **`CHEM_PHYS_STOICHIOMETRY`**: Mass-mass, mass-volume, and limiting reagent yield calculations.
3. **`CHEM_PHYS_EQUILIBRIUM_KC`**: Setting up ICE tables and computing equilibrium concentrations and $K_c$.
4. **`CHEM_PHYS_GAS_LAWS`**: Dalton's partial pressures, Graham's effusion law, and $PV=nRT$.
5. **`CHEM_PHYS_SOLUTIONS_PH`**: Strong/weak acid-base dissociation pH and buffer calculations.
6. **`CHEM_ORG_MECHANISM_SELECTION`**: Predicting $S_N1 \text{ vs } S_N2$ or $E1 \text{ vs } E2$ based on substrate, solvent, and nucleophile.
7. **`CHEM_ORG_REGIOSELECTIVITY`**: Markovnikov vs Anti-Markovnikov addition and Saytzeff elimination product prediction.
8. **`CHEM_ORG_CONVERSIONS`**: Multi-step functional group transformations and reagent selection.
9. **`CHEM_INORG_PERIODIC_TRENDS`**: Analyzing ionization enthalpy anomalies, electron gain enthalpy, and atomic radius contractions.
10. **`CHEM_INORG_COORDINATION`**: Determining coordination number, IUPAC nomenclature, oxidation state, and crystal field splitting energy.

---

## 6. Explicit Exclusion of Descriptive Theory

The following topic categories are **STRICTLY PROHIBITED** from StudyLab Procedural packages. They must be authored exclusively in declarative `Notes.md`, `Basic.tsv`, and `Cloze.tsv`:

| Prohibited Category | Examples | Correct Storage Pipeline |
|---|---|---|
| **Historical Trivia & Discovery Dates** | *"Who discovered the electron in 1897?"*, *"Rutherford's gold foil experiment history"* | `study-source-core` Declarative Flashcards (`Basic.tsv`) |
| **Descriptive Mineral / Ore Lists** | *"Bauxite is an ore of Aluminium"*, *"Galena is PbS"* | `study-source-core` Declarative Cloze Flashcards (`Cloze.tsv`) |
| **Scientist Biographies & Awards** | *"Nobel prize winners in physics"*, *"Biographical details"* | `study-source-core` Chapter Notes (`Notes.md`) |
| **Qualitative Definition Memorization** | *"Define momentum"*, *"What is green chemistry?"* | `study-source-core` Declarative Basic Cards (`Basic.tsv`) |
| **Static Anatomic or Botanical Catalogs** | *"Names of plant hormones"*, *"Human bone count lists"* | `study-source-core` Declarative Flashcards (`Basic.tsv`) |

---

## 7. Curricular Governance & Audit Rule

Before generating any StudyLab procedural package, the author must execute the **Domain Governance Check**:
1. Does this topic require multi-step calculation, algebraic manipulation, spatial constraint solving, reaction pathway prediction, or physical law modeling?
   - **YES** $\implies$ Proceed with dedicated StudyLab specialist procedural packaging (`math-apkg-author`, `reasoning-apkg-author`, `physics-numerical-apkg-author`, `chemistry-numerical-apkg-author` generating `Model 1600000004`).
   - **NO (Pure Fact Recall)** $\implies$ HALT procedural packaging immediately. Direct content to declarative TSV decks (`core-basic-anki`, `core-cloze-anki`).
