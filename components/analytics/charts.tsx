"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fmtR } from "@/lib/analytics/format";

// Charts for the Analytics page. Same conventions as the dashboard charts:
// ≤24px bars with a 4px rounded data end, a zero line, a recessive hairline grid,
// a tooltip per bar, keyboard access (accessibilityLayer), true minus signs, and
// a table version of every chart for screen readers (rendered by the page).

const fmtPct = (x: number) => `${Math.round(x * 100)}%`;

const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };
const signFill = (v: number) =>
  v > 0 ? "var(--chart-profit)" : v < 0 ? "var(--chart-loss)" : "var(--muted-foreground)";

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

function TipBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{title}</p>
      {lines.map((l, i) => (
        <p
          key={i}
          className={
            i === 0
              ? "mt-1 text-sm font-semibold text-foreground tabular-nums"
              : "text-muted-foreground tabular-nums"
          }
        >
          {l}
        </p>
      ))}
    </div>
  );
}

export type GroupBar = {
  key: string;
  totalR: number;
  trades: number;
  winRate: number;
  avgR: number | null;
  smallSample: boolean;
};

/** Total R per group (strategy, symbol, session…). */
export function GroupRChart({ data, label }: { data: GroupBar[]; label: string }) {
  return (
    <Box>
      <BarChart
        data={data}
        margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
        accessibilityLayer
        role="img"
        aria-label={label}
      >
        <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
        <XAxis
          dataKey="key"
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          interval={0}
          tickFormatter={(k: string) => (k.length > 12 ? `${k.slice(0, 11)}…` : k)}
        />
        <YAxis
          width={52}
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          tickFormatter={(v: number) => fmtR(v).replace(".00", "")}
          tickCount={5}
        />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          isAnimationActive={false}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as GroupBar;
            return (
              <TipBox
                title={d.key}
                lines={[
                  `${fmtR(d.totalR)} total`,
                  `${d.trades} trade${d.trades === 1 ? "" : "s"} · ${fmtPct(d.winRate)} wins`,
                  `Average ${fmtR(d.avgR)} per trade`,
                  ...(d.smallSample ? ["Small sample: treat with care"] : []),
                ]}
              />
            );
          }}
        />
        <Bar dataKey="totalR" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.key} fill={signFill(d.totalR)} fillOpacity={d.smallSample ? 0.45 : 1} />
          ))}
        </Bar>
      </BarChart>
    </Box>
  );
}

export type DistBar = { key: string; trades: number; sign: number };

/** How many trades landed in each R bucket. */
export function DistributionChart({ data }: { data: DistBar[] }) {
  return (
    <Box>
      <BarChart
        data={data}
        margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
        accessibilityLayer
        role="img"
        aria-label="Number of trades in each result bucket, from biggest loss to biggest win"
      >
        <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
        <XAxis
          dataKey="key"
          tickLine={false}
          axisLine={false}
          tick={{ ...axisTick, fontSize: 11 }}
          interval={0}
        />
        <YAxis width={32} tickLine={false} axisLine={false} tick={axisTick} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          isAnimationActive={false}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as DistBar;
            return (
              <TipBox title={d.key} lines={[`${d.trades} trade${d.trades === 1 ? "" : "s"}`]} />
            );
          }}
        />
        <Bar dataKey="trades" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.key} fill={signFill(d.sign)} />
          ))}
        </Bar>
      </BarChart>
    </Box>
  );
}

export type MonthBar = {
  key: string;
  label: string;
  totalR: number;
  trades: number;
  winRate: number;
};

/** Total R per month. */
export function MonthlyChart({ data }: { data: MonthBar[] }) {
  return (
    <Box>
      <BarChart
        data={data}
        margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
        accessibilityLayer
        role="img"
        aria-label="Total R per month"
      >
        <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} minTickGap={8} />
        <YAxis
          width={52}
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          tickFormatter={(v: number) => fmtR(v).replace(".00", "")}
          tickCount={5}
        />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          isAnimationActive={false}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as MonthBar;
            return (
              <TipBox
                title={d.label}
                lines={[
                  `${fmtR(d.totalR)} total`,
                  `${d.trades} trade${d.trades === 1 ? "" : "s"} · ${fmtPct(d.winRate)} wins`,
                ]}
              />
            );
          }}
        />
        <Bar dataKey="totalR" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.key} fill={signFill(d.totalR)} />
          ))}
        </Bar>
      </BarChart>
    </Box>
  );
}

export type RollingPoint = { n: number; winRate: number; expectancy: number };

/**
 * One measure over the last 20 trades. Win rate and expectancy have different
 * scales, so they get a chart each (never two y-axes on one chart).
 */
export function RollingChart({
  data,
  measure,
}: {
  data: RollingPoint[];
  measure: "expectancy" | "winRate";
}) {
  const isR = measure === "expectancy";
  return (
    <Box>
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        accessibilityLayer
        role="img"
        aria-label={
          isR
            ? "Average R over the last 20 trades, after each trade"
            : "Win rate over the last 20 trades, after each trade"
        }
      >
        <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
        <XAxis
          dataKey="n"
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          minTickGap={24}
          tickFormatter={(n: number) => `#${n}`}
        />
        <YAxis
          width={52}
          tickLine={false}
          axisLine={false}
          tick={axisTick}
          tickCount={5}
          domain={isR ? ["auto", "auto"] : [0, 1]}
          tickFormatter={(v: number) => (isR ? fmtR(v).replace(".00", "") : fmtPct(v))}
        />
        {isR && <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />}
        <Tooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }}
          isAnimationActive={false}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as RollingPoint;
            return (
              <TipBox
                title={`Trades ${d.n - 19}–${d.n}`}
                lines={[isR ? `${fmtR(d.expectancy)} per trade` : `${fmtPct(d.winRate)} wins`]}
              />
            );
          }}
        />
        <Line
          type="linear"
          dataKey={measure}
          stroke="var(--foreground)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: "var(--foreground)" }}
          isAnimationActive={false}
        />
      </LineChart>
    </Box>
  );
}
