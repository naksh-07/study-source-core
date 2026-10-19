/**
 * Shared StudyLab Authoring & Evidence Parser (`shared_studylab_author.js`)
 * 
 * Centralized, DRY parser and normalizer for STEM authoring engines
 * (Math, Physics, Chemistry, Reasoning). Eliminates ~800 lines of duplicate parsing code.
 */

'use strict';

const fs = require('fs');

/**
 * Normalizes raw source fixture data.
 */
function normalizeRawSourceData(data, defaultSubject = 'General', defaultDomain = 'STEM') {
    const chapter = data.chapter || null;
    if (!chapter) {
        throw new Error('MISSING_CHAPTER: Raw source data must contain a valid chapter name');
    }
    const domain = data.domain || defaultDomain;
    const subject = data.subject || defaultSubject;
    const skill_id = data.skill_id || `${subject.toLowerCase()}.${chapter.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

    const patterns = Array.isArray(data.problem_patterns) ? data.problem_patterns : [];
    const rawProblems = (data.source_question_inventory && Array.isArray(data.source_question_inventory.questions))
        ? data.source_question_inventory.questions
        : (Array.isArray(data.source_problems) ? data.source_problems : (Array.isArray(data.practice_problems) ? data.practice_problems : (Array.isArray(data.questions) ? data.questions : [])));

    const sourceProblems = rawProblems.map(p => ({
        source_id: p.source_question_id || p.source_id || p.id,
        source_question_id: p.source_question_id || p.source_id || p.id,
        question_number: p.question_number || null,
        pattern_ref: p.pattern_ref || null,
        raw_type: p.question_type || p.raw_type || (Array.isArray(p.options) && p.options.length > 0 ? 'mcq' : 'numerical'),
        statement: p.question_text || p.statement || p.stem || p.question || p.prompt || '',
        options: Array.isArray(p.options) ? [...p.options] : [],
        correct_answer: p.correct_answer !== undefined ? p.correct_answer : p.answer,
        difficulty: p.difficulty || 2.0,
        exam: (p.provenance && (p.provenance.exam || p.provenance.source)) || p.exam || null,
        recognition_signals: Array.isArray(p.recognition_signals) ? p.recognition_signals : null,
        expected_method: p.expected_method || null,
        decision_points: Array.isArray(p.decision_points) ? p.decision_points : null,
        trap: p.trap || null,
        error_category: p.error_category || p.error_categories || null,
        hints: p.hints || (p.progressive_hints ? p.progressive_hints : null),
        verification: p.verification || null,
        source_solution_steps: Array.isArray(p.solution_steps) ? p.solution_steps : (Array.isArray(p.source_solution_steps) ? p.source_solution_steps : []),
        prerequisites: Array.isArray(p.prerequisites) ? p.prerequisites : []
    }));

    return {
        chapter,
        domain,
        subject,
        skill_id,
        source_title: data.source_provenance ? data.source_provenance.source_title : `${subject} Source Evidence`,
        edition: data.source_provenance ? data.source_provenance.edition : '2024-2025',
        exam_corpus: data.source_provenance ? data.source_provenance.exam_corpus : ['Authentic PYQ'],
        concepts: data.concepts || [],
        master_formulas: data.master_formulas || [],
        problem_patterns: patterns,
        source_problems: sourceProblems
    };
}

/**
 * Parses markdown-formatted evidence pack text into structured domain entities.
 */
function parseMarkdownEvidencePackText(text, defaultSubject = 'General', defaultDomain = 'STEM') {
    const lines = text.split(/\r?\n/);
    let chapter = null;
    let subject = defaultSubject;
    let domain = defaultDomain;
    let skill_id = null;
    let source_title = `${defaultSubject} Source Evidence`;
    let exam_corpus = ['Authentic PYQ'];

    const patterns = [];
    const sourceProblems = [];

    let currentSection = null;
    let currentItem = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('# Evidence Pack:') || line.startsWith('# Canonical Evidence Pack:')) {
            const m = line.match(/# (?:Canonical )?Evidence Pack:\s*([^(]+)(?:\(([^)]+)\))?/);
            if (m) {
                chapter = m[1].trim();
                if (m[2]) domain = m[2].trim();
            }
        } else if (line.startsWith('## 1. Chapter Metadata')) {
            currentSection = 'METADATA';
        } else if (line.startsWith('## 2. Core Concepts') || line.startsWith('## 2. Granular Source Chunks Registry')) {
            currentSection = 'CONCEPTS';
        } else if (line.startsWith('## 3. Master Formulas') || line.startsWith('## 3. Extracted Concepts')) {
            currentSection = 'FORMULAS';
        } else if (line.startsWith('## 4. Problem Pattern') || line.startsWith('## 4. Master Formulas')) {
            currentSection = 'PATTERNS';
        } else if (line.startsWith('## 5. Authentic Source Problems')) {
            currentSection = 'PROBLEMS';
        } else if (line.startsWith('### Pattern:') && currentSection === 'PATTERNS') {
            const m = line.match(/### Pattern:\s*(.+?)\s*\(([^()]+)\)$/);
            if (m) {
                currentItem = {
                    pattern_id: m[2].trim(),
                    title: m[1].trim(),
                    decision_points: [],
                    common_traps: [],
                    error_categories: []
                };
                patterns.push(currentItem);
            }
        } else if (line.startsWith('### Source Problem') && currentSection === 'PROBLEMS') {
            const m = line.match(/### Source Problem\s*\d*\s*\(([^)]+)\)/);
            currentItem = {
                source_id: m ? m[1].trim() : `${subject.toLowerCase()}-pyq-${sourceProblems.length + 1}`,
                source_question_id: m ? m[1].trim() : null,
                options: [],
                source_solution_steps: [],
                prerequisites: [],
                hints: null,
                _readingStatement: false,
                _readingSteps: false,
                _readingHints: false
            };
            sourceProblems.push(currentItem);
        } else if (currentItem && currentSection === 'PATTERNS') {
            if (line.startsWith('- Family ID:')) currentItem.family_id = line.substring(12).trim();
            else if (line.startsWith('- Deep Structure:')) currentItem.deep_structure = line.substring(17).trim();
            else if (line.startsWith('- Governing Method:')) currentItem.governing_method = line.substring(19).trim();
            else if (line.startsWith('- Error Categories:')) {
                currentItem.error_categories = line.substring(19).split(',').map(s => s.trim()).filter(Boolean);
            } else if (line.startsWith('- Common Traps:')) {
                currentItem._readingTraps = true;
                currentItem._readingDP = false;
            } else if (line.startsWith('- Decision Points:')) {
                currentItem._readingDP = true;
                currentItem._readingTraps = false;
            } else if (line.startsWith('- ') && currentItem._readingTraps) {
                currentItem.common_traps.push(line.substring(2).trim());
            } else if (line.startsWith('- ') && currentItem._readingDP) {
                currentItem.decision_points.push(line.substring(2).trim());
            }
        } else if (currentItem && currentSection === 'PROBLEMS') {
            if (line.startsWith('- Source Question ID:')) {
                currentItem._readingStatement = false;
                currentItem._readingHints = false;
                currentItem.source_question_id = line.substring(21).trim();
                currentItem.source_id = currentItem.source_question_id;
            } else if (line.startsWith('- Question Number:')) {
                currentItem._readingStatement = false;
                currentItem._readingHints = false;
                currentItem.question_number = line.substring(18).trim();
            } else if (line.startsWith('- Exam:')) {
                currentItem._readingStatement = false;
                currentItem._readingHints = false;
                currentItem.exam = line.substring(7).trim();
            } else if (line.startsWith('- Pattern Ref:')) {
                currentItem._readingStatement = false;
                currentItem._readingHints = false;
                currentItem.pattern_ref = line.substring(14).trim();
            } else if (line.startsWith('- Type:')) {
                currentItem._readingStatement = false;
                currentItem._readingHints = false;
                currentItem.raw_type = line.substring(7).trim().toLowerCase();
            } else if (line.startsWith('- Statement:')) {
                currentItem.statement = line.substring(12).trim();
                currentItem._readingStatement = true;
                currentItem._readingHints = false;
            } else if (line.startsWith('- Options:')) {
                currentItem._readingStatement = false;
                currentItem._readingHints = false;
            } else if (line.startsWith('- Correct Answer:')) {
                currentItem._readingStatement = false;
                currentItem._readingHints = false;
                currentItem.correct_answer = line.substring(17).trim();
            } else if (line.startsWith('- Difficulty:')) {
                currentItem._readingStatement = false;
                currentItem._readingHints = false;
                currentItem.difficulty = parseFloat(line.substring(13).trim()) || 2.0;
            } else if (line.startsWith('- Solution Steps:')) {
                currentItem._readingStatement = false;
                currentItem._readingHints = false;
                currentItem._readingSteps = true;
            } else if (line.startsWith('- Prerequisites:')) {
                currentItem._readingStatement = false;
                currentItem._readingHints = false;
                currentItem.prerequisites = line.substring(16).split(',').map(s => s.trim()).filter(Boolean);
            } else if (line.startsWith('- Hints:')) {
                currentItem._readingStatement = false;
                currentItem._readingSteps = false;
                currentItem._readingHints = true;
                currentItem.hints = currentItem.hints || {};
            } else if (currentItem._readingHints && (line.startsWith('- Tier 1:') || line.startsWith('Tier 1:'))) {
                currentItem.hints.tier1_conceptual = line.replace(/^(?:-\s*)?Tier\s*1:\s*/i, '').trim();
                currentItem.hints.tier1_approach = currentItem.hints.tier1_conceptual;
            } else if (currentItem._readingHints && (line.startsWith('- Tier 2:') || line.startsWith('Tier 2:'))) {
                currentItem.hints.tier2_strategic = line.replace(/^(?:-\s*)?Tier\s*2:\s*/i, '').trim();
                currentItem.hints.tier2_formula = currentItem.hints.tier2_strategic;
            } else if (currentItem._readingHints && (line.startsWith('- Tier 3:') || line.startsWith('Tier 3:'))) {
                currentItem.hints.tier3_next_step = line.replace(/^(?:-\s*)?Tier\s*3:\s*/i, '').trim();
                currentItem.hints.tier3_setup = currentItem.hints.tier3_next_step;
            } else if (/^[\s-]*\([A-Za-z0-9]+\)\s*/.test(line)) {
                currentItem._readingStatement = false;
                currentItem._readingHints = false;
                const optText = line.replace(/^[\s-]*\([A-Za-z0-9]+\)\s*/, '').trim();
                currentItem.options.push(optText);
            } else if (currentItem._readingSteps && /^\d+\.\s*/.test(line)) {
                currentItem.source_solution_steps.push(line.replace(/^\d+\.\s*/, '').trim());
            } else if (currentItem._readingStatement && !line.startsWith('- ') && !line.startsWith('### ') && !line.startsWith('## ')) {
                currentItem.statement += '\n' + lines[i];
            }
        } else if (currentSection === 'METADATA') {
            if (line.startsWith('- Chapter:')) chapter = line.substring(10).trim();
            else if (line.startsWith('- Subject:')) subject = line.substring(10).trim();
            else if (line.startsWith('- Domain:')) domain = line.substring(9).trim();
            else if (line.startsWith('- Skill ID:')) skill_id = line.substring(11).trim();
            else if (line.startsWith('- Source Title:')) source_title = line.substring(15).trim();
            else if (line.startsWith('- Exam Corpus:')) exam_corpus = line.substring(14).split(',').map(s => s.trim()).filter(Boolean);
        }
    }

    if (!chapter) {
        throw new Error('MISSING_CHAPTER: Evidence pack text does not declare a chapter title');
    }
    if (!skill_id) {
        skill_id = `${subject.toLowerCase()}.${chapter.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    }

    return {
        chapter,
        subject,
        domain,
        skill_id,
        source_title,
        edition: '2024-2025',
        exam_corpus,
        concepts: [],
        master_formulas: [],
        problem_patterns: patterns,
        source_problems: sourceProblems
    };
}

