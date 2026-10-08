# StudySourceCore Plugin Rules (`rules/AGENTS.md`)

- **Canonical Plugin ID**: `study-source-core`
- **Architecture**: Antigravity 2.0 Native Multi-Agent Study Engine Plugin
- **Authoritative Subagent Count**: 14 Specialist Subagents
- **Domain Scope**: *Active strictly during educational asset transformations, study note authoring, question bank synthesis, and flashcard generation. Inactive during general programming/dev tasks.*

## 1. Core Architectural Invariants

1. **Single-Writer Rule**:
   Exactly one designated specialist agent writes to each target deliverable. Sibling agents must never concurrently overwrite each other's deliverables.
   - `core-notes` $\to$ `Notes/*_Notes.md`
   - `core-basic-anki` $\to$ `Basic/*_Basic.tsv`
   - `core-cloze-anki` $\to$ `Cloze/*_Cloze.tsv`
   - `core-image-occlusion` $\to$ `ImageOcclusion/*_IO.json`
   - `core-mindmap` $\to$ `Map/*_Map.json` & `Map/*_Mindmap.md`
   - `core-slide-deck` $\to$ `SlideDeck/*_SlideDeck.md`
   - `math-apkg-author` / `reasoning-apkg-author` / `physics-numerical-apkg-author` / `chemistry-numerical-apkg-author` $\to$ `Practice/*_Questions.md`

2. **Parent Self-Execution Ban**:
   The parent orchestrator coordinates, routes, gates, and audits, but NEVER authors specialist deliverables directly. All artifact writing is strictly delegated to designated specialist subagents.

3. **Universal Question Contract**:
   Every practice question must provide at least 4 distinct, plausible MCQ options (`A, B, C, D`). Tier 1 and Tier 2 hints must never leak final answers or numerical calculations.

4. **Fail-Closed Verification**:
   All quality gates and validation harnesses fail closed with non-zero exit codes or `{ isValid: false }`. No silent fallbacks or bypassed assertions are permitted.

5. **Anti-Mock & Production Zero-Tolerance**:
   Production scripts, validators, and authoring engines are strictly forbidden from falling back to hardcoded fixtures, sample mock questions, or placeholder stubs.
