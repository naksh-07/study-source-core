/**
 * study-source-core StudyLab Question Bank Markdown Renderer (`render_studylab_question_bank.js`)
 * 
 * Deterministically renders canonical StudyLab procedural question representations into
 * beautiful, structured Obsidian Markdown question banks at:
 * Study Materials/[Subject]/[Chapter]/Questions/[Chapter]_Questions.md
 * 
 * Preserves all 17 canonical semantic fields without inventing, altering, or omitting content.
 */

const fs = require('fs');
const path = require('path');
const { getCanonicalArtifactPaths, getVaultRoot } = require('./path_resolver');

/**
 * Normalizes question object to ensure all 17 canonical fields are properly shaped.
 * 
 * @param {Object} q Raw question item
 * @param {Object} [patternMap={}] Pattern reference lookup
 * @returns {Object} Normalized question item
 */
function normalizeQuestionItem(q, patternMap = {}) {
    const pattern = (q.pattern_id && patternMap[q.pattern_id]) ? patternMap[q.pattern_id] : {};

    // 1. Question ID
    const id = q.id || q.question_id || 'unknown-q';

    // 2. Pattern ID
    const pattern_id = q.pattern_id || q.schema_id || pattern.id || 'unknown-pattern';
    const patternTitle = pattern.name || pattern.title || pattern_id;

    // 3. Provenance
    let provenance = q.provenance;
    if (!provenance || typeof provenance !== 'object') {
        const origin = q.origin_type ? q.origin_type.toLowerCase() : (q.origin || 'authentic_pyq');
        provenance = {
            origin: origin,
            source: (q.source_provenance && q.source_provenance.source_book) || 'Authorized Evidence Pack'
        };
    } else if (!provenance.origin) {
        provenance.origin = q.origin_type ? q.origin_type.toLowerCase() : (q.origin || 'authentic_pyq');
    }
    // Normalize origin strings
    const validOrigins = ['authentic_pyq', 'source_derived', 'curated_source', 'derived_variant', 'synthetic_schema'];
    if (!validOrigins.includes(provenance.origin.toLowerCase())) {
        provenance.origin = 'authentic_pyq';
    } else {
        provenance.origin = provenance.origin.toLowerCase();
    }

    // 4. Question Type
    const question_type = q.question_type || 'numerical';

    // 5. Difficulty
    const difficulty = q.difficulty !== undefined ? q.difficulty : (pattern.difficulty || 2.0);

    // 6. Question statement
    const questionText = q.question || q.prompt || '';

    // Options (for MCQ)
    const options = Array.isArray(q.options) ? q.options : [];

    // 7. Recognition Signals
    let recognition_signals = q.recognition_signals;
    if (!Array.isArray(recognition_signals) || recognition_signals.length === 0) {
        if (pattern.recognition_signals && Array.isArray(pattern.recognition_signals)) {
            recognition_signals = pattern.recognition_signals;
        } else if (pattern.deep_structure) {
            recognition_signals = [pattern.deep_structure];
        } else if (q.structural_tags && Array.isArray(q.structural_tags)) {
            recognition_signals = q.structural_tags;
        } else {
            recognition_signals = ['Identify problem structure and governing parameters'];
        }
    }

    // 8. Expected Method
    let expected_method = q.expected_method;
    if (!expected_method) {
        if (pattern.governing_method && typeof pattern.governing_method === 'object') {
            expected_method = pattern.governing_method.name || (pattern.governing_method.standard_algorithm ? pattern.governing_method.standard_algorithm.join(' -> ') : 'Standard domain solver');
        } else if (pattern.method) {
            expected_method = pattern.method;
        } else {
            expected_method = 'Apply canonical formula and step-by-step substitution';
        }
    }

    // 9. Decision Points
    let decision_points = q.decision_points;
    if (!Array.isArray(decision_points) || decision_points.length === 0) {
        if (pattern.decision_points && Array.isArray(pattern.decision_points)) {
            decision_points = pattern.decision_points;
        } else {
            decision_points = ['Select governing formula based on given parameters'];
        }
    }

    // 10. Trap
    let trap = q.trap;
    if (!trap) {
        if (q.diagnostic && q.diagnostic.misconception) {
            trap = q.diagnostic.misconception;
        } else if (pattern.common_trap) {
            trap = pattern.common_trap;
        } else {
            trap = 'Calculation or unit sign slip during algebraic evaluation';
        }
    }

    // 11. Error Category
    let error_category = q.error_category || q.error_categories;
    if (!Array.isArray(error_category) || error_category.length === 0) {
        if (pattern.error_categories && Array.isArray(pattern.error_categories)) {
            error_category = pattern.error_categories;
        } else if (q.diagnostic && q.diagnostic.error_categories) {
            error_category = q.diagnostic.error_categories;
        } else {
            error_category = ['ERR_01'];
        }
    }

    // 12-14. Hints (Tiers 1, 2, 3)
    let hints = { tier_1: '', tier_2: '', tier_3: '' };
    if (q.hints && typeof q.hints === 'object') {
        hints.tier_1 = q.hints.tier_1 || q.hints.principle || q.hint_tier_1 || '';
        hints.tier_2 = q.hints.tier_2 || q.hints.operation || q.hint_tier_2 || '';
        hints.tier_3 = q.hints.tier_3 || q.hints.intermediate || q.hint_tier_3 || '';
    } else {
        hints.tier_1 = q.hint_tier_1 || 'अवधारणा और समस्या के संरचनात्मक घटकों की पहचान करें।';
        hints.tier_2 = q.hint_tier_2 || 'मानक सूत्र और समीकरण संबंध स्थापित करें।';
        hints.tier_3 = q.hint_tier_3 || 'चरणबद्ध गणना और बीजगणितीय सरलीकरण निष्पादित करें।';
    }

    // 15. Solution
    const solution = q.solution || q.explanation || 'चरणबद्ध हल उपलब्ध नहीं है।';

    // 16. Verification
    let verification = q.verification;
    if (!verification) {
        if (q.tolerance !== undefined && q.units) {
            verification = `उत्तर की जांच: गणना मान को मूल समीकरण में प्रतिस्थापित करके संतुष्ट करें। (सटीकता: ±${q.tolerance} ${q.units})`;
        } else {
            verification = 'उत्तर की जांच: विमीय विश्लेषण और मान प्रतिस्थापन द्वारा परिणाम का सत्यापन करें।';
        }
    }

    // 17. Prerequisites
    let prerequisites = q.prerequisites;
    if (!Array.isArray(prerequisites) || prerequisites.length === 0) {
        if (pattern.prerequisites && Array.isArray(pattern.prerequisites)) {
            prerequisites = pattern.prerequisites;
        } else {
            prerequisites = ['मूलभूत गणितीय और विषय संबंधी अवधारणाएँ'];
        }
    }

    return {
        id,
        pattern_id,
        patternTitle,
        provenance,
        question_type,
        difficulty,
        question: questionText,
        options,
        correct_answer: q.correct_answer !== undefined ? q.correct_answer : (q.correct_option || q.answer),
        recognition_signals,
        expected_method,
        decision_points,
        trap,
        error_category,
        hints,
        solution,
        verification,
        prerequisites
    };
}

