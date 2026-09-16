/**
 * study-source-core Cross-Artifact Invariant Consistency Checker (`cross_artifact_checker.js`)
 * 
 * Lightweight deterministic anomaly detector that scans across sibling artifacts:
 * - Notes (`Notes/[Chapter]_Notes.md`)
 * - Basic TSV (`Basic/[Chapter]_Basic.tsv`)
 * - Cloze TSV (`Cloze/[Chapter]_Cloze.tsv`)
 * - Image Occlusion JSON (`ImageOcclusion/[Chapter]_ImageOcclusion.json`)
 * - MindMap JSON (`MindMap/[Chapter].mindmap.json`)
 * 
 * Flags high-value factual divergences:
 * - Conflicting numbers for the same named entity or unit
 * - Conflicting dates/years for the same historical event
 * - Conflicting mathematical formulas
 */

const fs = require('fs');
const path = require('path');
const { getCanonicalArtifactPaths } = require('./path_resolver');
const { getArtifactRegistry } = require('./artifact_registry');

// Unicode-aware regex patterns
const NUMBER_WITH_UNIT = /(?:^|[^\w\u0900-\u097F])([\w\u0900-\u097F]{2,})[^.\n\r\t]{1,40}?(\d+(?:\.\d+)?(?:\s*(?:g\/cm[³3]|km\/h|km|m|cm|mm|kg|g|%|°C|°F|K|वर्ष|साल|किमी|मीटर|प्रतिशत|वर्ग किमी)))(?:[^\w\u0900-\u097F]|$)/gi;
const ENTITY_YEAR_PATTERN = /(?:^|[^\w\u0900-\u097F])([\w\u0900-\u097F]{2,})[^.\n\r\t]{1,40}?\b((?:1[5-9]\d{2}|20\d{2}))\b(?:[^\w\u0900-\u097F]|$)/gi;

function cleanContentForExtraction(text) {
    if (!text || typeof text !== 'string') return '';
    // Strip cloze tags {{c1::content}} -> content
    let cleaned = text.replace(/\{\{c\d+::(.*?)\}\}/g, '$1');
    // Strip markdown formatting like **bold**, *italic*, [[wikilinks]]
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
    cleaned = cleaned.replace(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g, '$1');
    return cleaned;
}

function extractEntityFacts(text, artifactName) {
    const facts = [];
    if (!text || typeof text !== 'string') return facts;

    const cleaned = cleanContentForExtraction(text);

    // 1. Number + Unit pairings with surrounding entity context
    let match;
    const numRe = new RegExp(NUMBER_WITH_UNIT.source, 'gi');
    while ((match = numRe.exec(cleaned)) !== null) {
        const entity = match[1].toLowerCase().trim();
        const value = match[2].toLowerCase().trim();
        if (entity.length >= 2) {
            facts.push({
                artifact: artifactName,
                entity,
                value,
                type: 'number_unit',
                raw: match[0].trim()
            });
        }
    }

    // 2. Entity + Year pairings
    const yearRe = new RegExp(ENTITY_YEAR_PATTERN.source, 'gi');
    const IGNORED_YEAR_ENTITIES = new Set(['year', 'exam', 'status', 'page', 'id', 'code', 'shift', 'step', 'tier', 'date', 'mod', 'crt', 'version', 'time', 'val', 'pyq', 'ref']);
    while ((match = yearRe.exec(cleaned)) !== null) {
        const entity = match[1].toLowerCase().trim();
        const year = match[2].trim();
        if (entity.length >= 2 && !IGNORED_YEAR_ENTITIES.has(entity)) {
            facts.push({
                artifact: artifactName,
                entity,
                value: year,
                type: 'year',
                raw: match[0].trim()
            });
        }
    }

    return facts;
}

function getDynamicArtifactPath(chapterDir, chapterName, trackKey) {
    const registry = getArtifactRegistry();
    const def = registry[trackKey];
    if (!def) return null;
    const fileName = def.file_pattern.replace('{chapter}', chapterName);
    
    const primaryDir = def.output_dir ? path.join(chapterDir, def.output_dir) : chapterDir;
    const primaryPath = path.join(primaryDir, fileName);
    if (fs.existsSync(primaryPath)) return primaryPath;
    
    const rootPath = path.join(chapterDir, fileName);
    if (fs.existsSync(rootPath)) return rootPath;
    
    const buildPath = path.join(chapterDir, '.build', 'source-artifacts', def.output_dir || '', fileName);
    if (fs.existsSync(buildPath)) return buildPath;
    
    return primaryPath;
}

/**
 * Scans all available artifacts in a chapter directory for factual divergences.
 */
