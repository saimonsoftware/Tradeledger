import "server-only";

import { z } from "zod";

import { maxDrawdownR, monthly, rDistribution, rolling, stopSizes } from "@/lib/analytics/stats";
import { requireUser } from "@/lib/auth/dal";
import { lastNDays } from "@/lib/calculations/week";
import { loadStatTrades } from "@/lib/insights/load";
import { computeInsightStats } from "@/lib/insights/stats";
import { getProfile } from "@/lib/profile/data";
import { createClient } from "@/lib/supabase/server";
import { STRATEGIES, SYMBOLS } from "@/lib/trades/constants";

export const ANALYTICS_RANGES = { "30": 30, "90": 90, "365": 365, all: null } as const;
export type AnalyticsRange = keyof typeof ANALYTICS_RANGES;

const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);
// Invalid values in the URL are ignored (no filter), never an error.
const opt = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => one(v) || undefined, schema.optional()).catch(undefined);

const filterSchema = z.object({
  range: opt(z.enum(["30", "90", "365", "all"])),
  account: opt(z.uuid()),
  symbol: opt(z.enum(SYMBOLS)),
  strategy: opt(z.enum(STRATEGIES)),
});
export type AnalyticsFilters = z.output<typeof filterSchema>;

export function parseAnalyticsFilters(sp: Record<string, string | string[] | undefined>) {
  return filterSchema.parse(sp);
}

export function analyticsHref(
  current: AnalyticsFilters,
  overrides: Partial<Record<keyof AnalyticsFilters, string | undefined>>,
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...overrides })) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/app/analytics?${qs}` : "/app/analytics";
}

export async function getAnalytics(filters: AnalyticsFilters) {
  await requireUser();
  const { timezone } = await getProfile();
  const supabase = await createClient();
  const days = ANALYTICS_RANGES[filters.range ?? "all"];
  const now = new Date();
  const fromDate = days ? lastNDays(now, timezone, days)[0] : null;

  const [{ trades }, accounts] = await Promise.all([
    loadStatTrades({
      timezone,
      fromDate,
      accountId: filters.account ?? null,
      symbol: filters.symbol ?? null,
      strategy: filters.strategy ?? null,
    }),
    supabase.from("trading_accounts").select("id, name").order("name"),
  ]);
  if (accounts.error) throw new Error("Could not load accounts");

  const stats = computeInsightStats(trades, timezone, {
    from: fromDate,
    to: lastNDays(now, timezone, 1)[0],
  });

  return {
    timezone,
    accounts: accounts.data,
    tradeCount: trades.length,
    stats,
    maxDrawdownR: maxDrawdownR(trades),
    distribution: rDistribution(trades),
    monthly: monthly(trades, timezone),
    rolling: rolling(trades),
    stopSizes: stopSizes(trades),
  };
}

export type Analytics = Awaited<ReturnType<typeof getAnalytics>>;
