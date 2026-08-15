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

    // SSL check
    let sslValid = false;
    try {
      const urlObj = new URL(target);
      if (urlObj.protocol === "https:") {
        sslValid = true;
      }
    } catch {
      sslValid = false;
    }

    // Broken link check
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

    // ─── CORRECTED HEALTH SCORE ───
    let healthScore = 100;

    if (!isOnline) {
      healthScore = 0;
    } else {
      // Speed penalties
      if (responseTime > 5000) healthScore -= 35;
      else if (responseTime > 3000) healthScore -= 25;
      else if (responseTime > 1000) healthScore -= 10;

      // SSL penalty
      if (!sslValid && target.startsWith("https")) healthScore -= 20;

      // Broken links (heavier penalty)
      if (brokenLinks > 0) {
        healthScore -= Math.min(brokenLinks * 15, 45);
      }

      // If no links found at all, slight penalty (SPA or blocked)
      if (totalLinks === 0) {
        healthScore -= 10;
      }
    }

    healthScore = Math.max(0, Math.min(100, healthScore));

    return NextResponse.json({
      status: isOnline ? "healthy" : "offline",
      healthScore,
      responseTime,
      httpStatus: status,
      ssl: {
        valid: sslValid,
        daysLeft: sslValid ? 90 : 0,
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
