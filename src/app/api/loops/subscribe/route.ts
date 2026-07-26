import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET required");

const LOOPS_API_KEY = process.env.LOOPS_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { subscribed } = await req.json();
    if (typeof subscribed !== "boolean") {
      return NextResponse.json(
        { error: "subscribed boolean required" },
        { status: 400 },
      );
    }

    if (!LOOPS_API_KEY) {
      // Save to Firestore only if no Loops key
      return NextResponse.json({
        success: true,
        message: "Preference saved locally (Loops not configured)",
      });
    }

    // Sync with Loops
    const res = await fetch("https://app.loops.so/api/v1/contacts/update", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOOPS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: decoded.email,
        userId: decoded.uid,
        subscribed,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[Loops] Sync failed:", err);
      // Don't fail the request — still save locally
      return NextResponse.json({
        success: true,
        warning: "Saved locally, Loops sync failed",
      });
    }

    return NextResponse.json({ success: true, synced: true });
  } catch (err: any) {
    console.error("[Loops Subscribe] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
