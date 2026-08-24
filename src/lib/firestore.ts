import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  onSnapshot,
  writeBatch,
  query,
  where,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "./firebase";

/* =========================================================
   AUTH HELPERS
   ========================================================= */

let cachedUid: string | null = null;
let authPromise: Promise<string> | null = null;

function waitForAuth(): Promise<string> {
  if (cachedUid) return Promise.resolve(cachedUid);
  if (authPromise) return authPromise;

  authPromise = new Promise((resolve) => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      cachedUid = user.uid;
      resolve(user.uid);
      return;
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        cachedUid = u.uid;
        resolve(u.uid);
      } else {
        resolve("");
      }
      unsub();
    });

    setTimeout(() => {
      resolve("");
      unsub();
    }, 5000);
  });

  return authPromise;
}

function getCurrentUserId(): string {
  if (cachedUid) return cachedUid;
  const auth = getAuth();
  return auth.currentUser?.uid || "";
}

function hasUserId(): boolean {
  return !!getCurrentUserId();
}

export function clearAuthCache() {
  cachedUid = null;
  authPromise = null;
}

waitForAuth().then((uid) => {
  if (uid) console.log("[Firestore] Auth ready, UID:", uid);
});

/* =========================================================
   TYPES
   ========================================================= */

export type PriorityLevel = "normal" | "high" | "critical";

export interface Website {
  id: string;
  userId: string;
  name: string;
  url: string;
  status: "healthy" | "warning" | "critical" | "offline" | "checking";
  health: number;
  uptime: string;
  responseTime: string;
  ssl: "valid" | "expired" | "expiring" | "unknown" | "checking";
  sslExpiry?: string | null;
  sslDaysLeft?: number | null;
  lastChecked: string;
  isMonitoring: boolean;
  createdAt: string;
  updatedAt: string;
  checkInterval: number;
  incidents: number;
  priority: PriorityLevel;
  httpStatus: number;
  dnsStatus: "ok" | "failed" | "unknown";
  dnsResolved?: boolean | null;
  dnsIp?: string | null;
  brokenLinks: number;
  totalLinks: number;
  protectedLinks?: number;
  brokenPlugins: number;
  totalPlugins: number;
  formsWorking: boolean;
  totalForms: number;
  jsErrors: number;
  apiHealth: number;
  performanceScore: number;
  loadTime?: number;
  pageSize?: number;
  mixedContent: boolean;
  securityHeaders: {
    hsts: boolean;
    xFrame: boolean;
    xContentType: boolean;
    csp: boolean;
  };
  redirectChain: string[];
  scanResults?: ScanResult;

  // Domain expiration
  domainExpiry?: string | null;
  domainDaysLeft?: number | null;
  domainRegistrar?: string | null;
  domainLastChecked?: string | null;

  // Manual domain expiry (user input)
  domainExpiryManual?: string | null;

  // SEO monitoring
  seoScore?: number;
  seoLastScanned?: string;
  seoIssues?: Array<{
    type: "critical" | "warning" | "info";
    category: string;
    message: string;
    recommendation: string;
  }>;
  seoMetrics?: {
    titleLength: number;
    metaDescriptionLength: number;
    h1Count: number;
    h2Count: number;
    imageWithoutAlt: number;
    totalImages: number;
    internalLinks: number;
    hasCanonical: boolean;
    hasOpenGraph: boolean;
    hasTwitterCard: boolean;
    hasSchema: boolean;
    hasViewport: boolean;
    hasRobotsMeta: boolean;
  };
  seo?: {
    score: number;
    metrics: Record<string, any>;
    issues: Array<Record<string, any>>;
  };

  // Deep scan additions
  spaCrashes?: boolean;
  runtimeErrors?: Array<{ message: string; source?: string }>;
  headlessAvailable?: boolean;
  techStack?: {
    detected: { name: string; confidence: string; category: string }[];
    primary?: string;
  };
}

export interface ScanResult {
  timestamp: string;
  links: { url: string; status: number; ok: boolean; protected?: boolean }[];
  plugins: { name: string; status: "ok" | "broken" }[];
  forms: { selector: string; hasAction: boolean; hasMethod: boolean }[];
  consoleErrors: string[];
  apiChecks: { endpoint: string; status: number; ok: boolean }[];
  loadTime: number;
  pageSize: number;
  performanceScore?: number;
  resourceErrors: { url: string; type: string }[];

