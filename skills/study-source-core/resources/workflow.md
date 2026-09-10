# Study Source Processing Workflow

This document details the repeatable execution sequence for the `study-source-core` orchestration engine. 
This workflow is managed by the orchestrator agent to transform authorized study sources into parallel sibling outputs.

## Phase 1: INTAKE & INVENTORY (Sequential)
Before any knowledge extraction begins, physically inspect the source set to establish the baseline.
- **Identify**: User request, requested artifacts, authorized source boundary, subject, chapter/topic, and expected output folder.
- **Inventory**: Determine filename(s), file type(s), file size, total page count, text availability (is it a scan?), and whether there are embedded images or diagrams.
- **STRICT PDF RULE (NON-NEGOTIABLE)**: Under NO circumstances should the `view_file` tool be used for inventorying, opening, inspecting, or viewing PDF files. Using `view_file` on raw binary PDFs risks loading massive base64 or raw file bytes into context, causing token limit crashes.
- **Mandatory PDF Inventory Execution**: For all PDF source inventorying, the orchestrator MUST execute `python scripts/pdf_inventory.py <directory_path>` (or `python .agents/skills/study-source-core/scripts/pdf_inventory.py <directory_path>`) to extract exact file statistics (filename, file size, page count).
- **Governance Constraint**: Default to `SOURCE_ONLY`. Zero web searches or model memory factual injections unless explicitly requested.

## Phase 2: CLASSIFICATION (Sequential)
Based on the inventory, classify the source complexity into one or more execution modes:
- **SMALL**: Simple text, small context window footprint.
- **MEDIUM**: E.g., short chapters, medium PDFs.
- **LARGE**: E.g., full books, large manuals exceeding practical context limits.
- **MULTIMODAL**: Contains critical visual information (maps, diagrams) requiring visual inspection.
- **SCANNED**: Requires OCR fallback due to lack of a native text layer.
- **MULTI-FILE**: A directory of materials requiring deduplication and role assignment.
- **DIFFICULT**: Corrupted files or password protection requiring targeted recovery.

