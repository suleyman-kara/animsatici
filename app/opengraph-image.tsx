import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = SITE_NAME;

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 24, width: "100%", height: "100%", padding: 80, background: "#0e0f11", color: "#ececee" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 96, fontWeight: 700 }}>
          <div style={{ display: "flex", width: 72, height: 72, borderRadius: 999, border: "14px solid #2dd4bf", marginRight: 28 }} />
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", fontSize: 44, color: "#a1a1aa" }}>{SITE_TAGLINE}</div>
        <div style={{ display: "flex", fontSize: 32, color: "#a1a1aa" }}>Hackathon · Kamp · Bootcamp · Staj · Kampüs etkinlikleri</div>
      </div>
    ),
    size,
  );
}
