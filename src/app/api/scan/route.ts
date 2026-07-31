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

interface ScanResult {
  url: string;
  timestamp: string;
  status: "healthy" | "warning" | "critical" | "offline" | "soft-404";
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
  isSoft404: boolean;
}

const MAX_LINKS_TO_CHECK = 30;
const LINK_TIMEOUT_MS = 3000;
const IMAGE_TIMEOUT_MS = 3000;
const MAX_SCAN_TIME_MS = 25000;

// Soft 404 indicators
const SOFT_404_PATTERNS = [
  /not\s+found/i,
  /page\s+not\s+found/i,
  /404\s+error/i,
  /404\s+page/i,
  /could\s+not\s+find/i,
  /doesn'?t\s+exist/i,
  /no\s+such/i,
  /nothing\s+here/i,
  /oops/i,
  /missing/i,
];

function isSoft404(html: string, status: number): boolean {
  if (status !== 200) return false;
  const text = html.slice(0, 5000).toLowerCase();
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].toLowerCase() : "";
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const h1 = h1Match ? h1Match[1].toLowerCase() : "";
  const combined = `${title} ${h1} ${text}`;
  return SOFT_404_PATTERNS.some((p) => p.test(combined));
}

function isValidPluginName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 80) return false;
  if (/["'*{},\[\]<>\\|]/.test(name)) return false;
  if (/^(https?|data|ftp):/i.test(name)) return false;
  if (/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i.test(name))
    return false;
  return /^[a-zA-Z0-9\-_]+$/.test(name);
}

export async function POST(req: NextRequest) {
  const scanStartTime = Date.now();

  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let userId: string;
    let payload: any;
    try {
      const verified = await jwtVerify(token, getSecret());
      payload = verified.payload;
      userId = payload.uid as string;
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { url, websiteId } = await req.json();
    console.log(
      `[Scan] Raw request: url=${url}, websiteId=${websiteId || "NOT_PROVIDED"}`,
    );

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return NextResponse.json(
          { error: "Only HTTP and HTTPS URLs are allowed" },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }

    const db = getFirestore();
    const planSnap = await db
      .collection("users")
      .doc(userId)
      .collection("billing")
      .doc("plan")
      .get();
    const planId = planSnap.exists ? planSnap.data()?.planId || "free" : "free";
    const planConfig = getPlanConfig(planId);
    console.log(
      `[Scan] User plan: ${planConfig.planName} (${planId}), checkInterval: ${planConfig.checkInterval}min`,
    );

    let effectiveWebsiteId = websiteId;
    if (!effectiveWebsiteId) {
      try {
        const websitesSnap = await db
          .collection("users")
          .doc(userId)
          .collection("websites")
          .where("url", "==", url)
          .limit(1)
          .get();
        if (!websitesSnap.empty) {
          effectiveWebsiteId = websitesSnap.docs[0].id;
          console.log(`[Scan] Found websiteId by URL: ${effectiveWebsiteId}`);
        } else {
          console.log(`[Scan] No website found with URL: ${url}`);
        }
      } catch (e: any) {
        console.log(`[Scan] Error finding website by URL: ${e.message}`);
      }
    }

    const result: ScanResult = {
      url,
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
      isSoft404: false,
    };

    // --- SSL CHECK ---
    try {
      const hostname = parsedUrl.hostname;
      const sslCert = await checkSSLCertificate(hostname);
      result.ssl = {
        valid: sslCert.valid && sslCert.daysLeft >= 0,
        expiry: sslCert.expiryDate,
        daysLeft: sslCert.daysLeft,
      };
      console.log(
        `[Scan] SSL pre-check for ${hostname}: valid=${result.ssl.valid}, daysLeft=${result.ssl.daysLeft}`,
      );
    } catch (sslErr: any) {
      console.error(`[Scan] SSL pre-check failed for ${url}:`, sslErr.message);
      result.ssl = { valid: false, expiry: null, daysLeft: 0 };
    }

    // --- DNS LOOKUP ---
    try {
      const hostname = parsedUrl.hostname;
      const dnsResult = await lookup(hostname);
      result.dns.ip = dnsResult.address;
      result.dns.resolved = true;
      console.log(`[Scan] DNS resolved: ${hostname} -> ${dnsResult.address}`);
    } catch (dnsErr: any) {
      console.log(`[Scan] DNS lookup failed: ${dnsErr.message}`);
      result.dns.ip = undefined;
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      console.log(`[PulseVault] Fetching: ${url}`);
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "PulseVault-HealthBot/1.0" },
      });
      clearTimeout(timeout);

      result.httpStatus = response.status;
      result.responseTime = Date.now() - startTime;

      const headers = response.headers;
      result.securityHeaders.hsts = !!headers.get("strict-transport-security");
      result.securityHeaders.xFrame = !!headers.get("x-frame-options");
      result.securityHeaders.xContentType = !!headers.get(
        "x-content-type-options",
      );
      result.securityHeaders.csp = !!headers.get("content-security-policy");

      const html = await response.text();

      // --- SOFT 404 DETECTION ---
      result.isSoft404 = isSoft404(html, response.status);
      if (result.isSoft404) {
        result.consoleErrors.push(
          `Soft 404 detected: page returns 200 but appears to be a "not found" page`,
        );
      }

      if (response.status >= 400) {
        result.consoleErrors.push(`HTTP ${response.status} error returned`);
      }

      const parseResult = parseHTML(html, url, result);

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

      // --- CHECK PLUGIN ASSETS FOR BROKEN PLUGINS ---
      if (result.plugins.detected.length > 0) {
        await checkPluginAssets(result, parsedUrl.origin, scanStartTime);
      }

      result.performance.loadTime = result.responseTime;
      result.performance.pageSize = htmlSize + imageSize;

      const mixed = checkMixedContent(html, url);
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
        `[PulseVault] Final: status=${result.status}, health=${result.healthScore}, perf=${result.performance.score}, loadTime=${result.performance.loadTime}ms, pageSize=${formatBytes(result.performance.pageSize)}, links=${result.links.total}, broken=${result.links.broken}, protected=${result.links.protected}, plugins=${result.plugins.detected.length}, brokenPlugins=${result.plugins.broken.length}, sslValid=${result.ssl.valid}, sslDaysLeft=${result.ssl.daysLeft}, dnsIp=${result.dns.ip}, soft404=${result.isSoft404}`,
      );
    } catch (err: any) {
      clearTimeout(timeout);
      console.error(`[PulseVault] Fetch FAILED: ${err.name} - ${err.message}`);
      result.status = "offline";
      result.healthScore = 0;
      result.httpStatus = 0;
      result.dns.resolved = false;
      result.performance.score = 0;
      result.consoleErrors.push(`Fetch failed: ${err.name} - ${err.message}`);
    }

    if (effectiveWebsiteId) {
      try {
        const websiteRef = db
          .collection("users")
          .doc(userId)
          .collection("websites")
          .doc(effectiveWebsiteId);

        const existingSnap = await websiteRef.get();
        const existing = existingSnap.exists ? existingSnap.data() : null;

        let sslStatus: "valid" | "expired" | "expiring" | "unknown" = "unknown";
        if (!result.ssl.valid || result.ssl.daysLeft < 0) {
          sslStatus = "expired";
        } else if (result.ssl.daysLeft < 30) {
          sslStatus = "expiring";
        } else {
          sslStatus = "valid";
        }

        const finalSslExpiry = result.ssl.expiry || existing?.sslExpiry || null;
        const finalSslDaysLeft =
          result.ssl.daysLeft || existing?.sslDaysLeft || 0;

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
          isSoft404: result.isSoft404,
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
          },
        });

        console.log(`[Scan] Saved scan results to Firestore for ${url}`);
      } catch (saveErr: any) {
        console.error(`[Scan] Failed to save scan results:`, saveErr.message);
      }
    }

    console.log(
      `[Scan] Checking alert conditions: websiteId=${effectiveWebsiteId}, status=${result.status}`,
    );

    if (effectiveWebsiteId && result.status !== "healthy") {
      console.log(`[Scan] Alert conditions met. Processing alert...`);
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
          result.status === "offline" ? "Website Offline" : "Health Score Drop";

        const issues: string[] = [];
        if (result.isSoft404) {
          issues.push("soft 404 detected");
        }
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

        const alertMessage =
          result.status === "offline"
            ? `Website ${url} is unreachable. HTTP status: ${result.httpStatus || "timeout"}`
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
          target: url,
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
          console.log(`[Scan] Alert created for ${url}, ID: ${alertId}`);

          if (!planAllowsEmail) {
            console.log(
              `[Scan] Email blocked: ${planConfig.planName} plan does not include email alerts. Upgrade to Starter+`,
            );
          } else if (!userEmailToggle) {
            console.log(
              `[Scan] Email blocked: user turned off email alerts in Settings`,
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
              const userTz = settingsData?.timezone || "UTC";
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

              console.log(`[Scan] Sending alert email to: ${userEmail}`);
              await sendAlertEmail({
                to: userEmail,
                userName,
                alertType: alertData.type,
                severity: alertData.severity as any,
                message: alertData.message,
                target: url,
                timestamp: formattedTimestamp,
                healthScore: result.healthScore,
                brokenLinks: result.links.broken,
                totalLinks: result.links.total,
                brokenPlugins: result.plugins.broken.length,
                totalPlugins: result.plugins.detected.length,
                jsErrors: result.jsErrors,
                formsWorking: result.forms.working,
                totalForms: result.forms.total,
                mixedContent: result.mixedContent,
                loadTime: result.performance.loadTime,
                pageSize: result.performance.pageSize,
                httpStatus: result.httpStatus,
                sslStatus: result.ssl.valid
                  ? result.ssl.daysLeft < 30
                    ? "expiring"
                    : "valid"
                  : "expired",
                sslDaysLeft: result.ssl.daysLeft,
              });
              console.log(`[Scan] Alert email sent to ${userEmail}`);
            } else {
              console.log(
                `[Scan] No email found for user ${userId}, skipping email`,
              );
            }
          }
        } else {
          const alertId = existingAlerts.docs[0].id;
          console.log(
            `[Scan] Open alert already exists for ${url}, ID: ${alertId}. No duplicate alert or email.`,
          );
        }
      } catch (alertErr: any) {
        console.error("[Scan] Alert/email error:", alertErr.message);
      }
    } else {
      console.log(
        `[Scan] Skipping alert: websiteId=${!!effectiveWebsiteId}, status=${result.status}`,
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[PulseVault] API ERROR: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

  // --- EXTRACT IMAGES ---
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
        if (isImage) {
          imageUrls.push(resolved);
        }
      }
    } catch (e) {
      console.log(`[PulseVault] Failed to resolve URL: ${match[1]}`);
    }
  }

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;

  // --- EXTRACT ONLY <a> TAG HREFS ---
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

  // --- EXTRACT FORMS ---
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

  // --- DETECT PLUGINS FROM /wp-content/plugins/ ---
  const pluginRegex = /\/wp-content\/plugins\/([^\/]+)\//gi;
  while ((match = pluginRegex.exec(html)) !== null) {
    const pluginName = match[1];
    if (
      isValidPluginName(pluginName) &&
      !result.plugins.detected.includes(pluginName)
    ) {
      result.plugins.detected.push(pluginName);
    }
  }

  return { imageUrls };
}

