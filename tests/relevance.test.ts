import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { relevanceProblem, yearsIn } from "../lib/scanner/verify";
import { readEvents, writeEvent } from "../lib/store";
import { tempDataRoot } from "./helpers";

const NOW = Date.parse("2026-10-04T12:00:00+03:00");

describe("yearsIn", () => {
  it.each([
    ["14-15 Kasım 2026", [2026]],
    ["10.08.2026 - 20.09.2026", [2026]],
    ["07/08/26", [2026]],
    ["28 Aralık 2026 – 3 Ocak 2027", [2026, 2027]],
    ["Son başvuru tarihi 13 Mayıs 23.59'tur.", []],
    ["March 22nd, 23:59 is the deadline", []],
    ["Saat 2030'da başlar", [2030]], // dört haneli sayı yıl sayılır; bu yüzden yıl eşleşmesi tarihe göre kontrol edilir
  ])("%s", (text, years) => expect([...yearsIn(text)]).toEqual(years));
});

describe("relevanceProblem", () => {
  it("yılı alıntıda açıkça yazan güncel etkinlikleri kabul eder", () => {
    expect(relevanceProblem({ deadline: "2026-10-14", dateQuote: "Son başvuru: 14 Ekim 2026" }, NOW)).toBeNull();
    // yıl tarih alıntısında değil ama başlıkta ya da ayrı bir yıl alıntısında
    expect(relevanceProblem({ deadline: "2026-10-14", dateQuote: "Son Başvuru 14 Ekim", titleQuote: "Hackathon 2026" }, NOW)).toBeNull();
    expect(relevanceProblem({ deadline: "2026-10-14", dateQuote: "Son Başvuru 14 Ekim", yearQuote: "2026 Güz Dönemi" }, NOW)).toBeNull();
    // uzak tarih de sorun değil; yıl kanıtlıysa kaydedilir (ana sayfa yalnızca 30 günü gösterir)
    expect(relevanceProblem({ deadline: "2027-05-13", dateQuote: "13 Mayıs 2027" }, NOW)).toBeNull();
  });
  it("yılı hiçbir alıntıda yazmayan tarihi reddeder ve detay sayfasına yönlendirir", () => {
    expect(relevanceProblem({ deadline: "2026-10-14", dateQuote: "Son Başvuru 14 Ekim" }, NOW)).toEqual({
      reason: "yıl kanıtı yok: 2026 sayfadaki alıntılarda yazmıyor",
      followable: true,
    });
    // alıntıdaki yıl başka: model yılı değiştirmiş
    expect(relevanceProblem({ deadline: "2027-05-13", dateQuote: "13 Mayıs 2026" }, NOW)?.reason).toMatch(/2027/);
    // başlangıç ve son başvuru farklı yıllardaysa ikisi de kanıtlanmalı
    expect(relevanceProblem({ startDate: "2027-01-25", deadline: "2026-10-07", dateQuote: "Son başvuru: 7 Ekim 2026" }, NOW)?.reason).toMatch(/2027/);
  });
  it("bitmiş etkinlikleri reddeder", () => {
    expect(relevanceProblem({ deadline: "2026-08-31", dateQuote: "Son başvuru: 31 Ağustos 2026" }, NOW)).toEqual({ reason: "etkinlik geçmişte kalmış" });
    expect(relevanceProblem({ startDate: "2026-04-10", endDate: "2026-04-11", dateQuote: "10 - 11 Nisan 2026" }, NOW)?.reason).toBe("etkinlik geçmişte kalmış");
  });
  it("devam eden etkinliği kabul eder", () => {
    expect(relevanceProblem({ startDate: "2026-07-01", endDate: "2027-01-31", dateQuote: "July 2026 – January 2027" }, NOW)).toBeNull();
  });
});

describe("prune", () => {
  it("yalnızca ilk görüldüğünde zaten uygun olmayan taranmış kayıtları siler", async () => {
    const root = await tempDataRoot();
    const [base] = await readEvents(root);
    const seen = "2026-10-04T19:00:00+03:00";
    const make = (id: string, over: Record<string, unknown>) =>
      writeEvent({ ...base, id, dedupeKey: id, origin: "scan", firstSeenAt: seen, lastSeenAt: seen, startDate: undefined, endDate: undefined, sponsored: undefined, ...over } as never, root);
    const ev = (dateQuote: string) => ({ evidence: { ...base.evidence, titleQuote: "Etkinlik", dateQuote } });
    await make("gecmis", { deadline: "2026-08-31", ...ev("31 Ağustos 2026") });
    await make("yilsiz", { deadline: "2026-10-20", ...ev("20 Ekim") });
    await make("acik", { deadline: "2026-10-20", ...ev("20 Ekim 2026") });
    await make("elle-yilsiz", { origin: "manual", deadline: "2026-10-20", ...ev("20 Ekim") });

    execFileSync("npx", ["tsx", path.join(import.meta.dirname, "../scripts/prune.ts")], { env: { ...process.env, DATA_ROOT: root }, encoding: "utf8" });
    const ids = (await readEvents(root)).map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(["acik", "elle-yilsiz"]));
    expect(ids).not.toContain("gecmis");
    expect(ids).not.toContain("yilsiz");
  });
});
