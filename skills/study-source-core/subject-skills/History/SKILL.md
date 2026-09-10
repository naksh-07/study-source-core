---
name: history-study
description: Subject-specific History layer for study-source-core. Defines History knowledge architecture (12 Domain DNA types), 2 parallel non-collapsible layers (Historical Memory vs Historical Understanding), era-specific models (Ancient, Medieval, Modern, MP History, World History), historiography preservation, cause-effect-continuity-change chains, conditional outputs, and domain audit checks.
---

# History Subject Skill (`history-study`)

## 1. Subject Mission & Core Inheritance

`history-study` is the specialized History domain layer for `study-source-core`.

This Skill inherits all universal rules, source boundary policy, source execution modes (`SOURCE_ONLY` default), Plan/Approval workflow (Mode A $\rightarrow$ Mode B), conditional artifact policy (evaluating Notes, Basic, Cloze), Basic/Cloze TSV file separation, tool-agnostic principles, and Core technical validation from `study-source-core`.

This document defines ONLY the subject-specific knowledge architecture, memory selection logic, performance architecture, domain audit rules, and conditional output contracts for History.

### Primary Objective
History must **NOT** be treated as a giant collection of dates and names. History maintains two parallel non-collapsible layers:

1. **HISTORICAL MEMORY (Anki)**: Dates, rulers, dynasties, battles, treaties, acts, books, personalities, places, architecture, organizations, movements, archaeological sites, terminology, and discrete facts.
2. **HISTORICAL UNDERSTANDING (Obsidian Notes)**: Chronology, causation, continuity, change, context, relationships, developments, comparisons, consequences, and historical processes.

> *This skill inherits all core policies, StudyLab invariants, 3-tier hints, options contracts, error taxonomies, and universal language contracts directly from `study-source-core`. Do not duplicate core definitions here.*

---

## 2. History Knowledge Architecture (12 Domain DNA Types)

Categorize all source content into 12 Domain DNA Types:

1. **Temporal / Chronological** | 2. **Actor / Personality** | 3. **Event / Episode** | 4. **Institutional / Administrative** | 5. **Socio-Cultural / Religious** | 6. **Economic / Agrarian** | 7. **Causal** | 8. **Consequential / Impact** | 9. **Continuity & Change** | 10. **Comparative** | 11. **Historiographical / Interpretative** | 12. **Geographical / Spatial**.

---

## 3. Era-Specific Models & Historiography

Apply era-specific intelligence based on source content:
- **Ancient History**: IVC, Vedic, Mahajanapadas, Mauryan/Guptan administration, Art & Architecture (Stupas, Caves, Temples).
- **Medieval History**: Sultanate & Mughal administration (Iqta, Mansabdari, Jagirdari), Revenue systems (Zabt, Dahsala), Bhakti/Sufi movements, Indo-Islamic architecture.
- **Modern History**: Colonial expansion, Land revenue systems, 1857 Revolt, Socio-Religious reforms, Constitutional Acts (1773-1947), Freedom struggle phases, Revolutionary/Tribal uprisings.
- **MP History**: Dynasties of MP (Paramaras, Chandelas, Holkars, Scindias, Bundelas, Gond rulers), MP freedom struggle (Jungle Satyagraha, Charan Paduka), Tribal leaders (Tantya Bhil, Bhima Nayak).
- **World History**: Renaissance, Enlightenment, Industrial Revolution, Revolutions, World Wars, Decolonization, Cold War.

---

## 4. History Note Architecture

A History note (`[Chapter]_Notes.md`) is a **chronological, causal, and analytical knowledge model**:

### Flexible Section Architecture
```markdown
# [Chapter Title] ([इतिहास अध्याय])

## 1. Chapter Overview & Historical Context (ऐतिहासिक पृष्ठभूमि)
- Periodization, era, geographical extent, and core historical theme.

## 2. Chronology & Timeline of Events (कालक्रम एवं समयावली)
- Step-by-step chronological timeline (`Date / Era → Event → Key Actors → Outcome`).

## 3. Key Personalities, Rulers & Organizations (प्रमुख व्यक्तित्व एवं संस्थाएं)
- Detailed profiles of actors, foreign travelers, books, and organizations.

## 4. Administrative, Economic & Social Systems (प्रशासनिक, आर्थिक एवं सामाजिक व्यवस्था)
- Governance structures, revenue systems, trade routes, art, and architecture.

## 5. Causes, Development & Consequences (कारण, विकास एवं परिणाम)
- Causal chains (`Background → Immediate Cause → Course → Consequences → Impact`).

## 6. Continuity & Change Analysis (निरंतरता एवं परिवर्तन)
- What remained unchanged vs what transformed during this period.

## 7. Comparative Historical Analysis (तुलनात्मक अध्ययन)
- Side-by-side matrices comparing rulers, policies, movements, or treaties.

## 8. Historiographical Views & Quotes (इतिहासकारों के मत एवं कथन)
- Famous historical quotes, statements, and analytical perspectives.

## 9. 5-Minute Quick Revision Zone (त्वरित पुनरावृत्ति)
- High-yield dates, battles, treaties, acts, books, and founder maps.
```

---

## 5. History Memory Architecture (Anki Selection Rules)

### A. Basic Flashcards (`[Chapter]_Basic.tsv`)
- **Focus**: Atomic historical memory retrieval (Dates, Book/Author, Founder/Organization, Terms, Acts).

### B. Cloze Flashcards (`[Chapter]_Cloze.tsv`)
- **Focus**: Chronological sequences, cause-effect chains, treaty terms, and multi-element lists.

---

## 6. History Performance Architecture (Conditional Layer)

When the source contains complex multi-event timelines or analytical history decision rules, generate conditional performance artifacts:

