import type { LlmClient } from "../llm";
import type { Event, Source } from "../schema";
import { titleSimilarity } from "./dedupe";
import { extractEvents, type ExtractedEvent } from "./extract";
import { fetchPage, type FetchOptions } from "./fetch";
import { verifyEvents, type Rejection } from "./verify";

// Liste sayfasında tarihi yazmayan etkinlikler için etkinliğin kendi sayfasına bakılır.

export const MAX_DETAIL_PAGES_PER_SOURCE = 30;
const KNOWN_TITLE_SIMILARITY = 0.8;
const MIN_TITLE_SIMILARITY = 0.4;

export type DetailInput = {
  rejected: Rejection[];
  llm: LlmClient;
  source: Pick<Source, "id" | "title" | "category">;
  knownEvents?: Pick<Event, "id" | "title" | "startDate" | "deadline">[];
  now: number;
  fetchImpl?: FetchOptions["fetchImpl"];
  limit?: number;
};

export type DetailResult = { accepted: ExtractedEvent[]; rejected: Rejection[]; pagesFetched: number; skippedKnown: number };

export async function followDetailPages(input: DetailInput): Promise<DetailResult> {
  const { llm, source, knownEvents, now, fetchImpl, limit = MAX_DETAIL_PAGES_PER_SOURCE } = input;
  const result: DetailResult = { accepted: [], rejected: [], pagesFetched: 0, skippedKnown: 0 };
  const seenUrls = new Set<string>();

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
    if (result.pagesFetched >= limit) {
      result.rejected.push({ ...rest, reason: `${rest.reason} (detay sayfası sınırı aşıldı)` });
      continue;
    }
    seenUrls.add(detailUrl);
    result.pagesFetched++;

    try {
      const page = await fetchPage(detailUrl, { fetchImpl });
      const { events } = await extractEvents(llm, { page, source, knownEvents, now });
      const { accepted, rejected: detailRejected } = verifyEvents(events, page, now);
      const best = accepted
        .map((e) => ({ e, score: titleSimilarity(e.title, rest.title) }))
        .sort((a, b) => b.score - a.score)[0];
      if (best && best.score >= MIN_TITLE_SIMILARITY) {
        // Etkinliğin linki detay sayfasının kendisi olur; kanıt da oradan.
        result.accepted.push({ ...best.e, url: page.finalUrl, evidenceUrl: page.finalUrl });
      } else {
        // Detay sayfasında bulundu ama 30 günden ileri tarihliyse: ret nedeni ve yeniden tarama zamanı korunur.
        const later = detailRejected.find((r) => r.revisitAt && titleSimilarity(r.title, rest.title) >= MIN_TITLE_SIMILARITY);
        result.rejected.push(
          later ? { ...rest, reason: later.reason, revisitAt: later.revisitAt } : { ...rest, reason: `${rest.reason}; detay sayfasında da doğrulanamadı` },
        );
      }
    } catch (err) {
      result.rejected.push({ ...rest, reason: `${rest.reason}; detay sayfası çekilemedi (${(err as Error).message.slice(0, 120)})` });
    }
  }
  return result;
}
