/**
 * Test script for StudySourceCore MCP Server
 */

const path = require('path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function runTest() {
    console.log("=== Testing StudySourceCore MCP Server ===");

    const serverScript = path.resolve(__dirname, 'mcp_server.js');
    const transport = new StdioClientTransport({
        command: "node",
        args: [serverScript]
    });

    const client = new Client({
        name: "test-client",
        version: "1.0.0"
    });

    console.log("Connecting to MCP Server via stdio transport...");
    await client.connect(transport);
    console.log("Connected successfully!");

    // Test 1: List Tools
    console.log("\n[Test 1] Listing available tools...");
    const toolsResult = await client.listTools();
    const toolNames = toolsResult.tools.map(t => t.name);
    console.log("Discovered tools:", toolNames);

    if (!toolNames.includes('export_anki_package') ||
        !toolNames.includes('export_studylab_procedural_package') ||
        !toolNames.includes('validate_artifact') ||
        !toolNames.includes('resolve_subject_policy') ||
        !toolNames.includes('ingest_source_to_evidence_pack') ||
        !toolNames.includes('query_procedural_contract')) {
        throw new Error("Missing expected tools in listTools response!");
    }
    console.log("✅ Tool discovery test passed!");

    // Test 2: Call resolve_subject_policy for Math
    console.log("\n[Test 2] Calling 'resolve_subject_policy' for Math...");
    const mathPolicyCall = await client.callTool({
        name: "resolve_subject_policy",
        arguments: { subjectName: "Math" }
    });
    const mathPolicy = JSON.parse(mathPolicyCall.content[0].text);
    console.log("Math policy resolved:", mathPolicy);
    if (!mathPolicy.notes || (!mathPolicy.proceduralApkg && !mathPolicy.proceduralQuestionBank)) {
        throw new Error("Invalid policy for Math!");
    }
    console.log("✅ Math policy resolution test passed!");

    // Test 3: Call resolve_subject_policy for Biology
    console.log("\n[Test 3] Calling 'resolve_subject_policy' for Biology...");
    const bioPolicyCall = await client.callTool({
        name: "resolve_subject_policy",
        arguments: { subjectName: "Biology" }
    });
    const bioPolicy = JSON.parse(bioPolicyCall.content[0].text);
    console.log("Biology policy resolved:", bioPolicy);
    if (bioPolicy.proceduralApkg !== false) {
        throw new Error("Biology should not have proceduralApkg enabled!");
    }
    console.log("✅ Biology policy resolution test passed!");

    // Test 4: Call validate_artifact on an in-memory sample TSV
    console.log("\n[Test 4] Calling 'validate_artifact' for a valid TSV...");
    const sampleTsvPath = path.resolve(__dirname, 'scratch/test_sample.tsv');
    const fs = require('fs');
    fs.mkdirSync(path.dirname(sampleTsvPath), { recursive: true });
    fs.writeFileSync(sampleTsvPath, "Front\tBack\tTags\nWhat is 2+2?\t4\tmath::arithmetic\n", 'utf8');

    const tsvValidationCall = await client.callTool({
        name: "validate_artifact",
        arguments: {
            artifactPath: sampleTsvPath,
            artifactType: "tsv"
        }
    });
    const tsvResult = JSON.parse(tsvValidationCall.content[0].text);
    console.log("TSV validation result:", tsvResult);
    if (!tsvResult.isValid) {
        throw new Error("Valid TSV failed validation!");
    }
    console.log("✅ TSV validation test passed!");

    // Cleanup scratch
    if (fs.existsSync(sampleTsvPath)) {
        fs.unlinkSync(sampleTsvPath);
    }

    // Test 5: Call query_procedural_contract by domain
    console.log("\n[Test 5] Calling 'query_procedural_contract' for physics...");
    const contractCall = await client.callTool({
        name: "query_procedural_contract",
        arguments: { domain: "physics" }
    });
    const contractResult = JSON.parse(contractCall.content[0].text);
    console.log("Procedural DB contract query result:", contractResult);
    if (!contractResult || typeof contractResult.count !== 'number') {
        throw new Error("query_procedural_contract failed!");
    }
    console.log("✅ Procedural DB contract query test passed!");

    // Test 6: Call validate_artifact for latex (including escaped \$ test)
    console.log("\n[Test 6] Calling 'validate_artifact' for latex math...");
    const sampleLatexPath = path.resolve(__dirname, 'scratch/test_latex.md');
    fs.writeFileSync(sampleLatexPath, "# Math Sample\nCost is \\$100.\nFormula: $E = mc^2$\n$$\nF = ma\n$$\n", 'utf8');
    const latexCall = await client.callTool({
        name: "validate_artifact",
        arguments: {
            artifactPath: sampleLatexPath,
            artifactType: "latex"
        }
    });
    const latexResult = JSON.parse(latexCall.content[0].text);
    console.log("LaTeX validation result:", latexResult);
    if (!latexResult.passed || latexResult.displayMathCount !== 1 || latexResult.inlineMathCount !== 1) {
        throw new Error("LaTeX artifact validation failed or returned incorrect counts!");
    }
    if (fs.existsSync(sampleLatexPath)) fs.unlinkSync(sampleLatexPath);
    console.log("✅ LaTeX artifact validation test passed!");

    // Test 7: Call validate_artifact for mermaid
    console.log("\n[Test 7] Calling 'validate_artifact' for mermaid diagram...");
    const sampleMermaidPath = path.resolve(__dirname, 'scratch/test_mermaid.md');
    fs.writeFileSync(sampleMermaidPath, "# Diagram Sample\n```mermaid\nflowchart TD\n    A[\"Node A\"] --> B[\"Node B\"]\n```\n", 'utf8');
    const mermaidCall = await client.callTool({
        name: "validate_artifact",
        arguments: {
            artifactPath: sampleMermaidPath,
            artifactType: "mermaid"
        }
    });
    const mermaidResult = JSON.parse(mermaidCall.content[0].text);
    console.log("Mermaid validation result:", mermaidResult);
    if (!mermaidResult.passed || mermaidResult.blocks !== 1) {
        throw new Error("Mermaid artifact validation failed!");
    }
    if (fs.existsSync(sampleMermaidPath)) fs.unlinkSync(sampleMermaidPath);
    console.log("✅ Mermaid artifact validation test passed!");

    await client.close();
    console.log("\n🎉 ALL MCP TESTS PASSED SUCCESSFULLY!\n");
}

runTest().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
