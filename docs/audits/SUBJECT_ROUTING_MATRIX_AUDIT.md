# 9-Subject Matrix Routing & Gating Audit Report (Track 5)

> **Audit Scope**: 9 Canonical Subjects $\times$ 7 Artifact Tracks = 63 Deterministic Cells  
> **Target Engine**: `subject_policy_resolver.js` & `routing_engine.js`  
> **Status**: ✅ **100% PASS (Zero Silent Omission Upheld)**  

---

## 1. Executive Summary

Every cell across the 63-cell routing determinism matrix resolves deterministically with zero runtime ambiguity. Non-STEM subjects correctly and cleanly suppress StudyLab procedural tracks with `SUPPRESSED_BY_SUBJECT_POLICY`, while STEM subjects activate procedural capabilities when solvable questions exist.

## 2. 63-Cell Routing Matrix Table

| # | Subject | Category | Notes | Basic | Cloze | Image Occlusion | MindMap | Slide Deck | StudyLab Procedural |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Biology** | Declarative | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | 🚫 `NO_IO_CANDIDATES` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | 🚫 `SUPPRESSED_BY_SUBJECT_POLICY` |
| 2 | **Chemistry** | STEM | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | 🚫 `NO_IO_CANDIDATES` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` |
| 3 | **Geography** | Declarative | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | 🚫 `NO_IO_CANDIDATES` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | 🚫 `SUPPRESSED_BY_SUBJECT_POLICY` |
| 4 | **History** | Declarative | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | 🚫 `NO_IO_CANDIDATES` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | 🚫 `SUPPRESSED_BY_SUBJECT_POLICY` |
| 5 | **Map** | Declarative | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | 🚫 `NO_IO_CANDIDATES` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | 🚫 `SUPPRESSED_BY_SUBJECT_POLICY` |
| 6 | **Math** | STEM | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | 🚫 `NO_IO_CANDIDATES` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` |
| 7 | **Physics** | STEM | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | 🚫 `NO_IO_CANDIDATES` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` |
| 8 | **Political Science** | Declarative | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | 🚫 `NO_IO_CANDIDATES` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | 🚫 `SUPPRESSED_BY_SUBJECT_POLICY` |
| 9 | **Reasoning** | STEM | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | 🚫 `NO_IO_CANDIDATES` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` | ✅ `ELIGIBLE` |

---

## 3. Invariants Verified

- **Invariant 1 (Deterministic Status)**: All 63 cells resolve strictly to either `ELIGIBLE` or an explicit reason code.
- **Invariant 2 (Zero Silent Omission)**: No track was omitted without a machine-readable suppression code in `routing.suppressions`.
- **Invariant 3 (STEM Isolation)**: StudyLab procedural tracks are strictly prohibited in non-STEM subjects.
- **Invariant 4 (Declarative Baseline)**: Standard study artifacts (Notes, Basic, Cloze, MindMap, SlideDeck) remain universally eligible across all 9 subjects.
