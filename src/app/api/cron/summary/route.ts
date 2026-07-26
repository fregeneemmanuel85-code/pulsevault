import { NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebase-admin";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

function getSecret() {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getFirestore();

    const usersSnap = await db.collection("users").get();
    let totalReportsSent = 0;

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      const planSnap = await db
        .collection("users")
        .doc(userId)
        .collection("billing")
        .doc("plan")
        .get();

      const planId = planSnap.exists
        ? planSnap.data()?.planId || "free"
        : "free";
      if (planId === "free") continue;

      const settingsSnap = await db
        .collection("users")
        .doc(userId)
        .collection("settings")
        .doc("preferences")
        .get();

      const settingsData = settingsSnap.exists ? settingsSnap.data() : null;
      if (!settingsData?.notifications?.email) continue;

      const userEmail = userData.email || "";
      if (!userEmail) continue;

      const websitesSnap = await db
        .collection("users")
        .doc(userId)
        .collection("websites")
        .get();

      const websites = websitesSnap.docs.map((d) => d.data());

      const incidentsSnap = await db
        .collection("users")
        .doc(userId)
        .collection("incidents")
        .get();

      const incidents = incidentsSnap.docs.map((d) => d.data());

      const healthySites = websites.filter(
        (w) => w.status === "healthy",
      ).length;
      const warningSites = websites.filter(
        (w) => w.status === "warning",
      ).length;
      const offlineSites = websites.filter(
        (w) => w.status === "offline",
      ).length;
      const averageHealth =
        websites.length > 0
          ? Math.round(
              websites.reduce((sum, w) => sum + (w.health || 0), 0) /
                websites.length,
            )
          : 0;

      const summary = {
        period: "daily",
        generatedAt: new Date().toISOString(),
        totalSites: websites.length,
        healthySites,
        warningSites,
        offlineSites,
        averageHealth,
        totalIncidents: incidents.length,
        openIncidents: incidents.filter((i) => i.status === "open").length,
        resolvedIncidents: incidents.filter((i) => i.status === "resolved")
          .length,
      };

      try {
        const emailRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/email`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: userEmail,
              subject: `📊 PulseVault Daily Summary — ${new Date().toLocaleDateString()}`,
              html: generateHTML(summary),
              text: generateText(summary),
            }),
          },
        );

        if (emailRes.ok) {
          totalReportsSent++;
          console.log(`[Summary] Report sent to ${userEmail}`);
        }
      } catch (err: any) {
        console.error(`[Summary] Failed to send to ${userEmail}:`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      totalReportsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Summary] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function generateHTML(summary: any): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #0f172a;">📊 PulseVault Daily Summary</h1>
      <p style="color: #64748b;">${new Date(summary.generatedAt).toLocaleDateString()}</p>
      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p><strong>Total Sites:</strong> ${summary.totalSites}</p>
        <p><strong>Healthy:</strong> ${summary.healthySites} ✅</p>
        <p><strong>Warning:</strong> ${summary.warningSites} ⚠️</p>
        <p><strong>Offline:</strong> ${summary.offlineSites} ❌</p>
        <p><strong>Average Health:</strong> ${summary.averageHealth}%</p>
        <p><strong>Total Incidents:</strong> ${summary.totalIncidents}</p>
      </div>
    </div>
  `;
}

function generateText(summary: any): string {
  return `PulseVault Daily Summary\n\nTotal: ${summary.totalSites} | Healthy: ${summary.healthySites} | Warning: ${summary.warningSites} | Offline: ${summary.offlineSites}\nAvg Health: ${summary.averageHealth}%`;
}
