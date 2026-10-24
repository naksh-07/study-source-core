# Subject Pedagogical Blueprint: Map & Cartography (`09_MAP.md`)

**Domain**: Map (`map-study`)  
**Cognitive Archetype**: Pure Visual-Spatial Cartography, Boundaries & Topological Coordinates  
**Status**: AUTHORITATIVE MINIMALIST SPECIFICATION (Ponytail Standard & ADR-25)  

---

## 1. Epistemological DNA & Cognitive Profile

- **Autonomous Cartographic Domain**: `Map` is an autonomous domain, NOT a subtopic of general geography. It tests pure 2D visual-spatial recognition of political borders, maritime choke points, straits, capitals, and physical coordinates.
- **Visual-Spatial Sketchpad (Baddeley)**: Cartography engages the right-hemisphere dorsal "where" visual processing stream. Attempting to convert visual boundaries into text lists (e.g. "Country X is bordered by A, B, C, D") causes catastrophic memory interference.
- **Fail-Closed Asset Invariant**: If no approved, high-resolution map image exists, generation fails closed with `NO_APPROVED_ASSET`.

---

## 2. "Ginti Ki Cheezein" (The 1 Absolute High-Yield Weapon)

### Weapon 1: Native Anki Image Occlusion (`[Chapter]_Anki.apkg` via `ImageOcclusion/`) [THE 95% CORE]
- **Role**: 95% of total study time in Cartography is spent directly on Image Occlusion cards.
- **Content**:
  - Political maps with normalized $[x, y, w, h]$ SVG bounding box masks covering country names and capitals.
  - Strategic maritime choke points (Strait of Malacca, Strait of Hormuz, Bab-el-Mandeb, Bosphorus Strait, Suez Canal).
  - High-yield seas, gulfs, and island archipelagos.
  - Mountain chains, desert boundaries, and river courses.
- **Modes**:
  - Primary: "Hide All, Guess One" to prevent spatial neighbor giveaways.
  - Secondary: "Hide One, Guess One" for localized boundary recognition.

### Weapon 2: Cartographic Landmark Legend (`Notes/<Chapter>_Notes.md`) [MINIMAL LEGEND]
- **Role**: Clean reference table accompanying the map asset.
- **Content**:
  - Minimal Tabular Grid: `Country / Landmark → Capital → Bordering Seas → Strategic Significance`.
  - Zero multi-page narrative essays.

---

## 3. Strictly Banned Anti-Patterns (Bloat Elimination)

1. ❌ **Synthetic Text Flashcards (STRICTLY BANNED)**: Generating 95 generic text cards asking *"What is the capital of X?"* without an active map substrate is pure noise. All testing must occur directly on the visual map.
2. ❌ **Procedural Question Banks (STRICTLY BANNED)**: Cartography has zero mathematical derivations (`NON_PROCEDURAL_DOMAIN`).
3. ❌ **Slide Decks & MindMaps**: Sprawling mindmaps and Marp presentation slides are completely useless for visual map mastery.

---

## 4. The 24-Hour Daily Student Flow for Map & Cartography

```text
[Step 1: Visual Map Inspection (10 Mins)]
  └── Open the high-resolution map in `Notes/<Chapter>_Notes.md` or viewer.
  └── Mentally trace the coastline, neighboring borders, and strategic straits.

[Step 2: The Core Game — Image Occlusion Daily Drills (15-20 Mins) [95% OF YIELD]]
  └── Open Anki on tablet or desktop.
  └── Review 30-40 Image Occlusion cards.
  └── Instant visual recognition: Spot the red box, recall the country/strait in 2 seconds, click, verify.
```

---

## 5. Authoritative `runtime-policy.json` Alignment

```json
{
  "notes": true,
  "basic": false,
  "cloze": false,
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
  "bmGraph": false,
  "bmQa": true
}
```
*(Notice: `basic`, `cloze`, `mindmap`, `slideDeck`, and `proceduralQuestionBank` are all cleanly set to `false`. Cartography generates strictly native Image Occlusion cards + a clean map legend note).*
