# Subject Pedagogical Blueprint: History (`06_HISTORY.md`)

**Domain**: History (`history-study`)  
**Cognitive Archetype**: Chronological, Causal, Event-Actor Networks & Declarative Retrieval  
**Status**: AUTHORITATIVE MINIMALIST SPECIFICATION (Ponytail Standard & ADR-25)  

---

## 1. Epistemological DNA & Cognitive Profile

- **Chronological Anchors**: History is a linear, causal network of socio-political movements, economic policies, wars, treaties, and legal acts.
- **The Date Memorization Trap**: Rote memorization of isolated years without causal understanding produces brittle knowledge that shatters on analytical questions.
- **The Revision Paralysis Trap**: History textbooks (e.g. Bipin Chandra, Spectrum, NCERT) are already dense summaries. Rewriting them into 600-page personal notes leads to guaranteed revision failure.
- **Pedagogical Requirement**:
  1. Spaced Retrieval for atomic dates, treaty clauses, administrative terms, and organizations.
  2. Thematic Chronological Spine in Notes for cause-and-effect understanding.

---

## 2. "Ginti Ki Cheezein" (The 2 Essential High-Yield Weapons)

### Weapon 1: Chronological & Event Cloze Anki Deck (`[Chapter]_Anki.apkg`) [PRIMARY RETENTION]
- **Role**: Fast active recall of historical milestones, treaty terms, and administrative titles.
- **Content**:
  - Sequence and year cloze deletions:
    - *"The Battle of Plassey was fought in the year {{c1::1757}} between Siraj-ud-Daulah and the British East India Company led by {{c2::Robert Clive}}."*
    - *"The Permanent Settlement of Bengal was introduced by {{c1::Lord Cornwallis}} in the year {{c2::1793}}."*
  - Administrative and revenue systems (Mansabdari, Ryotwari, Mahalwari, Iqtadari).
  - Socio-religious reform movements (Founders, journals, and core objectives).
- **Speed**: **5–8 seconds per card**.

### Weapon 2: Thematic Timeline Notes (`Notes/<Chapter>_Notes.md`) [CONCEPTUAL ANCHOR]
- **Structure**:
  - **Chronological Spine Table**: `Year → Event / Act → Key Protagonists → Immediate Consequence`.
  - **Cause & Effect Analytical Grids**: What socioeconomic pressures triggered the revolt/act, and what structural changes resulted.
  - Zero bloated storytelling paragraphs.

---

## 3. Strictly Banned Anti-Patterns (Bloat Elimination)

1. ❌ **Procedural Question Banks (STRICTLY BANNED)**: History has zero calculational formulas or algorithmic step DAGs (`NON_PROCEDURAL_DOMAIN`).
2. ❌ **Essay Questions on Flashcards**: Putting a 200-word essay question on the back of an Anki card violates the Minimum Information Principle. Flashcards must remain atomic.
3. ❌ **Rainbow Mindmaps with 50 Sub-Branches**: Complex visual mindmaps for history become sprawling spiderwebs that are impossible to test actively.

---

## 4. The 24-Hour Daily Student Flow for History

```text
[Step 1: Reading / Lecture (45-60 Mins)]
  └── Understand the causal progression of events (e.g., Non-Cooperation Movement phases).

[Step 2: Timeline Review (10 Mins)]
  └── Inspect the Chronological Spine Table in `Notes/<Chapter>_Notes.md`.

[Step 3: Daily Anki Sprint (15-20 Mins - Mobile Phone)]
  └── Swipe 35-50 event, treaty, date, and reformer cards.
  └── Instant active retrieval lock-in.
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
  "imageOcclusion": false,
  "mindmap": false,
  "slideDeck": false,
  "bmGraph": true,
  "bmQa": true
}
```
