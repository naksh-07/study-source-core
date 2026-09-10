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
        !toolNames.includes('resolve_subject_policy')) {
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
    if (!mathPolicy.proceduralApkg || !mathPolicy.notes) {
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

    await client.close();
    console.log("\n🎉 ALL MCP TESTS PASSED SUCCESSFULLY!\n");
}

runTest().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
