import { nowIso } from "../dates";
import type { LlmClient } from "../llm";
import type { Event, Source } from "../schema";
import { titleSimilarity } from "./dedupe";
import { extractEvents, type ExtractedEvent } from "./extract";
import { fetchPage, type FetchOptions, type Page } from "./fetch";
import { mapPool } from "./pool";
import { verifyEvents, type Rejection } from "./verify";

// Liste sayfasında tarihi/yılı yazmayan etkinlikler için etkinliğin kendi sayfasına bakılır.

export const MAX_DETAIL_PAGES_PER_SOURCE = 30;
export const DETAIL_CONCURRENCY = 4;
/** Etkinlik çıkmayan detay sayfası bu süre boyunca tekrar açılmaz (Gemini maliyeti). */
export const DEAD_DETAIL_TTL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const KNOWN_TITLE_SIMILARITY = 0.8;
const MIN_TITLE_SIMILARITY = 0.4;

/** Sonuçsuz detay sayfaları: URL → en son sonuçsuz çıktığı an. */
export type DeadDetails = Record<string, string>;

export type DetailInput = {
  rejected: Rejection[];
  llm: LlmClient;
  source: Pick<Source, "id" | "title" | "category">;
  knownEvents?: Pick<Event, "id" | "title" | "startDate" | "deadline">[];
  now: number;
  fetchImpl?: FetchOptions["fetchImpl"];
  limit?: number;
  deadDetails?: DeadDetails;
};

export type DetailResult = {
  accepted: ExtractedEvent[];
  rejected: Rejection[];
  pagesFetched: number;
  skippedKnown: number;
  skippedDead: number;
  /** Gemini hatası yüzünden işlenemeyen sayfa sayısı; sıfırdan büyükse kaynak bir sonraki taramada yeniden işlenmeli. */
  failed: number;
  /** Bir sonraki taramaya aktarılacak, süresi dolmamış sonuçsuz sayfalar. */
  deadDetails: DeadDetails;
};

type Task = { rest: Omit<Rejection, "detailUrl">; url: string };
type Outcome = { accepted?: ExtractedEvent; rejection?: Rejection; dead: boolean; retry?: boolean };

export async function followDetailPages(input: DetailInput): Promise<DetailResult> {
  const { llm, source, knownEvents, now, fetchImpl, limit = MAX_DETAIL_PAGES_PER_SOURCE } = input;
  const dead: DeadDetails = Object.fromEntries(
    Object.entries(input.deadDetails ?? {}).filter(([, at]) => now - Date.parse(at) < DEAD_DETAIL_TTL_DAYS * DAY_MS),
  );
  const result: DetailResult = { accepted: [], rejected: [], pagesFetched: 0, skippedKnown: 0, skippedDead: 0, failed: 0, deadDetails: dead };
  const seenUrls = new Set<string>();
  const tasks: Task[] = [];

  // Önce hangi sayfaların açılacağına karar verilir; sınır ve önbellek burada uygulanır.
  for (const rejection of input.rejected) {
    const { detailUrl, ...rest } = rejection;
    if (!detailUrl || seenUrls.has(detailUrl)) {
      result.rejected.push(rest);
      continue;
    }
    // Bu kaynaktan zaten bilinen (tarihleri kayıtlı) etkinlik için detay sayfası tekrar çekilmez.
    if (knownEvents?.some((k) => titleSimilarity(k.title, rest.title) >= KNOWN_TITLE_SIMILARITY)) {
      result.skippedKnown++;
      continue;
    }
    if (dead[detailUrl]) {
      result.skippedDead++;
      result.rejected.push({ ...rest, reason: `${rest.reason}; detay sayfası son ${DEAD_DETAIL_TTL_DAYS} günde sonuçsuzdu` });
      continue;
    }
    if (tasks.length >= limit) {
      result.rejected.push({ ...rest, reason: `${rest.reason} (detay sayfası sınırı aşıldı)` });
      continue;
    }
    seenUrls.add(detailUrl);
    tasks.push({ rest, url: detailUrl });
  }

  const outcomes = await mapPool(tasks, DETAIL_CONCURRENCY, async ({ rest, url }): Promise<Outcome> => {
    let page: Page;
    try {
      page = await fetchPage(url, { fetchImpl });
    } catch (err) {
      return { rejection: { ...rest, reason: `${rest.reason}; detay sayfası çekilemedi (${(err as Error).message.slice(0, 120)})` }, dead: true };
    }
    let events: ExtractedEvent[];
    try {
      ({ events } = await extractEvents(llm, { page, source, knownEvents, now }));
    } catch (err) {
      // Gemini hatası (ör. kota) sayfanın sonuçsuz olduğunu göstermez: önbelleğe alınmaz, sonraki taramada denenir.
      return { rejection: { ...rest, reason: `${rest.reason}; detay sayfası çıkarılamadı (${(err as Error).message.slice(0, 120)})` }, dead: false, retry: true };
    }
    const { accepted, rejected: detailRejected } = verifyEvents(events, page, now);
    const best = accepted
      .map((e) => ({ e, score: titleSimilarity(e.title, rest.title) }))
      .sort((a, b) => b.score - a.score)[0];
    if (best && best.score >= MIN_TITLE_SIMILARITY) {
      // Etkinliğin linki detay sayfasının kendisi olur; kanıt da oradan.
      return { accepted: { ...best.e, url: page.finalUrl, evidenceUrl: page.finalUrl }, dead: false };
    }
    // Detay sayfasında eşleşen etkinliğin neden reddedildiği (ör. geçmişte kalmış) rapora taşınır.
    const why = detailRejected.find((r) => titleSimilarity(r.title, rest.title) >= MIN_TITLE_SIMILARITY);
    return { rejection: { ...rest, reason: `${rest.reason}; detay sayfasında: ${why?.reason ?? "bulunamadı"}` }, dead: true };
  });

  result.pagesFetched = tasks.length;
  outcomes.forEach((o, i) => {
    if (o.accepted) result.accepted.push(o.accepted);
    if (o.rejection) result.rejected.push(o.rejection);
    if (o.retry) result.failed++;
    if (o.dead) dead[tasks[i].url] = nowIso(now);
    else if (!o.retry) delete dead[tasks[i].url];
  });
  return result;
}
