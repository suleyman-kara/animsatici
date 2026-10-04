import { ImageResponse } from "next/og";
import { getEvent, getEvents } from "@/lib/data";
import { formatDate, formatRange } from "@/lib/dates";
import { locationText, TYPE_LABELS } from "@/lib/labels";
import { SITE_NAME } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Etkinlik kartı";

export async function generateStaticParams() {
  return (await getEvents()).map((e) => ({ id: e.id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const event = await getEvent((await params).id);
  const when = event ? formatRange(event.startDate, event.endDate) || `Son başvuru: ${formatDate(event.deadline!)}` : "";
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 72, background: "#0e0f11", color: "#ececee" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: "#2dd4bf" }}>
          <div style={{ display: "flex", width: 28, height: 28, borderRadius: 999, border: "6px solid #2dd4bf", marginRight: 0 }} />
          <span>{SITE_NAME}</span>
          {event && <span style={{ color: "#a1a1aa" }}>· {TYPE_LABELS[event.type]}</span>}
        </div>
        <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>{event?.title ?? SITE_NAME}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 34, color: "#a1a1aa" }}>
          <span>{when}</span>
          {event && <span>{[event.organizer, locationText(event.location)].filter(Boolean).join(" · ")}</span>}
        </div>
      </div>
    ),
    size,
  );
}
