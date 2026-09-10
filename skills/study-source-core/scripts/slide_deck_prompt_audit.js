/**
 * slide_deck_prompt_audit.js
 * 
 * Deterministic production auditor for NotebookLM Slide Deck Prompt artifacts
 * in study-source-core.
 * 
 * Usage:
 *   node slide_deck_prompt_audit.js <path_to_slidedeck_prompt_md>
 */

const fs = require('fs');
const path = require('path');

const MANDATORY_SECTIONS = [
    'ROLE / AUDIENCE',
    'LEARNING OBJECTIVE',
    'SOURCE GROUNDING',
    'VISUAL WORLD',
    'NARRATIVE MODE',
    'VISUAL VOCABULARY',
    'SLIDE STRUCTURE',
    'TEXT / DENSITY RULES',
    'ARTIFACT NON-DUPLICATION',
    'EXAM CONTEXT',
    'ANTI-PATTERNS',
    'FINAL QUALITY CHECK'
];

const APPROVED_BADGES = ['💡', '🔍', '⚡', '⚠️', '📐'];

function parseYamlFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return { frontmatter: null, rawBody: content };
    const rawYaml = match[1];
    const rawBody = content.slice(match[0].length).trim();
    const frontmatter = {};

    let currentKey = null;
    for (const line of rawYaml.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        if (trimmed.startsWith('- ') && currentKey) {
            if (!Array.isArray(frontmatter[currentKey])) {
                frontmatter[currentKey] = [];
            }
            frontmatter[currentKey].push(trimmed.slice(2).trim().replace(/^["']|["']$/g, ''));
            continue;
        }

        const colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0) {
            const key = trimmed.slice(0, colonIdx).trim();
            const val = trimmed.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
            currentKey = key;
            if (val === '') {
                frontmatter[key] = [];
            } else {
                frontmatter[key] = val;
            }
        }
    }
    return { frontmatter, rawBody };
}

function auditSlideDeckPrompt(filePath) {
    const results = {
        file: filePath,
        passed: true,
        errors: [],
        warnings: [],
        metrics: {}
    };

    if (!fs.existsSync(filePath)) {
        results.passed = false;
        results.errors.push(`File does not exist: ${filePath}`);
        return results;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const normalizedPath = filePath.replace(/\\/g, '/');

    // 1. Path conventions
    if (!normalizedPath.includes('/SlideDeck/') || !normalizedPath.endsWith('_SlideDeckPrompt.md')) {
        results.warnings.push(`File path should follow '.../SlideDeck/[Chapter]_SlideDeckPrompt.md' convention.`);
    }

    // 2. YAML Frontmatter check
    const { frontmatter, rawBody } = parseYamlFrontmatter(content);
    if (!frontmatter) {
        results.passed = false;
        results.errors.push('Missing or malformed YAML frontmatter enclosed in --- blocks.');
        return results;
    }

    if (frontmatter.type !== 'slide-deck-prompt') {
        results.passed = false;
        results.errors.push(`Frontmatter 'type' must be 'slide-deck-prompt', found '${frontmatter.type}'`);
    }

    if (!frontmatter.subject) {
        results.passed = false;
        results.errors.push("Frontmatter missing required 'subject' field.");
    }

    if (!frontmatter.chapter) {
        results.passed = false;
        results.errors.push("Frontmatter missing required 'chapter' field.");
    }

    const deckWorthiness = (frontmatter.deck_worthiness || '').toUpperCase();
    results.metrics.deckWorthiness = deckWorthiness;

    // Handle SUPPRESS state
    if (deckWorthiness === 'SUPPRESS') {
        results.metrics.isSuppressed = true;
        if (!rawBody.toLowerCase().includes('not recommended') && !rawBody.toLowerCase().includes('insufficient visual learning value')) {
            results.warnings.push('Suppressed deck artifact should contain clear justification of insufficient visual teaching value.');
        }
        return results;
    }

    if (!['HIGH', 'MEDIUM', 'LOW'].includes(deckWorthiness)) {
        results.errors.push(`Invalid deck_worthiness: '${frontmatter.deck_worthiness}'. Must be HIGH, MEDIUM, LOW, or SUPPRESS.`);
        results.passed = false;
    }

    if (!frontmatter.recommended_format) {
        results.warnings.push("Frontmatter missing 'recommended_format' (Presenter Slides | Detailed Deck).");
    }

    if (!frontmatter.dominant_structures || (Array.isArray(frontmatter.dominant_structures) && frontmatter.dominant_structures.length === 0)) {
        results.warnings.push("Frontmatter missing or empty 'dominant_structures' array.");
    }

    // 3. Markdown Heading Structure
    const h1Matches = [...rawBody.matchAll(/^#\s+(.+)$/gm)];
    if (h1Matches.length === 0) {
        results.passed = false;
        results.errors.push('Missing main H1 title.');
    } else if (h1Matches.length > 1) {
        results.warnings.push(`Multiple H1 titles found (${h1Matches.length}). Expected exactly 1.`);
    }

    // 4. Copy-Paste Code Block Payload Extraction
    const codeBlockMatch = rawBody.match(/```text\r?\n([\s\S]*?)\r?\n```/);
    if (!codeBlockMatch) {
        results.passed = false;
        results.errors.push("Missing copy-paste ready ```text ... ``` payload under '## Copy & Paste into NotebookLM'.");
        return results;
    }

    const payload = codeBlockMatch[1];
    results.metrics.payloadCharacters = payload.length;
    const words = payload.trim().split(/\s+/).filter(w => w.length > 0);
    results.metrics.payloadWords = words.length;

    // Word count thresholds (Soft target: ~1000-1800 words, Warning: >2000, Hard Review: >2500)
    if (results.metrics.payloadWords > 2500) {
        results.warnings.push(`Payload exceeds hard review threshold (2,500 words). Current: ${results.metrics.payloadWords} words.`);
    } else if (results.metrics.payloadWords > 2000) {
        results.warnings.push(`Payload exceeds preferred target (~1,000–1,800 words). Current: ${results.metrics.payloadWords} words.`);
    }

    // 5. Mandatory Sections in Payload & Duplicate Section Detection
    let duplicateInstructionWarnings = 0;
    for (const section of MANDATORY_SECTIONS) {
        const regex = new RegExp(`(^|\\n)\\s*\\d*\\.?\\s*${section.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}`, 'gi');
        const matches = [...payload.matchAll(regex)];
        if (matches.length === 0) {
            results.passed = false;
            results.errors.push(`Payload missing mandatory section: '${section}'`);
        } else if (matches.length > 1) {
            duplicateInstructionWarnings++;
            results.warnings.push(`Duplicate section header found for '${section}' (${matches.length} occurrences).`);
        }
    }
    results.metrics.duplicateInstructionWarnings = duplicateInstructionWarnings;

    // 6. Slide Structure Audit
    const slideStructureMatch = payload.match(/7\.\s*SLIDE STRUCTURE[\s\S]*?(?=\r?\n\s*8\.\s*TEXT)/i);
    const slideStructureText = slideStructureMatch ? slideStructureMatch[0] : payload;

    const slideMatches = [...slideStructureText.matchAll(/SLIDE\s+(\d+)\s*:\s*([^\r\n]+)/gi)];
    results.metrics.slideCount = slideMatches.length;

    if (slideMatches.length === 0) {
        results.passed = false;
        results.errors.push("No slides found in SLIDE STRUCTURE section (expected 'SLIDE X: TITLE').");
    } else {
        if (slideMatches.length < 5) {
            results.warnings.push(`Low slide count (${slideMatches.length} slides). Minimum recommended is 5.`);
        } else if (slideMatches.length > 15) {
            results.warnings.push(`High slide count (${slideMatches.length} slides). Maximum recommended is 15.`);
        }

        // Audit individual slides
        const slideBlocks = slideStructureText.split(/(?=SLIDE\s+\d+\s*:)/i).filter(b => /SLIDE\s+\d+\s*:/i.test(b));
        let totalContentBullets = 0;
        let oversizedBullets = 0;
        let slidesWithSpeakerNotes = 0;
        let slidesWithVisualContainers = 0;
        let slidesWithBadges = 0;

        slideBlocks.forEach((block, idx) => {
            const slideNum = idx + 1;

            // Headline / Takeaway check
            if (!/Headline\s*:/i.test(block) && !/Takeaway\s*:/i.test(block)) {
                results.warnings.push(`Slide ${slideNum}: Missing 'Active Assertion Headline' or 'Takeaway'.`);
            }

            // Visual Container check
            if (/Visual Container|Layout Directive|Visual:|Visual Form|Composition:/i.test(block)) {
                slidesWithVisualContainers++;
            } else {
                results.warnings.push(`Slide ${slideNum}: Missing explicit Visual Container Model / Layout directive.`);
            }

            // Speaker Notes check
            if (/Speaker Notes|Teacher Notes/i.test(block)) {
                slidesWithSpeakerNotes++;
            }

            // Extract Structured Slide Content section (isolating content bullets from visual descriptions/notes)
            const contentMatch = block.match(/(?:Structured\s*(?:Slide\s*)?Content|Slide Content|Content Bullets)\s*:([\s\S]*?)(?=(?:\r?\n\s*-\s*(?:Teacher|Speaker|Visual|Layout|Phase|Purpose|Headline|Takeaway|Composition))|(?:\r?\n\s*(?:Teacher|Speaker)\s*\/)|(?:\r?\n\s*---+)|$)/i);
            if (contentMatch) {
                const contentLines = contentMatch[1]
                    .split(/\r?\n/)
                    .map(l => l.trim())
                    .filter(l => {
                        if (!l.startsWith('*') && !l.startsWith('-')) return false;
                        if (/^-\s*(?:Teacher|Speaker|Visual|Layout|Phase|Purpose|Headline|Takeaway|Note)/i.test(l)) return false;
                        return true;
                    });
                
                totalContentBullets += contentLines.length;

                // Max 4 content bullets allowed per slide; >4 is a strict error.
                if (contentLines.length > 4) {
                    results.passed = false;
                    results.errors.push(`Slide ${slideNum}: Excessive content bullet count (${contentLines.length} bullets, maximum allowed is 4).`);
                }
                // 0, 1, 2, 3, 4 bullets are allowed without warning.

                let hasBadge = false;
                contentLines.forEach(line => {
                    if (APPROVED_BADGES.some(b => line.includes(b))) {
                        hasBadge = true;
                    }
                    const textWithoutBadge = line.replace(/^[*\-\s]+/, '').replace(/[💡🔍⚡⚠️📐]/g, '').trim();
                    const bulletWords = textWithoutBadge.split(/\s+/).filter(w => w.length > 0).length;
                    if (bulletWords > 18) {
                        oversizedBullets++;
                    }
                });
                if (hasBadge || contentLines.length === 0) slidesWithBadges++;
            } else {
                // Visual-only or diagram-led slide without explicit bullet list is completely valid
                slidesWithBadges++;
            }
        });

        results.metrics.contentBullets = totalContentBullets;
        results.metrics.totalContentBullets = totalContentBullets;
        results.metrics.avgContentBulletsPerSlide = (totalContentBullets / slideBlocks.length).toFixed(1);
        results.metrics.avgBulletsPerSlide = (totalContentBullets / slideBlocks.length).toFixed(1);
        results.metrics.oversizedBullets = oversizedBullets;
        results.metrics.speakerNotesCoverage = `${slidesWithSpeakerNotes}/${slideBlocks.length}`;
        results.metrics.badgeCoverage = `${slidesWithBadges}/${slideBlocks.length}`;

        if (slidesWithSpeakerNotes < slideBlocks.length) {
            results.warnings.push(`Incomplete speaker notes: ${slidesWithSpeakerNotes}/${slideBlocks.length} slides have notes.`);
        }
    }

    // 7. Safety, Anti-Duplication & Language Checks
    if (!payload.includes('SOURCE_ONLY') && !payload.includes('factual authority')) {
        results.warnings.push("Payload should explicitly enforce 'SOURCE_ONLY' or source factual authority.");
    }

    if (!payload.includes('NOT a Knowledge Note') && !payload.includes('ARTIFACT NON-DUPLICATION')) {
        results.warnings.push("Payload should contain explicit artifact non-duplication constraints.");
    }

    // Check for Hindi + Parenthetical English Terminology
    const hindiCharRegex = /[\u0900-\u097F]/;
    if (!hindiCharRegex.test(payload)) {
        results.passed = false;
        results.errors.push('Payload fails Universal Language Contract: No Devanagari/Hindi text detected.');
    }

    if (results.errors.length > 0) {
        results.passed = false;
    }

    return results;
}

// CLI Execution
if (require.main === module) {
    const targetFile = process.argv[2];
    if (!targetFile) {
        console.error('Usage: node slide_deck_prompt_audit.js <path_to_file>');
        process.exit(1);
    }

    console.log('================================================================================');
    console.log(`SLIDE DECK PROMPT DETERMINISTIC AUDITOR`);
    console.log(`Target: ${targetFile}`);
    console.log('================================================================================\n');

    const audit = auditSlideDeckPrompt(path.resolve(targetFile));

    console.log(`Status: ${audit.passed ? '✅ PASSED' : '❌ FAILED'}\n`);
    console.log('Metrics:');
    for (const [k, v] of Object.entries(audit.metrics)) {
        console.log(`  - ${k}: ${v}`);
    }
    console.log('');

    if (audit.errors.length > 0) {
        console.log('Errors:');
        audit.errors.forEach(e => console.log(`  ❌ ${e}`));
        console.log('');
    }

    if (audit.warnings.length > 0) {
        console.log('Warnings:');
        audit.warnings.forEach(w => console.log(`  ⚠️ ${w}`));
        console.log('');
    }

    process.exit(audit.passed ? 0 : 1);
}

module.exports = { auditSlideDeckPrompt };
