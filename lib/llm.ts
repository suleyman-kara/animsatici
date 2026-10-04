import { GoogleGenAI } from "@google/genai";

// Gemini'ye ince bir sarmalayıcı. Testlerde LlmClient sahte bir uygulamayla değiştirilir.

export const DEFAULT_MODEL = "gemini-3.6-flash";

export interface LlmClient {
  /** JSON şemasına uyan yanıtı ayrıştırılmış olarak döndürür. */
  generateJson(args: { system: string; prompt: string; schema: Record<string, unknown> }): Promise<unknown>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function isTransientError(err: unknown): boolean {
  const e = err as { status?: number; message?: string };
  return e.status === 429 || e.status === 503 || e.status === 500 || /\b(429|500|503)\b|UNAVAILABLE|RESOURCE_EXHAUSTED/.test(e.message ?? "");
}

/** Geçici hatalarda artan beklemeyle yeniden dener (3 deneme). */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= attempts || !isTransientError(err)) throw err;
      await sleep(attempt * 2000);
    }
  }
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export function createGenAI(apiKey: string | undefined = process.env.GEMINI_API_KEY): GoogleGenAI {
  if (!apiKey) throw new Error("GEMINI_API_KEY tanımlı değil.");
  return new GoogleGenAI({ apiKey });
}

export function geminiClient(options: { apiKey?: string; model?: string } = {}): LlmClient {
  const ai = createGenAI(options.apiKey);
  const model = options.model ?? geminiModel();
  return {
    async generateJson({ system, prompt, schema }) {
      const response = await withRetry(() =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: { systemInstruction: system, responseMimeType: "application/json", responseJsonSchema: schema, temperature: 0.1 },
        }),
      );
      const text = response.text?.trim();
      if (!text) throw new Error("Gemini boş yanıt döndürdü.");
      return JSON.parse(text);
    },
  };
}
