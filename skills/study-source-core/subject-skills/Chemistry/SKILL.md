---
name: chemistry-study
description: Subject-specific Chemistry layer for study-source-core. Defines Chemistry knowledge architecture (3-branch domain model: Physical, Organic, Inorganic), explicit layer separation, reaction & mechanism networks, periodic trends, stoichiometry, exception rules, conditional branch outputs, and domain audit checks.
---

# Chemistry Subject Skill (`chemistry-study`)

## 1. Subject Mission & Core Inheritance

`chemistry-study` is the specialized Chemistry domain layer for `study-source-core`.

This Skill inherits all universal rules, source boundary policy, source execution modes (`SOURCE_ONLY` default), Plan/Approval workflow (Mode A $\rightarrow$ Mode B), conditional artifact policy (evaluating Notes, Basic, Cloze), Basic/Cloze TSV file separation, tool-agnostic principles, and Core technical validation from `study-source-core`.

This document defines ONLY the subject-specific knowledge architecture, memory selection logic, performance architecture, domain audit rules, and conditional output contracts for Chemistry.

### Primary Objective
Chemistry is a **HYBRID BRANCHED DISCIPLINE** consisting of three distinct sub-domains. The central goal is NOT "memorize chemical facts", but:  
`Understand Chemical Model → Identify Governing Rule / Principle → Represent Correctly → Apply to Reactions / Numerical Problems → Distinguish Exceptions`



> *This skill inherits all core policies, StudyLab invariants, 3-tier hints, options contracts, error taxonomies, and universal language contracts directly from study-source-core. Do not duplicate core definitions here.*

---

## 2. The 3-Branch Chemistry Domain Model

Chemistry MUST NOT be treated as one homogeneous knowledge type. Treat each branch with its specialized domain architecture:

### A. PHYSICAL CHEMISTRY (Mathematical + Conceptual + Procedural)
- **Focus**: Thermodynamics, Equilibrium, Electrochemistry, Kinetics, Atomic Structure, Solutions, Surface Chemistry.
- **Core Engine**: Formulas, physical laws, stoichiometry, numerical algorithms, state variables.
- **Artifacts**: `Notes.md` + conditional `[Chapter]_ProblemPatterns.md` (numerical patterns, formula bounds, calculation decision trees).

### B. ORGANIC CHEMISTRY (Structural + Mechanistic + Transformational)
- **Focus**: Reaction Mechanisms, Functional Groups, Nomenclature, Isomerism, Reagents, Named Reactions, Conversions.
- **Core Engine**: Nucleophile/Electrophile interactions, electron displacement (Inductive, Resonance, Hyperconjugation), reaction pathways ($S_N1, S_N2, E1, E2$).
- **Artifacts**: `Notes.md` + conditional `[Chapter]_ReactionMap.md` (reagent matrices, transformation networks, mechanism steps).

### C. INORGANIC CHEMISTRY (Taxonomic + Trend-Based + Exception-Heavy)
- **Focus**: Periodic Table Trends, Chemical Bonding, Coordination Compounds, p/d/f-Block Elements, Metallurgy, Qualitative Analysis.
- **Core Engine**: Electronic configuration, oxidation states, lattice/hydration energy, shielding effect, diagonal relationships, exceptions to periodic trends.
- **Artifacts**: `Notes.md` + conditional `[Chapter]_Comparative.tsv` & `[Chapter]_Basic.tsv` (trend order cards, exception flashcards, color/precipitate recall).

---

## 3. Chemistry Note Architecture

A Chemistry note (`[Chapter]_Notes.md`) is a **branched chemical knowledge model**:

