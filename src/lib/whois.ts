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
  "hostinger.com": "Hostinger",
  "000webhostapp.com": "Hostinger",
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
    console.log(`[WHOIS-DEBUG] ====== START: ${hostname} ======`);

    // Platform subdomains
    for (let i = 0; i < hostname.split(".").length - 1; i++) {
      const domain = hostname.split(".").slice(i).join(".");
      if (PLATFORM_DOMAINS[domain]) {
        console.log(`[WHOIS-DEBUG] ✅ Platform: ${PLATFORM_DOMAINS[domain]}`);
        return {
          expiryDate: null,
          daysLeft: null,
          registrar: PLATFORM_DOMAINS[domain],
        };
      }
    }

    const rootDomain = getRootDomain(hostname);
    const apiKey = process.env.WHOIS_API_KEY;
    console.log(`[WHOIS-DEBUG] Root domain: ${rootDomain}`);
    console.log(
      `[WHOIS-DEBUG] API Key present: ${apiKey ? "YES (" + apiKey.slice(0, 8) + "...)" : "NO"}`,
    );

    // If API key exists, use whoisxmlapi
    if (apiKey) {
      const apiUrl = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${apiKey}&domainName=${rootDomain}&outputFormat=JSON`;
      console.log(`[WHOIS-DEBUG] Calling whoisxmlapi...`);

      try {
        const res = await fetchWithTimeout(apiUrl, 10000);
        console.log(`[WHOIS-DEBUG] whoisxmlapi status: ${res.status}`);

        const data = await res.json();
        console.log(
          `[WHOIS-DEBUG] whoisxmlapi response keys:`,
          Object.keys(data),
        );

        if (data.WhoisRecord) {
          console.log(
            `[WHOIS-DEBUG] WhoisRecord keys:`,
            Object.keys(data.WhoisRecord),
          );

          const expiryStr =
            data.WhoisRecord.expiresDate ||
            data.WhoisRecord.registryData?.expiresDate ||
            data.WhoisRecord.estimatedDomainAge;

          console.log(`[WHOIS-DEBUG] Found expiry string: ${expiryStr}`);

          if (expiryStr) {
            const expiryDate = new Date(expiryStr);
            const now = new Date();
            const daysLeft = Math.ceil(
              (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );

            const registrar =
              data.WhoisRecord.registrarName ||
              data.WhoisRecord.registryData?.registrarName ||
              null;

            console.log(
              `[WHOIS-DEBUG] ✅ SUCCESS: ${daysLeft} days, registrar: ${registrar}`,
            );
            return {
              expiryDate: expiryDate.toISOString(),
              daysLeft,
              registrar,
            };
          }
        } else {
          console.log(`[WHOIS-DEBUG] No WhoisRecord in response`);
        }
      } catch (e: any) {
        console.log(`[WHOIS-DEBUG] whoisxmlapi error: ${e.message}`);
      }
    }

    // Fallback: HackerTarget
    console.log(`[WHOIS-DEBUG] Trying HackerTarget fallback...`);
    try {
      const res = await fetchWithTimeout(
        `https://api.hackertarget.com/whois/?q=${rootDomain}`,
        8000,
      );
      console.log(`[WHOIS-DEBUG] HackerTarget status: ${res.status}`);

      if (res.ok) {
        const text = await res.text();
        console.log(`[WHOIS-DEBUG] HackerTarget length: ${text.length}`);

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
            console.log(`[WHOIS-DEBUG] ✅ HackerTarget: ${daysLeft} days`);
            return {
              expiryDate: date.toISOString(),
              daysLeft,
              registrar: registrarMatch ? registrarMatch[1].trim() : null,
            };
          }
        }
      }
    } catch (e: any) {
      console.log(`[WHOIS-DEBUG] HackerTarget error: ${e.message}`);
    }

    console.log(`[WHOIS-DEBUG] ❌ ALL FAILED for ${rootDomain}`);
    return { expiryDate: null, daysLeft: null, registrar: null };
  } catch (error: any) {
    console.error(`[WHOIS-DEBUG] FATAL:`, error.message);
    return { expiryDate: null, daysLeft: null, registrar: null };
  }
}
