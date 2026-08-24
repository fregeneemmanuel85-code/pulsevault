import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getPlanConfig, calculateGracePeriodEnd } from "@/lib/subscription";
import {
  sendSubscriptionReminderEmail,
  sendSubscriptionExpiredEmail,
  sendGracePeriodEmail,
} from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  const authHeader = headers().get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Date.now();
    const nowISO = new Date().toISOString();

    const usersSnap = await db
      .collection("users")
      .where("status", "in", ["active", "grace"])
      .get();

    const results = {
      checked: 0,
      graceActivated: 0,
      downgraded: 0,
      emailsSent: { reminder7d: 0, reminder48h: 0, expired: 0, grace: 0 },
      skipped: 0,
      errors: [] as string[],
    };

    for (const doc of usersSnap.docs) {
      const userData = doc.data();
      const planId = userData.planId || "free";

      if (planId === "free") {
        results.skipped++;
        continue;
      }

      results.checked++;
      const config = getPlanConfig(planId);
      const expiresAt = userData.expiresAt;
      const currentStatus = userData.status || "active";
      const graceEnd = userData.gracePeriodEnd;
      const userEmail = userData.email;
      const userName = userData.displayName || userData.name || "there";

      if (!expiresAt) continue;

      try {
        const expiryTime = new Date(expiresAt).getTime();
        const hoursUntilExpiry = Math.floor(
          (expiryTime - now) / (1000 * 60 * 60),
        );
        const daysUntilExpiry = Math.floor(hoursUntilExpiry / 24);

        const emails = userData.subscriptionEmails || {};

        // Reset email tracking if expiry date changed (user renewed)
        const lastExpiry = emails.lastExpiryDate;
        if (lastExpiry && lastExpiry !== expiresAt) {
          await doc.ref.update({
            "subscriptionEmails.lastExpiryDate": expiresAt,
            "subscriptionEmails.reminder7d": null,
            "subscriptionEmails.reminder48h": null,
            "subscriptionEmails.expired": null,
            "subscriptionEmails.grace": null,
          });
          emails.lastExpiryDate = expiresAt;
          emails.reminder7d = null;
          emails.reminder48h = null;
          emails.expired = null;
          emails.grace = null;
        } else if (!lastExpiry) {
          await doc.ref.update({
            "subscriptionEmails.lastExpiryDate": expiresAt,
          });
          emails.lastExpiryDate = expiresAt;
        }

        // 1. 7-day reminder (between 7 days and 2 days left)
        if (hoursUntilExpiry <= 168 && hoursUntilExpiry > 48) {
          const sent = emails.reminder7d;
          if (!sent || sent.forExpiry !== expiresAt) {
            if (userEmail) {
              await sendSubscriptionReminderEmail({
                to: userEmail,
                userName,
                planName: config.name,
                expiresAt,
                daysLeft: Math.ceil(hoursUntilExpiry / 24),
              });
              await doc.ref.update({
                "subscriptionEmails.reminder7d": {
                  sentAt: nowISO,
                  forExpiry: expiresAt,
                },
              });
              results.emailsSent.reminder7d++;
            }
          }
        }

        // 2. 48-hour reminder (between 48 hours and 1 hour left)
        if (hoursUntilExpiry <= 48 && hoursUntilExpiry > 0) {
          const sent = emails.reminder48h;
          if (!sent || sent.forExpiry !== expiresAt) {
            if (userEmail) {
              await sendSubscriptionReminderEmail({
                to: userEmail,
                userName,
                planName: config.name,
                expiresAt,
                daysLeft: Math.ceil(hoursUntilExpiry / 24),
              });
              await doc.ref.update({
                "subscriptionEmails.reminder48h": {
                  sentAt: nowISO,
                  forExpiry: expiresAt,
                },
              });
              results.emailsSent.reminder48h++;
            }
          }
        }

        // 3. Still active — nothing else to do
        if (now < expiryTime) continue;

        // 4. Expired — transition to grace
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

          // Send expired email
          if (userEmail) {
            const sent = emails.expired;
            if (!sent || sent.forExpiry !== expiresAt) {
              await sendSubscriptionExpiredEmail({
                to: userEmail,
                userName,
                planName: config.name,
                graceDays: config.gracePeriodDays,
              });
              await doc.ref.update({
                "subscriptionEmails.expired": {
                  sentAt: nowISO,
                  forExpiry: expiresAt,
                },
              });
              results.emailsSent.expired++;
            }
          }

          results.graceActivated++;
        }

        // 5. Grace period — send grace reminder (once per grace period)
        else if (currentStatus === "grace") {
          const graceTime = graceEnd ? new Date(graceEnd).getTime() : 0;

          if (userEmail) {
            const sent = emails.grace;
            const graceDaysLeft = Math.max(
              0,
              Math.ceil((graceTime - now) / (1000 * 60 * 60 * 24)),
            );

            if ((!sent || sent.forExpiry !== expiresAt) && graceDaysLeft > 0) {
              await sendGracePeriodEmail({
                to: userEmail,
                userName,
                planName: config.name,
                graceDaysLeft,
              });
              await doc.ref.update({
                "subscriptionEmails.grace": {
                  sentAt: nowISO,
                  forExpiry: expiresAt,
                },
              });
              results.emailsSent.grace++;
            }
          }

          // Downgrade if grace ended
          if (now >= graceTime) {
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
  const now = FieldValue.serverTimestamp();

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
    downgradedAt: now,
    updatedAt: now,
  });

  const billingPlanRef = db
    .collection("users")
    .doc(userId)
    .collection("billing")
    .doc("plan");
  batch.set(
    billingPlanRef,
    {
      planId: "free",
      planName: "Free",
      price: 0,
      websites: 2,
      checkInterval: 30,
      status: "expired",
      gracePeriodEnd: null,
      updatedAt: now,
    },
    { merge: true },
  );

  const websitesSnap = await db
    .collection("websites")
    .where("userId", "==", userId)
    .get();

  const sortedDocs = websitesSnap.docs.sort((a, b) => {
    const aTime =
      a.data().createdAt?.toMillis?.() ||
      new Date(a.data().createdAt || 0).getTime();
    const bTime =
      b.data().createdAt?.toMillis?.() ||
      new Date(b.data().createdAt || 0).getTime();
    return aTime - bTime;
  });

  let count = 0;
  sortedDocs.forEach((doc) => {
    count++;
    batch.update(doc.ref, {
      monitoringStatus: count > 2 ? "inactive" : "active",
      inactiveReason:
        count > 2 ? "Plan downgraded to Free — upgrade to reactivate" : null,
      updatedAt: now,
    });
  });

  await batch.commit();
}
