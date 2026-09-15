# 📝 StudySourceCore vNext: Unified Update & Optimization Plan
**Document ID**: `DOC-STUDYSOURCECORE-NEXT-UPDATE-002`  
**Status**: APPROVED & READY FOR IMPLEMENTATION  

## 1. StudyLab Pivot: Obsidian Markdown Question Banks
*Temporarily bypassing StudyLab APKG generation in favor of rich, metadata-heavy Markdown question banks for Math, Physics, Chemistry, and Reasoning.*

### 1.1 Direct Markdown Generation
- **Action**: Modify `math-apkg-author`, `reasoning-apkg-author`, `physics-numerical-apkg-author`, and `chemistry-numerical-apkg-author`.
- **Workflow**: Instruct these specialists to bypass JSON manifest and SQLite compilation completely. Instead, they will write their output directly to `Study Materials/[Subject]/[Chapter]/Questions/[Chapter]_Questions.md`.

### 1.2 Human-Readable Metadata Retention
- **Action**: Since procedural STEM questions require active method-selection and calculation (which simple flashcards fail at), the `Questions.md` file will NOT be a simple Q&A list.
- **Implementation**: The output must preserve StudyLab's rich metadata in a format highly useful for human reading. Each question block must clearly tag:
  - **Question Type**: (e.g., Direct Compute, Reverse Problem, Trap)
  - **Difficulty**: (Easy / Medium / Difficult)
  - **Expected Traps**: What a student usually does wrong here.
  - **Strategy/Method**: The 3-tier hints or breakdown.

### 1.3 The '1 Pattern ≠ 1 Question' Standard (Verified)
- **Action**: Enforce the existing canonical standard found in the Subject Skills.
- **Implementation**: A single mathematical/reasoning pattern will explicitly feature multiple nuanced problems under it. For example, a single "LCM Pattern" block in the Markdown will contain:
  - A Direct Computation problem.
  - A Reverse/Inverse problem.
  - A Boundary Case / Examiner Trap problem.

## 2. Visual Architecture: The "Drop Folder" Strategy
*Protecting the student from AI hallucinations by keeping the system strictly offline for images, while giving the user full manual control.*

### 2.1 Complete Internet Isolation
- **Action**: `core-image-occlusion` will remain exactly as-is. It is strictly banned from connecting to the internet or using generative AI. This guarantees 100% syllabus accuracy.

### 2.2 Subject-Wise Diagram Drop Folders (Human-in-the-Loop)
- **Action**: Establish a dedicated local directory structure, e.g., `Sources/Diagrams/[Subject]/`.
- **Workflow**: The user (you) takes full responsibility for identifying topics that need visuals and dropping high-quality, verified images into this folder. 
- **Agent Role**: `core-image-occlusion` will simply scan this drop folder for the current chapter and generate the required JSON manifests and SVG masks for whatever valid diagrams it finds there.

## 3. Cost & Latency Optimizations (Token Reduction)
*Inherited from previous optimization plans to make Wave 1 execution faster and cheaper.*

### 3.1 Context Caching
- **Action**: Implement native API-level context caching (e.g., Gemini Context Caching) for the Canonical Evidence Pack.
- **Impact**: All parallel Wave 1 subagents will read from a shared cached context, drastically reducing input token costs and time-to-first-token (TTFT).

### 3.2 Context & Data Shredding
- **Action**: Introduce data shredding within the Routing Engine. Visual agents receive only visual metadata; text agents receive only prose content.

### 3.3 Cheaper Models for Orchestration
- **Action**: Substitute the heavy reasoning model with a faster, more cost-effective model (e.g., Gemini 1.5 Flash) strictly for the boolean routing and planning tasks in Wave 0.

## 4. System Robustness & Professional Workarounds
*Hardening the orchestrator against race conditions and agentic drift.*

### 4.1 Dynamic Retry Budget
- **Action**: Implement a dynamic retry budget in the explicit Task Graph. Simple declarative tasks get `1` retry, while complex mathematical synthesis tasks get up to `3` retries.

### 4.2 Parent Self-Execution Mitigation
- **Action**: Physically revoke all file-generation tool permissions from the Parent Orchestrator. It can only use the `invoke_subagent` tool, physically guaranteeing the Single-Writer Rule.

### 4.3 SQLite State Machine
- **Action**: Migrate live orchestrator transitions and task tracking from flat JSON files to a lightweight SQLite database to prevent file-lock race conditions during concurrent multi-chapter processing.

### 4.4 Asynchronous Wave 2 Packaging
- **Action**: Move Wave 2 compilation (for Notes and Basic/Cloze Anki TSVs) into a safe multi-processing queue, allowing them to compile concurrently rather than sequentially.
