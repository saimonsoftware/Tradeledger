import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AccountActions } from "@/components/accounts/account-actions";
import { AccountTypeBadge } from "@/components/accounts/account-type-badge";
import { TransactionList } from "@/components/accounts/transaction-list";
import { SignedAmount } from "@/components/common/signed-amount";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAccount } from "@/lib/accounts/data";
import { formatCurrency } from "@/lib/format/currency";
import { idSchema } from "@/lib/validation/accounts";

export const metadata: Metadata = { title: "Account" };

async function AccountDetail({ params }: { params: PageProps<"/app/accounts/[id]">["params"] }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  // RLS: returns null for accounts that don't exist OR belong to someone else.
  const result = await getAccount(id);
  if (!result) notFound();
  const { account, balance, transactions, tradeCount } = result;

  const cur = account.currency;
  const deposits = Number(balance.total_deposits ?? 0);
  const withdrawals = Number(balance.total_withdrawals ?? 0);
  const realized = Number(balance.realized_pnl ?? 0);
  const current = Number(balance.current_balance ?? account.starting_balance);
  const hasActivity = transactions.length > 0 || tradeCount > 0;

  const stats = [
    { label: "Starting balance", value: formatCurrency(Number(account.starting_balance), cur) },
    { label: "Deposits", value: formatCurrency(deposits, cur) },
    { label: "Withdrawals", value: formatCurrency(withdrawals, cur) },
  ];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{account.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <AccountTypeBadge type={account.account_type} />
            {account.is_archived && <Badge variant="secondary">Archived</Badge>}
            <span>{account.broker ?? "No broker set"}</span>
            <span aria-hidden="true">·</span>
            <span>{cur}</span>
            <span aria-hidden="true">·</span>
            <span>
              Since {formatInTimeZone(`${account.start_date}T12:00:00Z`, "UTC", "d MMM yyyy")}
            </span>
          </div>
        </div>
        <AccountActions account={account} hasActivity={hasActivity} variant="buttons" />
      </div>

      <section aria-label="Balance" className="mt-6 rounded-2xl surface card-glow p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current balance</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
              {formatCurrency(current, cur)}
            </p>
            <p className="mt-2 text-sm">
              <SignedAmount value={realized} currency={cur} />{" "}
              <span className="text-muted-foreground">
                realized from {tradeCount} trade{tradeCount === 1 ? "" : "s"}
              </span>
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-4 text-sm sm:gap-8">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className="mt-0.5 font-medium tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">
          Balance = starting balance + deposits − withdrawals + net P&amp;L of closed trades.
        </p>
      </section>

      <section aria-labelledby="tx-title" className="mt-6 rounded-2xl surface">
        <h2 id="tx-title" className="border-b px-5 py-4 font-semibold">
          Deposits &amp; withdrawals
        </h2>
        <TransactionList transactions={transactions} currency={cur} />
      </section>
    </>
  );
}

function DetailSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-3 h-5 w-80" />
      <Skeleton className="mt-6 h-48 rounded-2xl" />
      <Skeleton className="mt-6 h-40 rounded-2xl" />
    </>
  );
}

export default function AccountPage({ params }: PageProps<"/app/accounts/[id]">) {
  return (
    <div>
      <Link
        href="/app/accounts"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> All accounts
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <AccountDetail params={params} />
      </Suspense>
    </div>
  );
}