### Flexible Section Architecture
```markdown
# [Chapter Title] ([रसायन विज्ञान अध्याय])

## 1. Chapter Overview & Branch Classification
- Primary branch (Physical / Organic / Inorganic Chemistry).
- Core chemical principles, system boundaries, and reaction conditions.

## 2. Core Concepts, Definitions & Terminology
- Definitions, atomic/molecular structures, and fundamental terms.

## 3. Physical Laws, Trends & Reaction Networks
- Physical Chemistry formulas / Inorganic periodic trends / Organic reaction networks.

## 4. Mechanisms, Reagents & Step-by-Step Transformations
- Detailed reaction mechanisms ($S_N1/S_N2$), electron displacement flows, or industrial processes.

## 5. Classification & Comparative Matrices
- Side-by-side matrices (e.g., $S_N1$ vs $S_N2$, Ideal vs Non-Ideal Solutions, High-Spin vs Low-Spin).

## 6. Exceptions, Special Cases & Anomalies
- Explicit exception callouts (`General Trend → Expected → Exception → Reason → Consequence`).

## 7. Problem Topologies & Numerical Algorithms (Physical Chemistry)
- Solved archetypes, formula validity limits, and stoichiometry decision trees.

## 8. 5-Minute Quick Revision Zone
- High-yield formulas, periodic order trends, named reactions, and reagents.
```

---

## 4. Chemistry Memory Architecture (Anki Selection Rules)

### Branch-Specific Card Selection

#### 1. Physical Chemistry Anki Cards:
- **Basic / Cloze TSV**: Formula definitions, physical units, constant values, named laws (*NO multi-step numerical calculations in Anki*).

#### 2. Organic Chemistry Anki Cards:
- **Basic / Cloze TSV**: Reagent $\rightarrow$ Function ("What is the function of Pyridinium Chlorochromate (PCC)? | Oxidizes primary alcohols to aldehydes"), Named Reactions, Functional Group tests, IUPAC rules.

#### 3. Inorganic Chemistry Anki Cards:
- **Basic / Cloze TSV**: Periodic trend order ("Order of acidic strength: $\text{HClO} < \text{HClO}_2 < \text{HClO}_3 < \text{HClO}_4$"), Coordination compounds, Colors of precipitates/ions, Ores, Exceptions.

---

## 5. Chemistry Performance Architecture & StudyLab Procedural Packaging

> [!IMPORTANT]
> **STUDYLAB PROCEDURAL PACKAGING SUPPORT (SECTION 24 COMPLIANCE)**  
> **This subject supports StudyLab procedural packaging.**  
> When generating StudyLab APKG content for Chemistry, you MUST use the subject-specific 3-branch procedural architecture (Physical, Organic, Inorganic), the 10 canonical question types, the options contract, 3-tier progressive hints, and the branch-specific error taxonomies specified below.  
> StudyLab changes MUST NOT contaminate or break the generic declarative Anki pipeline (`export_anki.js`).

Depending on the active chemical branch and source content, generate specialized procedural performance artifacts:
1. **`[Chapter]_ProblemPatterns.md`**: The human-readable reference model in Hindi-first explanatory prose.
2. **`[Chapter]_ProblemPatterns.json`**: The canonical machine-readable StudyLab procedural artifact strictly conforming to `studylab-procedural-schema.json`.

> [!CAUTION]
> **PRESERVE THE 3-BRANCH ARCHITECTURE — DO NOT HOMOGENIZE CHEMISTRY.**  
> - **Physical Chemistry**: Highly procedural, stoichiometric, thermodynamic, and numerical.
> - **Organic Chemistry**: Mechanistic pathways, transition states, regioselectivity, and reagent transformation networks.
> - **Inorganic Chemistry**: Periodic trends, electronic configuration anomalies, coordination complexes, and structural exceptions.

---

### A. The 10 Canonical Chemistry Question Types

Every Chemistry chapter in the StudyLab curriculum must be modeled across the appropriate branch-specific canonical question types:

#### Physical Chemistry Question Types:
1. **Mole Concept & Molar Mass (`CHEM_PHYS_MOLE_MASS`)**:
   - *Pedagogical Purpose*: Interconvert between mass ($m$), moles ($n$), number of particles ($N = n \cdot N_A$), and gas volume at STP ($V = n \cdot 22.4\text{ L}$).
   - *Example*: Calculate the number of oxygen atoms present in $4.4\text{ g}$ of $\text{CO}_2$ gas at STP.

