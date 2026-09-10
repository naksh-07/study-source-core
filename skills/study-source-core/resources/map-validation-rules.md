# Mind Map Validation Rules (`map-validation-rules.md`)

This document defines the strict validation rules for the canonical `MindMapData` JSON contract.

## 1. Top-Level Validation

The root JSON object MUST conform to the following:
- `id`: Required. Unique string identifier.
- `title`: Required. Non-empty string.
- `subject`: Required. Must match the active subject name.
- `language`: Required. Must indicate the language strategy (e.g. `hi`, `en`, or `mixed`).
- `root`: Required. The root node object.

## 2. Node Tree Validation

Every node inside `root` (and recursively inside `children`) MUST conform to the following:
- `id`: Required. Must be a globally unique string across the entire map. Duplicate IDs are a strict ERROR.
- `label`: Required. Concise string (2-6 words default).
- `children`: Optional. Must be an array of valid node objects if present.
- Circular references: Strictly FORBIDDEN. The `children` relationships must form a strict tree/DAG.

## 3. Cross-Links Validation

If the optional `crossLinks` array is present:
- Every cross-link MUST have `sourceId` and `targetId`.
- Both `sourceId` and `targetId` MUST exist as node IDs within the map.
- `type`: Optional. Must be a valid relation category (e.g. `relationship`, `causality`, `comparison`).
- `label`: Required. Must be a meaningful semantic relation (e.g. `causes`, `depends on`). Generic labels (`related to`) are a strict ERROR.

## 4. Quiz Questions Validation

If the optional `quizQuestions` array is present:
- Every quiz MUST have a unique `id`.
- `nodeId`: Required. MUST exist as a node ID within the map.
- `options`: Required. Array of at least 1 string option.
- `correctAnswerIndex`: Required. Integer between 0 and `options.length - 1`.

## 5. Generation Quality (Governance Rules)

- **Source Grounding**: All map nodes, cross-links, and key facts MUST be strictly grounded in the authorized source. (Source provenance is validated via governance rules, not through mandatory JSON fields).
- **Hindi-First**: Node labels and descriptions should follow the Hindi-first study language policy unless subject exceptions apply.
- **Node Compression**: Avoid full prose paragraphs in `label`, `subtitle`, or `description`.
- **Structural Integrity**: Avoid excessive branching depth.

*Note: The canonical viewer requires only the `.mindmap.json` artifact. No local HTML generation is permitted.*
