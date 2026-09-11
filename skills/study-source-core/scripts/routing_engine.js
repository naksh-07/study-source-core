/**
 * study-source-core Master Routing & Complexity Engine (`routing_engine.js`)
 */

const fs = require('fs');
const path = require('path');

const { resolveSubjectPolicy } = require('./subject_policy_resolver');

const manifestPath = path.join(__dirname, '..', 'resources', 'subject-skill-manifest.json');
let manifest = null;
try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (e) {}

function isStudyLabCapableSubject(subjName) {
    if (!manifest || !manifest.subjects) return false;
    for (const [canonical, data] of Object.entries(manifest.subjects)) {
        if (canonical.toLowerCase() === subjName.toLowerCase() || 
            (data.aliases && data.aliases.map(a => a.toLowerCase()).includes(subjName.toLowerCase()))) {
            return data.studylab_support === true;
        }
    }
    return false;
}

const PROCEDURAL_TRACK_KEYS = new Set([
    'proceduralApkg',
    'procedural_apkg',
    'proceduralQuestionBank',
    'procedural_question_bank',
    'problemPatterns',
    'practiceQuestions'
]);

/**
 * Evaluates comprehensive artifact eligibility, subagent dispatching,
 * and downstream complexity gating for a given chapter context.
 * 
 * @param {Object} context
 * @returns {Object} Deterministic routing decision and suppression reasons
 */
