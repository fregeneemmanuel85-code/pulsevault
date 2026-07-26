import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebase-admin";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

function getSecret() {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "daily";

    // Get user ID from JWT cookie
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let userId: string;
    try {
      const { payload } = await jwtVerify(token, getSecret());
      userId = payload.uid as string;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Use Admin SDK to query Firestore
    const db = getFirestore();

    const sitesSnap = await db
      .collection("users")
      .doc(userId)
      .collection("websites")
      .get();
    const websites = sitesSnap.docs.map((d) => d.data() as any);

    const planSnap = await db
      .collection("users")
      .doc(userId)
      .collection("billing")
      .doc("plan")
      .get();
    const plan = planSnap.exists ? planSnap.data() : null;

    if (!plan || plan.planId === "free") {
      return NextResponse.json(
        { error: "Starter plan required" },
        { status: 403 },
      );
    }

    // ─── TIME FILTER: Daily = last 24h, Weekly = last 7 days ───
    const now = new Date();
    const startTime = new Date(now);
    if (period === "weekly") {
      startTime.setDate(now.getDate() - 7);
    } else {
      startTime.setHours(now.getHours() - 24);
    }

    // Fetch incidents within time range
    const incidentsQuery = await db
      .collection("users")
      .doc(userId)
      .collection("incidents")
      .where("startedAt", ">=", startTime.toISOString())
      .get();
    const incidents = incidentsQuery.docs.map((d) => d.data() as any);

    // Fetch alerts within time range
    const alertsQuery = await db
      .collection("users")
      .doc(userId)
      .collection("alerts")
      .where("createdAt", ">=", startTime.toISOString())
      .get();
    const alerts = alertsQuery.docs.map((d) => d.data() as any);

    const incidentsBySite = new Map<string, number>();
    incidents.forEach((inc) => {
      const count = incidentsBySite.get(inc.websiteId) || 0;
      incidentsBySite.set(inc.websiteId, count + 1);
    });

    const openIncidents = incidents.filter((i) => i.status === "open").length;
    const resolvedIncidents = incidents.filter(
      (i) => i.status === "resolved",
    ).length;

    const summary = {
      period: period === "weekly" ? "Weekly" : "Daily",
      periodRange:
        period === "weekly"
          ? `${startTime.toLocaleDateString()} — ${now.toLocaleDateString()}`
          : `${startTime.toLocaleDateString()} — ${now.toLocaleDateString()}`,
      generatedAt: now.toISOString(),
      totalSites: websites.length,
      healthySites: websites.filter((w) => w.status === "healthy").length,
      warningSites: websites.filter((w) => w.status === "warning").length,
      offlineSites: websites.filter((w) => w.status === "offline").length,
      averageHealth: Math.round(
        websites.reduce((sum, w) => sum + (w.health || 0), 0) /
          (websites.length || 1),
      ),
      totalIncidents: incidents.length,
      openIncidents,
      resolvedIncidents,
      newAlerts: alerts.length,
      sites: websites.map((w) => ({
        id: w.id,
        name: w.name,
        url: w.url,
        status: w.status,
        health: w.health,
        uptime: w.uptime,
        incidents: incidentsBySite.get(w.id) || 0,
        lastChecked: w.lastChecked,
      })),
    };

    return NextResponse.json(summary);
  } catch (err: any) {
    console.error("[Summary API] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
