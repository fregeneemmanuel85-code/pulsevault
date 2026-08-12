"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { logActivity } from "@/lib/audit";

export default function ActivityTracker({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const loggedInitial = useRef(false);

  // Track page views
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    logActivity("page_view", pathname);
  }, [pathname]);

  // Track logins
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && !loggedInitial.current) {
        loggedInitial.current = true;
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
