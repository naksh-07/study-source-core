# Subject Policy Runtime Architecture

## 1. Overview
The Subject Policy Runtime establishes a deterministic, machine-readable boundary between domain-specific Subject Skills and the `study-source-core` orchestration engine. 

Artifact routing eligibility is no longer inferred dynamically by the LLM during generation. Instead, it is strictly resolved via static `runtime-policy.json` contracts.

## 2. Component Boundaries

### Subject SKILL.md
- **Role**: Domain, human, and LLM knowledge model.
- **Responsibility**: Contains StudyLab procedural semantics, 3-tier hints, distractor topologies, deep structure problem recognition, error taxonomies, and generation rules.
- **Strict Boundary**: MUST NOT contain JSON artifact routing definitions.

### runtime-policy.json
- **Role**: Deterministic runtime artifact policy.
- **Responsibility**: Resides in `subject-skills/<Subject>/runtime-policy.json`. Dictates exactly which artifacts are permitted for this domain as explicit booleans (e.g., `notes: true`, `proceduralApkg: false`).

### Subject Policy Resolver (`scripts/subject_policy_resolver.js`)
- **Role**: Policy loading and schema validation.
- **Responsibility**: Validates the presence and format of `runtime-policy.json`. Fails closed if the policy is missing, malformed, or invalid. Resolves aliases via the manifest.

### Core Orchestrator / Routing Engine
- **Role**: Policy consumer and execution engine.
- **Responsibility**: Reads the resolved policy and builds the Execution Task Graph using `resources/artifact-registry.json`. It NEVER infers missing policy from evidence.
- **Artifact Registry**: Core uses the JSON Artifact Registry rather than hardcoded definitions, allowing new artifacts to be added dynamically.

### Subject Skill Manifest (`subject-skill-manifest.json`)
- **Role**: Registry and capability metadata only.
- **Strict Boundary**: Does NOT contain artifact policy flags. Used solely to resolve subject aliases, directory paths, and orchestrator capabilities.

## 3. Change Isolation
- **New Subject Policy**: Add the subject folder and its `runtime-policy.json`. No changes to Core routing logic are required.
- **Change Subject Policy**: Modify only that subject's `runtime-policy.json`. Other subjects remain isolated and unaffected.
- **Invalid/Missing Policy**: Core will immediately fail closed and halt execution.

## 4. How to Add a New Subject

1. **Register subject identity** in `resources/subject-skill-manifest.json`.
2. **Create subject directory** at `subject-skills/<Subject>/`.
3. **Add `runtime-policy.json`** inside the subject directory to define artifact eligibility.
4. **Add subject skill/domain instructions** (e.g., `SKILL.md`).
5. **Provide any required specialist definitions** if the subject requires custom procedural agents.
6. **Run verification** (`npm test`) to ensure the orchestrator correctly resolves the new subject.
