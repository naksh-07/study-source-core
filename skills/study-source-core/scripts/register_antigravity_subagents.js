/**
 * StudySourceCore Antigravity Native Subagent Registration Adapter
 * (`register_antigravity_subagents.js`)
 * 
 * Implements GAP-11: Reads .agents/agents/*.md and generates Antigravity-compatible
 * subagent registration manifests and schemas for use with define_subagent & invoke_subagent.
 */

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.resolve(__dirname, '../../../.agents/agents');
const ROOT_AGENTS_DIR = path.resolve(__dirname, '../../.agents/agents');

/**
 * Finds the canonical .agents/agents directory.
 */
function resolveAgentsDir() {
    if (fs.existsSync(AGENTS_DIR)) return AGENTS_DIR;
    if (fs.existsSync(ROOT_AGENTS_DIR)) return ROOT_AGENTS_DIR;
    const fallback = path.resolve(__dirname, '../.agents/agents');
    if (fs.existsSync(fallback)) return fallback;
    return AGENTS_DIR;
}

/**
 * Parses frontmatter and markdown sections from an agent definition file.
 */
function parseAgentDefinition(content, filename) {
    const lines = content.split(/\r?\n/);
    let inFrontmatter = false;
    let frontmatterLines = [];
    let bodyLines = [];
    let sectionMap = {};
    let currentSection = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i === 0 && line.trim() === '---') {
            inFrontmatter = true;
            continue;
        }
        if (inFrontmatter) {
            if (line.trim() === '---') {
                inFrontmatter = false;
            } else {
                frontmatterLines.push(line);
            }
            continue;
        }

        const h2Match = line.match(/^##\s+(?:\d+\.\s+)?([A-Z\s_]+)/);
        if (h2Match) {
            currentSection = h2Match[1].trim();
            sectionMap[currentSection] = [];
        } else if (currentSection) {
            sectionMap[currentSection].push(line);
        }
        bodyLines.push(line);
    }

    // Parse simple frontmatter key: value
    const frontmatter = {};
    for (const fmLine of frontmatterLines) {
        const colonIdx = fmLine.indexOf(':');
        if (colonIdx > 0) {
            const key = fmLine.substring(0, colonIdx).trim();
            const val = fmLine.substring(colonIdx + 1).trim();
            frontmatter[key] = val;
        }
    }

    const agentId = frontmatter.name || path.basename(filename, '.md');
    const description = frontmatter.description || (sectionMap['ROLE'] ? sectionMap['ROLE'].join(' ').trim() : 'StudySourceCore Specialist');

    // Determine tool capabilities based on specialist role
    const isSpecialistWriter = !['bm-qa', 'bm-graph', 'mold-gap-auditor', 'adversarial-apkg-reviewer'].includes(agentId);
    const isAuditorOrReviewer = ['bm-qa', 'adversarial-apkg-reviewer', 'mold-gap-auditor'].includes(agentId);

    return {
        id: agentId,
        name: agentId,
        description: description,
        filename: filename,
        role: sectionMap['ROLE'] ? sectionMap['ROLE'].join('\n').trim() : '',
        owns: sectionMap['OWNS'] ? sectionMap['OWNS'].join('\n').trim() : '',
        does_not_own: sectionMap['DOES NOT OWN'] ? sectionMap['DOES NOT OWN'].join('\n').trim() : '',
        input: sectionMap['INPUT'] ? sectionMap['INPUT'].join('\n').trim() : '',
        required_context: sectionMap['REQUIRED CONTEXT'] ? sectionMap['REQUIRED CONTEXT'].join('\n').trim() : '',
        output: sectionMap['OUTPUT'] ? sectionMap['OUTPUT'].join('\n').trim() : '',
        handoff_format: sectionMap['HANDOFF FORMAT'] ? sectionMap['HANDOFF FORMAT'].join('\n').trim() : '',
        enable_write_tools: isSpecialistWriter,
        enable_subagent_tools: false, // Single-Writer Rule: specialist subagents do not spawn grandchild subagents
        enable_mcp_tools: isAuditorOrReviewer,
        full_system_prompt: bodyLines.join('\n').trim()
    };
}

/**
 * Loads and registers all canonical agent definitions.
 */
function loadAllAgentDefinitions(customAgentsDir = null) {
    const agentsDir = customAgentsDir || resolveAgentsDir();
    if (!fs.existsSync(agentsDir)) {
        throw new Error(`[GAP_11_ERROR] Agents directory not found at: ${agentsDir}`);
    }

    const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    const agents = new Map();

    for (const file of files) {
        const fullPath = path.join(agentsDir, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        const parsed = parseAgentDefinition(content, file);
        agents.set(parsed.id, parsed);
    }

    return agents;
}

/**
 * Generates an Antigravity `define_subagent` payload for a given specialist.
 */
function buildAntigravityRegistrationPayload(agentDef) {
    return {
        name: agentDef.id,
        description: agentDef.description,
        system_prompt: agentDef.full_system_prompt,
        enable_write_tools: agentDef.enable_write_tools,
        enable_subagent_tools: agentDef.enable_subagent_tools,
        enable_mcp_tools: agentDef.enable_mcp_tools
    };
}

/**
 * Generates registration manifests for all 14 canonical agents.
 */
function generateAntigravitySubagentManifest(customAgentsDir = null) {
    const agents = loadAllAgentDefinitions(customAgentsDir);
    const manifests = [];

    for (const [agentId, agentDef] of agents.entries()) {
        manifests.push(buildAntigravityRegistrationPayload(agentDef));
    }

    return {
        count: manifests.length,
        timestamp: new Date().toISOString(),
        manifests
    };
}

module.exports = {
    resolveAgentsDir,
    parseAgentDefinition,
    loadAllAgentDefinitions,
    buildAntigravityRegistrationPayload,
    generateAntigravitySubagentManifest
};

if (require.main === module) {
    try {
        const manifest = generateAntigravitySubagentManifest();
        console.log(`[GAP-11] Successfully registered ${manifest.count} Antigravity subagent manifests:`);
        for (const m of manifest.manifests) {
            console.log(`  - ${m.name}: write_tools=${m.enable_write_tools}, subagent_tools=${m.enable_subagent_tools}`);
        }
    } catch (err) {
        console.error(`[GAP-11] Subagent registration failed: ${err.message}`);
        process.exit(1);
    }
}