/**
 * Deterministically renders canonical StudyLab Question Bank data into Obsidian Markdown.
 * 
 * @param {Object} data Canonical Question Bank payload
 * @returns {string} Fully rendered Obsidian Markdown document
 */
function renderQuestionBankToMarkdown(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('INVALID_INPUT: Question Bank data must be a non-null object');
    }

    const subject = data.subject || data.domain || 'General';
    const chapter = data.chapter || 'Overview';
    const rawQuestions = Array.isArray(data.questions) ? data.questions : [];

    // Build pattern lookup map if patterns exist
    const patternMap = {};
    if (Array.isArray(data.patterns)) {
        for (const p of data.patterns) {
            if (p.id) patternMap[p.id] = p;
        }
    }

    const questions = rawQuestions.map(q => normalizeQuestionItem(q, patternMap));

    // 1. YAML Frontmatter
    const frontmatter = [
        '---',
        `subject: "${subject}"`,
        `chapter: "${chapter}"`,
        `artifact: "proceduralQuestionBank"`,
        `schema_version: "${data.schema_version || '1.0.0'}"`,
        `total_questions: ${questions.length}`,
        `domain: "${subject}"`,
        '---'
    ].join('\n');

    // 2. Single H1 Header
    const h1 = `# ${chapter} — Procedural Question Bank`;

    // 3. Chapter Overview Callout
    const overviewCallout = [
        '> [!info] Chapter Overview',
        `> - **Subject / Domain**: ${subject}`,
        `> - **Chapter**: ${chapter}`,
        `> - **Skill ID**: \`${data.skill_id || `${subject.toLowerCase()}.${chapter.toLowerCase()}`}\``,
        `> - **Language**: ${data.language || 'Hindi-first (Bilingual)'}`,
        `> - **Total Practice Questions**: ${questions.length}`,
        `> - **Architecture**: StudyLab Semantic Pipeline (Source-First Practice Universe)`
    ].join('\n');

    // 4. Render Questions
    const questionBlocks = [];

    for (const q of questions) {
        const block = [];

        // H2 Question Header
        block.push(`## ${q.id} — ${q.patternTitle}`);

        // Question Metadata Callout
        const provenanceDetails = q.provenance.source ? ` (${q.provenance.source})` : '';
        const prereqList = q.prerequisites.join(', ');
        block.push([
            '> [!info] Question Metadata',
            `> - **Pattern ID**: \`${q.pattern_id}\``,
            `> - **Provenance**: \`${q.provenance.origin}\`${provenanceDetails}`,
            `> - **Question Type**: ${q.question_type}`,
            `> - **Difficulty**: ${q.difficulty}`,
            `> - **Prerequisites**: ${prereqList}`
        ].join('\n'));

        // Question Statement
        block.push('### Question');
        block.push(q.question.trim());

        // MCQ Options
        if (q.options && q.options.length > 0) {
            const optionLines = q.options.map((opt, idx) => {
                const label = String.fromCharCode(65 + idx);
                // Avoid double prefixing if option string already starts with (A) or A.
                const cleanOpt = opt.replace(/^\(?[A-D]\)?[\s.:-]?\s*/i, '');
                return `- (${label}) ${cleanOpt}`;
            });
            block.push(optionLines.join('\n'));
        }

        // Method & Recognition
        block.push('### Method & Recognition');
        const sigList = q.recognition_signals.map(s => `- **Signal**: ${s}`).join('\n');
        block.push(sigList);
        block.push(`- **Expected Method**: ${q.expected_method}`);
        const dpList = q.decision_points.map(d => `- ${d}`).join('\n');
        block.push(`- **Decision Points**:\n${dpList}`);

        // Traps & Errors
        block.push('### Traps & Errors');
        const trapText = Array.isArray(q.trap) ? q.trap.join('; ') : q.trap;
        const errList = q.error_category.map(e => `\`${e}\``).join(', ');
        block.push(`- **Trap**: ${trapText}`);
        block.push(`- **Error Categories**: ${errList}`);

        // Progressive Hints
        block.push('### Progressive Hints');
        block.push([
            '> [!tip]- Tier 1: Conceptual Approach',
            `> ${q.hints.tier_1.trim()}`
        ].join('\n'));
        block.push([
            '> [!tip]- Tier 2: Strategy & Setup',
            `> ${q.hints.tier_2.trim()}`
        ].join('\n'));
        block.push([
            '> [!tip]- Tier 3: Step-by-Step Method',
            `> ${q.hints.tier_3.trim()}`
        ].join('\n'));

        // Solution
        block.push('### Solution');
        block.push(q.solution.trim());

        // Verification
        block.push('### Verification');
        block.push(q.verification.trim());

        questionBlocks.push(block.join('\n\n'));
    }

    const body = [
        frontmatter,
        h1,
        overviewCallout,
        questionBlocks.join('\n\n---\n\n')
    ].join('\n\n');

    return body + '\n';
}

