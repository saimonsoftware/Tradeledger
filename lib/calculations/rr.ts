// SL / TP distances (pips for EURUSD, points for NQ) and the Trade RR.
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

export type LevelCheck = "ok" | "missing" | "wrong-side" | "at-entry";

/**
 * Is the stop/target on the correct side of the entry?
 * Long: SL below entry, TP above. Short: SL above entry, TP below.
 */
export function checkLevel(
  kind: "sl" | "tp",
  direction: "long" | "short",
  entryPrice: string,
  level: string | null,
): LevelCheck {
  const entry = toUnits(entryPrice);
  const price = toUnits(level);
  if (entry === null || price === null) return "missing";
  if (price === entry) return "at-entry";
  const above = price > entry;
  const shouldBeAbove = (kind === "tp") === (direction === "long");
  return above === shouldBeAbove ? "ok" : "wrong-side";
}

/** Planned reward:risk = TP distance ÷ SL distance, e.g. "2.50". Null unless both are valid. */
export function plannedRr(
  direction: "long" | "short",
  entryPrice: string,
  stopLoss: string | null,
  takeProfit: string | null,
): string | null {
  if (
    checkLevel("sl", direction, entryPrice, stopLoss) !== "ok" ||
    checkLevel("tp", direction, entryPrice, takeProfit) !== "ok"
  ) {
    return null;
  }
  const entry = toUnits(entryPrice)!;
  const sl = toUnits(stopLoss)!;
  const tp = toUnits(takeProfit)!;
  const risk = entry > sl ? entry - sl : sl - entry;
  const reward = entry > tp ? entry - tp : tp - entry;
  return ratio2(reward, risk);
}

/**
 * The Trade RR to suggest (unsigned; the Profit/Loss choice gives the sign):
 *  - Profit → the TP was hit → planned RR (needs SL and TP)
 *  - Loss   → the SL was hit → 1 (needs SL)
 *  - Breakeven (P&L 0) → 0
 * Null when it can't be worked out (the trader can type it instead).
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
  if (pnlSide === "loss") {
    return checkLevel("sl", direction, entryPrice, stopLoss) === "ok" ? "1.00" : null;
  }
  return plannedRr(direction, entryPrice, stopLoss, takeProfit);
}