  // Deep scan additions
  techStack?: {
    detected: string[];
    frameworks?: Record<string, boolean>;
  };
  runtimeErrors?: Array<{ message: string; source?: string }>;
  spaCrashes?: boolean;
  headlessAvailable?: boolean;
  seo?: {
    score: number;
    metrics: Record<string, any>;
    issues: Array<Record<string, any>>;
  };
}

export interface Alert {
  id: string;
  userId: string;
  type: string;
  target: string;
  websiteId: string;
  message: string;
  severity: "critical" | "warning" | "info";
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt?: string;
  deleteAt?: string;
}

export interface Incident {
  id: string;
  userId: string;
  websiteId: string;
  websiteName: string;
  websiteUrl: string;
  type: string;
  message: string;
  severity: "critical" | "warning" | "info";
  status: "open" | "resolved";
  startedAt: string;
  resolvedAt?: string;
  duration?: number;
  alertId?: string;
}

export interface HealthHistory {
  id: string;
  websiteId: string;
  timestamp: string;
  health: number;
  status: string;
  responseTime: number;
  loadTime: number;
  pageSize: number;
  brokenLinks: number;
  jsErrors: number;
}

export interface UserPlan {
  planId: string;
  planName: string;
  price: number;
  websites: number;
  checkInterval: number;
  startedAt: string;
  expiresAt?: string;
  status: "active" | "cancelled" | "expired" | "grace";
  gracePeriodEnd?: string | null;
  aiCredits?: number;
  fileStorage?: number;
  paymentMethod?: string;
}

export interface Invoice {
  id: string;
  userId: string;
  date: string;
  amount: string;
  status: "Paid" | "Pending" | "Failed";
  plan: string;
  txRef?: string;
  createdAt: string;
}

export interface UserSettings {
  name: string;
  email: string;
  photoURL?: string;
  notifications: {
    email: boolean;
    push: boolean;
  };
  theme: "light" | "dark" | "system";
  timezone: string;
  marketingEmails?: boolean;
}

export interface CheckLog {
  id: string;
  websiteId: string;
  timestamp: string;
  status: string;
  responseTime: number;
  statusCode?: number;
  error?: string;
}

/* =========================================================
   REF HELPERS
   ========================================================= */

function getWebsitesRef() {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("No authenticated user");
  return collection(db, "users", uid, "websites");
}

function getWebsiteRef(id: string) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("No authenticated user");
  return doc(db, "users", uid, "websites", id);
}

function getAlertsRef() {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("No authenticated user");
  return collection(db, "users", uid, "alerts");
}

function getIncidentsRef() {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("No authenticated user");
  return collection(db, "users", uid, "incidents");
}

function getWebsiteIncidentsRef(websiteId: string) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("No authenticated user");
  return collection(db, "users", uid, "websites", websiteId, "incidents");
}

function getHealthHistoryRef(websiteId: string) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("No authenticated user");
  return collection(db, "users", uid, "websites", websiteId, "healthHistory");
}

function getInvoicesRef() {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("No authenticated user");
  return collection(db, "users", uid, "invoices");
}

/* =========================================================
   WEBSITE
   ========================================================= */

export async function addWebsite(data: {
  name: string;
  url: string;
  status: Website["status"];
  health: number;
  uptime: string;
  responseTime: string;
  ssl: Website["ssl"];
  lastChecked: string;
  isMonitoring: boolean;
  checkInterval: number;
  incidents: number;
  priority?: PriorityLevel;
  domainExpiryManual?: string | null;
}): Promise<Website> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const website: Website = {
    ...data,
    priority: data.priority || "normal",
    id,
    userId,
    createdAt: now,
    updatedAt: now,
    httpStatus: 0,
    dnsStatus: "unknown",
    dnsResolved: null,
    dnsIp: null,
    brokenLinks: 0,
    totalLinks: 0,
    protectedLinks: 0,
    brokenPlugins: 0,
    totalPlugins: 0,
    formsWorking: true,
    totalForms: 0,
    jsErrors: 0,
    apiHealth: 100,
    performanceScore: 100,
    loadTime: 0,
    pageSize: 0,
    mixedContent: false,
    securityHeaders: {
      hsts: false,
      xFrame: false,
      xContentType: false,
      csp: false,
    },
    redirectChain: [],
    domainExpiryManual: data.domainExpiryManual || null,
  };
  await setDoc(getWebsiteRef(id), website);
  return website;
}

