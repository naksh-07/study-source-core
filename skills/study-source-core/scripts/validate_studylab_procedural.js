/**
 * study-source-core StudyLab Procedural Validator (`validate_studylab_procedural.js`)
 * PHYSICAL EXECUTION GATEWAY
 * 
 * Contract:
 * - Strictly enforces canonical StudyLab Procedural JSON schema (studylab-procedural-schema.json).
 * - Validates top-level metadata, domain taxonomy, decision trees, and error log taxonomy.
 * - Validates pattern-level deep structures, recognition signals, standard algorithms, traps, and difficulty enums.
 * - Validates structured PYQ references and provenance metadata.
 */

const fs = require('fs');
const path = require('path');

const STUDYLAB_ELIGIBLE_DOMAINS = new Set(['Math', 'Physics', 'Chemistry', 'Reasoning']);
const ALL_KNOWN_DOMAINS = new Set([
    'Math', 'Physics', 'Chemistry', 'Reasoning',
    'Biology', 'Geography', 'History', 'Map', 'Political Science', 'General'
]);

const VALID_DIFFICULTIES = new Set([
    'Easy',
    'Medium',
    'Difficult',
    'Easy-Medium',
    'Medium-Difficult',
    'E',
    'M',
    'D',
    'E/M',
    'M/D'
]);

