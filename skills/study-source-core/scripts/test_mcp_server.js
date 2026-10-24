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

    // Test 8: Call ingest_source_to_evidence_pack
    console.log("\n[Test 8] Calling 'ingest_source_to_evidence_pack' for sample markdown...");
    const sampleSourcePath = path.resolve(__dirname, 'scratch/mcp_test_source.md');
    const sampleScratchDir = path.resolve(__dirname, 'scratch/mcp_evidence_out');
    fs.mkdirSync(path.dirname(sampleSourcePath), { recursive: true });
    fs.writeFileSync(sampleSourcePath, "# MCP Test Chapter\n\n## Overview\nThis is a sample source document for testing MCP ingestion.\n\n## Concept 1\nFormulas: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$\n", 'utf8');

    const ingestCall = await client.callTool({
        name: "ingest_source_to_evidence_pack",
        arguments: {
            sourcePath: sampleSourcePath,
            subject: "Math",
            chapter: "MCP-Test-Chapter",
            scratchDir: sampleScratchDir
        }
    });
    const ingestResult = JSON.parse(ingestCall.content[0].text);
    console.log("Ingestion result:", ingestResult);
    if (ingestResult.status !== "SUCCESS" || !ingestResult.evidence_hash) {
        throw new Error("ingest_source_to_evidence_pack failed!");
    }
    console.log("✅ MCP ingest_source_to_evidence_pack test passed!");

    // Test 9: Call export_anki_package on scratch chapter
    console.log("\n[Test 9] Calling 'export_anki_package' for scratch chapter...");
    const mcpChapterDir = path.resolve(__dirname, 'scratch/mcp_anki_chapter');
    const basicDir = path.join(mcpChapterDir, 'Basic');
    fs.mkdirSync(basicDir, { recursive: true });
    fs.writeFileSync(path.join(basicDir, 'mcp_anki_chapter_Basic.tsv'), "Front\tBack\tTags\nWhat is MCP?\tModel Context Protocol\tMCP::Core\n", 'utf8');

    const exportAnkiCall = await client.callTool({
        name: "export_anki_package",
        arguments: {
            chapterDir: mcpChapterDir,
            cleanIntermediates: false
        }
    });
    const exportAnkiResult = JSON.parse(exportAnkiCall.content[0].text);
    console.log("export_anki_package result:", exportAnkiResult);
    if (!exportAnkiResult.success || !fs.existsSync(exportAnkiResult.outputPath)) {
        throw new Error("export_anki_package failed to produce valid APKG!");
    }
    console.log("✅ MCP export_anki_package test passed!");

    // Test 10: Call export_studylab_procedural_package on real LCM-HCF PracticeQuestions
    console.log("\n[Test 10] Calling 'export_studylab_procedural_package' on LCM-HCF PracticeQuestions...");
    const vaultRoot = path.resolve(__dirname, '../../..');
    const lcmPracticePath = path.join(vaultRoot, 'Study Materials/Math/LCM-HCF/Optional/LCM-HCF_PracticeQuestions.json');
    const proceduralOutDir = path.resolve(__dirname, 'scratch/mcp_procedural_out');
    fs.mkdirSync(proceduralOutDir, { recursive: true });

    const exportProceduralCall = await client.callTool({
        name: "export_studylab_procedural_package",
        arguments: {
            targetPath: lcmPracticePath,
            outputDir: proceduralOutDir
        }
    });
    const exportProceduralResult = JSON.parse(exportProceduralCall.content[0].text);
    console.log("export_studylab_procedural_package result:", exportProceduralResult);
    if (!exportProceduralResult.success || !fs.existsSync(exportProceduralResult.outputPath)) {
        throw new Error("export_studylab_procedural_package failed to produce valid procedural APKG!");
    }
    console.log("✅ MCP export_studylab_procedural_package test passed!");

    // Test 11: Call validate_artifact for note_contract and apkg_standard
    console.log("\n[Test 11] Calling 'validate_artifact' for note_contract and apkg_standard...");
    const lcmNotePath = path.join(vaultRoot, 'Study Materials/Math/LCM-HCF/Notes/LCM-HCF_Notes.md');
    const noteValidationCall = await client.callTool({
        name: "validate_artifact",
        arguments: {
            artifactPath: lcmNotePath,
            artifactType: "note_contract"
        }
    });
    const noteResult = JSON.parse(noteValidationCall.content[0].text);
    console.log("Note contract validation result:", noteResult);
    if (!noteResult.isValid) {
        throw new Error("validate_artifact for note_contract failed!");
    }

    const apkgValidationCall = await client.callTool({
        name: "validate_artifact",
        arguments: {
            artifactPath: exportAnkiResult.outputPath,
            artifactType: "apkg_standard"
        }
    });
    const apkgResult = JSON.parse(apkgValidationCall.content[0].text);
    console.log("APKG standard validation result:", apkgResult);
    if (!apkgResult.isValid) {
        throw new Error("validate_artifact for apkg_standard failed!");
    }
    console.log("✅ MCP validate_artifact (note_contract & apkg_standard) test passed!");

    // Clean scratch
    try {
        if (fs.existsSync(sampleSourcePath)) fs.unlinkSync(sampleSourcePath);
        if (fs.existsSync(sampleScratchDir)) fs.rmSync(sampleScratchDir, { recursive: true, force: true });
        if (fs.existsSync(mcpChapterDir)) fs.rmSync(mcpChapterDir, { recursive: true, force: true });
        if (fs.existsSync(proceduralOutDir)) fs.rmSync(proceduralOutDir, { recursive: true, force: true });
    } catch (_) {}

    await client.close();
    console.log("\n🎉 ALL MCP TESTS PASSED SUCCESSFULLY!\n");
}

runTest().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
