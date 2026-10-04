import type { Metadata } from "next";
import Link from "next/link";
import { getEvents, getLastScan, getScanState, getSources } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { CATEGORY_LABELS } from "@/lib/labels";
import type { SourceScanState } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Kaynaklar",
  description: "Kampüs30'un her gün taradığı kaynaklar ve son tarama durumları.",
  alternates: { canonical: "/kaynaklar" },
};

const STATUS: Record<SourceScanState["lastStatus"], { label: string; className: string }> = {
  success: { label: "Tarandı", className: "bg-accent-soft text-accent" },
  unchanged: { label: "Değişiklik yok", className: "bg-accent-soft text-accent" },
  skipped: { label: "Atlandı", className: "bg-warn-soft text-warn" },
  error: { label: "Hata", className: "bg-danger-soft text-danger" },
};

export default async function SourcesPage() {
  const [sources, state, events, lastScan] = await Promise.all([getSources(), getScanState(), getEvents(), getLastScan()]);
  const counts = new Map<string, number>();
  for (const e of events) if (e.sourceId) counts.set(e.sourceId, (counts.get(e.sourceId) ?? 0) + 1);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">📡 Kaynaklar</h1>
        <p className="mt-2 max-w-2xl text-fg-muted">
          Bu sayfalar her gün 19:00&apos;da taranır. Etkinlikler yapay zeka ile çıkarılır ve yalnızca kaynak sayfada birebir
          geçen başlık ve tarihler kabul edilir. Eksik bir kaynak mı var? <Link href="/oneri" className="font-medium text-fg underline">Önerin</Link>.
        </p>
        {lastScan && (
          <p className="mt-2 text-sm text-fg-muted">
            Son tarama: {formatDate(lastScan.completedAt)} · {lastScan.totalSources} kaynak · {lastScan.newEvents} yeni etkinlik
          </p>
        )}
      </header>
      <ul className="grid gap-3 md:grid-cols-2">
        {sources.filter((s) => s.active).map((s) => {
          const st = state[s.id];
          const status = st ? STATUS[st.lastStatus] : undefined;
          return (
            <li key={s.id} className="flex flex-col gap-2 rounded-2xl border-2 border-border bg-surface shadow-pop p-4">
              <div className="flex items-start justify-between gap-3">
                <a href={s.homepage ?? s.url} target="_blank" rel="noopener" className="font-semibold hover:underline">{s.title}</a>
                {status && <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}>{status.label}</span>}
              </div>
              <p className="text-sm text-fg-muted">{CATEGORY_LABELS[s.category]} · {counts.get(s.id) ?? 0} etkinlik</p>
              {st && <p className="text-xs text-fg-muted">Son kontrol: {formatDate(st.lastCheckedAt)}{st.lastStatus === "error" && st.httpStatus ? ` · HTTP ${st.httpStatus}` : ""}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
