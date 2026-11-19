// Stop-loss price and Trade RR from an SL SIZE (pips for EURUSD, points for NQ).
// Pure and exact: prices are decimal strings, done in integer maths (BigInt at
// 8 decimal places, like the numeric(18,8) price columns), so no float rounding.
// Used by the form (live) AND the server (the stored values).

import type { TradeSymbol } from "@/lib/trades/constants";

const SCALE = 8;
const ONE = BigInt(10) ** BigInt(SCALE);

/** Size of one pip/point, in 1e-8 units. EURUSD pip = 0.0001; NQ point = 1. */
const UNIT: Record<TradeSymbol, bigint> = { EURUSD: BigInt(10000), NQ: ONE };
export const SL_UNIT_LABEL: Record<TradeSymbol, string> = { EURUSD: "pips", NQ: "points" };

/** "1.0852" → 108520000 (units of 1e-8). Returns null for anything that isn't a plain decimal. */
function toUnits(s: string): bigint | null {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(s.trim().replace(/,/g, ""));
  if (!m || (m[2]?.length ?? 0) > SCALE) return null;
  return BigInt(m[1]) * ONE + BigInt((m[2] ?? "").padEnd(SCALE, "0"));
}

/** 108420000 units → "1.0842" (trailing zeros dropped). */
function fromUnits(u: bigint, maxDecimals = SCALE): string {
  const neg = u < BigInt(0);
  let abs = neg ? -u : u;
  if (maxDecimals < SCALE) {
    const f = BigInt(10) ** BigInt(SCALE - maxDecimals);
    abs = (abs + f / BigInt(2)) / f; // round half up
    abs *= f;
  }
  const int = abs / ONE;
  const frac = (abs % ONE).toString().padStart(SCALE, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${int}${frac ? `.${frac}` : ""}`;
}

/** Price distance of the stop: SL size × pip/point size. */
function slDistance(symbol: TradeSymbol, slSize: string): bigint | null {
  const size = toUnits(slSize);
  if (size === null || size <= BigInt(0)) return null;
  return (size * UNIT[symbol]) / ONE;
}

/** Stop-loss price, e.g. long EURUSD at 1.0852 with 10 pips → "1.0842". Null if invalid. */
export function stopLossPrice(
  symbol: TradeSymbol,
  direction: "long" | "short",
  entryPrice: string,
  slSize: string,
): string | null {
  const entry = toUnits(entryPrice);
  const dist = slDistance(symbol, slSize);
  if (entry === null || dist === null || entry <= BigInt(0)) return null;
  const stop = direction === "long" ? entry - dist : entry + dist;
  return stop > BigInt(0) ? fromUnits(stop) : null;
}

/**
 * Trade RR = price move in your favour ÷ stop distance, rounded to 2 decimals
 * (half away from zero). E.g. long NQ 21480 → 21520 with a 20-point SL = "2.00".
 * Negative for a loss. Null if anything is missing or invalid.
 */
export function tradeRr(
  symbol: TradeSymbol,
  direction: "long" | "short",
  entryPrice: string,
  exitPrice: string,
  slSize: string,
): string | null {
  const entry = toUnits(entryPrice);
  const exit = toUnits(exitPrice);
  const dist = slDistance(symbol, slSize);
  if (entry === null || exit === null || dist === null || entry <= BigInt(0) || exit <= BigInt(0))
    return null;
  const move = direction === "long" ? exit - entry : entry - exit;
  const abs = move < BigInt(0) ? -move : move;
  const hundredths = (abs * BigInt(200) + dist) / (BigInt(2) * dist); // round(abs / dist × 100)
  const sign = move < BigInt(0) && hundredths > BigInt(0) ? "-" : "";
  return `${sign}${hundredths / BigInt(100)}.${(hundredths % BigInt(100)).toString().padStart(2, "0")}`;
}

/** SL size back from a stored stop price (edit form): |entry − stop| ÷ pip/point. */
export function slSizeFromStop(
  symbol: string,
  entryPrice: string,
  stopPrice: string | null,
): string {
  if (!stopPrice || !(symbol in UNIT)) return "";
  const entry = toUnits(entryPrice);
  const stop = toUnits(stopPrice);
  if (entry === null || stop === null) return "";
  const diff = entry > stop ? entry - stop : stop - entry;
  return fromUnits((diff * ONE) / UNIT[symbol as TradeSymbol], 2);
}
