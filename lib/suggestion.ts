import { z } from "zod";
import { Slug } from "./schema";

// Öneri formu → GitHub Issue. Ajan bu dosyadaki işaretçiyle issue gövdesini ayrıştırır.

export const ISSUE_MARKER = "<!-- kampusradar:v1 -->";
export const LABELS = { missing: "oneri", wrong: "hata-bildirimi" } as const;

export const WRONG_REASONS = {
  "wrong-date": "Tarih yanlış",
  past: "Etkinlik geçmişte kaldı",
  cancelled: "Etkinlik iptal edildi",
  irrelevant: "Öğrencilerle ilgisi yok",
  duplicate: "Aynı etkinlik iki kez listelenmiş",
  other: "Diğer",
} as const;

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .transform((s) => s || undefined)
  .pipe(z.url({ protocol: /^https?$/ }).optional());

export const SuggestionPayload = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("missing"),
    text: z.string().trim().min(10, "En az 10 karakter yazın").max(1000, "En fazla 1000 karakter"),
    url: optionalUrl.optional(),
  }),
  z.object({
    type: z.literal("wrong"),
    eventId: Slug,
    reason: z.enum(Object.keys(WRONG_REASONS) as [keyof typeof WRONG_REASONS, ...(keyof typeof WRONG_REASONS)[]]),
    text: z.string().trim().max(1000).optional(),
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
  const title =
    payload.type === "missing" ? `[Öneri] ${preview(payload.text, 60)}` : `[Hata] ${payload.eventId}: ${WRONG_REASONS[payload.reason]}`;
  const intro =
    payload.type === "missing"
      ? "Bir ziyaretçi sitede eksik olduğunu düşündüğü bir etkinlik/kaynak önerdi."
      : `Bir ziyaretçi \`${payload.eventId}\` etkinliğinin hatalı olduğunu bildirdi (${WRONG_REASONS[payload.reason]}).`;
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
    "_Bu kayıt KampüsRadar öneri formundan otomatik oluşturuldu. Ziyaretçiye ait kişisel bilgi tutulmaz._",
  ].join("\n");
  return { title, body, labels: [LABELS[payload.type]] };
}

/** Issue gövdesindeki öneri bloğunu ayrıştırır (ajan kullanır). */
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
      "User-Agent": "kampusradar",
    },
    body: JSON.stringify(issue),
  });
  if (!res.ok) throw new Error(`GitHub issue oluşturulamadı: HTTP ${res.status}`);
  const data = (await res.json()) as { number: number; html_url: string };
  return { number: data.number, url: data.html_url };
}
