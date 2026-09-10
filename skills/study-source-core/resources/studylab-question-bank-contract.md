# StudyLab Procedural Question Bank Contract (`studylab-question-bank-contract.md`)
**Phase 1 Foundation: Validated Markdown Question Bank Specification**

## 1. Core Architecture & Scope

StudySourceCore decouples semantic procedural problem synthesis from packaging/delivery mechanisms. StudyLab semantic content remains the single authoritative source of truth. The Markdown Question Bank is a deterministic, validated delivery renderer:

```text
SOURCE ↓ EVIDENCE PACK ↓ SUBJECT + RUNTIME POLICY ↓ STUDYLAB SEMANTIC CONTENT
                                                   ├── Markdown renderer (ACTIVE)
                                                   └── APKG renderer (PRESERVED)
```

In Phase 1, procedural output for **Mathematics, Physics, Chemistry, and Reasoning** shifts from APKG-first delivery to a validated Markdown Question Bank, while preserving all existing semantic contracts, schemas, solution DAGs, and Anki APKG compilers for future multi-mode delivery.

---

## 2. Core Invariants

1. **`1 Pattern != 1 Question`**: A single problem pattern/schema encompasses multiple distinct practice questions. All distinct solvable source questions remain discrete items and must never be collapsed or deduplicated merely because they share a family or archetype.
2. **Source-First Hierarchy**: Authentic source material (PYQs, textbook problems) has strict priority over synthetic or generated expansions. No artificial question quotas may be invented.
3. **Additive Non-Destructive Invariant**: Generic study deliverables (`Notes`, `Basic`, `Cloze`, `ImageOcclusion`, `MindMap`, `SlideDeck`) and existing StudyLab APKG tools remain fully operational.
4. **Deterministic Rendering**: The Markdown Question Bank renderer (`scripts/render_studylab_question_bank.js`) must be pure and deterministic. It must not invent, rewrite, or silently omit semantic content.
5. **Universal Bilingual Standard**: Questions, hints, and solutions adhere to Hindi-first phrasing with English technical terms in parentheses `( )` and LaTeX expressions for formulas.
6. **Anti-Leak Invariant**: Tier 1 (Conceptual) and Tier 2 (Strategic Setup) hints must NEVER leak the final numerical value or correct MCQ option letter.

---

## 3. Required Semantics (17 Minimum Dimensions)

Every procedural question in the canonical representation must support at minimum the following 17 semantic fields:

| # | Dimension | Canonical Field | Type | Description |
|---|---|---|---|---|
| 1 | **Question ID** | `id` | `string` | Unique identifier within the chapter (e.g., `math-q-001`, `chem-q-012`). |
| 2 | **Pattern ID** | `pattern_id` | `string` | Linkage to canonical problem pattern (e.g., `pat-math-lcm-001`). |
| 3 | **Source Provenance** | `provenance` | `object` | Source lineage with origin classification (see Section 4). |
| 4 | **Question Type** | `question_type` | `string` | Problem archetype (e.g., `mcq`, `numerical`, `structured`, `direct_compute`, `reverse_problem`, `trap`). |
| 5 | **Difficulty** | `difficulty` | `number \| string` | Numerical level ($1.0$ to $5.0$) or string (`Easy`, `Medium`, `Hard`). |
| 6 | **Question Statement** | `question` / `prompt` | `string` | Complete bilingual question statement with LaTeX math delimiters. |
| 7 | **Recognition Signals** | `recognition_signals` | `string[]` | Distinct conceptual clues/triggers indicating when this method applies. |
| 8 | **Expected Method** | `expected_method` | `string` | Governing mathematical/procedural theorem, formula, or algorithmic pipeline. |
| 9 | **Decision Points** | `decision_points` | `string[]` | Critical branching decisions or variable condition checks during solution. |
| 10 | **Trap** | `trap` | `string \| string[]` | Common pitfalls, distractors, or student misconceptions examiners exploit. |
| 11 | **Error Category** | `error_category` | `string[]` | Mapped error codes from the 14-Category Error Taxonomy (e.g., `ERR_01`, `ERR_06`). |
| 12 | **Hint Tier 1** | `hints.tier_1` | `string` | Conceptual direction / perspective clue without calculations or final answers. |
| 13 | **Hint Tier 2** | `hints.tier_2` | `string` | Strategic formula / relationship / diagram setup without final answers. |
| 14 | **Hint Tier 3** | `hints.tier_3` | `string` | Step-by-step method execution guide without leaking final answer. |
| 15 | **Solution** | `solution` | `string` | Complete step-by-step Hindi-first derivation, calculation steps, or solution DAG. |
| 16 | **Verification** | `verification` | `string` | Dimensional check, reverse substitution, boundary test, or sanity check. |
| 17 | **Prerequisites** | `prerequisites` | `string[]` | Prerequisite skills or conceptual dependencies required for comprehension. |

---

## 4. Provenance Classification

The `provenance.origin` property must explicitly distinguish between at least the following 5 categories:

1. **`authentic_pyq`**: Verbatim or near-verbatim past examination questions with verified exam metadata (e.g. RRB ALP, SSC, JEE Main).
2. **`source_derived`**: Directly formulated from authorized textbook examples, classroom notes, or chapter exercises.
3. **`curated_source`**: High-yield problem curated from authorized standard reference literature.
4. **`derived_variant`**: Systematic parameter variation derived from an authentic problem while preserving structure.
5. **`synthetic_schema`**: Procedurally generated instance instantiated from an authorized declarative mold.

---

## 5. Markdown Delivery Output Specification

The canonical output file path is:
```text
Study Materials/[Subject]/[Chapter]/Questions/[Chapter]_Questions.md
```

### Required Structural Sections in Markdown:
1. **YAML Frontmatter**: Includes `subject`, `chapter`, `artifact: proceduralQuestionBank`, `schema_version`, and `total_questions`.
2. **Single Top-Level Heading (`#`)**: `# [Chapter] — Procedural Question Bank`.
3. **Chapter Overview Callout**: High-level metadata block (`> [!info] Chapter Overview`).
4. **Question Blocks (`## [Question ID] — [Title/Pattern]`)**:
   - Metadata callout (`> [!info] Question Metadata`) containing Pattern ID, Provenance origin, Type, Difficulty, Prerequisites.
   - `### Question`: Question statement and (for MCQ) four labeled options `(A)`, `(B)`, `(C)`, `(D)`.
   - `### Method & Recognition`: Bullet points for Recognition Signals, Expected Method, Decision Points.
   - `### Traps & Errors`: Common traps and mapped error taxonomy codes.
   - `### Progressive Hints`: Collapsible Obsidian callouts:
     - `> [!tip]- Tier 1: Conceptual Approach`
     - `> [!tip]- Tier 2: Strategy & Setup`
     - `> [!tip]- Tier 3: Step-by-Step Method`
   - `### Solution`: Exhaustive step-by-step mathematical or procedural derivation.
   - `### Verification`: Sanity check, reverse substitution, or dimensional analysis.
