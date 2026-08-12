import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase-client";

export type AuditAction = "login" | "logout" | "page_view" | "signup";

export interface AuditLog {
  id?: string;
  userId: string;
  email: string | null;
  name: string | null;
  action: AuditAction;
  page?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  ip?: string;
  userAgent?: string;
}

export async function logActivity(
  action: AuditAction,
  page?: string,
  metadata?: Record<string, any>,
) {
  const user = auth.currentUser;

  if (page?.startsWith("/admin")) return;

  try {
    await addDoc(collection(db, "auditLogs"), {
      userId: user?.uid || "anonymous",
      email: user?.email || null,
      name: user?.displayName || null,
      action,
      page: page || null,
      metadata: metadata || null,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch (err) {
    console.error("[Audit] Failed to log:", err);
  }
}

export async function getAuditLogs(
  options: {
    action?: AuditAction;
    userId?: string;
    limitCount?: number;
    hours?: number;
  } = {},
) {
  const { action, userId, limitCount = 100, hours } = options;

  const q = query(
    collection(db, "auditLogs"),
    orderBy("timestamp", "desc"),
    limit(limitCount),
  );

  const snap = await getDocs(q);
  let logs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as AuditLog) }));

  if (action) logs = logs.filter((l) => l.action === action);
  if (userId) logs = logs.filter((l) => l.userId === userId);
  if (hours) {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    logs = logs.filter((l) => new Date(l.timestamp).getTime() > cutoff);
  }

  return logs;
}

export async function getAdminStats() {
  const allSnap = await getDocs(
    query(
      collection(db, "auditLogs"),
      orderBy("timestamp", "desc"),
      limit(1000),
    ),
  );
  const logs = allSnap.docs.map((d) => d.data() as AuditLog);

  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const uniqueUsers = new Set(logs.map((l) => l.userId).filter(Boolean));
  const activeToday = new Set(
    logs
      .filter((l) => new Date(l.timestamp).getTime() > dayAgo)
      .map((l) => l.userId),
  );
  const activeThisWeek = new Set(
    logs
      .filter((l) => new Date(l.timestamp).getTime() > weekAgo)
      .map((l) => l.userId),
  );

  const logins = logs.filter((l) => l.action === "login").length;
  const pageViews = logs.filter((l) => l.action === "page_view").length;

  return {
    totalLogs: logs.length,
    uniqueUsers: uniqueUsers.size,
    activeToday: activeToday.size,
    activeThisWeek: activeThisWeek.size,
    totalLogins: logins,
    totalPageViews: pageViews,
  };
}
