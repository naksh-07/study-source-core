#!/usr/bin/env node
/**
 * Beautiful Markdown V2 — Real YAML Frontmatter Validator
 *
 * Replaces regex-only YAML checking with actual structural parsing.
 * Detects: tab indentation, unclosed quotes, duplicate keys,
 * unsupported property types, invalid values, missing closing ---.
 *
 * Does NOT require external npm packages — pure Node.js.
 */

const fs = require('fs');
const path = require('path');

const KNOWN_PROPERTIES = {
  title: 'string',
  aliases: 'array',
  tags: 'array',
  subject: 'string',
  chapter: 'string',
  type: 'string',
  date: 'string',
  author: 'string',
  source: 'string',
  status: 'string',
};

const VALID_TYPES = [
  'Knowledge Note', 'Study Note', 'Research Note',
  'Technical Note', 'Reference', 'ADR', 'Meeting Note'
];

function extractFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (!lines[0] || lines[0].trim() !== '---') return null;
  const endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (endIdx === -1) return null;
  return { lines: lines.slice(1, endIdx), endLine: endIdx };
}

function validateYamlFrontmatter(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  const warnings = [];

  // Check for unclosed frontmatter
  const allLines = content.split(/\r?\n/);
  if (allLines[0] && allLines[0].trim() === '---') {
    const closeIdx = allLines.findIndex((l, i) => i > 0 && l.trim() === '---');
    if (closeIdx === -1) {
      issues.push('Line 1: Unclosed YAML frontmatter block — missing terminating `---`.');
      return report(filePath, issues, warnings);
    }
  }

  const fm = extractFrontmatter(content);
  if (!fm) {
    warnings.push('No YAML frontmatter block found (optional but recommended).');
    return report(filePath, [], warnings);
  }

  const { lines } = fm;
  const seenKeys = new Set();
  let inArray = false;
  let currentKey = null;
  let openQuoteChar = null;
  let openQuoteLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNum = i + 2; // +1 for 0-index, +1 for opening ---

    // Tab detection (YAML forbids tabs for indentation)
    if (/^\t|\t/.test(rawLine)) {
      issues.push(`Line ${lineNum}: Tab character found. YAML requires spaces only for indentation.`);
    }

    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;

    // Continuation of open quote
    if (openQuoteChar) {
      if (line.includes(openQuoteChar)) {
        openQuoteChar = null;
        openQuoteLine = -1;
      }
      continue;
    }

    // Array item continuation
    if (line.startsWith('- ')) {
      if (!inArray) {
        warnings.push(`Line ${lineNum}: List item found outside expected array context.`);
      }
      const itemValue = line.substring(2).trim();
      // Check unclosed quotes in item
      const sq = (itemValue.match(/'/g) || []).length;
      const dq = (itemValue.match(/"/g) || []).length;
      if (sq % 2 !== 0) {
        issues.push(`Line ${lineNum}: Unclosed single quote in list item: "${itemValue}"`);
        openQuoteChar = "'";
        openQuoteLine = lineNum;
      } else if (dq % 2 !== 0) {
        issues.push(`Line ${lineNum}: Unclosed double quote in list item: "${itemValue}"`);
        openQuoteChar = '"';
        openQuoteLine = lineNum;
      }
      continue;
    }
    inArray = false;

    // Key: value pair
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      issues.push(`Line ${lineNum}: Invalid YAML syntax — no colon found: "${line}"`);
      continue;
    }

    const key = line.substring(0, colonIdx).trim();
    const rawValue = line.substring(colonIdx + 1).trim();

    // Key format validation
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      issues.push(`Line ${lineNum}: Invalid property key format: "${key}" (use [a-zA-Z_][a-zA-Z0-9_]*).`);
    }

    // Duplicate key detection
    if (seenKeys.has(key)) {
      issues.push(`Line ${lineNum}: Duplicate property key: "${key}"`);
    }
    seenKeys.add(key);
    currentKey = key;

    // Unknown property warning
    if (!KNOWN_PROPERTIES[key]) {
      warnings.push(`Line ${lineNum}: Unknown property "${key}" (not in standard Obsidian schema).`);
    }

    // Empty value / array start
    if (rawValue === '' || rawValue === '[]' || rawValue === '~' || rawValue === 'null') {
      inArray = rawValue === '' || rawValue === '[]';
      continue;
    }

    // Unclosed quote detection
    const singleQ = (rawValue.match(/'/g) || []).length;
    const doubleQ = (rawValue.match(/"/g) || []).length;
    if (singleQ % 2 !== 0) {
      issues.push(`Line ${lineNum}: Unclosed single quote in value for "${key}": ${rawValue}`);
      openQuoteChar = "'";
      openQuoteLine = lineNum;
    } else if (doubleQ % 2 !== 0) {
      issues.push(`Line ${lineNum}: Unclosed double quote in value for "${key}": ${rawValue}`);
      openQuoteChar = '"';
      openQuoteLine = lineNum;
    }

    // Type validation
    const expectedType = KNOWN_PROPERTIES[key];
    if (expectedType === 'array' && rawValue && !rawValue.startsWith('[') && !rawValue.startsWith('-')) {
      warnings.push(`Line ${lineNum}: Property "${key}" expected array but got scalar: "${rawValue}".`);
    }

    // Enum validation for 'type' field
    if (key === 'type' && rawValue) {
      const cleanVal = rawValue.replace(/['"]/g, '').trim();
      if (cleanVal && !VALID_TYPES.includes(cleanVal)) {
        warnings.push(`Line ${lineNum}: "type" value "${cleanVal}" not in standard list: ${VALID_TYPES.join(', ')}.`);
      }
    }
  }

  // Unclosed quote ran past end of frontmatter
  if (openQuoteChar) {
    issues.push(`Line ${openQuoteLine}: Unclosed ${openQuoteChar === "'" ? 'single' : 'double'} quote not terminated before end of frontmatter.`);
  }

  return report(filePath, issues, warnings);
}

function report(filePath, issues, warnings) {
  const fileName = path.basename(filePath);
  console.log('======================================================');
  console.log(`  YAML FRONTMATTER VALIDATOR: ${fileName}`);
  console.log('======================================================');
  if (issues.length > 0) {
    console.log(`❌ YAML ISSUES (${issues.length}):`);
    issues.forEach(iss => console.log(`  - [ERROR] ${iss}`));
  }
  if (warnings.length > 0) {
    console.log(`⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(w => console.log(`  - [WARN]  ${w}`));
  }
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ YAML FRONTMATTER VALID.');
  } else if (issues.length === 0) {
    console.log('✅ YAML VALID WITH WARNINGS.');
  }
  console.log('======================================================\n');
  return { issues, warnings, passed: issues.length === 0 };
}

if (require.main === module) {
  const [,, filePath] = process.argv;
  if (!filePath) {
    console.log('Usage: node yaml_validator.js <path-to-markdown-file>');
    process.exit(1);
  }
  const result = validateYamlFrontmatter(path.resolve(filePath));
  process.exit(result.passed ? 0 : 1);
}

module.exports = { validateYamlFrontmatter, extractFrontmatter };