function evaluateArtifactRouting(context = {}) {
    const {
        subject,
        chapter,
        artifactPolicy: explicitPolicy = null
    } = context;

    if (!subject) throw new Error('MISSING_REQUIRED_CONTEXT: subject must be provided');
    if (!chapter) throw new Error('MISSING_REQUIRED_CONTEXT: chapter must be provided');

    // Deterministic Subject Policy Resolution
    const artifactPolicy = resolveSubjectPolicy(subject);
    const isCapable = isStudyLabCapableSubject(subject);
    
    // Core remains a policy CONSUMER. It NEVER infers from evidence.
    // We override with explicit policy ONLY if provided for testing backwards compatibility.
    // However, the new deterministic resolver is the canonical source.
    const finalPolicy = { ...artifactPolicy };
    if (explicitPolicy) {
        let explicitMode = explicitPolicy.procedural_mode || explicitPolicy.proceduralMode;
        if (!explicitMode && isCapable) {
            const hasApkg = explicitPolicy.proceduralApkg === true || explicitPolicy.procedural_apkg === true;
            const hasQb = explicitPolicy.proceduralQuestionBank === true || explicitPolicy.procedural_question_bank === true;
            if (hasApkg && hasQb) {
                explicitMode = 'both';
            } else if (hasApkg) {
                explicitMode = 'apkg';
            } else if (hasQb) {
                explicitMode = 'markdown';
            }
        }

        if (explicitMode && isCapable) {
            if (explicitMode === 'markdown') {
                finalPolicy.proceduralQuestionBank = true;
                finalPolicy.proceduralApkg = false;
            } else if (explicitMode === 'apkg') {
                finalPolicy.proceduralQuestionBank = false;
                finalPolicy.proceduralApkg = true;
            } else if (explicitMode === 'both') {
                finalPolicy.proceduralQuestionBank = true;
                finalPolicy.proceduralApkg = true;
            } else if (explicitMode === 'none') {
                finalPolicy.proceduralQuestionBank = false;
                finalPolicy.proceduralApkg = false;
            }
            finalPolicy.procedural_mode = explicitMode;
            finalPolicy.proceduralMode = explicitMode;
        }

        for (const [k, v] of Object.entries(explicitPolicy)) {
            // Non-capable subjects can NEVER enable procedural artifacts via override
            if (!isCapable && PROCEDURAL_TRACK_KEYS.has(k) && v === true) {
                // Do nothing (fail closed)
            } else if (artifactPolicy[k] === false && v === true && !isCapable) {
                // Do nothing
            } else {
                finalPolicy[k] = v;
                if (k === 'procedural_apkg') finalPolicy.proceduralApkg = v;
                if (k === 'proceduralApkg') finalPolicy.procedural_apkg = v;
                if (k === 'procedural_question_bank') finalPolicy.proceduralQuestionBank = v;
                if (k === 'proceduralQuestionBank') finalPolicy.procedural_question_bank = v;
            }
        }
    }

    const THRESHOLDS = {
        QA_MIN_WORDS: 400,
        GRAPH_MIN_WORDS: 350,
        GRAPH_MIN_CHARS: 800
    };

    const routing = {
        suppressions: {}
    };

    for (const key of Object.keys(finalPolicy)) {
        if (typeof finalPolicy[key] === 'boolean') {
            routing[key] = finalPolicy[key];
            if (!routing[key]) {
                routing.suppressions[key] = 'SUPPRESSED_BY_SUBJECT_POLICY';
            }
        }
    }

    if (finalPolicy.procedural_mode) {
        routing.procedural_mode = finalPolicy.procedural_mode;
    }
    routing.procedural_apkg = routing.proceduralApkg;
    routing.procedural_question_bank = routing.proceduralQuestionBank;

    // Dynamic Activation Gating

    if (routing.basic && context.basicCandidateCount === 0) {
        routing.basic = false;
        routing.suppressions.basic = 'ZERO_BASIC_CANDIDATES';
    }

    if (routing.cloze && context.clozeCandidateCount === 0) {
        routing.cloze = false;
        routing.suppressions.cloze = 'ZERO_CLOZE_CANDIDATES';
    }
    
    if (routing.imageOcclusion) {
        if (context.ioCandidateCount === 0 || !context.visualProfile) {
            routing.imageOcclusion = false;
            routing.suppressions.imageOcclusion = 'NO_IO_CANDIDATES';
        } else if (context.approvedAssetCount === 0 && context.approvedAssetCount !== undefined) {
            routing.imageOcclusion = false;
            routing.suppressions.imageOcclusion = 'NO_APPROVED_ASSET';
        }
    }

    if (!routing.basic && !routing.cloze && !routing.imageOcclusion) {
        routing.apkg = false;
        routing.suppressions.apkg = 'NO_DECLARATIVE_CARDS_AVAILABLE';
    }

    // Dynamic Activation Gating for Procedural
    if (context.proceduralProfile) {
        const patterns = context.proceduralProfile.patterns || [];
        if (patterns.length === 0) {
            if (routing.problemPatterns) {
                routing.problemPatterns = false;
                routing.suppressions.problemPatterns = 'ZERO_PROCEDURAL_PATTERNS';
            }
            if (routing.proceduralApkg) {
                routing.proceduralApkg = false;
                routing.suppressions.proceduralApkg = 'ZERO_PROCEDURAL_PATTERNS';
            }
            if (routing.proceduralQuestionBank) {
                routing.proceduralQuestionBank = false;
                routing.suppressions.proceduralQuestionBank = 'ZERO_PROCEDURAL_PATTERNS';
            }
        } else {
            const supportedPatterns = patterns.filter(p => p.status !== 'UNSUPPORTED_BY_CURRENT_STUDYLAB_ENGINE' && p.governing_method);
            if (supportedPatterns.length === 0) {
                if (routing.proceduralApkg) {
                    routing.proceduralApkg = false;
                    routing.suppressions.proceduralApkg = 'INSUFFICIENT_PROCEDURAL_DENSITY_FOR_APKG';
                }
                if (routing.proceduralQuestionBank) {
                    routing.proceduralQuestionBank = false;
                    routing.suppressions.proceduralQuestionBank = 'INSUFFICIENT_PROCEDURAL_DENSITY_FOR_QUESTION_BANK';
                }
            }
        }
        
        if (context.proceduralProfile.practiceQuestions !== undefined) {
            const pqs = context.proceduralProfile.practiceQuestions;
            const solvable = pqs.filter(q => q.question_type !== 'reference_only');
            if (solvable.length === 0) {
                if (routing.proceduralApkg && routing.suppressions.proceduralApkg !== 'ZERO_PROCEDURAL_PATTERNS' && routing.suppressions.proceduralApkg !== 'INSUFFICIENT_PROCEDURAL_DENSITY_FOR_APKG') {
                    routing.proceduralApkg = false;
                    routing.suppressions.proceduralApkg = 'ZERO_SOLVABLE_PRACTICE_QUESTIONS';
                }
                if (routing.proceduralQuestionBank && routing.suppressions.proceduralQuestionBank !== 'ZERO_PROCEDURAL_PATTERNS' && routing.suppressions.proceduralQuestionBank !== 'INSUFFICIENT_PROCEDURAL_DENSITY_FOR_QUESTION_BANK') {
                    routing.proceduralQuestionBank = false;
                    routing.suppressions.proceduralQuestionBank = 'ZERO_SOLVABLE_PRACTICE_QUESTIONS';
                }
            }
        }
    }

    const hasVaultTargets = Array.isArray(context.candidateVaultTargets) && context.candidateVaultTargets.length > 0;
    const isRelational = context.visualProfile && context.visualProfile.dominant_structures && context.visualProfile.dominant_structures.length > 0;
    const isGraphEligible = (context.noteWordCount >= THRESHOLDS.GRAPH_MIN_WORDS) || (context.evidenceChars >= THRESHOLDS.GRAPH_MIN_CHARS) || isRelational;

    if (!isGraphEligible && !hasVaultTargets && !isRelational) {
        routing.bmGraph = false;
        routing.suppressions.bmGraph = 'NO_CANDIDATE_GRAPH_TARGETS'; // fallback simple suppression
    } else if (!hasVaultTargets && !isRelational) {
        routing.bmGraph = false;
        routing.suppressions.bmGraph = 'NO_CANDIDATE_GRAPH_TARGETS';
    } else if (!isGraphEligible) {
        routing.bmGraph = false;
        routing.suppressions.bmGraph = 'TRIVIAL_CONTENT_BELOW_GRAPH_THRESHOLD';
    } else {
        routing.bmGraph = true;
    }

    const isQaEligible = (context.noteWordCount >= THRESHOLDS.QA_MIN_WORDS) || context.isComplexDomain;
    if (!isQaEligible) {
        routing.bmQa = false;
        routing.suppressions.bmQa = 'TRIVIAL_CONTENT_BELOW_QA_THRESHOLD';
    } else {
        routing.bmQa = true;
    }
    
    if (routing.mindmap && (!isRelational && context.noteWordCount < 300)) {
        routing.mindmap = false;
        routing.suppressions.mindmap = 'NO_RELATIONAL_TOPOLOGY';
    }
    
    // Generic Readiness Gate
    if (context.readinessGating) {
        for (const [key, reason] of Object.entries(context.readinessGating)) {
            if (routing[key] && reason) {
                routing[key] = false;
                routing.suppressions[key] = typeof reason === 'string' ? reason : 'CONTEXT_NOT_READY';
            }
        }
    }

    return routing;
}

