import { afterEach, describe, expect, it, vi } from "vitest";
import { buildIssue, parseIssueBody, SuggestionPayload } from "../lib/suggestion";
import { POST } from "../app/api/oneri/route";

describe("buildIssue / parseIssueBody", () => {
  it("gidiş-dönüş", () => {
    const payload = SuggestionPayload.parse({ type: "missing", text: "inzva kış kampı eksik", url: "" });
    expect(payload).toEqual({ type: "missing", text: "inzva kış kampı eksik", url: undefined });
    const issue = buildIssue(payload);
    expect(issue.labels).toEqual(["oneri"]);
    expect(issue.title).toBe("[Öneri] inzva kış kampı eksik");
    expect(parseIssueBody(issue.body)).toEqual({ type: "missing", text: "inzva kış kampı eksik" });
  });
  it("kod bloğundan kaçış ve mention denemelerini etkisizleştirir", () => {
    const evil = "test ```\n# Başlık\n@someone ![x](http://e) ``` sonu";
    const issue = buildIssue({ type: "missing", text: evil });
    const fences = issue.body.match(/```/g) ?? [];
    expect(fences).toHaveLength(2);
    expect(issue.title).not.toContain("@");
    expect(parseIssueBody(issue.body)).toMatchObject({ text: evil });
  });
  it("hata bildirimi", () => {
    const issue = buildIssue({ type: "wrong", eventId: "ornek-etkinlik-2026-10", reason: "past" });
    expect(issue).toMatchObject({ title: "[Hata] ornek-etkinlik-2026-10: Etkinlik geçmişte kaldı", labels: ["hata-bildirimi"] });
  });
  it("geçersiz girdiyi reddeder", () => {
    expect(SuggestionPayload.safeParse({ type: "missing", text: "kısa" }).success).toBe(false);
    expect(SuggestionPayload.safeParse({ type: "missing", text: "yeterince uzun metin", url: "javascript:alert(1)" }).success).toBe(false);
    expect(SuggestionPayload.safeParse({ type: "wrong", eventId: "../etc", reason: "past" }).success).toBe(false);
  });
});

describe("POST /api/oneri", () => {
  const req = (body: unknown) => new Request("http://x/api/oneri", { method: "POST", body: JSON.stringify(body), headers: { "x-forwarded-for": "1.2.3.4" } });
  const valid = { payload: { type: "missing", text: "inzva kış kampı eksik" }, turnstileToken: "tok" };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function setup(turnstileOk: boolean) {
    vi.stubEnv("GITHUB_TOKEN", "gh");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "sec");
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push(url);
      if (url.includes("turnstile")) return Response.json({ success: turnstileOk });
      expect(JSON.parse(String(init.body)).labels).toEqual(["oneri"]);
      return Response.json({ number: 7, html_url: "https://github.com/o/r/issues/7" }, { status: 201 });
    });
    return calls;
  }

  it("yapılandırılmamışsa 503", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    expect((await POST(req(valid))).status).toBe(503);
  });
  it("geçerli istek issue açar", async () => {
    const calls = setup(true);
    const res = await POST(req(valid));
    expect(await res.json()).toEqual({ ok: true, issueUrl: "https://github.com/o/r/issues/7" });
    expect(calls).toHaveLength(2);
  });
  it("Turnstile başarısızsa reddeder", async () => {
    const calls = setup(false);
    expect((await POST(req(valid))).status).toBe(403);
    expect(calls).toHaveLength(1);
  });
  it("honeypot doluysa issue açmaz ama başarılı döner", async () => {
    const calls = setup(true);
    const res = await POST(req({ ...valid, website: "spam" }));
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(0);
  });
  it("geçersiz gövde 400", async () => {
    setup(true);
    expect((await POST(req({ payload: { type: "missing", text: "x" } }))).status).toBe(400);
  });
});
