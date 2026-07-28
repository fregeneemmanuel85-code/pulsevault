import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 },
      );
    }

    const { email, type } = await req.json();
    if (!email || !type || !["signup", "login"].includes(type)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpRef = db.collection("otpCodes").doc(normalizedEmail);
    const existing = await otpRef.get();

    // Rate limit: 60 seconds between requests
    if (existing.exists) {
      const data = existing.data()!;
      const lastSent = data.sentAt?.toMillis?.() || 0;
      if (Date.now() - lastSent < 60000) {
        return NextResponse.json(
          { error: "Please wait 60 seconds before requesting a new code" },
          { status: 429 },
        );
      }
    }

    const code = generateOTP();
    const expiresAt = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000); // 10 minutes

    await otpRef.set({
      code,
      type,
      email: normalizedEmail,
      expiresAt,
      attempts: 0,
      sentAt: Timestamp.now(),
    });

    // Send via Resend
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 },
      );
    }

    const actionText =
      type === "signup"
        ? "verify your PulseVault account"
        : "sign in to PulseVault";

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PulseVault Security <security@pulsevault.website>",
        to: normalizedEmail,
        subject: `Your PulseVault ${type === "signup" ? "Signup" : "Login"} Code — ${code}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="color:white;margin:0;font-size:20px;">🔐 PulseVault</h1>
            </div>
            <div style="background:white;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
              <p style="color:#334155;font-size:16px;margin:0 0 8px;">Your verification code</p>
              <p style="color:#64748b;font-size:14px;margin:0 0 24px;">Enter this code to ${actionText}. It expires in 10 minutes.</p>
              
              <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:8px;padding:20px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;color:#0f172a;font-family:monospace;">
                ${code}
              </div>
              
              <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;">If you didn't request this code, you can safely ignore this email.</p>
            </div>
          </div>
        `,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[SendOTP] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
