# The Absolute Anti-Fallback Invariant & Interaction Modality Matrix (`anti-fallback-invariant.md`)
**Version**: `2.0.0`  
**Classification**: Pedagogical Architecture & Invariant Specification  
**Status**: Release-Blocking Invariant

---

## 1. The Absolute Anti-Fallback Invariant

> [!CAUTION]
> **ABSOLUTE ANTI-FALLBACK INVARIANT (RELEASE-BLOCKING)**:
> StudyLab MUST NEVER degrade to a generic fill-in-the-blank text box (`<input type="text">`, "Type your answer...", "Enter the answer:") simply because an interaction renderer lacks a specialized widget.
> Flashcard self-rating ("Question $\to$ Think $\to$ Reveal $\to$ Easy/Hard") is strictly prohibited for procedural items.
> Every question MUST use its authentic interaction modality. Any package containing generic text fallback prompts or dummy options is rejected with an immediate Level 3 validation failure (`FAIL`).

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THE ANTI-FALLBACK ARCHITECTURAL BAN                              │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ❌ PROHIBITED: Generic `<input type="text">` fallback boxes.                                     │
│ ❌ PROHIBITED: Placeholder prompts: "Type your answer...", "Enter the answer:", "Answer here:". │
│ ❌ PROHIBITED: Dummy distractors: `["Option A", "Option B", "Option C", "Option D"]`.            │
│ ❌ PROHIBITED: Self-rated flashcard rating ("Question ──▶ Think ──▶ Flip ──▶ Rate Easy/Hard").  │
│                                                                                                  │
│ ✅ MANDATORY: Authentic Modality Matrix (`mcq`, `numerical`, `stepwise`, `concept_check`, etc.) │
│ ✅ MANDATORY: Numeric precision inputs with explicit SI units and tolerance bounds.              │
│ ✅ MANDATORY: Active comprehension checkpoints for worked examples.                             │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Cognitive Science & Pedagogical Rationale

The Anti-Fallback Invariant is grounded in empirical cognitive psychology:

### 2.1 Cognitive Load Theory (Sweller 1988)
Generic text inputs impose massive **extraneous cognitive load**. When presented with an unguided text field for a multi-step physics or chemistry problem, learners must simultaneously manage syntax formatting, intermediate working memory storage, and algebraic computation. Authentic scaffolded modalities (`stepwise`, `numerical` with keypad, `mcq` diagnostic cards) isolate germane cognitive processing.

### 2.2 Metacognitive Method Selection (Rohrer & Taylor 2007)
Research on interleaved practice demonstrates that mathematical mastery consists of two distinct stages:
1. **Method Selection** (Recognizing *which* theorem/algorithm applies).
2. **Computational Execution** (Executing the arithmetic/algebra correctly).

Generic text boxes bypass the method selection stage completely by forcing immediate numeric calculation. Modalities like `strategy_drill` explicitly train method discrimination.

### 2.3 The Illusion of Competence in Self-Rating (Roediger & Karpicke 2006)
Flashcard self-rating ("Look at question $\to$ Mentally think 'I know this' $\to$ Reveal answer $\to$ Press 'Easy'") is fatal for procedural mastery. Learners frequently suffer from the *illusion of competence*, confusing retrospective comprehension of a solution with the generative ability to execute it. Procedural mastery requires verifiable active interaction.

---

## 3. Authentic Interaction Modality Matrix

StudyLab defines 6 canonical interaction modalities:

