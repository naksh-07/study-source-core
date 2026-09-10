const fs = require('fs');

let content = fs.readFileSync('.agents/skills/study-source-core/scripts/path_resolver.js', 'utf8');

const replacement = `function getCanonicalArtifactPaths(subject, chapter, customRoot = null) {
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
            path: path.join(chapterDir, 'Optional', \`\${safeChap}_ProblemPatterns.md\`),
            relPath: path.join('Optional', \`\${safeChap}_ProblemPatterns.md\`)
        },
        proceduralManifest: { // side-effect output
            artifactType: 'proceduralManifest',
            path: path.join(chapterDir, 'StudyLab', \`\${safeChap}_StudyLab_Procedural.manifest.json\`),
            relPath: path.join('StudyLab', \`\${safeChap}_StudyLab_Procedural.manifest.json\`)
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
            relPath: path.relative(chapterDir, outPath).replace(/\\\\/g, '/')
        };

        if (artifactType === 'imageOcclusion') {
            result[artifactType].mediaDir = path.join(outDir, 'media');
        }
    }

    return result;
}`;

const startIdx = content.indexOf('function getCanonicalArtifactPaths(');
const endIdx = content.indexOf('module.exports = {');

if (startIdx !== -1 && endIdx !== -1) {
    const newContent = content.substring(0, startIdx) + replacement + '\n\n' + content.substring(endIdx);
    fs.writeFileSync('.agents/skills/study-source-core/scripts/path_resolver.js', newContent);
    console.log('Successfully refactored path_resolver.js');
} else {
    console.log('Failed to find replacement bounds.');
}
