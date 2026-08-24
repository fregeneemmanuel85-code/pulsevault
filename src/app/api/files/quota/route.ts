import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/lib/firebase-admin";
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

export async function GET(req: NextRequest) {
  const userId = await getUserFromToken(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Try billing/plan subcollection first (where your billing page writes)
    const billingSnap = await db
      .collection("users")
      .doc(userId)
      .collection("billing")
      .doc("plan")
      .get();
    let planId = "free";
    let planName = "Free";

    if (billingSnap.exists) {
      const billingData = billingSnap.data()!;
      planId = billingData.planId || "free";
      planName = billingData.planName || "Free";
    } else {
      // 2. Fallback to root user doc
      const userSnap = await db.collection("users").doc(userId).get();
      const data = userSnap.exists ? userSnap.data() : {};
      planId = (data?.planId as string) || (data?.plan as string) || "free";
      planName = (data?.planName as string) || "Free";
    }

    const config = getPlanConfig(planId);
    const used =
      Number(
        (await db.collection("users").doc(userId).get()).data()?.storageUsed,
      ) || 0;

    return NextResponse.json({
      used,
      limit: config.fileStorage,
      plan: planName,
      remaining: Math.max(0, config.fileStorage - used),
    });
  } catch (err: any) {
    console.error("[API /files/quota] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
