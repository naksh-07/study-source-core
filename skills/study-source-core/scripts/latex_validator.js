#!/usr/bin/env node
/**
 * Beautiful Markdown V2 — LaTeX Math Delimiter Validator
 *
 * Validates LaTeX math syntax integrity:
 *  1. Matching display math delimiters $$ ... $$ (even count per document)
 *  2. Unclosed inline math $ on same line
 *  3. Empty math blocks ($$$$, $ $)
 *  4. Display math open at EOF
 *
 * Scope: Syntax integrity only. Does NOT validate mathematical correctness.
 */

const fs = require('fs');
const path = require('path');

function validateLatex(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const issues = [];
  const warnings = [];

  let inCodeFence = false;
  let fenceLen = 0;
  let inDisplayMath = false;
  let displayMathStartLine = -1;
  let displayMathCount = 0;
  let inlineMathCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code fence tracking (skip math inside code blocks)
    const fenceMatch = trimmed.match(/^(`{3,})/);
    if (fenceMatch) {
      const len = fenceMatch[1].length;
      if (!inCodeFence) {
        inCodeFence = true;
        fenceLen = len;
      } else if (len >= fenceLen) {
        inCodeFence = false;
        fenceLen = 0;
      }
      continue;
    }
    if (inCodeFence) continue;

    // Process display math $$ — scan across full line
    let pos = 0;
    let workLine = rawLine;

    while (pos < workLine.length) {
      const ddIdx = workLine.indexOf('$$', pos);
      if (ddIdx === -1) break;

      if (!inDisplayMath) {
        inDisplayMath = true;
        displayMathStartLine = lineNum;
        displayMathCount++;
        pos = ddIdx + 2;

        // Check if it closes on the same line
        const closeIdx = workLine.indexOf('$$', pos);
        if (closeIdx !== -1) {
          const inner = workLine.substring(pos, closeIdx).trim();
          if (inner.length === 0) {
            warnings.push(`Line ${lineNum}: Empty display math block $$$$ (zero content).`);
          }
          inDisplayMath = false;
          pos = closeIdx + 2;
        }
      } else {
        // Closing $$
        inDisplayMath = false;
        pos = ddIdx + 2;
      }
    }

    // Process inline math $ (skip inside active display math spans)
    if (!inDisplayMath) {
      // Replace $$ with placeholders to avoid confusion
      const lineForInline = rawLine.replace(/\$\$/g, '\x00\x00');
      let inInline = false;
      let inlineStart = -1;

      for (let j = 0; j < lineForInline.length; j++) {
        if (lineForInline[j] === '$') {
          if (!inInline) {
            inInline = true;
            inlineStart = j;
          } else {
            inInline = false;
            const inner = lineForInline.substring(inlineStart + 1, j).trim();
            if (inner.length === 0) {
              warnings.push(`Line ${lineNum}: Empty inline math block $...$ (zero content).`);
            }
            inlineMathCount++;
          }
        }
      }

      if (inInline) {
        issues.push(`Line ${lineNum}: Unclosed inline math delimiter $. Inline math must open and close on the same line.`);
      }
    }
  }

  // Unclosed display math at EOF
  if (inDisplayMath) {
    issues.push(`Line ${displayMathStartLine}: Unclosed display math block $$ — not closed before EOF.`);
  }

  // Report
  const fileName = path.basename(filePath);
  console.log('======================================================');
  console.log(`  LATEX MATH VALIDATOR: ${fileName}`);
  console.log('======================================================');
  console.log(`Display math blocks ($$...$$): ${displayMathCount}`);
  console.log(`Inline math blocks ($...$):    ${inlineMathCount}`);
  console.log('------------------------------------------------------');

  if (issues.length > 0) {
    console.log(`❌ LATEX ISSUES (${issues.length}):`);
    issues.forEach(iss => console.log(`  - [ERROR] ${iss}`));
  }
  if (warnings.length > 0) {
    console.log(`⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(w => console.log(`  - [WARN]  ${w}`));
  }
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ ALL LATEX MATH DELIMITERS VALID.');
  } else if (issues.length === 0) {
    console.log('✅ LATEX VALID WITH WARNINGS.');
  }
  console.log('======================================================\n');

  return { displayMathCount, inlineMathCount, issues, warnings, passed: issues.length === 0 };
}

/**
 * Validates formula syntax, brace balancing, environment pairing, and notation safety.
 */
function validateFormulaSyntax(text, context = 'inline') {
  const errors = [];
  const warnings = [];
  if (!text || typeof text !== 'string') return { isValid: true, errors, warnings };

  // 1. Check matching curly braces { } (ignoring escaped \{ and \})
  let braceDepth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' && (i === 0 || text[i - 1] !== '\\')) braceDepth++;
    else if (text[i] === '}' && (i === 0 || text[i - 1] !== '\\')) {
      braceDepth--;
      if (braceDepth < 0) {
        errors.push(`Extra closing brace '}' in formula: "${text}"`);
        break;
      }
    }
  }
  if (braceDepth > 0) {
    errors.push(`Unclosed opening brace '{' in formula: "${text}"`);
  }

  // 2. Check matching \begin{env} and \end{env}
  const beginMatches = [...text.matchAll(/\\begin\{([a-zA-Z0-9*]+)\}/g)].map(m => m[1]);
  const endMatches = [...text.matchAll(/\\end\{([a-zA-Z0-9*]+)\}/g)].map(m => m[1]);
  if (beginMatches.length !== endMatches.length) {
    errors.push(`Mismatched LaTeX environments: \\begin{...} (${beginMatches.join(', ')}) vs \\end{...} (${endMatches.join(', ')})`);
  } else {
    for (let i = 0; i < beginMatches.length; i++) {
      if (beginMatches[i] !== endMatches[i]) {
        errors.push(`LaTeX environment mismatch: \\begin{${beginMatches[i]}} closed by \\end{${endMatches[i]}}`);
      }
    }
  }

  // 3. Check for unescaped HTML characters inside LaTeX math spans (< or > without spacing/command)
  if (/[^\\][<>]/.test(text) && !text.includes('\\lt') && !text.includes('\\gt') && !text.includes(' < ') && !text.includes(' > ') && !text.includes('<=') && !text.includes('>=')) {
    warnings.push(`Possible unescaped angle bracket in math formula: "${text}". Prefer '\\lt', '\\gt', '\\le', '\\ge' or space separation.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

if (require.main === module) {
  const [,, filePath] = process.argv;
  if (!filePath) {
    console.log('Usage: node latex_validator.js <path-to-markdown-file>');
    process.exit(1);
  }
  const result = validateLatex(path.resolve(filePath));
  process.exit(result.passed ? 0 : 1);
}

module.exports = {
  validateLatex,
  validateFormulaSyntax
};
