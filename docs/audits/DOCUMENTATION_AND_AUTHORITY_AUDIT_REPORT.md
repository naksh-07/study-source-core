const fs = require('fs');
const path = require('path');

const inventory = JSON.parse(fs.readFileSync('scratch/classified_inventory.json', 'utf-8'));
const broken = JSON.parse(fs.readFileSync('scratch/broken_links.json', 'utf-8'));

let md = `# Forensic Inventory & Authority Hierarchy Audit Report: StudySourceCore

> **Auditor**: Repository Docs & Authority Hierarchy Auditor  
> **Date**: September 15, 2026  
> **Scope**: Complete repository inventory across root, \`docs/\`, \`.agents/\`, skills, resources, and subject skills (142 markdown files)  
> **Status**: AUTHORITATIVE AUDIT REPORT  

---

## 1. Executive Summary

A comprehensive forensic audit of all **142 documentation and specification markdown files** in the StudySourceCore repository was conducted. The audit examined structural lineage, authority claims, link validity, rule duplication, and temporal realities.

### Key Metrics
- **Total Markdown Documents Audited**: 142
- **Unique Content Files**: 70
- **Exact Byte-for-Byte Duplicate Files**: 72 (36 duplicate pairs)
  - 31 identical pairs mirrored between \`docs/\` and \`.agents/docs/\`
  - 4 identical pairs mirrored between root and \`.agents/\` (\`ARCHITECTURE.md\`, \`CONTRIBUTING.md\`, \`PRODUCT.md\`, \`ROADMAP.md\`)
  - 1 identical pair mirrored between \`.agents/docs/\` and \`.agents/skills/study-source-core/docs/\` (\`phase8-independent-verification-report.md\`)
- **Total Markdown Links Analyzed**: 213
- **Broken Markdown Links Detected**: 38 (17.8% failure rate)
- **Path Resolution Anomalies**: Widespread references to non-existent \`.agents/resources/\` (actual files reside at \`.agents/skills/study-source-core/resources/\`)
- **Ghost References**: References in canonical docs to non-existent files (\`language-contract.md\`, \`hint-progression.md\`, and 7 uncommitted QA trace JSON files)
- **Competing Canonical Documents**: 4 documents concurrently claim canonical production authority over system architecture and orchestration.

---

## 2. Full Document Inventory

Below is the complete census of all 142 documents across the repository, categorized and evaluated across 10 forensic dimensions:

| # | Document Path | Category | Authority Level | Temporal State | Primary Owner | Inbound Refs | Broken Outbound | Disposition |
|---|---|---|---|---|---|---|---|---|
`;

inventory.forEach((doc, idx) => {
  const cleanPath = doc.path.replace(/\\/g, '/');
  md += `| ${idx + 1} | [\`${cleanPath}\`](file:///${process.cwd().replace(/\\/g, '/')}/${cleanPath}) | ${doc.category} | ${doc.authorityLevel} | ${doc.temporalState} | ${doc.primaryOwner} | ${doc.inboundRefsCount} | ${doc.brokenLinksCount} | **${doc.disposition}** |\n`;
});

