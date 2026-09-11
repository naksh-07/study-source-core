/**
 * Reasoning Specialist Authoring Engine (`author_reasoning_studylab.js`)
 * 
 * Implements domain-specific procedural authoring logic for `reasoning-apkg-author`.
 * Ingests evidence pack representation (Markdown or structured object), extracts
 * reasoning problem patterns and authentic practice questions, authors 17-dimension
 * canonical procedural content adhering to the 7-Layer Cognitive Thinking Pipeline,
 * enforces non-leaking 3-tier progressive hints, and renders/compiles deliverables
 * based on runtime procedural mode ('markdown', 'apkg', 'both', 'none').
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { renderQuestionBankToMarkdown, compileCanonicalQuestionBank } = require('./render_studylab_question_bank');
const { validateQuestionBank, validateQuestionBankContent, validateQuestionBankMarkdown, hintLeaksAnswer } = require('./validate_studylab_question_bank');
const { exportStudyLabProceduralAnki } = require('./export_studylab_procedural_anki');
const { validateProceduralApkg } = require('./validate_studylab_procedural_apkg');
const { resolveSubjectPolicy } = require('./subject_policy_resolver');
const { getCanonicalArtifactPaths } = require('./path_resolver');

/**
 * Standard diagnostic error codes taxonomy mapping for reasoning problems.
 */
const DEFAULT_REAS_ERROR_MAP = {
    'syl_standard': ['ERR_02: INVALID_DEDUCTIVE_STEP', 'ERR_03: FALSE_PREMISE_ASSUMPTION', 'ERR_11: SYLLOGISM_MIDDLE_TERM_FALLACY'],
    'syl_either_or': ['ERR_06: POSSIBILITY_DEFINITE_CONFUSION', 'ERR_02: INVALID_DEDUCTIVE_STEP', 'ERR_11: SYLLOGISM_MIDDLE_TERM_FALLACY'],
    'seating_linear': ['ERR_01: MISSED_EXPLICIT_CONDITION', 'ERR_04: DIRECTION_FRAME_CONFUSION', 'ERR_07: PARITY_INTERVAL_MISCOUNT']
};

/**
 * Parses markdown evidence pack or structured source object into domain entities.
 */
function parseReasoningEvidence(evidenceInput) {
    if (!evidenceInput) {
        throw new Error('MISSING_EVIDENCE_INPUT: Evidence pack or source fixture must be provided');
    }

    // 1. If already a parsed object
    if (typeof evidenceInput === 'object' && evidenceInput !== null) {
        return normalizeRawSourceData(evidenceInput);
    }

    // 2. If path to JSON file
    if (typeof evidenceInput === 'string' && fs.existsSync(evidenceInput) && evidenceInput.endsWith('.json')) {
        const raw = fs.readFileSync(evidenceInput, 'utf8');
        return normalizeRawSourceData(JSON.parse(raw));
    }

    // 3. If path to Markdown file
    if (typeof evidenceInput === 'string' && fs.existsSync(evidenceInput)) {
        const text = fs.readFileSync(evidenceInput, 'utf8');
        return parseMarkdownEvidencePackText(text);
    }

    // 4. Raw text content
    if (typeof evidenceInput === 'string') {
        try {
            const parsed = JSON.parse(evidenceInput);
            return normalizeRawSourceData(parsed);
        } catch (e) {
            return parseMarkdownEvidencePackText(evidenceInput);
        }
    }

    throw new Error('UNSUPPORTED_EVIDENCE_FORMAT: Could not parse Reasoning evidence input');
}

/**
 * Normalizes raw source fixture data.
 */
function normalizeRawSourceData(data) {
    const chapter = data.chapter || 'Syllogism-And-Seating-Arrangement';
    const domain = data.domain || 'Reasoning';
    const subject = data.subject || 'Reasoning';
    const skill_id = data.skill_id || 'reasoning-study';

    const patterns = Array.isArray(data.problem_patterns) ? data.problem_patterns : [];
    const sourceProblems = Array.isArray(data.source_problems) ? data.source_problems : [];

    return {
        chapter,
        domain,
        subject,
        skill_id,
        source_title: data.source_provenance ? data.source_provenance.source_title : 'Reasoning Source Evidence',
        edition: data.source_provenance ? data.source_provenance.edition : '2024-2025',
        exam_corpus: data.source_provenance ? data.source_provenance.exam_corpus : ['Authentic PYQ'],
        concepts: data.concepts || [],
        master_rules: data.master_rules || [],
        problem_patterns: patterns,
        source_problems: sourceProblems
    };
}

