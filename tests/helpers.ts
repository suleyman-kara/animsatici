import { mkdtemp, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { LlmClient } from "../lib/llm";

export async function tempDataRoot(fromFixture = "sample-data"): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "kr-test-"));
  await cp(path.join(import.meta.dirname, "fixtures", fromFixture), dir, { recursive: true });
  return dir;
}

/** Sırayla verilen yanıtları döndüren sahte LLM; çağrıları kaydeder. */
export function fakeLlm(...responses: unknown[]): LlmClient & { calls: { system: string; prompt: string }[] } {
  const calls: { system: string; prompt: string }[] = [];
  return {
    calls,
    async generateJson({ system, prompt }) {
      calls.push({ system, prompt });
      if (responses.length === 0) throw new Error("fakeLlm: yanıt kalmadı");
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return next;
    },
  };
}

export function fakeFetch(routes: Record<string, { status?: number; body: string; contentType?: string }>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = routes[url];
    if (!route) throw new TypeError(`fetch failed: ${url}`);
    const res = new Response(route.body, {
      status: route.status ?? 200,
      headers: { "content-type": route.contentType ?? "text/html; charset=utf-8" },
    });
    Object.defineProperty(res, "url", { value: url });
    return res;
  }) as typeof fetch;
}
