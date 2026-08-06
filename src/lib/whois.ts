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

    // Platform subdomains
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
    const apiKey = process.env.WHOIS_API_KEY;

    // If API key exists, use whoisxmlapi (most reliable)
    if (apiKey) {
      try {
        const res = await fetchWithTimeout(
          `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${apiKey}&domainName=${rootDomain}&outputFormat=JSON`,
          10000,
        );
        if (res.ok) {
          const data = await res.json();
          const expiryStr =
            data.WhoisRecord?.registryData?.expiresDate ||
            data.WhoisRecord?.expiresDate ||
            data.WhoisRecord?.estimatedDomainAge;

          if (expiryStr) {
            const expiryDate = new Date(expiryStr);
            const now = new Date();
            const daysLeft = Math.ceil(
              (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            return {
              expiryDate: expiryDate.toISOString(),
              daysLeft,
              registrar:
                data.WhoisRecord?.registrarName ||
                data.WhoisRecord?.registryData?.registrarName ||
                null,
            };
          }
        }
      } catch (e: any) {
        console.log(`[WHOIS] whoisxmlapi failed: ${e.message}`);
      }
    }

    // Fallback: HackerTarget (no key)
    try {
      const res = await fetchWithTimeout(
        `https://api.hackertarget.com/whois/?q=${rootDomain}`,
        8000,
      );
      if (res.ok) {
        const text = await res.text();
        const expiryMatch = text.match(
          /(?:Expiration Date|Registry Expiry Date)[:\s]+([^\n\r]+)/i,
        );
        const registrarMatch = text.match(/Registrar[:\s]+([^\n\r]+)/i);
        if (expiryMatch?.[1]) {
          const date = new Date(expiryMatch[1].trim());
          if (!isNaN(date.getTime())) {
            const now = new Date();
            const daysLeft = Math.ceil(
              (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            return {
              expiryDate: date.toISOString(),
              daysLeft,
              registrar: registrarMatch ? registrarMatch[1].trim() : null,
            };
          }
        }
      }
    } catch {}

    return { expiryDate: null, daysLeft: null, registrar: null };
  } catch (error: any) {
    console.error(`[WHOIS] Error:`, error.message);
    return { expiryDate: null, daysLeft: null, registrar: null };
  }
}
