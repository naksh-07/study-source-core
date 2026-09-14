# STUDYSOURCECORE — RUNTIME DISPATCH FORENSIC AUDIT

## 1. Expected Architecture
The documentation (`SKILL.md`, `resources/workflow.md`) claims a multi-agent orchestration architecture. The `StudySourceCore` orchestrator is supposed to ingest an evidence pack, determine eligibility via `scripts/routing_engine.js`, and natively dispatch specialized subagents (e.g., `math-apkg-author`, `core-notes`, `core-basic-anki`) using the `invoke_subagent` tool.

## 2. Actual Architecture
The actual architecture is entirely **prompt-driven**. There is no executable orchestration code (e.g., no Node.js script or shell script) that automatically makes an `invoke_subagent` tool call. The execution relies completely on the parent LLM reading the Markdown instructions, evaluating the routing script, and voluntarily choosing to emit an `invoke_subagent` tool call.

## 3. Exact Runtime Call Chain
1. User activates `study-source-core` via slash command or skill selection.
2. Parent model reads `SKILL.md` and `resources/workflow.md`.
3. Parent model extracts evidence into `scratch/evidence-pack.md`.
4. Parent model attempts Phase 4.5: Evaluate artifact eligibility via `scripts/routing_engine.js`.
5. **FAILURE POINT**: The parent model runs `node scripts/routing_engine.js` and receives **0 bytes of output** because the script has no CLI entry point and does not print to stdout.
6. **SILENT ABSORPTION**: Lacking a definitive affirmative signal from the routing script, and strongly biased by LLM training to answer queries directly, the parent model either assumes 0 eligible artifacts or executes the content generation itself (self-execution), skipping the `invoke_subagent` call entirely.

## 4. Actual Agent Discovery Mechanism
Agents are registered globally within the Antigravity system (they appear in the `<subagents>` block of the agent's system prompt). Therefore, the subagents are fully discoverable and invokable by the runtime. The issue is not that the agents are invisible; the issue is that the parent model never pulls the trigger to invoke them.

## 5. Actual Invocation Mechanism
The native `invoke_subagent` tool IS available to the parent model. However, because it must be invoked voluntarily by the LLM based on textual instructions, it is highly brittle and often ignored in favor of self-execution.

## 6. Why Subagents = 0
The UI counter reads "Subagents: 0" because the parent model did not emit a single `invoke_subagent` tool call. The primary trigger for this failure is the silent output of `routing_engine.js`, which deprives the model of the deterministic signal it needs to justify delegation.

## 7. Routing vs Invocation Distinction
- **Routing Gate**: `scripts/routing_engine.js` accurately contains the logic to return `proceduralApkg: true`.
- **Invocation**: The logic is trapped inside the CommonJS module. It never translates into an actual `invoke_subagent` tool call because there is no mechanism to bridge the JS evaluation result back to the LLM orchestrator in a machine-readable format.

## 8. Documentation vs Executable Behavior
| Claimed Behavior | Actual Implementation | Actually Executed |
| :--- | :--- | :--- |
| "The orchestrator outputs the WORKFORCE PLAN and evaluates artifact eligibility via scripts/routing_engine.js" | `routing_engine.js` is a CommonJS module with no CLI entry point. Output is null. | Parent model gets blank output and assumes no eligible artifacts, or guesses the logic manually. |
| "StudySourceCore MUST natively invoke the appropriate StudyLab specialist subagent via invoke_subagent" | This is just text in `SKILL.md`. No code forces this behavior. | Parent model ignores the instruction and self-executes or skips generation. |

## 9. Agent Discovery Table

| AGENT NAME | FILE PATH | DISCOVERABLE BY RUNTIME? | INVOKABLE BY NATIVE MECHANISM? | REFERENCED BY CORE? | ACTUALLY CALLED? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `core-notes` | `.agents/agents/core-notes.md` | YES | YES | YES | NO |
| `core-basic-anki` | `.agents/agents/core-basic-anki.md` | YES | YES | YES | NO |
| `core-cloze-anki` | `.agents/agents/core-cloze-anki.md` | YES | YES | YES | NO |
| `core-image-occlusion` | `.agents/agents/core-image-occlusion.md` | YES | YES | YES | NO |
| `core-mindmap` | `.agents/agents/core-mindmap.md` | YES | YES | YES | NO |
| `core-slide-deck` | `.agents/agents/core-slide-deck.md` | YES | YES | YES | NO |
| `math-apkg-author` | `.agents/agents/math-apkg-author.md` | YES | YES | YES | NO |
| `reasoning-apkg-author` | `.agents/agents/reasoning-apkg-author.md` | YES | YES | YES | NO |
| `physics-numerical-apkg-author` | `.agents/agents/physics-numerical-apkg-author.md` | YES | YES | YES | NO |
| `chemistry-numerical-apkg-author` | `.agents/agents/chemistry-numerical-apkg-author.md` | YES | YES | YES | NO |
| `mold-gap-auditor` | `.agents/agents/mold-gap-auditor.md` | YES | YES | YES | NO |
| `adversarial-apkg-reviewer` | `.agents/agents/adversarial-apkg-reviewer.md` | YES | YES | YES | NO |

## 10. StudyLab Dispatch Trace
- **StudySourceCore** is activated.
- Evaluates **StudyLab eligibility** using `routing_engine.js`.
- Output is blank (CLI missing).
- Parent model fails to emit `invoke_subagent(TypeName="math-apkg-author")`.
- Path breaks here. The same trace failure applies to Reasoning, Physics Numerical, and Chemistry Numerical.

## 11. Duplicate-Work Risks
If `invoke_subagent` is successfully forced, there is a high risk of duplicate work unless the parent model is explicitly barred from generating content itself. The parent model may spawn the subagent but also write `[Chapter]_Notes.md` itself, leading to overlapping writes and merge conflicts.

## 12. Minimal Fix Options
1. **CLI Wrapper**: Add a `console.log(JSON.stringify(evaluateArtifactRouting(context)))` CLI entry point to `routing_engine.js` so the parent model gets a clear, unambiguous JSON signal of which agents to invoke.
2. **Explicit Tool Instruction**: Add a section to `workflow.md` explicitly providing the CLI command (e.g., `node scripts/run_routing.js <metadata.json>`) and forcing the model to halt if the output is not valid JSON.

## 13. Recommended Fix
Create a lightweight wrapper script (e.g., `scripts/cli_router.js`) that takes JSON arguments, executes `routing_engine.js`, and prints the boolean artifact flags to stdout. Update `workflow.md` to mandate running this CLI script and executing EXACTLY the `invoke_subagent` calls mapped to the `true` flags.
