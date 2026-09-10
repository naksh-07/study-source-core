---
name: biology-study
description: Subject-specific Biology layer for study-source-core. Defines Biological knowledge architecture (15 Domain DNA types, 10 hybrid layers), Structure -> Function -> Process -> Regulation models, sub-domain frameworks (Cell, Physiology, Genetics, Ecology, Biotech), diagram/label architecture, conditional performance outputs, and domain audit checks.
---

# Biology Subject Skill (`biology-study`)

## 1. Subject Mission & Core Inheritance

`biology-study` is the specialized Biology domain layer for `study-source-core`.

This Skill inherits all universal rules, source boundary policy, source execution modes (`SOURCE_ONLY` default), Plan/Approval workflow (Mode A $\rightarrow$ Mode B), conditional artifact policy (evaluating Notes, Basic, Cloze), Basic/Cloze TSV file separation, tool-agnostic principles, and Core technical validation from `study-source-core`.

This document defines ONLY the subject-specific knowledge architecture, memory selection logic, performance architecture, domain audit rules, and conditional output contracts for Biology.

### Primary Objective
Biology is **NOT** a raw dump of disconnected facts. It is a multi-dimensional discipline built on structure, function, process, causation, classification, and system relationships:  
`Understand Structure → Identify Function → Trace Process → Understand Cause/Effect → Connect Systems → Distinguish Similar Concepts → Retrieve High-Value Facts → Apply Knowledge to New Questions`

> *This skill inherits all core policies, StudyLab invariants, 3-tier hints, options contracts, error taxonomies, and universal language contracts directly from `study-source-core`. Do not duplicate core definitions here.*

---

## 2. Biology Knowledge Architecture (15 Domain DNA Types & 10 Layers)

### A. The 10 Hybrid Knowledge Layers
1. **FACTUAL MEMORY (Anki)**: Definitions, organelle functions, hormone sources/targets, scientist contributions, diseases, taxonomic names.
2. **STRUCTURAL KNOWLEDGE (Notes & Diagrams)**: Cellular, tissue, organ, and molecular architecture.
3. **PROCESS / SEQUENCE KNOWLEDGE (Notes & Cloze Anki)**: Multi-step pathways (Glycolysis, Reflex Arc, Cell Cycle, Nitrogen Cycle).
4. **MECHANISTIC / CAUSAL KNOWLEDGE (Notes)**: Enzyme action, active transport, muscle contraction, nerve impulse transmission.
5. **CLASSIFICATION KNOWLEDGE (Notes & Anki)**: Taxonomy, kingdoms, plant/animal groups, biomolecules, cell types.
6. **COMPARATIVE KNOWLEDGE (Notes & Comparative Anki)**: Paired distinctions (Prokaryote vs Eukaryote, Mitosis vs Meiosis, Xylem vs Phloem, DNA vs RNA).
7. **SYSTEM RELATIONSHIPS (Notes)**: Inter-organ interactions, circulatory-respiratory integration, neuro-endocrine control.
8. **DIAGRAM / VISUAL KNOWLEDGE (Notes & Anki Labels)**: Anatomical, cellular, and pathway schematics.
9. **EXCEPTION KNOWLEDGE (Notes & Anki)**: Biological exceptions, non-standard structures, unique adaptations.
10. **APPLICATION / QUESTION PATTERNS (Problem Patterns)**: Genetics crosses, pedigree analysis, ecological calculations, experimental interpretation.

### B. The 15 Domain DNA Knowledge Types
1. **Definition** | 2. **Structure** | 3. **Function** | 4. **Classification** | 5. **Sequence / Process** | 6. **Mechanism** | 7. **Cause $\rightarrow$ Effect** | 8. **Comparison** | 9. **Relationship** | 10. **Regulation / Feedback** | 11. **Diagram / Label** | 12. **Numerical / Data** | 13. **Experimental / Methodological** | 14. **Exception** | 15. **Application**.

---

## 3. Core Biology Transformations & Sub-Domain Models

### A. Core Transformations
- **Structure-to-Function**: `STRUCTURE → LOCATION → FEATURE → FUNCTION → ADVANTAGE / CONSEQUENCE`
- **Biological Process**: `INPUT → SIGNAL / TRIGGER → SITE / STRUCTURE → MECHANISM → STEPS → OUTPUT → REGULATION`
- **Homeostasis & Feedback**: `STIMULUS / CHANGE → SENSOR → CONTROL CENTER → EFFECTOR → RESPONSE → FEEDBACK`

