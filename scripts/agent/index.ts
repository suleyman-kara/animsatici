// Öneri ajanı. Kullanım: npm run agent -- --issue <numara> [--force]
// Ortam: GITHUB_TOKEN, GITHUB_REPOSITORY, GEMINI_API_KEY, AGENT_MODE (comment | pr; varsayılan comment)
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { runAgent, type AgentOutcome } from "../../lib/agent/loop";
import { geminiAgentModel, geminiWebSearcher } from "../../lib/agent/model";
import { AGENT_MARKER, formatComment, formatPrBody, diagnosisLabel, type PublishState } from "../../lib/agent/report";
import { githubClient } from "../../lib/github";
import { geminiClient } from "../../lib/llm";
import { LABELS, parseIssueBody } from "../../lib/suggestion";

const { values } = parseArgs({ options: { issue: { type: "string" }, force: { type: "boolean", default: false } } });
const issueNumber = Number(values.issue ?? process.env.ISSUE_NUMBER);
if (!Number.isInteger(issueNumber) || issueNumber <= 0) throw new Error("--issue <numara> gerekli");
const mode = process.env.AGENT_MODE === "pr" ? "pr" : "comment";
const baseBranch = process.env.BASE_BRANCH || process.env.GITHUB_REF_NAME || "main";

const gh = githubClient();
const issue = await gh.getIssue(issueNumber);
const labels = issue.labels.map((l) => l.name);
if (issue.state !== "open" || !labels.some((l) => l === LABELS.missing || l === LABELS.wrong)) {
  console.log(`#${issueNumber} açık bir öneri değil, atlanıyor.`);
  process.exit(0);
}
if (!values.force && (await gh.listComments(issueNumber)).some((c) => c.body.includes(AGENT_MARKER))) {
  console.log(`#${issueNumber} zaten incelenmiş, atlanıyor (yeniden incelemek için --force).`);
  process.exit(0);
}

const git = (...args: string[]) => execFileSync("git", args, { stdio: "pipe", encoding: "utf8" });
const revertData = () => {
  git("checkout", "--", "data");
  git("clean", "-fdq", "data");
};

const outcome: AgentOutcome = await runAgent({
  issue: { number: issueNumber, title: issue.title, payload: parseIssueBody(issue.body ?? ""), rawText: issue.body ?? "" },
  model: geminiAgentModel(),
  llm: geminiClient(),
  search: geminiWebSearcher(),
  log: (line) => console.log(line),
});
console.log(`Teşhis: ${outcome.finish.diagnosis}, değişiklik: ${outcome.changes.length}, mod: ${mode}`);

let state: PublishState = { kind: "none" };
if (outcome.changes.length && mode === "comment") {
  revertData();
  state = { kind: "proposed" };
} else if (outcome.changes.length) {
  try {
    execFileSync("npm", ["run", "-s", "validate"], { stdio: "pipe", encoding: "utf8" });
    execFileSync("npx", ["vitest", "run"], { stdio: "pipe", encoding: "utf8" });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    revertData();
    state = { kind: "checks_failed", error: `${e.stdout ?? ""}${e.stderr ?? ""}`.trim() || e.message };
    outcome.finish.needsHuman = true;
  }
  if (state.kind === "none") {
    const branch = `agent/issue-${issueNumber}`;
    git("checkout", "-B", branch);
    git("add", "data");
    git("-c", "user.name=github-actions[bot]", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
      "commit", "-m", `fix(data): öneri #${issueNumber} — ${diagnosisLabel(outcome.finish.diagnosis)}`);
    git("push", "--force", "origin", branch);
    const pr = await gh.createPullRequest({
      title: `[Ajan] ${diagnosisLabel(outcome.finish.diagnosis)}: ${issue.title.replace(/^\[(Öneri|Hata)\]\s*/, "")}`.slice(0, 120),
      body: formatPrBody(outcome, issueNumber),
      head: branch,
      base: baseBranch,
    });
    await gh.addLabels(pr.number, ["ajan"]);
    state = { kind: "pr", prUrl: pr.html_url };
  }
}

await gh.comment(issueNumber, formatComment(outcome, state));
if (outcome.finish.needsHuman) await gh.addLabels(issueNumber, ["insan-gerekli"]);
else if (!outcome.changes.length && outcome.finish.close !== "keep_open") await gh.close(issueNumber, outcome.finish.close);
console.log("✓ Tamamlandı");
