import type { Metadata } from "next";
import Link from "next/link";
import { getPastEvents } from "@/lib/data";
import { formatDate, formatRange, referenceInstant, TIME_ZONE } from "@/lib/dates";
import { locationText, TYPE_LABELS } from "@/lib/labels";

export const metadata: Metadata = {
  title: "Arşiv",
  description: "Geçmiş hackathon, kamp ve kampüs etkinlikleri. Hangi etkinliğin hangi ay yapıldığını görüp önümüzdeki yılı planlayın.",
  alternates: { canonical: "/arsiv" },
};

const monthFmt = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: TIME_ZONE });

export default async function ArchivePage() {
  const events = await getPastEvents();
  const groups = new Map<string, typeof events>();
  for (const e of events) {
    const key = monthFmt.format(new Date(referenceInstant(e)));
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Arşiv</h1>
        <p className="mt-2 max-w-2xl text-fg-muted">
          Tamamlanan ve iptal edilen etkinlikler. &quot;Geçen yıl bu kamp hangi ay açılmıştı?&quot; sorusunun cevabı burada.
        </p>
      </header>
      {events.length === 0 && <p className="text-fg-muted">Arşivde henüz etkinlik yok.</p>}
      {[...groups].map(([month, list]) => (
        <section key={month} aria-label={month}>
          <h2 className="mb-2 text-lg font-semibold capitalize">{month}</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {list.map((e) => (
              <li key={e.id} className="flex flex-col gap-0.5 p-4 sm:flex-row sm:items-baseline sm:gap-4">
                <span className="w-44 shrink-0 text-sm text-fg-muted">
                  {formatRange(e.startDate, e.endDate) || `Son başvuru ${formatDate(e.deadline!)}`}
                </span>
                <span className="flex-1">
                  <Link href={`/etkinlik/${e.id}`} className={`font-medium hover:underline ${e.status === "cancelled" ? "line-through opacity-70" : ""}`}>
                    {e.title}
                  </Link>
                  <span className="text-sm text-fg-muted"> · {TYPE_LABELS[e.type]} · {[e.organizer, locationText(e.location)].filter(Boolean).join(" · ")}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
