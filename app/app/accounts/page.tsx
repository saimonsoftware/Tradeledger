import { Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AccountCard } from "@/components/accounts/account-card";
import { AddAccountButton } from "@/components/accounts/add-account-button";
import { Skeleton } from "@/components/ui/skeleton";
import { listAccounts } from "@/lib/accounts/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Accounts" };

async function AccountsList({
  searchParams,
}: {
  searchParams: PageProps<"/app/accounts">["searchParams"];
}) {
  const { view } = await searchParams;
  const archived = view === "archived";
  const accounts = await listAccounts({ archived });

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );

  return (
    <>
      <nav aria-label="Account filter" className="inline-flex gap-1 rounded-lg bg-muted p-1">
        {tab("/app/accounts", "Active", !archived)}
        {tab("/app/accounts?view=archived", "Archived", archived)}
      </nav>

      {accounts.length === 0 ? (
        archived ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">No archived accounts.</p>
        ) : (
          <div className="mt-6 flex flex-col items-center rounded-2xl surface card-glow px-6 py-14 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl border bg-background text-primary">
              <Wallet className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Add your first trading account</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add each broker or prop firm account you trade, with its currency and starting
              balance.
            </p>
            <div className="mt-6">
              <AddAccountButton size="lg" label="Add your first account" />
            </div>
          </div>
        )
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} />
          ))}
        </ul>
      )}
    </>
  );
}

function AccountsSkeleton() {
  return (
    <>
      <Skeleton className="h-9 w-44 rounded-lg" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-60 rounded-2xl" />
        ))}
      </div>
    </>
  );
}

export default function AccountsPage({ searchParams }: PageProps<"/app/accounts">) {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your broker and prop firm accounts, with live balances.
          </p>
        </div>
        <AddAccountButton />
      </div>
      <Suspense fallback={<AccountsSkeleton />}>
        <AccountsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