2. **Stoichiometric Mass-to-Mass Conversions (`CHEM_PHYS_STOICHIOMETRY`)**:
   - *Pedagogical Purpose*: Balance chemical reaction $\to$ determine mole ratios $\to$ identify limiting reagent $\to$ calculate theoretical yield.
   - *Example*: In the Haber process $\text{N}_2 + 3\text{H}_2 \to 2\text{NH}_3$, calculate the mass of $\text{NH}_3$ produced from $28\text{ g}$ of $\text{N}_2$ and $9\text{ g}$ of $\text{H}_2$.

3. **Chemical Equilibrium & ICE Tables (`CHEM_PHYS_EQUILIBRIUM_KC`)**:
   - *Pedagogical Purpose*: Construct Initial-Change-Equilibrium (ICE) tables, evaluate reaction quotient $Q_c$ vs $K_c$, apply $K_p = K_c(RT)^{\Delta n_g}$, and predict Le Chatelier shifts.

4. **Gas Laws & State Transformations (`CHEM_PHYS_GAS_LAWS`)**:
   - *Pedagogical Purpose*: Apply Ideal Gas equation $PV = nRT$, Combined Gas Law $\frac{P_1V_1}{T_1} = \frac{P_2V_2}{T_2}$, and Dalton's Law of Partial Pressures $P_i = x_i P_{\text{total}}$.

5. **Solution Concentration & pH Calculations (`CHEM_PHYS_SOLUTIONS_PH`)**:
   - *Pedagogical Purpose*: Compute Molarity ($M = n/V_{\text{lit}}$), Molality ($m$), dilution $M_1V_1 = M_2V_2$, and evaluate $\text{pH} = -\log[H^+]$ or $\text{pOH} = -\log[OH^-]$.

#### Organic Chemistry Question Types:
6. **Mechanism Pathway Selection ($S_N1/S_N2, E1/E2$) (`CHEM_ORG_MECHANISM_SELECTION`)**:
   - *Pedagogical Purpose*: Analyze substrate degree ($1^\circ, 2^\circ, 3^\circ$), nucleophile/base strength, solvent polarity (polar protic vs polar aprotic), and leaving group ability to predict reaction pathway and stereochemical outcome (Inversion vs Racemization).

7. **Regioselectivity & Markovnikov Rule (`CHEM_ORG_REGIOSELECTIVITY`)**:
   - *Pedagogical Purpose*: Predict major/minor products in electrophilic additions to asymmetric alkenes, carbocation intermediate stability ($3^\circ > 2^\circ > 1^\circ$), and potential hydride/methyl rearrangements.

8. **Functional Group Conversion Roadmaps (`CHEM_ORG_CONVERSIONS`)**:
   - *Pedagogical Purpose*: Determine multi-step synthetic reagent sequences (e.g. Alcohol $\to$ Alkyl Halide $\to$ Nitrile $\to$ Carboxylic Acid $\to$ Amide).

#### Inorganic Chemistry Question Types:
9. **Periodic Trend Deduction & Anomalies (`CHEM_INORG_PERIODIC_TRENDS`)**:
   - *Pedagogical Purpose*: Deduce atomic radii, ionization enthalpy, electron gain enthalpy, and electronegativity trends while accounting for half-filled/fully-filled subshell stability and shielding exceptions ($N > O$ in IE; $Cl > F$ in electron gain enthalpy).

10. **Coordination Complexes & Oxidation States (`CHEM_INORG_COORDINATION`)**:
    - *Pedagogical Purpose*: Determine central metal oxidation state, coordination number, IUPAC nomenclature, and isomerism (geometrical vs optical) in coordination entities.

---

### B. Options Contract & Chemistry Distractor Integrity