export async function updateWebsite(id: string, updates: Partial<Website>) {
  const ref = getWebsiteRef(id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.warn("[updateWebsite] Website not found, skipping update:", id);
    return;
  }

  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteWebsite(id: string) {
  if (!hasUserId()) throw new Error("User not authenticated");
  await deleteDoc(getWebsiteRef(id));
}

export async function getAllWebsites(): Promise<Website[]> {
  if (!hasUserId()) return [];
  const snap = await getDocs(getWebsitesRef());
  return snap.docs.map((d) => d.data() as Website);
}

export function subscribeToWebsites(callback: (websites: Website[]) => void) {
  if (!hasUserId()) {
    console.warn("[subscribeToWebsites] No auth yet, returning empty");
    callback([]);
    return () => {};
  }
  return onSnapshot(getWebsitesRef(), (snap) => {
    callback(snap.docs.map((d) => d.data() as Website));
  });
}

export function subscribeToWebsite(
  id: string,
  callback: (website: Website | null) => void,
) {
  if (!hasUserId()) {
    callback(null);
    return () => {};
  }
  return onSnapshot(getWebsiteRef(id), (snap) => {
    callback(snap.exists() ? (snap.data() as Website) : null);
  });
}

/* =========================================================
   ALERTS
   ========================================================= */

export async function addAlert(
  data: Omit<Alert, "id" | "userId" | "createdAt" | "deleteAt">,
): Promise<Alert | null> {
  const userId = getCurrentUserId();
  if (!userId) {
    console.warn("[addAlert] No user ID, skipping");
    return null;
  }

  const alertsRef = getAlertsRef();
  const q = query(
    alertsRef,
    where("type", "==", data.type),
    where("websiteId", "==", data.websiteId),
    where("status", "==", "open"),
  );
  const existingSnap = await getDocs(q);

  if (!existingSnap.empty) {
    console.log(
      "[addAlert] Duplicate open alert found, skipping:",
      data.type,
      "for",
      data.target,
    );
    return null;
  }

  const id = crypto.randomUUID();
  const deleteAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const alert: Alert = {
    ...data,
    id,
    userId,
    createdAt: new Date().toISOString(),
    deleteAt,
  };

  await setDoc(doc(db, "users", userId, "alerts", id), alert);
  return alert;
}

export async function addAlertWithNotifications(
  data: Omit<Alert, "id" | "userId" | "createdAt" | "deleteAt">,
): Promise<Alert | null> {
  console.log(
    "[addAlertWithNotifications] Creating alert:",
    data.type,
    "for",
    data.target,
  );

  const alert = await addAlert(data);
  if (!alert) {
    console.log("[addAlertWithNotifications] Duplicate alert, skipping");
    return null;
  }

  console.log("[addAlertWithNotifications] Alert created, ID:", alert.id);

  try {
    await addIncident({
      websiteId: data.websiteId,
      websiteName: data.target,
      websiteUrl: "",
      type: data.type,
      message: data.message,
      severity: data.severity,
      status: "open",
      alertId: alert.id,
    });
  } catch (e: any) {
    console.error("[addAlertWithNotifications] Incident failed:", e.message);
  }

  return alert;
}

export async function resolveAlert(id: string) {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const now = new Date().toISOString();
  await updateDoc(doc(db, "users", userId, "alerts", id), {
    status: "resolved",
    resolvedAt: now,
  });

  try {
    const incidentsSnap = await getDocs(getIncidentsRef());
    const matchingIncident = incidentsSnap.docs
      .map((d) => d.data() as Incident)
      .find((inc) => inc.alertId === id);

    if (matchingIncident) {
      await resolveIncident(matchingIncident.id, matchingIncident.websiteId);
      console.log(
        "[resolveAlert] Also resolved incident:",
        matchingIncident.id,
      );
    }
  } catch (e: any) {
    console.error("[resolveAlert] Failed to resolve incident:", e.message);
  }
}

export async function deleteAlert(id: string) {
  console.log("[deleteAlert] Called with id:", id, "type:", typeof id);

  if (!id || typeof id !== "string") {
    throw new Error(`Invalid alert ID: ${id}`);
  }

  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User not authenticated");
  }

  console.log("[deleteAlert] userId:", userId);

  const alertDoc = doc(db, "users", userId, "alerts", id);
  console.log("[deleteAlert] Doc path:", alertDoc.path);

  await deleteDoc(alertDoc);
  console.log("[deleteAlert] Deleted successfully:", id);
}

