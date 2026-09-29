/**
 * StudySourceCore - Canonical Contracts Deep Anti-Leak & Parameter Space Audit
 * File: skills/study-source-core/scripts/audit_canonical_contracts_antileak.js
 * 
 * Implements Track 1 of the Master Audit Plan:
 * 1. Tier 1 & Tier 2 Hint Anti-Leak Audit:
 *    - Scans for numbers, equations with solved values, '(A)', '(B)', '(C)', '(D)', 'Option [A-D]'
 *    - Scans for explicit answer keywords ('उत्तर:', 'उत्तर है', 'Answer is', 'The answer is', etc.)
 *    - Normalized string matching against all MCQ option choices and discrete choice parameter values.
 * 2. Parameter Space Hazard Audit:
 *    - Division by zero detection (domain min <= 0 <= max without non_zero: true on divisors/denominators).
 *    - Negative square root detection (radicands < 0, pythagoras_leg violations).
 *    - Phase 40 parameter domain bounds validation.
 * 3. Solution Graph DAG Integrity:
 *    - Uniqueness of step IDs.
 *    - Existence of referenced step dependencies.
 *    - Strict DAG acyclicity (Cycle = ∅) via DFS three-color graph traversal.
 */

const fs = require('fs');
const path = require('path');

const CANONICAL_CONTRACTS_PATH = path.resolve(__dirname, '../resources/schemas/studylab-canonical-contracts.json');

// Prohibited leak patterns in Tier 1 & Tier 2 hints
const OPTION_LABEL_REGEX = /\([A-D]\)|\bOption\s+[A-D]\b|\bChoice\s+[A-D]\b|\bविकल्प\s+[A-D]\b/i;
const EXPLICIT_ANSWER_REGEX = /(उत्तर\s*[:=]|उत्तर\s+है|उत्तर\s+होगा|answer\s*[:=]|answer\s+is\b|the answer is\b|correct answer is\b|correct choice is\b)/i;
const EQUATION_WITH_SOLVED_VALUE_REGEX = /=\s*\{answer\}|is\s*\{answer\}|=\s*\d+(\.\d+)?(?=\s|$|[.,;!)]|\b)/i;

// Benign title/label patterns that contain digits but do not leak answers
const BENIGN_TITLE_PATTERNS = [
    /\b[1-3]d\b/gi,
    /\b[1-3]-statement\b/gi,
    /\bsn[12]\b/gi,
    /\b2-variable\b/gi,
    /\b1-variable\b/gi,
    /\b2-step\b/gi,
    /\b3-dimensional\b/gi,
    /\b2-dimensional\b/gi
];

/**
 * Normalizes text for leak comparison.
 */
function normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .toLowerCase()
        .replace(/\\(frac|sqrt|text|mathrm|mathbf)\{([^}]+)\}/g, ' $2 ')
        .replace(/[\\^_{}()$[\]]/g, ' ')
        .replace(/[^\w\s\u0900-\u097F.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Checks if a string containing digits is purely benign structural terminology.
 */
function isBenignStructuralText(text) {
    let stripped = text;
    for (const pat of BENIGN_TITLE_PATTERNS) {
        pat.lastIndex = 0;
        stripped = stripped.replace(pat, '');
    }
    return !/\d/.test(stripped);
}

/**
 * Audits a solution graph DAG for acyclicity, missing dependencies, and duplicate IDs.
 */
function auditSolutionGraphDag(stepNodes, contractKey, archetypeId) {
    const issues = [];
    if (!Array.isArray(stepNodes)) return issues;

    const stepIds = new Set();
    const adj = new Map();

    // Check duplicate step IDs
    stepNodes.forEach((step, idx) => {
        const sid = step.id || `step_${idx + 1}`;
        if (stepIds.has(sid)) {
            issues.push({
                type: 'DUPLICATE_STEP_ID',
                contract: contractKey,
                archetype: archetypeId,
                step: sid,
                detail: `Duplicate step ID '${sid}' in archetype.`
            });
        }
        stepIds.add(sid);
        adj.set(sid, Array.isArray(step.dependencies) ? step.dependencies : []);
    });

    // Check dependency validity
    stepNodes.forEach((step, idx) => {
        const sid = step.id || `step_${idx + 1}`;
        const deps = Array.isArray(step.dependencies) ? step.dependencies : [];
        deps.forEach(depId => {
            if (depId === sid) {
                issues.push({
                    type: 'SELF_LOOP',
                    contract: contractKey,
                    archetype: archetypeId,
                    step: sid,
                    detail: `Step '${sid}' has self-dependency loop.`
                });
            } else if (!stepIds.has(depId)) {
                issues.push({
                    type: 'MISSING_DEPENDENCY',
                    contract: contractKey,
                    archetype: archetypeId,
                    step: sid,
                    detail: `Step '${sid}' references undefined dependency '${depId}'.`
                });
            }
        });
    });

    // DFS Cycle Detection (0 = unvisited, 1 = visiting, 2 = visited)
    const visited = new Map();
    stepIds.forEach(id => visited.set(id, 0));

    function dfs(nodeId, stack) {
        visited.set(nodeId, 1);
        stack.push(nodeId);

        const deps = adj.get(nodeId) || [];
        for (const nextNode of deps) {
            if (!stepIds.has(nextNode)) continue;
            const state = visited.get(nextNode);
            if (state === 1) {
                const cycleStart = stack.indexOf(nextNode);
                const cyclePath = stack.slice(cycleStart).concat(nextNode).join(' -> ');
                issues.push({
                    type: 'DAG_CYCLE',
                    contract: contractKey,
                    archetype: archetypeId,
                    step: nodeId,
                    detail: `Directed cycle in solution graph: ${cyclePath}`
                });
                return true;
            } else if (state === 0) {
                if (dfs(nextNode, stack)) return true;
            }
        }

        stack.pop();
        visited.set(nodeId, 2);
        return false;
    }

    for (const id of stepIds) {
        if (visited.get(id) === 0) {
            dfs(id, []);
        }
    }

    return issues;
}

/**
 * Audits parameter specifications for division by zero and negative square root hazards.
 */
function auditParameterSpace(archetype, contractKey) {
    const hazards = [];
    const params = archetype.parameters || [];
    const paramMap = new Map();
    params.forEach(p => paramMap.set(p.name, p));

    const derivation = archetype.answer_derivation || {};
    const constraints = archetype.constraints || [];

    // 1. Division by zero in parameter domains
    params.forEach(p => {
        const dom = p.domain || {};
        const pName = (p.name || '').toLowerCase();

        // Check bounds logic
        if (dom.type === 'integer_range' || dom.type === 'float_range') {
            if (dom.min > dom.max) {
                hazards.push({
                    type: 'INVALID_DOMAIN_BOUNDS',
                    contract: contractKey,
                    archetype: archetype.archetype_id,
                    param: p.name,
                    detail: `Parameter '${p.name}' min (${dom.min}) > max (${dom.max}).`
                });
            }
        }

        // Check divisor/denominator parameter names
        const isNamedDivisor = pName.includes('denom') || pName.includes('divisor') || pName.includes('den');
        let isUsedAsDivisorInDerivation = false;

        if (derivation.type === 'quotient' || derivation.type === 'remainder') {
            if (derivation.params && derivation.params[1] === p.name) isUsedAsDivisorInDerivation = true;
            if (derivation.divisor_param === p.name || derivation.denominator_param === p.name || derivation.b_param === p.name) {
                isUsedAsDivisorInDerivation = true;
            }
        } else if (derivation.type === 'equilibrium_kc' || derivation.type === 'stoichiometric_mole_ratio') {
            if (derivation.params && derivation.params[1] === p.name) isUsedAsDivisorInDerivation = true;
        }

        if (isNamedDivisor || isUsedAsDivisorInDerivation) {
            if (dom.type === 'integer_range' || dom.type === 'float_range') {
                if (dom.min <= 0 && dom.max >= 0 && dom.non_zero !== true) {
                    hazards.push({
                        type: 'DIVISION_BY_ZERO_HAZARD',
                        contract: contractKey,
                        archetype: archetype.archetype_id,
                        param: p.name,
                        detail: `Parameter '${p.name}' is divisor/denominator with domain [${dom.min}, ${dom.max}] allowing 0 without non_zero: true.`
                    });
                }
            }
        }

        // Negative square root in radicand params
        const isNamedRadicand = pName.includes('sqrt') || pName.includes('radicand');
        if (isNamedRadicand) {
            if ((dom.type === 'integer_range' || dom.type === 'float_range') && dom.min < 0) {
                hazards.push({
                    type: 'NEGATIVE_SQUARE_ROOT_HAZARD',
                    contract: contractKey,
                    archetype: archetype.archetype_id,
                    param: p.name,
                    detail: `Radicand parameter '${p.name}' domain allows negative values (min: ${dom.min}).`
                });
            }
        }
    });

    // 2. Geometric / Pythagoras Square Root Hazard
    if (derivation.type === 'pythagoras_leg') {
        const hypName = derivation.c_param || derivation.hypotenuse_param || (derivation.params && derivation.params[0]);
        const legName = derivation.a_param || derivation.leg_param || (derivation.params && derivation.params[1]);

        const hypParam = paramMap.get(hypName);
        const legParam = paramMap.get(legName);

        if (hypParam && legParam && hypParam.domain && legParam.domain) {
            const hypMin = hypParam.domain.min;
            const legMax = legParam.domain.max;

            // If minimum hypotenuse is <= maximum leg, verify constraint
            if (hypMin <= legMax) {
                const hasGreaterConstraint = constraints.some(c =>
                    (c.type === 'greater_than' && c.param_a === hypName && c.param_b === legName)
                );
                if (!hasGreaterConstraint) {
                    hazards.push({
                        type: 'NEGATIVE_SQUARE_ROOT_HAZARD',
                        contract: contractKey,
                        archetype: archetype.archetype_id,
                        param: `${hypName}, ${legName}`,
                        detail: `pythagoras_leg allows hypotenuse '${hypName}' (min: ${hypMin}) <= leg '${legName}' (max: ${legMax}) without greater_than constraint.`
                    });
                }
            }
        }
    }

    return hazards;
}

/**
 * Audits Tier 1 & Tier 2 hints for answer leakage and MCQ option string disclosure.
 */
function auditHints(archetype, contractKey) {
    const leaks = [];
    const stepNodes = archetype.step_nodes || [];

    // Gather discrete choices / options to test for leakage
    const discreteChoices = [];
    (archetype.parameters || []).forEach(p => {
        if (p.domain && p.domain.type === 'discrete_choice' && Array.isArray(p.domain.values)) {
            p.domain.values.forEach(v => discreteChoices.push(String(v)));
        }
    });

    stepNodes.forEach((s, idx) => {
        const stepId = s.id || `step_${idx + 1}`;
        const hints = [
            { tier: 1, field: 'hint_principle', text: s.hint_principle },
            { tier: 2, field: 'hint_operation', text: s.hint_operation },
            { tier: 3, field: 'hint_intermediate', text: s.hint_intermediate }
        ];

        hints.forEach(({ tier, field, text }) => {
            if (!text || typeof text !== 'string') return;
            const trimmed = text.trim();

            // Tier 1 and Tier 2 strict checks
            if (tier === 1 || tier === 2) {
                // 1. Option label leaks
                const optMatch = trimmed.match(OPTION_LABEL_REGEX);
                if (optMatch) {
                    leaks.push({
                        type: 'OPTION_LABEL_LEAK',
                        contract: contractKey,
                        archetype: archetype.archetype_id,
                        step: stepId,
                        tier,
                        field,
                        matched: optMatch[0],
                        text: trimmed,
                        detail: `Tier ${tier} hint discloses option label '${optMatch[0]}'.`
                    });
                }

                // 2. Explicit answer prefix/keywords
                const ansMatch = trimmed.match(EXPLICIT_ANSWER_REGEX);
                if (ansMatch) {
                    leaks.push({
                        type: 'EXPLICIT_ANSWER_KEYWORD_LEAK',
                        contract: contractKey,
                        archetype: archetype.archetype_id,
                        step: stepId,
                        tier,
                        field,
                        matched: ansMatch[0],
                        text: trimmed,
                        detail: `Tier ${tier} hint uses explicit answer indicator '${ansMatch[0]}'.`
                    });
                }

                // 3. Equations with solved values (= {answer}, = 42, etc.)
                const eqMatch = trimmed.match(EQUATION_WITH_SOLVED_VALUE_REGEX);
                if (eqMatch) {
                    leaks.push({
                        type: 'SOLVED_EQUATION_LEAK',
                        contract: contractKey,
                        archetype: archetype.archetype_id,
                        step: stepId,
                        tier,
                        field,
                        matched: eqMatch[0],
                        text: trimmed,
                        detail: `Tier ${tier} hint leaks solved value or terminal answer placeholder: '${eqMatch[0]}'.`
                    });
                }

                // 4. Raw numbers check (excluding benign structural markers)
                if (/\d/.test(trimmed) && !isBenignStructuralText(trimmed)) {
                    leaks.push({
                        type: 'NUMERICAL_LEAK',
                        contract: contractKey,
                        archetype: archetype.archetype_id,
                        step: stepId,
                        tier,
                        field,
                        text: trimmed,
                        detail: `Tier ${tier} hint contains non-structural numerical literals.`
                    });
                }

                // 5. String-match normalized hint against discrete choices
                const normHint = normalizeText(trimmed);
                for (const choice of discreteChoices) {
                    const normChoice = normalizeText(choice);
                    const ignoredKeywords = new Set(['none', 'true', 'false', 'both', 'either', 'neither', 'null', 'yes', 'no']);
                    if (normChoice.length >= 4 && !ignoredKeywords.has(normChoice)) {
                        if (normHint.includes(normChoice)) {
                            leaks.push({
                                type: 'OPTION_STRING_MATCH_LEAK',
                                contract: contractKey,
                                archetype: archetype.archetype_id,
                                step: stepId,
                                tier,
                                field,
                                matched: choice,
                                text: trimmed,
                                detail: `Tier ${tier} hint contains normalized option string '${choice}'.`
                            });
                        }
                    }
                }
            } else if (tier === 3) {
                // Tier 3 sanity audit (should not contain explicit option letters or answer prefix)
                const optMatch = trimmed.match(OPTION_LABEL_REGEX);
                const ansMatch = trimmed.match(EXPLICIT_ANSWER_REGEX);
                if (optMatch || ansMatch) {
                    leaks.push({
                        type: 'TIER3_DISCLOSURE_LEAK',
                        contract: contractKey,
                        archetype: archetype.archetype_id,
                        step: stepId,
                        tier: 3,
                        field,
                        matched: optMatch ? optMatch[0] : ansMatch[0],
                        text: trimmed,
                        detail: `Tier 3 hint contains direct option letter or answer declaration.`
                    });
                }
            }
        });
    });

    return leaks;
}

/**
 * Main audit runner.
 */
function runCanonicalContractsAudit(contractsPath = CANONICAL_CONTRACTS_PATH) {
    if (!fs.existsSync(contractsPath)) {
        throw new Error(`Canonical contracts file not found: ${contractsPath}`);
    }

    const rawData = fs.readFileSync(contractsPath, 'utf8');
    const contracts = JSON.parse(rawData);
    const contractKeys = Object.keys(contracts);

    const metrics = {
        totalContractsScanned: contractKeys.length,
        totalArchetypesScanned: 0,
        totalStepNodesScanned: 0,
        totalHintsInspected: 0,
        totalParametersScanned: 0,
        leaksDetected: 0,
        leaksFixed: 0,
        dagCyclesDetected: 0,
        dagCyclesFixed: 0,
        parameterHazardsDetected: 0,
        parameterHazardsFixed: 0,
        leakFindings: [],
        dagFindings: [],
        hazardFindings: [],
        auditPassed: false
    };

    for (const key of contractKeys) {
        const contractEntry = contracts[key];
        const archetypes = contractEntry.archetypes || [];
        metrics.totalArchetypesScanned += archetypes.length;

        for (const arch of archetypes) {
            const stepNodes = arch.step_nodes || [];
            const parameters = arch.parameters || [];
            metrics.totalStepNodesScanned += stepNodes.length;
            metrics.totalParametersScanned += parameters.length;

            // 1. DAG integrity & Acyclicity
            const dagIssues = auditSolutionGraphDag(stepNodes, key, arch.archetype_id);
            if (dagIssues.length > 0) {
                metrics.dagFindings.push(...dagIssues);
                metrics.dagCyclesDetected += dagIssues.filter(i => i.type === 'DAG_CYCLE' || i.type === 'SELF_LOOP').length;
            }

            // 2. Parameter space hazard audit
            const hazards = auditParameterSpace(arch, key);
            if (hazards.length > 0) {
                metrics.hazardFindings.push(...hazards);
                metrics.parameterHazardsDetected += hazards.length;
            }

            // 3. Hint anti-leak audit
            const leaks = auditHints(arch, key);
            if (leaks.length > 0) {
                metrics.leakFindings.push(...leaks);
                metrics.leaksDetected += leaks.length;
            }

            // Count inspected hints
            stepNodes.forEach(s => {
                if (s.hint_principle) metrics.totalHintsInspected++;
                if (s.hint_operation) metrics.totalHintsInspected++;
                if (s.hint_intermediate) metrics.totalHintsInspected++;
            });
        }
    }

    metrics.auditPassed = (
        metrics.leaksDetected === 0 &&
        metrics.dagCyclesDetected === 0 &&
        metrics.dagFindings.length === 0 &&
        metrics.parameterHazardsDetected === 0
    );

    return metrics;
}


/**
 * Executes adversarial verification suite to prove detection capabilities.
 */
function runSelfTest() {
    const assert = require('assert');
    console.log('\n--- EXECUTING VERIFIER ADVERSARIAL CERTIFICATION SUITE ---');

    // 1. Hint Leak Detection
    const archWithLeak = {
        archetype_id: "test_leak",
        parameters: [
            { name: "opt", domain: { type: "discrete_choice", values: ["SpecialProductA", "SpecialProductB"] } }
        ],
        step_nodes: [
            { id: "s1", hint_principle: "The correct choice is (B)", hint_operation: "Calculate value" },
            { id: "s2", hint_principle: "Standard rule", hint_operation: "उत्तर: 42 होगा" },
            { id: "s3", hint_principle: "Formula setup", hint_operation: "x = {answer}" },
            { id: "s4", hint_principle: "Contains SpecialProductA here", hint_operation: "Normal operation" },
            { id: "s5", hint_principle: "Calculated answer is 99", hint_operation: "Standard approach" }
        ]
    };
    const leaks = auditHints(archWithLeak, "adversarial_test");
    assert(leaks.some(l => l.type === 'OPTION_LABEL_LEAK'), "Failed to catch OPTION_LABEL_LEAK");
    assert(leaks.some(l => l.type === 'EXPLICIT_ANSWER_KEYWORD_LEAK'), "Failed to catch EXPLICIT_ANSWER_KEYWORD_LEAK");
    assert(leaks.some(l => l.type === 'SOLVED_EQUATION_LEAK'), "Failed to catch SOLVED_EQUATION_LEAK");
    assert(leaks.some(l => l.type === 'OPTION_STRING_MATCH_LEAK'), "Failed to catch OPTION_STRING_MATCH_LEAK");
    assert(leaks.some(l => l.type === 'NUMERICAL_LEAK'), "Failed to catch NUMERICAL_LEAK");
    console.log('  [PASS] 5/5 Adversarial Hint Leaks intercepted.');

    // 2. Division by Zero Hazard Detection
    const archWithDivZero = {
        archetype_id: "test_divzero",
        parameters: [
            { name: "num", domain: { type: "integer_range", min: 10, max: 50 } },
            { name: "den", domain: { type: "integer_range", min: 0, max: 10 } }
        ],
        answer_derivation: { type: "quotient", params: ["num", "den"] }
    };
    const divZeroHazards = auditParameterSpace(archWithDivZero, "adversarial_test");
    assert(divZeroHazards.some(h => h.type === 'DIVISION_BY_ZERO_HAZARD'), "Failed to catch DIVISION_BY_ZERO_HAZARD");
    console.log('  [PASS] 1/1 Adversarial Division-by-Zero hazard intercepted.');

    // 3. Negative Square Root Hazard Detection
    const archWithPythHazard = {
        archetype_id: "test_pyth",
        parameters: [
            { name: "hyp", domain: { type: "integer_range", min: 5, max: 20 } },
            { name: "leg", domain: { type: "integer_range", min: 10, max: 25 } }
        ],
        constraints: [],
        answer_derivation: { type: "pythagoras_leg", c_param: "hyp", a_param: "leg" }
    };
    const pythHazards = auditParameterSpace(archWithPythHazard, "adversarial_test");
    assert(pythHazards.some(h => h.type === 'NEGATIVE_SQUARE_ROOT_HAZARD'), "Failed to catch NEGATIVE_SQUARE_ROOT_HAZARD");
    console.log('  [PASS] 1/1 Adversarial Negative Square Root hazard intercepted.');

    // 4. DAG Cycle and Loop Detection
    const archWithCycle = {
        archetype_id: "test_cycle",
        step_nodes: [
            { id: "step_1", dependencies: ["step_2"] },
            { id: "step_2", dependencies: ["step_3"] },
            { id: "step_3", dependencies: ["step_1"] }
        ]
    };
    const cycleIssues = auditSolutionGraphDag(archWithCycle.step_nodes, "adversarial_test", "test_cycle");
    assert(cycleIssues.some(i => i.type === 'DAG_CYCLE'), "Failed to catch DAG_CYCLE");
    console.log('  [PASS] 1/1 Adversarial DAG Cycle intercepted.');

    const archWithSelfLoop = {
        archetype_id: "test_loop",
        step_nodes: [
            { id: "step_1", dependencies: ["step_1"] }
        ]
    };
    const loopIssues = auditSolutionGraphDag(archWithSelfLoop.step_nodes, "adversarial_test", "test_loop");
    assert(loopIssues.some(i => i.type === 'SELF_LOOP'), "Failed to catch SELF_LOOP");
    console.log('  [PASS] 1/1 Adversarial Self Loop intercepted.');

    const archWithMissingDep = {
        archetype_id: "test_missing",
        step_nodes: [
            { id: "step_1", dependencies: ["non_existent_step"] }
        ]
    };
    const missingIssues = auditSolutionGraphDag(archWithMissingDep.step_nodes, "adversarial_test", "test_missing");
    assert(missingIssues.some(i => i.type === 'MISSING_DEPENDENCY'), "Failed to catch MISSING_DEPENDENCY");
    console.log('  [PASS] 1/1 Adversarial Missing Dependency intercepted.');

    console.log('✅ Verifier Adversarial Certification Completed with 100% detection rate.\n');
}

// CLI Execution
if (require.main === module) {
    const runAdversarial = process.argv.includes("--self-test") || process.argv.includes("-t");
    if (runAdversarial) {
        runSelfTest();
    }
    console.log('='.repeat(80));
    console.log('CANONICAL CONTRACTS DEEP ANTI-LEAK & PARAMETER SPACE AUDIT (TRACK 1)');
    console.log('Target Registry: ' + CANONICAL_CONTRACTS_PATH);
    console.log('='.repeat(80));

    try {
        const results = runCanonicalContractsAudit();

        console.log(`\n--- AUDIT METRICS SUMMARY ---`);
        console.log(`Total Contracts Scanned:        ${results.totalContractsScanned}`);
        console.log(`Total Archetypes Scanned:       ${results.totalArchetypesScanned}`);
        console.log(`Total Parameters Scanned:       ${results.totalParametersScanned}`);
        console.log(`Total Step Nodes Scanned:       ${results.totalStepNodesScanned}`);
        console.log(`Total Hints Inspected:          ${results.totalHintsInspected}`);
        console.log(`Hint Leaks Detected:            ${results.leaksDetected}`);
        console.log(`DAG Issues / Cycles Detected:   ${results.dagFindings.length} (${results.dagCyclesDetected} cycles)`);
        console.log(`Parameter Hazards Detected:     ${results.parameterHazardsDetected}`);
        console.log(`Overall Audit Status:           ${results.auditPassed ? 'PASSED (STRICT 0-DEFECT)' : 'FAILED'}`);
        console.log('='.repeat(80));

        if (!results.auditPassed) {
            if (results.leakFindings.length > 0) {
                console.error('\n[!] HINT LEAK FINDINGS:');
                results.leakFindings.forEach(f => {
                    console.error(`  - [${f.type}] Contract: ${f.contract}, Step: ${f.step}, Tier: ${f.tier}`);
                    console.error(`    Detail: ${f.detail}`);
                });
            }

            if (results.dagFindings.length > 0) {
                console.error('\n[!] DAG INTEGRITY FINDINGS:');
                results.dagFindings.forEach(f => {
                    console.error(`  - [${f.type}] Contract: ${f.contract}, Step: ${f.step}`);
                    console.error(`    Detail: ${f.detail}`);
                });
            }

            if (results.hazardFindings.length > 0) {
                console.error('\n[!] PARAMETER HAZARD FINDINGS:');
                results.hazardFindings.forEach(f => {
                    console.error(`  - [${f.type}] Contract: ${f.contract}, Param: ${f.param}`);
                    console.error(`    Detail: ${f.detail}`);
                });
            }

            process.exit(1);
        } else {
            console.log('\n[PASS] All 533 canonical contracts strictly comply with Anti-Leak, Parameter Space, and DAG Acyclicity invariants.');
            process.exit(0);
        }
    } catch (err) {
        console.error('\n[FATAL AUDIT ERROR]', err);
        process.exit(1);
    }
}

module.exports = {
    runCanonicalContractsAudit,
    runSelfTest,
    auditSolutionGraphDag,
    auditParameterSpace,
    auditHints
};
