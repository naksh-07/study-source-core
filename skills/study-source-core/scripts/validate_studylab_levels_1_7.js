/**
 * StudyLab Multi-Tier APKG Validator (`validate_studylab_levels_1_7.js`)
 * Authoritative Levels 1-7 Validation Suite CLI entry point.
 */

const {
    validateStudyLabLevels1to6,
    validateStudyLabLevels1to7,
    validateLevel1PackageStructure,
    validateLevel2Schema,
    validateLevel3Modality,
    validateLevel4Coverage,
    validateLevel5LearningCompleteness,
    validateLevel6AdaptiveSemantics,
    validateLevel7PracticeDepth,
    printScorecard
} = require('./validate_studylab_levels_1_6');

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error("Usage: node validate_studylab_levels_1_7.js <path_to_apkg> [--json] [--source <source_path>]");
        process.exit(1);
    }

    const targetApkg = args[0];
    const isJson = args.includes('--json');
    let sourcePath = null;
    const sourceIdx = args.indexOf('--source');
    const sourceDataIdx = args.indexOf('--source-data');
    if (sourceIdx !== -1 && args[sourceIdx + 1]) {
        sourcePath = args[sourceIdx + 1];
    } else if (sourceDataIdx !== -1 && args[sourceDataIdx + 1]) {
        sourcePath = args[sourceDataIdx + 1];
    }

    validateStudyLabLevels1to7(targetApkg, { sourcePath }).then(result => {
        if (isJson) {
            console.log(JSON.stringify(result, null, 2));
        } else {
            printScorecard(result);
        }
        process.exit(result.overall_verdict === 'PASS' ? 0 : 1);
    }).catch(err => {
        console.error("Validation Error:", err.message);
        process.exit(1);
    });
}

module.exports = {
    validateStudyLabLevels1to6,
    validateStudyLabLevels1to7,
    validateLevel1PackageStructure,
    validateLevel2Schema,
    validateLevel3Modality,
    validateLevel4Coverage,
    validateLevel5LearningCompleteness,
    validateLevel6AdaptiveSemantics,
    validateLevel7PracticeDepth,
    printScorecard
};
