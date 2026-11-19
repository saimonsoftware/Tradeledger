// SL / TP distances (pips for EURUSD, points for NQ) and the Trade RR.
// The trader gets out at the TP on a win and at the SL on a loss.
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
 * Is the level on the correct side of the entry?
 * SL (exit on a loss): long below, short above. TP (exit on a win): long above, short below.
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

/**
 * The trade's result from its prices:
 *  - Profit → out at the TP: RR = +TP distance ÷ SL distance, pips = +TP pips
 *  - Loss   → out at the SL: RR = −1, pips = −SL pips
 *  - P&L of 0 → breakeven: 0R, 0 pips
 * rr is a signed "x.yy" string; pips is signed ("25", "-10"). Null when the
 * needed prices are missing or on the wrong side (the trader can type the RR).
 */
export function tradeResult(input: {
  symbol: string;
  direction: "long" | "short";
  entryPrice: string;
  stopLoss: string | null;
  takeProfit: string | null;
  pnlSide: "profit" | "loss";
  pnlAmount: string | null;
}): { rr: string | null; pips: string | null } {
  const { symbol, direction, entryPrice, stopLoss, takeProfit, pnlSide, pnlAmount } = input;
  const none = { rr: null, pips: null };
  const amount = Number((pnlAmount ?? "").replace(/,/g, ""));
  if (!pnlAmount?.trim() || !Number.isFinite(amount)) return none;
  if (amount === 0) return { rr: "0.00", pips: "0" };

  const slOk = checkLevel("sl", direction, entryPrice, stopLoss) === "ok";
  if (pnlSide === "loss") {
    if (!slOk) return none;
    const pips = pipsBetween(symbol, entryPrice, stopLoss);
    return { rr: "-1.00", pips: pips === null ? null : `-${pips}` };
  }
  const tpOk = checkLevel("tp", direction, entryPrice, takeProfit) === "ok";
  const pips = tpOk ? pipsBetween(symbol, entryPrice, takeProfit) : null;
  if (!slOk || !tpOk) return { rr: null, pips };
  const entry = toUnits(entryPrice)!;
  const sl = toUnits(stopLoss)!;
  const tp = toUnits(takeProfit)!;
  const risk = entry > sl ? entry - sl : sl - entry;
  const reward = entry > tp ? entry - tp : tp - entry;
  return { rr: ratio2(reward, risk), pips };
}

/** Same as tradeResult, for a SAVED trade (numbers from the database). */
export function savedTradeResult(t: {
  symbol: string;
  direction: string;
  entry_price: number | string;
  stop_loss: number | string | null;
  take_profit: number | string | null;
  net_pnl: number | string | null;
}) {
  const str = (v: number | string | null) => (v === null ? null : String(v));
  if (t.net_pnl === null) return { rr: null, pips: null };
  const pnl = Number(t.net_pnl);
  return tradeResult({
    symbol: t.symbol,
    direction: t.direction === "short" ? "short" : "long",
    entryPrice: String(t.entry_price),
    stopLoss: str(t.stop_loss),
    takeProfit: str(t.take_profit),
    pnlSide: pnl < 0 ? "loss" : "profit",
    pnlAmount: String(Math.abs(pnl)),
  });
}
