# Subject Pedagogical Blueprint: Chemistry (`03_CHEMISTRY.md`)

**Domain**: Chemistry (`chemistry-study`)  
**Cognitive Archetype**: Tri-Bifurcated (Physical Calculational / Inorganic Factual / Organic Mechanistic)  
**Status**: AUTHORITATIVE MINIMALIST SPECIFICATION (Ponytail Standard & ADR-25)  

---

## 1. Epistemological DNA & The Tri-Domain Architecture

Chemistry cannot be treated as a single uniform subject. It is divided into three distinct epistemological disciplines:

1. **Physical Chemistry (Quantitative / Calculational)**:
   - High element interactivity (Equilibrium ICE tables, pH calculations, Nernst equations, Arrhenius rate laws, Thermodynamics).
   - *Requirement*: Identical to Physics—faded worked examples and deliberate practice on paper via Question Banks.
2. **Inorganic Chemistry (Declarative / Factual Retrieval)**:
   - Low element interactivity (Periodic trends, anomalous behavior of second-period elements, metallurgy ores, coordination isomers, flame/salt test colors).
   - *Requirement*: High-density active recall through Spaced Repetition (Anki Cloze & Basic cards). Testing effect ($d \ge 0.70$) prevents forgetting.
3. **Organic Chemistry (Mechanistic / Transformation Networks)**:
   - Spatial and mechanistic ($S_N1$ vs $S_N2$, nucleophile strength, electrophilic aromatic substitution, Markovnikov additions).
   - *Requirement*: Reagent-Function master tables, Reaction Roadmaps in Notes, and Mechanism-discriminating practice questions.

---

## 2. "Ginti Ki Cheezein" by Chemistry Sub-Branch

### A. For Physical Chemistry Chapters (e.g. *Chemical-Equilibrium*, *Electrochemistry*, *Thermodynamics*)
1. **Obsidian Question Bank (`Questions/<Chapter>_Questions.md`) [PRIMARY]**:
   - ICE (Initial, Change, Equilibrium) table calculation setups.
   - 4-Option MCQs with stoichiometry power distractors (e.g. missing squared concentration $[NO]^2$).
   - Default-collapsed 3-tier hints (`> [!tip]-`) and solution DAGs (`> [!success]-`).
2. **Lean Formula Anki (`[Chapter]_Anki.apkg`)**:
   - Formulas only: $K_p = K_c(RT)^{\Delta n_g}$, $\Delta G^\circ = -RT\ln K$, $E_{cell} = E^\circ - \frac{0.0591}{n}\log Q$.
   - **Zero-Scratchpad Rule**: No calculation cards.

### B. For Inorganic Chemistry Chapters (e.g. *p-Block Elements*, *Coordination Compounds*, *Metallurgy*)
1. **High-Density Spaced Anki Deck (`[Chapter]_Anki.apkg`) [PRIMARY]**:
   - High-yield Cloze cards testing periodic anomalies, bond angle trends, oxidation states, and extraction reagents.
   - Example: *"Among group 15 hydrides, the thermal stability decreases as: {{c1::$NH_3 > PH_3 > AsH_3 > SbH_3 > BiH_3$}}"*
2. **Thematic Summary Notes (`Notes/<Chapter>_Notes.md`)**:
   - Exception tables and periodic trend comparison grids.
   - *Question Bank is SUPPRESSED* with `DESCRIPTIVE_ROTE_NO_CALCULATIONS`.

### C. For Organic Chemistry Chapters (e.g. *Haloalkanes*, *Aldehydes & Ketones*)
1. **Reaction Roadmap Notes (`Notes/<Chapter>_Notes.md`)**:
   - Reagent-Function Master Grid: e.g., $PCC$ (mild oxidation $\to$ aldehyde) vs $KMnO_4$ (strong oxidation $\to$ carboxylic acid).
2. **Mechanistic Question Bank (`Questions/<Chapter>_Questions.md`)**:
   - Multi-step organic syntheses and product prediction under differing reaction conditions.
3. **Reagent Cloze Anki Deck**:
   - Quick recall of reaction names, reagents, and stereochemical outcomes ($S_N2 \implies$ Walden inversion).

---

## 3. Strictly Banned Anti-Patterns (Bloat Elimination)

1. ❌ **Forcing Procedural Question Banks on Inorganic Chemistry**: Generating calculation question banks for mineral ores or flame test colors is meaningless bloat.
2. ❌ **ICE Table Stoichiometry in Anki**: Doing quadratic equilibrium calculations on Anki cards causes severe flashcard fatigue.
3. ❌ **Slide Decks & Complex MindMaps**: Students do not master reaction mechanisms by clicking slides.

---

## 4. The 24-Hour Daily Student Flow for Chemistry

```text
[Morning Anki Sprint (15 Mins - Mobile)]
  └── Physical: Review 15 formula & unit cards.
  └── Inorganic: Review 30 trend, exception, and reagent cards.

[Study Session (60-90 Mins) [SPLIT BY TOPIC]]:
  ├── IF PHYSICAL: Open `Questions.md` in Obsidian; solve equilibrium / pH problems on paper.
  ├── IF INORGANIC: Active recall through NCERT margin queries + Anki. Zero notes rewriting.
  └── IF ORGANIC: Trace reaction roadmaps on paper; practice product prediction in `Questions.md`.
```

---

## 5. Authoritative `runtime-policy.json` Alignment

```json
{
  "notes": true,
  "basic": true,
  "cloze": true,
  "apkg": true,
  "procedural_mode": "markdown",
  "procedural_apkg": false,
  "proceduralApkg": false,
  "proceduralQuestionBank": true,
  "problemPatterns": true,
  "practiceQuestions": true,
  "imageOcclusion": false,
  "mindmap": false,
  "slideDeck": false,
  "bmGraph": true,
  "bmQa": true
}
```
*(Note: When a purely descriptive inorganic chapter is parsed, the engine automatically sets `"proceduralQuestionBank": false` with reason `DESCRIPTIVE_ROTE_NO_CALCULATIONS`).*
