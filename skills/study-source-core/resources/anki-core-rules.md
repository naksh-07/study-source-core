# Memory Layer & Anki Core Rules

The Memory layer selects compact, high-value information that benefits from active retrieval and long-term recall.

## 1. Universal Flashcard Principles
- **Atomicity**: 1 card = 1 main retrievable idea. Answerable in **5–10 seconds**.
- **Minimum Information Principle**: Avoid multi-paragraph questions, long essay answers, or complex multi-step solutions.
- **Independent Pipeline**: Flashcards are generated directly from the original authorized source, NOT by summarizing the finished Notes file.

---

## 2. Declarative Flashcard Packaging Inputs (Build Inputs)

When candidates exist, Basic and Cloze flashcards are generated as **packaging inputs** inside the chapter's `Basic/` and `Cloze/` subfolders:

1. `Study Materials/[Subject]/[Chapter]/Basic/[Chapter]_Basic.tsv` (Standard Basic note type)
2. `Study Materials/[Subject]/[Chapter]/Cloze/[Chapter]_Cloze.tsv` (Standard Cloze note type)

Files must NEVER contain mixed note types inside the same TSV. These files serve as build inputs to assemble `[Chapter]_Anki.apkg`. Following successful APKG validation, they are safely cleaned from the user-facing chapter directory, and their provenance is retained in `.build/artifact-manifest.json`.

### A. Basic TSV Specification (`[Chapter]_Basic.tsv`)
- **Columns (Header required):** `Front<TAB>Back<TAB>Tags`
- `Front` contains direct question/prompt in Hindi (with English terms in parentheses). No `{{c1::...}}` cloze syntax allowed.
- `Back` contains concise answer in Hindi (preserving math/formulas/units).
- Directly importable into Anki using standard Basic note type.

### B. Cloze TSV Specification (`[Chapter]_Cloze.tsv`)
- **Columns (Header required):** `Text<TAB>Extra<TAB>Tags`
- `Text` MUST contain valid Anki cloze syntax (`{{c1::answer}}`) within Hindi explanatory text.
- `Extra` contains optional context in Hindi. No Basic `Front/Back` headers allowed.
- Directly importable into Anki using standard Cloze note type.

---

## 3. Optional Memory Outputs & Mnemonic Contract

When justified by the Subject Skill and source material, optional specialized memory TSVs may be generated inside `Study Materials/[Subject]/[Chapter]/Optional/`:
- `[Chapter]_Comparative.tsv` (Paired side-by-side distinction cards in Hindi)
- `[Chapter]_Mnemonic.tsv` (Source-grounded memory devices in Hindi)

### Mnemonic Contract:
- `[Chapter]_Mnemonic.tsv` MUST contain **source-provided memory devices ONLY**.
- AI-invented mnemonics are strictly FORBIDDEN in `SOURCE_ONLY` mode.
- If synthetic mnemonics are requested, they require an explicit separate mode and must be explicitly tagged as AI-generated.

---

## 4. Image Occlusion Sibling Architecture

Visual-spatial learning targets (diagrams, anatomy, maps, circuits, process geometries) MUST NOT be forced into textual Basic or Cloze cards:
- **Dedicated Sibling Artifact**: Written to `Study Materials/[Subject]/[Chapter]/ImageOcclusion/[Chapter]_ImageOcclusion.json`.
- **Governed Generation**: Created only when the learning target genuinely benefits from spatial localization, adhering to `image-occlusion-contract.md`.
- **Active Visual Asset Engine**: Resolves source, programmatic, AI pedagogical, or external visual substrates via `resolve_visual_asset.js`.
- **Native Anki Integration**: Exported into official native Anki Image Occlusion notetype with SVG cloze masks and bundled media.

---

## 5. Candidate Filtering & Empty Short-Circuit (Finding 1)

