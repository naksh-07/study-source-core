# Master Scripts Registry (`SCRIPTS.md`)

## 1. Overview & Architecture

StudySourceCore maintains 39 executable tools and test suites organized into functional categories to support intake, routing, packaging, verification, and audit. All scripts run in Node.js or Python 3 environments and follow strict exit code conventions (`0` = Success, `1` = Failure/Violation).

### Script Taxonomies:
- **ROUTING**: Evaluates source evidence and computes deterministic subagent dispatch.
- **PACKAGING**: Compiles intermediate text, JSON, and SVG assets into binary `.apkg` packages.
- **VALIDATION**: Enforces syntactic, semantic, and structural contract compliance.
- **PROVENANCE**: Computes and verifies cryptographic SHA-256 evidence lineages.
- **AUDIT**: Performs AST, Markdown, link, and frontmatter structural inspections.
- **UTILITY**: Helper modules for path resolution, transient cleanup, and asset management.
- **TRANSIENT_TEST**: Comprehensive unit, regression, and adversarial test harnesses.

---

## 2. Operational, Packaging, Routing & Utility Scripts (30 Scripts)

| Script Name | Category | Runner / Language | Purpose & Scope | Primary Invoker | Status |
|---|---|---|---|---|---|
| `artifact_provenance.js` | `PROVENANCE` | Node.js | Computes and verifies SHA-256 cryptographic hashes for all pipeline deliverables. | `project_orchestrator` / Physical Verification Gate | `ACTIVE` |
| `author_math_studylab.js` | `SPECIALIST` | Node.js | Authors 17-dimension canonical procedural content from raw Math evidence, enforcing non-leaking hints and rendering/validating deliverables. | `math-apkg-author` (Wave 1) | `ACTIVE` |
| `build_demo_apkg.js` | `UTILITY` | Node.js | Builds standalone demo APKG packages for pipeline smoke tests and visual checks. | CI Test Runner / Developer | `UTILITY` |
| `cleanup_transients.js` | `UTILITY` | Node.js | Safely cleans up temporary build files while strictly preserving user deliverables. | `project_orchestrator` | `ACTIVE` |
| `cross_artifact_checker.js` | `VALIDATION` | Node.js | Cross-checks factual consistency and structural alignment across Notes, Anki, Mindmap, Slides. | `bm-qa` | `ACTIVE` |
| `export_anki.js` | `PACKAGING` | Node.js | Compiles Basic, Cloze, and Image Occlusion artifacts into a standard Anki `.apkg`. | `project_orchestrator` (Wave 2) | `ACTIVE` |
| `export_studylab_procedural_anki.js` | `PACKAGING` | Node.js | Compiles StudyLab procedural problem patterns, solution DAGs, and 3-tier hints into interactive APKGs. | StudyLab Specialist Agents (Wave 1) | `FROZEN` |
| `latex_validator.js` | `VALIDATION` | Node.js | Validates LaTeX math syntax, equation delimiters, environments, fractions, and symbols. | `math-apkg-author`, `physics-numerical-apkg-author`, `bm-qa` | `ACTIVE` |
| `link_audit.js` | `AUDIT` | Node.js | Audits Obsidian wikilinks across Markdown notes and verifies absence of dead links. | `bm-graph` | `ACTIVE` |
| `markdown_audit.js` | `AUDIT` | Node.js | Audits markdown formatting, header hierarchies, code blocks, and callouts. | `core-notes` | `ACTIVE` |
| `mcq_blackbox_validator.js` | `VALIDATION` | Node.js | Performs black-box testing on MCQ options: asserts $\ge 4$ options and 1 valid key. | `adversarial-apkg-reviewer` | `ACTIVE` |
| `mermaid_validator.js` | `VALIDATION` | Node.js | Validates Mermaid diagram and mindmap syntax, node connections, and formatting. | `core-mindmap` | `ACTIVE` |
| `note_contract_audit.js` | `AUDIT` | Node.js | Verifies YAML frontmatter metadata, required structural sections, and note architecture. | `core-notes` | `ACTIVE` |
| `path_resolver.js` | `UTILITY` | Node.js | Normalizes paths across Windows backslashes and POSIX forward slashes. | All scripts and agents | `ACTIVE` |
| `pdf_inventory.py` | `UTILITY` | Python 3 | Extracts page counts, metadata, and structural outlines from source PDFs during intake. | `project_orchestrator` | `ACTIVE` |
| `render_studylab_question_bank.js` | `RENDERER` | Node.js | Deterministically renders canonical StudyLab procedural questions into Obsidian Markdown. | Procedural Specialists (Wave 1) | `ACTIVE` |
| `resolve_visual_asset.js` | `UTILITY` | Node.js | Resolves local visual image paths and computes asset cryptographic hashes. | `core-image-occlusion` | `ACTIVE` |
| `routing_engine.js` | `ROUTING` | Node.js | Evaluates chapter content and computes required artifact tracks and subagent dispatch. | `project_orchestrator` | `ACTIVE` |
| `shared_anki_utils.js` | `UTILITY` | Node.js | Shared helper library for SQLite collections, model definitions, and Anki zip packaging. | `export_anki.js`, `export_studylab_procedural_anki.js` | `FROZEN` |
| `slide_deck_prompt_audit.js` | `AUDIT` | Node.js | Audits Marp slide presentation formatting, slide counts (5–15), and theme headers. | `core-slide-deck` | `ACTIVE` |
| `source_invariant_checker.js` | `VALIDATION` | Node.js | Asserts zero hallucinations and verifies strict factual preservation from source evidence. | `bm-qa` | `ACTIVE` |
| `validate_apkg.js` | `VALIDATION` | Node.js | Validates SQLite database tables, card counts, note models, and zip structure in APKGs. | `project_orchestrator` / CI | `ACTIVE` |
| `validate_image_occlusion.js` | `VALIDATION` | Node.js | Validates Image Occlusion JSON manifests and SVG bounding box coordinates ($[0..100]$). | `core-image-occlusion` | `ACTIVE` |
| `validate_map.js` | `VALIDATION` | Node.js | Validates geospatial bounding boxes, lat/long coordinates, and landmark metadata. | `core-image-occlusion` | `ACTIVE` |
| `validate_studylab_levels_1_6.js` | `VALIDATION` | Node.js | Multi-stage validator verifying StudyLab procedural integrity across Levels 1 to 6. | StudyLab Specialists | `ACTIVE` |
| `validate_studylab_levels_1_7.js` | `VALIDATION` | Node.js | Top-level execution harness for end-to-end Level 1–7 validation including compiled APKG. | `project_orchestrator` / Physical Gate | `ACTIVE` |
| `validate_studylab_practice_questions.js` | `VALIDATION` | Node.js | Validates JSON syntax and pedagogical quality of authentic practice questions. | StudyLab Specialists | `ACTIVE` |
| `validate_studylab_procedural.js` | `VALIDATION` | Node.js | Validates StudyLab procedural problem patterns against domain rules and schemas. | StudyLab Specialists | `ACTIVE` |
| `context_planner.js` | `PROVENANCE` | Node.js | Generates task-scoped context slices with token budgeting and SHA-256 provenance verification. | Orchestrator (`orchestration_engine.js`) | `ACTIVE` |
| `model_routing_policy.js` | `ROUTING` | Node.js | Dynamically routes tasks to CHEAP, DEFAULT, or STRONG capability classes based on complexity and context size. | Orchestrator (`orchestration_engine.js`) | `ACTIVE` |
| `retry_policy.js` | `ROUTING` | Node.js | Classifies failures into 11 failure classes and 4 retry classes, enforcing mission ceilings and targeted adaptations. | Orchestrator (`orchestration_engine.js`) | `ACTIVE` |
| `execution_state.js` | `UTILITY` | Node.js | Checkpoints task lifecycle states, model decisions, and completion records into `scratch/execution-state.json`. | Orchestrator (`orchestration_engine.js`) | `ACTIVE` |
| `validate_studylab_procedural_apkg.js` | `VALIDATION` | Node.js | Deep validator for procedural SQLite schema, Anki Model 1600000004 fields, and options. | `adversarial-apkg-reviewer` | `ACTIVE` |
| `validate_studylab_question_bank.js` | `VALIDATION` | Node.js | Validates canonical Question Bank JSON schemas and rendered Markdown Question Bank files. | Procedural Specialists / `orchestration_engine` | `ACTIVE` |
| `validate_tsv.js` | `VALIDATION` | Node.js | Validates TSV structure, tab delimiters, and field counts for Basic and Cloze cards. | `core-basic-anki`, `core-cloze-anki` | `ACTIVE` |
| `vault_indexer.js` | `UTILITY` | Node.js | Indexes Markdown notes, headers, wikilinks, and tags across the Obsidian vault. | `bm-graph` | `ACTIVE` |
| `yaml_validator.js` | `VALIDATION` | Node.js | Validates YAML syntax in Markdown frontmatter and configuration manifests. | `core-notes` | `ACTIVE` |