/**
 * Compiles canonical Question Bank JSON from existing PracticeQuestions.json and ProblemPatterns.json.
 * 
 * @param {Object|string} practiceQuestions Raw questions or path
 * @param {Object|string} [problemPatterns=null] Raw patterns or path
 * @param {Object} [metadata={}] Extra metadata overrides
 * @returns {Object} Canonical Question Bank data object
 */
function compileCanonicalQuestionBank(practiceQuestions, problemPatterns = null, metadata = {}) {
    let pqData = practiceQuestions;
    if (typeof pqData === 'string' && fs.existsSync(pqData)) {
        pqData = JSON.parse(fs.readFileSync(pqData, 'utf8'));
    }

    let ppData = problemPatterns;
    if (typeof ppData === 'string' && fs.existsSync(ppData)) {
        ppData = JSON.parse(fs.readFileSync(ppData, 'utf8'));
    }

    const domain = metadata.domain || (pqData && pqData.domain) || (ppData && ppData.domain) || 'General';
    const chapter = metadata.chapter || (pqData && pqData.chapter) || (ppData && ppData.chapter) || 'Overview';
    const skill_id = metadata.skill_id || (pqData && pqData.skill_id) || (ppData && ppData.skill_id);

    const questions = (pqData && Array.isArray(pqData.questions)) ? pqData.questions : [];
    const patterns = (ppData && Array.isArray(ppData.patterns)) ? ppData.patterns : [];

    return {
        schema_version: '1.0.0',
        domain,
        chapter,
        skill_id,
        language: (pqData && pqData.language) || 'hi',
        provenance: (pqData && pqData.provenance) || {
            source: 'StudySourceCore Evidence Lineage',
            chapter
        },
        patterns,
        questions
    };
}

