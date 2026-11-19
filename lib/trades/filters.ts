import { z } from "zod";

import { DIRECTIONS, RESULTS, STATUSES } from "./constants";

export const SORT_FIELDS = ["entry_time", "exit_time", "symbol", "net_pnl", "r_multiple"] as const;
export type SortField = (typeof SORT_FIELDS)[number];

const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);
// Invalid values in the URL are ignored (fall back to "no filter") rather than erroring.
const opt = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => one(v) || undefined, schema.optional()).catch(undefined);

const filterSchema = z.object({
  from: opt(z.iso.date()),
  to: opt(z.iso.date()),
  account: opt(z.uuid()),
  symbol: opt(
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9.:/_-]{1,20}$/),
  ),
  direction: opt(z.enum(DIRECTIONS)),
  status: opt(z.enum(STATUSES)),
  result: opt(z.enum(RESULTS)),
  strategy: opt(z.string().trim().max(100)),
  sort: opt(z.enum(SORT_FIELDS)),
  dir: opt(z.enum(["asc", "desc"])),
  page: z.preprocess(one, z.coerce.number().int().min(1).max(10000)).catch(1).default(1),
});

export type TradeFilters = z.output<typeof filterSchema>;

export function parseTradeFilters(searchParams: Record<string, string | string[] | undefined>) {
  return filterSchema.parse(searchParams);
}

/** Builds a /app/trades URL, keeping current filters and applying overrides. */
export function tradesHref(
  current: TradeFilters,
  overrides: Partial<Record<keyof TradeFilters, string | number | undefined>>,
) {
  const merged: Record<string, string | number | undefined> = { ...current, ...overrides };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === "" || (k === "page" && Number(v) === 1)) continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `/app/trades?${qs}` : "/app/trades";
}

export const hasActiveFilters = (f: TradeFilters) =>
  Boolean(
    f.from || f.to || f.account || f.symbol || f.direction || f.status || f.result || f.strategy,
  );
