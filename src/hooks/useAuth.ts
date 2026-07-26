"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { clearAuthCache } from "@/lib/firestore";

interface User {
  email: string;
  uid: string;
  role: string;
  name: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Wait for Firebase Auth to initialize first
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setFirebaseReady(true);

      if (!firebaseUser) {
        // Firebase says no user — clear everything
        setUser(null);
        setLoading(false);
        return;
      }

      // Firebase has user, now verify with backend
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.email) {
            setUser(data);
          } else {
            setUser(null);
          }
        })
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    });

    return () => unsub();
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clearAuthCache();
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  return { user, loading: loading || !firebaseReady, logout };
}
