# StudySourceCore — Knowledge Unit (KU) Specification & Semantic Identity

> **Canonical Document**: `docs/KNOWLEDGE_UNITS.md`  
> **Status**: AUTHORITATIVE / FROZEN BASELINE  
> **Version**: 1.0.0-KU  
> **Governance Authority**: StudySourceCore Master Governance Board  

---

## 1. What is a Knowledge Unit (KU)?

A **Knowledge Unit (KU)** is the atomic, medium-neutral semantic building block of learning content within StudySourceCore. 

A KU does not represent a physical file, a Markdown section, or an Anki card. Instead, a KU represents an indivisible piece of pedagogical knowledge:
- A discrete conceptual definition (e.g., *Ohm's Law*).
- An immutable physical or mathematical invariant (e.g., $\sum F = ma$).
- A specific historical proposition (e.g., *The Treaty of Salbai was signed in 1782*).
- A diagrammatic topological region (e.g., *The right atrium of the human heart*).
- A procedural problem family (e.g., *Incline plane motion with kinetic friction*).

```text
[AUTHORIZED SOURCE CHUNK]
          │
          ▼
[KNOWLEDGE UNIT (KU)]  <-- Stable Semantic Identity
          │
    ┌─────┴───────────────────────────┬───────────────────────────┐
    ▼                                 ▼                           ▼
[Notes Callout]             [Basic / Cloze TSV]         [Image Occlusion Mask]
(Hierarchical synthesis)    (Active retrieval pair)     (Spatial recall region)
```

---

## 2. Why Semantic Identity Matters

In traditional study generation pipelines, knowledge is represented as raw unstructured text strings. This creates three critical failures:
1. **Semantic Duplication**: The same concept is phrased slightly differently by two agents and generated as two separate flashcards, doubling the student's review burden without educational benefit.
2. **Untracked Conceptual Gaps**: Without semantic tracking, the orchestrator cannot mathematically verify whether all core propositions in a textbook chapter were covered.
3. **Broken Bidirectional Lineage**: If a student flags a factual error on a card, there is no deterministic identifier connecting that card back to the exact textbook passage from which it originated.

By assigning every proposition a stable, deterministic **Semantic Identity** (e.g., `ku.physics.circuits.kirchhoff_current_law`), the system can track coverage, enforce deduplication, and guarantee complete lineage across all downstream projections.

---

## 3. Relationship to Evidence Pack [CURRENT]

Every KU is grounded strictly in one or more source chunks within `scratch/evidence-pack.md`:
- A KU cannot exist without direct source provenance.
- The KU inherits the cryptographic SHA-256 fingerprint of its parent evidence chunk.
- If a source chunk changes during a syllabus update, only the specific KUs linked to that chunk are marked stale, enabling incremental recompilation rather than costly whole-chapter regenerations.

---

## 4. Relationship to Declarative Retrieval [CURRENT / TARGET]

A single conceptual KU can be projected into distinct declarative recall modalities based on its pedagogical nature:

| KU Type | Optimal Modality | Projection Example |
|---|---|---|
| **Atomic Fact / Term** | Basic Flashcard (Cued Recall) | **Front**: कार्य का SI मात्रक क्या है? (What is the SI unit of work?)<br>**Back**: जूल (Joule) |
| **Relational Law / Formula** | Cloze Flashcard (Contextual) | संवेग (Momentum) = `{{c1::द्रव्यमान (Mass)}}` × `{{c2::वेग (Velocity)}}` |
| **Spatial / Topological Feature** | Image Occlusion (Spatial Recall) | Normalizing $[x, y, w, h]$ bounding box over the cardiac valve on a verified diagram |

The KU holds the semantic truth; the Pedagogical Compiler decides whether that KU is best reinforced via basic recall, contextual cloze, or spatial occlusion.

---

## 5. Concept Reservation & Deduplication Engine [TARGET — Phase 3]

> [!NOTE]
> **Implementation Status**:  
> **[CURRENT]**: The repository currently uses heuristic candidate counts (`basicCandidateCount`, `clozeCandidateCount`) evaluated in `routing_engine.js`.  
> **[TARGET]**: Phase 3 will introduce the formal `ku_reservation_engine.js` and `semantic_deduplication.js` detailed below.

### 5.1 Pre-Dispatch Concept Reservation
To prevent specialist subagents from competing or duplicating content, the orchestrator executes pre-dispatch concept reservation:
1. The evidence pack is parsed into candidate KUs.
2. Each KU is assigned an optimal primary modality based on domain rules.
3. Once a KU is reserved for Basic Flashcards, it is locked; sibling subagents (Cloze, StudyLab) are prohibited from claiming the identical proposition unless an explicit pedagogical contrast is justified.

### 5.2 Semantic vs. Purely Lexical Deduplication
- **Lexical Deduplication (Flawed)**: Compares raw strings (e.g., Levenshtein distance). It fails when two cards express the exact same fact in active vs. passive voice or bilingual synonyms.
- **Semantic Deduplication (Target)**: Compares canonical propositional claims. If Proposition A ($\text{Unit}(\text{Force}) = \text{Newton}$) is already covered by KU-104, any newly proposed card matching Proposition A is merged into the existing KU rather than emitted as a redundant card.

---

## 6. Architecture Status & Roadmap Summary

| Component | Nature | Governance Status | Implementation Phase |
|---|---|---|---|
| **Evidence Pack Chunking** | Verbatim text slicing with byte offsets | Current | Phase 0 / In Use |
| **Semantic KU Identity** | Stable UUID / Ontology string | Target | Phase 1 (Semantic IR) |
| **KU Reservation Engine** | Pre-dispatch track allocation | Target | Phase 3 |
| **Semantic Deduplication** | Proposition-level collision prevention | Target | Phase 3 |
| **Bidirectional Lineage** | Source Chunk $\leftrightarrow$ KU $\leftrightarrow$ Card ID | Target | Phase 2 (CLR) |
