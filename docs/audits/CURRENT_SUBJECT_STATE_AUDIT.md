# Baseline Audit: Current State of Subject Architectures & Deliverables

**Document ID**: `DOC-AUDIT-CURRENT-STATE-2026-01`  
**Execution Date**: 2026-10-24  
**Status**: APPROVED BASELINE RECONNAISSANCE  
**Target Repository**: StudySourceCore  

---

## 1. Executive Summary

A comprehensive scan of all 9 canonical subject directories under `skills/study-source-core/subject-skills/` and the 6 existing chapter deliverables in `Study Materials/` was conducted to baseline the exact current state of the system before executing the deep pedagogical research phases.

### Major Findings:
1. **The "Kitchen-Sink" Configuration Overhang**:
   - In all 9 subjects, `runtime-policy.json` currently leaves `"notes": true`, `"basic": true`, `"cloze": true`, `"apkg": true`, `"mindmap": true`, and `"slideDeck": true` enabled simultaneously.
   - Even in domains where slide decks or mindmaps have zero pedagogical justification for self-study (e.g. pure quantitative Math or pure boundary cartography in Map), they are generated anyway because the policy defaulted to `true`.
2. **Procedural Archival Alignment**:
   - The recent ADR-24 update successfully disabled procedural APKG (`"procedural_apkg": false`, `"proceduralApkg": false`) across all 9 subjects.
   - For `Chemistry`, `Math`, `Physics`, and `Reasoning`, `"procedural_mode": "markdown"` and `"proceduralQuestionBank": true` are active.
   - For non-STEM (`Biology`, `Geography`, `History`, `Map`, `Political Science`), `"procedural_mode": "none"` and `"proceduralQuestionBank": false` are active.
3. **Artifact Sprawl in Study Materials**:
   - Existing chapters contain 10–13 discrete folders and files each (`Notes/`, `Basic/`, `Cloze/`, `_Anki.apkg`, `MindMap/`, `SlideDeck/`, `Graph/`, `Audit/`, `Questions/`, `Optional/`).
   - Students opening a chapter are met with cognitive friction and decision paralysis.

---

## 2. Current Master Policy Configuration Matrix

| Subject Domain | Basic Anki | Cloze Anki | Normal APKG | Proc Mode | Proc QBank | Image Occlusion | Notes | MindMap | SlideDeck |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Biology** | ✅ True | ✅ True | ✅ True | `none` | ❌ False | ✅ True | ✅ True | ⚠️ True | ⚠️ True |
| **Chemistry** | ✅ True | ✅ True | ✅ True | `markdown` | ✅ True | ✅ True | ✅ True | ⚠️ True | ⚠️ True |
| **Geography** | ✅ True | ✅ True | ✅ True | `none` | ❌ False | ✅ True | ✅ True | ⚠️ True | ⚠️ True |
| **History** | ✅ True | ✅ True | ✅ True | `none` | ❌ False | ✅ True | ✅ True | ⚠️ True | ⚠️ True |
| **Map** | ⚠️ True | ⚠️ True | ⚠️ True | `none` | ❌ False | ✅ True | ✅ True | ⚠️ True | ⚠️ True |
| **Math** | ⚠️ True | ⚠️ True | ✅ True | `markdown` | ✅ True | ⚠️ True | ✅ True | ⚠️ True | ⚠️ True |
| **Physics** | ✅ True | ✅ True | ✅ True | `markdown` | ✅ True | ⚠️ True | ✅ True | ⚠️ True | ⚠️ True |
| **Political Science** | ✅ True | ✅ True | ✅ True | `none` | ❌ False | ⚠️ True | ✅ True | ⚠️ True | ⚠️ True |
| **Reasoning** | ⚠️ True | ⚠️ True | ✅ True | `markdown` | ✅ True | ⚠️ True | ✅ True | ⚠️ True | ⚠️ True |

*Legend: ⚠️ = Questionable/Bloat modality that requires empirical pruning in Phase 3.*

---

## 3. Detailed Per-Subject Baseline Analysis

### 1. Mathematics (`Math`)
- **Current Chapter**: `Arithmetic-Progression` & `LCM-HCF`
- **Current Deliverables**: `Notes`, `Basic TSV`, `Cloze TSV`, `APKG`, `MindMap`, `SlideDeck`, `Questions.md`, `PracticeQuestions.json`, `ProblemPatterns.json`, `QA_Report`, `Graph_Index`.
- **Bloat / Gaps Identified**:
  - `SlideDeck` (Marp prompt) provides near-zero value to a student studying AP formulas.
  - `MindMap` tree adds visual decoration but no problem-solving capability.
  - `Basic TSV` in Math risks testing trivial definitional recall rather than method application.

### 2. Physics (`Physics`)
- **Current Chapter**: `Newton-Laws-Friction`
- **Current Deliverables**: `Notes`, `Basic TSV`, `Cloze TSV`, `APKG`, `MindMap`, `SlideDeck`, `Questions.md`, `PracticeQuestions.json`, `ProblemPatterns.json`, `QA_Report`, `Graph_Index`.
- **Bloat / Gaps Identified**:
  - Slide deck prompt has 0 speaker notes in some sections and clutters the directory.
  - Basic cards contain compound questions (already flagged in previous QA audit).

### 3. Chemistry (`Chemistry`)
- **Current Chapter**: `Chemical-Equilibrium`
- **Current Deliverables**: Full suite (11 artifact directories).
- **Domain Split Gap**: Chemistry spans 3 completely different sub-disciplines (Physical calculational vs. Inorganic descriptive vs. Organic mechanistic). A single uniform chemistry policy fails to distinguish between an ICE table chapter and a mineral ores chapter.

### 4. Reasoning (`Reasoning`)
- **Current Chapter**: `Syllogism`
- **Current Deliverables**: Full suite (10 artifact directories).
- **Bloat / Gaps Identified**:
  - Flashcards test abstract premise definitions when the student really needs Venn diagram and rule distributions.
  - Slide deck and mindmap are redundant alongside the Question Bank.

### 5. Map & Cartography (`Map`)
- **Current Chapter**: `Europe`
- **Current Deliverables**: `Notes`, `Basic TSV`, `Cloze TSV`, `APKG`, `ImageOcclusion`, `MindMap`, `SlideDeck`, `media/europe_map.svg`.
- **Bloat / Gaps Identified**:
  - Contains 95 synthetic placeholder Basic cards and 45 Cloze cards that provide zero educational value.
  - Cartography is almost exclusively visual-spatial; text flashcard generation here is pure noise.

### 6. Biology, History, Geography, Political Science
- **Current Status**: Subject policies exist, but no active benchmark chapters are built in `Study Materials/` yet.
- **Opportunity**: We can design their minimalist specifications *before* building test chapters, preventing bloat from day one.

---

## 4. Phase 1 Conclusion & Handshake to Phase 2

The baseline confirms that **kitchen-sink bloat is an active reality** across all 9 subject configurations. 
Phase 2 will now deploy multi-angle deep research subagents to establish what the global educational literature, elite curricula, and real-world practitioner communities prescribe as the true **"Ginti Ki Cheezein"** for each domain.
