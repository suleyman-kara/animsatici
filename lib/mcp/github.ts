// Kullanıcının açık GitHub repolarını proje listesi olarak getirir. Kullanıcı token'ı istenmez ve saklanmaz.

export const GITHUB_USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

export interface GithubProject {
  name: string;
  description: string | null;
  url: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  lastPush: string;
  archived: boolean;
}

interface RepoResponse {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
}

export class GithubUserNotFound extends Error {}

export async function fetchGithubProjects(
  username: string,
  options: { token?: string; fetchImpl?: typeof fetch } = {},
): Promise<GithubProject[]> {
  if (!GITHUB_USERNAME_RE.test(username)) throw new Error("Geçersiz GitHub kullanıcı adı.");
  const res = await (options.fetchImpl ?? fetch)(
    `https://api.github.com/users/${username}/repos?type=owner&sort=pushed&per_page=100`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "kampus30",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (res.status === 404) throw new GithubUserNotFound(`"${username}" adlı bir GitHub kullanıcısı bulunamadı.`);
  if (!res.ok) throw new Error(`GitHub şu an yanıt vermiyor (HTTP ${res.status}). Biraz sonra tekrar dene.`);

  const repos = (await res.json()) as RepoResponse[];
  return repos
    .filter((r) => !r.fork)
    .map((r) => ({
      name: r.name,
      description: r.description,
      url: r.html_url,
      homepage: r.homepage || null,
      language: r.language,
      topics: r.topics ?? [],
      stars: r.stargazers_count,
      lastPush: r.pushed_at.slice(0, 10),
      archived: r.archived,
    }))
    .sort((a, b) => b.stars - a.stars || b.lastPush.localeCompare(a.lastPush));
}
