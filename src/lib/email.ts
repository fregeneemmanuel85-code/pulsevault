import { getFirestore } from "firebase-admin/firestore";
import "@/lib/firebase-admin";
import {
  sendAlertEmail as sendFromServer,
  AlertEmailData,
} from "@/lib/email-server";

export type { AlertEmailData };

export async function shouldSendEmail(userId: string): Promise<boolean> {
  try {
    const db = getFirestore();
    const snap = await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("preferences")
      .get();
    if (!snap.exists) return true;
    const data = snap.data();
    return data?.notifications?.email !== false;
  } catch {
    return true;
  }
}

export async function sendAlertEmail(data: AlertEmailData) {
  return sendFromServer(data);
}

/* ─── HEALTH DROP ALERT ─── */
export async function sendHealthDropAlert(data: {
  to: string;
  userName: string;
  target: string;
  healthScore: number;
  httpStatus?: number;
  sslStatus?: "valid" | "expiring" | "expired";
  sslDaysLeft?: number;
  loadTime?: number;
  timestamp?: string;
}) {
  return sendAlertEmail({
    to: data.to,
    userName: data.userName,
    alertType: "Health Score Drop",
    severity: data.healthScore < 50 ? "critical" : "warning",
    message: `Your site ${data.target} health score has dropped to ${data.healthScore}%. Performance, uptime, or security issues have been detected.`,
    target: data.target,
    timestamp: data.timestamp || new Date().toLocaleString(),
    healthScore: data.healthScore,
    httpStatus: data.httpStatus,
    sslStatus: data.sslStatus,
    sslDaysLeft: data.sslDaysLeft,
    loadTime: data.loadTime,
  });
}

/* ─── SITE OFFLINE ALERT ─── */
export async function sendSiteOfflineAlert(data: {
  to: string;
  userName: string;
  target: string;
  httpStatus?: number;
  sslStatus?: "valid" | "expiring" | "expired";
  sslDaysLeft?: number;
  loadTime?: number;
  timestamp?: string;
}) {
  return sendAlertEmail({
    to: data.to,
    userName: data.userName,
    alertType: "Site Offline",
    severity: "critical",
    message: `Your site ${data.target} is currently offline and not responding to health checks. Visitors cannot reach your site. Immediate action is recommended to restore service.`,
    target: data.target,
    timestamp: data.timestamp || new Date().toLocaleString(),
    healthScore: 0,
    httpStatus: data.httpStatus,
    sslStatus: data.sslStatus,
    sslDaysLeft: data.sslDaysLeft,
    loadTime: data.loadTime,
  });
}

/* ─── SUBSCRIPTION EMAILS ─── */

export async function sendSubscriptionReminderEmail(data: {
  to: string;
  userName: string;
  planName: string;
  expiresAt: string;
  daysLeft: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");

  const isUrgent = data.daysLeft <= 2;
  const subject = isUrgent
    ? `⏰ Your PulseVault ${data.planName} plan expires in ${data.daysLeft} day${data.daysLeft !== 1 ? "s" : ""}`
    : `📅 Your PulseVault ${data.planName} plan expires in ${data.daysLeft} days`;

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:24px 16px;">
            <table width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
              <tr>
                <td style="padding:28px 24px;border-bottom:1px solid #e2e8f0;background:#0f172a;text-align:center;">
                  <h1 style="margin:0;font-size:22px;font-weight:700;color:white;letter-spacing:-0.02em;">⏰ Subscription Reminder</h1>
                  <p style="margin:8px 0 0 0;font-size:13px;color:#94a3b8;">PulseVault</p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 24px;">
                  <p style="color:#334155;font-size:16px;margin:0 0 6px 0;">Hi ${data.userName},</p>
                  <p style="color:#64748b;font-size:14px;margin:0 0 24px 0;line-height:1.5;">
                    Your <strong>${data.planName}</strong> plan expires on <strong>${new Date(data.expiresAt).toLocaleDateString()}</strong> 
                    (${data.daysLeft} day${data.daysLeft !== 1 ? "s" : ""} remaining).
                  </p>
                  <div style="background:${isUrgent ? "#fef2f2" : "#fffbeb"};padding:18px;border-radius:10px;border-left:4px solid ${isUrgent ? "#ef4444" : "#f59e0b"};margin:0 0 24px 0;">
                    <p style="font-size:14px;color:#475569;margin:0;line-height:1.5;">
                      ${
                        isUrgent
                          ? "Your plan will expire soon. Renew now to avoid service interruption and automatic downgrade to Free."
                          : "Renew now to keep your premium features uninterrupted."
                      }
                    </p>
                  </div>
                  <div style="text-align:center;margin-top:24px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://pulsevault.website"}/dashboard/billing" style="display:inline-block;padding:14px 28px;background:#2563eb;color:white;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:-0.01em;">Renew Plan</a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:18px;border-top:1px solid #e2e8f0;text-align:center;background:#f8fafc;">
                  <p style="font-size:12px;color:#94a3b8;margin:0;">PulseVault · Subscription Management</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `PulseVault Billing <${fromEmail}>`,
      to: data.to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errData = await res
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(errData.message || `Resend API error: ${res.status}`);
  }

  const result = await res.json();
  console.log("[Email-Server] Subscription reminder sent! ID:", result.id);
  return result;
}

