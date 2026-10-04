// Son taramanın sağlığını kontrol eder. Sorun varsa açıklamayla exit 1 (workflow issue açar).
import { readLastScan } from "../lib/store";

const MAX_AGE_HOURS = 48;

export function checkHealth(lastScan: Awaited<ReturnType<typeof readLastScan>>, now = Date.now()): string[] {
  if (!lastScan) return ["Henüz hiç tarama kaydı yok (data/state/last-scan.json)."];
  const problems: string[] = [];
  const ageHours = (now - Date.parse(lastScan.completedAt)) / 3_600_000;
  if (ageHours > MAX_AGE_HOURS) problems.push(`Son başarılı tarama ${Math.round(ageHours)} saat önce (${lastScan.completedAt}).`);
  if (lastScan.status === "failed") problems.push("Son taramada hiçbir kaynak taranamadı.");
  if (lastScan.totalSources > 0 && lastScan.errorCount / lastScan.totalSources >= 0.3) {
    problems.push(`Son taramada ${lastScan.errorCount}/${lastScan.totalSources} kaynak hata verdi.`);
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = checkHealth(await readLastScan());
  if (problems.length) {
    console.error(problems.map((p) => `- ${p}`).join("\n"));
    process.exit(1);
  }
  console.log("✓ Tarama sağlıklı");
}
