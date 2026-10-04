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
    return <span className="rounded-full border-2 border-border bg-danger-soft px-2 py-0.5 font-display font-bold text-danger">🚫 İptal edildi</span>;
  }
  return <span className="rounded-full border-2 border-border bg-pop-mint px-2 py-0.5 font-display font-bold text-pop-fg">{PHASE_LABELS[classify(event, now)]}</span>;
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
        className="pressable rounded-xl border-2 border-border bg-pop-yellow px-4 py-2 font-display font-bold text-pop-fg shadow-pop-sm">
        {phase === "open" ? "Başvur" : "Etkinlik sayfası"} ↗
      </a>
      {event.status !== "cancelled" && phase !== "past" && calendarUrl && (
        <a href={calendarUrl} target="_blank" rel="noopener" onClick={() => track("takvime-ekle", { event: id })}
          className="pressable rounded-xl border-2 border-border bg-surface px-4 py-2 font-display font-bold shadow-pop-sm">
          📌 Takvime ekle
        </a>
      )}
    </div>
  );
}
