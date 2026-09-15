const { getSuitability, getSuitabilityTier, evaluateChapterSuitability, SUITABILITY_TIERS, SUBJECT_CATEGORIES } = require('./artifact_suitability_policy');
const { normalizePropositionText, generateCanonicalSemanticIdentity } = require('./ku_reservation_engine');
const { extractTokens, computeJaccardSimilarity } = require('./semantic_deduplication');

const PEDAGOGICAL_CLASSIFICATIONS = {
  CONCEPTUAL: 'CONCEPTUAL',
  FACTUAL: 'FACTUAL',
  PROCEDURAL: 'PROCEDURAL',
  SPATIAL: 'SPATIAL',
  RELATIONAL: 'RELATIONAL'
};

const LEARNING_OBJECTIVES = {
  RECALL: 'RECALL',
  RECOGNITION: 'RECOGNITION',
  UNDERSTANDING: 'UNDERSTANDING',
  APPLICATION: 'APPLICATION',
  ANALYSIS: 'ANALYSIS',
  PROBLEM_SOLVING: 'PROBLEM_SOLVING',
  TRANSFER: 'TRANSFER'
};

const SCAFFOLDING_STAGES = {
  RECOGNITION: 'RECOGNITION',
  GUIDED: 'GUIDED',
  INDEPENDENT: 'INDEPENDENT',
  TRANSFER: 'TRANSFER'
};

const CLASSIFICATION_SIGNALS = {
  PROCEDURAL: ['calculate', 'find the value', 'solve', 'determine', 'compute', 'evaluate', 'derive', 'prove', 'show that', 'simplify'],
  FACTUAL: ['define', 'name', 'list', 'state', 'what is', 'who', 'when', 'where'],
  CONCEPTUAL: ['explain', 'describe', 'concept', 'principle', 'law', 'theorem', 'why'],
  SPATIAL: ['diagram', 'figure', 'map', 'draw', 'locate', 'label', 'identify on', 'plot'],
  RELATIONAL: ['compare', 'contrast', 'relationship', 'cause', 'effect', 'hierarchy', 'classify', 'distinguish']
};

const SUBJECT_DEFAULT_CLASSIFICATIONS = {
  Math: PEDAGOGICAL_CLASSIFICATIONS.PROCEDURAL,
  Physics: PEDAGOGICAL_CLASSIFICATIONS.PROCEDURAL,
  Chemistry: PEDAGOGICAL_CLASSIFICATIONS.PROCEDURAL,
  Reasoning: PEDAGOGICAL_CLASSIFICATIONS.PROCEDURAL,
  Geography: PEDAGOGICAL_CLASSIFICATIONS.SPATIAL,
  Biology: PEDAGOGICAL_CLASSIFICATIONS.FACTUAL,
  History: PEDAGOGICAL_CLASSIFICATIONS.FACTUAL,
  Map: PEDAGOGICAL_CLASSIFICATIONS.SPATIAL,
  'Political Science': PEDAGOGICAL_CLASSIFICATIONS.CONCEPTUAL
};

