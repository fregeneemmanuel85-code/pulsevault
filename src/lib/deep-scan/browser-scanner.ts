/* ─────────────────────────────────────────────────────────────
   Deep Scan Browser — Chromium headless scan for:
   • Lighthouse-style Performance (FCP, SI, LCP, TBT, CLS)
   • JavaScript-rendered form detection
   • Resource collection for tech-stack evidence
   ───────────────────────────────────────────────────────────── */

import type { Browser, Page } from "playwright";

export interface BrowserForm {
  selector: string;
  source: "HTML" | "JavaScript-rendered" | "iframe" | "iframe-cross-origin";
  action: string;
  method: string;
  inputs: number;
  buttons: number;
  note?: string;
}

export interface BrowserPerformance {
  fcp: number;
  lcp: number;
  cls: number;
  tbt: number;
  speedIndex: number;
  loadTime: number;
  pageSize: number;
  responseTime: number;
}

export interface BrowserScanData {
  performance: BrowserPerformance;
  forms: BrowserForm[];
  scripts: string[];
  stylesheets: string[];
  globals: Record<string, boolean>;
  renderedHtml: string;
  initialHtml: string;
  consoleErrors: string[];
  resourceUrls: string[];
}

export async function runBrowserScan(
  url: string,
): Promise<BrowserScanData | null> {
  let playwright: typeof import("playwright") | null = null;

  try {
    playwright = await import("playwright");
  } catch {
    console.log("[BrowserScan] playwright not installed");
    return null;
  }

  let browser: Browser | null = null;

  try {
    browser = await playwright.chromium.launch({
      headless: true,
      defaultViewport: { width: 1366, height: 768 },
    } as any);

    const page = await browser.newPage();

    const scripts = new Set<string>();
    const stylesheets = new Set<string>();
    const resourceUrls = new Set<string>();
    const consoleErrors: string[] = [];

    page.on("request", (req) => {
      const u = req.url();
      resourceUrls.add(u);
      const rt = req.resourceType();
      if (rt === "script") scripts.add(u);
      if (rt === "stylesheet") stylesheets.add(u);
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });

    /* ── Navigate ── */
    const navStart = Date.now();
    const response = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 15000,
    });
    const loadTime = Date.now() - navStart;

    /* ── Let JS settle (LCP stabilization) ── */
    await page.waitForTimeout(3000);

    /* ── HTML snapshots ── */
    const initialHtml = response ? await response.text() : "";
    const renderedHtml = await page.content();

    /* ── Metrics ── */
    const perf = await collectWebVitals(page);
    const pageSize = await getTotalPageSize(page);
    const responseTime = await getResponseTime(page);

    /* ── Forms ── */
    const forms = await collectForms(page, initialHtml);

    /* ── Globals ── */
    const globals = await collectGlobals(page);

    return {
      performance: {
        fcp: perf.fcp,
        lcp: perf.lcp,
        cls: perf.cls,
        tbt: perf.tbt,
        speedIndex: perf.speedIndex,
        loadTime,
        pageSize,
        responseTime: responseTime || perf.responseTime,
      },
      forms,
      scripts: Array.from(scripts),
      stylesheets: Array.from(stylesheets),
      globals,
      renderedHtml,
      initialHtml,
      consoleErrors,
      resourceUrls: Array.from(resourceUrls),
    };
  } catch (err) {
    console.error("[BrowserScan] Error:", err);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/* ─── Helpers ─── */

async function getTotalPageSize(page: Page): Promise<number> {
  return page.evaluate(() => {
    const entries = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    return entries.reduce((sum, r) => sum + (r.transferSize || 0), 0);
  });
}

async function getResponseTime(page: Page): Promise<number> {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    return nav ? Math.round(nav.responseEnd - nav.startTime) : 0;
  });
}

async function collectWebVitals(page: Page) {
  return page.evaluate(() => {
    return new Promise<{
      fcp: number;
      lcp: number;
      cls: number;
      tbt: number;
      speedIndex: number;
      responseTime: number;
    }>((resolve) => {
      const data = {
        fcp: 0,
        lcp: 0,
        cls: 0,
        tbt: 0,
        speedIndex: 0,
        responseTime: 0,
      };

      try {
        const paints = performance.getEntriesByType(
          "paint",
        ) as PerformancePaintTiming[];
        const fcp = paints.find((e) => e.name === "first-contentful-paint");
        if (fcp) data.fcp = Math.round(fcp.startTime);
      } catch {}

      try {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length)
            data.lcp = Math.round(entries[entries.length - 1].startTime);
        }).observe({ type: "largest-contentful-paint", buffered: true } as any);
      } catch {}

      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any) {
            if (!entry.hadRecentInput) data.cls += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true } as any);
      } catch {}

      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any) {
            const blocking = entry.duration - 50;
            if (blocking > 0) data.tbt += blocking;
          }
        }).observe({ type: "longtask", buffered: true } as any);
      } catch {}

      try {
        const nav = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;
        if (nav)
          data.responseTime = Math.round(nav.responseEnd - nav.startTime);
      } catch {}

      setTimeout(() => {
        const nav = performance.timing;
        const dcl = Math.max(
          0,
          nav.domContentLoadedEventEnd - nav.navigationStart,
        );
        const load = Math.max(0, nav.loadEventEnd - nav.navigationStart);

        if (data.lcp > 0) {
          data.speedIndex = Math.round(
            data.fcp * 0.35 + data.lcp * 0.45 + dcl * 0.2,
          );
        } else {
          data.speedIndex = Math.round(
            data.fcp * 0.4 + dcl * 0.35 + load * 0.25,
          );
        }
        data.cls = Math.round(data.cls * 1000) / 1000;
        resolve(data);
      }, 2500);
    });
  });
}