module.exports = {
    evaluateArtifactRouting
};

// --- CLI EXECUTION CONTRACT ---
if (require.main === module) {
    try {
        const args = process.argv.slice(2);
        let context = {};

        if (args.length === 0) {
            console.log(JSON.stringify(evaluateArtifactRouting({}), null, 2));
            process.exit(0);
        }

        for (let i = 0; i < args.length; i++) {
            if (args[i] === '--evidence' && args[i + 1]) {
                const evidencePath = args[++i];
                if (fs.existsSync(evidencePath)) {
                    const content = fs.readFileSync(evidencePath, 'utf8');
                    context.evidenceChars = content.length;
                    context.chapter = path.basename(evidencePath, path.extname(evidencePath));
                }
            } else if (args[i] === '--context' && args[i + 1]) {
                const raw = args[++i];
                context = raw.startsWith('{') ? JSON.parse(raw) : JSON.parse(fs.readFileSync(raw, 'utf8'));
            } else if (args[i].startsWith('{')) {
                context = JSON.parse(args[i]);
            } else if (fs.existsSync(args[i])) {
                const content = fs.readFileSync(args[i], 'utf8');
                try {
                    context = JSON.parse(content);
                } catch {
                    context.evidenceChars = content.length;
                }
            }
        }

        const result = evaluateArtifactRouting(context);
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error evaluating routing:", e.message);
        process.exit(1);
    }
}
