import { Wallet } from "lucide-react";

import { AddAccountButton } from "@/components/accounts/add-account-button";

export function NoAccountsNotice() {
  return (
    <div className="flex flex-col items-center rounded-2xl surface px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl border bg-background text-primary">
        <Wallet className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">Add an account first</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Every trade belongs to a trading account. Add one, then log your first trade.
      </p>
      <div className="mt-6">
        <AddAccountButton size="lg" />
      </div>
    </div>
  );
}
