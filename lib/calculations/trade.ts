// Pure trade maths, used for the LIVE PREVIEW in the trade form.
// The database computes the stored values (generated columns in the `trades`
// table); these functions mirror those formulas exactly so the preview matches.

export type Direction = "long" | "short";
export type TradeResult = "win" | "loss" | "breakeven";

export type TradeCalcInput = {
  direction: Direction;
  entryPrice: number;
  quantity: number;
  multiplier?: number;
  exitPrice?: number | null;
  fees?: number;
  stopLoss?: number | null;
};

export type TradeCalc = {
  status: "open" | "closed";
  grossPnl: number | null;
  netPnl: number | null;
  /** Money at risk if the stop is hit (before fees). */
  risk: number | null;
  rMultiple: number | null;
  result: TradeResult | null;
};

/** Round half away from zero, like Postgres `numeric` rounding. */
export function roundHalfAwayFromZero(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  // The tiny epsilon corrects binary float noise like 1.005 * 100 = 100.49999…
  const rounded = Math.round(Math.abs(value) * factor + 1e-9) / factor;
  return value < 0 ? -rounded : rounded;
}

const isPos = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

export function calcTrade(input: TradeCalcInput): TradeCalc {
  const { direction, entryPrice, quantity, exitPrice, stopLoss } = input;
  const multiplier = input.multiplier ?? 1;
  const fees = input.fees ?? 0;

  const risk =
    isPos(stopLoss) && isPos(entryPrice) && isPos(quantity) && stopLoss !== entryPrice
      ? Math.abs(entryPrice - stopLoss) * quantity * multiplier
      : null;

  if (!isPos(exitPrice) || !isPos(entryPrice) || !isPos(quantity)) {
    return {
      status: "open",
      grossPnl: null,
      netPnl: null,
      risk: risk === null ? null : roundHalfAwayFromZero(risk),
      rMultiple: null,
      result: null,
    };
  }

  const move = direction === "long" ? exitPrice - entryPrice : entryPrice - exitPrice;
  const grossRaw = move * quantity * multiplier;
  const netRaw = grossRaw - fees;
  const netPnl = roundHalfAwayFromZero(netRaw);

  return {
    status: "closed",
    grossPnl: roundHalfAwayFromZero(grossRaw),
    netPnl,
    risk: risk === null ? null : roundHalfAwayFromZero(risk),
    rMultiple: risk === null ? null : roundHalfAwayFromZero(netRaw / risk),
    result: netPnl > 0 ? "win" : netPnl < 0 ? "loss" : "breakeven",
  };
}
