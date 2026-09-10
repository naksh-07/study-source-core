# Tool Orchestration & Intelligence Layer

This document defines the tool selection policy for `study-source-core`. 

**CORE PRINCIPLE:** The objective is tool intelligence, not maximum tool usage. Use the environment's best available Antigravity capability for the specific source and task. Do NOT rely on obsolete "tool-agnostic" anti-patterns. Do NOT invent tool capabilities. Do NOT force expensive tools on simple tasks.

## Source / Task Matrix

| Source Type | Preferred Method | Fallback | When to Use | When to Avoid | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Normal Text (txt, md, source code)** | Direct file read / standard text extraction. | Chunked read if too large. | Always for text files. | N/A | Ensure file exists and isn't truncated. |
| **Large Markdown** | Structure discovery (grep headers) + targeted chunk reading. | Multi-agent chunk processing. | When full MD file exceeds context bounds. | Avoid reading wholesale if only one section is needed. | Check structure map against output coverage. |
| **PDFs (Native/Structured)** | Structured PDF parser (extracting text, tables, TOC natively). | Targeted retrieval / semantic search. | For all standard digital PDFs. | Do NOT OCR native PDFs. | Validate text is intelligible and not garbled. |
| **Scanned PDFs** | Check for embedded text first. If none, use Targeted OCR. | Visual inspection of specific pages. | When native text extraction fails or returns gibberish. | Avoid OCR if reliable native text exists. | Spot-check OCR output against known facts. |
| **DOCX / PPTX** | Programmatic extraction or native document reading tools. | Pandoc conversion / Markdown conversion. | Office documents. | Avoid raw XML parsing. | Ensure formatting/lists survived extraction. |
| **Spreadsheets (CSV, TSV, XLSX)** | Native CSV/Excel reading tools, structured data queries. | Direct text read for small CSVs. | Tabular data. | Avoid visual inspection of large spreadsheets. | Verify row/column headers. |
| **Images (PNG, JPEG, etc.)** | Vision models / Visual inspection capabilities. | OCR (if text-heavy). | Maps, diagrams, standalone figures. | Avoid if a structured text version exists. | Confirm key visual elements extracted. |
| **Multimodal Sources (Text + Diagrams/Tables)** | Native text extraction PLUS targeted Visual Inspection of critical figures. | OCR for the whole page. | When the Subject Skill explicitly values visual elements (e.g., Biology diagrams, Geography maps). | Do not visually inspect pages with only text. | Ensure text and visual facts align in the evidence pack. |
| **Web Pages** | Web reading tools (HTML to Markdown extraction). | Browser automation tools. | Retrieving single online articles or wikis. | Avoid web search when source-local retrieval is sufficient (SOURCE_ONLY). | Check that main content is captured, not just nav bars. |
| **Large Multi-File Source Sets** | Source inventory (list files) -> Role assignment -> Deduplication -> Targeted retrieval. | N/A | When the user provides a directory of materials. | Avoid blindly concatenating all files. | Ensure all relevant files are mapped in the Source Plan. |

## Adaptive Retrieval Policy
- **Small/simple source**: Direct targeted retrieval.
- **Medium source**: Section-aware retrieval.
- **Large source**: Structure discovery -> targeted ranges/batches.
- **Scanned source**: Text availability check -> visual/OCR fallback only where needed.
- **Multimodal source**: Text + relevant visual inspection.
- **Multi-file source**: Inventory -> classify roles -> deduplicate -> reconcile.

**RULE**: Use full-context/native retrieval when practical and safe. Use chunking when source size/complexity makes wholesale processing inefficient or unsafe. Do NOT blindly chunk everything, and do NOT force full-context processing if it exceeds practical context budgets.

