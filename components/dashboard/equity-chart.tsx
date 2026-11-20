"use client";

import { format, parseISO } from "date-fns";
import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatSignedCurrency } from "@/lib/format/currency";

export type EquityPoint = {
  /** The starting balance (just before the first day shown). */
  start: boolean;
  day: string;
  balance: number;
  pnl: number;
  trades: number;
  flow: number;
};

function moneyTicks(currency: string, max: number) {
  const fmt = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    // Compact ("US$10.5K") keeps one decimal so nearby ticks never read the same.
    maximumFractionDigits: max >= 10_000 ? 1 : 0,
    notation: max >= 10_000 ? "compact" : "standard",
  });
  return (v: number) => fmt.format(v).replace("-", "−");
}

function EquityTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: { payload: EquityPoint }[];
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">
        {p.start ? "Starting balance" : format(parseISO(p.day), "EEE d MMM yyyy")}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">
        {formatCurrency(p.balance, currency)}
      </p>
      {p.trades > 0 && (
        <p className="text-muted-foreground tabular-nums">
          {formatSignedCurrency(p.pnl, currency)} · {p.trades} trade{p.trades === 1 ? "" : "s"}
        </p>
      )}
      {p.flow !== 0 && (
        <p className="text-muted-foreground tabular-nums">
          {p.flow > 0 ? "Deposit" : "Withdrawal"} {formatCurrency(Math.abs(p.flow), currency)}
        </p>
      )}
    </div>
  );
}

/**
 * Evenly spaced "round" axis values (steps of 1, 2, 2.5 or 5 × a power of ten),
 * with the axis running from one tick to the next so nothing is cut off.
 */
export function niceTicks(min: number, max: number, target = 4): number[] {
  if (min === max) {
    // Flat line: centre it between three round ticks (e.g. 9.5K / 10K / 10.5K).
    const half = Math.abs(max) * 0.05 || 1;
    min -= half;
    max += half;
    target = 2;
  }
  const span = max - min;
  const raw = span / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((st) => span / st <= target) ?? 10 * pow;
  const lo = Math.floor(min / step) * step;
  const hi = Math.max(Math.ceil(max / step) * step, lo + step);
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

/** Balance at the end of each day: one series, so no legend (the card title names it). */
export function EquityChart({ points, currency }: { points: EquityPoint[]; currency: string }) {
  const gradientId = useId();
  const values = points.map((p) => p.balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const ticks = niceTicks(min, max);
  const longRange = points.length > 400;

  return (
    <div className="h-56 w-full equity-glow sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
          accessibilityLayer
          role="img"
          aria-label={`Account balance in ${currency} at the end of each day`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--foreground)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--foreground)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(d: string) =>
              d === points[0]?.day && points[0].start
                ? "Start"
                : format(parseISO(d), longRange ? "MMM yy" : "d MMM")
            }
            minTickGap={28}
            interval="preserveStartEnd"
          />
          <YAxis
            width={72}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={moneyTicks(currency, Math.max(Math.abs(min), Math.abs(max)))}
            domain={[ticks[0], ticks[ticks.length - 1]]}
            ticks={ticks}
            interval={0}
          />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }}
            content={<EquityTooltip currency={currency} />}
            isAnimationActive={false}
          />
          {/* Straight segments: balances change day by day, so no smoothing (it would
              invent bumps and dips that never happened). */}
          <Area
            type="linear"
            dataKey="balance"
            // Colour and glow come from the `equity-glow` utility (globals.css).
            stroke="var(--foreground)"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: "var(--foreground)" }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Table view (screen readers): the start, every day with a trade or deposit/withdrawal, and today. */
export function EquityTable({ points, currency }: { points: EquityPoint[]; currency: string }) {
  const rows = points.filter(
    (p, i) => i === 0 || i === points.length - 1 || p.trades > 0 || p.flow !== 0,
  );
  return (
    <div>
      <table className="w-full text-sm">
        <caption className="sr-only">Balance at the end of each day</caption>
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="py-1.5 font-medium">
              Day
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              Trade P&amp;L
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              Balance
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((p) => (
            <tr key={p.day}>
              <td className="py-1.5">
                {p.start ? "Starting balance" : format(parseISO(p.day), "EEE d MMM yyyy")}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {p.trades ? formatSignedCurrency(p.pnl, currency) : "—"}
                {p.flow !== 0 && (
                  <span className="block text-xs text-muted-foreground">
                    {p.flow > 0 ? "Deposit" : "Withdrawal"}{" "}
                    {formatCurrency(Math.abs(p.flow), currency)}
                  </span>
                )}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {formatCurrency(p.balance, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
