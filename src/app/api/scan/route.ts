import { NextRequest, NextResponse } from "next/server";
import { runBrowserScan } from "@/lib/deep-scan/browser-scanner";
import { calculatePerformanceScore } from "@/lib/deep-scan/performance-scorer";
import {
  detectTechStack,
  type TechStackInput,
  type TechDetection,
} from "@/lib/deep-scan/tech-detector";
import { runMultiPageScan } from "@/lib/deep-scan/multi-page-scanner";

/* ─── Types (preserves existing API contract) ─── */
interface SecurityCheck {
  name: string;
  status: "pass" | "fail" | "warning" | "info";
  details?: string;
}

interface SeoCheck {
  name: string;
  status: "pass" | "fail" | "warning" | "info";
  details?: string;
}

interface ScanFormItem {
  selector: string;
  source: string;
  action: string;
  method: string;
  inputs: number;
  buttons: number;
  note?: string;
  pageUrl?: string;
}

interface ScanTechItem {
  name: string;
  confidence?: string;
  evidence?: string[];
}

interface ScanResult {
  url: string;
  domain: string;
  timestamp: string;
  security: { score: number; checks: SecurityCheck[] };
  seo: { score: number; checks: SeoCheck[] };
  performance: {
    score: number;
    metrics: Record<string, any>;
  };
  forms: {
    count: number;
    items: ScanFormItem[];
  };
  techStack: ScanTechItem[];
  plugins: Array<{ name: string; confidence: string }>;
  diagnostics: {
    pageSize: string;
    responseTime: string;
    loadTime: string;
    consoleErrors: number;
    pagesScanned?: number;
    totalDiscovered?: number;
  };
}

