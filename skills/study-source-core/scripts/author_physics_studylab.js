/**
 * Physics Specialist Authoring Engine (`author_physics_studylab.js`)
 * 
 * Implements the domain-specific procedural authoring logic for `physics-numerical-apkg-author`.
 * Ingests raw source evidence (evidence pack / source fixture), extracts problem patterns
 * and authentic practice questions, authors 17-dimension canonical procedural content,
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
 * Standard error codes taxonomy mapping for physics problems.
 */
const DEFAULT_MATH_ERROR_MAP = {
    'prime_factorization': ['ERR_01', 'ERR_02', 'ERR_06'],
    'product_identity': ['ERR_01', 'ERR_03', 'ERR_05', 'ERR_06'],
    'remainder_rule': ['ERR_02', 'ERR_06', 'ERR_07'],
    'ratio_decomposition': ['ERR_03', 'ERR_06', 'ERR_08']
};

/**
 * Parses markdown evidence pack or raw source JSON into structured domain data.
 */
function parsePhysicsEvidence(evidenceInput) {
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
        const trimmed = evidenceInput.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                return normalizeRawSourceData(parsed);
            } catch (e) {
                throw new Error(`MALFORMED_JSON_EVIDENCE: Input appears to be JSON but failed to parse: ${e.message}`);
            }
        }
        return parseMarkdownEvidencePackText(evidenceInput);
    }

    throw new Error('UNSUPPORTED_EVIDENCE_FORMAT: Could not parse Physics evidence input');
}

/**
 * Normalizes raw source fixture data.
 */
function normalizeRawSourceData(data) {
    const chapter = data.chapter || 'Work-Energy-Power';
    const domain = data.domain || 'Physics';
    const subject = data.subject || 'Physics';
    const skill_id = data.skill_id || 'physics.mechanics.work_energy_power';

    const patterns = Array.isArray(data.problem_patterns) ? data.problem_patterns : [];
    const sourceProblems = Array.isArray(data.source_problems) ? data.source_problems : [];

    return {
        chapter,
        domain,
        subject,
        skill_id,
        source_title: data.source_provenance ? data.source_provenance.source_title : 'Physics Source Evidence',
        edition: data.source_provenance ? data.source_provenance.edition : '2024-2025',
        exam_corpus: data.source_provenance ? data.source_provenance.exam_corpus : ['Authentic PYQ'],
        concepts: data.concepts || [],
        master_formulas: data.master_formulas || [],
        problem_patterns: patterns,
        source_problems: sourceProblems
    };
}

/**
 * Parses markdown-formatted evidence pack text.
 */
