/* ─────────────────────────────────────────────────────────────
   Multi-Page Scanner — runs browser scan across multiple pages
   Aggregates forms, performance averages, and tech stack evidence
   ───────────────────────────────────────────────────────────── */

import { crawlWebsite, type CrawlOptions } from "./crawler";
import {
  runBrowserScan,
  type BrowserScanData,
  type BrowserForm,
} from "./browser-scanner";
import {
  calculatePerformanceScore,
  type RawMetrics,
} from "./performance-scorer";
import {
  detectTechStack,
  type TechStackInput,
  type TechDetection,
} from "./tech-detector";

export interface MultiPageScanOptions {
  crawl?: CrawlOptions;
  deep?: boolean;
}

export interface PageFormEntry {
  url: string;
  forms: BrowserForm[];
}

export interface MultiPageScanResult {
  url: string;
  pagesScanned: number;
  totalDiscovered: number;
  forms: {
    count: number;
    items: BrowserForm[];
    byPage: PageFormEntry[];
  };
  performance: {
    score: number;
    metrics: Record<string, any>;
    pageScores: Array<{ url: string; score: number }>;
  };
  techStack: TechDetection[];
  diagnostics: {
    avgPageSize: string;
    avgResponseTime: string;
    avgLoadTime: string;
    totalConsoleErrors: number;
  };
  crawlErrors: Array<{ url: string; error: string }>;
}

export async function runMultiPageScan(
  startUrl: string,
  options: MultiPageScanOptions = {},
): Promise<MultiPageScanResult> {
  const { crawl: crawlOpts = {}, deep = true } = options;

  /* 1. Crawl the site */
  const crawlResult = await crawlWebsite(startUrl, {
    maxPages: 8,
    maxDepth: 2,
    sameOriginOnly: true,
    ...crawlOpts,
  });

  /* 2. Scan each discovered page with the browser */
  const scanResults: Array<{ url: string; data: BrowserScanData | null }> = [];

  const pagesToScan = crawlResult.pages.slice(0, crawlOpts.maxPages || 8);

  for (const page of pagesToScan) {
    if (!deep) continue;
    const data = await runBrowserScan(page.url);
    scanResults.push({ url: page.url, data });
  }

  /* 3. Aggregate forms across all pages */
  const allForms: BrowserForm[] = [];
  const formsByPage: PageFormEntry[] = [];

  for (const { url, data } of scanResults) {
    if (!data) continue;
    const pageForms: BrowserForm[] = data.forms || [];
    formsByPage.push({ url, forms: pageForms });
    for (const form of pageForms) {
      const dup = allForms.some(
        (f: BrowserForm) =>
          f.selector === form.selector &&
          f.action === form.action &&
          f.method === form.method &&
          f.inputs === form.inputs,
      );
      if (!dup) {
        allForms.push(form);
      }
    }
  }

  /* 4. Aggregate performance across all pages */
  const perfMetrics: RawMetrics[] = [];
  const pageScores: Array<{ url: string; score: number }> = [];

  for (const { url, data } of scanResults) {
    if (!data?.performance) continue;
    perfMetrics.push({
      fcp: data.performance.fcp,
      si: data.performance.speedIndex,
      lcp: data.performance.lcp,
      tbt: data.performance.tbt,
      cls: data.performance.cls,
      pageSize: data.performance.pageSize,
      responseTime: data.performance.responseTime,
      loadTime: data.performance.loadTime,
    });
    const report = calculatePerformanceScore({
      fcp: data.performance.fcp,
      si: data.performance.speedIndex,
      lcp: data.performance.lcp,
      tbt: data.performance.tbt,
      cls: data.performance.cls,
      pageSize: data.performance.pageSize,
      responseTime: data.performance.responseTime,
      loadTime: data.performance.loadTime,
    });
    pageScores.push({ url, score: report.score });
  }

  let avgPerf = null;
  if (perfMetrics.length > 0) {
    const avg = (arr: number[]) =>
      arr.reduce((a: number, b: number) => a + b, 0) / arr.length;
    avgPerf = calculatePerformanceScore({
      fcp: avg(perfMetrics.map((m: RawMetrics) => m.fcp)),
      si: avg(perfMetrics.map((m: RawMetrics) => m.si)),
      lcp: avg(perfMetrics.map((m: RawMetrics) => m.lcp)),
      tbt: avg(perfMetrics.map((m: RawMetrics) => m.tbt)),
      cls: avg(perfMetrics.map((m: RawMetrics) => m.cls)),
      pageSize: avg(perfMetrics.map((m: RawMetrics) => m.pageSize)),
      responseTime: avg(perfMetrics.map((m: RawMetrics) => m.responseTime)),
      loadTime: avg(perfMetrics.map((m: RawMetrics) => m.loadTime)),
    });
  }

  /* 5. Aggregate tech stack evidence across all pages */
  const allScripts = new Set<string>();
  const allStylesheets = new Set<string>();
  const allGlobals: Record<string, boolean> = {};
  const allResources = new Set<string>();
  let combinedHtml = "";
  let combinedRendered = "";

  for (const { data } of scanResults) {
    if (!data) continue;
    data.scripts.forEach((s: string) => allScripts.add(s));
    data.stylesheets.forEach((s: string) => allStylesheets.add(s));
    data.resourceUrls.forEach((r: string) => allResources.add(r));
    combinedHtml += data.initialHtml;
    combinedRendered += data.renderedHtml;

    for (const [key, val] of Object.entries(data.globals)) {
      if (val) allGlobals[key] = true;
    }
  }

  for (const page of crawlResult.pages) {
    if (!scanResults.some((s: { url: string }) => s.url === page.url)) {
      combinedHtml += page.html;
    }
  }

  const techInput: TechStackInput = {
    url: startUrl,
    initialHtml: combinedHtml,
    renderedHtml: combinedRendered,
    scripts: Array.from(allScripts),
    stylesheets: Array.from(allStylesheets),
    globals: allGlobals,
    resourceUrls: Array.from(allResources),
  };

  const techStack: TechDetection[] = detectTechStack(techInput);

  /* 6. Assemble result */
  const totalConsoleErrors = scanResults.reduce(
    (sum: number, { data }: { data: BrowserScanData | null }) =>
      sum + (data?.consoleErrors.length || 0),
    0,
  );

  return {
    url: startUrl,
    pagesScanned: scanResults.filter(
      (s: { data: BrowserScanData | null }) => s.data,
    ).length,
    totalDiscovered: crawlResult.discovered.length,
    forms: {
      count: allForms.length,
      items: allForms,
      byPage: formsByPage.filter((p: PageFormEntry) => p.forms.length > 0),
    },
    performance: {
      score: avgPerf?.score || 0,
      metrics: avgPerf?.metrics || {},
      pageScores,
    },
    techStack,
    diagnostics: {
      avgPageSize: formatBytes(avgPerf?.metrics.pageSize?.value || 0),
      avgResponseTime: avgPerf?.metrics.responseTime?.display || "N/A",
      avgLoadTime: avgPerf?.metrics.loadTime?.display || "N/A",
      totalConsoleErrors,
    },
    crawlErrors: crawlResult.errors,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
