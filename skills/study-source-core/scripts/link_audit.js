#!/usr/bin/env node

/**
 * Beautiful Markdown V2 Deterministic Link & Graph Auditor
 * 
 * Performs automated validation for:
 * 1. Wikilink syntax integrity ([[Target]], [[Target|Alias]], [[Target#Heading]])
 * 2. Duplicate link detection within the same note
 * 3. Self-referential links (linking to own note title)
 * 4. Generic dictionary noun link detection (Graph Slop)
 * 5. Embed / Transclusion syntax verification (![[Target#Heading]])
 * 6. Link density ratio metrics (Total Wikilinks / Total Word Count)
 */

const fs = require('fs');
const path = require('path');

const GENERIC_BANNED_WORDS = new Set([
  'time', 'year', 'day', 'water', 'earth', 'sun', 'moon', 'process', 'method',
  'system', 'concept', 'science', 'note', 'chapter', 'topic', 'world', 'data',
  'समय', 'वर्ष', 'दिन', 'जल', 'पानी', 'पृथ्वी', 'सूर्य', 'प्रक्रिया', 'पद्धति', 'तंत्र'
]);

function auditLinks(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const noteBasename = path.basename(filePath, path.extname(filePath)).toLowerCase();

  const issues = [];
  const warnings = [];

  // Extract frontmatter if any
  let bodyContent = content;
  let noteTitle = noteBasename;
  if (content.startsWith('---')) {
    const endMatch = content.indexOf('\n---', 3);
    if (endMatch !== -1) {
      const frontmatter = content.substring(3, endMatch);
      bodyContent = content.substring(endMatch + 4);
      const titleMatch = frontmatter.match(/title:\s*["']?([^"'\r\n]+)["']?/);
      if (titleMatch) {
        noteTitle = titleMatch[1].trim().toLowerCase();
      }
    }
  }

  // Word count of body
  const words = bodyContent.match(/\S+/g) || [];
  const totalWords = words.length;

  const linkRegex = /(!?\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\])/g;
  let match;
  
  const linkTargets = [];
  const seenTargets = new Map();
  let embedCount = 0;
  let genericLinkCount = 0;
  let selfLinkCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];

    // Skip lines inside code fences
    if (line.trim().startsWith('```')) continue;

    while ((match = linkRegex.exec(line)) !== null) {
      const fullMatch = match[1];
      const isEmbed = fullMatch.startsWith('!');
      const rawTarget = match[2].trim();
      const headingAnchor = match[3] ? match[3].trim() : null;
      const alias = match[4] ? match[4].trim() : null;
      const targetLower = rawTarget.toLowerCase();

      if (isEmbed) {
        embedCount++;
      } else {
        linkTargets.push({ target: rawTarget, heading: headingAnchor, alias, lineNum });

        // Check self-link
        if (targetLower === noteBasename || targetLower === noteTitle) {
          selfLinkCount++;
          issues.push(`Line ${lineNum}: Self-referential link to own note "${rawTarget}".`);
        }

        // Check generic noun link (Graph Slop)
        if (GENERIC_BANNED_WORDS.has(targetLower)) {
          genericLinkCount++;
          warnings.push(`Line ${lineNum}: Graph Slop: Linking generic common noun "[[${rawTarget}]]". Prefer unlinked prose or domain target.`);
        }

        // Check duplicate links
        if (seenTargets.has(targetLower)) {
          const prevLine = seenTargets.get(targetLower);
          warnings.push(`Line ${lineNum}: Duplicate link to "[[${rawTarget}]]" (previously linked on line ${prevLine}).`);
        } else {
          seenTargets.set(targetLower, lineNum);
        }
      }
    }
  }

  const totalWikilinks = linkTargets.length;
  const linkDensity = totalWords > 0 ? ((totalWikilinks / totalWords) * 100).toFixed(2) : '0.00';

  if (parseFloat(linkDensity) > 8.0) {
    warnings.push(`High Link Density: ${linkDensity}% of words are Wikilinks. Target is < 5.0%.`);
  }

  // Summary Report
  const fileName = path.basename(filePath);
  console.log('======================================================');
  console.log(`  BEAUTIFUL MARKDOWN GRAPH & LINK AUDIT: ${fileName}`);
  console.log('======================================================');
  console.log(`Path: ${filePath}`);
  console.log(`Words: ${totalWords} | Total Wikilinks: ${totalWikilinks} | Embeds: ${embedCount}`);
  console.log(`Unique Targets: ${seenTargets.size} | Link Density: ${linkDensity}%`);
  console.log(`Self-Links: ${selfLinkCount} | Generic Word Links: ${genericLinkCount}`);
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
    console.log('✅ ALL LINK CHECKS PASSED: Graph connectivity is clean and slop-free.');
  } else if (issues.length === 0) {
    console.log('✅ AUDIT PASSED WITH MINOR WARNINGS: No fatal graph defects.');
  }

  console.log('======================================================\n');

  return {
    totalWords,
    totalWikilinks,
    embedCount,
    uniqueTargets: seenTargets.size,
    linkDensity: parseFloat(linkDensity),
    selfLinkCount,
    genericLinkCount,
    issues,
    warnings,
    success: issues.length === 0
  };
}

if (require.main === module) {
  const targetPath = process.argv[2];
  if (!targetPath) {
    console.log('Usage: node link_audit.js <path-to-markdown-file>');
    process.exit(1);
  }
  const result = auditLinks(targetPath);
  process.exit(result.success ? 0 : 1);
}

module.exports = { auditLinks };
