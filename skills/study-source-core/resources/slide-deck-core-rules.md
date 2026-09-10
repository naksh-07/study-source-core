# Slide Deck Core Rules (`slide-deck-core-rules.md`)

This document defines the universal governance and architectural contract for the **NotebookLM Slide Deck Prompt** sibling output within `study-source-core`.

---

## 1. Activation & System Mission

The Slide Deck Prompt (`[Chapter]_SlideDeckPrompt.md`) is a dedicated sibling output designed to transform the central **Authorized Evidence Pack** into a structured, high-impact prompt for generating interactive study slide decks in NotebookLM and visual presentation engines.

### Sibling Pipeline Topology:
```text
Knowledge Note  (Notes/        ──► [Chapter]_Notes.md)
Basic Anki      (Basic/        ──► [Chapter]_Basic.tsv)
Cloze Anki      (Cloze/        ──► [Chapter]_Cloze.tsv)
MindMap         (MindMap/      ──► [Chapter].mindmap.json)
ProblemPatterns (Optional/     ──► [Chapter]_ProblemPatterns.md)
SlideDeck Prompt(SlideDeck/    ──► [Chapter]_SlideDeckPrompt.md)  ← SIBLING OUTPUT
```

### Core Tenets:
1. **Independent Sibling Principle**: The Slide Deck Prompt is generated directly from the **Authorized Evidence Pack** (`scratch/evidence-pack.md`) using domain visual models from the active Subject Skill. It is NOT a summary of the finished `Notes.md`.
2. **NotebookLM-Optimized Prompt Contract**: The output is formatted as an end-to-end, copy-pasteable prompt containing explicit slide-by-slide layout blueprints, visual hierarchy instructions, and structured content payloads.
3. **Hindi-First Presentation Language**: All slide headlines, bullet points, explanations, visual descriptions, and teacher speaker notes MUST follow the Core Hindi-first language contract (with standard English technical terms in parentheses `( )`).
4. **100% Strict Source Grounding**: In `SOURCE_ONLY` mode (default), zero external facts, ungrounded visual fluff, or hallucinated examples may be injected.
5. **Prompt Economy & Density**: The generated instruction payload adheres to a soft budget of **~1,000–1,800 words** (up to ~2,000 words for complex multi-topic chapters) to prevent prompt bloat while preserving deep subject intelligence.

---

## 2. Universal Slide Deck Structure & Pacing

A standard study deck consists of **8–15 slides** structured logically across 6 functional slide phases:

| Slide Phase | Recommended Slides | Primary Focus | Visual Container Model |
|---|---|---|---|
| **1. Hook & Orientation** | Slide 1–2 | Chapter overview, mental model, governing questions, learning objectives. | **Split-Screen Banner / Central Hero Layout** |
| **2. Architecture & Taxonomy** | Slide 3–4 | Structural classifications, anatomy, spatial distributions, constitutional organs. | **3-Column Hierarchy / Structural Pyramid** |
| **3. Process & Mechanism** | Slide 5–7 | Step-by-step flows, metabolic pathways, chronological timelines, legislative procedures. | **Horizontal Flow Ribbon / Step Ladder** |
| **4. Contrast & Comparison** | Slide 8–9 | Paired distinctions (A vs B), continuity vs change, alternative reaction pathways. | **2-Column Side-by-Side Matrix** |
| **5. Performance & Patterns** | Slide 10–12 | Deep problem topologies, decision trees, solved archetypes, shortcuts. | **Decision Tree / Method Selection Card** |
| **6. Traps & Quick Revision** | Slide 13–15 | Examiner traps, common fallacies, boundary conditions, top 10 memory points. | **High-Contrast Warning Box / Summary Grid** |

---

## 3. Visual-First Cognitive Design Rules (Anti-Slop & Readability)

Slide decks are visual comprehension engines, NOT textbooks broken across slides.

### Strict Negative Constraints:
- ❌ **NO walls of text**: Multi-sentence narrative paragraphs on slides are strictly FORBIDDEN.
- ❌ **NO generic bullet spam**: Maximum **4 content bullets per slide** (preferred 2–3 concise bullets; 0 bullets permitted for diagram-led slides).
- ❌ **NO uncontextualized formula dumps**: Every formula must have its physical/mathematical meaning and validity bounds explicitly tagged.
- ❌ **NO decorative filler without pedagogical purpose**: Avoid generic clip-art descriptions. Every visual element must map to a domain concept.

### Mandatory Positive Grammar:
1. **Clear Layout Directives**: Every slide specification must explicitly state its visual layout container (e.g., `Layout: 2-Column Split (Left: Concept Flowchart | Right: Key Insights)`).
2. **Brevity & Density Limits**: Maximum **4 bullet points** per slide (preferred 2–3; under **12 words** each). Visual-only slides may use 0 bullets.
3. **Visual Anchors & Callout Badges**:
   - `💡 मुख्य सिद्धांत (Core Principle)`
   - `📐 गणितीय सूत्र / समीकरण (Formula / Equation)`
   - `⚠️ परीक्षक जाल / सामान्य भूल (Examiner Trap / Common Error)`
   - `⚡ शॉर्टकट / त्वरित नियम (Shortcut Rule)`
   - `🔍 उदाहरण / अनुप्रयोग (Real Application)`
4. **Speaker / Teacher Notes**: Each slide blueprint includes concise Hindi speaker notes (2–3 sentences) providing conceptual depth to accompany the visual slide.

---

## 4. Chapter-First Directory Organization

The Slide Deck Prompt artifact MUST be stored in the dedicated `SlideDeck/` folder under the Chapter directory:

```text
Study Materials/[Subject]/[Chapter Folder]/SlideDeck/[Chapter]_SlideDeckPrompt.md
```

---

## 5. Subject Skill Integration

The generic Slide Deck rules define universal layout containers and structure. The active **Subject Skill** governs:
- Domain-specific visual representation models (e.g. Free Body Diagrams for Physics, Reaction networks for Organic Chemistry, Timeline ribbons for History, Spatial profiles for Geography).
- High-yield visual emphasis and examiner trap identification for that subject.
- Domain DNA mapping to slide layouts.
