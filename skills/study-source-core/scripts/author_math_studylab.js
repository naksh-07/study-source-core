/**
 * Math Specialist Authoring Engine (`author_math_studylab.js`)
 * 
 * Implements the domain-specific procedural authoring logic for `math-apkg-author`.
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
 * Standard error codes taxonomy mapping for math problems.
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
function parseMathEvidence(evidenceInput) {
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

    throw new Error('UNSUPPORTED_EVIDENCE_FORMAT: Could not parse Math evidence input');
}

/**
 * Normalizes raw source fixture data.
 */
function normalizeRawSourceData(data) {
    const chapter = data.chapter || 'LCM-HCF';
    const domain = data.domain || 'Mathematics';
    const subject = data.subject || 'Math';
    const skill_id = data.skill_id || 'math.number_system.lcm_hcf';

    const patterns = Array.isArray(data.problem_patterns) ? data.problem_patterns : [];
    const sourceProblems = Array.isArray(data.source_problems) ? data.source_problems : [];

    return {
        chapter,
        domain,
        subject,
        skill_id,
        source_title: data.source_provenance ? data.source_provenance.source_title : 'Math Source Evidence',
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
    let chapter = 'LCM-HCF';
    let subject = 'Math';
    let domain = 'Mathematics';
    let skill_id = 'math.number_system.lcm_hcf';
    let source_title = 'Math Source Evidence';
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
 * Builds non-leaking, pedagogical 3-tier progressive hints.
 */
function buildProgressiveHints(prob, pattern, answer) {
    let tier1 = '';
    let tier2 = '';
    let tier3 = '';

    if (pattern && pattern.pattern_id === 'pat-math-lcm-prime-factorization') {
        tier1 = '?????? ?? ????? ????: ???? ?? ?????? ???????? (Prime Factorization) ???? ???? ????? ?? ?????? ??? ??? ???????? ????? ?????';
        tier2 = '??????: ?? ?? ???????? ?? ?????? ??????? ????? ????? LCM ??? ??? ?????? ????????? ?? ?????? ??? ??? ????? ???? ?? (LCM + r) ?? ???? ?????? ?????';
        tier3 = '??????: ???????? ?? ?????? ??????? ????? ???????? ??? ?????? ???????? ?? ???? ???? ?? ?????? ???????? ????? ?????';
    } else if (pattern && pattern.pattern_id === 'pat-math-lcm-product-identity') {
        tier1 = '?? ???????? ?? ??????, ??????? ?????????? (LCM) ??? ?????? ????????? (HCF) ?? ?????? ????? ?? ????? ?????';
        tier2 = '??????: ????? ??????? ????: ???? ?????? ? ????? ?????? = LCM ? HCF ???? ??-?????? ???????? ?? ??? ??? a = HCF ? x, b = HCF ? y ?? ?????? ?????';
        tier3 = '??????: ????? ????? ?? ????? ??? ???????????? ???? ?????? ?? ?? ??? ?????? ?? ?? ?????';
    } else {
        tier1 = '?????? ?? ?????? ?????? ?? ????? ???? ?? ????? ????? ??????? ??? ???????? ????? ?????';
        tier2 = '??????: ??? ?? ???? ?? ?????? ???? ?? ???? ????? ??????? ???? ???? ??????? ????? ???? ?????? ??????';
        tier3 = '??????: ?????? ??? ??? ???????????? ?? ??????? ???? ????? ?????';
    }

    // Explicit Anti-Leak Assertion Check
    if (hintLeaksAnswer(tier1, answer)) {
        tier1 = '?????? ?? ????? ?????? ?????????? ??? ????????? ?? ??????? ?????';
    }
    if (hintLeaksAnswer(tier2, answer)) {
        tier2 = '??????: ?????? ?? ??? ??????? ???? ????????? ????? ??????? ?????';
    }
    if (hintLeaksAnswer(tier3, answer)) {
        tier3 = '??????: ??????? ??? ??? ???? ????? ???? ??????? ??? ?? ?? ?????';
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
function authorMathProceduralContent(evidenceInput, options = {}) {
    const parsed = parseMathEvidence(evidenceInput);

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
        const qId = 'math-q-' + qNum;

        const patternId = rawQ.pattern_ref || (patterns[0] ? patterns[0].pattern_id : 'pat-math-default');
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
            recSignals = ['?????? ??? LCM/HCF ???? ???????? ?? ????? ?? ????? ????'];
        }

        // 4. Expected Method
        const expectedMethod = pattern.governing_method || '???? ?????? ???????? ??? ????????? ???? ???? ????';

        // 5. Decision Points
        const decisionPoints = (pattern.decision_points && pattern.decision_points.length > 0)
            ? pattern.decision_points
            : ['?????? ?? ??????? ?? ?????? ??????? ????? ???? ???? ?? ??? ????'];

        // 6. Traps
        const trap = (pattern.common_traps && pattern.common_traps.length > 0)
            ? pattern.common_traps[0]
            : '???? ???? ????? ?????? ??? ??????? ?????? ?? ?????';

        // 7. Error Categories
        const errorCats = (pattern.error_categories && pattern.error_categories.length > 0)
            ? pattern.error_categories
            : ['ERR_01', 'ERR_06'];

        // 8. 3-Tier Progressive Hints (Strict Anti-Leak)
        const hints = buildProgressiveHints(rawQ, pattern, answer);

        // 9. Solution
        let solution = '';
        if (Array.isArray(rawQ.source_solution_steps) && rawQ.source_solution_steps.length > 0) {
            solution = '??????? ??????:\n' + rawQ.source_solution_steps.map((st, sIdx) => `${sIdx + 1}. ${st}`).join('\n');
        } else {
            solution = `??: ${rawQ.statement} ?? ?????? ???? ???? ???? ???? ?? ????? ${answer} ??????? ???? ???`;
        }

        // 10. Verification
        const verification = `???? ??? ???????: ??????? ????? ${answer} ?? ??? ?????? ???? ????????? ?????? ??? ???????????? ???? ?? ????? ??????? ???????? ???? ???`;

        // 11. Prerequisites
        const prerequisites = (Array.isArray(rawQ.prerequisites) && rawQ.prerequisites.length > 0)
            ? rawQ.prerequisites
            : ['math.factors.hcf_lcm_basics'];

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
        domain: parsed.domain || 'Mathematics',
        chapter: parsed.chapter || 'LCM-HCF',
        skill_id: parsed.skill_id || 'math.number_system.lcm_hcf',
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
 * Executes the complete math-apkg-author specialist task workflow.
 * 
 * @param {Object} task The orchestration task object
 * @param {Object} context Execution context
 * @returns {Object} Structured 11-field handoff object
 */
async function executeMathSpecialistTask(task, context = {}) {
    const startTime = Date.now();

    // 1. Single-Writer & Ownership Enforcement
    if (task.owner_agent !== 'math-apkg-author' && task.writer_agent !== 'math-apkg-author') {
        throw new Error(`[OWNERSHIP_VIOLATION] Task '${task.task_id}' designated for '${task.owner_agent}', cannot be executed by math-apkg-author`);
    }

    const subject = context.subject || 'Math';
    const chapter = context.chapter || 'LCM-HCF';
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
        const fixturePath = path.resolve(__dirname, '../resources/fixtures/math_lcm_hcf_source_fixture.json');
        if (fs.existsSync(fixturePath)) {
            evidenceInput = fixturePath;
        }
    }

    if (!evidenceInput) {
        return {
            status: 'FAILED',
            agent: 'math-apkg-author',
            task_id: task.task_id,
            inputs_consumed: [],
            outputs_produced: [],
            output_paths: [],
            validation_result: { passed: false, errors: ['No evidence pack or source fixture available'] },
            warnings: [],
            errors: ['MISSING_EVIDENCE_INPUT: Unable to locate evidence pack for Math specialist'],
            dependencies_satisfied: true,
            retry_count: retryCount
        };
    }

    // 4. If mode is none, suppress
    if (proceduralMode === 'none') {
        return {
            status: 'SUPPRESSED',
            agent: 'math-apkg-author',
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
        const canonicalQB = authorMathProceduralContent(evidenceInput, {
            evidenceHash: context.evidenceHash
        });

        // 6. Validate canonical data in-memory before rendering
        const inMemVal = validateQuestionBankContent(canonicalQB);
        if (!inMemVal.isValid) {
            return {
                status: 'FAILED',
                agent: 'math-apkg-author',
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
                        agent: 'math-apkg-author',
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
                    domain: 'Math',
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
                    domain: 'Math',
                    chapter,
                    skill_id: canonicalQB.skill_id,
                    language: 'hi',
                    problem_patterns: canonicalQB.problem_patterns
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
                    domain: 'Math',
                    chapter,
                    skill_id: canonicalQB.skill_id,
                    language: 'hi',
                    provenance: canonicalQB.provenance,
                    questions: canonicalQB.questions
                }, null, 2), 'utf8');

                fs.writeFileSync(ppPath, JSON.stringify({
                    schema_version: '1.0.0',
                    domain: 'Math',
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
                    subject: 'Math',
                    chapter
                });

                const apkgVal = await validateProceduralApkg(targetPath, false);
                if (!apkgVal.isValid) {
                    return {
                        status: 'FAILED',
                        agent: 'math-apkg-author',
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
            agent: 'math-apkg-author',
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
            agent: 'math-apkg-author',
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
    parseMathEvidence,
    authorMathProceduralContent,
    executeMathSpecialistTask
};
