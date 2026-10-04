import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as cheerio from "cheerio";

// Sayfayı çekip temiz metne ve link listesine dönüştürür.

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_LINKS = 300;

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

export type PageLink = { text: string; href: string };

export type Page = {
  url: string;
  finalUrl: string;
  title: string;
  text: string;
  links: PageLink[];
  status: number;
  fetchedAt: string;
};

export class FetchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "FetchError";
  }
}

export function cleanHtml(html: string, baseUrl: string): Pick<Page, "title" | "text" | "links"> {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || $("h1").first().text().trim();

  $(
    "script, style, noscript, nav, footer, header, iframe, svg, canvas, select, option, button, form, dialog, aside, " +
      '[role="dialog"], [aria-modal="true"], .cookie-banner, #cookie-banner, .cookie-consent, #cookie-consent, ' +
      ".popup, .modal, .ad, .advertisement",
  ).remove();

  const links: PageLink[] = [];
  const seen = new Set<string>();
  $("a[href]").each((_, el) => {
    if (links.length >= MAX_LINKS) return;
    const raw = $(el).attr("href")?.trim();
    if (!raw || raw.startsWith("#") || /^(mailto|tel|javascript):/i.test(raw)) return;
    let href: string;
    try {
      href = new URL(raw, baseUrl).toString();
    } catch {
      return;
    }
    if (!/^https?:/.test(href) || seen.has(href)) return;
    seen.add(href);
    links.push({ text: $(el).text().replace(/\s+/g, " ").trim().slice(0, 120), href });
  });

  $("p, div, h1, h2, h3, h4, h5, h6, li, tr, br, section, article").each((_, el) => {
    $(el).append("\n");
  });

  const lines = ($("body").text() || $.root().text())
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter((line) => line.length > 0);
  const deduped = lines.filter((line, i) => i === 0 || line !== lines[i - 1]);

  return { title, text: deduped.join("\n"), links };
}

const PRIVATE_V4 = [/^10\./, /^127\./, /^0\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) return PRIVATE_V4.some((re) => re.test(address));
  const a = address.toLowerCase();
  return a === "::1" || a === "::" || a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe80") || a.startsWith("::ffff:");
}

/** Yalnızca herkese açık http(s) adreslerine izin verir (ajan güvenilmez URL'ler çeker). */
export async function assertPublicUrl(url: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new FetchError(`Geçersiz URL: ${url}`);
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new FetchError(`Yalnızca http/https desteklenir: ${url}`);
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new FetchError(`İç ağ adresine izin verilmiyor: ${host}`);
  }
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((r) => r.address);
  if (addresses.some(isPrivateAddress)) throw new FetchError(`İç ağ adresine izin verilmiyor: ${host}`);
  return parsed;
}

export type FetchOptions = { timeoutMs?: number; fetchImpl?: typeof fetch; checkPublic?: boolean };

export async function fetchPage(url: string, options: FetchOptions = {}): Promise<Page> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch, checkPublic = false } = options;
  const signal = AbortSignal.timeout(timeoutMs);

  // checkPublic açıkken yönlendirmeler elle izlenir ki her adım iç ağ kontrolünden geçsin.
  let current = url;
  let response: Response;
  for (let hop = 0; ; hop++) {
    if (checkPublic) await assertPublicUrl(current);
    try {
      response = await fetchImpl(current, { headers: DEFAULT_HEADERS, redirect: checkPublic ? "manual" : "follow", signal });
    } catch (err) {
      const e = err as Error;
      if (e.name === "TimeoutError") throw new FetchError(`Zaman aşımı (${timeoutMs} ms): ${url}`);
      throw new FetchError(`Ağ hatası: ${url}: ${e.message}`);
    }
    const location = response.headers.get("location");
    if (!checkPublic || response.status < 300 || response.status >= 400 || !location) break;
    if (hop >= 5) throw new FetchError(`Çok fazla yönlendirme: ${url}`, response.status);
    current = new URL(location, current).toString();
  }
  if (!response.ok) throw new FetchError(`HTTP ${response.status} ${response.statusText}: ${url}`, response.status);

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !/html|xml|text\/plain/i.test(contentType)) {
    throw new FetchError(`Desteklenmeyen içerik türü (${contentType}): ${url}`, response.status);
  }

  const finalUrl = response.url || current;
  const html = await response.text();
  return { url, finalUrl, ...cleanHtml(html, finalUrl), status: response.status, fetchedAt: new Date().toISOString() };
}
