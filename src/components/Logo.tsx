"use client";

interface LogoProps {
  variant?: "light" | "dark";
  showTagline?: boolean;
  size?: "default" | "small" | "large";
}

export default function Logo({
  variant = "light",
  showTagline = true,
  size = "default",
}: LogoProps) {
  const isDark = variant === "dark";

  const scale = size === "small" ? 0.6 : size === "large" ? 1.3 : 1;
  const w = 280 * scale;
  const h = 64 * scale;

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 280 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient
          id={`shield-${variant}`}
          x1="12"
          y1="4"
          x2="12"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          {isDark ? (
            <>
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#60A5FA" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#0A84FF" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </>
          )}
        </linearGradient>

        <linearGradient
          id={`vault-${variant}`}
          x1="100"
          y1="16"
          x2="260"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          {isDark ? (
            <>
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#3B82F6" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#0A84FF" />
            </>
          )}
        </linearGradient>
      </defs>

      {/* Shield */}
      <path
        d="M12 4 L22 8 L22 20 C22 30 17 38 12 42 C7 38 2 30 2 20 L2 8 Z"
        fill={`url(#shield-${variant})`}
      />

      {/* Lightning Bolt */}
      <path
        d="M13 12 L9 22 L12 22 L10 32 L15 20 L12 20 Z"
        fill={isDark ? "#0f172a" : "white"}
        fillOpacity={isDark ? 1 : 0.95}
      />

      {/* Pulse */}
      <text
        x="34"
        y="30"
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
        fontSize="22"
        fontWeight="800"
        fill={isDark ? "#f8fafc" : "#0F172A"}
      >
        Pulse
      </text>

      {/* Vault — FIXED SPACING */}
      <text
        x="102"
        y="30"
        fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
        fontSize="22"
        fontWeight="800"
        fill={`url(#vault-${variant})`}
      >
        Vault
      </text>

      {/* Tagline */}
      {showTagline && (
        <text
          x="34"
          y="48"
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
          fontSize="7"
          fontWeight="700"
          letterSpacing="2.5"
          fill={isDark ? "#475569" : "#94a3b8"}
        >
          MONITOR. PROTECT. PERFORM.
        </text>
      )}
    </svg>
  );
}
