const fs = require('fs');
const path = require('path');

const baseDir = 'c:/Users/Suraj/Pictures/Books/Acadmey/ALP/Prompts/AI Notes/.agents/skills/study-source-core/subject-skills';
const subjects = ['Biology', 'Chemistry', 'Geography', 'History', 'Map', 'Math', 'Physics', 'Political Science', 'Reasoning'];

for (const subj of subjects) {
    const filePath = path.join(baseDir, subj, 'SKILL.md');
    if (!fs.existsSync(filePath)) {
        console.log('File not found: ' + filePath);
        continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    const pattern1 = /### Canonical Operations & Invariant References[\s\S]*?(?=\n\n---|## )/g;
    const replacement1 = '> *This skill inherits all core policies, StudyLab invariants, 3-tier hints, options contracts, error taxonomies, and universal language contracts directly from `study-source-core`. Do not duplicate core definitions here.*';
    content = content.replace(pattern1, replacement1);

    const pattern1b = /### SOURCE-FIRST StudyLab Lineage Invariant[\s\S]*?(?=\n\n---|## )/g;
    content = content.replace(pattern1b, '');



    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + subj);
}
