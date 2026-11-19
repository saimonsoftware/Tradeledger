const priceFormat = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 8 });

/** Prices and quantities: up to 8 decimals, no trailing zeros ("21,480", "1.0852"). */
export const formatPrice = (n: number | string | null | undefined) =>
  n === null || n === undefined || n === "" ? "—" : priceFormat.format(Number(n));

/** "+1.98R", "−0.50R" */
export const formatR = (r: number | null | undefined) =>
  r === null || r === undefined
    ? "—"
    : `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(Number(r)).toFixed(2)}R`;
