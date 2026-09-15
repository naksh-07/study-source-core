# Image Occlusion Contract & Architecture (`image-occlusion-contract.md`)

This document defines the canonical specification, data model, eligibility gates, geometry standards, future asset boundaries, directory conventions, and validation requirements for **Image Occlusion (IO)** within `study-source-core`.

---

## 1. System Mission & Sibling Architecture

Image Occlusion is a **first-class, governed sibling artifact** of Basic and Cloze flashcards, Obsidian Notes, MindMaps, and Slide Deck prompts.

```text
                     Authorized Evidence Pack (scratch/evidence-pack.md)
                                        │
                         Artifact Eligibility & Routing
               ┌───────────┬───────────┼───────────┬───────────┐
               ▼           ▼           ▼           ▼           ▼
             Notes       Basic       Cloze      MindMap    SlideDeck  ImageOcclusion
          (Mandatory) (Atomic)  (Contextual)(Relational)  (Visual)     (Spatial)
```

### Core Invariants:
1. **Sibling Principle**: Image Occlusion does NOT replace Basic or Cloze flashcards. It addresses visual-spatial recall targets that are inefficient or ineffective in pure text.
2. **Canonical Manifest**: The canonical representation of an IO deck is a machine-readable JSON file (`[Chapter]_ImageOcclusion.json`), NOT `.tsv` or binary `.apkg`. Exporters to Anki or other formats consume this canonical JSON.
3. **Evidence-Grounded**: Occlusion targets, labels, answers, and spatial relationships must be strictly grounded in the Authorized Evidence Pack. In `SOURCE_ONLY` mode, zero hallucinated target labels or ungrounded diagram annotations are allowed.
4. **Hindi-First Language Contract**: Answers and explanatory labels must adhere to the Hindi-first study material policy (standard English technical terms enclosed in parentheses `( )`).

---

## 2. Image Occlusion Eligibility & Suppression Rules

Universal IO eligibility, worthy spatial learning triggers, and strict suppression rules are authoritatively defined in [visual-learning-contract.md](./visual-learning-contract.md#5-image-occlusion-eligibility--routing-rules).

> **Governing Principle**: *Presence of an image is NOT sufficient reason to create an IO card. The learning target itself must benefit from spatial or visual recall.*

### Summary Reference:
- **Eligible (HIGH/MEDIUM)**: Anatomy & organ systems, physical geography & relief, spatial topologies & perimeter sequences, circuit schematics, flowcharts & process cycles, labeled scientific apparatus.
- **Suppressed (NONE/LOW)**: Pure definitions (Basic TSV), dates/chronologies, ordinary flat lists, constitutional clauses (Cloze TSV), abstract prose, pure algebraic manipulations, and reasoning syllogisms.

---

## 3. Canonical JSON Data Model

The canonical manifest file `Study Materials/[Subject]/[Chapter]/ImageOcclusion/[Chapter]_ImageOcclusion.json` follows this structured specification:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "id": "io-map-europe",
  "title": "यूरोप महाद्वीप - प्रमुख भौतिक एवं राजनीतिक मानचित्र",
  "subject": "Map",
  "chapter": "Europe",
  "language": "hi",
  "cards": [
    {
      "id": "card-europe-001",
      "source": {
        "chapter": "Europe",
        "evidence_ids": ["ev-europe-natural-boundaries-01", "ev-europe-rivers-02"]
      },
      "asset": {
        "path": "media/europe_physical_boundaries.png",
        "original_name": "europe_physical_boundaries.png",
        "width": 2400,
        "height": 1800,
        "source_type": "source_provided",
        "provenance_note": "Source PDF Page 14 Diagram"
      },
      "mode": "hide_all_guess_one",
      "regions": [
        {
          "id": "r1",
          "shape": "rectangle",
          "coordinates": [350, 420, 180, 60],
          "answer": "पिरिनीज पर्वत (Pyrenees Mountains)",
          "label": "फ्रांस और स्पेन की प्राकृतिक सीमा",
          "hint": "Border mountain"
        },
        {
          "id": "r2",
          "shape": "ellipse",
          "coordinates": [850, 600, 70, 40],
          "answer": "आल्प्स पर्वत (Alps Mountains)",
          "label": "मध्य यूरोपीय पर्वत श्रृंखला",
          "hint": "Mont Blanc"
        },
        {
          "id": "r3",
          "shape": "polygon",
          "points": [
            [1200, 300],
            [1280, 310],
            [1320, 450],
            [1240, 480],
            [1190, 380]
          ],
          "answer": "यूराल पर्वत (Ural Mountains)",
          "label": "एशिया और यूरोप की विभाजक सीमा",
          "hint": "Eastern boundary"
        }
      ],
      "header": "यूरोप की प्रमुख प्राकृतिक सीमाएं एवं पर्वत श्रृंखलाएं",
      "extra": "पिरिनीज पर्वत फ्रांस और स्पेन के मध्य स्थित है तथा इसके बीच अंडोरा देश बसा है।",
      "tags": ["Map::World::Europe", "Map::World::Europe::Physical"]
    }
  ]
}
```

---

## 4. Geometry & Coordinate Conventions

All geometric coordinates are defined in **pixel coordinates** relative to the original image canvas dimensions (`asset.width` $\times$ `asset.height`), with origin `(0, 0)` at the top-left corner.

### A. Rectangle (`shape: "rectangle"`)
- **`coordinates`**: `[x, y, width, height]`
- **Invariants**:
  - `x >= 0` and `y >= 0`
  - `width > 0` and `height > 0`
  - `x + width <= asset.width`
  - `y + height <= asset.height`

### B. Ellipse (`shape: "ellipse"`)
- **`coordinates`**: `[cx, cy, rx, ry]`
- **Invariants**:
  - `cx` (center x), `cy` (center y)
  - `rx > 0` (horizontal radius), `ry > 0` (vertical radius)
  - `cx - rx >= 0` and `cx + rx <= asset.width`
  - `cy - ry >= 0` and `cy + ry <= asset.height`

### C. Polygon (`shape: "polygon"`)
- **`points`**: Array of coordinate pairs `[[x1, y1], [x2, y2], [x3, y3], ...]`
- **Invariants**:
  - Minimum 3 vertices (`points.length >= 3`)
  - For every vertex `[x, y]`: `0 <= x <= asset.width` and `0 <= y <= asset.height`
  - Vertices define an unclosed or closed simple polygon loop without self-intersection.

---

## 5. Image Occlusion Modes

Supported modes correspond directly to native Anki Image Occlusion interaction patterns:

1. **`hide_all_guess_one`** (Default):
   - All occlusion regions are hidden simultaneously during review.
   - The active question region is highlighted in a distinct color (e.g. orange/blue).
   - Recommended for dense, interconnected maps and anatomical systems where surrounding context must also be tested or obscured to prevent inadvertent visual leakage.

2. **`hide_one_guess_one`**:
   - Only the target region is occluded during review; all other regions remain visible.
   - Recommended when the surrounding context provides essential visual landmarks needed to identify the target.

---

## 6. Source-Grounded Visual Asset Resolution (Phase 6)

Phase 6 redesign: Approved-local-asset-only pipeline.

```text
1. approved_local asset      ──► Approved diagram from Sources/Diagrams/{Subject}/ (verified path + SHA-256)
          ↓
