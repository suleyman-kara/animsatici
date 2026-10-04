import type { Blocklist } from "../schema";
import { startInstant } from "../dates";
import { slugify } from "../slug";

const DAY_MS = 24 * 60 * 60 * 1000;
const SIMILARITY_THRESHOLD = 0.8;

type Datable = { title: string; startDate?: string; deadline?: string };

function referenceDate(e: Datable): string {
  return (e.startDate ?? e.deadline ?? "").slice(0, 10);
}

export function makeDedupeKey(e: Datable): string {
  return `${slugify(e.title)}|${referenceDate(e)}`;
}

function tokens(title: string): Set<string> {
  return new Set(
    slugify(title, 200)
      .split("-")
      .filter((t) => t.length > 1),
  );
}

export function titleSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / (ta.size + tb.size - shared);
}

/** Aynı etkinlik mi? Anahtar eşitliği ya da benzer başlık + en fazla 1 gün tarih farkı. */
export function isSameEvent(a: Datable, b: Datable): boolean {
  if (makeDedupeKey(a) === makeDedupeKey(b)) return true;
  const da = referenceDate(a);
  const db = referenceDate(b);
  if (!da || !db) return false;
  if (Math.abs(startInstant(da) - startInstant(db)) > DAY_MS) return false;
  return titleSimilarity(a.title, b.title) >= SIMILARITY_THRESHOLD;
}

export function findMatch<T extends Datable>(candidate: Datable, existing: T[]): T | undefined {
  return existing.find((e) => isSameEvent(candidate, e));
}

export function isBlocked(candidate: Datable & { url?: string }, blocklist: Blocklist): boolean {
  if (blocklist.dedupeKeys.includes(makeDedupeKey(candidate))) return true;
  return !!candidate.url && blocklist.urls.includes(candidate.url);
}

/** `<baslik>-<yyyy-mm>` biçiminde, mevcut id'lerle çakışmayan bir id üretir. */
export function makeEventId(e: Datable, taken: Set<string>): string {
  const base = `${slugify(e.title, 60) || "etkinlik"}-${referenceDate(e).slice(0, 7)}`;
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}
