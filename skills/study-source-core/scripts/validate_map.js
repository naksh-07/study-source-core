/**
 * study-source-core MindMap Validator (`validate_map.js`)
 * PHYSICAL EXECUTION GATEWAY
 * 
 * Contract:
 * - This script strictly enforces the canonical Cloudflare MindMap JSON schema.
 * - Requires 'id', 'title', 'subject', 'language', and 'root'.
 * - Node tree MUST be nested inside 'root' -> 'children'. Flat arrays are rejected.
 * - CrossLinks MUST strictly use 'sourceId' and 'targetId' pointing to valid nodes.
 */

const fs = require('fs');
const path = require('path');

function validateMapContent(contentOrData, filePath = 'in-memory') {
    let data;
    if (typeof contentOrData === 'string') {
        try {
            data = JSON.parse(contentOrData);
        } catch (e) {
            return {
                isValid: false,
                errors: [`Invalid JSON syntax in ${filePath}: ${e.message}`],
                warnings: []
            };
        }
    } else {
        data = contentOrData;
    }

    const errors = [];
    const warnings = [];

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        errors.push("Root MindMap manifest must be an object.");
        return { isValid: false, errors, warnings };
    }

    // 1. Top-Level Validation
    const requiredTopLevel = ["id", "title", "subject", "language", "root"];
    for (const field of requiredTopLevel) {
        if (!(field in data)) {
            errors.push(`Missing required top-level field: '${field}'`);
        } else if (!data[field]) {
            errors.push(`Top-level field '${field}' must not be empty.`);
        }
    }

    // 2. Node Tree Validation & Cycle Detection
    const nodeIds = new Set();
    
    function validateNode(node, nodePath) {
        if (typeof node !== 'object' || node === null || Array.isArray(node)) {
            errors.push(`Node at path ${nodePath.join(' -> ')} must be an object.`);
            return;
        }

        const nid = node.id;
        if (!nid) {
            errors.push(`Node at path ${nodePath.join(' -> ')} is missing 'id'.`);
            return;
        }
            
        if (nodeIds.has(nid)) {
            errors.push(`Duplicate Node ID found: '${nid}'`);
        } else {
            nodeIds.add(nid);
        }
            
        const label = node.label;
        if (!label) {
            errors.push(`Node '${nid}' is missing 'label'.`);
        }

        const children = node.children;
        if (children !== undefined) {
            if (!Array.isArray(children)) {
                errors.push(`Node '${nid}' has an invalid 'children' field (must be an array).`);
                return;
            }
            for (let i = 0; i < children.length; i++) {
                validateNode(children[i], [...nodePath, `${nid}[${i}]`]);
            }
        }
    }

    if (data.root && typeof data.root === 'object' && !Array.isArray(data.root)) {
        validateNode(data.root, ["root"]);
    } else if ("root" in data) {
        errors.push("Top-level 'root' must be an object.");
    }

    // 3. Cross-Links Validation
    const crossLinks = data.crossLinks;
    if (crossLinks !== undefined) {
        if (!Array.isArray(crossLinks)) {
            errors.push("'crossLinks' must be an array.");
        } else {
            for (let i = 0; i < crossLinks.length; i++) {
                const cl = crossLinks[i];
                const sid = cl.sourceId;
                const tid = cl.targetId;
                
                if (!sid) {
                    errors.push(`crossLink at index ${i} is missing 'sourceId'.`);
                } else if (!nodeIds.has(sid)) {
                    errors.push(`crossLink sourceId '${sid}' does not exist in the node tree.`);
                }
                
                if (!tid) {
                    errors.push(`crossLink at index ${i} is missing 'targetId'.`);
                } else if (!nodeIds.has(tid)) {
                    errors.push(`crossLink targetId '${tid}' does not exist in the node tree.`);
                }
                    
                const clLabel = cl.label;
                if (!clLabel) {
                    errors.push(`crossLink from '${sid}' to '${tid}' is missing 'label'.`);
                } else {
                    const lLower = clLabel.toLowerCase();
                    if (["related to", "associated with", "connected to", "linked to"].includes(lLower)) {
                        errors.push(`crossLink from '${sid}' to '${tid}' uses a prohibited generic label: '${clLabel}'.`);
                    }
                }

                const linkType = cl.type;
                if (linkType && !["relationship", "causality", "comparison"].includes(linkType)) {
                    errors.push(`crossLink from '${sid}' to '${tid}' has invalid type '${linkType}'. Must be 'relationship', 'causality', or 'comparison'.`);
                }
            }
        }
    }

    // 4. Quiz Questions Validation
    const quizzes = data.quizQuestions;
    if (quizzes !== undefined) {
        if (!Array.isArray(quizzes)) {
            errors.push("'quizQuestions' must be an array.");
        } else {
            const quizIds = new Set();
            for (let i = 0; i < quizzes.length; i++) {
                const quiz = quizzes[i];
                const qid = quiz.id;
                if (!qid) {
                    errors.push(`quizQuestion at index ${i} is missing 'id'.`);
                } else if (quizIds.has(qid)) {
                    errors.push(`Duplicate quizQuestion ID found: '${qid}'`);
                } else {
                    quizIds.add(qid);
                }
                    
                const qnid = quiz.nodeId;
                if (!qnid) {
                    errors.push(`quizQuestion '${qid}' is missing 'nodeId'.`);
                } else if (!nodeIds.has(qnid)) {
                    errors.push(`quizQuestion '${qid}' references non-existent nodeId '${qnid}'.`);
                }
                    
                const options = quiz.options;
                if (!Array.isArray(options) || options.length < 1) {
                    errors.push(`quizQuestion '${qid}' must have an 'options' array with at least 1 item.`);
                } else {
                    const correctIdx = quiz.correctAnswerIndex;
                    if (typeof correctIdx !== 'number') {
                        errors.push(`quizQuestion '${qid}' is missing or has invalid 'correctAnswerIndex'.`);
                    } else if (correctIdx < 0 || correctIdx >= options.length) {
                        errors.push(`quizQuestion '${qid}' correctAnswerIndex (${correctIdx}) is out of bounds for options array.`);
                    }
                }
                
                if (!quiz.question) {
                    errors.push(`quizQuestion '${qid}' is missing a 'question'.`);
                }
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        nodeCount: nodeIds.size
    };
}

function validateMap(filePath, shouldExit = true) {
    console.log(`Validating Mind Map JSON at: ${filePath}`);
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        if (shouldExit) process.exit(1);
        return { isValid: false, errors: [`File not found: ${filePath}`], warnings: [] };
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const result = validateMapContent(fileContent, filePath);

    if (!result.isValid) {
        console.log("\n[FAIL] MindMap Validation Errors:");
        result.errors.forEach(err => console.log(`  ❌ ${err}`));
        console.log("\nValidation failed.");
        if (shouldExit) process.exit(1);
        return result;
    } else {
        if (result.warnings.length > 0) {
            result.warnings.forEach(warn => console.log(`  ⚠️ ${warn}`));
        }
        console.log("\n[PASS] MindMap Validation successful.");
        if (shouldExit) process.exit(0);
        return result;
    }
}

if (require.main === module) {
    if (process.argv.length !== 3) {
        console.error("Usage: node validate_map.js <path_to_mindmap.json>");
        process.exit(1);
    }
    validateMap(process.argv[2]);
}

module.exports = {
    validateMap,
    validateMapContent
};