2. NO_APPROVED_ASSET         ──► Fail closed. IO suppressed. No fallback to AI/web/external.
```

### Asset Metadata Contract:
- `asset_id`: Deterministic identifier based on SHA-256 hash.
- `source_type`: One of `"source_embedded"`, `"source_extracted"`, `"user_supplied"`, `"approved_local"`, `"derived"`.
- `path`: Relative path to the image stored inside `Study Materials/[Subject]/[Chapter]/ImageOcclusion/media/`.
- `mime_type`: Standard MIME type (`image/png`, `image/jpeg`, `image/svg+xml`).
- `width` / `height`: Valid positive integers representing canvas dimensions.
- `sha256`: SHA-256 digest for asset integrity and caching.
- `provenance_note`: Clear description of source origin, page reference, generation parameters, or external citation.

### 6.1 No-Hallucination Invariant

Critical hard architectural invariant:

> IMAGE OCCLUSION MUST NEVER CLAIM A VISUAL FACT THAT IS NOT SUPPORTED BY THE APPROVED ASSET/SOURCE.

The system must not:
- Invent labels or structures not present in the source diagram.
- Infer nonexistent diagram elements.
- Generate a replacement image when the source asset is missing.
- Silently fall back to web search, AI generation, or random local files.

If no approved asset exists, the correct result is `NO_APPROVED_ASSET`, not a fabricated image.

---

## 7. Directory & Output Architecture

Every chapter generating flashcards produces a unified Chapter Folder structure:

```text
Study Materials/[Subject]/[Chapter Folder]/
├── Notes/
│   └── [Chapter]_Notes.md
├── Basic/
│   └── [Chapter]_Basic.tsv
├── Cloze/
│   └── [Chapter]_Cloze.tsv
├── ImageOcclusion/
│   ├── [Chapter]_ImageOcclusion.json
│   └── media/
│       ├── [asset-1].png
│       └── [asset-2].svg
├── [Chapter]_Anki.apkg          ◄── UNIFIED SINGLE IMPORT PACKAGE
├── MindMap/
│   └── [Chapter].mindmap.json
├── SlideDeck/
│   └── [Chapter]_SlideDeckPrompt.md
└── Optional/
    └── [Chapter]_ProblemPatterns.md, etc.
```

---

## 8. Validation Rules Summary

Every generated `[Chapter]_ImageOcclusion.json` file must pass physical validation:

```bash
node .agents/skills/study-source-core/scripts/validate_image_occlusion.js <path_to_json>
```

Validation encompasses:
- **Structural Integrity**: Valid JSON, valid schema, unique card and region IDs.
- **Geometric Integrity**: Coordinates valid and strictly within image boundaries.
- **Semantic Grounding**: Every region has a non-empty, Hindi-first `answer` mapped to valid `evidence_ids`.
- **Asset Integrity**: Non-empty image path and valid positive dimensions (`width`, `height`).
- **Quality Warning Gate**: Warning emitted if region count $>15$ per card to prevent cognitive overload.

---

## 9. Native Anki Image Occlusion & Unified `.apkg` Export

Flashcard artifacts (Basic TSV, Cloze TSV, and Image Occlusion JSON + media) are packaged into **ONE unified Anki deck package (`[Chapter]_Anki.apkg`)** via `scripts/export_anki.js`:

```bash
node .agents/skills/study-source-core/scripts/export_anki.js <path_to_chapter_dir>
```

### Native Anki Schema Alignment:
1. **Notetype**: Built-in `"Image Occlusion"` (Type 1 Cloze, `original_stock_kind: 6`).
2. **Fields**:
   - `Occlusions`: SVG cloze masks (`{{c1::rect:left=...}} {{c2::ellipse:...}} {{c3::polygon:...}}`).
   - `Image`: `<img src="filename.png">`.
   - `Header`: Context/topic title.
   - `Back Extra`: Hindi explanation, answers, and extra context.
   - `Comments`: Source evidence IDs.
3. **Cards**: 1 review card per occlusion region, with official Anki canvas rendering script.
4. **Validation**: Package integrity is verified via `node scripts/validate_apkg.js <path_to_apkg>`.

