---
name: political-science-study
description: Subject-specific Political Science / Indian Polity layer for study-source-core. Defines Political Science knowledge architecture (10 Domain DNA types), constitutional framework models, institutional comparisons, Article/Schedule/Amendment banks, 4-type Anki engine, conditional performance outputs, and domain audit checks.
---

# Political Science Subject Skill (`political-science-study`)

## 1. Subject Mission & Core Inheritance

`political-science-study` is the specialized Political Science / Indian Polity domain layer for `study-source-core`.

This Skill inherits all universal rules, source boundary policy, source execution modes (`SOURCE_ONLY` default), Plan/Approval workflow (Mode A $\rightarrow$ Mode B), conditional artifact policy (evaluating Notes, Basic, Cloze), Basic/Cloze TSV file separation, tool-agnostic principles, and Core technical validation from `study-source-core`.

This document defines ONLY the subject-specific knowledge architecture, memory selection logic, performance architecture, domain audit rules, and conditional output contracts for Political Science.

### Primary Objective
Political Science / Indian Polity is a **CONSTITUTIONAL + INSTITUTIONAL + PROCEDURAL + COMPARATIVE + GOVERNANCE** discipline. The central goal is NOT "remember random articles", but:  
`Understand Constitutional Provision → Identify Institutional Powers → Trace Procedural Flow → Distinguish Powers & Limitations → Analyze Governance Impact`

> *This skill inherits all core policies, StudyLab invariants, 3-tier hints, options contracts, error taxonomies, and universal language contracts directly from `study-source-core`. Do not duplicate core definitions here.*

---

## 2. Political Science Knowledge Architecture (10 Domain DNA Types)

Categorize all source content into 10 Domain DNA Types:

1. **Constitutional Provision / Article** | 2. **Constitutional Amendment** | 3. **Institutional Structure & Power** | 4. **Parliamentary & Legislative Procedure** | 5. **Judicial Doctrine & Landmark Case** | 6. **Federal Relationship & Emergency Provision** | 7. **Rights, Duties & Directive Principles** | 8. **Comparative Institution** | 9. **Political Theory & Governance Concept** | 10. **Statutory Body / Local Self-Government**.

---

## 3. Political Science Note Architecture

A Political Science note (`[Chapter]_Notes.md`) is a **constitutional, institutional, and procedural reference model**:

### Flexible Section Architecture
```markdown
# [Chapter Title] ([भारतीय राजव्यवस्था अध्याय])

## 1. Chapter Overview & Constitutional Context
- Primary domain (Constitutional Framework / System of Government / Central & State Govt / Constitutional & Non-Constitutional Bodies).
- Governing Articles, Parts, Schedules, and constitutional philosophy.

## 2. Constitutional Provisions & Article Bank
- Detailed breakdown of Articles, clauses, exception provisions, and constitutional text.

## 3. Institutional Architecture & Power Matrix
- Composition, qualifications, appointment, tenure, removal process, and functional powers.

## 4. Legislative & Executive Procedures
- Step-by-step procedural workflows (Bill passage, Budget stages, Removal procedures).

## 5. Judicial Doctrines & Landmark Cases
- Relevant Supreme Court cases, constitutional interpretations, and legal doctrines.

## 6. Comparative Institutional Analysis
- Side-by-side comparison matrices (e.g., President vs Governor, Constitutional vs Statutory Bodies).

## 7. Exceptions, Limitations & Examiner Traps
- Special exceptions (e.g., Governor's discretionary powers, Money Bill exceptions, Emergency overrides).

## 8. 5-Minute Quick Revision Zone
- High-yield Articles, Schedules, Amendments, Tenures, and Quorums.
```

---

## 4. Political Science Memory Architecture (Anki Selection Rules)

### A. Basic Flashcards (`[Chapter]_Basic.tsv`)
- **Focus**: Atomic constitutional and institutional recall (Articles, Tenures, Writs, Landmark cases, Amendments).

### B. Cloze Flashcards (`[Chapter]_Cloze.tsv`)
- **Focus**: Contextual provisions, procedural sequences, and constitutional conditions (Money Bill rules, Joint Sitting).

---

## 5. Political Science Performance Architecture (Conditional Layer)

When the source contains legislative procedures, majority decision rules, or complex removal workflows, generate **`[Chapter]_ProblemPatterns.md`**:

### A. Constitutional Reasoning & Procedural Decision Rules
- **Bill Passage Flowchart**: `Ordinary vs Money vs Financial vs Constitutional Amendment Bill path`.
- **Removal Procedure Matrix**: `Impeachment of President (Art 61) vs Removal of SC Judge / CAG / CEC`.
- **Emergency Invocation Rules**: `Art 352 vs Art 356 vs Art 360 conditions and Parliamentary approval deadlines`.

### B. 10-Category Polity Error Log
1. *Article Number Misattribution* | 2. *Tenure / Age Limit Error* | 3. *Appointment / Removal Authority Confusion* | 4. *Procedural Order Error* | 5. *Constitutional vs Statutory Body Confusion* | 6. *Majority Type Error* | 7. *Writ Jurisdiction Error* | 8. *Amendment Number Misalignment* | 9. *Executive vs Legislative Overlap Miss* | 10. *Veto Power Confusion*.

