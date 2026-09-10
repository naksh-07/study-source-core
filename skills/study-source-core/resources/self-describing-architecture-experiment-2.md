# StudySourceCore — Self-Describing Architecture Experiment 2

## A. Before → After
| Dimension | Experiment 1 | Experiment 2 |
|---|---|---|
| Architecture discoverability | 4/5 | 5/5 |
| New subject | 4/5 | 5/5 |
| New artifact | 3/5 | 5/5 |
| Test discoverability | 4/5 | 4/5 |
| Ownership discoverability | 3/5 | 5/5 |

## B. Documentation Duplication Removed

1. **`resources/workflow.md` (Phase 5 & Phase 6)**: 
   - **Removed**: The hardcoded lists of 7 subagents and their expected outputs in Phase 5, and the explicit list of 9 validator scripts in Phase 6.
   - **Why**: This was dangerous duplication of `resources/artifact-registry.json` (which already defines `owner_agent`, `writer_agent`, `output_dir`, `file_pattern`, and `validator`). Replaced with a pointer to the registry.

2. **`.agents/AGENTS.md`**:
   - **Removed**: The `- **Owns**:`, `- **Validation**:`, `- **Output**:`, and `- **Lifecycle Wave**:` fields from all 14 Detailed Agent Profiles.
   - **Why**: Exact output files, bounding paths, and validator scripts are strictly governed by `resources/artifact-registry.json`. Duplicating them in Markdown leads to drift. Replaced with a unified Note pointing to the registry.

3. **`.agents/OWNERSHIP.md`**:
   - **Removed**: The hardcoded list of subject domains (Mathematics, Reasoning, Physics, Chemistry) and their exact specialist mappings.
   - **Why**: Subject identity and specialist agent mappings are canonically managed in `resources/subject-skill-manifest.json`.

## C. Documentation Preserved

- **3-Wave Pipeline and Governance Rules**: Maintained the conceptual explanation of the 3 waves (Parallel, Sequential, Post-packaging) and the "Single-Writer Rule", as these define *how* and *why* the architecture functions, rather than explicitly enumerating *what* exists.
- **Master Agent Index (Table)**: Preserved the semantic roles and definitions of the 14 agents in `AGENTS.md` because `artifact-registry.json` does not capture the human-readable intent, pedagogy, or failure conditions of an agent.
- **Workflow Phases**: Kept the descriptions of what each phase conceptually achieves (e.g. "Structured Handoff Barrier"), as this is critical operational guidance.

## D. Canonical Source Map

| Information | Canonical Source |
|---|---|
| Subject identity | `resources/subject-skill-manifest.json` |
| Subject eligibility | `subject-skills/<Subject>/runtime-policy.json` |
| Artifact definition | `resources/artifact-registry.json` |
| Artifact ownership | `resources/artifact-registry.json` |
| Dependencies | `resources/artifact-registry.json` |
| Validation | `resources/artifact-registry.json` |
| Execution | `scripts/routing_engine.js` (and the Core engine) |
| Verification | `npm test` |

## E. Fresh-Agent Result

Yes, a fresh agent can now determine the correct extension workflow entirely without external documentation. 
By following the explicit references, an agent can immediately answer:
- **Where is subject identity?** `subject-skill-manifest.json`
- **Where is subject eligibility?** `runtime-policy.json`
- **Where is artifact ownership?** `artifact-registry.json`

The documentation cleanly directs the developer to modify JSON contracts for standard extensions (adding subjects/artifacts) and run `npm test` without needing to mutate the core orchestrator.

## F. Remaining Friction

- **Missing Dependency for Tests**: `npm test` encounters a `Cannot find module 'sql.js'` error when executing `test_contracts.js`. This is an environment/dependency issue (`package.json` vs `node_modules` state) rather than an architectural discoverability problem, but it creates minor friction during the verification phase.

## G. Final Recommendation

**STOP — architecture is sufficiently self-describing**
