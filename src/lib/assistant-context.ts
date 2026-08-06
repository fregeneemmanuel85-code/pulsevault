import { getFirestore } from "firebase-admin/firestore";

export interface AssistantContext {
  userId: string;
  userEmail: string;
  planId: string;
  planName: string;
  websites: Array<{
    name: string;
    url: string;
    status: string;
    health: number;
    ssl: string;
    sslDaysLeft: number | null;
    brokenLinks: number;
    totalLinks: number;
    jsErrors: number;
    performanceScore: number;
    loadTime: number | null;
    mixedContent: boolean;
    domainDaysLeft: number | null;
    seoScore: number | null;
  }>;
  recentAlerts: Array<{
    type: string;
    severity: string;
    message: string;
    target: string;
    createdAt: string;
  }>;
  summary: string;
}

export async function buildAssistantContext(
  userId: string,
): Promise<AssistantContext> {
  const db = getFirestore();

  // Fetch user doc
  const userDoc = await db.collection("users").doc(userId).get();
  const userData = userDoc.exists ? userDoc.data() : null;

  // Fetch plan
  const planSnap = await db
    .collection("users")
    .doc(userId)
    .collection("billing")
    .doc("plan")
    .get();
  const planData = planSnap.exists ? planSnap.data() : null;

  // Fetch websites
  const sitesSnap = await db
    .collection("users")
    .doc(userId)
    .collection("websites")
    .get();

  const websites = sitesSnap.docs.map((d) => {
    const s = d.data();
    return {
      name: s.name || s.url || "Unnamed",
      url: s.url || "",
      status: s.status || "unknown",
      health: typeof s.health === "number" ? s.health : 0,
      ssl: s.ssl || "unknown",
      sslDaysLeft: s.sslDaysLeft ?? null,
      brokenLinks: s.brokenLinks || 0,
      totalLinks: s.totalLinks || 0,
      jsErrors: s.jsErrors || 0,
      performanceScore: s.performanceScore || 0,
      loadTime: s.loadTime ?? null,
      mixedContent: s.mixedContent || false,
      domainDaysLeft: s.domainDaysLeft ?? null,
      seoScore: s.seoScore ?? null,
    };
  });

  // Fetch recent alerts (last 10, last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const alertsSnap = await db
    .collection("users")
    .doc(userId)
    .collection("alerts")
    .where("createdAt", ">=", weekAgo.toISOString())
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  const recentAlerts = alertsSnap.docs.map((d) => {
    const a = d.data();
    return {
      type: a.type || "Alert",
      severity: a.severity || "info",
      message: a.message || "",
      target: a.target || "",
      createdAt: a.createdAt || "",
    };
  });

  // Build human-readable summary
  const criticalSites = websites.filter(
    (w) => w.status === "critical" || w.status === "offline",
  );
  const warningSites = websites.filter((w) => w.status === "warning");
  const expiringSsl = websites.filter((w) => w.ssl === "expiring");
  const expiringDomain = websites.filter(
    (w) => w.domainDaysLeft !== null && w.domainDaysLeft < 30,
  );

  const summaryLines: string[] = [];
  summaryLines.push(`Total websites: ${websites.length}`);
  if (criticalSites.length)
    summaryLines.push(`Critical/Offline: ${criticalSites.length}`);
  if (warningSites.length) summaryLines.push(`Warning: ${warningSites.length}`);
  if (expiringSsl.length)
    summaryLines.push(`SSL expiring soon: ${expiringSsl.length}`);
  if (expiringDomain.length)
    summaryLines.push(`Domain expiring soon: ${expiringDomain.length}`);
  if (recentAlerts.length)
    summaryLines.push(`Recent alerts (7d): ${recentAlerts.length}`);
  if (summaryLines.length === 1) summaryLines.push("All systems look healthy.");

  const context: AssistantContext = {
    userId,
    userEmail: userData?.email || "",
    planId: planData?.planId || "free",
    planName: planData?.planName || "Free",
    websites,
    recentAlerts,
    summary: summaryLines.join("\n"),
  };

  return context;
}

export function contextToPrompt(ctx: AssistantContext): string {
  const siteLines = ctx.websites
    .map(
      (s, i) =>
        `Site ${i + 1}: "${s.name}" (${s.url})
  Status: ${s.status} | Health: ${s.health}% | SSL: ${s.ssl}${s.sslDaysLeft !== null ? ` (${s.sslDaysLeft} days)` : ""}
  Links: ${s.brokenLinks}/${s.totalLinks} broken | JS Errors: ${s.jsErrors} | Performance: ${s.performanceScore}${s.loadTime ? ` | Load: ${s.loadTime}ms` : ""}
  Mixed Content: ${s.mixedContent ? "YES" : "No"} | Domain Days Left: ${s.domainDaysLeft ?? "N/A"} | SEO: ${s.seoScore ?? "N/A"}`,
    )
    .join("\n");

  const alertLines =
    ctx.recentAlerts.length > 0
      ? ctx.recentAlerts
          .map(
            (a) =>
              `- [${a.severity.toUpperCase()}] ${a.type}: ${a.message} (${a.target})`,
          )
          .join("\n")
      : "No recent alerts.";

  return `PULSEVAULT USER CONTEXT
========================
User: ${ctx.userEmail}
Plan: ${ctx.planName} (${ctx.planId})
${ctx.summary}

WEBSITES:
${siteLines}

RECENT ALERTS:
${alertLines}
========================`;
}
