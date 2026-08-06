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

function parseDate(str: string): Date | null {
  const cleaned = str.trim().replace(/T.+$/, "");
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

export async function getDomainWhoisInfo(
  rawUrl: string,
): Promise<DomainWhoisInfo> {
  try {
    const hostname = new URL(rawUrl).hostname;
    console.log(`[WHOIS] ====== START: ${hostname} ======`);

    // 1. Platform subdomains
    for (let i = 0; i < hostname.split(".").length - 1; i++) {
      const domain = hostname.split(".").slice(i).join(".");
      if (PLATFORM_DOMAINS[domain]) {
        console.log(`[WHOIS] ✅ Platform: ${PLATFORM_DOMAINS[domain]}`);
        return {
          expiryDate: null,
          daysLeft: null,
          registrar: PLATFORM_DOMAINS[domain],
        };
      }
    }

    const rootDomain = getRootDomain(hostname);
    console.log(`[WHOIS] Root: ${rootDomain}`);

    // 2. Try 3 APIs in parallel
    const apis = [
      {
        name: "HackerTarget",
        url: `https://api.hackertarget.com/whois/?q=${rootDomain}`,
        parser: async (res: Response) => {
          const text = await res.text();
          console.log(`[WHOIS] HackerTarget raw length: ${text.length}`);
          if (text.toLowerCase().includes("error") || text.length < 50)
            return null;

          const expiryMatch = text.match(
            /(?:Expiration Date|Registry Expiry Date|Expires On|paid-till)[:\s]+([^\n\r]+)/i,
          );
          const registrarMatch = text.match(/Registrar[:\s]+([^\n\r]+)/i);

          if (!expiryMatch) return null;
          const date = parseDate(expiryMatch[1]);
          if (!date) return null;

          const now = new Date();
          const daysLeft = Math.ceil(
            (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          return {
            expiryDate: date.toISOString(),
            daysLeft,
            registrar: registrarMatch ? registrarMatch[1].trim() : null,
          };
        },
      },
      {
        name: "ip2whois",
        url: `https://api.ip2whois.com/v2?key=FREE&domain=${rootDomain}`,
        parser: async (res: Response) => {
          const data = await res.json();
          console.log(`[WHOIS] ip2whois keys:`, Object.keys(data));
          if (!data.expire_date) return null;
          const date = new Date(data.expire_date);
          if (isNaN(date.getTime())) return null;
          const now = new Date();
          const daysLeft = Math.ceil(
            (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          return {
            expiryDate: date.toISOString(),
            daysLeft,
            registrar: data.registrar?.name || null,
          };
        },
      },
      {
        name: "whoisfreaks",
        url: `https://api.whoisfreaks.com/v1.0/whois?whois=live&domainName=${rootDomain}`,
        parser: async (res: Response) => {
          const data = await res.json();
          console.log(`[WHOIS] whoisfreaks keys:`, Object.keys(data));
          const expiryStr =
            data.expiration_date || data.registry_expiry_date || data.expires;
          if (!expiryStr) return null;
          const date = new Date(expiryStr);
          if (isNaN(date.getTime())) return null;
          const now = new Date();
          const daysLeft = Math.ceil(
            (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          return {
            expiryDate: date.toISOString(),
            daysLeft,
            registrar: data.registrar_name || data.registrar || null,
          };
        },
      },
    ];

    // Fire all 3 at once
    const results = await Promise.allSettled(
      apis.map(async (api) => {
        try {
          console.log(`[WHOIS] Trying ${api.name}...`);
          const res = await fetchWithTimeout(api.url, 8000);
          console.log(`[WHOIS] ${api.name} status: ${res.status}`);
          if (!res.ok) return null;
          const parsed = await api.parser(res);
          if (parsed) {
            console.log(
              `[WHOIS] ✅ ${api.name} SUCCESS: ${parsed.daysLeft} days`,
            );
            return parsed;
          }
          console.log(`[WHOIS] ${api.name} parse failed`);
          return null;
        } catch (e: any) {
          console.log(`[WHOIS] ${api.name} error: ${e.message}`);
          return null;
        }
      }),
    );

    // Return first success
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        return r.value;
      }
    }

    console.log(`[WHOIS] ❌ ALL APIs FAILED for ${rootDomain}`);
    return { expiryDate: null, daysLeft: null, registrar: null };
  } catch (error: any) {
    console.error(`[WHOIS] FATAL:`, error.message);
    return { expiryDate: null, daysLeft: null, registrar: null };
  }
}
