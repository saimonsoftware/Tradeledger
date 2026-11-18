// Currency helpers. All money shown in the app goes through these so it is
// formatted consistently (and in the account's own currency).

const LOCALE = "en-IE";

export function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a profit/loss figure with an explicit sign: "+€1,240.50", "−€310.00", "€0.00".
 * Uses a true minus sign (U+2212) so it lines up with "+" in tabular layouts.
 */
export function formatSignedCurrency(amount: number, currency = "EUR"): string {
  if (amount === 0) return formatCurrency(0, currency);
  const sign = amount > 0 ? "+" : "−";
  return `${sign}${formatCurrency(Math.abs(amount), currency)}`;
}

/** "+1.84%", "−0.52%", "0.00%" */
export function formatSignedPercent(value: number): string {
  const abs = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  if (value === 0) return `${abs}%`;
  return `${value > 0 ? "+" : "−"}${abs}%`;
}
