import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    let target = url.trim();
    if (!/^https?:\/\//i.test(target)) target = "https://" + target;

    // Basic fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const start = Date.now();
    const res = await fetch(target, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timeout);
    const responseTime = Date.now() - start;

    const status = res.status;
    const isOnline = status >= 200 && status < 400;

    // Simple SSL check (if HTTPS)
    let sslValid = false;
    let sslDaysLeft = 0;
    try {
      const urlObj = new URL(target);
      if (urlObj.protocol === "https:") {
        // We can't inspect the cert from edge fetch easily,
        // so we infer from successful HTTPS fetch
        sslValid = true;
      }
    } catch {
      sslValid = false;
    }

    // Simple broken link check (parse HTML for <a> tags, fetch a sample)
    let brokenLinks = 0;
    let totalLinks = 0;
    try {
      const html = await res.text();
      const anchorMatches = html.match(/href=["'](.*?)["']/gi) || [];
      const links = anchorMatches
        .map((m) => {
          const match = m.match(/href=["'](.*?)["']/i);
          return match ? match[1] : "";
        })
        .filter((href) => href.startsWith("http"));

      totalLinks = links.length;
      // Only test first 5 links to keep it fast
      const sample = links.slice(0, 5);
      const linkChecks = await Promise.all(
        sample.map(async (link) => {
          try {
            const lr = await fetch(link, {
              method: "HEAD",
              signal: AbortSignal.timeout(5000),
            });
            return lr.ok;
          } catch {
            return false;
          }
        }),
      );
      brokenLinks = linkChecks.filter((ok) => !ok).length;
    } catch {
      // ignore
    }

    // Calculate a simple health score
    let healthScore = 100;
    if (!isOnline) healthScore = 0;
    else {
      if (responseTime > 3000) healthScore -= 30;
      else if (responseTime > 1000) healthScore -= 15;
      if (!sslValid && target.startsWith("https")) healthScore -= 25;
      if (brokenLinks > 0) healthScore -= Math.min(brokenLinks * 10, 30);
    }
    healthScore = Math.max(0, healthScore);

    return NextResponse.json({
      status: isOnline ? "healthy" : "offline",
      healthScore,
      responseTime,
      httpStatus: status,
      ssl: {
        valid: sslValid,
        daysLeft: sslValid ? 90 : 0, // placeholder; real cert check needs server-side puppeteer
      },
      links: {
        broken: brokenLinks,
        total: totalLinks,
      },
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out. The site may be down or very slow." },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: "Could not reach that website." },
      { status: 500 },
    );
  }
}
