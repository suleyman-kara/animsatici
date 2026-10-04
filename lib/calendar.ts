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

type CalendarRange = { allDay: boolean; start: string; end: string };

/** Takvim için başlangıç/bitiş. Başlangıcı olmayan etkinlikler son başvuru gününe yerleşir. */
export function calendarRange(event: Pick<Event, "startDate" | "endDate" | "deadline">): CalendarRange {
  const start = event.startDate ?? event.deadline!;
  const end = event.startDate ? event.endDate : undefined;
  if (isDateOnly(start) || (end && isDateOnly(end))) {
    return { allDay: true, start: compactDay(start), end: compactDay(end ?? start, 1) };
  }
  const startMs = startInstant(start);
  const endMs = end ? endInstant(end) : startMs + 2 * 60 * 60 * 1000;
  return { allDay: false, start: utcStamp(startMs), end: utcStamp(endMs) };
}

function calendarTitle(event: Event): string {
  return event.startDate ? event.title : `Son başvuru: ${event.title}`;
}

export function googleCalendarUrl(event: Event, pageUrl: string): string {
  const range = calendarRange(event);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: calendarTitle(event),
    dates: `${range.start}/${range.end}`,
    details: `${event.summary}\n\n${pageUrl}`,
  });
  const where = [event.location.venue, event.location.city].filter(Boolean).join(", ");
  if (where) params.set("location", where);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
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

export function buildIcs(events: Event[], options: { siteUrl: string; name: string; now?: number }): string {
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
    const range = calendarRange(event);
    const url = `${options.siteUrl}/etkinlik/${event.id}`;
    const where = [event.location.venue, event.location.city].filter(Boolean).join(", ") || (event.location.mode === "online" ? "Online" : "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@${host}`,
      `DTSTAMP:${stamp}`,
      range.allDay ? `DTSTART;VALUE=DATE:${range.start}` : `DTSTART:${range.start}`,
      range.allDay ? `DTEND;VALUE=DATE:${range.end}` : `DTEND:${range.end}`,
      `SUMMARY:${escapeText(calendarTitle(event))}`,
      `DESCRIPTION:${escapeText(`${event.summary}\n\nBaşvuru: ${event.url}`)}`,
      `URL:${url}`,
      ...(where ? [`LOCATION:${escapeText(where)}`] : []),
      `STATUS:${event.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
