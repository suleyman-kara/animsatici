import { endInstant, isDateOnly, startInstant } from "./dates";
import type { Event } from "./schema";

const DAY_MS = 24 * 60 * 60 * 1000;

function utcStamp(instant: number): string {
  return new Date(instant).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function compactDay(value: string, plusDays = 0): string {
  const d = new Date(Date.parse(`${value.slice(0, 10)}T00:00:00Z`) + plusDays * DAY_MS);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export type CalendarEntry = {
  kind: "deadline" | "start";
  title: string;
  allDay: boolean;
  /** Tüm gün: YYYYMMDD; saatli: UTC YYYYMMDDTHHMMSSZ */
  start: string;
  end: string;
  /** Sıralama/filtre için anın kendisi (ms). */
  at: number;
};

/**
 * Takvime yalnızca iki tek günlük kayıt girer: son başvuru günü ve başlangıç.
 * Aylarca süren programlar takvimi kaplamasın diye etkinliğin tüm süresi işlenmez.
 */
export function calendarEntries(event: Pick<Event, "title" | "startDate" | "endDate" | "deadline">): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  if (event.deadline) {
    const time = isDateOnly(event.deadline) ? "" : ` (saat ${event.deadline.slice(11, 16)})`;
    entries.push({
      kind: "deadline",
      title: `Son başvuru: ${event.title}${time}`,
      allDay: true,
      start: compactDay(event.deadline),
      end: compactDay(event.deadline, 1),
      at: endInstant(event.deadline),
    });
  }
  if (event.startDate) {
    const base = { kind: "start" as const, title: event.title, at: startInstant(event.startDate) };
    if (isDateOnly(event.startDate)) {
      entries.push({ ...base, allDay: true, start: compactDay(event.startDate), end: compactDay(event.startDate, 1) });
    } else {
      // Aynı gün biten saatli etkinlikte gerçek bitiş, aksi hâlde 2 saatlik blok.
      const sameDayEnd = event.endDate && !isDateOnly(event.endDate) && event.endDate.slice(0, 10) === event.startDate.slice(0, 10);
      const endMs = sameDayEnd ? endInstant(event.endDate!) : base.at + 2 * 60 * 60 * 1000;
      entries.push({ ...base, allDay: false, start: utcStamp(base.at), end: utcStamp(endMs) });
    }
  }
  return entries;
}

/** "Takvime ekle" için tek kayıt: son başvuru henüz geçmediyse o, değilse başlangıç. */
export function primaryCalendarEntry(event: Pick<Event, "title" | "startDate" | "endDate" | "deadline">, now: number = Date.now()): CalendarEntry {
  const entries = calendarEntries(event);
  const deadline = entries.find((e) => e.kind === "deadline");
  const start = entries.find((e) => e.kind === "start");
  if (deadline && (deadline.at >= now || !start)) return deadline;
  return start ?? entries[0];
}

export function googleCalendarUrl(event: Event, pageUrl: string, now: number = Date.now()): string {
  const entry = primaryCalendarEntry(event, now);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: entry.title,
    dates: `${entry.start}/${entry.end}`,
    details: `${event.summary}\n\nBaşvuru: ${event.url}\n${pageUrl}`,
  });
  const where = [event.location.venue, event.location.city].filter(Boolean).join(", ");
  if (where) params.set("location", where);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545: satırlar 75 oktetten uzun olamaz. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(events: Event[], options: { siteUrl: string; name: string; now?: number; since?: number }): string {
  const host = new URL(options.siteUrl).host;
  const stamp = utcStamp(options.now ?? Date.now());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${options.name}//TR`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(options.name)}`,
    "X-WR-TIMEZONE:Europe/Istanbul",
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
  ];
  for (const event of events) {
    const url = `${options.siteUrl}/etkinlik/${event.id}`;
    const where = [event.location.venue, event.location.city].filter(Boolean).join(", ") || (event.location.mode === "online" ? "Online" : "");
    for (const entry of calendarEntries(event)) {
      if (options.since !== undefined && entry.at < options.since) continue;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${event.id}-${entry.kind}@${host}`,
        `DTSTAMP:${stamp}`,
        entry.allDay ? `DTSTART;VALUE=DATE:${entry.start}` : `DTSTART:${entry.start}`,
        entry.allDay ? `DTEND;VALUE=DATE:${entry.end}` : `DTEND:${entry.end}`,
        `SUMMARY:${escapeText(entry.title)}`,
        `DESCRIPTION:${escapeText(`${event.summary}\n\nBaşvuru: ${event.url}`)}`,
        `URL:${url}`,
        ...(where && entry.kind === "start" ? [`LOCATION:${escapeText(where)}`] : []),
        ...(entry.allDay ? ["TRANSP:TRANSPARENT"] : []),
        `STATUS:${event.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
        "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
