# StudyLab Procedural Question Bank Contract (`studylab-question-bank-contract.md`)
**Phase 1 Foundation: Validated Markdown Question Bank Specification**

## 1. Core Architecture & Scope

StudySourceCore decouples semantic procedural problem synthesis from packaging/delivery mechanisms. StudyLab operates on a clean two-tier architecture separating the **Internal Canonical Single Source of Truth (SSoT)** from the **Lightweight Human-Facing Delivery Projection**:

```text
SOURCE ↓ EVIDENCE PACK ↓ SUBJECT + RUNTIME POLICY ↓ STUDYLAB PROCEDURAL INTELLIGENCE
                                                   │
                                                   ├── Internal Canonical JSON AST (SSoT)
                                                   │   ├── Optional/<Chapter>_PracticeQuestions.json
                                                   │   ├── Optional/<Chapter>_ProblemPatterns.json
                                                   │   └── Semantic Learning IR (17 Dimensions, DAGs, Hints, Traps)
                                                   │
                                                   ├── Lightweight Markdown Delivery (ACTIVE)
                                                   │   └── Questions/<Chapter>_Questions.md
                                                   │       (Clean, spoiler-free problem bank for learners)
                                                   │
                                                   └── Procedural APKG Exporter (PRESERVED)
                                                       └── Interactive multi-tier study package
```

In Phase 1, procedural output for **Mathematics, Physics, Chemistry, and Reasoning** shifts from APKG-first delivery to a validated Markdown Question Bank (`Questions/<Chapter>_Questions.md`). While the Markdown output delivers a clean, spoiler-free question inventory for students, all rich procedural intelligence (solution DAGs, 3-tier progressive hints, verification routines, traps, decision points, and Content Lineage Records) is preserved 100% losslessly in the internal canonical representation (`Optional/<Chapter>_PracticeQuestions.json`) for future reactivation and automated audits.

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

Every procedural question in the **internal canonical JSON AST** (`Optional/<Chapter>_PracticeQuestions.json`) and **Semantic Learning IR** must support at minimum the following 17 semantic fields.

*(Note: The external human-facing delivery file `Questions/<Chapter>_Questions.md` deterministically exposes only the learner-facing fields — statement, authentic options, and metadata callout — while filtering out answers, hint tiers, full solutions, verifications, decision points, and traps to prevent spoiler leakage).*

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

The Markdown Question Bank is a **clean, lightweight, human-facing problem delivery format** designed for active student recall and self-testing. It provides verbatim problem statements, authentic options, provenance, and Source Question ID (SQI) traceability without spoiling solutions, hints, or answers.

### Required Structural Sections in Markdown:
1. **YAML Frontmatter**:
   - `subject`: Domain name (e.g. `"Mathematics"`).
   - `chapter`: Chapter name (e.g. `"LCM-HCF"`).
   - `artifact`: `"proceduralQuestionBank"`.
   - `schema_version`: `"1.0.0"`.
   - `total_questions`: Number of rendered questions matching SQI cardinality.
   - `domain`: Subject domain identifier.
2. **Single Top-Level Heading (`#`)**: `# [Chapter] — Procedural Question Bank`.
3. **Chapter Overview Callout (`> [!info] Chapter Overview`)**:
   - Subject / Domain, Chapter name, Skill ID, Language (`Hindi-first (Bilingual)`), Total Practice Questions, and Pipeline Architecture.
4. **Question Blocks (`## [Question ID] — [Title/Pattern]`)**:
   - **Question Metadata Callout (`> [!info] Question Metadata`)**:
     - `> - **Source Question ID**: `sqi.<subject>.<chapter>.<ref>`` (Authoritative SQI identifier)
     - `> - **Question Number / Reference**: <number>` (Original question number from source exam/book when available)
     - `> - **Exam**: <exam>` (Past exam source when available, e.g. RRB ALP, SSC CGL)
     - `> - **Year**: <year>` (Exam year when available)
     - `> - **Shift**: <shift>` (Exam shift when available)
     - `> - **Pattern ID**: `<pattern_id>`` (Canonical pattern linkage)
     - `> - **Topic / Pattern**: <pattern_title>` (Human-readable problem family)
     - `> - **Provenance**: `<origin>`` (`authentic_pyq`, `source_derived`, `curated_source`, `derived_variant`, `synthetic_schema`)
     - `> - **Question Type**: <type>` (`mcq`, `numerical`, `structured`)
     - `> - **Difficulty**: <difficulty>` (Numerical rating 1.0–5.0)
   - **Question Statement (`### Question`)**:
     - Verbatim question statement supporting multi-line text and LaTeX math delimiters (`$...$` and `$$...$$`).
   - **MCQ Options**:
     - For `mcq` type questions, authentic options formatted as list items:
       - `- (A) <Option A>`
       - `- (B) <Option B>`
       - `- (C) <Option C>`
       - `- (D) <Option D>`
       - `- (E) <Option E>` (when present in source)
     - Option label prefixes (e.g. `(A)`, `A.`, `(1)`, `1.`) from raw extractions are cleanly normalized to avoid duplicate label prefixes.
   - **Separator**: Horizontal rule `---` between adjacent question blocks.

### Prohibited Sections in Human-Facing Markdown (Anti-Leakage Boundary):
To prevent answer leakage, maintain genuine testing conditions, and preserve pedagogical integrity, the human-facing `Questions.md` file **MUST NOT** render:
1. ❌ **`### Method & Recognition`**: Recognition signals, expected methods, and decision points.
2. ❌ **`### Traps & Errors`**: Distractor traps and error category codes.
3. ❌ **`### Progressive Hints`**: Tier 1 (Conceptual), Tier 2 (Strategic Setup), and Tier 3 (Next Step) hint callouts.
4. ❌ **`### Solution`**: Step-by-step derivations, calculations, or solution DAG step nodes.
5. ❌ **`### Verification`**: Reverse plug-in checks, dimensional checks, or sanity bounds.
6. ❌ **Answers**: Explicit correct answers (`correct_answer`, `correct_option`, `Answer: ...`).

### Archiving & Reactivation Guarantee:
The omission of procedural sections from `Questions.md` does **not** discard them. All 17 canonical dimensions (solution DAGs, 3-tier hints, step-by-step solutions, verification routines, traps, and CLR records) remain 100% archived in:
- `Optional/<Chapter>_PracticeQuestions.json` (Validated canonical JSON AST)
- `Optional/<Chapter>_ProblemPatterns.json` (Validated pattern taxonomy)
- Semantic Learning IR (Graph topology and lineage)

These internal artifacts are continuously validated by `validate_studylab_practice_questions.js` and `validate_studylab_canonical_contracts.js`, ensuring instant, zero-rework capability for future interactive web quiz engines, progressive hint bots, and procedural APKG compilation.