export function subscribeToAlerts(callback: (alerts: Alert[]) => void) {
  if (!hasUserId()) {
    console.warn("[subscribeToAlerts] No auth yet, returning empty");
    callback([]);
    return () => {};
  }
  return onSnapshot(getAlertsRef(), (snap) => {
    const alerts: Alert[] = [];

    snap.docs.forEach((d) => {
      const data = d.data();
      console.log(
        "[subscribeToAlerts] Processing doc:",
        d.id,
        "data.id:",
        data.id,
      );

      const alert: Alert = {
        id: d.id,
        userId: data.userId || "",
        type: data.type || "",
        target: data.target || "",
        websiteId: data.websiteId || data.targetId || "",
        message: data.message || "",
        severity: data.severity || "info",
        status: data.status || "open",
        createdAt: data.createdAt || new Date().toISOString(),
        resolvedAt: data.resolvedAt,
        deleteAt: data.deleteAt,
      };

      alerts.push(alert);
    });

    alerts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    console.log("[subscribeToAlerts] Returning", alerts.length, "alerts");
    callback(alerts);
  });
}

/* =========================================================
   ALERT CLEANUP — Auto-delete expired alerts
   ========================================================= */

export async function cleanupExpiredAlerts(): Promise<number> {
  const userId = getCurrentUserId();
  if (!userId) {
    console.warn("[cleanupExpiredAlerts] No user ID, skipping");
    return 0;
  }

  const now = new Date().toISOString();
  let deleted = 0;

  try {
    const alertsRef = getAlertsRef();
    const q = query(alertsRef, where("deleteAt", "<", now));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.log("[cleanupExpiredAlerts] No expired alerts to delete");
      return 0;
    }

    const batch = writeBatch(db);

    for (const docSnap of snap.docs) {
      batch.delete(docSnap.ref);
      deleted++;
    }

    await batch.commit();
    console.log(`[cleanupExpiredAlerts] Deleted ${deleted} expired alerts`);
    return deleted;
  } catch (err: any) {
    console.error("[cleanupExpiredAlerts] Error:", err.message);
    return 0;
  }
}

/* =========================================================
   INCIDENTS
   ========================================================= */

export async function addIncident(
  data: Omit<Incident, "id" | "userId" | "startedAt">,
): Promise<Incident> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const id = crypto.randomUUID();
  const incident: Incident = {
    ...data,
    id,
    userId,
    startedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "users", userId, "incidents", id), incident);
  await setDoc(
    doc(db, "users", userId, "websites", data.websiteId, "incidents", id),
    incident,
  );
  return incident;
}

export async function resolveIncident(id: string, websiteId: string) {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const now = new Date().toISOString();
  const updates = {
    status: "resolved" as const,
    resolvedAt: now,
  };
  await updateDoc(doc(db, "users", userId, "incidents", id), updates);
  await updateDoc(
    doc(db, "users", userId, "websites", websiteId, "incidents", id),
    updates,
  );
}

export async function deleteIncident(id: string, websiteId: string) {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  await deleteDoc(doc(db, "users", userId, "incidents", id));
  await deleteDoc(
    doc(db, "users", userId, "websites", websiteId, "incidents", id),
  );
}

export async function getAllIncidents(): Promise<Incident[]> {
  if (!hasUserId()) return [];
  const snap = await getDocs(getIncidentsRef());
  return snap.docs.map((d) => d.data() as Incident);
}

export function subscribeToIncidents(
  callback: (incidents: Incident[]) => void,
) {
  if (!hasUserId()) {
    callback([]);
    return () => {};
  }
  return onSnapshot(getIncidentsRef(), (snap) => {
    callback(snap.docs.map((d) => d.data() as Incident));
  });
}

