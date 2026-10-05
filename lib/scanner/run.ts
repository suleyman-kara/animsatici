import { classify, nowIso } from "../dates";
import { limitLlm, type LlmClient } from "../llm";
import type { Event, LastScan, ScanState, Source, SourceScanState } from "../schema";
import {
  readBlocklist,
  readEvents,
  readScanState,
  readSources,
  deleteEvent,
  writeEvent,
  writeLastScan,
  writeScanState,
} from "../store";
import { followDetailPages } from "./details";
import { mapPool } from "./pool";
import { extractEvents } from "./extract";
import { FetchError, fetchPage, type FetchOptions, type Page } from "./fetch";
import { suspiciousDrop, tooManyErrors, tooManyNewEvents } from "./guards";
import { computeHash } from "./hash";
import { mergeEvents } from "./merge";
import { verifyEvents, type Rejection } from "./verify";
import type { ExtractedEvent } from "./extract";

/** Aynı anda taranan kaynak sayısı. Gemini çağrıları ayrıca LLM_CONCURRENCY ile sınırlanır. */
const CONCURRENCY = 6;
/** Tüm tarama boyunca aynı anda en fazla bu kadar Gemini çağrısı (kaynak + detay sayfaları toplamı). */
export const LLM_CONCURRENCY = 4;
/** Bu süre dolduktan sonra yeni kaynağa başlanmaz; kalanlar bir sonraki taramaya kalır. */
export const DEFAULT_BUDGET_MS = 20 * 60 * 1000;
/** Bitişinin (ya da son başvurusunun) üzerinden bu kadar gün geçen etkinlik dosyası silinir. */
export const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ScanOptions = {
  root?: string;
  llm: LlmClient;
  fetchImpl?: FetchOptions["fetchImpl"];
  sourceId?: string;
  force?: boolean;
  dryRun?: boolean;
  now?: () => number;
  log?: (line: string) => void;
  /** Yeni kaynağa başlamak için kalan süre (ms). Varsayılan 20 dk; SCAN_BUDGET_MS ile değiştirilebilir. */
  budgetMs?: number;
  llmConcurrency?: number;
};

type SourceOutcome =
  | { kind: "deferred"; source: Source; state?: SourceScanState }
  | { kind: "unchanged"; source: Source; state: SourceScanState }
  | { kind: "error"; source: Source; state: SourceScanState; message: string }
  | { kind: "skipped"; source: Source; state: SourceScanState; warning: string; rejected: Rejection[] }
  | { kind: "extracted"; source: Source; state: SourceScanState; page: Page; accepted: ExtractedEvent[]; rejected: Rejection[] };

export type ScanReport = {
  lastScan: LastScan;
  aborted?: string;
  created: Event[];
  updated: Event[];
  removed: Event[];
  outcomes: { sourceId: string; kind: SourceOutcome["kind"]; detail?: string }[];
};


