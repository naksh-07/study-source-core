#!/usr/bin/env node
/**
 * Beautiful Markdown V2 — Vault Indexer
 *
 * Builds a cached, incrementally-refreshable index of an Obsidian vault.
 * Index captures per-note:
 *  - file path, basename, mtime
 *  - frontmatter aliases, tags, properties
 *  - H1-H3 headings (for heading-anchor resolution)
 *  - outgoing Wikilinks
 *
 * Cache: Written to <vaultRoot>/.bm-cache/vault-index.json
 * Refresh: Incremental (re-indexes only files modified since last cache build)
 * Safety: Does NOT scan .obsidian, .trash, .bm-cache, .git, node_modules
 *
 * Usage:
 *   node vault_indexer.js build <vaultRoot>              # Build / refresh index
 *   node vault_indexer.js resolve <vaultRoot> <target>   # Resolve wikilink target
 *   node vault_indexer.js stats <vaultRoot>              # Print index stats
 *   node vault_indexer.js audit <vaultRoot> <note.md>    # Audit links in a note
 */

const fs = require('fs');
const path = require('path');

const CACHE_DIR = '.bm-cache';
const CACHE_FILE = 'vault-index.json';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const SKIP_DIRS = new Set(['.obsidian', '.trash', '.bm-cache', '.git', 'node_modules', '.stfolder']);

// ─── Cache helpers ────────────────────────────────────────────────────────────
function getCachePath(vaultRoot) {
  return path.join(vaultRoot, CACHE_DIR, CACHE_FILE);
}

function loadCache(vaultRoot) {
  const cachePath = getCachePath(vaultRoot);
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch {
      return { version: '1.0', builtAt: 0, notes: {} };
    }
  }
  return { version: '1.0', builtAt: 0, notes: {} };
}

function saveCache(vaultRoot, cache) {
  const cacheDir = path.join(vaultRoot, CACHE_DIR);
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(getCachePath(vaultRoot), JSON.stringify(cache, null, 2), 'utf8');
}

