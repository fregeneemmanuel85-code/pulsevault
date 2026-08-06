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

    // RDAP (official ICANN protocol)
    try {
      const res = await fetch(`https://rdap.org/domain/${rootDomain}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const events = data.events || [];
        const expiryEvent = events.find((e: any) =>
          e.eventAction?.toLowerCase().includes("expiration"),
        );
        if (expiryEvent?.eventDate) {
          const expiryDate = new Date(expiryEvent.eventDate);
          const now = new Date();
          const daysLeft = Math.ceil(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );

          let registrar = null;
          const entities = data.entities || [];
          for (const entity of entities) {
            if (entity.roles?.includes("registrar") && entity.vcardArray?.[1]) {
              for (const item of entity.vcardArray[1]) {
                if (item[0] === "fn") registrar = item[3];
              }
            }
          }
          return { expiryDate: expiryDate.toISOString(), daysLeft, registrar };
        }
      }
    } catch {}

    // HackerTarget fallback
    try {
      const res = await fetch(
        `https://api.hackertarget.com/whois/?q=${rootDomain}`,
        {
          signal: AbortSignal.timeout(8000),
        },
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
  } catch {
    return { expiryDate: null, daysLeft: null, registrar: null };
  }
}
