---
name: reasoning-study
description: Subject-specific Reasoning layer for study-source-core. Defines Reasoning knowledge architecture (11 Domain DNA types), 7-layer thinking flow, constraint processing rules, method selection decision trees, problem pattern topologies, 14 error categories, conditional performance outputs, and domain audit checks.
---

# Reasoning Subject Skill (`reasoning-study`)

## 1. Subject Mission & Core Inheritance

`reasoning-study` is the specialized Reasoning domain layer for `study-source-core`.

This Skill inherits all universal rules, source boundary policy, source execution modes (`SOURCE_ONLY` default), Plan/Approval workflow (Mode A $\rightarrow$ Mode B), conditional artifact policy (evaluating Notes, Basic, Cloze), Basic/Cloze TSV file separation, tool-agnostic principles, and Core technical validation from `study-source-core`.

This document defines ONLY the subject-specific knowledge architecture, memory selection logic, performance architecture, domain audit rules, and conditional output contracts for Reasoning.

### Primary Objective
Reasoning is a **PATTERN RECOGNITION + CONSTRAINT PROCESSING + INFERENCE + TRAP AVOIDANCE** discipline. The central goal is NOT "memorize solutions", but:  
`Understand Problem Type → Identify Constraints → Select Deduction Rules → Process Case Possibilities → Arrive at Valid Conclusion → Verify Traps`



> *This skill inherits all core policies, StudyLab invariants, 3-tier hints, options contracts, error taxonomies, and universal language contracts directly from study-source-core. Do not duplicate core definitions here.*

---

## 2. Reasoning Knowledge Architecture (11 Domain DNA Types)

Categorize all source content into 11 Domain DNA Types:

1. **Concept Definition**: Core reasoning concepts (e.g., Syllogism, Blood Relation, Seating Arrangement, Coding-Decoding, Assumption, Inference).
2. **Rule / Principle**: Logical rules (e.g., "All + All = All", "No A is B $\implies$ No B is A").
3. **Problem Type**: Distinct problem category classified by deep logical structure.
4. **Representation Technique**: Visual or symbolic mapping method (e.g., Venn Diagrams, Family Trees, Matrix Tables, Linear Diagrams).
5. **Constraint Type**: Definite vs Conditional vs Negative vs Hidden Constraints.
6. **Standard Solving Procedure**: Algorithmic step-by-step solving procedure.
7. **Short Trick / Eliminator**: Rapid elimination rules, option-based shortcuts, or parity checks.
8. **Examiner Trap / Fallacy**: Misleading phrasing, false assumptions, non-reversible relations, converse fallacies.
9. **Case Splitting Rule**: Rules for managing multiple possibilities in complex puzzles.
10. **Application**: Cross-domain or real-life decision-making scenarios.
11. **Verification Rule**: Quick sanity checks to verify logical consistency.

---

## 3. The 7-Layer Reasoning Thinking Flow

Every reasoning problem pattern must follow a 7-Layer Thinking Flow:

```
1. PATTERN RECOGNITION  ──► Identify problem archetype & deep structure
2. REPRESENTATION SETUP ──► Select diagram / notation (Venn, Tree, Table)
3. CONSTRAINT EXTRACTION──► Classify Definite, Conditional, & Negative constraints
4. DECISION TREE START  ──► Pick anchor constraint & initiate case splitting
5. STEP-BY-STEP DEDUCTION► Apply logical rules to eliminate invalid cases
6. TRAP & BOUNDARY CHECK──► Verify against converse fallacies & negative rules
7. FINAL CONCLUSION     ──► Formulate precise answer & verify consistency
```

---

## 4. Reasoning Note Architecture

A Reasoning note (`[Chapter]_Notes.md`) is a **logical method and pattern reference model**:

