import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getPlanConfig, calculateGracePeriodEnd } from "@/lib/subscription";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  // Verify this is either a Vercel Cron or an admin call
  const authHeader = headers().get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();
    const nowTime = Date.now();

    // Get all non-free users with active or grace status
    const usersSnap = await db
      .collection("users")
      .where("status", "in", ["active", "grace"])
      .get();

    const results = {
      checked: 0,
      graceActivated: 0,
      downgraded: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const doc of usersSnap.docs) {
      const userData = doc.data();
      const planId = userData.planId || "free";

      // Skip free users
      if (planId === "free") {
        results.skipped++;
        continue;
      }

      results.checked++;
      const config = getPlanConfig(planId);
      const expiresAt = userData.expiresAt;
      const currentStatus = userData.status || "active";
      const graceEnd = userData.gracePeriodEnd;

      try {
        const expiryTime = expiresAt ? new Date(expiresAt).getTime() : Infinity;

        // Still active — nothing to do
        if (nowTime < expiryTime) continue;

        // Expired but still in grace period
        if (currentStatus === "active") {
          const gracePeriodEnd = calculateGracePeriodEnd(
            expiresAt,
            config.gracePeriodDays,
          );
          await doc.ref.update({
            status: "grace",
            gracePeriodEnd,
            updatedAt: FieldValue.serverTimestamp(),
          });
          results.graceActivated++;
        }
        // Grace period ended — downgrade
        else if (currentStatus === "grace") {
          const graceTime = graceEnd ? new Date(graceEnd).getTime() : 0;
          if (nowTime >= graceTime) {
            await performDowngrade(doc.id, doc.ref, userData);
            results.downgraded++;
          }
        }
      } catch (err: any) {
        results.errors.push(`${doc.id}: ${err.message}`);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error("[Cron Check Expiry] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function performDowngrade(userId: string, userRef: any, userData: any) {
  const batch = db.batch();

  // 1. Downgrade user to Free
  batch.update(userRef, {
    planId: "free",
    planName: "Free",
    price: 0,
    websites: 2,
    checkInterval: 30,
    aiCredits: 100,
    fileStorage: 100 * 1024 * 1024,
    status: "expired",
    gracePeriodEnd: null,
    downgradedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 2. Deactivate excess websites (keep first 2 by creation date)
  const websitesSnap = await db
    .collection("websites")
    .where("userId", "==", userId)
    .orderBy("createdAt", "asc")
    .get();

  let count = 0;
  websitesSnap.docs.forEach((siteDoc: any) => {
    count++;
    if (count > 2) {
      batch.update(siteDoc.ref, {
        monitoringStatus: "inactive",
        inactiveReason: "Plan downgraded to Free — upgrade to reactivate",
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      batch.update(siteDoc.ref, {
        monitoringStatus: "active",
        inactiveReason: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });

  await batch.commit();
}
