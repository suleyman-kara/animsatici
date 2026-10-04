// Taramayla eklenmiş ama ilk görüldüğü anda zaten uygun olmayan (bitmiş ya da yılı kaynakta açıkça yazmayan)
// etkinlikleri siler. Kullanım: npm run prune -- [--dry-run]
import { parseArgs } from "node:util";
import { deleteEvent, readEvents } from "../lib/store";
import { relevanceProblem } from "../lib/scanner/verify";

const { values } = parseArgs({ options: { "dry-run": { type: "boolean", default: false } } });
const root = process.env.DATA_ROOT || process.cwd();

let removed = 0;
for (const event of await readEvents(root)) {
  if (event.origin !== "scan") continue; // elle ya da ajanla eklenenlere dokunulmaz
  const problem = relevanceProblem({ ...event, ...event.evidence }, Date.parse(event.firstSeenAt));
  if (!problem) continue;
  console.log(`- ${event.id}: ${problem.reason}`);
  if (!values["dry-run"]) await deleteEvent(event.id, root);
  removed++;
}
console.log(`${removed} etkinlik ${values["dry-run"] ? "silinecek (dry-run)" : "silindi"}.`);
