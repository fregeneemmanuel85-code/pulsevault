import { NextResponse } from "next/server";
import { sendAlertEmail } from "@/lib/email-server";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.to || !data.message || !data.alertType) {
      return NextResponse.json(
        { error: "Missing required fields: to, message, alertType" },
        { status: 400 },
      );
    }

    await sendAlertEmail(data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Email API] Error:", error);
    return NextResponse.json(
      { error: "Failed to send email", detail: error.message },
      { status: 500 },
    );
  }
}
