---
name: geography-study
description: Subject-specific Geography layer for study-source-core. Defines Geography knowledge architecture (8 Domain DNA types, 5 chapter categories), spatial modeling rules, physical-human relational models, Geography note skeleton, card selection logic, performance rules, and domain audit checks.
---

# Geography Study Skill (`geography-study`)

## 1. Subject Mission & Core Inheritance

`geography-study` is the specialized Geography domain layer for `study-source-core`. It operates on top of the universal core engine:

- **Inherited Core Capabilities**: Source boundary policy, 4 explicit execution modes (`SOURCE_ONLY` default), Plan/Approval workflow (Mode A $\rightarrow$ Mode B), conditional artifact policy (evaluating Notes, Basic, Cloze), Basic/Cloze TSV file separation, tool-agnostic principles, and Core technical validation.
- **Geography Domain Ownership**: Geography knowledge typology, spatial modeling rules, physical-human relational graphs, geography note architecture, card selection logic, spatial performance rules, and domain audit checks.

> *This skill inherits all core policies, StudyLab invariants, 3-tier hints, options contracts, error taxonomies, and universal language contracts directly from `study-source-core`. Do not duplicate core definitions here.*

---

## 2. Geography Knowledge Architecture

Geography is a **spatial, physical, and human relational discipline**. Analyze source knowledge across **8 Domain DNA Knowledge Types** and **5 Chapter Categories**:

### A. 8 Domain DNA Knowledge Types
1. **Declarative**: Names, terms, dates, discrete geographical facts.
2. **Spatial**: Location, distribution, orientation, neighboring features, latitude/longitude alignments, river courses.
3. **Relational**: Physical $\leftrightarrow$ Human geography links (climate $\rightarrow$ vegetation, terrain $\rightarrow$ settlements, resources $\rightarrow$ industries).
4. **Causal**: Physical mechanisms behind phenomena (cause $\rightarrow$ effect, pressure gradient $\rightarrow$ wind, uplift $\rightarrow$ rainfall).
5. **Classification**: Landform types, climate zones, rock types, regional divisions.
6. **Process / Mechanism**: Formation stages, cycles, sequences (water cycle, rock cycle, cyclone evolution).
7. **Comparative**: Paired concepts, A vs. B comparisons, landform/climate similarities and differences.
8. **Data / Factual**: Measurements, statistics, numerical constants, specific coordinates/values.

### B. 5 Chapter Categories
- **Physical Geography**: Earth structure, geomorphology, landforms, hydrosphere, plate tectonics.
- **Climate Systems**: Atmosphere, pressure belts, wind systems, monsoons, cyclones, Köppen classifications.
- **Environmental Systems**: Water cycle, ocean currents, ecosystems, biomes, conservation.
- **Resource & Human Geography**: Agriculture, population, minerals, energy, industries, transport networks.
- **Regional & Spatial Geography**: Drainage systems, mountain ranges, plateaus, state/world regional maps & facts.

---

## 3. Geography Note Architecture

A Geography note (`[Chapter]_Notes.md`) is a **permanent spatial and conceptual knowledge model**:

### Flexible Section Architecture
```markdown
# [Chapter Title] ([अध्याय का नाम in Hindi / English])

## 1. Chapter Overview & Primary Domain (अध्याय का सार)
- Primary classification (Physical / Climate / Environmental / Human / Regional).
- Core geographical phenomena and governing physical principles.

## 2. Core Concepts & Definitions (मुख्य अवधारणाएँ एवं परिभाषाएँ)
- Essential terms, definitions, and physical concepts.

## 3. Physical & Natural Aspects (भौतिक एवं प्राकृतिक पहलू)
- Landform features, rock compositions, atmospheric layers, or water bodies.

## 4. Location & Spatial Distribution (स्थान एवं भौगोलिक वितरण)
- Spatial coordinates, directional alignments (N/S/E/W), neighboring features, distribution maps.

## 5. Processes, Mechanisms & Cause-Effect Chains (प्रक्रियाएँ एवं कारण-परिणाम)
- Formation steps, pressure-temperature-wind mechanisms, erosional cycles.

## 6. Classifications & Comparative Analysis (वर्गीकरण एवं तुलनात्मक अध्ययन)
- Side-by-side matrices comparing confusable geographical landforms, biomes, or winds.

## 7. Key Facts & Statistics (महत्वपूर्ण तथ्य एवं आंकड़े)
- Area, elevation, temperature/rainfall data, production ranks, demographic figures.

## 8. Exceptions, Common Confusions & Spatial Anomalies (अपवाद एवं सामान्य भ्रम)
- Spatial anomalies (e.g., rivers flowing west into Arabian Sea, Venus retrograde rotation).

## 9. 5-Minute Quick Revision Zone (त्वरित पुनरावृत्ति)
- High-yield spatial recall summary.
```

