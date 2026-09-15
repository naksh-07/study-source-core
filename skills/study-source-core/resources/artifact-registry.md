# Artifact Registry (`artifact-registry.json`)

## 1. Overview
The Artifact Registry introduces a declarative, machine-readable boundary between the study-source-core orchestration engine and individual artifact semantics. Prior to Phase 2, TASK_DEFINITIONS was a hardcoded block in orchestration_engine.js, causing structural coupling. The Artifact Registry decouples these responsibilities.

## 2. Location
The registry is located at `resources/artifact-registry.json` and is parsed dynamically by `scripts/artifact_registry.js`.

## 3. Schema Structure
The registry defines the execution capabilities of all 12 study artifacts. The schema enforces:
- `task_id`: Unique string identifier for the execution task
- `task_name`: Human-readable task name
- `wave`: Execution wave integer (1 for parallel, 2/3 for sequential/downstream)
- `owner_agent`: The subagent or orchestrator responsible for routing
- `writer_agent`: The subagent that actually writes the files (enforcing the Single-Writer Rule)
- `validator`: The physical JavaScript validator script to verify the output
- `artifactKey`: The identity key matching subject-policy-runtime definitions
- `dependencies`: An array of `task_id` strings declaring execution dependencies

## 4. Execution Graph Integration
The Core Orchestrator (orchestration_engine.js) dynamically loads this JSON registry to build its Execution Task Graph (DAG). It iterates over the registry, checks `runtime-policy.json` for eligibility, and executes the validator scripts defined in the registry.

## 5. Adding New Artifacts
Adding a new artifact requires zero Core execution code changes. To extend StudySourceCore:

1. **Define artifact** in `resources/artifact-registry.json` (specify owner, writer, output path, and validator).
2. **Enable it** in the relevant subject's `runtime-policy.json`.
3. **Provide the required specialist/agent implementation** (e.g. create `.agents/agents/<writer_agent>.md`).
4. **Provide the validator** script declared in the registry (e.g. `scripts/validate_new_artifact.js`).
5. **Add/extend tests** to assert the new artifact is correctly generated.
6. **Run canonical verification** (`npm test`) to ensure everything works seamlessly.
