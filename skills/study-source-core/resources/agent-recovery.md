# Failure Recovery Runbook

This document defines how the agent should handle execution failures during the study-source-core processing pipeline.

**CRITICAL PRINCIPLE:** Repair locally before restarting globally. Never silently continue after a fatal validation failure. Never claim success without a final PASS.

## Recovery Workflow
For any failure, follow this Executable Recovery Loop:
1. **GENERATE**: Produce the chunk or artifact.
2. **VALIDATE**: Physically run the structural validator (Node scripts for JSON/TSV).
3. **CLASSIFY FAILURE**: Identify the specific error class (Syntax, Extraneous Column, Broken Link, File missing, Context exhausted).
4. **LOCAL REPAIR**: Apply a localized fix specifically to the corrupted section/batch without deleting successful sibling artifacts.
5. **VALIDATE AGAIN**: Re-run the structural validator.
6. **ESCALATE ONLY IF NECESSARY**: If local repair fails repeatedly, use a fallback method or mark the section as FAILED in coverage state.

## Failure Isolation
A failure in one generated artifact MUST NOT destroy successful sibling artifacts. 
- Example: If `Notes` passes and `Basic TSV` passes, but `Cloze TSV` fails validation, **ONLY** the `Cloze TSV` enters recovery. Do not restart all artifacts unless the shared source evidence itself is invalid.

## Common Failure Classes & Targeted Repair

### 1. JSON Failures (MindMap)
- **Syntax Error**: Unescaped quotes, missing brackets. *Repair*: Edit the specific malformed line.
- **Duplicate ID**: Two nodes share the same ID. *Repair*: Rename one ID and update its references.
- **Broken crossLink**: Source/Target ID doesn't exist. *Repair*: Fix the ID typo or remove the invalid link.
- **Invalid Quiz**: Out of bounds correct index, missing options. *Repair*: Correct the index or structure.

### 2. TSV Failures (Basic / Cloze)
- **Malformed Row / Wrong Columns**: Extra tabs creating phantom columns. *Repair*: Remove the extraneous tabs in the specific row.
- **Broken Cloze Syntax**: Missing `{{c1::...}}` wrappers. *Repair*: Add the correct wrapper.
- **Duplicate Record**: Exactly identical front/back. *Repair*: Delete the duplicate line.

### 3. Source Failures
- **Unreadable Batch**: Extraction tool returns gibberish. *Repair*: Fallback to OCR or visual inspection for those specific pages.
- **Missing Section / Partial Extraction**: *Repair*: Re-read the specific missing section boundaries.

### 4. Tool Failures
- **Failed Command / Unavailable Tool**: e.g., missing Node.js runtime. *Repair*: Report as "unverified" if strictly unavailable.
- **Context Exhaustion**: *Repair*: Shrink the batch size and restart extraction for the smaller chunk.

## 5. Orchestration & Subagent Failure Recovery

When a task qualifies for subagent delegation (satisfying the Mandatory Dispatch Gate) but subagent invocation fails or stalls:

### 1. Failure Classification & Protocol
| Failure Type | Symptom / Error | Immediate Action |
| :--- | :--- | :--- |
| **Tool Dispatch Failure** | `invoke_subagent` throws API/environment error | Diagnose reason $\to$ retry dispatch **once**. |
| **Specialist Stall** | Worker repeats commands $\ge 3$ times with unchanged error | Terminate stalled worker $\to$ reassign/retry with constrained prompt. |
| **Subagent Tool Unavailable** | Environment lacks subagent infrastructure | Explicitly report `DELEGATION UNAVAILABLE` $\to$ proceed parent-only ONLY if safe $\to$ tag loss of independent verification. |
| **Missing Handoff** | Worker completes without standard `HANDOFF REPORT` | Request structured handoff block before proceeding to parent synthesis. |

