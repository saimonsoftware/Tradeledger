import { BookOpen, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { NoAccountsNotice } from "@/components/trades/no-accounts-notice";
import { TradeFilters } from "@/components/trades/trade-filters";
import { TradesStats } from "@/components/trades/trades-stats";
import { TradesTable } from "@/components/trades/trades-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TRADES_PAGE_SIZE } from "@/lib/trades/constants";
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
    <div className="space-y-5">
      <TradesStats totals={totals} />

      <TradeFilters filters={filters} accounts={options.accounts} strategies={options.strategies} />

      {trades.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
          <span className="chat-mark-glow flex size-12 items-center justify-center rounded-2xl border bg-background">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">
            {filtered ? "No trades match these filters" : "Log your first trade"}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {filtered
              ? "Try widening the date range or clearing a filter."
              : "Record your entry, SL and TP prices and your profit or loss, and add chart screenshots."}
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
          <nav
            aria-label="Pagination"
            className="flex flex-wrap items-center justify-between gap-3 text-sm"
          >
            <p className="text-muted-foreground tabular-nums">
              Showing{" "}
              <span className="font-medium text-foreground">
                {(page - 1) * TRADES_PAGE_SIZE + 1}–{Math.min(page * TRADES_PAGE_SIZE, count)}
              </span>{" "}
              of <span className="font-medium text-foreground">{count}</span> trade
              {count === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-1.5">
              {page > 1 ? (
                <Button asChild variant="outline" size="icon-sm" className="rounded-full">
                  <Link href={tradesHref(filters, { page: page - 1 })} aria-label="Previous page">
                    <ChevronLeft />
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="rounded-full"
                  disabled
                  aria-label="Previous page"
                >
                  <ChevronLeft />
                </Button>
              )}
              <span className="min-w-16 text-center text-xs text-muted-foreground tabular-nums">
                Page {page} of {pageCount}
              </span>
              {page < pageCount ? (
                <Button asChild variant="outline" size="icon-sm" className="rounded-full">
                  <Link href={tradesHref(filters, { page: page + 1 })} aria-label="Next page">
                    <ChevronRight />
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="rounded-full"
                  disabled
                  aria-label="Next page"
                >
                  <ChevronRight />
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Skeleton className="col-span-2 h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-9 w-80 max-w-full rounded-xl" />
      <Skeleton className="h-12 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

export default function TradesPage({ searchParams }: PageProps<"/app/trades">) {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-silver text-2xl font-semibold tracking-tight text-glow sm:text-3xl">
            Trades
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every trade you&apos;ve logged. Filter, sort and review.
          </p>
        </div>
        <Button asChild variant="contrast" size="sm" className="h-9 rounded-xl px-3.5">
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