async function collectForms(
  page: Page,
  initialHtml: string,
): Promise<BrowserForm[]> {
  return page.evaluate((initialHtmlSnapshot: string) => {
    type FormSource =
      | "HTML"
      | "JavaScript-rendered"
      | "iframe"
      | "iframe-cross-origin";

    const results: Array<{
      selector: string;
      source: FormSource;
      action: string;
      method: string;
      inputs: number;
      buttons: number;
      note?: string;
    }> = [];

    const parser = new DOMParser();
    const initialDoc = parser.parseFromString(initialHtmlSnapshot, "text/html");
    const initialForms = Array.from(initialDoc.querySelectorAll("form"));
    const initialSigs = initialForms.map((f) => {
      const action = f.getAttribute("action") || "";
      const method = f.getAttribute("method") || "get";
      const inputs = f.querySelectorAll("input, textarea, select").length;
      return `${action}|${method}|${inputs}`;
    });

    function isInitialForm(form: HTMLFormElement): boolean {
      const action = form.getAttribute("action") || "";
      const method = form.getAttribute("method") || "get";
      const inputs = form.querySelectorAll("input, textarea, select").length;
      return initialSigs.includes(`${action}|${method}|${inputs}`);
    }

    /* 1. Main document <form> elements */
    document.querySelectorAll("form").forEach((form, idx) => {
      const source: FormSource = isInitialForm(form)
        ? "HTML"
        : "JavaScript-rendered";
      const id = form.id ? `#${form.id}` : "";
      const cls =
        form.className && typeof form.className === "string"
          ? `.${form.className.split(" ")[0]}`
          : "";
      const tag = form.tagName.toLowerCase();
      const selector = id || cls || `${tag}:nth-of-type(${idx + 1})`;

      results.push({
        selector,
        source,
        action: form.getAttribute("action") || "",
        method: form.getAttribute("method") || "get",
        inputs: form.querySelectorAll("input, textarea, select").length,
        buttons: form.querySelectorAll(
          'button[type="submit"], input[type="submit"]',
        ).length,
      });
    });

    /* 2. Iframes */
    document.querySelectorAll("iframe").forEach((iframe, idx) => {
      try {
        const idoc = iframe.contentDocument;
        if (idoc) {
          idoc.querySelectorAll("form").forEach((form, j) => {
            results.push({
              selector: `iframe:nth-of-type(${idx + 1}) > form:nth-of-type(${j + 1})`,
              source: "iframe",
              action: form.getAttribute("action") || "",
              method: form.getAttribute("method") || "get",
              inputs: form.querySelectorAll("input, textarea, select").length,
              buttons: form.querySelectorAll(
                'button[type="submit"], input[type="submit"]',
              ).length,
            });
          });
        } else {
          results.push({
            selector: `iframe:nth-of-type(${idx + 1})`,
            source: "iframe-cross-origin",
            action: "",
            method: "",
            inputs: 0,
            buttons: 0,
            note: "Cross-origin or sandboxed iframe — content could not be inspected",
          });
        }
      } catch {
        results.push({
          selector: `iframe:nth-of-type(${idx + 1})`,
          source: "iframe-cross-origin",
          action: "",
          method: "",
          inputs: 0,
          buttons: 0,
          note: "Cross-origin iframe — forms could not be inspected",
        });
      }
    });

    /* 3. JS-rendered forms without <form> tags (React/Vue/Angular) */
    const checked = new Set<Element>();
    document
      .querySelectorAll(
        "div, section, article, main, aside, header, footer, nav",
      )
      .forEach((el) => {
        if (checked.has(el)) return;

        const submitBtn = el.querySelector(
          'button[type="submit"], input[type="submit"]',
        );
        const inputs = el.querySelectorAll(
          'input:not([type="hidden"]), textarea, select',
        );

        if (submitBtn && inputs.length >= 2 && el.tagName !== "FORM") {
          const inRealForm = el.closest("form");
          if (!inRealForm) {
            const tag = el.tagName.toLowerCase();
            const id = el.id ? `#${el.id}` : "";
            const cls =
              el.className && typeof el.className === "string"
                ? `.${el.className.split(" ")[0]}`
                : "";

            results.push({
              selector: `${tag}${id}${cls}`,
              source: "JavaScript-rendered",
              action: el.getAttribute("action") || "",
              method: el.getAttribute("method") || "",
              inputs: inputs.length,
              buttons: el.querySelectorAll(
                'button[type="submit"], input[type="submit"]',
              ).length,
            });

            el.querySelectorAll("*").forEach((c) => checked.add(c));
          }
        }
      });

    return results;
  }, initialHtml);
}

async function collectGlobals(page: Page): Promise<Record<string, boolean>> {
  const keys = [
    "React",
    "ReactDOM",
    "Vue",
    "angular",
    "Shopify",
    "jQuery",
    "bootstrap",
    "tailwind",
    "Next",
    "__NEXT_DATA__",
    "__NUXT__",
    "__remixContext",
    "___gatsby",
    "astro",
    "__sveltekit",
    "__WEBFLOW_CURRENCY_SETTINGS",
    "Webflow",
    "wp",
    "__SHOPIFY",
  ];

  return page.evaluate((keysToCheck) => {
    const out: Record<string, boolean> = {};
    for (const k of keysToCheck) {
      try {
        out[k] = k in window;
      } catch {
        out[k] = false;
      }
    }
    return out;
  }, keys);
}
