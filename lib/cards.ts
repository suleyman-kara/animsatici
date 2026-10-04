import "server-only";
import type { CardEvent } from "@/components/EventCard";
import { googleCalendarUrls } from "./calendar";
import { formatDate, formatRange } from "./dates";
import type { Event } from "./schema";
import { SITE_URL } from "./site";

/** İstemciye yalnızca kartın ihtiyaç duyduğu alanlar gider (sayfa boyutu küçük kalsın). */
export function toCardEvent(e: Event): CardEvent {
  return {
    id: e.id,
    title: e.title,
    summary: e.summary,
    type: e.type,
    category: e.category,
    organizer: e.organizer,
    startDate: e.startDate,
    endDate: e.endDate,
    deadline: e.deadline,
    location: e.location,
    url: e.url,
    status: e.status,
    tags: e.tags,
    dateText: formatRange(e.startDate, e.endDate),
    deadlineText: e.deadline ? formatDate(e.deadline) : undefined,
    sponsoredUntil: e.sponsored?.until,
    calendarUrls: googleCalendarUrls(e, `${SITE_URL}/etkinlik/${e.id}`),
  };
}