1. **Mandatory Options**: All choice-based chemistry questions must provide $\ge 4$ distinct options.
2. **Strict Anti-Fallback**: Generic textboxes are strictly forbidden.
3. **Chemistry Cognitive Distractors**:
   - *Stoichiometric Ratio Inversion*: Multiplying by mole ratio instead of dividing (e.g. using $3/1$ instead of $1/3$).
   - *Temperature Unit Omission*: Using Celsius ($25^\circ\text{C}$) instead of Kelvin ($298.15\text{ K}$) in $PV=nRT$ or $K_p$.
   - *Solvent Stereochemistry Confusion*: Assuming retention of configuration in $S_N2$ instead of Walden inversion.
   - *Rearrangement Omission*: Failing to account for $1,2$-hydride shift to form a more stable $3^\circ$ carbocation.
   - *Electronic Anomaly Ignorance*: Applying naive period trend to Ionization Enthalpy without half-filled $2p^3$ stability.

---

### C. 3-Tier Progressive Hint Contract

- **Tier 1 (Principle / Recognition)**: Identifies the governing chemical branch law or reaction mechanism (e.g. "ली शातेलिए का सिद्धांत (Le Chatelier's Principle) अथवा साम्य स्थिरांक व्यंजक का उपयोग करें।").
- **Tier 2 (Operation / Strategy)**: Identifies the operational stoichiometric or mechanistic step (e.g. "अभिक्रिया के लिए $\Delta n_g = n_P - n_R$ की गणना करें और $K_p = K_c(RT)^{\Delta n_g}$ सूत्र लागू करें।").
- **Tier 3 (Intermediate Step / Scaffolding)**: Discloses partial intermediate calculation or intermediate structure (e.g. "गैसीय मोल्स का अंतर $\Delta n_g = 2 - (1 + 3) = -2$ है। अब तापमान $T = 300\text{ K}$ और $R = 0.0821$ रखें।").
- **Strict Anti-Leak Invariant**: Hints MUST NEVER disclose the final answer value or product name.

---

### D. Full Solution DAG Architecture

1. **Step Node Schema**: Step types include `balance_equation`, `convert_mass_to_moles`, `construct_ice_table`, `identify_limiting_reagent`, `select_mechanism_pathway`, `evaluate_carbocation_stability`, `apply_periodic_trend_exception`, `final_answer`.
2. **Explanatory Standard**: Written in Hindi-first explanatory prose with English chemical terminology in parentheses `( )`.

---

### E. Branch-Specific Procedural Extraction Models

#### 1. Physical Chemistry (Numerical / Procedural)
For every numerical/procedural pattern (e.g. Stoichiometry, Equilibrium, Buffers/Titrations, Electrochemistry, Chemical Kinetics, Thermodynamics), capture:
- **Identity**: `id`, `domain: "Chemistry"`, `skill_id: "chemistry-study"`, `schema_id` (e.g. `kp-kc-thermodynamics`, `ice-table-equilibrium`), `problem_family` (e.g. `Physical Chemistry::Equilibrium`, `Physical Chemistry::Thermodynamics`), `problem_type`.
- **Deep Structure (`deep_structure`)**: Governing thermodynamic/kinetic equations (e.g. $K_p = K_c(RT)^{\Delta n_g}, \Delta G^\circ = -RT \ln K, \ln(K_2/K_1) = \frac{\Delta H^\circ}{R}(\frac{1}{T_1} - \frac{1}{T_2})$).
- **Recognition Signals (`recognition_signals`)**: Gas phases, pressure/temp changes, inert gas addition, standard potentials.
- **Representation (`representation`)**: `साम्यावस्था अभिक्रिया मैट्रिक्स (Reaction ICE Table)` or `ऊर्जा निर्देशांक आरेख (Reaction Coordinate Profile)`.
- **Governing Method (`governing_method`)**:
  - `standard_algorithm`: Balanced reaction $\rightarrow$ stoichiometric mole change $\rightarrow$ equilibrium expression $\rightarrow$ algebraic solution.
  - `shortcut_or_alternative`: Inert gas effect at constant volume vs constant pressure; $\Delta n_g = 0$ shortcuts.
