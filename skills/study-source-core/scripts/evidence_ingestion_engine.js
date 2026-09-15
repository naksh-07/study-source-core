/**
 * StudySourceCore Evidence Pack Ingestion Engine (`evidence_ingestion_engine.js`)
 * 
 * Hardens the Source -> Evidence Pack boundary.
 * 
 * Flow:
 *   RAW SOURCE (PDF / Textbook / Markdown / JSON)
 *     ↓
 *   INGEST (Single Read Invariant)
 *     ↓
 *   NORMALIZE (Fail-closed on corrupt/empty data; no silent repairs)
 *     ↓
 *   CHUNK / SEGMENT (Deterministic segmentation with physical coordinates)
 *     ↓
 *   CANONICAL EVIDENCE PACK (Structured object + scratch/evidence-pack.md)
 *     ↓
 *   SOURCE REFERENCES & CRYPTOGRAPHIC PROVENANCE (SHA-256 fingerprinting)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { computeSha256 } = require('./content_lineage_record');

/**
 * Normalizes raw input string: ensures LF line endings, strips BOM.
 * Throws FAIL_CLOSED errors on empty or unparseable input.
 */
function normalizeSourceText(rawInput) {
    if (rawInput === undefined || rawInput === null) {
        throw new Error('SOURCE_INGESTION_ERROR: Raw source input cannot be null or undefined');
    }

    let text = typeof rawInput === 'string' ? rawInput : rawInput.toString('utf8');
    
    // Strip UTF-8 Byte Order Mark if present
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }

    // Normalize Windows CRLF to standard LF
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    if (text.trim().length === 0) {
        throw new Error('EMPTY_SOURCE_ERROR: Raw source contains zero readable content');
    }

    return text;
}

/**
 * Segments normalized source text into addressable chunks with physical coordinates.
 */
