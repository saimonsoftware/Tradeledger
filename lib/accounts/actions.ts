"use server";

import { refresh } from "next/cache";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  accountSchema,
  idSchema,
  transactionSchema,
  type AccountInput,
  type TransactionInput,
} from "@/lib/validation/accounts";
import { moneyToNumber } from "@/lib/validation/money";

// Every action: (1) re-checks the user, (2) validates input with Zod,
// (3) writes through RLS (user_id is set by the database, never by the client),
// (4) refreshes the page.

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const GENERIC = "Something went wrong. Please try again.";
const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? GENERIC;

export async function createAccount(input: AccountInput): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trading_accounts")
    .insert({
      name: v.name,
      broker: v.broker,
      account_type: v.accountType,
      currency: v.currency,
      starting_balance: moneyToNumber(v.startingBalance),
      start_date: v.startDate,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: GENERIC };
  refresh();
  return { ok: true, data: { id: data.id } };
}

export async function updateAccount(id: string, input: AccountInput): Promise<ActionResult> {
  await requireUser();
  const idOk = idSchema.safeParse(id);
  const parsed = accountSchema.safeParse(input);
  if (!idOk.success) return { ok: false, error: "Account not found." };
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("trading_accounts")
    .select("currency")
    .eq("id", id)
    .maybeSingle();
  if (!current) return { ok: false, error: "Account not found." };

  // Changing currency after money has moved would silently relabel every amount.
  if (current.currency !== v.currency) {
    const [tx, trades] = await Promise.all([
      supabase
        .from("account_transactions")
        .select("id", { count: "exact", head: true })
        .eq("account_id", id),
      supabase.from("trades").select("id", { count: "exact", head: true }).eq("account_id", id),
    ]);
    if ((tx.count ?? 0) + (trades.count ?? 0) > 0) {
      return {
        ok: false,
        error: "The currency can't be changed once the account has transactions or trades.",
      };
    }
  }

  const { data, error } = await supabase
    .from("trading_accounts")
    .update({
      name: v.name,
      broker: v.broker,
      account_type: v.accountType,
      currency: v.currency,
      starting_balance: moneyToNumber(v.startingBalance),
      start_date: v.startDate,
    })
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, error: GENERIC };
  if (!data.length) return { ok: false, error: "Account not found." };
  refresh();
  return { ok: true };
}

export async function setAccountArchived(id: string, archived: boolean): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success || typeof archived !== "boolean") {
    return { ok: false, error: "Account not found." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trading_accounts")
    .update({ is_archived: archived })
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, error: GENERIC };
  if (!data.length) return { ok: false, error: "Account not found." };
  refresh();
  return { ok: true };
}

export async function createTransaction(input: TransactionInput): Promise<ActionResult> {
  await requireUser();
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("account_transactions").insert({
    account_id: v.accountId,
    type: v.type,
    amount: moneyToNumber(v.amount),
    // Stored at midday UTC so the calendar date is the same in every timezone.
    occurred_at: `${v.date}T12:00:00Z`,
    note: v.note,
  });

  // A foreign-key/RLS failure here means the account isn't the user's own.
  if (error) return { ok: false, error: error.code === "23503" ? "Account not found." : GENERIC };
  refresh();
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Transaction not found." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_transactions")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, error: GENERIC };
  if (!data.length) return { ok: false, error: "Transaction not found." };
  refresh();
  return { ok: true };
}
