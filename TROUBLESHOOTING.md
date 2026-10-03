# StudySourceCore — Diagnostic Decision Trees & Troubleshooting Guide

> **Canonical Path**: `.agents/TROUBLESHOOTING.md`  
> **Diagnostic Model**: Evidence-Driven Root-Cause Analysis & Decision Trees  
> **Status**: AUTHORITATIVE / OPERATIONAL

---

## 1. Fast-Triage Diagnostic Overview

When an execution error or validation failure occurs in StudySourceCore, locate the corresponding error signature in the table below to access its dedicated diagnostic decision tree:

| Error Code | Failure Class | Typical Stage | Primary Affected Component |
|---|---|---|---|
| `ERR-01-SCHEMA` | Schema Validation Failure | Wave 1 Handoff / Wave 2 Packaging | `PracticeQuestions.json`, `ProceduralPatterns.json` |
| `ERR-02-SHORTCIRCUIT` | Empty Card Short-Circuit / 0 Candidates | Wave 1 Routing & Gating | `routing_engine.js`, `core-basic-anki`, `core-cloze-anki` |
| `ERR-03-MCQ-INVARIANT` | MCQ Hard Invariant Violation (< 4 Options) | Wave 1 Generation / Wave 3 Audit | `math-apkg-author`, `adversarial-apkg-reviewer` |
| `ERR-04-LANG-DRIFT` | Dual-Language Contract Violation | Wave 1 Generation / Wave 3 QA | `core-notes`, TSVs, `bm-qa` |
| `ERR-05-TIMEOUT` | Subagent Timeout / Stall | Wave 1 Parallel Execution | Dispatch queue, worker agent process |
| `ERR-06-IO-COORDS` | Image Occlusion Out-of-Bounds Mask | Wave 1 Generation | `core-image-occlusion`, `image-occlusion-schema.json` |
| `ERR-07-SQLITE-LOCK` | Database Lock / APKG SQLite Corruption | Wave 2 Packaging | `export_anki.js`, `export_studylab_procedural_anki.js` |
| `ERR-08-ROUTE-MISSING` | Missing Subject Route / Ambiguous Subject | Stage 1 Ingestion / Stage 2 Routing | `routing_engine.js`, subject skill dispatch |
| `ERR-09-SKILL-DISCOVERY` | Skill Discovery Missing / Global Shadowing | Setup / Environment Doctor | `.agents/skills.json`, `doctor.js`, global mirror |
| `ERR-10-HARDCODED-CONTEXT` | Missing Chapter / Hardcoded Fallback Violation | Script Invocation / Smoke / Doctor | `author_*_studylab.js`, `studycore_cli.js` |

---

## 2. Evidence-Driven Diagnostic Trees

### Tree 1: Schema Validation Failure (`ERR-01-SCHEMA`)

#### Symptom & Log Signature
```
[VALIDATION_ERROR] AJV Schema validation failed for PracticeQuestions/PracticeQuestions.json
data/questions/0/hints must have required property 'tier_3_walkthrough'
data/questions/2/difficulty_level must be <= 7
Exit Code: 1
```

#### Diagnostic Decision Flow
```
                   [Schema Validation Error Detected]
                                   │
                                   ▼
                   Is error from Attempt 1 or Attempt 2?
                                   │
                ┌──────────────────┴──────────────────┐
                ▼                                     ▼
           [Attempt 1]                           [Attempt 2]
                │                                     │
                ▼                                     ▼
    Extract exact AJV path                Isolate blast radius:
    and missing property                  • Mark track FAILED
                │                         • Abort dependent packaging
                ▼                         • Preserve valid sibling files
    Dispatch targeted retry prompt        • Emit Truthful Failure Report
    to responsible specialist subagent    • Set final verdict: PARTIAL_SUCCESS
```

#### Remediation Steps
1. Identify the failing JSON artifact using `node scripts/validate_studylab_practice_questions.js --file PracticeQuestions/PracticeQuestions.json`.
2. Inspect the failed property path (e.g., `hints/tier_3_walkthrough`).
3. If Attempt 1: Re-prompt the authoring subagent with the exact AJV error snippet.
4. If Attempt 2: Ensure sibling tracks (Notes, Standard Anki) proceed to Wave 3 without crashing the entire run.

---

### Tree 2: Empty Card Short-Circuit / 0 Candidates (`ERR-02-SHORTCIRCUIT`)

#### Symptom & Log Signature
```
[ROUTING_INFO] basicCandidateCount === 0 for chapter 'Polity_Ch04'
[GATING] Suppressing core-basic-anki dispatch.
[SUPPRESSION_LOGGED] Reason: ZERO_BASIC_CANDIDATES
```

