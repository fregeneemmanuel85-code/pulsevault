export interface AlertEmailData {
  to: string;
  userName: string;
  alertType: string;
  severity: "critical" | "warning" | "info";
  message: string;
  target: string;
  timestamp: string;
  healthScore?: number;
  httpStatus?: number;
  sslStatus?: "valid" | "expiring" | "expired";
  sslDaysLeft?: number;
  loadTime?: number;
}

export interface ReportEmailData {
  to: string;
  userName: string;
  period: "daily" | "weekly";
  reportDate: string;
  totalWebsites: number;
  avgHealthScore: number;
  healthySites: number;
  warningSites: number;
  criticalSites: number;
  offlineSites: number;
  openIncidents: number;
  resolvedIncidents: number;
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

  const healthScore = data.healthScore ?? 0;
  const httpStatus = data.httpStatus ?? 0;
  const sslStatus = data.sslStatus ?? "valid";
  const sslDaysLeft = data.sslDaysLeft ?? 0;
  const loadTime = data.loadTime ?? 0;

  const severityColor = getSeverityColor(data.severity);
  const severityBg = getSeverityBg(data.severity);

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
              
              <!-- Header -->
              <tr>
                <td style="padding:28px 24px;border-bottom:1px solid #e2e8f0;background:#0f172a;text-align:center;">
                  <h1 style="margin:0;font-size:22px;font-weight:700;color:white;letter-spacing:-0.02em;">🚨 PulseVault Alert</h1>
                  <p style="margin:8px 0 0 0;font-size:13px;color:#94a3b8;">${data.timestamp}</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:28px 24px;">
                  <p style="color:#334155;font-size:16px;margin:0 0 6px 0;">Hi ${data.userName},</p>
                  <p style="color:#64748b;font-size:14px;margin:0 0 24px 0;line-height:1.5;">We detected an issue with your monitored site:</p>
                  
                  <!-- Alert Card -->
                  <div style="background:${severityBg};padding:18px;border-radius:10px;border-left:4px solid ${severityColor};margin:0 0 24px 0;">
                    <p style="font-size:12px;font-weight:700;color:${severityColor};margin:0 0 6px 0;text-transform:uppercase;letter-spacing:0.08em;">${data.alertType}</p>
                    <p style="font-size:17px;font-weight:700;color:#0f172a;margin:0 0 6px 0;word-break:break-all;">${data.target}</p>
                    <p style="font-size:14px;color:#475569;margin:0;line-height:1.5;">${data.message}</p>
                  </div>

                  <!-- Health Score Only -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">
                    <tr>
                      <td width="50%" style="padding:6px;">
                        <div style="background:#f8fafc;padding:20px;border-radius:8px;text-align:center;border:1px solid #e2e8f0;">
                          <p style="font-size:32px;font-weight:800;color:${healthScore < 50 ? "#ef4444" : healthScore < 80 ? "#f59e0b" : "#22c55e"};margin:0;">${healthScore}%</p>
                          <p style="font-size:12px;color:#64748b;margin:6px 0 0 0;font-weight:500;">Health Score</p>
                        </div>
                      </td>
                      <td width="50%" style="padding:6px;">
                        <div style="background:#f8fafc;padding:20px;border-radius:8px;text-align:center;border:1px solid #e2e8f0;">
                          <p style="font-size:32px;font-weight:800;color:#0f172a;margin:0;">${httpStatus || "—"}</p>
                          <p style="font-size:12px;color:#64748b;margin:6px 0 0 0;font-weight:500;">HTTP Status</p>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Quick Stats -->
                  <div style="display:flex;gap:12px;flex-wrap:wrap;margin:0 0 16px 0;">
                    <div style="flex:1;min-width:140px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;text-align:center;">
                      <p style="font-size:20px;font-weight:700;color:${loadTime > 3000 ? "#ef4444" : "#0f172a"};margin:0;">${loadTime}ms</p>
                      <p style="font-size:11px;color:#64748b;margin:4px 0 0 0;">Load Time</p>
                    </div>
                    <div style="flex:1;min-width:140px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;text-align:center;">
                      <p style="font-size:20px;font-weight:700;color:${sslStatus === "expired" ? "#ef4444" : sslStatus === "expiring" ? "#f59e0b" : "#22c55e"};margin:0;">${sslStatus === "expired" ? "Expired" : sslStatus === "expiring" ? "Expiring" : "Valid"}</p>
                      <p style="font-size:11px;color:#64748b;margin:4px 0 0 0;">SSL (${sslDaysLeft}d)</p>
                    </div>
                  </div>

