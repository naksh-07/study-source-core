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

const { getVaultRoot, normalizeName } = require('./path_resolver');
const { loadManifest } = require('./artifact_provenance');
const { resolveSubjectPolicy } = require('./subject_policy_resolver');
const { ingestSourceToEvidencePack, persistEvidencePack } = require('./evidence_ingestion_engine');
const { exportChapterToAnki } = require('./export_anki');
const { exportStudyLabProceduralAnki } = require('./export_studylab_procedural_anki');
const { validateTsvContent } = require('./validate_tsv');
const { validateApkgContent } = require('./validate_apkg');
const { validateStudyLabLevels1to7 } = require('./validate_studylab_levels_1_7');
const { validateQuestionBankMarkdown } = require('./validate_studylab_question_bank');
const { validateImageOcclusionContent } = require('./validate_image_occlusion');
const { auditNoteContract } = require('./note_contract_audit');
const { validateMapContent } = require('./validate_map');
const { auditSlideDeckPrompt } = require('./slide_deck_prompt_audit');

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
                    fs.existsSync(path.join(chapterDir, 'StudyLab', `${norm}_Questions.md`)) ||
                    fs.existsSync(path.join(chapterDir, 'StudyLab', `${norm}_QuestionBank.md`)) ||
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
        const badges = [
            a.notes ? 'Notes✅' : 'Notes⚪',
            a.basicTsv ? 'Basic✅' : 'Basic⚪',
            a.clozeTsv ? 'Cloze✅' : 'Cloze⚪',
            a.imageOcclusion ? 'IO✅' : 'IO⚪',
            a.mindMap ? 'Map✅' : 'Map⚪',
            a.slideDeck ? 'Deck✅' : 'Deck⚪',
            a.questionBank ? 'QBank✅' : 'QBank⚪',
            a.declarativeApkg ? 'Anki.apkg✅' : 'Anki.apkg⚪',
            a.proceduralApkg ? 'StudyLab.apkg✅' : 'StudyLab.apkg⚪'
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
        console.log(`📦 Packaging StudyLab Procedural Anki Deck for ${subject}::${chapter}...`);
        await exportStudyLabProceduralAnki(chapterDir, { cleanIntermediates });
    }

    console.log(`✅ Packaging complete for ${subject}::${chapter}.`);
    return { status: 'SUCCESS', subject, chapter, studylab: Boolean(flags.studylab) };
}

async function cmdVerify(positional, flags) {
    const subject = positional[0] || flags.subject;
    const chapter = positional[1] || flags.chapter;

    if (flags.all || (!subject && !chapter)) {
        const harnessPath = path.join(__dirname, 'test_final_audit_harness.js');
        const out = execFileSync(process.execPath, [harnessPath], { encoding: 'utf8' });
        console.log(out);
        return { status: 'SUCCESS', mode: 'ALL' };
    }

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
            run: (file) => auditNoteContract(file)
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
                path.join(chapterDir, 'StudyLab', `${norm}_Questions.md`),
                path.join(chapterDir, 'StudyLab', `${norm}_QuestionBank.md`)
            ]),
            run: (file) => validateQuestionBankMarkdown(fs.readFileSync(file, 'utf8'))
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
    for (const check of checks) {
        if (!fs.existsSync(check.file)) continue;
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
    const summary = { status: allPassed ? 'SUCCESS' : 'FAILED', subject, chapter, results };
    if (flags.json) {
        console.log(JSON.stringify(summary, null, 2));
    }
    if (!allPassed) {
        process.exitCode = 1;
    }
    return summary;
}

function printHelp() {
    console.log(`
StudySourceCore CLI (v1.2.0-beta.1)

Commands:
  studycore status [--json]
      List all subjects and chapters in 'Study Materials/' with artifact and provenance status.

  studycore ingest <sourcePath> --subject <Subject> --chapter <Chapter> [--output <path>] [--page-start <N>] [--page-end <M>] [--lang <hinglish|en|hi|bilingual>]
      Ingest a PDF, Markdown, or text source into a canonical Evidence Pack and resolve subject policy.

  studycore package <Subject> <Chapter> [--studylab]
      Compile unified declarative Anki .apkg (and optionally StudyLab procedural .apkg).

  studycore verify [<Subject> <Chapter>] [--all] [--json]
      Validate all present chapter deliverables or run the 10-gate Final Audit Harness (--all).
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
        case 'package':
            return await cmdPackage(positional, flags);
        case 'verify':
            return await cmdVerify(positional, flags);
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