function segmentSourceIntoChunks(sourceText, sourceId, options = {}) {
    const lines = sourceText.split('\n');
    const chunks = [];
    let currentSection = 'Introduction';
    let currentLines = [];
    let currentLineStart = 1;
    let paragraphIndex = 1;
    let chunkIndex = 0;

    function flushCurrentChunk(type = 'prose') {
        if (currentLines.length === 0) return;
        const chunkContent = currentLines.join('\n').trim();
        if (chunkContent.length > 0) {
            const lineEnd = currentLineStart + currentLines.length - 1;
            const chunkHash = computeSha256(chunkContent);
            const chunkId = `chk.${sourceId.replace(/[^a-zA-Z0-9_-]/g, '_')}.${chunkIndex.toString().padStart(3, '0')}.${chunkHash.substring(0, 8)}`;

            chunks.push({
                chunk_id: chunkId,
                chunk_index: chunkIndex,
                chunk_type: type,
                coordinates: {
                    page_start: options.page_start || null,
                    page_end: options.page_end || null,
                    section: currentSection,
                    paragraph: paragraphIndex,
                    line_start: currentLineStart,
                    line_end: lineEnd
                },
                content: chunkContent,
                chunk_hash: chunkHash
            });

            chunkIndex++;
            paragraphIndex++;
        }
        currentLines = [];
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Check for major heading boundary (# or ##)
        const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
        if (headingMatch) {
            flushCurrentChunk();
            currentSection = headingMatch[1].trim();
            currentLineStart = lineNum;
            currentLines.push(line);
            continue;
        }

        // Empty line indicates paragraph boundary
        if (line.trim() === '') {
            if (currentLines.length > 0) {
                flushCurrentChunk();
                currentLineStart = lineNum + 1;
            }
            continue;
        }

        if (currentLines.length === 0) {
            currentLineStart = lineNum;
        }
        currentLines.push(line);
    }

    flushCurrentChunk();

    if (chunks.length === 0) {
        throw new Error('CHUNKING_ERROR: Source text produced zero valid chunks');
    }

    return chunks;
}

/**
 * Segments structured fixture object into fine-grained entity chunks.
 */
function segmentFixtureIntoChunks(fixture, sourceId, options = {}) {
    const chunks = [];
    let chunkIndex = 0;

    function addChunk(type, section, content, page = null) {
        const str = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        const chunkHash = computeSha256(str);
        const chunkId = `chk.${sourceId.replace(/[^a-zA-Z0-9_-]/g, '_')}.${chunkIndex.toString().padStart(3, '0')}.${chunkHash.substring(0, 8)}`;

        chunks.push({
            chunk_id: chunkId,
            chunk_index: chunkIndex,
            chunk_type: type,
            coordinates: {
                page_start: page || options.page_start || null,
                page_end: page || options.page_end || null,
                section: section || 'General',
                paragraph: chunkIndex + 1,
                line_start: null,
                line_end: null
            },
            content: str,
            chunk_hash: chunkHash
        });
        chunkIndex++;
    }

    // 1. Metadata chunk
    addChunk('metadata', 'Metadata', {
        chapter: fixture.chapter,
        subject: fixture.subject,
        domain: fixture.domain,
        topic: fixture.topic,
        source_provenance: fixture.source_provenance
    });

    // 2. Concepts chunks
    if (Array.isArray(fixture.concepts)) {
        for (const c of fixture.concepts) {
            addChunk('concept', `Concepts::${c.name || 'Concept'}`, c, c.page);
        }
    }

    // 3. Formulas chunks
    const formulaList = fixture.master_formulas || fixture.formulas;
    if (Array.isArray(formulaList)) {
        for (const f of formulaList) {
            addChunk('formula', `Formulas::${f.name || 'Formula'}`, f, f.page);
        }
    }

    // 4. Problem Patterns chunks
    if (Array.isArray(fixture.problem_patterns)) {
        for (const p of fixture.problem_patterns) {
            addChunk('pattern', `Patterns::${p.title || p.pattern_id || 'Pattern'}`, p);
        }
    }

    // 5. Practice Problems chunks
    const problems = fixture.practice_problems || fixture.practice_questions || fixture.questions;
    if (Array.isArray(problems)) {
        for (const prob of problems) {
            addChunk('problem', `Problems::${prob.id || 'Problem'}`, prob, prob.page);
        }
    }

    // 6. Visual Assets chunks
    const visuals = fixture.visual_assets || fixture.diagrams;
    if (Array.isArray(visuals)) {
        for (const v of visuals) {
            addChunk('visual', `Visual::${v.id || 'Diagram'}`, v, v.page);
        }
    }

    return chunks;
}

/**
 * Parses and ingests raw source from file or object into a Canonical Evidence Pack.
 */
function ingestSourceToEvidencePack(sourceInput, options = {}) {
    let rawSourceContent = '';
    let sourceId = options.source_id || 'src.study.generic';
    let subject = options.subject || 'General';
    let chapter = options.chapter || 'Overview';
    let sourceFixture = null;

    if (typeof sourceInput === 'string') {
        if (fs.existsSync(sourceInput) && fs.statSync(sourceInput).isFile()) {
            const fileExt = path.extname(sourceInput).toLowerCase();
            const fileRaw = fs.readFileSync(sourceInput, 'utf8');

            if (fileExt === '.json') {
                try {
                    sourceFixture = JSON.parse(fileRaw);
                    rawSourceContent = fileRaw;
                    sourceId = sourceFixture.source_id || options.source_id || path.basename(sourceInput, '.json');
                    subject = sourceFixture.subject || options.subject || subject;
                    chapter = sourceFixture.chapter || options.chapter || chapter;
                } catch (e) {
                    throw new Error(`MALFORMED_SOURCE_JSON: Failed to parse JSON source at ${sourceInput}: ${e.message}`);
                }
            } else {
                rawSourceContent = fileRaw;
                sourceId = options.source_id || path.basename(sourceInput, fileExt);
            }
        } else {
            // Source input passed as raw string
            rawSourceContent = sourceInput;
        }
    } else if (typeof sourceInput === 'object' && sourceInput !== null) {
        sourceFixture = sourceInput;
        rawSourceContent = JSON.stringify(sourceInput, null, 2);
        sourceId = sourceFixture.source_id || options.source_id || 'src.fixture.in_memory';
        subject = sourceFixture.subject || options.subject || subject;
        chapter = sourceFixture.chapter || options.chapter || chapter;
    } else {
        throw new Error('UNSUPPORTED_SOURCE_INPUT: Source input must be a file path, string, or source object');
    }

    // 1. Normalize Source Text
    const normalizedText = normalizeSourceText(rawSourceContent);
    const sourceHash = computeSha256(normalizedText);

    // 2. Chunk Source (use structured segmentation if fixture, else text segmentation)
    let chunks;
    if (sourceFixture && (sourceFixture.concepts || sourceFixture.master_formulas || sourceFixture.problem_patterns || sourceFixture.practice_problems || sourceFixture.practice_questions)) {
        chunks = segmentFixtureIntoChunks(sourceFixture, sourceId, options);
    } else {
        chunks = segmentSourceIntoChunks(normalizedText, sourceId, options);
    }

    // 3. Extract Structured Entities if source was a structured fixture
    const concepts = [];
    const formulas = [];
    const problemPatterns = [];
    const practiceProblems = [];
    const visualAssets = [];

    if (sourceFixture) {
        if (Array.isArray(sourceFixture.concepts)) {
            concepts.push(...sourceFixture.concepts);
        }
        if (Array.isArray(sourceFixture.master_formulas || sourceFixture.formulas)) {
            formulas.push(...(sourceFixture.master_formulas || sourceFixture.formulas));
        }
        if (Array.isArray(sourceFixture.problem_patterns)) {
            problemPatterns.push(...sourceFixture.problem_patterns);
        }
        if (Array.isArray(sourceFixture.practice_problems || sourceFixture.practice_questions || sourceFixture.questions)) {
            practiceProblems.push(...(sourceFixture.practice_problems || sourceFixture.practice_questions || sourceFixture.questions));
        }
        if (Array.isArray(sourceFixture.visual_assets || sourceFixture.diagrams)) {
            visualAssets.push(...(sourceFixture.visual_assets || sourceFixture.diagrams));
        }
    }

    const evidencePackId = `evp.${subject.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.${chapter.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.v1`;

    // 4. Render Canonical Evidence Pack Markdown
    const mdLines = [];
    mdLines.push(`# Canonical Evidence Pack: ${chapter} (${subject})`);
    mdLines.push('');
    mdLines.push('## 1. Chapter Metadata & Provenance');
    mdLines.push(`- **Evidence Pack ID**: ${evidencePackId}`);
    mdLines.push(`- **Source ID**: ${sourceId}`);
    mdLines.push(`- **Source SHA-256**: \`${sourceHash}\``);
    mdLines.push(`- **Subject**: ${subject}`);
    mdLines.push(`- **Chapter**: ${chapter}`);
    mdLines.push(`- **Extracted Chunks**: ${chunks.length}`);
    mdLines.push(`- **Generated Timestamp**: ${new Date().toISOString()}`);
    mdLines.push('');

    mdLines.push('## 2. Granular Source Chunks Registry');
    for (const chk of chunks) {
        mdLines.push(`### Chunk [${chk.chunk_id}]`);
        mdLines.push(`- **Section**: "${chk.coordinates.section}"`);
        if (chk.coordinates.paragraph) mdLines.push(`- **Paragraph**: ${chk.coordinates.paragraph}`);
        if (chk.coordinates.line_start) mdLines.push(`- **Lines**: ${chk.coordinates.line_start}-${chk.coordinates.line_end}`);
        mdLines.push(`- **SHA-256**: \`${chk.chunk_hash}\``);
        mdLines.push('');
        mdLines.push('```text');
        mdLines.push(chk.content);
        mdLines.push('```');
        mdLines.push('');
    }

    if (concepts.length > 0) {
        mdLines.push('## 3. Extracted Concepts');
        for (const c of concepts) {
            mdLines.push(`### ${c.name || c.title || 'Concept'}`);
            mdLines.push(`- Definition: ${c.definition || ''}`);
            if (c.rule) mdLines.push(`- Rule: ${c.rule}`);
            mdLines.push('');
        }
    }

    if (formulas.length > 0) {
        mdLines.push('## 4. Master Formulas');
        for (const f of formulas) {
            mdLines.push(`### ${f.name || 'Formula'}`);
            mdLines.push(`- Formula: $${f.formula || f.latex || ''}$`);
            if (f.scope) mdLines.push(`- Scope: ${f.scope}`);
            mdLines.push('');
        }
    }

    if (practiceProblems.length > 0) {
        mdLines.push('## 5. Authentic Source Problems');
        for (const p of practiceProblems) {
            mdLines.push(`### Problem: ${p.id || 'Item'}`);
            mdLines.push(`- Stem: ${p.question_text || p.stem || ''}`);
            if (p.answer) mdLines.push(`- Answer: ${p.answer}`);
            mdLines.push('');
        }
    }

    const markdownText = mdLines.join('\n');
    const evidenceHash = computeSha256(markdownText);

    const evidencePack = {
        evidence_pack_id: evidencePackId,
        evidence_hash: evidenceHash,
        source_id: sourceId,
        source_hash: sourceHash,
        subject,
        chapter,
        chunks,
        concepts,
        formulas,
        problem_patterns: problemPatterns,
        practice_problems: practiceProblems,
        visual_assets: visualAssets,
        markdown: markdownText,
        created_at: new Date().toISOString()
    };

    return evidencePack;
}

/**
 * Writes the canonical Evidence Pack markdown and provenance lock file to a target scratch directory.
 */
function persistEvidencePack(evidencePack, scratchDir) {
    if (!fs.existsSync(scratchDir)) {
        fs.mkdirSync(scratchDir, { recursive: true });
    }

    const mdPath = path.join(scratchDir, 'evidence-pack.md');
    fs.writeFileSync(mdPath, evidencePack.markdown, 'utf8');

    const provenancePath = path.join(scratchDir, 'provenance.json');
    const provenanceData = {
        evidence_pack_id: evidencePack.evidence_pack_id,
        evidence_hash: evidencePack.evidence_hash,
        source_id: evidencePack.source_id,
        source_hash: evidencePack.source_hash,
        subject: evidencePack.subject,
        chapter: evidencePack.chapter,
        chunk_count: evidencePack.chunks.length,
        timestamp: new Date().toISOString()
    };
    fs.writeFileSync(provenancePath, JSON.stringify(provenanceData, null, 2), 'utf8');

    return {
        markdownPath: mdPath,
        provenancePath: provenancePath
    };
}

module.exports = {
    normalizeSourceText,
    segmentSourceIntoChunks,
    segmentFixtureIntoChunks,
    ingestSourceToEvidencePack,
    persistEvidencePack
};
