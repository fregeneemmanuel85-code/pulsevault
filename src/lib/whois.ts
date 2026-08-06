export interface DomainWhoisInfo {
  expiryDate: string | null;
  daysLeft: number | null;
  registrar: string | null;
}

const PLATFORM_DOMAINS: Record<string, string> = {
  "netlify.app": "Netlify",
  "vercel.app": "Vercel",
  "github.io": "GitHub Pages",
  "herokuapp.com": "Heroku",
  "firebaseapp.com": "Firebase",
  "web.app": "Firebase",
  "pages.dev": "Cloudflare Pages",
  "onrender.com": "Render",
  "railway.app": "Railway",
  "surge.sh": "Surge",
  "glitch.me": "Glitch",
};

function getRootDomain(hostname: string): string {
  const parts = hostname.replace(/^www\./, "").split(".");
  if (parts.length <= 2) return parts.join(".");
  const twoPartTlds = [
    "co",
    "com",
    "org",
    "gov",
    "ac",
    "edu",
    "net",
    "mil",
    "go",
    "io",
    "ai",
  ];
  if (parts.length > 2 && twoPartTlds.includes(parts[parts.length - 2])) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

function parseExpiryFromWhoisText(text: string): {
  expiry: string | null;
  registrar: string | null;
} {
  const patterns = [
    /(?:Registry Expiry Date|Expiration Date|Expires On|Expiry Date|expire-date|paid-till|Valid Until)[:\s]+([^\n\r]+)/i,
    /(?:Registrar Registration Expiration Date)[:\s]+([^\n\r]+)/i,
    /(?:Expires)[:\s]+([^\n\r]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const dateStr = match[1].trim();
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const registrarMatch =
          text.match(/Registrar[:\s]+([^\n\r]+)/i) ||
          text.match(/Sponsoring Registrar[:\s]+([^\n\r]+)/i);
        return {
          expiry: date.toISOString(),
          registrar: registrarMatch ? registrarMatch[1].trim() : null,
        };
      }
    }
  }
  return { expiry: null, registrar: null };
}

function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() =>
    clearTimeout(timeout),
  );
}

export async function getDomainWhoisInfo(
  rawUrl: string,
): Promise<DomainWhoisInfo> {
  try {
    const hostname = new URL(rawUrl).hostname;

    // 1. Platform subdomains (Netlify, Vercel, etc.)
    for (let i = 0; i < hostname.split(".").length - 1; i++) {
      const domain = hostname.split(".").slice(i).join(".");
      if (PLATFORM_DOMAINS[domain]) {
        return {
          expiryDate: null,
          daysLeft: null,
          registrar: PLATFORM_DOMAINS[domain],
        };
      }
    }

    const rootDomain = getRootDomain(hostname);

    // 2. HackerTarget raw WHOIS
    try {
      const res = await fetchWithTimeout(
        `https://api.hackertarget.com/whois/?q=${rootDomain}`,
        10000,
      );
      if (res.ok) {
        const text = await res.text();
        if (!text.toLowerCase().includes("error") && text.length > 50) {
          const parsed = parseExpiryFromWhoisText(text);
          if (parsed.expiry) {
            const expiryDate = new Date(parsed.expiry);
            const now = new Date();
            const daysLeft = Math.ceil(
              (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            return {
              expiryDate: parsed.expiry,
              daysLeft,
              registrar: parsed.registrar,
            };
          }
        }
      }
    } catch (e: any) {
      console.log(`[WHOIS] HackerTarget failed: ${e.message}`);
    }

    // 3. ip2whois fallback
    try {
      const res = await fetchWithTimeout(
        `https://api.ip2whois.com/v2?key=FREE&domain=${rootDomain}`,
        8000,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.expire_date) {
          const expiryDate = new Date(data.expire_date);
          const now = new Date();
          const daysLeft = Math.ceil(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          return {
            expiryDate: expiryDate.toISOString(),
            daysLeft,
            registrar: data.registrar?.name || null,
          };
        }
      }
    } catch (e: any) {
      console.log(`[WHOIS] ip2whois failed: ${e.message}`);
    }

    return { expiryDate: null, daysLeft: null, registrar: null };
  } catch (error: any) {
    console.error(`[WHOIS] Error for ${rawUrl}:`, error.message);
    return { expiryDate: null, daysLeft: null, registrar: null };
  }
}
