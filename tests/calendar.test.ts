import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildIcs, calendarRange, googleCalendarUrl } from "../lib/calendar";
import { readEvents } from "../lib/store";

const events = await readEvents(path.join(import.meta.dirname, "fixtures/sample-data"));
const byId = (id: string) => events.find((e) => e.id === id)!;

describe("calendar", () => {
  it("tüm gün aralığında bitiş günü hariç tutulur", () => {
    expect(calendarRange({ startDate: "2026-11-14", endDate: "2026-11-15" })).toEqual({ allDay: true, start: "20261114", end: "20261116" });
    expect(calendarRange({ deadline: "2026-12-31" })).toEqual({ allDay: true, start: "20261231", end: "20270101" });
  });
  it("saatli etkinlikleri UTC'ye çevirir", () => {
    expect(calendarRange({ startDate: "2026-10-12T19:00:00+03:00" })).toEqual({ allDay: false, start: "20261012T160000Z", end: "20261012T180000Z" });
  });
  it("Google Takvim linki", () => {
    const url = new URL(googleCalendarUrl(byId("ornek-yapay-zeka-hackathonu-2026-11"), "https://site/etkinlik/x"));
    expect(url.searchParams.get("dates")).toBe("20261114/20261116");
    expect(url.searchParams.get("location")).toBe("İstanbul");
  });
  it("geçerli bir ICS üretir", () => {
    const ics = buildIcs(events, { siteUrl: "https://kampusradar.app", name: "KampüsRadar", now: Date.parse("2026-10-04T00:00:00Z") });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(events.length);
    expect(ics).toContain("UID:ornek-yapay-zeka-hackathonu-2026-11@kampusradar.app");
    expect(ics).toContain("STATUS:CANCELLED");
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
