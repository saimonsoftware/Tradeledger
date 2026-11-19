import Link from "next/link";

import { SignedAmount } from "@/components/common/signed-amount";
import type { AccountWithBalance } from "@/lib/accounts/data";
import { formatCurrency } from "@/lib/format/currency";

import { AccountActions } from "./account-actions";
import { AccountTypeBadge } from "./account-type-badge";

export function AccountCard({ account }: { account: AccountWithBalance }) {
  const b = account.balance;
  const current = Number(b.current_balance ?? account.starting_balance);
  const netFlows = Number(b.total_deposits ?? 0) - Number(b.total_withdrawals ?? 0);
  const realized = Number(b.realized_pnl ?? 0);
  const hasActivity = netFlows !== 0 || Number(b.total_deposits ?? 0) > 0 || realized !== 0;

  return (
    <li className="group relative flex flex-col rounded-2xl surface card-glow p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {/* The whole card is clickable via this link's ::after overlay. */}
          <Link
            href={`/app/accounts/${account.id}`}
            className="font-semibold outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            <span className="line-clamp-1">{account.name}</span>
          </Link>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {account.broker ?? "No broker set"}
          </p>
        </div>
        {/* Sits above the link overlay so the menu stays clickable. */}
        <div className="relative z-10 -mt-1 -mr-2">
          <AccountActions account={account} hasActivity={hasActivity} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <AccountTypeBadge type={account.account_type} />
        <span className="font-mono text-[11px] text-muted-foreground">{account.currency}</span>
      </div>

      <p className="mt-5 text-xs text-muted-foreground">Current balance</p>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">
        {formatCurrency(current, account.currency)}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-xs">
        <div>
          <dt className="text-muted-foreground">Realized P&amp;L</dt>
          <dd className="mt-0.5">
            <SignedAmount value={realized} currency={account.currency} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Net deposits</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            {formatCurrency(netFlows, account.currency)}
          </dd>
        </div>
      </dl>
    </li>
  );
}
