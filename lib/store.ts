import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { Blocklist, Event, LastScan, ScanState, Source } from "./schema";

// data/ klasörüne okuma/yazma. Yalnızca sunucu tarafında (build, scripts) kullanılır.

export function dataDir(root: string = process.cwd()): string {
  return path.join(root, "data");
}

export async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

/** Kararlı biçimli JSON yazar (2 boşluk + sondaki satır sonu) — git diff'leri temiz kalsın. */
export async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readDir<T>(dir: string, schema: z.ZodType<T>): Promise<T[]> {
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  const items: T[] = [];
  for (const name of names.filter((n) => n.endsWith(".json")).sort()) {
    items.push(schema.parse(await readJson(path.join(dir, name))));
  }
  return items;
}

export const eventsDir = (root?: string) => path.join(dataDir(root), "events");
export const sourcesDir = (root?: string) => path.join(dataDir(root), "sources");
export const eventFile = (id: string, root?: string) => path.join(eventsDir(root), `${id}.json`);
export const sourceFile = (id: string, root?: string) => path.join(sourcesDir(root), `${id}.json`);
const scanStateFile = (root?: string) => path.join(dataDir(root), "state", "scan-state.json");
const lastScanFile = (root?: string) => path.join(dataDir(root), "state", "last-scan.json");
const blocklistFile = (root?: string) => path.join(dataDir(root), "blocklist.json");

export const readEvents = (root?: string) => readDir(eventsDir(root), Event);
export const readSources = (root?: string) => readDir(sourcesDir(root), Source);

export async function readScanState(root?: string): Promise<ScanState> {
  try {
    return ScanState.parse(await readJson(scanStateFile(root)));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}

export async function readLastScan(root?: string): Promise<LastScan | null> {
  try {
    return LastScan.parse(await readJson(lastScanFile(root)));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function readBlocklist(root?: string): Promise<Blocklist> {
  try {
    return Blocklist.parse(await readJson(blocklistFile(root)));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { dedupeKeys: [], urls: [] };
    throw err;
  }
}

export const writeEvent = (event: Event, root?: string) => writeJson(eventFile(event.id, root), Event.parse(event));
export const writeSource = (source: Source, root?: string) => writeJson(sourceFile(source.id, root), Source.parse(source));
export const writeScanState = (state: ScanState, root?: string) => writeJson(scanStateFile(root), ScanState.parse(state));
export const writeLastScan = (scan: LastScan, root?: string) => writeJson(lastScanFile(root), LastScan.parse(scan));
export const writeBlocklist = (list: Blocklist, root?: string) => writeJson(blocklistFile(root), Blocklist.parse(list));

export async function deleteEvent(id: string, root?: string): Promise<void> {
  await fs.rm(eventFile(id, root), { force: true });
}
