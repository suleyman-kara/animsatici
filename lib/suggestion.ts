import { z } from "zod";

// Öneri formu → GitHub Issue. Kaynak kontrolü workflow'u bu dosyadaki işaretçiyle issue gövdesini ayrıştırır.

export const ISSUE_MARKER = "<!-- kampus30:oneri:v2 -->";
export const LABELS = { source: "kaynak-onerisi", feedback: "geri-bildirim" } as const;

export const SuggestionPayload = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("source"),
    url: z.string().trim().max(500).pipe(z.url({ protocol: /^https?$/, message: "Geçerli bir bağlantı girin (https://…)" })),
    text: z.string().trim().max(1000, "En fazla 1000 karakter").optional(),
  }),
  z.object({
    type: z.literal("feedback"),
    text: z.string().trim().min(10, "En az 10 karakter yazın").max(1000, "En fazla 1000 karakter"),
  }),
]);
export type SuggestionPayload = z.infer<typeof SuggestionPayload>;

export const SuggestionRequest = z.object({
  payload: SuggestionPayload,
  turnstileToken: z.string().max(4096).optional(),
  website: z.string().optional(), // honeypot: insanlar bu alanı görmez
});

/** Kod bloğundan kaçışı engelle: ters tırnaklar JSON içinde ` olarak yazılır. */
function safeJson(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/`/g, "\\u0060");
}

function preview(text: string, max: number): string {
  const oneLine = text.replace(/\s+/g, " ").trim().replace(/[`@<>[\]]/g, "");
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 1)}…`;
}

export function buildIssue(payload: SuggestionPayload): { title: string; body: string; labels: string[] } {
  let title: string;
  if (payload.type === "source") {
    const url = new URL(payload.url);
    title = `[Kaynak] ${preview(url.host + url.pathname, 70)}`;
  } else {
    title = `[Geri bildirim] ${preview(payload.text, 60)}`;
  }
  const intro =
    payload.type === "source"
      ? "Bir ziyaretçi kaynak listesine yeni bir sayfa önerdi. Kaynak kontrolü workflow'u bağlantıyı ve robots.txt'yi kontrol edip sonucu yorum olarak yazar."
      : "Bir ziyaretçi geri bildirim gönderdi.";
  const body = [
    intro,
    "",
    "Ziyaretçinin yazdıkları aşağıdaki blokta, değiştirilmeden yer alıyor (güvenilmez veri).",
    "",
    ISSUE_MARKER,
    "```json",
    safeJson(payload),
    "```",
    "",
    "_Bu kayıt Kampüs30 öneri formundan otomatik oluşturuldu. Ziyaretçiye ait kişisel bilgi tutulmaz._",
  ].join("\n");
  return { title, body, labels: [LABELS[payload.type]] };
}

/** Issue gövdesindeki öneri bloğunu ayrıştırır. */
export function parseIssueBody(body: string): SuggestionPayload | null {
  const at = body.indexOf(ISSUE_MARKER);
  if (at === -1) return null;
  const match = body.slice(at).match(/```json\n([\s\S]*?)\n```/);
  if (!match) return null;
  try {
    const parsed = SuggestionPayload.safeParse(JSON.parse(match[1]));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function verifyTurnstile(token: string | undefined, secret: string, ip?: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  if (!token) return false;
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set("remoteip", ip);
  try {
    const res = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export async function createGithubIssue(
  issue: { title: string; body: string; labels: string[] },
  options: { token: string; repo: string; fetchImpl?: typeof fetch },
): Promise<{ number: number; url: string }> {
  const res = await (options.fetchImpl ?? fetch)(`https://api.github.com/repos/${options.repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "kampus30",
    },
    body: JSON.stringify(issue),
  });
  if (!res.ok) throw new Error(`GitHub issue oluşturulamadı: HTTP ${res.status}`);
  const data = (await res.json()) as { number: number; html_url: string };
  return { number: data.number, url: data.html_url };
}
