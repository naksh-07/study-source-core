# StudySourceCore — Subject × Artifact Matrix & Domain Policy

> **Canonical Document**: `docs/SUBJECT_POLICIES.md`  
> **Status**: AUTHORITATIVE / FROZEN BASELINE  
> **Version**: 1.0.0-POLICY  
> **Governance Authority**: StudySourceCore Master Governance Board  

---

## 1. Domain-Aware Pedagogical Philosophy

In StudySourceCore, **subject domain epistemology dictates artifact strategy**. Generating the same generic blend of flashcards and notes across all subjects is treated as an architectural defect. 

- A **mathematics** chapter requires problem families, stepwise derivations, coprime constraints, and solution DAGs; generating rote factual flashcards for math formulas without problem practice degrades learning.
- A **history** chapter requires chronological anchors, cause-and-effect narrative synthesis, and atomic date/event recall; forcing history into procedural algorithm trees produces nonsensical artifacts.
- A **cartography/map** chapter is visual-first; text summaries without spatial map occlusions fail the primary learning objective.

---

## 2. Artifact Policy States

Every artifact modality for a given subject is assigned one of four definitive policy states:

| Policy State | Operational Meaning | Generation Behavior |
|---|---|---|
| **CORE** | Mandatory pedagogical pillar for this subject. | Always dispatched when source evidence meets minimal volume thresholds. |
| **CONDITIONAL** | Generated if and only if justified by explicit source features. | Evaluated by `routing_engine.js`. If candidate count equals 0, suppressed with auditable code. |
| **LOW** | Discouraged or secondary modality for this subject. | Restricted to small candidate caps; suppressed if higher-yield modalities suffice. |
| **UNSUPPORTED** | Pedagogically contraindicated or structurally invalid. | Hard suppression. Disallowance enforced by `subject_policy_resolver.js`. |

---

