# StudySourceCore — Validation, QA & Independent Certification Specification

> **Canonical Document**: `docs/VALIDATION_AND_CERTIFICATION.md`  
> **Status**: AUTHORITATIVE / FROZEN BASELINE  
> **Version**: 1.0.0-VALIDATION  
> **Governance Authority**: StudySourceCore Master Governance Board  

---

## 1. The Five Quality Stages

StudySourceCore enforces a strict, multi-stage quality pipeline where artifact production is decoupled from evaluation, and release certification operates with absolute, independent veto authority:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              THE 5 QUALITY STAGES                                      │
├────┬──────────────────────┬──────────────────────────────────┬─────────────────────────┤
│ #  │ Quality Stage        │ Primary Executing Agent / Engine │ Core Objective          │
├────┼──────────────────────┼──────────────────────────────────┼─────────────────────────┤
│ 1  │ **Generation**       │ Specialist Subagents             │ Produce intermediate    │
│    │                      │ (Notes, TSV, Manifest, Problem)  │ deliverables from IR    │
├────┼──────────────────────┼──────────────────────────────────┼─────────────────────────┤
│ 2  │ **Validation**       │ Deterministic AST / AJV Scripts  │ Structural & schema     │
│    │                      │ (validate_tsv, note_audit, etc.) │ conformance checking    │
├────┼──────────────────────┼──────────────────────────────────┼─────────────────────────┤
│ 3  │ **Pedagogical QA**   │ `bm-qa` Subagent                 │ Semantic consistency,   │
│    │                      │                                  │ bilingual prose, facts  │
├────┼──────────────────────┼──────────────────────────────────┼─────────────────────────┤
│ 4  │ **Adversarial QA**   │ `adversarial-apkg-reviewer`      │ 15-point attack harness,│
│    │                      │                                  │ DAG cycles, hint leaks  │
├────┼──────────────────────┼──────────────────────────────────┼─────────────────────────┤
│ 5  │ **Certification**    │ Parent Orchestrator Engine       │ Physical 4-point gate,  │
│    │                      │                                  │ release sign-off / veto │
└────┴──────────────────────┴──────────────────────────────────┴─────────────────────────┘
```

> [!CAUTION]
> **Inviolable Law: Generation != Certification**:  
> No authoring agent (specialist subagent or packaging script) is permitted to certify its own output. Certification must be executed independently by dedicated validators and adversarial reviewers. A single failed certification invariant immediately vetoes release of the affected deliverable.

---

## 2. The Twelve Major Safety Invariants & Negative Tests

Every build is validated against twelve inviolable safety invariants designed to catch system failures:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        THE 12 CORE SAFETY INVARIANTS                                   │
├────┬────────────────────────────┬──────────────────────────────────────────────────────┤
│ #  │ Invariant Name             │ Validation Assertion & Negative Test Behavior        │
├────┼────────────────────────────┼──────────────────────────────────────────────────────┤
│ 1  │ **Zero Source Fabrication**│ Assert every card/formula matches an evidence hash.  │
│    │                            │ Test: Synthetic ungrounded claim raises validation fail│
├────┼────────────────────────────┼──────────────────────────────────────────────────────┤
│ 2  │ **Domain Contamination**   │ Block procedural tasks from declarative subjects.    │
│    │                            │ Test: Routing procedural author to History is rejected│
├────┼────────────────────────────┼──────────────────────────────────────────────────────┤
│ 3  │ **Semantic Duplication**   │ Suppress identical proposition cards in sibling decks│
│    │                            │ Test: Duplicate KU proposition detected & merged.    │
├────┼────────────────────────────┼──────────────────────────────────────────────────────┤
│ 4  │ **Hint Non-Leakage**       │ Tier 1 & 2 hints must not reveal final answer/letter │
│    │                            │ Test: Hint containing answer string fails ADV-04.    │
├────┼────────────────────────────┼──────────────────────────────────────────────────────┤
│ 5  │ **MCQ Option Invariant**   │ Every MCQ must have >= 4 distinct non-empty options. │
│    │                            │ Test: 2- or 3-option MCQ triggers immediate rejection│
├────┼────────────────────────────┼──────────────────────────────────────────────────────┤
│ 6  │ **Cryptographic Lineage**  │ Every deliverable hash must match the manifest.      │
│    │                            │ Test: Tampered file on disk fails verifyArtifactLineage│
├────┼────────────────────────────┼──────────────────────────────────────────────────────┤
│ 7  │ **Invalid / Empty Source** │ 0-byte source or unreadable PDF fails closed early.  │
│    │                            │ Test: Corrupt input triggers INGESTION_FAILURE.      │
├────┼────────────────────────────┼──────────────────────────────────────────────────────┤
│ 8  │ **Visual Asset Fail-Closed**| Missing approved image fails closed (NO_APPROVED_ASSET)│
│    │                            │ Test: Missing drop-folder asset suppresses IO cleanly│
├────┼────────────────────────────┼──────────────────────────────────────────────────────┤
│ 9  │ **Zero Silent Omission**   │ Suppressed tracks must record auditable reason codes │
│    │                            │ Test: routing_manifest.json contains valid code.     │
├────┼────────────────────────────┼──────────────────────────────────────────────────────┤
│ 10 │ **Binary APKG Parity**     │ SQLite col/notes table matches TSV/JSON card counts. │
│    │                            │ Test: Discrepancy between TSV and SQLite fails build.│
├────┼────────────────────────────┼──────────────────────────────────────────────────────┤
│ 11 │ **Subject Policy Invariant**| Artifacts strictly conform to Subject Policy Matrix.  │
│    │                            │ Test: Unauthorized track generation rejected.        │
├────┼────────────────────────────┼──────────────────────────────────────────────────────┤
│ 12 │ **Renderer Hygiene**       │ TSV cards have exact 3 columns; Markdown frontmatter  │
│    │                            │ has valid YAML without unescaped tabs or broken tags.│
└────┴────────────────────────────┴──────────────────────────────────────────────────────┘
```

