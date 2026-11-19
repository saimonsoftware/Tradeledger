// Pattern statistics for the AI Coach.
//
// The NUMBERS are always computed here, deterministically, and unit-tested.
// The AI only interprets this summary; it never does arithmetic itself.
//
// Currency-neutral measures (win rate, R-multiples) are the headline, so accounts
// in different currencies can be compared. Money totals are kept per currency.

import { formatInTimeZone } from "date-fns-tz";

export type StatTrade = {
  symbol: string;
  direction: "long" | "short" | string;
  assetClass: string;
  strategy: string | null;
  tags: string[];
  rating: number | null;
  entryTime: string; // ISO
  exitTime: string; // ISO (closed trades only)
  netPnl: number;
  rMultiple: number | null;
  currency: string;
};

/** Groups with fewer trades than this are flagged so they're not over-interpreted. */
export const MIN_SAMPLE = 5;

export type GroupStats = {
  key: string;
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number; // 0..1
  /** Average R over trades that have an R-multiple (stop loss set). */
  avgR: number | null;
  /** How many trades contributed to avgR. */
  rCount: number;
  /** Net P&L per currency, e.g. { USD: 433.9 }. */
  netByCurrency: Record<string, number>;
  smallSample: boolean;
};

export type InsightStats = {
  timezone: string;
  period: { from: string | null; to: string | null };
  overall: GroupStats & {
    avgWinR: number | null;
    avgLossR: number | null;
    /** Gross profit / gross loss, per currency. null when there are no losses. */
    profitFactorByCurrency: Record<string, number | null>;
    longestWinStreak: number;
    longestLossStreak: number;
  };
  byStrategy: GroupStats[];
  byTag: GroupStats[];
  bySymbol: GroupStats[];
  byDirection: GroupStats[];
  byAssetClass: GroupStats[];
  byWeekday: GroupStats[];
  byHour: GroupStats[];
  /** Only trades with a real exit time (older trades); empty for trades logged without one. */
  byHoldingTime: GroupStats[];
  /** Market session of the entry, in New York time (see SESSION_NOTE). */
  bySession: GroupStats[];
  /** Combinations: keys look like "ORB · NQ". Find which setup works where and when. */
  byStrategySymbol: GroupStats[];
  byStrategyDirection: GroupStats[];
  byStrategySession: GroupStats[];
  /** Plain-language definitions sent along with the numbers. */
  definitions: Record<string, string>;
  byRating: GroupStats[];
  /** The trade taken right after a losing trade, vs after a winning one ("revenge trading"). */
  afterLoss: GroupStats | null;
  afterWin: GroupStats | null;
};

const round = (n: number, dp = 2) => {
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
};

export function groupStats(key: string, trades: StatTrade[]): GroupStats {
  const wins = trades.filter((t) => t.netPnl > 0).length;
  const losses = trades.filter((t) => t.netPnl < 0).length;
  const withR = trades.filter((t) => t.rMultiple !== null && Number.isFinite(t.rMultiple));
  const centsByCurrency: Record<string, number> = {};
  for (const t of trades) {
    centsByCurrency[t.currency] = (centsByCurrency[t.currency] ?? 0) + Math.round(t.netPnl * 100);
  }
  return {
    key,
    trades: trades.length,
    wins,
    losses,
    breakeven: trades.length - wins - losses,
    winRate: trades.length ? round(wins / trades.length, 4) : 0,
    avgR: withR.length
      ? round(withR.reduce((s, t) => s + (t.rMultiple as number), 0) / withR.length)
      : null,
    rCount: withR.length,
    netByCurrency: Object.fromEntries(
      Object.entries(centsByCurrency).map(([c, v]) => [c, v / 100]),
    ),
    smallSample: trades.length < MIN_SAMPLE,
  };
}

