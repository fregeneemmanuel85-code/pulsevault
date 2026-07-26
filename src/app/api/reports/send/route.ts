import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebase-admin";
import { sendReportEmail } from "@/lib/email-server";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

function getSecret() {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let userId: string;
    let payload: any;
    try {
      const verified = await jwtVerify(token, getSecret());
      payload = verified.payload;
      userId = payload.uid as string;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { period = "daily" } = await req.json();

    const db = getFirestore();

    // Get user data for email
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    const userEmail = (payload.email as string) || userData?.email || "";
    const userName = userData?.name || "User";

    if (!userEmail) {
      return NextResponse.json(
        { error: "No email found for user" },
        { status: 400 },
      );
    }

    // Check if email reports are enabled
    const settingsSnap = await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("preferences")
      .get();
    const settings = settingsSnap.exists ? settingsSnap.data() : null;
    const emailEnabled = settings?.notifications?.email !== false;

    if (!emailEnabled) {
      return NextResponse.json(
        { error: "Email reports disabled in settings" },
        { status: 403 },
      );
    }

    // Fetch websites
    const websitesSnap = await db
      .collection("users")
      .doc(userId)
      .collection("websites")
      .get();
    const websites = websitesSnap.docs.map((d) => d.data());

    // Fetch alerts
    const alertsSnap = await db
      .collection("users")
      .doc(userId)
      .collection("alerts")
      .get();
    const alerts = alertsSnap.docs.map((d) => d.data());

    // Calculate stats
    const totalWebsites = websites.length;
    const healthySites = websites.filter((w) => w.status === "healthy").length;
    const offlineSites = websites.filter((w) => w.status === "offline").length;
    const openAlerts = alerts.filter((a) => a.status === "open").length;
    const resolvedAlerts = alerts.filter((a) => a.status === "resolved").length;
    const avgHealthScore =
      totalWebsites > 0
        ? Math.round(
            websites.reduce((sum, w) => sum + (w.health || 0), 0) /
              totalWebsites,
          )
        : 100;

    const sslExpiringSoon = websites.filter((w) => {
      const days = w.sslDaysLeft;
      return typeof days === "number" && days >= 0 && days < 30;
    }).length;

    const sslExpired = websites.filter((w) => {
      const days = w.sslDaysLeft;
      return typeof days === "number" && days < 0;
    }).length;

    // Build top issues
    const topIssues: string[] = [];
    if (offlineSites > 0)
      topIssues.push(`${offlineSites} website(s) currently offline`);
    if (openAlerts > 0)
      topIssues.push(`${openAlerts} open alert(s) need attention`);
    if (sslExpired > 0)
      topIssues.push(`${sslExpired} SSL certificate(s) expired`);
    if (sslExpiringSoon > 0)
      topIssues.push(
        `${sslExpiringSoon} SSL certificate(s) expiring within 30 days`,
      );
    websites.forEach((w) => {
      if (w.brokenLinks > 0)
        topIssues.push(`${w.name}: ${w.brokenLinks} broken links`);
      if (w.jsErrors > 0)
        topIssues.push(`${w.name}: ${w.jsErrors} JS errors detected`);
    });

    const now = new Date();
    const reportDate =
      period === "weekly"
        ? `Week of ${now.toLocaleDateString()}`
        : now.toLocaleDateString();

    await sendReportEmail({
      to: userEmail,
      userName,
      period,
      reportDate,
      totalWebsites,
      healthySites,
      offlineSites,
      openAlerts,
      resolvedAlerts,
      avgHealthScore,
      sslExpiringSoon,
      sslExpired,
      topIssues: topIssues.slice(0, 5),
    });

    // Save report log
    await db.collection("users").doc(userId).collection("reports").add({
      period,
      sentAt: new Date().toISOString(),
      totalWebsites,
      healthySites,
      offlineSites,
      openAlerts,
      status: "sent",
    });

    return NextResponse.json({
      success: true,
      message: "Report sent to " + userEmail,
    });
  } catch (error: any) {
    console.error("[Reports API] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