                  <!-- CTA -->
                  <div style="text-align:center;margin-top:24px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://pulsevault.website"}/dashboard" style="display:inline-block;padding:14px 28px;background:#2563eb;color:white;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:-0.01em;">View Full Dashboard</a>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:18px;border-top:1px solid #e2e8f0;text-align:center;background:#f8fafc;">
                  <p style="font-size:12px;color:#94a3b8;margin:0;">PulseVault Monitoring · Automated Alert</p>
                  <p style="font-size:11px;color:#cbd5e1;margin:4px 0 0 0;">You received this because email alerts are enabled in your settings.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
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
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:24px 16px;">
            <table width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:white;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
              
              <!-- Header -->
              <tr>
                <td style="padding:28px 24px;border-bottom:1px solid #e2e8f0;background:#0f172a;text-align:center;">
                  <h1 style="margin:0;font-size:22px;font-weight:700;color:white;letter-spacing:-0.02em;">PulseVault ${data.period === "daily" ? "Daily" : "Weekly"} Report</h1>
                  <p style="margin:8px 0 0 0;font-size:13px;color:#94a3b8;">${data.reportDate}</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:28px 24px;">
                  <p style="color:#334155;font-size:16px;margin:0 0 6px 0;">Hi ${data.userName},</p>
                  <p style="color:#64748b;font-size:14px;margin:0 0 24px 0;line-height:1.5;">Here's your ${data.period} account summary:</p>
                  
                  <!-- Total Sites & Avg Health -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;">
                    <tr>
                      <td width="50%" style="padding:6px;">
                        <div style="background:#f8fafc;padding:20px;border-radius:8px;text-align:center;border:1px solid #e2e8f0;">
                          <p style="font-size:32px;font-weight:800;color:#0f172a;margin:0;">${data.totalWebsites}</p>
                          <p style="font-size:12px;color:#64748b;margin:6px 0 0 0;font-weight:500;">Total Monitored Sites</p>
                        </div>
                      </td>
                      <td width="50%" style="padding:6px;">
                        <div style="background:#f8fafc;padding:20px;border-radius:8px;text-align:center;border:1px solid #e2e8f0;">
                          <p style="font-size:32px;font-weight:800;color:${data.avgHealthScore < 50 ? "#ef4444" : data.avgHealthScore < 80 ? "#f59e0b" : "#22c55e"};margin:0;">${data.avgHealthScore}%</p>
                          <p style="font-size:12px;color:#64748b;margin:6px 0 0 0;font-weight:500;">Overall Health</p>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Status Breakdown -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;">
                    <tr>
                      <td width="25%" style="padding:6px;">
                        <div style="background:#f0fdf4;padding:16px;border-radius:8px;text-align:center;border:1px solid #bbf7d0;">
                          <p style="font-size:24px;font-weight:800;color:#15803d;margin:0;">${data.healthySites}</p>
                          <p style="font-size:11px;color:#64748b;margin:6px 0 0 0;font-weight:500;">Healthy</p>
                        </div>
                      </td>
                      <td width="25%" style="padding:6px;">
                        <div style="background:#fffbeb;padding:16px;border-radius:8px;text-align:center;border:1px solid #fde68a;">
                          <p style="font-size:24px;font-weight:800;color:#f59e0b;margin:0;">${data.warningSites}</p>
                          <p style="font-size:11px;color:#64748b;margin:6px 0 0 0;font-weight:500;">Warning</p>
                        </div>
                      </td>
                      <td width="25%" style="padding:6px;">
                        <div style="background:#fef2f2;padding:16px;border-radius:8px;text-align:center;border:1px solid #fecaca;">
                          <p style="font-size:24px;font-weight:800;color:#ef4444;margin:0;">${data.criticalSites}</p>
                          <p style="font-size:11px;color:#64748b;margin:6px 0 0 0;font-weight:500;">Critical</p>
                        </div>
                      </td>
                      <td width="25%" style="padding:6px;">
                        <div style="background:#f1f5f9;padding:16px;border-radius:8px;text-align:center;border:1px solid #e2e8f0;">
                          <p style="font-size:24px;font-weight:800;color:#64748b;margin:0;">${data.offlineSites}</p>
                          <p style="font-size:11px;color:#64748b;margin:6px 0 0 0;font-weight:500;">Offline</p>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Incidents -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;">
                    <tr>
                      <td width="50%" style="padding:6px;">
                        <div style="background:#fffbeb;padding:16px;border-radius:8px;text-align:center;border:1px solid #fde68a;">
                          <p style="font-size:24px;font-weight:800;color:#f59e0b;margin:0;">${data.openIncidents}</p>
                          <p style="font-size:11px;color:#64748b;margin:6px 0 0 0;font-weight:500;">Open Incidents</p>
                        </div>
                      </td>
                      <td width="50%" style="padding:6px;">
                        <div style="background:#f0fdf4;padding:16px;border-radius:8px;text-align:center;border:1px solid #bbf7d0;">
                          <p style="font-size:24px;font-weight:800;color:#15803d;margin:0;">${data.resolvedIncidents}</p>
                          <p style="font-size:11px;color:#64748b;margin:6px 0 0 0;font-weight:500;">Resolved</p>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- SSL Status -->
                  <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:12px 0;border:1px solid #e2e8f0;">
                    <p style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 8px 0;">🔒 SSL Overview</p>
                    <p style="font-size:14px;color:#475569;margin:0;">
                      ${data.sslExpired > 0 ? `<span style="color:#ef4444;font-weight:600;">${data.sslExpired} expired</span> · ` : ""}
                      ${data.sslExpiringSoon > 0 ? `<span style="color:#f59e0b;font-weight:600;">${data.sslExpiringSoon} expiring soon</span>` : "<span style='color:#22c55e;'>All certificates valid</span>"}
                    </p>
                  </div>

                  <!-- Top Issues -->
                  <div style="margin:16px 0;">
                    <p style="font-size:14px;font-weight:700;color:#0f172a;margin:0 0 10px 0;">Top Issues</p>
                    <ul style="font-size:13px;color:#475569;margin:0;padding-left:20px;line-height:1.6;">${issuesList}</ul>
                  </div>

                  <!-- CTA -->
                  <div style="text-align:center;margin-top:28px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://pulsevault.website"}/dashboard" style="display:inline-block;padding:14px 28px;background:#2563eb;color:white;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:-0.01em;">View Dashboard</a>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:18px;border-top:1px solid #e2e8f0;text-align:center;background:#f8fafc;">
                  <p style="font-size:12px;color:#94a3b8;margin:0;">PulseVault Monitoring · Automated Report</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
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
