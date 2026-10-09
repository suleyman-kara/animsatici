import { describe, expect, it } from "vitest";
import { checkUrl, describeFetchError, formatReport, isPublicHttpUrl } from "../scripts/check-sources";
import { fakeFetch, makeSource } from "./helpers";

const page = (status = 200) => () => new Response("<html></html>", { status });
const robots = (text: string) => () => new Response(text, { status: 200 });

describe("kaynak kontrolü", () => {
  it("açılan ve robots.txt'nin izin verdiği sayfa sorunsuz", async () => {
    const result = await checkUrl("https://ornek.org/etkinlikler", {
      fetchImpl: fakeFetch({ "https://ornek.org/etkinlikler": page(), "https://ornek.org/robots.txt": robots("User-agent: *\nDisallow: /admin") }),
    });
    expect(result).toMatchObject({ httpStatus: 200, blockedFor: [], errors: [], warnings: [], notes: [] });
  });

  it("açılmayan sayfayı hata, robots.txt'si olmayan siteyi izinli sayar", async () => {
    const result = await checkUrl("https://ornek.org/yok", {
      fetchImpl: fakeFetch({ "https://ornek.org/yok": page(404), "https://ornek.org/robots.txt": () => new Response("", { status: 404 }) }),
    });
    expect(result.errors).toEqual(["Sayfa HTTP 404 döndürüyor."]);
    expect(result.blockedFor).toEqual([]);
  });

  it("yapay zeka tarayıcılarını engelleyen siteyi uyarır", async () => {
    const fetchImpl = fakeFetch({
      "https://ornek.org/e": page(),
      "https://ornek.org/robots.txt": robots("User-agent: ClaudeBot\nDisallow: /\n\nUser-agent: *\nAllow: /"),
    });
    const result = await checkUrl("https://ornek.org/e", { fetchImpl });
    expect(result.blockedFor).toEqual(["ClaudeBot"]);
    expect(result.warnings[0]).toMatch(/ClaudeBot/);

    // aiFetch zaten false ise uyarı gerekmez
    const closed = await checkUrl("https://ornek.org/e", { fetchImpl, source: makeSource({ aiFetch: false, aiFetchNote: "x" }) });
    expect(closed.warnings).toEqual([]);
  });

  it("tüm tarayıcıları engelleyen site için aiFetch false önerir", async () => {
    const result = await checkUrl("https://ornek.org/e", {
      fetchImpl: fakeFetch({ "https://ornek.org/e": page(), "https://ornek.org/robots.txt": robots("User-agent: *\nDisallow: /") }),
    });
    expect(result.warnings).toEqual(["robots.txt tüm tarayıcıları engelliyor; aiFetch false yapılmalı."]);
  });

  it("otomatik istekleri engelleyen siteyi uyarır; yalnızca link kaynakta not düşer", async () => {
    const fetchImpl = fakeFetch({ "https://ornek.org/e": page(403), "https://ornek.org/robots.txt": robots("") });
    const open = await checkUrl("https://ornek.org/e", { fetchImpl });
    expect(open.errors).toEqual([]);
    expect(open.warnings[0]).toMatch(/HTTP 403.*aiFetch false/);

    const closed = await checkUrl("https://ornek.org/e", { fetchImpl, source: makeSource({ aiFetch: false, aiFetchNote: "x" }) });
    expect(closed.errors).toEqual([]);
    expect(closed.warnings).toEqual([]);
    expect(closed.notes[0]).toMatch(/HTTP 403/);
  });

  it("ulaşılamayan sayfada hatanın nedenini yazar", async () => {
    const failing = (async () => {
      throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
    }) as typeof fetch;
    const result = await checkUrl("https://yok.example/e", { fetchImpl: failing });
    expect(result.errors).toEqual(["Sayfaya ulaşılamadı (fetch failed: ENOTFOUND)."]);
    expect(result.warnings).toEqual(["robots.txt okunamadı."]);

    const closed = await checkUrl("https://yok.example/e", { fetchImpl: failing, source: makeSource({ aiFetch: false, aiFetchNote: "x" }) });
    expect(closed.errors).toEqual([]);
    expect(closed.notes).toEqual(["Sayfaya ulaşılamadı (fetch failed: ENOTFOUND).", "robots.txt okunamadı."]);
    expect(describeFetchError(Object.assign(new Error("x"), { name: "TimeoutError" }))).toBe("zaman aşımı");
  });

  it("yerel ağ adreslerine istek atmaz", async () => {
    for (const url of ["http://localhost:3000", "http://127.0.0.1/", "http://[::1]/", "http://10.0.0.5/x", "file:///etc/passwd", "kopuk"]) {
      expect(isPublicHttpUrl(url), url).toBe(false);
    }
    const result = await checkUrl("http://169.254.169.254/latest", { fetchImpl: fakeFetch({}) });
    expect(result.errors[0]).toMatch(/herkese açık/);
  });

  it("raporu Markdown olarak yazar", () => {
    const report = formatReport("Başlık", [
      { url: "https://a.org", sourceId: "a", httpStatus: 200, blockedFor: [], errors: [], warnings: [], notes: [] },
      { url: "https://b.org", httpStatus: 500, errors: ["Sayfa HTTP 500 döndürüyor."], warnings: [], notes: [] },
      { url: "https://c.org", httpStatus: 403, errors: [], warnings: [], notes: ["Engelli."] },
    ]);
    expect(report).toBe(
      ["## Başlık", "", "- ✅ `a` https://a.org (HTTP 200)", "- ❌ https://b.org (HTTP 500)", "  - Sayfa HTTP 500 döndürüyor.", "- ℹ️ https://c.org (HTTP 403)", "  - Engelli."].join("\n"),
    );
  });
});
