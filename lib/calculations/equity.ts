// Equity curve: account balance at the end of each day, plus P&L stats for the period.
// Pure and unit-tested. All money is in integer CENTS (no float drift).
//
// Balance at the end of day d = current balance − every change dated AFTER d,
// summed over the accounts that had started by d. Days are "yyyy-MM-dd" strings
// in the user's timezone (see lib/calculations/week.ts).

import { addDays, format, parseISO } from "date-fns";

export type EquityChange = {
  day: string;
  cents: number;
  /** A closed trade's P&L, or a deposit (+) / withdrawal (−). */
  kind: "trade" | "flow";
};

export type EquityAccount = {
  currentCents: number;
  /** The account's start date ("yyyy-MM-dd"); it isn't counted before then. */
  startDate: string;
  changes: EquityChange[];
};

export type EquityPoint = {
  day: string;
  balanceCents: number;
  /** Net P&L of trades closed that day. */
  pnlCents: number;
  trades: number;
  /** Deposits minus withdrawals that day. */
  flowCents: number;
};

export type EquityCurve = {
  points: EquityPoint[];
  /**
   * Balance just BEFORE the first day (before its trades, deposits and withdrawals),
   * so even a single day draws a line from where it started to where it ended.
   */
  startBalanceCents: number;
  /** Trade P&L over the period (deposits/withdrawals excluded). */
  pnlCents: number;
  /**
   * Largest fall from a peak in cumulative trade P&L within the period (≥ 0),
   * so deposits and withdrawals never count as gains or drawdowns.
   */
  maxDrawdownCents: number;
};

/** Every calendar day from `from` to `to` inclusive ("yyyy-MM-dd"). */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = parseISO(from); format(d, "yyyy-MM-dd") <= to; d = addDays(d, 1)) {
    out.push(format(d, "yyyy-MM-dd"));
  }
  return out;
}

export function buildEquityCurve(days: string[], accounts: EquityAccount[]): EquityCurve {
  const points = days.map((day) => {
    let balanceCents = 0;
    let pnlCents = 0;
    let trades = 0;
    let flowCents = 0;
    for (const a of accounts) {
      if (a.startDate > day) continue;
      let after = 0;
      for (const ch of a.changes) {
        if (ch.day > day) after += ch.cents;
        else if (ch.day === day) {
          if (ch.kind === "trade") {
            pnlCents += ch.cents;
            trades += 1;
          } else flowCents += ch.cents;
        }
      }
      balanceCents += a.currentCents - after;
    }
    return { day, balanceCents, pnlCents, trades, flowCents };
  });

  let cumulative = 0;
  let peak = 0;
  let maxDrawdownCents = 0;
  for (const p of points) {
    cumulative += p.pnlCents;
    peak = Math.max(peak, cumulative);
    maxDrawdownCents = Math.max(maxDrawdownCents, peak - cumulative);
  }
  const first = points[0];
  const startBalanceCents = first ? first.balanceCents - first.pnlCents - first.flowCents : 0;
  return { points, startBalanceCents, pnlCents: cumulative, maxDrawdownCents };
}
