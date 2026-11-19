import "server-only";

import { requireUser } from "@/lib/auth/dal";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type AccountRow = Database["public"]["Tables"]["trading_accounts"]["Row"];
type BalanceRow = Database["public"]["Views"]["account_balances"]["Row"];
export type TransactionRow = Database["public"]["Tables"]["account_transactions"]["Row"];

export type AccountWithBalance = AccountRow & {
  balance: Pick<
    BalanceRow,
    "current_balance" | "total_deposits" | "total_withdrawals" | "realized_pnl"
  >;
};

const EMPTY_BALANCE = {
  current_balance: null,
  total_deposits: 0,
  total_withdrawals: 0,
  realized_pnl: 0,
};

// All reads go through RLS with the user's own session, so they can only ever
// return the current user's rows. requireUser() is an extra explicit check.

export async function listAccounts({ archived = false } = {}): Promise<AccountWithBalance[]> {
  await requireUser();
  const supabase = await createClient();

  const { data: accounts, error } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("is_archived", archived)
    .order("created_at", { ascending: true });
  if (error) throw new Error("Could not load accounts");
  if (!accounts.length) return [];

  const { data: balances, error: balErr } = await supabase
    .from("account_balances")
    .select("account_id, current_balance, total_deposits, total_withdrawals, realized_pnl")
    .in(
      "account_id",
      accounts.map((a) => a.id),
    );
  if (balErr) throw new Error("Could not load balances");

  const byId = new Map(balances.map((b) => [b.account_id, b]));
  return accounts.map((a) => ({ ...a, balance: byId.get(a.id) ?? EMPTY_BALANCE }));
}

export async function countAccounts() {
  await requireUser();
  const supabase = await createClient();
  const { count } = await supabase
    .from("trading_accounts")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function getAccount(id: string) {
  await requireUser();
  const supabase = await createClient();

  const [{ data: account }, { data: balance }, { data: transactions }, { count: tradeCount }] =
    await Promise.all([
      supabase.from("trading_accounts").select("*").eq("id", id).maybeSingle(),
      supabase.from("account_balances").select("*").eq("account_id", id).maybeSingle(),
      supabase
        .from("account_transactions")
        .select("*")
        .eq("account_id", id)
        .order("occurred_at", { ascending: false }),
      supabase.from("trades").select("id", { count: "exact", head: true }).eq("account_id", id),
    ]);

  if (!account) return null;
  return {
    account,
    balance: balance ?? EMPTY_BALANCE,
    transactions: transactions ?? [],
    tradeCount: tradeCount ?? 0,
  };
}