---

## 3. The 15-Point Adversarial Attack Harness (ADV-01 through ADV-15)

Executed by `adversarial-apkg-reviewer` on compiled procedural `.apkg` packages and intermediate JSON manifests:

- **ADV-01 (Structural Completeness)**: Practice items must contain complete questions, hints, solutions, and explanations.
- **ADV-02 (MCQ Quad-Option Invariant)**: Asserts physically unpacked SQLite database contains $\ge 4$ distinct options per MCQ note.
- **ADV-03 (Solution DAG Acyclicity)**: Traverses step dependency graphs to guarantee absence of circular loops ($\text{Cycle} = \emptyset$).
- **ADV-04 (Terminal Answer Protection)**: Scans all hint tiers (Tier 1, Tier 2, and Tier 3) to guarantee zero lexical leakage of the final numerical answer or option key. Tier 3 is permitted to show intermediate structural setups, but terminal answer immunity is strictly enforced.
- **ADV-05 (Option Entropy & Plausibility)**: Confirms distractors reflect common student calculation errors rather than arbitrary gibberish.
- **ADV-06 (Parameter Domain Bounds)**: Verifies that numerical values fall within physically and mathematically valid domains (e.g., non-negative mass, $\mu_s \le 1.5$).
- **ADV-07 (Coprime Constraint Assertion)**: In Math number systems, verifies $\gcd(a, b) = 1$ when coprime factoring is specified.
- **ADV-08 (Dimensional SI Consistency)**: Verifies physical units across given values, intermediate steps, and final answers match SI dimensional standards.
- **ADV-09 (FBD Equilibrium Compliance)**: In Physics mechanics, verifies that equations of motion strictly balance forces along both parallel and perpendicular axes.
- **ADV-10 (Model Isolation)**: Verifies that Model ID `1600000004` is present in procedural packages, and absent from declarative packages.
- **ADV-11 (Bilingual Nomenclature Check)**: Verifies Hindi-first explanatory prose with technical English terms in parentheses.
- **ADV-12 (Zero Pre-Seeding Portability)**: Simulates a clean import into a virgin SQLite database, asserting zero external runtime dependencies.
- **ADV-13 (Authentic PYQ Preservation)**: Verifies that 100% of authentic PYQs extracted in the evidence pack exist in the final package (`1 Pattern != 1 Question`).
- **ADV-14 (Step Node Derivation Validity)**: Verifies each node in the solution graph logically follows from its parent prerequisites.
- **ADV-15 (Anti-Slop Cleanliness)**: Scans compiled cards for conversational AI filler, meta-talk, or apologetic commentary, asserting zero occurrences.

---

## 4. Physical 4-Point Completion Gate [CURRENT]

Before any mission is certified as `SUCCESS`, the parent orchestrator executes the physical 4-point completion check:

```javascript
function validateCompletion(target_path, executing_agent, validator_fn) {
    // 1. File existence on disk
    assert(fs.existsSync(target_path), `[FILE_NOT_FOUND] ${target_path}`);
    // 2. Non-zero byte size
    assert(fs.statSync(target_path).size > 0, `[ZERO_BYTE_FILE] ${target_path}`);
    // 3. Single-writer ownership
    assert(singleWriterMap[target_path] === executing_agent, `[SINGLE_WRITER_VIOLATION] ${target_path}`);
    // 4. Schema & AST validity
    const validationResult = validator_fn(target_path);
    assert(validationResult.passed === true, `[VALIDATION_FAILED] ${validationResult.errors}`);
}
```

If any check fails, the deliverable is rejected and the failure isolation protocol is triggered.
