import { describe, expect, it } from "vitest";
import { OPTIONS, POST } from "@/app/mcp/route";

// Uzak MCP uç noktası: gerçek kaynak dosyalarıyla, HTTP isteği üzerinden uçtan uca.

function rpc(body: unknown) {
  return new Request("https://kampus30.com/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-06-18" },
    body: JSON.stringify(body),
  });
}

describe("/mcp", () => {
  it("initialize isteğine sunucu bilgisi ve talimatlarla yanıt verir", async () => {
    const res = await POST(
      rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const data = await res.json();
    expect(data.result.serverInfo.name).toBe("kampus30");
    expect(data.result.instructions).toMatch(/find_sources/);
  });

  it("durumsuz modda doğrudan araç çağrısını yanıtlar", async () => {
    const res = await POST(rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "find_sources", arguments: { query: "teknofest" } } }));
    expect(res.status).toBe(200);
    const data = await res.json();
    const payload = JSON.parse(data.result.content[0].text);
    expect(payload.sources.map((s: { id: string }) => s.id)).toEqual(["teknofest-yarismalar"]);
  });

  it("CORS ön kontrolüne yanıt verir", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-headers")).toMatch(/mcp-protocol-version/);
  });
});
