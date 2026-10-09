// data/sources altındaki tüm kaynakları şemaya göre doğrular. Hata varsa exit 1.
import { promises as fs } from "node:fs";
import path from "node:path";
import { Source } from "../lib/schema";
import { sourcesDir } from "../lib/sources";

export async function validateSources(root: string = process.cwd()): Promise<string[]> {
  const errors: string[] = [];
  const dir = sourcesDir(root);
  const names = (await fs.readdir(dir)).filter((n) => n.endsWith(".json")).sort();
  const urls = new Map<string, string>();

  for (const name of names) {
    const rel = path.relative(root, path.join(dir, name));
    let raw: unknown;
    try {
      raw = JSON.parse(await fs.readFile(path.join(dir, name), "utf8"));
    } catch (err) {
      errors.push(`${rel}: JSON okunamadı (${(err as Error).message})`);
      continue;
    }
    const result = Source.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) errors.push(`${rel}: ${issue.path.join(".") || "(kök)"} — ${issue.message}`);
      continue;
    }
    const source = result.data;
    if (`${source.id}.json` !== name) errors.push(`${rel}: dosya adı id ile aynı olmalı (${source.id}.json)`);
    const other = urls.get(source.url);
    if (other) errors.push(`${rel}: url "${source.url}" ${other} ile aynı`);
    urls.set(source.url, source.id);
  }
  if (!names.length) errors.push("data/sources: hiç kaynak yok");
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = await validateSources();
  if (errors.length) {
    console.error(`✗ ${errors.length} kaynak hatası:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
    process.exit(1);
  }
  console.log("✓ data/sources geçerli");
}
