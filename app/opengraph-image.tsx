import { ImageResponse } from "next/og";

// Generates the preview image shown when someone shares a TradeLedger link
// (Slack, X, LinkedIn, iMessage...). Rendered once at build time.
export const alt = "TradeLedger: Know your edge. Journal every trade.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const bars = [40, -18, 64, -9, 52, 30, -22, 70, 45, 58, 36, 62];
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#000",
        color: "#f1f3f8",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: "#000",
            border: "1px solid rgba(255,255,255,0.25)",
            display: "flex",
          }}
        />
        <span style={{ fontWeight: 600 }}>TradeLedger</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 76, fontWeight: 600, letterSpacing: -2 }}>Know your edge.</div>
        <div style={{ fontSize: 76, fontWeight: 600, letterSpacing: -2, color: "#9a9a9a" }}>
          Journal every trade.
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, height: 90 }}>
        {bars.map((b, i) => (
          <div
            key={i}
            style={{
              width: 34,
              height: Math.abs(b),
              borderRadius: 4,
              alignSelf: b > 0 ? "flex-start" : "flex-end",
              background: b > 0 ? "#34d399" : "#fb7185",
            }}
          />
        ))}
      </div>
    </div>,
    size,
  );
}
