import { NextRequest, NextResponse } from "next/server";
import { sendAlertEmail } from "@/lib/email-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, userName, alertType, severity, message, target, timestamp } =
      body;

    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await sendAlertEmail({
      to,
      userName,
      alertType,
      severity,
      message,
      target,
      timestamp,
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Email API] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
