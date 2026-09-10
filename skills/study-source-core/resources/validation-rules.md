# Two-Level Audit & Validation System

`study-source-core` separates output verification into two distinct, non-overlapping levels:

```text
                            GENERATED OUTPUTS
                                    │
                                    ↓
                 ┌──────────────────┴──────────────────┐
                 │                                     │
                 ↓                                     ↓
      CORE TECHNICAL VALIDATION                 SUBJECT AUDIT
    (Format, Syntax, Delimiters,           (Intellectual Completeness,
     Source Boundary, File Contracts)       Domain Models, Gap Analysis)
```

---

## 1. Level 1: Core Technical Validation (Format & Syntax Integrity)

Every output must pass Level 1 validation before delivery:

### A. Chapter-First Directory Structure Integrity
- Every generated chapter artifact MUST be located inside its designated Chapter Folder: `Study Materials/[Subject]/[Chapter Folder]/`.
- ZERO chapter artifacts are permitted directly under the subject root (`Study Materials/[Subject]/Notes/` is FORBIDDEN).
- Final User Deliverables:
  - `[Subject]/[Chapter]/Notes/[Chapter]_Notes.md` (Mandatory)
  - `[Subject]/[Chapter]/[Chapter]_Anki.apkg` (Mandatory declarative package when flashcards exist)
  - `[Subject]/[Chapter]/StudyLab/[Chapter]_StudyLab_Procedural.apkg` (When solvable procedural practice items exist)
  - `[Subject]/[Chapter]/Optional/` (ProblemPatterns, PracticeQuestions, Comparative/Mnemonic TSVs when justified)
  - `[Subject]/[Chapter]/MindMap/` and `SlideDeck/` (When justified by routing)
  - `[Subject]/[Chapter]/.build/` (Internal metadata boundary: `artifact-manifest.json` and optional `.build/source-artifacts/`)
- Packaging Inputs: `Basic/[Chapter]_Basic.tsv`, `Cloze/[Chapter]_Cloze.tsv`, and `ImageOcclusion/` serve as internal build inputs packaged into `[Chapter]_Anki.apkg`. Upon successful APKG validation, they are safely cleaned from the user-facing chapter root.

### B. Universal Language Contract Compliance
- All explanatory prose, descriptions, algorithm steps, decision rules, error log mappings, and conceptual breakdowns across ALL study artifacts (mandatory AND optional: `Notes.md`, `Basic.tsv`, `Cloze.tsv`, `ProblemPatterns.md`, `DecisionRules.md`, `Comparative.tsv`, `Mnemonic.tsv`, `Timeline.md`, `ConceptMap.md`, `ReactionMap.md`, etc.) MUST follow the **Hindi-first** language contract.
- Technical English terms are accompanied by Hindi explanations and formatted in parentheses `( )` where useful.
- Technical notation (LaTeX equations, mathematical formulas, SI units, Cloze `{{c1::...}}` syntax) remains in natural technical form.
- No English-only optional study artifacts are permitted.

### C. Source Boundary Integrity
- All factual assertions are grounded strictly in the authorized source material.
- Active mode rules respected (`SOURCE_ONLY` contains zero external supplements; opt-in external modes clearly demarcate outside context).
- Source errors/contradictions preserved and flagged with callouts, not silently rewritten.

### D. Obsidian Notes Technical Integrity
- Valid GitHub-Flavored Markdown syntax.
- Clear title, consistent header hierarchy (`#`, `##`, `###`).
- No broken markdown links, missing tags, or conversational fluff.

### E. Basic TSV Technical Integrity (`[Chapter]_Basic.tsv`)
- Exactly 3 tab-separated columns: `Front<TAB>Back<TAB>Tags`.
- Header row intact.
- Tab delimiters valid; no unescaped line breaks inside fields.
- ZERO `{{c1::...}}` cloze syntax inside Basic TSV.

