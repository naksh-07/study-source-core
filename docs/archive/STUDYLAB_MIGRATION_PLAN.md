# StudyLab Physical Isolation: Future Migration Plan

## Context
During the vNext Architectural Refactor, we successfully eliminated the conceptual and semantic coupling of StudyLab from the Core engines (`routing_engine.js` and `orchestration_engine.js`). 
- Core no longer interprets StudyLab semantics like `question_type` or `standard_algorithm`.
- Core no longer imports StudyLab-specific validators.
- Routing purely respects the Subject Skill's `artifactPolicy` while enforcing safety capability gates (via Manifest).

## Current State
The files implementing StudyLab logic (compilation, validation, blackbox testing) still reside in the generic `scripts/` directory alongside Core scripts:
- `export_studylab_procedural_anki.js`
- `validate_studylab_levels_1_6.js`
- `validate_studylab_levels_1_7.js`
- `validate_studylab_practice_questions.js`
- `validate_studylab_procedural.js`
- `validate_studylab_procedural_apkg.js`
- `mcq_blackbox_validator.js`
- `test_l1_l7_proof_suite.js`
- `test_adversarial_auditor.js`

## Why Migration Was Paused
Physical migration of these files into a `scripts/studylab/` directory was safely paused to avoid breaking:
1. **Agent Manifests:** `math-apkg-author.md`, `reasoning-apkg-author.md`, `physics-numerical-apkg-author.md`, and `chemistry-numerical-apkg-author.md` directly reference these scripts by their explicit path (`scripts/export_studylab_procedural_anki.js`).
2. **Cross-Tests:** Shared testing infrastructure depends on the current relative paths.
3. **Core Documentation:** `.agents/AGENTS.md` and `.agents/SCRIPTS.md` hardcode these paths.

*As per the refactor guidelines: "If physical migration risks breaking unrelated infrastructure: DO NOT perform the migration. Instead: preserve the file, remove unnecessary conceptual coupling, document the migration boundary, add a safe future migration plan."*

## Future Migration Plan
To safely physically isolate StudyLab files into `scripts/studylab/` in the future:
1. Move the aforementioned `*studylab*` scripts, `mcq_blackbox_validator.js`, and StudyLab-specific tests into `.agents/skills/study-source-core/scripts/studylab/`.
2. Update the `require()` paths within the moved test files (e.g., `test_l1_l7_proof_suite.js`).
3. Update the 4 StudyLab agent manifests (`.agents/agents/*-apkg-author.md`) to point to the new `scripts/studylab/...` paths for execution and validation.
4. Update `.agents/AGENTS.md`, `.agents/SCRIPTS.md`, and `OWNERSHIP.md` to reflect the new physical boundaries.
5. Execute `test_l1_l7_proof_suite.js` and `test_change_isolation_vnext.js` to certify the move.
