# Large Source Orchestration

This document defines practical execution rules for processing large, complex study sources. 
DO NOT arbitrarily load massive sources into a single context. Follow these structured ingestion and processing rules to preserve agent reliability and complete coverage.

## Complexity Classification

Before processing, classify the source into one of the following complexities based on the source inventory:
- **SMALL**: Simple text, small context window footprint. Can be processed directly.
- **MEDIUM**: E.g., short chapters, medium PDFs. Requires section/chapter-based targeted retrieval.
- **LARGE**: E.g., full books, large manuals. Requires metadata analysis, structure discovery, batching, and coverage tracking.
- **MULTIMODAL**: Contains critical visual information (maps, diagrams) requiring visual inspection.
- **SCANNED**: Requires OCR fallback.
- **MULTI-FILE**: Requires deduplication and role assignment.
- **DIFFICULT / PARTIAL**: Corrupted files or incomplete extractions. Requires targeted recovery.

## Large Source Strategy

For sources classified as **LARGE** or **VERY LARGE**:

1. **Do NOT load the entire source into a single context dump.**
2. **Metadata & Structure Discovery**: 
   - First, extract the Table of Contents (TOC) or structural outline.
   - Use this outline to create a Source Plan and determine relevant ranges.
3. **Relevant Range Retrieval**:
   - Only retrieve sections or chapters that are relevant to the user's specific request.
   - If the request requires full coverage, chunk the extraction into batches based on logical boundaries (e.g., by chapter or subsection).
4. **Deterministic Processing State & Coverage Rules**:
   - Maintain a lightweight machine-readable JSON state file (e.g., `scratch/execution-state.json`).
   - The state tracks each section's status as `complete`, `pending`, or `failed`.
   - Never claim COMPLETE coverage if meaningful sections failed.
   - Coverage status must be distinguished as **COMPLETE**, **PARTIAL**, **FAILED**, or **NOT_PROCESSED** based on the execution state file, not LLM memory.
5. **Incremental Synthesis**:
   - Extract knowledge batch-by-batch into intermediate artifacts or a shared evidence pack.
   - Do not attempt to synthesize thousands of pages simultaneously.
6. **Resumability**:
   - Persist intermediate state so that if processing is interrupted, you can resume from the last completed batch without restarting globally.
7. **Final Completeness Audit**:
   - Ensure all requested batches have been processed and merged into the final artifact without silent truncation.

## Staged Artifact Generation

When the output itself is extremely large (e.g., thousands of Anki cards, massive MindMaps):
- Generate the output in staged chunks.
- Physically validate each chunk BEFORE merging it into the final file.
- After merging, perform a final integrity check (e.g., verifying expected counts, checking for malformed syntax, deduplicating IDs).