### Flexible Section Architecture
```markdown
# [Chapter Title] ([रीजनिंग अध्याय])

## 1. Chapter Overview & Core DNA
- Primary reasoning sub-domain (Verbal / Non-Verbal / Analytical / Critical / Logical).
- Core logical principles, representation tools, and overall scope.

## 2. Fundamental Concepts, Rules & Theorems
- Formal definitions, deduction rules, and valid/invalid inference principles.

## 3. Representation & Diagrammatic Tools
- Venn diagrams, family tree symbols, matrix setups, or linear arrangement notations.

## 4. Problem Pattern Topologies & Solved Archetypes
- Problem categories grouped by deep logical structure, showing setup and algorithm.

## 5. Constraint Management & Decision Trees
- Workflow for processing definite vs conditional constraints and case splitting.

## 6. Examiner Traps, Logical Fallacies & Eliminators
- Common traps, converse fallacies, option elimination rules, and sanity checks.

## 7. 5-Minute Quick Revision Zone
- High-yield rules, representation symbols, and quick recognition signals.
```

---

## 5. Reasoning Memory Architecture (Anki Selection Rules)

### STRICT ANKI EXCLUSIONS FOR REASONING
- **NEVER put full puzzle solutions or long arrangements into Anki**.
- **NEVER put multi-step syllogism problem sets into Anki**.
- **NEVER put long passages into Anki**.

### Allowed Anki Candidates:
1. **Definitions & Logical Concepts**: Basic definitions (*Basic TSV*).
2. **Deduction Rules & Equivalences**: Conversion rules (e.g., "Contrapositive of $A \implies B$ is $\neg B \implies \neg A$") (*Basic / Cloze TSV*).
3. **Symbolic Representation Conventions**: Family tree symbols or diagram rules (*Basic TSV*).
4. **Pattern Recognition Signals**: `IF problem displays X structure, THEN use Y representation` (*Basic TSV*).
5. **Source-Provided Mnemonics**: ONLY source-grounded memory devices (*Mnemonic TSV*).

---

## 6. Reasoning Performance Architecture & StudyLab Procedural Packaging

> [!IMPORTANT]
> **STUDYLAB PROCEDURAL PACKAGING SUPPORT (SECTION 24 COMPLIANCE)**  
> **This subject supports StudyLab procedural packaging.**  
> When generating StudyLab APKG content for Reasoning, you MUST use the subject-specific procedural rules, the 7-layer thinking flow, the 4-tier constraint classification, the 10 canonical question types, the options contract, 3-tier progressive hints, and the adaptive error taxonomy specified below.  
> StudyLab changes MUST NOT contaminate or break the generic declarative Anki pipeline (`export_anki.js`).

When the chapter contains logic patterns, puzzles, constraint setups, or analytical reasoning decision trees, generate the **Dual Sibling Procedural Artifacts**:
1. **`[Chapter]_ProblemPatterns.md`**: The human-readable reference model written in Hindi-first explanatory prose.
2. **`[Chapter]_ProblemPatterns.json`**: The canonical machine-readable StudyLab procedural artifact strictly conforming to `studylab-procedural-schema.json`.

> [!CAUTION]
> **DO NOT CONVERT FULL PUZZLE SOLUTIONS INTO DECLARATIVE FLASHCARDS.**  
> Declarative flashcards test atomic recognition and deduction rules. Complete constraint processing workflows, case splitting algorithms, and contradiction eliminations belong strictly in StudyLab procedural packages.

---

### A. The 10 Canonical Reasoning Question Types

Every Reasoning chapter in the StudyLab curriculum must be modeled across the following **10 distinct procedural question types** (distinct puzzle topologies must never be collapsed into simple label variations):

1. **Syllogism Standard Deduction (`REAS_SYLLOGISM_STANDARD`)**:
   - *Pedagogical Purpose*: Evaluate standard 2-statement and 3-statement categorical syllogisms using minimal overlap Venn representations.
   - *Example*: Statements: "सभी बिल्लियाँ कुत्ते हैं।" (All cats are dogs), "कुछ कुत्ते चूहे हैं।" (Some dogs are mice). Test definite conclusions.
   - *Interaction*: Discrete 4-option / 5-option MCQ (Only I follows, Only II follows, Both follow, Neither follows).

2. **Syllogism Possibility & Either-Or (`REAS_SYLLOGISM_POSSIBILITY`)**:
   - *Pedagogical Purpose*: Test modal logic ("can be", "is a possibility") and complementary pair verification for Either-Or.
   - *Validation Rules*: Either-Or requires (1) Both individually false/doubtful, (2) Same subject-predicate, (3) Valid complementary pair (`Some + No`, `Some + Some Not`).

