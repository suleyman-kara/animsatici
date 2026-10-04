// data/ altındaki tüm dosyaları şemalara göre doğrular. Hata varsa exit 1.
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { Blocklist, Event, Feedback, LastScan, ScanState, Source } from "../lib/schema";
import { dataDir, readJson } from "../lib/store";

export async function validateData(root: string = process.env.DATA_ROOT ?? process.cwd()): Promise<string[]> {
  const errors: string[] = [];
  const base = dataDir(root);

  async function check<T>(file: string, schema: z.ZodType<T>): Promise<T | undefined> {
    const rel = path.relative(root, file);
    let raw: unknown;
    try {
      raw = await readJson(file);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      errors.push(`${rel}: JSON okunamadı (${(err as Error).message})`);
      return undefined;
    }
    const result = schema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) errors.push(`${rel}: ${issue.path.join(".") || "(kök)"} — ${issue.message}`);
      return undefined;
    }
    return result.data;
  }

  async function checkDir<T extends { id: string }>(dir: string, schema: z.ZodType<T>): Promise<T[]> {
    let names: string[] = [];
    try {
      names = (await fs.readdir(path.join(base, dir))).filter((n) => n.endsWith(".json"));
    } catch {
      return [];
    }
    const items: T[] = [];
    for (const name of names) {
      const item = await check(path.join(base, dir, name), schema);
      if (!item) continue;
      if (`${item.id}.json` !== name) errors.push(`data/${dir}/${name}: dosya adı id ile aynı olmalı (${item.id}.json)`);
      items.push(item);
    }
    return items;
  }

  const sources = await checkDir("sources", Source);
  const events = await checkDir("events", Event);
  const sourceIds = new Set(sources.map((s) => s.id));

  const seenKeys = new Map<string, string>();
  for (const e of events) {
    if (e.sourceId && !sourceIds.has(e.sourceId)) errors.push(`data/events/${e.id}.json: sourceId "${e.sourceId}" bulunamadı`);
    const other = seenKeys.get(e.dedupeKey);
    if (other) errors.push(`data/events/${e.id}.json: dedupeKey "${e.dedupeKey}" ${other} ile çakışıyor`);
    seenKeys.set(e.dedupeKey, e.id);
  }

  const state = await check(path.join(base, "state", "scan-state.json"), ScanState);
  for (const id of Object.keys(state ?? {})) {
    if (!sourceIds.has(id)) errors.push(`data/state/scan-state.json: bilinmeyen kaynak "${id}"`);
  }
  await check(path.join(base, "state", "last-scan.json"), LastScan);
  await check(path.join(base, "blocklist.json"), Blocklist);

  try {
    for (const name of (await fs.readdir(path.join(base, "feedback"))).filter((n) => n.endsWith(".json"))) {
      await check(path.join(base, "feedback", name), Feedback);
    }
  } catch {
    // feedback klasörü henüz yok
  }

  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = await validateData();
  if (errors.length) {
    console.error(`✗ ${errors.length} veri hatası:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
    process.exit(1);
  }
  console.log("✓ data/ geçerli");
}
