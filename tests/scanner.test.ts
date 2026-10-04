import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cleanHtml } from "../lib/scanner/fetch";
import { verifyEvents } from "../lib/scanner/verify";
import { isSameEvent, makeDedupeKey, makeEventId, titleSimilarity } from "../lib/scanner/dedupe";
import { mergeEvents } from "../lib/scanner/merge";
import { suspiciousDrop, tooManyErrors, tooManyNewEvents } from "../lib/scanner/guards";
import { ExtractedEvent } from "../lib/scanner/extract";
import { readEvents } from "../lib/store";

const html = await readFile(path.join(import.meta.dirname, "fixtures/pages/events-listing.html"), "utf8");
const page = { ...cleanHtml(html, "https://ornek.org/etkinlikler"), finalUrl: "https://ornek.org/etkinlikler" };
const NOW = Date.parse("2026-10-04T12:00:00+03:00");
const x = (over: Partial<ExtractedEvent>): ExtractedEvent => ExtractedEvent.parse({ title: "t", titleQuote: "t", ...over });

describe("cleanHtml", () => {
  it("script/nav/footer'ı atar, linkleri mutlak yapar", () => {
    expect(page.title).toBe("Etkinlikler | Örnek Topluluk");
    expect(page.text).toContain("Kış Algoritma Kampı 2027");
    expect(page.text).not.toContain("var x");
    expect(page.text).not.toContain("© 2026");
    expect(page.links.map((l) => l.href)).toEqual(["https://ornek.org/etkinlik/kis-kampi", "https://ornek.org/hackathon"]);
  });
});

describe("verifyEvents", () => {
  it("birebir alıntıları kabul eder, sayfadaki linki korur", () => {
    const { accepted, rejected } = verifyEvents(
      [x({ title: "Kış Algoritma Kampı", titleQuote: "kış algoritma kampı 2027", startDate: "2027-01-25", dateQuote: "25 Ocak – 5 Şubat 2027", url: "https://ornek.org/etkinlik/kis-kampi" })],
      page,
      NOW,
    );
    expect(rejected).toEqual([]);
    expect(accepted[0].url).toBe("https://ornek.org/etkinlik/kis-kampi");
  });
  it("uydurma başlık veya tarihi reddeder", () => {
    const { accepted, rejected } = verifyEvents(
      [
        x({ title: "Hayali Zirve", titleQuote: "Hayali Zirve 2026", startDate: "2026-12-01", dateQuote: "1 Aralık" }),
        x({ title: "Yapay Zeka Hackathonu", titleQuote: "Yapay Zeka Hackathonu", startDate: "2026-11-14", dateQuote: "14 Kasım 2026 saat 10" }),
        x({ title: "Yapay Zeka Hackathonu", titleQuote: "Yapay Zeka Hackathonu", startDate: "2026-11-14" }),
      ],
      page,
      NOW,
    );
    expect(accepted).toEqual([]);
    expect(rejected.map((r) => r.reason)).toEqual([
      "başlık alıntısı sayfada bulunamadı",
      "tarih alıntısı sayfada bulunamadı",
      "tarih alıntısı sayfada bulunamadı",
    ]);
  });
  it("sayfada olmayan URL yerine sayfa adresini kullanır, saçma tarihleri reddeder", () => {
    const { accepted, rejected } = verifyEvents(
      [
        x({ title: "Yapay Zeka Hackathonu", titleQuote: "Yapay Zeka Hackathonu", startDate: "2026-11-14", dateQuote: "14-15 Kasım 2026", url: "https://baska.site/x" }),
        x({ title: "Yapay Zeka Hackathonu", titleQuote: "Yapay Zeka Hackathonu", startDate: "2031-11-14", dateQuote: "14-15 Kasım 2026" }),
        x({ title: "Yapay Zeka Hackathonu", titleQuote: "Yapay Zeka Hackathonu", startDate: "14.11.2026", dateQuote: "14-15 Kasım 2026" }),
      ],
      page,
      NOW,
    );
    expect(accepted.map((a) => a.url)).toEqual(["https://ornek.org/etkinlikler"]);
    expect(rejected).toHaveLength(2);
  });
});

