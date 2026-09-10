/**
 * study-source-core Orchestration Self-Test (test_orchestration.js)
 * 
 * Validates skill-level Adaptive Orchestration v4 policy configuration,
 * mandatory dispatch gate rules, dynamic workforce sizing, handoff contracts,
 * single-writer constraints, and risk-scaled verifier triggers.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SKILL_DIR = path.resolve(__dirname, '..');

/**
 * Standard required fields in specialist handoff contract.
 */
const REQUIRED_HANDOFF_FIELDS = [
    'MISSION',
    'SCOPE',
    'FILES_INSPECTED',
    'FINDINGS',
    'EVIDENCE',
    'RISKS',
    'RECOMMENDATION',
    'UNKNOWNS',
    'HANDOFF_STATUS'
];

/**
 * Evaluates orchestration workforce requirements based on task topology.
 * 
 * @param {Object} task
 * @param {Array<string>} [task.domains=[]] - Involved domains or sibling artifact layers
 * @param {number} [task.fileCount=1] - Number of files affected
 * @param {boolean} [task.isMultiDomain=false] - Multi-domain / multi-layer indicator
 * @param {boolean} [task.hasSecurityWork=false] - Security engineering scope
 * @param {boolean} [task.hasPerformanceWork=false] - Performance engineering scope
 * @param {boolean} [task.hasFunctionalWork=false] - Functional feature scope
 * @param {boolean} [task.isHighRiskRelease=false] - Core contract / release freeze
 * @param {boolean} [task.isTrivialTypo=false] - Simple typo / single-line edit
 * @param {Array<string>} [task.overlappingWriteFiles=[]] - Files touched by multiple agents
 * @returns {Object} Workforce plan
 */
function evaluateOrchestrationWorkforce(task = {}) {
    const {
        domains = [],
        fileCount = 1,
        isMultiDomain = false,
        hasSecurityWork = false,
        hasPerformanceWork = false,
        hasFunctionalWork = false,
        isHighRiskRelease = false,
        isTrivialTypo = false,
        overlappingWriteFiles = []
    } = task;

    if (isTrivialTypo || (fileCount === 1 && domains.length <= 1 && !isHighRiskRelease && !hasSecurityWork)) {
        return {
            mode: 'SOLO',
            requiresDelegation: false,
            initialSpecialists: 0,
            parallelScopes: [],
            singleWriter: 'parent',
            verifierRequired: false,
            reason: 'Trivial single-file task: parent may execute directly.'
        };
    }

    const parallelScopes = [];
    if (domains.length > 1 || isMultiDomain) {
        domains.forEach(d => parallelScopes.push(`domain:${d}`));
    }
    if (hasSecurityWork) parallelScopes.push('security-scope');
    if (hasPerformanceWork) parallelScopes.push('performance-scope');
    if (hasFunctionalWork && (hasSecurityWork || hasPerformanceWork)) parallelScopes.push('functional-scope');

    const requiresDelegation = parallelScopes.length >= 2 || isHighRiskRelease || domains.length >= 2;
    const initialSpecialists = Math.min(Math.max(parallelScopes.length, requiresDelegation ? 2 : 1), 4); // Max 4 concurrent
    const verifierRequired = isHighRiskRelease || (hasSecurityWork && (hasPerformanceWork || hasFunctionalWork));

    return {
        mode: requiresDelegation ? (initialSpecialists >= 3 ? 'PARALLEL' : 'SMALL') : 'FOCUSED',
        requiresDelegation,
        initialSpecialists,
        parallelScopes,
        singleWriter: overlappingWriteFiles.length > 0 ? 'designated_single_writer' : 'parent',
        verifierRequired,
        challengerRequired: task.conflictingEvidence === true,
        reason: requiresDelegation ? 'Mandatory delegation triggered by task topology.' : 'Focused single-specialist scope.'
    };
}

/**
 * Validates structured handoff report content.
 */