export function subscribeToWebsiteIncidents(
  websiteId: string,
  callback: (incidents: Incident[]) => void,
) {
  if (!hasUserId()) {
    callback([]);
    return () => {};
  }
  return onSnapshot(getWebsiteIncidentsRef(websiteId), (snap) => {
    callback(snap.docs.map((d) => d.data() as Incident));
  });
}

export async function cleanupOldIncidents(days: number = 30): Promise<number> {
  const userId = getCurrentUserId();
  if (!userId) {
    console.warn("[cleanupOldIncidents] No user ID, skipping");
    return 0;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();

  try {
    const incidentsRef = getIncidentsRef();
    const q = query(incidentsRef, where("startedAt", "<", cutoffStr));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.log("[cleanupOldIncidents] No old incidents to delete");
      return 0;
    }

    const batch = writeBatch(db);
    let deleted = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as Incident;
      batch.delete(docSnap.ref);

      if (data.websiteId) {
        batch.delete(
          doc(
            db,
            "users",
            userId,
            "websites",
            data.websiteId,
            "incidents",
            docSnap.id,
          ),
        );
      }
      deleted++;
    }

    await batch.commit();
    console.log(
      `[cleanupOldIncidents] Deleted ${deleted} incidents older than ${days} days`,
    );
    return deleted;
  } catch (err: any) {
    console.error("[cleanupOldIncidents] Error:", err.message);
    return 0;
  }
}

/* =========================================================
   HEALTH HISTORY
   ========================================================= */

export async function addHealthHistory(
  data: Omit<HealthHistory, "id">,
): Promise<HealthHistory | null> {
  const userId = getCurrentUserId();
  if (!userId) {
    console.warn("[addHealthHistory] No user ID, skipping");
    return null;
  }

  const siteRef = doc(db, "users", userId, "websites", data.websiteId);
  const siteSnap = await getDoc(siteRef);
  if (!siteSnap.exists()) {
    console.warn(
      "[addHealthHistory] Website not found, skipping:",
      data.websiteId,
    );
    return null;
  }

  const id = crypto.randomUUID();
  const record: HealthHistory = {
    ...data,
    id,
  };
  await setDoc(
    doc(db, "users", userId, "websites", data.websiteId, "healthHistory", id),
    record,
  );
  return record;
}

export function subscribeToHealthHistory(
  websiteId: string,
  callback: (records: HealthHistory[]) => void,
) {
  if (!hasUserId()) {
    callback([]);
    return () => {};
  }
  return onSnapshot(getHealthHistoryRef(websiteId), (snap) => {
    callback(snap.docs.map((d) => d.data() as HealthHistory));
  });
}

/* =========================================================
   BILLING / PLAN
   ========================================================= */

export async function getUserPlan(): Promise<UserPlan | null> {
  const uid = getCurrentUserId();
  if (!uid) return null;

  const snap = await getDoc(doc(db, "users", uid, "billing", "plan"));
  return snap.exists() ? (snap.data() as UserPlan) : null;
}

export async function setUserPlan(plan: UserPlan) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("User not authenticated");

  await setDoc(doc(db, "users", uid, "billing", "plan"), plan);
}

export function subscribeToUserPlan(callback: (plan: UserPlan | null) => void) {
  if (!hasUserId()) {
    callback(null);
    return () => {};
  }
  const uid = getCurrentUserId();
  return onSnapshot(doc(db, "users", uid, "billing", "plan"), (snap) => {
    callback(snap.exists() ? (snap.data() as UserPlan) : null);
  });
}

/* =========================================================
   INVOICES
   ========================================================= */

export async function addInvoice(
  data: Omit<Invoice, "id" | "userId" | "createdAt">,
): Promise<Invoice> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const id = crypto.randomUUID();
  const invoice: Invoice = {
    ...data,
    id,
    userId,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "users", userId, "invoices", id), invoice);
  return invoice;
}

export function subscribeToInvoices(callback: (invoices: Invoice[]) => void) {
  if (!hasUserId()) {
    callback([]);
    return () => {};
  }
  return onSnapshot(getInvoicesRef(), (snap) => {
    callback(snap.docs.map((d) => d.data() as Invoice));
  });
}

