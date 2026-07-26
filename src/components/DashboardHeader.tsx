"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getSettings, type UserSettings } from "@/lib/firestore";
import Link from "next/link";

export default function DashboardHeader() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserName(user.displayName || user.email?.split("@")[0] || "User");
        const data = await getSettings();
        if (data) setSettings(data);
      }
    });
    return () => unsub();
  }, []);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <header
      style={{
        height: "4rem",
        borderBottom: "1px solid var(--border-color, #e2e8f0)",
        backgroundColor: "var(--bg-card, white)",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 clamp(1rem, 3vw, 1.5rem)",
        gap: "1rem",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <Link
        href="/dashboard/settings"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          textDecoration: "none",
          padding: "0.375rem 0.75rem 0.375rem 0.375rem",
          borderRadius: "9999px",
          backgroundColor: "var(--bg-icon, #f1f5f9)",
          transition: "background 0.2s",
        }}
      >
        {settings?.photoURL ? (
          <img
            src={settings.photoURL}
            alt="Profile"
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #e2e8f0",
            }}
          />
        ) : (
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "50%",
              backgroundColor: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "0.75rem",
              fontWeight: "600",
            }}
          >
            {getInitials(userName)}
          </div>
        )}
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: "500",
            color: "var(--text-primary, #0f172a)",
            maxWidth: "120px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {userName}
        </span>
      </Link>
    </header>
  );
}
