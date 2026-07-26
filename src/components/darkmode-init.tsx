"use client";

import { useEffect } from "react";

export function DarkModeInit() {
  useEffect(() => {
    // Re-apply on navigation (Next.js client-side nav doesn't reload page)
    const handleRouteChange = () => {
      const theme = localStorage.getItem("pulsevault-theme") || "light";
      let resolved = theme;
      if (theme === "system") {
        resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
      if (resolved === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    // Apply immediately
    handleRouteChange();

    // Listen for storage changes (other tabs)
    const storageListener = (e: StorageEvent) => {
      if (e.key === "pulsevault-theme") {
        handleRouteChange();
      }
    };
    window.addEventListener("storage", storageListener);

    // For Next.js App Router, watch for popstate (back/forward nav)
    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("storage", storageListener);
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  return null;
}
