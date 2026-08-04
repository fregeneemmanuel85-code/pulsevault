import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { to, userName, alertType, severity, message, target, timestamp } =
      await req.json();

    if (!to || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await resend.emails.send({
      from: "PulseVault <alerts@pulsevault.website>",
      to,
      subject: `🚨 ${severity?.toUpperCase() || "ALERT"}: ${alertType} on ${target}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;">
          <h2 style="color:#dc2626;">PulseVault Alert</h2>
          <p>Hello ${userName || "User"},</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Type</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${alertType}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Target</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${target}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Severity</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${severity}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Message</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${message}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Time</strong></td><td style="padding:8px;border:1px solid #e5e7eb;">${timestamp}</td></tr>
          </table>
          <a href="https://pulsevault.website/dashboard" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;">View Dashboard</a>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Email] Error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}
