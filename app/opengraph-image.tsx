import { ImageResponse } from "next/og";
import { OG_COLORS, OgFrame, OgLogo } from "@/components/OgCard";
import { SITE_NAME } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = SITE_NAME;

export default function Image() {
  return new ImageResponse(
    (
      <OgFrame>
        <OgLogo scale={1.4} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>Önümüzdeki 30 gün seni neler bekliyor?</div>
          <div style={{ display: "flex", gap: 16, fontSize: 32 }}>
            <span style={{ display: "flex", padding: "6px 18px", background: OG_COLORS.mint, border: `4px solid ${OG_COLORS.ink}`, borderRadius: 999 }}>Hackathon</span>
            <span style={{ display: "flex", padding: "6px 18px", background: OG_COLORS.yellow, border: `4px solid ${OG_COLORS.ink}`, borderRadius: 999 }}>Kamp</span>
            <span style={{ display: "flex", padding: "6px 18px", background: OG_COLORS.pink, border: `4px solid ${OG_COLORS.ink}`, borderRadius: 999 }}>Staj</span>
            <span style={{ display: "flex", padding: "6px 18px", background: OG_COLORS.bg, border: `4px solid ${OG_COLORS.ink}`, borderRadius: 999 }}>Yarışma</span>
          </div>
        </div>
      </OgFrame>
    ),
    size,
  );
}
