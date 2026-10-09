// Kaynak kontrolü: sayfa açılıyor mu, robots.txt yapay zeka asistanlarına izin veriyor mu?
// Sayfa içeriği okunmaz ya da saklanmaz. Kullanım:
//   npm run check-sources                          → tüm etkin kaynaklar (sorun varsa exit 1)
//   npm run check-sources -- --url <adres>         → tek bir adres
//   npm run check-sources -- --issue-body-file <f> → öneri issue'sundaki adres
//   --out <dosya>                                  → raporu Markdown olarak dosyaya da yaz
import { promises as fs } from "node:fs";
import { isIP } from "node:net";
import { parseRobots, isAllowed, type Robots } from "../lib/robots";
import type { Source } from "../lib/schema";
import { readSources } from "../lib/sources";
import { SITE_URL } from "../lib/site";
import { parseIssueBody } from "../lib/suggestion";

export const USER_AGENT = `Kampus30Bot/3.0 (+${SITE_URL}/hakkinda)`;
/** robots.txt'de kontrol edilen yapay zeka tarayıcıları (`*` her zaman kontrol edilir). */
export const AI_AGENTS = ["ClaudeBot", "Claude-User", "GPTBot", "ChatGPT-User", "Google-Extended", "PerplexityBot"];

export interface CheckResult {
  url: string;
  sourceId?: string;
  httpStatus?: number;
  /** robots.txt okunamadıysa undefined. */
  blockedFor?: string[];
  errors: string[];
  warnings: string[];
  /** Bilgi notları: sorun sayılmaz (ör. zaten "yalnızca link" olan bir sitenin otomatik istekleri engellemesi). */
  notes: string[];
}

/** Bot korumasının ya da erişim kısıtlamasının döndürdüğü durum kodları. */
const BLOCKED_STATUSES = new Set([401, 403, 429]);

/** fetch hatasının okunabilir nedeni (undici "fetch failed" mesajının altındaki kod). */
export function describeFetchError(err: unknown): string {
  const e = err as Error & { cause?: { code?: string; message?: string } };
  if (e.name === "TimeoutError") return "zaman aşımı";
  const cause = e.cause?.code ?? e.cause?.message;
  return cause ? `${e.message}: ${cause}` : e.message;
}

/** Yerel ağ adreslerine istek atılmasını engeller (öneri formundan gelen adresler için). */
export function isPublicHttpUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  return isIP(host) === 0;
}

async function fetchRobots(url: URL, fetchImpl: typeof fetch): Promise<Robots | undefined> {
  try {
    const res = await fetchImpl(new URL("/robots.txt", url.origin), { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15_000) });
    if (res.status >= 400 && res.status < 500) return { groups: [] }; // robots.txt yok: her şeye izin
    if (!res.ok) return undefined;
    return parseRobots(await res.text());
  } catch {
    return undefined;
  }
}

export async function checkUrl(raw: string, options: { source?: Source; fetchImpl?: typeof fetch } = {}): Promise<CheckResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const result: CheckResult = { url: raw, sourceId: options.source?.id, errors: [], warnings: [], notes: [] };
  const aiFetch = options.source?.aiFetch ?? true;
  if (!isPublicHttpUrl(raw)) {
    result.errors.push("Geçerli, herkese açık bir http(s) adresi değil.");
    return result;
  }
  const url = new URL(raw);

  try {
    const res = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT }, redirect: "follow", signal: AbortSignal.timeout(20_000) });
    result.httpStatus = res.status;
    await res.body?.cancel();
    if (BLOCKED_STATUSES.has(res.status)) {
      const msg = `Site otomatik istekleri engelliyor (HTTP ${res.status}); yapay zeka asistanları da okuyamayabilir.`;
      if (aiFetch) result.warnings.push(`${msg} aiFetch false yapılmalı.`);
      else result.notes.push(msg);
    } else if (!res.ok) {
      result.errors.push(`Sayfa HTTP ${res.status} döndürüyor.`);
    }
  } catch (err) {
    const msg = `Sayfaya ulaşılamadı (${describeFetchError(err)}).`;
    // "Yalnızca link" kaynaklarda asistan sayfayı zaten okumaz; erişim kısıtı (ör. yurt dışı engeli) not olarak kalır.
    if (aiFetch) result.errors.push(msg);
    else result.notes.push(msg);
  }

  const robots = await fetchRobots(url, fetchImpl);
  if (!robots) {
    (aiFetch ? result.warnings : result.notes).push("robots.txt okunamadı.");
  } else {
    const path = url.pathname + url.search;
    result.blockedFor = ["*", ...AI_AGENTS].filter((agent) => !isAllowed(robots, agent, path));
    if (aiFetch && result.blockedFor.includes("*")) {
      result.warnings.push("robots.txt tüm tarayıcıları engelliyor; aiFetch false yapılmalı.");
    } else if (aiFetch && result.blockedFor.length) {
      result.warnings.push(`robots.txt şu yapay zeka tarayıcılarını engelliyor: ${result.blockedFor.join(", ")}. aiFetch değerini gözden geçir.`);
    }
  }
  return result;
}

export function formatReport(title: string, results: CheckResult[]): string {
  const lines = [`## ${title}`, ""];
  for (const r of results) {
    const icon = r.errors.length ? "❌" : r.warnings.length ? "⚠️" : r.notes.length ? "ℹ️" : "✅";
    const name = r.sourceId ? `\`${r.sourceId}\` ` : "";
    lines.push(`- ${icon} ${name}${r.url}${r.httpStatus ? ` (HTTP ${r.httpStatus})` : ""}`);
    for (const msg of [...r.errors, ...r.warnings, ...r.notes]) lines.push(`  - ${msg}`);
  }
  return lines.join("\n");
}

async function main(argv: string[]): Promise<number> {
  const arg = (name: string) => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };
  const out = arg("--out");
  const sources = await readSources();
  let report: string;
  let failed: boolean;

  const issueFile = arg("--issue-body-file");
  const single = arg("--url");
  if (issueFile || single) {
    let url = single;
    if (issueFile) {
      const payload = parseIssueBody(await fs.readFile(issueFile, "utf8"));
      if (payload?.type !== "source") {
        console.log("Issue gövdesinde kaynak önerisi bulunamadı; atlanıyor.");
        return 0;
      }
      url = payload.url;
    }
    const result = await checkUrl(url!);
    const existing = sources.find((s) => s.url === url || s.homepage === url);
    if (existing) result.warnings.push(`Bu adres zaten listede: \`${existing.id}\`.`);
    report = [
      formatReport("Otomatik kaynak kontrolü", [result]),
      "",
      "_Bu kontrol sayfanın açıldığına ve robots.txt kurallarına bakar; içeriği okumaz. Uygunsa kaynak `data/sources/` altına eklenir._",
    ].join("\n");
    failed = result.errors.length > 0;
  } else {
    const results: CheckResult[] = [];
    for (const source of sources.filter((s) => s.active)) {
      results.push(await checkUrl(source.url, { source }));
    }
    const problems = results.filter((r) => r.errors.length || r.warnings.length);
    const noted = results.filter((r) => !r.errors.length && !r.warnings.length && r.notes.length);
    report = formatReport(
      problems.length ? `Kaynak kontrolü: ${problems.length} kaynakta sorun var` : "Kaynak kontrolü: sorun yok",
      problems.length ? [...problems, ...noted] : results,
    );
    failed = problems.length > 0;
  }

  console.log(report);
  if (out) await fs.writeFile(out, `${report}\n`, "utf8");
  return failed ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(await main(process.argv.slice(2)));
}
