# Visual Learning Contract & Profile Architecture (`visual-learning-contract.md`)

This document defines the universal principles, artifact separation boundaries, and transient machine-readable profile architecture for visual learning artifacts (specifically the **NotebookLM Slide Deck Prompt** and **Image Occlusion** sibling outputs) within `study-source-core`.

---

## 1. Core Principle: Visual Learning Experience

Visual artifacts in `study-source-core` produce a **VISUAL LEARNING EXPERIENCE** that builds intuitive mental models and enables precise spatial recall.

### Sibling Output Separation:
- **Knowledge Note (`Notes/`)** ──► Read / Revise: Comprehensive, structured, source-grounded reference knowledge in Obsidian Markdown.
- **Basic Anki (`Basic/`)** ──► Atomic Recall: Rapid prompt-response flashcards for discrete, high-value facts (5–10s retrieval).
- **Cloze Anki (`Cloze/`)** ──► Contextual Retrieval: Active fill-in-the-blank cards for sequences, formulas, and relational omissions.
- **Image Occlusion (`ImageOcclusion/`)** ──► Spatial & Diagrammatic Recall: Canonical JSON manifest for anatomical, cartographic, schematic, and process occlusion.
- **MindMap (`MindMap/`)** ──► Structural Topology: Non-linear hierarchical and relational graph representation (`.mindmap.json`).
- **ProblemPatterns (`Optional/`)** ──► Application, Setups & Traps: Deep-structure problem categorization, decision trees, and error logs.
- **Slide Deck Prompt (`SlideDeck/`)** ──► Visual Mental Model: High-impact, visual-first presentation blueprint optimized for NotebookLM.

### Strict Negative Distinctions:
1. The **Slide Deck Prompt** is NOT a Knowledge Note converted into slides, an Anki deck, a MindMap tree dump, or an exhaustive problem catalogue.
2. **Image Occlusion** is NOT a replacement for Basic or Cloze flashcards, and must NEVER be generated solely because an image is present. It addresses visual-spatial recall targets only.

---

## 2. Universal Visual Rules

All visual learning designs in `study-source-core` must adhere to these 11 universal rules:

1. **One Dominant Idea Per Visual Unit**: Every slide or occlusion card focuses on a single core concept, mechanism, comparison, or spatial structure.
2. **Visual Before Text**: Lead with the spatial layout, schematic, or diagram container; use text strictly for concise annotations and callouts.
3. **Source-Grounded Visuals**: Every diagram, coordinate frame, flowchart, or comparison matrix must be strictly justified by facts in the authorized source.
4. **No Decorative Imagery**: Zero generic clip-art, decorative filler photographs, or non-functional visual fluff. Every visual element must carry pedagogical meaning.
5. **Meaningful Spatial Contiguity**: Place labels, callout badges, and annotations directly adjacent to the visual components they describe, avoiding disconnected legends.
6. **Progressive Disclosure**: Break complex multi-step mechanisms, reaction networks, or mathematical proofs into sequential stages across visual containers.
7. **Text Economy**: Maximum 4 bullet points per slide (preferred 2–3; under 12 words each). Visual-only slides may use 0 bullets.
8. **Visual Diversity**: Avoid repeating identical slide layouts consecutively; alternate between split-screen comparisons, flow ribbons, hierarchical trees, and high-contrast callouts.
9. **Coherent Visual World**: Maintain consistent symbols, directional axes, color semantics, and notation across all visual assets in a chapter.
10. **Subject-Native Representation**: Use discipline-specific visual grammar (e.g. Free-Body Diagrams in Physics, Reaction Roadmaps in Chemistry, Stratigraphic Layers in Geography, Decision Trees in Polity).
11. **No Unnecessary Visual Generation**: Do not generate slide deck prompts or IO manifests for sources devoid of conceptual, procedural, or visual substance unless explicitly requested.

---

## 3. Transient Visual Profile Contract

During extraction, the pipeline establishes an **internal, transient Visual Profile** object. This profile is maintained in-memory or within the execution planning state (`scratch/evidence-pack.md` / `scratch/execution-state.json`) and is discarded after execution. **No permanent `visual-profile.md` file is created.**

*Efficiency Optimization (Finding 5)*: If a source is deterministically non-visual (e.g., pure abstract definitions, text-only law/polity, simple formulas), the pipeline assigns default non-visual markers (`io_worthiness: "NONE"`, `deck_worthiness: "LOW"`) without constructing unnecessary transient metadata.

### Machine-Readable Schema:
```json
{
  "dominant_structures": [],
  "secondary_structures": [],
  "visual_opportunities": [],
  "recommended_visual_forms": [],
  "narrative_mode": null,
  "visual_world": null,
  "deck_worthiness": null,
  "deck_complexity": null,
  "io_worthiness": null,
  "io_candidates": []
}
```

