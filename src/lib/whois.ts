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
  "repl.co": "Replit",
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
    console.log(`[WHOIS] Starting lookup for: ${hostname}`);

    // 1. Platform subdomains
    for (let i = 0; i < hostname.split(".").length - 1; i++) {
      const domain = hostname.split(".").slice(i).join(".");
      if (PLATFORM_DOMAINS[domain]) {
        console.log(`[WHOIS] ✅ Platform match: ${PLATFORM_DOMAINS[domain]}`);
        return {
          expiryDate: null,
          daysLeft: null,
          registrar: PLATFORM_DOMAINS[domain],
        };
      }
    }

    const rootDomain = getRootDomain(hostname);
    console.log(`[WHOIS] Root domain: ${rootDomain}`);

    // 2. RDAP (official ICANN protocol - most reliable)
    try {
      console.log(`[WHOIS] Trying RDAP...`);
      const res = await fetchWithTimeout(
        `https://rdap.org/domain/${rootDomain}`,
        10000,
      );
      console.log(`[WHOIS] RDAP status: ${res.status}`);

      if (res.ok) {
        const data = await res.json();
        console.log(`[WHOIS] RDAP response keys:`, Object.keys(data));

        // Find expiration event
        const events = data.events || [];
        const expiryEvent = events.find(
          (e: any) =>
            e.eventAction?.toLowerCase().includes("expiration") ||
            e.eventAction?.toLowerCase().includes("expiry"),
        );

        if (expiryEvent?.eventDate) {
          const expiryDate = new Date(expiryEvent.eventDate);
          const now = new Date();
          const daysLeft = Math.ceil(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );

          // Find registrar from entities
          let registrar = null;
          const entities = data.entities || [];
          for (const entity of entities) {
            if (entity.roles?.includes("registrar") && entity.vcardArray) {
              const vcard = entity.vcardArray[1];
              for (const item of vcard) {
                if (item[0] === "fn") {
                  registrar = item[3];
                  break;
                }
              }
            }
          }

          console.log(`[WHOIS] ✅ RDAP success: ${daysLeft} days left`);
          return {
            expiryDate: expiryDate.toISOString(),
            daysLeft,
            registrar,
          };
        }
      }
    } catch (e: any) {
      console.log(`[WHOIS] RDAP failed: ${e.message}`);
    }

    // 3. HackerTarget fallback
    try {
      console.log(`[WHOIS] Trying HackerTarget...`);
      const res = await fetchWithTimeout(
        `https://api.hackertarget.com/whois/?q=${rootDomain}`,
        10000,
      );
      console.log(`[WHOIS] HackerTarget status: ${res.status}`);

      if (res.ok) {
        const text = await res.text();
        console.log(`[WHOIS] HackerTarget response length: ${text.length}`);

        if (!text.toLowerCase().includes("error") && text.length > 50) {
          const patterns = [
            /(?:Registry Expiry Date|Expiration Date|Expires On|Expiry Date|expire-date|paid-till|Valid Until)[:\s]+([^\n\r]+)/i,
            /(?:Registrar Registration Expiration Date)[:\s]+([^\n\r]+)/i,
          ];

          for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
              const dateStr = match[1].trim();
              const date = new Date(dateStr);
              if (!isNaN(date.getTime())) {
                const now = new Date();
                const daysLeft = Math.ceil(
                  (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                );
                const registrarMatch = text.match(/Registrar[:\s]+([^\n\r]+)/i);
                console.log(
                  `[WHOIS] ✅ HackerTarget success: ${daysLeft} days left`,
                );
                return {
                  expiryDate: date.toISOString(),
                  daysLeft,
                  registrar: registrarMatch ? registrarMatch[1].trim() : null,
                };
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.log(`[WHOIS] HackerTarget failed: ${e.message}`);
    }

    // 4. ip2whois fallback
    try {
      console.log(`[WHOIS] Trying ip2whois...`);
      const res = await fetchWithTimeout(
        `https://api.ip2whois.com/v2?key=FREE&domain=${rootDomain}`,
        8000,
      );
      console.log(`[WHOIS] ip2whois status: ${res.status}`);

      if (res.ok) {
        const data = await res.json();
        if (data.expire_date) {
          const expiryDate = new Date(data.expire_date);
          const now = new Date();
          const daysLeft = Math.ceil(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          console.log(`[WHOIS] ✅ ip2whois success: ${daysLeft} days left`);
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

    console.log(`[WHOIS] ❌ All methods failed for ${rootDomain}`);
    return { expiryDate: null, daysLeft: null, registrar: null };
  } catch (error: any) {
    console.error(`[WHOIS] Fatal error for ${rawUrl}:`, error.message);
    return { expiryDate: null, daysLeft: null, registrar: null };
  }
}
