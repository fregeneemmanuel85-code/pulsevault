import whois from "whois-json";

export interface DomainWhoisInfo {
  expiryDate: string | null;
  daysLeft: number | null;
  registrar: string | null;
}

export async function getDomainWhoisInfo(
  rawUrl: string,
): Promise<DomainWhoisInfo> {
  try {
    const hostname = new URL(rawUrl).hostname;
    const cleanDomain = hostname.replace(/^www\./, "");

    console.log(`[WHOIS] Looking up: ${cleanDomain}`);

    const result: Record<string, any> = await whois(cleanDomain);

    const expiryStr =
      result.expirationDate ||
      result.registryExpiryDate ||
      result.expires ||
      result.expiryDate ||
      result["Registrar Registration Expiration Date"] ||
      result["Expiry Date"] ||
      null;

    if (!expiryStr) {
      console.log(`[WHOIS] No expiry date found for ${cleanDomain}`);
      return {
        expiryDate: null,
        daysLeft: null,
        registrar: result.registrar || result.registrarName || null,
      };
    }

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
      registrar:
        result.registrar ||
        result.registrarName ||
        result["Registrar Name"] ||
        null,
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