---

## 3. Test Suites & Verification Harnesses (9 Test Suites)

| Test Suite Script | Path | Runner | Purpose & Invariants Asserted | Invoker | Status |
|---|---|---|---|---|---|
| `test_adversarial_auditor.js` | `scripts/test_adversarial_auditor.js` | Node.js | 15-Point adversarial attack suite testing tamper detection, schema corruptions, and anti-leak rules. | `adversarial-apkg-reviewer` / CI | `FROZEN` |
| `test_contracts.js` | `scripts/test_contracts.js` | Node.js | Master contract suite covering 111 end-to-end invariant checks across all pipeline artifacts. | CI Test Runner | `FROZEN` |
| `test_final_audit_harness.js` | `scripts/test_final_audit_harness.js` | Node.js | Final audit harness verifying complete pipeline deliverable integrity and quality gates. | `bm-qa` / CI Test Runner | `FROZEN` |
| `test_fresh_profile_simulation.js` | `scripts/test_fresh_profile_simulation.js` | Node.js | Simulates clean Anki profile import to prevent ID collisions and model conflicts. | CI Test Runner | `FROZEN` |
| `test_l1_l7_proof_suite.js` | `scripts/test_l1_l7_proof_suite.js` | Node.js | Proof suite asserting anti-cheat and real Level 1 through Level 7 procedural compliance. | CI Test Runner | `FROZEN` |
| `test_math_production_path.js` | `scripts/test_math_production_path.js` | Node.js | Master production path test asserting source -> evidence -> routing -> specialist -> render -> validation without hardcoded test questions. | CI Test Runner | `ACTIVE` |
| `test_non_studylab_regression.js` | `scripts/test_non_studylab_regression.js` | Node.js | Regression suite for standard descriptive and non-procedural chapter runs. | CI Test Runner | `FROZEN` |
| `test_orchestration.js` | `scripts/test_orchestration.js` | Node.js | Unit tests verifying adaptive orchestrator dispatch rules, gating, and concurrency limits. | CI Test Runner | `FROZEN` |
| `test_phase40_canonical.js` | `scripts/test_phase40_canonical.js` | Node.js | Phase 40 canonical test suite asserting procedural execution across Math, Physics, Chem, Reasoning. | CI Test Runner | `FROZEN` |
| `test_phase7_context_routing.js` | `scripts/test_phase7_context_routing.js` | Node.js | Phase 7 multi-tier test suite (20 tests) asserting context minimization, model routing, adaptive retry, state checkpointing, and resource limits. | CI Test Runner (`npm test`) | `ACTIVE` |
| `test_regression.js` | `scripts/test_regression.js` | Node.js | High-level sanity regression runner for core pipeline components. | CI Test Runner | `FROZEN` |

