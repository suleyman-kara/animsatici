"use client";

import Link from "next/link";
import { daysUntil, endInstant, type EventPhase } from "@/lib/dates";
import { CATEGORY_POP, locationText, TYPE_EMOJI, TYPE_LABELS } from "@/lib/labels";
import type { Event } from "@/lib/schema";
import { pickCalendarUrl, type CalendarUrls } from "@/lib/calendar";
import { track } from "@/lib/track";

export type CardEvent = Pick<
  Event,
  "id" | "title" | "summary" | "type" | "category" | "organizer" | "startDate" | "endDate" | "deadline" | "location" | "url" | "status" | "tags"
> & {
  /** Sunucuda biçimlenir ki sunucu/tarayıcı Intl farkları hydration uyumsuzluğu yaratmasın. */
  dateText: string;
  deadlineText?: string;
  sponsoredUntil?: string;
  calendarUrls: CalendarUrls;
};

export function isSponsoredNow(event: Pick<CardEvent, "sponsoredUntil">, now: number): boolean {
  return !!event.sponsoredUntil && endInstant(event.sponsoredUntil) >= now;
}

function DeadlineBadge({ deadline, now }: { deadline: string; now: number }) {
  const days = daysUntil(deadline, now);
  if (days < 0) return null;
  if (days === 0) return <Sticker className="bg-pop-pink text-pop-fg">🔥 Bugün son gün!</Sticker>;
  if (days <= 3) return <Sticker className="bg-pop-pink text-pop-fg">⏰ Son {days} gün</Sticker>;
  if (days <= 7) return <Sticker className="bg-pop-yellow text-pop-fg">⏳ {days} gün kaldı</Sticker>;
  return <Sticker className="bg-surface-muted text-fg">📅 {days} gün kaldı</Sticker>;
}

export function Sticker({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border-2 border-border px-2 py-0.5 font-display text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

export function EventCard({ event, phase, now }: { event: CardEvent; phase: EventPhase; now: number }) {
  const cancelled = event.status === "cancelled";
  const sponsored = isSponsoredNow(event, now);
  const { dateText, deadlineText } = event;
  const calendarUrl = pickCalendarUrl(event.calendarUrls, event.deadline, now);
  return (
    <article
      className={`group relative flex flex-col gap-3 rounded-2xl border-2 border-border p-4 shadow-pop transition-transform duration-150 hover:-translate-y-0.5 sm:p-5 ${
        sponsored ? "bg-sponsor-soft" : "bg-surface"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`grid size-11 shrink-0 place-items-center rounded-xl border-2 border-border text-xl shadow-pop-sm transition-transform group-hover:rotate-[-6deg] ${CATEGORY_POP[event.category]}`}
        >
          {TYPE_EMOJI[event.type]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-display text-xs font-bold uppercase tracking-wide text-fg-muted">{TYPE_LABELS[event.type]}</span>
            {sponsored && <Sticker className="bg-pop-yellow text-pop-fg">⭐ Sponsorlu</Sticker>}
            {cancelled && <Sticker className="bg-danger-soft text-danger">🚫 İptal edildi</Sticker>}
            {!cancelled && phase === "open" && event.deadline && <DeadlineBadge deadline={event.deadline} now={now} />}
            {!cancelled && phase === "ongoing" && <Sticker className="bg-pop-mint text-pop-fg">🟢 Şu an sürüyor</Sticker>}
          </div>
          <h3 className={`mt-1 font-display text-xl font-bold leading-tight ${cancelled ? "line-through decoration-2 opacity-60" : ""}`}>
            <Link href={`/etkinlik/${event.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
              {event.title}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-fg-muted">{[event.organizer, locationText(event.location)].filter(Boolean).join(" · ")}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {dateText && (
          <span className="rounded-lg bg-surface-muted px-2 py-1">
            🗓️ <span className="font-medium">{dateText}</span>
          </span>
        )}
        {deadlineText && (
          <span className="rounded-lg bg-surface-muted px-2 py-1">
            ✍️ Son başvuru: <span className="font-medium">{deadlineText}</span>
          </span>
        )}
      </div>

      <p className="line-clamp-3 text-sm leading-relaxed text-fg-muted">{event.summary}</p>

      {/* Butonlar kartın tıklanabilir alanının üstünde durur */}
      <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-1">
        <a
          href={event.url}
          target="_blank"
          rel="noopener"
          onClick={() => track("basvur-tikla", { event: event.id, sponsored })}
          className="pressable rounded-xl border-2 border-border bg-pop-yellow px-3.5 py-1.5 font-display text-sm font-bold text-pop-fg shadow-pop-sm"
        >
          {phase === "open" ? "Başvur" : "Detay"} ↗
        </a>
        {!cancelled && phase !== "past" && calendarUrl && (
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener"
            onClick={() => track("takvime-ekle", { event: event.id })}
            className="pressable rounded-xl border-2 border-border bg-surface px-3.5 py-1.5 font-display text-sm font-bold shadow-pop-sm"
          >
            📌 Takvime ekle
          </a>
        )}
        <Link href={`/oneri?tur=hata&etkinlik=${event.id}`} className="ml-auto text-xs text-fg-muted underline-offset-2 hover:underline">
          Hatalı mı?
        </Link>
      </div>
    </article>
  );
}
