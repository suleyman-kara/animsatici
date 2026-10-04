"use client";

import { track } from "@/lib/track";

export function SubscribeButtons({ siteUrl }: { siteUrl: string }) {
  const icsUrl = `${siteUrl}/takvim.ics`;
  const webcal = icsUrl.replace(/^https?:/, "webcal:");
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <a href={google} target="_blank" rel="noopener" onClick={() => track("ics-abone", { via: "google" })}
        className="rounded-lg bg-accent px-3 py-2 font-semibold text-accent-fg hover:opacity-90">
        Google Takvim&apos;e abone ol
      </a>
      <a href={webcal} onClick={() => track("ics-abone", { via: "webcal" })}
        className="rounded-lg border border-border bg-surface px-3 py-2 font-medium hover:bg-surface-muted">
        Apple / Outlook
      </a>
    </div>
  );
}
