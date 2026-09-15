# StudySourceCore Documentation Archive

> **Epistemic Classification: HISTORICAL_EVIDENCE**  
> **Authority Dimension**: Historical / Evidentiary Authority  
> **Status**: Read-Only Archive

This directory catalogs retired, superseded, or historical design drafts and audit artifacts.

## Historical Documents Retained for Audit & Test Traceability
The following legacy `STUDYSOURCECORE_*` documents are maintained in the `docs/` directory to preserve 100% backward compatibility with automated test assertions (`test_final_audit_harness.js`, `test_vnext_orchestration.js`, and `test_fresh_agent_simulation.js`) while delegating living authority to their canonical successors:

| Legacy Document | Status | Living Canonical Successor |
|---|---|---|
| `docs/STUDYSOURCECORE_ARCHITECTURE.md` | Superseded | [`ARCHITECTURE.md`](../../ARCHITECTURE.md) |
| `docs/STUDYSOURCECORE_AGENT_RESPONSIBILITY_MAP.md` | Superseded | [`.agents/AGENTS.md`](../../.agents/AGENTS.md) & [`.agents/OWNERSHIP.md`](../../.agents/OWNERSHIP.md) |
| `docs/STUDYSOURCECORE_DISPATCH_MATRIX.md` | Superseded | [`.agents/AGENTS.md`](../../.agents/AGENTS.md) & [`.agents/EXECUTION_LIFECYCLE.md`](../../.agents/EXECUTION_LIFECYCLE.md) |
| `docs/STUDYSOURCECORE_DATA_LIFECYCLE.md` | Superseded | [`.agents/DATA_FLOW.md`](../../.agents/DATA_FLOW.md) |
| `docs/STUDYSOURCECORE_FAILURE_HANDLING.md` | Superseded | [`.agents/TROUBLESHOOTING.md`](../../.agents/TROUBLESHOOTING.md) |
| `docs/STUDYSOURCECORE_EFFICIENCY.md` | Superseded | [`docs/CURRENT_IMPLEMENTATION.md`](../CURRENT_IMPLEMENTATION.md) |
| `docs/STUDYSOURCECORE_STUDYLAB_INTEGRATION.md` | Superseded | [`docs/STUDYLAB_SPECIFICATION.md`](../STUDYLAB_SPECIFICATION.md) |
| `docs/STUDYSOURCECORE_TEAMWORK_LEARNINGS.md` | Superseded | [`docs/ORCHESTRATION_AND_EXECUTION.md`](../ORCHESTRATION_AND_EXECUTION.md) |
| `docs/STUDYSOURCECORE_VNEXT_ORCHESTRATION.md` | Target Architecture Proposal | [`docs/target_architecture/VNEXT_ORCHESTRATION_SPEC.md`](../target_architecture/VNEXT_ORCHESTRATION_SPEC.md) |

For point-in-time forensic and verification audits, see [`docs/audits/`](../audits/).
