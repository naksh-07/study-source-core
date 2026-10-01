/**
 * StudySourceCore Local MCP Server (`mcp_server.js`)
 * 
 * Exposes core deterministic compilation, validation, PDF/OCR ingestion,
 * SQLite WAL contract lookup, and routing capabilities via the Model Context Protocol (MCP)
 * using stdio transport.
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
const { validateQuestionBankMarkdown } = require('./validate_studylab_question_bank');
const { validateImageOcclusionContent } = require('./validate_image_occlusion');
const { auditNoteContract } = require('./note_contract_audit');
const { validateLatexContent } = require('./latex_validator');
const { validateMermaidContent } = require('./mermaid_validator');
const { resolveSubjectPolicy } = require('./subject_policy_resolver');
const { getContractByKeySync, getAllContractsSync } = require('./procedural_db_client');
const { ingestSourceToEvidencePack, persistEvidencePack } = require('./evidence_ingestion_engine');

// Initialize MCP Server
const server = new McpServer({
    name: "studysource-core",
    version: "1.2.0-beta.5"
});

// Tool 1: Compile Standard Anki Package
server.tool(
    "export_anki_package",
    "Packages Basic, Cloze, and Native Image Occlusion flashcards of a chapter into ONE unified Anki deck package (.apkg).",
    {
        chapterDir: z.string().describe("Absolute path to the chapter directory containing Basic, Cloze, or ImageOcclusion artifacts."),
        cleanIntermediates: z.boolean().optional().default(true).describe("Whether to clean temporary build TSVs after successful validation. Defaults to true.")
    },
    async ({ chapterDir, cleanIntermediates = true }) => {
        try {
            if (!fs.existsSync(chapterDir)) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `[Error] Chapter directory does not exist: ${chapterDir}` }]
                };
            }
            const result = await exportChapterToAnki(path.resolve(chapterDir), { cleanIntermediates });
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
    "Validates a study artifact against strict pedagogical contracts (TSV structure, StudyLab JSONs, Question Bank 17-dimension Markdown, Image Occlusion JSON, Note Contract, LaTeX math, Mermaid diagrams, or APKG integrity).",
    {
        artifactPath: z.string().describe("Absolute path to the artifact file."),
        artifactType: z.enum([
            "tsv",
            "studylab_procedural",
            "studylab_practice_questions",
            "studylab_question_bank",
            "image_occlusion",
            "note_contract",
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
                case "studylab_question_bank": {
                    const content = fs.readFileSync(resolvedPath, 'utf8');
                    result = validateQuestionBankMarkdown(content);
                    break;
                }
                case "image_occlusion": {
                    const content = fs.readFileSync(resolvedPath, 'utf8');
                    result = validateImageOcclusionContent(content, resolvedPath);
                    break;
                }
                case "note_contract": {
                    result = auditNoteContract(resolvedPath);
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
    "Resolves the authoritative artifact eligibility policy and language mode for a given subject.",
    {
        subjectName: z.string().describe("Canonical or alias subject name (e.g. 'Math', 'Physics', 'Biology', 'History')."),
        languagePolicy: z.enum(["hinglish", "en", "hi", "bilingual"]).optional().describe("Optional language policy override (defaults to 'hinglish').")
    },
    async ({ subjectName, languagePolicy }) => {
        try {
            const policy = resolveSubjectPolicy(subjectName, languagePolicy ? { language_policy: languagePolicy } : {});
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

// Tool 5: Ingest Source to Evidence Pack (PDF / OCR / JSON / Markdown)
server.tool(
    "ingest_source_to_evidence_pack",
    "Ingests a PDF (with PyMuPDF/OCR extraction and optional page-range slicing), JSON, or Markdown source into a cryptographically hashed Evidence Pack.",
    {
        sourcePath: z.string().describe("Absolute path to the source PDF, JSON, or Markdown file."),
        subject: z.string().describe("Subject name (e.g. 'Math', 'Physics', 'Map')."),
        chapter: z.string().describe("Chapter name (e.g. 'LCM-HCF', 'Europe')."),
        pageStart: z.number().int().positive().optional().describe("Optional 1-indexed starting page for PDF extraction."),
        pageEnd: z.number().int().positive().optional().describe("Optional 1-indexed ending page for PDF extraction."),
        scratchDir: z.string().optional().describe("Optional output directory for evidence-pack.md and provenance JSON.")
    },
    async ({ sourcePath, subject, chapter, pageStart, pageEnd, scratchDir }) => {
        try {
            const resolvedSource = path.resolve(sourcePath);
            if (!fs.existsSync(resolvedSource)) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `[Error] Source file not found: ${resolvedSource}` }]
                };
            }
            const pack = ingestSourceToEvidencePack(resolvedSource, {
                subject,
                chapter,
                page_start: pageStart,
                page_end: pageEnd
            });
            const targetScratch = scratchDir ? path.resolve(scratchDir) : path.join(__dirname, '..', 'scratch');
            const persisted = persistEvidencePack(pack, targetScratch);
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        status: "SUCCESS",
                        evidence_pack_id: pack.evidence_pack_id,
                        evidence_hash: pack.evidence_hash,
                        chunks_count: pack.chunks.length,
                        concepts_count: pack.concepts.length,
                        formulas_count: pack.formulas.length,
                        questions_count: pack.source_problems.length,
                        markdown_path: persisted.markdownPath,
                        provenance_path: persisted.provenancePath
                    }, null, 2)
                }]
            };
        } catch (err) {
            return {
                isError: true,
                content: [{ type: "text", text: `[Ingestion Error] ${err.message}` }]
            };
        }
    }
);

// Tool 6: Query Procedural Contract from SQLite WAL DB
server.tool(
    "query_procedural_contract",
    "Queries canonical StudyLab procedural contracts from the native SQLite WAL database (procedural.db) by family_id or domain.",
    {
        familyId: z.string().optional().describe("Exact contract family_id or skill_id to look up."),
        domain: z.string().optional().describe("Domain filter (e.g. 'mathematics', 'physics', 'chemistry', 'reasoning').")
    },
    async ({ familyId, domain }) => {
        try {
            if (familyId) {
                const contract = getContractByKeySync(familyId);
                return {
                    content: [{ type: "text", text: JSON.stringify({ found: !!contract, contract }, null, 2) }]
                };
            }
            if (domain) {
                const all = getAllContractsSync();
                const matched = Object.entries(all)
                    .filter(([k, v]) => (v.domain && v.domain.toLowerCase() === domain.toLowerCase()) || k.toLowerCase().startsWith(domain.toLowerCase()))
                    .map(([k, v]) => ({ key: k, contract: v }));
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            domain,
                            count: matched.length,
                            family_ids: matched.map(c => c.key)
                        }, null, 2)
                    }]
                };
            }
            return {
                isError: true,
                content: [{ type: "text", text: "[Error] Specify either familyId or domain." }]
            };
        } catch (err) {
            return {
                isError: true,
                content: [{ type: "text", text: `[Procedural DB Error] ${err.message}` }]
            };
        }
    }
);

// Start Stdio Transport
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[StudySourceCore MCP] Server v1.2.0-beta.5 listening on stdio.");
}

main().catch(err => {
    console.error("[StudySourceCore MCP Fatal Error]", err);
    process.exit(1);
});