- **Candidate Pipeline**: `Source Candidates → Value Filter → Card Type Decision (Basic vs Cloze vs ImageOcclusion) → Deduplication → Final Cards`.
- **No Artificial Quotas**: Card counts emerge naturally from source information density. No fixed 50/50 ratios.
- **Empty Short-Circuit (Strict Rule)**:
  - If `basic_candidate_count === 0`: Do NOT invoke `core-basic-anki`, do NOT create `[Chapter]_Basic.tsv`, and do NOT run Basic validation.
  - If `cloze_candidate_count === 0`: Do NOT invoke `core-cloze-anki`, do NOT create `[Chapter]_Cloze.tsv`, and do NOT run Cloze validation.
  - If BOTH are zero (and no IO cards exist): Do NOT run `export_anki.js` and do NOT create an empty normal Anki `.apkg`.
  - If at least one declarative card type exists: Generate and package only the available declarative material into `[Chapter]_Anki.apkg`.
- **Duplication Control**: Do NOT generate Basic and Cloze versions of the exact same fact unless testing complementary retrieval directions.

---

## 6. Standard Anki Exclusions & The Zero-Scratchpad Rule
DO NOT put these into standard Anki flashcards:
- **Scratchpad Math & Multi-Step Calculations (STRICTLY BANNED)**: Never place calculation-heavy physics numericals, multi-step math problems, stoichiometry equations, or reasoning seating puzzles into Anki cards. Anki is designed for rapid 5–15 second active retrieval. Forcing scratchpad calculations causes flashcard fatigue and breaks the daily review habit.
- **Atomic-Only Retainers for STEM**: For STEM topics, Anki cards must strictly test **atomic formula recall** ($K_p = K_c(RT)^{\Delta n_g}$), **governing laws / conditions** (e.g. when is $\Delta H = \Delta U$?), **SI units / dimensions**, **boundary conditions**, and **examiner trap definitions**.
- Long algebraic derivations or proof steps.
- Complex multi-step mechanisms or complete reaction networks.
- Full chapter summaries or essay explanations.
- Uncontextualized 500-card reagent or fact dumps.
- Complex diagrams or anatomical topologies that require Image Occlusion.

---

## 7. Unified `.apkg` Deck Packaging Contract

All available declarative flashcards for a chapter are assembled into **ONE native Anki package (`[Chapter]_Anki.apkg`)**:
- Combines available:
  1. `Basic/[Chapter]_Basic.tsv` ──► Standard Basic notes/cards (if generated)
  2. `Cloze/[Chapter]_Cloze.tsv` ──► Standard Cloze notes/cards (if generated)
  3. `ImageOcclusion/[Chapter]_ImageOcclusion.json` ──► Native Image Occlusion notes/cards (if generated)
  4. `ImageOcclusion/media/` ──► Bundled image/diagram assets (if generated)
- Export command: `node skills/study-source-core/scripts/export_anki.js <path_to_chapter_dir>`
- Validation command: `node skills/study-source-core/scripts/validate_apkg.js <path_to_apkg>`
- Single-click import: The user imports one `.apkg` into Anki to receive the entire chapter deck hierarchy.

---

## 8. Procedural Mastery & Question Bank Decoupling (ADR-24 & ADR-25)

In accordance with ADR-24 and ADR-25 (The Clean Triad), procedural problem-solving (numerical physics, algebraic math, chemical calculations, logical puzzles) is permanently decoupled from Anki:
- **Primary Delivery**: Delivered exclusively as a self-contained, interactive, anti-spoiler Obsidian Question Bank (`Study Materials/[Subject]/[Chapter]/Questions/[Chapter]_Questions.md`).
- **Interactive Scaffolding**: Features 4-option MCQs with misconception distractors, default-collapsed 3-tier progressive hints (`> [!tip]- संकेत`), and default-collapsed step-by-step DAG solutions (`> [!success]- उत्तर एवं विस्तृत हल`).
- **Archived Binary Packaging**: Interactive procedural APKG packaging (`_StudyLab_Procedural.apkg`) is archived and inactive in production. Learners solve problems frictionlessly on paper within Obsidian, eliminating flashcard fatigue.
