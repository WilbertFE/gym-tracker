/** Currencies a price can be in. Prices are never converted between them. */
export type Currency = "IDR" | "USD";

export const CURRENCIES = ["IDR", "USD"] as const;

export const CURRENCY_LABELS: Record<Currency, string> = {
  IDR: "Indonesian rupiah (IDR)",
  USD: "US dollar (USD)",
};

/** "Rp350.000", "$25" or "$24.50". Rupiah has no cents in practice, dollars show them when there are some. */
export function formatPrice(amount: number, currency: Currency): string {
  const digits = currency === "USD" && !Number.isInteger(amount) ? 2 : 0;
  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}