describe("dedupe", () => {
  it("anahtar ve bulanık eşleşme", () => {
    expect(makeDedupeKey({ title: "İnzva Kış Kampı", startDate: "2027-01-25T10:00:00+03:00" })).toBe("inzva-kis-kampi|2027-01-25");
    expect(titleSimilarity("inzva Kış Algoritma Kampı 2027", "Kış Algoritma Kampı 2027 inzva")).toBe(1);
    expect(isSameEvent({ title: "inzva Kış Algoritma Kampı 2027", startDate: "2027-01-25" }, { title: "Kış Algoritma Kampı 2027 - inzva", startDate: "2027-01-26" })).toBe(true);
    expect(isSameEvent({ title: "Kış Algoritma Kampı", startDate: "2027-01-25" }, { title: "Kış Algoritma Kampı", startDate: "2027-01-28" })).toBe(false);
    expect(isSameEvent({ title: "Yapay Zeka Hackathonu", startDate: "2026-11-14" }, { title: "Siber Güvenlik Hackathonu", startDate: "2026-11-14" })).toBe(false);
  });
  it("benzersiz id üretir", () => {
    const taken = new Set(["kis-kampi-2027-01"]);
    expect(makeEventId({ title: "Kış Kampı", startDate: "2027-01-25" }, taken)).toBe("kis-kampi-2027-01-2");
  });
});

describe("mergeEvents", async () => {
  const existing = await readEvents(path.join(import.meta.dirname, "fixtures/sample-data"));
  const base = { source: { id: "inzva-events", category: "ceng" as const }, pageUrl: "https://inzva.com/events", existing, blocklist: { dedupeKeys: [], urls: [] }, now: "2026-10-04T19:00:00+03:00" };

  it("yeni etkinlik oluşturur", () => {
    const r = mergeEvents({ ...base, accepted: [x({ title: "Yeni Kamp", titleQuote: "Yeni Kamp", summary: "Özet", startDate: "2026-12-01", dateQuote: "1 Aralık" })] });
    expect(r.created).toHaveLength(1);
    expect(r.created[0]).toMatchObject({ id: "yeni-kamp-2026-12", origin: "scan", sourceId: "inzva-events", category: "ceng", dedupeKey: "yeni-kamp|2026-12-01" });
  });
  it("aynı etkinliği tekrar oluşturmaz; elle girilmiş kaydın alanlarını ezmez", () => {
    const r = mergeEvents({ ...base, accepted: [x({ title: "Örnek Kış Algoritma Kampı", titleQuote: "Örnek", summary: "BAŞKA ÖZET", startDate: "2027-01-25", url: "https://inzva.com/kis" })] });
    expect(r.created).toEqual([]);
    expect(r.updated).toHaveLength(1);
    expect(r.updated[0].summary).not.toBe("BAŞKA ÖZET");
    expect(r.updated[0].alsoSeenAt).toContain("https://inzva.com/kis");
    expect(r.updated[0].lastSeenAt).toBe(base.now);
  });
  it("kendi taradığı kaydı günceller ve iptali işler", () => {
    const first = mergeEvents({ ...base, accepted: [x({ title: "Seminer X", titleQuote: "Seminer X", summary: "a", startDate: "2026-11-01" })] });
    const second = mergeEvents({ ...base, existing: [...existing, ...first.created], accepted: [x({ title: "Seminer X", titleQuote: "Seminer X", summary: "b", startDate: "2026-11-01", cancelled: true })] });
    expect(second.updated[0]).toMatchObject({ id: first.created[0].id, summary: "b", status: "cancelled" });
  });
  it("engel listesindekileri reddeder; aynı partideki tekrarları birleştirir", () => {
    const r = mergeEvents({
      ...base,
      blocklist: { dedupeKeys: ["kotu-etkinlik|2026-11-01"], urls: [] },
      accepted: [
        x({ title: "Kötü Etkinlik", startDate: "2026-11-01" }),
        x({ title: "Çift Kayıt", startDate: "2026-11-02" }),
        x({ title: "Çift Kayıt", startDate: "2026-11-02" }),
      ],
    });
    expect(r.rejected).toEqual([{ title: "Kötü Etkinlik", reason: "engel listesinde" }]);
    expect(r.created).toHaveLength(1);
  });
});

describe("guards", () => {
  it("eşikler", () => {
    expect(tooManyErrors(4, 7)).toBe(true);
    expect(tooManyErrors(3, 7)).toBe(false);
    expect(tooManyErrors(1, 1)).toBe(false);
    expect(tooManyNewEvents(41)).toBe(true);
    expect(suspiciousDrop(5, 0)).toBe(true);
    expect(suspiciousDrop(2, 0)).toBe(false);
    expect(suspiciousDrop(5, 1)).toBe(false);
  });
});