| Modality ID | Interaction Type | Required UI & Data Attributes | Prohibited Antipatterns | Pedagogical Purpose |
|---|---|---|---|---|
| **`mcq`** | Discrete Choice | `options` array ($\ge 4$ choices), `correct_option` (exact string match), authentic distractor misconception keys. | Empty `options: []`, generic textboxes, dummy distractors (`["Option A", "Option B", ...]`). | Discrimination, diagnostic trap assessment, recognition under time constraints. |
| **`numerical`** | Precision Numeric Input | Numeric `answer` (number), `tolerance` ($\ge 0$, absolute or relative), `unit` (explicit SI/standard unit string), numeric keypad UI. | Textbox without unit/tolerance, raw string comparison, unhandled floating-point precision. | Quantitative calculation fluency, dimensional accuracy, arithmetic execution. |
| **`stepwise`** | Scaffolded Step Nodes | Multi-node DAG step interaction, intermediate algebraic expressions, ordered prerequisite dependencies (`depends_on`). | Single unguided essay box, skipping intermediate evaluation, cyclic dependencies. | Reducing cognitive load (Sweller 1988), assessing procedural sub-skills sequentially. |
| **`concept_check`** | Conceptual Decision Cards | 2–4 discrete conceptual alternative cards with immediate rationale feedback per option. | Rote definition regurgitation, multi-step math without conceptual branching. | Identifying foundational misconceptions before procedural drills. |
| **`strategy_drill`** | Metacognitive Method Selection | Method alternative radio buttons (e.g. *Prime Factorization* vs *Division Algorithm* vs *Modular Remainder*). | Asking for final numeric value instead of method choice. | Metacognitive tool selection (Rohrer & Taylor 2007). |
| **`worked_example`** | Guided Faded Example | Step-by-step decision sequence with active comprehension verification nodes. | Passive static text display without active learner checkpoints. | Cognitive load management for novel transfer problem types. |

---

## 4. Deep Modality Specifications

### 4.1 `mcq` (Discrete Choice)
- **Data Model**:
  ```json
  {
    "question_type": "mcq",
    "prompt": "दो संख्याओं का HCF 14 तथा LCM 420 है। यदि एक संख्या 84 है, तो दूसरी संख्या क्या होगी?",
    "options": ["56", "70", "84", "98"],
    "correct_option": "70",
    "distractor_rationales": {
      "56": "ERR_01: Calculation arithmetic slip in division 5880 / 84",
      "84": "ERR_03: Mistook second number to be equal to first",
      "98": "ERR_06: Remainder offset added incorrectly"
    }
  }
  ```
- **Validation Rules**:
  - Array length: $\ge 4$ options.
  - No duplicate options.
  - `correct_option` must strictly exist in `options`.
  - Distractor options must map to cognitive error categories.

---

### 4.2 `numerical` (Precision Numeric Input)
- **Data Model**:
  ```json
  {
    "question_type": "numerical",
    "prompt": "एक कार 20 m/s के वेग से चल रही है। 2 m/s² के मंदन पर रुकने से पहले तय की गई दूरी (Stopping Distance) ज्ञात कीजिए।",
    "answer": 100.0,
    "tolerance": 0.5,
    "tolerance_type": "absolute",
    "units": "m",
    "keypad_layout": "standard_physics"
  }
  ```
- **Validation Rules**:
  - `answer` must be a valid finite number.
  - `units` must be declared and non-empty.
  - `tolerance` must be $\ge 0.0$.
  - Evaluation uses checked numeric inequality: $|x_{\text{user}} - answer| \le tolerance$.

---

### 4.3 `stepwise` (Scaffolded DAG Step Nodes)
- **Data Model**:
  ```json
  {
    "question_type": "stepwise",
    "prompt": "5 kg द्रव्यमान का एक गुटका 30° झुकाव वाले खुरदुरे तल (μ = 0.2) पर रखा है। त्वरण ज्ञात कीजिए।",
    "step_nodes": [
      {
        "id": "step_1_fbd",
        "step_type": "build_representation",
        "label": "नत तल के समानांतर घटक निकालें",
        "expected_expression": "mg sin(30°)",
        "dependencies": []
      },
      {
        "id": "step_2_friction",
        "step_type": "apply_constraint",
        "label": "अधिकतम घर्षण बल ज्ञात करें",
        "expected_expression": "μ mg cos(30°)",
        "dependencies": ["step_1_fbd"]
      },
      {
        "id": "step_3_accel",
        "step_type": "final_answer",
        "label": "परिणामी त्वरण की गणना करें",
        "expected_expression": "g(sin 30° - μ cos 30°)",
        "dependencies": ["step_2_friction"]
      }
    ]
  }
  ```
- **Validation Rules**:
  - $\ge 2$ step nodes.
  - Graph is verified acyclic via 3-state DFS.
  - Each step contains expected expression / value matcher.

---

