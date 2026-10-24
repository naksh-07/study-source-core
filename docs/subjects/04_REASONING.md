# Subject Pedagogical Blueprint: Reasoning (`04_REASONING.md`)

**Domain**: Reasoning (`reasoning-study`)  
**Cognitive Archetype**: Formal Deductive Logic, Constraint Satisfaction & Elimination Algorithms  
**Status**: AUTHORITATIVE MINIMALIST SPECIFICATION (Ponytail Standard & ADR-25)  

---

## 1. Epistemological DNA & Cognitive Profile

- **Rule-Execution Domain**: Formal reasoning (Syllogisms, Seating Arrangements, Coding-Decoding, Blood Relations, Direction Tests) is an **algorithmic constraint-resolution discipline**, not a factual recall domain.
- **Surface Feature Trap (Chi et al., 1981)**: Novices look at who is sitting next to whom (surface entities). Experts look at **Constraint Typologies** (Fixed Anchor vs Relative Shift vs Negative Boundary Condition).
- **Zero Transfer of Memorization**: Memorizing the final seating order of an 8-person puzzle or the conclusion of a specific syllogism gives **0% transfer** (Thorndike & Woodworth, 1901). Change one condition, and the entire deduction shifts.
- **Pedagogical Requirement**: The learner must automate **Condition-Action production rules** (Anderson ACT-R):
  `Identify Problem Family → Classify Constraints → Fix Independent Anchor → Filter Possibilities → Eliminate Contradictions`.

---

## 2. "Ginti Ki Cheezein" (The 2 Essential High-Yield Weapons)

### Weapon 1: Deductive Question Bank (`Questions/<Chapter>_Questions.md`) [PRIMARY]
- **Role**: Desk practice engine (solving puzzles on paper).
- **Structure**:
  - Organized by reasoning pattern families (e.g., *Pattern 1: Two-Premise Categorical Syllogisms*, *Pattern 2: Possibility Cases & "Either-Or" Traps*, *Pattern 3: Circular Seating Facing Inward/Outward*).
  - 4-Option MCQs with genuine logical fallacy distractors (e.g., Undistributed Middle, False Converse).
  - **Default-Collapsed 3-Tier Hints (`> [!tip]- संकेत`)**:
    - *Tier 1 (Constraint Identification)*: Identifies the fixed anchor (e.g. *"Start by placing person X at the north position as they have a definite constraint"*).
    - *Tier 2 (Elimination Strategy)*: Outlines the 2 mutually exclusive branching cases.
    - *Tier 3 (Contradiction Elimination)*: Reveals which case violates the negative constraint.
  - **Default-Collapsed Solution DAG (`> [!success]- उत्तर एवं विस्तृत हल`)**:
    - Full step-by-step deduction tree showing valid Venn diagrams or completed seating matrices.

### Weapon 2: Notation, Rule & Fallacy Anki Deck (`[Chapter]_Anki.apkg`) [MAINTENANCE]
- **Role**: Fast active recall (5–8 seconds per card) of formal logic rules.
- **Content**:
  - Categorical proposition rules:
    - Form $A$: Universal Affirmative ("All S are P") $\implies$ Subject distributed, Predicate undistributed.
    - Form $E$: Universal Negative ("No S is P") $\implies$ Both distributed.
    - Form $I$: Particular Affirmative ("Some S are P") $\implies$ Neither distributed.
    - Form $O$: Particular Negative ("Some S are not P") $\implies$ Predicate distributed.
  - "Either-Or" Complimentary Pair Conditions:
    - 1. Both conclusions must be doubtful independently.
    - 2. One positive ($A$ or $I$) and one negative ($E$ or $O$).
    - 3. Same subject and predicate elements.
    - 4. Note: $A + E$ never forms an Either-Or pair!
  - Blood relation gender/generation symbols and directional degree shifts ($90^\circ$ clockwise, $180^\circ$ inversion).
  - **Zero Scratchpad Rule**: Strictly 0 multi-person seating arrangements on flashcards.

---

## 3. Strictly Banned Anti-Patterns (Bloat Elimination)

1. ❌ **Full Logic Puzzles in Anki**: Attempting to solve an 8-person floor puzzle inside a flashcard review is an anti-pattern that leads to immediate deck abandonment.
2. ❌ **Essay-Length Narrative Notes**: Logic cannot be explained in prose. Notes are strictly tabular constraint mapping grids.
3. ❌ **Slide Decks & Complex MindMaps**: Flipping through slides builds zero deductive reasoning stamina.

---

## 4. The 24-Hour Daily Student Flow for Reasoning

```text
[Step 1: Concept / Rule Intake (30 Mins)]
  └── Understand Venn distribution rules or tabular grid setup.

[Step 2: Anki Habit (5-10 Mins)]
  └── Swipe 15 rule cards (Either-Or conditions, proposition types).

[Step 3: Deliberate Puzzle Solving (60 Mins) [THE MAIN EVENT]]
  └── Open `Questions/<Chapter>_Questions.md` in Obsidian.
  └── Pen + Paper: Draw Venn diagrams or grid tables.
  └── Time yourself (1.5 to 2 minutes per puzzle).
  └── Use Hint 1 only if unable to find the starting anchor.
  └── Unfold Solution DAG to verify contradiction elimination.
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
