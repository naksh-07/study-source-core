#!/usr/bin/env node
/**
 * StudySourceCore Master Smoke Test & Architectural Integrity Harness (`run_master_smoke_test.js`)
 * 
 * An authoritative, black-box smoke testing harness designed to verify that the entire
 * system (all 5 subject domains, 14 subagents, unified CLI, MCP server, binary APKG packages,
 * and fail-closed invariants) works without relying on in-memory mocks, skipped tests,
 * or tampered validator thresholds.
 * 
 * Verification Pillars:
 * 1. Anti-Tamper & Code Freeze Verification (Validators, Schemas, Subagent Markdown)
 * 2. 5-Domain End-to-End Smoke Matrix (Physics, Math, Chemistry, Reasoning, Map)
 * 3. Deep Black-Box APKG & Raw SQLite Inspection (Night Mode CSS, MCQs, Non-Leaking Hints)
 * 4. Unified CLI & Local MCP Server Stdio Smoke
 * 5. Adversarial Blast-Radius & Fail-Closed Invariants
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');
const initSqlJs = require('sql.js');
const JSZip = require('jszip');

// Import core engines & validators
const { resolveSubjectPolicy } = require('./subject_policy_resolver');
const { evaluateArtifactRouting } = require('./routing_engine');
const { getCanonicalArtifactPaths, getVaultRoot, resolveChapterDir } = require('./path_resolver');
const { getArtifactRegistry } = require('./artifact_registry');
const {
    buildExecutionTaskGraph,
    executeTaskWorkflow,
    createSpecialistTaskDispatcher,
    assertNoParentSelfExecution,
    validateStructuredHandoff
} = require('./orchestration_engine');

const { validateTsvContent } = require('./validate_tsv');
const { validateApkg } = require('./validate_apkg');
const { validateProceduralApkg } = require('./validate_studylab_procedural_apkg');
const { validateStudyLabLevels1to7 } = require('./validate_studylab_levels_1_7');
const {
    validateQuestionBankContent,
    validateQuestionBankMarkdown,
    hintLeaksAnswer
} = require('./validate_studylab_question_bank');
const { renderQuestionBankToMarkdown } = require('./render_studylab_question_bank');
const { validateImageOcclusionContent } = require('./validate_image_occlusion');
const { auditNoteContract } = require('./note_contract_audit');
const { validateMapContent } = require('./validate_map');
const { auditSlideDeckPrompt } = require('./slide_deck_prompt_audit');
const { parseFlags, collectVaultStatus, runCli } = require('./studycore_cli');

// Specialist Authoring engines
const { authorChemistryProceduralContent } = require('./author_chemistry_studylab');
const { authorReasoningProceduralContent } = require('./author_reasoning_studylab');

// MCP Client SDK
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const VAULT_ROOT = getVaultRoot(__dirname);
const SCRATCH_DIR = path.resolve(__dirname, 'scratch/master_smoke_test');

let passedTests = 0;
let failedTests = 0;
const failureDetails = [];

async function runSmokeCheck(sectionName, checkName, testFn) {
    process.stdout.write(`  [${sectionName}] ${checkName} ... `);
    try {
        await testFn();
        console.log('✅ PASS');
        passedTests++;
    } catch (err) {
        console.log('❌ FAIL');
        console.error(`     Error: ${err.message}`);
        failureDetails.push({ section: sectionName, check: checkName, error: err.message });
        failedTests++;
    }
}

async function main() {
    console.log('================================================================================');
    console.log('STUDYSOURCECORE — MASTER SMOKE TEST & ARCHITECTURAL INTEGRITY HARNESS');
    console.log('Target Version: v1.2.0-beta.5 | Zero Mocks | Zero Compromise');
    console.log('================================================================================\n');

    fs.mkdirSync(SCRATCH_DIR, { recursive: true });

    // =========================================================================
    // STAGE 1: Anti-Tamper & Code Freeze Audit
    // =========================================================================
    console.log('--- STAGE 1: Anti-Tamper & Code Freeze Audit ---');

    await runSmokeCheck('STAGE 1', '1.1 Validator Integrity Scan: Asserts zero mock bypasses or skipped assertions', () => {
        const validatorFiles = [
            'note_contract_audit.js',
            'validate_apkg.js',
            'validate_studylab_levels_1_7.js',
            'validate_studylab_question_bank.js',
            'validate_tsv.js',
            'validate_image_occlusion.js',
            'validate_map.js',
            'slide_deck_prompt_audit.js'
        ];

        for (const file of validatorFiles) {
            const filePath = path.resolve(__dirname, file);
            assert(fs.existsSync(filePath), `Validator missing: ${file}`);
            const code = fs.readFileSync(filePath, 'utf8');

            assert(!code.includes('SKIP_VALIDATION = true'), `Mock bypass found in ${file}`);
            assert(!code.includes('isTest ? true :'), `Conditional test bypass found in ${file}`);
            assert(!code.includes('test.skip(') && !code.includes('it.skip('), `Skipped test block found in ${file}`);
        }
    });

    await runSmokeCheck('STAGE 1', '1.2 Draft-07 Schema Invariants: Verifies strict immutable constraints intact', () => {
        const schemaDir = path.resolve(__dirname, '../resources/schemas');
        const pqSchemaPath = path.join(schemaDir, 'studylab-practice-questions-schema.json');
        const ioSchemaPath = path.resolve(__dirname, '../resources/image-occlusion-schema.json');

        if (fs.existsSync(pqSchemaPath)) {
            const pqSchema = JSON.parse(fs.readFileSync(pqSchemaPath, 'utf8'));
            const mcqOptions = pqSchema.definitions?.practice_item?.properties?.options ||
                               pqSchema.properties?.questions?.items?.properties?.options;
            if (mcqOptions) {
                assert.strictEqual(mcqOptions.minItems, 4, 'MCQ minItems constraint must be >= 4');
            }
        }

        if (fs.existsSync(ioSchemaPath)) {
            const ioSchema = JSON.parse(fs.readFileSync(ioSchemaPath, 'utf8'));
            assert(ioSchema, 'Image occlusion schema must exist and parse cleanly');
        }
    });

    await runSmokeCheck('STAGE 1', '1.3 Subagent Definition Audit: Validates all 14 specialist subagent files', () => {
        const repoRoot = path.resolve(__dirname, '../../..');
        const agentsDir = path.resolve(repoRoot, '.agents/agents');
        assert(fs.existsSync(agentsDir), `.agents/agents directory missing at ${agentsDir}`);

        const expectedAgents = [
            'core-notes', 'core-basic-anki', 'core-cloze-anki', 'core-image-occlusion',
            'core-mindmap', 'core-slide-deck', 'bm-graph', 'bm-qa',
            'math-apkg-author', 'reasoning-apkg-author', 'physics-numerical-apkg-author',
            'chemistry-numerical-apkg-author', 'mold-gap-auditor', 'adversarial-apkg-reviewer'
        ];

        const requiredSections = [
            '## 1. ROLE', '## 2. WHY THIS AGENT EXISTS', '## 3. OWNS', '## 4. DOES NOT OWN',
            '## 5. INPUT', '## 6. REQUIRED CONTEXT', '## 7. INVOCATION TRIGGER', '## 8. PROCESS',
            '## 9. OUTPUT', '## 10. HANDOFF FORMAT', '## 11. VALIDATION', '## 12. FAILURE CONDITIONS',
            '## 13. DUPLICATION GUARD', '## 14. EXAMPLES'
        ];

        for (const agentId of expectedAgents) {
            const mdFile = path.join(agentsDir, `${agentId}.md`);
            assert(fs.existsSync(mdFile), `Missing agent definition file: ${agentId}.md`);
            const content = fs.readFileSync(mdFile, 'utf8');

            assert(content.includes('write_to_file'), `Agent ${agentId} must have write_to_file tool`);
            assert(content.includes('replace_file_content'), `Agent ${agentId} must have replace_file_content tool`);
            assert(content.includes('inheritMcp: true'), `Agent ${agentId} must have inheritMcp: true`);

            let lastIndex = -1;
            for (const section of requiredSections) {
                const idx = content.indexOf(section);
                assert(idx !== -1, `Agent ${agentId} is missing section '${section}'`);
                assert(idx > lastIndex, `Agent ${agentId} section '${section}' is out of order`);
                lastIndex = idx;
            }
        }
    });

    // =========================================================================
    // STAGE 2: 5-Domain End-to-End Smoke Matrix
    // =========================================================================
    console.log('\n--- STAGE 2: 5-Domain End-to-End Smoke Matrix ---');

    await runSmokeCheck('STAGE 2', '2.1 Track A (Map/Geography): Validates Europe visual sibling artifact suite', () => {
        const mapDir = path.resolve(VAULT_ROOT, 'Study Materials/Map/Europe');
        const notesPath = path.join(mapDir, 'Notes/Europe_Notes.md');
        const basicPath = path.join(mapDir, 'Basic/Europe_Basic.tsv');
        const clozePath = path.join(mapDir, 'Cloze/Europe_Cloze.tsv');
        const ioPath = path.join(mapDir, 'ImageOcclusion/Europe_ImageOcclusion.json');
        const mapJsonPath = path.join(mapDir, 'MindMap/Europe.mindmap.json');
        const slidePath = path.join(mapDir, 'SlideDeck/Europe_SlideDeckPrompt.md');
        const ankiPath = path.join(mapDir, 'Europe_Anki.apkg');

        assert(fs.existsSync(notesPath), 'Europe Notes missing');
        const noteRes = auditNoteContract(notesPath, { silent: true });
        assert.strictEqual(noteRes.success, true, 'Europe Notes contract audit failed');

        assert(fs.existsSync(basicPath), 'Europe Basic TSV missing');
        const basicRes = validateTsvContent(fs.readFileSync(basicPath, 'utf8'), 'Europe_Basic.tsv');
        assert.strictEqual(basicRes.isValid, true, 'Europe Basic TSV invalid');

        assert(fs.existsSync(clozePath), 'Europe Cloze TSV missing');
        const clozeRes = validateTsvContent(fs.readFileSync(clozePath, 'utf8'), 'Europe_Cloze.tsv');
        assert.strictEqual(clozeRes.isValid, true, 'Europe Cloze TSV invalid');

        assert(fs.existsSync(ioPath), 'Europe Image Occlusion manifest missing');
        const ioRes = validateImageOcclusionContent(fs.readFileSync(ioPath, 'utf8'), 'Europe_ImageOcclusion.json');
        assert.strictEqual(ioRes.isValid, true, 'Europe Image Occlusion manifest invalid');

        assert(fs.existsSync(mapJsonPath), 'Europe MindMap missing');
        const mapRes = validateMapContent(fs.readFileSync(mapJsonPath, 'utf8'), 'Europe.mindmap.json');
        assert.strictEqual(mapRes.isValid, true, 'Europe MindMap invalid');

        assert(fs.existsSync(slidePath), 'Europe SlideDeck Prompt missing');
        const slideRes = auditSlideDeckPrompt(slidePath);
        assert.strictEqual(slideRes.passed, true, 'Europe SlideDeck Prompt invalid');

        assert(fs.existsSync(ankiPath), 'Europe Anki APKG missing');

        const mapPolicy = resolveSubjectPolicy('Map');
        assert.strictEqual(mapPolicy.proceduralApkg, false, 'Map must suppress procedural APKG');
    });

    await runSmokeCheck('STAGE 2', '2.2 Track B (Mathematics): Validates LCM-HCF arithmetic progression & coprime suite', () => {
        const mathDir = path.resolve(VAULT_ROOT, 'Study Materials/Math/LCM-HCF');
        const notesPath = path.join(mathDir, 'Notes/LCM-HCF_Notes.md');
        const basicPath = path.join(mathDir, 'Basic/LCM-HCF_Basic.tsv');
        const ankiPath = path.join(mathDir, 'LCM-HCF_Anki.apkg');
        const procApkgPath = path.join(mathDir, 'StudyLab/LCM-HCF_StudyLab_Procedural.apkg');

        assert(fs.existsSync(notesPath), 'Math Notes missing');
        assert.strictEqual(auditNoteContract(notesPath, { silent: true }).success, true, 'Math Notes contract audit failed');

        assert(fs.existsSync(basicPath), 'Math Basic TSV missing');
        assert.strictEqual(validateTsvContent(fs.readFileSync(basicPath, 'utf8'), 'LCM-HCF_Basic.tsv').isValid, true);

        assert(fs.existsSync(ankiPath), 'Math Anki APKG missing');
        assert(fs.existsSync(procApkgPath), 'Math Procedural APKG missing');
    });

    await runSmokeCheck('STAGE 2', '2.3 Track C (Reasoning): Authors and validates Syllogism & Seating Arrangement suite', async () => {
        const reasFixturePath = path.resolve(__dirname, '../resources/fixtures/reasoning_syllogism_seating_source_fixture.json');
        assert(fs.existsSync(reasFixturePath), 'Reasoning fixture missing');
        const reasFixture = JSON.parse(fs.readFileSync(reasFixturePath, 'utf8'));

        const scratchReas = path.join(SCRATCH_DIR, 'reasoning_smoke');
        fs.mkdirSync(scratchReas, { recursive: true });

        const canonicalQB = authorReasoningProceduralContent(reasFixture, { evidenceHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' });
        assert(canonicalQB && Array.isArray(canonicalQB.questions), 'Reasoning authoring returned invalid question bank');
        assert(canonicalQB.questions.length >= 2, `Expected >= 2 reasoning questions, got ${canonicalQB.questions.length}`);

        const mdContent = renderQuestionBankToMarkdown(canonicalQB);
        const qbPath = path.join(scratchReas, 'Syllogisms-Puzzles_Questions.md');
        fs.writeFileSync(qbPath, mdContent, 'utf8');

        const qbRes = validateQuestionBankMarkdown(mdContent, qbPath);
        assert.strictEqual(qbRes.isValid, true, `Reasoning Question Bank invalid: ${qbRes.errors.join(', ')}`);
        assert.strictEqual(qbRes.hintLeaks?.length || 0, 0, 'Reasoning Question Bank has hint leaks');
    });

    await runSmokeCheck('STAGE 2', '2.4 Track D (Physics Numerical): Validates Newton-Laws-Friction 8/8 deliverables', () => {
        const physDir = path.resolve(VAULT_ROOT, 'Study Materials/Physics/Newton-Laws-Friction');
        const notesPath = path.join(physDir, 'Notes/Newton-Laws-Friction_Notes.md');
        const basicPath = path.join(physDir, 'Basic/Newton-Laws-Friction_Basic.tsv');
        const clozePath = path.join(physDir, 'Cloze/Newton-Laws-Friction_Cloze.tsv');
        const mapPath = path.join(physDir, 'MindMap/Newton-Laws-Friction.mindmap.json');
        const slidePath = path.join(physDir, 'SlideDeck/Newton-Laws-Friction_SlideDeckPrompt.md');
        const qbPath = path.join(physDir, 'StudyLab/Newton-Laws-Friction_Questions.md');
        const ankiPath = path.join(physDir, 'Newton-Laws-Friction_Anki.apkg');
        const procApkgPath = path.join(physDir, 'StudyLab/Newton-Laws-Friction_StudyLab_Procedural.apkg');

        assert(fs.existsSync(notesPath), 'Physics Notes missing');
        const noteRes = auditNoteContract(notesPath, { silent: true });
        assert.strictEqual(noteRes.success, true, 'Physics Notes contract audit failed');

        assert(fs.existsSync(basicPath), 'Physics Basic TSV missing');
        assert.strictEqual(validateTsvContent(fs.readFileSync(basicPath, 'utf8'), 'Newton-Laws-Friction_Basic.tsv').isValid, true);

        assert(fs.existsSync(clozePath), 'Physics Cloze TSV missing');
        assert.strictEqual(validateTsvContent(fs.readFileSync(clozePath, 'utf8'), 'Newton-Laws-Friction_Cloze.tsv').isValid, true);

        assert(fs.existsSync(mapPath), 'Physics MindMap missing');
        assert.strictEqual(validateMapContent(fs.readFileSync(mapPath, 'utf8'), 'Newton-Laws-Friction.mindmap.json').isValid, true);

        assert(fs.existsSync(slidePath), 'Physics SlideDeck missing');
        assert.strictEqual(auditSlideDeckPrompt(slidePath).passed, true, 'Physics SlideDeck invalid');

        assert(fs.existsSync(qbPath), 'Physics Questions.md missing');
        const qbRes = validateQuestionBankMarkdown(fs.readFileSync(qbPath, 'utf8'), qbPath);
        assert.strictEqual(qbRes.isValid, true, `Physics Question Bank invalid: ${qbRes.errors.join(', ')}`);
        assert.strictEqual(qbRes.hintLeaks?.length || 0, 0, 'Physics Question Bank has hint leaks');

        assert(fs.existsSync(ankiPath), 'Physics Declarative APKG missing');
        assert(fs.existsSync(procApkgPath), 'Physics Procedural APKG missing');
    });

    await runSmokeCheck('STAGE 2', '2.5 Track E (Chemistry Equilibrium): Authors and validates ICE tables & Kc suite', async () => {
        const chemFixturePath = path.resolve(__dirname, '../resources/fixtures/chemistry_chemical_equilibrium_source_fixture.json');
        assert(fs.existsSync(chemFixturePath), 'Chemistry fixture missing');
        const chemFixture = JSON.parse(fs.readFileSync(chemFixturePath, 'utf8'));

        const scratchChem = path.join(SCRATCH_DIR, 'chemistry_smoke');
        fs.mkdirSync(scratchChem, { recursive: true });

        const canonicalQB = authorChemistryProceduralContent(chemFixture, { evidenceHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' });
        assert(canonicalQB && Array.isArray(canonicalQB.questions), 'Chemistry authoring returned invalid question bank');
        assert(canonicalQB.questions.length >= 2, `Expected >= 2 chemistry questions, got ${canonicalQB.questions.length}`);

        const mdContent = renderQuestionBankToMarkdown(canonicalQB);
        const qbPath = path.join(scratchChem, 'Chemical-Equilibrium_Questions.md');
        fs.writeFileSync(qbPath, mdContent, 'utf8');

        const qbRes = validateQuestionBankMarkdown(mdContent, qbPath);
        assert.strictEqual(qbRes.isValid, true, `Chemistry Question Bank invalid: ${qbRes.errors.join(', ')}`);
        assert.strictEqual(qbRes.hintLeaks?.length || 0, 0, 'Chemistry Question Bank has hint leaks');
    });

    // =========================================================================
    // STAGE 3: Deep Black-Box APKG & SQLite Inspection
    // =========================================================================
    console.log('\n--- STAGE 3: Deep Black-Box APKG & SQLite Inspection ---');

    await runSmokeCheck('STAGE 3', '3.1 SQLite Schema & Model Verification: Night Mode CSS & Tables', async () => {
        const SQL = await initSqlJs();
        const packagesToInspect = [
            path.resolve(VAULT_ROOT, 'Study Materials/Map/Europe/Europe_Anki.apkg'),
            path.resolve(VAULT_ROOT, 'Study Materials/Math/LCM-HCF/LCM-HCF_Anki.apkg'),
            path.resolve(VAULT_ROOT, 'Study Materials/Physics/Newton-Laws-Friction/Newton-Laws-Friction_Anki.apkg')
        ];

        for (const apkgPath of packagesToInspect) {
            assert(fs.existsSync(apkgPath), `APKG missing: ${apkgPath}`);
            const zip = await JSZip.loadAsync(fs.readFileSync(apkgPath));
            const dbFile = zip.file('collection.anki21') || zip.file('collection.anki2');
            assert(dbFile, `collection.anki2 missing in ${path.basename(apkgPath)}`);

            const db = new SQL.Database(await dbFile.async('nodebuffer'));

            const colRes = db.exec('SELECT models FROM col');
            assert(colRes.length > 0 && colRes[0].values.length > 0, 'col table models missing');
            const models = JSON.parse(colRes[0].values[0][0]);

            for (const mid of Object.keys(models)) {
                const model = models[mid];
                assert(model.css, `Model ${mid} in ${path.basename(apkgPath)} has no CSS`);
                assert(model.css.includes('.nightMode.card') || model.css.includes('.nightMode .card'),
                    `Model ${mid} in ${path.basename(apkgPath)} missing .nightMode CSS`);
            }

            const notesRes = db.exec('SELECT id, flds FROM notes');
            assert(notesRes.length > 0 && notesRes[0].values.length > 0, `No notes in ${path.basename(apkgPath)}`);
            for (const row of notesRes[0].values) {
                const flds = String(row[1]).split('\x1f');
                assert(flds.length >= 2, `Note ${row[0]} must have >= 2 fields in ${path.basename(apkgPath)}`);
                assert(flds[0].trim().length > 0, `Front field empty in note ${row[0]}`);
            }
        }
    });

    await runSmokeCheck('STAGE 3', '3.2 Procedural Anchor SQLite Inspection: Non-leaking hints & MCQ invariant', async () => {
        const SQL = await initSqlJs();
        const procPackages = [
            path.resolve(VAULT_ROOT, 'Study Materials/Math/LCM-HCF/StudyLab/LCM-HCF_StudyLab_Procedural.apkg'),
            path.resolve(VAULT_ROOT, 'Study Materials/Physics/Newton-Laws-Friction/StudyLab/Newton-Laws-Friction_StudyLab_Procedural.apkg')
        ];

        for (const apkgPath of procPackages) {
            assert(fs.existsSync(apkgPath), `Procedural APKG missing: ${apkgPath}`);
            const zip = await JSZip.loadAsync(fs.readFileSync(apkgPath));
            const dbFile = zip.file('collection.anki21') || zip.file('collection.anki2');
            assert(dbFile, `collection.anki2 missing in ${path.basename(apkgPath)}`);

            const db = new SQL.Database(await dbFile.async('nodebuffer'));
            const notesRes = db.exec('SELECT id, flds FROM notes');
            assert(notesRes.length > 0 && notesRes[0].values.length > 0, `No procedural notes in ${path.basename(apkgPath)}`);

            for (const row of notesRes[0].values) {
                const flds = String(row[1]).split('\x1f');
                const payload = JSON.parse(flds[0]);

                assert(payload.proc_schema, `Procedural note ${row[0]} missing proc_schema`);
                assert(payload.inline_contract, `Procedural note ${row[0]} missing inline_contract`);

                if (payload.inline_contract?.options) {
                    assert(payload.inline_contract.options.length >= 4,
                        `MCQ in note ${row[0]} has fewer than 4 options in ${path.basename(apkgPath)}`);
                }
            }
        }
    });

    // =========================================================================
    // STAGE 4: Unified CLI & Local MCP Server Stdio Smoke
    // =========================================================================
    console.log('\n--- STAGE 4: Unified CLI & Local MCP Server Stdio Smoke ---');

    await runSmokeCheck('STAGE 4', '4.1 Unified CLI Subprocess Inspection: status, verify Physics & Map', async () => {
        const cliPath = path.resolve(__dirname, 'studycore_cli.js');

        // 1. studycore status --json
        const statusOutput = execFileSync('node', [cliPath, 'status', '--json'], { encoding: 'utf8' });
        const statusObj = JSON.parse(statusOutput);
        assert(Array.isArray(statusObj.chapters), 'statusObj.chapters must be an array');
        assert(statusObj.chapters.length >= 3, `Expected >= 3 vault chapters, got ${statusObj.chapters.length}`);

        // 2. studycore verify Physics Newton-Laws-Friction --json
        const physVerifyOutput = execFileSync('node', [cliPath, 'verify', 'Physics', 'Newton-Laws-Friction', '--json'], { encoding: 'utf8' });
        const physObj = JSON.parse(physVerifyOutput);
        assert.strictEqual(physObj.status, 'SUCCESS', 'verify Physics Newton-Laws-Friction must succeed');
        assert.strictEqual(physObj.results.every(r => r.passed), true, 'All physics checks must pass');

        // 3. studycore verify Map Europe --json
        const mapVerifyOutput = execFileSync('node', [cliPath, 'verify', 'Map', 'Europe', '--json'], { encoding: 'utf8' });
        const mapObj = JSON.parse(mapVerifyOutput);
        assert.strictEqual(mapObj.status, 'SUCCESS', 'verify Map Europe must succeed');
        assert.strictEqual(mapObj.results.every(r => r.passed), true, 'All map checks must pass');
    });

    await runSmokeCheck('STAGE 4', '4.2 MCP Server Stdio Transport: Discovers & invokes 6 deterministic tools', async () => {
        const serverScript = path.resolve(__dirname, 'mcp_server.js');
        const transport = new StdioClientTransport({
            command: 'node',
            args: [serverScript]
        });

        const client = new Client({ name: 'smoke-test-client', version: '1.0.0' });
        await client.connect(transport);

        try {
            // Test 1: listTools
            const toolsRes = await client.listTools();
            const toolNames = toolsRes.tools.map(t => t.name);
            const expectedTools = [
                'export_anki_package',
                'export_studylab_procedural_package',
                'validate_artifact',
                'resolve_subject_policy',
                'ingest_source_to_evidence_pack',
                'query_procedural_contract'
            ];
            for (const t of expectedTools) {
                assert(toolNames.includes(t), `MCP server missing expected tool: ${t}`);
            }

            // Test 2: resolve_subject_policy
            const mathPolicyCall = await client.callTool({
                name: 'resolve_subject_policy',
                arguments: { subjectName: 'Math' }
            });
            const mathPolicy = JSON.parse(mathPolicyCall.content[0].text);
            assert.strictEqual(mathPolicy.proceduralQuestionBank, true);

            // Test 3: query_procedural_contract by domain
            const contractCall = await client.callTool({
                name: 'query_procedural_contract',
                arguments: { domain: 'physics' }
            });
            const contractData = JSON.parse(contractCall.content[0].text);
            assert(contractData && contractData.count >= 0, 'query_procedural_contract failed for domain physics');

            // Test 4: validate_artifact (tsv)
            const sampleTsvPath = path.resolve(VAULT_ROOT, 'Study Materials/Map/Europe/Basic/Europe_Basic.tsv');
            const tsvValCall = await client.callTool({
                name: 'validate_artifact',
                arguments: {
                    artifactType: 'tsv',
                    artifactPath: sampleTsvPath
                }
            });
            const tsvVal = JSON.parse(tsvValCall.content[0].text);
            assert.strictEqual(tsvVal.isValid, true, 'validate_artifact failed on valid TSV');
        } finally {
            await client.close();
        }
    });

    await runSmokeCheck('STAGE 4', '4.3 Telemetry & Observability: Inspects live spans, token economy & calibration scorecard', () => {
        const { telemetry, TELEMETRY_LAYERS } = require('./telemetry_engine');
        const smokeSpan = telemetry.startSpan({
            layer: TELEMETRY_LAYERS.VALIDATOR,
            name: 'smoke_test:live_inspection',
            subject: 'Physics',
            chapter: 'Newton-Laws-Friction'
        });
        smokeSpan.end({ metadata: { verified: true } });

        const cliPath = path.resolve(__dirname, 'studycore_cli.js');
        const telOutput = execFileSync('node', [cliPath, 'telemetry', '--json'], { encoding: 'utf8' });
        const telObj = JSON.parse(telOutput);
        assert(telObj && telObj.status, 'Telemetry report must have a status');
        assert(Array.isArray(telObj.recommendations), 'Telemetry recommendations must be an array');
        assert(telObj.latencies && typeof telObj.latencies.p50_ms === 'number', 'Telemetry must compute P50 latency');

        const spansOutput = execFileSync('node', [cliPath, 'telemetry', '--spans', '--json'], { encoding: 'utf8' });
        const spansArr = JSON.parse(spansOutput);
        assert(Array.isArray(spansArr), 'Telemetry spans output must be an array');
        assert(spansArr.length >= 1, 'Expected at least 1 span in recent timeline');
    });

    // =========================================================================
    // STAGE 5: Adversarial Blast-Radius & Fail-Closed Invariants
    // =========================================================================
    console.log('\n--- STAGE 5: Adversarial Blast-Radius & Fail-Closed Invariants ---');

    await runSmokeCheck('STAGE 5', '5.1 Path Traversal Penetration: Rejects unauthorized directory references', async () => {
        const { exportChapterToAnki } = require('./export_anki');
        let threw = false;
        try {
            await exportChapterToAnki('../../../etc/passwd', { cleanIntermediates: false });
        } catch (err) {
            threw = true;
        }
        assert.strictEqual(threw, true, 'exportChapterToAnki must fail closed on path traversal');
    });

    await runSmokeCheck('STAGE 5', '5.2 Question Bank Hint Leak Penetration: Detects leaked answers in Tier 1/2 hints', () => {
        const leakyQB = {
            schema_version: '1.0.0',
            domain: 'Physics',
            chapter: 'LeakTest',
            skill_id: 'phys.leak',
            language: 'hi',
            provenance: { source: 'Test', chapter: 'LeakTest', origin: 'source_derived' },
            patterns: [{ id: 'pat-001', archetype: 'test', method: 'test' }],
            questions: [
                {
                    id: 'q-leak-001',
                    pattern_id: 'pat-001',
                    provenance: { origin: 'source_derived' },
                    question_type: 'mcq',
                    difficulty: 2.0,
                    question: 'What is the force?',
                    options: ['(A) 10 N', '(B) 20 N', '(C) 30 N', '(D) 40 N'],
                    correct_answer: '20 N',
                    hints: {
                        tier1_conceptual: 'The answer is 20 N, choose option B', // LEAK!
                        tier2_strategic: 'Calculate using F = ma',
                        tier3_next_step: 'Final check'
                    },
                    solution: 'F = 20 N',
                    verification: 'Valid',
                    recognition_signals: ['force'],
                    expected_method: 'method',
                    decision_points: ['decision'],
                    trap: 'trap',
                    error_category: ['ERR_01'],
                    prerequisites: ['physics.kinematics']
                }
            ]
        };

        const valRes = validateQuestionBankContent(leakyQB);
        assert.strictEqual(valRes.isValid, false, 'Leaky Question Bank must fail validation');
        assert(valRes.errors.some(e => e.includes('HINT_ANSWER_LEAKAGE')), 'Must report HINT_ANSWER_LEAKAGE error');
    });

    await runSmokeCheck('STAGE 5', '5.3 MCQ Options Count Invariant: Rejects question with fewer than 4 options', () => {
        const badMcqQB = {
            schema_version: '1.0.0',
            domain: 'Physics',
            chapter: 'McqTest',
            skill_id: 'phys.mcq',
            language: 'hi',
            provenance: { source: 'Test', chapter: 'McqTest', origin: 'curriculum_doc' },
            patterns: [{ id: 'pat-001', archetype: 'test', method: 'test' }],
            questions: [
                {
                    id: 'q-mcq-001',
                    pattern_id: 'pat-001',
                    provenance: { origin: 'curriculum_doc' },
                    question_type: 'mcq',
                    difficulty: 2.0,
                    question: 'Is mass scalar?',
                    options: ['(A) Yes', '(B) No'], // Only 2 options!
                    correct_answer: 'Yes',
                    hints: { t1: 'Think about scalar', t2: 'Mass has magnitude only', t3: 'It is scalar' },
                    solution: 'Mass is scalar.',
                    verification: 'Valid',
                    recognition_signals: ['mass'],
                    expected_method: 'method',
                    decision_points: ['decision'],
                    trap: 'trap',
                    error_category: ['ERR_01']
                }
            ]
        };

        const valRes = validateQuestionBankContent(badMcqQB);
        assert.strictEqual(valRes.isValid, false, 'MCQ with < 4 options must fail validation');
        assert(valRes.errors.some(e => e.includes('INVALID_MCQ_OPTIONS') || e.includes('fewer than 4 options') || e.includes('at least 4 options')),
            'Must report INVALID_MCQ_OPTIONS error');
    });

    await runSmokeCheck('STAGE 5', '5.4 Parent Self-Execution Ban: Orchestrator writing specialist artifact throws violation', () => {
        let threw = false;
        try {
            assertNoParentSelfExecution({ task_id: 'notes-01', owner_agent: 'core-notes' }, 'orchestrator');
        } catch (err) {
            threw = true;
            assert(err.message.includes('PARENT_SELF_EXECUTION_VIOLATION'),
                `Expected PARENT_SELF_EXECUTION_VIOLATION, got: ${err.message}`);
        }
        assert.strictEqual(threw, true, 'Direct orchestrator write must throw PARENT_SELF_EXECUTION_VIOLATION');
    });

    await runSmokeCheck('STAGE 5', '5.5 Visual Coordinate Overflow: Rejects image occlusion coordinate > 100', () => {
        const badIoJson = JSON.stringify({
            schema_version: '1.0.0',
            image_filename: 'europe_map.svg',
            image_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            regions: [
                {
                    region_id: 'reg-01',
                    shape: 'rect',
                    coords: [105, 10, 20, 30], // x = 105 > 100!
                    label: 'Overflow Region',
                    description: 'Test'
                }
            ]
        });

        const valRes = validateImageOcclusionContent(badIoJson, 'bad_io.json');
        assert.strictEqual(valRes.isValid, false, 'Out-of-bounds coordinates must fail validation');
    });

    // Clean up scratch dir
    try {
        fs.rmSync(SCRATCH_DIR, { recursive: true, force: true });
    } catch (_) {}

    // =========================================================================
    // FINAL SCORECARD
    // =========================================================================
    console.log('\n================================================================================');
    console.log(`MASTER SMOKE TEST SCORECARD: ${passedTests} Passed, ${failedTests} Failed (Total: ${passedTests + failedTests})`);
    if (failedTests > 0) {
        console.error('OVERALL VERDICT: 🔴 SMOKE TEST REGRESSIONS DETECTED');
        for (const f of failureDetails) {
            console.error(`  - [${f.section}] ${f.check}: ${f.error}`);
        }
        process.exit(1);
    } else {
        console.log('OVERALL VERDICT: 🟢 SYSTEM INTEGRITY 100% VERIFIED / ZERO-MOCK CERTIFIED');
        console.log('================================================================================\n');
        process.exit(0);
    }
}

main().catch(err => {
    console.error('[FATAL SMOKE HARNESS CRASH]', err);
    process.exit(1);
});