### Spatial Formatting & Language Rules
- **Spatial Markers**: Preserve directional orientation (North/South/East/West), positions (Windward/Leeward, Coastal/Inland), and ordered spatial flows (river source to mouth).
- **Language**: Hindi baseline. Preserve standard English technical terms in parentheses (e.g., परिक्रमण (Revolution), भूआभ (Geoid), प्रकाशमंडल (Photosphere)).

---

## 4. Geography Memory Architecture

`geography-study` implements memory selection across standard output contracts:

### A. Basic Card Selection (`[Chapter]_Basic.tsv`)
- **Focus**: Direct atomic retrieval.
  - *Definitions*: "निहारिका (Nebula) किसे कहते हैं?"
  - *Person $\rightarrow$ Theory*: "भूगोल का पिता किसे कहा जाता है? | Eratosthenes"
  - *Place $\rightarrow$ Feature*: "Nix Olympia पर्वत किस ग्रह पर स्थित है? | मंगल (Mars)"
  - *Numerical Constants*: "चन्द्रशेखर सीमा का मान कितना है? | 1.44 $M_\odot$"
  - *Recognition Signals*: "'जीवाश्म तारा' किसे कहते हैं? | श्वेत वामन (White Dwarf)"

### B. Cloze Card Selection (`[Chapter]_Cloze.tsv`)
- **Focus**: Contextual facts, sequences, spatial alignments, and cause-effect chains.
  - *Contextual Facts*: `पृथ्वी अपने अक्ष पर {{c1::23½°}} तथा अपने तल पर {{c2::66½°}} झुकी हुई है।`
  - *Spatial Relationships*: `भूमध्य रेखा {{c1::13 देशों}} से होकर गुजरती है।`
  - *Cause $\rightarrow$ Effect*: `सूर्य और पृथ्वी के बीच चंद्रमा के आने पर {{c1::सूर्य ग्रहण (Solar Eclipse)}} लगता है।`
  - *Paired Concepts*: `शुक्र और अरुण ग्रह का घूर्णन {{c1::पूर्व से पश्चिम (उल्टा)}} होता है।`
  - *Sequences / Lists*: `पार्थिव या आंतरिक ग्रहों में बुध, शुक्र, {{c1::पृथ्वी}} और {{c2::मंगल}} शामिल हैं।`

### C. Specialized Memory Outputs (Optional & Justified Only)
- `[Chapter]_Comparative.tsv`: For paired landform/climate distinctions (e.g., Tropical vs Temperate Cyclones, Stalactite vs Stalagmite).
- `[Chapter]_Mnemonic.tsv`: Source-provided memory devices ONLY (e.g., acronyms for planet order or river tributaries provided by source).

---

## 5. Geography Performance Architecture (Conditional Layer)

When the source contains spatial problem solving, map analysis, climate classification, or demographic calculations, produce `[Chapter]_ProblemPatterns.md`:

### A. Spatial & Relational Decision Rules
- *Wind Pattern Decision*: `Pressure Difference → Corliolis Force Direction → Hemisphere → Wind Direction`
- *Local Time Calculation*: `Longitude Difference → 1° = 4 minutes → East (Add) / West (Subtract)`
- *Climate Classification*: `Temperature Regime → Precipitation Pattern → Seasonal Distribution → Köppen Code`

### B. Geography Error Intelligence (10 Categories)
1. *Spatial Direction Reversal* (confusing Eastward vs Westward flowing rivers).
2. *Atmospheric Layer Inversion* (swapping Troposphere/Stratosphere temperature gradients).
3. *Cause-Effect Confusion* (confusing cause of tides vs ocean currents).
4. *Landform Agent Error* (confusing Fluvial vs Glacial vs Aeolian landforms).
5. *Latitude / Longitude Misalignment* (misidentifying states/countries on Tropic of Cancer).
6. *Scale / Unit Error* (confusing map scales or distance conversions).
7. *Climate Code Misinterpretation* (misapplying Köppen letters).
8. *Demographic / Economic Data Confusion* (confusing production vs reserve ranks).
9. *Terminology Confusion* (e.g., Solstice vs Equinox, Perihelion vs Aphelion).
10. *Map Feature Misidentification*.

---

## 6. Subject-Specific Output Extensions

---

## 7. Subject Domain Audit

In addition to Core technical validation, perform Geography Domain Audit:
1. **Spatial Relationship Preservation**: Are directional alignments, latitude/longitude crossings, and river sequences accurately preserved without truncation?
2. **Physical Mechanism Integrity**: Are cause $\rightarrow$ effect chains (e.g., pressure gradients, erosion stages) logically complete?
3. **Map Context Coverage**: Are key geographic locations and features explicitly contextualized?
4. **Data Accuracy**: Are numerical values, coordinates, and statistics faithful to the authorized source?

