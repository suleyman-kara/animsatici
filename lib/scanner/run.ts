import { classify, nowIso } from "../dates";
import type { LlmClient } from "../llm";
import type { Event, LastScan, ScanState, Source, SourceScanState } from "../schema";
import {
  readBlocklist,
  readEvents,
  readScanState,
  readSources,
  writeEvent,
  writeLastScan,
  writeScanState,
} from "../store";
import { extractEvents } from "./extract";
import { FetchError, fetchPage, type FetchOptions, type Page } from "./fetch";
import { suspiciousDrop, tooManyErrors, tooManyNewEvents } from "./guards";
import { computeHash } from "./hash";
import { mergeEvents } from "./merge";
import { verifyEvents, type Rejection } from "./verify";
import type { ExtractedEvent } from "./extract";

const CONCURRENCY = 4;

export type ScanOptions = {
  root?: string;
  llm: LlmClient;
  fetchImpl?: FetchOptions["fetchImpl"];
  sourceId?: string;
  force?: boolean;
  dryRun?: boolean;
  now?: () => number;
  log?: (line: string) => void;
};

type SourceOutcome =
  | { kind: "unchanged"; source: Source; state: SourceScanState }
  | { kind: "error"; source: Source; state: SourceScanState; message: string }
  | { kind: "skipped"; source: Source; state: SourceScanState; warning: string; rejected: Rejection[] }
  | { kind: "extracted"; source: Source; state: SourceScanState; page: Page; accepted: ExtractedEvent[]; rejected: Rejection[] };

