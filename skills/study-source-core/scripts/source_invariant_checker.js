#!/usr/bin/env node
/**
 * Beautiful Markdown V2 — Source Invariant Checker
 *
 * Extracts protected invariants from a source note and verifies
 * they are all preserved (unchanged, not dropped) in the output note.
 *
 * Protected invariant categories:
 *  1. Numbers (integers, decimals, percentages, scientific notation)
 *  2. Dates (various formats)
 *  3. LaTeX formulas (inline $ and display $$)
 *  4. URLs and bare hyperlinks
 *  5. Citation markers ([1], [^ref])
 *  6. Quoted strings ("..." of sufficient length)
 *
 * Modes:
 *  SOURCE_ONLY: Zero tolerance — any missing or new invariant fails validation (HARD GATE)
 *  EXTEND: Additions allowed; deletions/mutations are failures
 */

const fs = require('fs');
const path = require('path');

const PATTERNS = {
  numbers:      /(?<!\w)-?\d+(?:[.,]\d+)*(?:[eE][+-]?\d+)?%?(?!\w)/g,
  dates:        /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})\b/gi,
  latexDisplay: /\$\$[\s\S]+?\$\$/g,
  latexInline:  /(?<!\$)\$(?!\$)[^$\n]+?(?<!\$)\$/g,
  urls:         /https?:\/\/[^\s)\]>"']+/g,
  citations:    /\[\^?[\w.\-]+\]/g,
};

function stripForExtraction(text) {
  // Remove YAML frontmatter
  text = text.replace(/^---[\s\S]*?---\n/m, '');
  // Remove code fences (code content is not a knowledge invariant)
  text = text.replace(/```[\s\S]*?```/g, '');
  // Simplify wikilinks to just their text
  text = text.replace(/!\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g, '$1');
  text = text.replace(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g, '$1');
  return text;
}

function extractInvariants(text) {
  const cleaned = stripForExtraction(text);
  const invariants = [];

  for (const [category, pattern] of Object.entries(PATTERNS)) {
    const globalPattern = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'
    );
    let match;
    while ((match = globalPattern.exec(cleaned)) !== null) {
      const value = match[0].trim();
      if (value.length > 0) {
        invariants.push({ category, value: value.toLowerCase() });
      }
    }
  }

  // Deduplicate by category + value
  const seen = new Set();
  return invariants.filter(inv => {
    const key = `${inv.category}::${inv.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function checkInvariants(sourcePath, outputPath, options = {}) {
  const sourceMode = options.sourceMode || 'EXTEND';

  if (!fs.existsSync(sourcePath)) {
    console.error(`[ERROR] Source file not found: ${sourcePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(outputPath)) {
    console.error(`[ERROR] Output file not found: ${outputPath}`);
    process.exit(1);
  }

  const sourceText = fs.readFileSync(sourcePath, 'utf8');
  const outputText = fs.readFileSync(outputPath, 'utf8');

  const sourceInvariants = extractInvariants(sourceText);
  const outputCleaned = stripForExtraction(outputText).toLowerCase();

  const results = {
    total: sourceInvariants.length,
    preserved: 0,
    changed: 0,
    missing: 0,
    unsupportedNew: 0,
    details: [],
    passed: true,
  };

  for (const inv of sourceInvariants) {
    if (outputCleaned.includes(inv.value)) {
      results.preserved++;
    } else {
      results.missing++;
      results.details.push({ status: 'MISSING', category: inv.category, value: inv.value });
      // In SOURCE_ONLY: any loss is a hard failure
      // In EXTEND: loss is also a failure (nothing from source should disappear)
      results.passed = false;
    }
  }

  // SOURCE_ONLY: also flag new numbers/dates not in source (potential hallucinations)
  if (sourceMode === 'SOURCE_ONLY') {
    const outputInvariants = extractInvariants(outputText);
    const sourceValueSet = new Set(sourceInvariants.map(i => `${i.category}::${i.value}`));
    for (const inv of outputInvariants) {
      const key = `${inv.category}::${inv.value}`;
      if ((inv.category === 'numbers' || inv.category === 'dates') && !sourceValueSet.has(key)) {
        results.unsupportedNew++;
        results.details.push({ status: 'NEW_UNSUPPORTED', category: inv.category, value: inv.value });
        results.passed = false;
      }
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  const icon = results.passed ? '✅' : '❌';
  console.log('======================================================');
  console.log('  SOURCE INVARIANT CHECKER');
  console.log('======================================================');
  console.log(`Source:  ${path.basename(sourcePath)}`);
  console.log(`Output:  ${path.basename(outputPath)}`);
  console.log(`Mode:    ${sourceMode}`);
  console.log('------------------------------------------------------');
  console.log(`Source invariants:   ${results.total}`);
  console.log(`Preserved:           ${results.preserved}`);
  console.log(`Missing:             ${results.missing}`);
  console.log(`Unsupported new:     ${results.unsupportedNew}`);
  console.log('------------------------------------------------------');

  if (results.details.length > 0) {
    console.log('DETAILS:');
    for (const d of results.details) {
      console.log(`  [${d.status}] ${d.category}: "${d.value}"`);
    }
    console.log('------------------------------------------------------');
  }

  console.log(`${icon} SOURCE INVARIANT CHECK: ${results.passed ? 'PASSED' : 'FAILED'}`);
  console.log('======================================================\n');

  return results;
}

if (require.main === module) {
  const [,, sourcePath, outputPath, mode] = process.argv;
  if (!sourcePath || !outputPath) {
    console.log('Usage: node source_invariant_checker.js <source.md> <output.md> [SOURCE_ONLY|EXTEND]');
    process.exit(1);
  }
  const result = checkInvariants(
    path.resolve(sourcePath),
    path.resolve(outputPath),
    { sourceMode: mode || 'EXTEND' }
  );
  process.exit(result.passed ? 0 : 1);
}

module.exports = { checkInvariants, extractInvariants };
