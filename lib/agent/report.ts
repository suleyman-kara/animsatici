import type { AgentOutcome } from "./loop";

// İşaretçi eski adla kalır: daha önce yorumlanmış issue'lar yeniden incelenmesin.
export const AGENT_MARKER = "<!-- kampusradar-agent -->";

const DIAGNOSIS_LABELS: Record<string, string> = {
  already_listed: "Zaten listede",
  not_relevant: "Kapsam dışı",
  not_found: "Doğrulanamadı",
  spam: "Spam",
  source_missing: "Kaynak eksikti",
  source_error: "Kaynak taranamıyor",
  source_moved: "Kaynak adresi değişmiş",
  extraction_miss: "Tarayıcı etkinliği kaçırmış",
  filtered_out: "Filtrelere takılmış",
  confirmed_wrong_date: "Tarih yanlıştı",
  confirmed_past: "Etkinlik geçmişte kalmış",
  confirmed_cancelled: "Etkinlik iptal edilmiş",
  confirmed_irrelevant: "İlgisiz kayıt",
  confirmed_duplicate: "Kopya kayıt",
  hallucinated: "Kaynakta olmayan kayıt",
  report_incorrect: "Kayıt doğru",
  unclear: "Belirsiz",
  limit_reached: "İnceleme sınırına ulaşıldı",
};

export function diagnosisLabel(d: string): string {
  return DIAGNOSIS_LABELS[d] ?? d;
}

export type PublishState =
  | { kind: "pr"; prUrl: string }
  | { kind: "proposed" } // comment modu: değişiklikler uygulanmadı
  | { kind: "checks_failed"; error: string }
  | { kind: "none" };

export function formatComment(outcome: AgentOutcome, state: PublishState): string {
  const { finish, changes } = outcome;
  const lines = [AGENT_MARKER, `🤖 **Otomatik inceleme:** ${diagnosisLabel(finish.diagnosis)} (\`${finish.diagnosis}\`)`, "", finish.comment.trim()];
  if (changes.length) {
    lines.push("", state.kind === "proposed" ? "**Önerilen değişiklikler** (ajan `comment` modunda, uygulanmadı):" : "**Değişiklikler:**");
    for (const c of changes) lines.push(`- ${c.summary} — \`${c.file}\``);
  }
  if (state.kind === "pr") lines.push("", `➡️ Pull request: ${state.prUrl}`);
  if (state.kind === "checks_failed") lines.push("", `⚠️ Değişiklikler doğrulamadan geçemedi, PR açılmadı:\n\n\`\`\`\n${state.error.slice(0, 1500)}\n\`\`\``);
  if (finish.needsHuman) lines.push("", "👀 Bu öneriye proje sahibinin bakması gerekiyor.");
  lines.push("", "_Bu yorum Kampüs30 öneri ajanı tarafından otomatik yazıldı._");
  return lines.join("\n");
}

export function formatPrBody(outcome: AgentOutcome, issueNumber: number): string {
  const { finish, changes } = outcome;
  return [
    `Öneri #${issueNumber} için otomatik inceleme sonucu.`,
    "",
    `**Teşhis:** ${diagnosisLabel(finish.diagnosis)} (\`${finish.diagnosis}\`)`,
    "",
    finish.comment.trim(),
    "",
    "**Değişen dosyalar:**",
    ...changes.map((c) => `- \`${c.file}\` — ${c.summary}`),
    "",
    "Ajan, PR'ı açmadan önce `npm run validate` ve `npm test` çalıştırdı. Vercel önizlemesinden değişikliği kontrol edip birleştirebilirsiniz.",
    "",
    `Closes #${issueNumber}`,
  ].join("\n");
}
