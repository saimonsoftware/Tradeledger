const MINUS = "−";

/** "+2.50R", "−1.00R", "0.00R" (true minus sign); "—" when there's no RR. */
export const fmtR = (r: number | null) =>
  r === null ? "—" : `${r > 0 ? "+" : r < 0 ? MINUS : ""}${Math.abs(r).toFixed(2)}R`;