async function checkPluginAssets(
  result: ScanResult,
  origin: string,
  scanStartTime: number,
) {
  const pluginBaseUrls = result.plugins.detected.map(
    (name) => `${origin}/wp-content/plugins/${name}/`,
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
        headers: { "User-Agent": "PulseVault-HealthBot/1.0" },
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
        });

        if (res.status === 405) {
          const ctrl2 = new AbortController();
          setTimeout(() => ctrl2.abort(), IMAGE_TIMEOUT_MS);
          res = await fetch(imgUrl, {
            method: "GET",
            signal: ctrl2.signal,
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
          headers: { "User-Agent": "PulseVault-HealthBot/1.0" },
        });

        if (res.status === 405) {
          const ctrl2 = new AbortController();
          setTimeout(() => ctrl2.abort(), LINK_TIMEOUT_MS);
          res = await fetch(link.url, {
            method: "GET",
            signal: ctrl2.signal,
            headers: { "User-Agent": "PulseVault-HealthBot/1.0" },
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
    if (result.isSoft404) {
      score -= 35;
      result.status = "warning";
    }

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

    if (score < 30) result.status = "critical";
    else if (score < 60) result.status = "warning";
    else if (score < 80) result.status = "warning";
    else result.status = "healthy";
  }

  result.healthScore = Math.max(0, Math.min(100, Math.round(score)));
}
