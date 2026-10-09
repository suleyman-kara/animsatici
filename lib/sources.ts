import { promises as fs } from "node:fs";
import path from "node:path";
import { Source } from "./schema";

// data/sources/<id>.json okuma. Site (build zamanı), MCP sunucusu ve scriptler kullanır. Süzme: lib/filter.ts

export const sourcesDir = (root: string = process.cwd()) => path.join(root, "data", "sources");

export async function readSources(root?: string): Promise<Source[]> {
  const dir = sourcesDir(root);
  const names = (await fs.readdir(dir)).filter((n) => n.endsWith(".json")).sort();
  return Promise.all(names.map(async (name) => Source.parse(JSON.parse(await fs.readFile(path.join(dir, name), "utf8")))));
}

let cached: Promise<Source[]> | undefined;
/** Etkin kaynaklar (süreç başına bir kez okunur). */
export function getActiveSources(): Promise<Source[]> {
  cached ??= readSources().then((all) => all.filter((s) => s.active));
  return cached;
}