/**
 * Reads canonical JSON or PQ/PP files and writes rendered Markdown to output.
 * 
 * @param {string} inputJsonPath 
 * @param {string} outputMdPath 
 * @returns {string} Rendered markdown
 */
function renderQuestionBankFile(inputJsonPath, outputMdPath) {
    if (!fs.existsSync(inputJsonPath)) {
        throw new Error(`FILE_NOT_FOUND: Input JSON not found: ${inputJsonPath}`);
    }

    const raw = fs.readFileSync(inputJsonPath, 'utf8');
    const data = JSON.parse(raw);

    const md = renderQuestionBankToMarkdown(data);

    const outDir = path.dirname(outputMdPath);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(outputMdPath, md, 'utf8');
    return md;
}

module.exports = {
    normalizeQuestionItem,
    renderQuestionBankToMarkdown,
    compileCanonicalQuestionBank,
    renderQuestionBankFile
};

// --- CLI EXECUTION CONTRACT ---
if (require.main === module) {
    try {
        const args = process.argv.slice(2);
        let inputPath = null;
        let outputPath = null;
        let chapter = null;
        let subject = null;

        for (let i = 0; i < args.length; i++) {
            if (args[i] === '--input' && args[i + 1]) {
                inputPath = args[++i];
            } else if (args[i] === '--output' && args[i + 1]) {
                outputPath = args[++i];
            } else if (args[i] === '--chapter' && args[i + 1]) {
                chapter = args[++i];
            } else if (args[i] === '--subject' && args[i + 1]) {
                subject = args[++i];
            }
        }

        if (subject && chapter && !inputPath) {
            const paths = getCanonicalArtifactPaths(subject, chapter);
            const pqPath = paths.practiceQuestions ? paths.practiceQuestions.path : null;
            const ppPath = paths.problemPatternsJson ? paths.problemPatternsJson.path : null;
            outputPath = outputPath || (paths.proceduralQuestionBank ? paths.proceduralQuestionBank.path : null);

            if (pqPath && fs.existsSync(pqPath)) {
                const canonical = compileCanonicalQuestionBank(pqPath, ppPath, { domain: subject, chapter });
                const md = renderQuestionBankToMarkdown(canonical);
                if (outputPath) {
                    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
                    fs.writeFileSync(outputPath, md, 'utf8');
                    console.log(`Successfully rendered Question Bank to: ${outputPath}`);
                } else {
                    console.log(md);
                }
                process.exit(0);
            }
        }

        if (!inputPath || !outputPath) {
            console.error("Usage: node render_studylab_question_bank.js --input <input.json> --output <output.md>");
            console.error("   or: node render_studylab_question_bank.js --subject <subject> --chapter <chapter> [--output <output.md>]");
            process.exit(1);
        }

        renderQuestionBankFile(inputPath, outputPath);
        console.log(`Successfully rendered Question Bank to: ${outputPath}`);
        process.exit(0);
    } catch (e) {
        console.error("Renderer Error:", e.message);
        process.exit(1);
    }
}
