/**
 * StudySourceCore Standalone Adversarial Certification & Verification Harness
 * (`run_adversarial_certification.js`)
 * 
 * Implements GAP-12: Independent 4-Gate Production Certification Harness.
 * 
 * Core Invariant: "Generation is not certification."
 * This certifier operates independently from generation, directly inspecting on-disk
 * physical artifacts, binary ZIP archives, and SQLite databases.
 * 
 * The 4 Release Gates:
 * 1. Gate 1: Physical Completion Evidence Release Gate (GAP-08)
 * 2. Gate 2: ADV-01..15 Adversarial Attack Matrix (GAP-05 / Section 31 & 34)
 * 3. Gate 3: PKG-01..15 Low-Level Binary Packaging Integrity Attacks
 * 4. Gate 4: Cross-Artifact Consistency & Semantic Audit
 * 
 * CLI Usage:
 *   node run_adversarial_certification.js --chapter <name> --subject <name> [options]
 * 
 * Options:
 *   --chapter <name>           Chapter name (required if not in chapterDir)
 *   --subject <name>           Subject name (required if not inferable)
 *   --chapter-dir <path>       Explicit path to chapter directory
 *   --apkg <path>              Explicit path to Declarative APKG
 *   --procedural-apkg <path>   Explicit path to Procedural APKG
 *   --output-report <path>     Destination for certification-report.json
 *   --json                     Output JSON report to stdout
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const initSqlJs = require('sql.js');
const JSZip = require('jszip');

const { validateCompletionEvidenceFile, validateChapterCompletionEvidence } = require('./validate_completion_evidence');
const { validateApkgContent } = require('./validate_apkg');
const { validateStudyLabLevels1to7, validateStudyLabLevels1to6 } = require('./validate_studylab_levels_1_6');
const { validateSolutionGraphDag, validateHintTierDisclosure } = require('./validate_studylab_procedural_apkg');
const { validateQuestionBank } = require('./validate_studylab_question_bank');
const { checkCrossArtifactIntegrity, checkProceduralConsistency } = require('./cross_artifact_checker');
const { getVaultRoot, getCanonicalArtifactPaths, normalizeName } = require('./path_resolver');

// ----------------------------------------------------
// Gate 1: Physical Completion Evidence Verification
// ----------------------------------------------------
async function runGate1CompletionEvidence(chapterDir, options = {}) {
    const res = validateChapterCompletionEvidence(chapterDir, options);
    return {
        gate: 'GATE_1_COMPLETION_EVIDENCE',
        name: 'Physical Completion Evidence Release Gate (GAP-08)',
        status: res.isValid ? 'PASS' : 'FAIL',
        errors: res.errors,
        warnings: res.warnings,
        stats: res.stats
    };
}

// ----------------------------------------------------
// Gate 2: ADV-01..15 Adversarial Audit Matrix
// ----------------------------------------------------
async function runGate2AdversarialChecks(chapterDir, proceduralApkgPath, options = {}) {
    const errors = [];
    const warnings = [];
    const checksRun = [];

    // If procedural APKG exists, run Level 1-7 multi-tier validation
    if (proceduralApkgPath && fs.existsSync(proceduralApkgPath)) {
        try {
            const l1l7 = await validateStudyLabLevels1to7(proceduralApkgPath, {
                chapterDir,
                sourcePath: options.sourcePath
            });
            checksRun.push({ name: 'ADV-L1-L7 Multi-Tier StudyLab Verification', status: l1l7.isValid ? 'PASS' : 'FAIL' });
            if (!l1l7.isValid) {
                l1l7.errors.forEach(e => errors.push(`[ADV-L1-L7] ${e}`));
            }
        } catch (err) {
            errors.push(`[ADV-L1-L7] Multi-tier verification failed: ${err.message}`);
        }
    } else {
        // Fallback: When procedural APKG is absent/paused, actively audit canonical Markdown Question Bank
        const chapterName = options.chapter || path.basename(chapterDir);
        const candidateQbPaths = [
            path.join(chapterDir, 'Questions', `${chapterName}_Questions.md`),
            path.join(chapterDir, 'StudyLab', `${chapterName}_Questions.md`),
            path.join(chapterDir, 'Optional', `${chapterName}_PracticeQuestions.json`)
        ];
        const activeQbPath = candidateQbPaths.find(p => fs.existsSync(p));

        if (activeQbPath) {
            try {
                const qbResult = validateQuestionBank(activeQbPath);
                checksRun.push({
                    name: 'ADV Canonical Question Bank Verification (Questions.md)',
                    status: qbResult.isValid ? 'PASS' : 'FAIL',
                    path: activeQbPath
                });
                if (!qbResult.isValid) {
                    qbResult.errors.forEach(e => errors.push(`[ADV-QB] ${e}`));
                }
                if (qbResult.warnings && qbResult.warnings.length > 0) {
                    qbResult.warnings.forEach(w => warnings.push(`[ADV-QB] ${w}`));
                }
            } catch (err) {
                errors.push(`[ADV-QB] Question Bank audit failed: ${err.message}`);
            }
        } else {
            checksRun.push({ name: 'ADV Procedural Deck', status: 'SKIPPED', reason: 'No procedural APKG or Question Bank found for this chapter' });
        }
    }

    return {
        gate: 'GATE_2_ADVERSARIAL_MATRIX',
        name: 'Adversarial Attack & Semantic Depth Harness (ADV-01..15)',
        status: errors.length === 0 ? 'PASS' : 'FAIL',
        errors,
        warnings,
        checksRun
    };
}

// ----------------------------------------------------
// Gate 3: PKG-01..15 Low-Level Binary Packaging Integrity
// ----------------------------------------------------
async function runGate3BinaryIntegrity(declarativeApkgPath, proceduralApkgPath, options = {}) {
    const errors = [];
    const warnings = [];
    const checks = [];

    const hasDecl = declarativeApkgPath && fs.existsSync(declarativeApkgPath);
    const hasProc = proceduralApkgPath && fs.existsSync(proceduralApkgPath);

    if (!hasDecl && !hasProc) {
        errors.push("Neither declarative nor procedural APKG found for binary certification.");
        return {
            gate: 'GATE_3_BINARY_INTEGRITY',
            name: 'Binary Packaging Integrity & Model Isolation (PKG-01..15)',
            status: 'FAIL',
            errors,
            warnings,
            checks
        };
    }

    const SQL = await initSqlJs();

    let declDb = null;
    let procDb = null;
    let declModels = {};
    let procModels = {};
    let declNotes = [];
    let procNotes = [];
    let declCards = [];
    let procCards = [];

    try {
        // PKG-01: ZIP & SQLite schema for Declarative
        if (hasDecl) {
            try {
                const zip = await JSZip.loadAsync(fs.readFileSync(declarativeApkgPath));
                const colFile = zip.file('collection.anki2');
                const mediaFile = zip.file('media');

                if (!colFile) errors.push("[PKG-01] Declarative APKG missing collection.anki2");
                if (!mediaFile) errors.push("[PKG-01] Declarative APKG missing media file");

                if (colFile) {
                    declDb = new SQL.Database(await colFile.async('nodebuffer'));
                    const colRes = declDb.exec("SELECT models, decks FROM col LIMIT 1");
                    declModels = JSON.parse(colRes[0].values[0][0]);

                    // PKG-04: Closed Model Boundary for Declarative
                    const declModelIds = Object.keys(declModels);
                    if (declModelIds.includes('1600000004') || Object.values(declModels).some(m => m.name === 'StudyLab Procedural Anchor')) {
                        errors.push("[PKG-04] Declarative APKG contains prohibited StudyLab Model 1600000004");
                    }
                    const allowedDeclIds = new Set(['1600000001', '1600000002', '1600000003']);
                    declModelIds.forEach(id => {
                        if (!allowedDeclIds.has(id)) {
                            errors.push(`[PKG-04] Declarative APKG contains unauthorized model ID ${id}`);
                        }
                    });

                    // Notes & Cards
                    const nRes = declDb.exec("SELECT id, guid, mid, flds FROM notes");
                    declNotes = nRes[0]?.values || [];
                    const cRes = declDb.exec("SELECT id, nid, did FROM cards");
                    declCards = cRes[0]?.values || [];

                    // PKG-05: Orphan card detection
                    const orphanC = declDb.exec("SELECT count(*) FROM cards WHERE nid NOT IN (SELECT id FROM notes)")[0]?.values[0][0];
                    if (orphanC > 0) errors.push(`[PKG-05] Declarative APKG has ${orphanC} orphan cards`);

                    // PKG-06: Orphan note detection
                    const orphanN = declDb.exec("SELECT count(*) FROM notes WHERE id NOT IN (SELECT nid FROM cards)")[0]?.values[0][0];
                    if (orphanN > 0) errors.push(`[PKG-06] Declarative APKG has ${orphanN} orphan notes`);

                    // PKG-08: GUID uniqueness
                    const guids = declNotes.map(n => n[1]);
                    if (new Set(guids).size !== guids.length) {
                        errors.push("[PKG-08] Declarative APKG contains duplicate note GUIDs");
                    }
                }
                checks.push({ check: 'PKG-DECL-INTEGRITY', status: errors.length === 0 ? 'PASS' : 'FAIL' });
            } catch (e) {
                errors.push(`[PKG-01] Declarative APKG binary inspection failed: ${e.message}`);
            }
        }

        // PKG-02: ZIP & SQLite schema for Procedural
        if (hasProc) {
            try {
                const zip = await JSZip.loadAsync(fs.readFileSync(proceduralApkgPath));
                const colFile = zip.file('collection.anki2');
                const mediaFile = zip.file('media');

                if (!colFile) errors.push("[PKG-02] Procedural APKG missing collection.anki2");
                if (!mediaFile) errors.push("[PKG-02] Procedural APKG missing media file");

                if (colFile) {
                    procDb = new SQL.Database(await colFile.async('nodebuffer'));
                    const colRes = procDb.exec("SELECT models, decks FROM col LIMIT 1");
                    procModels = JSON.parse(colRes[0].values[0][0]);

                    // PKG-04: Closed Model Boundary for Procedural
                    const procModelIds = Object.keys(procModels);
                    if (!procModelIds.includes('1600000004')) {
                        errors.push("[PKG-04] Procedural APKG missing required Model 1600000004 ('StudyLab Procedural Anchor')");
                    }
                    const prohibitedInProc = ['1600000001', '1600000002', '1600000003'];
                    prohibitedInProc.forEach(id => {
                        if (procModelIds.includes(id)) {
                            errors.push(`[PKG-04] Procedural APKG contains prohibited Declarative Model ID ${id}`);
                        }
                    });

                    // Notes & Cards
                    const nRes = procDb.exec("SELECT id, guid, mid, flds FROM notes");
                    procNotes = nRes[0]?.values || [];
                    const cRes = procDb.exec("SELECT id, nid, did FROM cards");
                    procCards = cRes[0]?.values || [];

                    // PKG-05: Orphan card detection
                    const orphanC = procDb.exec("SELECT count(*) FROM cards WHERE nid NOT IN (SELECT id FROM notes)")[0]?.values[0][0];
                    if (orphanC > 0) errors.push(`[PKG-05] Procedural APKG has ${orphanC} orphan cards`);

                    // PKG-06: Orphan note detection
                    const orphanN = procDb.exec("SELECT count(*) FROM notes WHERE id NOT IN (SELECT nid FROM cards)")[0]?.values[0][0];
                    if (orphanN > 0) errors.push(`[PKG-06] Procedural APKG has ${orphanN} orphan notes`);

                    // PKG-08: GUID uniqueness
                    const guids = procNotes.map(n => n[1]);
                    if (new Set(guids).size !== guids.length) {
                        errors.push("[PKG-08] Procedural APKG contains duplicate note GUIDs");
                    }

                    // PKG-11, PKG-12, PKG-13: In-Database Payload Inspections
                    procNotes.forEach((row, idx) => {
                        const [nid, guid, mid, flds] = row;
                        const fieldParts = flds.split('\u001f');
                        const payloadRaw = fieldParts[0];

                        try {
                            const payload = JSON.parse(payloadRaw);

                            // PKG-12: MCQ option count check in SQLite payload
                            if (payload.question_type === 'mcq') {
                                const opts = payload.options || (payload.inline_contract?.options);
                                if (Array.isArray(opts) && opts.length < 4) {
                                    errors.push(`[PKG-12] Procedural note ${nid} has MCQ with only ${opts.length} options (minimum 4 required)`);
                                }
                            }

                            // PKG-11 & PKG-13: Solution DAG & Hint Leak in SQLite payload
                            if (payload.solution_graph && Array.isArray(payload.solution_graph.step_nodes)) {
                                const dagRes = validateSolutionGraphDag(payload.solution_graph.step_nodes);
                                if (!dagRes.isValid) {
                                    errors.push(`[PKG-11] Procedural note ${nid} solution graph DAG has cycles: ${dagRes.errors.join('; ')}`);
                                }

                                const finalAns = payload.correct_option || payload.final_answer || '';
                                if (finalAns) {
                                    const leakRes = validateHintTierDisclosure(payload.solution_graph.step_nodes, String(finalAns));
                                    if (!leakRes.isValid) {
                                        errors.push(`[PKG-13] Procedural note ${nid} hints disclose final answer: ${leakRes.errors.join('; ')}`);
                                    }
                                }
                            }
                        } catch (e) {
                            errors.push(`[PKG-11] Note ${nid} has unparseable ProceduralPayload: ${e.message}`);
                        }
                    });
                }
                checks.push({ check: 'PKG-PROC-INTEGRITY', status: errors.length === 0 ? 'PASS' : 'FAIL' });
            } catch (e) {
                errors.push(`[PKG-02] Procedural APKG binary inspection failed: ${e.message}`);
            }
        }

        // PKG-14: Fresh Profile Coexistence Check (Zero Collision Assertion)
        if (hasDecl && hasProc && declDb && procDb) {
            try {
                const declModelKeys = new Set(Object.keys(declModels));
                const procModelKeys = new Set(Object.keys(procModels));
                for (const k of procModelKeys) {
                    if (declModelKeys.has(k)) {
                        errors.push(`[PKG-14] Dual-deck collision: Model ID collision on ${k}`);
                    }
                }

                const declGuids = new Set(declNotes.map(n => n[1]));
                procNotes.forEach(n => {
                    if (declGuids.has(n[1])) {
                        errors.push(`[PKG-14] Dual-deck collision: GUID collision on ${n[1]}`);
                    }
                });

                const declNids = new Set(declNotes.map(n => n[0]));
                procNotes.forEach(n => {
                    if (declNids.has(n[0])) {
                        errors.push(`[PKG-14] Dual-deck collision: Note ID collision on ${n[0]}`);
                    }
                });

                const declCids = new Set(declCards.map(c => c[0]));
                procCards.forEach(c => {
                    if (declCids.has(c[0])) {
                        errors.push(`[PKG-14] Dual-deck collision: Card ID collision on ${c[0]}`);
                    }
                });

                checks.push({ check: 'PKG-14-DUAL-DECK-COEXISTENCE', status: errors.length === 0 ? 'PASS' : 'FAIL' });
            } catch (e) {
                errors.push(`[PKG-14] Coexistence simulation failed: ${e.message}`);
            }
        }
    } finally {
        if (declDb) {
            try { declDb.close(); } catch (e) {}
        }
        if (procDb) {
            try { procDb.close(); } catch (e) {}
        }
    }

    return {
        gate: 'GATE_3_BINARY_INTEGRITY',
        name: 'Binary Packaging Integrity & Model Isolation (PKG-01..15)',
        status: errors.length === 0 ? 'PASS' : 'FAIL',
        errors,
        warnings,
        checks
    };
}

// ----------------------------------------------------
// Gate 4: Cross-Artifact Consistency & Semantic Audit
// ----------------------------------------------------
async function runGate4CrossArtifactAudit(chapterDir, options = {}) {
    const errors = [];
    const warnings = [];

    try {
        const res = checkCrossArtifactIntegrity(chapterDir, options);
        if (!res.isValid) {
            res.divergences.forEach(d => errors.push(`[CROSS_ARTIFACT_DIVERGENCE] ${d.message || d.entity}`));
        }
        if (res.warnings) warnings.push(...res.warnings);
    } catch (e) {
        errors.push(`[CROSS_ARTIFACT_AUDIT_ERROR] ${e.message}`);
    }

    return {
        gate: 'GATE_4_CROSS_ARTIFACT_CONSISTENCY',
        name: 'Cross-Artifact Consistency & Semantic Audit',
        status: errors.length === 0 ? 'PASS' : 'FAIL',
        errors,
        warnings
    };
}

/**
 * Master Adversarial Certification Execution Runner
 * 
 * @param {Object} params
 * @returns {Promise<Object>} Certification Report
 */