### A. Historical Reasoning & Timeline Patterns
- **Chronology Sorting Algorithms**: Rules for ordering unordered historical events.
- **Match the Following Patterns**: Ruler $\leftrightarrow$ Dynasty, Book $\leftrightarrow$ Author, Act $\leftrightarrow$ Provision, Movement $\leftrightarrow$ Leader.
- **Assertion-Reason Analysis**: Causal validation (`Assertion: Event A happened. Reason: Event B caused A`).

### B. 10-Category History Error Log
1. *Chronological Anachronism* | 2. *Actor Misattribution* | 3. *Term Misinterpretation* | 4. *Cause-Consequence Confusion* | 5. *Act / Provision Misalignment* | 6. *Spatial / Location Error* | 7. *Treaty Term Confusion* | 8. *Organization Misalignment* | 9. *Over-generalization Error* | 10. *Quote Misattribution*.

---

## 7. Subject-Specific Output Extensions

---

## 8. Subject Domain Audit

In addition to Core technical validation, perform History Domain Audit:
1. **Chronological Integrity**: Are all dates, years, and event sequences 100% accurate and strictly ordered?
2. **Causal Chain Completeness**: Are background causes, immediate triggers, and long-term impacts fully mapped?
3. **Terminology Precision**: Are ancient/medieval administrative, socio-religious, and economic terms accurately defined?
4. **Historical Memory vs Understanding Separation**: Is detailed factual recall captured in Anki while analytical interpretation is preserved in Notes?

---

## 9. PYQ & External Mode Interpretation

In `SOURCE_PLUS_PYQ` mode:
- PYQs identify high-frequency historical dates, terms, acts, books, and repeated assertion-reason themes.
- PYQ analysis enriches `[Chapter]_Notes.md` under `Exam Frequencies & High-Yield Traps`.
- PYQs MUST NOT rewrite static historical facts or source dates in `[Chapter]_Notes.md`.

---

## 10. Exceptions & Historical Anomalies

Structure historical exceptions explicitly:
`GENERAL HISTORICAL TREND → EXPECTED RULE → HISTORICAL EXCEPTION / DEVIATION → REASON → IMPLICATION`  
*(Example: Standard Mauryan decentralization $\rightarrow$ Exception: Highly centralized Mauryan administration under Ashoka $\rightarrow$ Reason: Royal edicts & Dhamma Mahamattas $\rightarrow$ Implication: Unique bureaucratic control).*

---

## 11. Visual Map Architecture

### A. Natural Map Types & Knowledge Structures
- **Chronological Sequences & Era Successions**: Dynastic timelines, revolution phases $\rightarrow$ **Timeline Map**.
- **Cause-Consequence Networks**: Socio-political movements, war origins $\rightarrow$ **Causal / Concept Map**.
- **Administrative & Dynastic Structures**: Empire governance hierarchy $\rightarrow$ **Hierarchy / Radial Map**.
- **Continuity & Change Transformations**: Policy evolution over time $\rightarrow$ **Process / Network Map**.

### B. Structures Prohibited from Ordinary Radial Maps
- ❌ **Chronological Processes / Dynastic Succession**: NEVER force chronological timelines into static radial trees. Use **Timeline Map**.
- ❌ **Complex Multi-Causal Historical Events**: Map as **Causal / Concept Map**.
- ❌ **Long Historiographical Debates / Essay Paragraphs**: Keep in **Notes.md**, do NOT put long paragraphs in map nodes.

### C. Subject-Specific Semantics
- **Node Semantics**: Era, dynasty, movement, event, policy in Hindi + English parentheses `( )` (2–5 words).
- **Edge Semantics**: `succeeded by` (के बाद आया), `triggered` (प्रेरित किया), `enacted` (लागू किया), `led to` (का कारण बना), `opposed` (विरोध किया).

### D. Historical Failure Modes to Avoid
- Flattening chronological succession into un-ordered radial nodes.
- Stripping causal links between social conditions and political uprisings.

---

## 12. Subject-Specific Visual Learning Grammar

```yaml
visual_learning_grammar:
  dominant_structures:
    - chronology
    - causality
    - territorial change
    - before/after
    - political relationships
    - simultaneous developments
  preferred_visual_forms:
    - timelines
    - before/after maps
    - parallel timelines
    - causal chains
    - archival/artifact framing
  preferred_narrative_modes:
    - chronological progression
    - causal breakdown
    - continuity vs change contrast
    - comparative era analysis
  high_value_visual_opportunities:
    - dynastic succession ribbons and empire rise/fall timelines
    - territorial shifts before and after key treaties or battles
    - parallel multi-theatre timelines (e.g. simultaneous freedom movements across regions)
    - multi-step causal chains (socio-economic tensions -> trigger event -> revolution -> constitutional impact)
    - trade route networks, administrative hierarchies, and architectural evolution
  visual_anti_patterns:
    - date dumps without chronological flow or causal connections
    - uncontextualized portraits of historical figures without structural relevance
    - massive walls of narrative prose describing historical developments
    - flat event lists masking simultaneous developments in other regions
```

### Domain Visual Reasoning
- **Temporal Progression**: Anchor historical events along clear chronological axes, separating background preconditions from immediate triggers.
- **Spatial Dynamic**: Use before/after boundary maps and trade route schematics to show territorial evolution and geo-political consequences.
- **Continuity vs Change**: Contrast what institutions survived transitions versus what structures dissolved.

---

## Multimodal Execution Triggers
- **Visual Inspection Rule**: Inspect timelines, maps, and tables natively when relevant to historical events. Do NOT use OCR if native multimodal understanding is sufficient. Do not inspect every image automatically.