- **Decision Points & Decision Trees**: Le Chatelier shift rules ($P$ increase, $T$ change, catalyst effect), formula selection.
- **Common Examiner Traps (`common_traps`)**: Including solids/liquids in $\Delta n_g$, using Celsius instead of Kelvin, gas constant $R$ unit confusion ($0.0821\text{ L atm/mol K}$ vs $8.314\text{ J/mol K}$).
- **Verification Rules (`verification_rules`)**: $\Delta n_g = 0 \implies K_p = K_c$; exothermic reaction $\implies K$ decreases with $T$.
- **Variation & Transfer**: Heterogeneous equilibria, temperature dependencies, transfer to Nernst equation in Electrochemistry.

#### 2. Organic Chemistry (Mechanisms & Transformations)
For genuine transformation families and mechanism selection patterns, capture:
- **Identity**: `id`, `domain: "Chemistry"`, `skill_id: "chemistry-study"`, `schema_id` (e.g. `sn1-vs-sn2-nucleophilic-substitution`), `problem_family: "Organic Chemistry::ReactionMechanisms"`, `problem_type`.
- **Deep Structure (`deep_structure`)**: Rate laws and transition states (e.g. $\text{Rate}_{S_N2} = k[\text{R-X}][\text{Nu}^-]$ with Walden inversion vs $\text{Rate}_{S_N1} = k[\text{R-X}]$ with carbocation intermediate & racemization).
- **Recognition Signals (`recognition_signals`)**: Substrate degree ($1^\circ, 2^\circ, 3^\circ$), nucleophile strength, solvent polarity (polar protic vs polar aprotic).
- **Representation (`representation`)**: `अभिक्रिया पथ एवं संक्रमण अवस्था आरेख (Reaction Pathway & Transition State Matrix)`.
- **Governing Method & Decision Trees**:
  - `IF [Substrate = 1° & Strong Nucleophile in Polar Aprotic] ──► SN2 (Inversion)`
  - `IF [Substrate = 3° & Weak Nucleophile in Polar Protic]   ──► SN1 (Racemization + Rearrangement)`
- **Common Traps**: Overlooking hydride/methyl shifts in $S_N1$, assuming retention in $S_N2$, nucleophile basicity vs nucleophilicity.
- **Variation & Transfer**: Solvent shifts, leaving group ability ($I^- > Br^- > Cl^- > F^-$), transfer to $E1/E2$ elimination competition.

#### 3. Inorganic Chemistry (Trends & Exceptions)
For genuine deductive trend and exception application patterns, capture:
- **Identity**: `id`, `domain: "Chemistry"`, `skill_id: "chemistry-study"`, `schema_id` (e.g. `periodic-trend-anomalies`), `problem_family: "Inorganic Chemistry::PeriodicTrends"`, `problem_type`.
- **Deep Structure (`deep_structure`)**: Electronic configuration stability and shielding (e.g. $N (2p^3) > O (2p^4)$ Ionization Enthalpy due to half-filled subshell stability).
- **Recognition Signals (`recognition_signals`)**: Group/period comparisons, anomalous ionization energy, electron gain enthalpy orders.
- **Governing Method**: Write valence configuration $\rightarrow$ assess subshell exchange energy / penetration $\rightarrow$ identify exception $\rightarrow$ deduce final order.
- **Common Traps**: Applying naive size trends without checking half-filled/fully-filled stability; confusing electron gain enthalpy of $Cl > F$ with electronegativity $F > Cl$.

