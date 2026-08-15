import { ImageResponse } from "next/og";

export const alt = "PulseVault — Free Website Health Check";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)",
        color: "white",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "60px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow orbs */}
      <div
        style={{
          position: "absolute",
          top: "-100px",
          right: "-100px",
          width: "400px",
          height: "400px",
          background:
            "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-150px",
          left: "-100px",
          width: "500px",
          height: "500px",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />

      {/* Logo mark */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 32px rgba(37, 99, 235, 0.3)",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <span
          style={{
            fontSize: "36px",
            fontWeight: "800",
            color: "#f1f5f9",
            letterSpacing: "-0.02em",
          }}
        >
          Pulse<span style={{ color: "#60a5fa" }}>Vault</span>
        </span>
      </div>

      {/* Headline */}
      <div
        style={{
          fontSize: "52px",
          fontWeight: "800",
          color: "#f1f5f9",
          marginBottom: "20px",
          textAlign: "center",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          maxWidth: "900px",
        }}
      >
        Is Your Website Working Right Now?
      </div>

      {/* Subheadline */}
      <div
        style={{
          fontSize: "28px",
          color: "#94a3b8",
          textAlign: "center",
          lineHeight: 1.4,
          maxWidth: "800px",
          marginBottom: "40px",
        }}
      >
        Free instant health check • Speed • SSL • Broken Links
      </div>

      {/* CTA pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          backgroundColor: "#1d4ed8",
          padding: "16px 36px",
          borderRadius: "16px",
          fontSize: "24px",
          fontWeight: "600",
          boxShadow: "0 10px 40px rgba(29, 78, 216, 0.4)",
        }}
      >
        Check My Site →
      </div>

      {/* URL at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          fontSize: "20px",
          color: "#64748b",
          fontWeight: "500",
        }}
      >
        pulsevault.website
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
