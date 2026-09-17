# Contributing to StudySourceCore (`CONTRIBUTING.md`)

Welcome to StudySourceCore! We are glad you are contributing to this multi-agent educational intelligence platform.

Before writing code, submitting pull requests, or updating agent definitions, please read this guide to understand our architectural principles, development setup, governance rules, and testing standards.

---

## 1. Architectural Philosophy & Required Reading

StudySourceCore is built on strict pedagogical foundations and hard software invariants. We prioritize correctness, cognitive durability, and source-grounded truth over rapid generation of generic summaries.

Before contributing, you **must read** the following Tier 0 master architectural documents:
1. [`PRODUCT.md`](./PRODUCT.md) — Product identity, the 4 chronic problems solved, the 10 Immutable Principles, and non-goals.
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — The 6-Tier Pipeline, Contract Ownership Matrix, and system invariants.
3. [`docs/GOVERNANCE.md`](./docs/GOVERNANCE.md) — The documentation hierarchy, Single-Rule Ownership, and ADR protocol.

### Core Non-Negotiable Invariants:
- **Parent Self-Execution Ban**: The orchestrator coordinates and audits; it never generates chapter deliverables directly.
- **Single-Writer Rule**: Exactly one specialist agent writes to each target file.
- **Markdown is Not Canonical**: Markdown files (`Notes.md`, `Questions.md`) are rendered projections; the Semantic Learning IR is canonical for structured learning.
- **Zero Hallucination / Zero Synthetic Masquerade**: Artificial items must be marked `provenance: "SYNTHETIC"`. Claiming authentic origin without a cryptographic SHA-256 hash is strictly rejected.

---

## 2. Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended).
- **npm**: v9.0.0 or higher.
- **Git**: v2.30.0 or higher.
- *(Optional)* Python 3.10+ for PDF text extraction utilities (`skills/study-source-core/scripts/pdf_inventory.py`).
- *(Optional)* Anki Desktop for inspecting generated `.apkg` files locally.

### Installation & Working Directory
All dependencies, test suites, and script tools are housed in the project-level skill directory `skills/study-source-core`.

You can install dependencies and verify the environment by navigating directly to that working directory:

```bash
# Navigate to the core skill package (canonical working directory)
cd skills/study-source-core

# Install exact locked dependencies
npm ci

# Run environment health check immediately after install
npm run doctor
```

Alternatively, from the repository root, you can invoke npm with the `--prefix` flag:
```bash
npm --prefix skills/study-source-core ci
npm --prefix skills/study-source-core run doctor
```

---

## 3. Standard Development Workflow