md += `
---

## 3. Authority Graph Analysis

### 3.1 The Canonical Authority Hierarchy (As Defined in \`docs/GOVERNANCE.md\`)
The repository formally recognizes four authority tiers:
1. **Tier 0: Master Architectural Anchors** (\`PRODUCT.md\`, \`ARCHITECTURE.md\`, \`ROADMAP.md\`) — Supreme governance.
2. **Tier 1: Canonical Technical Specifications** (\`docs/*.md\`) — Owns specific subsystem architectures.
3. **Tier 2: Machine Contracts, Agents & Operational Schemas** (\`.agents/*.md\`, \`skills/.../resources/\`) — Concrete execution models and schemas.
4. **Tier 3: Historical Audits & Exploratory Research** (\`docs/STUDYSOURCECORE_*\`, audit reports) — Non-authoritative background references.

### 3.2 Competing Architecture Documents & Rule Claims
Despite the governance hierarchy, multiple documents claim competing canonical authority:

1. **System Architecture Competition**:
   - **Root \`ARCHITECTURE.md\`**: Claims to be \`AUTHORITATIVE / FROZEN BASELINE\` (v1.0.0-ARCH).
   - **\`docs/STUDYSOURCECORE_ARCHITECTURE.md\`**: Claims to be \`HARMONIZED WITH v1.0 BASELINE\` while repeating 80% of \`ARCHITECTURE.md\` with older diagrams.
   - **\`docs/STUDYSOURCECORE_VNEXT_ORCHESTRATION.md\`**: Claims to be \`CANONICAL PRODUCTION ARCHITECTURE\` (\`DOC-STUDYSOURCECORE-VNEXT-001\`), directly competing with root architecture.
   - **\`.agents/DATA_FLOW.md\`**: Re-specifies pipeline stages and message schemas.

2. **Orchestration & Execution Lifecycle Competition**:
   - **\`docs/ORCHESTRATION_AND_EXECUTION.md\`**: Claims \`AUTHORITATIVE / FROZEN BASELINE\` (v1.0.0-ORCHESTRATION).
   - **\`.agents/EXECUTION_LIFECYCLE.md\`**: Claims \`AUTHORITATIVE / ENFORCED\` for the 3-Wave Execution Lifecycle.
   - **\`docs/STUDYSOURCECORE_DISPATCH_MATRIX.md\`**: Re-specifies dispatch rules and dependency chains.
   - **\`docs/STUDYSOURCECORE_VNEXT_ORCHESTRATION.md\`**: Re-specifies the Wave 1-3 DAG and handoff schemas.

3. **Agent Responsibility Competition**:
   - **\`.agents/AGENTS.md\`**: Canonical Master Agent Registry (14 agents).
   - **\`.agents/OWNERSHIP.md\`**: Ownership and Single-Writer charter.
   - **\`docs/STUDYSOURCECORE_AGENT_RESPONSIBILITY_MAP.md\`**: Another responsibility map.
   - **Discrepancy**: \`docs/ORCHESTRATION_AND_EXECUTION.md\` lists \`export_anki.js\` as agent #11 in its 14-agent table and completely omits \`mold-gap-auditor\`.

4. **Historical Documents Masquerading as Authoritative**:
   - Documents named \`STUDYSOURCECORE_*\` in \`docs/\` frequently use authoritative phrasing ("Canonical", "Mandatory", "Enforced") despite being classified as Tier 3 historical artifacts by \`docs/GOVERNANCE.md\`.

---

## 4. Broken Links and Obvious Hygiene Issues

### 4.1 Broken Markdown Links (38 Instances)
The audit identified 38 broken link references in active markdown files:

1. **Root Path Misdirection (14 links)**:
   Files in \`docs/\` and \`.agents/skills/study-source-core/SKILL.md\` link to files expecting them at root, when they only exist in \`.agents/\`:
   - \`file:///.../OWNERSHIP.md\` (7 broken links in \`docs/STUDYSOURCECORE_*.md\`, 2 in \`SKILL.md\`)
   - \`file:///.../EXECUTION_LIFECYCLE.md\` (2 broken links in \`SKILL.md\` and \`workflow.md\`)
   - \`file:///.../RESOURCES.md\` (2 broken links in \`SKILL.md\`)
   - \`file:///.../AGENTS.md\` (1 broken link in \`SKILL.md\`)

2. **Phantom Test Trace Files (14 links)**:
   In \`docs/STUDYSOURCECORE_VNEXT_FINAL_AUDIT.md\` and \`.agents/docs/STUDYSOURCECORE_VNEXT_FINAL_AUDIT.md\`:
   - Links to \`artifacts_qa/studysourcecore_vnext/execution-plan.json\` (MISSING)
   - Links to \`artifacts_qa/studysourcecore_vnext/dispatch-trace.json\` (MISSING)
   - Links to \`artifacts_qa/studysourcecore_vnext/ownership-trace.json\` (MISSING)
   - Links to \`artifacts_qa/studysourcecore_vnext/handoff-trace.json\` (MISSING)
   - Links to \`artifacts_qa/studysourcecore_vnext/duplicate-work-audit.json\` (MISSING)
   - Links to \`artifacts_qa/studysourcecore_vnext/efficiency-audit.json\` (MISSING)
   - Links to \`artifacts_qa/studysourcecore_vnext/completion-evidence.json\` (MISSING)

3. **Path Concatenation Defects (2 links)**:
   In \`.agents/skills/study-source-core/resources/image-occlusion-contract.md\` and \`workflow.md\`:
   - \`file:///.agents/skills/study-source-core/resources/visual-learning-contract.md\` resolves relative to the current file directory, creating invalid nested paths like \`.../resources/.agents/...\`.

4. **Identical Duplicates in \`.agents/docs/\` (6 links mirrored)**:
   The same broken links are duplicated across the shadow copies in \`.agents/docs/\`.

### 4.2 Path Hierarchy Confusion: \`.agents/resources/\` vs. \`skills/.../resources/\`
- In \`.agents/AGENTS.md\`, \`.agents/RESOURCES.md\`, \`docs/AGENTS_DOCUMENTATION_AND_OPERATIONS_AUDIT.md\`, and agent prompts:
  Dozens of references point to \`.agents/resources/<file>.md\` or \`resources/<file>.md\`.
- **Reality**: \`.agents/resources/\` does **not exist**. The physical resources are stored at:
  \`.agents/skills/study-source-core/resources/\`!
- Consequently, subagents following prompt paths to \`.agents/resources/\` will fail with file-not-found errors.

### 4.3 Corrupted Characters in \`artifact-registry.md\`
- \`.agents/skills/study-source-core/resources/artifact-registry.md\` contains corrupt escape sequences where Windows backslashes were parsed as escape chars:
  - Line 1: \`# Artifact Registry ( rtifact-registry.json)\` (\`\\a\` replaced by bell/blank)
  - Line 7: \`esources/artifact-registry.json\` (\`\\r\` replaced by carriage return)
  - Line 11: \`- 	ask_id:\` (\`\\t\` replaced by tab)
  - Line 16: \`-  alidator:\` (\`\\v\` replaced by vertical tab)
  - Line 17: \`-  rtifactKey:\` (\`\\a\` replaced)
  - Line 23: \`untime-policy.json\` (\`\\r\` replaced)

### 4.4 Non-Existent Canonical Files Cited in Audits
- \`docs/AGENTS_DOCUMENTATION_AND_OPERATIONS_AUDIT.md\` claims:
  - Consolidating language rules to \`.agents/resources/language-contract.md\` -> **FILE DOES NOT EXIST**.
  - Consolidating hints to \`.agents/resources/studylab/hint-progression.md\` -> **FILE DOES NOT EXIST**.

---

## 5. Discrepancies and Duplicate Rules

1. **Term Clash: "Tier 1" Discrepancy**:
   - In \`docs/GOVERNANCE.md\`: **Tier 1** = Canonical Technical Specifications (\`docs/*.md\`).
   - In \`.agents/FREEZE_MAP.md\`: **Tier 1** = Strictly Immutable Core Contracts & Schemas (\`*.json\`, \`PRODUCT.md\`).
   - *Impact*: Developers or agents reading "Tier 1" receive completely different rules depending on which governance document they reference.

2. **Shadow Directory Duplication (72 redundant files)**:
   - Entire \`docs/\` directory is duplicated inside \`.agents/docs/\`.
   - \`ARCHITECTURE.md\`, \`PRODUCT.md\`, \`ROADMAP.md\`, \`CONTRIBUTING.md\` are duplicated inside \`.agents/\`.
   - Dual maintenance creates an immediate hazard of out-of-sync drift (as has already happened between \`README.md\` and \`.agents/README.md\`).

3. **Universal Language Rule Inlining**:
   - Specified identically across \`docs/LEARNING_PRINCIPLES.md\` (Section 11), \`.agents/RESOURCES.md\` (Section 3.1), \`README.md\` (Section 3), and within all 14 \`.agents/agents/*.md\` prompt files.

4. **Empty Card Short-Circuit Invariant Duplication**:
   - Defined in \`.agents/RESOURCES.md\` (Section 3.2), \`docs/SUBJECT_POLICIES.md\`, and \`docs/STUDYSOURCECORE_FAILURE_HANDLING.md\`.

---

## 6. Provisional Disposition Recommendations

To restore clean authority, zero redundancy, and 100% link integrity, the following dispositions are recommended:

| Disposition Category | Count | Primary Candidates | Recommended Action |
|---|---|---|---|
| **KEEP** | 26 | Root \`PRODUCT.md\`, \`ARCHITECTURE.md\`, \`ROADMAP.md\`, \`CONTRIBUTING.md\`, 9 Subject \`SKILL.md\`, 7 StudyLab contracts, \`DECISIONS.md\`, \`SCRIPTS.md\`, \`SKILLS.md\`, \`TROUBLESHOOTING.md\` | Maintain as canonical Tier 0 / Tier 2 authorities. |
| **KEEP — NEEDS UPDATE** | 55 | Root \`README.md\`, 14 Canonical \`docs/*.md\`, \`.agents/AGENTS.md\`, \`.agents/RESOURCES.md\`, \`.agents/FREEZE_MAP.md\`, \`.agents/OWNERSHIP.md\`, \`.agents/EXECUTION_LIFECYCLE.md\`, 14 \`.agents/agents/*.md\`, \`artifact-registry.md\` | Fix broken links, update resource paths to \`.agents/skills/study-source-core/resources/\`, repair corrupt characters, resolve agent #11 table discrepancy. |
| **MERGE** | 3 | \`.agents/README.md\`, \`docs/STUDYSOURCECORE_VNEXT_ORCHESTRATION.md\`, \`docs/STUDYSOURCECORE_ARCHITECTURE.md\` | Merge unique operational content into root equivalents (\`README.md\`, \`docs/ORCHESTRATION_AND_EXECUTION.md\`, \`ARCHITECTURE.md\`). |
| **ARCHIVE CANDIDATE** | 35 | All 31 duplicate files in \`.agents/docs/\`, duplicate files \`.agents/PRODUCT.md\`, \`.agents/ARCHITECTURE.md\`, \`.agents/ROADMAP.md\`, \`.agents/CONTRIBUTING.md\`, legacy \`.agents/handoff.md\` | Delete redundant shadow copies or replace with symlinks. Archive working handoffs. |
| **HISTORICAL** | 20 | 17 \`docs/STUDYSOURCECORE_*\` historical files, \`.agents/ORIGINAL_REQUEST.md\`, phase verification audits, \`STUDYLAB_MIGRATION_PLAN.md\` | Move to \`docs/archive/\` or \`docs/historical/\` with clear banner: "HISTORICAL REFERENCE ONLY — ZERO NORMATIVE AUTHORITY". |
| **REQUIRES FINALIZATION DECISION** | 3 | \`docs/INDEPENDENT_PROFESSIONAL_ADVERSARIAL_AUDIT.md\`, \`artifacts_qa/studysourcecore_vnext/\` traces, dual-tier naming (\`GOVERNANCE.md\` vs \`FREEZE_MAP.md\`) | Decide whether to commit missing QA trace fixtures or update audit links; formally standardize on single governance tier nomenclature. |

---

*Report compiled autonomously by Repository Docs & Authority Hierarchy Auditor.*
`;

fs.writeFileSync('docs/DOCUMENTATION_AND_AUTHORITY_AUDIT_REPORT.md', md);
console.log('Saved comprehensive audit report to docs/DOCUMENTATION_AND_AUTHORITY_AUDIT_REPORT.md');