/* =========================================================
   SETTINGS
   ========================================================= */

export async function getSettings(): Promise<UserSettings | null> {
  const uid = getCurrentUserId();
  if (!uid) return null;

  const snap = await getDoc(doc(db, "users", uid, "settings", "preferences"));
  return snap.exists() ? (snap.data() as UserSettings) : null;
}

export async function saveSettings(settings: UserSettings) {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("User not authenticated");

  await setDoc(doc(db, "users", uid, "settings", "preferences"), settings);
}

/* =========================================================
   CHECK LOGS
   ========================================================= */

export async function addCheckLog(
  data: Omit<CheckLog, "id">,
): Promise<CheckLog | null> {
  const userId = getCurrentUserId();
  if (!userId) {
    console.warn("[addCheckLog] No user ID, skipping");
    return null;
  }

  const siteRef = doc(db, "users", userId, "websites", data.websiteId);
  const siteSnap = await getDoc(siteRef);
  if (!siteSnap.exists()) {
    console.warn("[addCheckLog] Website not found, skipping:", data.websiteId);
    return null;
  }

  const id = crypto.randomUUID();
  const log = { ...data, id };
  await setDoc(doc(db, "users", userId, "logs", id), log);
  return log;
}

export function subscribeToLogs(callback: (logs: CheckLog[]) => void) {
  if (!hasUserId()) {
    callback([]);
    return () => {};
  }
  const uid = getCurrentUserId();
  return onSnapshot(collection(db, "users", uid, "logs"), (snap) => {
    callback(snap.docs.map((d) => d.data() as CheckLog));
  });
}

/* =========================================================
   ASSISTANT CREDITS (Client-side helpers)
   ========================================================= */

export interface AssistantCreditsClient {
  dailyLimit: number;
  dailyUsed: number;
  remaining: number;
  lastResetDate: string;
}

export async function getAssistantCredits(): Promise<AssistantCreditsClient | null> {
  const uid = getCurrentUserId();
  if (!uid) return null;
  const snap = await getDoc(doc(db, "users", uid, "assistant", "credits"));
  return snap.exists() ? (snap.data() as AssistantCreditsClient) : null;
}

export function subscribeToAssistantCredits(
  callback: (credits: AssistantCreditsClient | null) => void,
) {
  if (!hasUserId()) {
    callback(null);
    return () => {};
  }
  const uid = getCurrentUserId();
  return onSnapshot(doc(db, "users", uid, "assistant", "credits"), (snap) => {
    callback(snap.exists() ? (snap.data() as AssistantCreditsClient) : null);
  });
}

/* =========================================================
   USER INITIALIZATION
   ========================================================= */

export async function initializeUser(planId: string = "free") {
  const userId = getCurrentUserId();
  if (!userId) {
    console.warn("[initializeUser] No user ID, skipping");
    return;
  }

  const batch = writeBatch(db);

  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    batch.set(userRef, {
      id: userId,
      createdAt: new Date().toISOString(),
      plan: planId,
    });
  }

  const planRef = doc(db, "users", userId, "billing", "plan");
  const planSnap = await getDoc(planRef);
  if (!planSnap.exists()) {
    let planConfig: UserPlan;

    switch (planId) {
      case "business":
        planConfig = {
          planId: "business",
          planName: "Business",
          price: 22500,
          websites: 100,
          checkInterval: 1,
          startedAt: new Date().toISOString(),
          status: "active" as const,
        };
        break;
      case "pro":
        planConfig = {
          planId: "pro",
          planName: "Pro",
          price: 12000,
          websites: 30,
          checkInterval: 5,
          startedAt: new Date().toISOString(),
          status: "active" as const,
        };
        break;
      case "starter":
        planConfig = {
          planId: "starter",
          planName: "Starter",
          price: 3000,
          websites: 5,
          checkInterval: 15,
          startedAt: new Date().toISOString(),
          status: "active" as const,
        };
        break;
      default:
        planConfig = {
          planId: "free",
          planName: "Free",
          price: 0,
          websites: 2,
          checkInterval: 30,
          startedAt: new Date().toISOString(),
          expiresAt: new Date(
            Date.now() + 100 * 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          status: "active" as const,
        };
    }

    batch.set(planRef, planConfig);
  }

  await batch.commit();
}
