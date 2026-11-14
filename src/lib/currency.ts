/** Store Algerian dinars as the ISO code even when the invoice prints DA. */
export function normalizeCurrency(value: string): string {
  if (value.includes("€")) return "EUR";
  if (value.includes("£")) return "GBP";
  if (value.includes("₦")) return "NGN";
  const normalized = value.trim().toUpperCase().replace(/[^A-Z\u0621-\u064A]/g, "");
  if (["DZD", "DA", "دج", "DZDDA", "DAALGERIANDINAR"].includes(normalized) || normalized.includes("ALGERIANDINAR")) return "DZD";
  return normalized || "USD";
}
