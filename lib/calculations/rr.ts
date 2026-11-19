// SL / TP distances (pips for EURUSD, points for NQ) and the Trade RR.
// The TP price is WHERE THE TRADER GOT OUT (their exit), on either side of the entry.
// Pure and exact: prices are decimal strings, done in integer maths (BigInt at
// 8 decimal places, like the numeric(18,8) price columns), so no float rounding.
// Used by the form (live) AND the server (stored values).
// Note: BigInt(…) instead of 123n literals, because tsconfig targets < ES2020.

import type { TradeSymbol } from "@/lib/trades/constants";

const SCALE = 8;
const ZERO = BigInt(0);
const ONE = BigInt(10) ** BigInt(SCALE);

/** Size of one pip/point, in 1e-8 units. EURUSD pip = 0.0001; NQ point = 1. */
const UNIT: Record<TradeSymbol, bigint> = { EURUSD: BigInt(10000), NQ: ONE };
export const PIP_LABEL: Record<TradeSymbol, string> = { EURUSD: "pips", NQ: "points" };

const isSymbol = (s: string): s is TradeSymbol => s in UNIT;

/** "1.0852" → 108520000 (units of 1e-8). Null for anything that isn't a plain decimal. */
function toUnits(s: string | null | undefined): bigint | null {
  const m = /^(\d+)(?:\.(\d+))?$/.exec((s ?? "").trim().replace(/,/g, ""));
  if (!m || (m[2]?.length ?? 0) > SCALE) return null;
  return BigInt(m[1]) * ONE + BigInt((m[2] ?? "").padEnd(SCALE, "0"));
}

/** round(a / b × 100) as "x.yy" (half away from zero; a, b > 0). */
function ratio2(a: bigint, b: bigint): string {
  const h = (a * BigInt(200) + b) / (BigInt(2) * b);
  return `${h / BigInt(100)}.${(h % BigInt(100)).toString().padStart(2, "0")}`;
}

/** Distance between two prices in pips/points, to 2 decimals without trailing zeros ("10", "12.5"). */
export function pipsBetween(symbol: string, a: string, b: string | null): string | null {
  if (!isSymbol(symbol)) return null;
  const x = toUnits(a);
  const y = toUnits(b);
  if (x === null || y === null || x <= ZERO || y <= ZERO) return null;
  const diff = x > y ? x - y : y - x;
  const s = ratio2(diff, UNIT[symbol]);
  return s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

/**
 * Pips/points moved from entry to the TP (exit), signed: + in the trade's favour.
 * E.g. short 1.0852 → 1.0827 = "25"; long 21480 → 21470 = "-10".
 */
export function movePips(
  symbol: string,
  direction: "long" | "short",
  entryPrice: string,
  exitPrice: string | null,
): string | null {
  const abs = pipsBetween(symbol, entryPrice, exitPrice);
  if (abs === null) return null;
  const entry = toUnits(entryPrice)!;
  const exit = toUnits(exitPrice)!;
  const favour = direction === "long" ? exit > entry : exit < entry;
  return favour || abs === "0" ? abs : `-${abs}`;
}

export type LevelCheck = "ok" | "missing" | "wrong-side" | "at-entry";

/** Is the stop on the losing side of the entry? Long: below. Short: above. */
export function checkStop(
  direction: "long" | "short",
  entryPrice: string,
  stopLoss: string | null,
): LevelCheck {
  const entry = toUnits(entryPrice);
  const price = toUnits(stopLoss);
  if (entry === null || price === null) return "missing";
  if (price === entry) return "at-entry";
  return price < entry === (direction === "long") ? "ok" : "wrong-side";
}

/**
 * Trade RR from prices: move from entry to the TP (exit) ÷ SL distance, signed,
 * rounded to 2 decimals (half away from zero). E.g. short 1.0852 → 1.0827 with
 * SL 1.0862 = "2.50"; exit 1.0857 = "-0.50". Null unless entry, SL and TP are valid.
 */
export function tradeRrFromPrices(
  direction: "long" | "short",
  entryPrice: string,
  stopLoss: string | null,
  exitPrice: string | null,
): string | null {
  if (checkStop(direction, entryPrice, stopLoss) !== "ok") return null;
  const entry = toUnits(entryPrice)!;
  const sl = toUnits(stopLoss)!;
  const exit = toUnits(exitPrice);
  if (exit === null || exit <= ZERO) return null;
  const risk = entry > sl ? entry - sl : sl - entry;
  const move = direction === "long" ? exit - entry : entry - exit;
  const r = ratio2(move < ZERO ? -move : move, risk);
  return move < ZERO && r !== "0.00" ? `-${r}` : r;
}

/**
 * The Trade RR to fill in (UNSIGNED: the Profit/Loss choice gives the sign).
 *  - TP (exit) given → |move ÷ risk|
 *  - Loss with no TP → the SL was hit → 1
 *  - P&L of 0 → 0
 * Null when it can't be worked out (the trader can type it).
 */
export function suggestedRr(input: {
  direction: "long" | "short";
  entryPrice: string;
  stopLoss: string | null;
  takeProfit: string | null;
  pnlSide: "profit" | "loss";
  pnlAmount: string | null;
}): string | null {
  const { direction, entryPrice, stopLoss, takeProfit, pnlSide, pnlAmount } = input;
  const amount = Number((pnlAmount ?? "").replace(/,/g, ""));
  if (!pnlAmount?.trim() || !Number.isFinite(amount)) return null;
  if (amount === 0) return "0";
  if (takeProfit?.trim()) {
    const r = tradeRrFromPrices(direction, entryPrice, stopLoss, takeProfit);
    if (r === null || r === "0.00") return null;
    return r.replace(/^-/, "");
  }
  if (pnlSide === "loss") {
    return checkStop(direction, entryPrice, stopLoss) === "ok" ? "1.00" : null;
  }
  return null;
}
