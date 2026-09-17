# Original User Request

## 2026-08-27T18:47:44Z

# .AGENTS AS THE CANONICAL STUDYSOURCECORE OPERATIONS MANUAL
# MISSION
Convert the repository's .agents/ directory into a complete, authoritative documentation/control-plane for all Skills, Agents, Resources, Scripts and orchestration components used by StudySourceCore.

Working directory: c:\Users\Suraj\Pictures\Books\Acadmey\ALP\Prompts\AI Notes
Integrity mode: development

## Requirements

### R1. Complete Inventory & Classification (Phase 1)
- Recursively audit every file across .agents/ (Skills, Agents, Resources, References, Schemas, Scripts, Tests, and Configurations).
- Classify every file into canonical taxonomies (CANONICAL SKILL, CANONICAL AGENT, CANONICAL RESOURCE, CANONICAL SCHEMA, EXECUTABLE SCRIPT, TEST, CONFIGURATION, DOCUMENTATION, GENERATED ARTIFACT, TEMPORARY, OBSOLETE, DUPLICATE).
- Generate complete machine-readable audits under artifacts_qa/agents_documentation_audit/ (inventory.json, ownership.json, skills.json, agents.json, scripts.json, resources.json, freeze-map.json, duplication-audit.json, documentation-coverage.json).

### R2. Canonical Operations Manual & Master Maps (Phase 2)
- Author .agents/README.md as the master control-plane entry point with architecture diagrams, lifecycle summary, and debugging paths.
- Author .agents/OWNERSHIP.md enforcing the Single Responsibility Principle (1 responsibility = 1 canonical owner) across source intake, evidence, routing, notes, basic/cloze/IO Anki, mindmaps, slide decks, StudyLab procedural APKG, and validation.
- Author .agents/DATA_FLOW.md detailing end-to-end data transformation (Source -> Ingestion -> Evidence -> Routing -> Specialists -> Handoff -> Validation -> Final Artifacts).
- Author .agents/EXECUTION_LIFECYCLE.md distinguishing parent orchestrator duties from subagent specialist tasks.
- Author .agents/FREEZE_MAP.md classifying all repo components into FROZEN, CONTROLLED CHANGE, SAFE TO MODIFY, GENERATED, or TEMPORARY.
- Author .agents/DECISIONS.md consolidating major architectural decisions and ADR rationales.
- Author .agents/TROUBLESHOOTING.md providing evidence-driven diagnostic trees for pipeline issues.

