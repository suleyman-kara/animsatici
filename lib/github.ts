// GitHub REST API için küçük istemci (workflow'lar ve ajan kullanır).

export type GithubClient = ReturnType<typeof githubClient>;

export const REPO_LABELS: { name: string; color: string; description: string }[] = [
  { name: "oneri", color: "0e8a16", description: "Ziyaretçi önerisi: eksik etkinlik/kaynak" },
  { name: "hata-bildirimi", color: "d93f0b", description: "Ziyaretçi bildirimi: hatalı etkinlik" },
  { name: "ajan", color: "5319e7", description: "Öneri ajanının açtığı PR" },
  { name: "insan-gerekli", color: "fbca04", description: "Ajan karar veremedi, proje sahibi bakmalı" },
  { name: "tarama-hatasi", color: "b60205", description: "Günlük tarama veya sağlık kontrolü başarısız" },
];

export function githubClient(options: { token?: string; repo?: string; fetchImpl?: typeof fetch } = {}) {
  const token = options.token ?? process.env.GITHUB_TOKEN;
  const repo = options.repo ?? process.env.GITHUB_REPOSITORY ?? process.env.GITHUB_REPO;
  if (!token || !repo) throw new Error("GITHUB_TOKEN ve GITHUB_REPOSITORY tanımlı olmalı.");
  const doFetch = options.fetchImpl ?? fetch;

  async function request<T>(method: string, path: string, body?: unknown, okStatuses: number[] = []): Promise<T> {
    const res = await doFetch(`https://api.github.com/repos/${repo}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "kampusradar",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok && !okStatuses.includes(res.status)) {
      throw new Error(`GitHub ${method} ${path}: HTTP ${res.status} ${await res.text()}`);
    }
    return (res.status === 204 ? undefined : await res.json()) as T;
  }

  return {
    repo,
    getIssue: (n: number) =>
      request<{ number: number; title: string; body: string | null; state: string; labels: { name: string }[]; html_url: string }>(
        "GET",
        `/issues/${n}`,
      ),
    listComments: (n: number) => request<{ body: string; user: { login: string } }[]>("GET", `/issues/${n}/comments?per_page=100`),
    comment: (n: number, body: string) => request("POST", `/issues/${n}/comments`, { body }),
    addLabels: (n: number, labels: string[]) => request("POST", `/issues/${n}/labels`, { labels }),
    close: (n: number, reason: "completed" | "not_planned") => request("PATCH", `/issues/${n}`, { state: "closed", state_reason: reason }),
    createPullRequest: (args: { title: string; body: string; head: string; base: string }) =>
      request<{ number: number; html_url: string }>("POST", "/pulls", args),
    async ensureLabels() {
      for (const label of REPO_LABELS) {
        await request("POST", "/labels", label, [422]); // 422 = zaten var
      }
    },
  };
}
