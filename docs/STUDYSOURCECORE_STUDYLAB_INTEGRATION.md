# StudySourceCore: StudyLab First-Class Integration & Content Invariants

> [!NOTE]
> **Epistemic Classification: HISTORICAL_EVIDENCE / SUPERSEDED BASELINE**  
> **Authority Dimension**: Historical Specification  
> **Living Canonical Owner**: `docs/STUDYLAB_SPECIFICATION.md`  
> **Retention Notice**: Retained at this exact path (> 2,000 bytes) for backward-compatibility with `test_final_audit_harness.js` Stage 5.1.


## 1. First-Class Architectural Boundary

**StudyLab Procedural Packaging is a native first-class branch of StudySourceCore.**

There is no secondary external orchestrator. The parent StudySourceCore engine evaluates eligibility and directly dispatches the appropriate domain specialist subagent.

```text
                                StudySourceCore Parent
                                           │
                       ┌───────────────────┴───────────────────┐
                       ▼                                       ▼
             Declarative Branch                      StudyLab Procedural Branch
        (Notes, Basic, Cloze, IO, Map)              (Domain APKG Author Specialists)
                       │                                       │
                       ▼                                       ▼
              [Chapter]_Anki.apkg                 [Chapter]_StudyLab_Procedural.apkg
            (Models 1600000001-3)                       (Model 1600000004)
```

---

## 2. Subject Domain Routing to StudyLab Specialists

| Domain | Chapter Scope | Specialist Subagent | Key Content Invariants |
|---|---|---|---|
| **Mathematics** | Arithmetic, Algebra, Geometry, Number Systems (e.g. Percentage, LCM-HCF) | `math-apkg-author` | Stepwise integer arithmetic, coprime factoring constraints, fractional conversions, LaTeX formulas. |
| **Reasoning** | Puzzles, Syllogisms, Seating Arrangements, Coding-Decoding | `reasoning-apkg-author` | 7-layer thinking flow, 4-tier constraint classification, valid boolean logic distributions. |
| **Physics** | Kinematics, Dynamics, Energy, Circuits, Optics (Numericals ONLY) | `physics-numerical-apkg-author` | 6-stage numerical pipeline, Free Body Diagrams, SI units, strict numerical error tolerances ($\pm 2\%$). Descriptive theory excluded. |
| **Chemistry** | Stoichiometry, Chemical Equilibrium, pH, Mechanisms ($S_N1/S_N2$) | `chemistry-numerical-apkg-author` | Balanced chemical equations, equilibrium constants ($K_p/K_c$), reaction intermediate graphs. Rote descriptive facts excluded. |

---

## 3. Source-First Practice Hierarchy

StudyLab enforces strict adherence to authentic problem preservation:

$$\boxed{\text{authentic\_pyq} \succ \text{curated\_source} \succ \text{derived\_variant} \succ \text{synthetic\_schema}}$$

1. **Authentic PYQs & Textbook Problems**: When the source contains real exam questions, they must be preserved verbatim in `PracticeQuestions.json`.
2. **`1 Pattern != 1 Question`**: A single problem family (e.g. `family.math.lcm_hcf.coprime_ratio_product`) can contain multiple distinct source questions ($Q_1, Q_2, \dots, Q_n$). Multiple questions must NEVER be collapsed into a single card anchor simply because their mathematical method is identical.
3. **Discrete Card Anchors**: Each solvable source question generates its own distinct note/card anchor in `StudyLab/<Chapter>_StudyLab_Procedural.apkg`.

---

## 4. The Hard MCQ Contract

For any question with modality `mcq` or `multiple_choice`:

1. **Modality Integrity**: Must render as a genuine multiple-choice interactive component, not a text blank.
2. **Minimum 4 Options**: Every MCQ must provide at least 4 non-empty, distinct, pedagogically plausible options ($A, B, C, D$).
3. **Exactly One Correct Answer**: One option is marked as correct with complete mathematical/logical derivation.
4. **Meaningful Distractors**: Distractors must reflect common student cognitive traps (e.g. forgetting to add $+1$ for the initial toll in bell synchronization problems).
5. **APKG Content Survival**: Options must survive the compilation pipeline and be physically present in the SQLite note fields (`flds`) of `StudyLab_Procedural.apkg`.

---

## 5. Model & Namespace Isolation

- **Declarative Decks (`<Chapter>_Anki.apkg`)**:
  - Model IDs: `1600000001` (Basic), `1600000002` (Cloze), `1600000003` (Image Occlusion).
  - Deck Namespace: `<Subject>::<Chapter>` (or `<Subject>::<Chapter>::Basic / Cloze / IO`).
- **StudyLab Procedural Decks (`<Chapter>_StudyLab_Procedural.apkg`)**:
  - Model ID: `1600000004` (`StudyLab Procedural Anchor`).
  - Deck Namespace: `<Subject>::<Chapter>::StudyLab Procedural`.
  - Classification: `SELF_CONTAINED_PORTABLE` (contains all schemas, hints, and parameter domains inline).
> **Canonical Terminology**: See [OWNERSHIP.md#1-architectural-principles-of-ownership](../.agents/OWNERSHIP.md#1-architectural-principles-of-ownership) for the authoritative Single-Writer Rule, Parent Self-Execution Ban, and dispatch terminology definitions.