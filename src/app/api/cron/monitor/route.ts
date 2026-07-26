import { NextResponse } from "next/server";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sendAlertEmail } from "@/lib/email-server";

// Health score weights
const WEIGHTS = {
  uptime: 0.3,
  ssl: 0.1,
  dns: 0.1,
  api: 0.2,
  forms: 0.1,
  jsErrors: 0.1,
  plugins: 0.1,
};

interface ScanResult {
  uptime: boolean;
  ssl: boolean;
  dns: boolean;
  api: boolean;
  forms: boolean;
  jsErrors: number;
  plugins: boolean;
  httpErrors: number;
  responseTime: number;
}

async function checkUptime(
  url: string,
): Promise<{ up: boolean; responseTime: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);
    return { up: response.ok, responseTime: Date.now() - start };
  } catch {
    return { up: false, responseTime: 0 };
  }
}

async function checkSSL(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    // Check if HTTPS
    return url.startsWith("https://") && response.ok;
  } catch {
    return false;
  }
}

async function checkDNS(url: string): Promise<boolean> {
  try {
    const hostname = new URL(url).hostname;
    // Simple DNS check by attempting to resolve
    const response = await fetch(
      `https://dns.google/resolve?name=${hostname}&type=A`,
    );
    const data = await response.json();
    return data.Status === 0 && data.Answer && data.Answer.length > 0;
  } catch {
    return false;
  }
}

async function checkAPI(url: string): Promise<boolean> {
  try {
    const commonEndpoints = [
      "/api/health",
      "/health",
      "/api/status",
      "/status",
    ];
    for (const endpoint of commonEndpoints) {
      try {
        const response = await fetch(`${url.replace(/\/$/, "")}${endpoint}`, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) return true;
      } catch {
        continue;
      }
    }
    // If no API endpoint found, assume OK (no API)
    return true;
  } catch {
    return true;
  }
}

async function checkForms(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    // Check for form elements
    return html.includes("<form") || html.includes("</form>");
  } catch {
    return false;
  }
}

async function checkJSErrors(url: string): Promise<number> {
  // In production, this would use a headless browser
  // For now, return 0 (would integrate with Sentry or similar)
  return 0;
}

async function checkPlugins(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    // Check for common plugin indicators
    const pluginIndicators = [
      "wp-content/plugins",
      "wp-includes",
      "jquery",
      "react",
      "vue",
    ];
    return pluginIndicators.some((indicator) =>
      html.toLowerCase().includes(indicator),
    );
  } catch {
    return false;
  }
}

async function checkHTTPErrors(url: string): Promise<number> {
  try {
    const response = await fetch(url);
    return response.ok ? 0 : 1;
  } catch {
    return 1;
  }
}

async function runFullScan(url: string): Promise<ScanResult> {
  const [uptimeResult, ssl, dns, api, forms, jsErrors, plugins, httpErrors] =
    await Promise.all([
      checkUptime(url),
      checkSSL(url),
      checkDNS(url),
      checkAPI(url),
      checkForms(url),
      checkJSErrors(url),
      checkPlugins(url),
      checkHTTPErrors(url),
    ]);

  return {
    uptime: uptimeResult.up,
    ssl,
    dns,
    api,
    forms,
    jsErrors,
    plugins,
    httpErrors,
    responseTime: uptimeResult.responseTime,
  };
}

function calculateHealthScore(result: ScanResult): number {
  let score = 100;

  // Uptime (30%)
  if (!result.uptime) score -= 30;

  // SSL (10%)
  if (!result.ssl) score -= 10;

  // DNS (10%)
  if (!result.dns) score -= 10;

  // API (20%)
  if (!result.api) score -= 20;

  // Forms (10%)
  if (!result.forms) score -= 5; // Partial penalty

  // JS Errors (10%)
  score -= Math.min(result.jsErrors * 2, 10);

  // Plugins (10%)
  if (!result.plugins) score -= 5; // Partial penalty

  // HTTP Errors
  score -= result.httpErrors * 5;

  return Math.max(0, Math.min(100, score));
}

