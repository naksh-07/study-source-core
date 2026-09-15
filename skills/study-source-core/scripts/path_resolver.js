/**
 * study-source-core Path & Canonical Identity Resolver (`path_resolver.js`)
 * 
 * Provides robust, CWD-independent resolution of repository root, vault root,
 * chapter directories, and canonical artifact paths.
 * 
 * Handles:
 * - Bidirectional subject aliasing (Math <-> Maths <-> Mathematics, Polity <-> Political Science, etc.)
 * - Non-trivial chapter names (spaces, Unicode Hindi, parentheses, hyphens, ampersands)
 * - Filesystem-aware directory lookup with fallback creation paths
 */

const fs = require('fs');
const path = require('path');

// Dynamically build subject alias map from authoritative manifest (single source of truth)
const MANIFEST_PATH = path.join(__dirname, '..', 'resources', 'subject-skill-manifest.json');
let SUBJECT_ALIAS_MAP = {};
try {
    const _manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    if (_manifest && _manifest.subjects) {
        for (const [canonical, data] of Object.entries(_manifest.subjects)) {
            const allNames = [canonical, ...(data.aliases || [])];
            for (const alias of allNames) {
                SUBJECT_ALIAS_MAP[alias.toLowerCase()] = allNames;
            }
        }
    }
} catch (e) {
    // Manifest unavailable — getSubjectCandidates() will fall back to raw name
    SUBJECT_ALIAS_MAP = {};
}

/**
 * Finds the workspace / vault root directory regardless of current working directory (CWD).
 * Traverses upwards looking for marker directories like '.agents' or 'Study Materials'.
 */
function getVaultRoot(startDir = __dirname) {
    let current = path.resolve(startDir);
    while (true) {
        if (fs.existsSync(path.join(current, '.agents')) || 
            fs.existsSync(path.join(current, 'agents')) ||
            (fs.existsSync(path.join(current, '.git')) && fs.existsSync(path.join(current, 'skills'))) ||
            (fs.existsSync(path.join(current, 'Study Materials')) && fs.existsSync(path.join(current, 'Sources')))) {
            return current;
        }
        const parent = path.dirname(current);
        if (parent === current) {
            // Reached filesystem root, fallback to startDir or process.cwd()
            return path.resolve(startDir);
        }
        current = parent;
    }
}

/**
 * Sanitizes and normalizes a chapter or subject name safely without mangling Unicode or valid punctuation.
 */
function normalizeName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim();
}

/**
 * Sanitizes slug string without illegal filesystem characters.
 */
