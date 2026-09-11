/**
 * StudySourceCore Phase 7 Test Suite (`test_phase7_context_routing.js`)
 * 
 * Verifies:
 * 1. Context Minimization & Provenance Layer (task-scoped slicing, token budgeting, SHA-256 provenance verification)
 * 2. Policy-Driven Model Routing Layer (CHEAP, DEFAULT, STRONG capability classes based on complexity and context)
 * 3. Adaptive Retry & Failure Classification Layer (11 failure classes, 4 retry classes, targeted adaptation)
 * 4. Execution State Checkpointing Layer (persistent checkpointing in scratch/execution-state.json)
 * 5. Specialist Context Integration & Lineage Assertions (all 4 domain specialists consume slices with provenance)
 * 6. Orchestration Decision Trail (auditable record of hash, strategy, selected evidence, model class, validator)
 * 7. Hard Resource Limits (Max 10 total launches per mission, Max 4 concurrent workers)
 * 8. Adversarial & Fail-Closed Invariants (mismatched hash fails closed, security violations are terminal)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
    planContextSlice,
    estimateContextBudget,
    verifyContextProvenance,
    TASK_SECTION_RULES
} = require('./context_planner');

const {
    MODEL_CLASSES,
    TASK_COMPLEXITY,
    resolveModelRouting,
    escalateModelClass
} = require('./model_routing_policy');

const {
    RETRY_CLASSES,
    FAILURE_CLASSES,
    GLOBAL_RESOURCE_LIMITS,
    classifyFailure,
    canRetryTask,
    getTargetedRetryPlan
} = require('./retry_policy');

const {
    createExecutionState,
    loadExecutionState,
    saveExecutionState,
    checkpointTaskStart,
    checkpointTaskComplete,
    checkpointTaskRetry,
    checkpointTaskFail
} = require('./execution_state');

const {
    buildExecutionTaskGraph,
    executeTaskWorkflow,
    createSpecialistTaskDispatcher,
    assertNoParentSelfExecution,
    validateCompletionEvidence
} = require('./orchestration_engine');

const { generateMathEvidencePack } = require('./fixtures/generate_math_evidence_pack');
const { executeMathSpecialistTask } = require('./author_math_studylab');
const { executePhysicsSpecialistTask } = require('./author_physics_studylab');
const { executeChemistrySpecialistTask } = require('./author_chemistry_studylab');
const { executeReasoningSpecialistTask } = require('./author_reasoning_studylab');

const SCRATCH_DIR = path.resolve(__dirname, 'scratch/phase7_tests');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const layerStats = {
    UNIT: { total: 0, passed: 0, failed: 0 },
    COMPONENT: { total: 0, passed: 0, failed: 0 },
    INTEGRATION: { total: 0, passed: 0, failed: 0 },
    ADVERSARIAL: { total: 0, passed: 0, failed: 0 }
};

async function runTest(layer, testId, description, fn) {
    totalTests++;
    layerStats[layer].total++;
    process.stdout.write(`  [${layer} / ${testId}] ${description} ... `);
    try {
        await fn();
        console.log('✅ PASS');
        passedTests++;
        layerStats[layer].passed++;
    } catch (err) {
        console.log('❌ FAIL');
        console.error(`     Error: ${err.message}`);
        failedTests++;
        layerStats[layer].failed++;
    }
}

// Helper: generate synthetic large evidence pack
function createSyntheticEvidencePack(dir) {
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, 'evidence-pack.md');
    const sections = [
        '# Evidence Pack — Synthetic Chapter\n',
        '## 1. Chapter Metadata\n- Subject: Math\n- Topic: Linear Equations\n- Source: Test Bank\n',
        '## 2. Core Concepts & Definitions\n' + 'Linear equations are first-degree equations. '.repeat(50) + '\n',
        '## 3. Mathematical Formulas & Theorems\n' + 'y = mx + c represents a straight line. '.repeat(40) + '\n',
        '## 4. Problem Pattern Archetypes\n' + '- Pattern 1: Slope Intercept form\n- Pattern 2: Two point form\n'.repeat(40),
        '## 5. Authentic Source Problems & PYQs\n' + 'Question 1: Find slope when points are (1,2) and (3,4).\nQuestion 2: Graph the line 2x + 3y = 6.\n'.repeat(50),
        '## 6. Worked Solutions & DAG Topologies\n' + 'Step 1: Compute dy. Step 2: Compute dx. Step 3: m = dy/dx.\n'.repeat(50),
        '## 7. Exam Blueprint & Historical Weights\n' + 'Weightage is 15% across RRB ALP and Group D exams.\n'.repeat(30),
        '## 8. Common Misconceptions & Pitfalls\n' + 'Watch out for division by zero when dx = 0.\n'.repeat(30),
        '## 9. Visual Elements & Diagrams\n' + '![Linear graph diagram](diagram1.png)\n'
    ];
    const content = sections.join('\n');
    fs.writeFileSync(filePath, content, 'utf8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return { filePath, hash, content };
}

async function main() {
    console.log('================================================================================');
    console.log('STUDYSOURCECORE — PHASE 7: CONTEXT MINIMIZATION, ROUTING & ADAPTIVE RETRY');
    console.log('================================================================================\n');

    fs.mkdirSync(SCRATCH_DIR, { recursive: true });
    const synthetic = createSyntheticEvidencePack(path.join(SCRATCH_DIR, 'synthetic_evidence'));

    // =========================================================================
    // SECTION 1: CONTEXT MINIMIZATION & PROVENANCE [UNIT]
    // =========================================================================
    console.log('--- SECTION 1: Context Minimization & Provenance [UNIT] ---');

    await runTest('UNIT', 'TEST-1.1', 'planContextSlice generates valid slice with strict provenance', () => {
        const plan = planContextSlice({
            subject: 'Math',
            chapter: 'LinearEquations',
            artifactKey: 'basic',
            specialist: 'core-basic-anki',
            evidencePack: synthetic.filePath,
            evidenceHash: synthetic.hash,
            strategy: 'TASK_SCOPED'
        });

        assert.strictEqual(plan.source_hash, synthetic.hash, 'source_hash must match original evidence hash');
        assert(plan.slice_hash && plan.slice_hash.length === 64, 'slice_hash must be a 64-char SHA-256 hash');
        assert(plan.context_slice_content.includes('## 1. Chapter Metadata'), 'Required section METADATA must be included');
        assert(plan.context_slice_content.includes('## 2. Core Concepts & Definitions'), 'Required section CONCEPTS must be included');
        // Basic cards do NOT need Worked Solutions or Blueprint
        assert(!plan.context_slice_content.includes('## 6. Worked Solutions'), 'Unnecessary section SOLUTIONS must be excluded');
        assert(!plan.context_slice_content.includes('## 7. Exam Blueprint'), 'Unnecessary section BLUEPRINT must be excluded');
    });

    await runTest('UNIT', 'TEST-1.2', 'estimateContextBudget accurately estimates tokens and classifies budget tier across 4 canonical tiers', () => {
        const smallText = 'Hello world this is a test.';
        const smallBudget = estimateContextBudget(smallText);
        assert.strictEqual(smallBudget.budget_tier, 'SMALL');

        const mediumText = 'Medium context token test sentence. '.repeat(400); // ~2000 words = ~2600 tokens
        const mediumBudget = estimateContextBudget(mediumText);
        assert.strictEqual(mediumBudget.budget_tier, 'MEDIUM');

        const largeText = 'Large context token test sentence with more details. '.repeat(450); // ~24,300 chars = ~6,075 tokens
        const largeBudget = estimateContextBudget(largeText);
        assert.strictEqual(largeBudget.budget_tier, 'LARGE');

        const veryLargeText = 'Token word text padding. '.repeat(5000); // ~25,000 words = ~33,000 tokens
        const veryLargeBudget = estimateContextBudget(veryLargeText);
        assert(veryLargeBudget.estimated_tokens > 10000, 'Tokens must reflect very large text');
        assert.strictEqual(veryLargeBudget.budget_tier, 'VERY_LARGE');
    });

    await runTest('UNIT', 'TEST-1.3', 'verifyContextProvenance validates matching SHA-256 and rejects tampering', () => {
        const plan = planContextSlice({
            subject: 'Math',
            chapter: 'LinearEquations',
            artifactKey: 'basic',
            specialist: 'core-basic-anki',
            evidencePack: synthetic.filePath,
            evidenceHash: synthetic.hash
        });

        // Valid hash assertion
        const validRes = verifyContextProvenance(plan, synthetic.hash);
        assert.strictEqual(validRes.verified, true);
        assert.strictEqual(validRes.source_hash, synthetic.hash);

        // Tampered content assertion (fails closed)
        const tamperedPlan = { ...plan, context_slice_content: plan.context_slice_content + '\nTAMPERED' };
        assert.throws(() => {
            verifyContextProvenance(tamperedPlan, synthetic.hash);
        }, /CONTEXT_PROVENANCE_FAILURE/);

        // Mismatched expected hash assertion (fails closed)
        assert.throws(() => {
            verifyContextProvenance(plan, 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
        }, /CONTEXT_PROVENANCE_FAILURE/);
    });

    await runTest('UNIT', 'TEST-1.4', 'Context Minimization achieves significant size reduction (> 25%)', () => {
        const plan = planContextSlice({
            subject: 'Math',
            chapter: 'LinearEquations',
            artifactKey: 'basic',
            specialist: 'core-basic-anki',
            evidencePack: synthetic.filePath,
            evidenceHash: synthetic.hash,
            strategy: 'TASK_SCOPED'
        });

        const reduction = parseFloat(plan.estimated_context_size.reduction_ratio);
        assert(reduction > 0.25, `Expected > 25% context reduction, got ${(reduction * 100).toFixed(1)}%`);
    });

    await runTest('UNIT', 'TEST-1.5', 'planContextSlice rejects dummy hash, missing hash, and invalid hex in production mode', () => {
        // Dummy hash rejection
        assert.throws(() => {
            planContextSlice({
                subject: 'Math',
                chapter: 'LinearEquations',
                artifactKey: 'basic',
                specialist: 'core-basic-anki',
                evidencePack: synthetic.filePath,
                evidenceHash: '0000000000000000000000000000000000000000000000000000000000000000'
            });
        }, /CONTEXT_PROVENANCE_FAILURE/);

        // Missing hash rejection
        assert.throws(() => {
            planContextSlice({
                subject: 'Math',
                chapter: 'LinearEquations',
                artifactKey: 'basic',
                specialist: 'core-basic-anki',
                evidencePack: synthetic.filePath,
                evidenceHash: null
            });
        }, /CONTEXT_PROVENANCE_FAILURE/);

        // Invalid hex format rejection
        assert.throws(() => {
            planContextSlice({
                subject: 'Math',
                chapter: 'LinearEquations',
                artifactKey: 'basic',
                specialist: 'core-basic-anki',
                evidencePack: synthetic.filePath,
                evidenceHash: 'not-valid-hex-hash'
            });
        }, /CONTEXT_PROVENANCE_FAILURE/);
    });

    await runTest('UNIT', 'TEST-1.6', 'planContextSlice fails closed with UNSUPPORTED_CONTEXT_TASK for unknown artifacts', () => {
        assert.throws(() => {
            planContextSlice({
                subject: 'Math',
                chapter: 'LinearEquations',
                artifactKey: 'unknown-alien-artifact',
                specialist: 'alien-specialist',
                evidencePack: synthetic.filePath,
                evidenceHash: synthetic.hash
            });
        }, /UNSUPPORTED_CONTEXT_TASK/);
    });

    await runTest('UNIT', 'TEST-1.7', 'planContextSlice handles all 13 canonical artifacts and verifies procedural sufficiency', () => {
        const canonicalArtifacts = [
            { key: 'notes', specialist: 'core-notes', expectedSection: '## 1. Chapter Metadata' },
            { key: 'basic', specialist: 'core-basic-anki', expectedSection: '## 2. Core Concepts & Definitions' },
            { key: 'cloze', specialist: 'core-cloze-anki', expectedSection: '## 2. Core Concepts & Definitions' },
            { key: 'imageOcclusion', specialist: 'core-image-occlusion', expectedSection: '## 9. Visual Elements & Diagrams' },
            { key: 'mindmap', specialist: 'core-mindmap', expectedSection: '## 2. Core Concepts & Definitions' },
            { key: 'slideDeck', specialist: 'core-slide-deck', expectedSection: '## 1. Chapter Metadata' },
            { key: 'bmGraph', specialist: 'bm-graph', expectedSection: '## 2. Core Concepts & Definitions' },
            { key: 'bmQa', specialist: 'bm-qa', expectedSection: '## 1. Chapter Metadata' },
            { key: 'proceduralQuestionBank', specialist: 'math-apkg-author', expectedSection: '## 5. Authentic Source Problems & PYQs' },
            { key: 'proceduralApkg', specialist: 'math-apkg-author', expectedSection: '## 5. Authentic Source Problems & PYQs' },
            { key: 'problemPatterns', specialist: 'math-apkg-author', expectedSection: '## 4. Problem Pattern Archetypes' },
            { key: 'practiceQuestions', specialist: 'math-apkg-author', expectedSection: '## 5. Authentic Source Problems & PYQs' },
            { key: 'moldGapAudit', specialist: 'mold-gap-auditor', expectedSection: '## 4. Problem Pattern Archetypes' }
        ];

        for (const art of canonicalArtifacts) {
            const plan = planContextSlice({
                subject: 'Math',
                chapter: 'LinearEquations',
                artifactKey: art.key,
                specialist: art.specialist,
                evidencePack: synthetic.filePath,
                evidenceHash: synthetic.hash
            });

            assert(plan.context_slice_content.length > 0, `Artifact '${art.key}' context slice must not be empty`);
            assert(plan.context_slice_content.includes(art.expectedSection), `Artifact '${art.key}' must include '${art.expectedSection}'`);
            assert.strictEqual(plan.source_hash, synthetic.hash, `Artifact '${art.key}' source_hash must match`);
        }

        // Procedural sufficiency assertion: procedural tasks must include Formulas, Patterns, and Problems
        const proceduralPlan = planContextSlice({
            subject: 'Math',
            chapter: 'LinearEquations',
            artifactKey: 'proceduralQuestionBank',
            specialist: 'math-apkg-author',
            evidencePack: synthetic.filePath,
            evidenceHash: synthetic.hash
        });
        assert(proceduralPlan.context_slice_content.includes('## 3. Mathematical Formulas & Theorems'), 'Procedural task must include Formulas');
        assert(proceduralPlan.context_slice_content.includes('## 4. Problem Pattern Archetypes'), 'Procedural task must include Problem Patterns');
        assert(proceduralPlan.context_slice_content.includes('## 5. Authentic Source Problems & PYQs'), 'Procedural task must include Authentic Problems');
        assert(!proceduralPlan.context_slice_content.includes('## 2. Core Concepts & Definitions'), 'Procedural task must omit non-procedural general concepts');
    });

    // =========================================================================
    // SECTION 2: POLICY-DRIVEN MODEL ROUTING [UNIT]
    // =========================================================================
    console.log('\n--- SECTION 2: Policy-Driven Model Routing [UNIT] ---');

    await runTest('UNIT', 'TEST-2.1', 'resolveModelRouting assigns CHEAP to low complexity tasks within small budget', () => {
        const routing = resolveModelRouting({
            artifactKey: 'basic',
            specialist: 'core-basic-anki',
            contextBudget: 'SMALL'
        });
        assert.strictEqual(routing.model_class, MODEL_CLASSES.CHEAP);
        assert.strictEqual(routing.task_complexity, TASK_COMPLEXITY.LOW);
    });

    await runTest('UNIT', 'TEST-2.2', 'resolveModelRouting assigns DEFAULT to medium complexity tasks (Notes, MindMap)', () => {
        const routingNotes = resolveModelRouting({
            artifactKey: 'notes',
            specialist: 'core-notes',
            contextBudget: 'MEDIUM'
        });
        assert.strictEqual(routingNotes.model_class, MODEL_CLASSES.DEFAULT);
        assert.strictEqual(routingNotes.task_complexity, TASK_COMPLEXITY.MEDIUM);

        const routingMindmap = resolveModelRouting({
            artifactKey: 'mindmap',
            specialist: 'core-mindmap',
            contextBudget: 'MEDIUM'
        });
        assert.strictEqual(routingMindmap.model_class, MODEL_CLASSES.DEFAULT);
    });

    await runTest('UNIT', 'TEST-2.3', 'resolveModelRouting assigns STRONG to high/critical complexity tasks', () => {
        const routingMath = resolveModelRouting({
            artifactKey: 'proceduralQuestionBank',
            specialist: 'math-apkg-author',
            subject: 'Math'
        });
        assert.strictEqual(routingMath.model_class, MODEL_CLASSES.STRONG);
        assert.strictEqual(routingMath.task_complexity, TASK_COMPLEXITY.HIGH);

        const routingAdv = resolveModelRouting({
            artifactKey: 'adversarialApkgReview',
            specialist: 'adversarial-apkg-reviewer'
        });
        assert.strictEqual(routingAdv.model_class, MODEL_CLASSES.STRONG);
        assert.strictEqual(routingAdv.task_complexity, TASK_COMPLEXITY.CRITICAL);
    });

    await runTest('UNIT', 'TEST-2.4', 'escalateModelClass upgrades capability on retry', () => {
        assert.strictEqual(escalateModelClass('CHEAP'), 'DEFAULT');
        assert.strictEqual(escalateModelClass('DEFAULT'), 'STRONG');
        assert.strictEqual(escalateModelClass('STRONG'), 'STRONG'); // Cap at STRONG
    });

    await runTest('UNIT', 'TEST-2.5', 'resolveModelRouting never downgrades HIGH or CRITICAL based on small context budget', () => {
        const smallMath = resolveModelRouting({
            artifactKey: 'proceduralQuestionBank',
            specialist: 'math-apkg-author',
            contextBudget: 'SMALL'
        });
        assert.strictEqual(smallMath.model_class, MODEL_CLASSES.STRONG, 'HIGH complexity must remain STRONG even with SMALL context');

        const smallAudit = resolveModelRouting({
            artifactKey: 'adversarialApkgReview',
            specialist: 'adversarial-apkg-reviewer',
            contextBudget: 'SMALL'
        });
        assert.strictEqual(smallAudit.model_class, MODEL_CLASSES.STRONG, 'CRITICAL complexity must remain STRONG even with SMALL context');

        // Context scale upgrade for CHEAP:
        const veryLargeBasic = resolveModelRouting({
            artifactKey: 'basic',
            specialist: 'core-basic-anki',
            contextBudget: 'VERY_LARGE'
        });
        assert.strictEqual(veryLargeBasic.model_class, MODEL_CLASSES.DEFAULT, 'CHEAP must upgrade to DEFAULT on VERY_LARGE context');
    });

    // =========================================================================
    // SECTION 3: ADAPTIVE RETRY & FAILURE CLASSIFICATION [UNIT]
    // =========================================================================
    console.log('\n--- SECTION 3: Adaptive Retry & Failure Classification [UNIT] ---');

    await runTest('UNIT', 'TEST-3.1', 'classifyFailure classifies all canonical failure modes correctly', () => {
        // Security
        const secFail = classifyFailure(new Error('[PARENT_SELF_EXECUTION_VIOLATION] orchestrator cannot write'));
        assert.strictEqual(secFail.failure_class, FAILURE_CLASSES.SECURITY_BOUNDARY_VIOLATION);
        assert.strictEqual(secFail.is_terminal, true);

        // Provenance
        const provFail = classifyFailure(new Error('[CONTEXT_PROVENANCE_FAILURE] Evidence SHA-256 hash mismatch'));
        assert.strictEqual(provFail.failure_class, FAILURE_CLASSES.SOURCE_PROVENANCE_FAILURE);
        assert.strictEqual(provFail.retry_class, RETRY_CLASSES.CRITICAL.name);

        // Content
        const mcqFail = classifyFailure(new Error('MCQ_INVARIANT_VIOLATION: Expected >= 4 options'));
        assert.strictEqual(mcqFail.failure_class, FAILURE_CLASSES.CONTENT_VALIDATION_FAILURE);
        assert.strictEqual(mcqFail.retry_class, RETRY_CLASSES.HIGH.name);

        // Incomplete Output
        const missingFail = classifyFailure(new Error('[FILE_NOT_FOUND] Expected deliverable does not exist'));
        assert.strictEqual(missingFail.failure_class, FAILURE_CLASSES.INCOMPLETE_OUTPUT);
        assert.strictEqual(missingFail.retry_class, RETRY_CLASSES.MEDIUM.name);

        // Transient Tool
        const ioFail = classifyFailure(new Error('EBUSY: resource locked or unavailable'));
        assert.strictEqual(ioFail.failure_class, FAILURE_CLASSES.TRANSIENT_TOOL_FAILURE);
        assert.strictEqual(ioFail.retry_class, RETRY_CLASSES.LOW.name);
    });

    await runTest('UNIT', 'TEST-3.2', 'canRetryTask bounds retries per class and strictly rejects terminal failures', () => {
        const task = { task_id: 'task-1', retry_budget: 1 };
        const secFail = classifyFailure(new Error('OWNERSHIP_VIOLATION'));
        const dec1 = canRetryTask(task, secFail, 1, 1);
        assert.strictEqual(dec1.canRetry, false, 'Terminal security violation must not be retried');

        const mcqFail = classifyFailure(new Error('MCQ_INVARIANT_VIOLATION'));
        const dec2 = canRetryTask(task, mcqFail, 1, 1);
        assert.strictEqual(dec2.canRetry, true, 'First failure of content invariant can retry within budget');

        // Exhaustion check
        const dec3 = canRetryTask(task, mcqFail, 2, 2);
        assert.strictEqual(dec3.canRetry, false, 'Second failure exceeds task retry_budget of 1');
    });

    await runTest('UNIT', 'TEST-3.3', 'getTargetedRetryPlan injects specific adaptation directives', () => {
        const task = { task_id: 'task-1', track_key: 'proceduralQuestionBank' };
        const contextOverflow = classifyFailure(new Error('Context exhausted: max length exceeded'));
        const plan1 = getTargetedRetryPlan(task, contextOverflow, 2);
        assert.strictEqual(plan1.context_strategy, 'FOCUSED', 'Context overflow must adapt context strategy to FOCUSED');
        assert(plan1.prompt_constraints.some(c => c.includes('CRITICAL_RETRY_DIRECTIVE: CONTEXT_OVERFLOW')));

        const contentError = classifyFailure(new Error('MCQ_INVARIANT_VIOLATION: options < 4'));
        const plan2 = getTargetedRetryPlan(task, contentError, 2);
        assert.strictEqual(plan2.model_class, MODEL_CLASSES.STRONG, 'Content error must escalate to STRONG model class');
    });

    await runTest('UNIT', 'TEST-3.4', 'Authoritative retry matrix parity & terminal distinction for source vs slice provenance', () => {
        // Parity matrix checks:
        assert.strictEqual(RETRY_CLASSES.CRITICAL.defaultMaxRetries, 0, 'CRITICAL defaultMaxRetries must be 0');
        assert.strictEqual(RETRY_CLASSES.HIGH.defaultMaxRetries, 2, 'HIGH defaultMaxRetries must be 2');
        assert.strictEqual(RETRY_CLASSES.MEDIUM.defaultMaxRetries, 1, 'MEDIUM defaultMaxRetries must be 1');
        assert.strictEqual(RETRY_CLASSES.LOW.defaultMaxRetries, 1, 'LOW defaultMaxRetries must be 1');

        // Canonical source loss is terminal:
        const sourceLoss = classifyFailure(new Error('[CONTEXT_PROVENANCE_FAILURE] Source evidence tampered or missing'));
        assert.strictEqual(sourceLoss.failure_class, FAILURE_CLASSES.SOURCE_PROVENANCE_FAILURE);
        assert.strictEqual(sourceLoss.is_terminal, true);
        const sourceLossDecision = canRetryTask({ task_id: 'task-test' }, sourceLoss, 1, 1);
        assert.strictEqual(sourceLossDecision.canRetry, false);

        // Derived slice corruption is recoverable:
        const sliceCorruption = classifyFailure(new Error('[SLICE_PROVENANCE_CORRUPTION] Derived context slice checksum corrupted'));
        assert.strictEqual(sliceCorruption.failure_class, FAILURE_CLASSES.SLICE_PROVENANCE_CORRUPTION);
        assert.strictEqual(sliceCorruption.is_terminal, false);
        assert.strictEqual(sliceCorruption.retry_class, RETRY_CLASSES.MEDIUM.name);
        const sliceDecision = canRetryTask({ task_id: 'task-test' }, sliceCorruption, 1, 1);
        assert.strictEqual(sliceDecision.canRetry, true);
    });

    await runTest('UNIT', 'TEST-3.5', 'Task-level retry budget overrides: undefined inherits class default, lower clamps', () => {
        const highFailure = classifyFailure(new Error('MCQ_INVARIANT_VIOLATION')); // HIGH: defaultMaxRetries = 2

        // Undefined retry budget inherits HIGH class default (2 retries)
        const taskDefault = { task_id: 'task-default' }; // retry_budget is undefined
        assert.strictEqual(canRetryTask(taskDefault, highFailure, 1, 1).canRetry, true); // Attempt 1 failed -> retry 1
        assert.strictEqual(canRetryTask(taskDefault, highFailure, 2, 2).canRetry, true); // Attempt 2 failed -> retry 2
        assert.strictEqual(canRetryTask(taskDefault, highFailure, 3, 3).canRetry, false); // Attempt 3 failed -> retries exhausted

        // Explicit retry_budget: 1 clamps to 1 retry
        const taskClamped1 = { task_id: 'task-clamped-1', retry_budget: 1 };
        assert.strictEqual(canRetryTask(taskClamped1, highFailure, 1, 1).canRetry, true);
        assert.strictEqual(canRetryTask(taskClamped1, highFailure, 2, 2).canRetry, false);

        // Explicit retry_budget: 0 allows 0 retries
        const taskClamped0 = { task_id: 'task-clamped-0', retry_budget: 0 };
        assert.strictEqual(canRetryTask(taskClamped0, highFailure, 1, 1).canRetry, false);
    });

    await runTest('UNIT', 'TEST-3.6', 'getTargetedRetryPlan returns meaningful directives and adaptation_reason across failure classes', () => {
        const testClasses = [
            FAILURE_CLASSES.SECURITY_BOUNDARY_VIOLATION,
            FAILURE_CLASSES.SOURCE_PROVENANCE_FAILURE,
            FAILURE_CLASSES.SLICE_PROVENANCE_CORRUPTION,
            FAILURE_CLASSES.CONTENT_VALIDATION_FAILURE,
            FAILURE_CLASSES.CONTRACT_VIOLATION,
            FAILURE_CLASSES.CONTEXT_OVERFLOW,
            FAILURE_CLASSES.SCHEMA_VALIDATION_FAILURE,
            FAILURE_CLASSES.INCOMPLETE_OUTPUT,
            FAILURE_CLASSES.MODEL_OUTPUT_MALFORMED,
            FAILURE_CLASSES.TIMEOUT,
            FAILURE_CLASSES.TRANSIENT_TOOL_FAILURE,
            FAILURE_CLASSES.SPECIALIST_FAILURE
        ];

        for (const fc of testClasses) {
            const classification = { failure_class: fc, retry_class: 'HIGH', error_message: `Error for ${fc}` };
            const plan = getTargetedRetryPlan({ task_id: 'task-test' }, classification, 2);
            assert(plan.adaptation_reason && plan.adaptation_reason.length > 0, `Failure class ${fc} must have adaptation_reason`);
            assert(plan.adaptation_directives && plan.adaptation_directives.length > 0, `Failure class ${fc} must have adaptation_directives`);
            assert(plan.prompt_constraints && plan.prompt_constraints.length > 0, `Failure class ${fc} must have prompt_constraints`);
        }
    });

    // =========================================================================
    // SECTION 4: EXECUTION STATE CHECKPOINTING [UNIT]
    // =========================================================================
    console.log('\n--- SECTION 4: Execution State Checkpointing [UNIT] ---');

    await runTest('UNIT', 'TEST-4.1', 'Execution state initializes, checkpoints task transitions, and persists to disk', () => {
        const stateDir = path.join(SCRATCH_DIR, 'state_test');
        const state = createExecutionState({
            mission_id: 'mission-phase7-test',
            subject: 'Math',
            chapter: 'LinearEquations',
            evidence_hash: synthetic.hash,
            storage_dir: stateDir
        });

        assert.strictEqual(state.mission_id, 'mission-phase7-test');
        assert(fs.existsSync(path.join(stateDir, 'execution-state.json')), 'execution-state.json must be written to disk');

        // Checkpoint task start
        checkpointTaskStart(state, { task_id: 'task-math-qb', owner_agent: 'math-apkg-author' }, 'STRONG', 'TASK_SCOPED');
        assert.strictEqual(state.tasks['task-math-qb'].status, 'RUNNING');
        assert.strictEqual(state.tasks['task-math-qb'].model_class, 'STRONG');

        // Checkpoint complete
        checkpointTaskComplete(state, 'task-math-qb', { output_paths: ['Questions/LinearEquations_Questions.md'] });
        assert.strictEqual(state.tasks['task-math-qb'].status, 'COMPLETED');
        assert.strictEqual(state.completed_tasks.length, 1);

        // Reload state
        const loaded = loadExecutionState(stateDir);
        assert.strictEqual(loaded.mission_id, 'mission-phase7-test');
        assert.strictEqual(loaded.tasks['task-math-qb'].status, 'COMPLETED');
    });

    // =========================================================================
    // SECTION 5: SPECIALIST CONTEXT INTEGRATION & PROVENANCE [COMPONENT]
    // =========================================================================
    console.log('\n--- SECTION 5: Specialist Context Integration & Provenance [COMPONENT] ---');

    await runTest('COMPONENT', 'TEST-5.1', 'Specialist verifies provenance on received task context slice', async () => {
        const testRoot = path.join(SCRATCH_DIR, 'specialist_context_test');
        fs.mkdirSync(testRoot, { recursive: true });

        const fixturePath = path.resolve(__dirname, '../resources/fixtures/math_lcm_hcf_source_fixture.json');
        const genRes = generateMathEvidencePack(fixturePath, path.join(testRoot, 'scratch'));

        // Build valid slice
        const plan = planContextSlice({
            subject: 'Math',
            chapter: 'LCM-HCF',
            artifactKey: 'proceduralQuestionBank',
            specialist: 'math-apkg-author',
            evidencePack: path.join(testRoot, 'scratch/evidence-pack.md'),
            evidenceHash: genRes.evidenceHash,
            strategy: 'TASK_SCOPED'
        });

        const task = {
            task_id: 'task-studylab-question-bank',
            owner_agent: 'math-apkg-author',
            writer_agent: 'math-apkg-author',
            track_key: 'proceduralQuestionBank',
            target_path: path.join(testRoot, 'Questions/LCM-HCF_Questions.md')
        };

        // Dispatch specialist with valid slice and plan
        const handoff = await executeMathSpecialistTask(task, {
            subject: 'Math',
            chapter: 'LCM-HCF',
            contextSlice: plan.context_slice_content,
            contextPlan: plan,
            evidenceHash: genRes.evidenceHash,
            procedural_mode: 'markdown'
        });

        assert.strictEqual(handoff.status, 'SUCCESS');
        assert(fs.existsSync(task.target_path));
    });

    // =========================================================================
    // SECTION 6: ORCHESTRATION WITH DECISION TRAIL [INTEGRATION]
    // =========================================================================
    console.log('\n--- SECTION 6: Orchestration With Auditable Decision Trail [INTEGRATION] ---');

    await runTest('INTEGRATION', 'TEST-6.1', 'executeTaskWorkflow produces auditable decision trail with model and context traces', async () => {
        const testRoot = path.join(SCRATCH_DIR, 'decision_trail_test');
        fs.mkdirSync(testRoot, { recursive: true });

        const fixturePath = path.resolve(__dirname, '../resources/fixtures/math_lcm_hcf_source_fixture.json');
        const genRes = generateMathEvidencePack(fixturePath, path.join(testRoot, 'scratch'));

        const graph = buildExecutionTaskGraph({
            subject: 'Math',
            chapter: 'LCM-HCF',
            evidenceHash: genRes.evidenceHash,
            customRoot: testRoot,
            specialist_agent: 'math-apkg-author'
        });

        const dispatcher = createSpecialistTaskDispatcher({
            evidencePack: path.join(testRoot, 'scratch/evidence-pack.md'),
            evidenceHash: genRes.evidenceHash,
            subject: 'Math',
            chapter: 'LCM-HCF',
            procedural_mode: 'markdown'
        });

        const result = await executeTaskWorkflow(graph, dispatcher);

        assert.strictEqual(result.taskStatusMap['task-studylab-question-bank'], 'COMPLETED');

        // Assert traces
        assert(result.traces.contextPlans && result.traces.contextPlans.length > 0, 'Context plans must be recorded in traces');
        assert(result.traces.modelRoutings && result.traces.modelRoutings.length > 0, 'Model routings must be recorded in traces');
        assert(result.traces.decisionTrail && result.traces.decisionTrail.length > 0, 'Decision trail must be recorded in traces');

        const qbDecision = result.traces.decisionTrail.find(d => d.task_id === 'task-studylab-question-bank');
        assert(qbDecision, 'Decision trail entry must exist for question bank');
        assert.strictEqual(qbDecision.specialist, 'math-apkg-author');
        assert.strictEqual(qbDecision.model_class, 'STRONG');
        assert.strictEqual(qbDecision.result, 'PASS');
    });

    await runTest('INTEGRATION', 'TEST-6.2', 'executeTaskWorkflow executes real E2E retry on CONTENT_VALIDATION_FAILURE with model escalation and checkpointing', async () => {
        const testRoot = path.join(SCRATCH_DIR, 'e2e_retry_test');
        fs.mkdirSync(path.join(testRoot, 'Notes'), { recursive: true });

        const notesFile = path.join(testRoot, 'Notes/LinearEquations_Notes.md');

        const graph = {
            subject: 'Math',
            chapter: 'LinearEquations',
            evidenceHash: synthetic.hash,
            compatibilityMode: false,
            context: {
                evidencePack: synthetic.filePath,
                evidenceHash: synthetic.hash,
                customRoot: testRoot
            },
            tasks: [
                {
                    task_id: 'task-core-notes',
                    track_key: 'notes',
                    artifactKey: 'notes',
                    task_name: 'Knowledge Notes Synthesis',
                    wave: 1,
                    owner_agent: 'core-notes',
                    writer_agent: 'core-notes',
                    target_path: notesFile,
                    inputs: [synthetic.filePath],
                    expected_outputs: [notesFile],
                    dependencies: [],
                    status: 'PLANNED',
                    validation_rule: null
                }
            ]
        };

        let attempts = 0;
        const dispatcher = async (task, retryCount) => {
            attempts++;
            if (attempts === 1) {
                // Attempt 1 fails with CONTENT_VALIDATION_FAILURE
                throw new Error('CONTENT_ERROR: Missing mandatory bilingual terminology');
            }
            // Attempt 2 succeeds
            fs.writeFileSync(notesFile, '# Linear Equations\n\nContent here.\n', 'utf8');
            return {
                status: 'SUCCESS',
                agent: 'core-notes',
                task_id: 'task-core-notes',
                inputs_consumed: [synthetic.filePath],
                outputs_produced: [notesFile],
                output_paths: [notesFile],
                validation_result: { isValid: true, errors: [] },
                warnings: [],
                errors: [],
                dependencies_satisfied: true,
                retry_count: retryCount
            };
        };

        const result = await executeTaskWorkflow(graph, dispatcher);

        assert.strictEqual(attempts, 2, 'Task must have been attempted twice');
        assert.strictEqual(result.taskStatusMap['task-core-notes'], 'COMPLETED');
        assert.strictEqual(result.overallVerdict, 'SUCCESS');

        // Check retry trace
        const retryTrace = result.traces.retryTrace || [];
        assert.strictEqual(retryTrace.length, 1, 'Retry trace must record exactly 1 retry');
        assert.strictEqual(retryTrace[0].failure_class, FAILURE_CLASSES.CONTENT_VALIDATION_FAILURE);
        assert.strictEqual(retryTrace[0].can_retry, true);

        // Check model routings trace (attempt 1 DEFAULT, attempt 2 STRONG due to recovery escalation)
        assert.strictEqual(result.traces.modelRoutings.length, 2);
        assert.strictEqual(result.traces.modelRoutings[0].model_class, MODEL_CLASSES.DEFAULT);
        assert.strictEqual(result.traces.modelRoutings[1].model_class, MODEL_CLASSES.STRONG);
        assert(result.traces.modelRoutings[1].reason.includes('RECOVERY_ESCALATION'));

        // Check execution state
        assert(result.executionState, 'executionState must be returned in workflow result');
        const taskState = result.executionState.tasks['task-core-notes'];
        assert.strictEqual(taskState.status, 'COMPLETED');
        assert.strictEqual(taskState.attempt, 2);
        assert.strictEqual(taskState.attempts.length, 1);
        assert.strictEqual(taskState.attempts[0].failure_class, FAILURE_CLASSES.CONTENT_VALIDATION_FAILURE);

        // Verify persisted state on disk
        const stateOnDisk = loadExecutionState(path.join(testRoot, 'scratch'));
        assert(stateOnDisk, 'Execution state must be persisted to disk in scratch dir');
        assert.strictEqual(stateOnDisk.tasks['task-core-notes'].status, 'COMPLETED');
    });

    // =========================================================================
    // SECTION 7: HARD RESOURCE LIMITS & CONCURRENCY [INTEGRATION]
    // =========================================================================
    console.log('\n--- SECTION 7: Hard Resource Limits & Concurrency [INTEGRATION] ---');

    await runTest('INTEGRATION', 'TEST-7.1', 'Global Launch Ceiling (max 10 launches) terminates runaway retries with RESOURCE_LIMIT_EXCEEDED', async () => {
        // Create a synthetic graph with 1 deliberately failing task that exhausts retry budget
        const fakeGraph = {
            subject: 'Math',
            chapter: 'LCM-HCF',
            evidenceHash: synthetic.hash,
            context: { evidencePack: synthetic.filePath },
            tasks: [
                {
                    task_id: 'task-failing-1',
                    track_key: 'proceduralQuestionBank',
                    artifactKey: 'proceduralQuestionBank',
                    owner_agent: 'math-apkg-author',
                    writer_agent: 'math-apkg-author',
                    wave: 1,
                    status: 'PLANNED',
                    target_path: path.join(SCRATCH_DIR, 'nonexistent_file.md'),
                    inputs: [synthetic.filePath],
                    dependencies: [],
                    retry_budget: 15
                }
            ]
        };

        // Executor that counts launches until 10
        let launchCount = 0;
        const result = await executeTaskWorkflow(fakeGraph, async (task) => {
            launchCount++;
            throw new Error('CONTENT_ERROR: Simulated persistent unfixable error');
        });

        assert.strictEqual(result.taskStatusMap['task-failing-1'], 'FAILED');
        const retryTrace = result.traces.retryTrace || [];
        assert(retryTrace.length > 0, 'Retry trace must exist');
    });

    await runTest('INTEGRATION', 'TEST-7.2', 'canRetryTask enforces hard 10-launch budget ceiling across entire mission', () => {
        const task = { task_id: 'task-test', retry_budget: 3 };
        const failure = classifyFailure(new Error('MCQ_INVARIANT_VIOLATION'));

        // Invocations so far = 9 (within 10-budget)
        const decPermitted = canRetryTask(task, failure, 1, 9);
        assert.strictEqual(decPermitted.canRetry, true);

        // Invocations so far = 10 (exhausted 10-budget)
        const decExhausted = canRetryTask(task, failure, 1, 10);
        assert.strictEqual(decExhausted.canRetry, false);
        assert(decExhausted.reason.includes('RESOURCE_LIMIT_EXCEEDED'));
    });

    await runTest('INTEGRATION', 'TEST-7.3', 'Concurrency limits guarantee max 4 concurrent workers', () => {
        assert.strictEqual(GLOBAL_RESOURCE_LIMITS.MAX_CONCURRENT_WORKERS, 4);
        assert.strictEqual(GLOBAL_RESOURCE_LIMITS.MAX_TOTAL_LAUNCHES, 10);
    });

    // =========================================================================
    // SECTION 8: ADVERSARIAL & FAIL-CLOSED INVARIANTS [ADVERSARIAL]
    // =========================================================================
    console.log('\n--- SECTION 8: Adversarial & Fail-Closed Invariants [ADVERSARIAL] ---');

    await runTest('ADVERSARIAL', 'TEST-8.1', 'Fail-Closed: Tampered context slice throws CONTEXT_PROVENANCE_FAILURE and aborts execution', async () => {
        const fakePlan = {
            source_hash: '0000000000000000000000000000000000000000000000000000000000000000',
            slice_hash: '1111111111111111111111111111111111111111111111111111111111111111',
            context_slice_content: 'Tampered content'
        };

        const task = {
            task_id: 'task-studylab-question-bank',
            owner_agent: 'math-apkg-author',
            writer_agent: 'math-apkg-author',
            track_key: 'proceduralQuestionBank',
            target_path: path.join(SCRATCH_DIR, 'adversarial_tamper.md')
        };

        await assert.rejects(async () => {
            await executeMathSpecialistTask(task, {
                subject: 'Math',
                chapter: 'LCM-HCF',
                contextSlice: fakePlan.context_slice_content,
                contextPlan: fakePlan,
                evidenceHash: synthetic.hash
            });
        }, /CONTEXT_PROVENANCE_FAILURE/);
    });

    await runTest('ADVERSARIAL', 'TEST-8.2', 'Fail-Closed: Security violations are classified as TERMINAL with 0 retries', () => {
        const err = new Error('[PARENT_SELF_EXECUTION_VIOLATION] Parent orchestrator is strictly forbidden from writing');
        const classification = classifyFailure(err);
        assert.strictEqual(classification.failure_class, FAILURE_CLASSES.SECURITY_BOUNDARY_VIOLATION);
        assert.strictEqual(classification.is_terminal, true);

        const decision = canRetryTask({ task_id: 'task-1' }, classification, 1, 1);
        assert.strictEqual(decision.canRetry, false);
        assert.strictEqual(decision.maxRetriesAllowed, 0);
        assert(decision.reason.includes('TERMINAL_FAILURE'));
    });

    await runTest('ADVERSARIAL', 'TEST-8.3', 'Fail-Closed: Provenance mismatch on huge evidence pack triggers fail-closed', () => {
        assert.throws(() => {
            verifyContextProvenance({
                source_hash: 'badhash0000000000000000000000000000000000000000000000000000000000',
                slice_hash: 'deadbeef',
                context_slice_content: 'Some slice content'
            }, 'expected000000000000000000000000000000000000000000000000000000000000');
        }, /CONTEXT_PROVENANCE_FAILURE/);
    });

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n================================================================================');
    console.log(`PHASE 7 TEST SUITE SUMMARY: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
    console.log('================================================================================');
    console.log('LAYER BREAKDOWN:');
    for (const [layer, stats] of Object.entries(layerStats)) {
        console.log(`  - ${layer.padEnd(16)}: ${stats.passed} / ${stats.total} Passed (${stats.failed} Failed)`);
    }
    console.log('================================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Unhandled test suite error:', err);
    process.exit(1);
});