### F. Branch-Specific Error Log Taxonomy & Adaptive Remediation Routing
Populate `error_log_taxonomy` array in JSON and link pattern errors:
- **Physical Chemistry Errors (12 Categories)**:
  1. *Formula Misrecall* $\rightarrow$ Formula Card.
  2. *Unit Conversion Error* $\rightarrow$ Unit Factor Drill.
  3. *Stoichiometry Ratio Error* $\rightarrow$ Mole Ratio Balance Drill.
  4. *State Variable Error* $\rightarrow$ State Variable Classification Drill.
  5. *Sign Error* ($\Delta H, \Delta G$) $\rightarrow$ Thermodynamic Sign Convention Drill.
  6. *Equilibrium Expression Error* $\rightarrow$ ICE Table Construction Scaffold.
  7. *Logarithm Calculation Error* $\rightarrow$ Logarithm / pH Arithmetic Practice.
  8. *Dilution Error* $\rightarrow$ $M_1V_1=M_2V_2$ Dilution Drill.
  9. *Formula Validity Extension* $\rightarrow$ Ideal vs Real Boundary Check.
  10. *Kelvin Miss* $\rightarrow$ Absolute Temperature Warning Check.
  11. *Significant Figures Error* $\rightarrow$ Precision Scaffold.
  12. *Verification Omission* $\rightarrow$ Sanity Check Step.
- **Organic Chemistry Errors (7 Categories)**:
  1. *Reagent Misidentification* $\rightarrow$ Reagent Matrix Flashcard.
  2. *Regioselectivity Error* $\rightarrow$ Markovnikov Regioselectivity Drill.
  3. *Stereochemistry Error* $\rightarrow$ Inversion / Racemization 3D Visual.
  4. *Carbocation Rearrangement Miss* $\rightarrow$ Carbocation Stability Ladder.
  5. *Mechanism Pathway Confusion* ($S_N1$ vs $S_N2$) $\rightarrow$ Pathway Decision Drill.
  6. *Protection Miss* $\rightarrow$ Functional Group Protection Roadmap.
  7. *Condition Sensitivity Miss* $\rightarrow$ Reaction Condition Matrix.
- **Inorganic Chemistry Errors (7 Categories)**:
  1. *Trend Exception Miss* $\rightarrow$ Periodic Trend Anomaly Drill.
  2. *Configuration Anomaly Error* $\rightarrow$ Electronic Stability Flashcard.
  3. *Oxidation State Calculation Error* $\rightarrow$ Coordination Number & Oxidation Drill.
  4. *Coordination / Isomerism Miss* $\rightarrow$ Coordination Isomerism Visual Scaffold.
  5. *Color Confusion* $\rightarrow$ Ion / Complex Color Recall.
  6. *Ore Name Confusion* $\rightarrow$ Metallurgy Ore Card.
  7. *Diagonal Relationship Miss* $\rightarrow$ Diagonal Anomaly Drill.

---

## 6. Subject-Specific Output Extensions

---

## 7. Subject Domain Audit

In addition to Core technical validation, perform Chemistry Domain Audit:
1. **Branch Architecture Grounding**: Is the chapter correctly processed using its branch-specific model (Physical, Organic, or Inorganic)?
2. **Reaction & Reagent Accuracy**: Are chemical equations balanced, reagents specified with exact conditions, and products verified?
3. **Trend Exception Coverage**: Are exceptions to periodic trends explicitly explained with electronic/structural reasons?
4. **Numerical Exclusion from Anki**: Are multi-step physical chemistry calculations strictly excluded from flashcards?

---

## 8. PYQ & External Mode Interpretation

In `SOURCE_PLUS_PYQ` mode:
- PYQs highlight high-frequency named reactions, organic conversion patterns, periodic exception trends, and stoichiometry question types.
- PYQ evidence enriches `[Chapter]_ProblemPatterns.md` or `[Chapter]_ReactionMap.md`.
- PYQs MUST NOT alter static chemical definitions, periodic tables, or thermodynamic laws in `[Chapter]_Notes.md`.

---

## 9. Exceptions & Chemical Anomalies