function validateHandoffReport(handoff) {
    if (!handoff || typeof handoff !== 'object') {
        return { isValid: false, errors: ['Handoff must be an object'] };
    }
    const errors = [];
    for (const field of REQUIRED_HANDOFF_FIELDS) {
        if (!handoff[field] || String(handoff[field]).trim().length === 0) {
            errors.push(`Missing required handoff field: ${field}`);
        }
    }
    if (handoff.HANDOFF_STATUS && !['COMPLETE', 'PARTIAL', 'BLOCKED'].includes(handoff.HANDOFF_STATUS)) {
        errors.push(`Invalid HANDOFF_STATUS: ${handoff.HANDOFF_STATUS}. Expected COMPLETE, PARTIAL, or BLOCKED.`);
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Runs the test suite.
 */
async function runOrchestrationSelfTest() {
    console.log('====================================================');
    console.log('Running study-source-core Orchestration Self-Test');
    console.log('====================================================\n');

    let passed = 0;
    let failed = 0;

    function test(name, fn) {
        try {
            fn();
            console.log(`  ✅ PASS: ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ FAIL: ${name}\n     Error: ${err.message}`);
            failed++;
        }
    }

    // 1. Policy Text & Configuration Checks
    test('1. SKILL.md contains Mandatory Dispatch Gate and Section 1.1', () => {
        const skillMd = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf-8');
        assert(skillMd.includes('MANDATORY DISPATCH GATE'), 'SKILL.md must include MANDATORY DISPATCH GATE');
        assert(skillMd.includes('Adaptive Orchestrator v4 Foundation'), 'SKILL.md must reference Adaptive Orchestrator v4');
        assert(skillMd.includes('Single-Writer Rule'), 'SKILL.md must include Single-Writer Rule');
        assert(skillMd.includes('HANDOFF REPORT'), 'SKILL.md must include HANDOFF REPORT contract');
    });

    test('2. resources/workflow.md contains Structured Handoff Barrier and Independent Verifier', () => {
        const workflowMd = fs.readFileSync(path.join(SKILL_DIR, 'resources/workflow.md'), 'utf-8');
        assert(workflowMd.includes('Structured Handoff Barrier'), 'workflow.md must include Structured Handoff Barrier');
        assert(workflowMd.includes('Independent Verifier Dispatch'), 'workflow.md must include Independent Verifier');
        assert(workflowMd.includes('WORKFORCE SUMMARY'), 'workflow.md must include WORKFORCE SUMMARY');
    });

    test('3. resources/tool-orchestration.md contains Subagent Orchestration Policy', () => {
        const toolMd = fs.readFileSync(path.join(SKILL_DIR, 'resources/tool-orchestration.md'), 'utf-8');
        assert(toolMd.includes('Subagent & Specialist Orchestration Policy'), 'tool-orchestration.md must include Subagent policy');
        assert(toolMd.includes('core-notes') && toolMd.includes('core-basic-anki'), 'tool-orchestration.md must list registered subagents');
    });

    test('4. resources/agent-recovery.md contains Orchestration Failure Recovery', () => {
        const recoveryMd = fs.readFileSync(path.join(SKILL_DIR, 'resources/agent-recovery.md'), 'utf-8');
        assert(recoveryMd.includes('Orchestration & Subagent Failure Recovery'), 'agent-recovery.md must include Section 5');
        assert(recoveryMd.includes('DELEGATION UNAVAILABLE'), 'agent-recovery.md must include DELEGATION UNAVAILABLE protocol');
    });

    // 2. Scenario Calibration Checks
    test('5. Multi-Domain Task requires >= 2 parallel specialists', () => {
        const plan = evaluateOrchestrationWorkforce({
            domains: ['Notes', 'Basic', 'MindMap', 'StudyLabProcedural'],
            fileCount: 4,
            isMultiDomain: true
        });
        assert.strictEqual(plan.requiresDelegation, true);
        assert(plan.initialSpecialists >= 2, 'Must require >=2 specialists');
        assert.strictEqual(plan.mode, 'PARALLEL');
    });

    test('6. Security + Performance + Functional Task requires parallel scopes + independent verifier', () => {
        const plan = evaluateOrchestrationWorkforce({
            hasSecurityWork: true,
            hasPerformanceWork: true,
            hasFunctionalWork: true,
            fileCount: 6
        });
        assert.strictEqual(plan.requiresDelegation, true);
        assert(plan.initialSpecialists >= 2);
        assert.strictEqual(plan.verifierRequired, true, 'Verifier must be mandatory');
    });

    test('7. Single-file typo fix correctly allows SOLO parent execution', () => {
        const plan = evaluateOrchestrationWorkforce({
            isTrivialTypo: true,
            fileCount: 1,
            domains: ['Notes']
        });
        assert.strictEqual(plan.requiresDelegation, false);
        assert.strictEqual(plan.mode, 'SOLO');
        assert.strictEqual(plan.initialSpecialists, 0);
        assert.strictEqual(plan.verifierRequired, false);
    });

    test('8. High-Risk Release Change mandates independent verifier dispatch', () => {
        const plan = evaluateOrchestrationWorkforce({
            isHighRiskRelease: true,
            fileCount: 5,
            domains: ['CoreContract', 'Packaging']
        });
        assert.strictEqual(plan.requiresDelegation, true);
        assert.strictEqual(plan.verifierRequired, true);
    });

    test('9. Single-Writer Rule assigns designated writer when overlapping files exist', () => {
        const plan = evaluateOrchestrationWorkforce({
            domains: ['DomainA', 'DomainB'],
            overlappingWriteFiles: ['package.json', 'SKILL.md']
        });
        assert.strictEqual(plan.singleWriter, 'designated_single_writer');
    });

    test('10. Handoff Contract accurately enforces all 9 required fields', () => {
        const validHandoff = {
            MISSION: 'Extract basic memory facts',
            SCOPE: 'Map/Europe',
            FILES_INSPECTED: ['scratch/evidence-pack.md:1-50'],
            FINDINGS: 'Found 92 atomic factual candidates',
            EVIDENCE: 'All facts grounded in source text',
            RISKS: 'None',
            RECOMMENDATION: 'Generate Europe_Basic.tsv with 92 rows',
            UNKNOWNS: 'None',
            HANDOFF_STATUS: 'COMPLETE'
        };
        const resValid = validateHandoffReport(validHandoff);
        assert.strictEqual(resValid.isValid, true);

        const invalidHandoff = {
            MISSION: 'Extract basic memory facts',
            // Missing SCOPE, FINDINGS, EVIDENCE, etc.
            HANDOFF_STATUS: 'UNKNOWN_STATUS'
        };
        const resInvalid = validateHandoffReport(invalidHandoff);
        assert.strictEqual(resInvalid.isValid, false);
        assert(resInvalid.errors.length >= 5);
    });

    console.log(`\n====================================================`);
    console.log(`Orchestration Self-Test Complete: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    runOrchestrationSelfTest().catch(err => {
        console.error('Fatal self-test failure:', err);
        process.exit(1);
    });
}

module.exports = {
    REQUIRED_HANDOFF_FIELDS,
    evaluateOrchestrationWorkforce,
    validateHandoffReport,
    runOrchestrationSelfTest
};