3. **Linear Seating with Definite Anchors (`REAS_SEATING_LINEAR`)**:
   - *Pedagogical Purpose*: Single-row or parallel-row arrangements with North/South facing entities, offset constraints, and end-of-row boundaries.
   - *Example*: 8 persons seated in a line facing North; $A$ sits 3rd from the left end; $B$ sits 2nd to the right of $A$.

4. **Circular Arrangement with Bi-Directional Facing (`REAS_SEATING_CIRCULAR`)**:
   - *Pedagogical Purpose*: Closed circular or polygonal arrangement with inward vs outward facing orientation and relative clockwise/counter-clockwise positioning.
   - *Example*: 6 persons around a circle; 3 face center, 3 face outward; identify the person sitting opposite $P$.

5. **2D Matrix Multi-Variable Matching (`REAS_PUZZLE_MATRIX`)**:
   - *Pedagogical Purpose*: Cross-elimination grids matching multiple independent entity sets (e.g. Persons $\times$ Professions $\times$ Cities $\times$ Days).
   - *Interaction*: Stepwise constraint placement or discrete matching questions.

6. **Floor / Box Stack Puzzles (`REAS_PUZZLE_STACK`)**:
   - *Pedagogical Purpose*: Vertical ordering problems governed by parity (odd/even floors), gap intervals, and top/bottom boundary constraints.
   - *Example*: 7 persons live on floors 1 to 7; exactly 3 persons live between $X$ and $Y$; $X$ lives on an odd-numbered floor above floor 3.

7. **Coded & Pointing Blood Relations (`REAS_BLOOD_RELATIONS`)**:
   - *Pedagogical Purpose*: Decode operator expression networks ($A + B \implies A \text{ is father of } B$) and resolve indirect pointing speaker narratives without gender assumptions.
   - *Representation*: Generational family tree hierarchy with standard gender symbols ($+$ for male, $-$ for female, double horizontal line for marriage).

8. **Direction Sense with Pythagoras & Sun/Shadow (`REAS_DIRECTION_SENSE`)**:
   - *Pedagogical Purpose*: Multi-segment Cartesian path tracking, shortest displacement calculation ($\sqrt{\Delta x^2 + \Delta y^2}$), and morning/evening shadow orientation.

9. **Order & Ranking Interchanges (`REAS_RANKING_ORDER`)**:
   - *Pedagogical Purpose*: Compute total entity count ($T = L + R - 1$), detect overlapping ranks ($T < L + R$), and evaluate position swaps.

10. **Critical Reasoning: Statement-Assumption / Cause-Effect (`REAS_CRITICAL_LOGIC`)**:
    - *Pedagogical Purpose*: Identify unstated necessary presuppositions vs direct consequences; evaluate non-reversible cause-and-effect claims.

---

### B. The 4-Tier Constraint Classification Model

Reasoning procedural generators must classify all problem inputs into four distinct constraint classes:
1. **Definite Anchor Constraints**: Absolute fixed assignments (e.g. "$A$ sits at the extreme right end"). Must be placed first to minimize branching.
2. **Conditional Implication Constraints**: Relative offset or implication rules ($A \implies B$; "$P$ sits 2nd to the left of $Q$").
3. **Negative Constraints**: Forbidden placements or states ("$X$ does not face North"; "$R$ does not live on an even floor").
4. **Hidden Bounds & Parity Constraints**: Structural limits ($N \le 8$; total floors $=7$; only 2 married couples).

---

### C. Options Contract & Logical Distractor Integrity

1. **Mandatory Options**: All reasoning items must provide discrete choice sets ($\ge 4$ options).
2. **Strict Anti-Fallback**: Generic textboxes are strictly prohibited.
3. **Logical Distractor Taxonomies**:
   - *Converse Fallacy Distractor*: Inferring $B \implies A$ from $A \implies B$.
   - *Unspecified Gender Distractor*: Assuming an entity's gender based on name rather than explicit source proof.
   - *Direction Inversion Distractor*: Reversing left/right orientation for outward-facing entities.
   - *All + No False Either-Or Distractor*: Treating `All + No` as a valid Either-Or pair (violates complementary logic).
   - *Overlapping Rank Miscount*: Off by 1 or forgetting $T = L + R - 1$.