function determineStatus(
  healthScore: number,
  uptime: boolean,
): "healthy" | "warning" | "down" {
  if (!uptime || healthScore < 30) return "down";
  if (healthScore < 70) return "warning";
  return "healthy";
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const websitesSnapshot = await getDocs(collection(db, "websites"));
    const results = [];

    for (const websiteDoc of websitesSnapshot.docs) {
      const website = websiteDoc.data();
      const websiteId = websiteDoc.id;

      try {
        const scanResult = await runFullScan(website.url);
        const healthScore = calculateHealthScore(scanResult);
        const status = determineStatus(healthScore, scanResult.uptime);

        // Save scan
        await addDoc(collection(db, "scans"), {
          websiteId,
          ...scanResult,
          healthScore,
          timestamp: serverTimestamp(),
        });

        // Update website
        await updateDoc(doc(db, "websites", websiteId), {
          healthScore,
          status,
          lastCheck: new Date().toISOString(),
          responseTime: scanResult.responseTime,
        });

        // Create alert if critical
        if (healthScore < 70) {
          await addDoc(collection(db, "alerts"), {
            websiteId,
            userId: website.userId,
            type: healthScore < 30 ? "down" : "degraded",
            severity: healthScore < 30 ? "critical" : "warning",
            message: `${website.url} is ${status}. Health score: ${healthScore}`,
            createdAt: serverTimestamp(),
            resolved: false,
          });

          // ─── SEND EMAIL ALERT ───
          try {
            // Get user data
            const userDocRef = doc(db, "users", website.userId);
            const userSnap = await getDoc(userDocRef);
            const userData = userSnap.exists() ? userSnap.data() : null;
            const userEmail = userData?.email || "";
            const userName = userData?.name || "User";

            // Get user settings
            const settingsSnap = await getDoc(
              doc(db, "users", website.userId, "settings", "preferences"),
            );
            const settingsData = settingsSnap.exists()
              ? settingsSnap.data()
              : null;
            const emailEnabled = settingsData?.notifications?.email !== false;

            // Get user plan
            const planSnap = await getDoc(
              doc(db, "users", website.userId, "billing", "plan"),
            );
            const planId = planSnap.exists()
              ? planSnap.data()?.planId || "free"
              : "free";

            // Only send if: has email, email enabled, plan is not free
            if (userEmail && emailEnabled && planId !== "free") {
              await sendAlertEmail({
                to: userEmail,
                userName,
                alertType:
                  healthScore < 30 ? "Website Offline" : "Health Score Drop",
                severity: healthScore < 30 ? "critical" : "warning",
                message: `${website.url} is ${status}. Health score: ${healthScore}`,
                target: website.url,
                timestamp: new Date().toLocaleString("en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }),
                healthScore,
                httpStatus: scanResult.uptime ? 200 : 0,
                sslStatus: scanResult.ssl ? "valid" : "expired",
              });

              console.log(
                `[Cron] Alert email sent to ${userEmail} for ${website.url}`,
              );
            } else {
              console.log(
                `[Cron] Email skipped for ${website.userId}: email=${!!userEmail}, enabled=${emailEnabled}, plan=${planId}`,
              );
            }
          } catch (emailErr: any) {
            console.error(
              `[Cron] Failed to send email for ${website.url}:`,
              emailErr.message,
            );
            // Don't fail the scan if email fails
          }
        }

        results.push({ websiteId, status, healthScore });
      } catch (error) {
        console.error(`Failed to scan ${website.url}:`, error);
        results.push({ websiteId, error: "Scan failed" });
      }
    }

    return NextResponse.json({
      success: true,
      scanned: results.length,
      results,
    });
  } catch (error) {
    console.error("Monitor cron failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