## 3. The Master Subject × Artifact Matrix

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                MASTER SUBJECT × ARTIFACT MATRIX                                        │
├──────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬────────┤
│ Subject Domain   │ Notes    │ Basic    │ Cloze    │ Image    │ MindMap  │ Slide    │ Proced.  │ Quest. │
│                  │ (Obsid.) │ Anki     │ Anki     │ Occlus.  │ (JSON)   │ Deck     │ APKG     │ Bank   │
├──────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ **Biology**      │ CORE     │ CORE     │ CORE     │ CORE     │ CONDIT.  │ CONDIT.  │ UNSUPP.  │ UNSUPP.│
├──────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ **Chemistry**    │ CORE     │ CONDIT.  │ CORE     │ CONDIT.  │ CONDIT.  │ CONDIT.  │ CORE*    │ CORE*  │
├──────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ **Geography**    │ CORE     │ CORE     │ CORE     │ CORE     │ CORE     │ CONDIT.  │ UNSUPP.  │ UNSUPP.│
├──────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ **History**      │ CORE     │ CORE     │ CORE     │ LOW      │ CORE     │ CORE     │ UNSUPP.  │ UNSUPP.│
├──────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ **Map**          │ CONDIT.  │ LOW      │ LOW      │ CORE     │ LOW      │ CONDIT.  │ UNSUPP.  │ UNSUPP.│
├──────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
┌─────────────────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬────────┐
│                                MASTER SUBJECT × ARTIFACT MATRIX                                                 │
├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ Subject Domain                  │ Notes    │ Basic    │ Cloze    │ Image    │ MindMap  │ Slide    │ Proced.  │ Quest. │
│                                 │ (Obsid.) │ Anki     │ Anki     │ Occlus.  │ (JSON)   │ Deck     │ APKG     │ Bank   │
├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ **Biology**                     │ CORE     │ CORE     │ CORE     │ CORE     │ CONDIT.  │ CONDIT.  │ UNSUPP.  │ UNSUPP.│
├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ **Chemistry**                   │ CORE     │ CONDIT.  │ CORE     │ CONDIT.  │ CONDIT.  │ CONDIT.  │ CORE*    │ CORE*  │
├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ **Geography**                   │ CORE     │ CORE     │ CORE     │ CORE     │ CORE     │ CONDIT.  │ UNSUPP.  │ UNSUPP.│
├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ **History**                     │ CORE     │ CORE     │ CORE     │ LOW      │ CORE     │ CORE     │ UNSUPP.  │ UNSUPP.│
├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ **Map**                         │ CONDIT.  │ LOW      │ LOW      │ CORE     │ LOW      │ CONDIT.  │ UNSUPP.  │ UNSUPP.│
├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ **Math**                        │ CONDIT.  │ LOW      │ LOW      │ LOW      │ LOW      │ LOW      │ CORE     │ CORE   │
├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ **Physics**                     │ CORE     │ CONDIT.  │ CORE     │ CONDIT.  │ CONDIT.  │ CONDIT.  │ CORE*    │ CORE*  │
├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ **Political Science (Polity)**  │ CORE     │ CORE     │ CORE     │ LOW      │ CORE     │ CONDIT.  │ UNSUPP.  │ UNSUPP.│
├─────────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼────────┤
│ **Reasoning**                   │ LOW      │ UNSUPP.  │ LOW      │ CONDIT.  │ LOW      │ LOW      │ CORE     │ CORE   │
└─────────────────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴────────┘
```
*\*For Chemistry and Physics, Procedural APKG and Question Bank are CORE for calculational/mechanistic topics, and UNSUPPORTED for purely descriptive theory topics.*  
*\*Political Science is canonically registered as `Political Science` with alias `Polity`.*

---

## 4. Subject-by-Subject Pedagogical Strategy

### 4.1 Biology (`biology-study`)
- **Epistemology**: Highly taxonomic, anatomical, physiological, and definitional.
- **Pedagogical Strategy**:
  - *Image Occlusion (CORE)*: Anatomical organs, cell structures, and biological cycles must be masked spatially.
  - *Basic & Cloze Anki (CORE)*: Memorization of scientific terminology, binomial nomenclature, organ functions, and enzyme pathways.
  - *Knowledge Notes (CORE)*: Hierarchical synthesis with comparison tables (e.g., Mitosis vs. Meiosis).
  - *Procedural APKG (UNSUPPORTED)*: Suppressed with `NON_PROCEDURAL_DOMAIN`. Biology lacks calculational problem DAGs.

### 4.2 Chemistry (`chemistry-study`)
- **Epistemology**: Split domain: Physical chemistry is calculational; Organic is mechanistic; Inorganic is descriptive and periodic.
- **Pedagogical Strategy**:
  - *Procedural APKG & Question Bank (CORE for Calculational)*: Physical chemistry stoichiometry, gas laws, chemical equilibrium ICE tables, pH calculations, and Nernst equations require the 4-stage procedural pipeline authored by `chemistry-numerical-apkg-author`.
  - *Cloze & Notes (CORE)*: Chemical formulas, periodic trends, reaction conditions, and IUPAC nomenclature.
  - *Suppression Rule*: Purely descriptive inorganic chapters (e.g., mineral ores, color tests) suppress the procedural package with `DESCRIPTIVE_ROTE_NO_CALCULATIONS`.

### 4.3 Geography (`geography-study`)
- **Epistemology**: Spatial distributions, physical geomorphology, climate zones, and demographic patterns.
- **Pedagogical Strategy**:
  - *Image Occlusion (CORE)*: River basins, mountain passes, atmospheric circulation cells, and soil distribution maps.
  - *MindMap (CORE)*: Geomorphological processes and climatic classification systems.
  - *Procedural APKG (UNSUPPORTED)*: Geography does not feature algorithmic problem-solving DAGs. Suppressed with `NON_PROCEDURAL_DOMAIN`.

### 4.4 History (`history-study`)
- **Epistemology**: Chronological progression, historical causality, socio-political movements, and administrative systems.
- **Pedagogical Strategy**:
  - *Knowledge Notes & Slide Deck (CORE)*: Narrative timeline synthesis, chronological signposts, and thematic overviews.
  - *Basic & Cloze Anki (CORE)*: Specific dates, battle names, treaty terms, architectural patrons, and literary works.
  - *Image Occlusion (LOW)*: Restricted to historical empire boundaries or architectural floor plans.
  - *Procedural APKG (UNSUPPORTED)*: Suppressed with `NON_PROCEDURAL_DOMAIN`.

### 4.5 Map & Cartography (`map-study`)
- **Epistemology**: Purely visual-spatial spatial recall and topological boundary identification.
- **Pedagogical Strategy**:
  - *Image Occlusion (CORE)*: The absolute center of the subject. Maps must have approved local images in the drop folder and be masked across political boundaries, national parks, straits, and mountain ranges.
  - *Fail-Closed Invariant*: If no approved high-resolution map image exists, the entire build fails closed with `NO_APPROVED_ASSET`.
  - *Text Modalities (LOW / CONDITIONAL)*: Text notes serve strictly as brief legends or coordinate tables.

### 4.6 Mathematics (`math-study`)
- **Epistemology**: Purely procedural, deductive, algorithmic, and quantitative.
- **Pedagogical Strategy**:
  - *StudyLab Procedural APKG & Question Bank (CORE)*: The absolute primary deliverable. Implements canonical problem patterns, solution DAGs, coprime constraints, and 3-tier hints authored by `math-apkg-author`.
  - *Basic Flashcards (LOW / UNSUPPORTED)*: Rote Q&A cards for math formulas are discouraged because formula recall without method selection creates false fluency.
  - *Knowledge Notes (CONDITIONAL)*: Short reference summaries of formulas and decision trees; never narrative essays.

### 4.7 Physics (`physics-study`)
- **Epistemology**: Dual domain: Theoretical principles (Newton's laws, Thermodynamics) and rigorous numerical calculations (Kinematics, Circuits, Optics).
- **Pedagogical Strategy**:
  - *Procedural APKG & Question Bank (CORE for Numericals)*: All calculational chapters (incline planes, projectile motion, resistance networks, lens formulas) execute the 6-stage numerical pipeline (FBD, Coordinates, Law, Solve, SI units, Sanity check) via `physics-numerical-apkg-author`.
  - *Cloze & Basic (CORE for Theory)*: Physical laws, SI unit definitions, and dimensional formulas.
  - *Suppression Rule*: Chapters without numerical problems suppress procedural packaging with `DESCRIPTIVE_ONLY_NO_NUMERICALS`.

### 4.8 Political Science (`political-science-study`, alias: `Polity`)
- **Epistemology**: Constitutional articles, statutory frameworks, institutional structures, and landmark judicial doctrines.
- **Pedagogical Strategy**:
  - *Knowledge Notes (CORE)*: Structured articles, constitutional amendment tables, and executive/legislative jurisdictional hierarchies.
  - *Cloze & Basic Anki (CORE)*: Article numbers, constitutional quotas, terms of office, and majority requirements.
  - *MindMap (CORE)*: Separation of powers and federal-state legislative relation trees.
  - *Procedural APKG (UNSUPPORTED)*: Suppressed with `NON_PROCEDURAL_DOMAIN`.

### 4.9 Reasoning (`reasoning-study`)
- **Epistemology**: Formal deductive logic, spatial puzzles, syllogisms, seating arrangements, and pattern recognition.
- **Pedagogical Strategy**:
  - *StudyLab Procedural APKG & Question Bank (CORE)*: Problem patterns, constraint classification (Fixed vs. Variable), and step-by-step deduction trees authored by `reasoning-apkg-author`.
  - *Basic Flashcards (UNSUPPORTED)*: Logic cannot be memorized as factual flashcards. Suppressed with `NON_PROCEDURAL_DOMAIN`.

### 4.10 Canonical Domain Boundaries & Non-Canonical Domains
StudySourceCore establishes strictly **nine canonical subject skills**:
1. `Biology` (`biology-study`)
2. `Chemistry` (`chemistry-study`)
3. `Geography` (`geography-study`)
4. `History` (`history-study`)
5. `Map` (`map-study`)
6. `Math` (`math-study`)
7. `Physics` (`physics-study`)
8. `Political Science` (`political-science-study`, registered alias: `Polity`)
9. `Reasoning` (`reasoning-study`)

> [!IMPORTANT]
> **Canonical Status of Map**: `Map` is an autonomous canonical subject skill owning visual-spatial cartographic recall, and is NOT merely a subtopic of Geography.  
> **Status of Economy, Science & Tech, and Others**: Economy, Science & Tech, Environmental Ecology, etc., are non-canonical / exploratory domains. They are NOT registered as canonical subject skills in v1.0. Any future expansion to include them is explicitly `[PLANNED / POST-v1.0]`. The orchestrator and routing engine must never silently invent or route to unapproved subject domains.

---

## 5. Explicit Suppression Reason Codes

When `routing_engine.js` evaluates evidence for a chapter, any omitted deliverable must record an auditable suppression reason in `scratch/routing_manifest.json`:

| Suppression Reason Code | Meaning | Affected Modality |
|---|---|---|
| `ZERO_BASIC_CANDIDATES` | Source lacks isolated atomic definitions. | Basic TSV |
| `ZERO_CLOZE_CANDIDATES` | Source lacks contextual in-sentence relations. | Cloze TSV |
| `NO_IO_CANDIDATES` | Source lacks diagrammatic or anatomical visual profiles. | Image Occlusion |
| `NO_APPROVED_ASSET` | Visual need identified but no approved local asset in drop folder. | Image Occlusion |
| `NO_RELATIONAL_TOPOLOGY` | Concept tree depth $< 2$ or branches $< 3$; linear content. | MindMap |
| `DECK_WORTHINESS_BELOW_THRESHOLD` | Chapter lacks narrative pacing suitable for slides. | Slide Deck |
| `NON_PROCEDURAL_DOMAIN` | Subject domain is declarative; procedural solving invalid. | StudyLab APKG / Question Bank |
| `DESCRIPTIVE_ONLY_NO_NUMERICALS` | Physics chapter contains theory but zero calculational items. | StudyLab APKG / Question Bank |
| `DESCRIPTIVE_ROTE_NO_CALCULATIONS` | Chemistry chapter contains descriptive facts without calculations. | StudyLab APKG / Question Bank |
| `ZERO_SOLVABLE_PRACTICE_QUESTIONS`| STEM chapter evidence pack contains 0 solvable practice items. | StudyLab APKG / Question Bank |
| `SUPPRESSED_BY_SUBJECT_POLICY` | Hard policy suppression mandated by domain DNA. | Various |
