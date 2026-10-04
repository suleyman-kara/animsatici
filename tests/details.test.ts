import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { followDetailPages } from "../lib/scanner/details";
import { cleanHtml } from "../lib/scanner/fetch";
import { ExtractedEvent } from "../lib/scanner/extract";
import { verifyEvents } from "../lib/scanner/verify";
import { runScan } from "../lib/scanner/run";
import { readEvents, writeSource } from "../lib/store";
import { fakeFetch, fakeLlm, tempDataRoot } from "./helpers";
import { readdir, rm } from "node:fs/promises";

const fixture = (name: string) => readFile(path.join(import.meta.dirname, "fixtures/pages", name), "utf8");
const listingHtml = await fixture("events-listing.html");
const detailHtml = await fixture("event-detail.html");
const LISTING = "https://ornek.org/etkinlikler";
const DETAIL = "https://ornek.org/etkinlik/kis-kampi";
const NOW = Date.parse("2026-10-04T19:00:00+03:00");
const listing = { ...cleanHtml(listingHtml, LISTING), finalUrl: LISTING };
const source = { id: "inzva-events", title: "inzva", category: "ceng" as const };

const undatedKamp = { title: "Kış Algoritma Kampı 2027", summary: "Kamp.", type: "camp", isAllDay: true, locationMode: "online", titleQuote: "Kış Algoritma Kampı 2027", url: DETAIL };
const detailResponse = {
  events: [
    { title: "Kış Algoritma Kampı 2027", summary: "İki haftalık algoritma kampı.", type: "camp", startDate: "2027-01-25", endDate: "2027-02-05", deadline: "2026-10-07", isAllDay: true, locationMode: "online", titleQuote: "Kış Algoritma Kampı 2027", dateQuote: "Kamp tarihleri: 25 Ocak - 5 Şubat 2027", url: "https://forms.example.com/basvuru" },
  ],
};

describe("verifyEvents detay linki", () => {
  it("tarihi olmayan ama kendi sayfası linklenmiş etkinliğe detailUrl ekler", () => {
    const { rejected } = verifyEvents(
      [
        ExtractedEvent.parse(undatedKamp),
        ExtractedEvent.parse({ ...undatedKamp, url: "https://baska.site/x" }), // sayfada olmayan link
        ExtractedEvent.parse({ ...undatedKamp, url: LISTING }), // liste sayfasının kendisi
        ExtractedEvent.parse({ ...undatedKamp, titleQuote: "Uydurma Kamp" }), // başlık uydurma → izlenmez
      ],
      listing,
      NOW,
    );
    expect(rejected.map((r) => r.detailUrl)).toEqual([DETAIL, undefined, undefined, undefined]);
  });
});

describe("followDetailPages", () => {
  it("detay sayfasından tarihleri kanıtla alır", async () => {
    const r = await followDetailPages({
      rejected: [{ title: "Kış Algoritma Kampı 2027", reason: "tarih bilgisi yok", detailUrl: DETAIL }],
      llm: fakeLlm(detailResponse),
      source,
      now: NOW,
      fetchImpl: fakeFetch({ [DETAIL]: { body: detailHtml } }),
    });
    expect(r.pagesFetched).toBe(1);
    expect(r.rejected).toEqual([]);
    expect(r.accepted[0]).toMatchObject({ startDate: "2027-01-25", url: DETAIL, evidenceUrl: DETAIL });
  });

  it("detay sayfasında da doğrulanamazsa veya başka etkinlik bulunursa reddeder", async () => {
    const r = await followDetailPages({
      rejected: [
        { title: "Kış Algoritma Kampı 2027", reason: "tarih bilgisi yok", detailUrl: DETAIL },
        { title: "Başka Etkinlik", reason: "tarih bilgisi yok", detailUrl: "https://ornek.org/yok" },
        { title: "Linksiz", reason: "tarih bilgisi yok" },
      ],
      llm: fakeLlm({ events: [{ ...detailResponse.events[0], title: "Bahar Kampı", titleQuote: "Bahar Kampı" }] }),
      source,
      now: NOW,
      fetchImpl: fakeFetch({ [DETAIL]: { body: detailHtml } }),
    });
    expect(r.accepted).toEqual([]);
    expect(r.rejected.map((x) => x.reason)).toEqual([
      "tarih bilgisi yok; detay sayfasında da doğrulanamadı",
      expect.stringMatching(/detay sayfası çekilemedi/),
      "tarih bilgisi yok",
    ]);
    expect(r.rejected.every((x) => !("detailUrl" in x))).toBe(true);
  });

  it("kaynak başına sınırı aşmaz", async () => {
    const rejected = Array.from({ length: 4 }, (_, i) => ({ title: `E${i}`, reason: "tarih bilgisi yok", detailUrl: `https://ornek.org/e${i}` }));
    const r = await followDetailPages({ rejected, llm: fakeLlm(), source, now: NOW, fetchImpl: fakeFetch({}), limit: 2 });
    expect(r.pagesFetched).toBe(2);
    expect(r.rejected.filter((x) => x.reason.includes("sınırı aşıldı"))).toHaveLength(2);
  });
});

describe("runScan + detay sayfası", () => {
  it("liste sayfasında tarihi olmayan etkinliği detay sayfasından ekler", async () => {
    const root = await tempDataRoot();
    for (const f of await readdir(path.join(root, "data/sources"))) await rm(path.join(root, "data/sources", f));
    for (const f of await readdir(path.join(root, "data/events"))) await rm(path.join(root, "data/events", f));
    await rm(path.join(root, "data/state/scan-state.json"));
    await writeSource({ id: "inzva-events", title: "inzva", url: LISTING, category: "ceng", kind: "listing", active: true, render: "static" }, root);

    const report = await runScan({
      root,
      llm: fakeLlm({ events: [undatedKamp] }, detailResponse),
      now: () => NOW,
      fetchImpl: fakeFetch({ [LISTING]: { body: listingHtml }, [DETAIL]: { body: detailHtml } }),
    });
    expect(report.lastScan.rejected).toEqual([]);
    const [event] = await readEvents(root);
    expect(event).toMatchObject({
      id: "kis-algoritma-kampi-2027-2027-01",
      url: DETAIL,
      deadline: "2026-10-07",
      evidence: { pageUrl: DETAIL, dateQuote: "Kamp tarihleri: 25 Ocak - 5 Şubat 2027" },
    });
  });
});