---

### D. 3-Tier Progressive Hint Contract

- **Tier 1 (Principle / Recognition)**: Identifies the governing reasoning rule or optimal representation tool (e.g. "रैखिक व्यवस्था में सबसे पहले निश्चित छोर (Definite Anchor) को स्थापित करें।").
- **Tier 2 (Operation / Strategy)**: Identifies the next deduction step (e.g. "कथन 1 और 3 को मिलाकर Case 1 और Case 2 में विभाजित कीजिए।").
- **Tier 3 (Intermediate Step / Scaffolding)**: Discloses partial grid placement (e.g. "Case 2 में $B$ और $D$ के बीच की शर्त पूरी नहीं होती, अतः Case 2 निरस्त होता है।").
- **Strict Anti-Leak Invariant**: Hints MUST NEVER reveal the final answer entity or seat index.

---

### E. Deep-Structure Problem Topology Model
For every reasoning problem pattern, document in both Markdown and JSON:
- **Identity**:
  - `id`: Pattern identifier (e.g. `pat-reas-syl-001`, `pat-reas-seat-001`).
  - `domain`: `"Reasoning"`.
  - `skill_id`: `"reasoning-study"`.
  - `schema_id`: Semantic archetype ID (e.g. `syllogism-either-or-possibility`, `linear-seating-definite-anchor`).
  - `problem_family`: Sub-domain / family (e.g. `Logical Deduction::Syllogisms`, `Analytical Reasoning::Puzzles`, `Verbal::CriticalReasoning`).
  - `problem_type`: Problem name in Hindi + English parentheses `( )`.
- **Constraint Model & Deep Structure (`deep_structure`)**: The formal logical constraint system (e.g. $\text{Statements}(A \implies B), \text{Venn}(A \subseteq B), \text{Complementary Pair}(\text{Some } X \oplus \text{No } X)$ or $\text{Linear Track}(8 \text{ seats}), \text{Definite Anchor}(E_4), \text{Conditional}(A = B \pm 2)$).
- **Recognition Signals (`recognition_signals`)**: Non-empty array of structural keywords (e.g. "Only a few", "Either-Or", "North-facing row", "Blood relation operators $+ - \times \div$").
- **Representation (`representation`)**: Diagrammatic/symbolic tool:
  - `न्यूनतम अधिव्यापन वेन आरेख (Minimal Overlap Venn Diagram)` for Syllogisms
  - `रैखिक / वृत्ताकार बैठने की व्यवस्था ट्रैक (Linear / Circular Seating Track Grid)` for Arrangements
  - `2D मैट्रिक्स मिलान ग्रिड (2D Matrix Matching Table)` for Multi-variable Puzzles
  - `वंश-वृक्ष पदानुक्रम प्रतीक (Family Tree Generational Hierarchy Symbols)` for Blood Relations
- **Governing Method (`governing_method`)**:
  - `standard_algorithm`: Non-empty array of step strings following the 7-Layer Thinking Flow:
    1. *Pattern Recognition*: Identify archetype & deep structure
    2. *Representation Setup*: Build optimal diagram/grid
    3. *Constraint Extraction*: Separate Definite, Conditional, & Negative constraints
    4. *Anchor Placement*: Place definite anchor to minimize branching
    5. *Case Splitting & Stepwise Deduction*: Branch into Case 1 / Case 2 and eliminate contradictions
    6. *Trap & Boundary Check*: Verify against converse fallacies & negative rules
    7. *Conclusion & Consistency*: Formulate verified answer
  - `shortcut_or_alternative`: Accelerated elimination methods (e.g. 100-50 analytical method for Syllogisms, direct parity check for linear ends).
