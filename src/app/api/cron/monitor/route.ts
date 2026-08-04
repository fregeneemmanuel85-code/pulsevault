import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebase-admin";

const CONCURRENCY = 3;

// Vercel sets this automatically in production
const ORIGIN = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  const secret =
    req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getFirestore();
  let scanned = 0;
  let failed = 0;
  let skipped = 0;

  try {
    const usersSnap = await db.collection("users").get();
    console.log(`[Cron] Found ${usersSnap.size} users`);

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;

      // Get plan config for check interval
      const planSnap = await db
        .collection("users")
        .doc(userId)
        .collection("billing")
        .doc("plan")
        .get();
      const checkIntervalMin = planSnap.exists
        ? planSnap.data()?.checkInterval || 30
        : 30;
      const checkIntervalMs = checkIntervalMin * 60 * 1000;

      const websitesSnap = await db
        .collection("users")
        .doc(userId)
        .collection("websites")
        .get();

      const sitesToScan: Array<{ id: string; url: string }> = [];

      for (const siteDoc of websitesSnap.docs) {
        const site = siteDoc.data();

        // Skip if monitoring is disabled
        if (!site.url || site.isMonitoring === false) {
          skipped++;
          continue;
        }

        // Respect check interval — don't hammer the same site
        const lastChecked = site.lastChecked
          ? new Date(site.lastChecked).getTime()
          : 0;
        if (Date.now() - lastChecked < checkIntervalMs) {
          skipped++;
          continue;
        }

        sitesToScan.push({ id: siteDoc.id, url: site.url });
      }

      console.log(
        `[Cron] User ${userId}: ${sitesToScan.length}/${websitesSnap.size} sites queued`,
      );

      // Scan in batches to avoid Vercel timeout
      for (let i = 0; i < sitesToScan.length; i += CONCURRENCY) {
        const batch = sitesToScan.slice(i, i + CONCURRENCY);

        await Promise.all(
          batch.map(async ({ id: websiteId, url }) => {
            try {
              const res = await fetch(`${ORIGIN}/api/scan-deep`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-cron-secret": process.env.CRON_SECRET!,
                },
                body: JSON.stringify({ url, websiteId, userId }),
              });

              const result = await res.json().catch(() => null);

              if (res.ok && result) {
                scanned++;
                console.log(`[Cron] ✅ ${url} → ${result.status}`);
              } else {
                failed++;
                console.error(
                  `[Cron] ❌ ${url} → ${res.status}:`,
                  result?.error || "Unknown",
                );
              }
            } catch (e: any) {
              failed++;
              console.error(`[Cron] 💥 ${url} →`, e.message);
            }
          }),
        );

        // Breather between batches
        if (i + CONCURRENCY < sitesToScan.length) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    return NextResponse.json({
      success: true,
      scanned,
      failed,
      skipped,
      total: scanned + failed + skipped,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("[Cron] Fatal error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
