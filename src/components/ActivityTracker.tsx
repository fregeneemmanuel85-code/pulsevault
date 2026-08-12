"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { logActivity } from "@/lib/audit";

export default function ActivityTracker({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Track page views
  useEffect(() => {
    if (!pathname) return;
    logActivity("page_view", pathname);
  }, [pathname]);

  // Track logins
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        logActivity("login", pathname || "/", {
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
      }
    });
    return () => unsub();
  }, [pathname]);

  return <>{children}</>;
}
