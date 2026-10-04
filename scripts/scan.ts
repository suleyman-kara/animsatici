// Haftalık tarama. Kullanım: npm run scan -- [--dry-run] [--force] [--source <id>]
import { parseArgs } from "node:util";
import { geminiClient } from "../lib/llm";
import { runScan } from "../lib/scanner/run";
import { validateData } from "./validate";

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    force: { type: "boolean", default: false },
    source: { type: "string" },
  },
});

const report = await runScan({
  llm: geminiClient(),
  sourceId: values.source,
  force: values.force,
  dryRun: values["dry-run"],
  log: (line) => console.log(line),
});

const s = report.lastScan;
console.log(
  `\nÖzet: ${s.totalSources} kaynak · ${s.successCount} tarandı · ${s.unchangedCount} değişmedi · ${s.errorCount} hata · ` +
    `${s.newEvents} yeni · ${s.updatedEvents} güncellendi · ${s.rejected.length} red`,
);
for (const w of s.warnings) console.log(`⚠️ ${w}`);
for (const r of s.rejected) console.log(`✗ [${r.sourceId}] ${r.title}: ${r.reason}`);
for (const e of report.created) console.log(`+ ${e.id} (${e.startDate ?? e.deadline})`);
for (const e of report.updated) console.log(`~ ${e.id}`);

if (report.aborted) {
  console.error(`\n⛔ Tarama durduruldu, hiçbir dosya yazılmadı: ${report.aborted}`);
  process.exit(1);
}
if (values["dry-run"]) {
  console.log("\n(dry-run: dosya yazılmadı)");
} else {
  const errors = await validateData();
  if (errors.length) {
    console.error(`\n⛔ Tarama sonrası veri doğrulaması başarısız:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
    process.exit(1);
  }
}
if (s.status === "failed") process.exit(1);