### F. Cloze TSV Technical Integrity (`[Chapter]_Cloze.tsv`)
- Exactly 3 tab-separated columns: `Text<TAB>Extra<TAB>Tags`.
- Header row intact.
- Tab delimiters valid; no unescaped line breaks inside fields.
- Non-empty `Text` field with valid `{{c1::...}}` syntax; at least one cloze deletion per card.

### G. File Separation & Duplicate Control
- `Basic.tsv` and `Cloze.tsv` are written as **two separate files**.
- No duplicate or near-duplicate cards across files unless testing complementary retrieval directions.
- Empty TSV files (header row intact) are accepted if candidate count is 0; no low-quality padding.

### H. Mind Map Technical Integrity (`[Chapter].mindmap.json`)
- If map generation is justified, `[Chapter].mindmap.json` MUST pass `map-validation-rules.md` (valid nested tree structure, valid cross-links, unique node IDs).
- The JSON artifact MUST be strictly compliant with the canonical MindMapData contract, requiring no local HTML rendering.

### I. Slide Deck Prompt Technical Integrity (`[Chapter]_SlideDeckPrompt.md`)
- Stored inside `Study Materials/[Subject]/[Chapter]/SlideDeck/[Chapter]_SlideDeckPrompt.md`.
- Formatted as an end-to-end, copy-pasteable prompt for NotebookLM and slide presentation generators.
- Contains 8–15 structured slides with explicit visual container directives (`Split-Screen`, `3-Column Hierarchy`, `Timeline Ribbon`, `Comparison Matrix`, `Decision Tree`).
- Strictly adheres to the Hindi-first presentation language policy (English technical terms in parentheses `( )`).
- ZERO walls of text; bullet points limited to maximum 4 per slide (preferred 2–3, under 12 words each; 0 for diagram-led slides).
- Includes examiner trap callout badges (`⚠️`) and concise Hindi speaker notes.

### J. Image Occlusion Technical Integrity (`[Chapter]_ImageOcclusion.json`)
- If IO generation is justified, `[Chapter]_ImageOcclusion.json` MUST pass `validate_image_occlusion.js`.
- Stored inside `Study Materials/[Subject]/[Chapter]/ImageOcclusion/[Chapter]_ImageOcclusion.json`.
- Strict schema compliance: Top-level required fields (`id`, `title`, `subject`, `chapter`, `cards`), unique card IDs, and non-empty `cards` array.
- Card structure: Valid `source` with non-empty `evidence_ids`, `asset` with non-empty `path` and positive dimensions (`width`, `height`), valid `mode` (`hide_all_guess_one` or `hide_one_guess_one`), and non-empty `regions` array.
- Geometric Bounds: Supported shapes (`rectangle`, `ellipse`, `polygon`) must have coordinates and points strictly within canvas bounds `[0, asset.width]` and `[0, asset.height]`. Polygons must contain at least 3 vertices.
- Semantic Grounding: Every region must contain a non-empty `answer` adhering to the Hindi-first contract (English terms in `( )`).
- Quality Gate: Emits warnings for $>15$ regions per card to prevent cognitive overload.

### K. StudyLab Procedural Technical Integrity (`[Chapter]_ProblemPatterns.json`)
- If procedural patterns are generated, `[Chapter]_ProblemPatterns.json` MUST pass `validate_studylab_procedural.js`.
- Stored inside `Study Materials/[Subject]/[Chapter]/Optional/[Chapter]_ProblemPatterns.json` as the machine-readable sibling of `[Chapter]_ProblemPatterns.md`.
- Strict schema compliance with `studylab-procedural-schema.json`: Top-level required fields (`id`, `title`, `domain`, `chapter`, `patterns`), unique pattern IDs, and non-empty `patterns` array.
- Pattern structure: Non-empty `problem_type`, `deep_structure`, `recognition_signals` array, `governing_method` with `standard_algorithm` step array, `common_traps` array, canonical `problem_family` (`family.<domain>.<subtopic>.<archetype>`), and valid `difficulty` enum.
- Structured PYQ references (when present) must specify non-empty `exam` and valid 4-digit integer `year`.
- Decision trees and error log taxonomies (when present) must conform to structured schemas.