---

## 4. Script Usage & CLI Reference

### Ingestion & Intake
```powershell
# Extract structural outline from raw source PDF
python .agents/skills/study-source-core/scripts/pdf_inventory.py --pdf "Sources/Maths_Ch1.pdf"

# Evaluate routing and generate subagent dispatch manifest
node .agents/skills/study-source-core/scripts/routing_engine.js --evidence "scratch/evidence-pack.md"
```

### Formatting & Syntax Validation
```powershell
# Validate 3-column Basic/Cloze TSV formatting
node .agents/skills/study-source-core/scripts/validate_tsv.js --file "Basic/Percentage_Basic.tsv"

# Validate Obsidian note frontmatter and heading monotonicity
node .agents/skills/study-source-core/scripts/note_contract_audit.js --file "Notes/Percentage_Notes.md"

# Validate Image Occlusion JSON manifest coordinates
node .agents/skills/study-source-core/scripts/validate_image_occlusion.js --manifest "ImageOcclusion/Percentage_IO_Manifest.json"

# Validate Marp slide presentation format and slide budget
node .agents/skills/study-source-core/scripts/slide_deck_prompt_audit.js --file "SlideDecks/Percentage_Slides.md"
```

### StudyLab Procedural Compilation & Verification
```powershell
# Validate practice questions JSON
node .agents/skills/study-source-core/scripts/validate_studylab_practice_questions.js --file "PracticeQuestions/PracticeQuestions.json"

# Validate procedural problem patterns JSON
node .agents/skills/study-source-core/scripts/validate_studylab_procedural.js --file "Procedural/ProceduralPatterns.json"

# Compile interactive StudyLab APKG binary
node .agents/skills/study-source-core/scripts/export_studylab_procedural_anki.js --questions "PracticeQuestions/PracticeQuestions.json" --patterns "Procedural/ProceduralPatterns.json" --output "StudyLab/Math_Procedural.apkg"

# Deep validation of compiled procedural APKG
node .agents/skills/study-source-core/scripts/validate_studylab_procedural_apkg.js --apkg "StudyLab/Math_Procedural.apkg" --manifest "StudyLab/Math_Procedural.manifest.json"

# Full Level 1 through Level 7 verification
node .agents/skills/study-source-core/scripts/validate_studylab_levels_1_7.js --chapter "Study Materials/Maths/Percentage"
```

### Master Verification Harnesses
```powershell
# Execute 111-contract invariant test suite
node .agents/skills/study-source-core/scripts/test_contracts.js

# Execute 15-point adversarial attack test harness
node .agents/skills/study-source-core/scripts/test_adversarial_auditor.js

# Execute full regression test suite
node .agents/skills/study-source-core/scripts/test_regression.js
```
