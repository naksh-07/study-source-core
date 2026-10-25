# Master Subject Pedagogical Directory (`docs/subjects/`)

**Status**: AUTHORITATIVE / FROZEN BASELINE (v1.2.0-stable)  
**Standard**: Ponytail Minimalism & Cognitive Science Alignment (ADR-25)  
**Foundation**: Dunlosky (2013), Sweller Cognitive Load Theory, Karpicke & Blunt (2011), Paivio Dual Coding Theory  

---

## 1. Overview & Architecture

StudySourceCore rejects one-size-fits-all study generation. Different educational domains possess fundamentally distinct cognitive architectures. Forcing math problems into flashcards causes **Flashcard Fatigue**, while forcing history into procedural equations produces **Meaningless Gibberish**.

This directory houses the authoritative, domain-specific pedagogical blueprints for all **9 canonical subject skills**. Each blueprint strictly enforces **"Ginti Ki Cheezein"** (2–3 essential, high-yield deliverables) while explicitly banning redundant bloat (SlideDecks, sprawling mindmaps, and scratchpad calculations in flashcards).

---

## 2. Master Subject Blueprint Index

| # | Subject File | Domain | Cognitive Archetype | The "Ginti Ki Cheezein" (Active High-Yield Weapons) | Strictly Banned Bloat |
|---|---|---|---|---|---|
| 01 | [**`01_MATH.md`**](01_MATH.md) | `Math` | Pure Quantitative STEM | • Question Bank (`Questions.md`) with 3-tier hints<br>• Lean Formula Anki (Atomic only) | ❌ Scratchpad math in Anki<br>❌ Prose essay notes<br>❌ Mindmaps as study |
| 02 | [**`02_PHYSICS.md`**](02_PHYSICS.md) | `Physics` | Physical Modeling & Numericals | • 6-Stage Calculational Question Bank<br>• Formula, Unit & Sign Anki<br>• FBD & Model Reference Notes | ❌ Numerical problems in Anki<br>❌ Pure qualitative notes |
| 03 | [**`03_CHEMISTRY.md`**](03_CHEMISTRY.md) | `Chemistry` | Tri-Bifurcated (Phys/Inorg/Org) | • Physical: ICE Question Bank + Formula Anki<br>• Inorganic: High-Density Spaced Anki<br>• Organic: Reaction Roadmaps + Reagent Anki | ❌ Procedural QBank on descriptive inorganic chapters |
| 04 | [**`04_REASONING.md`**](04_REASONING.md) | `Reasoning` | Deductive Constraint Logic | • Deductive Question Bank with Logic DAGs<br>• Notation, Rule & Fallacy Anki | ❌ Memorizing puzzle answers in Anki<br>❌ Narrative essay notes |
| 05 | [**`05_BIOLOGY.md`**](05_BIOLOGY.md) | `Biology` | Visual Anatomy & Declarative Terms | • Native Image Occlusion (`_IO.json`)<br>• High-Density Cloze Anki Deck<br>• Comparative Reference Notes | ❌ Procedural Question Banks (`NON_PROCEDURAL_DOMAIN`) |
| 06 | [**`06_HISTORY.md`**](06_HISTORY.md) | `History` | Chronological & Event Networks | • Chronological & Event Cloze Anki<br>• Thematic Timeline Spine Notes | ❌ Procedural Question Banks<br>❌ 50-branch rainbow mindmaps |
| 07 | [**`07_POLITICAL_SCIENCE.md`**](07_POLITICAL_SCIENCE.md) | `Political Science` (Polity) | Constitutional & Statutory Frameworks | • Article, Amendment & Quota Cloze Anki<br>• Comparative Institutional Tables | ❌ Rewriting Laxmikanth into prose notes<br>❌ Procedural Question Banks |
| 08 | [**`08_GEOGRAPHY.md`**](08_GEOGRAPHY.md) | `Geography` | Physical Geomorphology & Space | • Native Anki Image Occlusion Maps<br>• Geomorphological Process Notes<br>• Selective Fact Cloze Anki | ❌ Text-only border cards<br>❌ Procedural Question Banks |
| 09 | [**`09_MAP.md`**](09_MAP.md) | `Map` | Pure Cartography & Coordinates | • Native Anki Image Occlusion (SVG masks)<br>• Clean Cartographic Landmark Legend | ❌ Generic synthetic text flashcards<br>❌ Prose lecture notes |

---

## 3. The 4 Universal Cognitive Archetypes

Every subject in human learning maps to one of four cognitive archetypes:

```mermaid
flowchart TD
    subgraph A1["1. Calculational STEM (Math, Physics, Phys-Chem)"]
        A1_1["Primary: Obsidian Question Bank (Paper Practice)"]
        A1_2["Secondary: Formula Anki (Atomic 5-10s)"]
        A1_3["Banned: Scratchpad math in Anki"]
    end

    subgraph A2["2. Deductive Logic (Reasoning, Syllogisms, Puzzles)"]
        A2_1["Primary: Deductive Question Bank with DAGs"]
        A2_2["Secondary: Rule & Notation Anki"]
        A2_3["Banned: Memorizing puzzle answers"]
    end

    subgraph A3["3. Declarative High-Fact (History, Polity, Inorg-Chem)"]
        A3_1["Primary: High-Density Spaced Anki (Cloze/Basic)"]
        A3_2["Secondary: Thematic & Comparative Notes"]
        A3_3["Banned: Procedural Question Banks"]
    end

    subgraph A4["4. Visual-Spatial (Map, Geography, Biology Anatomy)"]
        A4_1["Primary: Native Anki Image Occlusion"]
        A4_2["Secondary: Terminology Cloze Anki"]
        A4_3["Banned: Text descriptions of spatial layouts"]
    end
```

---

## 4. Policy Synchronization Protocol

Each subject's authoritative runtime behavior is dictated by its `skills/study-source-core/subject-skills/<Subject>/runtime-policy.json`. When orchestrating a build:
1. `subject_policy_resolver.js` loads the resolved policy.
2. The orchestrator dispatches **only** the modalities explicitly flagged `true`.
3. Any suppressed modality logs an auditable reason code (`NON_PROCEDURAL_DOMAIN`, `DESCRIPTIVE_ROTE_NO_CALCULATIONS`, etc.) in `routing_manifest.json`.
4. Zero unnecessary tokens or compute cycles are expended on banned artifacts.
