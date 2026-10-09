import { describe, expect, it } from "vitest";
import { buildIssue, ISSUE_MARKER, parseIssueBody, SuggestionPayload, verifyTurnstile } from "@/lib/suggestion";

describe("öneri formu", () => {
  it("kaynak önerisini issue'ya çevirip geri ayrıştırır", () => {
    const payload = SuggestionPayload.parse({ type: "source", url: "https://kulup.edu.tr/etkinlikler?x=1", text: "Kulüp etkinlikleri" });
    const issue = buildIssue(payload);
    expect(issue.title).toBe("[Kaynak] kulup.edu.tr/etkinlikler");
    expect(issue.labels).toEqual(["kaynak-onerisi"]);
    expect(issue.body).toContain(ISSUE_MARKER);
    expect(parseIssueBody(issue.body)).toEqual(payload);
  });

  it("geri bildirimi etiketler ve ters tırnakla kod bloğundan kaçışı engeller", () => {
    const payload = SuggestionPayload.parse({ type: "feedback", text: "```\nkaçış denemesi @biri" });
    const issue = buildIssue(payload);
    expect(issue.labels).toEqual(["geri-bildirim"]);
    expect(issue.title).not.toMatch(/[`@]/);
    expect(issue.body.split("```").length).toBe(3); // yalnızca bizim açtığımız blok
    expect(parseIssueBody(issue.body)).toEqual(payload);
  });

  it("geçersiz girdileri reddeder", () => {
    expect(SuggestionPayload.safeParse({ type: "source", url: "javascript:alert(1)" }).success).toBe(false);
    expect(SuggestionPayload.safeParse({ type: "feedback", text: "kısa" }).success).toBe(false);
    expect(parseIssueBody("işaretçi yok")).toBeNull();
  });

  it("Turnstile doğrulaması token yoksa ya da istek başarısızsa false döner", async () => {
    expect(await verifyTurnstile(undefined, "s")).toBe(false);
    const failing = (async () => {
      throw new Error("ağ yok");
    }) as typeof fetch;
    expect(await verifyTurnstile("t", "s", undefined, failing)).toBe(false);
    const ok = (async () => Response.json({ success: true })) as typeof fetch;
    expect(await verifyTurnstile("t", "s", "1.2.3.4", ok)).toBe(true);
  });
});
