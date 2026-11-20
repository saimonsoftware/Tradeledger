import { formatInTimeZone } from "date-fns-tz";
import { ArrowRight, BookOpen, Plus, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AccountTypeBadge } from "@/components/accounts/account-type-badge";
import { AddAccountButton } from "@/components/accounts/add-account-button";
import { SignedAmount } from "@/components/common/signed-amount";
import { Sparkline } from "@/components/dashboard/sparkline";
import { EquityChart, EquityTable } from "@/components/dashboard/equity-chart";
import { WeeklyPnlChart, WeeklyPnlTable } from "@/components/dashboard/weekly-pnl-chart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EQUITY_RANGES,
  getDashboardData,
  type DashboardData,
  type EquityRange,
} from "@/lib/dashboard/data";
import { formatCurrency } from "@/lib/format/currency";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const pct = (v: number | null) =>
  v === null ? null : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(2)}%`;

function StatCard({
  label,
  children,
  sub,
}: {
  label: string;
  children: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl surface card-glow p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1.5 space-y-0.5 text-2xl font-semibold tracking-tight tabular-nums">
        {children}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground tabular-nums">{sub}</div>}
    </div>
  );
}

function SummaryCards({ data }: { data: DashboardData }) {
  const { week } = data;
  return (
    <section
      aria-label="This week at a glance"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatCard
        label="Total balance"
        sub={`${data.accounts.length} active account${data.accounts.length === 1 ? "" : "s"}`}
      >
        {/* Different currencies are listed separately, never converted. */}
        {week.byCurrency.map((c) => (
          <p key={c.currency}>{formatCurrency(c.balance, c.currency)}</p>
        ))}
      </StatCard>
      <StatCard
        label="This week's P&L"
        sub={week.byCurrency.map((c) => (
          <span key={c.currency} className="mr-3 inline-block">
            {pct(c.weekPct) ?? "—"}
            {week.byCurrency.length > 1 && ` ${c.currency}`}
          </span>
        ))}
      >
        {week.byCurrency.map((c) => (
          <p key={c.currency}>
            <SignedAmount value={c.weekPnl} currency={c.currency} />
          </p>
        ))}
      </StatCard>
      <StatCard
        label="Win rate this week"
        sub={
          week.closedTrades
            ? `${Math.round((week.winRate ?? 0) * week.closedTrades)} of ${week.closedTrades} closed trades`
            : "No closed trades yet"
        }
      >
        <p>{week.winRate === null ? "—" : `${Math.round(week.winRate * 100)}%`}</p>
      </StatCard>
      <StatCard label="Trades this week" sub="Closed Monday–Sunday">
        <p>{week.closedTrades}</p>
      </StatCard>
    </section>
  );
}

/** Dashboard URL keeping the current week / currency / equity range, with overrides. */
function dashboardHref(
  data: DashboardData,
  o: { week?: "prev" | undefined; currency?: string; range?: EquityRange },
) {
  const week = "week" in o ? o.week : data.chart.offset === -1 ? "prev" : undefined;
  const currency = o.currency ?? data.chart.currency;
  const range = o.range ?? data.equity.range;
  const p = new URLSearchParams();
  if (week) p.set("week", week);
  if (data.chart.currencies.length > 1) p.set("currency", currency);
  if (range !== "all") p.set("range", range);
  const qs = p.toString();
  return qs ? `/app/dashboard?${qs}` : "/app/dashboard";
}

const seg = (active: boolean) =>
  cn(
    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
    active
      ? "bg-background text-foreground shadow-sm"
      : "text-muted-foreground hover:text-foreground",
  );

const RANGE_LABELS: Record<EquityRange, string> = {
  "30": "30D",
  "90": "90D",
  "365": "1Y",
  all: "All",
};

function EquityCard({ data }: { data: DashboardData }) {
  const { equity, chart } = data;
  return (
    <section aria-labelledby="equity-title" className="rounded-2xl surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="equity-title" className="font-semibold">
            Equity curve
          </h2>
          {chart.currencies.length > 1 && (
            <p className="mt-0.5 text-sm text-muted-foreground">{equity.currency} accounts</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {chart.currencies.length > 1 && (
            <nav aria-label="Equity currency" className="inline-flex gap-1 rounded-lg bg-muted p-1">
              {chart.currencies.map((c) => (
                <Link
                  key={c}
                  href={dashboardHref(data, { currency: c })}
                  className={seg(c === equity.currency)}
                  aria-current={c === equity.currency ? "page" : undefined}
                >
                  {c}
                </Link>
              ))}
            </nav>
          )}
          <nav aria-label="Equity period" className="inline-flex gap-1 rounded-lg bg-muted p-1">
            {(Object.keys(RANGE_LABELS) as EquityRange[]).map((r) => (
              <Link
                key={r}
                href={dashboardHref(data, { range: r })}
                className={seg(r === equity.range)}
                aria-current={r === equity.range ? "page" : undefined}
              >
                {RANGE_LABELS[r]}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="mt-4">
        {equity.points.length > 1 ? (
          <EquityChart points={equity.points} currency={equity.currency} />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Not enough history yet. Your curve appears after your first day of trading.
          </p>
        )}
      </div>
      {/* The same data as a table, for screen readers. */}
      {equity.points.length > 1 && (
        <div className="sr-only">
          <EquityTable points={equity.points} currency={equity.currency} />
        </div>
      )}
    </section>
  );
}

function ChartCard({ data }: { data: DashboardData }) {
  const { chart } = data;
  const isPrev = chart.offset === -1;
  const href = (week: "prev" | undefined, currency = chart.currency) =>
    dashboardHref(data, { week, currency });

  return (
    <section aria-labelledby="chart-title" className="rounded-2xl surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="chart-title" className="font-semibold">
            Daily P&amp;L
          </h2>
          <p className="mt-0.5 text-sm">
            <SignedAmount value={chart.total} currency={chart.currency} />{" "}
            <span className="text-muted-foreground">{isPrev ? "last week" : "this week"}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {chart.currencies.length > 1 && (
            <nav aria-label="Chart currency" className="inline-flex gap-1 rounded-lg bg-muted p-1">
              {chart.currencies.map((c) => (
                <Link
                  key={c}
                  href={href(isPrev ? "prev" : undefined, c)}
                  className={seg(c === chart.currency)}
                  aria-current={c === chart.currency ? "page" : undefined}
                >
                  {c}
                </Link>
              ))}
            </nav>
          )}
          <nav aria-label="Chart week" className="inline-flex gap-1 rounded-lg bg-muted p-1">
            <Link
              href={href(undefined)}
              className={seg(!isPrev)}
              aria-current={!isPrev ? "page" : undefined}
            >
              This week
            </Link>
            <Link
              href={href("prev")}
              className={seg(isPrev)}
              aria-current={isPrev ? "page" : undefined}
            >
              Last week
            </Link>
          </nav>
        </div>
      </div>

      <div className="mt-4">
        <WeeklyPnlChart days={chart.days} currency={chart.currency} />
      </div>

      <details className="group mt-3 border-t pt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          Show as table
        </summary>
        <div className="mt-2">
          <WeeklyPnlTable days={chart.days} currency={chart.currency} />
        </div>
      </details>
    </section>
  );
}

function AccountsGrid({ data }: { data: DashboardData }) {
  return (
    <section aria-labelledby="accounts-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="accounts-title" className="font-semibold">
          Accounts
        </h2>
        <Link
          href="/app/accounts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Manage <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.accounts.map((a) => (
          <li key={a.id} className="relative rounded-2xl surface card-glow p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/app/accounts/${a.id}`}
                  className="line-clamp-1 font-semibold outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                >
                  {a.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {a.broker ?? "No broker set"}
                </p>
              </div>
              <AccountTypeBadge type={a.accountType} />
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xl font-semibold tracking-tight tabular-nums">
                  {formatCurrency(a.balance, a.currency)}
                </p>
                <p className="mt-0.5 text-xs">
                  <SignedAmount value={a.weekPnl} currency={a.currency} />{" "}
                  <span className="text-muted-foreground">this week</span>
                </p>
              </div>
              <div className="text-right">
                <Sparkline points={a.spark.map((p) => p.balance)} className="h-8 w-[120px]" />
                <p className="mt-0.5 text-[10px] text-muted-foreground">30 days</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecentTrades({ data }: { data: DashboardData }) {
  return (
    <section aria-labelledby="recent-title" className="rounded-2xl surface">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 id="recent-title" className="font-semibold">
          Recent trades
        </h2>
        <Link
          href="/app/trades"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          View all <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <caption className="sr-only">Your 10 most recent trades</caption>
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th scope="col" className="px-5 py-2.5 font-medium">
                Symbol
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Side
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Account
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Date
              </th>
              <th scope="col" className="px-5 py-2.5 text-right font-medium">
                Net P&amp;L
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.recent.map((t) => (
              <tr key={t.id} className="hover:bg-muted/40">
                <td className="px-5 py-2.5">
                  <Link
                    href={`/app/trades/${t.id}`}
                    className="font-mono font-medium hover:underline"
                  >
                    {t.symbol}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-xs font-medium capitalize",
                      t.direction === "long"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.direction}
                  </span>
                </td>
                <td className="max-w-40 truncate px-3 py-2.5 text-muted-foreground">
                  {t.account?.name}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                  {formatInTimeZone(t.exit_time ?? t.entry_time, data.timezone, "d MMM, HH:mm")}
                </td>
                <td className="px-5 py-2.5 text-right">
                  {t.status === "open" ? (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                      Open
                    </span>
                  ) : (
                    <SignedAmount
                      value={Number(t.net_pnl)}
                      currency={t.account?.currency ?? "EUR"}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: typeof Wallet;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl surface card-glow px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl border bg-background text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      <div className="mt-6">{action}</div>
    </div>
  );
}

async function Dashboard({
  searchParams,
}: {
  searchParams: PageProps<"/app/dashboard">["searchParams"];
}) {
  const sp = await searchParams;
  const data = await getDashboardData({
    chartWeekOffset: sp.week === "prev" ? -1 : 0,
    chartCurrency: typeof sp.currency === "string" ? sp.currency : undefined,
    equityRange:
      typeof sp.range === "string" && sp.range in EQUITY_RANGES ? (sp.range as EquityRange) : "all",
  });

  if (!data.hasAccounts) {
    return (
      <EmptyState
        icon={Wallet}
        title="Add your first trading account"
        body="Start by adding a broker or prop firm account. Then log trades and your weekly P&L appears here."
        action={<AddAccountButton size="lg" label="Add your first account" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SummaryCards data={data} />
      {data.totalTrades === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Log your first trade"
          body="Record your entry, exit and profit or loss. Your daily P&L chart and stats fill in automatically."
          action={
            <Button asChild variant="contrast" className="h-10 px-4">
              <Link href="/app/trades/new">
                <Plus data-icon="inline-start" /> Log a trade
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <ChartCard data={data} />
          <EquityCard data={data} />
        </>
      )}
      <AccountsGrid data={data} />
      {data.totalTrades > 0 && <RecentTrades data={data} />}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage({ searchParams }: PageProps<"/app/dashboard">) {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Dashboard</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