function sanitizeSlug(name) {
    if (!name || typeof name !== 'string') return '';
    return name.replace(/[\\/:*?"<>|]/g, '').trim();
}

/**
 * Returns candidate subject names based on alias dictionary.
 */
function getSubjectCandidates(subject) {
    const safeSubj = normalizeName(subject);
    const lower = safeSubj.toLowerCase();
    const aliases = SUBJECT_ALIAS_MAP[lower] || [safeSubj];
    const unique = [safeSubj, ...aliases];
    return Array.from(new Set(unique.filter(Boolean)));
}

/**
 * Generates slug and punctuation variations for chapter names.
 */
function getChapterVariants(chapter) {
    const safeChap = normalizeName(chapter);
    const variants = [
        safeChap,
        sanitizeSlug(safeChap),
        safeChap.replace(/\s*&\s*/g, '-').replace(/\s+/g, '-'),
        safeChap.replace(/-/g, ' & '),
        safeChap.replace(/-/g, ' '),
        safeChap.replace(/[-\s&]+/g, '_')
    ];
    return Array.from(new Set(variants.filter(Boolean)));
}

/**
 * Resolves the absolute path to a chapter directory within Study Materials.
 * Performs candidate probing and filesystem inspection.
 */
function resolveChapterDir(subject, chapter, customRoot = null) {
    const root = customRoot || getVaultRoot();
    const studyMaterialsDir = path.join(root, 'Study Materials');
    const safeSubj = normalizeName(subject);
    const safeChap = normalizeName(chapter);

    const subjectCandidates = getSubjectCandidates(safeSubj);
    const chapterVariants = getChapterVariants(safeChap);

    // 1. Direct candidate matching
    for (const subj of subjectCandidates) {
        for (const chap of chapterVariants) {
            const candidatePath = path.join(studyMaterialsDir, subj, chap);
            if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) {
                return candidatePath;
            }
        }
    }

    // 2. Filesystem inspection for case-insensitive / loose matching
    if (fs.existsSync(studyMaterialsDir)) {
        try {
            const existingSubjects = fs.readdirSync(studyMaterialsDir);
            for (const subj of subjectCandidates) {
                const matchedSubjDir = existingSubjects.find(s => s.toLowerCase() === subj.toLowerCase());
                if (matchedSubjDir) {
                    const fullSubjDir = path.join(studyMaterialsDir, matchedSubjDir);
                    if (fs.statSync(fullSubjDir).isDirectory()) {
                        const existingChapters = fs.readdirSync(fullSubjDir);
                        for (const chap of chapterVariants) {
                            const matchedChapDir = existingChapters.find(c => 
                                c.toLowerCase() === chap.toLowerCase() ||
                                c.toLowerCase().replace(/[-\s&_]+/g, '') === chap.toLowerCase().replace(/[-\s&_]+/g, '')
                            );
                            if (matchedChapDir) {
                                const fullChapDir = path.join(fullSubjDir, matchedChapDir);
                                if (fs.statSync(fullChapDir).isDirectory()) {
                                    return fullChapDir;
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore readdir error and proceed to fallback
        }
    }

    // 3. Fallback for new chapters / scratch test directories
    let preferredSubj = safeSubj;
    if (fs.existsSync(studyMaterialsDir)) {
        for (const subj of subjectCandidates) {
            const candidateSubjDir = path.join(studyMaterialsDir, subj);
            if (fs.existsSync(candidateSubjDir) && fs.statSync(candidateSubjDir).isDirectory()) {
                preferredSubj = subj;
                break;
            }
        }
    }
    return path.join(studyMaterialsDir, preferredSubj, safeChap);
}

/**
 * Returns canonical artifact identities and expected on-disk paths for a given subject and chapter.
 */
function getCanonicalArtifactPaths(subject, chapter, customRoot = null) {
    const chapterDir = resolveChapterDir(subject, chapter, customRoot);
    const safeChap = normalizeName(chapter);
    const safeSubj = normalizeName(subject);

    const buildManifestPath = path.join(chapterDir, '.build', 'artifact-manifest.json');
    const rootManifestPath = path.join(chapterDir, 'artifact-manifest.json');
    const activeManifestPath = fs.existsSync(buildManifestPath) ? buildManifestPath : rootManifestPath;
    const activeManifestRel = fs.existsSync(buildManifestPath) ? '.build/artifact-manifest.json' : 'artifact-manifest.json';

    const result = {
        subject: safeSubj,
        chapter: safeChap,
        chapterDir,
        manifest: {
            artifactType: 'manifest',
            path: activeManifestPath,
            relPath: activeManifestRel
        },
        buildManifest: {
            artifactType: 'manifest',
            path: buildManifestPath,
            relPath: '.build/artifact-manifest.json'
        },
        problemPatterns: { // legacy .md
            artifactType: 'problemPatterns',
            path: path.join(chapterDir, 'Optional', `${safeChap}_ProblemPatterns.md`),
            relPath: path.join('Optional', `${safeChap}_ProblemPatterns.md`)
        },
        proceduralManifest: { // side-effect output
            artifactType: 'proceduralManifest',
            path: path.join(chapterDir, 'StudyLab', `${safeChap}_StudyLab_Procedural.manifest.json`),
            relPath: path.join('StudyLab', `${safeChap}_StudyLab_Procedural.manifest.json`)
        }
    };

    const studyLabDir = path.join(chapterDir, 'StudyLab');
    if (fs.existsSync(studyLabDir)) {
        try {
            const files = fs.readdirSync(studyLabDir);
            const manMatch = files.find(f => f.endsWith('_StudyLab_Procedural.manifest.json'));
            if (manMatch) {
                result.proceduralManifest.path = path.join(studyLabDir, manMatch);
                result.proceduralManifest.relPath = path.relative(chapterDir, result.proceduralManifest.path);
            }
        } catch (e) {}
    }

    const { getArtifactRegistry } = require('./artifact_registry');
    const registry = getArtifactRegistry();

    for (const [key, def] of Object.entries(registry)) {
        if (!def.artifactKey) continue;
        const artifactType = def.artifactKey;
        const outDir = def.output_dir ? path.join(chapterDir, def.output_dir) : chapterDir;
        const fileName = def.file_pattern.replace('{chapter}', safeChap);
        let outPath = path.join(outDir, fileName);

        // Fallback probing for existing studyLab files on disk with variant names
        if (def.output_dir === 'StudyLab' && fs.existsSync(outDir)) {
            try {
                const files = fs.readdirSync(outDir);
                const suffix = fileName.substring(fileName.indexOf('_'));
                const match = files.find(f => f.endsWith(suffix));
                if (match) outPath = path.join(outDir, match);
            } catch (e) {}
        }

        result[artifactType] = {
            artifactType: artifactType,
            path: outPath,
            relPath: path.relative(chapterDir, outPath)
        };

        if (artifactType === 'imageOcclusion') {
            result[artifactType].mediaDir = path.join(outDir, 'media');
        }
    }

    return result;
}

module.exports = {
    getVaultRoot,
    normalizeName,
    sanitizeSlug,
    getSubjectCandidates,
    getChapterVariants,
    resolveChapterDir,
    getCanonicalArtifactPaths,
    SUBJECT_ALIAS_MAP
};