function checkCrossArtifactIntegrity(chapterDir, options = {}) {
    const resolvedChapterDir = path.resolve(chapterDir);
    const chapterName = options.chapter || path.basename(resolvedChapterDir);

    const preloaded = options.preloadedContent || options.preloaded || options.contentMap || {};
    const artifactsData = {};

    // 1. Locate Notes (from memory or disk)
    if (preloaded.notes || preloaded.notesContent || options.notesContent) {
        artifactsData.notes = typeof (preloaded.notes || preloaded.notesContent || options.notesContent) === 'string'
            ? (preloaded.notes || preloaded.notesContent || options.notesContent)
            : JSON.stringify(preloaded.notes || preloaded.notesContent || options.notesContent);
    } else {
        const notesFile = getDynamicArtifactPath(resolvedChapterDir, chapterName, 'notes');
        if (notesFile && fs.existsSync(notesFile)) {
            artifactsData.notes = fs.readFileSync(notesFile, 'utf-8');
        }
    }

    // 2. Locate Basic TSV (from memory or disk)
    if (preloaded.basic || preloaded.basicTsv || options.basicContent) {
        artifactsData.basic = preloaded.basic || preloaded.basicTsv || options.basicContent;
    } else {
        const basicFile = getDynamicArtifactPath(resolvedChapterDir, chapterName, 'basic');
        if (basicFile && fs.existsSync(basicFile)) {
            artifactsData.basic = fs.readFileSync(basicFile, 'utf-8');
        }
    }

    // 3. Locate Cloze TSV (from memory or disk)
    if (preloaded.cloze || preloaded.clozeTsv || options.clozeContent) {
        artifactsData.cloze = preloaded.cloze || preloaded.clozeTsv || options.clozeContent;
    } else {
        const clozeFile = getDynamicArtifactPath(resolvedChapterDir, chapterName, 'cloze');
        if (clozeFile && fs.existsSync(clozeFile)) {
            artifactsData.cloze = fs.readFileSync(clozeFile, 'utf-8');
        }
    }

    // 4. Locate IO JSON (from memory or disk)
    if (preloaded.imageOcclusion || preloaded.ioJson || options.imageOcclusionContent) {
        const ioData = preloaded.imageOcclusion || preloaded.ioJson || options.imageOcclusionContent;
        artifactsData.imageOcclusion = typeof ioData === 'string' ? ioData : JSON.stringify(ioData, null, 2);
    } else {
        const ioFile = getDynamicArtifactPath(resolvedChapterDir, chapterName, 'imageOcclusion');
        if (ioFile && fs.existsSync(ioFile)) {
            artifactsData.imageOcclusion = fs.readFileSync(ioFile, 'utf-8');
        }
    }

    // 5. Locate MindMap JSON (from memory or disk)
    if (preloaded.mindmap || preloaded.mindmapJson || options.mindmapContent) {
        const mmData = preloaded.mindmap || preloaded.mindmapJson || options.mindmapContent;
        artifactsData.mindmap = typeof mmData === 'string' ? mmData : JSON.stringify(mmData, null, 2);
    } else {
        const mmFile = getDynamicArtifactPath(resolvedChapterDir, chapterName, 'mindmap');
        if (mmFile && fs.existsSync(mmFile)) {
            artifactsData.mindmap = fs.readFileSync(mmFile, 'utf-8');
        }
    }

    // 6. Locate ProblemPatterns Markdown (from memory or disk)
    if (preloaded.problemPatternsMd || preloaded.problemPatternsMarkdown || options.problemPatternsMdContent) {
        artifactsData.problemPatternsMd = preloaded.problemPatternsMd || preloaded.problemPatternsMarkdown || options.problemPatternsMdContent;
    } else {
        // Fallback or explicit check for legacy MD since registry is JSON
        const ppMdFile = path.join(resolvedChapterDir, 'Optional', `${chapterName}_ProblemPatterns.md`);
        if (fs.existsSync(ppMdFile)) {
            artifactsData.problemPatternsMd = fs.readFileSync(ppMdFile, 'utf-8');
        }
    }

    // 7. Locate ProblemPatterns JSON (from memory or disk)
    if (preloaded.problemPatternsJson || preloaded.problemPatterns || options.problemPatternsJsonContent) {
        const ppData = preloaded.problemPatternsJson || preloaded.problemPatterns || options.problemPatternsJsonContent;
        artifactsData.problemPatternsJson = typeof ppData === 'string' ? ppData : JSON.stringify(ppData, null, 2);
    } else {
        const ppJsonFile = getDynamicArtifactPath(resolvedChapterDir, chapterName, 'problemPatterns');
        if (ppJsonFile && fs.existsSync(ppJsonFile)) {
            artifactsData.problemPatternsJson = fs.readFileSync(ppJsonFile, 'utf-8');
        }
    }

    // 8. Locate PracticeQuestions JSON (from memory or disk)
    if (preloaded.practiceQuestionsJson || preloaded.practiceQuestions || options.practiceQuestionsJsonContent) {
        const pqData = preloaded.practiceQuestionsJson || preloaded.practiceQuestions || options.practiceQuestionsJsonContent;
        artifactsData.practiceQuestionsJson = typeof pqData === 'string' ? pqData : JSON.stringify(pqData, null, 2);
    } else {
        const pqJsonFile = getDynamicArtifactPath(resolvedChapterDir, chapterName, 'practiceQuestions');
        if (pqJsonFile && fs.existsSync(pqJsonFile)) {
            artifactsData.practiceQuestionsJson = fs.readFileSync(pqJsonFile, 'utf-8');
        }
    }

    const factsByEntity = new Map(); // entityKey -> [facts]

    for (const [artName, content] of Object.entries(artifactsData)) {
        const facts = extractEntityFacts(content, artName);
        for (const f of facts) {
            const key = `${f.type}::${f.entity}`;
            if (!factsByEntity.has(key)) {
                factsByEntity.set(key, []);
            }
            factsByEntity.get(key).push(f);
        }
    }

    const divergences = [];
    const warnings = [];

    // Check Procedural Markdown/JSON Identity Consistency
    if (artifactsData.problemPatternsMd && artifactsData.problemPatternsJson) {
        const procResult = checkProceduralConsistency(resolvedChapterDir, {
            chapter: chapterName,
            mdContent: artifactsData.problemPatternsMd,
            jsonContent: artifactsData.problemPatternsJson
        });
        if (!procResult.isValid) {
            divergences.push(...procResult.divergences);
        }
    }

    // Check PracticeQuestions vs ProblemPatterns Linkage Consistency
    if (artifactsData.practiceQuestionsJson && artifactsData.problemPatternsJson) {
        const pqResult = checkPracticeQuestionsConsistency(resolvedChapterDir, {
            chapter: chapterName,
            pqContent: artifactsData.practiceQuestionsJson,
            ppContent: artifactsData.problemPatternsJson
        });
        if (!pqResult.isValid) {
            divergences.push(...pqResult.divergences);
        }
        if (pqResult.warnings && pqResult.warnings.length > 0) {
            warnings.push(...pqResult.warnings);
        }
    }

    // Analyze fact consistency
    for (const [key, factList] of factsByEntity.entries()) {
        if (factList.length > 1) {
            // Check if multiple distinct values exist for the same entity across different artifacts
            const valuesMap = new Map(); // normalized value -> [artifacts]
            for (const f of factList) {
                const normVal = f.value.replace(/\s+/g, '');
                if (!valuesMap.has(normVal)) {
                    valuesMap.set(normVal, []);
                }
                valuesMap.get(normVal).push(f.artifact);
            }

            if (valuesMap.size > 1) {
                const entries = Array.from(valuesMap.entries());
                const valA = entries[0][0];
                const artsA = Array.from(new Set(entries[0][1])).join(', ');
                const valB = entries[1][0];
                const artsB = Array.from(new Set(entries[1][1])).join(', ');

                divergences.push({
                    entity: key,
                    message: `Cross-artifact divergence detected on '${key}': [${artsA}] says '${valA}' vs [${artsB}] says '${valB}'.`,
                    conflict: {
                        artifactA: artsA,
                        valueA: valA,
                        artifactB: artsB,
                        valueB: valB
                    }
                });
            }
        }
    }

    return {
        isValid: divergences.length === 0,
        divergences,
        warnings,
        scannedArtifacts: Object.keys(artifactsData)
    };
}

