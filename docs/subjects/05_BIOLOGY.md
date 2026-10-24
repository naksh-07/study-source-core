# Subject Pedagogical Blueprint: Biology (`05_BIOLOGY.md`)

**Domain**: Biology (`biology-study`)  
**Cognitive Archetype**: Visual-Spatial Anatomical & High-Density Declarative Terminology  
**Status**: AUTHORITATIVE MINIMALIST SPECIFICATION (Ponytail Standard & ADR-25)  

---

## 1. Epistemological DNA & Cognitive Profile

- **Dual Coding & Spatial Architecture**: Biology is heavily anchored in visual morphology (organs, cells, physiological pathways, plant anatomy) and taxonomic terminology.
- **The Split-Attention Trap (Sweller & Mayer)**: Describing an anatomical diagram using text paragraphs forces students to constantly translate words into mental pictures, creating severe extraneous load ($d = 0.79$).
- **The Testing Effect Powerhouse (Dunlosky / Roediger)**: Biological facts (scientific names, enzyme functions, hormone origins) have low element interactivity. They are the single most responsive knowledge type to Spaced Retrieval Practice ($d \ge 0.70$).
- **Pedagogical Requirement**: Pair **Image Occlusion** (direct spatial retrieval) with **High-Density Atomic Cloze Deletions**.

---

## 2. "Ginti Ki Cheezein" (The 2 Essential High-Yield Weapons)

### Weapon 1: Native Anki Image Occlusion (`[Chapter]_Anki.apkg` via `ImageOcclusion/`) [PRIMARY VISUAL]
- **Role**: Visual-spatial memory encoding and diagram retrieval.
- **Content**:
  - Anatomical structures (Nephron countercurrent system, human heart valves, neuron synapse).
  - Cell organelles and histological cross-sections.
  - Physiological pathway flows (Krebs cycle intermediates, Calvin cycle, Menstrual hormone peaks).
- **Mechanism**: High-resolution SVG masks covering labels directly on the visual substrate. The student retrieves the anatomical landmark without verbal crutches.

### Weapon 2: High-Density Spaced Anki Deck (`[Chapter]_Anki.apkg` - Cloze/Basic) [PRIMARY MEMORY]
- **Role**: Long-term retention of 3,000+ biological facts over a 1–2 year exam cycle.
- **Content**:
  - NCERT line-by-line active recall cloze cards.
  - Binomial nomenclature, organelle functions, enzyme-substrate pairs, hormone sources and targets.
  - Examples:
    - *"The structural and functional unit of the human kidney is the {{c1::nephron}}."*
    - *"Insulin is secreted by the {{c1::$\beta$-cells}} of the Islets of Langerhans in the pancreas."*
  - Fast review speed: **3–7 seconds per card**.

### Weapon 3: High-Yield Comparative Notes (`Notes/<Chapter>_Notes.md`) [REFERENCE ANCHOR]
- **Content**:
  - Strictly comparative tables (Mitosis vs Meiosis, Prokaryotic vs Eukaryotic cells, Xylem vs Phloem, C3 vs C4 plants).
  - Biological Exceptions and Examiner Traps.
  - Zero fluffy narrative essays.

---

## 3. Strictly Banned Anti-Patterns (Bloat Elimination)

1. ❌ **Procedural Calculational Question Banks (STRICTLY BANNED)**: Biology does not have mathematical equations or multi-step derivations (except trivial Mendelian ratios). Generating 30-step calculational problem banks for Biology is 100% bloat (`NON_PROCEDURAL_DOMAIN`).
2. ❌ **Text Cards for Spatial Diagrams**: Asking *"What is located below the left atrium?"* on a plain text flashcard triggers split-attention and weak recall. Use Image Occlusion.
3. ❌ **Rewriting Textbooks into Notes**: Biology students who write 400-page summary notes suffer from the Collector's Fallacy and experience massive revision paralysis before exams.

---

## 4. The 24-Hour Daily Student Flow for Biology

```text
[Step 1: Classroom / Textbook Reading (45-60 Mins)]
  └── Read standard textbook (e.g. NCERT) with focus on diagrams and bold terms.

[Step 2: Note Reference (10 Mins)]
  └── Review comparative tables in `Notes/<Chapter>_Notes.md` (e.g., DNA vs RNA).

[Step 3: The Primary Engine — Daily Anki Review (20-30 Mins) [90% OF RETENTION]]
  └── Open Anki on phone or desktop.
  └── Swipe 50-70 flashcards (Image Occlusion diagrams + atomic cloze cards).
  └── Fast pace: ~5 seconds per card. 60 cards completed in 5-6 minutes!
```

---

## 5. Authoritative `runtime-policy.json` Alignment

```json
{
  "notes": true,
  "basic": true,
  "cloze": true,
  "apkg": true,
  "procedural_mode": "none",
  "procedural_apkg": false,
  "proceduralApkg": false,
  "proceduralQuestionBank": false,
  "problemPatterns": false,
  "practiceQuestions": false,
  "imageOcclusion": true,
  "mindmap": false,
  "slideDeck": false,
  "bmGraph": true,
  "bmQa": true
}
```
*(Notice: `proceduralQuestionBank` is strictly `false`, while `imageOcclusion`, `basic`, and `cloze` are the core champions).*
