export interface AlertEmailData {
  to: string;
  userName: string;
  alertType: string;
  severity: "critical" | "warning" | "info";
  message: string;
  target: string;
  timestamp: string;
  // All monitoring fields are now optional
  healthScore?: number;
  brokenLinks?: number;
  totalLinks?: number;
  brokenPlugins?: number;
  totalPlugins?: number;
  jsErrors?: number;
  formsWorking?: boolean;
  totalForms?: number;
  mixedContent?: boolean;
  loadTime?: number;
  pageSize?: number;
  httpStatus?: number;
  sslStatus?: "valid" | "expiring" | "expired";
  sslDaysLeft?: number;
}

export interface ReportEmailData {
  to: string;
  userName: string;
  period: "daily" | "weekly";
  reportDate: string;
  totalWebsites: number;
  healthySites: number;
  offlineSites: number;
  openAlerts: number;
  resolvedAlerts: number;
  avgHealthScore: number;
  sslExpiringSoon: number;
  sslExpired: number;
  topIssues: string[];
}

function getSeverityColor(severity: string) {
  if (severity === "critical") return "#ef4444";
  if (severity === "warning") return "#f59e0b";
  return "#2563eb";
}

function getSeverityBg(severity: string) {
  if (severity === "critical") return "#fef2f2";
  if (severity === "warning") return "#fffbeb";
  return "#eff6ff";
}

export async function sendAlertEmail(data: AlertEmailData) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[Email-Server] RESEND_API_KEY not configured!");
    throw new Error("RESEND_API_KEY not set");
  }

  // Defaults for optional fields
  const healthScore = data.healthScore ?? 0;
  const brokenLinks = data.brokenLinks ?? 0;
  const jsErrors = data.jsErrors ?? 0;
  const httpStatus = data.httpStatus ?? 0;
  const sslStatus = data.sslStatus ?? "valid";
  const sslDaysLeft = data.sslDaysLeft ?? 0;

  const severityColor = getSeverityColor(data.severity);
  const severityBg = getSeverityBg(data.severity);

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="padding:24px;border-bottom:1px solid #e2e8f0;background:#0f172a;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:white;">🚨 PulseVault Alert</h1>
              <p style="margin:8px 0 0 0;font-size:14px;color:#94a3b8;">${data.timestamp}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="color:#334155;font-size:16px;margin:0 0 8px 0;">Hi ${data.userName},</p>
              <p style="color:#64748b;font-size:14px;margin:0 0 20px 0;">We detected an issue with your monitored site:</p>
              
              <div style="background:${severityBg};padding:16px;border-radius:8px;border-left:4px solid ${severityColor};margin:16px 0;">
                <p style="font-size:14px;font-weight:600;color:${severityColor};margin:0 0 4px 0;text-transform:uppercase;letter-spacing:0.05em;">${data.alertType}</p>
                <p style="font-size:16px;font-weight:600;color:#0f172a;margin:0 0 4px 0;">${data.target}</p>
                <p style="font-size:13px;color:#475569;margin:0;">${data.message}</p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
                <tr>
                  <td width="50%" style="padding:8px;">
                    <div style="background:#f8fafc;padding:16px;border-radius:8px;text-align:center;border:1px solid #e2e8f0;">
                      <p style="font-size:24px;font-weight:700;color:#0f172a;margin:0;">${healthScore}%</p>
                      <p style="font-size:12px;color:#64748b;margin:4px 0 0 0;">Health Score</p>
                    </div>
                  </td>
                  <td width="50%" style="padding:8px;">
                    <div style="background:#f8fafc;padding:16px;border-radius:8px;text-align:center;border:1px solid #e2e8f0;">
                      <p style="font-size:24px;font-weight:700;color:#0f172a;margin:0;">${httpStatus || "—"}</p>
                      <p style="font-size:12px;color:#64748b;margin:4px 0 0 0;">HTTP Status</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding:8px;">
                    <div style="background:#f8fafc;padding:16px;border-radius:8px;text-align:center;border:1px solid #e2e8f0;">
                      <p style="font-size:24px;font-weight:700;color:#0f172a;margin:0;">${brokenLinks}</p>
                      <p style="font-size:12px;color:#64748b;margin:4px 0 0 0;">Broken Links</p>
                    </div>
                  </td>
                  <td width="50%" style="padding:8px;">
                    <div style="background:#f8fafc;padding:16px;border-radius:8px;text-align:center;border:1px solid #e2e8f0;">
                      <p style="font-size:24px;font-weight:700;color:#0f172a;margin:0;">${jsErrors}</p>
                      <p style="font-size:12px;color:#64748b;margin:4px 0 0 0;">JS Errors</p>
                    </div>
                  </td>
                </tr>
              </table>

              <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;border:1px solid #e2e8f0;">
                <p style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 8px 0;">SSL Status</p>
                <p style="font-size:13px;color:#64748b;margin:0;">
                  ${
                    sslStatus === "expired"
                      ? `<span style="color:#ef4444;">Expired (${Math.abs(sslDaysLeft)} days ago)</span>`
                      : sslStatus === "expiring"
                        ? `<span style="color:#f59e0b;">Expiring in ${sslDaysLeft} days</span>`
                        : `<span style="color:#22c55e;">Valid</span>`
                  }
                </p>
              </div>

              <div style="text-align:center;margin-top:24px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://pulsevault.website"}/dashboard" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">View Dashboard</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px;border-top:1px solid #e2e8f0;text-align:center;background:#f8fafc;">
              <p style="font-size:12px;color:#94a3b8;margin:0;">PulseVault Monitoring · Automated Alert</p>
            </td>
          </tr>
        </table>
      </td></tr></table>
    </body>
    </html>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PulseVault Alerts <alerts@pulsevault.website>",
        to: data.to,
        subject: `🚨 ${data.alertType} — ${data.target}`,
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
    console.log("[Email-Server] Alert email sent! ID:", result.id);
    return result;
  } catch (err: any) {
    console.error("[Email-Server] Failed to send alert:", err.message);
    throw err;
  }
}