/**
 * Validates identity and semantic consistency between ProblemPatterns.md and ProblemPatterns.json
 */
function checkProceduralConsistency(chapterDir, options = {}) {
    const resolvedChapterDir = path.resolve(chapterDir);
    const chapterName = options.chapter || path.basename(resolvedChapterDir);

    let mdContent = options.mdContent;
    let jsonContent = options.jsonContent;

    if (!mdContent) {
        const mdFile = path.join(resolvedChapterDir, 'Optional', `${chapterName}_ProblemPatterns.md`);
        if (fs.existsSync(mdFile)) {
            mdContent = fs.readFileSync(mdFile, 'utf-8');
        }
    }

    if (!jsonContent) {
        const jsonFile = getDynamicArtifactPath(resolvedChapterDir, chapterName, 'problemPatterns');
        if (jsonFile && fs.existsSync(jsonFile)) {
            jsonContent = fs.readFileSync(jsonFile, 'utf-8');
        }
    }

    if (!mdContent || !jsonContent) {
        return { isValid: true, divergences: [], warnings: [] };
    }

    let jsonData;
    try {
        jsonData = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
    } catch (err) {
        return {
            isValid: false,
            divergences: [{
                entity: 'procedural_json_syntax',
                message: `Failed to parse ProblemPatterns.json: ${err.message}`
            }],
            warnings: []
        };
    }

    const divergences = [];
    const warnings = [];

    // 1. Domain consistency
    if (jsonData.domain) {
        // Extract subject/domain from frontmatter or text
        const frontmatterMatch = mdContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (frontmatterMatch) {
            const subjMatch = frontmatterMatch[1].match(/(?:subject|domain):\s*(.+)/i);
            if (subjMatch) {
                const mdDomain = subjMatch[1].trim();
                if (mdDomain.toLowerCase() !== jsonData.domain.toLowerCase()) {
                    divergences.push({
                        entity: 'procedural::domain',
                        message: `Domain divergence: Markdown declares '${mdDomain}' vs JSON declares '${jsonData.domain}'.`
                    });
                }
            }
        }
    }

    // 2. Chapter identity consistency
    if (jsonData.chapter) {
        const frontmatterMatch = mdContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (frontmatterMatch) {
            const chapMatch = frontmatterMatch[1].match(/chapter:\s*(.+)/i);
            if (chapMatch) {
                const mdChapter = chapMatch[1].trim();
                if (mdChapter.toLowerCase() !== jsonData.chapter.toLowerCase()) {
                    divergences.push({
                        entity: 'procedural::chapter',
                        message: `Chapter divergence: Markdown declares '${mdChapter}' vs JSON declares '${jsonData.chapter}'.`
                    });
                }
            }
        }
    }

    // 3. Pattern coverage & alignment
    if (Array.isArray(jsonData.patterns)) {
        jsonData.patterns.forEach((pat, idx) => {
            if (pat.problem_type) {
                // Strip English parentheses and clean for loose presence matching
                const baseName = pat.problem_type.split('(')[0].trim();
                const engNameMatch = pat.problem_type.match(/\((.*?)\)/);
                const engName = engNameMatch ? engNameMatch[1].trim() : '';

                const foundHindi = baseName.length >= 3 && mdContent.includes(baseName);
                const foundEng = engName.length >= 3 && mdContent.toLowerCase().includes(engName.toLowerCase());

                if (!foundHindi && !foundEng) {
                    warnings.push(`Pattern '${pat.id}' (${pat.problem_type}) declared in JSON was not explicitly matched in Markdown text.`);
                }
            }
        });
    }

    return {
        isValid: divergences.length === 0,
        divergences,
        warnings
    };
}

