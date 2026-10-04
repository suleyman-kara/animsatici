"use client";

import Link from "next/link";
import { daysUntil, endInstant, type EventPhase } from "@/lib/dates";
import { locationText, TYPE_LABELS } from "@/lib/labels";
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
  const label = days === 0 ? "Son gün!" : days <= 3 ? `Son ${days} gün!` : `${days} gün kaldı`;
  const urgent = days <= 3;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${urgent ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}
    >
      {label}
    </span>
  );
}

export function EventCard({ event, phase, now }: { event: CardEvent; phase: EventPhase; now: number }) {
  const cancelled = event.status === "cancelled";
  const sponsored = isSponsoredNow(event, now);
  const { dateText, deadlineText } = event;
  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl border p-4 sm:p-5 ${
        sponsored ? "border-sponsor-border bg-sponsor-soft" : "border-border bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-surface-muted px-2 py-0.5 font-medium text-fg-muted">{TYPE_LABELS[event.type]}</span>
        {sponsored && <span className="rounded-full bg-warn-soft px-2 py-0.5 font-semibold text-sponsor">Sponsorlu</span>}
        {cancelled && <span className="rounded-full bg-danger-soft px-2 py-0.5 font-semibold text-danger">İptal edildi</span>}
        {!cancelled && phase === "open" && event.deadline && <DeadlineBadge deadline={event.deadline} now={now} />}
        {!cancelled && phase === "ongoing" && (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">Şu an devam ediyor</span>
        )}
      </div>

      <div>
        <h3 className={`text-lg font-semibold leading-snug ${cancelled ? "line-through decoration-1 opacity-70" : ""}`}>
          <Link href={`/etkinlik/${event.id}`} className="hover:underline">
            {event.title}
          </Link>
        </h3>
        <p className="mt-0.5 text-sm text-fg-muted">
          {[event.organizer, locationText(event.location)].filter(Boolean).join(" · ")}
        </p>
      </div>

      <dl className="grid gap-1 text-sm">
        {dateText && (
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-fg-muted">Tarih</dt>
            <dd>{dateText}</dd>
          </div>
        )}
        {deadlineText && (
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-fg-muted">Son başvuru</dt>
            <dd>{deadlineText}</dd>
          </div>
        )}
      </dl>

      <p className="line-clamp-3 text-sm leading-relaxed text-fg-muted">{event.summary}</p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <a
          href={event.url}
          target="_blank"
          rel="noopener"
          onClick={() => track("basvur-tikla", { event: event.id, sponsored })}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg hover:opacity-90"
        >
          {phase === "open" ? "Başvur" : "Detay"} ↗
        </a>
        {!cancelled && phase !== "past" && (
          <a
            href={pickCalendarUrl(event.calendarUrls, event.deadline, now)}
            target="_blank"
            rel="noopener"
            onClick={() => track("takvime-ekle", { event: event.id })}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
          >
            Takvime ekle
          </a>
        )}
        <Link
          href={`/oneri?tur=hata&etkinlik=${event.id}`}
          className="ml-auto text-xs text-fg-muted underline-offset-2 hover:underline"
        >
          Hatalı mı?
        </Link>
      </div>
    </article>
  );
}
