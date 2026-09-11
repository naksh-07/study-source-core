/**
 * Generates an authorized Evidence Pack markdown file and provenance metadata
 * from a raw Math source fixture.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function computeSha256(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function generateMathEvidencePack(fixtureOrPath, outputDir = null) {
    let fixture = fixtureOrPath;
    if (typeof fixture === 'string') {
        fixture = JSON.parse(fs.readFileSync(fixture, 'utf8'));
    }

    const lines = [];
    lines.push('# Evidence Pack: ' + fixture.chapter + ' (' + (fixture.domain || fixture.subject) + ')');
    lines.push('');
    lines.push('## 1. Chapter Metadata & Provenance');
    lines.push('- Chapter: ' + fixture.chapter);
    lines.push('- Subject: ' + fixture.subject);
    lines.push('- Domain: ' + (fixture.domain || 'Mathematics'));
    lines.push('- Topic: ' + (fixture.topic || 'Number System'));
    lines.push('- Skill ID: ' + (fixture.skill_id || 'math.number_system.lcm_hcf'));
    if (fixture.source_provenance) {
        lines.push('- Source Title: ' + fixture.source_provenance.source_title);
        lines.push('- Edition: ' + fixture.source_provenance.edition);
        lines.push('- Exam Corpus: ' + (fixture.source_provenance.exam_corpus || []).join(', '));
    }
    lines.push('');

    lines.push('## 2. Core Concepts & Definitions');
    for (const c of (fixture.concepts || [])) {
        lines.push('### ' + c.name);
        lines.push('- Definition: ' + c.definition);
        if (c.hcf_rule) lines.push('- HCF Rule: ' + c.hcf_rule);
        if (c.lcm_rule) lines.push('- LCM Rule: ' + c.lcm_rule);
        lines.push('');
    }

    lines.push('## 3. Master Formulas & Governing Identities');
    for (const f of (fixture.master_formulas || [])) {
        lines.push('### ' + f.name);
        lines.push('- Formula: $' + f.formula + '$');
        lines.push('- Scope: ' + f.scope);
        lines.push('');
    }

    lines.push('## 4. Problem Pattern Archetypes');
    for (const p of (fixture.problem_patterns || [])) {
        lines.push('### Pattern: ' + p.title + ' (' + p.pattern_id + ')');
        lines.push('- Family ID: ' + p.family_id);
        lines.push('- Deep Structure: ' + p.deep_structure);
        lines.push('- Governing Method: ' + p.governing_method);
        if (p.decision_points) {
            lines.push('- Decision Points:');
            for (const dp of p.decision_points) lines.push('  - ' + dp);
        }
        if (p.common_traps) {
            lines.push('- Common Traps:');
            for (const trap of p.common_traps) lines.push('  - ' + trap);
        }
        if (p.error_categories) {
            lines.push('- Error Categories: ' + p.error_categories.join(', '));
        }
        lines.push('');
    }

    lines.push('## 5. Authentic Source Problems & PYQs');
    let qIndex = 1;
    for (const q of (fixture.source_problems || [])) {
        lines.push('### Source Problem ' + qIndex + ' (' + q.source_id + ')');
        lines.push('- Exam: ' + q.exam);
        lines.push('- Pattern Ref: ' + q.pattern_ref);
        lines.push('- Type: ' + q.raw_type);
        lines.push('- Statement: ' + q.statement);
        if (Array.isArray(q.options) && q.options.length > 0) {
            lines.push('- Options:');
            const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
            q.options.forEach((opt, idx) => {
                lines.push('  - (' + labels[idx] + ') ' + opt);
            });
        }
        lines.push('- Correct Answer: ' + q.correct_answer);
        lines.push('- Difficulty: ' + q.difficulty);
        if (q.source_solution_steps) {
            lines.push('- Solution Steps:');
            q.source_solution_steps.forEach((st, idx) => {
                lines.push('  ' + (idx + 1) + '. ' + st);
            });
        }
        if (q.prerequisites) {
            lines.push('- Prerequisites: ' + q.prerequisites.join(', '));
        }
        lines.push('');
        qIndex++;
    }

    const markdownContent = lines.join('\n');
    const evidenceHash = computeSha256(markdownContent);

    const provenanceMetadata = {
        source_name: fixture.source_provenance ? fixture.source_provenance.source_title : 'Math Source Fixture',
        source_hash_sha256: computeSha256(JSON.stringify(fixture)),
        evidence_hash_sha256: evidenceHash,
        extracted_timestamp: new Date().toISOString(),
        total_characters: markdownContent.length,
        detected_subject: fixture.subject || 'Math',
        chapter_title: fixture.chapter || 'LCM-HCF'
    };

    if (outputDir) {
        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(path.join(outputDir, 'evidence-pack.md'), markdownContent, 'utf8');
        fs.writeFileSync(path.join(outputDir, 'provenance.json'), JSON.stringify(provenanceMetadata, null, 2), 'utf8');
    }

    return {
        markdownContent,
        evidenceHash,
        provenanceMetadata,
        fixture
    };
}

module.exports = {
    generateMathEvidencePack,
    computeSha256
};
