# Testing Infrastructure & Methodology (`TEST_INFRA.md`)
**StudySourceCore: Lightweight StudyLab Question Bank & Pipeline Certification**

## 1. Executive Testing Strategy & Architecture

StudySourceCore employs an independent, opaque-box, requirement-driven testing architecture designed to enforce mathematical integrity, strict boundary isolation, and zero-leakage content delivery. Testing operates on dual concurrent tracks:
1. **Implementation Milestone Verification (M1–M4)**: Validates individual components and contract modifications.
2. **Opaque-Box E2E Testing Track**: An independent adversarial test suite (`skills/study-source-core/scripts/test_e2e_lightweight_question_bank.js`) verifying the system exclusively through public APIs, rendered deliverables, and strict requirement contracts derived from `ORIGINAL_REQUEST.md` and `PROJECT.md`.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OPAQUE-BOX E2E TEST RUNNER                          │
│        (skills/study-source-core/scripts/test_e2e_lightweight_question_bank.js)│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
│     TIER 1      │           │     TIER 2      │           │     TIER 3      │
│Feature Coverage │           │Boundary & Anti- │           │Cross-Feature &  │
│(>=5 tests/feat) │           │     Leak        │           │ SQI Cardinality │
└─────────────────┘           └─────────────────┘           └─────────────────┘
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       ▼
                              ┌─────────────────┐
                              │     TIER 4      │
                              │Real-World E2E & │
                              │ APKG Sidelining │
                              └─────────────────┘
```

---

## 2. Four Systematic Testing Tiers

### Tier 1: Feature Coverage (>=5 Tests Per Feature)
Validates that every human-facing field required by `ORIGINAL_REQUEST.md` R1 is faithfully, cleanly, and deterministically rendered:

1. **Question Statement Rendering**:
   - Verbatim string fidelity (character-for-character preservation).
   - Multi-line statements with preserved paragraph breaks.
   - Inline LaTeX math expressions (`$a^2 + b^2 = c^2$`, `$\text{LCM}(a, b)$`) rendered without corrupted backslashes.
   - Display/block LaTeX formulas (`$$\frac{a}{b}$$`, `$$\sum_{i=1}^n x_i$$`) preserved intact.
   - Bilingual Hindi-first phrasing with English technical terms in parentheses `( )`.

2. **Authentic MCQ Options**:
   - Standard 4 options labeled `(A)`, `(B)`, `(C)`, `(D)` in Markdown list format.
   - 5 options `(A)` through `(E)` authentically preserved.
   - Option prefix deduplication: input with pre-existing labels (e.g. `(A) Value`, `B. Value`) cleaned to avoid redundant double labeling (`- (A) Value`).
   - Options with embedded LaTeX math expressions.
   - Extended option sets beyond E (e.g. `(F)`, `(G)`) preserved without truncation.

3. **Source / Provenance Metadata**:
   - Metadata callout with Exam name, Year, Shift, and Origin classification.
   - Provenance origin normalization across all 5 valid categories (`authentic_pyq`, `source_derived`, `curated_source`, `derived_variant`, `synthetic_schema`).
   - Difficulty rating rendering (numerical values `1.0`–`5.0` and difficulty descriptors).
   - Topic / Pattern reference linking (`pat-math-lcm-001`).
   - Authentic exam session details (e.g., RRB ALP 2018 Shift 1, SSC CGL 2020).

4. **Source Question ID (`source_question_id`) Rendering**:
   - Rendered callout includes `> - **Source Question ID**: \`<sqi-id>\``.
   - Question reference number (`Q-001`) preserved when present.
   - Hierarchical SQI identifiers (`sqi.math.lcm-hcf.042`, `sqi.physics.mechanics.kinematics.007`).
   - Fallback mechanism to question `id` when `source_question_id` is missing.
   - Multi-question uniqueness and stability verification across batch renders.

5. **Numerical and Subjective Question Types**:
   - `numerical` question types render without spurious option lists.
   - `structured` multi-step question types render prompt and metadata cleanly.
   - `direct_compute` question types render correctly.
   - `reverse_problem` question types render appropriate metadata labels.
   - `trap` and conceptual question types render statements without leaking diagnostic answers.

---

### Tier 2: Boundary, Corner & Anti-Leak Cases
Guarantees that `Questions.md` functions exclusively as a clean practice problem bank and NEVER leaks solutions or hints:

1. **Anti-Leak Invariants**:
   - **No Progressive Hints**: Strict regex search asserting absence of `### Progressive Hints`.
   - **No Hint Tier Callouts**: Strict regex search asserting absence of `[!tip]- Tier 1`, `[!tip]- Tier 2`, or `[!tip]- Tier 3`.
   - **No Step-by-Step Solutions**: Strict assertion that `### Solution` is absent from Markdown delivery.
   - **No Verification Blocks**: Strict assertion that `### Verification` is absent from Markdown delivery.
   - **No Method / Recognition Sections**: Strict assertion that `### Method & Recognition` is absent.
   - **No Traps / Error Sections**: Strict assertion that `### Traps & Errors` is absent.
   - **Zero Answer Reveals**: Strict assertion that correct answers/options (e.g. `**Correct Answer**:`, `correct_option`, `correct_answer`) are never rendered in `Questions.md`.

