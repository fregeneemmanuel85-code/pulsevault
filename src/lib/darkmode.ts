"use client";

export function initDarkMode() {
  if (typeof window === "undefined") return;

  const applyDark = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
    );
    let node: Element | null;

    while ((node = walker.nextNode() as Element)) {
      const s = (node as HTMLElement).style;
      if (!s) continue;

      // Background colors
      if (
        s.backgroundColor === "white" ||
        s.backgroundColor === "rgb(255, 255, 255)"
      ) {
        s.backgroundColor = isDark ? "#1e293b" : "white";
      }
      if (
        s.backgroundColor === "rgb(248, 250, 252)" ||
        s.backgroundColor === "#f8fafc"
      ) {
        s.backgroundColor = isDark ? "#0f172a" : "#f8fafc";
      }
      if (
        s.backgroundColor === "rgb(239, 246, 255)" ||
        s.backgroundColor === "#eff6ff"
      ) {
        s.backgroundColor = isDark ? "#1e3a5f" : "#eff6ff";
      }
      if (
        s.backgroundColor === "rgb(240, 253, 244)" ||
        s.backgroundColor === "#f0fdf4"
      ) {
        s.backgroundColor = isDark ? "#14532d" : "#f0fdf4";
      }
      if (
        s.backgroundColor === "rgb(255, 251, 235)" ||
        s.backgroundColor === "#fffbeb"
      ) {
        s.backgroundColor = isDark ? "#713f12" : "#fffbeb";
      }
      if (
        s.backgroundColor === "rgb(254, 242, 242)" ||
        s.backgroundColor === "#fef2f2"
      ) {
        s.backgroundColor = isDark ? "#7f1d1d" : "#fef2f2";
      }

      // Text colors
      if (s.color === "rgb(15, 23, 42)" || s.color === "#0f172a") {
        s.color = isDark ? "#f8fafc" : "#0f172a";
      }
      if (s.color === "rgb(71, 85, 105)" || s.color === "#475569") {
        s.color = isDark ? "#94a3b8" : "#475569";
      }
      if (s.color === "rgb(100, 116, 139)" || s.color === "#64748b") {
        s.color = isDark ? "#94a3b8" : "#64748b";
      }
      if (s.color === "rgb(148, 163, 184)" || s.color === "#94a3b8") {
        s.color = isDark ? "#64748b" : "#94a3b8";
      }

      // Border colors
      if (
        s.borderColor === "rgb(226, 232, 240)" ||
        s.borderColor === "#e2e8f0"
      ) {
        s.borderColor = isDark ? "#334155" : "#e2e8f0";
      }
      if (
        s.borderColor === "rgb(241, 245, 249)" ||
        s.borderColor === "#f1f5f9"
      ) {
        s.borderColor = isDark ? "#334155" : "#f1f5f9";
      }
    }

    // Inputs
    document.querySelectorAll("input, select").forEach((el) => {
      const h = el as HTMLElement;
      if (isDark) {
        h.style.backgroundColor = "#1e293b";
        h.style.color = "#f8fafc";
        h.style.borderColor = "#334155";
      }
    });
  };

  // Apply immediately
  applyDark();

  // Watch for class changes on <html>
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === "class") {
        applyDark();
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true });

  // Also re-apply after React renders
  const interval = setInterval(applyDark, 500);
  setTimeout(() => clearInterval(interval), 5000);

  return () => observer.disconnect();
}