export async function POST(req: NextRequest) {
  try {
    const { url, deep = false, multiPage = false } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const normalizedUrl = normalizeUrl(url);
    const domain = new URL(normalizedUrl).hostname;

    /* ── Multi-page scan (NEW) ── */
    if (multiPage && deep) {
      const multiResult = await runMultiPageScan(normalizedUrl, {
        deep: true,
        crawl: { maxPages: 8, maxDepth: 2 },
      });

      // Run basic security/seo on homepage only (fast)
      const basic = await runBasicScan(normalizedUrl);

      const result: ScanResult = {
        url: normalizedUrl,
        domain,
        timestamp: new Date().toISOString(),
        security: basic.security,
        seo: basic.seo,
        performance: {
          score: multiResult.performance.score,
          metrics: multiResult.performance.metrics,
        },
        forms: {
          count: multiResult.forms.count,
          items: multiResult.forms.items.map(
            (f: {
              selector: string;
              source: string;
              action: string;
              method: string;
              inputs: number;
              buttons: number;
              note?: string;
            }) => ({
              selector: f.selector,
              source: f.source,
              action: f.action,
              method: f.method,
              inputs: f.inputs,
              buttons: f.buttons,
              note: f.note,
              pageUrl: multiResult.forms.byPage.find(
                (p: {
                  url: string;
                  forms: Array<{ selector: string; action: string }>;
                }) =>
                  p.forms.some(
                    (pf: { selector: string; action: string }) =>
                      pf.selector === f.selector && pf.action === f.action,
                  ),
              )?.url,
            }),
          ),
        },
        techStack: multiResult.techStack.map((t: TechDetection) => ({
          name: t.name,
          confidence: t.confidence,
          evidence: t.evidence,
        })),
        plugins: detectWordPressPlugins(basic.html),
        diagnostics: {
          pageSize: multiResult.diagnostics.avgPageSize,
          responseTime: multiResult.diagnostics.avgResponseTime,
          loadTime: multiResult.diagnostics.avgLoadTime,
          consoleErrors: multiResult.diagnostics.totalConsoleErrors,
          pagesScanned: multiResult.pagesScanned,
          totalDiscovered: multiResult.totalDiscovered,
        },
      };

      return NextResponse.json(result);
    }

    /* ── Single-page scan (existing logic) ── */
    const basic = await runBasicScan(normalizedUrl);
    const browserData = deep ? await runBrowserScan(normalizedUrl) : null;

    const techInput: TechStackInput = {
      url: normalizedUrl,
      initialHtml: basic.html,
      renderedHtml: browserData?.renderedHtml || basic.html,
      scripts: browserData?.scripts || basic.scripts,
      stylesheets: browserData?.stylesheets || basic.stylesheets,
      globals: browserData?.globals || {},
      resourceUrls: browserData?.resourceUrls || [
        ...basic.scripts,
        ...basic.stylesheets,
      ],
      headers: basic.headers,
    };
    const techStack = detectTechStack(techInput);

    let performanceReport = basic.performance;
    if (browserData?.performance) {
      performanceReport = calculatePerformanceScore({
        fcp: browserData.performance.fcp,
        si: browserData.performance.speedIndex,
        lcp: browserData.performance.lcp,
        tbt: browserData.performance.tbt,
        cls: browserData.performance.cls,
        pageSize: browserData.performance.pageSize,
        responseTime: browserData.performance.responseTime,
        loadTime: browserData.performance.loadTime,
      });
    }

    const allForms: ScanFormItem[] = [...basic.forms];
    if (browserData?.forms) {
      for (const bForm of browserData.forms) {
        const dup = allForms.some(
          (f: ScanFormItem) =>
            f.action === bForm.action &&
            f.method === bForm.method &&
            f.inputs === bForm.inputs &&
            f.source === bForm.source,
        );
        if (!dup) {
          allForms.push({
            selector: bForm.selector,
            source: bForm.source,
            action: bForm.action,
            method: bForm.method,
            inputs: bForm.inputs,
            buttons: bForm.buttons,
            note: bForm.note,
          });
        }
      }
    }

    const result: ScanResult = {
      url: normalizedUrl,
      domain,
      timestamp: new Date().toISOString(),
      security: basic.security,
      seo: basic.seo,
      performance: {
        score: performanceReport.score,
        metrics: performanceReport.metrics,
      },
      forms: {
        count: allForms.length,
        items: allForms,
      },
      techStack: techStack.map((t: TechDetection) => ({
        name: t.name,
        confidence: t.confidence,
        evidence: t.evidence,
      })),
      plugins: detectWordPressPlugins(basic.html),
      diagnostics: {
        pageSize: performanceReport.metrics.pageSize.display,
        responseTime: performanceReport.metrics.responseTime.display,
        loadTime: performanceReport.metrics.loadTime.display,
        consoleErrors: browserData?.consoleErrors.length || 0,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Scan API] Error:", error);
    return NextResponse.json(
      {
        error: "Scan failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/* ═══════════════════════════════════════════════════════
   BASIC SCAN (existing functionality preserved)
   ═══════════════════════════════════════════════════════ */

async function runBasicScan(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    redirect: "follow",
  });

  const html = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((v: string, k: string) => (headers[k] = v));

  /* Security */
  const secChecks: SecurityCheck[] = [];
  secChecks.push({
    name: "HTTPS",
    status: url.startsWith("https") ? "pass" : "fail",
    details: url.startsWith("https") ? "Encrypted connection" : "Plain HTTP",
  });
  const secMap: Record<string, string> = {
    "strict-transport-security": "HSTS",
    "content-security-policy": "CSP",
    "x-frame-options": "X-Frame-Options",
    "x-content-type-options": "X-Content-Type-Options",
    "referrer-policy": "Referrer-Policy",
    "permissions-policy": "Permissions-Policy",
  };
  for (const [h, name] of Object.entries(secMap)) {
    if (headers[h])
      secChecks.push({ name, status: "pass", details: "Present" });
    else secChecks.push({ name, status: "warning", details: "Missing" });
  }
  const secScore = Math.round(
    (secChecks.filter((c: SecurityCheck) => c.status === "pass").length /
      secChecks.length) *
      100,
  );

  /* SEO */
  const seoChecks: SeoCheck[] = [];
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
  seoChecks.push({
    name: "Title Tag",
    status: title && title.length > 0 ? "pass" : "fail",
    details: title ? `Title: ${title}` : "Missing",
  });
  const desc = html
    .match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i,
    )?.[1]
    ?.trim();
  seoChecks.push({
    name: "Meta Description",
    status: desc && desc.length > 0 ? "pass" : "warning",
    details: desc ? `Description: ${desc.slice(0, 100)}...` : "Missing",
  });
  const h1 = html.match(/<h1[^>]*>([^<]*)<\/h1>/i)?.[1]?.trim();
  seoChecks.push({
    name: "H1 Tag",
    status: h1 && h1.length > 0 ? "pass" : "warning",
    details: h1 ? `H1: ${h1}` : "Missing",
  });
  const canonical = html.match(
    /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i,
  )?.[1];
  seoChecks.push({
    name: "Canonical URL",
    status: canonical ? "pass" : "warning",
    details: canonical ? `Canonical: ${canonical}` : "Missing",
  });
  const viewport = html.match(
    /<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']*)["']/i,
  )?.[1];
  seoChecks.push({
    name: "Viewport Meta",
    status: viewport ? "pass" : "warning",
    details: viewport ? "Configured" : "Missing",
  });
  const seoScore = Math.round(
    (seoChecks.filter((c: SeoCheck) => c.status === "pass").length /
      seoChecks.length) *
      100,
  );

  /* Basic forms from raw HTML */
  const forms: Array<{
    selector: string;
    source: "HTML" | "JavaScript-rendered" | "iframe" | "iframe-cross-origin";
    action: string;
    method: string;
    inputs: number;
    buttons: number;
    note?: string;
  }> = [];
  const formRx = /<form[^>]*>/gi;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = formRx.exec(html)) !== null) {
    const tag = m[0];
    const action = tag.match(/action=["']([^"']*)["']/i)?.[1] || "";
    const method = tag.match(/method=["']([^"']*)["']/i)?.[1] || "get";
    const start = m.index;
    const end = html.indexOf("</form>", start);
    const slice = html.slice(start, end > -1 ? end : start + 800);
    const inputs =
      (slice.match(/<input/gi) || []).length +
      (slice.match(/<textarea/gi) || []).length +
      (slice.match(/<select/gi) || []).length;
    const buttons =
      (slice.match(/<button[^>]*type=["']submit["']/gi) || []).length +
      (slice.match(/<input[^>]*type=["']submit["']/gi) || []).length;
    forms.push({
      selector: `form:nth-of-type(${++idx})`,
      source: "HTML",
      action,
      method,
      inputs,
      buttons,
    });
  }

  /* Resources */
  const scripts: string[] = [];
  const sRx = /<script[^>]*src=["']([^"']*)["']/gi;
  while ((m = sRx.exec(html)) !== null) scripts.push(m[1]);
  const stylesheets: string[] = [];
  const lRx = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']*)["']/gi;
  while ((m = lRx.exec(html)) !== null) stylesheets.push(m[1]);

  /* Fallback performance when no browser scan */
  const pageSize = new Blob([html]).size;
  const fallbackPerf = calculatePerformanceScore({
    fcp: 0,
    si: 0,
    lcp: 0,
    tbt: 0,
    cls: 0,
    pageSize,
    responseTime: 0,
    loadTime: 0,
  });
  fallbackPerf.score = 0;
  fallbackPerf.metrics.fcp.display = "N/A";
  fallbackPerf.metrics.si.display = "N/A";
  fallbackPerf.metrics.lcp.display = "N/A";
  fallbackPerf.metrics.tbt.display = "N/A";
  fallbackPerf.metrics.cls.display = "N/A";

  return {
    html,
    headers,
    security: { score: secScore, checks: secChecks },
    seo: { score: seoScore, checks: seoChecks },
    performance: fallbackPerf,
    forms,
    scripts,
    stylesheets,
  };
}

function detectWordPressPlugins(
  html: string,
): Array<{ name: string; confidence: string }> {
  const plugins: Array<{ name: string; confidence: string }> = [];
  const sigs = [
    { name: "Yoast SEO", patterns: [/yoast-seo|yoast\/seo/i] },
    { name: "WooCommerce", patterns: [/woocommerce|wc-add-to-cart|wc-cart/i] },
    { name: "Elementor", patterns: [/elementor|elementor-frontend/i] },
    { name: "Contact Form 7", patterns: [/contact-form-7|wpcf7/i] },
    { name: "WP Rocket", patterns: [/wp-rocket|rocket-lazyload/i] },
  ];
  for (const p of sigs) {
    if (p.patterns.some((rx: RegExp) => rx.test(html))) {
      plugins.push({ name: p.name, confidence: "HIGH" });
    }
  }
  return plugins;
}

function normalizeUrl(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}
