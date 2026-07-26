import { NextRequest, NextResponse } from "next/server";
import { sendAlertEmail } from "@/lib/email-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    await sendAlertEmail({
      to,
      userName: "Test User",
      alertType: "Test Alert",
      severity: "warning",
      message: "This is a test email from PulseVault.",
      target: "https://pulsevault.website",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Email API] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
