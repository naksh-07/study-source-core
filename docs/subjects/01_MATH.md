# Subject Pedagogical Blueprint: Mathematics (`01_MATH.md`)

**Domain**: Mathematics (`math-study`)  
**Cognitive Archetype**: Pure Quantitative & Multi-Step Procedural STEM  
**Status**: AUTHORITATIVE MINIMALIST SPECIFICATION (Ponytail Standard & ADR-25)  

---

## 1. Epistemological DNA & Cognitive Profile

- **High Element Interactivity**: Mathematics problems possess complex, interacting variables where altering a single condition or boundary value cascades through the entire derivation.
- **Cognitive Failure Mode**: Attempting to memorize math via passive reading or flashcards induces a severe **"Illusion of Competence"**. Students memorize the superficial symbols or numbers of a specific problem, but freeze on unseen test problems with altered parameters.
- **Pedagogical Requirement**: Schema acquisition via **Variation Theory** and **Backward-Faded Scaffolding** (Renkl & Atkinson). Novices require structured worked examples with faded steps, leading to deliberate practice on paper.

---

## 2. "Ginti Ki Cheezein" (The 2 Essential High-Yield Weapons)

For Mathematics, StudySourceCore generates strictly **two primary deliverables**:

### Weapon 1: Obsidian Question Bank (`Questions/<Chapter>_Questions.md`) [PRIMARY]
- **Role**: Deliberate practice desk engine (pen & paper problem solving).
- **Structure**:
  - Organized by **Canonical Problem Families / Patterns** (e.g., *Pattern 1: General Term $a_n$*, *Pattern 2: Sum $S_n$*, *Pattern 3: Ratio of Sums*).
  - Authentic exam-style 4-option MCQs featuring real student misconception distractors (e.g., off-by-one index traps $n$ vs $n-1$).
  - **Default-Collapsed 3-Tier Hints (`> [!tip]- संकेत`)**:
    - *Tier 1 (Approach / Law)*: Identifies the governing theorem or substitution rule without calculation.
    - *Tier 2 (Formula / Strategy)*: Provides the relevant algebraic relation.
    - *Tier 3 (Setup)*: Substitutes known values, leaving only final computation to the student.
  - **Default-Collapsed Full Solution DAG (`> [!success]- उत्तर एवं विस्तृत हल`)**:
    - Complete, numbered step-by-step derivation with verification sanity checks.
- **Ergonomics**: 100% anti-spoiler in Obsidian reading mode. Zero answer leakage until intentionally unfolded.

### Weapon 2: Lean Formula Anki Deck (`[Chapter]_Anki.apkg`) [MAINTENANCE]
- **Role**: Fast active reflex recall (5–10 seconds per card) during daily commute or morning review.
- **Content**:
  - Pure atomic formulas ($a_n = a + (n-1)d$, $S_n = \frac{n}{2}[2a + (n-1)d]$).
  - Domain and existence conditions (e.g., common difference $d \ne 0$; matrix invertibility $\det(A) \ne 0$).
  - Standard mathematical values and trigonometric identities.
  - **Zero Scratchpad Rule**: Strictly 0 multi-step algebra.

---

## 3. Strictly Banned Anti-Patterns (Bloat Elimination)

1. ❌ **Scratchpad Math in Anki (STRICTLY BANNED)**: Never place a multi-step calculation or derivation on a flashcard. Doing so creates memory leeches, 45-minute review sessions, and causes students to abandon Anki.
2. ❌ **Long Prose Narrative Notes**: Math cannot be learned through prose essay paragraphs. Theory notes are restricted to a 1–2 page formula and theorem summary.
3. ❌ **MindMaps as Primary Study Material**: Visual concept trees give an illusion of mastery (Karpicke & Blunt, 2011) but build zero problem-solving ability.
4. ❌ **Slide Decks for Solitary Learners**: Solitary learners do not study by flipping slides.

---

## 4. The 24-Hour Daily Student Flow for Mathematics

```text
[Step 1: Classroom / Video Lecture (60-90 Mins)]
  └── Grasp core mathematical intuition, geometric meaning, and teacher derivations.

[Step 2: Quick Formula Recon (5-10 Mins)]
  └── Glance at `Notes/<Chapter>_Notes.md` formula box for master definitions.

[Step 3: The Heavy Lifting — Deliberate Practice (60-90 Mins) [90% OF GAIN]]
  └── Open `Questions/<Chapter>_Questions.md` in Obsidian.
  └── Solve questions on a physical paper scratchpad.
  └── If stuck: Click `> [!tip]- संकेत` (Hint 1 / Concept).
  └── If still stuck: Hint 2 (Formula).
  └── After attempting: Click `> [!success]- हल` to verify steps.

[Step 4: Daily Anki Maintenance (10 Mins - Phone)]
  └── Swipe 20-30 atomic formula cards. Zero paper, zero scratchpad.
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
*(Notice: `mindmap` and `slideDeck` are cleanly disabled to protect the student from overengineering).*
