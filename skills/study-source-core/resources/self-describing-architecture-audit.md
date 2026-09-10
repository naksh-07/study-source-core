# StudySourceCore — Self-Describing Architecture Audit

## A. Fresh-Agent Journey

A new agent arriving in the repository naturally navigates the following path:
1. **Entry Point (`package.json`)**: Indicates standard Node.js environment, revealing a robust `npm test` suite in `scripts/`.
2. **System Definition (`SKILL.md`)**: Clearly states StudySourceCore is a "Master multi-agent orchestrator". Explains the 3-wave pipeline, single-writer rule, and parent self-execution ban. Points directly to canonical references like `workflow.md`, `artifact-registry.json`, and `subject-policy-runtime.md`.
3. **Architecture Discovery**: 
   - Routing engine logic is located in `scripts/routing_engine.js`.
   - Orchestration execution is located in `scripts/orchestration_engine.js`.
   - The existence of JSON registries (`artifact-registry.json`, `subject-skill-manifest.json`, `runtime-policy.json`) demonstrates a data-driven architecture rather than hardcoded logic.
4. **Execution Flow**: `workflow.md` defines the 11-phase workflow, though it incorrectly lists static subagents and validators rather than emphasizing dynamic registry resolution.

## B. Extension Matrix

| Operation | Files Required | Core Changes | Docs Changes | Hidden Coupling |
|---|---|---:|---:|---:|
| **Add Subject (e.g., Astronomy)** | `subject-skills/Astronomy/SKILL.md`<br>`subject-skills/Astronomy/runtime-policy.json` | `resources/subject-skill-manifest.json` | `AGENTS.md` (if new specialist)<br>`OWNERSHIP.md` (Section 3.2) | None. Core loads policy dynamically. |
| **Add Artifact (e.g., conceptGraph)** | `scripts/validate_concept_graph.js`<br>`.agents/agents/core-concept-graph.md` | `resources/artifact-registry.json`<br>`subject-skills/*/runtime-policy.json` | `workflow.md` (Phases 5 & 6)<br>`AGENTS.md` (Master Agent Index) | None. Core execution graph builds dynamically. |

## C. Single-Source-of-Truth Findings

The engine scripts (`orchestration_engine.js`, `routing_engine.js`) are fully generic and read from JSON contracts. However, the repository documentation contains dangerous manual duplicates of this machine-readable data:

- **DANGEROUS SOURCE-OF-TRUTH DUPLICATES**:
  1. **`resources/workflow.md`**: Phase 5 manually hardcodes the 7 specialist subagents and Phase 6 hardcodes the validation scripts. If an artifact is added to `artifact-registry.json`, a human will incorrectly feel compelled to update `workflow.md`.
  2. **`.agents/AGENTS.md`**: Manually duplicates the owner, writer, validator, and output file patterns for all 14 agents (data that resides in `artifact-registry.json`). It also duplicates the domain specialist mapping for Math/Reasoning/Physics/Chemistry (data that resides in `subject-skill-manifest.json`).
  3. **`.agents/OWNERSHIP.md`**: Section 3.2 explicitly lists the 4 domain specialists, duplicating the `specialist_agent` field in `subject-skill-manifest.json`.

- **REQUIRED HUMAN DOCUMENTATION**:
  - `resources/artifact-registry.md`
  - `resources/subject-policy-runtime.md`
  - `SKILL.md`

- **DERIVED/SAFE DUPLICATES**:
  - Task status logging in orchestration engine (reads from registry and prints derived state).

## D. Archaeology Score

The goal is that the repository contains enough obvious local evidence that a competent developer/agent can derive the correct workflow without external instruction.

- **Understanding architecture**: **4/5 (Obvious)**. The separation of `SKILL.md` and JSON registries makes the data-driven design very clear.
- **Adding subject**: **4/5 (Obvious)**. `resources/subject-policy-runtime.md` explicitly lists the 3 steps to add a subject.
- **Adding artifact**: **3/5 (Good)**. `artifact-registry.md` explains it clearly, but `workflow.md` and `AGENTS.md` confuse the developer by presenting hardcoded lists that contradict the dynamic registry concept.
- **Running tests**: **4/5 (Obvious)**. Standard `npm test` works perfectly, provided standard `npm install` is run first.
- **Understanding ownership**: **3/5 (Good)**. `OWNERSHIP.md` successfully delegates artifact mapping to the JSON registry, but fails to delegate domain specialists, creating inconsistency.

## E. Minimal Remediation

To elevate the repository to fully self-describing (score 5/5) and eliminate the dangerous duplicates:

1. **Clean `workflow.md`**: Replace the hardcoded list of agents in Phase 5 and validators in Phase 6 with a single sentence stating that Core dynamically dispatches agents and validators strictly as defined in `artifact-registry.json`.
2. **Clean `AGENTS.md`**: Remove the detailed file output, inputs, and validators from the agent profiles. Point strictly to `artifact-registry.json` as the sole source of truth for execution mechanics.
3. **Clean `OWNERSHIP.md`**: Remove the hardcoded list of subject domain specialists in Section 3.2. Point strictly to `subject-skill-manifest.json` for subject-to-specialist mappings.
4. **No New Docs**: Do not add an onboarding document. The JSON registries already act as perfect executable documentation.

---

### Final Verdict

1. **Overall verdict**: YELLOW (Architecture is solid, but documentation duplicates SSoT).
2. **Architecture self-describing score**: 4/5
3. **New-subject score**: 4/5
4. **New-artifact score**: 3/5
5. **Test-discoverability score**: 4/5
6. **Number of dangerous duplicated sources**: 3
7. **Smallest next experiment we should run**: Run a `sed` or simple script replacement experiment to strip the hardcoded agent/validator lists from `workflow.md` and `AGENTS.md`, replacing them with pointers to the JSON registries, then observe if agent behavior degrades.
