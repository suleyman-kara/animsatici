import { z } from "zod";
import { endInstant, startInstant } from "./dates";

// Tek şema kaynağı: site, tarayıcı (scan), doğrulayıcı ve ajan bu dosyayı kullanır.

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/;

export const Slug = z.string().regex(SLUG_RE, "küçük harf, rakam ve tire içeren bir slug olmalı");

/** `YYYY-MM-DD` (tüm gün) ya da offset'li ISO 8601 (`2026-11-14T10:00:00+03:00`). */
export const EventDate = z
  .string()
  .refine((s) => (DATE_ONLY_RE.test(s) || DATE_TIME_RE.test(s)) && !Number.isNaN(Date.parse(s)), {
    message: "YYYY-MM-DD veya offset'li ISO 8601 tarih olmalı",
  });

export const Timestamp = z.string().refine((s) => DATE_TIME_RE.test(s) && !Number.isNaN(Date.parse(s)), {
  message: "offset'li ISO 8601 zaman damgası olmalı",
});

export const HttpUrl = z.url({ protocol: /^https?$/ });

export const CATEGORIES = ["ceng", "career", "campus", "community"] as const;
export const Category = z.enum(CATEGORIES);

export const EVENT_TYPES = [
  "hackathon",
  "bootcamp",
  "camp",
  "internship",
  "competition",
  "seminar",
  "scholarship",
  "conference",
  "other",
] as const;
export const EventType = z.enum(EVENT_TYPES);

export const LOCATION_MODES = ["online", "in-person", "hybrid", "unknown"] as const;

export const Source = z.object({
  id: Slug,
  title: z.string().min(1),
  url: HttpUrl,
  homepage: HttpUrl.optional(),
  category: Category,
  kind: z.enum(["listing", "single"]),
  active: z.boolean(),
  render: z.enum(["static", "browser"]),
  notes: z.string().optional(),
});
export type Source = z.infer<typeof Source>;

export const Evidence = z.object({
  titleQuote: z.string().min(1),
  dateQuote: z.string().min(1).optional(),
  /** Tarihin yılı dateQuote'ta yazmıyorsa, yılı gösteren birebir alıntı. */
  yearQuote: z.string().min(1).optional(),
  pageUrl: HttpUrl,
  fetchedAt: Timestamp,
});
export type Evidence = z.infer<typeof Evidence>;

export const Sponsored = z.object({
  until: EventDate,
  label: z.string().min(1).optional(),
});

export const Event = z
  .object({
    id: Slug,
    title: z.string().min(1).max(200),
    summary: z.string().min(1).max(300),
    type: EventType,
    category: Category,
    organizer: z.string().min(1).optional(),
    startDate: EventDate.optional(),
    endDate: EventDate.optional(),
    deadline: EventDate.optional(),
    isAllDay: z.boolean(),
    location: z.object({
      mode: z.enum(LOCATION_MODES),
      city: z.string().min(1).optional(),
      venue: z.string().min(1).optional(),
    }),
    url: HttpUrl,
    sourceId: Slug.optional(),
    alsoSeenAt: z.array(HttpUrl),
    tags: z.array(z.string().min(1)),
    evidence: Evidence,
    status: z.enum(["active", "cancelled"]),
    origin: z.enum(["scan", "agent", "manual"]),
    dedupeKey: z.string().min(1),
    firstSeenAt: Timestamp,
    lastSeenAt: Timestamp,
    sponsored: Sponsored.optional(),
  })
  .superRefine((e, ctx) => {
    if (!e.startDate && !e.deadline) {
      ctx.addIssue({ code: "custom", message: "startDate veya deadline'dan en az biri dolu olmalı", path: ["startDate"] });
    }
    if (e.startDate && e.endDate && endInstant(e.endDate) < startInstant(e.startDate)) {
      ctx.addIssue({ code: "custom", message: "endDate, startDate'ten önce olamaz", path: ["endDate"] });
    }
  });
export type Event = z.infer<typeof Event>;

export const SourceScanState = z.object({
  hash: z.string().optional(),
  lastCheckedAt: Timestamp,
  lastStatus: z.enum(["success", "unchanged", "error", "skipped"]),
  httpStatus: z.number().int().optional(),
  lastError: z.string().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  /** Son çıkarımda sayfadan çıkarılan ham etkinlik sayısı (kabul/ret fark etmeksizin); bozulma koruması için. */
  lastEventCount: z.number().int().nonnegative().optional(),
  /** Etkinlik çıkmayan detay sayfaları (URL → an); bir süre tekrar açılmazlar. */
  deadDetails: z.record(z.string(), Timestamp).optional(),
});
export type SourceScanState = z.infer<typeof SourceScanState>;

export const ScanState = z.record(Slug, SourceScanState);
export type ScanState = z.infer<typeof ScanState>;

export const LastScan = z.object({
  startedAt: Timestamp,
  completedAt: Timestamp,
  status: z.enum(["success", "partial", "failed", "aborted"]),
  totalSources: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  unchangedCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  newEvents: z.number().int().nonnegative(),
  updatedEvents: z.number().int().nonnegative(),
  /** Süre bütçesi dolduğu için bu taramada sırası gelmeyen kaynaklar (bir sonraki taramada önce taranır). */
  deferredCount: z.number().int().nonnegative().optional(),
  /** Bitişinin üzerinden saklama süresi geçtiği için silinen etkinlikler. */
  removedEvents: z.number().int().nonnegative().optional(),
  warnings: z.array(z.string()),
  rejected: z.array(z.object({ sourceId: z.string(), title: z.string(), reason: z.string() })),
});
export type LastScan = z.infer<typeof LastScan>;

export const Blocklist = z.object({
  dedupeKeys: z.array(z.string().min(1)),
  urls: z.array(HttpUrl),
});
export type Blocklist = z.infer<typeof Blocklist>;

export const Feedback = z.object({
  issue: z.number().int().positive(),
  createdAt: Timestamp,
  kind: z.enum(["extraction_miss", "hallucinated", "wrong_date", "other"]),
  sourceId: Slug.optional(),
  pageUrl: HttpUrl.optional(),
  eventId: Slug.optional(),
  details: z.string().min(1),
});
export type Feedback = z.infer<typeof Feedback>;
