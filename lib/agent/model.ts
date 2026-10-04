import type { Content, FunctionDeclaration } from "@google/genai";
import { createGenAI, geminiModel, withRetry } from "../llm";

// Ajanın dil modeli arayüzü. Testlerde sahte bir oturumla değiştirilir.

export type ToolSpec = { name: string; description: string; parameters: Record<string, unknown> };
export type ToolCall = { id?: string; name: string; args: Record<string, unknown> };
export type ToolResult = { id?: string; name: string; result: unknown };
export type ModelTurn = { calls: ToolCall[]; text?: string };

export interface AgentSession {
  /** İlk çağrıda boş; sonrakilerde bir önceki turdaki araç çağrılarının sonuçları. */
  send(results: ToolResult[]): Promise<ModelTurn>;
}

export interface AgentModel {
  start(args: { system: string; user: string; tools: ToolSpec[] }): AgentSession;
}

export type WebSearchResult = { summary: string; results: { title: string; url: string }[] };
export type WebSearcher = (query: string) => Promise<WebSearchResult>;

export function geminiAgentModel(options: { apiKey?: string; model?: string } = {}): AgentModel {
  const ai = createGenAI(options.apiKey);
  const model = options.model ?? geminiModel();
  return {
    start({ system, user, tools }) {
      const contents: Content[] = [{ role: "user", parts: [{ text: user }] }];
      const functionDeclarations: FunctionDeclaration[] = tools.map((t) => ({
        name: t.name,
        description: t.description,
        parametersJsonSchema: t.parameters,
      }));
      return {
        async send(results) {
          if (results.length) {
            contents.push({
              role: "user",
              parts: results.map((r) => ({ functionResponse: { id: r.id, name: r.name, response: { result: r.result } } })),
            });
          }
          const response = await withRetry(() =>
            ai.models.generateContent({
              model,
              contents,
              config: { systemInstruction: system, tools: [{ functionDeclarations }], temperature: 0.2 },
            }),
          );
          const content = response.candidates?.[0]?.content;
          if (content) contents.push(content);
          return {
            text: response.text,
            calls: (response.functionCalls ?? []).map((c) => ({ id: c.id, name: c.name ?? "", args: c.args ?? {} })),
          };
        },
      };
    },
  };
}

/** Google Search grounding ile web araması (function calling'den ayrı bir çağrı). */
export function geminiWebSearcher(options: { apiKey?: string; model?: string } = {}): WebSearcher {
  const ai = createGenAI(options.apiKey);
  const model = options.model ?? geminiModel();
  return async (query) => {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model,
        contents:
          `Şu etkinlik/sayfa hakkında web'de ara ve en alakalı resmi sayfaları bul: "${query}". ` +
          "Her sonuç için başlığı ve gerçek URL'yi listele; tarih ve organizatör bilgisini kısaca belirt. Bilgi uydurma.",
        config: { tools: [{ googleSearch: {} }], temperature: 0 },
      }),
    );
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const results = chunks
      .map((c) => c.web)
      .filter((w): w is { uri: string; title?: string } => !!w?.uri)
      .map((w) => ({ title: w.title ?? "", url: w.uri }))
      .slice(0, 8);
    return { summary: (response.text ?? "").slice(0, 3000), results };
  };
}
