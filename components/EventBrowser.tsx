"use client";

import { useMemo, useSyncExternalStore } from "react";
import { classify, endInstant, inWindow, startInstant, type EventPhase } from "@/lib/dates";
import Link from "next/link";
import { CATEGORY_EMOJI, CATEGORY_LABELS, CATEGORY_POP, TYPE_EMOJI, TYPE_LABELS } from "@/lib/labels";
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

const SECTIONS: { phase: EventPhase; emoji: string; title: string; hint: string }[] = [
  { phase: "open", emoji: "✍️", title: "Başvurusu açık", hint: "Kapanmadan yetiş" },
  { phase: "upcoming", emoji: "🚀", title: "Yakında başlıyor", hint: "Takvimine ekle, unutma" },
];

const fieldClass = "rounded-xl border-2 border-border bg-surface px-3 py-2 text-sm shadow-pop-sm";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-surface/60 p-6 text-center">
      <p className="text-3xl" aria-hidden>
        {filtered ? "🔍" : "😴"}
      </p>
      <p className="mt-2 font-display font-bold">{filtered ? "Bu filtrelere uyan bir şey yok." : "Burası şimdilik sessiz."}</p>
      <p className="mt-1 text-sm text-fg-muted">
        {filtered ? (
          <button type="button" className="underline" onClick={onClear}>
            Filtreleri temizle
          </button>
        ) : (
          <>
            Bildiğin bir etkinlik mi var?{" "}
            <Link href="/oneri" className="font-semibold underline">
              Bize söyle
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}

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
  const filtered = KEYS.some((k) => filters[k]);
  const closingThisWeek = phased.filter(({ e, phase }) => phase === "open" && e.deadline && endInstant(e.deadline) - now <= WEEK_MS).length;

  const byPhase = (phase: EventPhase) => {
    const list = phased.filter((p) => p.phase === phase);
    if (phase === "open") return list.sort((a, b) => endInstant(a.e.deadline!) - endInstant(b.e.deadline!));
    return list.sort((a, b) => startInstant(a.e.startDate ?? a.e.deadline!) - startInstant(b.e.startDate ?? b.e.deadline!));
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-2 font-display text-sm font-bold">
        <span className="rounded-full border-2 border-border bg-pop-mint px-3 py-1 text-pop-fg shadow-pop-sm">🗓️ 30 günde {phased.length} fırsat</span>
        {closingThisWeek > 0 && (
          <span className="rounded-full border-2 border-border bg-pop-pink px-3 py-1 text-pop-fg shadow-pop-sm">
            🔥 {closingThisWeek} başvuru bu hafta kapanıyor
          </span>
        )}
      </div>

      <form role="search" className="flex flex-col gap-3" onSubmit={(ev) => ev.preventDefault()}>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <label className="sr-only" htmlFor="q">
            Etkinlik ara
          </label>
          <input
            id="q"
            type="search"
            placeholder="🔎 Hackathon, şirket, şehir…"
            value={filters.q}
            onChange={(ev) => update({ q: ev.target.value })}
            className={fieldClass}
          />
          <select aria-label="Tür" className={fieldClass} value={filters.tur} onChange={(ev) => update({ tur: ev.target.value })}>
            <option value="">Her tür</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {TYPE_EMOJI[t]} {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <select aria-label="Konum" className={fieldClass} value={filters.konum} onChange={(ev) => update({ konum: ev.target.value })}>
            <option value="">Her yer</option>
            <option value="online">💻 Online</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                📍 {c}
              </option>
            ))}
          </select>
        </div>
        <div role="group" aria-label="Kategori" className="flex flex-wrap gap-2">
          {[["", "✨", "Hepsi"] as const, ...Object.entries(CATEGORY_LABELS).map(([v, l]) => [v, CATEGORY_EMOJI[v as keyof typeof CATEGORY_EMOJI], l] as const)].map(
            ([value, emoji, label]) => {
              const on = filters.kategori === value;
              return (
                <button
                  key={value || "all"}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update({ kategori: value })}
                  className={`pressable rounded-full border-2 border-border px-3 py-1 font-display text-sm font-bold shadow-pop-sm ${
                    on ? `${value ? CATEGORY_POP[value as keyof typeof CATEGORY_POP] : "bg-pop-yellow"} text-pop-fg` : "bg-surface"
                  }`}
                >
                  {emoji} {label}
                </button>
              );
            },
          )}
        </div>
      </form>

      {featured.length > 0 && (
        <section aria-labelledby="featured">
          <h2 id="featured" className="mb-3 font-display text-2xl font-extrabold">
            ⭐ Öne çıkanlar
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {featured.map(({ e, phase }) => (
              <EventCard key={e.id} event={e} phase={phase} now={now} />
            ))}
          </div>
        </section>
      )}

      {SECTIONS.map(({ phase, emoji, title, hint }) => {
        const list = byPhase(phase);
        return (
          <section key={phase} aria-labelledby={`s-${phase}`}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id={`s-${phase}`} className="font-display text-2xl font-extrabold">
                {emoji} {title}
              </h2>
              <span className="rounded-full border-2 border-border bg-surface px-2 font-display text-sm font-bold">{list.length}</span>
              <span className="text-sm text-fg-muted">{hint}</span>
            </div>
            {list.length === 0 ? (
              <EmptyState filtered={filtered} onClear={() => update(EMPTY)} />
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
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