function groupBy(
  trades: StatTrade[],
  keyOf: (t: StatTrade) => string | string[] | null,
): GroupStats[] {
  const groups = new Map<string, StatTrade[]>();
  for (const t of trades) {
    const k = keyOf(t);
    const keys = k === null ? [] : Array.isArray(k) ? k : [k];
    for (const key of keys) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
  }
  return [...groups]
    .map(([key, ts]) => groupStats(key, ts))
    .sort((a, b) => b.trades - a.trades || a.key.localeCompare(b.key));
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Trading sessions by NEW YORK time (follows US daylight saving automatically).
// The same for every trader, whatever their own timezone, because markets keep NY hours.
export const SESSIONS = ["Asia", "London", "New York AM", "New York PM", "After hours"] as const;
export const SESSION_NOTE =
  "Sessions by entry time in New York time: Asia 19:00–03:00, London 03:00–08:00, New York AM 08:00–12:00, New York PM 12:00–17:00, After hours 17:00–19:00.";

export function sessionOf(entryIso: string): (typeof SESSIONS)[number] {
  const hour = Number(formatInTimeZone(entryIso, "America/New_York", "H"));
  if (hour >= 19 || hour < 3) return "Asia";
  if (hour < 8) return "London";
  if (hour < 12) return "New York AM";
  if (hour < 17) return "New York PM";
  return "After hours";
}

const strategyOf = (t: StatTrade) => t.strategy?.trim() || "(no strategy)";
const bySessionOrder = (a: GroupStats, b: GroupStats) =>
  SESSIONS.indexOf(a.key as (typeof SESSIONS)[number]) -
  SESSIONS.indexOf(b.key as (typeof SESSIONS)[number]);

/** null when there's no real exit time (trades now close at their entry time). */
export function holdingBucket(entryIso: string, exitIso: string): string | null {
  const minutes = (new Date(exitIso).getTime() - new Date(entryIso).getTime()) / 60_000;
  if (!(minutes > 0)) return null;
  if (minutes < 5) return "under 5 min";
  if (minutes < 30) return "5–30 min";
  if (minutes < 120) return "30 min–2 h";
  if (minutes < 60 * 24) return "2 h–1 day";
  return "over 1 day";
}

function streaks(sorted: StatTrade[]) {
  let win = 0,
    loss = 0,
    curW = 0,
    curL = 0;
  for (const t of sorted) {
    if (t.netPnl > 0) {
      curW++;
      curL = 0;
    } else if (t.netPnl < 0) {
      curL++;
      curW = 0;
    } else {
      curW = 0;
      curL = 0;
    }
    win = Math.max(win, curW);
    loss = Math.max(loss, curL);
  }
  return { longestWinStreak: win, longestLossStreak: loss };
}

/**
 * Builds the full pattern summary for CLOSED trades.
 * Weekday/hour use the user's timezone (their trading day), like the dashboard.
 */
export function computeInsightStats(
  trades: StatTrade[],
  timezone: string,
  period: { from: string | null; to: string | null } = { from: null, to: null },
): InsightStats {
  // Chronological by exit, so streaks and "next trade after a loss" follow real order.
  const sorted = [...trades].sort((a, b) => a.exitTime.localeCompare(b.exitTime));

  const base = groupStats("all", sorted);
  const winsR = sorted
    .filter((t) => t.netPnl > 0 && t.rMultiple !== null)
    .map((t) => t.rMultiple as number);
  const lossesR = sorted
    .filter((t) => t.netPnl < 0 && t.rMultiple !== null)
    .map((t) => t.rMultiple as number);
  const avg = (xs: number[]) =>
    xs.length ? round(xs.reduce((s, x) => s + x, 0) / xs.length) : null;

  const profitFactorByCurrency: Record<string, number | null> = {};
  for (const cur of new Set(sorted.map((t) => t.currency))) {
    const inCur = sorted.filter((t) => t.currency === cur);
    const grossWin = inCur
      .filter((t) => t.netPnl > 0)
      .reduce((s, t) => s + Math.round(t.netPnl * 100), 0);
    const grossLoss = -inCur
      .filter((t) => t.netPnl < 0)
      .reduce((s, t) => s + Math.round(t.netPnl * 100), 0);
    profitFactorByCurrency[cur] = grossLoss > 0 ? round(grossWin / grossLoss) : null;
  }

  // The trade that FOLLOWS a loss/win (by entry order) shows emotional patterns.
  const byEntry = [...trades].sort((a, b) => a.entryTime.localeCompare(b.entryTime));
  const afterLossTrades: StatTrade[] = [];
  const afterWinTrades: StatTrade[] = [];
  for (let i = 1; i < byEntry.length; i++) {
    const prev = byEntry[i - 1];
    // Only count it if the previous trade had already closed when this one was entered.
    if (prev.exitTime > byEntry[i].entryTime) continue;
    if (prev.netPnl < 0) afterLossTrades.push(byEntry[i]);
    else if (prev.netPnl > 0) afterWinTrades.push(byEntry[i]);
  }

  return {
    timezone,
    period,
    overall: {
      ...base,
      avgWinR: avg(winsR),
      avgLossR: avg(lossesR),
      profitFactorByCurrency,
      ...streaks(sorted),
    },
    byStrategy: groupBy(sorted, strategyOf),
    byTag: groupBy(sorted, (t) => (t.tags.length ? t.tags : null)),
    bySymbol: groupBy(sorted, (t) => t.symbol),
    byDirection: groupBy(sorted, (t) => t.direction),
    byAssetClass: groupBy(sorted, (t) => t.assetClass),
    byWeekday: groupBy(sorted, (t) => formatInTimeZone(t.entryTime, timezone, "EEE")).sort(
      (a, b) => WEEKDAYS.indexOf(a.key) - WEEKDAYS.indexOf(b.key),
    ),
    byHour: groupBy(sorted, (t) => `${formatInTimeZone(t.entryTime, timezone, "HH")}:00`).sort(
      (a, b) => a.key.localeCompare(b.key),
    ),
    byHoldingTime: groupBy(sorted, (t) => holdingBucket(t.entryTime, t.exitTime)),
    bySession: groupBy(sorted, (t) => sessionOf(t.entryTime)).sort(bySessionOrder),
    byStrategySymbol: groupBy(sorted, (t) => `${strategyOf(t)} · ${t.symbol}`),
    byStrategyDirection: groupBy(sorted, (t) => `${strategyOf(t)} · ${t.direction}`),
    byStrategySession: groupBy(sorted, (t) => `${strategyOf(t)} · ${sessionOf(t.entryTime)}`),
    byRating: groupBy(sorted, (t) => (t.rating ? `${t.rating}★` : "unrated")).sort((a, b) =>
      a.key.localeCompare(b.key),
    ),
    afterLoss: afterLossTrades.length ? groupStats("after a loss", afterLossTrades) : null,
    afterWin: afterWinTrades.length ? groupStats("after a win", afterWinTrades) : null,
    definitions: {
      avgR: "Average of the Trade RR the trader entered (result in multiples of the amount risked). rCount = trades with an RR.",
      sessions: SESSION_NOTE,
      combinations:
        'byStrategySymbol / byStrategyDirection / byStrategySession keys are "strategy · symbol/direction/session".',
      holdingTime:
        "byHoldingTime only covers trades with a recorded exit time; trades logged without one are not included.",
    },
  };
}
