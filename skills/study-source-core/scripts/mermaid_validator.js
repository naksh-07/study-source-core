#!/usr/bin/env node
/**
 * Beautiful Markdown V2 — Structural Mermaid Validator
 *
 * Performs deep structural validation of Mermaid diagram blocks.
 * Replaces the original superficial keyword/unquoted-paren regex check with:
 *  1. Graph type recognition & opening statement validation
 *  2. Dangling edge detection (arrows without a target node)
 *  3. Unquoted label detection (parentheses, nested brackets)
 *  4. Reserved identifier detection
 *  5. Node count warning (>12)
 *  6. Empty block detection
 *  7. Cross-block validation (total diagram count per note)
 */

const fs = require('fs');
const path = require('path');

const VALID_GRAPH_TYPES = [
  'flowchart', 'graph', 'sequenceDiagram', 'stateDiagram', 'stateDiagram-v2',
  'mindmap', 'timeline', 'classDiagram', 'erDiagram', 'gantt', 'pie',
  'quadrantChart', 'requirementDiagram', 'gitGraph', 'journey', 'C4Context'
];

const RESERVED_IDS = new Set([
  'end', 'start', 'stop', 'default', 'subgraph', 'direction',
  'style', 'class', 'click', 'callback', 'linkStyle'
]);

const MAX_NODES_PER_DIAGRAM = 12;
const MAX_DIAGRAMS_PER_NOTE = 3;

function extractMermaidBlocks(content) {
  const blocks = [];
  const lines = content.split(/\r?\n/);
  let inFence = false;
  let fenceLen = 0;
  let isMermaid = false;
  let blockLines = [];
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const fenceMatch = trimmed.match(/^(`{3,})/);

    if (fenceMatch && !inFence) {
      fenceLen = fenceMatch[1].length;
      inFence = true;
      const lang = trimmed.substring(fenceLen).trim().split(/\s+/)[0];
      isMermaid = lang === 'mermaid';
      blockLines = [];
      startLine = i + 1; // 1-indexed
    } else if (fenceMatch && inFence && fenceMatch[1].length >= fenceLen) {
      if (isMermaid) blocks.push({ lines: blockLines, startLine });
      inFence = false;
      isMermaid = false;
    } else if (inFence && isMermaid) {
      blockLines.push({ text: lines[i], lineNum: i + 1 });
    }
  }

  // Unclosed mermaid fence
  if (inFence && isMermaid && blockLines.length > 0) {
    blocks.push({ lines: blockLines, startLine, unclosed: true });
  }

  return blocks;
}

function validateMermaidBlock(block, issues, warnings) {
  const { lines, startLine, unclosed } = block;

  if (unclosed) {
    issues.push(`Line ${startLine}: Unclosed Mermaid code fence (missing closing \`\`\`).`);
  }

  if (lines.length === 0) {
    warnings.push(`Mermaid block at line ${startLine}: Empty diagram block.`);
    return;
  }

  const firstLine = lines[0].text.trim();
  const graphType = VALID_GRAPH_TYPES.find(t => firstLine.startsWith(t));

  if (!graphType) {
    issues.push(`Line ${startLine + 1}: Unrecognized Mermaid diagram type: "${firstLine}". Valid types: ${VALID_GRAPH_TYPES.join(', ')}.`);
    return;
  }

  const isFlowChart = graphType === 'flowchart' || graphType === 'graph';

  let nodeCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const { text: rawLine, lineNum } = lines[i];
    const l = rawLine.trim();

    if (!l || l.startsWith('%%') || l.startsWith('%{') || l === 'end' ||
        l.startsWith('subgraph') || l.startsWith('style ') ||
        l.startsWith('class ') || l.startsWith('direction') ||
        l.startsWith('click') || l.startsWith('linkStyle')) continue;

    // Dangling arrow: line ends with edge operator but no target follows
    if (isFlowChart) {
      const danglingMatch = l.match(/(?:-->|--|==>|-\.->|~~~>)\s*\|[^|]*\|\s*$|(?:-->|--|==>|-\.->|~~~>)\s*$/);
      if (danglingMatch) {
        issues.push(`Line ${lineNum}: Dangling edge arrow with no target node: "${l}"`);
      }

      // Edge line with target check
      const edgeWithTarget = l.match(/(?:-->|--|==>|-\.->)(?:\s*\|[^|]+\|)?\s*(\S+)/);
      if (edgeWithTarget) {
        const targetPart = edgeWithTarget[1];
        // Target looks like a string without actual node content
        if (targetPart === '|' || targetPart === '') {
          issues.push(`Line ${lineNum}: Edge has no valid target node: "${l}"`);
        }
        nodeCount++;
      }

      // Standalone node definition
      const nodeDefMatch = l.match(/^([\w]+)\s*[\[({\|]/);
      if (nodeDefMatch && !edgeWithTarget) {
        const nodeId = nodeDefMatch[1];
        if (RESERVED_IDS.has(nodeId.toLowerCase())) {
          warnings.push(`Line ${lineNum}: Node ID "${nodeId}" is a Mermaid reserved keyword.`);
        }
        nodeCount++;
      }
    }

    // Unquoted parenthesis in any node label across all graph types
    if (l.match(/\w+\[[^"\]]*\([^)\]]*\)[^"\]]*\]/)) {
      warnings.push(`Line ${lineNum}: Unquoted parenthesis in node label. Use: NodeID["Label (Detail)"].`);
    }

    // Unquoted nested bracket
    if (l.match(/\w+\[[^\]]*\[[^\]]*\]/)) {
      warnings.push(`Line ${lineNum}: Possible unquoted nested bracket in node label: "${l}"`);
    }
  }

  if (isFlowChart && nodeCount > MAX_NODES_PER_DIAGRAM) {
    warnings.push(`Mermaid block at line ${startLine}: High node count (${nodeCount}). Consider splitting (recommended max: ${MAX_NODES_PER_DIAGRAM}).`);
  }
}

function validateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const blocks = extractMermaidBlocks(content);
  const issues = [];
  const warnings = [];

  if (blocks.length > MAX_DIAGRAMS_PER_NOTE) {
    warnings.push(`Note contains ${blocks.length} Mermaid diagrams (recommended max: ${MAX_DIAGRAMS_PER_NOTE}). Consider reducing.`);
  }

  for (const block of blocks) {
    validateMermaidBlock(block, issues, warnings);
  }

  const fileName = path.basename(filePath);
  console.log('======================================================');
  console.log(`  MERMAID STRUCTURAL VALIDATOR: ${fileName}`);
  console.log('======================================================');
  console.log(`Mermaid blocks found: ${blocks.length}`);
  console.log('------------------------------------------------------');

  if (issues.length > 0) {
    console.log(`❌ MERMAID ISSUES (${issues.length}):`);
    issues.forEach(iss => console.log(`  - [ERROR] ${iss}`));
  }
  if (warnings.length > 0) {
    console.log(`⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(w => console.log(`  - [WARN]  ${w}`));
  }
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ ALL MERMAID BLOCKS VALID.');
  } else if (issues.length === 0) {
    console.log('✅ MERMAID VALID WITH WARNINGS.');
  }
  console.log('======================================================\n');

  return { blocks: blocks.length, issues, warnings, passed: issues.length === 0 };
}

if (require.main === module) {
  const [,, filePath] = process.argv;
  if (!filePath) {
    console.log('Usage: node mermaid_validator.js <path-to-markdown-file>');
    process.exit(1);
  }
  const result = validateFile(path.resolve(filePath));
  process.exit(result.passed ? 0 : 1);
}

module.exports = { validateFile, extractMermaidBlocks, validateMermaidBlock };
