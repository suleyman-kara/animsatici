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

const MAX_RETRY_DELAY_MS = 60_000;

/** Gemini kota hatalarında önerilen bekleme ("retryDelay": "37s" ya da "retry in 37.2s"). */
export function suggestedDelayMs(err: unknown): number | undefined {
  const message = (err as { message?: string }).message ?? "";
  const m = message.match(/retryDelay"?\s*:\s*"(\d+(?:\.\d+)?)s"/) ?? message.match(/retry in (\d+(?:\.\d+)?)\s*s/i);
  return m ? Math.min(MAX_RETRY_DELAY_MS, Math.ceil(Number(m[1]) * 1000)) : undefined;
}

/**
 * Geçici hatalarda yeniden dener. Sunucu bir bekleme süresi önerdiyse ona uyar; yoksa üstel bekler
 * (2, 4, 8, 16 sn). Dakikalık kota aşımları birkaç saniyelik beklemeyle geçmez.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 5, wait: (ms: number) => Promise<unknown> = sleep): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= attempts || !isTransientError(err)) throw err;
      await wait(suggestedDelayMs(err) ?? Math.min(MAX_RETRY_DELAY_MS, 2000 * 2 ** (attempt - 1)));
    }
  }
}

/** Aynı anda en fazla `limit` iş çalıştıran basit semafor. */
export function createLimiter(limit: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return async function run<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= limit) await new Promise<void>((resolve) => queue.push(resolve));
    active++;
    try {
      return await fn();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}

/**
 * Bir LlmClient'ın tüm çağrılarını tek bir eşzamanlılık sınırından geçirir. Kaynak ve detay sayfası
 * havuzları iç içe olduğundan sınır, çağrıların toplandığı bu noktada uygulanır.
 */
export function limitLlm(client: LlmClient, limit: number): LlmClient {
  const run = createLimiter(limit);
  return { generateJson: (args) => run(() => client.generateJson(args)) };
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
