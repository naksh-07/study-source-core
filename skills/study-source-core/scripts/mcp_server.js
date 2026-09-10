/**
 * StudySourceCore Local MCP Server (`mcp_server.js`)
 * 
 * Exposes core deterministic compilation, validation, and routing capabilities
 * via the Model Context Protocol (MCP) using stdio transport.
 * 
 * Reuses existing tested scripts without modifying their business logic:
 * - export_anki.js
 * - export_studylab_procedural_anki.js
 * - validate_tsv.js
 * - validate_apkg.js
 * - validate_studylab_procedural.js
 * - validate_studylab_practice_questions.js
 * - validate_studylab_levels_1_7.js
 * - latex_validator.js
 * - mermaid_validator.js
 * - subject_policy_resolver.js
 */

const fs = require('fs');
const path = require('path');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

// Existing business logic imports
const { exportChapterToAnki } = require('./export_anki');
const { exportStudyLabProceduralAnki } = require('./export_studylab_procedural_anki');
const { validateTsvContent } = require('./validate_tsv');
const { validateApkgContent } = require('./validate_apkg');
const { validateProceduralContent } = require('./validate_studylab_procedural');
const { validatePracticeQuestionsContent } = require('./validate_studylab_practice_questions');
const { validateStudyLabLevels1to7 } = require('./validate_studylab_levels_1_7');
const { validateLatexContent } = require('./latex_validator');
const { validateMermaidContent } = require('./mermaid_validator');
const { resolveSubjectPolicy } = require('./subject_policy_resolver');

// Initialize MCP Server
const server = new McpServer({
    name: "studysource-core",
    version: "1.0.0"
});

// Tool 1: Compile Standard Anki Package
server.tool(
    "export_anki_package",
    "Packages Basic, Cloze, and Native Image Occlusion flashcards of a chapter into ONE unified Anki deck package (.apkg).",
    {
        chapterDir: z.string().describe("Absolute path to the chapter directory containing Basic, Cloze, or ImageOcclusion artifacts.")
    },
    async ({ chapterDir }) => {
        try {
            if (!fs.existsSync(chapterDir)) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `[Error] Chapter directory does not exist: ${chapterDir}` }]
                };
            }
            const result = await exportChapterToAnki(path.resolve(chapterDir));
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
        } catch (err) {
            return {
                isError: true,
                content: [{ type: "text", text: `[APKG Export Error] ${err.message}` }]
            };
        }
    }
);

// Tool 2: Compile StudyLab Procedural Package
server.tool(
    "export_studylab_procedural_package",
    "Compiles STEM StudyLab practice questions and problem patterns into a dedicated standalone procedural .apkg package.",
    {
        targetPath: z.string().describe("Absolute path to the chapter directory or PracticeQuestions.json file."),
        problemPatternsPath: z.string().optional().describe("Optional path to ProblemPatterns.json if not in canonical location."),
        outputDir: z.string().optional().describe("Optional output directory for the generated .apkg package.")
    },
    async ({ targetPath, problemPatternsPath, outputDir }) => {
        try {
            if (!fs.existsSync(targetPath)) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `[Error] Target path does not exist: ${targetPath}` }]
                };
            }
            const options = {};
            if (problemPatternsPath) options.problemPatternsPath = path.resolve(problemPatternsPath);
            if (outputDir) options.outputDir = path.resolve(outputDir);

            const result = await exportStudyLabProceduralAnki(path.resolve(targetPath), options);
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
        } catch (err) {
            return {
                isError: true,
                content: [{ type: "text", text: `[Procedural Export Error] ${err.message}` }]
            };
        }
    }
);

// Tool 3: Validate Study Artifact
server.tool(
    "validate_artifact",
    "Validates a study artifact against strict pedagogical contracts (TSV structure, StudyLab JSONs, LaTeX math, Mermaid diagrams, or APKG integrity).",
    {
        artifactPath: z.string().describe("Absolute path to the artifact file."),
        artifactType: z.enum([
            "tsv",
            "studylab_procedural",
            "studylab_practice_questions",
            "apkg_standard",
            "apkg_studylab_levels_1_7",
            "latex",
            "mermaid"
        ]).describe("The type of artifact to validate.")
    },
    async ({ artifactPath, artifactType }) => {
        try {
            const resolvedPath = path.resolve(artifactPath);
            if (!fs.existsSync(resolvedPath)) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `[Error] Artifact file not found: ${resolvedPath}` }]
                };
            }

            let result = null;

            switch (artifactType) {
                case "tsv": {
                    const content = fs.readFileSync(resolvedPath, 'utf8');
                    result = validateTsvContent(content, resolvedPath);
                    break;
                }
                case "studylab_procedural": {
                    const content = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
                    result = validateProceduralContent(content, resolvedPath);
                    break;
                }
                case "studylab_practice_questions": {
                    const content = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
                    result = validatePracticeQuestionsContent(content, resolvedPath);
                    break;
                }
                case "apkg_standard": {
                    const buffer = fs.readFileSync(resolvedPath);
                    result = await validateApkgContent(buffer, resolvedPath);
                    break;
                }
                case "apkg_studylab_levels_1_7": {
                    result = await validateStudyLabLevels1to7(resolvedPath, {});
                    break;
                }
                case "latex": {
                    const content = fs.readFileSync(resolvedPath, 'utf8');
                    result = validateLatexContent(content, resolvedPath);
                    break;
                }
                case "mermaid": {
                    const content = fs.readFileSync(resolvedPath, 'utf8');
                    result = validateMermaidContent(content, resolvedPath);
                    break;
                }
            }

            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
        } catch (err) {
            return {
                isError: true,
                content: [{ type: "text", text: `[Validation Error] ${err.message}` }]
            };
        }
    }
);

// Tool 4: Resolve Subject Policy
server.tool(
    "resolve_subject_policy",
    "Resolves the authoritative artifact eligibility policy and toggles for a given subject.",
    {
        subjectName: z.string().describe("Canonical or alias subject name (e.g. 'Math', 'Physics', 'Biology', 'History').")
    },
    async ({ subjectName }) => {
        try {
            const policy = resolveSubjectPolicy(subjectName);
            return {
                content: [{ type: "text", text: JSON.stringify(policy, null, 2) }]
            };
        } catch (err) {
            return {
                isError: true,
                content: [{ type: "text", text: `[Policy Error] ${err.message}` }]
            };
        }
    }
);

// Start Stdio Transport
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[StudySourceCore MCP] Server listening on stdio.");
}

main().catch(err => {
    console.error("[StudySourceCore MCP Fatal Error]", err);
    process.exit(1);
});
