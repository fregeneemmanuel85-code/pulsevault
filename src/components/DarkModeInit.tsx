"use client";

import { useEffect } from "react";

export default function DarkModeInit() {
  useEffect(() => {
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

    handleRouteChange();

    const storageListener = (e: StorageEvent) => {
      if (e.key === "pulsevault-theme") {
        handleRouteChange();
      }
    };
    window.addEventListener("storage", storageListener);
    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("storage", storageListener);
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  return null;
}
