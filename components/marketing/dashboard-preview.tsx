import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  LineChart,
  Settings,
  Wallet,
} from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { formatCurrency, formatSignedCurrency, formatSignedPercent } from "@/lib/format/currency";
import { cn } from "@/lib/utils";

// Illustrative demo data for the marketing preview only. Nothing here is real.
const summary = [
  { label: "Total balance", value: formatCurrency(104382.2), sub: "3 accounts" },
  {
    label: "This week",
    value: formatSignedCurrency(1846.5),
    sub: formatSignedPercent(1.8),
    tone: "profit",
  },
  { label: "Win rate", value: "64%", sub: "9 of 14 trades" },
  { label: "Trades", value: "14", sub: "this week" },
] as const;

const week = [
  { day: "Mon", pnl: 620 },
  { day: "Tue", pnl: -240 },
  { day: "Wed", pnl: 905 },
  { day: "Thu", pnl: -130 },
  { day: "Fri", pnl: 691.5 },
  { day: "Sat", pnl: 0 },
  { day: "Sun", pnl: 0 },
];

const accounts = [
  {
    name: "Prop 100k Challenge",
    type: "Prop challenge",
    balance: 101_240.0,
    week: 1240,
    points: [12, 14, 13, 17, 16, 20, 19, 24, 26],
  },
  {
    name: "Futures Main",
    type: "Live",
    balance: 2_642.2,
    week: 432.5,
    points: [20, 18, 19, 17, 21, 20, 23, 22, 25],
  },
  {
    name: "Sim Practice",
    type: "Demo",
    balance: 500.0,
    week: 174,
    points: [16, 18, 15, 14, 16, 15, 17, 18, 19],
  },
];

const trades = [
  { symbol: "NQ", side: "Long", account: "Futures Main", pnl: 640 },
  { symbol: "EURUSD", side: "Short", account: "Prop 100k", pnl: -120 },
  { symbol: "AAPL", side: "Long", account: "Prop 100k", pnl: 212.4 },
  { symbol: "ES", side: "Short", account: "Futures Main", pnl: 380 },
];

const maxAbs = Math.max(...week.map((d) => Math.abs(d.pnl)));

function Sparkline({ points }: { points: number[] }) {
  const w = 64;
  const h = 20;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / (max - min || 1)) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-5 w-16 overflow-visible" fill="none">
      <path d={d} className="stroke-profit" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function Pnl({ value, className }: { value: number; className?: string }) {
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium tabular-nums",
        value > 0 ? "text-profit" : value < 0 ? "text-loss" : "text-neutral",
        className,
      )}
    >
      <Icon className="size-3.5" />
      {formatSignedCurrency(value)}
    </span>
  );
}

const sideNav = [
  { label: "Dashboard", Icon: LayoutDashboard, active: true },
  { label: "Trades", Icon: BookOpen },
  { label: "Accounts", Icon: Wallet },
  { label: "Analytics", Icon: LineChart },
  { label: "Calendar", Icon: CalendarDays },
  { label: "Settings", Icon: Settings },
];

export function DashboardPreview() {
  return (
    <div
      role="img"
      aria-label="Preview of the TradeLedger dashboard showing account balances, this week's profit and loss, a daily P&L chart and recent trades."
      className="overflow-hidden rounded-xl border bg-card text-left shadow-2xl ring-1 shadow-primary/10 ring-black/5 select-none dark:shadow-black/40 dark:ring-white/5"
    >
      <div aria-hidden="true">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-loss/70" />
          <span className="size-2.5 rounded-full bg-chart-5/80" />
          <span className="size-2.5 rounded-full bg-profit/70" />
          <span className="ml-3 truncate font-mono text-[11px] text-muted-foreground">
            tradeledger.app/app/dashboard
          </span>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <aside className="hidden w-44 shrink-0 border-r bg-sidebar/60 p-3 lg:block">
            <div className="flex items-center gap-2 px-2 pb-4 text-sm font-semibold">
              <LogoMark className="size-5" /> TradeLedger
            </div>
            <ul className="space-y-0.5 text-[13px]">
              {sideNav.map(({ label, Icon, active }) => (
                <li
                  key={label}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground",
                    active && "bg-sidebar-accent text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="size-3.5" /> {label}
                </li>
              ))}
            </ul>
          </aside>

          <div className="min-w-0 flex-1 space-y-3 p-3 sm:space-y-4 sm:p-5">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
              {summary.map((s) => (
                <div key={s.label} className="rounded-lg border bg-background/50 p-3">
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  <p
                    className={cn(
                      "mt-1 text-base font-semibold tracking-tight tabular-nums sm:text-lg",
                      "tone" in s && s.tone === "profit" && "text-profit",
                    )}
                  >
                    {s.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">{s.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-5">
              {/* Weekly P&L bars */}
              <div className="rounded-lg border bg-background/50 p-3 md:col-span-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-xs font-medium">Daily P&amp;L · this week</p>
                  <Pnl value={1846.5} className="text-xs" />
                </div>
                <div className="mt-3 grid h-32 grid-cols-7 gap-2 sm:h-36">
                  {week.map((d) => {
                    const pct = (Math.abs(d.pnl) / maxAbs) * 100;
                    return (
                      <div key={d.day} className="flex flex-col">
                        <div className="flex flex-1 items-end border-b border-dashed">
                          {d.pnl > 0 && (
                            <div
                              className="w-full rounded-t-sm bg-profit/80"
                              style={{ height: `${pct}%` }}
                            />
                          )}
                        </div>
                        <div className="flex flex-[0.45] items-start">
                          {d.pnl < 0 && (
                            <div
                              className="w-full rounded-b-sm bg-loss/80"
                              style={{ height: `${Math.min(100, pct * 2.2)}%` }}
                            />
                          )}
                        </div>
                        <span className="mt-1 text-center text-[10px] text-muted-foreground">
                          {d.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Accounts */}
              <div className="rounded-lg border bg-background/50 p-3 md:col-span-2">
                <p className="text-xs font-medium">Accounts</p>
                <ul className="mt-2 divide-y">
                  {accounts.map((a) => (
                    <li key={a.name} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{a.name}</p>
                        <p className="text-[11px] text-muted-foreground">{a.type}</p>
                      </div>
                      <Sparkline points={a.points} />
                      <div className="text-right">
                        <p className="text-xs font-medium tabular-nums">
                          {formatCurrency(a.balance)}
                        </p>
                        <Pnl value={a.week} className="text-[11px]" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recent trades */}
            <div className="hidden rounded-lg border bg-background/50 sm:block">
              <p className="px-3 pt-3 text-xs font-medium">Recent trades</p>
              <table className="mt-2 w-full text-xs">
                <thead className="text-[11px] text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-3 py-1.5 text-left font-normal">Symbol</th>
                    <th className="px-3 py-1.5 text-left font-normal">Side</th>
                    <th className="px-3 py-1.5 text-left font-normal">Account</th>
                    <th className="px-3 py-1.5 text-right font-normal">Net P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t) => (
                    <tr key={t.symbol} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono font-medium">{t.symbol}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium",
                            // Direction isn't profit/loss, so it uses neutral styling.
                            t.side === "Long"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{t.account}</td>
                      <td className="px-3 py-2 text-right">
                        <Pnl value={t.pnl} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
