// Paylaşım görselleri (next/og) için ortak çerçeve. Yalnızca inline stil desteklenir.

export const OG_COLORS = { bg: "#fff8ec", ink: "#1a1325", violet: "#b69cff", yellow: "#ffd23f", mint: "#3ee5b0", pink: "#ff7ab6" };

export function OgLogo({ scale = 1 }: { scale?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 * scale, fontSize: 40 * scale, fontWeight: 800, color: OG_COLORS.ink }}>
      <span>Kampüs</span>
      <span
        style={{
          display: "flex",
          padding: `${2 * scale}px ${12 * scale}px`,
          background: OG_COLORS.yellow,
          border: `${4 * scale}px solid ${OG_COLORS.ink}`,
          borderRadius: 12 * scale,
          transform: "rotate(-6deg)",
          boxShadow: `${4 * scale}px ${4 * scale}px 0 ${OG_COLORS.ink}`,
        }}
      >
        30
      </span>
    </div>
  );
}

export function OgFrame({ children, accent = OG_COLORS.violet }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", padding: 48, background: OG_COLORS.bg }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 56,
          background: accent,
          border: `6px solid ${OG_COLORS.ink}`,
          borderRadius: 40,
          boxShadow: `14px 14px 0 ${OG_COLORS.ink}`,
          color: OG_COLORS.ink,
        }}
      >
        {children}
      </div>
    </div>
  );
}