### L. StudyLab Practice Questions Technical Integrity (`[Chapter]_PracticeQuestions.json`)
- If practice questions are generated, `[Chapter]_PracticeQuestions.json` MUST pass `validate_studylab_practice_questions.js`.
- Stored inside `Study Materials/[Subject]/[Chapter]/Optional/[Chapter]_PracticeQuestions.json` as the companion practice content artifact.
- Strict schema compliance with `studylab-practice-questions-schema.json`: Top-level required fields (`schema_version`, `domain`, `chapter`, `questions`), unique question IDs, and non-empty `questions` array.
- Question structure: Conforms to `PracticeItem` with non-empty `id`, valid `origin` (or ingestion compatibility alias `origin_type`: `authentic_pyq`, `curated_source`, `derived_variant`, `synthetic_schema`), non-empty `prompt`, and valid `question_type` (`mcq`, `numerical`, `structured`, `reference_only`).
- MCQ Checks: Valid `options` array ($\ge 2$ items), non-empty `correct_option` matching one of the options.
- Numerical Checks: Valid `answer` (finite number or string representation), non-negative numerical `tolerance` when specified, and physical units when applicable.
- ReferenceOnly Checks: Citations preserved with `exam_metadata` / `source_provenance`; zero fabricated questions. ReferenceOnly items are never packaged as solvable practice cards.
- Pattern Linkage: Solvable items reference valid `pattern_id`, `schema_id`, and `problem_family_id` (or ingestion compatibility alias `problem_family`) linking to `ProblemPatterns.json`.
- Multiple-Questions-Per-Pattern: Validates that multiple questions under the same pattern remain distinct without deduplication or collapse (`1 Pattern != 1 Question`).
- Provenance Integrity: Non-empty `source_provenance` (`source_book`, `page`) and structured `exam_metadata` for PYQs. Tracks `ContentProvenance` with zero fabrication.
- Hard Learner-State Isolation: Zero learner history, mastery scores, attempts, or latency stats inside `PracticeQuestions.json`.
- Canonical Contract Invariant: Canonical internal representations are defined by current Rust/content contracts (`PracticeItem`, `ProceduralCardAnchor`, etc.). Compatibility fields in source JSON (`origin_type`, `problem_family`, etc.) must not be copied into production contracts unless the implementation requires them.

### M. StudyLab Procedural APKG Technical Integrity (`[Chapter]_StudyLab_Procedural.apkg`)
- Packages solvable items from `PracticeQuestions.json` and rich procedural contracts into question-backed procedural practice objects using the canonical `StudyLab Procedural Anchor` note type (4 fields: `ProceduralPayload`, `TopicTitle`, `Domain`, `Provenance`; template: Front and Back ONLY render `{{ProceduralPayload}}`).
- The payload JSON stored in `ProceduralPayload` adheres strictly to `ProceduralCardAnchor` (defined in `schemas/studylab-apkg-schema.json`):
  - `proc_schema` (required canonical schema/family string)
  - `inline_contract` (Mandatory for Portable APKGs: complete `DeclarativeFamilyContract` bundled in payload for zero-database portability on fresh profiles)
  - `seed_mode` (optional: `'random'`, `'daily'`, or `{ fixed: number }`)
  - `difficulty_override` (optional continuous number 1.0-5.0; canonical production field name)
- **Self-Contained APKG Gate**: For standalone/portable decks, validator strictly verifies that 100% of notes possess a valid `inline_contract` adhering to `schemas/studylab-rich-content-contract.schema.json`. Any note with `inline_contract: null` triggers a validation error in portable mode.
- Interception Semantics: Verified as dynamic anchor intercepted by the custom procedural reviewer rather than rendered as a static HTML question card.
- Hard Learner-State Isolation: Strictly excludes `SkillState`, `PracticeAttempt`, historical latency, mastery scores, and error logs (persisted only in `procedural.db`).
- Solvability Gate: Suppressed cleanly when 0 solvable practice items exist (`ZERO_SOLVABLE_PRACTICE_QUESTIONS`).
- Companion Manifest: Generates and validates companion `[Chapter]_StudyLab_Procedural.manifest.json`.
- Validates via `validate_studylab_procedural_apkg.js`.