#### Diagnostic Decision Flow
```
                  [Track Yield Evaluates to 0 Candidates]
                                   │
                                   ▼
                Did routing_engine.js log explicit suppression?
                                   │
                ┌──────────────────┴──────────────────┐
                ▼                                     ▼
             [ YES ]                                [ NO ]
                │                                     │
                ▼                                     ▼
    Normal deterministic behavior.        Bug: Silent omission detected.
    • Suppress subagent dispatch          • Inspect routing_engine.js
    • Do NOT create empty TSV file        • Verify evidence-pack extraction
    • Proceed with remaining tracks       • Log explicit reason code
```

#### Remediation Steps
- **Expected Behavior**: When a track has 0 candidates, it must be suppressed cleanly without generating 0-byte files or failing the build.
- If an agent generated an empty TSV file (0 bytes), delete the empty file and record the explicit suppression in `scratch/routing_manifest.json`.

---

### Tree 3: MCQ Hard Invariant Violation (`ERR-03-MCQ-INVARIANT`)

#### Symptom & Log Signature
```
[INVARIANT_VIOLATION] Question MATH_QUAD_004 has only 3 options (minimum 4 required).
[SECURITY_AUDIT_FAIL] Options array length = 3. SQLite persistence check failed.
```

#### Diagnostic Decision Flow
```
                 [MCQ Option Count < 4 or Missing Correct]
                                   │
                                   ▼
                    Is this an authentic single-choice MCQ?
                                   │
                ┌──────────────────┴──────────────────┐
                ▼                                     ▼
             [ YES ]                                [ NO ]
                │                                     │
                ▼                                     ▼
    Subagent omitted a distractor.        Question is binary/structural.
    • Trigger targeted 1-retry            • Re-classify question_type to
    • Specialist must synthesize 4th        'ASSERTION_REASON' or 'TRUE_FALSE'
      pedagogically sound distractor      • Re-validate against updated schema
```

#### Remediation Steps
1. Run `node scripts/test_adversarial_auditor.js` to inspect option counts across all items.
2. Invalidate any MCQ item with $< 4$ options. Every option must have non-empty text and valid `is_correct` boolean flags.

---

### Tree 4: Dual-Language Contract Violation (`ERR-04-LANG-DRIFT`)

#### Symptom & Log Signature
```
[LANGUAGE_DRIFT] English-only explanatory prose detected in Notes/Ch02_Notes.md:45
"The rate of reaction increases because temperature increases kinetic energy."
Missing Hindi pedagogical explanation.
```

#### Diagnostic Decision Flow
```
                   [English-Only Prose Detected in Explanation]
                                   │
                                   ▼
                     Is the text in a pure formula/code block?
                                   │
                ┌──────────────────┴──────────────────┐
                ▼                                     ▼
             [ YES ]                                [ NO ]
                │                                     │
                ▼                                     ▼
    Permitted: Formulas, code fences,     Violation: Pedagogical explanation
    and YAML tags may use English.        must be Hindi-first with technical
                                          English terms in parentheses ( ).
                                          • Trigger targeted fix prompt.
```

#### Remediation Steps
1. Convert explanatory prose to Hindi-first:  
   *Correct*: "तापमान (Temperature) बढ़ने पर गतिज ऊर्जा (Kinetic Energy) बढ़ती है, जिससे अभिक्रिया की दर (Rate of Reaction) तीव्र हो जाती है।"
2. Re-run `node scripts/validate_bilingual_compliance.js`.

---

### Tree 5: Subagent Timeout / Stall (`ERR-05-TIMEOUT`)

#### Symptom & Log Signature
```
[TIMEOUT_EXCEEDED] Subagent 'core-mindmap' exceeded execution budget (180s).
No handoff.md received. Process unresponsive.
```

#### Diagnostic Decision Flow
```
                       [Subagent Timeout Triggered]
                                   │
                                   ▼
                     Has the subagent written partial data?
                                   │
                ┌──────────────────┴──────────────────┐
                ▼                                     ▼
             [ YES ]                                [ NO ]
                │                                     │
                ▼                                     ▼
    Inspect partial file for syntax loops. Terminate process immediately.
    Terminate stalled process.            Assess complexity of evidence pack.
    Re-launch subagent with partitioned   Re-launch with reduced scope or
    evidence section.                     mark track FAILED and proceed.
```

#### Remediation Steps
1. Enforce immediate subagent process termination.
2. Verify system concurrency: Ensure no more than 4 subagents were spawned simultaneously.
3. Check `scratch/evidence-pack.md` size; if $> 50,000$ characters, chunk the prompt.

