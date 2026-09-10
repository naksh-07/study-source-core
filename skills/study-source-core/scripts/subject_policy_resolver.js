const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'resources', 'subject-skill-manifest.json');
let manifest = null;
try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (e) {
    // Ignore, handle later if needed, but it should exist.
}

const VALID_SUBJECTS = manifest && manifest.subjects ? Object.keys(manifest.subjects) : [];

function getCanonicalSubject(subjectName) {
    if (VALID_SUBJECTS.includes(subjectName)) return subjectName;
    if (manifest && manifest.subjects) {
        for (const [canonical, data] of Object.entries(manifest.subjects)) {
            if (data.aliases && data.aliases.includes(subjectName)) {
                return canonical;
            }
        }
    }
    return subjectName;
}

const { getArtifactRegistry } = require('./artifact_registry');
const POLICY_SCHEMA_KEYS = Object.keys(getArtifactRegistry());

function resolveSubjectPolicy(subject) {
    if (!subject || typeof subject !== 'string') {
        throw new Error('MISSING_SUBJECT: Subject must be provided as a string.');
    }

    const canonicalSubject = getCanonicalSubject(subject);

    if (!VALID_SUBJECTS.includes(canonicalSubject)) {
        throw new Error(`UNKNOWN_SUBJECT: Subject '${subject}' (resolved to '${canonicalSubject}') is not registered in subject-skill-manifest.json.`);
    }

    const policyPath = path.join(__dirname, '..', 'subject-skills', canonicalSubject, 'runtime-policy.json');

    if (!fs.existsSync(policyPath)) {
        throw new Error(`MISSING_POLICY_FILE: Missing runtime-policy.json for subject '${subject}'`);
    }

    let policyRaw;
    try {
        policyRaw = fs.readFileSync(policyPath, 'utf8');
    } catch (e) {
        throw new Error(`FILE_READ_ERROR: Could not read policy file for '${subject}'`);
    }

    let policy;
    try {
        policy = JSON.parse(policyRaw);
    } catch (e) {
        throw new Error(`MALFORMED_POLICY: runtime-policy.json for '${subject}' is not valid JSON.`);
    }

    if (typeof policy !== 'object' || policy === null) {
        throw new Error(`INVALID_POLICY_SCHEMA: Policy for '${subject}' must be a JSON object.`);
    }

    const VALID_PROCEDURAL_MODES = new Set(['markdown', 'apkg', 'both', 'none']);
    const ALLOWED_CONFIG_KEYS = new Set([
        ...POLICY_SCHEMA_KEYS,
        'procedural_mode',
        'proceduralMode',
        'procedural_apkg',
        'procedural_question_bank'
    ]);

    // Handle aliases before schema validation
    const normalizedPolicy = { ...policy };
    if ('procedural_apkg' in normalizedPolicy && !('proceduralApkg' in normalizedPolicy)) {
        normalizedPolicy.proceduralApkg = normalizedPolicy.procedural_apkg;
    }
    if ('proceduralApkg' in normalizedPolicy && !('procedural_apkg' in normalizedPolicy)) {
        normalizedPolicy.procedural_apkg = normalizedPolicy.proceduralApkg;
    }
    if ('procedural_question_bank' in normalizedPolicy && !('proceduralQuestionBank' in normalizedPolicy)) {
        normalizedPolicy.proceduralQuestionBank = normalizedPolicy.procedural_question_bank;
    }
    if ('proceduralQuestionBank' in normalizedPolicy && !('procedural_question_bank' in normalizedPolicy)) {
        normalizedPolicy.procedural_question_bank = normalizedPolicy.proceduralQuestionBank;
    }

    const result = {};
    
    // Check required boolean keys
    for (const key of POLICY_SCHEMA_KEYS) {
        if (!(key in normalizedPolicy)) {
            throw new Error(`INVALID_POLICY_SCHEMA: Missing required boolean flag '${key}' in policy for '${subject}'`);
        }
        if (typeof normalizedPolicy[key] !== 'boolean') {
            throw new Error(`INVALID_POLICY_SCHEMA: Flag '${key}' must be a boolean in policy for '${subject}'`);
        }
        result[key] = normalizedPolicy[key];
    }

    // Validate procedural_mode if specified
    const mode = normalizedPolicy.procedural_mode || normalizedPolicy.proceduralMode;
    if (mode !== undefined) {
        if (typeof mode !== 'string' || !VALID_PROCEDURAL_MODES.has(mode)) {
            throw new Error(`INVALID_POLICY_SCHEMA: Invalid procedural_mode '${mode}' in policy for '${subject}'. Expected one of: ${Array.from(VALID_PROCEDURAL_MODES).join(', ')}`);
        }
        result.procedural_mode = mode;
        result.proceduralMode = mode;
    } else {
        // Derive default procedural_mode from flags
        if (result.proceduralQuestionBank && result.proceduralApkg) {
            result.procedural_mode = 'both';
        } else if (result.proceduralQuestionBank) {
            result.procedural_mode = 'markdown';
        } else if (result.proceduralApkg) {
            result.procedural_mode = 'apkg';
        } else {
            result.procedural_mode = 'none';
        }
        result.proceduralMode = result.procedural_mode;
    }

    // Attach aliases to result
    result.procedural_apkg = result.proceduralApkg;
    result.procedural_question_bank = result.proceduralQuestionBank;

    for (const key of Object.keys(policy)) {
        if (!ALLOWED_CONFIG_KEYS.has(key)) {
            throw new Error(`INVALID_POLICY_SCHEMA: Unknown flag '${key}' in policy for '${subject}'`);
        }
    }

    return result;
}

module.exports = {
    resolveSubjectPolicy,
    VALID_SUBJECTS,
    POLICY_SCHEMA_KEYS
};
