import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getFirestore } from "firebase-admin/firestore";
import { lookup } from "dns/promises";
import "@/lib/firebase-admin";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET required");

function getSecret() {
  return new TextEncoder().encode(JWT_SECRET);
}

/* ─────────────── TYPES ─────────────── */

interface TechItem {
  name: string;
  confidence: "high" | "medium" | "low";
  category: "cms" | "framework" | "ecommerce" | "builder" | "backend" | "other";
}

interface ApiCheck {
  endpoint: string;
  status: number;
  ok: boolean;
  responseTime: number;
}

interface RuntimeError {
  type: "console.error" | "pageerror" | "requestfailed";
  message: string;
  location?: string;
}

interface DeepScanResult {
  url: string;
  timestamp: string;
  status: "healthy" | "warning" | "critical" | "offline";
  healthScore: number;
  httpStatus: number;
  responseTime: number;
  ssl: { valid: boolean; expiry: string | null; daysLeft: number };
  dns: { resolved: boolean; ip?: string };
  techStack: {
    detected: TechItem[];
    primary?: string;
  };
  apiChecks: ApiCheck[];
  runtimeErrors: RuntimeError[];
  spaCrashes: boolean;
  headlessAvailable: boolean;
  links: {
    total: number;
    broken: number;
    protected: number;
    list: { url: string; status: number; ok: boolean; protected?: boolean }[];
  };
  forms: {
    total: number;
    working: boolean;
    list: { selector: string; hasAction: boolean; hasMethod: boolean }[];
  };
  plugins: { detected: string[]; broken: string[] };
  jsErrors: number;
  consoleErrors: string[];
  performance: { loadTime: number; pageSize: number; score: number };
  mixedContent: boolean;
  securityHeaders: {
    hsts: boolean;
    xFrame: boolean;
    xContentType: boolean;
    csp: boolean;
  };
  redirectChain: string[];
}

/* ─────────────── CONFIG ─────────────── */

const MAX_LINKS = 20;
const LINK_TIMEOUT = 4000;
const MAX_SCAN_MS = 30000;

/* ─────────────── MAIN HANDLER ─────────────── */

