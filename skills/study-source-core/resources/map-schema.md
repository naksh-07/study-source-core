# Mind Map Data Model & Schema Specification (`map-schema.md`)

This document defines the canonical machine-readable Data Model (`MindMapData`) for Mind Maps in `study-source-core`.

---

## 1. Core Data Model Principles

- **Canonical Format**: The output is exclusively a JSON artifact conforming to this schema.
- **Renderer-Agnostic**: The JSON is consumed by the production Cloudflare Mind Map Viewer via the Obsidian MindMap Bridge. There is NO local self-contained HTML renderer.
- **Source of Truth**: `[Chapter].mindmap.json` is the sole mapping artifact.

---

## 2. Canonical JSON Schema Structure

```json
{
  "id": "string (required)",
  "title": "string (required)",
  "subtitle": "string (optional)",
  "subject": "string (required)",
  "chapter": "string (optional)",
  "language": "string (required, e.g., 'hi', 'en', 'mixed')",
  "root": {
    "id": "string (required)",
    "label": "string (required)",
    "subtitle": "string (optional)",
    "description": "string (optional)",
    "category": "string (optional)",
    "badge": "string (optional)",
    "color": "string (optional)",
    "icon": "string (optional)",
    "tags": ["string", "optional"],
    "keyFacts": ["string", "optional"],
    "children": [
      // Recursive node structure (optional)
    ]
  },
  "crossLinks": [
    {
      "sourceId": "string (required, must match a node ID)",
      "targetId": "string (required, must match a node ID)",
      "label": "string (required)",
      "type": "string (optional, must be one of: 'relationship', 'causality', 'comparison')"
    }
  ],
  "quizQuestions": [
    {
      "id": "string (required)",
      "nodeId": "string (required, must match a node ID)",
      "nodeLabel": "string (optional)",
      "question": "string (required)",
      "options": ["string", "required (min 1)"],
      "correctAnswerIndex": "number (required)",
      "explanation": "string (optional)"
    }
  ]
}
```

---

## 3. Node ID & Cross-Reference Rules

1. Node IDs MUST be unique alphanumeric identifiers.
2. `root.children` forms the hierarchical tree.
3. `crossLinks` represent non-hierarchical semantic relationships.
4. Every crossLink must reference existing node IDs.
5. `quizQuestions.nodeId` MUST point to an existing Node ID in the tree.