function classifyKnowledgeUnit(ku) {
  if (!ku) return { classification: null, confidence: 0, signals: [], secondaryClassifications: [] };

  const textComponents = [
    ku.title || '',
    ku.definition || '',
    ...(ku.propositions || []),
    ku.stem || '',
    ...(ku.formulas || [])
  ];
  
  const text = textComponents.join(' ').toLowerCase();

  const scores = {};
  const matchedSignals = {};
  let totalHits = 0;

  for (const [classification, signals] of Object.entries(CLASSIFICATION_SIGNALS)) {
    scores[classification] = 0;
    matchedSignals[classification] = [];
    for (const signal of signals) {
      const regex = new RegExp(`\\b${signal}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        const count = matches.length;
        scores[classification] += count;
        totalHits += count;
        matchedSignals[classification].push(signal);
      }
    }
  }

  if (ku.formulas && ku.formulas.length > 0) {
    scores.PROCEDURAL = (scores.PROCEDURAL || 0) + 2;
    totalHits += 2;
  }
  if (ku.solution_dag) {
    scores.PROCEDURAL = (scores.PROCEDURAL || 0) + 3;
    totalHits += 3;
  }
  
  const spatialIndicators = ['diagram', 'map', 'coordinate', 'graph', 'chart'];
  for (const ind of spatialIndicators) {
    if (text.includes(ind)) {
      scores.SPATIAL = (scores.SPATIAL || 0) + 2;
      totalHits += 2;
    }
  }

  let subjectDefault = null;
  if (ku.subject && SUBJECT_DEFAULT_CLASSIFICATIONS[ku.subject]) {
    subjectDefault = SUBJECT_DEFAULT_CLASSIFICATIONS[ku.subject];
    scores[subjectDefault] = (scores[subjectDefault] || 0) + 1;
    totalHits += 1;
  }

  const sorted = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
  let primary = sorted[0];
  let maxScore = scores[primary];

  if (maxScore === 0) {
    primary = subjectDefault || PEDAGOGICAL_CLASSIFICATIONS.FACTUAL;
  }

  const confidence = totalHits > 0 ? Math.min(1, maxScore / totalHits) : 0.5;
  const signals = matchedSignals[primary] || [];
  const secondary = sorted.slice(1).filter(k => scores[k] > 0);

  return {
    classification: primary,
    confidence,
    signals,
    secondaryClassifications: secondary
  };
}

function mapToLearningObjective(classification, kuContext) {
  if (kuContext && kuContext.isTransferQuestion) {
    return { objective: LEARNING_OBJECTIVES.TRANSFER, justification: 'Explicitly marked as a transfer question.' };
  }

  switch (classification) {
    case PEDAGOGICAL_CLASSIFICATIONS.FACTUAL:
      return { objective: LEARNING_OBJECTIVES.RECALL, justification: 'Factual knowledge requires recall.' };
    case PEDAGOGICAL_CLASSIFICATIONS.CONCEPTUAL:
      return { objective: LEARNING_OBJECTIVES.UNDERSTANDING, justification: 'Conceptual knowledge requires understanding.' };
    case PEDAGOGICAL_CLASSIFICATIONS.PROCEDURAL:
      if (kuContext && kuContext.ku && kuContext.ku.solution_dag && Array.isArray(kuContext.ku.solution_dag) && kuContext.ku.solution_dag.length > 2) {
        return { objective: LEARNING_OBJECTIVES.PROBLEM_SOLVING, justification: 'Multi-step procedural requires problem solving.' };
      }
      return { objective: LEARNING_OBJECTIVES.APPLICATION, justification: 'Procedural knowledge requires application.' };
    case PEDAGOGICAL_CLASSIFICATIONS.SPATIAL:
      return { objective: LEARNING_OBJECTIVES.RECOGNITION, justification: 'Spatial knowledge requires recognition.' };
    case PEDAGOGICAL_CLASSIFICATIONS.RELATIONAL:
      return { objective: LEARNING_OBJECTIVES.ANALYSIS, justification: 'Relational knowledge requires analysis.' };
    default:
      return { objective: LEARNING_OBJECTIVES.RECALL, justification: 'Default fallback.' };
  }
}

function determineScaffoldingProgression(ku, classification, objective) {
  let stage = SCAFFOLDING_STAGES.RECOGNITION;
  let justification = 'Default starting stage.';
  
  if (classification === PEDAGOGICAL_CLASSIFICATIONS.PROCEDURAL) {
    if (ku.worked_example) {
      stage = SCAFFOLDING_STAGES.GUIDED;
      justification = 'Worked example provided.';
    } else if (ku.solution_dag && Array.isArray(ku.solution_dag) && ku.solution_dag.length > 3) {
      stage = SCAFFOLDING_STAGES.INDEPENDENT;
      justification = 'Complex procedural task requires independent practice.';
    }
  }
  
  if (objective === LEARNING_OBJECTIVES.TRANSFER) {
    stage = SCAFFOLDING_STAGES.TRANSFER;
    justification = 'Objective is transfer to novel context.';
  }

  const progression = [
    SCAFFOLDING_STAGES.RECOGNITION,
    SCAFFOLDING_STAGES.GUIDED,
    SCAFFOLDING_STAGES.INDEPENDENT,
    SCAFFOLDING_STAGES.TRANSFER
  ];

  return { stage, progression, justification };
}

function compileKnowledgeUnit(ku, context = {}) {
  const classificationResult = classifyKnowledgeUnit(ku);
  
  const kuContext = { ...context, ku };
  const objectiveResult = mapToLearningObjective(classificationResult.classification, kuContext);
  
  const scaffoldingResult = determineScaffoldingProgression(ku, classificationResult.classification, objectiveResult.objective);
  
  let artifactRecommendations = [];
  if (context.subject) {
    try {
      const evalRes = evaluateChapterSuitability(context.subject);
      if (evalRes && evalRes.suitabilityEvaluations) {
        artifactRecommendations = Object.keys(evalRes.suitabilityEvaluations).map(key => ({
          artifactKey: key,
          suitability: evalRes.suitabilityEvaluations[key].tier,
          generate: evalRes.suitabilityEvaluations[key].isSuitable,
          reason: evalRes.suitabilityEvaluations[key].reason || 'Suitability evaluated'
        }));
      }
    } catch (e) {
      // Ignored if artifact suitability policy doesn't have it
    }
  }

  return {
    ku_id: ku.ku_id || ku.id || 'unknown',
    classification: {
      primary: classificationResult.classification,
      confidence: classificationResult.confidence,
      signals: classificationResult.signals,
      secondary: classificationResult.secondaryClassifications
    },
    learningObjective: objectiveResult,
    scaffolding: scaffoldingResult,
    artifactRecommendations,
    compiledAt: new Date().toISOString()
  };
}

function compileChapterPedagogy(kus, subject, context = {}) {
  const compiledKus = kus.map(ku => {
    const kuContext = { ...context, subject };
    return compileKnowledgeUnit(ku, kuContext);
  });

  const classificationDist = {};
  const objectiveDist = {};
  
  let hasProcedural = false;
  let hasFactual = false;
  let hasConceptual = false;
  let hasSpatial = false;
  let hasRelational = false;

  compiledKus.forEach(cku => {
    const p = cku.classification.primary;
    classificationDist[p] = (classificationDist[p] || 0) + 1;
    
    if (p === PEDAGOGICAL_CLASSIFICATIONS.PROCEDURAL) hasProcedural = true;
    if (p === PEDAGOGICAL_CLASSIFICATIONS.FACTUAL) hasFactual = true;
    if (p === PEDAGOGICAL_CLASSIFICATIONS.CONCEPTUAL) hasConceptual = true;
    if (p === PEDAGOGICAL_CLASSIFICATIONS.SPATIAL) hasSpatial = true;
    if (p === PEDAGOGICAL_CLASSIFICATIONS.RELATIONAL) hasRelational = true;

    const o = cku.learningObjective.objective;
    objectiveDist[o] = (objectiveDist[o] || 0) + 1;
  });

  let dominantClassification = null;
  let maxCount = 0;
  for (const [cls, count] of Object.entries(classificationDist)) {
    if (count > maxCount) {
      maxCount = count;
      dominantClassification = cls;
    }
  }
  
  let chapterSuitability = null;
  try {
    chapterSuitability = evaluateChapterSuitability(subject);
  } catch (e) {
    // Ignore if not present
  }

  return {
    subject,
    chapterSummary: {
      totalKus: kus.length,
      classificationDistribution: classificationDist,
      objectiveDistribution: objectiveDist,
      dominantClassification
    },
    compiledKus,
    chapterSuitability,
    pedagogicalProfile: {
      hasProcedural,
      hasFactual,
      hasConceptual,
      hasSpatial,
      hasRelational,
      recommendedPrimaryTrack: dominantClassification || SUBJECT_DEFAULT_CLASSIFICATIONS[subject] || PEDAGOGICAL_CLASSIFICATIONS.FACTUAL
    },
    compiledAt: new Date().toISOString()
  };
}

function validateCompiledPedagogy(compiled) {
  const errors = [];
  const warnings = [];
  
  if (!compiled) {
    return { isValid: false, errors: ['Compiled pedagogy is null or undefined.'], warnings: [] };
  }
  
  if (!compiled.classification || !compiled.classification.primary) {
    errors.push('Missing primary classification.');
  } else if (!Object.values(PEDAGOGICAL_CLASSIFICATIONS).includes(compiled.classification.primary)) {
    errors.push('Invalid primary classification.');
  }
  
  if (!compiled.learningObjective || !compiled.learningObjective.objective) {
    errors.push('Missing learning objective.');
  } else if (!Object.values(LEARNING_OBJECTIVES).includes(compiled.learningObjective.objective)) {
    errors.push('Invalid learning objective.');
  }
  
  if (!compiled.scaffolding || !compiled.scaffolding.stage) {
    errors.push('Missing scaffolding stage.');
  } else if (!Object.values(SCAFFOLDING_STAGES).includes(compiled.scaffolding.stage)) {
    errors.push('Invalid scaffolding stage.');
  }
  
  if (!compiled.artifactRecommendations || !Array.isArray(compiled.artifactRecommendations)) {
    warnings.push('artifactRecommendations is missing or not an array.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  PEDAGOGICAL_CLASSIFICATIONS,
  LEARNING_OBJECTIVES,
  SCAFFOLDING_STAGES,
  CLASSIFICATION_SIGNALS,
  SUBJECT_DEFAULT_CLASSIFICATIONS,
  classifyKnowledgeUnit,
  mapToLearningObjective,
  determineScaffoldingProgression,
  compileKnowledgeUnit,
  compileChapterPedagogy,
  validateCompiledPedagogy
};
