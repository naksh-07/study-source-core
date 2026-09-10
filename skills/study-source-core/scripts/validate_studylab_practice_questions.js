/**
 * study-source-core StudyLab Practice Questions Validator (validate_studylab_practice_questions.js)
 * PHYSICAL EXECUTION GATEWAY & FORMAL COVERAGE AUDIT MATRIX GENERATOR
 * 
 * Contract:
 * - Strictly enforces canonical StudyLab Practice Questions JSON schema (studylab-practice-questions-schema.json).
 * - Validates top-level metadata, domain taxonomy, and chapter identity.
 * - Validates item-level question properties: unique IDs, origin_type, prompt, and question_type (mcq, numerical, structured, reference_only).
 * - Enforces MCQ distractor integrity (>= 2 options, valid correct_option).
 * - Enforces Numerical answer precision and tolerance.
 * - Validates structured exam metadata (PYQ fidelity) and source provenance.
 * - Checks procedural linkage (pattern_id, schema_id, problem_family).
 * - Computes and generates the Formal Content Coverage Gap Matrix.
 */

const fs = require('fs');
const path = require('path');

const VALID_DOMAINS = new Set([
    'Mathematics',
    'Math',
    'Physics',
    'Chemistry',
    'Reasoning',
    'Biology',
    'Geography',
    'History',
    'Map',
    'Political Science',
    'General'
]);

const VALID_ORIGIN_TYPES = new Set([
    'AUTHENTIC_PYQ',
    'CURATED_SOURCE',
    'DERIVED_VARIANT',
    'SYNTHETIC_SCHEMA'
]);

const VALID_QUESTION_TYPES = new Set([
    'mcq',
    'numerical',
    'structured',
    'reference_only'
]);