---

### Tree 6: Image Occlusion Out-of-Bounds Mask (`ERR-06-IO-COORDS`)

#### Symptom & Log Signature
```
[SCHEMA_ERROR] Image Occlusion mask out of bounds.
Mask 'mask_03': x=85.0, width=22.0 -> total extent 107.0 > 100.0 max.
```

#### Diagnostic Decision Flow
```
                  [IO Mask Extent Exceeds [0..100] Boundary]
                                   │
                                   ▼
                   Did SVG coordinate normalization fail?
                                   │
                ┌──────────────────┴──────────────────┐
                ▼                                     ▼
             [ YES ]                                [ NO ]
                │                                     │
                ▼                                     ▼
    Re-normalize SVG coordinates:         Mask was manually drafted outside
    $x_{norm} = (x / width_{orig}) * 100$ image frame. Clamp coordinate
    $w_{norm} = (w / width_{orig}) * 100$ to $100.0 - x$.
```

#### Remediation Steps
1. Execute `node scripts/validate_image_occlusion.js --manifest ImageOcclusion/Manifest.json`.
2. Ensure all mask bounding boxes satisfy: $0 \le x, y \le 100$ and $x + \text{width} \le 100$, $y + \text{height} \le 100$.

---

### Tree 7: Database Lock / APKG SQLite Corruption (`ERR-07-SQLITE-LOCK`)

#### Symptom & Log Signature
```
[SQLITE_ERROR] SqliteError: database is locked
Unable to write to collection.anki2
```

#### Diagnostic Decision Flow
```
                      [SQLite Lock / Database Error]
                                   │
                                   ▼
                 Were packaging scripts executed concurrently?
                                   │
                ┌──────────────────┴──────────────────┐
                ▼                                     ▼
             [ YES ]                                [ NO ]
                │                                     │
                ▼                                     ▼
    Violation of Wave 2 Sequential Rule.  File descriptor leak or stale handle.
    Enforce single-threaded execution for Close open SQLite connections.
    all export_*.js scripts.              Delete stale .anki2 temporary files.
                                          Re-run packaging script.
```

#### Remediation Steps
1. Never run `export_anki.js` and `export_studylab_procedural_anki.js` in parallel.
2. Remove any orphaned `.build/temp_collection.anki2` files before rebuilding.
3. Validate output with `node -e "const db = require('better-sqlite3')('Anki/deck.apkg'); console.log(db.pragma('integrity_check'));"`.

---

### Tree 8: Missing Subject Route / Ambiguous Subject (`ERR-08-ROUTE-MISSING`)

#### Symptom & Log Signature
```
[ROUTING_ERROR] Unknown subject 'Quantum Biophysics'.
No exact match found in 9 subject skills.
```

#### Diagnostic Decision Flow
```
                   [Subject Skill Route Not Recognized]
                                   │
                                   ▼
                Can subject be mapped to core 9 disciplines?
                                   │
                ┌──────────────────┴──────────────────┐
                ▼                                     ▼
             [ YES ]                                [ NO ]
                │                                     │
                ▼                                     ▼
    Map to primary discipline:            Route to General Subject Skill
    • Quantum Biophysics -> Physics/Bio   (Standard Notes + Basic/Cloze Anki)
    • Organic Synthesis -> Chemistry      Suppress StudyLab procedural track.
```

#### Remediation Steps
1. Consult `.agents/SKILLS.md` for the authoritative list of 9 subject skills.
2. Map interdisciplinary topics to their dominant parent skill or route to General.
3. Record the explicit fallback routing in `scratch/routing_manifest.json`.

---

### Tree 9: Antigravity Skill Discovery & Global Shadowing (`ERR-09-SKILL-DISCOVERY`)

#### Symptom & Log Signature
```
[DOCTOR_WARN] Antigravity discovery config missing (.agents/skills.json not found; external skills/ folder won't be discovered in clean clones)
# or
[TOOL_DISCOVERY_ERROR] Skill 'study-source-core' not found in active agent skills
# or stale behavior where edits in repository skills/ are ignored by the host runtime
```

#### Diagnostic Decision Flow
```
               [Skill Not Discovered / Stale Behavior]
                                  │
                                  ▼
                Does .agents/skills.json exist in repo root?
                                  │
               ┌──────────────────┴──────────────────┐
               ▼                                     ▼
            [ NO ]                                [ YES ]
               │                                     │
               ▼                                     ▼
   Create .agents/skills.json             Check ~/.gemini/config/skills/
   with {"entries":[{"path":"skills"}]}   Is duplicate global skill present?
   Run npm run doctor to verify.                     │
                                          ┌──────────┴──────────┐
                                          ▼                     ▼
                                       [ YES ]                [ NO ]
                                          │                     │
                                          ▼                     ▼
                               Purge global copy:         Check doctor Check 7.
                               rm -rf ~/.gemini/config/   Verify JSON is valid
                               skills/study-source-core   and contains "skills".
```

