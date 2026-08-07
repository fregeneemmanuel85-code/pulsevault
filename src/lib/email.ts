import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebase-admin";
import {
  sendAlertEmail as sendFromServer,
  AlertEmailData,
} from "@/lib/email-server";

export type { AlertEmailData };

export async function shouldSendEmail(userId: string): Promise<boolean> {
  try {
    const db = getFirestore();
    const snap = await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("preferences")
      .get();
    if (!snap.exists) return true;
    const data = snap.data();
    return data?.notifications?.email !== false;
  } catch {
    return true;
  }
}

export async function sendAlertEmail(data: AlertEmailData) {
  return sendFromServer(data);
}

/* ─── HEALTH DROP ALERT ─── */
export async function sendHealthDropAlert(data: {
  to: string;
  userName: string;
  target: string;
  healthScore: number;
  httpStatus?: number;
  sslStatus?: "valid" | "expiring" | "expired";
  sslDaysLeft?: number;
  loadTime?: number;
  timestamp?: string;
}) {
  return sendAlertEmail({
    to: data.to,
    userName: data.userName,
    alertType: "Health Score Drop",
    severity: data.healthScore < 50 ? "critical" : "warning",
    message: `Your site ${data.target} health score has dropped to ${data.healthScore}%. Performance, uptime, or security issues have been detected.`,
    target: data.target,
    timestamp: data.timestamp || new Date().toLocaleString(),
    healthScore: data.healthScore,
    httpStatus: data.httpStatus,
    sslStatus: data.sslStatus,
    sslDaysLeft: data.sslDaysLeft,
    loadTime: data.loadTime,
  });
}

/* ─── SITE OFFLINE ALERT ─── */
export async function sendSiteOfflineAlert(data: {
  to: string;
  userName: string;
  target: string;
  httpStatus?: number;
  sslStatus?: "valid" | "expiring" | "expired";
  sslDaysLeft?: number;
  loadTime?: number;
  timestamp?: string;
}) {
  return sendAlertEmail({
    to: data.to,
    userName: data.userName,
    alertType: "Site Offline",
    severity: "critical",
    message: `Your site ${data.target} is currently offline and not responding to health checks. Visitors cannot reach your site. Immediate action is recommended to restore service.`,
    target: data.target,
    timestamp: data.timestamp || new Date().toLocaleString(),
    healthScore: 0,
    httpStatus: data.httpStatus,
    sslStatus: data.sslStatus,
    sslDaysLeft: data.sslDaysLeft,
    loadTime: data.loadTime,
  });
}
