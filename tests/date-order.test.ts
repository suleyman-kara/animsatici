import path from "node:path";
import { readdir, rm } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { followDetailPages } from "../lib/scanner/details";
import { ExtractedEvent } from "../lib/scanner/extract";
import { mergeEvents } from "../lib/scanner/merge";
import { runScan } from "../lib/scanner/run";
import { orderedEndDate, verifyEvents } from "../lib/scanner/verify";
import { readEvents, writeSource } from "../lib/store";
import { fakeFetch, fakeLlm, tempDataRoot } from "./helpers";

const NOW = Date.parse("2026-10-04T19:00:00+03:00");
const PAGE_URL = "https://ornek.org/etkinlikler";
const page = {
  finalUrl: PAGE_URL,
  links: [],
  text: "Kış Kampı\n28 Aralık 2026 - 3 Ocak\nYaz Kampı\n10 Temmuz - 2 Temmuz\nBahar Kampı\nBitiş: 5 Mayıs\nGüz Kampı\n12 Ekim 2026",
};
const x = (over: Record<string, unknown>) => ExtractedEvent.parse({ summary: "s", isAllDay: true, locationMode: "online", ...over });

describe("orderedEndDate", () => {
  it("sıralı aralığı değiştirmez", () => expect(orderedEndDate("2026-11-14", "2026-11-15")).toBe("2026-11-15"));
  it("yıl dönen aralığı düzeltir", () => expect(orderedEndDate("2026-12-28", "2026-01-03")).toBe("2027-01-03"));
  it("saatli tarihlerde de çalışır", () =>
    expect(orderedEndDate("2026-12-31T20:00:00+03:00", "2026-01-01T02:00:00+03:00")).toBe("2027-01-01T02:00:00+03:00"));
  it("düzeltilemeyen ters aralık için null", () => expect(orderedEndDate("2026-07-10", "2026-07-02")).toBeNull());
  it("eksik tarihlerde dokunmaz", () => {
    expect(orderedEndDate(undefined, "2026-07-02")).toBe("2026-07-02");
    expect(orderedEndDate("2026-07-02", undefined)).toBeUndefined();
  });
});

describe("verifyEvents tarih sırası", () => {
  it("ters aralığı düzeltir ya da reddeder; yalnız bitiş tarihi olanı reddeder", () => {
    const { accepted, rejected } = verifyEvents(
      [
        x({ title: "Kış Kampı", titleQuote: "Kış Kampı", startDate: "2026-12-28", endDate: "2026-01-03", dateQuote: "28 Aralık 2026 - 3 Ocak" }),
        x({ title: "Yaz Kampı", titleQuote: "Yaz Kampı", startDate: "2027-07-10", endDate: "2027-07-02", dateQuote: "10 Temmuz - 2 Temmuz" }),
        x({ title: "Bahar Kampı", titleQuote: "Bahar Kampı", endDate: "2027-05-05", dateQuote: "Bitiş: 5 Mayıs" }),
        x({ title: "Güz Kampı", titleQuote: "Güz Kampı", startDate: "2026-10-12", dateQuote: "12 Ekim 2026" }),
      ],
      page,
      NOW,
    );
    expect(accepted.map((a) => [a.title, a.endDate])).toEqual([
      ["Kış Kampı", "2027-01-03"],
      ["Güz Kampı", undefined],
    ]);
    expect(rejected.map((r) => r.reason)).toEqual([expect.stringMatching(/bitiş tarihi başlangıçtan önce/), "tarih bilgisi yok"]);
  });
});

describe("mergeEvents geçersiz kayıt", () => {
  it("şemaya uymayan kaydı reddeder, diğerlerini ekler, hata fırlatmaz", () => {
    const r = mergeEvents({
      source: { id: "inzva-events", category: "ceng" },
      pageUrl: PAGE_URL,
      existing: [],
      blocklist: { dedupeKeys: [], urls: [] },
      now: "2026-10-04T19:00:00+03:00",
      accepted: [
        x({ title: "Ters", titleQuote: "Ters", startDate: "2026-12-10", endDate: "2026-12-01" }),
        x({ title: "Düzgün", titleQuote: "Düzgün", startDate: "2026-12-10" }),
      ],
    });
    expect(r.created.map((e) => e.title)).toEqual(["Düzgün"]);
    expect(r.rejected).toEqual([{ title: "Ters", reason: "geçersiz kayıt: endDate, startDate'ten önce olamaz" }]);
  });
});

