"use client";

import { pickCalendarUrl, type CalendarUrls } from "@/lib/calendar";
import { classify } from "@/lib/dates";
import { PHASE_LABELS } from "@/lib/labels";
import type { Event } from "@/lib/schema";
import { track } from "@/lib/track";
import { useNow } from "@/lib/use-now";

// Etkinlik sayfasının zamana bağlı kısımları: sayfa haftada bir derlendiği için tarayıcıda hesaplanır.

type Timing = Pick<Event, "startDate" | "endDate" | "deadline" | "status">;

export function PhaseBadge({ event, builtAt }: { event: Timing; builtAt: number }) {
  const now = useNow(builtAt);
  if (event.status === "cancelled") {
    return <span className="rounded-full bg-danger-soft px-2 py-0.5 font-semibold text-danger">İptal edildi</span>;
  }
  return <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">{PHASE_LABELS[classify(event, now)]}</span>;
}

type ActionsProps = {
  id: string;
  url: string;
  sponsored: boolean;
  event: Timing;
  calendarUrls: CalendarUrls;
  builtAt: number;
};

export function EventActions({ id, url, sponsored, event, calendarUrls, builtAt }: ActionsProps) {
  const now = useNow(builtAt);
  const phase = classify(event, now);
  const calendarUrl = pickCalendarUrl(calendarUrls, event.deadline, now);
  return (
    <div className="flex flex-wrap gap-2">
      <a href={url} target="_blank" rel="noopener" onClick={() => track("basvur-tikla", { event: id, sponsored })}
        className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-fg hover:opacity-90">
        {phase === "open" ? "Başvur" : "Etkinlik sayfası"} ↗
      </a>
      {event.status !== "cancelled" && phase !== "past" && calendarUrl && (
        <a href={calendarUrl} target="_blank" rel="noopener" onClick={() => track("takvime-ekle", { event: id })}
          className="rounded-lg border border-border bg-surface px-4 py-2 font-medium hover:bg-surface-muted">
          Takvime ekle
        </a>
      )}
    </div>
  );
}
