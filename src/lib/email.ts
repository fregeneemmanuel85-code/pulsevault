import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebase-admin";

interface AlertEmailData {
  to: string;
  userName: string;
  alertType: string;
  severity: "critical" | "warning" | "info";
  message: string;
  target: string;
  timestamp: string;
}

export async function shouldSendEmail(userId: string): Promise<boolean> {
  try {
    const db = getFirestore();
    const snap = await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("preferences")
      .get();
    if (!snap.exists) return true; // default to on
    const data = snap.data();
    return data?.notifications?.email !== false;
  } catch {
    return true;
  }
}

export async function sendAlertEmail(data: AlertEmailData) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/send-email`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to send email");
  }
  return res.json();
}