describe("followDetailPages bilinen etkinlik", () => {
  it("bu kaynaktan zaten bilinen etkinliğin detay sayfasını tekrar çekmez", async () => {
    const r = await followDetailPages({
      rejected: [{ title: "Kış Algoritma Kampı 2027", reason: "tarih bilgisi yok", detailUrl: "https://ornek.org/kis" }],
      knownEvents: [{ id: "kis", title: "Kış Algoritma Kampı 2027", startDate: "2027-01-25" }],
      llm: fakeLlm(),
      source: { id: "inzva-events", title: "inzva", category: "ceng" },
      now: NOW,
      fetchImpl: fakeFetch({}),
    });
    expect(r).toMatchObject({ pagesFetched: 0, skippedKnown: 1, rejected: [], accepted: [] });
  });
});

describe("runScan geçersiz kayıtla", () => {
  it("taramayı düşürmez; geçerli etkinlikleri yazar", async () => {
    const root = await tempDataRoot();
    for (const f of await readdir(path.join(root, "data/sources"))) await rm(path.join(root, "data/sources", f));
    for (const f of await readdir(path.join(root, "data/events"))) await rm(path.join(root, "data/events", f));
    await rm(path.join(root, "data/state/scan-state.json"));
    await writeSource({ id: "inzva-events", title: "inzva", url: PAGE_URL, category: "ceng", kind: "listing", active: true, render: "static" }, root);
    const html = `<main>${page.text.split("\n").map((l) => `<p>${l}</p>`).join("")}</main>`;
    const report = await runScan({
      root,
      llm: fakeLlm({
        events: [
          { title: "Yaz Kampı", summary: "s", type: "camp", isAllDay: true, locationMode: "online", titleQuote: "Yaz Kampı", startDate: "2027-07-10", endDate: "2027-07-02", dateQuote: "10 Temmuz - 2 Temmuz" },
          { title: "Güz Kampı", summary: "s", type: "camp", isAllDay: true, locationMode: "online", titleQuote: "Güz Kampı", startDate: "2026-10-12", dateQuote: "12 Ekim 2026" },
        ],
      }),
      now: () => NOW,
      fetchImpl: fakeFetch({ [PAGE_URL]: { body: html } }),
    });
    expect(report.aborted).toBeUndefined();
    expect((await readEvents(root)).map((e) => e.title)).toEqual(["Güz Kampı"]);
    expect(report.lastScan.rejected).toHaveLength(1);
  });
});

describe("runScan bitmiş ilanlar", () => {
  it("tüm ilanları bitmiş bir kaynak 'sayfa bozuldu' sayılıp atlanmaz", async () => {
    const root = await tempDataRoot();
    for (const f of await readdir(path.join(root, "data/sources"))) await rm(path.join(root, "data/sources", f));
    for (const f of await readdir(path.join(root, "data/events"))) await rm(path.join(root, "data/events", f));
    await rm(path.join(root, "data/state/scan-state.json"));
    await writeSource({ id: "inzva-events", title: "inzva", url: PAGE_URL, category: "ceng", kind: "listing", active: true, render: "static" }, root);
    const html = "<main><p>Eski Kamp</p><p>Son başvuru: 31 Ağustos 2026</p><p>Eski Yarışma</p><p>Son başvuru: 1 Eylül 2026</p><p>Eski Seminer</p><p>2 Eylül 2026</p></main>";
    const old = (title: string, deadline: string, dateQuote: string) => ({ title, summary: "s", type: "other", isAllDay: true, locationMode: "online", titleQuote: title, deadline, dateQuote });
    const response = { events: [old("Eski Kamp", "2026-08-31", "Son başvuru: 31 Ağustos 2026"), old("Eski Yarışma", "2026-09-01", "Son başvuru: 1 Eylül 2026"), old("Eski Seminer", "2026-09-02", "2 Eylül 2026")] };
    const fetchImpl = fakeFetch({ [PAGE_URL]: { body: html } });
    await runScan({ root, llm: fakeLlm(response), now: () => NOW, fetchImpl });
    const second = await runScan({ root, llm: fakeLlm(response), now: () => NOW, fetchImpl, force: true });
    expect(second.lastScan.warnings).toEqual([]);
    expect(second.outcomes[0].kind).toBe("extracted");
    expect(await readEvents(root)).toEqual([]);
  });
});
