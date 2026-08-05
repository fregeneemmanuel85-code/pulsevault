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

  // Handle common two-part TLDs
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
  ];
  if (twoPartTlds.includes(parts[parts.length - 2])) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

export async function getDomainWhoisInfo(
  rawUrl: string,
): Promise<DomainWhoisInfo> {
  try {
    const hostname = new URL(rawUrl).hostname;

    // 1. Check if it's a platform subdomain (e.g., *.netlify.app)
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

    // 2. For custom domains, try WHOIS API
    const rootDomain = getRootDomain(hostname);
    console.log(`[WHOIS] Looking up custom domain: ${rootDomain}`);

    // Try ip2whois free tier
    try {
      const res = await fetch(
        `https://api.ip2whois.com/v2?key=FREE&domain=${rootDomain}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.expire_date) {
          const expiryDate = new Date(data.expire_date);
          const now = new Date();
          const daysLeft = Math.ceil(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          console.log(`[WHOIS] ${rootDomain}: expires in ${daysLeft} days`);
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

    // Try whoisfreaks (no key required for basic)
    try {
      const res = await fetch(
        `https://api.whoisfreaks.com/v1.0/whois?whois=live&domainName=${rootDomain}`,
        { signal: AbortSignal.timeout(8000) },
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
    return {
      expiryDate: null,
      daysLeft: null,
      registrar: null,
    };
  } catch (error: any) {
    console.error(`[WHOIS] Error for ${rawUrl}:`, error.message);
    return {
      expiryDate: null,
      daysLeft: null,
      registrar: null,
    };
  }
}