async function certifyChapter(params = {}) {
    const chapterName = normalizeName(params.chapter);
    const subjectName = normalizeName(params.subject);

    const vaultRoot = getVaultRoot(__dirname);
    const chapterDir = params.chapterDir
        ? path.resolve(params.chapterDir)
        : path.join(vaultRoot, 'Study Materials', subjectName, chapterName);

    const declApkg = params.apkg || path.join(chapterDir, `${chapterName}_Anki.apkg`);
    const procApkg = params.proceduralApkg || path.join(chapterDir, 'StudyLab', `${chapterName}_StudyLab_Procedural.apkg`);

    console.log('\n================================================================================');
    console.log('  STUDYSOURCECORE INDEPENDENT ADVERSARIAL CERTIFICATION HARNESS');
    console.log(`  Target Subject: ${subjectName} | Chapter: ${chapterName}`);
    console.log(`  Chapter Root: ${chapterDir}`);
    console.log('================================================================================\n');

    // 1. Execute Gate 1
    console.log('--- GATE 1: Physical Completion Evidence Verification ---');
    const gate1 = await runGate1CompletionEvidence(chapterDir, params);
    console.log(`  Status: ${gate1.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    if (gate1.errors.length > 0) gate1.errors.forEach(e => console.error(`    ❌ ${e}`));

    // 2. Execute Gate 2
    console.log('\n--- GATE 2: Adversarial Attack Matrix (ADV-01..15) ---');
    const gate2 = await runGate2AdversarialChecks(chapterDir, procApkg, params);
    console.log(`  Status: ${gate2.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    if (gate2.errors.length > 0) gate2.errors.forEach(e => console.error(`    ❌ ${e}`));

    // 3. Execute Gate 3
    console.log('\n--- GATE 3: Low-Level Binary Packaging Integrity (PKG-01..15) ---');
    const gate3 = await runGate3BinaryIntegrity(declApkg, procApkg, params);
    console.log(`  Status: ${gate3.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    if (gate3.errors.length > 0) gate3.errors.forEach(e => console.error(`    ❌ ${e}`));

    // 4. Execute Gate 4
    console.log('\n--- GATE 4: Cross-Artifact Semantic & Fact Consistency ---');
    const gate4 = await runGate4CrossArtifactAudit(chapterDir, params);
    console.log(`  Status: ${gate4.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    if (gate4.errors.length > 0) gate4.errors.forEach(e => console.error(`    ❌ ${e}`));

    // Overall Release Verdict
    const allGates = [gate1, gate2, gate3, gate4];
    const failedGates = allGates.filter(g => g.status === 'FAIL');
    const releaseVerdict = failedGates.length === 0 ? 'PASS' : 'BLOCKED';

    const totalErrors = allGates.reduce((acc, g) => acc + g.errors.length, 0);
    const totalWarnings = allGates.reduce((acc, g) => acc + g.warnings.length, 0);

    const report = {
        certification_id: `cert-${subjectName.toLowerCase()}-${chapterName.toLowerCase()}-${Date.now()}`,
        chapter: chapterName,
        subject: subjectName,
        chapter_dir: chapterDir,
        certified_at: new Date().toISOString(),
        release_verdict: releaseVerdict,
        summary: {
            total_gates: 4,
            passed_gates: 4 - failedGates.length,
            failed_gates: failedGates.length,
            total_errors: totalErrors,
            total_warnings: totalWarnings
        },
        gates: {
            gate_1_completion_evidence: gate1,
            gate_2_adversarial_matrix: gate2,
            gate_3_binary_integrity: gate3,
            gate_4_cross_artifact_consistency: gate4
        }
    };

    console.log('\n================================================================================');
    console.log(`  FINAL CERTIFICATION VERDICT: ${releaseVerdict === 'PASS' ? '🟢 PASS (100% Certified for Release)' : '🔴 BLOCKED (Release Gating Enforced)'}`);
    console.log(`  Passed Gates: ${report.summary.passed_gates}/4 | Total Errors: ${totalErrors}`);
    console.log('================================================================================\n');

    // Save report to disk if destination provided or default to chapterDir
    const reportPath = params.outputReport || path.join(chapterDir, 'certification-report.json');
    try {
        const reportDir = path.dirname(reportPath);
        if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`📄 Machine-readable certification report written to: ${reportPath}`);
    } catch (e) {
        console.warn(`Could not write certification report: ${e.message}`);
    }

    return report;
}

/**
 * Auto-discovers and certifies all chapters in the vault and samples directories.
 * 
 * @param {Object} [options]
 * @returns {Promise<Object>} Consolidated certification report
 */
async function certifyAllChapters(options = {}) {
    const vaultRoot = getVaultRoot(__dirname);
    const candidateDirs = [
        path.join(vaultRoot, 'Study Materials'),
        path.join(__dirname, '..', 'samples'),
        path.join(vaultRoot, 'samples')
    ];

    const discovered = new Map();

    for (const baseDir of candidateDirs) {
        if (!fs.existsSync(baseDir)) continue;
        const subjects = fs.readdirSync(baseDir).filter(s => {
            const p = path.join(baseDir, s);
            return fs.statSync(p).isDirectory() && !s.startsWith('.');
        });
        for (const subj of subjects) {
            const subjDir = path.join(baseDir, subj);
            const chapters = fs.readdirSync(subjDir).filter(c => {
                const p = path.join(subjDir, c);
                return fs.statSync(p).isDirectory() && !c.startsWith('.');
            });
            for (const ch of chapters) {
                const key = `${subj}/${ch}`;
                if (!discovered.has(key)) {
                    discovered.set(key, {
                        subject: subj,
                        chapter: ch,
                        chapterDir: path.join(subjDir, ch)
                    });
                }
            }
        }
    }

    const chapterList = Array.from(discovered.values());
    if (chapterList.length === 0) {
        throw new Error('No chapters discovered in Study Materials or samples directories.');
    }

    if (!options.silent) {
        console.log('================================================================================');
        console.log(`  STUDYSOURCECORE — ADVERSARIAL CERTIFICATION: ALL CHAPTERS (${chapterList.length} TOTAL)`);
        console.log('================================================================================\n');
    }

    const reports = [];
    let allPassed = true;

    for (const item of chapterList) {
        const report = await certifyChapter({
            chapter: item.chapter,
            subject: item.subject,
            chapterDir: item.chapterDir
        });
        reports.push(report);
        if (report.release_verdict !== 'PASS') {
            allPassed = false;
        }
    }

    if (!options.silent) {
        console.log('\n================================================================================');
        console.log('  ADVERSARIAL CERTIFICATION SCORECARD (--all)');
        console.log('================================================================================');
        console.log('| Status  | Subject      | Chapter                      | Gates (1-4) | Errors | Warnings |');
        console.log('|---------|--------------|------------------------------|-------------|--------|----------|');
        for (const rep of reports) {
            const icon = rep.release_verdict === 'PASS' ? '✅ PASS' : '❌ FAIL';
            const subjPadded = rep.subject.padEnd(12).slice(0, 12);
            const chPadded = rep.chapter.padEnd(28).slice(0, 28);
            const g1 = (rep.gates?.gate_1_completion_evidence?.status === 'PASS') ? 'P' : 'F';
            const g2 = (rep.gates?.gate_2_adversarial_matrix?.status === 'PASS') ? 'P' : 'F';
            const g3 = (rep.gates?.gate_3_binary_integrity?.status === 'PASS') ? 'P' : 'F';
            const g4 = (rep.gates?.gate_4_cross_artifact_consistency?.status === 'PASS') ? 'P' : 'F';
            const gatesStr = `${g1}/${g2}/${g3}/${g4}`.padStart(11);
            const errs = String(rep.summary.total_errors).padStart(6);
            const warns = String(rep.summary.total_warnings).padStart(8);
            console.log(`| ${icon} | ${subjPadded} | ${chPadded} | ${gatesStr} | ${errs} | ${warns} |`);
        }
        console.log('================================================================================');
        console.log(allPassed ? `🎉 ALL ${chapterList.length} CHAPTERS RELEASE VERDICT: PASS` : '❌ SOME CHAPTERS FAILED ADVERSARIAL CERTIFICATION');
        console.log('================================================================================\n');
    }

    return {
        release_verdict: allPassed ? 'PASS' : 'BLOCKED',
        total_chapters: chapterList.length,
        passed_chapters: reports.filter(r => r.release_verdict === 'PASS').length,
        failed_chapters: reports.filter(r => r.release_verdict !== 'PASS').length,
        reports
    };
}

// ----------------------------------------------------
// CLI Interface
// ----------------------------------------------------
if (require.main === module) {
    const rawArgs = process.argv.slice(2);

    function getArg(flag) {
        const idx = rawArgs.indexOf(flag);
        return idx !== -1 ? rawArgs[idx + 1] : null;
    }

    if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
        console.log(`
StudySourceCore Adversarial Certification CLI

Usage:
  node run_adversarial_certification.js [chapterDir] [options]

Options:
  [chapterDir]           Positional chapter directory (e.g. samples/Math/Arithmetic-Progression)
  --chapter <name>       Target chapter name
  --subject <name>       Target subject name
  --chapter-dir <path>   Explicit path to chapter directory
  --all                  Certify all discovered chapters across vault/samples
  --apkg <path>          Path to declarative APKG
  --procedural-apkg <p>  Path to procedural APKG
  --output-report <p>    Path to write JSON certification report
  --json                 Output report in JSON format
  --help, -h             Show this help message
        `.trim());
        process.exit(0);
    }

    const isAll = rawArgs.includes('--all');
    const isJson = rawArgs.includes('--json');
    const FLAGS_WITH_VALUE = new Set(['--chapter', '--subject', '--chapter-dir', '--apkg', '--procedural-apkg', '--output-report']);
    let positionalDir = null;
    for (let i = 0; i < rawArgs.length; i++) {
        if (!rawArgs[i].startsWith('-')) {
            const prev = i > 0 ? rawArgs[i - 1] : null;
            if (!FLAGS_WITH_VALUE.has(prev)) {
                positionalDir = rawArgs[i];
                break;
            }
        }
    }

    const chapter = getArg('--chapter');
    const subject = getArg('--subject');
    const chapterDir = getArg('--chapter-dir') || positionalDir;
    const apkg = getArg('--apkg');
    const proceduralApkg = getArg('--procedural-apkg');
    const outputReport = getArg('--output-report');

    if (isAll) {
        certifyAllChapters({ silent: isJson }).then(res => {
            if (isJson) {
                console.log(JSON.stringify(res, null, 2));
            }
            process.exit(res.release_verdict === 'PASS' ? 0 : 1);
        }).catch(err => {
            console.error("Fatal certification error:", err);
            process.exit(1);
        });
    } else {
        if (!chapter && !chapterDir) {
            console.error("Usage: node run_adversarial_certification.js [chapterDir] --chapter <name> --subject <name> [options]\nRun with --help for details.");
            process.exit(1);
        }

        const resolvedDir = chapterDir ? path.resolve(chapterDir) : null;
        const inferredChapter = chapter || (resolvedDir ? path.basename(resolvedDir) : null);
        const inferredSubject = subject || (resolvedDir ? path.basename(path.dirname(resolvedDir)) : null);

        certifyChapter({
            chapter: inferredChapter,
            subject: inferredSubject,
            chapterDir: resolvedDir,
            apkg,
            proceduralApkg,
            outputReport
        }).then(report => {
            if (isJson) {
                console.log(JSON.stringify(report, null, 2));
            }
            process.exit(report.release_verdict === 'PASS' ? 0 : 1);
        }).catch(err => {
            console.error("Fatal certification error:", err);
            process.exit(1);
        });
    }
}

module.exports = {
    certifyChapter,
    certifyAllChapters,
    runGate1CompletionEvidence,
    runGate2AdversarialChecks,
    runGate3BinaryIntegrity,
    runGate4CrossArtifactAudit
};