## Wasteful Behaviors (STRICTLY FORBIDDEN)
- **Viewing Raw PDFs via `view_file`**: NEVER use `view_file` on PDF files. It risks dumping raw binary/base64 content into context, causing token limit crashes. Always execute `python scripts/pdf_inventory.py` for PDF intake.
- **Wholesale Reading**: Reading a giant file completely when only chapter 4 is requested.
- **Redundant Processing**: Repeated rereading of the same source for Notes, then Basic Anki, then Cloze Anki. Use a Shared Evidence Pack instead.
- **Unnecessary OCR**: OCRing a PDF that already has perfectly readable embedded text.
- **Unnecessary Vision**: Visually inspecting a page of pure text when text extraction works.
- **Unnecessary Web Search**: Performing a web search for facts when the task is explicitly `SOURCE_ONLY`.
- **Blind Validation**: Claiming an output is structurally valid by "visually inspecting" a JSON/TSV file when a programmatic validation script exists.
- **Silent Solo Execution on Multi-Domain Tasks**: Parent executing all specialist work directly when the task contains independent expert domains.

---

## Subagent & Specialist Orchestration Policy

When a task passes the Mandatory Dispatch Gate, the orchestrator MUST invoke the specialized subagents registered in `.agents/agents/`:

| Specialist Subagent | Role & Scope | Invocation Mode | Primary Deliverable |
| :--- | :--- | :--- | :--- |
| `core-notes` | Knowledge Note Architect | Mandatory for study sources | `Notes/[Chapter]_Notes.md` |
| `core-basic-anki` | Basic Flashcard Engineer | Eligible when `basic_candidate_count > 0` | `Basic/[Chapter]_Basic.tsv` |
| `core-cloze-anki` | Cloze Flashcard Engineer | Eligible when `cloze_candidate_count > 0` | `Cloze/[Chapter]_Cloze.tsv` |
| `core-image-occlusion` | Image Occlusion Specialist | Eligible when visual targets exist | `ImageOcclusion/[Chapter]_ImageOcclusion.json` |
| `core-mindmap` | MindMap Cartographer | Eligible when relational graph exists | `MindMap/[Chapter].mindmap.json` |
| `core-slide-deck` | Slide Deck Prompt Architect | Eligible when presentation justified | `SlideDeck/[Chapter]_SlideDeckPrompt.md` |
| `math-apkg-author` | Track B Mathematics Specialist | Subject === 'Math' & practice items | `PracticeQuestions.json`, `ProceduralPatterns.json`, `Math_Procedural.apkg` |
| `reasoning-apkg-author` | Track C Reasoning Specialist | Subject === 'Reasoning' & puzzles | `PracticeQuestions.json`, `ProceduralPatterns.json`, `Reasoning_Procedural.apkg` |
| `physics-numerical-apkg-author` | Track D Physics Specialist | Subject === 'Physics' & calculational items | `PracticeQuestions.json`, `ProceduralPatterns.json`, `Physics_Procedural.apkg` |
| `chemistry-numerical-apkg-author` | Track E Chemistry Specialist | Subject === 'Chemistry' & calculational/mechanisms | `PracticeQuestions.json`, `ProceduralPatterns.json`, `Chemistry_Procedural.apkg` |
| `mold-gap-auditor` | Mold & Gap Auditor | Wave 1 complex chapter / Wave 3 pre-release | `Audit/Gap_Audit_Report.md` |
| `adversarial-apkg-reviewer` | Independent Adversarial Reviewer | Wave 3 post-packaging release gate for StudyLab | `Audit/Adversarial_APKG_Audit.md` |
| `bm-graph` | Downstream Graph Specialist | Complexity-gated ($\ge 350$ words note) | Proposes vault Wikilinks & anchors |
| `bm-qa` | Semantic QA Auditor | Complexity-gated ($\ge 400$ words / $\ge 3$ artifacts) | Cross-layer semantic audit |
| `Verifier Subagent` | Independent Victory Auditor | Mandatory for high-risk / release changes | Verification report: PASS / FAIL |

### Execution Invariants:
1. **Read Parallel — Write Controlled**: Multiple specialists explore and propose in parallel; exactly ONE controlled writer commits file changes.
2. **Structured Handoff Barrier**: Parent waits for all dispatched specialist `HANDOFF REPORT` blocks before synthesizing.
3. **Aggressive Collapse**: Terminate subagents as soon as their domain scope concludes.