## Phase 3: SOURCE PLAN & RETRIEVAL PLAN (Sequential)
Define the extraction strategy based on the classification and [tool-orchestration.md](file:///.agents/skills/study-source-core/resources/tool-orchestration.md).
- **Adaptive Retrieval**: Use full-context/native retrieval when practical and safe. Use chunking (batching) when source size/complexity makes wholesale processing inefficient or unsafe. Do NOT blindly chunk everything, and do NOT force full-context processing if it exceeds the model's reliability limits.
- **Execution State tracking**: For Medium/Large/Multi-File sources, maintain a deterministic, machine-readable JSON state file (`scratch/execution-state.json`) to track `pending`, `complete`, or `failed` sections. 
  - **Resume Rule**: If resuming from an interruption, skip `complete` sections. Only process `pending` or `failed` sections. Do NOT rely on LLM conversational memory to track large batch coverage.

## Phase 4: KNOWLEDGE EXTRACTION & SHARED EVIDENCE (Mandatory Sequential)
Generating the **Authorized Evidence Pack** is an **absolute, non-negotiable requirement** for EVERY study material request. This step MUST trigger automatically regardless of prompt length or source size, and must NEVER be skipped or treated as an optional enhancement.
- Extract knowledge centrally to build the **Authorized Evidence Pack** (`scratch/evidence-pack-[section].md` or `scratch/evidence-pack.md`) before parallelizing.
- **Optimized Visual Profiling (Finding 5)**: Formulate the **Transient Visual Profile** (`dominant_structures`, `visual_opportunities`, `deck_worthiness`, `io_worthiness`, `io_candidates`) ONLY when the source contains or warrants visual/spatial inspection. Skip expensive visual profiling when the source is deterministically non-visual.
- The **Authorized Evidence Pack** preserves:
  1. Source identity
  2. Section/page/range boundaries
  3. Extracted evidence (text/visual facts, coordinate anchors, formulas, authentic solvable questions/PYQs)
  4. Uncertainty/limitations
- *Do NOT pass raw source dumps to downstream subagents.* All downstream workers must be seeded ONLY with this compact Authorized Evidence Pack.

## Phase 4.5: MANDATORY DISPATCH GATE & ARTIFACT ROUTING (Deterministic Engine)
Before initiating artifact authoring, the orchestrator evaluates the **Mandatory Dispatch Gate**:

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           MANDATORY DISPATCH GATE                                │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 1. Multiple domains / sibling representations (Notes + Anki + IO + MindMap)?     │
│ 2. Independent investigation or authoring scopes across layers?                  │
│ 3. High-risk architectural, schema, or packaging changes?                        │
│ 4. Complex multi-artifact generation requiring parallel specialist attention?    │
├──────────────────────────────────────────────────────────────────────────────────┤
│ IF ANY = YES ──► SUBAGENT DISPATCH REQUIRED via invoke_subagent                  │
│ IF ALL = NO  ──► PARENT MAY EXECUTE DIRECTLY (Trivial 1-file or typo tasks only) │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Phase 4: ARTIFACT DISPATCH & SUBJECT DELEGATION (Parallel Wave 1)
Using the authorized `scratch/evidence-pack.md`, the coordinator determines the subject context (e.g. `subject: Math`).

### 4.1: Subject Policy Runtime Determinism
The orchestrator MUST invoke the **Subject Policy Resolver** (`scripts/subject_policy_resolver.js`) to load the deterministic, machine-readable `runtime-policy.json` for the given subject. 
- Core acts strictly as a policy CONSUMER.
- Core MUST NOT infer missing policy from evidence.
- The Subject Agent LLM is no longer responsible for dynamically synthesizing artifact policy.
- The `subject-skill-manifest.json` acts exclusively as a metadata registry/capability directory, not a policy source.

The authoritative artifact ownership, writer, validator, dependency, and execution metadata is defined in `resources/artifact-registry.json`.

## Phase 5: PARALLEL SPECIALIST DISPATCH & STRUCTURED HANDOFF BARRIER

### 1. Specialist Subagent Dispatch
Invoke ONLY eligible specialist subagents concurrently using native `invoke_subagent` (respecting max 4 concurrent subagents).

The exact subagents to invoke, their expected outputs, and eligibility conditions are strictly determined by mapping the subject's `runtime-policy.json` against `resources/artifact-registry.json`.

- **Subagent Contract**: Every invoked subagent MUST be seeded with: exact evidence boundary, `SOURCE_ONLY` instruction, Hindi-first contract, relevant Subject Skill path, expected output path, validation requirements, and the explicit rule "do not research outside supplied evidence".

### 2. Structured Handoff Barrier & Synthesis
Every specialist returns the canonical structured handoff block defined in [`EXECUTION_LIFECYCLE.md#structured-handoff-schema`](file:///c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI%20Notes/EXECUTION_LIFECYCLE.md#structured-handoff-schema).

### 3. Single-Writer Rule & Workforce Collapse
- **Single Controlled Writer**: The parent (or designated single writer) resolves any inter-artifact references and coordinates final writes.
- **Workforce Collapse**: As soon as specialist discovery/authoring completes, active subagents are terminated via `manage_subagents(Action='kill', ConversationIds=[...])` and the orchestrator outputs `WORKFORCE COLLAPSE`.

## Phase 5.5: UNIFIED ANKI PACKAGE ASSEMBLY (Sequential)
Upon generation of memory layer outputs, the coordinator executes the unified Anki exporter:
- **Assembly Command**: `node .agents/skills/study-source-core/scripts/export_anki.js [path_to_chapter_dir]`
- **Action**: Combines existing `Basic/[Chapter]_Basic.tsv`, `Cloze/[Chapter]_Cloze.tsv`, and `ImageOcclusion/[Chapter]_ImageOcclusion.json` (along with bundled media) into `[Chapter]_Anki.apkg`.
- **Short-Circuit Rule**: If 0 total cards exist across all three declarative types, `export_anki.js` cleanly suppresses creating an empty `.apkg`.

## Phase 5.6: STUDYLAB PROCEDURAL PACKAGE ASSEMBLY (By StudyLab Specialists in Wave 1)
If solvable practice questions or rich procedural contracts exist:
- **Assembly Command**: `node .agents/skills/study-source-core/scripts/export_studylab_procedural_anki.js [path_to_chapter_dir]`
- **Action**: Invoked exclusively by StudyLab Specialists to package procedural content into `StudyLab/[Chapter]_StudyLab_Procedural.apkg` according to the relevant specialist contract.
- **Self-Contained APKG Invariant**: The APKG must be portable and self-contained, requiring zero external database pre-seeding.
- **Multiple-Questions-Per-Pattern (`1 Pattern != 1 Question`)**: Each solvable question retains its distinct card and ID; questions are never collapsed into a single pattern anchor.
- **Packaging Gate**: If 0 solvable questions exist (e.g. only ReferenceOnly items), procedural APKG generation is cleanly suppressed (`ZERO_SOLVABLE_PRACTICE_QUESTIONS`) while preserving `ProblemPatterns.md`, `ProblemPatterns.json`, and `PracticeQuestions.json`.
- **Hard Learner-State Isolation**: Learner runtime persistence (`SkillState`, `PracticeAttempt`, mastery, latency) is kept strictly inside `procedural.db` and outside the APKG payload.

## Phase 6: PHYSICAL VALIDATION & RISK-SCALED INDEPENDENT VERIFIER (Sequential)
Physically run validators ONLY for generated artifacts.

The exact validator script for each artifact is defined by the `validator` field in `resources/artifact-registry.json`. Execute the declared validator for each artifact that was generated.

### Independent Verifier Dispatch (For High-Risk / Release Work)
For high-risk changes (core contract, schema, release freeze, multi-module modifications):
- Dispatch an **Independent Verifier** subagent (`TypeName='self'` or `research`).
- Verifier inspects: diff, test suites, integration correctness, original user prompt requirements, regression safety, hidden coupling.
- Verifier returns: `PASS`, `PASS WITH RISKS`, or `FAIL`.

## Phase 7: TARGETED RECOVERY ENGINE & ORCHESTRATION FAILURE RECOVERY
- **Failure Isolation**: A failure in one generated artifact MUST NOT destroy or invalidate successful sibling artifacts. Only the failed artifact enters recovery.
- **Executable Recovery Loop**: `GENERATE -> VALIDATE -> CLASSIFY FAILURE -> LOCAL REPAIR -> VALIDATE AGAIN -> ESCALATE ONLY IF NECESSARY`.
- **Orchestration Failure Recovery**: If delegation is triggered but subagent creation fails:
  1. Diagnose why dispatch failed.
  2. Retry dispatch once.
  3. If still unavailable, output `DELEGATION UNAVAILABLE`, proceed parent-only ONLY if safe, and record the loss of independent verification.

## Phase 8: COVERAGE CHECK & FORMAL GAP AUDIT
- Consult the `scratch/execution-state.json` file.
- Distinguish the final coverage status as **COMPLETE**, **PARTIAL**, **FAILED**, or **NOT_PROCESSED**.
- For procedural chapters, execute the formal **Content Coverage Gap Matrix**:
  - Produce table: `Pattern | Solvable Questions | ReferenceOnly | PYQs | Curated | Generator Capability`.
  - Honestly report patterns lacking practice questions without synthetic fabrication.
- Ensure all artifacts are written to the correct Chapter-First directory structure.

## Phase 9: CROSS-ARTIFACT CONSISTENCY (Sequential)
Execute `node scripts/cross_artifact_checker.js` across existing artifacts:
- Ensure major source concepts are represented appropriately.
- Ensure no factual leakage or contradictions exist between sibling artifacts.
- Verify pattern linkage consistency between `ProblemPatterns.json` and `PracticeQuestions.json`.

## Phase 10: DOWNSTREAM GRAPH & QA (Complexity-Gated)
Evaluate complexity gate using `scripts/routing_engine.js`:
- **`bm-graph`**: Run only when non-trivial note length ($\ge 350$ words or $\ge 800$ evidence chars) AND candidate vault/MindMap targets exist. Proposes semantic Wikilinks. Suppress for trivial content with recorded reason.
- **`bm-qa`**: Run only when source complexity ($\ge 400$ words or $\ge 3$ artifacts or complex procedural domain) justifies semantic audit. Suppress for trivial content with recorded reason.

## Phase 11: TRANSIENT ARTIFACT CLEANUP & WORKFORCE SUMMARY
- **Automated Transient Cleanup**: Execute `node scripts/cleanup_transients.js` to safely clean run-specific temporary files (`scratch/evidence-pack*.md`, `scratch/chunk-*.md`, `scratch/rejected-*.json`, `*.tmp`).
- **State Preservation**: On failed or incomplete runs, preserve `scratch/execution-state.json` for deterministic resumption.
- **Packaging Inputs**: Basic/Cloze TSVs and Image Occlusion packaging inputs are cleaned from user-facing directory upon successful APKG validation; provenance is retained in `.build/artifact-manifest.json`.
- **Preserve Deliverables**: Final Knowledge Note, `[Chapter]_Anki.apkg`, StudyLab procedural APKG, MindMap, Slide Deck, ProblemPatterns, PracticeQuestions, and `.build/artifact-manifest.json`.
- **Workforce Summary**: Output final metrics (`WORKFORCE SUMMARY`: launched, completed, collapsed, failed, reused).
