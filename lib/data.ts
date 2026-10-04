import "server-only";
import { cache } from "react";
import { referenceInstant } from "./dates";
import type { Event } from "./schema";
import { readEvents, readLastScan, readScanState, readSources } from "./store";

const BUILT_AT = Date.now();
/** Sayfaların üretildiği an (statik sayfalarda sınıflandırma referansı). */
export const buildTime = () => BUILT_AT;

// Build zamanında data/ okunur. DATA_ROOT ile örnek veriye yönlendirilebilir (geliştirme).
const root = () => process.env.DATA_ROOT || process.cwd();

export const getEvents = cache(async (): Promise<Event[]> => {
  const events = await readEvents(root());
  return events.sort((a, b) => referenceInstant(a) - referenceInstant(b));
});

export const getSources = cache(() => readSources(root()));
export const getScanState = cache(() => readScanState(root()));
export const getLastScan = cache(() => readLastScan(root()));

export async function getEvent(id: string): Promise<Event | undefined> {
  return (await getEvents()).find((e) => e.id === id);
}
