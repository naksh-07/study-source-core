# Subject Pedagogical Blueprint: Political Science / Polity (`07_POLITICAL_SCIENCE.md`)

**Domain**: Political Science (`political-science-study`, registered alias: `Polity`)  
**Cognitive Archetype**: Constitutional Frameworks, Statutory Provisions & Institutional Architectures  
**Status**: AUTHORITATIVE MINIMALIST SPECIFICATION (Ponytail Standard & ADR-25)  

---

## 1. Epistemological DNA & Cognitive Profile

- **Structured Legal Framework**: Polity consists of constitutional articles, statutory bodies, majorities, amendment mechanisms, and landmark Supreme Court doctrines.
- **The "Laxmikanth Trap"**: Toppers universally emphasize: **"Never make notes of Laxmikanth."** Standard textbooks are already compressed. Hand-copying chapters produces massive fatigue without retention.
- **Cognitive Requirement**: High-density spaced retrieval for **Articles, Majorities, Tenures, and Constitutional Quotas**, backed by **Comparative Institutional Grids**.

---

## 2. "Ginti Ki Cheezein" (The 2 Essential High-Yield Weapons)

### Weapon 1: Article, Amendment & Quota Cloze Anki Deck (`[Chapter]_Anki.apkg`) [PRIMARY RETENTION]
- **Role**: Instant active recall under high examination pressure.
- **Content**:
  - Constitutional Articles & Fundamental Rights:
    - *"Writs can be issued by the Supreme Court under Article {{c1::32}} and by High Courts under Article {{c2::226}}."*
    - *"Article {{c1::21A}} (Right to Education) was inserted by the {{c2::86th}} Constitutional Amendment Act, 2002."*
  - Institutional Appointments, Quotas & Tenures:
    - *"The Comptroller and Auditor General (CAG) holds office for a term of {{c1::6}} years or up to the age of {{c2::65}} years, whichever is earlier."*
    - *"The quorum to constitute a meeting of either House of Parliament is {{c1::one-tenth (10%)}} of the total number of members."*
  - Landmark Supreme Court cases and doctrinal tests.
- **Speed**: **4–7 seconds per card**.

### Weapon 2: Comparative Institutional Tables (`Notes/<Chapter>_Notes.md`) [REFERENCE ANCHOR]
- **Structure**:
  - **Comparative Grids**:
    - *Pardoning Powers*: President (Art 72) vs Governor (Art 161) (Court Martial, Death Sentence).
    - *Constitutional vs Statutory Bodies*: UPSC, Election Commission, CAG, Finance Commission (Appointment, Removal ground, Tenure, Re-eligibility).
    - *Types of Majorities*: Simple vs Absolute vs Effective vs Special (Art 249, Art 368, Art 61).
  - Zero redundant prose paragraphs.

---

## 3. Strictly Banned Anti-Patterns (Bloat Elimination)

1. ❌ **Procedural Question Banks (STRICTLY BANNED)**: Polity has no mathematical equations or numerical DAGs (`NON_PROCEDURAL_DOMAIN`).
2. ❌ **Rewriting Bare Acts / Textbooks into Narrative Notes**: Notes must exist only as side-by-side comparative matrices and distinction tables.
3. ❌ **MindMaps & Slide Decks**: Multi-tier mindmaps fail to capture jurisdictional subtleties and majority thresholds.

---

## 4. The 24-Hour Daily Student Flow for Polity

```text
[Step 1: Reading / Lecture (45-60 Mins)]
  └── Understand the constitutional principle (e.g. Federalism, Emergency Provisions).

[Step 2: Table Inspection (5-10 Mins)]
  └── Check the comparative grid in `Notes/<Chapter>_Notes.md` for jurisdictional differences.

[Step 3: Anki Daily Sprint (15-20 Mins - Mobile Phone)]
  └── Swipe 40-50 Article, Amendment, and Quota cards.
  └── Rock-solid retention of exact constitutional provisions.
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
