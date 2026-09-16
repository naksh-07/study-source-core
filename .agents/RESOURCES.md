# Master Resources & Schemas Registry (`RESOURCES.md`)

## 1. Overview & Architecture

StudySourceCore enforces the **Single Source of Truth (SSOT) Principle**: every contract, JSON schema, error taxonomy, language rule, and invariant exists in exactly one canonical file. Subagents and skills reference these canonical files by path rather than duplicating rule text.

### Resource Taxonomies:
- **SCHEMA**: Machine-readable JSON schemas (Draft-07 compliant) validating structured JSON data and binary artifacts.
- **CONTRACT**: Formal markdown interface contracts specifying structural and semantic boundaries.
- **CORE_RULES**: Granular syntax, formatting, and mathematical rules for specific deliverable formats.
- **POLICY**: System-wide governance rules (source grounding, tool budgets, failure recovery).
- **ERROR_TAXONOMY**: Standardized classification of traps, distractors, and calculation errors.
- **TAXONOMY_MAP**: Lookup tables mapping academic topics to capability tracks and problem archetypes.

---

## 2. Master Resource Index Table

| # | Resource Name | Path | Type | Status | SSOT? | Referenced By | Description |
|---|---|---|---|---|---|---|---|
| 1 | `image-occlusion-schema.json` | `skills/study-source-core/resources/image-occlusion-schema.json` | `SCHEMA` | `FROZEN` | YES | `core-image-occlusion`, `validate_image_occlusion.js` | JSON Schema validating Image Occlusion mask coordinates and labels. |
| 2 | `studylab-practice-questions-schema.json` | `skills/study-source-core/resources/studylab-practice-questions-schema.json` | `SCHEMA` | `FROZEN` | YES | StudyLab Specialists, `validate_studylab_practice_questions.js` | JSON Schema validating authentic practice questions (MCQ, Num, Struct). |
| 3 | `studylab-procedural-schema.json` | `skills/study-source-core/resources/studylab-procedural-schema.json` | `SCHEMA` | `FROZEN` | YES | StudyLab Specialists, `validate_studylab_procedural.js` | JSON Schema validating procedural problem patterns and Solution DAGs. |
| 4 | `index.json` | `skills/study-source-core/resources/schemas/index.json` | `SCHEMA` | `FROZEN` | YES | `study-source-core`, `validate_studylab_levels_1_6.js` | Master JSON Schema catalog mapping schemas to validation targets. |
| 5 | `studylab-apkg-manifest.schema.json` | `skills/study-source-core/resources/schemas/studylab-apkg-manifest.schema.json` | `SCHEMA` | `FROZEN` | YES | `export_studylab_procedural_anki.js`, `adversarial-apkg-reviewer` | JSON Schema validating companion manifest metadata for APKGs. |
| 6 | `studylab-apkg-schema.json` | `skills/study-source-core/resources/schemas/studylab-apkg-schema.json` | `SCHEMA` | `FROZEN` | YES | `export_studylab_procedural_anki.js`, `validate_studylab_procedural_apkg.js` | SQLite schema definition for Anki APKG database structure. |
| 7 | `studylab-canonical-contracts.json` | `skills/study-source-core/resources/schemas/studylab-canonical-contracts.json` | `SCHEMA` | `FROZEN` | YES | `test_contracts.js`, `mold-gap-auditor` | Library of 533 canonical StudyLab JSON contracts. |
| 8 | `studylab-domain-evidence.schema.json` | `skills/study-source-core/resources/schemas/studylab-domain-evidence.schema.json` | `SCHEMA` | `FROZEN` | YES | `study-source-core`, `routing_engine.js` | JSON Schema for structured domain evidence extracted from sources. |
| 9 | `studylab-pattern-archetype.schema.json` | `skills/study-source-core/resources/schemas/studylab-pattern-archetype.schema.json` | `SCHEMA` | `FROZEN` | YES | `mold-gap-auditor`, `validate_studylab_procedural.js` | JSON Schema classifying problem patterns into archetypes. |
| 10 | `studylab-practice-item.schema.json` | `skills/study-source-core/resources/schemas/studylab-practice-item.schema.json` | `SCHEMA` | `FROZEN` | YES | StudyLab Specialists, `validate_studylab_practice_questions.js` | JSON Schema defining individual practice items. |
| 11 | `studylab-provenance.schema.json` | `skills/study-source-core/resources/schemas/studylab-provenance.schema.json` | `SCHEMA` | `FROZEN` | YES | `artifact_provenance.js` | JSON Schema validating SHA-256 cryptographic provenance records. |
| 12 | `studylab-rich-content-contract.schema.json` | `skills/study-source-core/resources/schemas/studylab-rich-content-contract.schema.json` | `SCHEMA` | `FROZEN` | YES | `latex_validator.js`, `study-source-core` | JSON Schema enforcing LaTeX, SVG, and HTML formatting in cards. |
| 13 | `studylab-solution-graph.schema.json` | `skills/study-source-core/resources/schemas/studylab-solution-graph.schema.json` | `SCHEMA` | `FROZEN` | YES | StudyLab Specialists, `validate_studylab_levels_1_6.js` | JSON Schema governing procedural solution DAGs and step networks. |
| 14 | `studylab-topic-capability-map.json` | `skills/study-source-core/resources/schemas/studylab-topic-capability-map.json` | `TAXONOMY_MAP` | `FROZEN` | YES | `routing_engine.js` | Registry mapping 175 topics to StudyLab procedural capabilities. |
| 15 | `studylab-validation-contract.json` | `skills/study-source-core/resources/schemas/studylab-validation-contract.json` | `SCHEMA` | `FROZEN` | YES | `validate_studylab_levels_1_6.js` | Multi-level audit criteria schema for verifying procedural learning. |
| 16 | `agent-recovery.md` | `skills/study-source-core/resources/agent-recovery.md` | `POLICY` | `ACTIVE` | YES | `study-source-core`, all agents | Agent failure isolation, 1-retry targeted error correction, circuit breakers. |
| 17 | `anki-core-rules.md` | `skills/study-source-core/resources/anki-core-rules.md` | `CORE_RULES` | `ACTIVE` | YES | `core-basic-anki`, `core-cloze-anki`, `validate_tsv.js` | Canonical TSV formatting and bilingual syntax rules for Anki cards. |
| 18 | `image-occlusion-contract.md` | `skills/study-source-core/resources/image-occlusion-contract.md` | `CONTRACT` | `ACTIVE` | YES | `core-image-occlusion`, `validate_image_occlusion.js` | Coordinate normalization, bounding box rules, and SVG masking contracts. |
| 19 | `large-source-orchestration.md` | `skills/study-source-core/resources/large-source-orchestration.md` | `POLICY` | `ACTIVE` | YES | `study-source-core` | Chunking strategies, token budgeting, multi-pass intake for large PDFs. |
| 20 | `map-core-rules.md` | `skills/study-source-core/resources/map-core-rules.md` | `CORE_RULES` | `ACTIVE` | YES | `core-image-occlusion`, `Map/SKILL.md` | Geospatial entity extraction and coordinate normalization rules. |
| 21 | `map-schema.md` | `skills/study-source-core/resources/map-schema.md` | `CONTRACT` | `ACTIVE` | YES | `core-mindmap`, `validate_map.js` | Map metadata JSON formatting guidelines and bounding box specs. |
| 22 | `map-validation-rules.md` | `skills/study-source-core/resources/map-validation-rules.md` | `CONTRACT` | `ACTIVE` | YES | `validate_map.js` | Map asset bounding box, coordinate range, and landmark validation rules. |
| 23 | `note-architecture.md` | `skills/study-source-core/resources/note-architecture.md` | `CONTRACT` | `ACTIVE` | YES | `core-notes`, `bm-graph`, `note_contract_audit.js` | Obsidian note structural layout, callouts, and YAML metadata contract. |
| 24 | `slide-deck-core-rules.md` | `skills/study-source-core/resources/slide-deck-core-rules.md` | `CORE_RULES` | `ACTIVE` | YES | `core-slide-deck`, `slide_deck_prompt_audit.js` | Marp slide syntax, 12 mandatory sections, 5–15 slide budget. |
| 25 | `source-policy.md` | `skills/study-source-core/resources/source-policy.md` | `POLICY` | `ACTIVE` | YES | `study-source-core`, `bm-qa`, `source_invariant_checker.js` | Source ground truth invariance, anti-hallucination, copyright hygiene. |
| 26 | `studylab-procedural-contract.md` | `skills/study-source-core/resources/studylab-procedural-contract.md` | `CONTRACT` | `ACTIVE` | YES | StudyLab Specialists, `validate_studylab_levels_1_6.js` | Master StudyLab procedural contract governing Levels 1 through 7. |
| 27 | `subject-skill-contract.md` | `skills/study-source-core/resources/subject-skill-contract.md` | `CONTRACT` | `ACTIVE` | YES | All 9 subject skills | Standardized interface contracts, hooks, and lifecycle policies for skills. |
| 28 | `tool-orchestration.md` | `skills/study-source-core/resources/tool-orchestration.md` | `POLICY` | `ACTIVE` | YES | `study-source-core` | Subagent dispatch limits, tool call budgets, and concurrency caps. |
| 29 | `validation-rules.md` | `skills/study-source-core/resources/validation-rules.md` | `CONTRACT` | `ACTIVE` | YES | `bm-qa`, `cross_artifact_checker.js` | Cross-artifact validation criteria, pass/fail quality gates, error thresholds. |
| 30 | `visual-learning-contract.md` | `skills/study-source-core/resources/visual-learning-contract.md` | `CONTRACT` | `ACTIVE` | YES | `core-image-occlusion`, `resolve_visual_asset.js` | Visual asset discovery, image processing, media resolution pipeline. |
| 31 | `workflow.md` | `skills/study-source-core/resources/workflow.md` | `POLICY` | `ACTIVE` | YES | `study-source-core` | End-to-end 10-phase pipeline execution workflow specification. |
| 32 | `anti-fallback-invariant.md` | `skills/study-source-core/resources/studylab/anti-fallback-invariant.md` | `POLICY` | `ACTIVE` | YES | StudyLab Specialists, `adversarial-apkg-reviewer` | Inviolable ban on generic fallback flashcards for procedural skills. |
| 33 | `domain-boundaries.md` | `skills/study-source-core/resources/studylab/domain-boundaries.md` | `CONTRACT` | `ACTIVE` | YES | `mold-gap-auditor`, `study-source-core` | Architectural separation of Concepts vs Patterns vs Practice Items. |
| 34 | `error-taxonomies.md` | `skills/study-source-core/resources/studylab/error-taxonomies.md` | `ERROR_TAXONOMY` | `ACTIVE` | YES | StudyLab Specialists | Classification of 14 procedural traps, calculation errors, distractors. |
| 35 | `manifest-spec.md` | `skills/study-source-core/resources/studylab/manifest-spec.md` | `CONTRACT` | `ACTIVE` | YES | `export_studylab_procedural_anki.js`, `mold-gap-auditor` | Specification for StudyLab APKG companion manifest metadata. |
| 36 | `problem-patterns.md` | `skills/study-source-core/resources/studylab/problem-patterns.md` | `TAXONOMY_MAP` | `ACTIVE` | YES | StudyLab Specialists | Pattern taxonomy from Level 0 Authentic to Level 5 Transfer. |
| 37 | `source-first-practice-universe.md` | `skills/study-source-core/resources/studylab/source-first-practice-universe.md` | `POLICY` | `ACTIVE` | YES | `study-source-core`, StudyLab Specialists | Source-First Practice Universe principles and practice prioritization. |
| 38 | `validation-protocol.md` | `skills/study-source-core/resources/studylab/validation-protocol.md` | `CONTRACT` | `ACTIVE` | YES | `validate_studylab_levels_1_6.js`, `adversarial-apkg-reviewer` | Step-by-step Level 1–7 procedural artifact verification protocol. |

---

## 3. Single Source of Truth Canonical Contracts

To eliminate rule duplication across agent definitions and skills, the following canonical contracts are defined as authoritative single sources of truth:

### 3.1 Universal Language Contract
- **Anchor**: `#universal-language-contract`
- **Rule**: All explanatory prose and pedagogical commentary MUST be written in **Hindi-first** conversational style, with standard **English technical terminology** provided immediately inside parentheses `( )`.
- **Example**: `प्रतिशत (Percentage) का मूल अर्थ प्रति सौ (per hundred) होता है।`
- **Prohibition**: Pure English explanatory prose without Hindi is a hard validation failure.

### 3.2 Empty Card Short-Circuit Invariant
- **Anchor**: `#empty-card-short-circuit`
- **Rule**: When `routing_engine.js` computes a candidate count of 0 for a given artifact track (`basicCandidateCount === 0`, `clozeCandidateCount === 0`, `io_candidates === 0`), dispatch for that specialist is **suppressed** with a documented status code (`ZERO_BASIC_CANDIDATES`, `ZERO_CLOZE_CANDIDATES`, `NO_IO_CANDIDATES`).
- **Behavior**: The build succeeds cleanly; no empty 0-byte TSVs, dummy JSON manifests, or corrupted archives are emitted.