export async function runScan(options: ScanOptions): Promise<ScanReport> {
  const { root, fetchImpl, sourceId, force = false, dryRun = false, log = () => {} } = options;
  const llm = limitLlm(options.llm, options.llmConcurrency ?? LLM_CONCURRENCY);
  const budgetMs = options.budgetMs ?? (Number(process.env.SCAN_BUDGET_MS) || DEFAULT_BUDGET_MS);
  const clock = options.now ?? Date.now;
  const scanStart = clock();
  const startedAt = nowIso(scanStart);

  const allSources = await readSources(root);
  if (sourceId && !allSources.some((s) => s.id === sourceId)) throw new Error(`Kaynak bulunamadı: ${sourceId}`);
  const previousState = await readScanState(root);
  // En uzun süredir taranmayan kaynak önce: süre bütçesi dolduğunda ertelenenler bir sonraki taramada başa geçer.
  const lastChecked = (s: Source) => (previousState[s.id] ? Date.parse(previousState[s.id].lastCheckedAt) : 0);
  const sources = allSources
    .filter((s) => s.active && (!sourceId || s.id === sourceId))
    .sort((a, b) => lastChecked(a) - lastChecked(b));
  const existing = await readEvents(root);
  const blocklist = await readBlocklist(root);
  const warnings: string[] = [];

  const outcomes = await mapPool(sources, CONCURRENCY, async (source): Promise<SourceOutcome> => {
    const prev = previousState[source.id];
    const started = clock();
    if (started - scanStart > budgetMs) {
      log(`⏳ ${source.id}: süre bütçesi doldu, bir sonraki taramaya kaldı`);
      return { kind: "deferred", source, state: prev };
    }
    const base = { lastCheckedAt: nowIso(clock()), hash: prev?.hash, lastEventCount: prev?.lastEventCount, deadDetails: prev?.deadDetails };

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
      const listing = verifyEvents(events, page, clock());
      const details = await followDetailPages({
        rejected: listing.rejected,
        llm,
        source,
        knownEvents,
        now: clock(),
        fetchImpl,
        deadDetails: prev?.deadDetails,
      });
      const deadDetails = Object.keys(details.deadDetails).length ? details.deadDetails : undefined;
      const accepted = [...listing.accepted, ...details.accepted];
      const rejected = details.rejected;
      if (details.pagesFetched || details.skippedDead) {
        log(
          `  ↳ ${source.id}: ${details.pagesFetched} detay sayfası, ${details.accepted.length} etkinlik bulundu` +
            (details.skippedDead ? `, ${details.skippedDead} sonuçsuz sayfa atlandı` : ""),
        );
      }
      if (malformed) rejected.push({ title: "(biçimsiz yanıt)", reason: `${malformed} öğe şemaya uymadı` });

      // Koruma, sayfadan çıkarılan ham etkinlik sayısına bakar: ilanlarının hepsi bitmiş bir kaynak
      // (kabul edilen 0) "sayfa bozuldu" sayılmasın.
      const extractedCount = events.length;
      if (suspiciousDrop(prev?.lastEventCount, extractedCount)) {
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
        // Gemini hatası yüzünden işlenemeyen detay sayfası varsa eski hash korunur ki kaynak yarın yeniden işlensin.
        state: { hash: details.failed ? prev?.hash : hash, lastCheckedAt: base.lastCheckedAt, lastStatus: "success", httpStatus: page.status, latencyMs, lastEventCount: extractedCount, deadDetails },
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

  const finalStates = new Map<string, SourceScanState | undefined>(outcomes.map((o) => [o.source.id, o.state]));
  for (const o of outcomes) {
    if (o.kind === "skipped") {
      warnings.push(o.warning);
      rejected.push(...o.rejected.map((r) => ({ sourceId: o.source.id, ...r })));
    }
    if (o.kind !== "extracted") continue;
    const merged = mergeEvents({ source: o.source, pageUrl: o.page.finalUrl, accepted: o.accepted, existing: pool, blocklist, now });
    const prev = previousState[o.source.id];
    if (tooManyNewEvents(merged.created.length, prev?.lastEventCount)) {
      // Yalnızca bu kaynak atlanır; eski hash korunduğundan bir sonraki taramada yeniden denenir.
      const warning = `${o.source.id}: tek taramada ${merged.created.length} yeni etkinlik (önceki çıkarım ${prev?.lastEventCount}) — muhtemel bozulma, atlandı`;
      log(`⚠️ ${warning}`);
      warnings.push(warning);
      finalStates.set(o.source.id, { ...o.state, hash: prev?.hash, lastEventCount: prev?.lastEventCount, lastStatus: "skipped", lastError: warning });
      continue;
    }
    rejected.push(...[...o.rejected, ...merged.rejected].map((r) => ({ sourceId: o.source.id, ...r })));
    for (const e of merged.created) created.set(e.id, e);
    for (const e of merged.updated) (created.has(e.id) ? created : updated).set(e.id, e);
    const changed = new Map([...merged.created, ...merged.updated].map((e) => [e.id, e]));
    pool = [...pool.map((e) => changed.get(e.id) ?? e), ...merged.created];
  }

  // Yalnızca güncel etkinlikler tutulur: bitişinin üzerinden saklama süresi geçenler silinir (takvim aboneleri
  // için son 1 ay kalır). Sponsorlu kayıtlara tarayıcı dokunmaz.
  const cutoff = clock() - RETENTION_DAYS * DAY_MS;
  const removed = pool.filter((e) => !e.sponsored && !created.has(e.id) && !updated.has(e.id) && classify(e, cutoff) === "past");
  if (removed.length) log(`🧹 ${removed.length} eski etkinlik silinecek`);

  const errorCount = outcomes.filter((o) => o.kind === "error").length;
  const deferredCount = outcomes.filter((o) => o.kind === "deferred").length;
  if (deferredCount) warnings.push(`${deferredCount} kaynak süre bütçesi dolduğu için bir sonraki taramaya kaldı`);
  const kindOf = (o: SourceOutcome): SourceOutcome["kind"] =>
    o.kind === "extracted" && finalStates.get(o.source.id)?.lastStatus === "skipped" ? "skipped" : o.kind;
  const successCount = outcomes.filter((o) => kindOf(o) === "extracted").length;
  const unchangedCount = outcomes.filter((o) => o.kind === "unchanged").length;

  let aborted: string | undefined;
  // Durdurma kuralı yalnızca daha önce başarıyla taranmış kaynaklara bakar: yeni eklenen ve henüz
  // çalışmayan kaynaklar sağlam kaynakların sonuçlarının yazılmasını engellemesin.
  const proven = outcomes.filter((o) => o.kind !== "deferred" && ["success", "unchanged"].includes(previousState[o.source.id]?.lastStatus ?? ""));
  const provenErrors = proven.filter((o) => o.kind === "error").length;
  if (tooManyErrors(provenErrors, proven.length)) aborted = `Daha önce çalışan kaynakların çoğu hata verdi (${provenErrors}/${proven.length})`;

  const lastScan: LastScan = {
    startedAt,
    completedAt: nowIso(clock()),
    status: aborted ? "aborted" : errorCount === 0 ? "success" : successCount + unchangedCount > 0 ? "partial" : "failed",
    totalSources: outcomes.length - deferredCount,
    successCount,
    unchangedCount,
    errorCount,
    newEvents: created.size,
    updatedEvents: updated.size,
    ...(deferredCount && { deferredCount }),
    ...(removed.length && { removedEvents: removed.length }),
    warnings,
    rejected,
  };

  const report: ScanReport = {
    lastScan,
    aborted,
    created: [...created.values()],
    updated: [...updated.values()],
    removed,
    outcomes: outcomes.map((o) => ({
      sourceId: o.source.id,
      kind: kindOf(o),
      detail: o.kind === "error" ? o.message : o.kind === "skipped" ? o.warning : finalStates.get(o.source.id)?.lastError,
    })),
  };

  if (dryRun || aborted) return report;

  for (const e of [...created.values(), ...updated.values()]) await writeEvent(e, root);
  for (const e of removed) await deleteEvent(e.id, root);
  const nextState: ScanState = { ...previousState };
  for (const [id, state] of finalStates) if (state) nextState[id] = state;
  for (const id of Object.keys(nextState)) if (!allSources.some((s) => s.id === id)) delete nextState[id];
  await writeScanState(nextState, root);
  await writeLastScan(lastScan, root);
  return report;
}