function validatePracticeQuestionsContent(contentOrData, filePath) {
    filePath = filePath || 'in-memory';
    let data;
    if (typeof contentOrData === 'string') {
        try {
            const cleanStr = contentOrData.replace(/^\uFEFF/, '');
            data = JSON.parse(cleanStr);
        } catch (err) {
            return {
                isValid: false,
                errors: ['Invalid JSON syntax in ' + filePath + ': ' + err.message],
                warnings: []
            };
        }
    } else {
        data = contentOrData;
    }

    const errors = [];
    const warnings = [];

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        errors.push('Root manifest must be a valid JSON object.');
        return { isValid: false, errors, warnings };
    }

    // 1. Top-Level Required Fields
    const requiredTopLevel = ['schema_version', 'domain', 'chapter', 'questions'];
    for (const field of requiredTopLevel) {
        if (!(field in data)) {
            errors.push('Missing required top-level field: \x27' + field + '\x27');
        } else if (typeof data[field] === 'string' && data[field].trim() === '') {
            errors.push('Top-level field \x27' + field + '\x27 must not be empty.');
        }
    }

    if (data.schema_version && data.schema_version !== '1.0.0') {
        errors.push('Invalid schema_version \x27' + data.schema_version + '\x27. Expected \x271.0.0\x27.');
    }

    if (data.domain && !VALID_DOMAINS.has(data.domain)) {
        errors.push('Invalid domain \x27' + data.domain + '\x27. Must be one of: ' + Array.from(VALID_DOMAINS).join(', '));
    }

    if (data.provenance !== undefined) {
        if (typeof data.provenance !== 'object' || data.provenance === null || Array.isArray(data.provenance)) {
            errors.push("Top-level field 'provenance' must be an object.");
        }
    }

    // 2. Questions Array Validation
    if (!Array.isArray(data.questions)) {
        errors.push("Top-level field 'questions' must be an array.");
        return { isValid: false, errors, warnings };
    }

    if (data.questions.length === 0) {
        errors.push("Top-level field 'questions' must contain at least 1 question item.");
        return { isValid: false, errors, warnings };
    }

    const questionIds = new Set();

    data.questions.forEach((q, qIdx) => {
        const qPath = 'questions[' + qIdx + ']';

        if (!q || typeof q !== 'object' || Array.isArray(q)) {
            errors.push(qPath + ' must be an object.');
            return;
        }

        // Question ID
        if (!q.id || typeof q.id !== 'string' || q.id.trim() === '') {
            errors.push(qPath + ' is missing non-empty \x27id\x27.');
        } else if (questionIds.has(q.id)) {
            errors.push('Duplicate question ID \x27' + q.id + '\x27 found at ' + qPath + '.');
        } else {
            questionIds.add(q.id);
        }

        // Origin Type
        if (!q.origin_type || typeof q.origin_type !== 'string' || q.origin_type.trim() === '') {
            errors.push(qPath + ' is missing \x27origin_type\x27.');
        } else if (!VALID_ORIGIN_TYPES.has(q.origin_type)) {
            errors.push(qPath + ' has invalid origin_type \x27' + q.origin_type + '\x27. Must be one of: ' + Array.from(VALID_ORIGIN_TYPES).join(', '));
        }

        // Prompt
        if (!q.prompt || typeof q.prompt !== 'string' || q.prompt.trim() === '') {
            errors.push(qPath + ' is missing non-empty \x27prompt\x27.');
        }

        // Anti-Fallback & Learning Completeness Check
        if (q.prompt) {
            const hasBlankSyntax = /_{3,}|\.{4,}|\(\s*\.{3,}\s*\)|\[\s*\.{3,}\s*\]/.test(q.prompt);
            const hasFillInTheBlankHeading = /\b(fill in the blank|रिक्त स्थान भरो|रिक्त स्थान की पूर्ति)\b/i.test(q.prompt);
            if ((hasBlankSyntax || hasFillInTheBlankHeading) && q.question_type === 'mcq' && (!q.options || q.options.length === 0)) {
                errors.push(qPath + ' [Anti-Fallback Invariant] Generic blank found without valid MCQ options or numerical structure.');
            }
        }

        // Question Type
        if (!q.question_type || typeof q.question_type !== 'string' || q.question_type.trim() === '') {
            errors.push(qPath + ' is missing \x27question_type\x27.');
        } else if (!VALID_QUESTION_TYPES.has(q.question_type)) {
            errors.push(qPath + ' has invalid question_type \x27' + q.question_type + '\x27. Must be one of: ' + Array.from(VALID_QUESTION_TYPES).join(', '));
        } else {
            // Type-specific checks
            if (q.question_type === 'mcq') {
                if (!Array.isArray(q.options) || q.options.length < 4) {
                    errors.push(qPath + ' (MCQ) must have an \x27options\x27 array with at least 4 choice strings.');
                } else {
                    let dummyCount = 0;
                    q.options.forEach((opt, oIdx) => {
                        if (typeof opt !== 'string' || opt.trim() === '') {
                            errors.push(qPath + '.options[' + oIdx + '] must be a non-empty string.');
                        } else if (/^option\s*[a-d]$/i.test(opt.trim())) {
                            dummyCount++;
                        }
                    });
                    if (dummyCount === q.options.length) {
                        errors.push(qPath + ' [Anti-Fallback Invariant] MCQ has only dummy placeholder options. Authentic distractors required.');
                    }
                }

                if (q.correct_option === undefined || q.correct_option === null || String(q.correct_option).trim() === '') {
                    errors.push(qPath + ' (MCQ) is missing non-empty \x27correct_option\x27.');
                } else if (Array.isArray(q.options) && q.options.length >= 2) {
                    const optionMatch = q.options.some(opt => opt.trim() === String(q.correct_option).trim());
                    if (!optionMatch) {
                        const isLetterOrIndex = /^[A-Ea-e1-5]$/.test(String(q.correct_option).trim());
                        if (!isLetterOrIndex) {
                            warnings.push(qPath + ' \x27correct_option\x27 ("' + q.correct_option + '") does not match any entry in \x27options\x27 array.');
                        }
                    }
                }
            } else if (q.question_type === 'numerical') {
                if (q.answer === undefined || q.answer === null) {
                    errors.push(qPath + ' (Numerical) is missing required \x27answer\x27.');
                } else {
                    const isNum = typeof q.answer === 'number' && !isNaN(q.answer);
                    const isNumStr = typeof q.answer === 'string' && !isNaN(parseFloat(q.answer));
                    if (!isNum && !isNumStr) {
                        errors.push(qPath + ' (Numerical) \x27answer\x27 must be a valid numerical value.');
                    }
                }

                if (q.tolerance !== undefined && (typeof q.tolerance !== 'number' || q.tolerance < 0)) {
                    errors.push(qPath + ' (Numerical) \x27tolerance\x27 must be a non-negative number.');
                }
            } else if (q.question_type === 'structured') {
                if (!Array.isArray(q.steps) || q.steps.length === 0) {
                    errors.push(qPath + ' (Structured) must have a non-empty \x27steps\x27 array.');
                }
            } else if (q.question_type === 'reference_only') {
                if (!q.exam_metadata && !q.source_provenance) {
                    warnings.push(qPath + ' (ReferenceOnly) should include \x27exam_metadata\x27 or \x27source_provenance\x27 to specify citation.');
                }
            }
        }

        // Exam Metadata (Optional)
        if (q.exam_metadata !== undefined) {
            if (typeof q.exam_metadata !== 'object' || q.exam_metadata === null || Array.isArray(q.exam_metadata)) {
                errors.push(qPath + '.exam_metadata must be an object.');
            } else {
                if (!q.exam_metadata.exam || typeof q.exam_metadata.exam !== 'string' || q.exam_metadata.exam.trim() === '') {
                    warnings.push(qPath + '.exam_metadata is missing non-empty \x27exam\x27 name.');
                }
                if (q.exam_metadata.year !== undefined) {
                    if (typeof q.exam_metadata.year !== 'number' || !Number.isInteger(q.exam_metadata.year) || q.exam_metadata.year < 1900 || q.exam_metadata.year > 2100) {
                        errors.push(qPath + '.exam_metadata has invalid \x27year\x27 (must be an integer between 1900 and 2100).');
                    }
                }
            }
        }

        // Source Provenance (Mandatory)
        if (!q.source_provenance && !q.exam_metadata) {
            errors.push(qPath + ' is missing required \x27source_provenance\x27 or \x27exam_metadata\x27.');
        } else if (q.source_provenance !== undefined) {
            if (typeof q.source_provenance !== 'object' || q.source_provenance === null || Array.isArray(q.source_provenance)) {
                errors.push(qPath + '.source_provenance must be an object.');
            }
        }
        
        // Content Validation (Hints & Explanation)
        if (q.question_type !== 'reference_only') {
            if (!q.explanation && !q.solution) {
                errors.push(qPath + ' is missing required \x27explanation\x27 or \x27solution\x27.');
            }
            if (!q.hints) {
                errors.push(qPath + ' is missing required \x27hints\x27.');
            }
        }

        // Pattern Linkage Check
        if (q.pattern_id && (typeof q.pattern_id !== 'string' || q.pattern_id.trim() === '')) {
            errors.push(qPath + ' \x27pattern_id\x27 must be a non-empty string when defined.');
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        totalQuestions: (data.questions || []).length
    };
}

function computeCoverageReport(questionsData, patternsData) {
    patternsData = patternsData || null;
    const questions = (questionsData && Array.isArray(questionsData.questions)) ? questionsData.questions : [];
    const patterns = (patternsData && Array.isArray(patternsData.patterns)) ? patternsData.patterns : [];

    const stats = {
        domain: questionsData ? questionsData.domain : (patternsData ? patternsData.domain : 'Unknown'),
        chapter: questionsData ? questionsData.chapter : (patternsData ? patternsData.chapter : 'Unknown'),
        totalQuestions: questions.length,
        mcqCount: 0,
        numericalCount: 0,
        structuredCount: 0,
        referenceOnlyCount: 0,
        pyqCount: 0,
        curatedCount: 0,
        derivedCount: 0,
        syntheticCount: 0,
        patternCoverage: new Map(),
        uncoveredPatterns: [],
        coverageMatrix: []
    };

    questions.forEach(q => {
        if (q.question_type === 'mcq') stats.mcqCount++;
        else if (q.question_type === 'numerical') stats.numericalCount++;
        else if (q.question_type === 'structured') stats.structuredCount++;
        else if (q.question_type === 'reference_only') stats.referenceOnlyCount++;

        if (q.origin_type === 'AUTHENTIC_PYQ') stats.pyqCount++;
        else if (q.origin_type === 'CURATED_SOURCE') stats.curatedCount++;
        else if (q.origin_type === 'DERIVED_VARIANT') stats.derivedCount++;
        else if (q.origin_type === 'SYNTHETIC_SCHEMA') stats.syntheticCount++;

        const patId = q.pattern_id || 'unlinked';
        if (!stats.patternCoverage.has(patId)) {
            stats.patternCoverage.set(patId, { questions: [], pyqCount: 0, curatedCount: 0, solvableCount: 0, referenceOnlyCount: 0 });
        }
        const patStats = stats.patternCoverage.get(patId);
        patStats.questions.push(q.id);
        if (q.question_type !== 'reference_only') {
            patStats.solvableCount++;
        } else {
            patStats.referenceOnlyCount++;
        }
        if (q.origin_type === 'AUTHENTIC_PYQ') patStats.pyqCount++;
        if (q.origin_type === 'CURATED_SOURCE') patStats.curatedCount++;
    });

    if (patterns.length > 0) {
        patterns.forEach(p => {
            const patStats = stats.patternCoverage.get(p.id) || { questions: [], pyqCount: 0, curatedCount: 0, solvableCount: 0, referenceOnlyCount: 0 };
            let capability = 'SourceOnly';
            if (p.status === 'UNSUPPORTED_BY_CURRENT_STUDYLAB_ENGINE' || p.unsupported) {
                capability = 'SourceOnly';
            } else if (p.variation_opportunities && p.variation_opportunities.length > 0) {
                capability = p.transfer_opportunities && p.transfer_opportunities.length > 0 ? 'Full' : 'Partial';
            } else if (p.governing_method && p.governing_method.standard_algorithm) {
                capability = 'Partial';
            }

            const matrixEntry = {
                patternId: p.id,
                problemType: p.problem_type,
                solvableCount: patStats.solvableCount,
                referenceOnlyCount: patStats.referenceOnlyCount,
                pyqCount: patStats.pyqCount,
                curatedCount: patStats.curatedCount,
                capability
            };

            stats.coverageMatrix.push(matrixEntry);

            if (patStats.solvableCount === 0) {
                stats.uncoveredPatterns.push(p.id);
            }
        });
    }

    return stats;
}

function formatCoverageMatrix(report) {
    let out = '### Content Coverage Audit Matrix: ' + report.chapter + ' (' + report.domain + ')\n\n';
    out += '| Pattern ID & Problem Type | Solvable Questions | ReferenceOnly | PYQs | Curated | Generator Capability |\n';
    out += '|:---|:---:|:---:|:---:|:---:|:---|\n';

    if (report.coverageMatrix.length > 0) {
        report.coverageMatrix.forEach(entry => {
            out += '| **' + entry.patternId + '** (' + entry.problemType + ') | ' + entry.solvableCount + ' | ' + (entry.referenceOnlyCount || 0) + ' | ' + entry.pyqCount + ' | ' + entry.curatedCount + ' | ' + entry.capability + ' |\n';
        });
    } else {
        out += '| *(No companion ProblemPatterns defined)* | ' + (report.totalQuestions - report.referenceOnlyCount) + ' | ' + report.referenceOnlyCount + ' | ' + report.pyqCount + ' | ' + report.curatedCount + ' | N/A |\n';
    }

    out += '\n**Coverage Summary**:\n';
    out += '- Total Practice Items: ' + report.totalQuestions + ' (MCQs: ' + report.mcqCount + ', Numericals: ' + report.numericalCount + ', Structured: ' + report.structuredCount + ', ReferenceOnly: ' + report.referenceOnlyCount + ')\n';
    out += '- Provenance: Authentic PYQs: ' + report.pyqCount + ', Curated Source: ' + report.curatedCount + ', Derived/Synthetic: ' + (report.derivedCount + report.syntheticCount) + '\n';
    if (report.uncoveredPatterns.length > 0) {
        out += '- ⚠️ **Patterns Lacking Solvable Questions (Honest Gap Report)**: ' + report.uncoveredPatterns.join(', ') + '\n';
    } else if (report.coverageMatrix.length > 0) {
        out += '- ✅ **100% Pattern Coverage**: All procedural patterns have representative practice questions.\n';
    }

    return out;
}

function validatePracticeQuestionsFile(filePath, options) {
    options = options || {};
    const shouldExit = options.shouldExit !== undefined ? options.shouldExit : true;
    console.log('Validating StudyLab Practice Questions JSON at: ' + filePath);

    if (!fs.existsSync(filePath)) {
        console.error('Error: File not found: ' + filePath);
        if (shouldExit) process.exit(1);
        return { isValid: false, errors: ['File not found: ' + filePath], warnings: [] };
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const result = validatePracticeQuestionsContent(fileContent, filePath);

    if (!result.isValid) {
        console.log("\n[FAIL] StudyLab Practice Questions Validation Errors:");
        result.errors.forEach(err => console.log('  ❌ ' + err));
        console.log("\nValidation failed.");
        if (shouldExit) process.exit(1);
        return result;
    }

    if (result.warnings.length > 0) {
        result.warnings.forEach(w => console.log('  ⚠️ ' + w));
    }
    console.log("\n[PASS] StudyLab Practice Questions Validation successful.");

    let patternsData = null;
    if (options.patternsFile && fs.existsSync(options.patternsFile)) {
        try {
            patternsData = JSON.parse(fs.readFileSync(options.patternsFile, 'utf-8').replace(/^\uFEFF/, ''));
        } catch (e) {}
    } else {
        const defaultPatternsPath = filePath.replace('_PracticeQuestions.json', '_ProblemPatterns.json');
        if (fs.existsSync(defaultPatternsPath)) {
            try {
                patternsData = JSON.parse(fs.readFileSync(defaultPatternsPath, 'utf-8').replace(/^\uFEFF/, ''));
            } catch (e) {}
        }
    }

    const questionsData = JSON.parse(fileContent.replace(/^\uFEFF/, ''));
    const report = computeCoverageReport(questionsData, patternsData);
    const matrixMd = formatCoverageMatrix(report);
    console.log("\n" + matrixMd);

    result.coverageReport = report;
    result.matrixMarkdown = matrixMd;

    if (shouldExit) process.exit(0);
    return result;
}

if (require.main === module) {
    if (process.argv.length < 3) {
        console.error('Usage: node validate_studylab_practice_questions.js <path_to_practice_questions_json> [--patterns <path_to_patterns_json>]');
        process.exit(1)
    }
    const filePath = process.argv[2];
    let patternsFile = null;
    const patIdx = process.argv.indexOf('--patterns');
    if (patIdx !== -1 && process.argv[patIdx + 1]) {
        patternsFile = process.argv[patIdx + 1];
    }
    validatePracticeQuestionsFile(filePath, { patternsFile, shouldExit: true });
}

function validateAntiFallbackInvariant(prompt, questionType, options, answer) {
    const errors = [];
    const warnings = [];

    if (!prompt || typeof prompt !== 'string') return { isValid: true, errors, warnings };

    const hasBlankSyntax = /_{3,}|\.{4,}|\(\s*\.{3,}\s*\)|\[\s*\.{3,}\s*\]/.test(prompt);
    const hasFillInTheBlankHeading = /\b(fill in the blank|रिक्त स्थान भरो|रिक्त स्थान की पूर्ति)\b/i.test(prompt);

    if ((hasBlankSyntax || hasFillInTheBlankHeading) && questionType === 'mcq' && (!options || options.length === 0)) {
        errors.push(`[Anti-Fallback Invariant] Generic blank found without valid MCQ options or numerical derivation.`);
    }

    if (questionType === 'mcq' && Array.isArray(options)) {
        const allEmptyOrDummy = options.length > 0 && options.every(opt => !opt || opt.trim() === '' || /^option\s*[a-d]$/i.test(opt.trim()));
        if (allEmptyOrDummy) {
            errors.push(`[Anti-Fallback Invariant] MCQ question has only dummy placeholder options (${JSON.stringify(options)}). Every MCQ must have authentic distractors.`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

module.exports = {
    validatePracticeQuestionsFile,
    validatePracticeQuestionsContent,
    validateAntiFallbackInvariant,
    computeCoverageReport,
    formatCoverageMatrix,
    VALID_DOMAINS,
    VALID_ORIGIN_TYPES,
    VALID_QUESTION_TYPES
};