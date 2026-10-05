import { Event, EVENT_TYPES, LOCATION_MODES, type Blocklist, type Source } from "../schema";
import { findMatch, isBlocked, makeDedupeKey, makeEventId, titleSimilarity } from "./dedupe";
import type { ExtractedEvent } from "./extract";
import type { Rejection } from "./verify";

// Doğrulanmış etkinlikleri mevcut kayıtlarla birleştirir. Saf fonksiyon: dosya yazmaz.

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

/** Modelin "bu, bilinen şu etkinlik" ipucunun kabulü için gereken en düşük başlık benzerliği. */
const HINT_TITLE_SIMILARITY = 0.5;

function asEnum<T extends string>(values: readonly T[], value: string | undefined, fallback: T): T {
  return values.includes(value as T) ? (value as T) : fallback;
}

/** Çıkarılan alanları Event alanlarına çevirir (id, köken ve zaman damgaları hariç). */
export function eventFieldsFrom(
  x: ExtractedEvent,
  ctx: { category: Event["category"]; pageUrl: string; fetchedAt: string },
): Omit<Event, "id" | "origin" | "firstSeenAt" | "lastSeenAt" | "alsoSeenAt" | "sourceId" | "dedupeKey"> {
  return {
    title: clip(x.title, 200),
    summary: clip(x.summary || x.title, 300),
    type: asEnum(EVENT_TYPES, x.type, "other"),
    category: ctx.category,
    organizer: x.organizer?.trim() || undefined,
    startDate: x.startDate,
    endDate: x.endDate,
    deadline: x.deadline,
    isAllDay: x.isAllDay,
    location: {
      mode: asEnum(LOCATION_MODES, x.locationMode, "unknown"),
      city: x.city?.trim() || undefined,
      venue: x.venue?.trim() || undefined,
    },
    url: x.url ?? ctx.pageUrl,
    tags: [...new Set(x.tags.map((t) => t.trim()).filter(Boolean))].slice(0, 6),
    evidence: { titleQuote: x.titleQuote, dateQuote: x.dateQuote, yearQuote: x.yearQuote || undefined, pageUrl: ctx.pageUrl, fetchedAt: ctx.fetchedAt },
    status: x.cancelled ? "cancelled" : "active",
  };
}

export type MergeInput = {
  source: Pick<Source, "id" | "category">;
  pageUrl: string;
  accepted: ExtractedEvent[];
  existing: Event[];
  blocklist: Blocklist;
  now: string;
};

export type MergeResult = { created: Event[]; updated: Event[]; rejected: Rejection[] };

export function mergeEvents({ source, pageUrl, accepted, existing, blocklist, now }: MergeInput): MergeResult {
  const rejected: Rejection[] = [];
  const pool = [...existing]; // her zaman kayıtların en güncel hâli
  const taken = new Set(pool.map((e) => e.id));
  const createdIds = new Set<string>();
  const updatedIds = new Set<string>();

  for (const x of accepted) {
    const fields = eventFieldsFrom(x, { category: source.category, pageUrl: x.evidenceUrl ?? pageUrl, fetchedAt: now });
    const candidate = { title: fields.title, startDate: fields.startDate, deadline: fields.deadline, url: fields.url };
    if (isBlocked(candidate, blocklist)) {
      rejected.push({ title: x.title, reason: "engel listesinde" });
      continue;
    }

    // Modelin eşleştirme ipucu doğrulanmadan kullanılmaz: yanlış ipucu başka bir etkinliğin tarihlerini ezerdi.
    const hinted = x.matchesExistingId ? pool.find((e) => e.id === x.matchesExistingId) : undefined;
    const hintOk = hinted && hinted.sourceId === source.id && titleSimilarity(hinted.title, fields.title) >= HINT_TITLE_SIMILARITY;
    const match = (hintOk ? hinted : undefined) || findMatch(candidate, pool);
    if (!match) {
      const created = {
        id: makeEventId(candidate, taken),
        ...fields,
        sourceId: source.id,
        alsoSeenAt: [],
        origin: "scan",
        dedupeKey: makeDedupeKey(candidate),
        firstSeenAt: now,
        lastSeenAt: now,
      };
      const valid = Event.safeParse(created);
      if (!valid.success) {
        rejected.push({ title: x.title, reason: `geçersiz kayıt: ${valid.error.issues[0]?.message}` });
        continue;
      }
      taken.add(created.id);
      pool.push(valid.data);
      createdIds.add(created.id);
      continue;
    }

    const alsoSeenAt =
      fields.url !== match.url && !match.alsoSeenAt.includes(fields.url) ? [...match.alsoSeenAt, fields.url] : match.alsoSeenAt;
    // Yalnızca bu kaynağın kendi taradığı kayıtlar güncellenir; elle/ajanla girilenler korunur.
    const ownsRecord = match.origin === "scan" && match.sourceId === source.id;
    const next: Event = ownsRecord
      ? { ...match, ...fields, title: match.title, url: match.url, sponsored: match.sponsored, alsoSeenAt, lastSeenAt: now }
      : { ...match, alsoSeenAt, lastSeenAt: now };
    if (!Event.safeParse(next).success) {
      rejected.push({ title: x.title, reason: "güncelleme geçersiz kayıt üretiyor, eski kayıt korundu" });
      continue;
    }
    pool[pool.indexOf(match)] = next;
    if (!createdIds.has(next.id)) updatedIds.add(next.id);
  }

  return {
    created: pool.filter((e) => createdIds.has(e.id)),
    updated: pool.filter((e) => updatedIds.has(e.id)),
    rejected,
  };
}