/**
 * Validates consistency between ProblemPatterns.json and StudyLab Procedural APKG / manifest.
 */
function checkProceduralApkgConsistency(chapterDir, options = {}) {
    const resolvedChapterDir = path.resolve(chapterDir);
    const chapterName = options.chapter || path.basename(resolvedChapterDir);

    const jsonFile = getDynamicArtifactPath(resolvedChapterDir, chapterName, 'problemPatterns');
    const manifestFile = path.join(resolvedChapterDir, 'StudyLab', `${chapterName}_StudyLab_Procedural.manifest.json`);

    if (!fs.existsSync(jsonFile) || !fs.existsSync(manifestFile)) {
        return { isValid: true, divergences: [], warnings: [] };
    }

    const divergences = [];
    const warnings = [];

    try {
        const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
        const manifestData = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));

        if (jsonData.domain && manifestData.subject && jsonData.domain.toLowerCase() !== manifestData.subject.toLowerCase()) {
            divergences.push({
                entity: 'procedural_apkg::domain',
                message: `Domain divergence: ProblemPatterns.json declares '${jsonData.domain}' vs StudyLab APKG manifest declares '${manifestData.subject}'.`
            });
        }

        const isPracticeManifest = manifestData.package_type === 'studylab_procedural_practice' || manifestData.type === 'studylab_practice_questions';
        const manifestItems = manifestData.items || manifestData.anchors || [];
        const manifestTotalItems = manifestData.totalItems ?? manifestData.totalAnchors ?? manifestData.totalQuestions ?? manifestItems.length;

        const validPatterns = (jsonData.patterns || []).filter(p => p.status !== 'UNSUPPORTED_BY_CURRENT_STUDYLAB_ENGINE' && !p.unsupported);

        if (!isPracticeManifest) {
            // Legacy pattern anchor mode
            if (validPatterns.length !== manifestTotalItems) {
                divergences.push({
                    entity: 'procedural_apkg::count',
                    message: `Anchor count divergence: ProblemPatterns.json has ${validPatterns.length} valid patterns vs StudyLab APKG manifest has ${manifestTotalItems} anchors.`
                });
            }

            const manifestAnchorIds = new Set(manifestItems.map(a => a.patternId));
            validPatterns.forEach(p => {
                if (!manifestAnchorIds.has(p.id)) {
                    divergences.push({
                        entity: 'procedural_apkg::missing_pattern',
                        message: `Pattern '${p.id}' (${p.problem_type}) is missing from StudyLab APKG manifest anchors.`
                    });
                }
            });
        } else {
            // Practice Questions mode: manifestItems records question items linked to patterns
            if (manifestTotalItems !== manifestItems.length) {
                divergences.push({
                    entity: 'procedural_apkg::count',
                    message: `Practice item count divergence: StudyLab APKG manifest reports totalItems=${manifestTotalItems} vs items array length=${manifestItems.length}.`
                });
            }
        }
    } catch (err) {
        divergences.push({
            entity: 'procedural_apkg_check_error',
            message: `Error checking procedural APKG consistency: ${err.message}`
        });
    }

    return {
        isValid: divergences.length === 0,
        divergences,
        warnings
    };
}

