"use client";

import { classify } from "@/lib/dates";
import { useNow } from "@/lib/use-now";
import { EventCard, type CardEvent } from "./EventCard";

/** Şu an devam eden etkinlikler; sayfa derlendikten sonra da tarayıcıdaki saate göre süzülür. */
export function OngoingList({ events, builtAt }: { events: CardEvent[]; builtAt: number }) {
  const now = useNow(builtAt);
  const ongoing = events.filter((e) => classify(e, now) === "ongoing");
  if (ongoing.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">Şu an devam eden etkinlik yok.</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ongoing.map((e) => (
        <EventCard key={e.id} event={e} phase="ongoing" now={now} />
      ))}
    </div>
  );
}
