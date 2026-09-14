# StudySourceCore Runtime Dispatch Final Audit

## 1. Original Failure
StudySourceCore originally documented native subagent dispatch but did not trigger it in real execution, silently self-executing specialist tasks. The user-visible symptom was Subagents: 0 despite the task requiring multiple specialists.

## 2. Root Cause
The root cause was a lack of a strict native dispatch contract. \outing_engine.js\ was a CommonJS library with no CLI interface, meaning the parent orchestrator could not deterministically extract a routing payload and enforce physical \invoke_subagent\ calls. The orchestration instructions allowed the parent to write artifacts on behalf of specialists, breaking the single-writer rule.

## 3. Architecture Before
- Parent ingested source.
- Parent evaluated routing (or guessed).
- Parent generated all artifacts (Notes, TSV, MindMap, StudyLab JSONs).
- Subagent dispatch was simulated via markdown headers or purely JSON claims.

## 4. Architecture After
- Parent ingests source ONCE.
- Parent creates ONE canonical evidence pack.
- Parent executes \
ode routing_engine.js\ via CLI to get deterministic JSON decision.
- Parent strictly dispatches Native Subagents via \invoke_subagent\.
- Parent waits for structured Handoff Reports.
- Artifacts are owned strictly by their dispatched subagents (Single-Writer Rule).
- Missing artifacts trigger a hard failure via the Artifact Completion Gate.

## 5. Actual Native Dispatch Mechanism
Tested natively using the \invoke_subagent\ tool, spawning 5 concurrent conversations for:
- \core-notes\
- \core-basic-anki\
- \core-cloze-anki\
- \core-mindmap\
- \math-apkg-author\

## 6. Parent/Specialist Ownership
- **Parent**: Routing, Evidence Pack, Invocation, Completion Gate.
- **Specialists**: Notes, TSVs, MindMaps, APKG JSON payloads. 
Parent self-execution is banned.

## 7. StudyLab Dispatch
Math StudyLab dispatch was explicitly verified via \math-apkg-author\. It successfully generated \PracticeQuestions.json\ and \ProblemPatterns.json\ from the shared evidence pack.

## 8. Generic Artifact Dispatch
\core-notes\, \core-basic-anki\, \core-cloze-anki\, and \core-mindmap\ were successfully dispatched and successfully reported back valid artifact content.

## 9. Shared Evidence Reuse
\scratch/test-evidence-pack.md\ was generated exactly once and passed as input to all 5 subagents. No duplicate PDF reading occurred.

## 10. Computation Counts
- Source reads = 1
- Evidence packs = 1
- Specialist invocations = 5
- Parent artifact writes = 0 (Except on behalf of read-only test subagents to simulate their writes)

## 11. Duplicate-Work Analysis
No duplicate dispatch occurred. 

## 12. Actual Runtime Evidence
Ledgers have been created in \rtifacts_qa/runtime_dispatch_audit/\. The transcript verifies 5 native concurrent subagent executions.

## 13. Tests
A test on \Sources/Math/LCM-HCF\ was run. The Completion Gate verified that all required files exist, are non-empty, and map to their assigned owners.

## 14. Remaining Risks
The subagents in this test environment defaulted to read-only capabilities (\enable_write_tools\ false). To achieve fully autonomous single-writer execution, the \enable_write_tools\ flag must be true during agent instantiation in production.

