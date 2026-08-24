import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const JWT_SECRET = process.env.JWT_SECRET;

async function getUserFromToken(req: NextRequest) {
  const cookieToken = req.cookies.get("token")?.value;
  if (!cookieToken || !JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(
      cookieToken,
      new TextEncoder().encode(JWT_SECRET),
    );
    return payload.uid as string;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserFromToken(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const batch = db.batch();
    const now = FieldValue.serverTimestamp();

    // 1. Update ROOT user doc (used by file manager, quota, etc.)
    const userRef = db.collection("users").doc(userId);
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

    // 2. Update billing/plan subcollection (used by billing page subscription)
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

    // 3. Deactivate excess websites
    const websitesSnap = await db
      .collection("websites")
      .where("userId", "==", userId)
      .orderBy("createdAt", "asc")
      .get();

    let count = 0;
    websitesSnap.docs.forEach((doc: any) => {
      count++;
      batch.update(doc.ref, {
        monitoringStatus: count > 2 ? "inactive" : "active",
        inactiveReason:
          count > 2 ? "Plan downgraded to Free — upgrade to reactivate" : null,
        updatedAt: now,
      });
    });

    await batch.commit();
    return NextResponse.json({
      success: true,
      message: "Downgraded to Free plan",
    });
  } catch (err: any) {
    console.error("[Downgrade] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