---

## 8. PYQ & External Mode Interpretation

In `SOURCE_PLUS_PYQ` mode:
- PYQs identify high-frequency spatial areas (e.g., repeatedly tested river tributaries, Tropic of Cancer states, mountain passes).
- PYQ analysis feeds `[Chapter]_ProblemPatterns.md` under `Testability & Examiner Traps`.
- PYQ data MUST NOT rewrite static source facts in `[Chapter]_Notes.md`.

---

## 9. Exceptions & Spatial Anomalies

Structure geographical exceptions explicitly in Notes and Cards:
`STANDARD RULE → REGULAR BEHAVIOR → GEOGRAPHICAL ANOMALY → PHYSICAL REASON → IMPLICATION`  
*(Example: Most Indian peninsular rivers flow East into Bay of Bengal → Exception: Narmada and Tapi flow West into Arabian Sea → Reason: Rift valley faulting → Implication: Estuary formation instead of delta).*

---

## 10. Visual Map Architecture

### A. Natural Map Types & Knowledge Structures
- **Landform & System Classifications**: Rock types, landforms, climate zones $\rightarrow$ **Hierarchy / Radial Map**.
- **Physical Processes & Mechanisms**: Erosion stages, cyclone evolution, wind belt mechanisms $\rightarrow$ **Process / Flowchart Map**.
- **Spatial Alignment & Distributions**: Celestial bodies, atmospheric layers, geographic zones $\rightarrow$ **Spatial / Hierarchical Map**.
- **Physical $\leftrightarrow$ Human Cause-Effect Links**: Climate $\rightarrow$ Vegetation $\rightarrow$ Agriculture $\rightarrow$ **Causal / Concept Map**.

### B. Structures Prohibited from Ordinary Radial Maps
- ❌ **Sequential River Systems / Spatial Flows**: Map as **Process / Spatial Map**, NEVER force into an unordered radial tree.
- ❌ **Physical Process Cycles** (Water cycle, Rock cycle): Map as **Process / Concept Map**.
- ❌ **Detailed Regional Demographics & Long Statistical Tables**: Keep in **Notes.md**, do NOT put statistical text dumps in map nodes.

### C. Subject-Specific Semantics
- **Node Semantics**: Geographical feature, landform, zone, planet stage in Hindi + English parentheses `( )` (2–5 words).
- **Edge Semantics**: `located in` (में स्थित है), `causes` (कारण बनता है), `erodes into` (अपरदित होकर बनता है), `flows into` (में प्रवाहित होता है), `contrasts with` (विपरीत है).

### D. Geographical Failure Modes to Avoid
- Stripping spatial directions (N/S/E/W) or physical flow order.
- Force-fitting chronological geological time scales into static radial trees.

---

## 11. Subject-Specific Visual Learning Grammar

```yaml
visual_learning_grammar:
  dominant_structures:
    - spatial
    - stratigraphic
    - terrain
    - cross-section
    - map relationships
    - circulation systems
    - geomorphic processes
    - geological evolution
    - before/after spatial comparison
  preferred_visual_forms:
    - maps
    - cross-sections
    - terrain/relief views
    - layer diagrams
    - process sequences
    - spatial comparisons
    - geological timelines
  preferred_narrative_modes:
    - spatial exploration
    - process evolution
    - regional comparison
    - macro-to-micro landscape zoom
  high_value_visual_opportunities:
    - atmospheric circulation belts and global wind pressure systems
    - river course transformations across youth, mature, and old stages
    - plate tectonic boundaries, subduction zones, and rift valleys
    - geological cross-sections showing lithospheric and mantle strata
    - cyclone structure, eye formation, and isobar pressure gradients
    - landform evolution cycles (fluvial, karst, glacial, aeolian)
  visual_anti_patterns:
    - text-only location lists without spatial anchors
    - fake maps or decorative maps with no geographic accuracy
    - decorative landscape photographs with no explanatory pedagogical function
    - giant bullet lists where spatial/profile visualization would convey relationships better
```

### Domain Visual Reasoning
- **Spatial Grounding**: Prioritize directional orientation (N/S/E/W), elevations, vertical atmospheric/oceanic layers, and coordinate grids.
- **Process Over Static State**: Illustrate how dynamic forces (tectonics, erosion, pressure gradients) sculpt landscapes over time.
- **Relational Profiles**: Use cross-sections and dual-panel maps to expose physical $\leftrightarrow$ human geography interactions (e.g. rain shadow effect $\rightarrow$ arid vegetation $\rightarrow$ pastoral economy).

---

## Multimodal Execution Triggers
- **Visual Inspection Rule**: Inspect maps and spatial diagrams natively when they contain factual geographic information. Do NOT use OCR if native multimodal understanding is sufficient. Do not inspect every image automatically.
