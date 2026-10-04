import { describe, expect, it } from "vitest";
import { classify, daysUntil, inWindow, nowIso, trDay } from "../lib/dates";

const at = (s: string) => Date.parse(s);
const base = { status: "active" as const };

describe("classify", () => {
  const now = at("2026-10-04T12:00:00+03:00");

  it("son başvurusu gelecekte olan etkinlik açık", () => {
    expect(classify({ ...base, startDate: "2026-11-14", deadline: "2026-10-30" }, now)).toBe("open");
    expect(classify({ ...base, deadline: "2026-10-04" }, now)).toBe("open"); // gün sonuna kadar açık
  });
  it("başvurusu kapanmış ama başlamamış etkinlik yaklaşan", () => {
    expect(classify({ ...base, startDate: "2026-11-14", deadline: "2026-10-01" }, now)).toBe("upcoming");
  });
  it("tarih aralığı içindeki etkinlik devam ediyor", () => {
    expect(classify({ ...base, startDate: "2026-10-03", endDate: "2026-10-05" }, now)).toBe("ongoing");
    expect(classify({ ...base, startDate: "2026-10-04" }, now)).toBe("ongoing"); // tek günlük, bugün
  });
  it("saatli tek günlük etkinlik gün boyunca devam ediyor sayılır", () => {
    expect(classify({ ...base, startDate: "2026-10-04T10:00:00+03:00" }, now)).toBe("ongoing");
  });
  it("geçmiş ve iptal edilen etkinlikler past", () => {
    expect(classify({ ...base, startDate: "2026-09-01" }, now)).toBe("past");
    expect(classify({ ...base, deadline: "2026-10-03" }, now)).toBe("past");
    expect(classify({ status: "cancelled", startDate: "2026-12-01" }, now)).toBe("past");
  });
  it("TR gün sınırına göre çalışır (UTC değil)", () => {
    // 2026-10-04 23:30 TR = 20:30 UTC; deadline 2026-10-04 hâlâ açık
    expect(classify({ ...base, deadline: "2026-10-04" }, at("2026-10-04T20:30:00Z"))).toBe("open");
    // 2026-10-05 00:30 TR = 2026-10-04 21:30 UTC; artık kapalı
    expect(classify({ ...base, deadline: "2026-10-04" }, at("2026-10-04T21:30:00Z"))).toBe("past");
  });
});

describe("yardımcılar", () => {
  it("trDay ve nowIso TR saatini kullanır", () => {
    expect(trDay(at("2026-10-04T22:00:00Z"))).toBe("2026-10-05");
    expect(nowIso(at("2026-10-04T22:00:00Z"))).toBe("2026-10-05T01:00:00+03:00");
  });
  it("daysUntil", () => {
    const now = at("2026-10-04T12:00:00+03:00");
    expect(daysUntil("2026-10-04", now)).toBe(0);
    expect(daysUntil("2026-10-07", now)).toBe(3);
    expect(daysUntil("2026-10-03", now)).toBeLessThan(0);
  });
});

describe("inWindow (30 gün)", () => {
  const now = at("2026-10-04T12:00:00+03:00");
  it("30 gün içinde başvurusu kapanan, başlayan ya da devam eden etkinlikleri içerir", () => {
    expect(inWindow({ ...base, deadline: "2026-10-20" }, now)).toBe(true);
    expect(inWindow({ ...base, startDate: "2026-10-30", deadline: "2026-09-01" }, now)).toBe(true);
    expect(inWindow({ ...base, startDate: "2026-07-01", endDate: "2027-01-31" }, now)).toBe(true);
    expect(inWindow({ ...base, startDate: "2026-11-02" }, now)).toBe(true); // 29 gün
  });
  it("daha ileri tarihli ve geçmiş etkinlikleri dışarıda bırakır", () => {
    expect(inWindow({ ...base, deadline: "2026-12-31" }, now)).toBe(false);
    expect(inWindow({ ...base, startDate: "2026-12-01", deadline: "2026-11-20" }, now)).toBe(false);
    expect(inWindow({ ...base, startDate: "2026-09-01" }, now)).toBe(false);
  });
  it("son başvurusu ileride ama başlangıcı yakın olan etkinlik içeride", () => {
    expect(inWindow({ ...base, startDate: "2026-10-25", deadline: "2026-12-01" }, now)).toBe(true);
  });
});