/**
 * Validates consistency between PracticeQuestions.json and ProblemPatterns.json
 */
function checkPracticeQuestionsConsistency(chapterDir, options = {}) {
    const resolvedChapterDir = path.resolve(chapterDir);
    const chapterName = options.chapter || path.basename(resolvedChapterDir);

    let pqContent = options.pqContent;
    let ppContent = options.ppContent;

    if (!pqContent) {
        const pqFile = getDynamicArtifactPath(resolvedChapterDir, chapterName, 'practiceQuestions');
        if (pqFile && fs.existsSync(pqFile)) {
            pqContent = fs.readFileSync(pqFile, 'utf-8');
        }
    }

    if (!ppContent) {
        const ppFile = getDynamicArtifactPath(resolvedChapterDir, chapterName, 'problemPatterns');
        if (ppFile && fs.existsSync(ppFile)) {
            ppContent = fs.readFileSync(ppFile, 'utf-8');
        }
    }

    if (!pqContent || !ppContent) {
        return { isValid: true, divergences: [], warnings: [] };
    }

    const divergences = [];
    const warnings = [];

    try {
        const pqData = typeof pqContent === 'string' ? JSON.parse(pqContent.replace(/^\uFEFF/, '')) : pqContent;
        const ppData = typeof ppContent === 'string' ? JSON.parse(ppContent.replace(/^\uFEFF/, '')) : ppContent;

        // 1. Domain consistency
        if (pqData.domain && ppData.domain && pqData.domain.toLowerCase() !== ppData.domain.toLowerCase()) {
            divergences.push({
                entity: 'practice_questions::domain',
                message: `Domain divergence: PracticeQuestions.json declares '${pqData.domain}' vs ProblemPatterns.json declares '${ppData.domain}'.`
            });
        }

        // 2. Chapter identity consistency
        if (pqData.chapter && ppData.chapter && pqData.chapter.toLowerCase() !== ppData.chapter.toLowerCase()) {
            divergences.push({
                entity: 'practice_questions::chapter',
                message: `Chapter divergence: PracticeQuestions.json declares '${pqData.chapter}' vs ProblemPatterns.json declares '${ppData.chapter}'.`
            });
        }

        // 3. Pattern linkage resolution
        const knownPatternIds = new Set((ppData.patterns || []).map(p => p.id));
        if (Array.isArray(pqData.questions)) {
            pqData.questions.forEach(q => {
                if (q.pattern_id && !knownPatternIds.has(q.pattern_id)) {
                    divergences.push({
                        entity: `practice_questions::unresolved_pattern::${q.id}`,
                        message: `Question '${q.id}' references pattern_id '${q.pattern_id}' which does not exist in ProblemPatterns.json.`
                    });
                }
            });
        }
    } catch (err) {
        divergences.push({
            entity: 'practice_questions_check_error',
            message: `Error checking practice questions consistency: ${err.message}`
        });
    }

    return {
        isValid: divergences.length === 0,
        divergences,
        warnings
    };
}

module.exports = {
    checkCrossArtifactIntegrity,
    checkProceduralConsistency,
    checkProceduralApkgConsistency,
    checkPracticeQuestionsConsistency,
    extractEntityFacts,
    cleanContentForExtraction
};