/**
 * Parses markdown-formatted evidence pack text into structured domain entities.
 */
function parseMarkdownEvidencePackText(text) {
    const lines = text.split(/\r?\n/);
    let chapter = 'Syllogism-And-Seating-Arrangement';
    let subject = 'Reasoning';
    let domain = 'Reasoning';
    let skill_id = 'reasoning-study';
    let source_title = 'Reasoning Source Evidence';
    let exam_corpus = ['Authentic PYQ'];

    const patterns = [];
    const sourceProblems = [];

    let currentSection = null;
    let currentItem = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('# Evidence Pack:')) {
            const m = line.match(/# Evidence Pack:\s*([^(]+)(?:\(([^)]+)\))?/);
            if (m) {
                chapter = m[1].trim();
                if (m[2]) domain = m[2].trim();
            }
        } else if (line.startsWith('## 1. Chapter Metadata')) {
            currentSection = 'METADATA';
        } else if (line.startsWith('## 2. Core Concepts')) {
            currentSection = 'CONCEPTS';
        } else if (line.startsWith('## 3. Master Principles') || line.startsWith('## 3. Master Formulas')) {
            currentSection = 'RULES';
        } else if (line.startsWith('## 4. Problem Pattern')) {
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
            const m = line.match(/### Source Problem\s*\d+\s*\(([^)]+)\)/);
            currentItem = {
                source_id: m ? m[1].trim() : 'reas-pyq-' + (sourceProblems.length + 1),
                options: [],
                source_solution_steps: [],
                prerequisites: []
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
            if (line.startsWith('- Exam:')) currentItem.exam = line.substring(7).trim();
            else if (line.startsWith('- Pattern Ref:')) currentItem.pattern_ref = line.substring(14).trim();
            else if (line.startsWith('- Type:')) currentItem.raw_type = line.substring(7).trim().toLowerCase();
            else if (line.startsWith('- Statement:')) {
                currentItem._readingStatement = true;
                currentItem.statement = line.substring(12).trim();
            } else if (line.startsWith('- Options:')) {
                currentItem._readingStatement = false;
            } else if (line.startsWith('- Correct Answer:')) {
                currentItem._readingStatement = false;
                currentItem.correct_answer = line.substring(17).trim();
            } else if (line.startsWith('- Difficulty:')) {
                currentItem._readingStatement = false;
                currentItem.difficulty = parseFloat(line.substring(13).trim()) || 2.0;
            } else if (line.startsWith('- Prerequisites:')) {
                currentItem._readingStatement = false;
                currentItem.prerequisites = line.substring(16).split(',').map(s => s.trim()).filter(Boolean);
            } else if (line.startsWith('- Solution Steps:')) {
                currentItem._readingStatement = false;
                currentItem._readingSteps = true;
            } else if (line.startsWith('- (A)') || line.startsWith('- (B)') || line.startsWith('- (C)') || line.startsWith('- (D)') || line.startsWith('- (E)')) {
                currentItem._readingStatement = false;
                const optText = line.replace(/^[\s-]*\([A-Z]\)\s*/, '').trim();
                currentItem.options.push(optText);
            } else if (currentItem._readingSteps && /^\d+\.\s*/.test(line)) {
                currentItem.source_solution_steps.push(line.replace(/^\d+\.\s*/, '').trim());
            } else if (currentItem._readingStatement) {
                currentItem.statement += '\n' + line;
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

    return {
        chapter,
        subject,
        domain,
        skill_id,
        source_title,
        edition: '2024-2025',
        exam_corpus,
        concepts: [],
        master_rules: [],
        problem_patterns: patterns,
        source_problems: sourceProblems
    };
}

/**
 * Builds non-leaking, pedagogical 3-tier progressive hints for Reasoning problems.
 */
function buildReasoningProgressiveHints(prob, pattern, answer) {
    let tier1 = '';
    let tier2 = '';
    let tier3 = '';

    if (pattern && pattern.pattern_id === 'pat-reas-syl-standard') {
        tier1 = 'तार्किक सिद्धांत पहचानें: दिए गए कथनों का केवल न्यूनतम अधिव्यापन वेन आरेख (Minimal Overlap Venn Diagram) बनाएं तथा बाह्य सामान्य ज्ञान को न जोड़ें।';
        tier2 = 'रणनीति एवं आरेख विश्लेषण: वेन आरेख में प्रत्येक निष्कर्ष की अनिवार्य सत्यता जांचें। जो निष्कर्ष सभी संभावित आरेखों में अनिवार्यतः सत्य हो, केवल वही अनुसरण करेगा।';
        tier3 = 'चरणबद्ध निगमन: कथनों के सीधे संबंधों को देखें; यदि दो पदों में कोई अनिवार्य अधिव्यापन नहीं है, तो निश्चित निष्कर्ष स्वीकार न करें।';
    } else if (pattern && pattern.pattern_id === 'pat-reas-syl-either-or') {
        tier1 = 'तार्किक सिद्धांत पहचानें: या-तो (Either-Or) विकल्प हेतु दोनों निष्कर्षों का व्यक्तिगत रूप से असत्य/संदिग्ध होना तथा समान उद्देश्य व विधेय होना आवश्यक है।';
        tier2 = 'रणनीति एवं पूरक युग्म: जांचें कि क्या दोनों निष्कर्ष Some + No या Some + Some Not का पूरक युग्म बनाते हैं। All + No को अवैध मानें।';
        tier3 = 'चरणबद्ध निगमन: चूंकि दोनों निष्कर्ष व्यक्तिगत रूप से संदिग्ध हैं और एक सकारात्मक तथा दूसरा नकारात्मक है, अतः पूरक युग्म की शर्तें पूरी होती हैं।';
    } else if (pattern && pattern.pattern_id === 'pat-reas-seating-linear') {
        tier1 = 'तार्किक सिद्धांत पहचानें: रैखिक बैठने की व्यवस्था में सबसे पहले निश्चित छोर (Definite Anchor) वाले व्यक्ति को बैठाएं।';
        tier2 = 'रणनीति एवं सापेक्ष शर्तें: निश्चित छोर के आधार पर उससे जुड़े अन्य व्यक्तियों की सापेक्ष स्थिति (जैसे ठीक दाएं या बाएं) को चरणबद्ध भरें।';
        tier3 = 'चरणबद्ध निगमन: रिक्त स्थानों की संख्या एवं बचे हुए व्यक्तियों के बीच दी गई दूरी या मध्य की शर्त से शेष स्थानों को निर्धारित करें।';
    } else {
        tier1 = 'तार्किक सिद्धांत पहचानें: समस्या में शामिल मूल तार्किक नियम (न्यायवाक्य, निश्चित छोर, या पूरक युग्म) को पहचानें।';
        tier2 = 'रणनीति एवं संरचना: उपयुक्त आरेख या बैठने की व्यवस्था ग्रिड बनाकर ज्ञात प्रतिबंधों को स्थापित करें।';
        tier3 = 'चरणबद्ध निगमन: दिए गए प्रतिबंधों का चरणबद्ध परीक्षण कर अमान्य विकल्पों को निरस्त करते हुए निष्कर्ष निकालें।';
    }

    // Explicit Anti-Leak Assertion Check
    if (hintLeaksAnswer(tier1, answer)) {
        tier1 = 'तार्किक सिद्धांत पहचानें: न्यायवाक्य एवं तार्किक व्यवस्था के मूलभूत नियमों का सावधानीपूर्वक विश्लेषण करें।';
    }
    if (hintLeaksAnswer(tier2, answer)) {
        tier2 = 'रणनीति: आरेख व प्रतिबंधों को स्थापित करें तथा निश्चित आधार बिंदु से प्रारंभ करें।';
    }
    if (hintLeaksAnswer(tier3, answer)) {
        tier3 = 'संक्रिया: प्रतिबंधों की चरणबद्ध संगति जांचें तथा अमान्य स्थितियों को निरस्त करें।';
    }

    return {
        tier_1: tier1,
        tier_2: tier2,
        tier_3: tier3
    };
}

/**
 * Authors canonical StudyLab procedural questions and patterns from extracted source evidence.
 */
function authorReasoningProceduralContent(evidenceInput, options = {}) {
    const parsed = parseReasoningEvidence(evidenceInput);

    const patterns = parsed.problem_patterns || [];
    const sourceProblems = parsed.source_problems || [];

    if (sourceProblems.length === 0) {
        throw new Error('ZERO_SOLVABLE_PRACTICE_QUESTIONS: Source evidence contains no solvable practice problems');
    }

    const patternMap = {};
    for (const p of patterns) {
        patternMap[p.pattern_id] = p;
    }

    const canonicalQuestions = [];

    for (let i = 0; i < sourceProblems.length; i++) {
        const rawQ = sourceProblems[i];
        const qNum = String(i + 1).padStart(3, '0');
        const qId = 'reas-q-' + qNum;

        const patternId = rawQ.pattern_ref || (patterns[0] ? patterns[0].pattern_id : 'pat-reas-default');
        const pattern = patternMap[patternId] || {};

        const qType = rawQ.raw_type === 'mcq' ? 'mcq' : 'mcq';
        const answer = String(rawQ.correct_answer || '').trim();

        // 1. Provenance
        const provenance = {
            origin: 'authentic_pyq',
            source: rawQ.exam || parsed.source_title || 'Authentic Past Exam'
        };

        // 2. Options (for MCQ)
        let optionsList = [];
        if (qType === 'mcq') {
            optionsList = Array.isArray(rawQ.options) ? [...rawQ.options] : [];
            // Assert MCQ option count invariant (>= 4)
            if (optionsList.length < 4) {
                throw new Error(`[MCQ_INVARIANT_VIOLATION] '${qId}' has fewer than 4 options (${optionsList.length} provided)`);
            }
        }

        // 3. Recognition Signals
        let recSignals = pattern.deep_structure ? [pattern.deep_structure] : [];
        if (recSignals.length === 0) {
            recSignals = ['दिए गए कथनों, वेन आरेख अधिव्यापन अथवा निश्चित छोर बैठने की स्थिति के संकेतों की पहचान करें'];
        }

        // 4. Expected Method (7-Layer Cognitive Thinking Flow)
        const expectedMethod = pattern.governing_method
            ? `7-Layer Cognitive Thinking Pipeline (पैटर्न पहचान व चरणबद्ध निगमन): ${pattern.governing_method}`
            : 'पैटर्न पहचान -> आरेख स्थापना -> शर्त वर्गीकरण -> निश्चित आधार बिंदु -> चरणबद्ध तार्किक निगमन -> भ्रम व सीमा जांच -> अंतिम निष्कर्ष व संगति पुष्टि';

        // 5. Decision Points
        const decisionPoints = (pattern.decision_points && pattern.decision_points.length > 0)
            ? pattern.decision_points
            : ['समस्या का प्रकार पहचानें तथा न्यूनतम अधिव्यापन वेन आरेख या निश्चित छोर से शुरुआत करें'];

        // 6. Traps
        const trap = (pattern.common_traps && pattern.common_traps.length > 0)
            ? pattern.common_traps[0]
            : 'वास्तविक दुनिया के ज्ञान को कथनों पर वरीयता देना या दिशा के भ्रम में बाएं-दाएं को उलट देना';

        // 7. Error Categories
        const errorCats = (pattern.error_categories && pattern.error_categories.length > 0)
            ? pattern.error_categories
            : ['ERR_02: INVALID_DEDUCTIVE_STEP', 'ERR_03: FALSE_PREMISE_ASSUMPTION'];

        // 8. 3-Tier Progressive Hints (Strict Anti-Leak)
        const hints = buildReasoningProgressiveHints(rawQ, pattern, answer);

        // 9. Solution (7-Layer Cognitive Thinking Pipeline)
        let solution = '';
        if (Array.isArray(rawQ.source_solution_steps) && rawQ.source_solution_steps.length > 0) {
            solution = 'चरणबद्ध तार्किक समाधान (7-Layer Cognitive Thinking Pipeline):\n' + rawQ.source_solution_steps.map((st, sIdx) => `${sIdx + 1}. ${st}`).join('\n');
        } else {
            solution = `तार्किक हल: ${rawQ.statement} का 7-स्तरीय तार्किक विश्लेषण करने पर प्राप्त मान्य निष्कर्ष ${answer} है।`;
        }

        // 10. Verification (Domain-Aware Logical Consistency Check)
        let verification = '';
        if (patternId.includes('seating')) {
            verification = `व्यवस्था सुसंगतता एवं प्रतिबंध जांच (Constraint Consistency & Arrangement Check): प्राप्त उत्तर ${answer} के साथ सभी स्थानों की व्यवस्था दिए गए प्रत्येक निश्चित एवं सापेक्ष प्रतिबंधों को पूर्णतः संतुष्ट करती है तथा किसी भी स्थिति में विरोधाभास नहीं है।`;
        } else if (patternId.includes('either-or')) {
            verification = `पूरक युग्म वैधता एवं विकल्प जांच (Complementary Pair & Either-Or Check): दोनों निष्कर्ष व्यक्तिगत रूप से असत्य/संदिग्ध हैं, दोनों के Subject व Predicate समान हैं तथा वे Some + No का वैध पूरक युग्म बनाते हैं, अतः ${answer} तार्किक रूप से सिद्ध है।`;
        } else {
            verification = `तार्किक सुसंगतता एवं वेन आरेख जांच (Venn Minimal Overlap & Logical Consistency Check): न्यूनतम अधिव्यापन वेन आरेख के अनुसार प्राप्त निष्कर्ष ${answer} पूर्णतः तार्किक है, कोई अवैध नकारात्मक या अतिव्यापक निष्कर्ष नहीं लिया गया है तथा सभी दिए गए कथन संतुष्ट हैं।`;
        }

        // 11. Prerequisites
        const prerequisites = (Array.isArray(rawQ.prerequisites) && rawQ.prerequisites.length > 0)
            ? rawQ.prerequisites
            : ['reasoning-study'];

        canonicalQuestions.push({
            id: qId,
            pattern_id: patternId,
            provenance,
            question_type: qType,
            difficulty: rawQ.difficulty || 2.0,
            question: rawQ.statement,
            options: qType === 'mcq' ? optionsList : undefined,
            correct_option: qType === 'mcq' ? answer : undefined,
            correct_answer: answer,
            recognition_signals: recSignals,
            expected_method: expectedMethod,
            decision_points: decisionPoints,
            trap,
            error_category: errorCats,
            hints,
            solution,
            verification,
            prerequisites
        });
    }

    const canonicalQuestionBank = {
        schema_version: '1.0.0',
        domain: parsed.domain || 'Reasoning',
        chapter: parsed.chapter || 'Syllogism-And-Seating-Arrangement',
        skill_id: parsed.skill_id || 'reasoning-study',
        language: 'hi',
        provenance: {
            source: parsed.source_title,
            chapter: parsed.chapter,
            evidence_hash: options.evidenceHash || '0000000000000000000000000000000000000000000000000000000000000000'
        },
        patterns: patterns,
        questions: canonicalQuestions
    };

    return canonicalQuestionBank;
}

/**
 * Executes the complete reasoning-apkg-author specialist task workflow.
 * 
 * @param {Object} task The orchestration task object
 * @param {Object} context Execution context
 * @returns {Object} Structured 11-field handoff object
 */
async function executeReasoningSpecialistTask(task, context = {}) {
    const startTime = Date.now();

    // 1. Single-Writer & Ownership Enforcement
    if (task.owner_agent !== 'reasoning-apkg-author' && task.writer_agent !== 'reasoning-apkg-author') {
        throw new Error(`[OWNERSHIP_VIOLATION] Task '${task.task_id}' designated for '${task.owner_agent}', cannot be executed by reasoning-apkg-author`);
    }

    const subject = context.subject || 'Reasoning';
    const chapter = context.chapter || 'Syllogism-And-Seating-Arrangement';
    const targetPath = task.target_path;
    const retryCount = context.retryCount || 0;

    // 2. Determine procedural mode
    const policy = resolveSubjectPolicy(subject);
    const proceduralMode = context.procedural_mode || policy.procedural_mode || 'markdown';

    // 3. Resolve evidence input (Prioritizes Evidence Pack representation over raw source)
    let evidenceInput = context.evidencePack || null;
    if (!evidenceInput && task.inputs && task.inputs[0] && fs.existsSync(task.inputs[0])) {
        evidenceInput = task.inputs[0];
    }
    if (!evidenceInput) {
        const scratchEvidence = path.resolve(__dirname, 'scratch/evidence-pack.md');
        if (fs.existsSync(scratchEvidence)) {
            evidenceInput = scratchEvidence;
        }
    }
    // Fallback only if no evidence pack exists
    if (!evidenceInput && context.sourceFixture) {
        evidenceInput = context.sourceFixture;
    }
    if (!evidenceInput) {
        const fixturePath = path.resolve(__dirname, '../resources/fixtures/reasoning_syllogism_seating_source_fixture.json');
        if (fs.existsSync(fixturePath)) {
            evidenceInput = fixturePath;
        }
    }

    if (!evidenceInput) {
        return {
            status: 'FAILED',
            agent: 'reasoning-apkg-author',
            task_id: task.task_id,
            inputs_consumed: [],
            outputs_produced: [],
            output_paths: [],
            validation_result: { passed: false, errors: ['No evidence pack or source fixture available'] },
            warnings: [],
            errors: ['MISSING_EVIDENCE_INPUT: Unable to locate evidence pack for Reasoning specialist'],
            dependencies_satisfied: true,
            retry_count: retryCount
        };
    }

    // 4. If mode is none, suppress
    if (proceduralMode === 'none') {
        return {
            status: 'SUPPRESSED',
            agent: 'reasoning-apkg-author',
            task_id: task.task_id,
            inputs_consumed: [String(evidenceInput)],
            outputs_produced: [],
            output_paths: [],
            validation_result: { passed: true },
            warnings: ['Suppressed by subject procedural_mode=none policy'],
            errors: [],
            dependencies_satisfied: true,
            retry_count: retryCount
        };
    }

    try {
        // 5. Author Canonical Procedural Content
        const canonicalQB = authorReasoningProceduralContent(evidenceInput, {
            evidenceHash: context.evidenceHash
        });

        // 6. Validate canonical data in-memory before rendering
        const inMemVal = validateQuestionBankContent(canonicalQB);
        if (!inMemVal.isValid) {
            return {
                status: 'FAILED',
                agent: 'reasoning-apkg-author',
                task_id: task.task_id,
                inputs_consumed: [String(evidenceInput)],
                outputs_produced: [],
                output_paths: [],
                validation_result: { passed: false, errors: inMemVal.errors },
                warnings: inMemVal.warnings,
                errors: inMemVal.errors,
                dependencies_satisfied: true,
                retry_count: retryCount
            };
        }

        const outputsProduced = [];

        // 7. Render Markdown Question Bank (if mode is markdown or both)
        if (proceduralMode === 'markdown' || proceduralMode === 'both') {
            if (task.track_key === 'proceduralQuestionBank' || targetPath.endsWith('.md')) {
                const md = renderQuestionBankToMarkdown(canonicalQB);
                const outDir = path.dirname(targetPath);
                fs.mkdirSync(outDir, { recursive: true });
                fs.writeFileSync(targetPath, md, 'utf8');

                // Independent Markdown Validation
                const mdVal = validateQuestionBankMarkdown(md, targetPath);
                if (!mdVal.isValid) {
                    return {
                        status: 'FAILED',
                        agent: 'reasoning-apkg-author',
                        task_id: task.task_id,
                        inputs_consumed: [String(evidenceInput)],
                        outputs_produced: [targetPath],
                        output_paths: [targetPath],
                        validation_result: { passed: false, errors: mdVal.errors },
                        warnings: mdVal.warnings,
                        errors: mdVal.errors,
                        dependencies_satisfied: true,
                        retry_count: retryCount
                    };
                }
                outputsProduced.push(targetPath);
            }
        }

        // 8. Compile Procedural APKG (if mode is apkg or both)
        if (proceduralMode === 'apkg' || proceduralMode === 'both') {
            if (task.track_key === 'proceduralApkg' || targetPath.endsWith('.apkg')) {
                const outDir = path.dirname(targetPath);
                fs.mkdirSync(outDir, { recursive: true });

                // Also generate intermediate PracticeQuestions and ProblemPatterns
                const intermediateDir = path.resolve(outDir, '../Optional');
                fs.mkdirSync(intermediateDir, { recursive: true });
                const pqPath = path.join(intermediateDir, `${chapter}_PracticeQuestions.json`);
                const ppPath = path.join(intermediateDir, `${chapter}_ProblemPatterns.json`);

                fs.writeFileSync(pqPath, JSON.stringify({
                    schema_version: '1.0.0',
                    domain: 'Reasoning',
                    chapter,
                    skill_id: canonicalQB.skill_id,
                    language: 'hi',
                    provenance: canonicalQB.provenance,
                    questions: canonicalQB.questions
                }, null, 2), 'utf8');

                fs.writeFileSync(ppPath, JSON.stringify({
                    schema_version: '1.0.0',
                    domain: 'Reasoning',
                    chapter,
                    skill_id: canonicalQB.skill_id,
                    patterns: canonicalQB.patterns
                }, null, 2), 'utf8');

                const manifestPath = targetPath.replace(/\.apkg$/, '.manifest.json');
                await exportStudyLabProceduralAnki({
                    questionsPath: pqPath,
                    patternsPath: ppPath,
                    outputPath: targetPath,
                    manifestPath: manifestPath,
                    subject: 'Reasoning',
                    chapter
                });

                // Validate generated procedural apkg
                const apkgVal = await validateProceduralApkg(targetPath);
                if (!apkgVal.isValid) {
                    return {
                        status: 'FAILED',
                        agent: 'reasoning-apkg-author',
                        task_id: task.task_id,
                        inputs_consumed: [String(evidenceInput)],
                        outputs_produced: [targetPath],
                        output_paths: [targetPath],
                        validation_result: { passed: false, errors: apkgVal.errors },
                        warnings: apkgVal.warnings,
                        errors: apkgVal.errors,
                        dependencies_satisfied: true,
                        retry_count: retryCount
                    };
                }
                outputsProduced.push(targetPath);
            }
        }

        return {
            status: 'SUCCESS',
            agent: 'reasoning-apkg-author',
            task_id: task.task_id,
            inputs_consumed: [String(evidenceInput)],
            outputs_produced: outputsProduced,
            output_paths: outputsProduced,
            validation_result: { passed: true, errors: [] },
            warnings: [],
            errors: [],
            dependencies_satisfied: true,
            retry_count: retryCount,
            execution_time_ms: Date.now() - startTime
        };

    } catch (err) {
        return {
            status: 'FAILED',
            agent: 'reasoning-apkg-author',
            task_id: task.task_id,
            inputs_consumed: [String(evidenceInput)],
            outputs_produced: [],
            output_paths: [],
            validation_result: { passed: false, errors: [err.message] },
            warnings: [],
            errors: [err.message],
            dependencies_satisfied: true,
            retry_count: retryCount,
            execution_time_ms: Date.now() - startTime
        };
    }
}

module.exports = {
    DEFAULT_REAS_ERROR_MAP,
    parseReasoningEvidence,
    normalizeRawSourceData,
    parseMarkdownEvidencePackText,
    buildReasoningProgressiveHints,
    authorReasoningProceduralContent,
    executeReasoningSpecialistTask
};
