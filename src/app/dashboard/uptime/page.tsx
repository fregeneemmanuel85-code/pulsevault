"use client";

import { Activity } from "lucide-react";

export default function UptimePage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "clamp(1rem, 3vw, 1.5rem)",
        padding: "0 clamp(0.5rem, 2vw, 1rem)",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(1.25rem, 4vw, 1.75rem)",
          fontWeight: "700",
          color: "#0f172a",
        }}
      >
        Uptime
      </h1>
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "1rem",
          border: "1px solid #e2e8f0",
          padding: "clamp(2rem, 8vw, 4rem) clamp(1rem, 4vw, 1.5rem)",
          textAlign: "center",
        }}
      >
        <Activity
          style={{
            width: "clamp(2rem, 6vw, 3rem)",
            height: "clamp(2rem, 6vw, 3rem)",
            color: "#94a3b8",
            margin: "0 auto 1rem",
          }}
        />
        <h2
          style={{
            fontSize: "clamp(1rem, 3vw, 1.125rem)",
            fontWeight: "600",
            color: "#0f172a",
          }}
        >
          No uptime data yet
        </h2>
        <p
          style={{
            color: "#94a3b8",
            fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
          }}
        >
          Add websites to track uptime
        </p>
      </div>
    </div>
  );
}
