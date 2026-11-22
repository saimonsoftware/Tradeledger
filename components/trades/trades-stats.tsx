import { ListOrdered, Target, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { SignedAmount } from "@/components/common/signed-amount";
import type { CurrencyTotal } from "@/lib/trades/data";

type Totals = {
  trades: number;
  closed: number;
  winRate: number | null;
  netByCurrency: CurrencyTotal[];
};

function Tile({
  icon,
  label,
  children,
  className = "",
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl surface card-glow p-4 ${className}`}>
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-md border bg-background">
          {icon}
        </span>
        {label}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** Totals for the whole filtered set (not just the page shown). */
export function TradesStats({ totals }: { totals: Totals }) {
  const open = totals.trades - totals.closed;
  const winPct = totals.winRate === null ? null : Math.round(totals.winRate * 100);
  return (
    <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        icon={<Wallet className="size-3.5" aria-hidden="true" />}
        label="Net P&L"
        className="col-span-2"
      >
        {totals.netByCurrency.length === 0 ? (
          <p className="text-3xl font-semibold tracking-tight text-muted-foreground">—</p>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            {totals.netByCurrency.map((t) => (
              <SignedAmount
                key={t.currency}
                value={t.netPnl}
                currency={t.currency}
                className="text-3xl font-semibold tracking-tight [&_svg]:size-5"
              />
            ))}
          </div>
        )}
        <p className="mt-1 text-xs text-muted-foreground">Closed trades, after costs</p>
      </Tile>

      <Tile icon={<Target className="size-3.5" aria-hidden="true" />} label="Win rate">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {winPct === null ? "—" : `${winPct}%`}
        </p>
        <div
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={winPct === null ? "No closed trades yet" : `${winPct}% of closed trades won`}
        >
          <div className="h-full rounded-full bg-foreground" style={{ width: `${winPct ?? 0}%` }} />
        </div>
      </Tile>

      <Tile icon={<ListOrdered className="size-3.5" aria-hidden="true" />} label="Trades">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{totals.trades}</p>
        <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
          {totals.closed} closed · {open} open
        </p>
      </Tile>
    </section>
  );
}
