#!/usr/bin/env node
/**
 * StudySourceCore Unified CLI (`studycore_cli.js`)
 *
 * Provides a single, cohesive command-line interface over the StudySourceCore
 * ingestion, policy resolution, packaging, status inspection, and verification engines
 * while preserving all existing script paths and subagent contracts.
 *
 * Usage:
 *   node scripts/studycore_cli.js status [--json]
 *   node scripts/studycore_cli.js ingest <sourcePath> --subject <Subject> --chapter <Chapter> [--output <path>] [--page-start <N>] [--page-end <M>] [--lang <hinglish|en|hi|bilingual>]
 *   node scripts/studycore_cli.js package <Subject> <Chapter> [--studylab]
 *   node scripts/studycore_cli.js verify [<Subject> <Chapter>] [--all] [--json]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const crypto = require('crypto');
const { getVaultRoot, normalizeName } = require('./path_resolver');
const { loadManifest } = require('./artifact_provenance');
const { resolveSubjectPolicy } = require('./subject_policy_resolver');
const { ingestSourceToEvidencePack, persistEvidencePack } = require('./evidence_ingestion_engine');
const { exportChapterToAnki } = require('./export_anki');
const { exportStudyLabProceduralAnki } = require('./export_studylab_procedural_anki');
const { validateTsvContent } = require('./validate_tsv');
const { validateApkgContent } = require('./validate_apkg');
const { validateStudyLabLevels1to7 } = require('./validate_studylab_levels_1_7');
const { validatePracticeQuestionsContent } = require('./validate_studylab_practice_questions');
const { validateQuestionBankMarkdown } = require('./validate_studylab_question_bank');
const { validateImageOcclusionContent } = require('./validate_image_occlusion');
const { auditNoteContract } = require('./note_contract_audit');
const { validateMapContent } = require('./validate_map');
const { auditSlideDeckPrompt } = require('./slide_deck_prompt_audit');
const { telemetry, TELEMETRY_LAYERS, SPAN_STATUS } = require('./telemetry_engine');
const { buildExecutionTaskGraph } = require('./orchestration_engine');
const { AntigravityHostAdapter } = require('./antigravity_adapter');
const { loadAllAgentDefinitions, buildAntigravityRegistrationPayload } = require('./register_antigravity_subagents');

function parseFlags(args) {
    const positional = [];
    const flags = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const next = args[i + 1];
            if (next !== undefined && !next.startsWith('--')) {
                flags[key] = next;
                i++;
            } else {
                flags[key] = true;
            }
        } else {
            positional.push(arg);
        }
    }
    return { positional, flags };
}

function resolveFirstExisting(candidates) {
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return candidates[0];
}

function collectVaultStatus(vaultRoot) {
    const studyMaterialsDir = path.join(vaultRoot, 'Study Materials');
    const chapters = [];
    if (!fs.existsSync(studyMaterialsDir)) {
        return { vaultRoot, studyMaterialsDir, chapters };
    }

    const subjects = fs.readdirSync(studyMaterialsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .sort();

    for (const subject of subjects) {
        const subjectDir = path.join(studyMaterialsDir, subject);
        const chapterDirs = fs.readdirSync(subjectDir, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name)
            .sort();

        for (const chapter of chapterDirs) {
            const chapterDir = path.join(subjectDir, chapter);
            const norm = normalizeName(chapter);
            const manifest = loadManifest(chapterDir);

            const artifacts = {
                notes: fs.existsSync(path.join(chapterDir, 'Notes', `${norm}_Notes.md`)),
                basicTsv: fs.existsSync(path.join(chapterDir, 'Basic', `${norm}_Basic.tsv`)),
                clozeTsv: fs.existsSync(path.join(chapterDir, 'Cloze', `${norm}_Cloze.tsv`)),
                imageOcclusion: fs.existsSync(path.join(chapterDir, 'ImageOcclusion', `${norm}_ImageOcclusion.json`)),
                mindMap: Boolean(fs.existsSync(path.join(chapterDir, 'MindMap', `${norm}.mindmap.json`)) || fs.existsSync(path.join(chapterDir, 'MindMap', `${norm}_MindMap.json`))),
                slideDeck: Boolean(fs.existsSync(path.join(chapterDir, 'SlideDeck', `${norm}_SlideDeckPrompt.md`)) || fs.existsSync(path.join(chapterDir, 'SlideDeck', `${norm}_SlideDeck.md`))),
                questionBank: Boolean(
                    fs.existsSync(path.join(chapterDir, 'Questions', `${norm}_Questions.md`)) ||
                    fs.existsSync(path.join(chapterDir, 'StudyLab', `${norm}_Questions.md`)) ||
                    fs.existsSync(path.join(chapterDir, 'StudyLab', `${norm}_QuestionBank.md`))
                ),
                questionBankLegacyOnly: Boolean(
                    !fs.existsSync(path.join(chapterDir, 'Questions', `${norm}_Questions.md`)) &&
                    !fs.existsSync(path.join(chapterDir, 'StudyLab', `${norm}_Questions.md`)) &&
                    !fs.existsSync(path.join(chapterDir, 'StudyLab', `${norm}_QuestionBank.md`)) &&
                    fs.existsSync(path.join(chapterDir, 'Optional', `${norm}_PracticeQuestions.json`))
                ),
                declarativeApkg: fs.existsSync(path.join(chapterDir, `${norm}_Anki.apkg`)),
                proceduralApkg: Boolean(fs.existsSync(path.join(chapterDir, 'StudyLab', `${norm}_StudyLab.apkg`)) || fs.existsSync(path.join(chapterDir, 'StudyLab', `${norm}_StudyLab_Procedural.apkg`)))
            };

            const presentCount = Object.values(artifacts).filter(Boolean).length;
            chapters.push({
                subject,
                chapter,
                chapterDir,
                evidenceHash: manifest ? manifest.evidenceHash : null,
                updatedAt: manifest ? manifest.updatedAt : null,
                presentCount,
                artifacts
            });
        }
    }

    return { vaultRoot, studyMaterialsDir, chapters };
}

function cmdStatus(flags) {
    const vaultRoot = getVaultRoot();
    const report = collectVaultStatus(vaultRoot);

    if (flags.json) {
        console.log(JSON.stringify(report, null, 2));
        return report;
    }

    console.log('====================================================================');
    console.log('  STUDYSOURCECORE — VAULT CHAPTER STATUS');
    console.log('====================================================================');
    console.log(`Vault Root: ${report.vaultRoot}`);
    console.log(`Chapters Found: ${report.chapters.length}\n`);

    for (const ch of report.chapters) {
        const a = ch.artifacts;
        const qbBadge = a.questionBank ? 'QBank✅' : (a.questionBankLegacyOnly ? 'QBank⚪(Legacy JSON only)' : 'QBank⚪');
        const badges = [
            a.notes ? 'Notes✅' : 'Notes⚪',
            a.basicTsv ? 'Basic✅' : 'Basic⚪',
            a.clozeTsv ? 'Cloze✅' : 'Cloze⚪',
            a.imageOcclusion ? 'IO✅' : 'IO⚪',
            a.mindMap ? 'Map✅' : 'Map⚪',
            a.slideDeck ? 'Deck✅' : 'Deck⚪',
            qbBadge,
            a.declarativeApkg ? 'Anki.apkg✅' : 'Anki.apkg⚪',
            a.proceduralApkg ? 'StudyLab.apkg✅' : 'StudyLab.apkg⚪(Paused)'
        ].join(' | ');

        console.log(`• [${ch.subject} / ${ch.chapter}] (${ch.presentCount}/9 deliverables)`);
        console.log(`  ${badges}`);
        if (ch.evidenceHash) {
            console.log(`  Evidence SHA-256: ${ch.evidenceHash.slice(0, 16)}... (Updated: ${ch.updatedAt || 'N/A'})`);
        }
        console.log('');
    }
    return report;
}

function cmdIngest(positional, flags) {
    const sourcePath = positional[0] || flags.source;
    const subject = flags.subject;
    const chapter = flags.chapter;

    if (!sourcePath || !subject || !chapter) {
        throw new Error('Usage: studycore ingest <sourcePath> --subject <Subject> --chapter <Chapter> [--output <dir>] [--page-start <N>] [--page-end <M>] [--lang <hinglish|en|hi|bilingual>]');
    }

    const vaultRoot = getVaultRoot();
    const chapterDir = path.join(vaultRoot, 'Study Materials', subject, chapter);
    const defaultOutputDir = path.join(chapterDir, '.build');
    const outputDir = flags.output ? path.resolve(flags.output) : defaultOutputDir;

    let resolvedSource = path.resolve(sourcePath);
    if (!fs.existsSync(resolvedSource) && fs.existsSync(path.resolve(vaultRoot, sourcePath))) {
        resolvedSource = path.resolve(vaultRoot, sourcePath);
    }

    const policy = resolveSubjectPolicy(subject, flags.lang ? { language_policy: flags.lang } : {});

    const pack = ingestSourceToEvidencePack(resolvedSource, {
        subject,
        chapter,
        page_start: flags['page-start'] ? Number(flags['page-start']) : undefined,
        page_end: flags['page-end'] ? Number(flags['page-end']) : undefined
    });

    const persisted = persistEvidencePack(pack, outputDir);
    const { initManifest } = require('./artifact_provenance');
    initManifest(chapterDir, {
        subject,
        chapter,
        evidenceHash: pack.evidence_hash,
        useBuildDir: true
    });

    const summary = {
        status: 'SUCCESS',
        subject,
        chapter,
        languagePolicy: policy.languagePolicy,
        outputPath: persisted.markdownPath,
        provenancePath: persisted.provenancePath,
        evidenceHash: pack.evidence_hash,
        chunksCount: pack.chunks.length,
        questionsCount: pack.source_problems.length
    };

    if (flags.json) {
        console.log(JSON.stringify(summary, null, 2));
    } else {
        console.log(`✅ Ingested '${sourcePath}' -> ${summary.outputPath}`);
        console.log(`   Subject Policy : ${subject} (Language: ${typeof summary.languagePolicy === 'string' ? summary.languagePolicy : (summary.languagePolicy?.mode || 'hinglish')})`);
        console.log(`   Evidence Hash  : ${summary.evidenceHash}`);
    }
    return summary;
}

async function cmdPackage(positional, flags) {
    const subject = positional[0] || flags.subject;
    const chapter = positional[1] || flags.chapter;

    if (!subject || !chapter) {
        throw new Error('Usage: studycore package <Subject> <Chapter> [--studylab]');
    }

    const vaultRoot = getVaultRoot();
    const chapterDir = path.join(vaultRoot, 'Study Materials', subject, chapter);
    const cleanIntermediates = Boolean(flags.clean);

    console.log(`📦 Packaging Declarative Anki Deck for ${subject}::${chapter}...`);
    await exportChapterToAnki(chapterDir, { cleanIntermediates });

    if (flags.studylab) {
        console.log(`ℹ️  [PRODUCTION_NOTICE] Procedural APKG generation is temporarily suspended in production in favor of canonical Markdown Question Banks ('Questions.md'). Packaging on-demand...`);
        console.log(`📦 Packaging StudyLab Procedural Anki Deck for ${subject}::${chapter}...`);
        await exportStudyLabProceduralAnki(chapterDir, { cleanIntermediates });
    }

    console.log(`✅ Packaging complete for ${subject}::${chapter}.`);
    return { status: 'SUCCESS', subject, chapter, studylab: Boolean(flags.studylab) };
}

async function verifyChapterInternal(subject, chapter, flags = {}) {
    const vaultRoot = getVaultRoot();
    const chapterDir = path.join(vaultRoot, 'Study Materials', subject, chapter);
    if (!fs.existsSync(chapterDir)) {
        throw new Error(`Chapter directory not found: ${chapterDir}`);
    }

    const norm = normalizeName(chapter);
    const checks = [
        {
            name: 'Notes Contract',
            file: path.join(chapterDir, 'Notes', `${norm}_Notes.md`),
            run: (file) => auditNoteContract(file, { silent: Boolean(flags.json) })
        },
        {
            name: 'Basic TSV',
            file: path.join(chapterDir, 'Basic', `${norm}_Basic.tsv`),
            run: (file) => validateTsvContent(fs.readFileSync(file, 'utf8'), file)
        },
        {
            name: 'Cloze TSV',
            file: path.join(chapterDir, 'Cloze', `${norm}_Cloze.tsv`),
            run: (file) => validateTsvContent(fs.readFileSync(file, 'utf8'), file)
        },
        {
            name: 'Image Occlusion',
            file: path.join(chapterDir, 'ImageOcclusion', `${norm}_ImageOcclusion.json`),
            run: (file) => validateImageOcclusionContent(fs.readFileSync(file, 'utf8'), file)
        },
        {
            name: 'MindMap',
            file: resolveFirstExisting([
                path.join(chapterDir, 'MindMap', `${norm}.mindmap.json`),
                path.join(chapterDir, 'MindMap', `${norm}_MindMap.json`)
            ]),
            run: (file) => validateMapContent(fs.readFileSync(file, 'utf8'), file)
        },
        {
            name: 'SlideDeck',
            file: resolveFirstExisting([
                path.join(chapterDir, 'SlideDeck', `${norm}_SlideDeckPrompt.md`),
                path.join(chapterDir, 'SlideDeck', `${norm}_SlideDeck.md`)
            ]),
            run: (file) => auditSlideDeckPrompt(file)
        },
        {
            name: 'Question Bank',
            file: resolveFirstExisting([
                path.join(chapterDir, 'Questions', `${norm}_Questions.md`),
                path.join(chapterDir, 'StudyLab', `${norm}_Questions.md`),
                path.join(chapterDir, 'StudyLab', `${norm}_QuestionBank.md`),
                path.join(chapterDir, 'Optional', `${norm}_PracticeQuestions.json`)
            ]),
            run: (file) => {
                if (file.endsWith('.json')) {
                    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
                    return validatePracticeQuestionsContent(content, file);
                }
                return validateQuestionBankMarkdown(fs.readFileSync(file, 'utf8'));
            }
        },
        {
            name: 'Declarative APKG',
            file: path.join(chapterDir, `${norm}_Anki.apkg`),
            run: async (file) => await validateApkgContent(fs.readFileSync(file), file)
        },
        {
            name: 'StudyLab Procedural APKG',
            file: resolveFirstExisting([
                path.join(chapterDir, 'StudyLab', `${norm}_StudyLab.apkg`),
                path.join(chapterDir, 'StudyLab', `${norm}_StudyLab_Procedural.apkg`)
            ]),
            run: async (file) => await validateStudyLabLevels1to7(file, {})
        }
    ];

    const results = [];
    if (!flags.json) {
        console.log(`\n🔍 Verifying ${subject}::${chapter}...`);
    }
    for (const check of checks) {
        if (!check.file || !fs.existsSync(check.file)) continue;
        try {
            const res = await check.run(check.file);
            const passed = res ? (res.isValid !== false && res.passed !== false) : true;
            results.push({
                check: check.name,
                file: check.file,
                passed,
                errors: res && res.errors ? res.errors : []
            });
            if (!flags.json) {
                console.log(`  ${passed ? '✅' : '❌'} ${check.name}: ${passed ? 'PASS' : 'FAIL'} (${path.basename(check.file)})`);
            }
        } catch (err) {
            results.push({
                check: check.name,
                file: check.file,
                passed: false,
                errors: [err.message]
            });
            if (!flags.json) {
                console.error(`  ❌ ${check.name}: FAIL (${path.basename(check.file)}) - ${err.message}`);
            }
        }
    }

    const allPassed = results.every(r => r.passed);
    if (allPassed && results.length > 0) {
        const evidenceFile = path.join(chapterDir, '.completion-evidence.json');
        const artifactsList = results.map(r => {
            const stat = fs.statSync(r.file);
            const buf = fs.readFileSync(r.file);
            const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
            return {
                task_id: `task-${r.check.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                target_path: path.resolve(r.file),
                bytes: stat.size,
                sha256,
                physical_status: 'VERIFIED_ON_DISK'
            };
        });

        const graphFile = path.join(chapterDir, 'Graph', `${norm}_Graph_Index.json`);
        if (fs.existsSync(graphFile)) {
            const stat = fs.statSync(graphFile);
            const buf = fs.readFileSync(graphFile);
            artifactsList.push({
                task_id: 'task-graph',
                target_path: path.resolve(graphFile),
                bytes: stat.size,
                sha256: crypto.createHash('sha256').update(buf).digest('hex'),
                physical_status: 'VERIFIED_ON_DISK'
            });
        }
        const qaFile = path.join(chapterDir, 'Audit', 'QA_Report.md');
        if (fs.existsSync(qaFile)) {
            const stat = fs.statSync(qaFile);
            const buf = fs.readFileSync(qaFile);
            artifactsList.push({
                task_id: 'task-qa',
                target_path: path.resolve(qaFile),
                bytes: stat.size,
                sha256: crypto.createHash('sha256').update(buf).digest('hex'),
                physical_status: 'VERIFIED_ON_DISK'
            });
        }

        const evidenceDoc = {
            meta: {
                overall_verdict: 'SUCCESS',
                chapter,
                subject,
                completed_count: artifactsList.length,
                artifact_count: artifactsList.length,
                verified_timestamp: new Date().toISOString(),
                schema_version: '1.0.0'
            },
            artifacts: artifactsList
        };

        fs.writeFileSync(evidenceFile, JSON.stringify(evidenceDoc, null, 2), 'utf8');
        if (!flags.json) {
            console.log(`  🛡️ Completion Evidence Saved: .completion-evidence.json (${artifactsList.length} verified artifacts)`);
        }
    }

    return { status: allPassed ? 'SUCCESS' : 'FAILED', subject, chapter, results };
}

async function cmdVerify(positional, flags) {
    const subject = positional[0] || flags.subject;
    const chapter = positional[1] || flags.chapter;

    if (flags.all || (!subject && !chapter)) {
        const vaultRoot = getVaultRoot();
        const smDir = path.join(vaultRoot, 'Study Materials');
        const discovered = [];
        if (fs.existsSync(smDir)) {
            const subjs = fs.readdirSync(smDir).filter(s => fs.statSync(path.join(smDir, s)).isDirectory()).sort();
            for (const s of subjs) {
                const chs = fs.readdirSync(path.join(smDir, s)).filter(c => fs.statSync(path.join(smDir, s, c)).isDirectory()).sort();
                for (const c of chs) {
                    discovered.push({ subject: s, chapter: c });
                }
            }
        }

        if (discovered.length === 0) {
            throw new Error(`No chapters found in ${smDir}`);
        }

        if (!flags.json) {
            console.log('================================================================================');
            console.log(`STUDYSOURCECORE — VERIFYING ALL CHAPTERS (${discovered.length} TOTAL)`);
            console.log('================================================================================');
        }

        const chapterSummaries = [];
        let allChaptersPassed = true;

        for (const item of discovered) {
            const summary = await verifyChapterInternal(item.subject, item.chapter, flags);
            chapterSummaries.push(summary);
            if (summary.status !== 'SUCCESS') {
                allChaptersPassed = false;
            }
        }

        if (!flags.json) {
            console.log('\n================================================================================');
            console.log('VERIFICATION SCORECARD');
            console.log('================================================================================');
            for (const s of chapterSummaries) {
                const passedCount = s.results.filter(r => r.passed).length;
                const totalCount = s.results.length;
                const icon = s.status === 'SUCCESS' ? '✅' : '❌';
                console.log(`${icon} ${s.subject.padEnd(12)} / ${s.chapter.padEnd(28)} [${passedCount}/${totalCount} checks passed]`);
            }
            console.log('================================================================================');
            console.log(allChaptersPassed ? `🎉 ALL ${discovered.length} CHAPTERS PASSED VERIFICATION` : '❌ SOME CHAPTERS FAILED VERIFICATION');
            console.log('================================================================================\n');
        } else {
            console.log(JSON.stringify({
                status: allChaptersPassed ? 'SUCCESS' : 'FAILED',
                mode: 'ALL',
                totalChapters: discovered.length,
                passedChapters: chapterSummaries.filter(s => s.status === 'SUCCESS').length,
                chapters: chapterSummaries
            }, null, 2));
        }

        if (!allChaptersPassed) {
            process.exitCode = 1;
        }
        return { status: allChaptersPassed ? 'SUCCESS' : 'FAILED', mode: 'ALL', chapters: chapterSummaries };
    }

    const summary = await verifyChapterInternal(subject, chapter, flags);
    if (flags.json) {
        console.log(JSON.stringify(summary, null, 2));
    }
    if (summary.status !== 'SUCCESS') {
        process.exitCode = 1;
    }
    return summary;
}

function cmdDispatch(positional, flags) {
    const subject = positional[0] || flags.subject;
    const chapter = positional[1] || flags.chapter;

    if (!subject || !chapter) {
        throw new Error("Usage: studycore dispatch <Subject> <Chapter> [--wave 1|2|3] [--evidence <path>] [--json]");
    }

    const vaultRoot = getVaultRoot(process.cwd());
    const norm = normalizeName(chapter);
    const chapterDir = path.join(vaultRoot, 'Study Materials', subject, chapter);

    // Locate Evidence Pack
    let evidencePath = flags.evidence ? path.resolve(flags.evidence) : null;
    if (!evidencePath) {
        const candidates = [
            path.join(chapterDir, '.build', 'evidence-pack.md'),
            path.join(vaultRoot, 'scratch', 'evidence-pack.md'),
            path.join(chapterDir, 'evidence-pack.md')
        ];
        for (const c of candidates) {
            if (fs.existsSync(c)) {
                evidencePath = c;
                break;
            }
        }
    }

    let evidenceHash = '0000000000000000000000000000000000000000000000000000000000000000';
    let evidenceChars = 0;
    if (evidencePath && fs.existsSync(evidencePath)) {
        const content = fs.readFileSync(evidencePath, 'utf8');
        evidenceHash = crypto.createHash('sha256').update(content).digest('hex');
        evidenceChars = content.length;
    }

    // Inspect existing deliverables for Wave 3 gating (word count & candidate targets)
    let noteWordCount = 0;
    const noteFile = path.join(chapterDir, 'Notes', `${norm}_Notes.md`);
    if (fs.existsSync(noteFile)) {
        const noteContent = fs.readFileSync(noteFile, 'utf8');
        noteWordCount = noteContent.trim().split(/\s+/).length;
    }

    const graph = buildExecutionTaskGraph({
        subject,
        chapter,
        evidenceHash,
        evidenceChars,
        evidencePack: evidencePath,
        customRoot: vaultRoot,
        noteWordCount
    });

    const hostAdapter = new AntigravityHostAdapter({
        missionId: `mission_dispatch_${Date.now()}`
    });
    const agentDefs = loadAllAgentDefinitions();

    const targetWave = flags.wave ? parseInt(flags.wave, 10) : null;
    const waveTasks = {
        wave1: [],
        wave2: [],
        wave3: []
    };

    const defineSubagentPayloads = [];
    const registeredSubagents = new Set();
    const invokeSubagentSpecs = [];

    for (const task of graph.tasks) {
        if (targetWave && task.wave !== targetWave) continue;

        const isSkipped = task.status === 'SKIPPED';
        const waveKey = task.wave === 1 ? 'wave1' : (task.wave === 2 ? 'wave2' : 'wave3');

        const taskSummary = {
            task_id: task.task_id,
            wave: task.wave,
            owner_agent: task.owner_agent,
            writer_agent: task.writer_agent,
            target_path: task.target_path,
            status: task.status,
            suppression_reason: task.suppression_reason || null
        };
        waveTasks[waveKey].push(taskSummary);

        if (!isSkipped && agentDefs.has(task.owner_agent)) {
            const agentDef = agentDefs.get(task.owner_agent);
            if (!registeredSubagents.has(task.owner_agent)) {
                registeredSubagents.add(task.owner_agent);
                defineSubagentPayloads.push(buildAntigravityRegistrationPayload(agentDef));

                const workerState = hostAdapter.bindWorkerToTask({
                    logicalTaskId: task.task_id,
                    ownerAgent: task.owner_agent,
                    writerAgent: task.writer_agent,
                    waveId: task.wave
                });
                const spec = hostAdapter.buildSubagentInvocationSpec(workerState, task);
                invokeSubagentSpecs.push(spec.subagentSpec);
            }
        }
    }

    const result = {
        subject,
        chapter,
        evidencePath,
        evidenceHash,
        totalTasks: graph.tasks.length,
        waves: waveTasks,
        defineSubagentsCount: defineSubagentPayloads.length,
        defineSubagentPayloads,
        invokeSubagentSpecsCount: invokeSubagentSpecs.length,
        invokeSubagentSpecs
    };

    if (flags.json) {
        console.log(JSON.stringify(result, null, 2));
        return result;
    }

    console.log('\n================================================================================');
    console.log(`STUDYSOURCECORE — DISPATCH TASK GRAPH (${subject} / ${chapter})`);
    console.log('================================================================================');
    console.log(`Evidence Pack : ${evidencePath ? evidencePath : 'NONE (Using default hash)'}`);
    console.log(`Evidence Hash : ${evidenceHash}`);
    console.log(`Target Wave   : ${targetWave ? `Wave ${targetWave} Only` : 'All Waves (1, 2, 3)'}`);
    console.log('\n--- Task Breakdown by Wave ---');

    ['wave1', 'wave2', 'wave3'].forEach((wk, idx) => {
        const wNum = idx + 1;
        const tasks = waveTasks[wk];
        console.log(`\n[Wave ${wNum}] (${tasks.length} tasks):`);
        for (const t of tasks) {
            const icon = t.status === 'SKIPPED' ? '⏭️ SKIPPED' : '📋 PLANNED';
            const detail = t.status === 'SKIPPED' ? `(${t.suppression_reason})` : `-> ${t.target_path || 'internal'}`;
            console.log(`  - ${icon} ${t.task_id.padEnd(35)} | Owner: ${t.owner_agent.padEnd(32)} ${detail}`);
        }
    });

    console.log('\n--- Autonomous Subagent Payloads ---');
    console.log(`Subagents requiring write registration (define_subagent): ${defineSubagentPayloads.length}`);
    for (const d of defineSubagentPayloads) {
        console.log(`  🔑 ${d.name.padEnd(32)} (enable_write_tools: ${d.enable_write_tools})`);
    }
    console.log(`\nSubagents ready to invoke (invoke_subagent): ${invokeSubagentSpecs.length}`);
    for (const s of invokeSubagentSpecs) {
        console.log(`  🚀 ${s.TypeName.padEnd(32)} | Role: ${s.Role} | Model: ${s.Model}`);
    }
    console.log('================================================================================\n');

    return result;
}

function cmdTelemetry(positional, flags) {
    const subCmd = positional[0] || (flags.summary ? 'summary' : (flags.spans || flags.traces ? 'spans' : (flags.clear ? 'clear' : 'summary')));

    if (flags.clear || subCmd === 'clear') {
        const res = telemetry.clear();
        if (!flags.json) {
            console.log(`✅ [Telemetry] ${res.message}`);
        } else {
            console.log(JSON.stringify(res, null, 2));
        }
        return res;
    }

    if (flags.spans || flags.traces || subCmd === 'spans' || subCmd === 'traces') {
        const spans = telemetry.getSpans({ limit: parseInt(flags.limit || '15', 10) });
        if (flags.json) {
            console.log(JSON.stringify(spans, null, 2));
            return spans;
        }

        console.log('\n================================================================================');
        console.log('STUDYSOURCECORE — RECENT TELEMETRY SPANS (LIVE TRACE TIMELINE)');
        console.log('================================================================================');
        if (spans.length === 0) {
            console.log('No telemetry spans found. Run `npm run smoke` or `studycore verify` to seed traces.');
            return [];
        }

        console.log(`| Status  | Layer         | Span Name                             | Duration | Model   | Tokens (In/Out) |`);
        console.log(`|---------|---------------|---------------------------------------|----------|---------|-----------------|`);
        for (const s of spans) {
            const statusIcon = s.status === 'SUCCESS' ? '✅' : (s.status === 'FAILED' ? '❌' : (s.status === 'SKIPPED' ? '⏭️' : '⏳'));
            const layerPadded = (s.layer || '').padEnd(13).slice(0, 13);
            const namePadded = (s.name || '').padEnd(37).slice(0, 37);
            const dur = (s.duration_ms !== null && s.duration_ms !== undefined ? `${s.duration_ms}ms` : '-').padStart(8);
            const model = (s.model_class || '-').padEnd(7);
            const tokens = `${s.tokens_in || 0} / ${s.tokens_out || 0}`.padStart(15);
            console.log(`| ${statusIcon}      | ${layerPadded} | ${namePadded} | ${dur} | ${model} | ${tokens} |`);
        }
        console.log('================================================================================\n');
        return spans;
    }

    // Default: Calibration Report & System Health Scorecard
    const report = telemetry.getCalibrationReport();
    if (flags.json) {
        console.log(JSON.stringify(report, null, 2));
        return report;
    }

    if (flags.export) {
        const outPath = typeof flags.export === 'string' ? path.resolve(flags.export) : path.resolve(process.cwd(), 'scratch/telemetry_calibration_report.json');
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`✅ [Telemetry] Exported calibration report to: ${outPath}`);
    }

    console.log('\n================================================================================');
    console.log('STUDYSOURCECORE — PRODUCTION CALIBRATION & OBSERVABILITY SCORECARD');
    console.log('================================================================================');
    console.log(`Status        : ${report.status}`);
    console.log(`Total Spans   : ${report.total_spans}`);
    console.log(`Token Load    : ${report.token_economy.total_tokens} tokens total (Avg: ${report.token_economy.avg_tokens_per_llm_call} per LLM invocation)`);
    console.log(`Latencies     : P50: ${report.latencies.p50_ms}ms | P90: ${report.latencies.p90_ms}ms | Max: ${report.latencies.max_ms}ms`);
    console.log(`Pass Rate     : ${report.failure_analysis.success_count} Passed / ${report.failure_analysis.failed_count} Failed / ${report.failure_analysis.skipped_count} Skipped`);

    console.log('\n--- LLM Specialist Subagents Calibration ---');
    const subagentKeys = Object.keys(report.subagents);
    if (subagentKeys.length === 0) {
        console.log('  No subagent invocations recorded yet.');
    } else {
        console.log('| Agent Name                     | Invocations | Retries | P50 (ms) | Tokens (In/Out) |');
        console.log('|--------------------------------|-------------|---------|----------|-----------------|');
        for (const [agent, d] of Object.entries(report.subagents)) {
            const agentPadded = agent.padEnd(30).slice(0, 30);
            const inv = String(d.invocations).padStart(11);
            const ret = String(d.retries).padStart(7);
            const p50 = `${d.p50_ms}ms`.padStart(8);
            const tok = `${d.tokens_in} / ${d.tokens_out}`.padStart(15);
            console.log(`| ${agentPadded} | ${inv} | ${ret} | ${p50} | ${tok} |`);
        }
    }

    console.log('\n--- Deterministic Validators & Packaging Tools ---');
    const toolEntries = Object.entries({ ...report.tools, ...report.validators });
    if (toolEntries.length === 0) {
        console.log('  No validator or tool executions recorded yet.');
    } else {
        console.log('| Component Name                 | Executions | Failures | Avg Latency |');
        console.log('|--------------------------------|------------|----------|-------------|');
        for (const [name, d] of toolEntries) {
            const namePadded = name.padEnd(30).slice(0, 30);
            const cnt = String(d.count).padStart(10);
            const fail = String(d.failures).padStart(8);
            const avg = `${d.avg_ms}ms`.padStart(11);
            console.log(`| ${namePadded} | ${cnt} | ${fail} | ${avg} |`);
        }
    }

    console.log('\n--- Calibration & Production Readiness Recommendations ---');
    if (report.recommendations.length === 0) {
        console.log('  ✅ System is calibrated. No anomalies detected.');
    } else {
        for (const rec of report.recommendations) {
            console.log(`  💡 ${rec}`);
        }
    }
    console.log('================================================================================\n');

    return report;
}

function printHelp() {
    console.log(`
StudySourceCore CLI (v1.2.0-beta.6)

Commands:
  studycore status [--json]
      List all subjects and chapters in 'Study Materials/' with artifact and provenance status.

  studycore ingest <sourcePath> --subject <Subject> --chapter <Chapter> [--output <path>] [--page-start <N>] [--page-end <M>] [--lang <hinglish|en|hi|bilingual>]
      Ingest a PDF, Markdown, or text source into a canonical Evidence Pack and resolve subject policy.

  studycore dispatch <Subject> <Chapter> [--wave 1|2|3] [--evidence <path>] [--json]
      Build execution task graph, resolve context slices, and generate subagent payloads.

  studycore package <Subject> <Chapter> [--studylab]
      Compile unified declarative Anki .apkg (and optionally StudyLab procedural .apkg).

  studycore verify [<Subject> <Chapter>] [--all] [--json]
      Validate all present chapter deliverables or run the 10-gate Final Audit Harness (--all).

  studycore telemetry [--summary] [--spans] [--export <path>] [--clear] [--json]
      Inspect runtime telemetry, LLM token load, subagent latencies, and calibration recommendations.
`.trim());
}

async function runCli(argv = process.argv.slice(2)) {
    const command = argv[0];
    const { positional, flags } = parseFlags(argv.slice(1));

    if (!command || command === 'help' || command === '--help' || command === '-h') {
        printHelp();
        return { status: 'HELP' };
    }

    switch (command) {
        case 'status':
            return cmdStatus(flags);
        case 'ingest':
            return cmdIngest(positional, flags);
        case 'dispatch':
            return cmdDispatch(positional, flags);
        case 'package':
            return await cmdPackage(positional, flags);
        case 'verify':
            return await cmdVerify(positional, flags);
        case 'telemetry':
        case 'metrics':
            return cmdTelemetry(positional, flags);
        default:
            throw new Error(`Unknown command '${command}'. Run 'studycore --help' for available commands.`);
    }
}

if (require.main === module) {
    runCli().catch(err => {
        console.error(`❌ [studycore] ${err.message}`);
        process.exit(1);
    });
}

module.exports = {
    parseFlags,
    collectVaultStatus,
    runCli
};
