# Project: StudySourceCore Lightweight StudyLab & Pipeline Certification

## Architecture
StudySourceCore operates a modular orchestration pipeline that transforms raw educational sources into sibling study artifacts.
- **Generic Content Track**: Core notes, Basic Anki, Cloze Anki, Image Occlusion, Mindmap, Slide Deck.
- **StudyLab Procedural Track**: Mathematical, Reasoning, Physics, and Chemistry practice items.
  - Internal Representation: Canonical 17-dimension procedural JSON AST in `Optional/<Chapter>_PracticeQuestions.json` & Semantic Learning IR (solution DAGs, 3-tier hints, verification, traps).
  - External Delivery: Lightweight human-facing `Questions/[Chapter]_Questions.md` (verbatim statements, authentic MCQ options, source provenance, question type, difficulty, question number, and SQI traceability).
- **Procedural APKG Sidelining**: Procedural APKG generation is disabled in default runtime (`proceduralApkg: false`, `procedural_mode: "markdown"`). Generic Anki (`Basic/`, `Cloze/`, `<Chapter>_Anki.apkg`) remains active. Procedural compilers and schemas are preserved.
- **Notes Architecture**: Pure GitHub-Flavored Markdown. Mermaid diagrams are strictly optional (0 diagrams is completely valid, max 12 nodes, only when materially enhancing conceptual clarity).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| F1 | Lightweight Questions.md Renderer | Strip internal procedural sections (hints, solutions, verification, traps, method) from Markdown delivery | M2 | R1 |
| F2 | SQI Traceability & Cardinality | Pass `source_question_id` and `question_number` through to `Questions.md`; enforce 100% cardinality invariant ($1 \text{ Pattern} \neq 1 \text{ Question}$) | M2 | R2 |
| F3 | Questions.md Contract & Anti-Leak Validator | Invert `validateQuestionBankMarkdown` to reject procedural leakage (hints, solutions, answers) while validating clean structure; update contract | M3 | R1 |
| F4 | Internal Procedural IR Archiving | Ensure canonical 17-dimension procedural AST continues to be archived in `Optional/<Chapter>_PracticeQuestions.json` | M2 | R5 |
| F5 | Procedural APKG Decoupling & Downstream Safety | Remove `task-export-studylab-anki` from `bmQa.dependencies` in `artifact-registry.json`; ensure downstream QA and release gates succeed without procedural APKG | M1 | R3 |
| F6 | Notes & Mermaid Contract Cleanup | Update `core-notes.md` and `note-architecture.md` to remove mandatory Mermaid quotas/min node counts, making diagrams strictly optional | M1 | R4 |
| F7 | Stale Contracts & Test Suite Alignment | Synchronize 6 test suites expecting old procedural markdown format with the new lightweight contract | M3 | R6 |
| F8 | End-to-End Pipeline Certification | Execute full 28 master test suites, domain production paths, SQI lossless test, and real-world LCM-HCF cardinality reconciliation | M4 | AC |
| F9 | Opaque-Box E2E Test Suite | Build independent requirement-driven E2E tests covering Tiers 1-4 for the lightweight contract | E2E-Track | Dual Track |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Notes Mermaid Cleanup & Registry Decoupling | `agents/core-notes.md`, `.agents/agents/core-notes.md`, `note-architecture.md`, `artifact-registry.json` | none | DONE |
| M2 | Lightweight Questions.md & SQI Traceability | `render_studylab_question_bank.js`, `studylab-question-bank-contract.md` | none | DONE |
| E2E | Opaque-Box E2E Testing Track | Independent E2E test harness (`test_e2e_lightweight_question_bank.js`, 45 tests) | none | DONE (TEST_READY.md published) |
| M3 | Anti-Leak Validator & Test Suite Synchronization | `validate_studylab_question_bank.js`, `test_studylab_question_bank.js`, domain production path tests, phase8 test | M2 | IN_PROGRESS (faf50277) |
| M4 | Final E2E Certification & Adversarial Hardening | Full 28 test suites, LCM-HCF integration test, adversarial coverage audit, forensic audit | M1, M3, E2E-Track | PLANNED |

## Interface Contracts
### `render_studylab_question_bank.js` ↔ `validate_studylab_question_bank.js`
- **Output of Renderer**: `Questions/<Chapter>_Questions.md`
- **Allowed Sections**: `# <Chapter> Practice Questions`, `## Problem Family / Pattern`, `### Question <N>`, verbatim question text, authentic options `(A)`, `(B)`, etc., metadata callout with `Source Question ID`, `Exam`, `Year`, `Shift`, `Type`, `Difficulty`.
- **Prohibited Sections**: `### Progressive Hints`, `### Solution`, `### Verification`, `### Method & Recognition`, `### Traps & Errors`, correct answer reveals, decision points.
- **Validator Semantic**: `validateQuestionBankMarkdown(content)` returns `{ isValid: true, errors: [] }` only if no prohibited headers or hint callouts exist, and all questions have required human-facing fields.

### `source_question_inventory.js` ↔ `render_studylab_question_bank.js`
- **Contract**: `normalizeQuestionItem(item)` must preserve `source_question_id: item.source_question_id || item.id` and `question_number: item.question_number`.
- **Renderer Requirement**: Metadata callout in `Questions.md` must render `> - **Source Question ID**: \`${item.source_question_id}\``.

### `artifact-registry.json` ↔ `orchestration_engine.js` ↔ `bm-qa`
- **Contract**: `bmQa.dependencies` = `["task-core-notes", "task-export-anki"]`.
- `proceduralApkg` remains registered with `task_id: "task-export-studylab-anki"`, but is omitted from default downstream requirements.

## Code Layout
- `skills/study-source-core/scripts/render_studylab_question_bank.js` (StudyLab Questions.md renderer)
- `skills/study-source-core/scripts/validate_studylab_question_bank.js` (Question bank validator)
- `skills/study-source-core/resources/studylab-question-bank-contract.md` (Question bank contract specification)
- `skills/study-source-core/resources/artifact-registry.json` (Master artifact registry)
- `skills/study-source-core/resources/note-architecture.md` (Notes architecture & Anti-slop)
- `agents/core-notes.md` & `.agents/agents/core-notes.md` (Notes specialist agent definitions)
- `skills/study-source-core/scripts/test_studylab_question_bank.js` (Question bank tests)
- `skills/study-source-core/scripts/test_math_production_path.js` (Math domain production test)
- `skills/study-source-core/scripts/test_physics_production_path.js` (Physics domain production test)
- `skills/study-source-core/scripts/test_chemistry_production_path.js` (Chemistry domain production test)
- `skills/study-source-core/scripts/test_reasoning_production_path.js` (Reasoning domain production test)
- `skills/study-source-core/scripts/test_phase8_independent_verification.js` (Phase 8 verification test)
- `skills/study-source-core/scripts/test_e2e_lightweight_question_bank.js` (Opaque-box E2E test suite)
