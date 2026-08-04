import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getFirestore } from "firebase-admin/firestore";
import { lookup } from "dns/promises";
import "@/lib/firebase-admin";
import { sendAlertEmail } from "@/lib/email-server";
import { checkSSLCertificate } from "@/lib/ssl-checker";
import { getPlanConfig, canSendEmailAlerts } from "@/lib/plan-guard";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

function getSecret() {
  return new TextEncoder().encode(JWT_SECRET);
}

/* ── Browser headers to avoid bot blocks ── */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate, br",
  DNT: "1",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
};

interface ScanResult {
  url: string;
  timestamp: string;
  status: "healthy" | "warning" | "critical" | "offline";
  healthScore: number;
  httpStatus: number;
  responseTime: number;
  ssl: { valid: boolean; expiry: string | null; daysLeft: number };
  dns: { resolved: boolean; ip?: string };
  links: {
    total: number;
    broken: number;
    protected: number;
    list: { url: string; status: number; ok: boolean; protected?: boolean }[];
  };
  plugins: { detected: string[]; broken: string[] };
  forms: {
    total: number;
    working: boolean;
    list: { selector: string; hasAction: boolean; hasMethod: boolean }[];
  };
  jsErrors: number;
  consoleErrors: string[];
  apiChecks: { endpoint: string; status: number; ok: boolean }[];
  performance: { loadTime: number; pageSize: number; score: number };
  mixedContent: boolean;
  securityHeaders: {
    hsts: boolean;
    xFrame: boolean;
    xContentType: boolean;
    csp: boolean;
  };
  redirectChain: string[];
  techStack: {
    detected: { name: string; confidence: string; category: string }[];
    primary?: string;
  };
  runtimeErrors: Array<{ type: string; message: string; location?: string }>;
  spaCrashes: boolean;
  headlessAvailable: boolean;
}

const isLocalDev = process.env.NODE_ENV === "development";

const MAX_LINKS_TO_CHECK = isLocalDev ? 10 : 30;
const LINK_TIMEOUT_MS = isLocalDev ? 5000 : 3000;
const IMAGE_TIMEOUT_MS = isLocalDev ? 5000 : 3000;
const MAX_SCAN_TIME_MS = isLocalDev ? 60000 : 15000;

function getDefaultResult(url: string): ScanResult {
  return {
    url,
    timestamp: new Date().toISOString(),
    status: "offline",
    healthScore: 0,
    httpStatus: 0,
    responseTime: 0,
    ssl: { valid: false, expiry: null, daysLeft: 0 },
    dns: { resolved: false },
    links: { total: 0, broken: 0, protected: 0, list: [] },
    plugins: { detected: [], broken: [] },
    forms: { total: 0, working: true, list: [] },
    jsErrors: 0,
    consoleErrors: [],
    apiChecks: [],
    performance: { loadTime: 0, pageSize: 0, score: 0 },
    mixedContent: false,
    securityHeaders: {
      hsts: false,
      xFrame: false,
      xContentType: false,
      csp: false,
    },
    redirectChain: [],
    techStack: { detected: [] },
    runtimeErrors: [],
    spaCrashes: false,
    headlessAvailable: false,
  };
}

/* ── Retry wrapper for fetch ── */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
): Promise<Response> {
  let lastErr: Error | undefined;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fetch(url, options);
    } catch (err: any) {
      lastErr = err;
      if (i === maxRetries) break;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr ?? new Error(`Fetch failed after ${maxRetries} retries`);
}

