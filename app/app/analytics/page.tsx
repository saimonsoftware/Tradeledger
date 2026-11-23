import { format, parseISO } from "date-fns";
import {
  Activity,
  BarChart3,
  Flame,
  Gauge,
  Scale,
  Sigma,
  TrendingDown,
  Trophy,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { AccountPicker } from "@/components/analytics/account-picker";
import {
  DistributionChart,
  GroupRChart,
  MonthlyChart,
  RollingChart,
  type GroupBar,
} from "@/components/analytics/charts";
import { SignedAmount } from "@/components/common/signed-amount";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  analyticsHref,
  getAnalytics,
  parseAnalyticsFilters,
  type AnalyticsFilters,
} from "@/lib/analytics/data";
import { fmtR } from "@/lib/analytics/format";
import { ROLLING_WINDOW } from "@/lib/analytics/stats";
import { PIP_LABEL } from "@/lib/calculations/rr";
import { MIN_SAMPLE, SESSION_NOTE, type GroupStats } from "@/lib/insights/stats";
import { STRATEGIES, SYMBOLS, type TradeSymbol } from "@/lib/trades/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);

/* ---------- Small building blocks ---------- */

function Segmented({
  label,
  options,
}: {
  label: string;
  options: { label: string; href: string; active: boolean }[];
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-xl border bg-muted/40 p-0.5"
    >
      {options.map((o) => (
        <Link
          key={o.label}
          href={o.href}
          aria-current={o.active ? "true" : undefined}
          className={cn(
            "rounded-[10px] px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            o.active
              ? "bg-background text-foreground shadow-sm dark:bg-muted"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "profit" | "loss";
}) {
  return (
    <div className="rounded-2xl surface card-glow p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-md border bg-background">
          {icon}
        </span>
        {label}
      </p>
      <p
        className={cn(
          "mt-3 text-2xl font-semibold tracking-tight tabular-nums",
          tone === "profit" && "text-profit",
          tone === "loss" && "text-loss",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Card({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-2xl surface p-4 sm:p-5", className)} aria-label={title}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mt-10 mb-3">
      <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
      {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

const toBars = (groups: GroupStats[]): GroupBar[] =>
  groups.map((g) => ({
    key: g.key,
    totalR: g.totalR ?? 0,
    trades: g.trades,
    winRate: g.winRate,
    avgR: g.avgR,
    smallSample: g.smallSample,
  }));

/** The numbers behind a group chart, for screen readers. */
function GroupTable({ groups, caption }: { groups: GroupStats[]; caption: string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Group</th>
          <th scope="col">Trades</th>
          <th scope="col">Win rate</th>
          <th scope="col">Total R</th>
          <th scope="col">Average R</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => (
          <tr key={g.key}>
            <td>{g.key}</td>
            <td>{g.trades}</td>
            <td>{pct(g.winRate)}</td>
            <td>{fmtR(g.totalR)}</td>
            <td>{fmtR(g.avgR)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GroupCard({
  title,
  description,
  groups,
}: {
  title: string;
  description?: string;
  groups: GroupStats[];
}) {
  return (
    <Card title={title} description={description}>
      {groups.length ? (
        <>
          <GroupRChart data={toBars(groups)} label={`Total R by ${title.toLowerCase()}`} />
          <GroupTable groups={groups} caption={`Results by ${title.toLowerCase()}`} />
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {groups.map((g) => (
              <li key={g.key} className="tabular-nums">
                <span className="font-medium text-foreground">{g.key}</span> {g.trades} ·{" "}
                {pct(g.winRate)}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">No trades yet.</p>
      )}
    </Card>
  );
}

/* ---------- Page content ---------- */

async function AnalyticsContent({
  searchParams,
}: {
  searchParams: PageProps<"/app/analytics">["searchParams"];
}) {
  const filters = parseAnalyticsFilters(await searchParams);
  const a = await getAnalytics(filters);
  const o = a.stats.overall;
  const range = filters.range ?? "all";
  const set = (overrides: Partial<Record<keyof AnalyticsFilters, string | undefined>>) =>
    analyticsHref(filters, overrides);

  const filterBar = (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        label="Period"
        options={(
          [
            ["30", "30D"],
            ["90", "90D"],
            ["365", "1Y"],
            ["all", "All"],
          ] as const
        ).map(([v, l]) => ({
          label: l,
          href: set({ range: v === "all" ? undefined : v }),
          active: range === v,
        }))}
      />
      <Segmented
        label="Symbol"
        options={[undefined, ...SYMBOLS].map((s) => ({
          label: s ?? "All",
          href: set({ symbol: s }),
          active: filters.symbol === s,
        }))}
      />
      <Segmented
        label="Strategy"
        options={[undefined, ...STRATEGIES].map((s) => ({
          label: s ?? "All",
          href: set({ strategy: s }),
          active: filters.strategy === s,
        }))}
      />
      {a.accounts.length > 1 && (
        <AccountPicker
          accounts={a.accounts}
          value={filters.account}
          hrefFor={Object.fromEntries([
            ["", set({ account: undefined })],
            ...a.accounts.map((acc) => [acc.id, set({ account: acc.id })]),
          ])}
        />
      )}
    </div>
  );

  if (a.tradeCount === 0) {
    return (
      <div className="space-y-5">
        {filterBar}
        <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
          <span className="chat-mark-glow flex size-12 items-center justify-center rounded-2xl border bg-background">
            <BarChart3 className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">No closed trades here yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Analytics appear once you have closed trades in this period. Try a longer period or
            clear a filter.
          </p>
          <Button asChild variant="contrast" className="mt-6 h-10 rounded-xl px-4">
            <Link href="/app/trades/new">Log a trade</Link>
          </Button>
        </div>
      </div>
    );
  }

  const winning = (o.avgR ?? 0) > 0;
  const aboveBreakeven = o.breakevenWinRate === null ? null : o.winRate > o.breakevenWinRate;

  const combos = [
    ...a.stats.byStrategySymbol,
    ...a.stats.byStrategySession,
    ...a.stats.byStrategyDirection,
  ]
    .filter((g) => g.totalR !== null && !g.key.startsWith("(no strategy)"))
    .sort((x, y) => (y.totalR ?? 0) - (x.totalR ?? 0));
  const comboRows = [
    ...combos.slice(0, 5),
    ...combos
      .slice(5)
      .slice(-3)
      .filter((g) => (g.totalR ?? 0) < 0),
  ];

  const months = a.monthly.map((m) => ({
    key: m.month,
    label: format(parseISO(`${m.month}-01`), "MMM yy"),
    totalR: m.totalR ?? 0,
    trades: m.trades,
    winRate: m.winRate,
  }));

  return (
    <div>
      {filterBar}
      {a.tradeCount < MIN_SAMPLE * 2 && (
        <p className="mt-3 rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Only {a.tradeCount} closed trade{a.tradeCount === 1 ? "" : "s"} so far: patterns become
          reliable after a few dozen. Faded bars mark groups with fewer than {MIN_SAMPLE} trades.
        </p>
      )}

      {/* 1. Headline numbers */}
      <SectionTitle
        hint={`${a.tradeCount} closed trades. Results in R = multiples of what you risked.`}
      >
        Your edge
      </SectionTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          icon={<Sigma className="size-3.5" aria-hidden="true" />}
          label="Expectancy"
          value={fmtR(o.avgR)}
          tone={o.avgR === null ? undefined : winning ? "profit" : "loss"}
          hint={`Average per trade · total ${fmtR(o.totalR)}`}
        />
        <Tile
          icon={<Gauge className="size-3.5" aria-hidden="true" />}
          label="Win rate"
          value={pct(o.winRate)}
          hint={
            o.breakevenWinRate === null ? (
              "Breakeven needs wins and losses"
            ) : (
              <>
                Breakeven at {pct(o.breakevenWinRate)} ·{" "}
                <span className={aboveBreakeven ? "text-profit" : "text-loss"}>
                  {aboveBreakeven ? "above ✓" : "below"}
                </span>
              </>
            )
          }
        />
        <Tile
          icon={<Scale className="size-3.5" aria-hidden="true" />}
          label="Profit factor"
          value={
            Object.entries(o.profitFactorByCurrency)
              .map(
                ([c, pf]) =>
                  (pf === null ? "∞" : pf.toFixed(2)) +
                  (Object.keys(o.profitFactorByCurrency).length > 1 ? ` ${c}` : ""),
              )
              .join(" · ") || "—"
          }
          hint="Money won ÷ money lost (above 1 = profitable)"
        />
        <Tile
          icon={<Activity className="size-3.5" aria-hidden="true" />}
          label="Avg win / loss"
          value={
            <>
              <span className="text-profit">{fmtR(o.avgWinR)}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="text-loss">{fmtR(o.avgLossR)}</span>
            </>
          }
          hint="Average R of winning vs losing trades"
        />
        <Tile
          icon={<TrendingDown className="size-3.5" aria-hidden="true" />}
          label="Max drawdown"
          value={a.maxDrawdownR ? fmtR(-a.maxDrawdownR) : "0R"}
          hint="Biggest drop from a peak, in R"
        />
        <Tile
          icon={<Trophy className="size-3.5" aria-hidden="true" />}
          label="Best streak"
          value={`${o.longestWinStreak} win${o.longestWinStreak === 1 ? "" : "s"}`}
          hint="Wins in a row"
        />
        <Tile
          icon={<Flame className="size-3.5" aria-hidden="true" />}
          label="Worst streak"
          value={`${o.longestLossStreak} loss${o.longestLossStreak === 1 ? "" : "es"}`}
          hint="Losses in a row"
        />
        <Tile
          icon={<BarChart3 className="size-3.5" aria-hidden="true" />}
          label="Net P&L"
          value={
            <span className="flex flex-col gap-0.5">
              {Object.entries(o.netByCurrency).map(([c, v]) => (
                <SignedAmount key={c} value={v} currency={c} className="text-xl font-semibold" />
              ))}
            </span>
          }
          hint="Per currency, never converted"
        />
      </div>

      {/* 2. What's working */}
      <SectionTitle hint="Total R per group. Faded bars: fewer than 5 trades, so treat with care.">
        What&apos;s working
      </SectionTitle>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <GroupCard title="Strategy" groups={a.stats.byStrategy} />
        <GroupCard title="Symbol" groups={a.stats.bySymbol} />
        <GroupCard title="Session" description={SESSION_NOTE} groups={a.stats.bySession} />
        <GroupCard title="Day of the week" groups={a.stats.byWeekday} />
        <GroupCard
          title="Direction"
          groups={a.stats.byDirection.map((g) => ({
            ...g,
            key: g.key === "long" ? "Long" : g.key === "short" ? "Short" : g.key,
          }))}
        />
        {a.stats.byTag.length > 0 && (
          <GroupCard
            title="Confluences"
            description="A trade with several confluences counts in each one."
            groups={a.stats.byTag.slice(0, 10)}
          />
        )}
        <Card
          title="Best and worst combinations"
          description="Strategy combined with symbol, session or direction, ranked by total R."
        >
          {comboRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Add a strategy to your trades to see which combinations work.
            </p>
          ) : (
            <table className="w-full text-[13px] sm:text-sm">
              <caption className="sr-only">Strategy combinations ranked by total R</caption>
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="pb-2 font-medium">
                    Combination
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Trades
                  </th>
                  <th scope="col" className="pb-2 pl-3 text-right font-medium whitespace-nowrap">
                    Win rate
                  </th>
                  <th scope="col" className="pb-2 pl-3 text-right font-medium whitespace-nowrap">
                    Total R
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {comboRows.map((g) => (
                  <tr key={g.key}>
                    <td className="py-2 pr-2">
                      {g.key}
                      {g.smallSample && (
                        <span className="mt-0.5 block w-fit rounded-full border px-1.5 text-[10px] text-muted-foreground">
                          small sample
                        </span>
                      )}
                    </td>
                    <td className="py-2 pl-3 text-right tabular-nums">{g.trades}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{pct(g.winRate)}</td>
                    <td
                      className={cn(
                        "py-2 pl-3 text-right font-medium whitespace-nowrap tabular-nums",
                        (g.totalR ?? 0) > 0 && "text-profit",
                        (g.totalR ?? 0) < 0 && "text-loss",
                      )}
                    >
                      {fmtR(g.totalR)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* 3. Risk and execution */}
      <SectionTitle hint="How big your wins and losses are, and whether good execution pays.">
        Risk &amp; execution
      </SectionTitle>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Result distribution" description="How many trades landed at each result.">
          <DistributionChart data={a.distribution} />
          <table className="sr-only">
            <caption>Trades per result bucket</caption>
            <tbody>
              {a.distribution.map((b) => (
                <tr key={b.key}>
                  <th scope="row">{b.key}</th>
                  <td>{b.trades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <GroupCard
          title="Execution rating"
          description="Do your best-executed trades (5★) really make more?"
          groups={a.stats.byRating}
        />
        <Card
          title="Stops and targets"
          description="Average sizes per symbol. Losing trades with bigger stops can mean you're widening them."
          className="lg:col-span-2"
        >
          <div
            className="relative overflow-x-auto rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            tabIndex={0}
            role="region"
            aria-label="Stops and targets table"
          >
            <table className="w-full min-w-[34rem] text-sm">
              <caption className="sr-only">Stop and target sizes per symbol</caption>
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="pb-2 font-medium">
                    Symbol
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Avg SL
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Avg TP
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    SL on wins
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    SL on losses
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Net
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {a.stopSizes.map((s) => {
                  const p = o.pipsBySymbol[s.symbol];
                  const unit = PIP_LABEL[s.symbol as TradeSymbol] ?? "";
                  const v = (n: number | null | undefined) => (n == null ? "—" : `${n} ${unit}`);
                  return (
                    <tr key={s.symbol}>
                      <td className="py-2 font-mono font-medium">{s.symbol}</td>
                      <td className="py-2 text-right tabular-nums">{v(p?.avgSlPips)}</td>
                      <td className="py-2 text-right tabular-nums">{v(p?.avgTpPips)}</td>
                      <td className="py-2 text-right tabular-nums">{v(s.avgSlWins)}</td>
                      <td className="py-2 text-right tabular-nums">{v(s.avgSlLosses)}</td>
                      <td
                        className={cn(
                          "py-2 text-right font-medium tabular-nums",
                          (p?.netPips ?? 0) > 0 && "text-profit",
                          (p?.netPips ?? 0) < 0 && "text-loss",
                        )}
                      >
                        {p
                          ? `${p.netPips > 0 ? "+" : p.netPips < 0 ? "−" : ""}${Math.abs(p.netPips)} ${unit}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* 4. Over time */}
      <SectionTitle hint="Are you improving?">Over time</SectionTitle>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Monthly results" description="Total R per month." className="lg:col-span-2">
          <MonthlyChart data={months} />
          <div
            className="relative mt-4 overflow-x-auto rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            tabIndex={0}
            role="region"
            aria-label="Monthly results table"
          >
            <table className="w-full min-w-[30rem] text-sm">
              <caption className="sr-only">Results per month</caption>
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="pb-2 font-medium">
                    Month
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Trades
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Win rate
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Total R
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Net P&amp;L
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...a.monthly].reverse().map((m) => (
                  <tr key={m.month}>
                    <td className="py-2">{format(parseISO(`${m.month}-01`), "MMMM yyyy")}</td>
                    <td className="py-2 text-right tabular-nums">{m.trades}</td>
                    <td className="py-2 text-right tabular-nums">{pct(m.winRate)}</td>
                    <td
                      className={cn(
                        "py-2 text-right font-medium tabular-nums",
                        (m.totalR ?? 0) > 0 && "text-profit",
                        (m.totalR ?? 0) < 0 && "text-loss",
                      )}
                    >
                      {fmtR(m.totalR)}
                    </td>
                    <td className="py-2 text-right">
                      <span className="inline-flex flex-col items-end">
                        {Object.entries(m.netByCurrency).map(([c, v]) => (
                          <SignedAmount key={c} value={v} currency={c} />
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        {a.rolling.length >= 2 ? (
          <>
            <Card
              title={`Expectancy, last ${ROLLING_WINDOW} trades`}
              description="Average R over your most recent 20 trades, after each trade."
            >
              <RollingChart data={a.rolling} measure="expectancy" />
            </Card>
            <Card
              title={`Win rate, last ${ROLLING_WINDOW} trades`}
              description="Share of wins over your most recent 20 trades, after each trade."
            >
              <RollingChart data={a.rolling} measure="winRate" />
            </Card>
          </>
        ) : (
          <Card title="Rolling form" className="lg:col-span-2">
            <p className="py-6 text-center text-sm text-muted-foreground">
              After {ROLLING_WINDOW + 1} closed trades with an RR, you&apos;ll see whether your win
              rate and expectancy are improving.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-full max-w-xl rounded-xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

export default function AnalyticsPage({ searchParams }: PageProps<"/app/analytics">) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-silver text-2xl font-semibold tracking-tight text-glow sm:text-3xl">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Where your edge is, in numbers. The same figures your AI Coach uses.
        </p>
      </div>
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
