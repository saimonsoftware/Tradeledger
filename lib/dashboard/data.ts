import "server-only";

import { listAccounts } from "@/lib/accounts/data";
import { requireUser } from "@/lib/auth/dal";
import {
  isInWeek,
  lastNDays,
  localDateKey,
  startOfLocalDay,
  weekRange,
} from "@/lib/calculations/week";
import { getProfile } from "@/lib/profile/data";
import { createClient } from "@/lib/supabase/server";

// All money is summed in integer CENTS, then converted back, to avoid float drift.
const cents = (n: number | string | null) => Math.round(Number(n ?? 0) * 100);
const fromCents = (c: number) => c / 100;

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData({
  chartWeekOffset = 0,
  chartCurrency,
}: {
  chartWeekOffset?: number;
  chartCurrency?: string;
}) {
  await requireUser();
  const [{ timezone, defaultCurrency }, accounts] = await Promise.all([
    getProfile(),
    listAccounts(),
  ]);
  const supabase = await createClient();

  // Request time (after the session read, so it's never prerendered).
  const now = new Date();
  const thisWeek = weekRange(now, timezone, 0);
  const chartWeek = weekRange(now, timezone, chartWeekOffset);
  const sparkDays = lastNDays(now, timezone, 30);
  const sparkStart = startOfLocalDay(sparkDays[0], timezone);
  const since = new Date(Math.min(chartWeek.start.getTime(), sparkStart.getTime())).toISOString();

  const accountIds = accounts.map((a) => a.id);
  const currencyOf = new Map(accounts.map((a) => [a.id, a.currency]));

  const [tradesRes, txRes, recentRes, totalTradesRes] = await Promise.all([
    accountIds.length
      ? supabase
          .from("trades")
          .select("account_id, net_pnl, exit_time")
          .eq("status", "closed")
          .gte("exit_time", since)
          .in("account_id", accountIds)
      : Promise.resolve({ data: [], error: null }),
    accountIds.length
      ? supabase
          .from("account_transactions")
          .select("account_id, type, amount, occurred_at")
          .gte("occurred_at", sparkStart.toISOString())
          .in("account_id", accountIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("trades")
      .select(
        "id, symbol, direction, entry_time, exit_time, status, net_pnl, account:trading_accounts(name, currency)",
      )
      .order("entry_time", { ascending: false })
      .limit(10),
    supabase.from("trades").select("id", { count: "exact", head: true }),
  ]);
  if (tradesRes.error || txRes.error || recentRes.error)
    throw new Error("Could not load dashboard");

  const trades = tradesRes.data ?? [];
  const txs = txRes.data ?? [];

  // ---------------- This week: summary ----------------
  const weekTrades = trades.filter((t) => t.exit_time && isInWeek(t.exit_time, thisWeek));
  const wins = weekTrades.filter((t) => Number(t.net_pnl) > 0).length;

  const currencies = [...new Set(accounts.map((a) => a.currency))];
  const byCurrency = currencies.map((currency) => {
    const accs = accounts.filter((a) => a.currency === currency);
    const balance = accs.reduce((s, a) => s + cents(a.balance.current_balance), 0);
    const weekPnl = weekTrades
      .filter((t) => currencyOf.get(t.account_id) === currency)
      .reduce((s, t) => s + cents(t.net_pnl), 0);
    const weekFlows = txs
      .filter((x) => currencyOf.get(x.account_id) === currency && isInWeek(x.occurred_at, thisWeek))
      .reduce((s, x) => s + (x.type === "deposit" ? 1 : -1) * cents(x.amount), 0);
    // % of the balance at the start of the week (excluding this week's deposits/withdrawals).
    const startBalance = balance - weekPnl - weekFlows;
    return {
      currency,
      balance: fromCents(balance),
      weekPnl: fromCents(weekPnl),
      weekPct: startBalance > 0 ? weekPnl / startBalance : null,
    };
  });

  // ---------------- Per account: week P&L + 30-day balance line ----------------
  const accountTiles = accounts.map((a) => {
    const aTrades = trades.filter((t) => t.account_id === a.id);
    const weekPnl = aTrades
      .filter((t) => t.exit_time && isInWeek(t.exit_time, thisWeek))
      .reduce((s, t) => s + cents(t.net_pnl), 0);

    // Balance at the end of each day = current balance minus every change after that day.
    const changes = [
      ...aTrades.map((t) => ({ day: localDateKey(t.exit_time!, timezone), c: cents(t.net_pnl) })),
      ...txs
        .filter((x) => x.account_id === a.id)
        .map((x) => ({
          day: localDateKey(x.occurred_at, timezone),
          c: (x.type === "deposit" ? 1 : -1) * cents(x.amount),
        })),
    ];
    const current = cents(a.balance.current_balance);
    const startedOn = a.start_date;
    const spark = sparkDays
      .filter((d) => d >= startedOn)
      .map((d) => ({
        day: d,
        balance: fromCents(
          current - changes.filter((ch) => ch.day > d).reduce((s, ch) => s + ch.c, 0),
        ),
      }));

    return {
      id: a.id,
      name: a.name,
      broker: a.broker,
      accountType: a.account_type,
      currency: a.currency,
      balance: fromCents(current),
      weekPnl: fromCents(weekPnl),
      spark,
    };
  });

  // ---------------- Chart: daily net P&L for one currency, one week ----------------
  const chosenCurrency =
    chartCurrency && currencies.includes(chartCurrency)
      ? chartCurrency
      : currencies.includes(defaultCurrency)
        ? defaultCurrency
        : currencies[0];
  const chartTrades = trades.filter(
    (t) =>
      t.exit_time &&
      isInWeek(t.exit_time, chartWeek) &&
      currencyOf.get(t.account_id) === chosenCurrency,
  );
  const chartDays = chartWeek.days.map((day) => {
    const dayTrades = chartTrades.filter((t) => localDateKey(t.exit_time!, timezone) === day);
    return {
      day,
      pnl: fromCents(dayTrades.reduce((s, t) => s + cents(t.net_pnl), 0)),
      trades: dayTrades.length,
    };
  });

  return {
    timezone,
    hasAccounts: accounts.length > 0,
    totalTrades: totalTradesRes.count ?? 0,
    week: {
      days: thisWeek.days,
      closedTrades: weekTrades.length,
      winRate: weekTrades.length ? wins / weekTrades.length : null,
      byCurrency,
    },
    accounts: accountTiles,
    chart: {
      currency: chosenCurrency,
      currencies,
      offset: chartWeekOffset,
      days: chartDays,
      total: fromCents(chartTrades.reduce((s, t) => s + cents(t.net_pnl), 0)),
    },
    recent: recentRes.data ?? [],
  };
}