### 2. Inviolable Governance Rules:
- **Never Pretend Delegation Occurred**: Never claim subagents executed work if they were not successfully dispatched.
- **Audit Deficit Tagging**: If independent verification cannot run due to subagent unavailability, the final deliverable MUST explicitly include:
  `> [!WARNING] Independent Verification Unavailable: Completed via parent-only execution.`

---

## 6. Phase 7 Adaptive Retry Engine & Failure Classification

To prevent blind loops, respect resource ceilings, and dynamically adapt prompts upon failure, the engine classifies failures into 11 canonical types and 4 retry classes via `scripts/retry_policy.js`:

### 1. Failure Classes & Routing
| Failure Class | Retry Class | Default Max Retries | Action & Adaptation Directive | Terminal? |
| :--- | :--- | :--- | :--- | :--- |
| `SECURITY_BOUNDARY_VIOLATION` | `CRITICAL` | 0 | Parent Self-Execution Ban or unauthorized write attempt. Zero retries permitted. | **YES** |
| `SOURCE_PROVENANCE_FAILURE` | `CRITICAL` | 0 | Canonical SHA-256 evidence mismatch or tampering. Zero retries permitted (fail-closed). | **YES** |
| `CONTENT_VALIDATION_FAILURE` | `HIGH` | 2 | MCQ $< 4$ options, hint answer leakage, or math/physics numerical error. Escalate to `STRONG` model class and inject exact diagnostic failure message. | NO |
| `CONTRACT_VIOLATION` | `HIGH` | 2 | Missing required bilingual Hindi-first terms or handoff schema fields. Inject dual-language contract rules. | NO |
| `SPECIALIST_FAILURE` | `HIGH` | 2 | General domain specialist exception. Re-dispatch with constrained error context. | NO |
| `CONTEXT_OVERFLOW` | `HIGH` | 2 | Token window exceeded. Switch context strategy to `FOCUSED` and minimize batch size. | NO |
| `SCHEMA_VALIDATION_FAILURE` | `MEDIUM` | 1 | TSV column count or JSON schema violation. Inject exact delimiter rules and schema constraints. | NO |
| `SLICE_PROVENANCE_CORRUPTION` | `MEDIUM` | 1 | Derived context slice hash mismatch. Recoverable by re-slicing from canonical source. | NO |
| `INCOMPLETE_OUTPUT` | `MEDIUM` | 1 | Expected deliverable file missing on disk. Assert disk flush and re-verify path. | NO |
| `MODEL_OUTPUT_MALFORMED` | `MEDIUM` | 1 | SyntaxError or truncated JSON string. Enforce strict JSON output delimiters. | NO |
| `TIMEOUT` | `MEDIUM` | 1 | Execution timed out. Extend timeout or shrink batch size. | NO |
| `TRANSIENT_TOOL_FAILURE` | `LOW` | 1 | File system lock (`EBUSY`) or transient network drop. Exponential backoff retry. | NO |

### 2. Retry Budget Hierarchy
- **Class Defaults**: `CRITICAL: 0`, `HIGH: 2`, `MEDIUM: 1`, `LOW: 1`.
- **Task Budget Override**: If a task definition explicitly declares a lower `retry_budget`, the effective allowed retries is `Math.min(defaultMaxRetries, task.retry_budget)`. If undefined, the task inherits the full class default.
- **Source vs Slice Provenance**: Canonical source loss is unrecoverable (`SOURCE_PROVENANCE_FAILURE` $\to$ terminal), whereas corrupted derived slices (`SLICE_PROVENANCE_CORRUPTION` $\to$ recoverable) can be safely re-generated from the canonical source.

### 3. Hard Mission Resource Ceilings
- **Max 4 Concurrent Workers**: Guaranteed at the orchestrator dispatch queue level.
- **Max 10 Total Launches**: Hard cap across all tasks, retries, and phases in a single mission. Any launch attempt beyond 10 fails closed with `RESOURCE_LIMIT_EXCEEDED`.

