import { BookOpen, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SignedAmount } from "@/components/common/signed-amount";
import { NoAccountsNotice } from "@/components/trades/no-accounts-notice";
import { TradeFilters } from "@/components/trades/trade-filters";
import { TradesTable } from "@/components/trades/trades-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getTradeFormOptions, listTrades } from "@/lib/trades/data";
import { hasActiveFilters, parseTradeFilters, tradesHref } from "@/lib/trades/filters";

export const metadata: Metadata = { title: "Trades" };

async function TradesContent({
  searchParams,
}: {
  searchParams: PageProps<"/app/trades">["searchParams"];
}) {
  const filters = parseTradeFilters(await searchParams);
  const [result, options] = await Promise.all([listTrades(filters), getTradeFormOptions()]);
  const { trades, count, page, pageCount, totals, timezone } = result;

  if (!options.accounts.length) return <NoAccountsNotice />;

  const filtered = hasActiveFilters(filters);

  return (
    <div className="space-y-4">
      <TradeFilters filters={filters} accounts={options.accounts} strategies={options.strategies} />

      {/* Totals for the whole filtered set (not just this page) */}
      <section
        aria-label="Totals"
        className="grid grid-cols-2 gap-4 rounded-2xl surface p-4 sm:grid-cols-4"
      >
        <div>
          <p className="text-xs text-muted-foreground">Trades</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">{totals.trades}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Closed</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">{totals.closed}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Win rate</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums">
            {totals.winRate === null ? "—" : `${Math.round(totals.winRate * 100)}%`}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Net P&amp;L</p>
          <div className="mt-0.5 space-y-0.5 text-lg">
            {totals.netByCurrency.length === 0 ? (
              <p className="font-semibold text-muted-foreground">—</p>
            ) : (
              totals.netByCurrency.map((t) => (
                <p key={t.currency}>
                  <SignedAmount value={t.netPnl} currency={t.currency} className="font-semibold" />
                </p>
              ))
            )}
          </div>
        </div>
      </section>

      {trades.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl surface px-6 py-14 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl border bg-background text-primary">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">
            {filtered ? "No trades match these filters" : "Log your first trade"}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {filtered
              ? "Try widening the date range or clearing a filter."
              : "Record your entry, exit and profit or loss, and add chart screenshots."}
          </p>
          {!filtered && (
            <Button asChild variant="contrast" className="mt-6 h-10 px-4">
              <Link href="/app/trades/new">
                <Plus data-icon="inline-start" /> Log a trade
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <TradesTable trades={trades} filters={filters} timezone={timezone} />
          <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground tabular-nums">
              {count} trade{count === 1 ? "" : "s"} · page {page} of {pageCount}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Button asChild variant="outline" size="sm" className="h-8">
                  <Link href={tradesHref(filters, { page: page - 1 })}>
                    <ChevronLeft data-icon="inline-start" /> Previous
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="h-8" disabled>
                  <ChevronLeft data-icon="inline-start" /> Previous
                </Button>
              )}
              {page < pageCount ? (
                <Button asChild variant="outline" size="sm" className="h-8">
                  <Link href={tradesHref(filters, { page: page + 1 })}>
                    Next <ChevronRight data-icon="inline-end" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="h-8" disabled>
                  Next <ChevronRight data-icon="inline-end" />
                </Button>
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}

function TradesSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

export default function TradesPage({ searchParams }: PageProps<"/app/trades">) {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trades</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every trade you&apos;ve logged, filterable and sortable.
          </p>
        </div>
        <Button asChild variant="contrast" size="sm" className="h-8">
          <Link href="/app/trades/new">
            <Plus data-icon="inline-start" /> New trade
          </Link>
        </Button>
      </div>
      <Suspense fallback={<TradesSkeleton />}>
        <TradesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
