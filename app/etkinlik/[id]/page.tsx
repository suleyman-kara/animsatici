import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventActions, PhaseBadge } from "@/components/EventLive";
import { googleCalendarUrls } from "@/lib/calendar";
import { buildTime, getEvent, getEvents, getSources } from "@/lib/data";
import { endInstant, formatDate, formatRange, startInstant } from "@/lib/dates";
import { CATEGORY_LABELS, locationText, TYPE_LABELS } from "@/lib/labels";
import type { Event } from "@/lib/schema";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getEvents()).map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: PageProps<"/etkinlik/[id]">): Promise<Metadata> {
  const event = await getEvent((await params).id);
  if (!event) return {};
  const when = formatRange(event.startDate, event.endDate) || `Son başvuru ${formatDate(event.deadline!)}`;
  const description = `${when} · ${locationText(event.location)}. ${event.summary}`;
  return {
    title: event.title,
    description,
    alternates: { canonical: `/etkinlik/${event.id}` },
    openGraph: { type: "article", title: event.title, description, url: `/etkinlik/${event.id}` },
  };
}

function toIso(value: string, edge: "start" | "end"): string {
  // Tüm gün tarihler JSON-LD'de olduğu gibi kalır; saatli olanlar offset'li ISO.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(edge === "start" ? startInstant(value) : endInstant(value)).toISOString();
}

function jsonLd(event: Event) {
  const start = event.startDate ?? event.deadline!;
  const online = event.location.mode === "online";
  const place = { "@type": "Place", name: event.location.venue ?? event.location.city ?? "Türkiye", address: { "@type": "PostalAddress", addressLocality: event.location.city, addressCountry: "TR" } };
  const virtual = { "@type": "VirtualLocation", url: event.url };
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.summary,
    startDate: toIso(start, "start"),
    ...(event.endDate ? { endDate: toIso(event.endDate, "end") } : {}),
    eventStatus: event.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : event.location.mode === "hybrid"
        ? "https://schema.org/MixedEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
    location: online ? virtual : event.location.mode === "hybrid" ? [place, virtual] : place,
    ...(event.organizer ? { organizer: { "@type": "Organization", name: event.organizer } } : {}),
    url: `${SITE_URL}/etkinlik/${event.id}`,
    image: `${SITE_URL}/etkinlik/${event.id}/opengraph-image`,
    ...(event.deadline ? { offers: { "@type": "Offer", url: event.url, availabilityEnds: toIso(event.deadline, "end"), price: 0, priceCurrency: "TRY" } } : {}),
  };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default async function EventPage({ params }: PageProps<"/etkinlik/[id]">) {
  const event = await getEvent((await params).id);
  if (!event) notFound();
  const source = event.sourceId ? (await getSources()).find((s) => s.id === event.sourceId) : undefined;
  const cancelled = event.status === "cancelled";
  const sponsored = !!event.sponsored && endInstant(event.sponsored.until) >= buildTime();

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(event)).replace(/</g, "\\u003c") }} />
      <nav className="text-sm text-fg-muted">
        <Link href="/" className="hover:underline">Etkinlikler</Link> / {TYPE_LABELS[event.type]}
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-surface-muted px-2 py-0.5 font-medium text-fg-muted">{TYPE_LABELS[event.type]}</span>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 font-medium text-fg-muted">{CATEGORY_LABELS[event.category]}</span>
          {sponsored && <span className="rounded-full bg-warn-soft px-2 py-0.5 font-semibold text-sponsor">{event.sponsored?.label ?? "Sponsorlu"}</span>}
          <PhaseBadge event={event} builtAt={buildTime()} />
        </div>
        <h1 className={`text-3xl font-bold tracking-tight ${cancelled ? "line-through decoration-2 opacity-70" : ""}`}>{event.title}</h1>
        {event.organizer && <p className="text-lg text-fg-muted">{event.organizer}</p>}
      </header>

      <p className="text-lg leading-relaxed">{event.summary}</p>

      <EventActions
        id={event.id}
        url={event.url}
        sponsored={sponsored}
        event={event}
        calendarUrls={googleCalendarUrls(event, `${SITE_URL}/etkinlik/${event.id}`)}
        builtAt={buildTime()}
      />

      <dl className="border-t border-border">
        {event.startDate && <Row label="Tarih">{formatRange(event.startDate, event.endDate)}</Row>}
        {event.deadline && <Row label="Son başvuru">{formatDate(event.deadline)}</Row>}
        <Row label="Konum">{locationText(event.location)}</Row>
        {event.tags.length > 0 && (
          <Row label="Etiketler">
            <div className="flex flex-wrap gap-1.5">
              {event.tags.map((t) => (
                <span key={t} className="rounded-md bg-surface-muted px-2 py-0.5 text-sm">{t}</span>
              ))}
            </div>
          </Row>
        )}
        <Row label="Kaynak">
          <a href={event.evidence.pageUrl} target="_blank" rel="noopener" className="break-all underline-offset-2 hover:underline">
            {source?.title ?? new URL(event.evidence.pageUrl).host}
          </a>
          <span className="block text-sm text-fg-muted">Son doğrulama: {formatDate(event.lastSeenAt)}</span>
        </Row>
      </dl>

      <aside className="rounded-2xl border border-border bg-surface p-4 text-sm text-fg-muted">
        Bilgiler kaynak sayfadan otomatik olarak derlenir; başvurmadan önce lütfen etkinliğin kendi sayfasını kontrol edin.{" "}
        <Link href={`/oneri?tur=hata&etkinlik=${event.id}`} className="font-medium text-fg underline">Bir hata mı var? Bildir.</Link>
      </aside>
      <p className="sr-only">{SITE_NAME}</p>
    </article>
  );
}
