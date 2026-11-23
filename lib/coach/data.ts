import "server-only";

import { formatInTimeZone } from "date-fns-tz";

import { requireUser } from "@/lib/auth/dal";
import { lastNDays } from "@/lib/calculations/week";
import { loadStatTrades } from "@/lib/insights/load";
import { computeInsightStats, sessionOf } from "@/lib/insights/stats";
import { getProfile } from "@/lib/profile/data";
import { createClient } from "@/lib/supabase/server";

export const PERIODS = { "30": 30, "90": 90, "365": 365, all: null } as const;
export type PeriodKey = keyof typeof PERIODS;
export const MIN_TRADES_FOR_REPORT = 5;
/** Most recent trades sent one per line, so the AI can spot sequences and outliers. */
export const MAX_LOG_TRADES = 150;
const MAX_NOTE_CHARS = 300;

/**
 * Loads the user's CLOSED trades for the period (RLS: only ever their own),
 * computes the stats, and collects recent trade notes for the AI.
 */
export async function buildCoachInput(period: PeriodKey, accountId: string | null) {
  await requireUser();
  const { timezone } = await getProfile();
  const days = PERIODS[period];
  const now = new Date();
  const fromDate = days ? lastNDays(now, timezone, days)[0] : null;
  const { rows, trades } = await loadStatTrades({ timezone, fromDate, accountId });

  const period_ = { from: fromDate, to: lastNDays(now, timezone, 1)[0] };
  const stats = computeInsightStats(trades, timezone, period_);

  // The most recent trades, one compact row each (newest first), including the
  // trader's notes. The AI uses these to spot sequences, outliers and behaviour;
  // every NUMBER it quotes still comes from the stats above.
  const tradeLog = rows.slice(0, MAX_LOG_TRADES).map(({ t, pips, slPips, tpPips }) => ({
    when: formatInTimeZone(t.entry_time, timezone, "yyyy-MM-dd EEE HH:mm"),
    session: sessionOf(t.entry_time),
    symbol: t.symbol,
    dir: t.direction,
    bias: t.bias ?? undefined,
    strategy: t.strategy,
    result: Number(t.net_pnl) > 0 ? "win" : Number(t.net_pnl) < 0 ? "loss" : "breakeven",
    r: t.r_multiple === null ? null : Number(t.r_multiple),
    pips,
    slPips,
    tpPips,
    tags: t.tags.length ? t.tags : undefined,
    rating: t.rating ?? undefined,
    note: t.notes?.trim() ? t.notes.trim().slice(0, MAX_NOTE_CHARS) : undefined,
  }));

  return { stats, tradeLog, tradeCount: trades.length, timezone, from: fromDate };
}

export type CoachInput = Awaited<ReturnType<typeof buildCoachInput>>;

/** The data block sent to the model: stats + trade log, clearly delimited. */
export function renderCoachContext(input: { stats: unknown; tradeLog: unknown[] }) {
  return `<stats>\n${JSON.stringify(input.stats)}\n</stats>\n\n<trade_log>\n${JSON.stringify(input.tradeLog)}\n</trade_log>`;
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
