"use client";

interface LogoIconProps {
  variant?: "light" | "dark";
  size?: number;
}

export default function LogoIcon({
  variant = "light",
  size = 40,
}: LogoIconProps) {
  const isDark = variant === "dark";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id={`icon-shield-${variant}`}
          x1="40"
          y1="10"
          x2="40"
          y2="70"
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
      </defs>

      <path
        d="M40 10 L58 18 L58 42 C58 56 50 68 40 74 C30 68 22 56 22 42 L22 18 Z"
        fill={`url(#icon-shield-${variant})`}
      />

      <path
        d="M43 26 L33 44 L40 44 L36 62 L48 40 L41 40 Z"
        fill={isDark ? "#0f172a" : "white"}
        fillOpacity={isDark ? 1 : 0.95}
      />
    </svg>
  );
}
