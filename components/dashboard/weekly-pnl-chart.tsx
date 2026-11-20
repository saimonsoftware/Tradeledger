"use client";

import { format, parseISO } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatSignedCurrency } from "@/lib/format/currency";

type Day = { day: string; pnl: number; trades: number };

// Axis ticks: full numbers under 10,000, compact above (one style per axis).
function tickFormatter(currency: string, max: number) {
  const fmt = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: max >= 10_000 ? "compact" : "standard",
  });
  // True minus sign (U+2212), consistent with every other amount in the app.
  return (v: number) => (v === 0 ? "0" : fmt.format(v).replace("-", "\u2212"));
}

/** Two-line day label (weekday over date) so 7 labels fit even on a phone. */
function DayTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  if (!payload || x === undefined || y === undefined) return null;
  const d = parseISO(payload.value);
  return (
    <text x={x} y={y + 4} textAnchor="middle" fill="var(--muted-foreground)" fontSize={12}>
      <tspan x={x} dy="0.71em">
        {format(d, "EEE")}
      </tspan>
      <tspan x={x} dy="1.25em">
        {format(d, "d")}
      </tspan>
    </text>
  );
}

function ChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: { payload: Day }[];
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{format(parseISO(d.day), "EEEE d MMM")}</p>
      {/* Text uses text colours; the sign carries the polarity, not the colour alone. */}
      <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">
        {d.trades ? formatSignedCurrency(d.pnl, currency) : "No closed trades"}
      </p>
      {d.trades > 0 && (
        <p className="text-muted-foreground">
          {d.trades} closed trade{d.trades === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

export function WeeklyPnlChart({ days, currency }: { days: Day[]; currency: string }) {
  const data = days;
  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.pnl)));

  return (
    <div className="h-56 w-full bar-glow sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
          accessibilityLayer
          role="img"
          aria-label={`Daily net P&L in ${currency}, Monday to Sunday`}
        >
          {/* Recessive, solid hairline grid; horizontal only. */}
          <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={<DayTick />}
            height={40}
            interval={0}
          />
          <YAxis
            width={64}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={tickFormatter(currency, maxAbs)}
            tickCount={5}
          />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={<ChartTooltip currency={currency} />}
            isAnimationActive={false}
          />
          {/* ≤24px bars, 4px rounded data end, square at the baseline (Recharts mirrors the
              radius for negative bars, so losses are rounded at the bottom). */}
          <Bar dataKey="pnl" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.day}
                fill={d.pnl >= 0 ? "var(--chart-profit)" : "var(--chart-loss)"}
                // Glow colour (see the `bar-glow` utility in globals.css).
                className={d.pnl >= 0 ? "bar-profit" : "bar-loss"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Same data as a table: for screen readers, and anyone who prefers numbers. */
export function WeeklyPnlTable({ days, currency }: { days: Day[]; currency: string }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Daily net P&amp;L</caption>
      <thead className="text-left text-xs text-muted-foreground">
        <tr>
          <th scope="col" className="py-1.5 font-medium">
            Day
          </th>
          <th scope="col" className="py-1.5 text-right font-medium">
            Closed trades
          </th>
          <th scope="col" className="py-1.5 text-right font-medium">
            Net P&amp;L
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {days.map((d) => (
          <tr key={d.day}>
            <td className="py-1.5">{format(parseISO(d.day), "EEE d MMM")}</td>
            <td className="py-1.5 text-right tabular-nums">{d.trades}</td>
            <td className="py-1.5 text-right tabular-nums">
              {d.trades ? formatSignedCurrency(d.pnl, currency) : formatCurrency(0, currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
