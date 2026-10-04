import type { Event } from "./schema";

// Türkiye 2016'dan beri yaz saati uygulamıyor; Europe/Istanbul sabit +03:00.
export const TR_OFFSET = "+03:00";
export const TIME_ZONE = "Europe/Istanbul";
const DAY_MS = 24 * 60 * 60 * 1000;

export function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Tarihin başladığı an (tüm gün tarihler TR gece yarısı). */
export function startInstant(value: string): number {
  return Date.parse(isDateOnly(value) ? `${value}T00:00:00${TR_OFFSET}` : value);
}

/** Tarihin bittiği an (tüm gün tarihler TR günün son saniyesi). */
export function endInstant(value: string): number {
  return Date.parse(isDateOnly(value) ? `${value}T23:59:59${TR_OFFSET}` : value);
}

/** Verilen anın TR takvimindeki gününü `YYYY-MM-DD` olarak döndürür. */
export function trDay(instant: number | Date = Date.now()): string {
  const t = typeof instant === "number" ? instant : instant.getTime();
  return new Date(t + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Şimdiki anı TR offset'li ISO 8601 olarak döndürür. */
export function nowIso(now: number = Date.now()): string {
  return new Date(now + 3 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, TR_OFFSET);
}

export type EventPhase = "open" | "ongoing" | "upcoming" | "past";

type Datable = Pick<Event, "startDate" | "endDate" | "deadline" | "status">;

/** Etkinliğin zaman çizelgesindeki yerini belirler. */
export function classify(event: Datable, now: number = Date.now()): EventPhase {
  if (event.status === "cancelled") return "past";
  const start = event.startDate ? startInstant(event.startDate) : undefined;
  const end = event.endDate
    ? endInstant(event.endDate)
    : event.startDate
      ? endInstant(event.startDate.slice(0, 10))
      : undefined;
  const deadline = event.deadline ? endInstant(event.deadline) : undefined;

  if (deadline !== undefined && deadline >= now && (start === undefined || start > now)) return "open";
  if (start !== undefined && start <= now && end !== undefined && end >= now) return "ongoing";
  if (deadline !== undefined && deadline >= now) return "open";
  if (start !== undefined && start > now) return "upcoming";
  return "past";
}

/** Sıralama/arşiv için etkinliğin referans anı. */
export function referenceInstant(event: Datable): number {
  if (event.startDate) return startInstant(event.startDate);
  return endInstant(event.deadline!);
}

/** Bitişe (son başvuru) kalan tam gün sayısı; geçmişse negatif. */
export function daysUntil(value: string, now: number = Date.now()): number {
  return Math.floor((endInstant(value) - now) / DAY_MS);
}

const dayFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: TIME_ZONE });
const dayShortFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: TIME_ZONE });
const timeFmt = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE });

export function formatDate(value: string): string {
  const d = new Date(startInstant(value));
  return isDateOnly(value) ? dayFmt.format(d) : `${dayFmt.format(d)} ${timeFmt.format(d)}`;
}

export function formatRange(start?: string, end?: string): string {
  if (!start) return "";
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return formatDate(start);
  const s = new Date(startInstant(start));
  return `${dayShortFmt.format(s)} – ${formatDate(end)}`;
}
