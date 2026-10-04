import type { LlmClient } from "../llm";
import { readEvents } from "../store";
import type { AgentModel, ToolResult, WebSearcher } from "./model";
import { AGENT_SYSTEM_PROMPT, buildAgentPrompt, type AgentIssue } from "./prompt";
import { runTool, TOOL_SPECS, type AgentContext, type Change, type FinishArgs } from "./tools";

export const MAX_TOOL_CALLS = 20;
export const MAX_DURATION_MS = 5 * 60 * 1000;
export const MAX_CHANGES = 5;

export type AgentOutcome = { finish: FinishArgs; changes: Change[]; toolCalls: { name: string; ok: boolean }[] };

export type RunAgentOptions = {
  issue: AgentIssue;
  model: AgentModel;
  llm: LlmClient;
  search: WebSearcher;
  root?: string;
  fetchImpl?: typeof fetch;
  now?: number;
  clock?: () => number;
  log?: (line: string) => void;
};

export async function runAgent(options: RunAgentOptions): Promise<AgentOutcome> {
  const { issue, model, llm, search, root = process.cwd(), fetchImpl, log = () => {} } = options;
  const clock = options.clock ?? Date.now;
  const now = options.now ?? clock();
  const ctx: AgentContext = {
    root,
    now,
    issueNumber: issue.number,
    llm,
    search,
    fetchImpl,
    pages: new Map(),
    extractions: new Map(),
    changes: [],
    maxChanges: MAX_CHANGES,
  };

  const reported =
    issue.payload?.type === "wrong" ? (await readEvents(root)).find((e) => e.id === (issue.payload as { eventId: string }).eventId) : undefined;
  const session = model.start({ system: AGENT_SYSTEM_PROMPT, user: buildAgentPrompt(issue, now, reported), tools: TOOL_SPECS });
  const started = clock();
  const toolCalls: AgentOutcome["toolCalls"] = [];
  let results: ToolResult[] = [];

  const stop = (diagnosis: FinishArgs["diagnosis"], comment: string): AgentOutcome => ({
    finish: { diagnosis, comment, close: "keep_open", needsHuman: true },
    changes: ctx.changes,
    toolCalls,
  });

  while (!ctx.finished) {
    if (toolCalls.length >= MAX_TOOL_CALLS || clock() - started > MAX_DURATION_MS) {
      return stop("limit_reached", "İnceleme araç/süre sınırına ulaştı; bir insanın bakması gerekiyor.");
    }
    const turn = await session.send(results);
    if (turn.calls.length === 0) {
      return stop("unclear", turn.text?.trim() || "Ajan bir sonuca varamadı; bir insanın bakması gerekiyor.");
    }
    results = [];
    for (const call of turn.calls) {
      if (ctx.finished) break;
      if (toolCalls.length >= MAX_TOOL_CALLS) break;
      const result = await runTool(call.name, call.args, ctx);
      const ok = !(result && typeof result === "object" && "error" in result);
      toolCalls.push({ name: call.name, ok });
      log(`${ok ? "→" : "✗"} ${call.name}(${JSON.stringify(call.args).slice(0, 200)})${ok ? "" : ` ${JSON.stringify(result)}`}`);
      results.push({ id: call.id, name: call.name, result });
    }
  }

  return { finish: ctx.finished, changes: ctx.changes, toolCalls };
}
