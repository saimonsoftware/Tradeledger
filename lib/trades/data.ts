import "server-only";

import { addDays, format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { requireUser } from "@/lib/auth/dal";
import { getProfile } from "@/lib/profile/data";
import { listTradeScreenshots } from "@/lib/screenshots/storage";
import { createClient } from "@/lib/supabase/server";

import { TRADES_PAGE_SIZE } from "./constants";
import type { TradeFilters } from "./filters";

type Client = Awaited<ReturnType<typeof createClient>>;

const LIST_COLUMNS =
  "id, symbol, direction, entry_time, exit_time, entry_price, exit_price, net_pnl, r_multiple, status, strategy, account:trading_accounts(id, name, currency)";

/**
 * Applies the list filters to a trades query. Date filters are calendar days in
 * the user's timezone, converted to UTC bounds: [from 00:00, day-after-`to` 00:00).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js filter builders are deeply generic; this helper only chains filter methods.
function applyFilters<Q extends { [k: string]: any }>(query: Q, f: TradeFilters, tz: string): Q {
  let q = query;
  if (f.from) q = q.gte("entry_time", fromZonedTime(`${f.from}T00:00:00`, tz).toISOString());
  if (f.to) {
    const nextDay = format(addDays(parseISO(f.to), 1), "yyyy-MM-dd");
    q = q.lt("entry_time", fromZonedTime(`${nextDay}T00:00:00`, tz).toISOString());
  }
  if (f.account) q = q.eq("account_id", f.account);
  if (f.symbol) q = q.eq("symbol", f.symbol);
  if (f.direction) q = q.eq("direction", f.direction);
  if (f.status) q = q.eq("status", f.status);
  if (f.strategy) q = q.eq("strategy", f.strategy);
  if (f.result === "win") q = q.gt("net_pnl", 0);
  if (f.result === "loss") q = q.lt("net_pnl", 0);
  if (f.result === "breakeven") q = q.eq("net_pnl", 0);
  return q;
}

export type CurrencyTotal = { currency: string; netPnl: number };

export async function listTrades(filters: TradeFilters) {
  await requireUser();
  const { timezone } = await getProfile();
  const supabase = await createClient();

  const sort = filters.sort ?? "entry_time";
  const ascending = (filters.dir ?? "desc") === "asc";
  const page = filters.page ?? 1;
  const from = (page - 1) * TRADES_PAGE_SIZE;

  const listQuery = applyFilters(
    supabase.from("trades").select(LIST_COLUMNS, { count: "exact" }),
    filters,
    timezone,
  )
    .order(sort, { ascending, nullsFirst: false })
    .order("id", { ascending: true }) // stable order for equal values
    .range(from, from + TRADES_PAGE_SIZE - 1);

  // Totals cover the WHOLE filtered set, not just this page. Only light columns.
  // (Fine for thousands of trades; move to a SQL function if this ever grows large.)
  const totalsQuery = applyFilters(
    supabase.from("trades").select("net_pnl, status, account:trading_accounts(currency)"),
    filters,
    timezone,
  ).limit(10000);

  const [list, totals] = await Promise.all([listQuery, totalsQuery]);
  if (list.error || totals.error) throw new Error("Could not load trades");

  const closed = totals.data.filter((t) => t.status === "closed");
  const wins = closed.filter((t) => Number(t.net_pnl) > 0).length;
  const byCurrency = new Map<string, number>();
  for (const t of closed) {
    const cur = t.account?.currency ?? "—";
    // Sum in integer cents to avoid float drift across many trades.
    byCurrency.set(cur, (byCurrency.get(cur) ?? 0) + Math.round(Number(t.net_pnl) * 100));
  }

  return {
    trades: list.data,
    count: list.count ?? 0,
    page,
    pageCount: Math.max(1, Math.ceil((list.count ?? 0) / TRADES_PAGE_SIZE)),
    timezone,
    totals: {
      trades: totals.data.length,
      closed: closed.length,
      winRate: closed.length ? wins / closed.length : null,
      netByCurrency: [...byCurrency].map(([currency, cents]) => ({
        currency,
        netPnl: cents / 100,
      })),
    },
  };
}

export type TradeListItem = Awaited<ReturnType<typeof listTrades>>["trades"][number];

export async function getTrade(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("trades")
    .select("*, account:trading_accounts(id, name, currency, is_archived)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export type TradeDetail = NonNullable<Awaited<ReturnType<typeof getTrade>>>;

/** The current user's screenshots for one trade, with short-lived view links. */
export async function getScreenshotsForTrade(tradeId: string) {
  const user = await requireUser();
  return listTradeScreenshots(await createClient(), user.id, tradeId);
}

export async function getTradeFormOptions(client?: Client) {
  await requireUser();
  const { timezone } = await getProfile();
  const supabase = client ?? (await createClient());
  const [accounts, strategies] = await Promise.all([
    supabase
      .from("trading_accounts")
      .select("id, name, currency, is_archived")
      .order("created_at", { ascending: true }),
    supabase.from("trades").select("strategy").not("strategy", "is", null).limit(1000),
  ]);
  return {
    timezone,
    // "Now" as a wall-clock time in the user's timezone, for the default entry time.
    // Computed on the server after the session read (so it's request-time data).
    nowLocal: formatInTimeZone(new Date(), timezone, "yyyy-MM-dd'T'HH:mm"),
    accounts: accounts.data ?? [],
    strategies: [...new Set((strategies.data ?? []).map((s) => s.strategy!))].sort(),
  };
}

export type TradeFormOptions = Awaited<ReturnType<typeof getTradeFormOptions>>;