export async function POST(req: NextRequest) {
  const scanStart = Date.now();

  try {
    /* AUTH */
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
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json(
          { error: "Only HTTP/HTTPS allowed" },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }

    /* INIT RESULT */
    const result: DeepScanResult = {
      url,
      timestamp: new Date().toISOString(),
      status: "healthy",
      healthScore: 100,
      httpStatus: 0,
      responseTime: 0,
      ssl: { valid: true, expiry: null, daysLeft: 0 },
      dns: { resolved: false },
      techStack: { detected: [] },
      apiChecks: [],
      runtimeErrors: [],
      spaCrashes: false,
      headlessAvailable: false,
      links: { total: 0, broken: 0, protected: 0, list: [] },
      forms: { total: 0, working: true, list: [] },
      plugins: { detected: [], broken: [] },
      jsErrors: 0,
      consoleErrors: [],
      performance: { loadTime: 0, pageSize: 0, score: 100 },
      mixedContent: false,
      securityHeaders: {
        hsts: false,
        xFrame: false,
        xContentType: false,
        csp: false,
      },
      redirectChain: [],
    };

    /* DNS */
    try {
      const dns = await lookup(parsed.hostname);
      result.dns = { resolved: true, ip: dns.address };
    } catch (e: any) {
      result.dns = { resolved: false };
      result.consoleErrors.push(`DNS failed: ${e.message}`);
    }

    /* FETCH PAGE */
    const t0 = Date.now();
    const ctrl = new AbortController();
    const tmr = setTimeout(() => ctrl.abort(), 15000);

    let html = "";
    let responseHeaders: Headers | null = null;

    try {
      const res = await fetch(url, {
        method: "GET",
        signal: ctrl.signal,
        redirect: "follow",
        headers: { "User-Agent": "PulseVault-DeepScan/1.0" },
      });
      clearTimeout(tmr);

      result.httpStatus = res.status;
      result.responseTime = Date.now() - t0;
      result.dns.resolved = true;
      responseHeaders = res.headers;

      if (res.status >= 400) {
        result.consoleErrors.push(`HTTP ${res.status}`);
      }

      result.securityHeaders.hsts = !!res.headers.get(
        "strict-transport-security",
      );
      result.securityHeaders.xFrame = !!res.headers.get("x-frame-options");
      result.securityHeaders.xContentType = !!res.headers.get(
        "x-content-type-options",
      );
      result.securityHeaders.csp = !!res.headers.get("content-security-policy");

      html = await res.text();
    } catch (err: any) {
      clearTimeout(tmr);
      result.status = "offline";
      result.healthScore = 0;
      result.httpStatus = 0;
      result.performance.score = 0;
      result.consoleErrors.push(`Fetch failed: ${err.name}`);
      return NextResponse.json(result);
    }

    /* ───── TECH STACK DETECTION ───── */
    result.techStack = detectTechStack(html, responseHeaders!, url);

    /* ───── API ENDPOINT CHECKS ───── */
    result.apiChecks = await checkApiEndpoints(url);

    /* ───── HEADLESS BROWSER (optional) ───── */
    const headless = await runHeadlessBrowser(url);
    result.headlessAvailable = headless.available;
    result.runtimeErrors = headless.errors;
    result.spaCrashes = headless.crashed;

    /* ───── PARSE HTML ───── */
    parseHtml(html, url, result);

    /* ───── CHECK LINKS ───── */
    await checkLinks(result, scanStart);

    /* ───── CHECK PLUGIN ASSETS ───── */
    if (result.plugins.detected.length > 0) {
      await checkPluginAssets(result, parsed.origin, scanStart);
    }

    /* ───── MIXED CONTENT ───── */
    const mixed = checkMixedContent(html, url);
    result.mixedContent = mixed.hasMixed;
    if (mixed.hasMixed) {
      result.consoleErrors.push(
        `Mixed content: ${mixed.urls.length} HTTP resources on HTTPS page`,
      );
    }

    /* ───── PERFORMANCE ───── */
    result.performance.loadTime = result.responseTime;
    result.performance.pageSize = Buffer.byteLength(html, "utf8");
    result.performance.score = calcPerfScore(
      result.performance.loadTime,
      result.performance.pageSize,
    );

    /* ───── HEALTH SCORE ───── */
    calcHealthScore(result);

    /* ───── SAVE TO FIRESTORE ───── */
    const db = getFirestore();
    let effectiveId = websiteId;
    if (!effectiveId) {
      const snap = await db
        .collection("users")
        .doc(userId)
        .collection("websites")
        .where("url", "==", url)
        .limit(1)
        .get();
      if (!snap.empty) effectiveId = snap.docs[0].id;
    }

    if (effectiveId) {
      await db
        .collection("users")
        .doc(userId)
        .collection("websites")
        .doc(effectiveId)
        .update({
          deepScannedAt: new Date().toISOString(),
          deepScan: {
            status: result.status,
            healthScore: result.healthScore,
            techStack: result.techStack.detected.map((t) => t.name),
            apiHealth: result.apiChecks.filter((a) => a.ok).length,
            apiTotal: result.apiChecks.length,
            runtimeErrors: result.runtimeErrors.length,
            spaCrashes: result.spaCrashes,
            headlessAvailable: result.headlessAvailable,
            performanceScore: result.performance.score,
            loadTime: result.performance.loadTime,
            pageSize: result.performance.pageSize,
          },
        });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error(`[DeepScan] Fatal: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─────────────── TECH DETECTION ─────────────── */

function detectTechStack(
  html: string,
  headers: Headers,
  url: string,
): DeepScanResult["techStack"] {
  const detected: TechItem[] = [];
  const h = Object.fromEntries(headers.entries());
  const low = html.toLowerCase();

  /* Shopify */
  if (
    h["x-shopify-stage"] ||
    h["x-shopid"] ||
    low.includes("myshopify.com") ||
    low.includes("cdn.shopify.com") ||
    low.includes("shopifycdn")
  ) {
    detected.push({
      name: "Shopify",
      confidence: "high",
      category: "ecommerce",
    });
  }

  /* WooCommerce (WordPress) */
  if (
    low.includes("woocommerce") ||
    low.includes("wc-add-to-cart") ||
    html.includes("wc_cart_fragments")
  ) {
    detected.push({
      name: "WooCommerce",
      confidence: "high",
      category: "ecommerce",
    });
  }

  /* React */
  if (
    html.includes('id="__next"') ||
    html.includes("data-reactroot") ||
    html.includes("react.production.min.js") ||
    html.includes("react.development.js") ||
    /react\.umd\.development\.js/.test(html)
  ) {
    detected.push({
      name: "React",
      confidence: "high",
      category: "framework",
    });
  } else if (html.includes("react") && html.includes("jsx")) {
    detected.push({
      name: "React",
      confidence: "medium",
      category: "framework",
    });
  }

  /* Next.js */
  if (html.includes('id="__next"') || html.includes("/_next/static/")) {
    detected.push({
      name: "Next.js",
      confidence: "high",
      category: "framework",
    });
  }

  /* Vue */
  if (
    html.includes("vue.min.js") ||
    html.includes("vue.global.js") ||
    html.includes("data-v-") ||
    html.includes("__VUE__") ||
    html.includes('id="app"')
  ) {
    detected.push({
      name: "Vue.js",
      confidence: "high",
      category: "framework",
    });
  }

  /* Nuxt */
  if (html.includes('id="__nuxt"')) {
    detected.push({
      name: "Nuxt",
      confidence: "high",
      category: "framework",
    });
  }

  /* Angular */
  if (
    html.includes("ng-app") ||
    html.includes("_nghost") ||
    html.includes("angular.js") ||
    html.includes("@angular")
  ) {
    detected.push({
      name: "Angular",
      confidence: "high",
      category: "framework",
    });
  }

  /* Svelte / SvelteKit */
  if (html.includes("svelte") && html.includes("kit")) {
    detected.push({
      name: "SvelteKit",
      confidence: "medium",
      category: "framework",
    });
  } else if (html.includes("__svelte")) {
    detected.push({
      name: "Svelte",
      confidence: "high",
      category: "framework",
    });
  }

  /* WordPress */
  if (
    low.includes("wp-content") ||
    low.includes("wp-includes") ||
    low.includes("wp-json") ||
    h["x-powered-by"]?.includes("PHP")
  ) {
    detected.push({
      name: "WordPress",
      confidence: "high",
      category: "cms",
    });
  }

  /* Wix */
  if (
    low.includes("wix.com") ||
    low.includes("wix-bolt") ||
    low.includes("wixapps")
  ) {
    detected.push({
      name: "Wix",
      confidence: "high",
      category: "builder",
    });
  }

  /* Squarespace */
  if (
    low.includes("squarespace.com") ||
    low.includes("static1.squarespace.com")
  ) {
    detected.push({
      name: "Squarespace",
      confidence: "high",
      category: "builder",
    });
  }

  /* Webflow */
  if (
    html.includes("data-w-id") ||
    html.includes("data-wf-page") ||
    low.includes("webflow.com")
  ) {
    detected.push({
      name: "Webflow",
      confidence: "high",
      category: "builder",
    });
  }

  /* Gatsby */
  if (html.includes("___gatsby")) {
    detected.push({
      name: "Gatsby",
      confidence: "high",
      category: "framework",
    });
  }

  /* Django */
  if (
    h["server"]?.includes("WSGIServer") ||
    html.includes("csrfmiddlewaretoken") ||
    low.includes("django")
  ) {
    detected.push({
      name: "Django",
      confidence: "medium",
      category: "backend",
    });
  }

  /* Laravel */
  if (
    html.includes("laravel_session") ||
    h["set-cookie"]?.includes("laravel") ||
    low.includes("laravel")
  ) {
    detected.push({
      name: "Laravel",
      confidence: "medium",
      category: "backend",
    });
  }

  /* Ruby on Rails */
  if (
    html.includes("csrf-param") ||
    html.includes('name="csrf-token"') ||
    low.includes("rails")
  ) {
    detected.push({
      name: "Ruby on Rails",
      confidence: "medium",
      category: "backend",
    });
  }

  /* Express / Node */
  if (h["x-powered-by"]?.includes("Express")) {
    detected.push({
      name: "Express.js",
      confidence: "high",
      category: "backend",
    });
  }

  /* Astro */
  if (html.includes("data-astro-cid")) {
    detected.push({
      name: "Astro",
      confidence: "high",
      category: "framework",
    });
  }

  /* Remix */
  if (html.includes("__remixContext")) {
    detected.push({
      name: "Remix",
      confidence: "high",
      category: "framework",
    });
  }

  /* Primary = highest confidence framework/cms */
  const primary =
    detected.find((d) => d.confidence === "high")?.name || detected[0]?.name;

  return { detected, primary };
}

/* ─────────────── API CHECKER ─────────────── */

async function checkApiEndpoints(baseUrl: string): Promise<ApiCheck[]> {
  const endpoints = [
    "/api/health",
    "/health",
    "/api/status",
    "/status",
    "/api/v1/health",
    "/api/ping",
    "/api/ready",
    "/ready",
    "/api",
  ];

  const checks: ApiCheck[] = [];

  for (const ep of endpoints) {
    try {
      const start = Date.now();
      const ctrl = new AbortController();
      const tmr = setTimeout(() => ctrl.abort(), 5000);

      const res = await fetch(new URL(ep, baseUrl).href, {
        method: "GET",
        signal: ctrl.signal,
        headers: { "User-Agent": "PulseVault-DeepScan/1.0" },
      });
      clearTimeout(tmr);

      checks.push({
        endpoint: ep,
        status: res.status,
        ok: res.status < 400,
        responseTime: Date.now() - start,
      });
    } catch {
      checks.push({ endpoint: ep, status: 0, ok: false, responseTime: 0 });
    }
  }

  return checks;
}

/* ─────────────── HEADLESS BROWSER ─────────────── */

async function runHeadlessBrowser(url: string): Promise<{
  available: boolean;
  errors: RuntimeError[];
  crashed: boolean;
}> {
  try {
    const puppeteer = await import("puppeteer-core");
    const chromiumMod = await import("@sparticuz/chromium");

    // Handle different export styles
    const chromium = (chromiumMod as any).default || chromiumMod;

    const args = chromium.args || [
      "--disable-dev-shm-usage",
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ];

    const executablePath =
      (await chromium.executablePath?.()) ||
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      "";

    const headless = chromium.headless || true;

    if (!executablePath) {
      console.log("[DeepScan] No Chromium executable found, skipping headless");
      return { available: false, errors: [], crashed: false };
    }

    const browser = await puppeteer.launch({
      args,
      executablePath,
      headless,
      defaultViewport: { width: 1280, height: 720 },
    });

    const page = await browser.newPage();
    const errors: RuntimeError[] = [];
    let crashed = false;

    page.on("console", (msg: any) => {
      if (msg.type() === "error") {
        errors.push({ type: "console.error", message: msg.text() });
      }
    });

    page.on("pageerror", (err: any) => {
      errors.push({ type: "pageerror", message: err.message });
      crashed = true;
    });

    page.on("requestfailed", (req: any) => {
      errors.push({
        type: "requestfailed",
        message: `${req.url()} — ${req.failure()?.errorText || "unknown"}`,
      });
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });

    const bodyText = await page.evaluate(
      () => document.body?.innerText?.trim() || "",
    );
    const hasRoot = await page.evaluate(
      () =>
        !!document.getElementById("root") ||
        !!document.getElementById("__next") ||
        !!document.getElementById("__nuxt") ||
        !!document.getElementById("app"),
    );

    if (bodyText.length < 30 && hasRoot) {
      crashed = true;
    }

    const inlineErrors = await page.evaluate(() => {
      let count = 0;
      document.querySelectorAll("script:not([src])").forEach((s) => {
        const text = s.textContent || "";
        count += (text.match(/console\.error\s*\(/g) || []).length;
        count += (
          text.match(/throw\s+new\s+(?:Error|TypeError|ReferenceError)/g) || []
        ).length;
      });
      return count;
    });

    if (inlineErrors > 0 && !crashed) {
      errors.push({
        type: "console.error",
        message: `${inlineErrors} inline script error patterns detected`,
      });
    }

    await browser.close();

    return { available: true, errors, crashed };
  } catch (err: any) {
    console.log(`[DeepScan] Headless skipped: ${err.message}`);
    return { available: false, errors: [], crashed: false };
  }
}

/* ─────────────── HTML PARSERS ─────────────── */

function parseHtml(html: string, baseUrl: string, result: DeepScanResult) {
  const baseDomain = new URL(baseUrl).hostname;

  /* Images */
  const imgUrls: string[] = [];
  const srcRe = /src\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = srcRe.exec(html)) !== null) {
    try {
      const u = new URL(m[1], baseUrl).href;
      if (
        u.startsWith("http") &&
        /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(u)
      ) {
        imgUrls.push(u);
      }
    } catch {}
  }

  /* Links */
  const links = new Set<string>();
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || html;
  const aRe = /<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  while ((m = aRe.exec(body)) !== null) {
    try {
      const u = new URL(m[1], baseUrl).href;
      if (u.startsWith("http")) {
        const d = new URL(u).hostname;
        if (d === baseDomain || links.size < MAX_LINKS / 2) links.add(u);
      }
    } catch {}
  }
  result.links.total = links.size;
  result.links.list = Array.from(links).map((url) => ({
    url,
    status: 0,
    ok: true,
  }));

  /* Forms */
  const forms: DeepScanResult["forms"]["list"] = [];
  const fRe = /<form[^>]*>/gi;
  let fm;
  while ((fm = fRe.exec(html)) !== null) {
    const tag = fm[0];
    forms.push({
      selector: tag.slice(0, 60),
      hasAction: tag.includes("action"),
      hasMethod: tag.includes("method"),
    });
  }
  result.forms.total = forms.length;
  result.forms.list = forms;
  result.forms.working =
    forms.length === 0 || forms.every((f) => f.hasAction && f.hasMethod);
  if (!result.forms.working && forms.length > 0) {
    result.consoleErrors.push(
      `${forms.filter((f) => !f.hasAction || !f.hasMethod).length} form(s) missing action or method`,
    );
  }

  /* WordPress plugins only */
  const pRe = /\/wp-content\/plugins\/([^\/]+)\//gi;
  while ((m = pRe.exec(html)) !== null) {
    const name = m[1];
    if (
      /^[a-zA-Z0-9\-_]{3,80}$/.test(name) &&
      !result.plugins.detected.includes(name)
    ) {
      result.plugins.detected.push(name);
    }
  }
}

/* ─────────────── LINK CHECKER ─────────────── */

async function checkLinks(result: DeepScanResult, scanStart: number) {
  const chunkSize = 5;
  for (let i = 0; i < result.links.list.length; i += chunkSize) {
    if (Date.now() - scanStart > MAX_SCAN_MS) break;

    const chunk = result.links.list.slice(i, i + chunkSize);
    await Promise.allSettled(
      chunk.map(async (link) => {
        try {
          const ctrl = new AbortController();
          setTimeout(() => ctrl.abort(), LINK_TIMEOUT);

          let res = await fetch(link.url, {
            method: "HEAD",
            signal: ctrl.signal,
            headers: { "User-Agent": "PulseVault-DeepScan/1.0" },
          });

          if (res.status === 405) {
            const ctrl2 = new AbortController();
            setTimeout(() => ctrl2.abort(), LINK_TIMEOUT);
            res = await fetch(link.url, {
              method: "GET",
              signal: ctrl2.signal,
              headers: { "User-Agent": "PulseVault-DeepScan/1.0" },
            });
          }

          link.status = res.status;
          if (res.status === 403 || res.status === 401) {
            link.ok = true;
            link.protected = true;
            result.links.protected++;
          } else {
            link.ok = res.status < 400;
            if (!link.ok) result.links.broken++;
          }
        } catch {
          link.status = 0;
          link.ok = false;
          result.links.broken++;
        }
      }),
    );
  }
}

/* ─────────────── PLUGIN ASSET CHECKER ─────────────── */

async function checkPluginAssets(
  result: DeepScanResult,
  origin: string,
  scanStart: number,
) {
  for (const name of result.plugins.detected) {
    if (Date.now() - scanStart > MAX_SCAN_MS) break;
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), LINK_TIMEOUT);
      const res = await fetch(`${origin}/wp-content/plugins/${name}/`, {
        method: "HEAD",
        signal: ctrl.signal,
        headers: { "User-Agent": "PulseVault-DeepScan/1.0" },
      });
      if (res.status === 404 && !result.plugins.broken.includes(name)) {
        result.plugins.broken.push(name);
      }
    } catch {
      if (!result.plugins.broken.includes(name))
        result.plugins.broken.push(name);
    }
  }
}

/* ─────────────── MIXED CONTENT ─────────────── */

function checkMixedContent(
  html: string,
  baseUrl: string,
): { hasMixed: boolean; urls: string[] } {
  if (!baseUrl.startsWith("https://")) return { hasMixed: false, urls: [] };

  const clean = html.replace(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
    "",
  );
  const urls: string[] = [];
  const re = /\b(src|srcset|action)\s*=\s*["'](http:\/\/[^"']+)["']/gi;
  let m;
  while ((m = re.exec(clean)) !== null) {
    const u = m[2];
    if (/schema\.org|w3\.org|xmlns|ogp\.me/.test(u)) continue;
    urls.push(u);
  }
  return { hasMixed: urls.length > 0, urls };
}

/* ─────────────── PERFORMANCE ─────────────── */

function calcPerfScore(loadTime: number, pageSize: number): number {
  let s = 100;
  if (loadTime > 500) s -= 5;
  if (loadTime > 1000) s -= 10;
  if (loadTime > 2000) s -= 15;
  if (loadTime > 3000) s -= 15;
  if (loadTime > 5000) s -= 15;
  if (loadTime > 8000) s -= 15;
  if (loadTime > 10000) s -= 10;
  if (loadTime > 15000) s -= 10;

  const kb = pageSize / 1024;
  if (kb > 500) s -= 5;
  if (kb > 1000) s -= 10;
  if (kb > 2000) s -= 10;
  if (kb > 5000) s -= 10;

  return Math.max(0, Math.round(s));
}

/* ─────────────── HEALTH SCORE ─────────────── */

function calcHealthScore(r: DeepScanResult) {
  let s = 100;

  if (r.httpStatus >= 500) {
    s -= 50;
    r.status = "critical";
  } else if (r.httpStatus >= 400) {
    s -= 40;
    r.status = "warning";
  }

  if (r.httpStatus < 400) {
    if (r.links.total > 0) {
      s -= Math.min(25, (r.links.broken / r.links.total) * 25);
    }
    s -= Math.min(15, r.plugins.broken.length * 5);
    if (r.forms.total > 0 && !r.forms.working) s -= 15;
    if (r.mixedContent) s -= 10;

    const sec = Object.values(r.securityHeaders).filter(Boolean).length;
    s += sec * 2;

    const apiOk = r.apiChecks.filter((a) => a.ok).length;
    const apiTotal = r.apiChecks.length;
    if (apiTotal > 0) {
      s -= Math.min(15, (1 - apiOk / apiTotal) * 15);
    }

    if (r.runtimeErrors.length > 0) {
      s -= Math.min(20, r.runtimeErrors.length * 3);
    }
    if (r.spaCrashes) s -= 25;

    const pf = r.performance.score / 100;
    s = Math.round(s * (0.7 + 0.3 * pf));

    if (s < 30) r.status = "critical";
    else if (s < 60) r.status = "warning";
    else if (s < 80) r.status = "warning";
    else r.status = "healthy";
  }

  r.healthScore = Math.max(0, Math.min(100, Math.round(s)));
}