export async function POST(req: NextRequest) {
  const scanStartTime = Date.now();
  let targetUrl = "";
  let targetWebsiteId: string | undefined;
  let targetUserId = "";

  const scanPromise = (async () => {
    try {
      const body = await req.json();
      const { url, websiteId, userId: bodyUserId, techOnly } = body;
      const isTechOnly = techOnly === true;
      targetUrl = url || "";
      targetWebsiteId = websiteId;
      targetUserId = bodyUserId || "";

      const cronSecret = req.headers.get("x-cron-secret");
      const isCron = cronSecret === process.env.CRON_SECRET;

      let userId: string;
      let payload: any;

      if (isCron) {
        if (!targetUserId) {
          return NextResponse.json(
            { error: "userId required for cron" },
            { status: 400 },
          );
        }
        userId = targetUserId;
        payload = { uid: userId, email: "" };
      } else {
        const token = req.cookies.get("token")?.value;
        if (!token) {
          return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 },
          );
        }

        try {
          const verified = await jwtVerify(token, getSecret());
          payload = verified.payload;
          userId = payload.uid as string;
        } catch {
          return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
      }

      console.log(
        `[Scan] Raw request: url=${targetUrl}, websiteId=${targetWebsiteId || "NOT_PROVIDED"}, techOnly=${isTechOnly}`,
      );

      const db = getFirestore();
      const planSnap = await db
        .collection("users")
        .doc(userId)
        .collection("billing")
        .doc("plan")
        .get();
      const planId = planSnap.exists
        ? planSnap.data()?.planId || "free"
        : "free";
      const planConfig = getPlanConfig(planId);
      console.log(
        `[Scan] User plan: ${planConfig.planName} (${planId}), checkInterval: ${planConfig.checkInterval}min`,
      );

      let effectiveWebsiteId = targetWebsiteId;
      if (!effectiveWebsiteId) {
        try {
          const websitesSnap = await db
            .collection("users")
            .doc(userId)
            .collection("websites")
            .where("url", "==", targetUrl)
            .limit(1)
            .get();
          if (!websitesSnap.empty) {
            effectiveWebsiteId = websitesSnap.docs[0].id;
            console.log(`[Scan] Found websiteId by URL: ${effectiveWebsiteId}`);
          } else {
            console.log(`[Scan] No website found with URL: ${targetUrl}`);
          }
        } catch (e: any) {
          console.log(`[Scan] Error finding website by URL: ${e.message}`);
        }
      }

      if (!targetUrl) {
        return NextResponse.json({ error: "URL required" }, { status: 400 });
      }

      const result: ScanResult = {
        url: targetUrl,
        timestamp: new Date().toISOString(),
        status: "healthy",
        healthScore: 100,
        httpStatus: 0,
        responseTime: 0,
        ssl: { valid: true, expiry: null, daysLeft: 0 },
        dns: { resolved: false },
        links: { total: 0, broken: 0, protected: 0, list: [] },
        plugins: { detected: [], broken: [] },
        forms: { total: 0, working: true, list: [] },
        jsErrors: 0,
        consoleErrors: [],
        apiChecks: [],
        performance: { loadTime: 0, pageSize: 0, score: 100 },
        mixedContent: false,
        securityHeaders: {
          hsts: false,
          xFrame: false,
          xContentType: false,
          csp: false,
        },
        redirectChain: [],
        techStack: { detected: [] },
        runtimeErrors: [],
        spaCrashes: false,
        headlessAvailable: false,
      };

      /* ── SSL Check (skip for plain HTTP) ── */
      if (targetUrl.startsWith("https://")) {
        try {
          const hostname = new URL(targetUrl).hostname;
          const sslCert = await checkSSLCertificate(hostname);

          result.ssl = {
            valid: sslCert.valid && sslCert.daysLeft >= 0,
            expiry: sslCert.expiryDate,
            daysLeft: sslCert.daysLeft,
          };

          console.log(
            `[Scan] SSL pre-check for ${hostname}: valid=${result.ssl.valid}, daysLeft=${result.ssl.daysLeft}, expiry=${result.ssl.expiry}`,
          );
        } catch (sslErr: any) {
          console.error(
            `[Scan] SSL pre-check failed for ${targetUrl}:`,
            sslErr.message,
          );
          result.ssl = { valid: false, expiry: null, daysLeft: 0 };
        }
      } else {
        console.log(
          `[Scan] Skipping SSL check for non-HTTPS URL: ${targetUrl}`,
        );
        result.ssl = { valid: false, expiry: null, daysLeft: 0 };
      }

      /* ── DNS Check ── */
      try {
        const hostname = new URL(targetUrl).hostname;
        const dnsResult = await lookup(hostname);
        result.dns.ip = dnsResult.address;
        result.dns.resolved = true;
        console.log(`[Scan] DNS resolved: ${hostname} -> ${dnsResult.address}`);
      } catch (dnsErr: any) {
        console.log(`[Scan] DNS lookup failed: ${dnsErr.message}`);
        result.dns.ip = undefined;
      }

      /* ── Fetch with manual redirect tracking + retry ── */
      const startTime = Date.now();
      const redirectChain: string[] = [];
      let finalResponse: Response | undefined;
      let currentFetchUrl = targetUrl;
      let redirectCount = 0;
      const maxRedirects = 10;

      while (redirectCount <= maxRedirects) {
        const ctrl = new AbortController();
        const fetchTimeout = setTimeout(
          () => ctrl.abort(),
          isLocalDev ? 30000 : 10000,
        );

        try {
          const res = await fetchWithRetry(
            currentFetchUrl,
            {
              method: "GET",
              signal: ctrl.signal,
              redirect: "manual",
              headers: BROWSER_HEADERS,
            },
            1,
          );
          clearTimeout(fetchTimeout);

          if (res.status >= 300 && res.status < 400) {
            const location = res.headers.get("location");
            if (location) {
              currentFetchUrl = new URL(location, currentFetchUrl).href;
              redirectChain.push(currentFetchUrl);
              redirectCount++;
              continue;
            } else {
              finalResponse = res;
              break;
            }
          } else {
            finalResponse = res;
            break;
          }
        } catch (err: any) {
          clearTimeout(fetchTimeout);
          throw err;
        }
      }

      if (!finalResponse) {
        throw new Error("Too many redirects");
      }

      const response = finalResponse;
      result.redirectChain = redirectChain;
      result.httpStatus = response.status;
      result.responseTime = Date.now() - startTime;
      result.dns.resolved = true;

      console.log(
        `[Scan] Fetch result: status=${response.status}, content-type=${response.headers.get("content-type")}, finalUrl=${currentFetchUrl}`,
      );

      if (response.status >= 400) {
        result.consoleErrors.push(`HTTP ${response.status} error returned`);
      }

      const headers = response.headers;
      result.securityHeaders.hsts = !!headers.get("strict-transport-security");
      result.securityHeaders.xFrame = !!headers.get("x-frame-options");
      result.securityHeaders.xContentType = !!headers.get(
        "x-content-type-options",
      );
      result.securityHeaders.csp = !!headers.get("content-security-policy");

      const html = await response.text();

      result.techStack = detectTechStack(html, headers);
      result.spaCrashes = detectSPACrashes(html, result.techStack);
      result.runtimeErrors = detectRuntimeErrors(html);

      /* ─── TECH-ONLY FAST PATH ─── */
      if (isTechOnly) {
        console.log(
          `[Scan] Tech-only mode: detected ${result.techStack.detected.length} technologies`,
        );

        if (effectiveWebsiteId) {
          const websiteRef = db
            .collection("users")
            .doc(userId)
            .collection("websites")
            .doc(effectiveWebsiteId);

          const existingSnap = await websiteRef.get();
          const existing = existingSnap.exists ? existingSnap.data() : null;

          const finalTechStack =
            result.techStack.detected.length > 0
              ? result.techStack
              : existing?.techStack || { detected: [] };

          await websiteRef.update({
            techStack: finalTechStack,
            spaCrashes: result.spaCrashes,
            runtimeErrors: result.runtimeErrors,
            "scanResults.techStack": finalTechStack,
            "scanResults.spaCrashes": result.spaCrashes,
            "scanResults.runtimeErrors": result.runtimeErrors,
            updatedAt: new Date().toISOString(),
          });
          console.log(`[Scan] Tech-only scan saved to Firestore`);
        }

        return NextResponse.json({
          ...result,
          techOnly: true,
          message: `Detected ${result.techStack.detected.length} technologies`,
        });
      }

      result.apiChecks = await checkAPIs(html, currentFetchUrl, scanStartTime);
      result.headlessAvailable = false;

      const parseResult = parseHTML(html, currentFetchUrl, result);

      if (result.links.list.length > MAX_LINKS_TO_CHECK) {
        console.log(
          `[PulseVault] Limiting link check from ${result.links.list.length} to ${MAX_LINKS_TO_CHECK} links`,
        );
        result.links.list = result.links.list.slice(0, MAX_LINKS_TO_CHECK);
        result.links.total = MAX_LINKS_TO_CHECK;
      }

      const htmlSize = Buffer.byteLength(html, "utf8");

      const elapsed = Date.now() - scanStartTime;
      let imageSize = 0;
      if (elapsed < 10000 && parseResult.imageUrls.length > 0) {
        imageSize = await estimateImageSizes(parseResult.imageUrls);
      } else {
        console.log(
          `[PulseVault] Skipping image estimation - elapsed=${elapsed}ms, images=${parseResult.imageUrls.length}`,
        );
        const cappedRemaining = Math.min(parseResult.imageUrls.length, 50);
        imageSize = cappedRemaining * 102400;
      }

      await checkLinks(result, scanStartTime);

      await checkPluginAssets(result, currentFetchUrl, scanStartTime);

      result.performance.loadTime = result.responseTime;
      result.performance.pageSize = htmlSize + imageSize;

      const mixed = checkMixedContent(html, currentFetchUrl);
      result.mixedContent = mixed.hasMixed;
      if (mixed.hasMixed) {
        console.log(`[PulseVault] Mixed content URLs:`, mixed.urls.slice(0, 5));
      }

      detectJSErrors(html, result);

      result.performance.score = calculatePerformanceScore(
        result.performance.loadTime,
        result.performance.pageSize,
        result.responseTime,
      );

      calculateHealthScore(result);

      console.log(
        `[PulseVault] Final: status=${result.status}, health=${result.healthScore}, perf=${result.performance.score}, loadTime=${result.performance.loadTime}ms, pageSize=${formatBytes(result.performance.pageSize)}, links=${result.links.total}, broken=${result.links.broken}, protected=${result.links.protected}, plugins=${result.plugins.detected.length}, brokenPlugins=${result.plugins.broken.length}, sslValid=${result.ssl.valid}, sslDaysLeft=${result.ssl.daysLeft}, dnsIp=${result.dns.ip}, techStack=${result.techStack.detected.length}, spaCrashes=${result.spaCrashes}, runtimeErrors=${result.runtimeErrors.length}`,
      );

      /* ── Save to Firestore ── */
      if (effectiveWebsiteId) {
        try {
          const websiteRef = db
            .collection("users")
            .doc(userId)
            .collection("websites")
            .doc(effectiveWebsiteId);

          const existingSnap = await websiteRef.get();
          const existing = existingSnap.exists ? existingSnap.data() : null;

          let sslStatus: "valid" | "expired" | "expiring" | "unknown" =
            "unknown";
          if (!result.ssl.valid || result.ssl.daysLeft < 0) {
            sslStatus = "expired";
          } else if (result.ssl.daysLeft < 30) {
            sslStatus = "expiring";
          } else {
            sslStatus = "valid";
          }

          const finalSslExpiry =
            result.ssl.expiry || existing?.sslExpiry || null;
          const finalSslDaysLeft =
            result.ssl.daysLeft || existing?.sslDaysLeft || 0;

          const finalTechStack =
            result.techStack.detected.length > 0
              ? result.techStack
              : existing?.techStack || { detected: [] };

          await websiteRef.update({
            status: result.status,
            health: result.healthScore,
            uptime: `${result.healthScore}%`,
            responseTime: `${result.performance.loadTime}ms`,
            ssl: sslStatus,
            sslExpiry: finalSslExpiry,
            sslDaysLeft: finalSslDaysLeft,
            httpStatus: result.httpStatus,
            lastChecked: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            brokenLinks: result.links.broken,
            totalLinks: result.links.total,
            protectedLinks: result.links.protected,
            brokenPlugins: result.plugins.broken.length,
            totalPlugins: result.plugins.detected.length,
            formsWorking: result.forms.working,
            totalForms: result.forms.total,
            jsErrors: result.jsErrors,
            apiHealth: result.apiChecks.filter((a) => a.ok).length,
            performanceScore: result.performance.score,
            loadTime: result.performance.loadTime,
            pageSize: result.performance.pageSize,
            mixedContent: result.mixedContent,
            securityHeaders: result.securityHeaders,
            redirectChain: result.redirectChain,
            dnsResolved: result.dns.resolved,
            dnsIp: result.dns.ip || null,
            spaCrashes: result.spaCrashes,
            runtimeErrors: result.runtimeErrors,
            headlessAvailable: result.headlessAvailable,
            techStack: finalTechStack,
            scanResults: {
              timestamp: result.timestamp,
              links: result.links.list,
              plugins: result.plugins.detected.map((name) => ({
                name,
                status: result.plugins.broken.includes(name) ? "broken" : "ok",
              })),
              forms: result.forms.list,
              consoleErrors: result.consoleErrors,
              apiChecks: result.apiChecks,
              loadTime: result.performance.loadTime,
              pageSize: result.performance.pageSize,
              performanceScore: result.performance.score,
              resourceErrors: [],
              techStack: finalTechStack,
              runtimeErrors: result.runtimeErrors,
              spaCrashes: result.spaCrashes,
              headlessAvailable: result.headlessAvailable,
            },
          });

          console.log(
            `[Scan] Saved scan results to Firestore for ${targetUrl}`,
          );
        } catch (saveErr: any) {
          console.error(`[Scan] Failed to save scan results:`, saveErr.message);
        }
      }

      /* ── Alerts ── */
      console.log(
        `[Scan] Checking alert conditions: websiteId=${effectiveWebsiteId}, status=${result.status}`,
      );

      if (effectiveWebsiteId && result.status !== "healthy") {
        console.log(`[Scan] 🚨 Alert conditions met. Processing alert...`);
        try {
          let existingAlerts = await db
            .collection("users")
            .doc(userId)
            .collection("alerts")
            .where("websiteId", "==", effectiveWebsiteId)
            .where("status", "==", "open")
            .limit(1)
            .get();

          if (existingAlerts.empty) {
            existingAlerts = await db
              .collection("users")
              .doc(userId)
              .collection("alerts")
              .where("targetId", "==", effectiveWebsiteId)
              .where("status", "==", "open")
              .limit(1)
              .get();
          }

          const alertType =
            result.status === "offline"
              ? "Website Offline"
              : "Health Score Drop";

          const issues: string[] = [];
          if (result.links.broken > 0) {
            issues.push(
              `${result.links.broken} broken link${result.links.broken !== 1 ? "s" : ""}`,
            );
          }
          if (result.jsErrors > 0) {
            issues.push(
              `${result.jsErrors} JS error${result.jsErrors !== 1 ? "s" : ""}`,
            );
          }
          if (result.plugins.broken.length > 0) {
            issues.push(
              `${result.plugins.broken.length} broken plugin${result.plugins.broken.length !== 1 ? "s" : ""}`,
            );
          }
          if (!result.forms.working && result.forms.total > 0) {
            issues.push(
              `${result.forms.total} broken form${result.forms.total !== 1 ? "s" : ""}`,
            );
          }
          if (result.mixedContent) {
            issues.push("mixed content detected");
          }
          if (result.httpStatus >= 400) {
            issues.push(`HTTP ${result.httpStatus} error`);
          }
          if (!result.ssl.valid) {
            issues.push("SSL certificate expired");
          } else if (result.ssl.daysLeft < 30) {
            issues.push(`SSL expires in ${result.ssl.daysLeft} days`);
          }
          if (result.spaCrashes) {
            issues.push("SPA crash detected");
          }
          if (result.runtimeErrors.length > 0) {
            issues.push(`${result.runtimeErrors.length} runtime errors`);
          }

          const alertMessage =
            result.status === "offline"
              ? `Website ${targetUrl} is unreachable. HTTP status: ${result.httpStatus || "timeout"}`
              : `Health score dropped to ${result.healthScore}%. ${issues.length > 0 ? issues.join(", ") + "." : "Check dashboard for details."}`;

          const alertData = {
            userId,
            websiteId: effectiveWebsiteId,
            targetId: effectiveWebsiteId,
            type: alertType,
            severity:
              result.status === "critical"
                ? "critical"
                : result.status === "warning"
                  ? "warning"
                  : "info",
            message: alertMessage,
            target: targetUrl,
            status: "open",
            createdAt: new Date().toISOString(),
          };

          const settingsSnap = await db
            .collection("users")
            .doc(userId)
            .collection("settings")
            .doc("preferences")
            .get();

          const settingsData = settingsSnap.exists ? settingsSnap.data() : null;
          const userEmailToggle = settingsData?.notifications?.email !== false;
          const planAllowsEmail = canSendEmailAlerts(planId);

          console.log(
            `[Scan] User email toggle: ${userEmailToggle}, Plan allows email: ${planAllowsEmail}`,
          );

          if (existingAlerts.empty) {
            const newAlert = await db
              .collection("users")
              .doc(userId)
              .collection("alerts")
              .add(alertData);
            const alertId = newAlert.id;
            console.log(
              `[Scan] 🚨 Alert created for ${targetUrl}, ID: ${alertId}`,
            );

            if (!planAllowsEmail) {
              console.log(
                `[Scan] 📧 Email blocked: ${planConfig.planName} plan does not include email alerts. Upgrade to Starter+`,
              );
            } else if (!userEmailToggle) {
              console.log(
                `[Scan] 📧 Email blocked: user turned off email alerts in Settings`,
              );
            } else {
              let userEmail = (payload.email as string) || "";
              let userName = "User";

              if (!userEmail) {
                const userDoc = await db.collection("users").doc(userId).get();
                userEmail = userDoc.data()?.email || "";
                userName = userDoc.data()?.name || "User";
              }

              console.log(`[Scan] User email: ${userEmail || "NOT FOUND"}`);

              if (userEmail) {
                const userSettings = settingsSnap.exists
                  ? settingsSnap.data()
                  : null;
                const userTz = userSettings?.timezone || "UTC";

                const formattedTimestamp = new Date(
                  alertData.createdAt,
                ).toLocaleString("en-US", {
                  timeZone: userTz,
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });

                console.log(`[Scan] 📧 Sending alert email to: ${userEmail}`);
                await sendAlertEmail({
                  to: userEmail,
                  userName,
                  alertType: alertData.type,
                  severity: alertData.severity as any,
                  message: alertData.message,
                  target: targetUrl,
                  timestamp: formattedTimestamp,
                  healthScore: result.healthScore,
                  httpStatus: result.httpStatus,
                  sslStatus: result.ssl.valid
                    ? result.ssl.daysLeft < 30
                      ? "expiring"
                      : "valid"
                    : "expired",
                  sslDaysLeft: result.ssl.daysLeft,
                  loadTime: result.performance.loadTime,
                });
                console.log(`[Scan] ✅ Alert email sent to ${userEmail}`);
              } else {
                console.log(
                  `[Scan] ⚠️ No email found for user ${userId}, skipping email`,
                );
              }
            }
          } else {
            const alertId = existingAlerts.docs[0].id;
            console.log(
              `[Scan] 📋 Open alert already exists for ${targetUrl}, ID: ${alertId}. No duplicate alert or email.`,
            );
          }
        } catch (alertErr: any) {
          console.error("[Scan] 🚨 Alert/email error:", alertErr.message);
        }
      } else {
        console.log(
          `[Scan] ✅ Skipping alert: websiteId=${!!effectiveWebsiteId}, status=${result.status}`,
        );
      }

      return NextResponse.json(result);
    } catch (error: any) {
      console.error(`[PulseVault] API ERROR: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  })();

  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("HARD_TIMEOUT")),
      MAX_SCAN_TIME_MS,
    );
  });

  try {
    const result = await Promise.race([scanPromise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result;
  } catch (err: any) {
    if (timeoutId) clearTimeout(timeoutId);
    if (err.message === "HARD_TIMEOUT") {
      console.error(`[PulseVault] HARD TIMEOUT after ${MAX_SCAN_TIME_MS}ms`);
      return NextResponse.json(getDefaultResult(targetUrl), {
        status: 504,
      });
    }
    console.error(`[PulseVault] UNCAUGHT FATAL:`, err.stack || err.message);
    return NextResponse.json(
      { error: "Scan crashed", detail: err.message, url: targetUrl },
      { status: 500 },
    );
  }
}

/* ─────────────────── TECH STACK DETECTION ─────────────────── */

function detectTechStack(
  html: string,
  headers: Headers,
): ScanResult["techStack"] {
  const detected: ScanResult["techStack"]["detected"] = [];
  const lowerHtml = html.toLowerCase();
  const headerServer = (headers.get("server") || "").toLowerCase();
  const headerPowered = (headers.get("x-powered-by") || "").toLowerCase();

  const checks: Array<{
    name: string;
    category: string;
    test: () => boolean;
  }> = [
    {
      name: "HTML",
      category: "Language",
      test: () => /<html\b/i.test(html) || /<!doctype html/i.test(lowerHtml),
    },
    {
      name: "CSS",
      category: "Language",
      test: () =>
        /<style\b/i.test(html) ||
        /<link[^>]*stylesheet/i.test(html) ||
        /\.css["']/i.test(html) ||
        /class\s*=\s*["']/i.test(html),
    },
    {
      name: "JavaScript",
      category: "Language",
      test: () =>
        /<script\b/i.test(html) ||
        /\.js["']/i.test(html) ||
        /javascript/i.test(lowerHtml),
    },
    {
      name: "WordPress",
      category: "CMS",
      test: () => /wp-content|wp-includes|wordpress/i.test(html),
    },
    {
      name: "Shopify",
      category: "E-commerce",
      test: () =>
        /shopify|cdn\.shopify\.com/i.test(html) ||
        /window\.shopify\s*=/i.test(html),
    },
    {
      name: "WooCommerce",
      category: "E-commerce",
      test: () => /woocommerce|wc-/i.test(html),
    },
    {
      name: "Webflow",
      category: "CMS",
      test: () =>
        /window\.__WEBFLOW_CURRENCY_SETTINGS/i.test(html) ||
        /webflow/i.test(html),
    },
    {
      name: "React",
      category: "Framework",
      test: () =>
        /reactroot|data-reactroot|__react|reactjs/i.test(lowerHtml) ||
        /\/react[^/]*\.js/i.test(html) ||
        /react-dom/i.test(html),
    },
    {
      name: "Next.js",
      category: "Framework",
      test: () => /__next|__NEXT_DATA__|_next\/static/i.test(html),
    },
    {
      name: "Vue.js",
      category: "Framework",
      test: () =>
        /vue\.js|vue\.global|__vueloader|data-v-/i.test(html) ||
        /unpkg\.com\/vue/i.test(html),
    },
    {
      name: "Nuxt",
      category: "Framework",
      test: () => /window\.__NUXT__/i.test(html) || /nuxt/i.test(html),
    },
    {
      name: "Angular",
      category: "Framework",
      test: () =>
        /ng-app|angular\.js|@angular/i.test(html) ||
        /angular\.io/i.test(html) ||
        /angular[^/]*\.js/i.test(html),
    },
    {
      name: "Svelte",
      category: "Framework",
      test: () =>
        /svelte|sveltekit/i.test(lowerHtml) ||
        /window\.__sveltekit/i.test(html),
    },
    {
      name: "Gatsby",
      category: "Framework",
      test: () => /window\.___gatsby/i.test(html),
    },
    {
      name: "Remix",
      category: "Framework",
      test: () => /window\.__remixContext/i.test(html),
    },
    {
      name: "Astro",
      category: "Framework",
      test: () => /window\.astro\s*=/i.test(html) || /astro/i.test(lowerHtml),
    },
    {
      name: "jQuery",
      category: "Library",
      test: () => /jquery/i.test(html),
    },
    {
      name: "Bootstrap",
      category: "CSS",
      test: () => /bootstrap/i.test(html),
    },
    {
      name: "Tailwind CSS",
      category: "CSS",
      test: () =>
        /tailwind|class=["'][^"']*\b(bg-|text-|flex|grid|md:|lg:)/i.test(html),
    },
    {
      name: "Node.js",
      category: "Backend",
      test: () =>
        headerServer.includes("node") ||
        headerPowered.includes("node") ||
        headerPowered.includes("express"),
    },
    {
      name: "Express",
      category: "Backend",
      test: () =>
        headerPowered.includes("express") ||
        /meta[^>]*http-equiv=["']x-powered-by["'][^>]*content=["']express["']/i.test(
          html,
        ),
    },
    {
      name: "PHP",
      category: "Backend",
      test: () => headerPowered.includes("php") || /\.php/i.test(html),
    },
    {
      name: "Django",
      category: "Backend",
      test: () =>
        /meta[^>]*name=["']csrfmiddlewaretoken["']/i.test(html) ||
        /django/i.test(html),
    },
    {
      name: "Laravel",
      category: "Backend",
      test: () =>
        /meta[^>]*name=["']csrf-token["']/i.test(html) && /laravel/i.test(html),
    },
    {
      name: "Nginx",
      category: "Server",
      test: () => headerServer.includes("nginx"),
    },
    {
      name: "Apache",
      category: "Server",
      test: () => headerServer.includes("apache"),
    },
    {
      name: "Cloudflare",
      category: "CDN",
      test: () =>
        headerServer.includes("cloudflare") || !!headers.get("cf-ray"),
    },
    {
      name: "Vercel",
      category: "Hosting",
      test: () =>
        headerServer.includes("vercel") || /_vercel\/insights/i.test(html),
    },
    {
      name: "Netlify",
      category: "Hosting",
      test: () => headerServer.includes("netlify") || /netlify/i.test(html),
    },
    {
      name: "Google Analytics",
      category: "Analytics",
      test: () => /gtag|google-analytics|googletagmanager/i.test(html),
    },
  ];

  for (const check of checks) {
    if (check.test()) {
      detected.push({
        name: check.name,
        category: check.category,
        confidence: "high",
      });
    }
  }

  const frameworks = detected.filter((d) => d.category === "Framework");
  const primary = frameworks.length > 0 ? frameworks[0].name : undefined;

  return { detected, primary };
}

/* ─────────────────── SPA CRASH DETECTION ─────────────────── */

function detectSPACrashes(
  html: string,
  techStack: ScanResult["techStack"],
): boolean {
  const hasSPAFramework = techStack.detected.some((t) =>
    ["React", "Next.js", "Vue.js", "Angular", "Svelte"].includes(t.name),
  );

  if (!hasSPAFramework) return false;

  const crashIndicators = [
    /application error/i,
    /server error/i,
    /hydration failed/i,
    /minified react error/i,
    /\[vite\].*error/i,
    /failed to load module/i,
    /uncaught error/i,
    /something went wrong/i,
  ];

  const hasCrashIndicator = crashIndicators.some((pattern) =>
    pattern.test(html),
  );
  if (hasCrashIndicator) return true;

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : html;

  const visibleText = bodyContent
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  if (visibleText.length < 20 && html.includes("<script")) {
    return true;
  }

  return false;
}

/* ─────────────────── RUNTIME ERROR DETECTION ─────────────────── */

function detectRuntimeErrors(
  html: string,
): Array<{ type: string; message: string; location?: string }> {
  const errors: Array<{
    type: string;
    message: string;
    location?: string;
  }> = [];

  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    const scriptContent = match[2];
    if (!scriptContent.trim() || match[1]?.includes("src=")) continue;

    const throwMatches = scriptContent.match(
      /throw\s+(?:new\s+(?:Error|TypeError|ReferenceError)\s*\(\s*["']([^"']+)["']|["']([^"']+)["'])/g,
    );
    if (throwMatches) {
      for (const tm of throwMatches) {
        const msg = tm.match(/["']([^"']+)["']/)?.[1] || "Unknown error";
        errors.push({ type: "throw", message: msg });
      }
    }

    const consoleMatches = scriptContent.match(/console\.error\s*\(([^)]+)\)/g);
    if (consoleMatches) {
      for (const cm of consoleMatches) {
        const msg = cm.match(/["']([^"']+)["']/)?.[1] || "Console error";
        errors.push({ type: "console.error", message: msg });
      }
    }
  }

  const visibleErrorPatterns = [
    {
      pattern: /class=["'][^"']*error[^"']*["'][^>]*>([^<]+)/gi,
      type: "DOM error",
    },
    { pattern: /id=["']error["'][^>]*>([^<]+)/gi, type: "DOM error" },
  ];

  for (const { pattern, type } of visibleErrorPatterns) {
    let pm;
    while ((pm = pattern.exec(html)) !== null) {
      const text = pm[1].trim();
      if (text.length > 5 && text.length < 200) {
        errors.push({ type, message: text });
      }
    }
  }

  return errors.slice(0, 10);
}

/* ─────────────────── API HEALTH CHECKS ─────────────────── */

async function checkAPIs(
  html: string,
  baseUrl: string,
  scanStartTime: number,
): Promise<ScanResult["apiChecks"]> {
  const apis: ScanResult["apiChecks"] = [];
  const found = new Set<string>();

  const patterns = [
    /["'](\/api\/[a-zA-Z0-9_\-/]+)["']/g,
    /["'](\/graphql)["']/g,
    /["'](\/rest\/[a-zA-Z0-9_\-/]+)["']/g,
    /fetch\(["']([^"']+)["']/g,
  ];

  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(html)) !== null) {
      try {
        const resolved = new URL(m[1], baseUrl).href;
        if (resolved.startsWith("http")) found.add(resolved);
      } catch {}
    }
  }

  const checkList = Array.from(found).slice(0, 5);

  if (checkList.length === 0) return [];

  for (const endpoint of checkList) {
    if (Date.now() - scanStartTime > MAX_SCAN_TIME_MS - 5000) break;
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(endpoint, {
        method: "HEAD",
        signal: ctrl.signal,
        headers: BROWSER_HEADERS,
      });
      apis.push({ endpoint, status: res.status, ok: res.status < 400 });
    } catch {
      apis.push({ endpoint, status: 0, ok: false });
    }
  }

  return apis;
}

/* ─────────────────── HELPERS ─────────────────── */

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function parseHTML(html: string, baseUrl: string, result: ScanResult) {
  const links = new Set<string>();
  const imageUrls: string[] = [];
  const baseDomain = new URL(baseUrl).hostname;

  const srcRegex = /src\s*=\s*["']([^"']+)["']/gi;
  let match;

  while ((match = srcRegex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], baseUrl).href;
      if (resolved.startsWith("http")) {
        const isImage =
          /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(resolved) ||
          resolved.includes("picsum.photos") ||
          resolved.includes("placeholder") ||
          resolved.includes("unsplash");
        if (isImage) imageUrls.push(resolved);
      }
    } catch (e) {
      console.log(`[PulseVault] Failed to resolve URL: ${match[1]}`);
    }
  }

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;

  const anchorRegex = /<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  while ((match = anchorRegex.exec(bodyHtml)) !== null) {
    try {
      const resolved = new URL(match[1], baseUrl).href;
      if (resolved.startsWith("http")) {
        const linkDomain = new URL(resolved).hostname;
        if (linkDomain === baseDomain || links.size < MAX_LINKS_TO_CHECK / 2) {
          links.add(resolved);
        }
      }
    } catch {}
  }

  result.links.total = links.size;
  result.links.list = Array.from(links).map((url) => ({
    url,
    status: 0,
    ok: true,
  }));

  const formRegex = /<form[^>]*>/gi;
  const forms: ScanResult["forms"]["list"] = [];
  let formMatch;
  while ((formMatch = formRegex.exec(html)) !== null) {
    const formTag = formMatch[0];
    forms.push({
      selector: formTag.slice(0, 50),
      hasAction: formTag.includes("action"),
      hasMethod: formTag.includes("method"),
    });
  }
  result.forms.total = forms.length;
  result.forms.list = forms;
  result.forms.working =
    forms.length === 0 || forms.every((f) => f.hasAction && f.hasMethod);

  const pluginRegex = /\/wp-content\/plugins\/([^\/]+)\//gi;
  while ((match = pluginRegex.exec(html)) !== null) {
    if (!result.plugins.detected.includes(match[1]))
      result.plugins.detected.push(match[1]);
  }

  return {
    imageUrls,
    pluginAssetUrls: extractPluginAssets(html, baseUrl),
  };
}

function extractPluginAssets(html: string, baseUrl: string): string[] {
  const assets: string[] = [];
  const assetRegex = /\/wp-content\/plugins\/[^\/]+\/[^"']+\.(js|css)/gi;
  let match;
  while ((match = assetRegex.exec(html)) !== null) {
    try {
      assets.push(new URL(match[0], baseUrl).href);
    } catch {}
  }
  return Array.from(new Set(assets));
}

async function checkPluginAssets(
  result: ScanResult,
  baseUrl: string,
  scanStartTime: number,
) {
  if (result.plugins.detected.length === 0) return;

  const pluginBaseUrls = result.plugins.detected.map(
    (name) => `${new URL(baseUrl).origin}/wp-content/plugins/${name}/`,
  );

  for (const pluginUrl of pluginBaseUrls) {
    if (Date.now() - scanStartTime > MAX_SCAN_TIME_MS) {
      console.log(`[PulseVault] Scan timeout, skipping plugin asset checks`);
      break;
    }

    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), LINK_TIMEOUT_MS);

      const res = await fetch(pluginUrl, {
        method: "HEAD",
        signal: ctrl.signal,
        headers: BROWSER_HEADERS,
      });

      if (res.status === 404) {
        const pluginName = pluginUrl
          .split("/wp-content/plugins/")[1]
          ?.replace("/", "");
        if (pluginName && !result.plugins.broken.includes(pluginName)) {
          result.plugins.broken.push(pluginName);
          console.log(
            `[PulseVault] Plugin folder 404: ${pluginName} -> broken`,
          );
        }
      }
    } catch {
      const pluginName = pluginUrl
        .split("/wp-content/plugins/")[1]
        ?.replace("/", "");
      if (pluginName && !result.plugins.broken.includes(pluginName)) {
        result.plugins.broken.push(pluginName);
      }
    }
  }
}

async function estimateImageSizes(urls: string[]): Promise<number> {
  if (urls.length === 0) return 0;

  let totalSize = 0;
  const concurrency = 3;
  const maxImages = 10;

  const urlsToCheck = urls.slice(0, maxImages);
  console.log(
    `[PulseVault] Estimating size for ${urlsToCheck.length} of ${urls.length} images`,
  );

  for (let i = 0; i < urlsToCheck.length; i += concurrency) {
    const chunk = urlsToCheck.slice(i, i + concurrency);
    const sizePromises = chunk.map(async (imgUrl) => {
      try {
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), IMAGE_TIMEOUT_MS);

        let res = await fetch(imgUrl, {
          method: "HEAD",
          signal: ctrl.signal,
          headers: BROWSER_HEADERS,
        });

        if (res.status === 405) {
          const ctrl2 = new AbortController();
          setTimeout(() => ctrl2.abort(), IMAGE_TIMEOUT_MS);
          res = await fetch(imgUrl, {
            method: "GET",
            signal: ctrl2.signal,
            headers: BROWSER_HEADERS,
          });
        }

        const size = res.headers.get("content-length");
        if (size) {
          return parseInt(size);
        }

        throw new Error("No content-length");
      } catch {
        if (imgUrl.includes("picsum.photos")) {
          const dims = imgUrl.match(/(\d+)\/(\d+)/);
          if (dims) {
            const w = parseInt(dims[1]);
            const h = parseInt(dims[2]);
            return Math.round(w * h * 0.2);
          }
        }
        return 102400;
      }
    });

    const sizes = await Promise.allSettled(sizePromises);
    for (const s of sizes) {
      if (s.status === "fulfilled") totalSize += s.value;
    }
  }

  const remainingImages = urls.length - urlsToCheck.length;
  if (remainingImages > 0) {
    const cappedRemaining = Math.min(remainingImages, 50);
    totalSize += cappedRemaining * 102400;
    console.log(
      `[PulseVault] Capped ${remainingImages} remaining images to ${cappedRemaining} x 100KB`,
    );
  }

  return totalSize;
}

async function checkLinks(result: ScanResult, scanStartTime: number) {
  const concurrency = 5;
  const chunks = [];

  for (let i = 0; i < result.links.list.length; i += concurrency) {
    chunks.push(result.links.list.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    if (Date.now() - scanStartTime > MAX_SCAN_TIME_MS) {
      console.log(
        `[PulseVault] Scan timeout reached, skipping remaining links`,
      );
      for (const link of result.links.list) {
        if (link.status === 0) {
          link.status = -1;
          link.ok = false;
          result.links.broken += 1;
        }
      }
      break;
    }

    const checkPromises = chunk.map(async (link) => {
      try {
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), LINK_TIMEOUT_MS);

        let res = await fetch(link.url, {
          method: "HEAD",
          signal: ctrl.signal,
          headers: BROWSER_HEADERS,
        });

        if (res.status === 405) {
          const ctrl2 = new AbortController();
          setTimeout(() => ctrl2.abort(), LINK_TIMEOUT_MS);
          res = await fetch(link.url, {
            method: "GET",
            signal: ctrl2.signal,
            headers: BROWSER_HEADERS,
          });
        }

        link.status = res.status;

        if (res.status === 403 || res.status === 401) {
          link.ok = true;
          link.protected = true;
          result.links.protected += 1;
        } else {
          link.ok = res.status < 400;
          if (!link.ok) result.links.broken += 1;
        }
      } catch {
        link.status = 0;
        link.ok = false;
        result.links.broken += 1;
      }
    });

    await Promise.allSettled(checkPromises);
  }
}

function checkMixedContent(
  html: string,
  baseUrl: string,
): { hasMixed: boolean; urls: string[] } {
  if (!baseUrl.startsWith("https://")) return { hasMixed: false, urls: [] };

  const htmlWithoutJsonLd = html.replace(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
    "",
  );

  const urls: string[] = [];
  const resourceRegex =
    /\b(src|srcset|action)\s*=\s*["'](http:\/\/[^"']+)["']/gi;
  let match;

  while ((match = resourceRegex.exec(htmlWithoutJsonLd)) !== null) {
    const mixedUrl = match[2];
    if (
      mixedUrl.includes("schema.org") ||
      mixedUrl.includes("w3.org") ||
      mixedUrl.includes("xmlns") ||
      mixedUrl.includes("ogp.me")
    )
      continue;
    urls.push(mixedUrl);
  }

  return { hasMixed: urls.length > 0, urls };
}

function detectJSErrors(html: string, result: ScanResult) {
  const inlineScriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let scriptMatch;
  let totalErrors = 0;

  const skipPatterns = [
    /google-analytics/i,
    /gtag/i,
    /googletagmanager/i,
    /facebook/i,
    /twitter/i,
    /analytics/i,
    /tracking/i,
    /metrics/i,
  ];

  while ((scriptMatch = inlineScriptRegex.exec(html)) !== null) {
    const scriptAttrs = scriptMatch[1] || "";
    const scriptContent = scriptMatch[2];

    if (scriptAttrs.includes("src=")) continue;
    if (skipPatterns.some((p) => p.test(scriptAttrs))) continue;

    if (!scriptContent.trim()) continue;
    const lines = scriptContent.split("\n");
    const avgLineLength =
      lines.reduce((sum, l) => sum + l.length, 0) / Math.max(lines.length, 1);
    if (avgLineLength > 300) continue;

    if (/google-analytics|gtag|fbq|twq|analytics|tracking/i.test(scriptContent))
      continue;

    const consoleErrors = (scriptContent.match(/console\.error\s*\(/g) || [])
      .length;
    const throwErrors = (
      scriptContent.match(
        /throw\s+new\s+(?:Error|TypeError|ReferenceError)\s*\(/g,
      ) || []
    ).length;

    totalErrors += consoleErrors + throwErrors;
  }

  result.jsErrors = totalErrors;
}

function calculatePerformanceScore(
  loadTime: number,
  pageSize: number,
  responseTime: number,
): number {
  let score = 100;

  if (loadTime > 500) score -= 5;
  if (loadTime > 1000) score -= 10;
  if (loadTime > 2000) score -= 15;
  if (loadTime > 3000) score -= 15;
  if (loadTime > 5000) score -= 15;
  if (loadTime > 8000) score -= 15;
  if (loadTime > 10000) score -= 10;
  if (loadTime > 15000) score -= 10;

  const pageSizeKB = pageSize / 1024;
  if (pageSizeKB > 500) score -= 5;
  if (pageSizeKB > 1000) score -= 10;
  if (pageSizeKB > 2000) score -= 10;
  if (pageSizeKB > 5000) score -= 10;

  if (responseTime > 200) score -= 5;
  if (responseTime > 500) score -= 10;
  if (responseTime > 1000) score -= 10;
  if (responseTime > 3000) score -= 10;
  if (responseTime > 5000) score -= 10;

  return Math.max(0, Math.round(score));
}

function calculateHealthScore(result: ScanResult) {
  let score = 100;

  if (result.httpStatus >= 500) {
    score -= 50;
    result.status = "critical";
  } else if (result.httpStatus >= 400) {
    score -= 40;
    result.status = "warning";
  } else if (result.httpStatus >= 300) {
    score -= 10;
  }

  if (result.httpStatus < 400) {
    if (result.links.total > 0) {
      const brokenRatio = result.links.broken / result.links.total;
      score -= Math.min(25, brokenRatio * 25);
    }

    score -= Math.min(15, result.plugins.broken.length * 5);
    if (result.forms.total > 0 && !result.forms.working) score -= 15;
    score -= Math.min(15, result.jsErrors * 3);
    if (result.mixedContent) score -= 10;

    const secScore = Object.values(result.securityHeaders).filter(
      Boolean,
    ).length;
    score += secScore * 2;

    const perfFactor = result.performance.score / 100;
    score = Math.round(score * (0.7 + 0.3 * perfFactor));

    if (score <= 30) result.status = "critical";
    else if (score < 60) result.status = "warning";
    else if (score < 80) result.status = "warning";
    else result.status = "healthy";
  }

  result.healthScore = Math.max(0, Math.min(100, Math.round(score)));
}
