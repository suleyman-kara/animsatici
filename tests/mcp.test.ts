import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createKampusServer, istanbulToday, type ServerDeps } from "@/lib/mcp/server";
import { fakeFetch, makeSource } from "./helpers";

const NOW = new Date("2026-10-09T22:30:00Z"); // İstanbul'da 10 Ekim 01:30

const SOURCES = [
  makeSource({ id: "yazilim-kampi", title: "Yazılım Kampı", types: ["camp"], hints: "Tarihler kartlarda." }),
  makeSource({ id: "kapali-liste", title: "Kapalı Liste", fields: ["general"], types: ["internship"], kind: "aggregator", aiFetch: false, aiFetchNote: "Koşullar yasaklıyor." }),
  makeSource({ id: "ankara-kulup", title: "Ankara Kulübü", types: ["hackathon"], scope: "city", city: "Ankara" }),
];

async function connect(deps: Partial<ServerDeps> = {}) {
  const server = createKampusServer({ sources: SOURCES, now: () => NOW, ...deps });
  const client = new Client({ name: "test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

async function callJson(client: Client, name: string, args: Record<string, unknown> = {}) {
  const result = await client.callTool({ name, arguments: args });
  const [block] = result.content as { type: string; text: string }[];
  return { result, data: result.isError ? block.text : JSON.parse(block.text) };
}

describe("MCP sunucusu", () => {
  it("araçları, komutları ve talimatları sunar", async () => {
    const client = await connect();
    const tools = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(tools).toEqual(["find_sources", "get_cv_guide", "get_github_projects", "list_categories"]);
    const prompts = (await client.listPrompts()).prompts.map((p) => p.name).sort();
    expect(prompts).toEqual(["cv-hazirla", "firsat-ara"]);
    expect(client.getInstructions()).toMatch(/yılı tahmin etme/);
  });

  it("find_sources İstanbul tarihini ve süzülmüş kaynakları döndürür", async () => {
    const client = await connect();
    const { data } = await callJson(client, "find_sources", { city: "ankara" });
    expect(data.today).toBe("2026-10-10");
    expect(data.sources.map((s: { id: string }) => s.id)).toEqual(["ankara-kulup", "yazilim-kampi", "kapali-liste"]);
    const closed = data.sources.find((s: { id: string }) => s.id === "kapali-liste");
    expect(closed).toMatchObject({ aiFetch: false, aiFetchNote: "Koşullar yasaklıyor." });
    const open = data.sources.find((s: { id: string }) => s.id === "yazilim-kampi");
    expect(open.aiFetchNote).toBeUndefined();
    expect(open.hints).toBe("Tarihler kartlarda.");
  });

  it("find_sources sonuç yoksa yönlendirir, geçersiz değeri reddeder", async () => {
    const client = await connect();
    const { data } = await callJson(client, "find_sources", { type: "scholarship" });
    expect(data.found).toBe(0);
    expect(data.guidance).toMatch(/list_categories/);
    const bad = await client.callTool({ name: "find_sources", arguments: { type: "parti" } });
    expect(bad.isError).toBe(true);
  });

  it("list_categories sayıları ve şehirleri döndürür", async () => {
    const client = await connect();
    const { data } = await callJson(client, "list_categories");
    expect(data.totalSources).toBe(3);
    expect(data.types.find((t: { value: string }) => t.value === "hackathon")).toMatchObject({ sources: 1, label: "Hackathon" });
    expect(data.cities).toEqual(["Ankara"]);
  });

  it("get_cv_guide ilan modunda uyarlama bölümünü içerir", async () => {
    const client = await connect();
    const general = await client.callTool({ name: "get_cv_guide", arguments: {} });
    const posting = await client.callTool({ name: "get_cv_guide", arguments: { mode: "posting", language: "en" } });
    const text = (r: typeof general) => (r.content as { text: string }[])[0].text;
    expect(text(general)).toMatch(/PDF olarak kaydet/);
    expect(text(general)).not.toMatch(/İlana göre uyarlama/);
    expect(text(posting)).toMatch(/İlana göre uyarlama/);
    expect(text(posting)).toMatch(/Education/);
  });

  it("get_github_projects fork'ları eler ve yıldıza göre sıralar", async () => {
    const repos = [
      { name: "az-yildiz", description: null, html_url: "https://github.com/ali/az-yildiz", homepage: "", language: "Go", stargazers_count: 1, pushed_at: "2026-09-01T00:00:00Z", fork: false, archived: false },
      { name: "fork", description: "x", html_url: "https://github.com/ali/fork", homepage: null, language: "C", stargazers_count: 99, pushed_at: "2026-09-01T00:00:00Z", fork: true, archived: false },
      { name: "cok-yildiz", description: "Proje", html_url: "https://github.com/ali/cok-yildiz", homepage: "https://ali.dev", language: "TypeScript", topics: ["ai"], stargazers_count: 12, pushed_at: "2026-08-01T10:00:00Z", fork: false, archived: false },
    ];
    const fetchImpl = fakeFetch({
      "https://api.github.com/users/ali/repos?type=owner&sort=pushed&per_page=100": () => Response.json(repos),
    });
    const client = await connect({ fetchImpl });
    const { data } = await callJson(client, "get_github_projects", { username: "ali" });
    expect(data.projects.map((p: { name: string }) => p.name)).toEqual(["cok-yildiz", "az-yildiz"]);
    expect(data.projects[0]).toMatchObject({ topics: ["ai"], lastPush: "2026-08-01", homepage: "https://ali.dev" });
    expect(data.projects[1].homepage).toBeNull();
  });

  it("get_github_projects bilinmeyen kullanıcıda hata döndürür, geçersiz adı reddeder", async () => {
    const fetchImpl = fakeFetch({
      "https://api.github.com/users/yok-boyle/repos?type=owner&sort=pushed&per_page=100": () => new Response("{}", { status: 404 }),
    });
    const client = await connect({ fetchImpl });
    const { result, data } = await callJson(client, "get_github_projects", { username: "yok-boyle" });
    expect(result.isError).toBe(true);
    expect(data).toMatch(/bulunamadı/);
    const bad = await client.callTool({ name: "get_github_projects", arguments: { username: "../etc" } });
    expect(bad.isError).toBe(true);
  });

  it("cv-hazirla komutu ilanı sınırlayıcı içine koyar", async () => {
    const client = await connect();
    const prompt = await client.getPrompt({ name: "cv-hazirla", arguments: { ilan: "Stajyer aranıyor" } });
    const content = prompt.messages[0].content as { text: string };
    expect(content.text).toMatch(/<ilan>\nStajyer aranıyor\n<\/ilan>/);
  });
});

describe("istanbulToday", () => {
  it("UTC gece yarısından önce İstanbul'da ertesi gün olabilir", () => {
    expect(istanbulToday(new Date("2026-12-31T21:30:00Z"))).toBe("2027-01-01");
    expect(istanbulToday(new Date("2026-12-31T20:30:00Z"))).toBe("2026-12-31");
  });
});
