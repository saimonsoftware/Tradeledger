// Analytics page: extra measures on top of lib/insights/stats.ts (the same numbers
// the AI Coach uses). Pure and unit-tested. Everything is in R (multiples of the
// amount risked) so accounts of any size and currency compare fairly; money is only
// ever summed per currency, in integer cents.

import { formatInTimeZone } from "date-fns-tz";

import type { StatTrade } from "@/lib/insights/stats";

const round = (n: number, dp = 2) => {
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
};

/** Trades with an RR, oldest first (by close). */
function withR(trades: StatTrade[]) {
  return [...trades]
    .filter((t) => t.rMultiple !== null && Number.isFinite(t.rMultiple))
    .sort((a, b) => a.exitTime.localeCompare(b.exitTime));
}

/** Largest fall from a peak in cumulative R (≥ 0), trade by trade. */
export function maxDrawdownR(trades: StatTrade[]): number {
  let cum = 0;
  let peak = 0;
  let dd = 0;
  for (const t of withR(trades)) {
    cum += t.rMultiple as number;
    peak = Math.max(peak, cum);
    dd = Math.max(dd, peak - cum);
  }
  return round(dd);
}

export type Bucket = { key: string; trades: number; sign: -1 | 0 | 1 };

/** Result buckets, worst to best. A loss at the SL (−1R) lands in "−1R"; a 2R win in "2–3R". */
export const R_BUCKETS = [
  { key: "≤ −1.5R", sign: -1 },
  { key: "−1R", sign: -1 },
  { key: "−0.5–0R", sign: -1 },
  { key: "0R", sign: 0 },
  { key: "0–1R", sign: 1 },
  { key: "1–2R", sign: 1 },
  { key: "2–3R", sign: 1 },
  { key: "3–4R", sign: 1 },
  { key: "4R+", sign: 1 },
] as const;

export function bucketOf(r: number): number {
  if (r === 0) return 3;
  if (r < 0) return r <= -1.5 ? 0 : r <= -0.5 ? 1 : 2;
  return r < 1 ? 4 : r < 2 ? 5 : r < 3 ? 6 : r < 4 ? 7 : 8;
}

export function rDistribution(trades: StatTrade[]): Bucket[] {
  const counts = R_BUCKETS.map(() => 0);
  for (const t of withR(trades)) counts[bucketOf(t.rMultiple as number)]++;
  return R_BUCKETS.map((b, i) => ({ key: b.key, trades: counts[i], sign: b.sign }));
}

export type MonthStats = {
  month: string; // "yyyy-MM"
  trades: number;
  winRate: number;
  totalR: number | null;
  netByCurrency: Record<string, number>;
};

/** Results per calendar month of the close, in the user's timezone. */
export function monthly(trades: StatTrade[], timezone: string): MonthStats[] {
  const groups = new Map<string, StatTrade[]>();
  for (const t of trades) {
    const m = formatInTimeZone(t.exitTime, timezone, "yyyy-MM");
    if (!groups.has(m)) groups.set(m, []);
    groups.get(m)!.push(t);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, ts]) => {
      const rs = ts.filter((t) => t.rMultiple !== null).map((t) => t.rMultiple as number);
      const cents: Record<string, number> = {};
      for (const t of ts) cents[t.currency] = (cents[t.currency] ?? 0) + Math.round(t.netPnl * 100);
      return {
        month,
        trades: ts.length,
        winRate: round(ts.filter((t) => t.netPnl > 0).length / ts.length, 4),
        totalR: rs.length ? round(rs.reduce((s, r) => s + r, 0)) : null,
        netByCurrency: Object.fromEntries(Object.entries(cents).map(([c, v]) => [c, v / 100])),
      };
    });
}

export const ROLLING_WINDOW = 20;

export type RollingPoint = { n: number; winRate: number; expectancy: number };

/**
 * Win rate and expectancy (average R) over the last `window` trades, after each
 * trade from the window-th onwards. Shows whether the trader is improving.
 */
export function rolling(trades: StatTrade[], window = ROLLING_WINDOW): RollingPoint[] {
  const rs = withR(trades);
  const out: RollingPoint[] = [];
  for (let i = window; i <= rs.length; i++) {
    const slice = rs.slice(i - window, i);
    out.push({
      n: i,
      winRate: round(slice.filter((t) => t.netPnl > 0).length / window, 4),
      expectancy: round(slice.reduce((s, t) => s + (t.rMultiple as number), 0) / window),
    });
  }
  return out;
}

export type StopSizes = {
  symbol: string;
  avgSlWins: number | null;
  avgSlLosses: number | null;
  wins: number;
  losses: number;
};

/** Average stop size (pips/points) on winning vs losing trades, per symbol. */
export function stopSizes(trades: StatTrade[]): StopSizes[] {
  const avg = (xs: number[]) =>
    xs.length ? round(xs.reduce((s, x) => s + x, 0) / xs.length, 1) : null;
  return [...new Set(trades.map((t) => t.symbol))].sort().map((symbol) => {
    const ts = trades.filter((t) => t.symbol === symbol && t.slPips != null);
    const wins = ts.filter((t) => t.netPnl > 0);
    const losses = ts.filter((t) => t.netPnl < 0);
    return {
      symbol,
      avgSlWins: avg(wins.map((t) => t.slPips as number)),
      avgSlLosses: avg(losses.map((t) => t.slPips as number)),
      wins: wins.length,
      losses: losses.length,
    };
  });
}
