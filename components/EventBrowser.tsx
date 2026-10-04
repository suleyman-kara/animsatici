"use client";

import { useMemo, useSyncExternalStore } from "react";
import { classify, endInstant, inWindow, startInstant, WINDOW_DAYS, type EventPhase } from "@/lib/dates";
import { CATEGORY_LABELS, TYPE_LABELS } from "@/lib/labels";
import { useNow } from "@/lib/use-now";
import { EventCard, isSponsoredNow, type CardEvent } from "./EventCard";

type Filters = { q: string; kategori: string; tur: string; konum: string };
const EMPTY: Filters = { q: "", kategori: "", tur: "", konum: "" };
const KEYS = Object.keys(EMPTY) as (keyof Filters)[];

// Filtreler URL'de tutulur (paylaşılabilir); URL dış bir "store" gibi okunur.
const URL_EVENT = "kr:filters";

function subscribeUrl(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(URL_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(URL_EVENT, onChange);
  };
}

function parseFilters(search: string): Filters {
  const params = new URLSearchParams(search);
  return Object.fromEntries(KEYS.map((k) => [k, params.get(k) ?? ""])) as Filters;
}

function writeFilters(filters: Filters) {
  const params = new URLSearchParams();
  for (const k of KEYS) if (filters[k]) params.set(k, filters[k]);
  const qs = params.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  window.dispatchEvent(new Event(URL_EVENT));
}


const fold = (s: string) => s.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g, "");

function matches(e: CardEvent, f: Filters): boolean {
  if (f.kategori && e.category !== f.kategori) return false;
  if (f.tur && e.type !== f.tur) return false;
  if (f.konum === "online" && e.location.mode !== "online" && e.location.mode !== "hybrid") return false;
  if (f.konum && f.konum !== "online" && e.location.city !== f.konum) return false;
  if (f.q) {
    const hay = fold([e.title, e.organizer, e.summary, e.location.city, ...e.tags].filter(Boolean).join(" "));
    if (!fold(f.q).split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

const SECTIONS: { phase: EventPhase; title: string; empty: string }[] = [
  { phase: "open", title: "Başvurusu açık", empty: `Önümüzdeki ${WINDOW_DAYS} gün içinde başvurusu kapanan etkinlik yok.` },
  { phase: "upcoming", title: "Yakında başlıyor", empty: `Önümüzdeki ${WINDOW_DAYS} gün içinde başlayan etkinlik yok.` },
];

const selectClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm";

export function EventBrowser({ events, builtAt }: { events: CardEvent[]; builtAt: number }) {
  // İlk çizim build anına göre (HTML ile birebir), ardından gerçek saate göre yeniden sınıflandırılır.
  const now = useNow(builtAt);
  const search = useSyncExternalStore(subscribeUrl, () => window.location.search, () => "");
  const filters = useMemo(() => parseFilters(search), [search]);
  const update = (patch: Partial<Filters>) => writeFilters({ ...filters, ...patch });

  const cities = useMemo(
    () => [...new Set(events.map((e) => e.location.city).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, "tr")),
    [events],
  );
  const types = useMemo(() => [...new Set(events.map((e) => e.type))], [events]);

  const visible = events.filter((e) => matches(e, filters));
  const all = visible.map((e) => ({ e, phase: classify(e, now) })).filter(({ phase }) => phase !== "past");
  // Yalnızca önümüzdeki 30 gün içinde başvurusu kapanan ya da başlayan etkinlikler; devam edenlerin ayrı sayfası var.
  const phased = all.filter(({ e, phase }) => phase !== "ongoing" && inWindow(e, now));
  // Sponsorlu öne çıkarmalar pencereden bağımsızdır (süresini proje sahibi belirler).
  const featured = all.filter(({ e }) => isSponsoredNow(e, now));
  const active = phased;
  const filtered = KEYS.some((k) => filters[k]);

  const byPhase = (phase: EventPhase) => {
    const list = phased.filter((p) => p.phase === phase);
    if (phase === "open") return list.sort((a, b) => endInstant(a.e.deadline!) - endInstant(b.e.deadline!));
    return list.sort((a, b) => startInstant(a.e.startDate ?? a.e.deadline!) - startInstant(b.e.startDate ?? b.e.deadline!));
  };

  return (
    <div className="flex flex-col gap-8">
      <form role="search" className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]" onSubmit={(ev) => ev.preventDefault()}>
        <label className="sr-only" htmlFor="q">Etkinlik ara</label>
        <input
          id="q"
          type="search"
          placeholder="Etkinlik, kurum veya şehir ara…"
          value={filters.q}
          onChange={(ev) => update({ q: ev.target.value })}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <select aria-label="Kategori" className={selectClass} value={filters.kategori} onChange={(ev) => update({ kategori: ev.target.value })}>
          <option value="">Tüm kategoriler</option>
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select aria-label="Tür" className={selectClass} value={filters.tur} onChange={(ev) => update({ tur: ev.target.value })}>
          <option value="">Tüm türler</option>
          {types.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select aria-label="Konum" className={selectClass} value={filters.konum} onChange={(ev) => update({ konum: ev.target.value })}>
          <option value="">Tüm konumlar</option>
          <option value="online">Online</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </form>

      {filtered && (
        <p className="-mt-5 text-sm text-fg-muted">
          {active.length} etkinlik bulundu ·{" "}
          <button type="button" className="underline" onClick={() => update(EMPTY)}>
            Filtreleri temizle
          </button>
        </p>
      )}

      {featured.length > 0 && (
        <section aria-labelledby="featured">
          <h2 id="featured" className="mb-3 text-sm font-semibold uppercase tracking-wide text-sponsor">Öne çıkanlar</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {featured.map(({ e, phase }) => (
              <EventCard key={e.id} event={e} phase={phase} now={now} />
            ))}
          </div>
        </section>
      )}

      {SECTIONS.map(({ phase, title, empty }) => {
        const list = byPhase(phase);
        if (list.length === 0 && !empty) return null;
        return (
          <section key={phase} aria-labelledby={`s-${phase}`}>
            <h2 id={`s-${phase}`} className="mb-3 flex items-baseline gap-2 text-xl font-bold">
              {title} <span className="text-sm font-normal text-fg-muted">{list.length}</span>
            </h2>
            {list.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">
                {filtered ? "Bu filtrelere uyan etkinlik yok." : empty}
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {list.map(({ e, phase: p }) => (
                  <EventCard key={e.id} event={e} phase={p} now={now} />
                ))}
              </div>
            )}
          </section>
        );
      })}

    </div>
  );
}
