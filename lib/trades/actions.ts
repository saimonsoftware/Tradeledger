"use server";

import { fromZonedTime } from "date-fns-tz";
import { refresh } from "next/cache";

import { requireUser } from "@/lib/auth/dal";
import { getProfile } from "@/lib/profile/data";
import { removeTradeScreenshots } from "@/lib/screenshots/storage";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation/accounts";
import {
  normaliseLocal,
  tradeSchema,
  type TradeInput,
  type TradeOutput,
} from "@/lib/validation/trades";

import { getTradeFormOptions } from "./data";

export type TradeActionResult =
  { ok: true; id: string } | { ok: false; error: string; field?: string };

const GENERIC = "Something went wrong. Please try again.";

/**
 * Exact decimal strings ("21480.25", "-125.50") go to Postgres as text, which casts them to
 * `numeric` without passing through a JS float. The generated DB types say
 * `number`, so this documents (and contains) the one deliberate type cast.
 */
const numeric = (s: string) => s as unknown as number;
const numericOrNull = (s: string | null) => (s === null ? null : numeric(s));

/** Wall-clock time in the user's timezone → UTC ISO string. */
const toUtc = (local: string, tz: string) => fromZonedTime(normaliseLocal(local), tz).toISOString();

function toRow(v: TradeOutput, tz: string) {
  return {
    account_id: v.accountId,
    symbol: v.symbol,
    direction: v.direction,
    bias: v.bias,
    entry_time: toUtc(v.entryTime, tz),
    entry_price: numeric(v.entryPrice),
    exit_price: null, // no longer collected (SL/TP prices instead)
    net_pnl: numericOrNull(v.netPnl),
    r_multiple: numericOrNull(v.rMultiple),
    stop_loss: numericOrNull(v.stopLoss),
    take_profit: numericOrNull(v.takeProfit),
    strategy: v.strategy,
    tags: v.tags,
    notes: v.notes,
    rating: v.rating,
    // user_id is NOT sent: the database sets it from the session (auth.uid()).
    // exit_time / status are NOT sent: the database derives them from net_pnl.
  };
}

function parse(
  input: TradeInput,
): { ok: true; data: TradeOutput } | { ok: false; error: string; field?: string } {
  const parsed = tradeSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const issue = parsed.error.issues[0];
  return { ok: false, error: issue?.message ?? GENERIC, field: issue?.path[0]?.toString() };
}

export async function createTrade(input: TradeInput): Promise<TradeActionResult> {
  await requireUser();
  const parsed = parse(input);
  if (!parsed.ok) return parsed;
  const { timezone } = await getProfile();

  const supabase = await createClient();
  // RLS returns nothing for other users' accounts, so this also checks ownership.
  const { data: account } = await supabase
    .from("trading_accounts")
    .select("is_archived")
    .eq("id", parsed.data.accountId)
    .maybeSingle();
  if (!account) return { ok: false, error: "Choose one of your accounts.", field: "accountId" };
  if (account.is_archived) {
    return { ok: false, error: "That account is archived. Restore it first.", field: "accountId" };
  }

  const { data, error } = await supabase
    .from("trades")
    .insert(toRow(parsed.data, timezone))
    .select("id")
    .single();
  if (error) return { ok: false, error: GENERIC };

  refresh();
  return { ok: true, id: data.id };
}

export async function updateTrade(id: string, input: TradeInput): Promise<TradeActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Trade not found." };
  const parsed = parse(input);
  if (!parsed.ok) return parsed;
  const { timezone } = await getProfile();

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("trades")
    .select("account_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Trade not found." };

  // Moving a trade to a different account: the target must be active and the user's.
  if (existing.account_id !== parsed.data.accountId) {
    const { data: target } = await supabase
      .from("trading_accounts")
      .select("is_archived")
      .eq("id", parsed.data.accountId)
      .maybeSingle();
    if (!target || target.is_archived) {
      return { ok: false, error: "Choose one of your active accounts.", field: "accountId" };
    }
  }

  const { data, error } = await supabase
    .from("trades")
    .update(toRow(parsed.data, timezone))
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: GENERIC };
  if (!data.length) return { ok: false, error: "Trade not found." };

  refresh();
  return { ok: true, id };
}

export async function deleteTrade(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Trade not found." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("trades").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: GENERIC };
  if (!data.length) return { ok: false, error: "Trade not found." };
  // Its screenshots go too (Storage files aren't removed by the database cascade).
  await removeTradeScreenshots(supabase, user.id, id);

  refresh();
  return { ok: true };
}

/** Options for the quick-add sheet (opened from any page). */
export async function loadTradeFormOptions() {
  return getTradeFormOptions();
}
