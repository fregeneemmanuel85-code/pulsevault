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
    const userRef = db.collection("users").doc(userId);
    const snap = await userRef.get();
    const data = snap.exists ? snap.data() : {};

    const planId = (data?.planId as string) || "free";
    const config = getPlanConfig(planId);
    const used = Number(data?.storageUsed) || 0;

    return NextResponse.json({
      used,
      limit: config.fileStorage,
      plan: config.name,
      remaining: Math.max(0, config.fileStorage - used),
    });
  } catch (err: any) {
    console.error("[API /files/quota] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
