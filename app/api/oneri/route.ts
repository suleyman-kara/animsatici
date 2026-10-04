import { createGithubIssue, buildIssue, SuggestionRequest, verifyTurnstile } from "@/lib/suggestion";
import { GITHUB_REPO } from "@/lib/site";

export const runtime = "nodejs";

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  const token = process.env.GITHUB_TOKEN;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!token || !secret) return json(503, { ok: false, error: "Öneri formu henüz yapılandırılmadı." });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json(400, { ok: false, error: "Geçersiz istek." });
  }
  const parsed = SuggestionRequest.safeParse(raw);
  if (!parsed.success) {
    return json(400, { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz istek." });
  }
  const { payload, turnstileToken, website } = parsed.data;

  // Honeypot doluysa bot: başarılı gibi davran ama issue açma.
  if (website) return json(200, { ok: true });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstile(turnstileToken, secret, ip))) {
    return json(403, { ok: false, error: "Doğrulama başarısız. Sayfayı yenileyip tekrar deneyin." });
  }

  try {
    const issue = await createGithubIssue(buildIssue(payload), { token, repo: GITHUB_REPO });
    return json(200, { ok: true, issueUrl: issue.url });
  } catch (err) {
    console.error(err);
    return json(502, { ok: false, error: "Öneriniz şu an kaydedilemedi, lütfen daha sonra tekrar deneyin." });
  }
}
