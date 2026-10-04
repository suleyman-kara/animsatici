import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildIcs, calendarEntries, googleCalendarUrl, primaryCalendarEntry } from "../lib/calendar";
import { readEvents } from "../lib/store";

const events = await readEvents(path.join(import.meta.dirname, "fixtures/sample-data"));
const byId = (id: string) => events.find((e) => e.id === id)!;
const NOW = Date.parse("2026-10-04T12:00:00+03:00");

describe("calendarEntries", () => {
  it("yalnızca son başvuru ve başlangıç günlerini üretir, süreyi yaymaz", () => {
    const entries = calendarEntries({ title: "Talent Program", startDate: "2026-07-01", endDate: "2027-01-31", deadline: "2026-06-01" });
    expect(entries).toEqual([
      expect.objectContaining({ kind: "deadline", title: "Son başvuru: Talent Program", allDay: true, start: "20260601", end: "20260602" }),
      expect.objectContaining({ kind: "start", title: "Talent Program", allDay: true, start: "20260701", end: "20260702" }),
    ]);
  });
  it("saatli son başvuru tüm gün kaydı olur, saati başlıkta yazar", () => {
    const [deadline] = calendarEntries({ title: "X", deadline: "2026-10-12T23:59:00+03:00" });
    expect(deadline).toMatchObject({ allDay: true, start: "20261012", end: "20261013", title: "Son başvuru: X (saat 23:59)" });
  });
  it("saatli başlangıç: aynı gün biten etkinlikte gerçek bitiş, aksi hâlde 2 saat", () => {
    const [sameDay] = calendarEntries({ title: "X", startDate: "2026-10-12T19:00:00+03:00", endDate: "2026-10-12T21:30:00+03:00" });
    expect(sameDay).toMatchObject({ allDay: false, start: "20261012T160000Z", end: "20261012T183000Z" });
    const [multiDay] = calendarEntries({ title: "X", startDate: "2026-10-12T19:00:00+03:00", endDate: "2026-10-20" });
    expect(multiDay).toMatchObject({ allDay: false, start: "20261012T160000Z", end: "20261012T180000Z" });
  });
  it("Takvime ekle: son başvuru geçmediyse onu, geçtiyse başlangıcı seçer", () => {
    const e = { title: "X", startDate: "2026-11-14", deadline: "2026-10-30" };
    expect(primaryCalendarEntry(e, NOW).kind).toBe("deadline");
    expect(primaryCalendarEntry(e, Date.parse("2026-11-01T00:00:00+03:00")).kind).toBe("start");
  });
});

describe("googleCalendarUrl", () => {
  it("tek günlük son başvuru kaydı oluşturur", () => {
    const url = new URL(googleCalendarUrl(byId("ornek-yapay-zeka-hackathonu-2026-11"), "https://site/etkinlik/x", NOW));
    expect(url.searchParams.get("dates")).toBe("20261030/20261031");
    expect(url.searchParams.get("text")).toBe("Son başvuru: Örnek Yapay Zeka Hackathonu");
  });
});

describe("buildIcs", () => {
  const ics = buildIcs(events, { siteUrl: "https://kampus30.app", name: "Kampüs30", now: Date.parse("2026-10-04T00:00:00Z") });
  it("geçerli bir ICS üretir; her etkinlik için başvuru/başlangıç kayıtları", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    const expected = events.reduce((n, e) => n + (e.deadline ? 1 : 0) + (e.startDate ? 1 : 0), 0);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(expected);
    expect(ics).toContain("UID:ornek-yapay-zeka-hackathonu-2026-11-deadline@kampus30.app");
    expect(ics).toContain("UID:ornek-yapay-zeka-hackathonu-2026-11-start@kampus30.app");
    expect(ics).toContain("STATUS:CANCELLED");
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
  it("çok günlük etkinlikte bitişe kadar yayılan kayıt yok", () => {
    // Örnek DevFest 3–5 Ekim: başlangıç kaydı saatli ve 2 saat; 5 Ekim'e uzanan DTEND yok
    expect(ics).not.toMatch(/DTEND[^\r]*20261005/);
  });
  it("noktalı virgül ve virgülleri kaçırır", () => {
    const [e] = events;
    const out = buildIcs([{ ...e, title: "A; B, C" }], { siteUrl: "https://x.app", name: "K" });
    expect(out).toContain(String.raw`A\; B\, C`);
  });
  it("since öncesindeki kayıtları atlar", () => {
    const out = buildIcs([byId("ornek-yapay-zeka-hackathonu-2026-11")], { siteUrl: "https://x.app", name: "K", since: Date.parse("2026-11-01T00:00:00+03:00") });
    expect(out.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(out).toContain("-start@");
  });
});
