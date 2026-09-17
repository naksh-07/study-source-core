#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Dynamically resolve skill directory and repository root
const skillDir = path.resolve(__dirname, '..');

function findRepoRoot(startDir) {
  let cur = startDir;
  while (cur && cur !== path.dirname(cur)) {
    if (fs.existsSync(path.join(cur, '.agents')) || fs.existsSync(path.join(cur, '.git'))) {
      return cur;
    }
    cur = path.dirname(cur);
  }
  return path.resolve(startDir, '../..');
}

const repoRoot = findRepoRoot(skillDir);

const checks = [];

// 1. Node.js Version
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0], 10);
if (majorVersion < 18) {
  checks.push({
    status: 'FAIL',
    message: `Node.js (v${nodeVersion} < 18.0.0 required - please upgrade Node.js)`,
    blocking: true
  });
} else if (majorVersion < 20) {
  checks.push({
    status: 'WARN',
    message: `Node.js (v${nodeVersion} >= 18.0.0, recommended >= 20.0.0)`,
    blocking: false
  });
} else {
  checks.push({
    status: 'PASS',
    message: `Node.js (v${nodeVersion} >= 18.0.0)`,
    blocking: false
  });
}

// 2. npm Dependencies
const nodeModulesPath = path.join(skillDir, 'node_modules');
const requiredPackages = ['ajv', 'jszip', 'sql.js', '@modelcontextprotocol/sdk'];
const missingPackages = [];

function checkPackage(pkg) {
  try {
    require.resolve(pkg, { paths: [skillDir] });
    return true;
  } catch {
    try {
      require.resolve(`${pkg}/package.json`, { paths: [skillDir] });
      return true;
    } catch {
      return false;
    }
  }
}

if (!fs.existsSync(nodeModulesPath)) {
  missingPackages.push(...requiredPackages);
} else {
  for (const pkg of requiredPackages) {
    if (!checkPackage(pkg)) {
      missingPackages.push(pkg);
    }
  }
}

if (missingPackages.length > 0) {
  checks.push({
    status: 'FAIL',
    message: `npm dependencies missing (${missingPackages.join(', ')}). Run 'npm ci' in skills/study-source-core`,
    blocking: true
  });
} else {
  checks.push({
    status: 'PASS',
    message: `npm dependencies (${requiredPackages.join(', ')})`,
    blocking: false
  });
}

// 3. Python 3 (Optional intake helper)
let pythonVersion = null;
for (const pyCmd of ['python', 'python3']) {
  try {
    const res = spawnSync(pyCmd, ['--version'], {
      encoding: 'utf8',
      shell: true,
      windowsHide: true
    });
    if (res.status === 0) {
      const out = ((res.stdout || '') + (res.stderr || '')).trim();
      const match = out.match(/Python\s+([0-9.]+)/i);
      if (match) {
        pythonVersion = match[1];
        break;
      }
    }
  } catch {
    // Continue to next command
  }
}

if (pythonVersion) {
  checks.push({
    status: 'PASS',
    message: `Python (v${pythonVersion}, optional intake helper)`,
    blocking: false
  });
} else {
  checks.push({
    status: 'WARN',
    message: `Python not found (optional, only needed for standalone pdf_inventory.py)`,
    blocking: false
  });
}

// 4. MCP Entrypoint
const mcpServerPath = path.join(skillDir, 'scripts', 'mcp_server.js');
if (!fs.existsSync(mcpServerPath)) {
  checks.push({
    status: 'FAIL',
    message: `MCP entrypoint (scripts/mcp_server.js not found)`,
    blocking: true
  });
} else {
  try {
    const res = spawnSync(process.execPath, ['-c', mcpServerPath], {
      encoding: 'utf8',
      windowsHide: true
    });
    if (res.status === 0) {
      checks.push({
        status: 'PASS',
        message: `MCP entrypoint (scripts/mcp_server.js)`,
        blocking: false
      });
    } else {
      const errMsg = (res.stderr || res.stdout || '').trim().replace(/\r?\n/g, ' ');
      checks.push({
        status: 'FAIL',
        message: `MCP entrypoint (scripts/mcp_server.js syntax check failed: ${errMsg})`,
        blocking: true
      });
    }
  } catch (err) {
    checks.push({
      status: 'FAIL',
      message: `MCP entrypoint (failed to run syntax check: ${err.message})`,
      blocking: true
    });
  }
}

// 5. Required Core Files
const requiredFilesErrors = [];
const skillMdPath = path.join(skillDir, 'SKILL.md');
if (!fs.existsSync(skillMdPath)) {
  requiredFilesErrors.push('SKILL.md missing');
}

const artifactRegistryPath = path.join(skillDir, 'resources', 'artifact-registry.json');
if (!fs.existsSync(artifactRegistryPath)) {
  requiredFilesErrors.push('artifact-registry.json missing');
}

const agentsMdPath = path.join(repoRoot, '.agents', 'AGENTS.md');
if (!fs.existsSync(agentsMdPath)) {
  requiredFilesErrors.push('.agents/AGENTS.md missing');
}

const agentsDir = path.join(repoRoot, '.agents', 'agents');
let agentCount = 0;
if (fs.existsSync(agentsDir)) {
  try {
    agentCount = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md')).length;
  } catch {
    agentCount = 0;
  }
}
if (agentCount < 14) {
  requiredFilesErrors.push(`.agents/agents contains ${agentCount} subagents (expected >= 14)`);
}

const subjectSkillsDir = path.join(skillDir, 'subject-skills');
let subjectCount = 0;
if (fs.existsSync(subjectSkillsDir)) {
  try {
    subjectCount = fs.readdirSync(subjectSkillsDir).filter(f => {
      try {
        return fs.statSync(path.join(subjectSkillsDir, f)).isDirectory();
      } catch {
        return false;
      }
    }).length;
  } catch {
    subjectCount = 0;
  }
}
if (subjectCount < 9) {
  requiredFilesErrors.push(`subject-skills contains ${subjectCount} directories (expected >= 9)`);
}

if (requiredFilesErrors.length > 0) {
  checks.push({
    status: 'FAIL',
    message: `Required files (${requiredFilesErrors.join('; ')})`,
    blocking: true
  });
} else {
  checks.push({
    status: 'PASS',
    message: `Required files (SKILL.md, artifact-registry, ${agentCount} subagents, ${subjectCount} subject skills)`,
    blocking: false
  });
}

// 6. Git
let gitVersion = null;
try {
  const res = spawnSync('git', ['--version'], {
    encoding: 'utf8',
    shell: true,
    windowsHide: true
  });
  if (res.status === 0) {
    gitVersion = (res.stdout || '').trim();
  }
} catch {
  // Git not found
}

if (gitVersion) {
  checks.push({
    status: 'PASS',
    message: `Git (${gitVersion})`,
    blocking: false
  });
} else {
  checks.push({
    status: 'FAIL',
    message: `Git not found (git --version failed)`,
    blocking: true
  });
}

// Output results
console.log('StudySourceCore Environment Doctor');
console.log('==================================');
for (const check of checks) {
  console.log(`[${check.status}] ${check.message}`);
}
console.log('');

const hasBlockingFailure = checks.some(c => c.blocking);
if (hasBlockingFailure) {
  const failCount = checks.filter(c => c.status === 'FAIL').length;
  console.log(`StudySourceCore doctor: UNHEALTHY (${failCount} check(s) failed)`);
  process.exit(1);
} else {
  console.log('StudySourceCore doctor: HEALTHY');
  process.exit(0);
}
