"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { logActivity } from "@/lib/audit";
import { auth } from "@/lib/firebase-client";

export default function ActivityTracker({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const loggedInitial = useRef(false);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    logActivity("page_view", pathname);
  }, [pathname]);

  useEffect(() => {
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
