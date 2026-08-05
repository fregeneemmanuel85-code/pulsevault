export interface SEOIssue {
  type: "critical" | "warning" | "info";
  category:
    | "title"
    | "meta"
    | "headings"
    | "images"
    | "links"
    | "social"
    | "technical";
  message: string;
  recommendation: string;
}

export interface SEOMetrics {
  titleLength: number;
  metaDescriptionLength: number;
  h1Count: number;
  h2Count: number;
  imageWithoutAlt: number;
  totalImages: number;
  internalLinks: number;
  hasCanonical: boolean;
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  hasSchema: boolean;
  hasViewport: boolean;
  hasRobotsMeta: boolean;
}

export interface SEOResult {
  score: number;
  metrics: SEOMetrics;
  issues: SEOIssue[];
}

export function scanSEO(html: string, baseUrl: string): SEOResult {
  const issues: SEOIssue[] = [];
  const metrics: SEOMetrics = {
    titleLength: 0,
    metaDescriptionLength: 0,
    h1Count: 0,
    h2Count: 0,
    imageWithoutAlt: 0,
    totalImages: 0,
    internalLinks: 0,
    hasCanonical: false,
    hasOpenGraph: false,
    hasTwitterCard: false,
    hasSchema: false,
    hasViewport: false,
    hasRobotsMeta: false,
  };

  // Title
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch) {
    metrics.titleLength = titleMatch[1].trim().length;
    if (metrics.titleLength === 0) {
      issues.push({
        type: "critical",
        category: "title",
        message: "Title tag is empty",
        recommendation: "Add a descriptive title (50–60 characters)",
      });
    } else if (metrics.titleLength < 30) {
      issues.push({
        type: "warning",
        category: "title",
        message: `Title is too short (${metrics.titleLength} chars)`,
        recommendation: "Use 50–60 characters for optimal display",
      });
    } else if (metrics.titleLength > 70) {
      issues.push({
        type: "warning",
        category: "title",
        message: `Title is too long (${metrics.titleLength} chars)`,
        recommendation: "Keep under 60 characters to avoid truncation",
      });
    }
  } else {
    issues.push({
      type: "critical",
      category: "title",
      message: "Missing <title> tag",
      recommendation: "Every page must have a unique <title>",
    });
  }

  // Meta description
  const descMatch = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i,
  );
  if (descMatch) {
    metrics.metaDescriptionLength = descMatch[1].trim().length;
    if (metrics.metaDescriptionLength === 0) {
      issues.push({
        type: "warning",
        category: "meta",
        message: "Meta description is empty",
        recommendation: "Write a compelling description (150–160 chars)",
      });
    } else if (metrics.metaDescriptionLength < 120) {
      issues.push({
        type: "warning",
        category: "meta",
        message: `Meta description is short (${metrics.metaDescriptionLength} chars)`,
        recommendation: "Use 150–160 characters",
      });
    } else if (metrics.metaDescriptionLength > 160) {
      issues.push({
        type: "info",
        category: "meta",
        message: `Meta description is long (${metrics.metaDescriptionLength} chars)`,
        recommendation: "Keep under 160 characters",
      });
    }
  } else {
    issues.push({
      type: "critical",
      category: "meta",
      message: "Missing meta description",
      recommendation: "Add <meta name='description' content='...'>",
    });
  }

  // Headings
  const h1s = html.match(/<h1[^>]*>/gi) || [];
  const h2s = html.match(/<h2[^>]*>/gi) || [];
  metrics.h1Count = h1s.length;
  metrics.h2Count = h2s.length;

  if (metrics.h1Count === 0) {
    issues.push({
      type: "critical",
      category: "headings",
      message: "No H1 tag found",
      recommendation: "Use exactly one H1 per page",
    });
  } else if (metrics.h1Count > 1) {
    issues.push({
      type: "warning",
      category: "headings",
      message: `${metrics.h1Count} H1 tags detected`,
      recommendation: "Use only one H1 per page",
    });
  }

  // Images alt text
  const imgRegex = /<img[^>]*>/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    metrics.totalImages++;
    const hasAlt = /alt\s*=\s*["'][^"']*["']/i.test(imgMatch[0]);
    if (!hasAlt) metrics.imageWithoutAlt++;
  }
  if (metrics.imageWithoutAlt > 0) {
    issues.push({
      type: "warning",
      category: "images",
      message: `${metrics.imageWithoutAlt} images missing alt text`,
      recommendation: "Add descriptive alt attributes for accessibility & SEO",
    });
  }

  // Canonical
  metrics.hasCanonical = /<link[^>]*rel=["']canonical["']/i.test(html);
  if (!metrics.hasCanonical) {
    issues.push({
      type: "warning",
      category: "meta",
      message: "Missing canonical tag",
      recommendation: "Add <link rel='canonical' href='...'>",
    });
  }

  // Open Graph
  metrics.hasOpenGraph = /<meta[^>]*property=["']og:title["']/i.test(html);
  if (!metrics.hasOpenGraph) {
    issues.push({
      type: "info",
      category: "social",
      message: "Missing Open Graph tags",
      recommendation: "Add og:title, og:description, og:image",
    });
  }

  // Twitter Card
  metrics.hasTwitterCard = /<meta[^>]*name=["']twitter:card["']/i.test(html);

  // Schema.org / JSON-LD
  metrics.hasSchema =
    /application\/ld\+json/i.test(html) || /schema\.org/i.test(html);

  // Viewport
  metrics.hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);
  if (!metrics.hasViewport) {
    issues.push({
      type: "critical",
      category: "technical",
      message: "Missing viewport meta tag",
      recommendation:
        "Add <meta name='viewport' content='width=device-width, initial-scale=1'>",
    });
  }

  // Robots meta
  metrics.hasRobotsMeta = /<meta[^>]*name=["']robots["']/i.test(html);

  // Internal links count (rough estimate from anchor tags)
  const baseDomain = new URL(baseUrl).hostname;
  const anchorRegex = /<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let aMatch;
  const internalLinks = new Set<string>();
  while ((aMatch = anchorRegex.exec(html)) !== null) {
    try {
      const resolved = new URL(aMatch[1], baseUrl).href;
      if (new URL(resolved).hostname === baseDomain) {
        internalLinks.add(resolved);
      }
    } catch {}
  }
  metrics.internalLinks = internalLinks.size;
  if (metrics.internalLinks < 5) {
    issues.push({
      type: "info",
      category: "links",
      message: `Only ${metrics.internalLinks} internal links found`,
      recommendation: "Add more internal links to improve crawlability",
    });
  }

  // Calculate score
  let score = 100;
  score -= issues.filter((i) => i.type === "critical").length * 15;
  score -= issues.filter((i) => i.type === "warning").length * 8;
  score -= issues.filter((i) => i.type === "info").length * 3;
  score = Math.max(0, Math.min(100, score));

  return { score, metrics, issues };
}