#### Remediation Steps
1. Verify repository root has `.agents/skills.json` containing:
   ```json
   {
     "$schema": "https://antigravity.google/schemas/skills-config.json",
     "entries": [{ "path": "skills" }]
   }
   ```
2. Check if a rogue copy exists at `~/.gemini/config/skills/study-source-core`. If found, delete it immediately to eliminate dual-source drift.
3. Run `npm run doctor` and confirm Check 7 reports `[PASS] Antigravity discovery config (.agents/skills.json -> "skills")`.

---

### Tree 10: Missing Chapter / Hardcoded Fallback Violation (`ERR-10-HARDCODED-CONTEXT`)

#### Symptom & Log Signature
```
[FATAL_INVARIANT_VIOLATION] [MISSING_CHAPTER] author_math_studylab requires an explicit chapter name. Hardcoded fallbacks are strictly prohibited under ADR-21.
# or
[FATAL_INVARIANT_VIOLATION] [MISSING_EVIDENCE_INPUT] author_physics_studylab requires an explicit evidencePack input. Loading test fixtures as production fallbacks is forbidden under ADR-21.
# or
[DOCTOR_FAIL] Production scripts purity (1 files contain prohibited fixture imports or chapter fallbacks)
```

#### Diagnostic Decision Flow
```
               [ERR-10-HARDCODED-CONTEXT Detected]
                                  │
                                  ▼
                 Is failure from runtime invocation or doctor/smoke?
                                  │
               ┌──────────────────┴──────────────────┐
               ▼                                     ▼
      [Runtime Invocation]                  [Doctor / Smoke Test]
               │                                     │
               ▼                                     ▼
   Was script invoked without            Did a recent edit introduce a fallback
   --chapter or evidence input?          to resources/fixtures or hardcoded chapter?
               │                                     │
               ▼                                     ▼
   Pass explicit CLI parameters:         Revert the mock fallback. Keep production
   --chapter <Name> --evidence <Path>    engines pure. Pass test data in test files.
```

#### Remediation Steps
1. **At Runtime**: Always pass `--chapter <ChapterName>` and `--evidence <EvidencePath>` when executing specialist author engines directly. Fail-closed behavior prevents corrupting artifacts with sample chapters.
2. **In Doctor / Smoke Checks**: Check which production file failed Check 8 in `npm run doctor` or Check 1.4 in `npm run smoke`. Ensure production scripts do not import or reference `resources/fixtures/` and do not contain `options.chapter || '<SampleChapter>'`.

---

### Tree 11: Cross-Artifact Stopword / Variable False-Positive Divergence (`ERR-11-ENTITY-STOPWORD`)

#### Symptom & Log Signature
```
[CROSS_ARTIFACT_DIVERGENCE] Cross-artifact divergence detected on 'number_unit::for': [practiceQuestionsJson] says '22m' vs [questionBank] says '2k'.
```

#### Diagnostic Decision Flow
```
               [CROSS_ARTIFACT_DIVERGENCE Triggered]
                                 │
                                 ▼
               Is the reported entity a common word/preposition
               (e.g. 'for', 'with', 'in', 'के लिए', 'मान') or
               a single-letter variable (e.g. '2k' for Kelvin)?
                                 │
              ┌──────────────────┴──────────────────┐
              ▼                                     ▼
           [ YES ]                                [ NO ]
              │                                     │
              ▼                                     ▼
   Entity extraction false positive:      Genuine factual contradiction:
   Add stopword/token to                  One artifact contains incorrect
   IGNORED_ENTITIES in                    data (e.g. wrong formula or value).
   cross_artifact_checker.js.             Correct the divergent sibling file.
```

#### Remediation Steps
1. Verify if the entity reported is a genuine named entity (e.g., `Everest`, `Earth`, `Electron`) or an accidental grammatical token (`for`, `from`, `with`, `find`, `मान`).
2. If accidental, add the token to `IGNORED_ENTITIES` in `skills/study-source-core/scripts/cross_artifact_checker.js`.
3. If caused by algebraic variable matching (e.g. `2k` in math AP matching unit `K`), ensure the unit regex uses explicit word boundaries or non-overlapping tokenization (`kelvin|केल्विन`).


