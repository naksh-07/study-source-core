# StudySourceCore — Visual Learning Architecture & Fail-Closed Protocol

> **Canonical Document**: `docs/VISUAL_LEARNING.md`  
> **Status**: AUTHORITATIVE / FROZEN BASELINE  
> **Version**: 1.0.0-VISUAL  
> **Governance Authority**: StudySourceCore Master Governance Board  

---

## 1. Visual Learning Epistemology & Pipeline Flow

Visual learning in StudySourceCore is engineered for high-precision spatial recall: anatomical structures, geographical maps, electrical schematics, and mechanical free-body diagrams.

The visual learning pipeline executes a strict nine-stage sequence:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        THE 9-STAGE VISUAL PIPELINE FLOW                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  1. SOURCE                                                                             │
│     Raw textbook PDF, chapter scans, or atlas pages.                                   │
│                           │                                                            │
│                           ▼                                                            │
│  2. EVIDENCE                                                                           │
│     Evidence pack extracts visual references, figure captions, and diagram citations.   │
│                           │                                                            │
│                           ▼                                                            │
│  3. VISUAL NEED DISCOVERY                                                              │
│     visual_need_discovery.js identifies concepts requiring spatial-visual recall.      │
│                           │                                                            │
│                           ▼                                                            │
│  4. CHAPTER-SCOPED ASSET DISCOVERY                                                     │
│     asset_discovery.js scans chapter drop folder (Study Materials/<Subject>/<Chapter>/) │
│                           │                                                            │
│                           ▼                                                            │
│  5. APPROVED LOCAL ASSET                                                               │
│     Asserts physical local image existence (PNG/SVG/JPG) with verified SHA-256 hash.   │
│                           │                                                            │
│                           ▼                                                            │
│  6. OCCLUSION ELIGIBILITY                                                              │
│     occlusion_eligibility.js evaluates resolution, aspect ratio, and label clarity.   │
│                           │                                                            │
│                           ▼                                                            │
│  7. VISUAL LEARNING CONTRACT                                                           │
│     Enforces image-occlusion-contract.md constraints, Hindi-first labels, bounds.       │
│                           │                                                            │
│                           ▼                                                            │
│  8. IMAGE OCCLUSION MANIFEST                                                           │
│     core-image-occlusion authors canonical JSON manifest with [x, y, w, h] masks.      │
│                           │                                                            │
│                           ▼                                                            │
│  9. INDEPENDENT CERTIFICATION                                                          │
│     validate_image_occlusion.js asserts bounds, non-overlap, and package bundling.     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Invariants & Fail-Closed Protocol

### Invariant 1: Fail-Closed Asset Gating (`NO_APPROVED_ASSET`)
If a chapter requires a diagram (e.g., *Human Respiratory System* or *Physical Map of India*), but no approved local asset exists in the designated chapter drop folder, the track **fails closed immediately**:
- The Image Occlusion track is suppressed with reason code `NO_APPROVED_ASSET`.
- The build does **NOT** crash; valid sibling tracks (Notes, Basic Anki) proceed unhindered.
- Under no circumstances will the system emit an empty or malformed visual manifest.

### Invariant 2: Prohibited Fallbacks (Strictly Forbidden)
To eliminate factual distortion, the following fallback behaviors are programmatically forbidden:
- ❌ **NO AI Image Generation**: Subagents may never call image generation models (e.g., Imagen, DALL-E) to synthesize technical, anatomical, or historical diagrams.
- ❌ **NO External Web Scraping**: The resolver never fetches unverified images from the open web.
- ❌ **NO Arbitrary Local File Fallback**: The resolver will never grab an unrelated local image from another directory.
- ❌ **NO Programmatic Spec Fallback**: Supplying an external URL or programmatic spec without a physical file fails closed.

### Invariant 3: Chapter Scoping & Asset Isolation
Visual assets are strictly scoped to the active chapter:
- An asset named `respiratory_system.png` in Biology/Circulation will not be matched by generic substring searching.
- Cross-chapter asset borrowing is strictly blocked unless explicitly authorized via a validated parent syllabus relationship.

### Invariant 4: Cryptographic Asset Integrity
Every visual asset is fingerprinted using SHA-256:
- The hash is verified against the physical file on disk before occlusion generation begins.
- If the file is modified or corrupted after manifest generation, `verifyArtifactLineage` detects the hash mismatch and halts packaging.

---

## 5. Bounding Box & Cognitive Constraints

The Image Occlusion manifest (`<Chapter>_IO_Manifest.json`) defines geometric occlusion masks over the base image:

1. **Normalized Coordinates**: All coordinates $[x, y, w, h]$ are normalized to floating-point percentages in the range $[0.0, 100.0]$ relative to the original image dimensions.
2. **Cognitive Load Cap ($\le 15$ Regions)**: To prevent learner cognitive overload, a single image may contain a **maximum of 15 occlusion regions**. Diagrams with more than 15 labels must be split into multiple sub-diagrams.
3. **Semantic Target Requirement**: Regions must mask meaningful text labels, callouts, or anatomical landmarks. Occlusion masks over blank backgrounds or non-informative lines trigger validation rejection (`NO_VALID_OCCLUSION_TARGETS`).
4. **Non-Zero Dimensions**: Every mask must satisfy $w > 0.5\%$ and $h > 0.5\%$. Inverted coordinates ($w < 0$ or $h < 0$) or out-of-bounds coordinates ($x + w > 100$) trigger hard failure.

---

## 6. Current Implementation vs. Target Architecture

| Capability | Current Implementation [CURRENT] | Target Horizon [TARGET / Phase 6] |
|---|---|---|
| **Asset Resolution** | `resolve_visual_asset.js` with drop-folder scanning & SHA-256 checks | Unchanged; 88/88 tests passing in `test_visual_asset_pipeline.js`. |
| **Eligibility Checking** | `occlusion_eligibility.js` validates resolution & candidate counts | Enhanced OCR label detection before mask generation. |
| **Mask Authoring** | `core-image-occlusion` specialist authors JSON manifest | Integrated into Semantic IR Visual Units. |
| **APKG Packaging** | `export_anki.js` bundles media into `<Chapter>_Anki.apkg` (Model `1600000003`) | Unified APKG target in v1.1. |
