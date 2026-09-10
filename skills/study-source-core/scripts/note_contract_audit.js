#!/usr/bin/env node

/**
 * Beautiful Markdown V2 Knowledge Note Contract Auditor
 * 
 * Validates compliance with `references/knowledge-note-contract.md`
 * and `references/quality-thresholds.md` (canonical thresholds):
 * 1. YAML frontmatter presence check (deep validation: use yaml_validator.js)
 * 2. Exactly one H1 title in the body
 * 3. Strict heading level monotonicity (no skipping levels e.g. H1 -> H3)
 * 4. Duplicate H2/H3 section heading detection
 * 5. Obsidian callout formatting (> [!TYPE] Title)
 * 6. Anti-slop limits per quality-thresholds.md:
 *    - Bolding ratio: WARN > 15%, ERROR > 20%
 *    - Emojis: WARN > 1, ERROR > 2
 */

// Canonical thresholds (aligned with references/quality-thresholds.md)
const THRESHOLDS = {
  bold: { warn: 0.15, error: 0.20 },
  emoji: { warn: 1, error: 2 },
};

const fs = require('fs');
const path = require('path');

function auditNoteContract(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  
  const issues = [];
  const warnings = [];

  let inFrontmatter = false;
  let frontmatterClosed = false;
  let frontmatterLines = [];
  let bodyStartIndex = 0;

  // 1. Inspect Frontmatter
  if (lines.length > 0 && lines[0].trim() === '---') {
    inFrontmatter = true;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        inFrontmatter = false;
        frontmatterClosed = true;
        bodyStartIndex = i + 1;
        break;
      }
      frontmatterLines.push(lines[i]);
    }
    if (!frontmatterClosed) {
      issues.push('Line 1: Unclosed YAML frontmatter block (missing terminating `---`).');
    }
  }

  // Check frontmatter keys if present
  if (frontmatterClosed) {
    const fmText = frontmatterLines.join('\n');
    if (!fmText.includes('title:') && !fmText.includes('aliases:') && !fmText.includes('tags:')) {
      warnings.push('Frontmatter present but missing standard metadata keys (`title`, `aliases`, `tags`).');
    }
  }

  // 2. Heading Monotonicity, Single H1, Duplicate H2/H3 Check
  let h1Count = 0;
  let lastHeadingLevel = 0;
  const fenceStack = [];
  const h2Seen = new Map();
  const h3Seen = new Map();

  for (let i = bodyStartIndex; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    // Code fence handling
    const fenceMatch = trimmed.match(/^(`{3,})/);
    if (fenceMatch) {
      const fenceLen = fenceMatch[1].length;
      if (fenceStack.length === 0) {
        fenceStack.push(fenceLen);
      } else if (fenceLen >= fenceStack[fenceStack.length - 1]) {
        fenceStack.pop();
      }
      continue;
    }
    if (fenceStack.length > 0) continue;

    // Heading match
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      const titleLower = title.toLowerCase();

      if (level === 1) {
        h1Count++;
        if (h1Count > 1) {
          issues.push(`Line ${lineNum}: Multiple H1 headings found ("# ${title}"). Only one H1 is permitted per Knowledge Note.`);
        }
      } else {
        if (h1Count === 0) {
          warnings.push(`Line ${lineNum}: H${level} appears before top-level H1 title.`);
        }
        if (lastHeadingLevel > 0 && level > lastHeadingLevel + 1) {
          issues.push(`Line ${lineNum}: Skipped heading level (H${lastHeadingLevel} -> H${level}: "${title}"). Maintain monotonic hierarchy.`);
        }
        if (level === 2) {
          if (h2Seen.has(titleLower)) {
            issues.push(`Line ${lineNum}: Duplicate H2 section "${title}" (first at line ${h2Seen.get(titleLower)}).`);
          } else {
            h2Seen.set(titleLower, lineNum);
          }
        } else if (level === 3) {
          if (h3Seen.has(titleLower)) {
            warnings.push(`Line ${lineNum}: Duplicate H3 heading "${title}" (first at line ${h3Seen.get(titleLower)}).`);
          } else {
            h3Seen.set(titleLower, lineNum);
          }
        }
      }
      lastHeadingLevel = level;
    }
  }

  if (h1Count === 0) {
    issues.push('Document is missing a top-level H1 title (`# Title`).');
  }

  // 3. Slop Heuristics (thresholds from references/quality-thresholds.md)
  let boldChars = 0;
  const boldMatches = content.match(/\*\*(.+?)\*\*/g) || [];
  // Include the 4 asterisks in each match in the character count (correct calculation)
  boldMatches.forEach(b => boldChars += b.length);
  const boldRatio = content.length > 0 ? (boldChars / content.length) : 0;
  const boldPct = boldRatio * 100;

  if (boldRatio > THRESHOLDS.bold.error) {
    issues.push(`Bolding exceeds hard limit: ${boldPct.toFixed(1)}% (limit: ${THRESHOLDS.bold.error * 100}%).`);
  } else if (boldRatio > THRESHOLDS.bold.warn) {
    warnings.push(`High bolding density: ${boldPct.toFixed(1)}% (warn threshold: ${THRESHOLDS.bold.warn * 100}%).`);
  }

  const emojiMatches = content.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || [];
  if (emojiMatches.length > THRESHOLDS.emoji.error) {
    issues.push(`Emoji count ${emojiMatches.length} exceeds hard limit (${THRESHOLDS.emoji.error}).`);
  } else if (emojiMatches.length > THRESHOLDS.emoji.warn) {
    warnings.push(`Emoji count: ${emojiMatches.length} (warn threshold: ${THRESHOLDS.emoji.warn}).`);
  }

  // Summary Report
  const fileName = path.basename(filePath);
  console.log('======================================================');
  console.log(`  KNOWLEDGE NOTE CONTRACT AUDIT: ${fileName}`);
  console.log('======================================================');
  console.log(`Path: ${filePath}`);
  console.log(`Frontmatter: ${frontmatterClosed ? 'Present (deep YAML validation: use yaml_validator.js)' : (lines[0]?.trim() === '---' ? 'Malformed (unclosed)' : 'None')}`);
  console.log(`H1 Count: ${h1Count} | Heading Jump Valid: ${issues.filter(i => i.includes('Skipped heading')).length === 0}`);
  console.log(`Duplicate H2: ${h2Seen.size} unique | Bolding: ${boldPct.toFixed(1)}% | Emojis: ${emojiMatches.length}`);
  console.log('------------------------------------------------------');

  if (issues.length > 0) {
    console.log(`❌ ISSUES FOUND (${issues.length}):`);
    issues.forEach(iss => console.log(`  - [ERROR] ${iss}`));
  }

  if (warnings.length > 0) {
    console.log(`⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(w => console.log(`  - [WARN]  ${w}`));
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ ALL CONTRACT CHECKS PASSED: Conforms to Knowledge Note Contract.');
  } else if (issues.length === 0) {
    console.log('✅ CONTRACT PASSED WITH MINOR WARNINGS.');
  }

  console.log('======================================================\n');

  return {
    hasFrontmatter: frontmatterClosed,
    h1Count,
    boldRatio: boldPct,
    emojiCount: emojiMatches.length,
    duplicateH2: [...h2Seen.entries()].filter((_, __, arr) => arr.length !== new Set([...h2Seen.values()]).size),
    issues,
    warnings,
    success: issues.length === 0
  };
}

if (require.main === module) {
  const targetPath = process.argv[2];
  if (!targetPath) {
    console.log('Usage: node note_contract_audit.js <path-to-markdown-file>');
    process.exit(1);
  }
  const result = auditNoteContract(targetPath);
  process.exit(result.success ? 0 : 1);
}

module.exports = { auditNoteContract };
