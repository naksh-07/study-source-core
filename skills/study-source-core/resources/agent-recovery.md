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