### Field Definitions:
- **`dominant_structures`** (`string[]`): Core cognitive architectures present in the source (e.g., `["spatial", "geomorphic_processes", "circulation_systems"]`).
- **`secondary_structures`** (`string[]`): Ancillary knowledge patterns (e.g., `["classification", "statistical_data"]`).
- **`visual_opportunities`** (`string[]`): High-yield conceptual anchors that benefit from diagrammatic representation (e.g., `["cyclone_structure", "river_valley_cross_section"]`).
- **`recommended_visual_forms`** (`string[]`): Subject-native representations to employ (e.g., `["cross_section", "process_flowchart", "spatial_comparison_matrix"]`).
- **`narrative_mode`** (`string`): Chosen pedagogical pacing mode (e.g., `"macro_to_micro_zoom"`, `"chronological_progression"`, `"mechanism_transformation"`, `"standard_vs_shortcut"`).
- **`visual_world`** (`string`): The coherent visual theme/metaphor suited to the chapter (e.g., `"geological_cross_section_palette"`, `"circuit_schematic_symbols"`).
- **`deck_worthiness`** (`string`): Assessment of source slide deck value (`"HIGH"`, `"MEDIUM"`, `"LOW"`).
- **`deck_complexity`** (`string`): Target slide budget and density (`"STANDARD_8_12"`, `"COMPLEX_12_15"`).
- **`io_worthiness`** (`string`): Assessment of source spatial/diagrammatic recall value (`"HIGH"`, `"MEDIUM"`, `"LOW"`, `"NONE"`).
- **`io_candidates`** (`object[]`): High-value spatial/diagrammatic targets for Image Occlusion:
  ```json
  [
    {
      "evidence_id": "ev-001",
      "target_title": "यूरोप की प्राकृतिक सीमाएं (Natural Boundaries of Europe)",
      "visual_category": "geography_map",
      "target_elements": ["पिरिनीज पर्वत", "आल्प्स पर्वत", "यूराल पर्वत", "काकेशस पर्वत"],
      "recommended_io_shape": "rectangle",
      "recommended_io_mode": "hide_all_guess_one"
    }
  ]
  ```

---

## 4. Semantic Extraction Reuse Architecture

To prevent redundant processing and maintain total source fidelity, visual generation layers **MUST NEVER perform a second independent source-analysis pass**.

### Single Shared Semantic Source:
The central **Authorized Evidence Pack** (`scratch/evidence-pack.md`), constructed during Phase 4 of the Core Workflow, already extracts and indexes all necessary domain components:
- Taxonomies & Classifications
- Definitions & Core Concepts
- Process Steps, Mechanisms & Sequences
- Causal & Relational Chains
- Mathematical Formulas, Validity Bounds & Conditions
- Examiner Traps, Common Errors & Fallacies
- Dominant Cognitive Architecture
- Explicit Visual Figures & Multimodal Data

### Data Flow for Visual Artifacts:
```text
                  Authorized Study Source
                             │
                             ▼
            Phase 4: Central Knowledge Extraction
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
   Authorized Evidence Pack        Transient Visual Profile
   (scratch/evidence-pack.md)     (Schema in execution state)
              │                             │
              └──────────────┬──────────────┘
                             │
       ┌─────────────────────┼─────────────────────┬─────────────────────┐
       ▼                     ▼                     ▼                     ▼
  core-notes           core-mindmap         core-slide-deck     core-image-occlusion
 (Obsidian Notes)    (MindMap JSON)       (NotebookLM Prompt)    (IO JSON Manifest)
```

---

## 5. Image Occlusion Eligibility & Routing Rules

> **Governing Principle**: *Presence of an image is NOT sufficient reason to create an IO card. The target itself must benefit from spatial or visual recall.*

### A. Eligibility Triggers (IO-Worthy Targets):
IO routing is triggered when the target contains:
- **Anatomy & Organ Systems**: Organ layers, muscular/skeletal systems, circulatory paths, cellular structures.
- **Geography, Relief & Cartography**: Physical relief, mountain passes, river drainage confluences, straits, island sequences, border treaties.
- **Spatial Topologies & Directional Layouts**: Coordinate grids, relative alignments (N/S/E/W), clockwise perimeters.
- **Circuit Diagrams & Schematics**: Component networks, logic gates, instrument configurations.
- **Flowcharts, Decision Trees & Process Cycles**: Multi-stage pathways, institutional hierarchies, geomorphic cycles.
- **Labeled Scientific Illustrations & Apparatus**: Experimental setups, optical paths, crystal structures, geological strata.

### B. Suppression Rules (Do NOT Generate IO):
IO is strictly suppressed when content consists of:
- Pure definitions (handled by Basic TSV)
- Isolated dates and chronologies (handled by Basic/Cloze TSV)
- Ordinary factual lists (handled by Cloze TSV / Notes)
- Constitutional articles and text (handled by Cloze TSV)
- Abstract economic/political theories (handled by Notes/SlideDeck)
- Algebraic/mathematical manipulations (handled by Notes/ProblemPatterns)
- Reasoning rules and syllogisms (handled by Notes/ProblemPatterns)
- Prose-only knowledge devoid of spatial/locational utility.

---

## 6. Subject Skill Visual Grammar Interface

Every active Subject Skill provides domain intelligence via a standardized `visual_learning_grammar` section:

```yaml
visual_learning_grammar:
  dominant_structures:
    - ...
  preferred_visual_forms:
    - ...
  preferred_narrative_modes:
    - ...
  high_value_visual_opportunities:
    - ...
  visual_anti_patterns:
    - ...
```

The Slide Deck and Image Occlusion generators combine this discipline-specific grammar with the chapter's extracted evidence to determine appropriate visual designs without imposing rigid or artificial template constraints.

