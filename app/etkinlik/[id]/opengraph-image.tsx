import { ImageResponse } from "next/og";
import { OG_COLORS, OgFrame, OgLogo } from "@/components/OgCard";
import { getEvent, getEvents } from "@/lib/data";
import { formatDate, formatRange } from "@/lib/dates";
import { locationText, TYPE_LABELS } from "@/lib/labels";
import { SITE_NAME } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Etkinlik kartı";

const CATEGORY_BG = { ceng: OG_COLORS.violet, career: "#6fd3ff", campus: "#ff9d4d", community: OG_COLORS.pink } as const;

export async function generateStaticParams() {
  return (await getEvents()).map((e) => ({ id: e.id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const event = await getEvent((await params).id);
  const deadline = event?.deadline ? `Son başvuru: ${formatDate(event.deadline)}` : "";
  const when = event ? formatRange(event.startDate, event.endDate) : "";
  return new ImageResponse(
    (
      <OgFrame accent={event ? CATEGORY_BG[event.category] : OG_COLORS.violet}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <OgLogo />
          {event && (
            <span style={{ display: "flex", padding: "6px 18px", fontSize: 28, background: OG_COLORS.bg, border: `4px solid ${OG_COLORS.ink}`, borderRadius: 999 }}>
              {TYPE_LABELS[event.type]}
            </span>
          )}
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.08 }}>{event?.title ?? SITE_NAME}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 32 }}>
          {deadline && (
            <span style={{ display: "flex", width: "auto", alignSelf: "flex-start", padding: "4px 16px", background: OG_COLORS.yellow, border: `4px solid ${OG_COLORS.ink}`, borderRadius: 14 }}>
              {deadline}
            </span>
          )}
          <span>{[when, event && [event.organizer, locationText(event.location)].filter(Boolean).join(" · ")].filter(Boolean).join("  ·  ")}</span>
        </div>
      </OgFrame>
    ),
    size,
  );
}