export async function sendSubscriptionExpiredEmail(data: {
  to: string;
  userName: string;
  planName: string;
  graceDays: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:24px 16px;">
            <table width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
              <tr>
                <td style="padding:28px 24px;border-bottom:1px solid #e2e8f0;background:#0f172a;text-align:center;">
                  <h1 style="margin:0;font-size:22px;font-weight:700;color:white;letter-spacing:-0.02em;">⚠️ Plan Expired</h1>
                  <p style="margin:8px 0 0 0;font-size:13px;color:#94a3b8;">PulseVault</p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 24px;">
                  <p style="color:#334155;font-size:16px;margin:0 0 6px 0;">Hi ${data.userName},</p>
                  <p style="color:#64748b;font-size:14px;margin:0 0 24px 0;line-height:1.5;">
                    Your <strong>${data.planName}</strong> plan has expired. You now have a <strong>${data.graceDays}-day grace period</strong> to renew before your account is automatically downgraded to Free.
                  </p>
                  <div style="background:#fef2f2;padding:18px;border-radius:10px;border-left:4px solid #ef4444;margin:0 0 24px 0;">
                    <p style="font-size:14px;color:#475569;margin:0;line-height:1.5;">
                      During the grace period, all your data is preserved and your features remain active. After ${data.graceDays} days, you will be downgraded to Free with limited features.
                    </p>
                  </div>
                  <div style="text-align:center;margin-top:24px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://pulsevault.website"}/dashboard/billing" style="display:inline-block;padding:14px 28px;background:#2563eb;color:white;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:-0.01em;">Renew Now</a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:18px;border-top:1px solid #e2e8f0;text-align:center;background:#f8fafc;">
                  <p style="font-size:12px;color:#94a3b8;margin:0;">PulseVault · Subscription Management</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `PulseVault Billing <${fromEmail}>`,
      to: data.to,
      subject: `⚠️ Your ${data.planName} plan has expired — ${data.graceDays} days to renew`,
      html,
    }),
  });

  if (!res.ok) {
    const errData = await res
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(errData.message || `Resend API error: ${res.status}`);
  }

  const result = await res.json();
  console.log("[Email-Server] Expiry email sent! ID:", result.id);
  return result;
}

export async function sendGracePeriodEmail(data: {
  to: string;
  userName: string;
  planName: string;
  graceDaysLeft: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:24px 16px;">
            <table width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
              <tr>
                <td style="padding:28px 24px;border-bottom:1px solid #e2e8f0;background:#0f172a;text-align:center;">
                  <h1 style="margin:0;font-size:22px;font-weight:700;color:white;letter-spacing:-0.02em;">⏳ Grace Period Active</h1>
                  <p style="margin:8px 0 0 0;font-size:13px;color:#94a3b8;">PulseVault</p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 24px;">
                  <p style="color:#334155;font-size:16px;margin:0 0 6px 0;">Hi ${data.userName},</p>
                  <p style="color:#64748b;font-size:14px;margin:0 0 24px 0;line-height:1.5;">
                    Your <strong>${data.planName}</strong> plan is in grace period. You have <strong>${data.graceDaysLeft} day${data.graceDaysLeft !== 1 ? "s" : ""}</strong> left to renew before automatic downgrade to Free.
                  </p>
                  <div style="background:#fffbeb;padding:18px;border-radius:10px;border-left:4px solid #f59e0b;margin:0 0 24px 0;">
                    <p style="font-size:14px;color:#475569;margin:0;line-height:1.5;">
                      All your websites, backups, and data are safe. Renew now to restore full access instantly.
                    </p>
                  </div>
                  <div style="text-align:center;margin-top:24px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://pulsevault.website"}/dashboard/billing" style="display:inline-block;padding:14px 28px;background:#2563eb;color:white;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:-0.01em;">Renew Plan</a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:18px;border-top:1px solid #e2e8f0;text-align:center;background:#f8fafc;">
                  <p style="font-size:12px;color:#94a3b8;margin:0;">PulseVault · Subscription Management</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `PulseVault Billing <${fromEmail}>`,
      to: data.to,
      subject: `⏳ ${data.graceDaysLeft} day${data.graceDaysLeft !== 1 ? "s" : ""} left — renew your ${data.planName} plan`,
      html,
    }),
  });

  if (!res.ok) {
    const errData = await res
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(errData.message || `Resend API error: ${res.status}`);
  }

  const result = await res.json();
  console.log("[Email-Server] Grace period email sent! ID:", result.id);
  return result;
}