### R3. Standardized Registries & Agent Definitions (Phase 3)
- Author .agents/SKILLS.md documenting Core, Subject, Supporting, and StudyLab skills.
- Author .agents/AGENTS.md and standardize all 14 agent definition files under .agents/agents/*.md according to the 14-point standard structure (Role, Why Exists, Owns, Does Not Own, Input, Required Context, Invocation Trigger, Process, Output, Handoff, Validation, Failure Conditions, Duplication Guard, Examples).
- Author .agents/SCRIPTS.md covering all operational, validation, routing, and testing scripts.
- Author .agents/RESOURCES.md establishing single sources of truth for contracts and schemas.

### R4. Deduplication & Hygiene (Phase 4)
- Remove duplicate rules, stale paths, and redundant text across agent and skill documentation by consolidating into canonical reference pointers.
- Strictly adhere to the Stop & Preservation Rules: do not delete real tests, schemas, historical decisions, or working scripts.

### R5. Verification, Comprehension Testing & Final Audit Report (Phase 5)
- Execute a fresh-agent comprehension test verifying 11 core architectural questions against the newly created manual.
- Validate documentation coverage score (100% of active components covered with Purpose, Owner, Input, Output, Dependencies, Lifecycle, Modification boundary).
- Produce the final audit document docs/AGENTS_DOCUMENTATION_AND_OPERATIONS_AUDIT.md.

## Acceptance Criteria
- All 79+ files in .agents/ are cataloged in artifacts_qa/agents_documentation_audit/inventory.json with classification, owner, status, and dependencies.
- All 14 agent definition files in .agents/agents/ adhere to the 14-section standardized template.
- Master documentation files exist and are populated: README.md, OWNERSHIP.md, SKILLS.md, AGENTS.md, SCRIPTS.md, RESOURCES.md, DATA_FLOW.md, EXECUTION_LIFECYCLE.md, FREEZE_MAP.md, DECISIONS.md, TROUBLESHOOTING.md.
- Zero duplicate architecture rules: Skills and agents point to canonical resources in resources/ or .agents/ rather than inlining identical text blocks.
- Zero deletion of active schemas, tests, or working scripts.
- All 9 machine-readable JSON artifacts generated under artifacts_qa/agents_documentation_audit/.
- 11/11 Fresh-agent comprehension check questions pass without contradiction.
- Comprehensive final report published to docs/AGENTS_DOCUMENTATION_AND_OPERATIONS_AUDIT.md with final status verdict.

## 2026-08-28T11:15:51Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Full Team

Execute a high-confidence architectural consistency and boundary-alignment mission on the existing StudySourceCore repository. Ensure StudySourceCore remains a thin orchestration layer, Subject Skills own their artifact policies, and StudyLab is strictly isolated to its four domains.

Working directory: c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI Notes
Integrity mode: development

## Requirements

### R1. Architecture & Subject Skill Ownership
StudySourceCore must act only as a thin orchestration/control plane (WHAT, WHEN, WHO). All nine Subject Skills must be individually inspected to ensure they exclusively own domain interpretation, artifact eligibility, and subject-specific policy. Core must not use legacy heuristics to silently override Subject Skill decisions. 

### R2. Generic Pipeline Preservation
Preserve all existing, frozen functionality for generic specialists (`core-notes`, `core-basic-anki`, `core-cloze-anki`, `core-image-occlusion`, `core-mindmap`, `core-slide-deck`). Do not replace, merge, or move their implementation into Core.

### R3. StudyLab Isolation
StudyLab semantics (molds, hints, DAGs, distractor topologies, etc.) must not exist in Core. Core only retains the "Source-First Distinct Question Rule". StudyLab must remain limited strictly to Math, Reasoning, Physics Numericals, and Chemistry Numericals. Isolate physical StudyLab files where safe, or explicitly document the migration boundary.

### R4. Documentation & Contract Consistency
Audit and resolve contradictions across all documentation (`.agents/README.md`, `OWNERSHIP.md`, `DATA_FLOW.md`, `EXECUTION_LIFECYCLE.md`, `FREEZE_MAP.md`, `AGENTS.md`, `RESOURCES.md`, `SCRIPTS.md`, `SKILLS.md`, `study-source-core/SKILL.md`, `workflow.md`, `subject-skill-contract.md`, and all 9 Subject Skill `SKILL.md` files). Remove obsolete terminology like "Optional Specialist" where incorrect.

### R5. Execution & Validation Constraints
Make the smallest correct changes. Use structured handoffs between exploration and implementation (one owner writes a given file). Do not create new abstractions or persistent agents unless proven necessary. Protect what is already good.

## Acceptance Criteria

### Objective Verification
- [ ] Explicit artifactPolicy tests pass (Subject Skill policy strictly overrides legacy heuristic).
- [ ] Regression tests pass (no pre-existing features or generic pipelines are broken).
- [ ] Routing unit tests and suppression tests pass.
- [ ] Adversarial tests run independently from implementation reasoning.

### Final Victory Criteria
- [ ] All nine Subject Skills individually inspected and confirmed to own their artifact policy.
- [ ] StudyLab conceptually and physically restricted to its four domains; generic specialists retain single-writer ownership.
- [ ] Documentation is mutually consistent and reflects the true architectural boundaries.
- [ ] Independent Victory Auditor explicitly verifies timeline, zero cheating, clean test execution, and correct ownership boundaries across all constraints.

## 2026-09-17T12:33:46Z

Complete the transition of StudyLab into its lightweight Markdown question bank operating mode while keeping procedural intelligence internally, disabling procedural APKG generation in default runtime, cleaning up Notes Mermaid requirements, and certifying the entire pipeline end-to-end.

Working directory: c:\Users\Suraj\Documents\Antigravity\Studycore
Integrity mode: development

## Requirements

### R1. Separate Human-Facing Questions.md from Procedural Internals
- The human-facing `Questions.md` rendered by `render_studylab_question_bank.js` must be a clean, lightweight source-question bank.
- It MUST contain only useful human-facing information:
  - Question statement (verbatim, supporting multi-line & LaTeX math)
  - MCQ options (preserved authentically with original labels)
  - Source/provenance (exam, year, shift, origin tier)
  - Question type (`mcq`, `numerical`, etc.)
  - Topic / pattern when genuinely useful
  - Difficulty when available
  - Original question number / reference when available
- It MUST NOT render:
  - Progressive Hints (Tiers 1, 2, 3)
  - Answers / Correct options
  - Full step-by-step solutions
  - Verification blocks
  - Decision points
  - Trap / error analysis
  - Solution DAG metadata
- All procedural intelligence (hints, solution DAGs, verification, traps) must remain preserved in the internal semantic/procedural representation (e.g. `Optional/<Chapter>_PracticeQuestions.json` / Semantic Learning IR) for future reactivation.
- Update `validate_studylab_question_bank.js` and `studylab-question-bank-contract.md` to enforce this lightweight contract.

### R2. 100% Preservation of Eligible Source Questions
- The canonical Source Question Inventory (SQI) is authoritative.
- Every eligible question in the inventory must be rendered 1:1 into `Questions.md`.
- No arbitrary question-count limits, no representative-question selection, no pattern-based compression.
- Questions sharing a pattern or method must NEVER be collapsed (`1 Pattern != 1 Question`).
- Cardinality invariant:
  $$\text{Eligible SQI Questions} = \text{Questions.md Questions} + \text{Documented Exclusions}$$
- Only true duplicates or corrupt extractions may be excluded, with explicit recorded reasons in `inventory.removals`.
- Every question in `Questions.md` must remain traceable to its `source_question_id`.

### R3. Keep Procedural APKG Disabled in Default Runtime
- Procedural StudyLab APKG remains temporarily sidelined, not deleted.
- Keep APKG compilers, procedural schemas, and exporter scripts intact for future use.
- The default pipeline, artifact registry (`artifact-registry.json`), and subject policy resolvers must NOT attempt to generate or require procedural APKG.
- Audit all downstream tasks (including `bm-qa`, `orchestrator.js`, `context_planner.js`, and validators) to ensure none fail or block when procedural APKG is absent.
- Generic Anki artifacts (`Basic/`, `Cloze/`, and consolidated chapter `<Chapter>_Anki.apkg`) must continue to work normally.

### R4. Notes & Mermaid Contract Cleanup
- Update `core-notes` agent instructions (`.agents/agents/core-notes.md`), `note-architecture.md`, and validators so Mermaid diagrams are strictly optional.
- Mermaid should only be generated when it materially improves conceptual understanding.
- Eliminate all mandatory Mermaid quotas, minimum node counts, or requirements for decorative diagrams.
- Prefer clean GitHub-Flavored Markdown.
- Preserve source-grounding, anti-slop rules, single H1, and heading monotonicity.

### R5. Archive & Internal Procedural Representation
- Ensure that rich procedural metadata (solution DAGs, 3-tier hints, verification, traps) continues to be cleanly archived in the internal artifact location (such as `Optional/<Chapter>_PracticeQuestions.json` and internal IR) without polluting the clean human-facing `Questions.md`.

### R6. Repository-Wide Audit for Stale Contracts
- Search and eliminate stale contradictions across contracts, schemas, agent definitions, and validators:
  - References expecting `### Progressive Hints`, `### Solution`, or `### Verification` inside `Questions.md`.
  - References requiring procedural APKG generation during standard runs.
  - Outdated question count caps or representative selection heuristics.

## Verification Resources & Strategy

### Automated Verification
- Full test suite: `npm test` (running all 28 master test suites in `skills/study-source-core`).
- SQI lossless test suite: `node scripts/test_source_question_inventory.js`.
- Question bank tests: `node scripts/test_studylab_question_bank.js` (updated for lightweight Markdown contract).
- Domain production path suites: `test_math_production_path.js`, `test_physics_production_path.js`, `test_chemistry_production_path.js`, `test_reasoning_production_path.js`.
- Real-world LCM-HCF integration test: verify exact cardinality reconciliation from source fixture $\to$ SQI $\to$ Questions.md.

## Acceptance Criteria

### Human-Facing Questions.md
- [ ] `Questions.md` contains question text, authentic MCQ options, source provenance, question type, topic/pattern, difficulty, and question reference number.
- [ ] `Questions.md` contains NO answers, NO progressive hints, NO full solutions, NO verification blocks, NO decision points, and NO trap/error analyses.
- [ ] `validate_studylab_question_bank.js` passes on the lightweight `Questions.md` output.

### Source Preservation & Cardinality
- [ ] 100 distinct questions under 1 pattern yield exactly 100 questions in `Questions.md`.
- [ ] All eligible questions from SQI are present in `Questions.md` with stable `source_question_id`.
- [ ] In the LCM-HCF end-to-end run, every eligible source question is preserved with 100% cardinality reconciliation:
      $$\text{Raw/Candidate} \to \text{SQI} \to \text{Removals/Exclusions} \to \text{Eligible} = \text{Questions.md}$$

### Procedural APKG & Generic Anki
- [ ] Procedural APKG generation is disabled in the default pipeline and does not run.
- [ ] Downstream QA (`bm-qa`) and packaging succeed without requiring procedural APKG.
- [ ] Generic Anki (`Basic/`, `Cloze/`, `<Chapter>_Anki.apkg`) generates and passes validation.
- [ ] StudyLab procedural code, schemas, and compilers remain preserved and syntactically valid in the repository.

### Notes & Mermaid
- [ ] Notes agent definition (`core-notes.md`) and documentation reflect that Mermaid is strictly optional.
- [ ] No mandatory diagram quotas or minimum node counts are enforced.
- [ ] Existing valid Mermaid diagrams continue to pass `mermaid_validator.js` and `note_contract_audit.js`.

### System Health
- [ ] `npm test` passes 100% with 0 failures across all test suites.
- [ ] `git status` diff is clean, intentional, and free of orphaned debug code or temporary files.
