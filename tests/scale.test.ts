import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createLimiter, limitLlm, suggestedDelayMs, withRetry } from "../lib/llm";
import { Event } from "../lib/schema";
import { followDetailPages } from "../lib/scanner/details";
import { extractEvents, splitText } from "../lib/scanner/extract";
import { fetchPage } from "../lib/scanner/fetch";
import { mergeEvents } from "../lib/scanner/merge";
import { runScan } from "../lib/scanner/run";
import { orderedEndDate, verifyEvents } from "../lib/scanner/verify";
import { ExtractedEvent } from "../lib/scanner/extract";
import { readEvents, readLastScan, readScanState, writeScanState, writeSource } from "../lib/store";
import { fakeFetch, fakeLlm, tempDataRoot } from "./helpers";

const html = await readFile(path.join(import.meta.dirname, "fixtures/pages/events-listing.html"), "utf8");
const NOW = Date.parse("2026-10-20T19:00:00+03:00");
const now = () => NOW;
const hackathon = { title: "Yapay Zeka Hackathonu", summary: "48 saatlik hackathon.", type: "hackathon", startDate: "2026-11-14", endDate: "2026-11-15", isAllDay: true, locationMode: "in-person", url: "https://ornek.org/hackathon", tags: [], titleQuote: "Yapay Zeka Hackathonu", dateQuote: "14-15 Kasım 2026" };
const INZVA = { id: "inzva-events", title: "inzva", url: "https://inzva.com/events", category: "ceng" as const, kind: "listing" as const, active: true, render: "static" as const };

async function root(keepEvents = false) {
  const dir = await tempDataRoot();
  for (const f of await readdir(path.join(dir, "data/sources"))) await rm(path.join(dir, "data/sources", f));
  if (!keepEvents) for (const f of await readdir(path.join(dir, "data/events"))) await rm(path.join(dir, "data/events", f));
  await writeSource(INZVA, dir);
  await rm(path.join(dir, "data/state/scan-state.json"));
  return dir;
}

describe("tarih aralığı", () => {
  it("saatli başlangıç + aynı günün tarih-only bitişi geçerli", () => {
    expect(orderedEndDate("2026-11-14T10:00:00+03:00", "2026-11-14")).toBe("2026-11-14");
    const page = { text: "DevFest 2026\n14 Kasım 2026 10:00", links: [], finalUrl: "https://x.example" };
    const e = ExtractedEvent.parse({ title: "DevFest 2026", titleQuote: "DevFest 2026", dateQuote: "14 Kasım 2026 10:00", startDate: "2026-11-14T10:00:00+03:00", endDate: "2026-11-14", isAllDay: false });
    expect(verifyEvents([e], page, NOW).accepted).toHaveLength(1);
  });

  it("şema da aynı aralığı kabul eder", async () => {
    const [sample] = await readEvents(path.join(import.meta.dirname, "fixtures/sample-data"));
    expect(Event.safeParse({ ...sample, startDate: "2026-11-14T10:00:00+03:00", endDate: "2026-11-14" }).success).toBe(true);
    expect(Event.safeParse({ ...sample, startDate: "2026-11-14T10:00:00+03:00", endDate: "2026-11-13" }).success).toBe(false);
  });
});