Structure chemical exceptions explicitly:
`GENERAL TREND / RULE → EXPECTED BEHAVIOR → EXCEPTION → ELECTRONIC / STRUCTURAL REASON → CONSEQUENCE`  
*(Example: Ionization Energy increases across period $\rightarrow$ Exception: N has higher IE than O $\rightarrow$ Reason: Half-filled $2p^3$ stability of Nitrogen $\rightarrow$ Consequence: Order is $C < O < N < F$).*

---

## 10. Visual Map Architecture

### A. Natural Map Types & Knowledge Structures
- **Organic Reaction Networks**: Interconversion of functional groups $\rightarrow$ **Network / Concept Map**.
- **Functional Group Classification**: Hydrocarbons, Alcohols, Carbonyls $\rightarrow$ **Hierarchy / Radial Map**.
- **Periodic Trends & Dependencies**: Atomic size, electronegativity, ionization energy trends $\rightarrow$ **Concept / Dependency Map**.
- **Reaction Mechanisms**: Step-by-step electron movement pathways $\rightarrow$ **Process / Flowchart Map**.

### B. Structures Prohibited from Ordinary Radial Maps
- ❌ **Reaction Mechanisms**: Map as **Process / Flowchart Map**, NEVER force into a radial tree.
- ❌ **Complex Organic Interconversions**: Map as **Network Map**.
- ❌ **Stoichiometry / Numerical Calculations**: Keep in **Notes.md / ProblemPatterns.md**, do NOT put formulas in map nodes.

### C. Subject-Specific Semantics
- **Node Semantics**: Functional group, reagent, element, periodic property in Hindi + English parentheses `( )` (2–5 words).
- **Edge Semantics**: `yields` (उत्पन्न करता है), `catalyzes` (उत्प्रेरित करता है), `increases with` (के साथ बढ़ता है), `inhibits` (बाधित करता है), `derived from` (से व्युत्पन्न).

### D. Chemical Failure Modes to Avoid
- Radial tree representation of linear multi-step mechanisms.
- Cluttering map nodes with numerical stoichiometric calculations.

---

## 11. Subject-Specific Visual Learning Grammar

```yaml
visual_learning_grammar:
  dominant_structures:
    - molecular geometry
    - reaction mechanisms
    - transformation
    - equilibrium
    - thermodynamics
    - periodic trends
  preferred_visual_forms:
    - molecular diagrams
    - reaction pathways
    - energy profiles
    - phase diagrams
    - structural comparisons
  preferred_narrative_modes:
    - transformation roadmap
    - electronic mechanism progression
    - thermodynamic energy descent
    - periodic trend 2D heatmap
  high_value_visual_opportunities:
    - multi-step organic conversion roadmaps connecting functional groups
    - reaction mechanisms showing transition states, intermediates, and stereochemistry (SN1 vs SN2)
    - reaction coordinate energy profiles (delta H, Ea, catalyzed vs uncatalyzed)
    - 2D periodic table trend gradients (Electronegativity, Ionization Enthalpy, Atomic Radii)
    - crystal field splitting geometries (Octahedral vs Tetrahedral d-orbital splitting)
  visual_anti_patterns:
    - linear text lists of chemical reactions without reagent conditions or directional arrows
    - uncontextualized stoichiometry calculation walls
    - floating molecular formulas without structural connectivity or geometry
    - trend assertions without electronic configuration / structural causality
```

### Domain Visual Reasoning
- **Branch-Native Visuals**: Align visuals strictly with the active branch (Physical $\rightarrow$ energy graphs/cycles; Organic $\rightarrow$ curved arrows/reaction roadmaps; Inorganic $\rightarrow$ periodic heatmaps/coordination geometries).
- **Transformation Tracking**: Make the chemical change explicit (what bonds break, what bonds form, oxidation state changes).
- **Exception Highlighting**: Use high-contrast callouts for electronic configuration and periodic trend anomalies.

---

## Multimodal Execution Triggers
- **Visual Inspection Rule**: Inspect reaction schemes, molecular structures, and tables natively when relevant. Do NOT use OCR if native multimodal understanding is sufficient. Do not inspect every image automatically.