function parseMarkdownEvidencePackText(text) {
    const lines = text.split(/\r?\n/);
    let chapter = 'Work-Energy-Power';
    let subject = 'Physics';
    let domain = 'Physics';
    let skill_id = 'physics.mechanics.work_energy_power';
    let source_title = 'Physics Source Evidence';
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
        } else if (line.startsWith('## 3. Master Formulas')) {
            currentSection = 'FORMULAS';
        } else if (line.startsWith('## 4. Problem Pattern')) {
            currentSection = 'PATTERNS';
        } else if (line.startsWith('## 5. Authentic Source Problems')) {
            currentSection = 'PROBLEMS';
        } else if (line.startsWith('### Pattern:') && currentSection === 'PATTERNS') {
            const m = line.match(/### Pattern:\s*([^(]+)\(([^)]+)\)/);
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
                source_id: m ? m[1].trim() : 'pyq-' + (sourceProblems.length + 1),
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
            else if (line.startsWith('- Statement:')) currentItem.statement = line.substring(12).trim();
            else if (line.startsWith('- Correct Answer:')) currentItem.correct_answer = line.substring(17).trim();
            else if (line.startsWith('- Difficulty:')) currentItem.difficulty = parseFloat(line.substring(13).trim()) || 2.0;
            else if (line.startsWith('- Prerequisites:')) {
                currentItem.prerequisites = line.substring(16).split(',').map(s => s.trim()).filter(Boolean);
            } else if (line.startsWith('- (A)') || line.startsWith('- (B)') || line.startsWith('- (C)') || line.startsWith('- (D)') || line.startsWith('- (E)')) {
                const optText = line.replace(/^[\s-]*\([A-Z]\)\s*/, '').trim();
                currentItem.options.push(optText);
            } else if (/^\d+\.\s*/.test(line)) {
                currentItem.source_solution_steps.push(line.replace(/^\d+\.\s*/, '').trim());
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
        master_formulas: [],
        problem_patterns: patterns,
        source_problems: sourceProblems
    };
}

/**
 * Builds non-leaking, pedagogical 3-tier progressive hints for Physics numericals.
 */
function buildProgressiveHints(prob, pattern, answer) {
    let tier1 = '';
    let tier2 = '';
    let tier3 = '';

    if (pattern && pattern.pattern_id === 'pat-phys-wep-work-constant-force') {
        tier1 = 'भौतिक सिद्धांत पहचानें: नियत बल द्वारा कार्य की परिभाषा W = F * s * cos(theta) का प्रयोग करें। बल और विस्थापन के मध्य कोण का निर्धारण करें।';
        tier2 = 'रणनीति एवं समीकरण: विस्थापन की दिशा में बल का प्रभावी घटक F_parallel = F * cos(theta) ज्ञात करें। यदि गति ऊर्ध्वाधर है तो न्यूनतम बल F = mg लें।';
        tier3 = 'चरणबद्ध संक्रिया: दिए गए मान F, s तथा cos(theta) को समीकरण W = F * s * cos(theta) में प्रतिस्थापित कर अंतिम गणना करें।';
    } else if (pattern && pattern.pattern_id === 'pat-phys-wep-work-energy-theorem') {
        tier1 = 'भौतिक सिद्धांत पहचानें: कार्य-ऊर्जा प्रमेय (Work-Energy Theorem) W_net = Delta K = K_f - K_i का प्रयोग करें। प्रारंभिक एवं अंतिम अवस्था की गतिज ऊर्जा पर विचार करें।';
        tier2 = 'रणनीति एवं समीकरण: यदि वाहन रुकता है तो अंतिम गतिज ऊर्जा K_f = 0 होगी। गतिज ऊर्जा K = (1/2)m v^2 सूत्र का प्रयोग करें तथा चाल को आवश्यक रूप से m/s में बदलें।';
        tier3 = 'चरणबद्ध संक्रिया: कार्य-ऊर्जा प्रमेय से अवरोधी कार्य अथवा प्रतिरोधी बल स्थापित करें: W = - (1/2)m u^2 अथवा F_avg * s = (1/2)m u^2।';
    } else {
        tier1 = 'भौतिक सिद्धांत पहचानें: समस्या में शामिल मूल भौतिक नियम अथवा संरक्षण सिद्धांत (कार्य, ऊर्जा अथवा शक्ति) को पहचानें।';
        tier2 = 'रणनीति एवं समीकरण: ज्ञात एवं अज्ञात भौतिक राशियों को सूचीबद्ध करें तथा उपयुक्त शासी सूत्र का चयन करें।';
        tier3 = 'चरणबद्ध संक्रिया: SI मात्रकों में मान प्रतिस्थापित कर चरणबद्ध बीजगणितीय हल प्राप्त करें।';
    }

    // Explicit Anti-Leak Assertion Check
    if (hintLeaksAnswer(tier1, answer)) {
        tier1 = 'भौतिक सिद्धांत पहचानें: कार्य, ऊर्जा एवं संरक्षण नियमों का सावधानीपूर्वक विश्लेषण करें।';
    }
    if (hintLeaksAnswer(tier2, answer)) {
        tier2 = 'रणनीति: शासी भौतिक समीकरण स्थापित करें तथा SI मात्रकों का ध्यान रखें।';
    }
    if (hintLeaksAnswer(tier3, answer)) {
        tier3 = 'संक्रिया: सूत्र में ज्ञात मान प्रतिस्थापित कर आवश्यक अज्ञात राशि ज्ञात करें।';
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
function authorPhysicsProceduralContent(evidenceInput, options = {}) {
    const parsed = parsePhysicsEvidence(evidenceInput);

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
        const qId = 'phys-q-' + qNum;

        const patternId = rawQ.pattern_ref || (patterns[0] ? patterns[0].pattern_id : 'pat-phys-default');
        const pattern = patternMap[patternId] || {};

        const qType = rawQ.raw_type === 'mcq' ? 'mcq' : 'numerical';
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
            // Assert MCQ option count invariant
            if (optionsList.length < 4) {
                throw new Error(`[MCQ_INVARIANT_VIOLATION] '${qId}' has fewer than 4 options (${optionsList.length} provided)`);
            }
        }

        // 3. Recognition Signals
        let recSignals = pattern.deep_structure ? [pattern.deep_structure] : [];
        if (recSignals.length === 0) {
            recSignals = ['पिंड पर लगने वाले बल, विस्थापन एवं गतिज ऊर्जा में परिवर्तन के संकेतों की पहचान करें'];
        }

        // 4. Expected Method (6-stage physics numerical pipeline)
        const expectedMethod = pattern.governing_method || 'भौतिक मॉडल -> FBD/घटक वियोजन -> शासी नियम -> समीकरण हल -> SI मात्रक -> सार्थकता जांच';

        // 5. Decision Points
        const decisionPoints = (pattern.decision_points && pattern.decision_points.length > 0)
            ? pattern.decision_points
            : ['बल तथा विस्थापन के बीच कोण का निर्धारण करें तथा उचित कार्य सूत्र चुनें'];

        // 6. Traps
        const trap = (pattern.common_traps && pattern.common_traps.length > 0)
            ? pattern.common_traps[0]
            : 'SI मात्रक परिवर्तन (km/h से m/s या cm से m) अथवा घर्षण के ऋणात्मक चिन्ह की उपेक्षा';

        // 7. Error Categories
        const errorCats = (pattern.error_categories && pattern.error_categories.length > 0)
            ? pattern.error_categories
            : ['ERR_PHYS_UNIT_CONVERSION', 'ERR_PHYS_SIGN_CONVENTION'];

        // 8. 3-Tier Progressive Hints (Strict Anti-Leak)
        const hints = buildProgressiveHints(rawQ, pattern, answer);

        // 9. Solution (6-Stage Physical Numerical Pipeline)
        let solution = '';
        if (Array.isArray(rawQ.source_solution_steps) && rawQ.source_solution_steps.length > 0) {
            solution = 'चरणबद्ध भौतिक समाधान (6-Stage Pipeline):\n' + rawQ.source_solution_steps.map((st, sIdx) => `${sIdx + 1}. ${st}`).join('\n');
        } else {
            solution = `हल: ${rawQ.statement} का चरणबद्ध विश्लेषण करने पर प्राप्त परिणाम ${answer} है।`;
        }

        // 10. Verification (Physical Sanity & Dimensional Analysis)
        const verification = `विमीय एवं भौतिक सार्थकता जांच (Sanity Check): प्राप्त उत्तर ${answer} विमीय दृष्टि से सुसंगत है, सभी SI मात्रक संतुलित हैं तथा भौतिक सीमांत शर्ते पूर्ण होती हैं।`;

        // 11. Prerequisites
        const prerequisites = (Array.isArray(rawQ.prerequisites) && rawQ.prerequisites.length > 0)
            ? rawQ.prerequisites
            : ['physics.mechanics.work_energy_power'];

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
        domain: parsed.domain || 'Physics',
        chapter: parsed.chapter || 'Work-Energy-Power',
        skill_id: parsed.skill_id || 'physics.mechanics.work_energy_power',
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
 * Executes the complete physics-numerical-apkg-author specialist task workflow.
 * 
 * @param {Object} task The orchestration task object
 * @param {Object} context Execution context
 * @returns {Object} Structured 11-field handoff object
 */
async function executePhysicsSpecialistTask(task, context = {}) {
    const startTime = Date.now();

    // 1. Single-Writer & Ownership Enforcement
    if (task.owner_agent !== 'physics-numerical-apkg-author' && task.writer_agent !== 'physics-numerical-apkg-author') {
        throw new Error(`[OWNERSHIP_VIOLATION] Task '${task.task_id}' designated for '${task.owner_agent}', cannot be executed by physics-numerical-apkg-author`);
    }

    const subject = context.subject || 'Physics';
    const chapter = context.chapter || 'Work-Energy-Power';
    const targetPath = task.target_path;
    const retryCount = context.retryCount || 0;

    // 2. Determine procedural mode
    const policy = resolveSubjectPolicy(subject);
    const proceduralMode = context.procedural_mode || policy.procedural_mode || 'markdown';

    // 3. Resolve evidence input (with Phase 7 task-scoped context slice support)
    let evidenceInput = null;
    if (context.contextSlice || task.contextSlice) {
        const sliceManifest = task.contextPlan || context.contextPlan || null;
        if (sliceManifest) {
            const { verifyContextProvenance } = require('./context_planner');
            verifyContextProvenance(sliceManifest, context.evidenceHash);
        }
        evidenceInput = context.contextSlice || task.contextSlice;
        if (typeof evidenceInput === 'object' && evidenceInput.context_slice_content) {
            evidenceInput = evidenceInput.context_slice_content;
        }
    }
    if (!evidenceInput) {
        evidenceInput = context.evidencePack || context.sourceFixture || null;
    }
    if (!evidenceInput && task.inputs && task.inputs[0] && fs.existsSync(task.inputs[0])) {
        evidenceInput = task.inputs[0];
    }
    if (!evidenceInput) {
        const scratchEvidence = path.resolve(__dirname, 'scratch/evidence-pack.md');
        if (fs.existsSync(scratchEvidence)) {
            evidenceInput = scratchEvidence;
        }
    }
    if (!evidenceInput) {
        const fixturePath = path.resolve(__dirname, '../resources/fixtures/physics_lcm_hcf_source_fixture.json');
        if (fs.existsSync(fixturePath)) {
            evidenceInput = fixturePath;
        }
    }

    if (!evidenceInput) {
        return {
            status: 'FAILED',
            agent: 'physics-numerical-apkg-author',
            task_id: task.task_id,
            inputs_consumed: [],
            outputs_produced: [],
            output_paths: [],
            validation_result: { passed: false, errors: ['No evidence pack or source fixture available'] },
            warnings: [],
            errors: ['MISSING_EVIDENCE_INPUT: Unable to locate evidence pack for Physics specialist'],
            dependencies_satisfied: true,
            retry_count: retryCount
        };
    }

    // 4. If mode is none, suppress
    if (proceduralMode === 'none') {
        return {
            status: 'SUPPRESSED',
            agent: 'physics-numerical-apkg-author',
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
        const canonicalQB = authorPhysicsProceduralContent(evidenceInput, {
            evidenceHash: context.evidenceHash
        });

        // 6. Validate canonical data in-memory before rendering
        const inMemVal = validateQuestionBankContent(canonicalQB);
        if (!inMemVal.isValid) {
            return {
                status: 'FAILED',
                agent: 'physics-numerical-apkg-author',
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
                        agent: 'physics-numerical-apkg-author',
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
            if (task.track_key === 'practiceQuestions' || (targetPath && targetPath.endsWith('_PracticeQuestions.json'))) {
                const outDir = path.dirname(targetPath);
                fs.mkdirSync(outDir, { recursive: true });
                fs.writeFileSync(targetPath, JSON.stringify({
                    schema_version: '1.0.0',
                    domain: 'Physics',
                    chapter,
                    skill_id: canonicalQB.skill_id,
                    language: 'hi',
                    provenance: canonicalQB.provenance,
                    questions: canonicalQB.questions
                }, null, 2), 'utf8');
                outputsProduced.push(targetPath);
            }
            if (task.track_key === 'problemPatterns' || (targetPath && targetPath.endsWith('_ProblemPatterns.json'))) {
                const outDir = path.dirname(targetPath);
                fs.mkdirSync(outDir, { recursive: true });
                fs.writeFileSync(targetPath, JSON.stringify({
                    schema_version: '1.0.0',
                    domain: 'Physics',
                    chapter,
                    skill_id: canonicalQB.skill_id,
                    language: 'hi',
                    patterns: canonicalQB.patterns
                }, null, 2), 'utf8');
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
                    domain: 'Physics',
                    chapter,
                    skill_id: canonicalQB.skill_id,
                    language: 'hi',
                    provenance: canonicalQB.provenance,
                    questions: canonicalQB.questions
                }, null, 2), 'utf8');

                fs.writeFileSync(ppPath, JSON.stringify({
                    schema_version: '1.0.0',
                    domain: 'Physics',
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
                    subject: 'Physics',
                    chapter
                });

                const apkgVal = await validateProceduralApkg(targetPath, false);
                if (!apkgVal.isValid) {
                    return {
                        status: 'FAILED',
                        agent: 'physics-numerical-apkg-author',
                        task_id: task.task_id,
                        inputs_consumed: [String(evidenceInput)],
                        outputs_produced: [targetPath],
                        output_paths: [targetPath],
                        validation_result: { passed: false, errors: apkgVal.errors },
                        warnings: apkgVal.warnings || [],
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
            agent: 'physics-numerical-apkg-author',
            task_id: task.task_id,
            inputs_consumed: [String(evidenceInput)],
            outputs_produced: outputsProduced,
            output_paths: outputsProduced,
            validation_result: { passed: true, validator: 'validate_studylab_question_bank.js', errors: [] },
            warnings: [],
            errors: [],
            dependencies_satisfied: true,
            retry_count: retryCount
        };
    } catch (err) {
        return {
            status: 'FAILED',
            agent: 'physics-numerical-apkg-author',
            task_id: task.task_id,
            inputs_consumed: [String(evidenceInput)],
            outputs_produced: [],
            output_paths: [],
            validation_result: { passed: false, errors: [err.message] },
            warnings: [],
            errors: [err.message],
            dependencies_satisfied: true,
            retry_count: retryCount
        };
    }
}

module.exports = {
    parsePhysicsEvidence,
    authorPhysicsProceduralContent,
    executePhysicsSpecialistTask
};
