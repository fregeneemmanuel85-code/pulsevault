export interface DomainWhoisInfo {
  expiryDate: string | null;
  daysLeft: number | null;
  registrar: string | null;
}

// Platform-managed domains — no WHOIS expiry
const PLATFORM_DOMAINS: Record<string, string> = {
  "netlify.app": "Netlify",
  "vercel.app": "Vercel",
  "github.io": "GitHub Pages",
  "gitlab.io": "GitLab Pages",
  "herokuapp.com": "Heroku",
  "firebaseapp.com": "Firebase Hosting",
  "web.app": "Firebase Hosting",
  "surge.sh": "Surge",
  "render.com": "Render",
  "onrender.com": "Render",
  "railway.app": "Railway",
  "glitch.me": "Glitch",
  "repl.co": "Replit",
  "pages.dev": "Cloudflare Pages",
  "deno.dev": "Deno Deploy",
  "fly.dev": "Fly.io",
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

    // 1. Check platform subdomains
    for (let i = 0; i < hostname.split(".").length - 1; i++) {
      const domain = hostname.split(".").slice(i).join(".");
      if (PLATFORM_DOMAINS[domain]) {
        console.log(
          `[WHOIS] Platform detected: ${hostname} → ${PLATFORM_DOMAINS[domain]}`,
        );
        return {
          expiryDate: null,
          daysLeft: null,
          registrar: PLATFORM_DOMAINS[domain],
        };
      }
    }

    const rootDomain = getRootDomain(hostname);
    console.log(`[WHOIS] Looking up custom domain: ${rootDomain}`);

    // Method 1: HackerTarget raw WHOIS (no key, most reliable)
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
            console.log(
              `[WHOIS] ✅ ${rootDomain}: ${daysLeft} days left via HackerTarget`,
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

    // Method 2: ip2whois free tier
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
          console.log(
            `[WHOIS] ✅ ${rootDomain}: ${daysLeft} days left via ip2whois`,
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

    // Method 3: whoisfreaks
    try {
      const res = await fetchWithTimeout(
        `https://api.whoisfreaks.com/v1.0/whois?whois=live&domainName=${rootDomain}`,
        8000,
      );
      if (res.ok) {
        const data = await res.json();
        const expiryStr =
          data.expiration_date || data.registry_expiry_date || data.expires;
        if (expiryStr) {
          const expiryDate = new Date(expiryStr);
          const now = new Date();
          const daysLeft = Math.ceil(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          console.log(
            `[WHOIS] ✅ ${rootDomain}: ${daysLeft} days left via whoisfreaks`,
          );
          return {
            expiryDate: expiryDate.toISOString(),
            daysLeft,
            registrar: data.registrar_name || data.registrar || null,
          };
        }
      }
    } catch (e: any) {
      console.log(`[WHOIS] whoisfreaks failed: ${e.message}`);
    }

    console.log(`[WHOIS] No expiry data for ${rootDomain}`);
    return { expiryDate: null, daysLeft: null, registrar: null };
  } catch (error: any) {
    console.error(`[WHOIS] Error for ${rawUrl}:`, error.message);
    return { expiryDate: null, daysLeft: null, registrar: null };
  }
}