1. **Check the Roadmap and Gap Register**:
   Review [`ROADMAP.md`](./ROADMAP.md) and [`docs/GAP_REGISTER.md`](./docs/GAP_REGISTER.md) to ensure your planned work aligns with the active implementation phase.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/phase1-semantic-ir-schema
   ```
3. **Verify Environment Diagnostics**:
   Ensure your environment is healthy and dependencies are current:
   ```bash
   cd skills/study-source-core
   npm run doctor
   ```
4. **Write or Update Tests First**:
   Add test coverage for your planned changes in `skills/study-source-core/scripts/` or add a targeted test script.
5. **Implement Code or Contracts**:
   Maintain temporal labeling (`[CURRENT]` vs `[TARGET]`) and adhere to Single-Writer and Parent Self-Execution rules.
6. **Run the Verification Suite**:
   From `skills/study-source-core` (or using `npm --prefix skills/study-source-core test` from root), ensure all 27 core test suites pass with zero regressions:
   ```bash
   npm test
   ```
7. **Submit PR with Architectural Rationale**:
   Document changes against the corresponding Roadmap Phase or Gap ID.

---

## 4. How-To Guides for Common Tasks

### 4.1 How to Add or Modify a Subject Policy
Subject policies govern which artifacts are generated for a given academic domain.
1. Consult [`docs/SUBJECT_POLICIES.md`](./docs/SUBJECT_POLICIES.md) for the authoritative policy rules.
2. Edit `skills/study-source-core/scripts/subject_policy_resolver.js` to update the policy map or aliases.
3. If adding a new domain, create `skills/study-source-core/subject-skills/<Subject>/SKILL.md` detailing its domain DNA.
4. Run policy resolver tests:
   ```bash
   node scripts/test_subject_policy_resolver.js
   ```

### 4.2 How to Update JSON Schemas & Machine Contracts
Schemas under `skills/study-source-core/resources/*.json` define system data contracts.
1. Check [`docs/GOVERNANCE.md`](./docs/GOVERNANCE.md) for schema evolution rules (SemVer, backward compatibility).
2. If the change is breaking (renaming/removing fields or tightening validation), propose an ADR in [`.agents/DECISIONS.md`](.agents/DECISIONS.md).
3. Update the JSON Schema file.
4. Update or add test fixtures in `skills/study-source-core/resources/fixtures/`.
5. Run contract tests:
   ```bash
   node scripts/test_contracts.js
   ```

### 4.3 How to Add or Modify a Specialist Subagent
Subagent prompts are located under `.agents/agents/*.md`.
1. Every agent file **must strictly follow the 14-section template** defined in [`.agents/AGENTS.md`](.agents/AGENTS.md):
   - `## 1. ROLE`
   - `## 2. WHY THIS AGENT EXISTS`
   - `## 3. OWNS`
   - `## 4. DOES NOT OWN`
   - `## 5. INPUT`
   - `## 6. REQUIRED CONTEXT`
   - `## 7. INVOCATION TRIGGER`
   - `## 8. PROCESS`
   - `## 9. OUTPUT`
   - `## 10. HANDOFF FORMAT`
   - `## 11. VALIDATION`
   - `## 12. FAILURE CONDITIONS`
   - `## 13. DUPLICATION GUARD`
   - `## 14. EXAMPLES`
2. Update `.agents/AGENTS.md` to reflect the agent's responsibilities.
3. Run orchestration and agent simulation tests:
   ```bash
   node scripts/test_orchestration.js
   node scripts/test_fresh_agent_simulation.js
   ```

---

## 5. Testing & Quality Verification

All contributions must pass the verification suite before merging.

> [!NOTE]
> All test commands must be run from the working directory `skills/study-source-core` (or from repository root using `npm --prefix skills/study-source-core ...`). Always execute `npm run doctor` first to confirm dependencies and directory permissions are intact.

### Running Core Tests
```bash
# Set working directory to skill engine
cd skills/study-source-core

# Verify environment health first
npm run doctor

# Execute all 27 automated test suites
npm test
```
The test command runs all 27 standard verification test suites:
- Draft-07 Semantic Learning IR, CLRs, and evidence pack chunking
- Subject policy resolution and domain boundary enforcement
- Subagent routing and orchestration DAGs with bounded concurrency
- Artifact registry schema validation
- Change isolation and freeze boundary compliance
- Backward compatibility regressions
- Track B (Math), Track C (Reasoning), Track D (Physics), Track E (Chemistry) procedural paths
- Markdown Question Bank rendering and parsing
- Closed-boundary model isolation (Models 1600000001–3 vs 1600000004)
- 4-point Physical Verification Protocol release gate (`.completion-evidence.json`)
- 15-point independent adversarial attack harness (ADV-01 through ADV-15)
- Runtime adversarial matrix and crash-resilient atomic checkpoint recovery

### Running Additional Verification Suites
```bash
# Packaging and Closed-Boundary Model Isolation Suite
npm run test:milestone4

# Antigravity Host Adapter, Concurrency & Recovery Suite
npm run test:phase10

# Standalone 4-Gate Adversarial Certification CLI on a target chapter
npm run certify -- "Study Materials/Math/LCM-HCF"
```

### Running Targeted Track Tests
```bash
# Test Math production path
node scripts/test_math_production_path.js

# Test Physics production path
node scripts/test_physics_production_path.js

# Test Chemistry production path
node scripts/test_chemistry_production_path.js

# Test Reasoning production path
node scripts/test_reasoning_production_path.js
```

---

## 6. Pull Request & Commit Guidelines

### Conventional Commits
Use standard conventional commit messages:
- `feat(ir): implement semantic learning IR schema validation (GAP-01)`
- `fix(contracts): harmonize 3-tier hint nested structure (GAP-04)`
- `docs(policies): clarify biology visual occlusion rules`
- `test(physics): add kinematics FBD validation vectors`

### PR Review Checklist
Every PR will be reviewed against:
- [ ] No regression in `npm test` (all 27 test suites pass).
- [ ] No violation of the Single-Writer Rule or Parent Self-Execution Ban.
- [ ] Any architectural change has a corresponding accepted ADR.
- [ ] New/updated files use explicit temporal labeling (`[CURRENT]`, `[TARGET]`, `[DEFERRED]`).
- [ ] Zero unescaped delimiters in TSVs or dynamic `eval()` calls in math solvers.
- [ ] Backward compatibility maintained for existing Obsidian vault files and Anki decks.