---

## 6. Subject-Specific Output Extensions

---

## 7. Subject Domain Audit

In addition to Core technical validation, perform Political Science Domain Audit:
1. **Article & Clause Precision**: Are Article numbers, Parts, and Schedules 100% accurate according to the Constitution?
2. **Procedural Sequence Accuracy**: Are Parliamentary procedures (Bill passage, Impeachment, Emergency approval) chronologically exact?
3. **Institutional Power Boundaries**: Are powers, limitations, and discretionary authorities explicitly demarcated?
4. **Comparative Completeness**: Are Center-State institutional comparisons logically intact?

---

## 8. PYQ & External Mode Interpretation

In `SOURCE_PLUS_PYQ` mode:
- PYQs identify high-frequency Articles, Amendments, Parliamentary motions, and examiner traps regarding tenures and appointment authorities.
- PYQ analysis enriches `[Chapter]_Notes.md` under `Exam Frequencies & High-Yield Traps`.
- PYQs MUST NOT alter static Constitutional text or Supreme Court rulings in `[Chapter]_Notes.md`.

---

## 9. Exceptions & Constitutional Anomalies

Structure constitutional exceptions explicitly:
`GENERAL CONSTITUTIONAL RULE → STANDARD PROVISION → CONSTITUTIONAL EXCEPTION → REASON → IMPLICATION`  
*(Example: Governor acts on advice of Council of Ministers $\rightarrow$ Exception: Discretionary powers under Art 163(1) and Art 356 report $\rightarrow$ Reason: Dual role as constitutional head and Center's representative $\rightarrow$ Implication: Discretion cannot be questioned in court).*

---

## 10. Visual Map Architecture

### A. Natural Map Types & Knowledge Structures
- **Constitutional Structure & Hierarchy**: Parts, Schedules, Organs of State $\rightarrow$ **Hierarchy / Radial Map**.
- **Institutional Relationships & Checks & Balances**: Executive $\leftrightarrow$ Legislature $\leftrightarrow$ Judiciary $\rightarrow$ **Hierarchy / Network Map**.
- **Legislative & Constitutional Procedures**: Bill passage steps, Amendment process $\rightarrow$ **Process / Flowchart Map**.
- **Centre-State Distribution of Powers**: Union List, State List, Concurrent List $\rightarrow$ **Concept / Network Map**.

### B. Structures Prohibited from Ordinary Radial Maps
- ❌ **Full Article Texts / Long Speeches**: NEVER put complete Article clauses or textbook prose in map nodes.
- ❌ **Complex Inter-Institutional Checks**: Map as **Hierarchy + Network Map**, not a pure isolated tree.
- ❌ **Procedural Motion Pathways**: Map as **Process / Flowchart Map**.

### C. Subject-Specific Semantics
- **Node Semantics**: Institution, Article/Part, Power, Official post in Hindi + English parentheses `( )` (2–5 words).
- **Edge Semantics**: `appoints` (नियुक्त करता है), `oversees` (पर्यवेक्षण करता है), `amended by` (द्वारा संशोधित), `constrained by` (द्वारा सीमित).

### D. Political Science Failure Modes to Avoid
- Omitting cross-branch checks-and-balances links between government organs.
- Stuffing entire Constitutional Article clauses into map nodes.

---

## 11. Subject-Specific Visual Learning Grammar

```yaml
visual_learning_grammar:
  dominant_structures:
    - hierarchy
    - institutional relationships
    - authority
    - procedure
    - checks and balances
    - decision flow
  preferred_visual_forms:
    - institutional diagrams
    - process flowcharts
    - jurisdiction matrices
    - decision trees
  preferred_narrative_modes:
    - institutional breakdown
    - procedural lifecycle
    - constitutional contrast
    - checks-and-balances network
  high_value_visual_opportunities:
    - legislative bill passage pathways (Ordinary vs Money vs Constitutional Amendment)
    - impeachment, removal, and appointment workflows with quorum thresholds
    - separation of powers matrix showing checks between Legislature, Executive, and Judiciary
    - emergency invocation conditions, parliamentary ratification timelines, and fundamental rights impact
    - writ jurisdiction comparative matrix (Supreme Court Art 32 vs High Court Art 226)
  visual_anti_patterns:
    - article-number walls without institutional context or functional explanation
    - raw constitutional text blocks devoid of procedural flowcharting
    - isolated institution lists without checks-and-balances linkages
    - abstract political theories detached from constitutional structures
```

### Domain Visual Reasoning
- **Institutional Hierarchies**: Model constitutional authorities, appointments, and reporting structures hierarchically.
- **Procedural Lifecycles**: Flowchart legislative, judicial, and executive procedures from initiation to completion with strict threshold/timeline milestones.
- **Power Boundaries**: Demarcate constitutional limits, discretionary jurisdictions, and checks-and-balances interactions visually.

---

## Multimodal Execution Triggers
- **Visual Inspection Rule**: Inspect institutional diagrams, constitutional flowcharts, and tables natively when relevant. Do NOT use OCR if native multimodal understanding is sufficient. Do not inspect every image automatically.
