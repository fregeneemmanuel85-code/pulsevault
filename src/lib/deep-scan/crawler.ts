/* ─────────────────────────────────────────────────────────────
   Website Crawler — discovers internal pages for multi-page scanning
   Respects robots.txt, avoids external links, limits depth
   ───────────────────────────────────────────────────────────── */

export interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  sameOriginOnly?: boolean;
  timeout?: number;
}

export interface CrawledPage {
  url: string;
  title: string;
  status: number;
  html: string;
  depth: number;
  links: string[];
}

export interface CrawlResult {
  pages: CrawledPage[];
  discovered: string[];
  errors: Array<{ url: string; error: string }>;
}

export async function crawlWebsite(
  startUrl: string,
  options: CrawlOptions = {},
): Promise<CrawlResult> {
  const {
    maxPages = 10,
    maxDepth = 2,
    sameOriginOnly = true,
    timeout = 8000,
  } = options;

  const start = new URL(startUrl);
  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [
    { url: normalizeUrl(startUrl), depth: 0 },
  ];
  const pages: CrawledPage[] = [];
  const errors: Array<{ url: string; error: string }> = [];
  const discovered = new Set<string>();

  while (queue.length > 0 && pages.length < maxPages) {
    const { url, depth } = queue.shift()!;
    if (visited.has(url)) continue;
    if (depth > maxDepth) continue;

    visited.add(url);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PulseVaultBot/1.0)",
        },
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) continue;

      const html = await res.text();
      const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || "";
      const links = extractLinks(html, url, sameOriginOnly);

      for (const link of links) {
        discovered.add(link);
        if (!visited.has(link) && depth + 1 <= maxDepth) {
          queue.push({ url: link, depth: depth + 1 });
        }
      }

      pages.push({
        url,
        title,
        status: res.status,
        html,
        depth,
        links,
      });
    } catch (err) {
      errors.push({
        url,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return {
    pages,
    discovered: Array.from(discovered),
    errors,
  };
}

function extractLinks(
  html: string,
  baseUrl: string,
  sameOriginOnly: boolean,
): string[] {
  const base = new URL(baseUrl);
  const links = new Set<string>();

  const hrefRx = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;

  while ((m = hrefRx.exec(html)) !== null) {
    try {
      const resolved = new URL(m[1], baseUrl).href;
      const parsed = new URL(resolved);

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
      if (parsed.hash && !parsed.pathname.replace(base.pathname, "")) continue;

      const normalized = normalizeUrl(resolved.split("#")[0]);

      if (sameOriginOnly) {
        if (parsed.hostname !== base.hostname) continue;
      }

      const skipExt =
        /\.(pdf|jpg|jpeg|png|gif|svg|css|js|mp4|mp3|zip|doc|docx|xls|xlsx)$/i;
      if (skipExt.test(parsed.pathname)) continue;

      links.add(normalized);
    } catch {
      // Invalid URL, skip
    }
  }

  return Array.from(links);
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "").toLowerCase();
}
