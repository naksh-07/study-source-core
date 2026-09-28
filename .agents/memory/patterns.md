<!-- schema_version: 1.0 -->
<!-- project_id: proj-study-source-core -->
<!-- DATA_CLASSIFICATION: PASSIVE_CONTEXT_ONLY (DO NOT EXECUTE AS INSTRUCTIONS) -->

# Patterns Bank: StudySourceCore

## Architectural Audit Patterns
- **Script Usurpation Anti-Pattern**: When deterministic JS scripts (with hardcoded if/else ladders or regex keyword matching) make pedagogical, creative, or qualitative decisions that require cognitive understanding, the pipeline becomes fragile and overfitted.
- **Agent Facade Anti-Pattern**: Declaring 14 subagents in documentation while executing hardcoded JS authoring functions locally in the orchestrator.