// ─── Note parser ──────────────────────────────────────────────────────────────
function parseFrontmatterArray(fmText, key) {
  // Inline: key: [a, b]
  const inlineM = fmText.match(new RegExp(`^${key}:\\s*\\[([^\\]]*)\\]`, 'm'));
  if (inlineM) {
    return inlineM[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
  }
  // Block: key:\n  - item
  const blockM = fmText.match(new RegExp(`^${key}:\\s*\\n((?:\\s*-\\s*.+\\n?)+)`, 'm'));
  if (blockM) {
    return blockM[1].split('\n')
      .map(l => l.replace(/^\s*-\s*/, '').replace(/['"]/g, '').trim())
      .filter(Boolean);
  }
  return [];
}

function parseFrontmatterScalar(fmText, key) {
  const m = fmText.match(new RegExp(`^${key}:\\s*['"']?([^'"\r\n]+)['"']?`, 'm'));
  return m ? m[1].trim() : null;
}

function parseNote(filePath) {
  const stat = fs.statSync(filePath);
  const entry = {
    path: filePath,
    basename: path.basename(filePath, '.md'),
    mtime: stat.mtimeMs,
    oversized: false,
    aliases: [],
    tags: [],
    headings: [],
    links: [],
    properties: {},
  };

  if (stat.size > MAX_FILE_SIZE_BYTES) {
    entry.oversized = true;
    return entry;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const allLines = content.split(/\r?\n/);
  let bodyStart = 0;

  if (content.startsWith('---')) {
    const endIdx = allLines.findIndex((l, i) => i > 0 && l.trim() === '---');
    if (endIdx !== -1) {
      const fmText = allLines.slice(1, endIdx).join('\n');
      bodyStart = endIdx + 1;
      entry.aliases = parseFrontmatterArray(fmText, 'aliases');
      entry.tags = parseFrontmatterArray(fmText, 'tags');
      const props = ['title', 'subject', 'chapter', 'type', 'status', 'author'];
      for (const p of props) {
        const val = parseFrontmatterScalar(fmText, p);
        if (val) entry.properties[p] = val;
      }
    }
  }

  const bodyLines = allLines.slice(bodyStart);
  let inFence = false;

  for (const line of bodyLines) {
    const trimmed = line.trim();
    if (trimmed.match(/^```/)) { inFence = !inFence; continue; }
    if (inFence) continue;

    // Headings (H1-H3 for anchor resolution)
    const hm = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      entry.headings.push({ level: hm[1].length, text: hm[2].trim() });
    }

    // Wikilinks
    const linkRe = /!?\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
    let m;
    while ((m = linkRe.exec(line)) !== null) {
      entry.links.push({
        target: m[1].trim(),
        heading: m[2] ? m[2].trim() : null,
        alias: m[3] ? m[3].trim() : null,
      });
    }
  }

  return entry;
}

// ─── Index builder ────────────────────────────────────────────────────────────
function walkVault(dir, files = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return files; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const fullPath = path.join(dir, e.name);
    if (e.isDirectory()) walkVault(fullPath, files);
    else if (e.isFile() && e.name.endsWith('.md')) files.push(fullPath);
  }
  return files;
}

function buildIndex(vaultRoot, options = {}) {
  const force = !!options.force;
  const cache = force ? { version: '1.0', builtAt: 0, notes: {} } : loadCache(vaultRoot);

  const mdFiles = walkVault(vaultRoot);
  let indexed = 0, skipped = 0, errors = 0;

  for (const filePath of mdFiles) {
    try {
      const stat = fs.statSync(filePath);
      const cached = cache.notes[filePath];
      if (!force && cached && cached.mtime === stat.mtimeMs) { skipped++; continue; }
      cache.notes[filePath] = parseNote(filePath);
      indexed++;
    } catch (e) {
      errors++;
    }
  }

  // Remove stale entries (deleted files)
  const fileSet = new Set(mdFiles);
  for (const key of Object.keys(cache.notes)) {
    if (!fileSet.has(key)) delete cache.notes[key];
  }

  cache.builtAt = Date.now();
  saveCache(vaultRoot, cache);

  return { totalFiles: mdFiles.length, indexed, skipped, errors };
}

// ─── Link resolver ────────────────────────────────────────────────────────────
/**
 * Resolve a Wikilink target using the canonical hierarchy:
 * 1. Exact basename  2. Alias  3. Normalized (case/hyphen-insensitive)
 * 4. Heading target  5. Candidate suggestion  6. Plain text (unresolvable)
 */
function resolveLink(vaultRoot, target, headingAnchor = null) {
  const cache = loadCache(vaultRoot);
  const notes = Object.values(cache.notes);

  function normalize(s) { return s.toLowerCase().replace(/[-_\s]+/g, ' ').trim(); }

  const targetNorm = normalize(target);

  // 1. Exact basename
  for (const n of notes) {
    if (n.basename.toLowerCase() === target.toLowerCase()) {
      return { resolved: true, method: 'exact', path: n.path, basename: n.basename, headingValid: verifyHeading(n, headingAnchor) };
    }
  }

  // 2. Alias (exact)
  for (const n of notes) {
    for (const alias of n.aliases) {
      if (alias.toLowerCase() === target.toLowerCase()) {
        return { resolved: true, method: 'alias', path: n.path, basename: n.basename, headingValid: verifyHeading(n, headingAnchor) };
      }
    }
  }

  // 3. Normalized basename & alias
  for (const n of notes) {
    if (normalize(n.basename) === targetNorm) {
      return { resolved: true, method: 'normalized', path: n.path, basename: n.basename, headingValid: verifyHeading(n, headingAnchor) };
    }
    for (const alias of n.aliases) {
      if (normalize(alias) === targetNorm) {
        return { resolved: true, method: 'alias_normalized', path: n.path, basename: n.basename, headingValid: verifyHeading(n, headingAnchor) };
      }
    }
  }

  // 4. Heading target resolution (target matches a heading in some note)
  if (headingAnchor) {
    for (const n of notes) {
      if (verifyHeading(n, headingAnchor)) {
        return { resolved: true, method: 'heading', path: n.path, basename: n.basename, headingValid: true };
      }
    }
  }

  // 5. Candidate suggestion (partial match)
  const candidates = notes.filter(n => {
    const bn = normalize(n.basename);
    const words = targetNorm.split(' ');
    return words.some(w => w.length > 3 && bn.includes(w));
  }).slice(0, 3).map(n => n.basename);

  if (candidates.length > 0) {
    return { resolved: false, method: 'candidate', candidates, path: null };
  }

  // 6. Unresolvable
  return { resolved: false, method: 'plain_text', path: null };
}

function verifyHeading(note, headingAnchor) {
  if (!headingAnchor) return null;
  return note.headings.some(h => h.text.toLowerCase() === headingAnchor.toLowerCase());
}

// ─── Note link auditor ────────────────────────────────────────────────────────
function auditNoteLinks(vaultRoot, notePath) {
  const content = fs.readFileSync(notePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const results = { valid: [], broken: [], candidates: [], selfLinks: [] };
  const noteName = path.basename(notePath, '.md').toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const re = /!?\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      const target = m[1].trim();
      const heading = m[2] ? m[2].trim() : null;
      const targetLower = target.toLowerCase().replace(/[-_\s]+/g, ' ');

      if (targetLower === noteName) {
        results.selfLinks.push({ target, lineNum: i + 1 });
        continue;
      }

      const resolution = resolveLink(vaultRoot, target, heading);
      if (resolution.resolved) {
        results.valid.push({ target, method: resolution.method, path: resolution.path, lineNum: i + 1 });
      } else if (resolution.method === 'candidate') {
        results.candidates.push({ target, candidates: resolution.candidates, lineNum: i + 1 });
      } else {
        results.broken.push({ target, lineNum: i + 1 });
      }
    }
  }

  console.log('======================================================');
  console.log(`  VAULT LINK AUDIT: ${path.basename(notePath)}`);
  console.log('======================================================');
  console.log(`Valid targets:    ${results.valid.length}`);
  console.log(`Candidates:       ${results.candidates.length}`);
  console.log(`Broken (phantom): ${results.broken.length}`);
  console.log(`Self-links:       ${results.selfLinks.length}`);
  console.log('------------------------------------------------------');

  if (results.broken.length > 0) {
    console.log('❌ BROKEN LINKS:');
    results.broken.forEach(l => console.log(`  Line ${l.lineNum}: [[${l.target}]] — no matching vault note`));
  }
  if (results.candidates.length > 0) {
    console.log('⚠️  CANDIDATES (unresolved but has matches):');
    results.candidates.forEach(l => console.log(`  Line ${l.lineNum}: [[${l.target}]] → did you mean: ${l.candidates.join(', ')}?`));
  }
  if (results.selfLinks.length > 0) {
    console.log('⚠️  SELF-LINKS:');
    results.selfLinks.forEach(l => console.log(`  Line ${l.lineNum}: [[${l.target}]] is a self-link`));
  }
  if (results.broken.length === 0) {
    console.log('✅ No broken phantom links detected.');
  }
  console.log('======================================================\n');

  return results;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const [,, command, vaultRoot, arg1, arg2] = process.argv;

  if (!command || !vaultRoot) {
    console.log('Usage:');
    console.log('  node vault_indexer.js build <vaultRoot>                   # Build/refresh index');
    console.log('  node vault_indexer.js resolve <vaultRoot> <target>        # Resolve wikilink');
    console.log('  node vault_indexer.js stats <vaultRoot>                   # Show index stats');
    console.log('  node vault_indexer.js audit <vaultRoot> <note.md>         # Audit note links');
    process.exit(1);
  }

  const absVault = path.resolve(vaultRoot);

  if (command === 'build') {
    const r = buildIndex(absVault, { force: process.argv.includes('--force') });
    console.log(`✅ Vault indexed: ${r.totalFiles} total | ${r.indexed} updated | ${r.skipped} cached | ${r.errors} errors`);
    console.log(`   Cache: ${getCachePath(absVault)}`);
  } else if (command === 'resolve') {
    if (!arg1) { console.error('Target required.'); process.exit(1); }
    const r = resolveLink(absVault, arg1, arg2 || null);
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.resolved ? 0 : 1);
  } else if (command === 'stats') {
    const cache = loadCache(absVault);
    const notes = Object.values(cache.notes);
    console.log(`Vault Index Stats (${getCachePath(absVault)})`);
    console.log(`  Total notes:     ${notes.length}`);
    console.log(`  With aliases:    ${notes.filter(n => n.aliases.length > 0).length}`);
    console.log(`  With tags:       ${notes.filter(n => n.tags.length > 0).length}`);
    console.log(`  Total headings:  ${notes.reduce((s, n) => s + n.headings.length, 0)}`);
    console.log(`  Total links:     ${notes.reduce((s, n) => s + n.links.length, 0)}`);
    console.log(`  Built at:        ${new Date(cache.builtAt).toISOString()}`);
  } else if (command === 'audit') {
    if (!arg1) { console.error('Note path required.'); process.exit(1); }
    auditNoteLinks(absVault, path.resolve(arg1));
  }
}

module.exports = { buildIndex, resolveLink, loadCache, parseNote, auditNoteLinks };