- **Decision Points & Decision Trees**: Branching logic for anchor selection, case splitting, and immediate contradiction elimination.
- **Common Examiner Traps (`common_traps`)**: Non-empty array of logical fallacies (Converse fallacy, All+No false either-or, directional inversion left/right, assuming unspecified gender).
- **Verification Rules (`verification_rules`)**: Logical consistency checks (e.g. All positive statements $\implies$ No definite negative conclusion; every entity placed exactly once).
- **Difficulty Model**:
  - `difficulty`: Valid enum (`Easy`, `Medium`, `Difficult`, `Easy-Medium`, `Medium-Difficult`, `E`, `M`, `D`, `E/M`, `M/D`).
  - `difficulty_dimensions`: Object containing `conceptual`, `computational`, and `trap_density`.
- **Variation Opportunities (`variation_opportunities`)**: Structural variation dimensions:
  - *Constraint density variation* (sparse anchors vs highly constrained)
  - *Structure variation* (linear row $\rightarrow$ parallel rows $\rightarrow$ circular facing inward/outward)
  - *Distractor traps* (superfluous negative constraints)
  - *Branching factor* (single path vs 3-way case splitting)
- **Transfer Opportunities (`transfer_opportunities`)**: Cross-domain applications (e.g. Syllogisms to Statement & Assumption, Matrix matching to Data Sufficiency).
- **Error Intelligence (`error_categories`)**: Linked categories from the 14-Category Reasoning Error Log.
- **Prerequisites (`prerequisites`)**: Explicit logical prerequisites (e.g. Set Theory basics, Direction sense).
- **PYQ References (`pyq_references`)**: Structured array of actual exam questions (`exam`, `year`, `shift`, `question_number`, `source`).

### F. Method Selection & Decision Trees
Format decision trees explicitly in Markdown and populate `decision_trees` array in JSON:
```text
IF [Definite anchor available]      ──► Start with direct linear/circular anchor placement
IF [Only conditional statements]     ──► Convert to symbolic implication chain (A ──► B ──► C)
IF [Multiple variable overlap]       ──► Build 2D matrix matching table
IF [Either-Or complementary pair]   ──► Verify 3 conditions: (1) Both Indiv False, (2) Same Sub-Pred, (3) Valid Pair
```

### G. 14-Category Reasoning Error Log & Adaptive Remediation Routing
Populate `error_log_taxonomy` array in JSON and link pattern errors:
1. *Rule Recall Error* $\rightarrow$ Remediate with Deduction Rule Flashcard.
2. *Pattern Misrecognition* $\rightarrow$ Remediate with Interleaved Problem Classifier Drill.
3. *Representation Error* $\rightarrow$ Remediate with Diagram Construction Stepwise Example.
4. *Constraint Extraction Miss* $\rightarrow$ Remediate with Constraint Checklist Scaffold.
5. *Anchor Selection Error* $\rightarrow$ Remediate with Anchor Priority Strategy Drill.
6. *Case Splitting Failure* $\rightarrow$ Remediate with Case-Splitting Branching Example.
7. *Converse / Inverse Fallacy* $\rightarrow$ Remediate with Fallacy Deconstruction Drill.
8. *False Assumption Error* $\rightarrow$ Remediate with Critical Premise Analysis.
9. *Sign / Direction Confusion* $\rightarrow$ Remediate with Inward/Outward Direction Drill.
10. *Option Elimination Error* $\rightarrow$ Remediate with Distractor Elimination Drill.
11. *Time Pressure / Speed Panic* $\rightarrow$ Remediate with Timed Puzzle Section.
12. *Trap Falling* $\rightarrow$ Remediate with Trap Spotting Drill.
13. *Verification Omission* $\rightarrow$ Remediate with Consistency Check Step.
14. *Notational Misinterpretation* $\rightarrow$ Remediate with Symbol Notation Glossary.

---

## 7. Subject-Specific Output Extensions

---

## 8. Subject Domain Audit

In addition to Core technical validation, perform Reasoning Domain Audit:
1. **Constraint Completeness**: Are all constraint types (Definite, Conditional, Negative) addressed in problem pattern setups?
2. **Representation Accuracy**: Are visual/symbolic tools correctly specified for each problem archetype?
3. **Puzzle Exclusion from Anki**: Are standard flashcards 100% free of multi-step puzzle solutions?
4. **Trap Representation**: Are common logical fallacies and examiner traps explicitly covered?

