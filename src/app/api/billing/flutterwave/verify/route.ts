import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/lib/firebase-admin";

const JWT_SECRET = process.env.JWT_SECRET;
const FLUTTERWAVE_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;

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
    const { transaction_id, planId, txRef } = await req.json();
    if (!transaction_id) {
      return NextResponse.json(
        { error: "Transaction ID required" },
        { status: 400 },
      );
    }

    if (!FLUTTERWAVE_SECRET) {
      return NextResponse.json(
        { error: "Flutterwave not configured" },
        { status: 500 },
      );
    }

    // Verify with Flutterwave
    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET}`,
          "Content-Type": "application/json",
        },
      },
    );

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || verifyData.status !== "success") {
      return NextResponse.json(
        { error: verifyData.message || "Verification failed", verified: false },
        { status: 400 },
      );
    }

    const txData = verifyData.data;
    if (txData.status !== "successful") {
      return NextResponse.json(
        { error: `Transaction status: ${txData.status}`, verified: false },
        { status: 400 },
      );
    }

    // Call renew API internally
    const renewRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/billing/renew`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: req.headers.get("cookie") || "",
        },
        body: JSON.stringify({ planId, txRef }),
      },
    );

    const renewData = await renewRes.json();

    if (!renewRes.ok) {
      return NextResponse.json(
        { error: renewData.error || "Renewal failed", verified: true },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      data: renewData,
    });
  } catch (err: any) {
    console.error("[Flutterwave Verify] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
