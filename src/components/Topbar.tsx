"use client";

import { Bell, User, Search } from "lucide-react";
import { useState } from "react";

export default function Topbar() {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header
      style={{
        height: "4rem",
        backgroundColor: "white",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.5rem",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Left spacer for mobile hamburger */}
      <div style={{ width: "2.5rem", display: { md: "none" } as any }} />

      {/* Page title area */}
      <div style={{ flex: 1 }} />

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {/* Search */}
        <div style={{ position: "relative", display: showSearch ? "block" : "none" }}>
          <Search style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", width: "0.875rem", height: "0.875rem", color: "#94a3b8" }} />
          <input
            type="text"
            placeholder="Search..."
            style={{
              paddingLeft: "2rem",
              paddingRight: "0.75rem",
              paddingTop: "0.375rem",
              paddingBottom: "0.375rem",
              border: "1px solid #e2e8f0",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              outline: "none",
              width: "12rem",
            }}
          />
        </div>

        <button
          onClick={() => setShowSearch(!showSearch)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.5rem",
            borderRadius: "0.5rem",
            color: "#64748b",
          }}
        >
          <Search style={{ width: "1.125rem", height: "1.125rem" }} />
        </button>

        {/* Notifications */}
        <button
          style={{
            position: "relative",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.5rem",
            borderRadius: "0.5rem",
            color: "#64748b",
          }}
        >
          <Bell style={{ width: "1.125rem", height: "1.125rem" }} />
          <span
            style={{
              position: "absolute",
              top: "0.25rem",
              right: "0.25rem",
              width: "0.5rem",
              height: "0.5rem",
              backgroundColor: "#ef4444",
              borderRadius: "50%",
            }}
          />
        </button>

        {/* User avatar */}
        <div
          style={{
            width: "2.25rem",
            height: "2.25rem",
            backgroundColor: "#e2e8f0",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <User style={{ width: "1.125rem", height: "1.125rem", color: "#64748b" }} />
        </div>
      </div>
    </header>
  );
}