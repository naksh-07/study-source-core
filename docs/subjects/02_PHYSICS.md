# Subject Pedagogical Blueprint: Physics (`02_PHYSICS.md`)

**Domain**: Physics (`physics-study`)  
**Cognitive Archetype**: Mathematical-Conceptual Physical Modeling & Numerical Problem-Solving  
**Status**: AUTHORITATIVE MINIMALIST SPECIFICATION (Ponytail Standard & ADR-25)  

---

## 1. Epistemological DNA & Cognitive Profile

- **Dual Nature**: Physics is neither pure mathematics nor pure declarative science. It bridges physical intuition (laws of nature, vectors, symmetry) with quantitative derivation.
- **Cognitive Failure Mode**: Students either memorize formulas without understanding coordinate assumptions (e.g., using $N = mg$ on an incline instead of $mg\cos\theta$), or spend hours writing colorful theory notes without drawing Free Body Diagrams (FBDs).
- **Pedagogical Requirement**: The **6-Stage Calculational Pipeline**:
  `FBD / Visual Setup → Coordinate System → Governing Physical Law → Algebraic Resolution → SI Units Check → Boundary Sanity Check`.

---

## 2. "Ginti Ki Cheezein" (The 3 Essential High-Yield Weapons)

### Weapon 1: 6-Stage Calculational Question Bank (`Questions/<Chapter>_Questions.md`) [PRIMARY]
- **Role**: Desk deliberate practice engine (solving problems on paper).
- **Structure**:
  - Organized by physical problem family (e.g. *Incline plane with friction*, *Pulley-block systems*, *Impulse & restitution*).
  - Authentic MCQs with misconception distractors (e.g. sign inversion on rebound, missing component of gravity).
  - **Default-Collapsed 3-Tier Hints (`> [!tip]- संकेत`)**:
    - *Tier 1 (FBD & Law)*: Identifies the relevant physical principle (e.g., *Conservation of Momentum applies because net external horizontal force is zero*).
    - *Tier 2 (Equations & Coordinate Form)*: Sets up the vector equations along chosen axes.
    - *Tier 3 (Boundary Substitution)*: Resolves constraints, leaving final algebra to student.
  - **Default-Collapsed Solution DAG (`> [!success]- उत्तर एवं विस्तृत हल`)**:
    - Step-by-step resolution with explicit dimensional verification and physical sanity check (e.g. verifying $v \le c$ or $\mu \ge 0$).

### Weapon 2: Formula, Unit & Trap Anki Deck (`[Chapter]_Anki.apkg`) [MAINTENANCE]
- **Role**: Fast active retrieval (5–10 seconds per card) to keep physical grammar automated in working memory.
- **Content**:
  - Core equations ($v^2 = u^2 + 2as$, $F = dp/dt$, $K = \frac{1}{2}I\omega^2$).
  - SI unit conversions and dimensional formulas ($1\text{ N} = 10^5\text{ dyne}$, $[h] = [M L^2 T^{-1}]$).
  - Vector direction rules (Right-Hand Rule, Lenz's Law polarity).
  - Limiting behavior sanity checks (e.g., *"In an RL circuit at $t = \infty$, the inductor acts as a: {{c1::Short circuit}}"*).
  - **Zero Scratchpad Rule**: Strictly 0 multi-step calculational numericals.

### Weapon 3: FBD & Model Reference Notes (`Notes/<Chapter>_Notes.md`) [REFERENCE ONLY]
- **Role**: Looked at ONLY when a practice problem is failed.
- **Content**:
  - Clean FBD drawing rules and coordinate axis alignment conventions.
  - Examiner Misconception Callouts (e.g. *"Action-reaction pairs act on two DIFFERENT bodies and never cancel each other"*).

---

## 3. Strictly Banned Anti-Patterns (Bloat Elimination)

1. ❌ **Physics Numericals on Anki Flashcards**: Forcing a student to solve a 5-step projectile problem on an Anki card ruins review cadence and leads to deck abandonment.
2. ❌ **Passive Theory Rewriting**: Copying textbooks or writing 50-page notes on mechanics without doing problems.
3. ❌ **Slide Decks for Self-Study**: Pacing through Marp slides adds zero quantitative problem-solving skill.
4. ❌ **MindMaps as Primary Learning**: Knowing that "Work-Energy" connects to "Conservation Laws" does not teach you how to set up the work-energy integral.

---

## 4. The 24-Hour Daily Student Flow for Physics

```text
[Step 1: Lecture / Concept (60 Mins)]
  └── Understand the physical law, FBD setup, and vector components.

[Step 2: Note Recon (5 Mins)]
  └── Skim `Notes/<Chapter>_Notes.md` for coordinate conventions and high-yield traps.

[Step 3: Deliberate Problem Solving (60-90 Mins) [THE REAL EXAM BUILDER]]
  └── Open `Questions/<Chapter>_Questions.md` in Obsidian.
  └── Draw FBD on physical paper, choose coordinate axes, apply physical law.
  └── Use Hint 1 (`[!tip]-`) only if stuck on which law to apply.
  └── Unfold Solution (`[!success]-`) after solving to check sanity and units.

[Step 4: Anki Daily Habit (10-15 Mins - Mobile Phone)]
  └── Swipe 25-30 atomic formula, SI unit, and sign convention cards. No scratchpad.
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
