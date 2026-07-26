import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { email, code, type } = await req.json();
    if (!email || !code || !type) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = getFirestore();
    const otpRef = db.collection("otpCodes").doc(normalizedEmail);
    const doc = await otpRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Code expired or invalid. Please request a new one." },
        { status: 400 },
      );
    }

    const data = doc.data()!;
    const now = Date.now();
    const expiresAt = data.expiresAt?.toMillis?.() || 0;

    // Check expiry
    if (now > expiresAt) {
      await otpRef.delete();
      return NextResponse.json(
        { error: "Code expired. Please request a new one." },
        { status: 400 },
      );
    }

    // Check type match
    if (data.type !== type) {
      return NextResponse.json(
        { error: "Invalid verification type" },
        { status: 400 },
      );
    }

    // Check attempts
    if ((data.attempts || 0) >= 5) {
      await otpRef.delete();
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new code." },
        { status: 400 },
      );
    }

    // Verify code
    if (data.code !== code) {
      await otpRef.update({ attempts: (data.attempts || 0) + 1 });
      return NextResponse.json(
        { error: "Invalid code. Please try again." },
        { status: 400 },
      );
    }

    // Success — delete the OTP doc so it can't be reused
    await otpRef.delete();

    return NextResponse.json({ success: true, verified: true });
  } catch (err: any) {
    console.error("[VerifyOTP] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