/**
 * Universal evidence parser for STEM authoring engines.
 */
function parseEvidenceInput(evidenceInput, defaultSubject = 'General', defaultDomain = 'STEM') {
    if (!evidenceInput) {
        throw new Error('MISSING_EVIDENCE_INPUT: Evidence pack or source fixture must be provided');
    }

    if (typeof evidenceInput === 'object' && evidenceInput !== null) {
        return normalizeRawSourceData(evidenceInput, defaultSubject, defaultDomain);
    }

    if (typeof evidenceInput === 'string' && fs.existsSync(evidenceInput) && evidenceInput.endsWith('.json')) {
        const raw = fs.readFileSync(evidenceInput, 'utf8');
        return normalizeRawSourceData(JSON.parse(raw), defaultSubject, defaultDomain);
    }

    if (typeof evidenceInput === 'string' && fs.existsSync(evidenceInput)) {
        const text = fs.readFileSync(evidenceInput, 'utf8');
        return parseMarkdownEvidencePackText(text, defaultSubject, defaultDomain);
    }

    if (typeof evidenceInput === 'string') {
        const trimmed = evidenceInput.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                return normalizeRawSourceData(parsed, defaultSubject, defaultDomain);
            } catch (e) {
                throw new Error(`MALFORMED_JSON_EVIDENCE: Input appears to be JSON but failed to parse: ${e.message}`);
            }
        }
        return parseMarkdownEvidencePackText(evidenceInput, defaultSubject, defaultDomain);
    }

    throw new Error(`UNSUPPORTED_EVIDENCE_FORMAT: Could not parse ${defaultSubject} evidence input`);
}

module.exports = {
    parseEvidenceInput,
    normalizeRawSourceData,
    parseMarkdownEvidencePackText
};
