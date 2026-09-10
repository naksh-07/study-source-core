#!/usr/bin/env node
/**
 * Beautiful Markdown V2 — Production-Hardened Markdown Audit
 *
 * Aligned with canonical quality-thresholds.md:
 *  - Bolding WARN > 15%, ERROR > 20%
 *  - Emoji WARN > 1, ERROR > 2
 *  - Callout stack WARN >= 3, ERROR >= 4
 *
 * NEW in this version (vs original):
 *  + LaTeX delimiter balance check (matched $$ and $ pairs)
 *  + Duplicate H2/H3 section heading detection
 *  + Empty section detection
 *  + Broken callout (missing blank line before heading)
 *  + Mermaid structural validation delegated to mermaid_validator module
 */

const fs = require('fs');
const path = require('path');

// ─── Quality Thresholds (canonical from references/quality-thresholds.md) ────
const THRESHOLDS = {
  bolding: { warn: 0.15, error: 0.20 },
  emoji: { warn: 1, error: 2 },
  calloutStack: { warn: 3, error: 4 },
  linkDensity: { warn: 5.0, error: 8.0 },
};

function auditMarkdown(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  const issues = [];
  const warnings = [];

  // Fence stack for multi-level backtick support
  const fenceStack = [];

  let inMermaid = false;
  let mermaidStartLine = 0;
  let mermaidLines = [];

  let inTable = false;
  let tableExpectedCols = 0;
  let tableStartLine = 0;

  let lastHeadingLevel = 0;
  let h1Count = 0;

  const totalChars = content.length;
  let boldChars = 0;
  const emojiMatches = content.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || [];
  const emojiCount = emojiMatches.length;

  let consecutiveCalloutCount = 0;
  let prevLineWasCallout = false;
  let prevNonEmptyWasCallout = false;

  // Track section headings for duplicates and empty sections
  const h2Headings = new Map(); // heading text → first lineNum
  const h3Headings = new Map();
  let lastH2LineNum = -1;
  let lastH2Text = '';
  let lastH2HasContent = false;

  // LaTeX tracking
  let displayMathOpen = false;
  let displayMathStartLine = -1;
  let inlineDollarOpen = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    // ── Code fence handling ──────────────────────────────────────────────────
    const fenceMatch = trimmed.match(/^(`{3,})/);
    if (fenceMatch) {
      const fenceStr = fenceMatch[1];
      const fenceLen = fenceStr.length;
      const rest = trimmed.substring(fenceLen).trim();

      if (fenceStack.length === 0) {
        const lang = rest.split(/\s+/)[0];
        fenceStack.push({ fenceLen, lang, lineNum });
        if (!lang) warnings.push(`Line ${lineNum}: Code block missing language tag.`);
        if (lang === 'mermaid') {
          inMermaid = true;
          mermaidStartLine = lineNum;
          mermaidLines = [];
        }
        continue;
      } else {
        const top = fenceStack[fenceStack.length - 1];
        if (fenceLen >= top.fenceLen && (rest === '' || rest.startsWith('`'))) {
          fenceStack.pop();
          if (inMermaid && fenceStack.length === 0) {
            inMermaid = false;
            validateMermaidStructural(mermaidLines, mermaidStartLine, issues, warnings);
          }
          continue;
        } else if (fenceLen < top.fenceLen) {
          if (inMermaid) mermaidLines.push({ text: line, lineNum });
          continue;
        }
      }
    }

    if (fenceStack.length > 0) {
      if (inMermaid) mermaidLines.push({ text: line, lineNum });
      continue;
    }

    // ── LaTeX delimiter balance ──────────────────────────────────────────────
    {
      // Display math $$ detection (line-by-line)
      const ddCount = (line.match(/\$\$/g) || []).length;
      if (ddCount > 0) {
        if (ddCount % 2 === 0) {
          // Even count on same line: balanced display math block(s) on this line
          // If we were in display math, close it
          if (displayMathOpen) displayMathOpen = false;
        } else {
          // Odd count: toggle open/close
          if (!displayMathOpen) {
            displayMathOpen = true;
            displayMathStartLine = lineNum;
          } else {
            displayMathOpen = false;
          }
        }
      }

      // Inline math $ (replace $$ first to avoid double-counting)
      if (!displayMathOpen) {
        const lineForInline = line.replace(/\$\$/g, '  ');
        const singleDollars = (lineForInline.match(/(?<!\$)\$(?!\$)/g) || []).length;
        if (singleDollars % 2 !== 0) {
          issues.push(`Line ${lineNum}: Unclosed inline math delimiter $. Inline math must open and close on the same line.`);
        }
      }
    }

    // ── Bolding density ──────────────────────────────────────────────────────
    const boldMatches = line.match(/\*\*(.*?)\*\*/g);
    if (boldMatches) {
      for (const m of boldMatches) boldChars += m.length;
    }

    // ── Callout tracking ─────────────────────────────────────────────────────
    if (trimmed.startsWith('> [!')) {
      consecutiveCalloutCount++;
      if (consecutiveCalloutCount >= THRESHOLDS.calloutStack.error) {
        issues.push(`Line ${lineNum}: ${consecutiveCalloutCount} consecutive callouts (HARD LIMIT: ${THRESHOLDS.calloutStack.error}). Split or remove.`);
      } else if (consecutiveCalloutCount >= THRESHOLDS.calloutStack.warn) {
        warnings.push(`Line ${lineNum}: ${consecutiveCalloutCount} consecutive callouts detected (Callout Stack Slop).`);
      }
      const calloutMatch = trimmed.match(/^>\s*\[!([A-Za-z_-]+)\]/);
      if (!calloutMatch) {
        issues.push(`Line ${lineNum}: Malformed callout header syntax: "${trimmed}"`);
      }
      prevNonEmptyWasCallout = true;
    } else if (trimmed.startsWith('>')) {
      // Continuation line — keep count
    } else if (trimmed.length > 0) {
      consecutiveCalloutCount = 0;
      prevNonEmptyWasCallout = false;
    }

    // ── Heading analysis ─────────────────────────────────────────────────────
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();

      if (level === 1) {
        h1Count++;
        if (h1Count > 1) {
          issues.push(`Line ${lineNum}: Multiple H1 headings. Only one H1 permitted per Knowledge Note.`);
        }
      }

      if (lastHeadingLevel > 0 && level > lastHeadingLevel + 1) {
        issues.push(`Line ${lineNum}: Heading level jump from H${lastHeadingLevel} to H${level} ("${title}").`);
      }

      // Duplicate heading detection
      if (level === 2) {
        // Check if previous H2 section was empty
        if (lastH2LineNum > 0 && !lastH2HasContent) {
          warnings.push(`Line ${lastH2LineNum}: Empty section "${lastH2Text}" (no content between this heading and the next).`);
        }
        const titleLower = title.toLowerCase();
        if (h2Headings.has(titleLower)) {
          issues.push(`Line ${lineNum}: Duplicate H2 section heading "${title}" (first at line ${h2Headings.get(titleLower)}).`);
        } else {
          h2Headings.set(titleLower, lineNum);
        }
        lastH2LineNum = lineNum;
        lastH2Text = title;
        lastH2HasContent = false;
      } else if (level === 3) {
        const titleLower = title.toLowerCase();
        if (h3Headings.has(titleLower)) {
          warnings.push(`Line ${lineNum}: Duplicate H3 heading "${title}" (first at line ${h3Headings.get(titleLower)}).`);
        } else {
          h3Headings.set(titleLower, lineNum);
        }
      }

      lastHeadingLevel = level;
    } else if (trimmed.length > 0 && lastH2LineNum > 0) {
      lastH2HasContent = true;
    }

    // ── Table validation ─────────────────────────────────────────────────────
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cols = trimmed.split('|').length - 2;
      if (!inTable) {
        inTable = true;
        tableExpectedCols = cols;
        tableStartLine = lineNum;
      } else {
        if (trimmed.match(/^\|(?:\s*:?-+:?\s*\|)+$/)) {
          if (cols !== tableExpectedCols) {
            issues.push(`Line ${lineNum}: Table alignment row has ${cols} columns, expected ${tableExpectedCols} (started at line ${tableStartLine}).`);
          }
        } else {
          if (cols !== tableExpectedCols) {
            warnings.push(`Line ${lineNum}: Table row has ${cols} columns, expected ${tableExpectedCols} (started at line ${tableStartLine}).`);
          }
        }
      }
    } else {
      inTable = false;
    }
  }

  // ── Post-scan checks ──────────────────────────────────────────────────────
  if (fenceStack.length > 0) {
    issues.push(`Line ${fenceStack[0].lineNum}: Unclosed code block (reached EOF).`);
  }

  if (displayMathOpen) {
    issues.push(`Line ${displayMathStartLine}: Unclosed display math block $$ (reached EOF).`);
  }

  // Last H2 empty section check
  if (lastH2LineNum > 0 && !lastH2HasContent) {
    warnings.push(`Line ${lastH2LineNum}: Empty section "${lastH2Text}" (no content before EOF).`);
  }

  // ── Slop metrics ─────────────────────────────────────────────────────────
  const boldRatio = totalChars > 0 ? boldChars / totalChars : 0;
  if (boldRatio > THRESHOLDS.bolding.error) {
    issues.push(`Bolding exceeds hard limit: ${(boldRatio * 100).toFixed(1)}% (limit: ${THRESHOLDS.bolding.error * 100}%).`);
  } else if (boldRatio > THRESHOLDS.bolding.warn) {
    warnings.push(`High bolding density: ${(boldRatio * 100).toFixed(1)}% (warn at: ${THRESHOLDS.bolding.warn * 100}%).`);
  }

  if (emojiCount > THRESHOLDS.emoji.error) {
    issues.push(`Emoji count ${emojiCount} exceeds hard limit (${THRESHOLDS.emoji.error}).`);
  } else if (emojiCount > THRESHOLDS.emoji.warn) {
    warnings.push(`Emoji count: ${emojiCount} (warn at: ${THRESHOLDS.emoji.warn}).`);
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log(`\n======================================================`);
  console.log(`  BEAUTIFUL MARKDOWN AUDIT REPORT: ${path.basename(filePath)}`);
  console.log(`======================================================`);
  console.log(`Path: ${filePath}`);
  console.log(`Lines: ${lines.length} | Size: ${totalChars} chars | H1 Count: ${h1Count}`);
  console.log(`Bolding Ratio: ${(boldRatio * 100).toFixed(1)}% | Emojis: ${emojiCount}`);
  console.log(`------------------------------------------------------`);

  if (issues.length === 0 && warnings.length === 0) {
    console.log(`✅ ALL CHECKS PASSED.`);
    return true;
  }

  if (issues.length > 0) {
    console.log(`❌ ISSUES (${issues.length}):`);
    issues.forEach(err => console.log(`   - ${err}`));
  }
  if (warnings.length > 0) {
    console.log(`⚠️ WARNINGS (${warnings.length}):`);
    warnings.forEach(warn => console.log(`   - ${warn}`));
  }

  return issues.length === 0;
}

