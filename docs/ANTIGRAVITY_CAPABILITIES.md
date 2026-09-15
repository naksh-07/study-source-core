# Antigravity Capabilities Inventory

This document serves as the canonical reference source for all available, verified capabilities within the Antigravity environment. It maps native tools, specialist subagents, Model Context Protocol (MCP) servers, domain-specific skills, and system capabilities to their intended usage, constraints, and operational phases.

---

## Table of Contents
1. [Native Built-in Tools](#1-native-built-in-tools)
2. [Specialist Subagents](#2-specialist-subagents)
3. [MCP Servers & Integrations](#3-mcp-servers--integrations)
4. [Antigravity Skills Registry](#4-antigravity-skills-registry)
5. [Built-in System & Interactive Capabilities](#5-built-in-system--interactive-capabilities)
6. [Task-Based Capability Matrix](#6-task-based-capability-matrix)

---

## 1. Native Built-in Tools

### `view_file`
* **Type**: Tool
* **Purpose**: Inspect the exact line content of text files or load binary assets (images, PDFs, audio, video).
* **When to use it**: When reading existing source code, configuration files, transcripts, or inspecting binary media assets.
* **When NOT to use it**: When searching across multiple files (use `grep_search` or `find_by_name`).
* **Important constraints**: Supports up to 800 lines or 46,080 bytes per view call. Requires 1-indexed line numbers.
* **Relevant project tasks**: Research, Implementation, Debugging, Verification.

### `write_to_file`
* **Type**: Tool
* **Purpose**: Create new files or replace whole existing files (with required `ArtifactMetadata` when writing user-facing artifacts).
* **When to use it**: When creating new source files, configuration manifests, scratch scripts, or markdown artifacts.
* **When NOT to use it**: When editing specific lines within an existing non-trivial file (use `replace_file_content`).
* **Important constraints**: Errors if file exists unless `Overwrite` is set to `true`.
* **Relevant project tasks**: Implementation, Documentation, Artifact Creation, Setup.

### `replace_file_content`
* **Type**: Tool
* **Purpose**: Make a single contiguous block replacement in an existing file.
* **When to use it**: When modifying specific contiguous lines, updating functions, or editing imports in existing files.
* **When NOT to use it**: When replacing whole files or creating new files. Cannot edit `.ipynb` notebooks directly.
* **Important constraints**: Requires exact `TargetContent` string match between `StartLine` and `EndLine`.
* **Relevant project tasks**: Implementation, Refactoring, Debugging, Bug Fixes.

### `run_command`
* **Type**: Tool
* **Purpose**: Propose and execute CLI commands in the PowerShell environment on Windows.
* **When to use it**: Running tests, builds, git commands, installing packages, launching background processes, or running local scripts.
* **When NOT to use it**: Never use `cd` commands (use `Cwd` parameter instead). Never run background `sleep` timers (use `schedule` instead).
* **Important constraints**: Requires explicit `Cwd` and `WaitMsBeforeAsync`. Async commands run in background as tasks.
* **Relevant project tasks**: Testing, Building, Verification, Environment Setup, Release.

### `manage_task`
* **Type**: Tool
* **Purpose**: Manage async background tasks launched via `run_command` or background scheduling.
* **When to use it**: Checking status (`status`), sending stdin (`send_input`), listing (`list`), or cancelling (`kill`) running background tasks.
* **When NOT to use it**: Do not poll status in a loop; the system notifies automatically on completion.
* **Important constraints**: Requires valid task ID for `status`, `kill`, and `send_input`.
* **Relevant project tasks**: Testing, Long-running Builds, Daemon Management.

### `schedule`
* **Type**: Tool
* **Purpose**: Set one-shot timers or recurring cron schedules with background notification prompts.
* **When to use it**: Setting reminders, heartbeat checks, or periodic background polling without blocking active execution.
* **When NOT to use it**: For simple inline delays or when waiting for deterministic command exit.
* **Important constraints**: Must specify exactly one of `DurationSeconds` or `CronExpression`.
* **Relevant project tasks**: Task Monitoring, Recurring Maintenance, Reminders.

### `define_subagent`
* **Type**: Tool
* **Purpose**: Dynamically define a new custom subagent type with specific roles, system prompts, and tool access.
* **When to use it**: When existing subagent roles do not cover a specialized multi-step task requirement.
* **When NOT to use it**: If a pre-defined subagent (e.g. `research`, `debugger-detective`) already exists.
* **Important constraints**: Must be invoked via `invoke_subagent` after definition. Valid for current conversation.
* **Relevant project tasks**: Custom Task Delegation, Specialized Workflows.

### `invoke_subagent`
* **Type**: Tool
* **Purpose**: Launch one or more subagents concurrently to perform dedicated sub-tasks.
* **When to use it**: Delegating broad codebase research, parallel exploration, isolated refactoring, or background drafting.
* **When NOT to use it**: For small, single-step lookups or trivial file edits.
* **Important constraints**: Supports workspace isolation modes (`inherit`, `branch`, `share`) and model selection (`inherit`, `flash_lite`, `flash`, `pro`).
* **Relevant project tasks**: Parallel Research, Architecture Planning, Code Drafting, QA.

### `manage_subagents`
* **Type**: Tool
* **Purpose**: List active direct subagents or terminate specific subagent trees.
* **When to use it**: Inspecting lifecycle state (`list`) or killing stuck/unneeded subagents (`kill`, `kill_all`).
* **When NOT to use it**: For communicating with active subagents (use `send_message`).
* **Important constraints**: Killing a subagent removes its branched workspace state.
* **Relevant project tasks**: Agent Lifecycle Management, Resource Cleanup.

### `send_message`
* **Type**: Tool
* **Purpose**: Send direct messages or instructions to running subagents using their conversation ID.
* **When to use it**: Communicating progress, sending follow-up instructions, or querying subagents.
* **When NOT to use it**: NEVER use to communicate with the end user (use visible text response).
* **Important constraints**: Requires valid recipient conversation ID.
* **Relevant project tasks**: Multi-agent Orchestration.

### `ask_question`
* **Type**: Tool
* **Purpose**: Present interactive multiple-choice question modals to the user for clarifying requirements or preferences.
* **When to use it**: Resolving ambiguous architectural choices, UX options, or user preferences.
* **When NOT to use it**: For simple yes/no questions (ask inline) or during planning mode implementation proposals.
* **Important constraints**: Blocks execution until user submits response.
* **Relevant project tasks**: Requirements Clarification, UX Alignment, Design Selection.

### `list_dir`
* **Type**: Tool
* **Purpose**: Inspect all immediate files and subdirectories within a target directory path.
* **When to use it**: Exploring directory layout, finding top-level files, checking project structure.
* **When NOT to use it**: Searching for specific file patterns recursively across deep trees (use `find_by_name`).
* **Important constraints**: Target path must be an absolute directory path.
* **Relevant project tasks**: Research, Exploration, Project Setup.

### `find_by_name`
* **Type**: Tool
* **Purpose**: Perform high-speed file and directory searches using `fd` glob pattern matching.
* **When to use it**: Locating files by extension, pattern, or filename across the workspace.
* **When NOT to use it**: Searching inside file contents (use `grep_search`).
* **Important constraints**: Output capped at 50 matches per call.
* **Relevant project tasks**: Research, File Discovery, Audit.

### `grep_search`
* **Type**: Tool
* **Purpose**: Execute high-performance text and regular expression searches across workspace files using `ripgrep`.
* **When to use it**: Locating function definitions, imports, error strings, variable usage, or code patterns.
* **When NOT to use it**: When matching structural AST patterns (use `ast-grep` MCP or skill).
* **Important constraints**: Output capped at 50 matches. Requires absolute `SearchPath`.
* **Relevant project tasks**: Research, Code Navigation, Refactoring, Debugging.

### `read_url_content`
* **Type**: Tool
* **Purpose**: Fetch public web page content via HTTP GET and convert it into clean Markdown.
* **When to use it**: Quick static web page text extraction, documentation reading, public articles.
* **When NOT to use it**: Pages requiring JavaScript rendering, interactive forms, or logins (use `firecrawl` or `playwright`).
* **Important constraints**: No JavaScript execution, no authentication headers.
* **Relevant project tasks**: Documentation Research, Web Content Retrieval.

### `search_web`
* **Type**: Tool
* **Purpose**: Perform web search queries and retrieve concise summaries with source URL citations.
* **When to use it**: Fast technical searches, looking up library documentation, checking error messages.
* **When NOT to use it**: When comprehensive site crawling or structured schema extraction is needed (use `firecrawl` or `tavily`).
* **Important constraints**: Returns text summary and citations.
* **Relevant project tasks**: Technical Research, Information Retrieval.

### `generate_image`
* **Type**: Tool
* **Purpose**: Generate synthetic images or edit existing image assets based on text prompts.
* **When to use it**: UI mockup visual generation, asset creation, visual design iteration.
* **When NOT to use it**: Generating code, diagrams (use Mermaid in artifacts instead), or plain text.
* **Important constraints**: Max 3 reference image inputs. Supports specific aspect ratios (`1:1`, `16:9`, `4:3`, etc.).
* **Relevant project tasks**: UI/UX Design, Visual Asset Scaffolding.

### `call_mcp_tool`
* **Type**: Tool
* **Purpose**: Execute lazily-loaded MCP tools registered from configured MCP servers.
* **When to use it**: Invoking any specialized lazily-loaded tool from active MCP servers (e.g. `ast-grep`, `cloudflare`, `arxiv`, etc.).
* **When NOT to use it**: For eager native tools.
* **Important constraints**: Requires exact `ServerName`, `ToolName`, and schema-compliant `Arguments`.
* **Relevant project tasks**: Specialized Integrations, Deep Operations.

### `list_resources` & `read_resource`
* **Type**: Tool
* **Purpose**: Discover and retrieve content from MCP resources exposed by MCP servers.
* **When to use it**: Reading static or dynamic resource streams exposed by context/database MCP servers.
* **When NOT to use it**: Reading local workspace disk files directly (use `view_file`).
* **Important constraints**: Requires valid server name and resource URI.
* **Relevant project tasks**: Resource Inspection, Telemetry, Context Loading.

---

## 2. Specialist Subagents

### `self`
* **Type**: Agent
* **Purpose**: Cloned subagent inheriting parent configuration, system prompt, and tools.
* **When to use it**: Running heavy sub-tasks in an isolated conversation context with identical capabilities.
* **When NOT to use it**: When a lightweight or restricted role subagent (e.g. read-only `research`) is sufficient.
* **Important constraints**: Uses parent execution context.
* **Relevant project tasks**: General Task Offloading, Isolated Execution.

### `research`
* **Type**: Agent
* **Purpose**: Read-only research specialist for code exploration, web searching, and documentation analysis.
* **When to use it**: Broad codebase surveys, documentation lookups, dependency research without risking state changes.
* **When NOT to use it**: When code edits or shell execution commands are required.
* **Important constraints**: Equipped strictly with read-only tools.
* **Relevant project tasks**: Codebase Audit, Web Research, Tech Spikes.

### `architect-planner`
* **Type**: Agent
* **Purpose**: High-level systems architect for system design, database schemas, ADRs, and structural planning.
* **When to use it**: Designing complex subsystems, refactoring core domain models, evaluating technical debt.
* **When NOT to use it**: Routine line edits, minor syntax fixes, or simple test writing.
* **Important constraints**: Focuses on high-level system coherence and design specifications.
* **Relevant project tasks**: Architecture Design, Planning, Database Modeling.

### `cerebras-drafter`
* **Type**: Agent
* **Purpose**: Ultra-high-velocity multi-file code drafter powered by Cerebras wafer-scale engine.
* **When to use it**: Scaffolding new boilerplate repositories, multi-file module generation, bulk stub creation.
* **When NOT to use it**: Precision debugging, fine-grained refactoring, or AST-based fixes.
* **Important constraints**: Generates draft code rapidly; requires downstream validation by parent agent.
* **Relevant project tasks**: Project Scaffolding, Draft Generation, Boilerplate Scaffolding.

### `code-janitor`
* **Type**: Agent
* **Purpose**: Refactoring specialist focusing on code hygiene, dead code removal, typing, and formatting.
* **When to use it**: Cleaning unused imports, formatting code bases, adding typing annotations, resolving linter warnings.
* **When NOT to use it**: Changing functional domain logic or fixing active runtime crashes.
* **Important constraints**: Must preserve functional logic while cleaning up code structure.
* **Relevant project tasks**: Code Hygiene, Linting, Refactoring, Cleanup.

### `debugger-detective`
* **Type**: Agent
* **Purpose**: Forensic root-cause investigator for runtime crashes, memory leaks, and failing test suites.
* **When to use it**: Investigating complex stack traces, unhandled exceptions, race conditions, memory issues.
* **When NOT to use it**: Proactive refactoring or feature additions without active bugs.
* **Important constraints**: Relies strictly on empirical log evidence and tracebacks.
* **Relevant project tasks**: Root Cause Analysis, Debugging, Bug Fixing.

### `personal-os-nightly-normalizer`
* **Type**: Agent
* **Purpose**: Autonomous reconciliation agent for Personal AI Study OS telemetry and Notion journal synchronization.
* **When to use it**: Reconciling Notion journal entries with D1 telemetry state.
* **When NOT to use it**: General application development or non-OS study tasks.
* **Important constraints**: Specific to Personal AI Study OS domain.
* **Relevant project tasks**: System State Reconciliation, Data Synchronization.

### `security-auditor`
* **Type**: Agent
* **Purpose**: Application security specialist for vulnerability audits, secret scans, and OWASP compliance.
* **When to use it**: Auditing security posture, evaluating auth flows, scanning for leaked keys, reviewing API boundaries.
* **When NOT to use it**: General UI design or functional unit testing.
* **Important constraints**: Focuses on security risk vectors, data leakage, and access enforcement.
* **Relevant project tasks**: Security Review, Vulnerability Assessment, Secret Audits.

### `tech-writer`
* **Type**: Agent
* **Purpose**: Technical documentation specialist for READMEs, API docs, architecture specs, and inline docstrings.
* **When to use it**: Creating clean documentation, developer guides, API specifications, release notes.
* **When NOT to use it**: Writing unit tests or modifying core executable algorithms.
* **Important constraints**: Authoring documentation with clear Markdown structure.
* **Relevant project tasks**: Documentation, API Spec Writing, Walkthrough Synthesis.

### `test-engineer`
* **Type**: Agent
* **Purpose**: QA and test automation specialist for unit, integration, E2E, and property-based test suites.
* **When to use it**: Writing unit tests, expanding code coverage, authoring Playwright E2E suites, creating test fixtures.
* **When NOT to use it**: Production application code feature implementation.
* **Important constraints**: Ensures test coverage without masking underlying production code bugs.
* **Relevant project tasks**: Unit Testing, Integration Testing, E2E Test Authoring, QA.

---

## 3. MCP Servers & Integrations

| Server Name | Primary Capabilities / Tools | Best Suited For | Key Constraints |
| :--- | :--- | :--- | :--- |
| `ast-grep` | `ast_grep_search`, `ast_grep_scan`, `ast_grep_test` | AST-based structural code pattern searching & refactoring | Requires structural pattern syntax |
| `arxiv` | `search_papers`, `download_paper`, `read_paper_section` | Academic paper research, citations, LaTeX section reading | Research domain specific |
| `cerebras` | `cerebras_draft_files`, `cerebras_fast_query` | Wafer-scale ultra-fast code drafting and querying | Draft output requires parent verification |
| `chrome-devtools-mcp` | `click`, `evaluate_script`, `take_screenshot`, `lighthouse_audit` | Browser automation, visual inspection, performance & CWV audits | Requires running browser target |
| `cloudflare` | `kv_*`, `d1_*`, `r2_*`, `worker_*`, `ai_*`, `do_*` | Serverless Cloudflare infrastructure management & execution | Bound to Cloudflare ecosystem APIs |
| `context7` | `resolve-library-id`, `query-docs` | Up-to-date documentation search for external APIs/libraries | Solves library version discrepancies |
| `desktop-webview-reviewer` | `desktop_launch`, `desktop_inspect`, `desktop_assert` | Desktop app & embedded webview inspection & evidence collection | Windows desktop environment specific |
| `dropbox` | `get_file_content`, `create_shared_link`, `list_folder` | Cloud document & storage asset synchronization | Requires active API access |
| `elevenlabs` | `text_to_speech`, `speech_to_text`, `voice_clone`, `compose_music` | Speech synthesis, audio processing, sound effect generation | Audio synthesis domain specific |
| `firecrawl` | `firecrawl_scrape`, `firecrawl_crawl`, `firecrawl_search`, `firecrawl_agent` | Web scraping, JavaScript-rendered page extraction, crawling | Web scraping domain specific |
| `git` | `git_status`, `git_diff`, `git_commit`, `git_checkout`, `git_log` | Version control state inspection, branching, committing | Operates on local repository git state |
| `github-mcp-server` | `create_pull_request`, `issue_write`, `list_issues`, `search_code` | Remote GitHub platform operations (PRs, issues, code search) | Requires GitHub API token/permissions |
| `google-jules` | `jules_create_session`, `jules_approve_plan`, `jules_send_message` | Asynchronous cloud coding task orchestration via Jules | Remote cloud VM execution model |
| `google-workspace` | `manage_docs`, `manage_drive`, `manage_calendar`, `manage_sheets` | Google Workspace productivity document and calendar management | Requires Workspace authentication |
| `memory` | `create_entities`, `create_relations`, `read_graph`, `search_nodes` | Persistent knowledge graph memory storage & retrieval | Internal graph memory structure |
| `notion-mcp-server` | `API-retrieve-a-page`, `API-patch-block-children`, `API-post-page` | Notion workspace documentation, databases, and page sync | Bound to Notion API schema |
| `personal-study-os` | `get_study_state`, `record_schedule_decision` | Personal AI Study OS telemetry and schedule management | Domain-specific to Study OS |
| `playwright` & `playwright-mcp-server` | `playwright_navigate`, `playwright_click`, `playwright_fill`, `playwright_screenshot` | Cross-browser automated testing, visual regression, form filling | Requires browser runner |
| `postman-mcp-server` | `runCollection`, `syncCollectionWithSpec`, `getCollections` | API testing, OpenAPI specification synchronization, collection execution | API domain specific |
| `sequential-thinking` | `sequentialthinking` | Dynamic step-by-step problem decomposition & hypothesis refinement | Pure reasoning framework |
| `sqlite` | `read-query`, `write-query`, `create-table`, `describe-table` | Direct SQLite database inspection, querying, schema management | Local SQLite file database |
| `stitch` | `stitch_generate_screen`, `stitch_create_design_system`, `stitch_sync_screen` | Google Stitch design system generation and component syncing | Design system domain specific |
| `tavily` | `tavily_search`, `tavily_extract`, `tavily_crawl` | High-accuracy web research and content extraction | Search engine integration |

---

## 4. Antigravity Skills Registry

### Core Orchestration & Development Skills
* **`adaptive-orchestrator`**: Resource-aware subagent team orchestration (max 4 concurrent, max 10 total). Use for multi-agent workflows.
* **`antigravity-guide`**: Comprehensive reference for Antigravity IDE, CLI (`agy`), slash commands, and customizations.
* **`agy-customizations`**: Guide for authoring skills, rules, MCP servers, and hooks within Antigravity.
* **`deepsearch`**: Evidence-grounded web research engine with claim-evidence ledgering and credibility scoring.
* **`docker-ops`**: Dockerfile best practices, multi-stage builds, and Docker Compose configurations.
* **`github-workflow`**: GitHub PR management, code reviews, issue triaging, and release flows.
* **`managing-python-dependencies`**: Virtualenv, dependency lockfiles, and environment-isolated Python package management.
* **`mcp-ops`**: Model Context Protocol server creation, tool schema design, and transport setup.
* **`migrate-workflows`**: Automated migration of legacy workflow scripts to modern `SKILL.md` definitions.
* **`skill-repair`**: Troubleshooting and repairing failed skill installations or `manifest.json` errors.
* **`structural-search`**: AST-based code pattern matching and structural refactoring using `ast-grep`.

### Frontend, Web & Design Skills
* **`a11y-debugging`**: Web accessibility auditing (ARIA, keyboard nav, contrast) via DevTools.
* **`chrome-devtools`**: Browser debugging, network analysis, performance profiling via Chrome DevTools MCP.
* **`chrome-extensions`**: Manifest V3 Chrome Extension development, background workers, and content scripts.
* **`debug-optimize-lcp`**: Largest Contentful Paint and Core Web Vitals optimization.
* **`desktop-webview-reviewer`**: Hybrid native desktop and webview inspection and evidence gathering.
* **`generative_ui`**: Rendering rich inline HTML/CSS/JS widgets and interactive visual panels in chat.
* **`memory-leak-debugging`**: Diagnostic HeapSnapshot and memory leak analysis for Node.js / JS apps.
* **`modern-web-guidance`**: Modern HTML/CSS/JS standards (Container queries, View Transitions, `:has()`).
* **`playwright-skill`**: End-to-end browser automation, UX verification, visual screenshots.
* **`stitch-*` (`stitch-design-md`, `stitch-enhance-prompt`, `stitch-react-components`, `stitch-shadcn-ui`, `stitch-taste-design`)**: Google Stitch UI design system synthesis, prompt enhancement, and React/shadcn component generation.
* **`troubleshooting`**: Diagnosing and fixing Chrome DevTools connection issues.

### Cloudflare & Serverless Ecosystem Skills
* **`cloudflare`**: Product selection and architecture for Cloudflare Workers, KV, D1, R2, Queues.
* **`cloudflare-agents-sdk`**: Building stateful agentic applications on Cloudflare Workers.
* **`cloudflare-durable-objects`**: Stateful distributed actor coordination via Durable Objects.
* **`cloudflare-workers-best-practices`**: Production-grade Worker performance, security, and edge routing.
* **`cloudflare-wrangler`**: Wrangler CLI configuration, deployment, and local preview execution.

### Data Engineering & GCP Skills
* **`accidental-data-loss-prevention`**: Safety verification before destructive SQL (`DROP`, `TRUNCATE`) or Cloud storage deletion.
* **`bigquery-*` (`bigquery-sql`, `bigquery-ai-ml`, `bigquery-bigframes`, `bigquery-data-transfer-service`, `bigquery-graph`)**: Query optimization, BQML forecasting, BigFrames Python dataframes, and Graph queries.
* **`building-data-apps`**: Interactive React/Streamlit data dashboards backed by BigQuery data assets.
* **`data-autocleaning`**: Automated data quality checks, schema mapping, and transformations.
* **`dataform-bigquery`**: SQLX Dataform transformation pipeline development for BigQuery ELT.
* **`dbt-bigquery`**: Authoring, testing, and optimizing dbt data models targeting BigQuery.
* **`discovering-gcp-data-assets`**: Locating datasets, tables, and governance metadata across GCP.
* **`enforcing-resource-attribution`**: Mandatory billing labeling for GCP CLI (`bq`, `gcloud`) execution.
* **`federate-lakehouse-catalog`**: Federating remote Iceberg/Unity/Glue catalogs into BigQuery.
* **`gcloud-auth-verification`**: Resolving GCP Application Default Credentials and authentication errors.
* **`gcp-data-pipelines` & `gcp-pipeline-*`**: End-to-end GCP pipeline orchestration, Dataflow, Dataproc, Composer, and resource provisioning.
* **`gcp-spark`**: PySpark/Spark execution on Dataproc Serverless and Clusters.
* **`gcs-security-assessment` & `google-cloud-storage-basics`**: GCS security scanning, bucket lifecycle management, and IAM policies.
* **`ml-best-practices`**: Data modeling, regression, classification, and statistical testing methodologies.
* **`notebook-guidance`**: Jupyter notebook structuring, BigQuery `%%bqsql` magics, and analytical workflows.
* **`sqlite-ops`**: SQLite performance, index tuning (`EXPLAIN QUERY PLAN`), strict schemas, and Cloudflare D1 optimization.

### API & Third-Party Integration Skills
* **`elevenlabs`**: Text-to-speech, sound effects, voice cloning, and audio isolation pipelines.
* **`firecrawl-*` (`firecrawl`, `firecrawl-agent`, `firecrawl-crawl`, `firecrawl-scrape`)**: High-throughput web scraping, multi-page structured JSON extraction, site crawling.
* **`google-jules`**: Cloud coding agent orchestration via Google Jules VM infrastructure.
* **`notion`**: Notion API integration, page markdown syncing, and database querying.
* **`postman` & `postman-api-readiness`**: API spec sync, collection execution, mock servers, and AI agent API readiness scoring (0-100).
* **`personal-os-*`**: Operational diagnostics and nightly normalization for Personal AI Study OS.

---

## 5. Built-in System & Interactive Capabilities

### Interactive Artifacts System
* **Type**: System Capability
* **Purpose**: Rich markdown documents created in `<appDataDir>/brain/<conversation-id>/` for presentation to the user.
* **Supported Elements**:
  * **GitHub Alerts**: `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`
  * **Mermaid Diagrams**: Fenced `mermaid` blocks for visual system flowcharts, architecture diagrams, and sequence flows.
  * **Carousels**: Sequential multi-slide markdown presentations using ````carousel` blocks separated by `<!-- slide -->`.
  * **LaTeX / Math**: KaTeX rendering for inline (`\$...\$`) and block (`$$...$$`) mathematical formulas.
  * **File Links**: Direct file linking with line numbers (`[filename](file:///absolute/path#L10-L20)`).
* **When to use**: Implementation plans, system architectural design documents, comprehensive audit reports, walkthroughs.
* **When NOT to use**: Trivial one-word answers or simple standard conversation responses.

### Async Background Task & Scheduling System
* **Type**: System Capability
* **Purpose**: Background command execution (`run_command`), task management (`manage_task`), and time-based notifications (`schedule`).
* **Operational Flow**:
  1. Launch background tasks or set timers.
  2. Continue parallel work or end turn cleanly.
  3. System automatically resumes execution when background tasks complete or send notifications (no polling needed).

### Interactive Question Modals (`ask_question`)
* **Type**: System Capability
* **Purpose**: Renders interactive selection modals for user input.
* **When to use**: Soliciting user preferences on architectural choices, feature tradeoffs, or UI layouts.

### Visual Asset Generation (`generate_image`)
* **Type**: System Capability
* **Purpose**: Text-to-image synthesis and visual mockups.
* **Output Path**: Saved directly into conversation artifact directory.

### Slash Commands Shortcuts
* `/goal`: Trigger autonomous long-running execution until full objective resolution.
* `/schedule`: Interface for configuring cron or timer schedules.
* `/browser`: Initiate browser automation and web investigation workflows.
* `/grill-me`: Interactive alignment interview to resolve underspecified design details.
* `/teamwork-preview`: Launch multi-agent swarm orchestration.
* `/learn`: Persist user corrections or custom operational patterns as skills.
* `/boost`: Enable deep multi-perspective planning and verification.

---

## 6. Task-Based Capability Matrix

The table below maps software development phases to the most appropriate Antigravity tools, agents, MCPs, and skills:

| Phase | Native Tools | Subagents | Key MCP Servers | Key Antigravity Skills |
| :--- | :--- | :--- | :--- | :--- |
| **Research & Exploration** | `grep_search`, `find_by_name`, `list_dir`, `view_file`, `search_web`, `read_url_content` | `research`, `architect-planner` | `context7`, `tavily`, `arxiv`, `memory` | `deepsearch`, `discovering-gcp-data-assets`, `modern-web-guidance` |
| **Implementation & Scaffolding** | `write_to_file`, `replace_file_content`, `run_command` | `cerebras-drafter`, `self` | `cerebras`, `ast-grep`, `cloudflare`, `stitch` | `modern-web-guidance`, `stitch-react-components`, `managing-python-dependencies` |
| **Testing & QA** | `run_command`, `manage_task` | `test-engineer` | `playwright`, `postman-mcp-server` | `playwright-skill`, `postman-api-readiness`, `a11y-debugging` |
| **Debugging & Diagnostics** | `grep_search`, `view_file`, `run_command` | `debugger-detective` | `chrome-devtools-mcp`, `desktop-webview-reviewer` | `chrome-devtools`, `memory-leak-debugging`, `gcp-composer-troubleshooting` |
| **Verification & Security** | `run_command` (tests/builds), `view_file` | `security-auditor` | `ast-grep`, `chrome-devtools-mcp` | `accidental-data-loss-prevention`, `gcs-security-assessment`, `debug-optimize-lcp` |
| **Refactoring & Maintenance** | `replace_file_content`, `grep_search` | `code-janitor` | `ast-grep`, `sqlite` | `structural-search`, `sqlite-ops`, `cloudflare-workers-best-practices` |
| **Release & Documentation** | `write_to_file` (Artifacts) | `tech-writer` | `github-mcp-server`, `notion-mcp-server` | `github-workflow`, `notion`, `generative_ui` |

---

> **Note for Future Prompts**: Always refer to the exact capability names and types defined in this document when composing autonomous orchestration prompts or delegating sub-tasks.
