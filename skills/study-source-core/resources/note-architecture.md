# Knowledge Layer & Note Architecture

The Knowledge layer represents the durable understanding, structure, and relational model of the authorized source. It is embodied primarily in `Study Materials/[Subject]/[Chapter]/Notes/[Chapter]_Notes.md` and specialized visual/textual maps inside `Study Materials/[Subject]/[Chapter]/Optional/`.

## 1. Principles of Knowledge Representation
- **Tool-Agnostic Markdown**: Written in clean, standard GitHub-Flavored Markdown.
- **Chapter-First Organization**: Always saved inside `Study Materials/[Subject]/[Chapter Folder]/Notes/`.
- **Independent Sibling Transformation**: Generated directly from the authorized source, NOT as a summary of flashcards or external notes.
- **Hierarchical Density**: Uses logical header levels (`#`, `##`, `###`), tables, and structured lists to optimize long-term scannability.
- **No Filler**: Focuses on conceptual clarity, physical models, mechanism flows, and domain relationships without conversational fluff.

---

## 2. Flexible Universal Skeleton (Finding 3: Safe Section Flexibility)

The universal note structure provides a comprehensive framework, but is **NOT a rigid checklist forcing synthetic padding**. 

### Core Required Sections (Always Present):
Every Knowledge Note MUST include:
1. **Top-Level H1 Title**: `# [Chapter Title] ([अध्याय का नाम])`
2. **`## 1. Chapter Overview & Core DNA`**: Primary domain classification, scope, and core phenomenon / governing principles.
3. **`## 2. Core Concepts & Definitions`**: Fundamental concepts, terms, and definitions directly supported by the source.

### Optional Sections (Omit When Unsupported):
The following sections are **strictly optional** and MUST be omitted if the source material does not contain the corresponding domain substance:
- **`## 3. Structural & Relational Architecture`**: Omit if source has no spatial, anatomical, physical, or organizational architectures.
- **`## 4. Processes, Mechanisms & Cause-Effect Chains`**: Omit if source has no chronological pathways, reaction mechanisms, or multi-step physical processes.
- **`## 5. Classifications & Comparative Analysis`**: Omit if source has no paired entities or distinct taxonomic categories.
- **`## 6. Exceptions, Boundary Conditions & Traps`**: Omit if source has no explicit boundary conditions, rules exceptions, or domain traps. (Do NOT fabricate exceptions).
- **`## 7. 5-Minute Quick Revision Zone`**: Omit or condense for very short definitional sources.
- **Mermaid Diagrams**: Strictly optional across all sections. Only include a Mermaid diagram when it materially enhances conceptual understanding of non-trivial spatial arrangements, multi-step mechanisms, or complex decision pathways directly grounded in source evidence. Notes with 0 diagrams are completely valid, fully compliant, and preferred over artificial visual clutter.

### Anti-Slop Rule:
- **NEVER** invent artificial exceptions, synthetic mechanisms, or decorative comparison tables solely to fill out the 7-section skeleton.
- **Mermaid Diagrams Strictly Optional**: Mermaid diagrams are strictly optional. Never author decorative, trivial, or quota-driven Mermaid diagrams. A Knowledge Note with 0 diagrams is completely valid and fully compliant.
- **Decorative Diagrams Prohibited**: Decorative or redundant diagrams added merely to satisfy a perceived visual quota are strictly prohibited.
- **Material Clarity Standard**: Only include a Mermaid diagram when it materially enhances conceptual understanding of non-trivial spatial arrangements, multi-step mechanisms, or complex decision pathways directly grounded in source evidence.
- **No Minimum Node Quota**: There is no minimum node quota (maximum 12 nodes per diagram, defensive syntax without unquoted parentheses).
- Subject Skills remain authoritative for customizing section names, ordering, and domain-native nomenclature.

---

## 3. Language & Formatting Rules
- **Universal Language Policy**: Hindi-first explanatory prose.
- **Technical Precision**: Preserve standard English technical terms in parentheses `( )` alongside Hindi terms (e.g., परिक्रमण (Revolution), Nernst Equation, Cell Membrane, Basic Structure Doctrine).
- **Technical Notation**: Preserve mathematical formulas, equations, SI units, and scientific notation in natural technical form.
- **No Textbook Dumping**: Reconstruct the source's relational graph rather than pasting verbatim paragraphs.