### B. Sub-Domain Frameworks
- **Cell Biology**: Organelles, transport ($\text{Na}^+/\text{K}^+$ pump), Cell Cycle (Mitosis vs Meiosis, Prophase I crossing over).
- **Biomolecules & Enzymes**: Carbohydrates, Proteins, Lipids, Nucleic Acids, Enzyme factors (Temp, pH, Inhibitors, Cofactors).
- **Metabolism**: Photosynthesis (Light Reactions vs Calvin Cycle) & Respiration (Glycolysis $\to$ Kreb's $\to$ ETC).
- **Plant Physiology**: Xylem vs Phloem transport, Transpiration, Plant Hormones (Auxin, Gibberellin, Cytokinin, ABA, Ethylene).
- **Human Physiology**: Circulatory, Respiratory, Digestive, Excretory (Nephron countercurrent), Nervous (Reflex Arc), Endocrine feedback axes.
- **Reproduction & Genetics**: Gametogenesis, Menstrual Cycle, Mendelian Genetics (3:1, 9:3:3:1), Central Dogma ($\text{DNA} \to \text{RNA} \to \text{Protein}$).
- **Evolution & Ecology**: Natural Selection, Ecological Hierarchy, Food Webs, 10% Energy Pyramid, Nutrient Cycles ($\text{C, N, P}$).

---

## 4. Biology Note Architecture

A Biology note (`[Chapter]_Notes.md`) is a **structural, functional, and relational reference model**:

### Flexible Section Architecture
```markdown
# [Chapter Title] ([जीव विज्ञान अध्याय])

## 1. Chapter Overview & Primary Domain
- Primary domain (Cell Biology / Physiology / Genetics / Ecology / Biotech).
- Governing processes, key systems, and biological significance.

## 2. Core Concepts & Definitions
- Fundamental biological concepts and definitions.

## 3. Structural Architecture & Location Map
- Cellular, tissue, or anatomical structures and spatial locations.

## 4. Structure → Function Matrix
- Detailed breakdown connecting physical features to physiological roles.

## 5. Processes, Pathways & Cycles
- Step-by-step chronological process maps (Inputs, Site, Mechanism, Outputs).

## 6. Systems Integration, Homeostasis & Feedback
- Multi-organ interactions, negative/positive feedback loops, and hormonal control.

## 7. Classifications & Comparative Analysis
- Side-by-side matrices comparing paired structures, processes, or groups.

## 8. Diagrams, Visual Schematics & Label Guide
- Structural diagrams, component labels, and functional callouts.

## 9. Exceptions & Special Adaptations
- Explicit exception callouts (`Rule → Exception → Reason → Consequence`).

## 10. 5-Minute Quick Revision Zone
- Top 10 Facts, Top 10 Functions, Top 5 Processes, and Top 5 Exceptions.
```

---

## 5. Biology Memory Architecture (Anki Selection Rules)

### A. Basic Flashcards (`[Chapter]_Basic.tsv`)
- **Focus**: Atomic direct recall (Mitochondria function, Insulin source, Nephron filtration site, Watson/Crick).

### B. Cloze Flashcards (`[Chapter]_Cloze.tsv`)
- **Focus**: Sequences, pathways, cause-effect relationships (Reflex Arc steps, Photosynthesis sites).

---

## 6. Biology Performance Architecture (Conditional Layer)

When the source contains genetics crosses, pedigree analysis, ecological calculations, or experimental interpretations, generate **`[Chapter]_ProblemPatterns.md`**:

### A. Problem Patterns & Genetic Cross Algorithms
- **Monohybrid / Dihybrid Crosses**: Ratios, Punnett square setups, probability calculations.
- **Pedigree Analysis**: Autosomal Dominant / Recessive, X-linked Dominant / Recessive pattern determination.
- **Ecological Calculations**: Population density, 10% energy transfer rule, growth curves.

### B. 14-Category Biology Error Log
1. *Fact Recall Error* | 2. *Structure Identification Error* | 3. *Function Confusion* | 4. *Process Sequence Error* | 5. *Cause-Effect Error* | 6. *Classification Error* | 7. *Comparison Error* | 8. *Diagram / Label Error* | 9. *Mechanism Error* | 10. *Regulation / Feedback Error* | 11. *Genetics Setup Error* | 12. *Data Interpretation Error* | 13. *Question Interpretation Error* | 14. *Terminology Confusion*.

---

## 7. Subject-Specific Output Extensions

### Runtime Artifact Policy

Artifact eligibility and generation policies for Biology are **100% deterministic** and are defined in the machine-readable `runtime-policy.json` file. The Subject Agent LLM does NOT synthesize or output artifact policies. Core consumes `runtime-policy.json` via the Subject Policy Resolver to determine routing.

---

## 8. Subject Domain Audit

In addition to Core technical validation, perform Biology Domain Audit:
1. **Structure-Function Integrity**: Is every physical structure explicitly linked to its physiological function?
2. **Process Sequence Accuracy**: Are metabolic pathways and physiological stages in exact chronological order?
3. **Regulation & Feedback Mapping**: Are negative/positive feedback loops clearly represented?
4. **Diagram Label Coverage**: Are key anatomical/cellular diagram labels mapped to their functional roles?

---

## 9. PYQ & External Mode Interpretation

In `SOURCE_PLUS_PYQ` mode:
- PYQs identify high-yield organs, processes, examiner traps, and frequently tested NCERT statements.
- PYQ analysis enriches `[Chapter]_ProblemPatterns.md` under `Examiner Traps & High-Yield Focus Areas`.
- PYQs MUST NOT alter static biological structures or physiological definitions in `[Chapter]_Notes.md`.

---

## 10. Exceptions & Biological Anomalies

Structure biological exceptions explicitly:
`STANDARD RULE → EXPECTED BEHAVIOR → BIOLOGICAL EXCEPTION → REASON / ADAPTATION → CONSEQUENCE`  
*(Example: All mammals give birth to live young $\rightarrow$ Exception: Monotremes (Platypus, Echidna) lay eggs $\rightarrow$ Reason: Primitive oviparous mammalian lineage).*

---

## 11. Visual Map Architecture

### A. Natural Map Types & Knowledge Structures
- **Taxonomy & Classification**: Kingdom, Phylum, Class, Order divisions $\rightarrow$ **Hierarchy / Radial Map**.
- **Anatomical Structures**: Organ systems, cellular organelles, tissue arrangements $\rightarrow$ **Spatial / Hierarchical Map**.
- **Ecological & Trophic Structures**: Food webs, energy pyramids, ecosystem components $\rightarrow$ **Concept / Network Map**.

### B. Structures Prohibited from Ordinary Radial Maps
- ❌ **Metabolic Pathways** (Glycolysis, Krebs Cycle): Map as **Process / Flowchart Map**, NEVER as a radial tree.
- ❌ **Physiological Feedback Loops**: Map as **Causal Loop / Concept Map**.
- ❌ **Genetic Crosses / Punnett Ratios**: Keep in **Notes.md / ProblemPatterns.md**, do NOT force into maps.

### C. Subject-Specific Semantics
- **Node Semantics**: Concise structure, organ, or stage names in Hindi with English technical terms in parentheses `( )` (2–5 words).
- **Edge Semantics**: `part of` (का हिस्सा), `contains` (में शामिल है), `causes` (कारण बनता है), `regulates` (नियंत्रित करता है), `inhibits` (संदमित करता है).

### D. Biological Failure Modes to Avoid
- Full physiological textbook descriptions in nodes.
- Forcing sequential biochemical pathways into static radial trees.

---

## 12. Subject-Specific Visual Learning Grammar

```yaml
visual_learning_grammar:
  dominant_structures:
    - anatomy
    - structure/function
    - cellular organization
    - pathways
    - cycles
    - life cycles
    - feedback
  preferred_visual_forms:
    - cutaways
    - labelled diagrams
    - cellular schematics
    - process pathways
    - cycle diagrams
    - before/after biological states
  preferred_narrative_modes:
    - macro-to-micro zoom
    - pathway sequence
    - homeostatic feedback
    - comparative structural contrast
  high_value_visual_opportunities:
    - cell organelle ultrastructure and membrane transport mechanisms
    - metabolic pathways (Glycolysis, Krebs Cycle, Light/Dark photosynthetic reactions)
    - nephron filtration countercurrent multiplier system
    - cardiac cycle and respiratory gas exchange dual-phase flows
    - endocrine negative/positive feedback axes (e.g. Hypothalamus-Pituitary-Target organ)
    - cellular division stages (Mitosis vs Meiosis chromosome alignment)
  visual_anti_patterns:
    - unlabelled anatomical diagrams or decorative non-functional illustrations
    - text-only enzyme cascades lacking directional reaction arrows
    - dense paragraph descriptions of anatomical structures and locations
    - static representations of continuous physiological processes without directional cues
```

### Domain Visual Reasoning
- **Structure-to-Function Grounding**: Every visual anatomical feature must directly indicate its physiological role and evolutionary advantage.
- **Process Continuity**: Represent metabolic pathways and physiological cycles with clear directional flow, inputs, outputs, and regulation gates.
- **Feedback & Control**: Clearly distinguish negative vs positive homeostatic feedback loops using circular closed-loop diagrams.

---

## Multimodal Execution Triggers
- **Visual Inspection Rule**: Inspect diagrams natively when they contain factual biological information. Do NOT use OCR if native multimodal understanding is sufficient. Do not inspect every image automatically.