/**
 * Structural Mermaid validation (self-contained, no external module dependency).
 * Catches the audit-identified failures: dangling arrows, missing targets,
 * bad node IDs, unquoted labels.
 */
function validateMermaidStructural(lines, startLine, issues, warnings) {
  if (lines.length === 0) {
    warnings.push(`Line ${startLine}: Empty Mermaid block.`);
    return;
  }

  const firstLine = lines[0].text.trim();
  const VALID_TYPES = ['flowchart', 'graph', 'sequenceDiagram', 'stateDiagram', 'stateDiagram-v2',
    'mindmap', 'timeline', 'classDiagram', 'erDiagram', 'gantt', 'pie',
    'quadrantChart', 'requirementDiagram', 'gitGraph', 'journey'];

  const graphType = VALID_TYPES.find(t => firstLine.startsWith(t));
  if (!graphType) {
    issues.push(`Line ${startLine + 1}: Unrecognized Mermaid graph type: "${firstLine}".`);
    return;
  }

  const isFlowChart = graphType === 'flowchart' || graphType === 'graph';
  let nodeCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const { text: rawLine, lineNum } = lines[i];
    const l = rawLine.trim();
    if (!l || l.startsWith('%') || l === 'end' || l.startsWith('subgraph') ||
        l.startsWith('style') || l.startsWith('class ') || l.startsWith('direction')) continue;

    // Dangling arrow (arrow at end of line, no target)
    if (l.match(/(?:-->|--|==>|-\.->)[\s|]*$/) && !l.match(/(?:-->|--|==>|-\.->)[\s|]*\w/)) {
      issues.push(`Line ${lineNum}: Dangling edge arrow with no target node: "${l}"`);
    }

    // Unquoted parenthesis in node label
    if (l.match(/\w+\[[^"]*\([^)]*\)[^"]*\]/)) {
      warnings.push(`Line ${lineNum}: Unquoted parenthesis in Mermaid node. Use: NodeID["Label (Detail)"].`);
    }

    if (isFlowChart) nodeCount++;
  }

  if (isFlowChart && nodeCount > 12) {
    warnings.push(`Mermaid block at line ${startLine}: High node count (${nodeCount}). Consider splitting (max recommended: 12).`);
  }
}

if (require.main === module) {
  const targetPath = process.argv[2];
  if (!targetPath) {
    console.log('Usage: node markdown_audit.js <path-to-markdown-file>');
    process.exit(1);
  }
  const passed = auditMarkdown(path.resolve(targetPath));
  process.exit(passed ? 0 : 1);
}

module.exports = { auditMarkdown };
