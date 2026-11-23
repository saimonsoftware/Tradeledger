import "server-only";

import { pipsBetween, savedTradeResult } from "@/lib/calculations/rr";
import { startOfLocalDay } from "@/lib/calculations/week";
import type { StatTrade } from "@/lib/insights/stats";
import { SYMBOL_ASSET_CLASS } from "@/lib/trades/constants";
import { createClient } from "@/lib/supabase/server";

/**
 * The user's CLOSED trades (RLS: only ever their own), newest first, turned into
 * the rows the statistics work on. Shared by the AI Coach and the Analytics page,
 * so both always show the same numbers. Callers must have checked the session.
 */
export async function loadStatTrades({
  timezone,
  fromDate,
  accountId,
  symbol,
  strategy,
}: {
  timezone: string;
  /** "yyyy-MM-dd" in the user's timezone, or null for all time. */
  fromDate: string | null;
  accountId: string | null;
  symbol?: string | null;
  strategy?: string | null;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("trades")
    .select(
      "symbol, direction, strategy, tags, rating, entry_time, exit_time, entry_price, stop_loss, take_profit, net_pnl, r_multiple, notes, account:trading_accounts(currency)",
    )
    .eq("status", "closed")
    .order("exit_time", { ascending: false })
    .limit(5000);
  if (fromDate) query = query.gte("exit_time", startOfLocalDay(fromDate, timezone).toISOString());
  if (accountId) query = query.eq("account_id", accountId);
  if (symbol) query = query.eq("symbol", symbol);
  if (strategy) query = query.eq("strategy", strategy);

  const { data, error } = await query;
  if (error) throw new Error("Could not load trades");

  const num = (v: string | null) => (v === null ? null : Number(v));
  const rows = data.map((t) => {
    const entry = String(t.entry_price);
    const sl = t.stop_loss === null ? null : String(t.stop_loss);
    const tp = t.take_profit === null ? null : String(t.take_profit);
    return {
      t,
      pips: num(savedTradeResult(t).pips),
      slPips: num(pipsBetween(t.symbol, entry, sl)),
      tpPips: num(pipsBetween(t.symbol, entry, tp)),
    };
  });

  const trades: StatTrade[] = rows.map(({ t, pips, slPips, tpPips }) => ({
    symbol: t.symbol,
    direction: t.direction,
    assetClass: SYMBOL_ASSET_CLASS[t.symbol] ?? "other",
    strategy: t.strategy,
    tags: t.tags,
    rating: t.rating,
    entryTime: t.entry_time,
    exitTime: t.exit_time!,
    netPnl: Number(t.net_pnl),
    // Trade RR (calculated from SL/TP, or typed by the trader).
    rMultiple: t.r_multiple === null ? null : Number(t.r_multiple),
    currency: t.account?.currency ?? "EUR",
    pips,
    slPips,
    tpPips,
  }));

  return { rows, trades };
}