### 4.4 `concept_check` (Conceptual Decision Cards)
- **Data Model**:
  ```json
  {
    "question_type": "concept_check",
    "prompt": "यदि किसी गतिमान पिंड का वेग दोगुना कर दिया जाए, तो उसकी गतिज ऊर्जा (Kinetic Energy) पर क्या प्रभाव पड़ेगा?",
    "cards": [
      { "id": "c1", "text": "दोगुनी हो जाएगी (Doubles)", "is_correct": false, "rationale": "ERR_01: Linear scaling misconception (E_k ∝ v² not v)" },
      { "id": "c2", "text": "चार गुनी हो जाएगी (Quadruples)", "is_correct": true, "rationale": "Correct: E_k = 1/2 m v² ⟹ (2v)² = 4v²" },
      { "id": "c3", "text": "अपरिवर्तित रहेगी (Remains same)", "is_correct": false, "rationale": "ERR_03: Mass vs Velocity independence confusion" }
    ]
  }
  ```

---

### 4.5 `strategy_drill` (Metacognitive Method Selection)
- **Data Model**:
  ```json
  {
    "question_type": "strategy_drill",
    "prompt": "संख्याओं 306 तथा 657 का HCF निकालने के लिए सबसे तेज विधि कौन सी होगी?",
    "strategies": [
      { "id": "strat_1", "name": "अभाज्य गुणनखंडन (Prime Factorization)", "efficiency_rating": "SLOW", "tradeoff_explanation": "बड़े अभाज्य गुणनखंड खोजना समय लेगा।" },
      { "id": "strat_2", "name": "यूक्लिड विभाजन एल्गोरिदम (Division Algorithm)", "efficiency_rating": "OPTIMAL", "tradeoff_explanation": "केवल 2-3 विभाजन चरणों में उत्तर देता है।" },
      { "id": "strat_3", "name": "विकल्प सत्यापन (Option Verification)", "efficiency_rating": "SUBOPTIMAL", "tradeoff_explanation": "यदि विकल्प बड़े हों तो जटिल होगा।" }
    ],
    "optimal_strategy_id": "strat_2"
  }
  ```

---

### 4.6 `worked_example` (Guided Faded Example)
- **Data Model**:
  ```json
  {
    "question_type": "worked_example",
    "title": "Stoichiometry Limiting Reagent Calculation",
    "scaffolded_stages": [
      { "stage": 1, "title": "संतुलित समीकरण लिखें", "content": "N₂ + 3H₂ → 2NH₃", "mode": "EXPOSITORY" },
      { "stage": 2, "title": "मोलों की संख्या ज्ञात करें", "content": "n(N₂) = 28g / 28 = 1 mol, n(H₂) = 9g / 2 = 4.5 mol", "mode": "EXPOSITORY" },
      { "stage": 3, "title": "सीमांत अभिकर्मक (Limiting Reagent) चुनें", "checkpoint": { "question": "सीमांत अभिकर्मक कौन सा है?", "options": ["N₂", "H₂"], "correct": "N₂" }, "mode": "ACTIVE_CHECKPOINT" }
    ]
  }
  ```

---

## 5. Automated Validation & Rejection Pipeline

The Multi-Tier Validator (`validate_studylab_levels_1_6.js`, Level 3) runs automated regex and AST scanners against every compiled note payload:

```typescript
// Level 3 Modality Scanner
const genericFallbackRegex = /^(type your answer|enter the answer|fill in the blank|solve this problem|answer here)[\s.:]*$/i;

if (genericFallbackRegex.test(sourcePrompt.trim())) {
    errors.push(`[Anti-Fallback Invariant] Note id ${nid} uses generic textbox placeholder prompt '${sourcePrompt}'.`);
}

if (questionType === 'mcq') {
    if (!Array.isArray(options) || options.length < 4) {
        errors.push(`[Modality Integrity] MCQ item ${id} has fewer than 4 options.`);
    }
    const isDummy = options.every((opt, i) => opt === `Option ${String.fromCharCode(65 + i)}` || opt === String.fromCharCode(65 + i));
    if (isDummy) {
        errors.push(`[Modality Integrity] MCQ item ${id} contains dummy placeholder options.`);
    }
}
```

Any item failing these checks results in a total build and release block.
