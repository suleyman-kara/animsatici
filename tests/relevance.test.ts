import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { quoteHasYear, relevanceProblem } from "../lib/scanner/verify";
import { readEvents, writeEvent } from "../lib/store";
import { tempDataRoot } from "./helpers";

const NOW = Date.parse("2026-10-04T12:00:00+03:00");

describe("quoteHasYear", () => {
  it.each([
    ["14-15 Kasım 2026", true],
    ["10.08.2026 - 20.09.2026", true],
    ["07/08/26", true],
    ["Son başvuru tarihi 13 Mayıs 23.59'tur.", false],
    ["March 22nd, 23:59 is the deadline", false],
    ["Son Başvuru\n14 Ekim", false],
    [undefined, false],
  ])("%s → %s", (quote, expected) => expect(quoteHasYear(quote)).toBe(expected));
});

describe("relevanceProblem", () => {
  it("başvurusu açık, yaklaşan ve devam eden etkinlikleri kabul eder", () => {
    expect(relevanceProblem({ deadline: "2026-10-14", dateQuote: "Son Başvuru 14 Ekim" }, NOW)).toBeNull();
    expect(relevanceProblem({ startDate: "2026-10-17", endDate: "2026-12-05", deadline: "2026-09-20", dateQuote: "17 October to 5 December 2026" }, NOW)).toBeNull();
    expect(relevanceProblem({ startDate: "2026-07-01", endDate: "2027-01-31", dateQuote: "July 2026 – January 2027" }, NOW)).toBeNull();
  });
  it("bitmiş etkinlikleri ve başvurusu kapanmış tarihsiz ilanları reddeder", () => {
    expect(relevanceProblem({ deadline: "2026-08-31", dateQuote: "Son başvuru: 31 Ağustos 2026" }, NOW)).toMatchObject({ reason: "etkinlik geçmişte kalmış" });
    expect(relevanceProblem({ startDate: "2026-04-10", endDate: "2026-04-11", dateQuote: "10 - 11 Nisan 2026" }, NOW)).toMatchObject({ reason: "etkinlik geçmişte kalmış" });
  });
  it("yılı yazmayan ve uzak görünen tarihleri reddeder, yakın olanları kabul eder", () => {
    const yearless = relevanceProblem({ deadline: "2027-05-13T23:59:00+03:00", dateQuote: "Son başvuru tarihi 13 Mayıs 23.59'tur." }, NOW);
    expect(yearless?.reason).toMatch(/yıl yazmıyor/);
    expect(yearless?.revisitAt).toBeUndefined(); // yılı şüpheli olan yeniden ziyaret edilmez
    expect(relevanceProblem({ deadline: "2026-11-02", dateQuote: "Son başvuru 2 Kasım" }, NOW)).toBeNull(); // 29 gün
    expect(relevanceProblem({ deadline: "2026-11-05", dateQuote: "Son başvuru 5 Kasım" }, NOW)?.reason).toMatch(/yıl yazmıyor/); // 32 gün
  });
  it("30 günden ileri tarihli etkinliği reddeder ve pencereye gireceği anı verir", () => {
    const far = relevanceProblem({ deadline: "2027-05-13", dateQuote: "13 Mayıs 2027" }, NOW);
    expect(far?.reason).toBe("30 günden daha ileri tarihli");
    expect(new Date(far!.revisitAt!).toISOString()).toBe("2027-04-13T20:59:59.000Z"); // 13 Mayıs gün sonu − 30 gün
    // başvurusu kapanmış ama başlangıcı uzak: başlangıçtan 30 gün önce
    const later = relevanceProblem({ startDate: "2026-12-28", endDate: "2027-01-03", deadline: "2026-09-30", dateQuote: "28 Aralık 2026 - 3 Ocak" }, NOW);
    expect(new Date(later!.revisitAt!).toISOString()).toBe("2026-11-27T21:00:00.000Z");
  });
});

describe("prune", () => {
  it("yalnızca ilk görüldüğünde zaten uygun olmayan taranmış kayıtları siler", async () => {
    const root = await tempDataRoot();
    const [base] = await readEvents(root);
    const seen = "2026-10-04T19:00:00+03:00";
    const make = (id: string, over: Record<string, unknown>) =>
      writeEvent({ ...base, id, dedupeKey: id, origin: "scan", firstSeenAt: seen, lastSeenAt: seen, startDate: undefined, endDate: undefined, sponsored: undefined, ...over } as never, root);
    await make("gecmis", { deadline: "2026-08-31", evidence: { ...base.evidence, dateQuote: "31 Ağustos 2026" } });
    await make("yilsiz-uzak", { deadline: "2027-05-13", evidence: { ...base.evidence, dateQuote: "13 Mayıs" } });
    await make("acik", { deadline: "2026-10-20", evidence: { ...base.evidence, dateQuote: "20 Ekim" } });
    await make("elle-gecmis", { origin: "manual", deadline: "2026-08-31", evidence: { ...base.evidence, dateQuote: "31 Ağustos 2026" } });

    execFileSync("npx", ["tsx", path.join(import.meta.dirname, "../scripts/prune.ts")], { env: { ...process.env, DATA_ROOT: root }, encoding: "utf8" });
    const ids = (await readEvents(root)).map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(["acik", "elle-gecmis"]));
    expect(ids).not.toContain("gecmis");
    expect(ids).not.toContain("yilsiz-uzak");
  });
});
