export interface DomainWhoisInfo {
  expiryDate: string | null;
  daysLeft: number | null;
  registrar: string | null;
}

function getRootDomain(hostname: string): string {
  // Remove www.
  let domain = hostname.replace(/^www\./, "");

  // Handle subdomains — extract root domain
  const parts = domain.split(".");
  if (parts.length > 2) {
    // e.g., test-pulse2.netlify.app → netlify.app
    // e.g., www.example.co.uk → example.co.uk (complex TLDs)
    // Simple approach: take last 2 parts for common TLDs
    const tld = parts[parts.length - 1];
    const sld = parts[parts.length - 2];

    // If TLD is a known 2-part ccTLD like .co.uk, take 3 parts
    const twoPartTlds = ["co", "com", "org", "gov", "ac", "edu", "net", "mil"];
    if (parts.length > 2 && twoPartTlds.includes(parts[parts.length - 2])) {
      domain = parts.slice(-3).join(".");
    } else {
      domain = `${sld}.${tld}`;
    }
  }

  return domain;
}

export async function getDomainWhoisInfo(
  rawUrl: string,
): Promise<DomainWhoisInfo> {
  try {
    const hostname = new URL(rawUrl).hostname;
    const cleanDomain = getRootDomain(hostname);

    console.log(`[WHOIS] Looking up root domain: ${cleanDomain}`);

    // Try free WHOIS API first (no API key needed for basic lookups)
    try {
      const res = await fetch(
        `https://api.whoisfreaks.com/v1.0/whois?whois=live&domainName=${cleanDomain}`,
        { signal: AbortSignal.timeout(8000) },
      );

      if (res.ok) {
        const data = await res.json();
        const expiryStr =
          data.expiration_date ||
          data.registry_expiry_date ||
          data.expires ||
          null;

        if (expiryStr) {
          const expiryDate = new Date(expiryStr);
          const now = new Date();
          const daysLeft = Math.ceil(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );

          console.log(
            `[WHOIS] ${cleanDomain}: expires ${expiryDate.toISOString()}, ${daysLeft} days left`,
          );

          return {
            expiryDate: expiryDate.toISOString(),
            daysLeft,
            registrar: data.registrar_name || data.registrar || null,
          };
        }
      }
    } catch (apiErr: any) {
      console.log(`[WHOIS] API failed: ${apiErr.message}`);
    }

    // Fallback: try ip2whois free tier
    try {
      const res = await fetch(
        `https://api.ip2whois.com/v2?key=FREE&domain=${cleanDomain}`,
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

          return {
            expiryDate: expiryDate.toISOString(),
            daysLeft,
            registrar: data.registrar?.name || null,
          };
        }
      }
    } catch (fallbackErr: any) {
      console.log(`[WHOIS] Fallback failed: ${fallbackErr.message}`);
    }

    // For platforms like Netlify/Vercel, we know they're managed
    if (cleanDomain === "netlify.app" || cleanDomain === "vercel.app") {
      return {
        expiryDate: null,
        daysLeft: null,
        registrar: cleanDomain === "netlify.app" ? "Netlify" : "Vercel",
      };
    }

    console.log(`[WHOIS] No expiry data found for ${cleanDomain}`);
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
