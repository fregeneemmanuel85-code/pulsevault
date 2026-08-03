import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const secret =
    req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getFirestore();
  const origin = req.nextUrl.origin;
  let scanned = 0;
  let failed = 0;

  try {
    const usersSnap = await db.collection("users").get();
    console.log(`[Cron] Found ${usersSnap.size} users`);

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      const websitesSnap = await db
        .collection("users")
        .doc(userId)
        .collection("websites")
        .get();

      console.log(`[Cron] User ${userId}: ${websitesSnap.size} websites`);

      for (const siteDoc of websitesSnap.docs) {
        const site = siteDoc.data();
        const websiteId = siteDoc.id;

        if (!site.url) {
          console.log(`[Cron] Skipping ${websiteId}: no URL`);
          continue;
        }

        console.log(`[Cron] Scanning: ${site.url}`);

        try {
          const res = await fetch(`${origin}/api/scan-deep`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-cron-secret": process.env.CRON_SECRET!,
            },
            body: JSON.stringify({
              url: site.url,
              websiteId,
              userId,
            }),
          });

          // ─── CRITICAL FIX: Consume the body so the function fully completes ───
          const result = await res.json().catch(() => null);

          if (res.ok && result) {
            scanned++;
            console.log(
              `[Cron] ✅ ${site.url} → status=${result.status}, health=${result.healthScore}, techStack=${result.techStack?.detected?.length || 0}`,
            );
          } else {
            failed++;
            console.error(
              `[Cron] ❌ ${site.url} → HTTP ${res.status}:`,
              result?.error || "Unknown error",
            );
          }
        } catch (e: any) {
          failed++;
          console.error(`[Cron] 💥 ${site.url} →`, e.message);
        }

        // Small delay between sites to avoid hammering your own API
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return NextResponse.json({
      success: true,
      scanned,
      failed,
      total: scanned + failed,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("[Cron] Fatal error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