describe("Gemini çağrıları", () => {
  it("önerilen bekleme süresini okur", () => {
    expect(suggestedDelayMs(new Error('429 RESOURCE_EXHAUSTED {"retryDelay":"37s"}'))).toBe(37_000);
    expect(suggestedDelayMs(new Error("Please retry in 2.5s"))).toBe(2_500);
    expect(suggestedDelayMs(new Error('"retryDelay":"600s"'))).toBe(60_000);
    expect(suggestedDelayMs(new Error("başka"))).toBeUndefined();
  });

  it("kota hatasında önerilen kadar bekleyip yeniden dener", async () => {
    const waits: number[] = [];
    let n = 0;
    const result = await withRetry(
      async () => {
        if (n++ < 2) throw Object.assign(new Error('{"retryDelay":"7s"}'), { status: 429 });
        return "ok";
      },
      5,
      async (ms) => waits.push(ms),
    );
    expect(result).toBe("ok");
    expect(waits).toEqual([7000, 7000]);
  });

  it("kalıcı hatada yeniden denemez", async () => {
    let n = 0;
    await expect(withRetry(async () => { n++; throw Object.assign(new Error("bad"), { status: 400 }); }, 5, async () => {})).rejects.toThrow("bad");
    expect(n).toBe(1);
  });

  it("eşzamanlılık sınırını aşmaz", async () => {
    let active = 0;
    let peak = 0;
    const run = createLimiter(2);
    await Promise.all(Array.from({ length: 6 }, () => run(async () => {
      peak = Math.max(peak, ++active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
    })));
    expect(peak).toBe(2);

    let llmActive = 0;
    let llmPeak = 0;
    const llm = limitLlm({ async generateJson() { llmPeak = Math.max(llmPeak, ++llmActive); await new Promise((r) => setTimeout(r, 5)); llmActive--; return {}; } }, 3);
    await Promise.all(Array.from({ length: 9 }, () => llm.generateJson({ system: "", prompt: "", schema: {} })));
    expect(llmPeak).toBe(3);
  });
});

describe("uzun sayfa", () => {
  it("metni satır sınırından böler, her parçayı ayrı çıkarır", async () => {
    const lines = Array.from({ length: 30 }, (_, i) => `satır ${i} ${"x".repeat(1000)}`);
    expect(splitText(lines.join("\n"), 10_000).every((c) => c.length <= 10_000)).toBe(true);
    expect(splitText("y".repeat(25), 10)).toEqual(["y".repeat(10), "y".repeat(10), "y".repeat(5)]);

    const llm = fakeLlm({ events: [hackathon] }, { events: [{ ...hackathon, title: "İkinci" }] });
    const page = { finalUrl: "https://x.example", title: "", links: [], text: `${"a".repeat(19_990)}\n${"b".repeat(100)}` };
    const { events } = await extractEvents(llm, { page, now: NOW });
    expect(llm.calls).toHaveLength(2);
    expect(llm.calls[1].prompt).toContain("PARÇA 2/2");
    expect(events.map((e) => e.title)).toEqual(["Yapay Zeka Hackathonu", "İkinci"]);
  });
});

describe("sayfa çekme", () => {
  it("geçici hatada bir kez daha dener, kalıcı hatada denemez", async () => {
    let calls = 0;
    const flaky = (async () => {
      calls++;
      return calls === 1 ? new Response("x", { status: 503 }) : new Response("<p>tamam</p>", { headers: { "content-type": "text/html" } });
    }) as unknown as typeof fetch;
    expect((await fetchPage("https://x.example", { fetchImpl: flaky, retryDelayMs: 0 })).text).toBe("tamam");
    expect(calls).toBe(2);

    calls = 0;
    const missing = (async () => { calls++; return new Response("x", { status: 404 }); }) as unknown as typeof fetch;
    await expect(fetchPage("https://x.example", { fetchImpl: missing, retryDelayMs: 0 })).rejects.toThrow("404");
    expect(calls).toBe(1);
  });
});

describe("detay sayfası", () => {
  it("Gemini hatası sayfayı sonuçsuz saymaz", async () => {
    const DETAIL = "https://ornek.org/etkinlik/kis-kampi";
    const r = await followDetailPages({
      rejected: [{ title: "Kış Kampı", reason: "tarih bilgisi yok", detailUrl: DETAIL }],
      llm: fakeLlm(Object.assign(new Error("RESOURCE_EXHAUSTED"), { status: 429 })),
      source: { id: "inzva-events", title: "inzva", category: "ceng" },
      now: NOW,
      fetchImpl: fakeFetch({ [DETAIL]: { body: "<p>Kış Kampı</p>" } }),
    });
    expect(r.failed).toBe(1);
    expect(r.deadDetails).toEqual({});
    expect(r.rejected[0].reason).toMatch(/çıkarılamadı/);
  });
});

describe("eşleştirme ipucu", () => {
  it("modelin yanlış ipucunu yok sayar, başka etkinliğin tarihlerini ezmez", async () => {
    const existing = await readEvents(path.join(import.meta.dirname, "fixtures/sample-data"));
    const target = existing.find((e) => e.id === "ornek-yaz-staji-programi-2026-12")!;
    const r = mergeEvents({
      source: { id: target.sourceId!, category: "ceng" },
      pageUrl: "https://x.example",
      accepted: [ExtractedEvent.parse({ title: "Tamamen Başka Kamp", titleQuote: "Tamamen Başka Kamp", startDate: "2026-11-02", matchesExistingId: target.id })],
      existing: existing.map((e) => (e.id === target.id ? { ...e, origin: "scan" as const } : e)),
      blocklist: { dedupeKeys: [], urls: [] },
      now: "2026-10-20T19:00:00+03:00",
    });
    expect(r.updated).toEqual([]);
    expect(r.created.map((e) => e.title)).toEqual(["Tamamen Başka Kamp"]);
  });
});

describe("runScan ölçek", () => {
  it("süre bütçesi dolunca kalan kaynakları erteler, durumlarına dokunmaz", async () => {
    const dir = await root();
    await writeSource({ ...INZVA, id: "ikinci", url: "https://ikinci.example" }, dir);
    let t = NOW;
    const clock = () => (t += 60_000); // her okumada bir dakika geçer
    const report = await runScan({ root: dir, llm: fakeLlm({ events: [hackathon] }), now: clock, budgetMs: 30_000, fetchImpl: fakeFetch({}) });
    expect(report.outcomes.every((o) => o.kind === "deferred")).toBe(true);
    expect(report.lastScan).toMatchObject({ deferredCount: 2, totalSources: 0 });
    expect(await readScanState(dir)).toEqual({});
  });

  it("en uzun süredir taranmayan kaynak önce taranır", async () => {
    const dir = await root();
    await writeSource({ ...INZVA, id: "aaa-yeni", url: "https://aaa.example" }, dir);
    await writeScanState({ "inzva-events": { lastCheckedAt: "2026-10-19T19:00:00+03:00", lastStatus: "success" }, "aaa-yeni": { lastCheckedAt: "2026-10-10T19:00:00+03:00", lastStatus: "success" } }, dir);
    const report = await runScan({ root: dir, llm: fakeLlm(), now, dryRun: true, fetchImpl: fakeFetch({}) });
    expect(report.outcomes.map((o) => o.sourceId)).toEqual(["aaa-yeni", "inzva-events"]);
  });

  it("olağandışı çok yeni etkinlik getiren kaynağı atlar, taramayı durdurmaz", async () => {
    const dir = await root();
    await writeScanState({ "inzva-events": { lastCheckedAt: "2026-10-19T19:00:00+03:00", lastStatus: "success", hash: "eski", lastEventCount: 2 } }, dir);
    const many = Array.from({ length: 26 }, (_, i) => ({ ...hackathon, title: `Hackathon Takim${i}`, endDate: undefined, startDate: `2026-11-${String(i + 1).padStart(2, "0")}` }));
    const report = await runScan({ root: dir, llm: fakeLlm({ events: many }), now, fetchImpl: fakeFetch({ "https://inzva.com/events": { body: html } }) });
    expect(report.aborted).toBeUndefined();
    expect(report.created).toEqual([]);
    expect(report.outcomes[0].kind).toBe("skipped");
    expect(await readEvents(dir)).toEqual([]);
    expect((await readScanState(dir))["inzva-events"]).toMatchObject({ lastStatus: "skipped", hash: "eski", lastEventCount: 2 });
  });

  it("saklama süresi geçen etkinlikleri siler; güncelleri ve sponsorluları tutar", async () => {
    const dir = await root(true);
    const before = (await readEvents(dir)).map((e) => e.id);
    const LATER = Date.parse("2026-11-20T19:00:00+03:00"); // kesim: 21 Ekim
    const report = await runScan({ root: dir, llm: fakeLlm(), now: () => LATER, fetchImpl: fakeFetch({}) });
    const removed = report.removed.map((e) => e.id).sort();
    expect(removed).toEqual(["ornek-devfest-konferansi-2026-10", "ornek-iptal-edilen-seminer-2026-10", "ornek-kismi-zamanli-ogrenci-ilani-2026-09"]);
    const after = (await readEvents(dir)).map((e) => e.id);
    expect(after).toEqual(before.filter((id) => !removed.includes(id)));
    expect(after).toContain("ornek-yapay-zeka-hackathonu-2026-11"); // sponsorlu
    expect((await readLastScan(dir))?.removedEvents).toBe(3);
  });
});
