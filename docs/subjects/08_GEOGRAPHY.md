# Subject Pedagogical Blueprint: Geography (`08_GEOGRAPHY.md`)

**Domain**: Geography (`geography-study`)  
**Cognitive Archetype**: Physical Geomorphology, Spatial-Climatic Distributions & Topography  
**Status**: AUTHORITATIVE MINIMALIST SPECIFICATION (Ponytail Standard & ADR-25)  

---

## 1. Epistemological DNA & Cognitive Profile

- **Spatial-Physical Fusion**: Geography blends physical process mechanics (plate tectonics, cyclone genesis, planetary wind systems) with 2D spatial distributions (mountain passes, drainage basins, soil belts, mineral deposits).
- **The Split-Attention Disaster (Mayer, $d = 1.09$)**: Listing spatial boundaries or river tributaries in textual bullet points forces mental translation from text to spatial coordinates. Active recall must occur **directly on visual map substrates**.
- **Pedagogical Requirement**: Pair **Image Occlusion** for geographic distributions with **Process Notes** for geomorphological mechanics.

---

## 2. "Ginti Ki Cheezein" (The 2 Essential High-Yield Weapons)

### Weapon 1: Native Anki Image Occlusion (`[Chapter]_Anki.apkg` via `ImageOcclusion/`) [PRIMARY SPATIAL]
- **Role**: Visual-spatial landmark identification and boundary recall.
- **Content**:
  - River drainage basins & tributaries (e.g. Left-bank vs Right-bank tributaries of Ganga/Godavari).
  - Mountain passes, fault lines, and tectonic plate boundaries.
  - Oceanic currents (Warm vs Cold currents) and atmospheric pressure cells (Hadley, Ferrel, Polar).
- **Mechanism**: Normalized SVG masks occlude geographic labels directly on the topographic map.

### Weapon 2: Geomorphological Process Notes (`Notes/<Chapter>_Notes.md`) [CONCEPTUAL ANCHOR]
- **Content**:
  - Step-by-step physical cycle mechanisms:
    - *Tropical Cyclones*: Trigger conditions $\to$ Latent heat engine $\to$ Eye formation $\to$ Landfall dissipation.
    - *Plate Tectonics*: Divergent vs Convergent vs Transform boundary features (trenches, rift valleys).
  - High-yield comparison tables (e.g. Tropical vs Temperate cyclones, Western vs Eastern Ghats).

### Weapon 3: Selective Fact Cloze Anki Deck (`[Chapter]_Anki.apkg`) [AUXILIARY RETENTION]
- **Content**:
  - Soil compositions, mineral belt reserves, national park states, and demographic stats.
  - *"Laterite soil is rich in {{c1::iron oxide and aluminum}}, but deficient in {{c2::nitrogen and organic matter}}."*

---

## 3. Strictly Banned Anti-Patterns (Bloat Elimination)

1. ❌ **Procedural Question Banks (STRICTLY BANNED)**: Geography lacks calculational equations and multi-step math DAGs (`NON_PROCEDURAL_DOMAIN`).
2. ❌ **Text-Only Border Cards**: Asking *"Which Indian states share a border with Myanmar?"* as plain text flashcards creates brittle recall. Use an Image Occlusion map.
3. ❌ **Slide Decks & Sprawling MindMaps**: Flipping through slides does not help a student visualize atmospheric circulation.

---

## 4. The 24-Hour Daily Student Flow for Geography

```text
[Step 1: Physical Process Understanding (45 Mins)]
  └── Study geomorphological / climatic mechanics using diagrams in `Notes/<Chapter>_Notes.md`.

[Step 2: Map Visualization & Spatial Occlusion (15-20 Mins) [THE CORE GAME]]
  └── Open Anki Image Occlusion deck.
  └── Mask & retrieve river tributaries, mountain ranges, and ocean currents directly on maps.

[Step 3: Quick Cloze Anki Sprint (5-10 Mins)]
  └── Swipe 20 factual cards (soil properties, mineral belts, climate thresholds).
```

---

## 5. Authoritative `runtime-policy.json` Alignment

```json
{
  "notes": true,
  "basic": true,
  "cloze": true,
  "apkg": true,
  "procedural_mode": "none",
  "procedural_apkg": false,
  "proceduralApkg": false,
  "proceduralQuestionBank": false,
  "problemPatterns": false,
  "practiceQuestions": false,
  "imageOcclusion": true,
  "mindmap": false,
  "slideDeck": false,
  "bmGraph": true,
  "bmQa": true
}
```
