declare module "whois-json" {
  /**
   * Performs a WHOIS lookup for the given domain.
   * Returns a plain object with raw WHOIS fields.
   * Field names vary by registrar (e.g., expirationDate, registrar, etc.).
   */
  function whois(domain: string): Promise<Record<string, any>>;
  export default whois;
}
