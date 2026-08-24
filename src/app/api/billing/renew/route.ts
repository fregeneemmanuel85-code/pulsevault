import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getPlanConfig } from "@/lib/subscription";

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
    const { planId, txRef } = await req.json();
    const config = getPlanConfig(planId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const timestamp = FieldValue.serverTimestamp();

    const batch = db.batch();

    // 1. Update ROOT user doc
    const userRef = db.collection("users").doc(userId);
    batch.update(userRef, {
      planId,
      planName: config.name,
      price: config.price,
      websites: config.websites,
      checkInterval: config.checkInterval,
      aiCredits: config.aiCredits,
      fileStorage: config.fileStorage,
      status: "active",
      gracePeriodEnd: null,
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      updatedAt: timestamp,
    });

    // 2. Update billing/plan subcollection
    const billingPlanRef = db
      .collection("users")
      .doc(userId)
      .collection("billing")
      .doc("plan");
    batch.set(
      billingPlanRef,
      {
        planId,
        planName: config.name,
        price: config.price,
        websites: config.websites,
        checkInterval: config.checkInterval,
        status: "active",
        gracePeriodEnd: null,
        startedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        updatedAt: timestamp,
      },
      { merge: true },
    );

    // 3. Reactivate ALL websites — no orderBy needed
    const websitesSnap = await db
      .collection("websites")
      .where("userId", "==", userId)
      .get();

    websitesSnap.docs.forEach((doc: any) => {
      batch.update(doc.ref, {
        monitoringStatus: "active",
        inactiveReason: null,
        updatedAt: timestamp,
      });
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      plan: config,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err: any) {
    console.error("[Renew] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
