import "server-only";

import { requireUser } from "@/lib/auth/dal";
import { lastNDays, startOfLocalDay } from "@/lib/calculations/week";
import { computeInsightStats, type StatTrade } from "@/lib/insights/stats";
import { getProfile } from "@/lib/profile/data";
import { createClient } from "@/lib/supabase/server";

export const PERIODS = { "30": 30, "90": 90, "365": 365, all: null } as const;
export type PeriodKey = keyof typeof PERIODS;
export const MIN_TRADES_FOR_REPORT = 5;
const MAX_NOTES = 80;
const MAX_NOTE_CHARS = 400;

/**
 * Loads the user's CLOSED trades for the period (RLS: only ever their own),
 * computes the stats, and collects recent trade notes for the AI.
 */
export async function buildCoachInput(period: PeriodKey, accountId: string | null) {
  await requireUser();
  const { timezone } = await getProfile();
  const supabase = await createClient();

  const days = PERIODS[period];
  const now = new Date();
  const fromDate = days ? lastNDays(now, timezone, days)[0] : null;

  let query = supabase
    .from("trades")
    .select(
      "symbol, direction, asset_class, strategy, tags, rating, entry_time, exit_time, net_pnl, r_multiple, notes, account:trading_accounts(currency)",
    )
    .eq("status", "closed")
    .order("exit_time", { ascending: false })
    .limit(5000);
  if (fromDate) query = query.gte("exit_time", startOfLocalDay(fromDate, timezone).toISOString());
  if (accountId) query = query.eq("account_id", accountId);

  const { data, error } = await query;
  if (error) throw new Error("Could not load trades");

  const trades: StatTrade[] = data.map((t) => ({
    symbol: t.symbol,
    direction: t.direction,
    assetClass: t.asset_class,
    strategy: t.strategy,
    tags: t.tags,
    rating: t.rating,
    entryTime: t.entry_time,
    exitTime: t.exit_time!,
    netPnl: Number(t.net_pnl),
    rMultiple: t.r_multiple === null ? null : Number(t.r_multiple),
    currency: t.account?.currency ?? "EUR",
  }));

  const period_ = { from: fromDate, to: lastNDays(now, timezone, 1)[0] };
  const stats = computeInsightStats(trades, timezone, period_);

  // Most recent trades with notes, trimmed. The AI reads these for behavioural patterns.
  const notes = data
    .filter((t) => t.notes?.trim())
    .slice(0, MAX_NOTES)
    .map((t) => ({
      exit: t.exit_time!.slice(0, 10),
      symbol: t.symbol,
      direction: t.direction,
      strategy: t.strategy,
      tags: t.tags,
      rating: t.rating,
      r: t.r_multiple === null ? null : Number(t.r_multiple),
      result: Number(t.net_pnl) > 0 ? "win" : Number(t.net_pnl) < 0 ? "loss" : "breakeven",
      note: t.notes!.trim().slice(0, MAX_NOTE_CHARS),
    }));

  return { stats, notes, tradeCount: trades.length, timezone, from: fromDate };
}

export type CoachInput = Awaited<ReturnType<typeof buildCoachInput>>;

/** The data block sent to the model: stats + notes, clearly delimited. */
export function renderCoachContext(input: { stats: unknown; notes: unknown[] }) {
  return `<stats>\n${JSON.stringify(input.stats)}\n</stats>\n\n<trade_notes>\n${JSON.stringify(input.notes)}\n</trade_notes>`;
}

export async function getCoachStatus() {
  const user = await requireUser();
  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [{ data: profile }, reports, chats, accounts, list] = await Promise.all([
    supabase.from("profiles").select("ai_consent_at").eq("id", user.id).maybeSingle(),
    supabase
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("kind", "report")
      .gt("created_at", since),
    supabase
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("kind", "chat")
      .gt("created_at", since),
    supabase
      .from("trading_accounts")
      .select("id, name, currency")
      .eq("is_archived", false)
      .order("created_at"),
    supabase
      .from("ai_reports")
      .select("id, created_at, period_from, period_to, trade_count, account_id, report")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  return {
    consented: Boolean(profile?.ai_consent_at),
    reportsLeft: Math.max(0, 5 - (reports.count ?? 0)),
    chatsLeft: Math.max(0, 30 - (chats.count ?? 0)),
    accounts: accounts.data ?? [],
    reports: list.data ?? [],
  };
}

export async function getReportWithMessages(id: string) {
  await requireUser();
  const supabase = await createClient();
  const [{ data: report }, { data: messages }] = await Promise.all([
    supabase
      .from("ai_reports")
      .select("*, account:trading_accounts(name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("ai_messages")
      .select("id, role, content, created_at")
      .eq("report_id", id)
      .order("created_at"),
  ]);
  return report ? { report, messages: messages ?? [] } : null;
}