export async function sendReportEmail(data: ReportEmailData) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[Email-Server] RESEND_API_KEY not configured!");
    throw new Error("RESEND_API_KEY not set");
  }

  const issuesList =
    data.topIssues.length > 0
      ? data.topIssues
          .map((i) => `<li style="margin-bottom:6px;color:#475569;">${i}</li>`)
          .join("")
      : "<li style='color:#64748b;'>No critical issues detected</li>";

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="padding:24px;border-bottom:1px solid #e2e8f0;background:#0f172a;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:white;">PulseVault ${data.period === "daily" ? "Daily" : "Weekly"} Report</h1>
              <p style="margin:8px 0 0 0;font-size:14px;color:#94a3b8;">${data.reportDate}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="color:#334155;font-size:16px;margin:0 0 8px 0;">Hi ${data.userName},</p>
              <p style="color:#64748b;font-size:14px;margin:0 0 20px 0;">Here's your ${data.period} monitoring summary:</p>
              
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                <tr>
                  <td width="50%" style="padding:8px;">
                    <div style="background:#f0fdf4;padding:16px;border-radius:8px;text-align:center;">
                      <p style="font-size:24px;font-weight:700;color:#15803d;margin:0;">${data.healthySites}</p>
                      <p style="font-size:12px;color:#64748b;margin:4px 0 0 0;">Healthy Sites</p>
                    </div>
                  </td>
                  <td width="50%" style="padding:8px;">
                    <div style="background:#fef2f2;padding:16px;border-radius:8px;text-align:center;">
                      <p style="font-size:24px;font-weight:700;color:#ef4444;margin:0;">${data.offlineSites}</p>
                      <p style="font-size:12px;color:#64748b;margin:4px 0 0 0;">Offline</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding:8px;">
                    <div style="background:#fffbeb;padding:16px;border-radius:8px;text-align:center;">
                      <p style="font-size:24px;font-weight:700;color:#f59e0b;margin:0;">${data.openAlerts}</p>
                      <p style="font-size:12px;color:#64748b;margin:4px 0 0 0;">Open Alerts</p>
                    </div>
                  </td>
                  <td width="50%" style="padding:8px;">
                    <div style="background:#eff6ff;padding:16px;border-radius:8px;text-align:center;">
                      <p style="font-size:24px;font-weight:700;color:#2563eb;margin:0;">${data.avgHealthScore}%</p>
                      <p style="font-size:12px;color:#64748b;margin:4px 0 0 0;">Avg Health</p>
                    </div>
                  </td>
                </tr>
              </table>

              <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;border:1px solid #e2e8f0;">
                <p style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 8px 0;">SSL Status</p>
                <p style="font-size:13px;color:#64748b;margin:0;">
                  ${data.sslExpired > 0 ? `<span style="color:#ef4444;">${data.sslExpired} expired</span> · ` : ""}
                  ${data.sslExpiringSoon > 0 ? `<span style="color:#f59e0b;">${data.sslExpiringSoon} expiring soon</span>` : "All certificates valid"}
                </p>
              </div>

              <div style="margin:16px 0;">
                <p style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 8px 0;">Top Issues</p>
                <ul style="font-size:13px;color:#64748b;margin:0;padding-left:18px;">${issuesList}</ul>
              </div>

              <div style="text-align:center;margin-top:24px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://pulsevault.website"}/dashboard" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">View Dashboard</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px;border-top:1px solid #e2e8f0;text-align:center;background:#f8fafc;">
              <p style="font-size:12px;color:#94a3b8;margin:0;">PulseVault Monitoring · Automated Report</p>
            </td>
          </tr>
        </table>
      </td></tr></table>
    </body>
    </html>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PulseVault Reports <reports@pulsevault.website>",
        to: data.to,
        subject: `PulseVault ${data.period === "daily" ? "Daily" : "Weekly"} Report — ${data.reportDate}`,
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
    console.log("[Email-Server] Report email sent! ID:", result.id);
    return result;
  } catch (err: any) {
    console.error("[Email-Server] Failed to send report:", err.message);
    throw err;
  }
}