### N. Phase 40 Rich Declarative Contract Validation (`DeclarativeFamilyContract`)
- If rich procedural contracts are authored, they MUST validate against `schemas/studylab-rich-content-contract.schema.json` and `schemas/studylab-validation-contract.json`:
  - **String Length Limits**: `family_id` $\le 256$ chars; `default_schema` $\le 256$ chars; `archetype_id` $\le 256$ chars; `parameter_name` $\le 64$ chars; `prompt_template` $\le 10\,000$ chars; `solution_template` $\le 20\,000$ chars; `step_nodes` descriptions $\le 2\,000$ chars.
  - **Continuous Difficulty Bounds**: `min_difficulty` $\ge 1.0$, `max_difficulty` $\le 5.0$, and `min_difficulty <= max_difficulty`.
  - **Fluency Target Time Bounds**: `target_time_ms` $\in [1\,000, 600\,000]$ ($1\text{s}$ to $10\text{min}$). Baseline defaults: $25\text{s} / 35\text{s} / 50\text{s} / 65\text{s} / 80\text{s}$.
  - **Collection Count Limits**:
    - Archetypes per Family: $1 \le N \le 50$.
    - Parameters per Archetype: $0 \le N \le 50$.
    - Constraints per Archetype: $0 \le N \le 50$.
    - Step Nodes per Archetype: $0 \le N \le 20$.
  - **Arithmetic Safety Rules**:
    - `integer_range`: `min <= max`, `step > 0`, checked subtraction to prevent overflow.
    - `float_range`: `min <= max`, finite numbers (rejects NaN and $\pm\infty$).
    - `discrete_choice`: non-empty values array.
    - `permutation_choice`: non-empty pool, $0 < count \le pool.len()$.
    - `prime_factor_grid`: $base\_primes > 0$, $1 \le min\_e \le max\_e \le 63$.
    - `coprime_pair`: $min \le max$, checked subtraction.
  - **Solution Graph DAG Topology**: Step references must point to existing step IDs; dependencies must form a strictly acyclic DAG; exactly one terminal node with `is_final: true`.
  - **3-Tier Progressive Hints**: Principle (Tier 1), Operation (Tier 2), Intermediate (Tier 3). Tier 3 may reveal an intermediate relation or partial value, but must NEVER directly leak the final answer.

### O. Content Coverage Gap Matrix Audit
- For procedural chapters, execute the formal coverage audit:
  - Generate matrix: `Pattern | Solvable Questions | ReferenceOnly | PYQs | Curated | Generator Capability`.
  - Report total questions, MCQ count, numerical count, authentic PYQs, curated textbook problems, and unrepresented patterns.
  - Honestly report uncovered patterns without fabricating fake questions or fake sources.

---

## 2. Level 2: Subject Domain Audit (Intellectual Completeness)

Subject Audit checks domain completeness and model integrity based on the active Subject Skill:

- **Mathematics**: All major problem pattern families covered, method selection rules defined, decision trees intact, numerical traps represented in `ProblemPatterns.md`.
- **Reasoning**: Logic patterns mapped, constraint processing rules defined, trap patterns covered.
- **Physics**: Physical models grounded, concept-formula links intact, numerical problem families represented in `ProblemPatterns.md`, graph interpretations covered.
- **Chemistry**: Physical/Organic/Inorganic distinctions preserved, reaction networks and mechanism flows mapped, exception rules represented.
- **Biology**: Structure-function-process-regulation chains complete, anatomical diagram labels mapped, classification tables intact.
- **Geography**: Spatial alignments preserved, physical-human relational links intact, cause-effect mechanisms mapped.
- **History**: Chronology preserved, causal chains intact, historical memory vs understanding layers distinct.
- **Political Science**: Constitutional provisions, institutions, powers, and relationships accurately mapped.

*Rule: Subject Audit checks intellectual completeness and domain fidelity. It MUST NOT repeat Core technical syntax checks.*


