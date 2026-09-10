# Source Boundary & Mode Policy

## 1. Default Mode: `SOURCE_ONLY`

The default execution mode for `study-source-core` is strictly source-grounded.

### Allowed Scope:
- The exact uploaded file(s).
- Files explicitly named by the user.
- Files inside a directory explicitly named by the user.

### Forbidden by Default:
- Web search.
- Model memory as a factual supplement.
- Unrelated workspace or Vault files.
- External PYQ databases or external textbooks.

---

## 2. Four Explicit Execution Modes

Every run operates under one of four explicit modes (reported during Plan Mode A):

### Mode 1: `SOURCE_ONLY` (Default)
- Authorized source is the sole authority for all outputs (Knowledge, Memory, Performance).
- Gaps are stated explicitly. Source errors are preserved and flagged, NOT silently replaced.
- **Source Language vs Output Language**: `SOURCE_ONLY` governs factual authority, NOT output language. If the authorized source is in English, preserve all factual assertions, logic, and numbers strictly from the source while translating explanatory prose into Hindi-first study material with English technical terms in parentheses `( )`. Do NOT add external facts during translation.

### Mode 2: `SOURCE_PLUS_PYQ` (Opt-in)
- Authorized source provides static facts; PYQs provide **performance intelligence** (testability ranking, examiner traps, pattern frequencies, difficulty calibration).
- PYQs MUST NOT silently alter source factual knowledge. PYQ insights feed `Performance` artifacts (`[Chapter]_ProblemPatterns.md`).

### Mode 3: `SOURCE_PLUS_EXTERNAL` (Opt-in)
- Authorized source + verified external research.
- External additions MUST be explicitly demarcated (e.g., `[External Context]`). Never blend external data silently into source notes.

### Mode 4: `FACT_CHECK` (Opt-in)
- Compares source assertions against external consensus.
- Explicit status labeling required: `Confirmed`, `Disputed`, `Outdated`, or `Source Discrepancy`.

---

## 3. Tool-Agnostic Operation

Source handling is completely tool-agnostic:
- Do not hardcode specific software readers or file tools into Skill rules.
- System describes actions abstractly: "Process the authorized source", "Read the complete scoped text", "Write Markdown knowledge representation to configured output path".

---

## 4. Independent Sibling Outputs

The authorized source feeds Knowledge, Memory, and Performance independently.
- Notes are NOT the source for Anki.
- Anki is NOT the source for Notes.
- Performance patterns are derived directly from the source/practice material.

---

## 5. Source Discrepancies & Ambiguity

If the source contains an apparent error or contradiction:
- Preserve the source statement in source-only outputs.
- Add an explicit callout note flagging the discrepancy.
- Do NOT silently rewrite source statements using external memory.
- If multiple matching files exist, ask the user to specify rather than guessing.