---

## 9. PYQ & External Mode Interpretation

In `SOURCE_PLUS_PYQ` mode:
- PYQs identify high-frequency puzzle archetypes and examiner trap trends.
- PYQ analysis enriches `[Chapter]_ProblemPatterns.md` under `Examiner Traps & Testability`.
- PYQs MUST NOT alter static logical definitions or deduction theorems in `[Chapter]_Notes.md`.

---

## 10. Exceptions & Special Cases

Structure reasoning exceptions and boundary cases explicitly:
`STANDARD LOGICAL RULE → EXPECTED INFERENCE → BOUNDARY EXCEPTION → REASON → CORRECT DEDUCTION`  
*(Example: "Some A are B" $\implies$ Standard: At least one A is B $\rightarrow$ Boundary Exception: "Some" includes the possibility of "All" $\rightarrow$ Reason: Inclusive logic in Syllogisms).*

---

## 11. Visual Map Architecture

### A. Natural Map Types & Knowledge Structures
- **Problem Pattern Topology & Method Selection**: Problem Pattern $\rightarrow$ Cue $\rightarrow$ Deductive Path $\rightarrow$ **Pattern / Decision Map**.
- **Constraint Processing Paths**: Case 1 vs Case 2 Elimination $\rightarrow$ **Decision Tree Map**.
- **Logical System & Syllogism Rules**: Statement Type $\rightarrow$ Valid Inferences $\rightarrow$ **Concept / Logic Map**.

### B. Structures Prohibited from Ordinary Radial Maps
- ❌ **Complete Solved Puzzle Grids / Seating Solutions**: NEVER put full puzzle grids, matrix solutions, or seating arrangements in map nodes.
- ❌ **Linear Narrative Step-by-Step Deductions**: Map decision trees and elimination branches, not raw scratchwork.

### C. Subject-Specific Semantics
- **Node Semantics**: Puzzle type, constraint rule, elimination cue in Hindi + English parentheses `( )` (2–6 words).
- **Edge Semantics**: `eliminates` (निरस्त करता है), `implies` (का अर्थ है), `branches to` (की ओर जाता है), `requires` (की आवश्यकता है).

### D. Reasoning Failure Modes to Avoid
- Attempting to put complete seating arrangement or floor puzzle solutions inside diagram nodes.
- Forcing branching decision trees into flat radial trees.

---

## 12. Subject-Specific Visual Learning Grammar

```yaml
visual_learning_grammar:
  dominant_structures:
    - relationships
    - state transitions
    - constraints
    - spatial logic
    - procedural reasoning
  preferred_visual_forms:
    - matrices
    - decision trees
    - visual transformations
    - relationship graphs
    - stepwise solving diagrams
  preferred_narrative_modes:
    - constraint extraction to case splitting
    - elimination pathway
    - visual logic setup
    - fallacy deconstruction
  high_value_visual_opportunities:
    - Venn diagram intersection, union, and disjoint state spaces for Syllogisms
    - family tree generational hierarchy networks with gender/relation symbols
    - 2D matrix grids for multi-variable constraint matching puzzles
    - linear and circular seating arrangement anchoring setups with directional arrows
    - decision trees illustrating case splitting and immediate contradiction elimination
  visual_anti_patterns:
    - raw multi-paragraph puzzle statements without structured constraint grids
    - unorganized trial-and-error scratchpads filling slides
    - text-only logical deduction steps without visual or matrix scaffolding
    - complex puzzle solutions displayed in one static view without step progression
```

### Domain Visual Reasoning
- **Constraint Representation**: Map definite anchors first, followed by conditional branches and negative constraints.
- **Elimination Clarity**: Visually distinguish valid deduction branches from eliminated contradictions.
- **Symbolic Economy**: Use standardized concise symbols for relations, directions, and set boundaries.

---

## Multimodal Execution Triggers
- **Visual Inspection Rule**: Inspect diagrams and examples natively when logical structure matters. Do NOT use OCR if native multimodal understanding is sufficient. Do not inspect every image automatically.