export type ScanReport = {
  lastScan: LastScan;
  aborted?: string;
  created: Event[];
  updated: Event[];
  outcomes: { sourceId: string; kind: SourceOutcome["kind"]; detail?: string }[];
};

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function runScan(options: ScanOptions): Promise<ScanReport> {
  const { root, llm, fetchImpl, sourceId, force = false, dryRun = false, log = () => {} } = options;
  const clock = options.now ?? Date.now;
  const startedAt = nowIso(clock());

  const allSources = await readSources(root);
  if (sourceId && !allSources.some((s) => s.id === sourceId)) throw new Error(`Kaynak bulunamadı: ${sourceId}`);
  const sources = allSources.filter((s) => s.active && (!sourceId || s.id === sourceId));
  const previousState = await readScanState(root);
  const existing = await readEvents(root);
  const blocklist = await readBlocklist(root);
  const warnings: string[] = [];

  const outcomes = await mapPool(sources, CONCURRENCY, async (source): Promise<SourceOutcome> => {
    const prev = previousState[source.id];
    const started = clock();
    const base = { lastCheckedAt: nowIso(clock()), hash: prev?.hash, lastEventCount: prev?.lastEventCount };

    if (source.render === "browser") {
      const warning = `${source.id}: tarayıcı gerektiren kaynaklar henüz desteklenmiyor, atlandı`;
      return { kind: "skipped", source, warning, rejected: [], state: { ...base, lastStatus: "skipped", lastError: warning } };
    }

    try {
      const page = await fetchPage(source.url, { fetchImpl });
      const latencyMs = Math.max(0, Math.round(clock() - started));
      const hash = computeHash(page.text);
      if (!force && prev?.hash === hash) {
        log(`⚪ ${source.id}: değişiklik yok`);
        return { kind: "unchanged", source, state: { ...base, lastStatus: "unchanged", httpStatus: page.status, latencyMs } };
      }

      const knownEvents = existing
        .filter((e) => e.sourceId === source.id && classify(e, clock()) !== "past")
        .slice(0, 50)
        .map(({ id, title, startDate, deadline }) => ({ id, title, startDate, deadline }));
      const { events, malformed } = await extractEvents(llm, { page, source, knownEvents, now: clock() });
      const { accepted, rejected } = verifyEvents(events, page, clock());
      if (malformed) rejected.push({ title: "(biçimsiz yanıt)", reason: `${malformed} öğe şemaya uymadı` });

      if (suspiciousDrop(prev?.lastEventCount, accepted.length)) {
        const warning = `${source.id}: önceden ${prev?.lastEventCount} etkinlik veriyordu, şimdi 0 — sayfa yapısı değişmiş olabilir, atlandı`;
        log(`⚠️ ${warning}`);
        return {
          kind: "skipped",
          source,
          warning,
          rejected,
          state: { ...base, lastStatus: "skipped", httpStatus: page.status, latencyMs, lastError: warning },
        };
      }

      log(`🔔 ${source.id}: ${accepted.length} etkinlik kabul, ${rejected.length} red`);
      return {
        kind: "extracted",
        source,
        page,
        accepted,
        rejected,
        state: { hash, lastCheckedAt: base.lastCheckedAt, lastStatus: "success", httpStatus: page.status, latencyMs, lastEventCount: accepted.length },
      };
    } catch (err) {
      const message = (err as Error).message;
      log(`❌ ${source.id}: ${message}`);
      return {
        kind: "error",
        source,
        message,
        state: {
          ...base,
          lastStatus: "error",
          httpStatus: err instanceof FetchError ? err.status : undefined,
          lastError: message.slice(0, 500),
          latencyMs: Math.max(0, Math.round(clock() - started)),
        },
      };
    }
  });

  // Birleştirme sırayla yapılır ki farklı kaynaklardan gelen aynı etkinlik tekilleşsin.
  let pool = existing;
  const created = new Map<string, Event>();
  const updated = new Map<string, Event>();
  const rejected: LastScan["rejected"] = [];
  const now = nowIso(clock());

  for (const o of outcomes) {
    if (o.kind === "skipped") {
      warnings.push(o.warning);
      rejected.push(...o.rejected.map((r) => ({ sourceId: o.source.id, ...r })));
    }
    if (o.kind !== "extracted") continue;
    const merged = mergeEvents({ source: o.source, pageUrl: o.page.finalUrl, accepted: o.accepted, existing: pool, blocklist, now });
    rejected.push(...[...o.rejected, ...merged.rejected].map((r) => ({ sourceId: o.source.id, ...r })));
    for (const e of merged.created) created.set(e.id, e);
    for (const e of merged.updated) (created.has(e.id) ? created : updated).set(e.id, e);
    const changed = new Map([...merged.created, ...merged.updated].map((e) => [e.id, e]));
    pool = [...pool.map((e) => changed.get(e.id) ?? e), ...merged.created];
  }

  const errorCount = outcomes.filter((o) => o.kind === "error").length;
  const successCount = outcomes.filter((o) => o.kind === "extracted").length;
  const unchangedCount = outcomes.filter((o) => o.kind === "unchanged").length;

  let aborted: string | undefined;
  if (tooManyErrors(errorCount, outcomes.length)) aborted = `Kaynakların çoğu hata verdi (${errorCount}/${outcomes.length})`;
  else if (tooManyNewEvents(created.size)) aborted = `Tek taramada çok fazla yeni etkinlik (${created.size}) — muhtemel bozulma`;

  const lastScan: LastScan = {
    startedAt,
    completedAt: nowIso(clock()),
    status: aborted ? "aborted" : errorCount === 0 ? "success" : successCount + unchangedCount > 0 ? "partial" : "failed",
    totalSources: outcomes.length,
    successCount,
    unchangedCount,
    errorCount,
    newEvents: created.size,
    updatedEvents: updated.size,
    warnings,
    rejected,
  };

  const report: ScanReport = {
    lastScan,
    aborted,
    created: [...created.values()],
    updated: [...updated.values()],
    outcomes: outcomes.map((o) => ({
      sourceId: o.source.id,
      kind: o.kind,
      detail: o.kind === "error" ? o.message : o.kind === "skipped" ? o.warning : undefined,
    })),
  };

  if (dryRun || aborted) return report;

  for (const e of [...created.values(), ...updated.values()]) await writeEvent(e, root);
  const nextState: ScanState = { ...previousState };
  for (const o of outcomes) nextState[o.source.id] = o.state;
  for (const id of Object.keys(nextState)) if (!allSources.some((s) => s.id === id)) delete nextState[id];
  await writeScanState(nextState, root);
  await writeLastScan(lastScan, root);
  return report;
}
