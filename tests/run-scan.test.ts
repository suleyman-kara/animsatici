import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runScan } from "../lib/scanner/run";
import { readEvents, readLastScan, readScanState, writeSource } from "../lib/store";
import { validateData } from "../scripts/validate";
import { fakeFetch, fakeLlm, tempDataRoot } from "./helpers";
import { rm, readdir } from "node:fs/promises";

const html = await readFile(path.join(import.meta.dirname, "fixtures/pages/events-listing.html"), "utf8");
const NOW = Date.parse("2026-10-04T19:00:00+03:00");
const now = () => NOW;

const gemini = {
  events: [
    { title: "Yapay Zeka Hackathonu", summary: "48 saatlik hackathon.", type: "hackathon", startDate: "2026-11-14", endDate: "2026-11-15", isAllDay: true, locationMode: "in-person", city: "İstanbul", url: "https://ornek.org/hackathon", tags: ["AI"], titleQuote: "Yapay Zeka Hackathonu", dateQuote: "14-15 Kasım 2026" },
    { title: "Uydurma Etkinlik", summary: "x", type: "camp", startDate: "2026-12-01", isAllDay: true, locationMode: "online", titleQuote: "Uydurma Etkinlik", dateQuote: "1 Aralık" },
  ],
};

async function oneSourceRoot() {
  const root = await tempDataRoot();
  for (const f of await readdir(path.join(root, "data/sources"))) if (f !== "inzva-events.json") await rm(path.join(root, "data/sources", f));
  for (const f of await readdir(path.join(root, "data/events"))) await rm(path.join(root, "data/events", f));
  await writeSource({ id: "inzva-events", title: "inzva", url: "https://inzva.com/events", category: "ceng", kind: "listing", active: true, render: "static" }, root);
  await rm(path.join(root, "data/state/scan-state.json"));
  return root;
}

describe("runScan", () => {
  it("kabul edilenleri yazar, uydurmayı reddeder, durumu kaydeder", async () => {
    const root = await oneSourceRoot();
    const llm = fakeLlm(gemini);
    const report = await runScan({ root, llm, now, fetchImpl: fakeFetch({ "https://inzva.com/events": { body: html } }) });

    expect(report.aborted).toBeUndefined();
    expect(report.created.map((e) => e.id)).toEqual(["yapay-zeka-hackathonu-2026-11"]);
    expect(report.lastScan.rejected).toEqual([{ sourceId: "inzva-events", title: "Uydurma Etkinlik", reason: "başlık alıntısı sayfada bulunamadı" }]);
    expect(llm.calls[0].prompt).toContain("Bugünün tarihi (Türkiye): 2026-10-04");

    const events = await readEvents(root);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ url: "https://ornek.org/hackathon", origin: "scan", firstSeenAt: "2026-10-04T19:00:00+03:00" });
    const state = await readScanState(root);
    expect(state["inzva-events"]).toMatchObject({ lastStatus: "success", lastEventCount: 2, httpStatus: 200 }); // ham çıkarım sayısı
    expect((await readLastScan(root))?.status).toBe("success");
    expect(await validateData(root)).toEqual([]);

    // İkinci tarama: sayfa değişmedi → Gemini çağrılmaz
    const llm2 = fakeLlm();
    const second = await runScan({ root, llm: llm2, now, fetchImpl: fakeFetch({ "https://inzva.com/events": { body: html } }) });
    expect(llm2.calls).toHaveLength(0);
    expect(second.outcomes[0].kind).toBe("unchanged");
    expect((await readScanState(root))["inzva-events"].lastEventCount).toBe(2);
  });

  it("dry-run hiçbir şey yazmaz", async () => {
    const root = await oneSourceRoot();
    const report = await runScan({ root, llm: fakeLlm(gemini), now, dryRun: true, fetchImpl: fakeFetch({ "https://inzva.com/events": { body: html } }) });
    expect(report.created).toHaveLength(1);
    expect(await readEvents(root)).toEqual([]);
    expect(await readLastScan(root)).toMatchObject({ status: "partial" }); // fixture'daki eski dosya değişmedi
  });

  it("kaynakların çoğu hata verirse durur ve yazmaz", async () => {
    const root = await tempDataRoot();
    const before = await readFile(path.join(root, "data/state/scan-state.json"), "utf8");
    const report = await runScan({ root, llm: fakeLlm(), now, fetchImpl: fakeFetch({}) });
    expect(report.aborted).toMatch(/hata verdi \(7\/7\)/);
    expect(await readFile(path.join(root, "data/state/scan-state.json"), "utf8")).toBe(before);
  });

  it("tek kaynak hatası diğerlerini durdurmaz; HTTP durumunu kaydeder", async () => {
    const root = await oneSourceRoot();
    await writeSource({ id: "gdg-turkiye", title: "GDG", url: "https://gdg.community.dev", category: "community", kind: "listing", active: true, render: "static" }, root);
    await writeSource({ id: "baykar-kariyer", title: "Baykar", url: "https://kariyer.baykartech.com", category: "career", kind: "listing", active: true, render: "static" }, root);
    const report = await runScan({
      root,
      llm: fakeLlm(gemini, { events: [] }),
      now,
      fetchImpl: fakeFetch({ "https://inzva.com/events": { body: html }, "https://gdg.community.dev": { body: "<p>boş</p>" }, "https://kariyer.baykartech.com": { status: 403, body: "no" } }),
    });
    expect(report.aborted).toBeUndefined();
    expect(report.lastScan.status).toBe("partial");
    const state = await readScanState(root);
    expect(state["baykar-kariyer"]).toMatchObject({ lastStatus: "error", httpStatus: 403 });
  });

  it("önceden etkinlik veren kaynak sıfır verirse atlar ve hash'i güncellemez", async () => {
    const root = await oneSourceRoot();
    const fetchImpl = fakeFetch({ "https://inzva.com/events": { body: html } });
    await runScan({ root, llm: fakeLlm({ events: [...gemini.events, ...gemini.events, ...gemini.events].map((e, i) => ({ ...e, titleQuote: ["Yapay Zeka Hackathonu", "Kış Algoritma Kampı 2027", "Veri Bilimi Semineri"][i % 3], title: `E${i}`, dateQuote: "14-15 Kasım 2026" })) }), now, fetchImpl });
    const prev = (await readScanState(root))["inzva-events"];
    expect(prev.lastEventCount).toBeGreaterThanOrEqual(3);
    const report = await runScan({ root, llm: fakeLlm({ events: [] }), now, force: true, fetchImpl });
    expect(report.lastScan.warnings[0]).toMatch(/sayfa yapısı değişmiş olabilir/);
    const after = (await readScanState(root))["inzva-events"];
    expect(after).toMatchObject({ lastStatus: "skipped", hash: prev.hash, lastEventCount: prev.lastEventCount });
  });
});