function validateProceduralContent(contentOrData, filePath = 'in-memory') {
    let data;
    if (typeof contentOrData === 'string') {
        try {
            const cleanStr = contentOrData.replace(/^\uFEFF/, '');
            data = JSON.parse(cleanStr);
        } catch (err) {
            return {
                isValid: false,
                errors: [`Invalid JSON syntax in ${filePath}: ${err.message}`],
                warnings: []
            };
        }
    } else {
        data = contentOrData;
    }

    const errors = [];
    const warnings = [];

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        errors.push("Root manifest must be a valid JSON object.");
        return { isValid: false, errors, warnings };
    }

    // 1. Top-Level Required Fields
    const requiredTopLevel = ['id', 'title', 'domain', 'chapter', 'patterns'];
    for (const field of requiredTopLevel) {
        if (!(field in data)) {
            errors.push(`Missing required top-level field: '${field}'`);
        } else if (typeof data[field] === 'string' && data[field].trim() === '') {
            errors.push(`Top-level field '${field}' must not be empty.`);
        }
    }

    // 2. Domain Taxonomy
    if (data.domain) {
        if (!ALL_KNOWN_DOMAINS.has(data.domain)) {
            errors.push(`Invalid domain '${data.domain}'. Must be one of: ${Array.from(ALL_KNOWN_DOMAINS).join(', ')}`);
        } else if (!STUDYLAB_ELIGIBLE_DOMAINS.has(data.domain)) {
            warnings.push(`Domain '${data.domain}' is recognized but not fully eligible for StudyLab procedural generation.`);
        }
    }

    // 3. Optional Provenance Validation
    if (data.provenance !== undefined) {
        if (typeof data.provenance !== 'object' || data.provenance === null || Array.isArray(data.provenance)) {
            errors.push("Top-level field 'provenance' must be an object.");
        }
    }

    // 4. Decision Trees Validation (Top-level)
    if (data.decision_trees !== undefined) {
        if (!Array.isArray(data.decision_trees)) {
            errors.push("Top-level field 'decision_trees' must be an array.");
        } else {
            data.decision_trees.forEach((dt, idx) => {
                const dtPath = `decision_trees[${idx}]`;
                if (!dt || typeof dt !== 'object' || Array.isArray(dt)) {
                    errors.push(`${dtPath} must be an object.`);
                    return;
                }
                if (!dt.id || typeof dt.id !== 'string' || dt.id.trim() === '') {
                    errors.push(`${dtPath} is missing non-empty 'id'.`);
                }
                if (!dt.name || typeof dt.name !== 'string' || dt.name.trim() === '') {
                    errors.push(`${dtPath} is missing non-empty 'name'.`);
                }
                if (!Array.isArray(dt.rules) || dt.rules.length === 0) {
                    errors.push(`${dtPath}.rules must be a non-empty array.`);
                } else {
                    dt.rules.forEach((rule, rIdx) => {
                        const rPath = `${dtPath}.rules[${rIdx}]`;
                        if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
                            errors.push(`${rPath} must be an object.`);
                            return;
                        }
                        if (!rule.condition || typeof rule.condition !== 'string' || rule.condition.trim() === '') {
                            errors.push(`${rPath} is missing non-empty 'condition'.`);
                        }
                        if (!rule.action || typeof rule.action !== 'string' || rule.action.trim() === '') {
                            errors.push(`${rPath} is missing non-empty 'action'.`);
                        }
                    });
                }
            });
        }
    }

    // 5. Practice Progression Validation
    if (data.practice_progression !== undefined) {
        if (!Array.isArray(data.practice_progression)) {
            errors.push("Top-level field 'practice_progression' must be an array.");
        } else {
            data.practice_progression.forEach((prog, pIdx) => {
                const pPath = `practice_progression[${pIdx}]`;
                if (!prog || typeof prog !== 'object' || Array.isArray(prog)) {
                    errors.push(`${pPath} must be an object.`);
                    return;
                }
                if (typeof prog.level !== 'number' || prog.level < 1 || prog.level > 10) {
                    errors.push(`${pPath} must have a valid numerical 'level' between 1 and 10.`);
                }
                if (!prog.name || typeof prog.name !== 'string' || prog.name.trim() === '') {
                    errors.push(`${pPath} is missing non-empty 'name'.`);
                }
                if (!prog.difficulty || typeof prog.difficulty !== 'string' || prog.difficulty.trim() === '') {
                    errors.push(`${pPath} is missing non-empty 'difficulty'.`);
                }
                if (!prog.description || typeof prog.description !== 'string' || prog.description.trim() === '') {
                    errors.push(`${pPath} is missing non-empty 'description'.`);
                }
            });
        }
    }

    // 6. Error Log Taxonomy Validation
    if (data.error_log_taxonomy !== undefined) {
        if (!Array.isArray(data.error_log_taxonomy)) {
            errors.push("Top-level field 'error_log_taxonomy' must be an array.");
        } else {
            data.error_log_taxonomy.forEach((errLog, eIdx) => {
                const ePath = `error_log_taxonomy[${eIdx}]`;
                if (!errLog || typeof errLog !== 'object' || Array.isArray(errLog)) {
                    errors.push(`${ePath} must be an object.`);
                    return;
                }
                if (!errLog.category || typeof errLog.category !== 'string' || errLog.category.trim() === '') {
                    errors.push(`${ePath} is missing non-empty 'category'.`);
                }
                if (!errLog.correction_rule || typeof errLog.correction_rule !== 'string' || errLog.correction_rule.trim() === '') {
                    errors.push(`${ePath} is missing non-empty 'correction_rule'.`);
                }
            });
        }
    }

    // 7. Patterns Array Validation
    if (!Array.isArray(data.patterns)) {
        errors.push("Top-level field 'patterns' must be an array.");
        return { isValid: false, errors, warnings };
    }

    if (data.patterns.length === 0) {
        errors.push("Top-level field 'patterns' must contain at least 1 pattern item.");
        return { isValid: false, errors, warnings };
    }

    const patternIds = new Set();

    data.patterns.forEach((pattern, patIdx) => {
        const patPath = `patterns[${patIdx}]`;

        if (!pattern || typeof pattern !== 'object' || Array.isArray(pattern)) {
            errors.push(`${patPath} must be an object.`);
            return;
        }

        // Pattern ID
        if (!pattern.id || typeof pattern.id !== 'string' || pattern.id.trim() === '') {
            errors.push(`${patPath} is missing a non-empty 'id'.`);
        } else if (patternIds.has(pattern.id)) {
            errors.push(`Duplicate pattern ID '${pattern.id}' found at ${patPath}.`);
        } else {
            patternIds.add(pattern.id);
        }

        // Domain
        if (!pattern.domain || typeof pattern.domain !== 'string' || pattern.domain.trim() === '') {
            errors.push(`${patPath} is missing 'domain'.`);
        } else if (!ALL_KNOWN_DOMAINS.has(pattern.domain)) {
            errors.push(`${patPath} has invalid domain '${pattern.domain}'. Must be one of: ${Array.from(ALL_KNOWN_DOMAINS).join(', ')}`);
        } else if (!STUDYLAB_ELIGIBLE_DOMAINS.has(pattern.domain)) {
            warnings.push(`${patPath} specifies domain '${pattern.domain}' which is not typically StudyLab eligible.`);
        }

        // Problem Type
        if (!pattern.problem_type || typeof pattern.problem_type !== 'string' || pattern.problem_type.trim() === '') {
            errors.push(`${patPath} is missing non-empty 'problem_type'.`);
        }

        // Deep Structure
        if (!pattern.deep_structure || typeof pattern.deep_structure !== 'string' || pattern.deep_structure.trim() === '') {
            errors.push(`${patPath} is missing non-empty 'deep_structure'.`);
        }

        // Recognition Signals
        if (!Array.isArray(pattern.recognition_signals) || pattern.recognition_signals.length === 0) {
            errors.push(`${patPath}.recognition_signals must be a non-empty array of strings.`);
        } else {
            pattern.recognition_signals.forEach((sig, sIdx) => {
                if (typeof sig !== 'string' || sig.trim() === '') {
                    errors.push(`${patPath}.recognition_signals[${sIdx}] must be a non-empty string.`);
                }
            });
        }

        // Governing Method
        if (!pattern.governing_method || typeof pattern.governing_method !== 'object' || Array.isArray(pattern.governing_method)) {
            errors.push(`${patPath} is missing required 'governing_method' object.`);
        } else {
            if (!Array.isArray(pattern.governing_method.standard_algorithm) || pattern.governing_method.standard_algorithm.length === 0) {
                errors.push(`${patPath}.governing_method.standard_algorithm must be a non-empty array of step strings.`);
            } else {
                pattern.governing_method.standard_algorithm.forEach((step, stepIdx) => {
                    if (typeof step !== 'string' || step.trim() === '') {
                        errors.push(`${patPath}.governing_method.standard_algorithm[${stepIdx}] must be a non-empty string.`);
                    }
                });
            }
        }

        // Common Traps
        if (!Array.isArray(pattern.common_traps) || pattern.common_traps.length === 0) {
            errors.push(`${patPath}.common_traps must be a non-empty array of trap strings.`);
        } else {
            pattern.common_traps.forEach((trap, tIdx) => {
                if (typeof trap !== 'string' || trap.trim() === '') {
                    errors.push(`${patPath}.common_traps[${tIdx}] must be a non-empty string.`);
                }
            });
        }

        // Difficulty
        if (!pattern.difficulty || typeof pattern.difficulty !== 'string' || pattern.difficulty.trim() === '') {
            errors.push(`${patPath} is missing required 'difficulty'.`);
        } else if (!VALID_DIFFICULTIES.has(pattern.difficulty)) {
            errors.push(`${patPath} has invalid difficulty '${pattern.difficulty}'. Must be one of: ${Array.from(VALID_DIFFICULTIES).join(', ')}`);
        }

        // Decision Points (Optional)
        if (pattern.decision_points !== undefined) {
            if (!Array.isArray(pattern.decision_points)) {
                errors.push(`${patPath}.decision_points must be an array.`);
            } else {
                pattern.decision_points.forEach((dp, dpIdx) => {
                    const dpPath = `${patPath}.decision_points[${dpIdx}]`;
                    if (!dp || typeof dp !== 'object' || Array.isArray(dp)) {
                        errors.push(`${dpPath} must be an object.`);
                        return;
                    }
                    if (!dp.condition || typeof dp.condition !== 'string' || dp.condition.trim() === '') {
                        errors.push(`${dpPath} is missing non-empty 'condition'.`);
                    }
                    if (!dp.action || typeof dp.action !== 'string' || dp.action.trim() === '') {
                        errors.push(`${dpPath} is missing non-empty 'action'.`);
                    }
                });
            }
        }

        // PYQ References (Optional)
        if (pattern.pyq_references !== undefined) {
            if (!Array.isArray(pattern.pyq_references)) {
                errors.push(`${patPath}.pyq_references must be an array.`);
            } else {
                pattern.pyq_references.forEach((pyq, pyqIdx) => {
                    const pyqPath = `${patPath}.pyq_references[${pyqIdx}]`;
                    if (!pyq || typeof pyq !== 'object' || Array.isArray(pyq)) {
                        errors.push(`${pyqPath} must be an object.`);
                        return;
                    }
                    if (!pyq.exam || typeof pyq.exam !== 'string' || pyq.exam.trim() === '') {
                        errors.push(`${pyqPath} is missing non-empty 'exam'.`);
                    }
                    if (typeof pyq.year !== 'number' || !Number.isInteger(pyq.year) || pyq.year < 1900 || pyq.year > 2100) {
                        errors.push(`${pyqPath} has invalid 'year' (must be an integer between 1900 and 2100).`);
                    }
                });
            }
        }

        // Provenance (Optional)
        if (pattern.provenance !== undefined) {
            if (typeof pattern.provenance !== 'object' || pattern.provenance === null || Array.isArray(pattern.provenance)) {
                errors.push(`${patPath}.provenance must be an object.`);
            }
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

function validateProceduralFile(filePath, shouldExit = true) {
    console.log(`Validating StudyLab Procedural JSON at: ${filePath}`);
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        if (shouldExit) process.exit(1);
        return { isValid: false, errors: [`File not found: ${filePath}`], warnings: [] };
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const result = validateProceduralContent(fileContent, filePath);

    if (!result.isValid) {
        console.log("\n[FAIL] StudyLab Procedural Validation Errors:");
        result.errors.forEach(err => console.log(`  ❌ ${err}`));
        console.log("\nValidation failed.");
        if (shouldExit) process.exit(1);
        return result;
    } else {
        if (result.warnings.length > 0) {
            result.warnings.forEach(w => console.log(`  ⚠️ ${w}`));
        }
        console.log("\n[PASS] StudyLab Procedural Validation successful.");
        if (shouldExit) process.exit(0);
        return result;
    }
}

if (require.main === module) {
    if (process.argv.length !== 3) {
        console.error("Usage: node validate_studylab_procedural.js <path_to_json>");
        process.exit(1);
    }
    validateProceduralFile(process.argv[2]);
}

module.exports = {
    validateProceduralFile,
    validateProceduralContent,
    ALL_KNOWN_DOMAINS,
    STUDYLAB_ELIGIBLE_DOMAINS,
    VALID_DIFFICULTIES
};