2. **Boundary & Corner Cases**:
   - Empty input handling: empty arrays or null inputs fail closed with explicit errors (`EMPTY_QUESTION_BANK`).
   - Extreme statement sizes: questions with 5,000+ characters, extensive multi-paragraph scenario text, and tables.
   - Complex multi-line option text with nested formatting.
   - Markdown meta-characters, HTML tags, backticks, and special characters (`<`, `>`, `&`, `|`, `\`, `_`, `*`).

---

### Tier 3: Cross-Feature Combinations & SQI Cardinality
Enforces mathematical consistency across pipelines:

1. **Cardinality Invariant ($1 \text{ Pattern} \neq 1 \text{ Question}$)**:
   - 100 distinct questions grouped under a single pattern produce **exactly 100 question blocks** in `Questions.md`.
   - No pattern-based compression, no clustering, no representative-question dropping.
2. **Removals & Exclusions Audit Trail**:
   - True duplicate questions and empty statements are filtered into `inventory.removals` with explicit logged reasons (`EXACT_TRUE_DUPLICATE`, `EMPTY_QUESTION_TEXT`).
   - Conservation identity holds strictly:
     $$\text{Total Candidate Questions} = \text{Questions in Questions.md} + \text{Documented Removals}$$
3. **Bijective SQI Traceability**:
   - Every question in `Questions.md` matches exactly one item in the canonical Source Question Inventory by `source_question_id`.
4. **Mixed Archetypes & Heterogeneous Batches**:
   - Batches containing mixed MCQs (4 and 5 options), numericals, and structured items across distinct problem patterns render without cross-talk or missing blocks.
5. **Internal Procedural IR Preservation**:
   - Validates that the internal canonical JSON representation (`Optional/<Chapter>_PracticeQuestions.json` and Semantic Learning IR) preserves all 17 dimensions (solution DAGs, 3-tier hints, verification, error taxonomies) while `Questions.md` remains lightweight.

---

### Tier 4: Real-World Scenarios & Procedural Sidelining
End-to-end integration and pipeline safety:

1. **Authentic LCM-HCF End-to-End Fixture**:
   - Full execution from raw source fixture $\to$ SQI ingestion $\to$ removals filtering $\to$ eligible item set $\to$ lightweight `Questions.md` rendering.
   - 100% cardinality reconciliation with zero data loss.
2. **Procedural APKG Sidelining**:
   - Confirms that default runtime policy for all 9 subjects disables procedural APKG (`proceduralApkg: false`, `procedural_mode: "markdown"` for STEM, `"none"` for non-STEM).
   - Asserts that `artifact-registry.json` does not include `task-export-studylab-anki` as a required dependency for downstream QA (`bmQa`).
   - Asserts that downstream packaging and routing succeed without requiring procedural APKG.
   - Asserts that Generic Anki (`Basic/`, `Cloze/`, `<Chapter>_Anki.apkg`) continues to generate and validate normally.
3. **Non-STEM Subject Safety**:
   - Confirms that non-STEM subjects (e.g. Biology, History, Geography) resolve to `procedural_mode: "none"`, suppressing Question Bank generation while leaving standard notes, mindmaps, and flashcards active.

---

## 3. Test Execution & Automation

### Command Line Interface
Execute the master E2E test suite from the repository root:
```bash
node skills/study-source-core/scripts/test_e2e_lightweight_question_bank.js
```

### Exit Codes & Diagnostics
- `0`: All tests passed across all 4 tiers with 100% compliance.
- `1`: One or more assertions failed. Full stack traces, failed invariant details, and input diffs are logged to stderr.

### Test Runner Summary Format
```text
================================================================================
E2E TEST SUITE: LIGHTWEIGHT STUDYLAB QUESTION BANK & SQI CARDINALITY
================================================================================
--- TIER 1: FEATURE COVERAGE ---
  [PASS] T1.1.1: Single-line question statement rendered verbatim
  ...
--- TIER 2: BOUNDARY, CORNER & ANTI-LEAK CASES ---
  [PASS] T2.1.1: Assert Questions.md strictly rejects '### Progressive Hints'
  ...
--- TIER 3: CROSS-FEATURE COMBINATIONS & SQI CARDINALITY ---
  [PASS] T3.1.1: 100 distinct questions under 1 pattern yield exactly 100 questions
  ...
--- TIER 4: REAL-WORLD SCENARIOS & APKG SIDELINING ---
  [PASS] T4.1.1: Authentic LCM-HCF fixture end-to-end cardinality reconciliation
  ...
================================================================================
TOTAL RESULTS: XX passed, 0 failed (Total: XX)
STATUS: ALL TIERS PASSED WITH 100% SUCCESS RATE
================================================================================
```

---

## 4. Maintenance & Invariant Governance

1. **Single Source of Truth**: The test suite derives expectations strictly from `ORIGINAL_REQUEST.md`, `PROJECT.md`, and `skills/study-source-core/resources/studylab-question-bank-contract.md`.
2. **Zero Facade Policy**: Tests never mock internal methods to force passes; all tests execute real renderer and inventory logic.
3. **Anti-Regression Safeguard**: Any future PR attempting to reintroduce hints, solutions, answers, or decision points into `Questions.md` will immediately fail Tier 2 anti-leak checks.
