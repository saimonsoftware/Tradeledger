import { SlidersHorizontal, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SYMBOLS } from "@/lib/trades/constants";
import { hasActiveFilters, tradesHref, type TradeFilters as Filters } from "@/lib/trades/filters";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-2 text-base md:text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const labelClass = "mb-1 block text-xs text-muted-foreground";

/** One-tap choices (links, so they work before JavaScript loads and can be bookmarked). */
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

/**
 * Filters live in the URL, so filtered views can be bookmarked and shared, and the
 * page works even before JavaScript loads. Quick filters are links; the rest are a
 * plain GET form (next/form turns it into a fast client-side navigation).
 */
export function TradeFilters({
  filters,
  accounts,
  strategies,
}: {
  filters: Filters;
  accounts: { id: string; name: string }[];
  strategies: string[];
}) {
  const reset = { page: 1 } as const;
  const account = accounts.find((a) => a.id === filters.account);

  // Filters set in the "More filters" panel, shown as removable chips.
  const chips: { label: string; href: string }[] = [];
  if (filters.from || filters.to) {
    chips.push({
      label: `${filters.from ?? "…"} → ${filters.to ?? "…"}`,
      href: tradesHref(filters, { from: undefined, to: undefined, ...reset }),
    });
  }
  if (filters.account)
    chips.push({
      label: account?.name ?? "Account",
      href: tradesHref(filters, { account: undefined, ...reset }),
    });
  if (filters.direction)
    chips.push({
      label: filters.direction === "long" ? "Long" : "Short",
      href: tradesHref(filters, { direction: undefined, ...reset }),
    });
  if (filters.status)
    chips.push({
      label: filters.status === "open" ? "Open" : "Closed",
      href: tradesHref(filters, { status: undefined, ...reset }),
    });
  if (filters.strategy)
    chips.push({
      label: filters.strategy,
      href: tradesHref(filters, { strategy: undefined, ...reset }),
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="Result"
          options={[
            { label: "All", value: undefined },
            { label: "Wins", value: "win" },
            { label: "Losses", value: "loss" },
            { label: "Breakeven", value: "breakeven" },
          ].map((o) => ({
            label: o.label,
            href: tradesHref(filters, { result: o.value, ...reset }),
            active: filters.result === o.value,
          }))}
        />
        <Segmented
          label="Symbol"
          options={[
            { label: "All", value: undefined },
            ...SYMBOLS.map((s) => ({ label: s, value: s })),
          ].map((o) => ({
            label: o.label,
            href: tradesHref(filters, { symbol: o.value, ...reset }),
            active: filters.symbol === o.value,
          }))}
        />
      </div>

      <details className="group/filters rounded-2xl surface">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
          More filters
          {chips.length > 0 && (
            <span className="rounded-full bg-foreground px-1.5 text-[11px] font-semibold text-background tabular-nums">
              {chips.length}
            </span>
          )}
          <span className="ml-auto hidden truncate text-xs font-normal text-muted-foreground group-open/filters:hidden sm:inline">
            Dates, account, side, status, strategy
          </span>
        </summary>
        <Form action="/app/trades" className="border-t px-4 pt-4 pb-4" aria-label="Filter trades">
          {/* Keep the quick filters and the current sort. */}
          {filters.result && <input type="hidden" name="result" value={filters.result} />}
          {filters.symbol && <input type="hidden" name="symbol" value={filters.symbol} />}
          {filters.sort && <input type="hidden" name="sort" value={filters.sort} />}
          {filters.dir && <input type="hidden" name="dir" value={filters.dir} />}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <label>
              <span className={labelClass}>From</span>
              <Input type="date" name="from" defaultValue={filters.from} className="h-9" />
            </label>
            <label>
              <span className={labelClass}>To</span>
              <Input type="date" name="to" defaultValue={filters.to} className="h-9" />
            </label>
            <label>
              <span className={labelClass}>Account</span>
              <select name="account" defaultValue={filters.account ?? ""} className={selectClass}>
                <option value="">All</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass}>Side</span>
              <select
                name="direction"
                defaultValue={filters.direction ?? ""}
                className={selectClass}
              >
                <option value="">Both</option>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </label>
            <label>
              <span className={labelClass}>Status</span>
              <select name="status" defaultValue={filters.status ?? ""} className={selectClass}>
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <label>
              <span className={labelClass}>Strategy</span>
              <select name="strategy" defaultValue={filters.strategy ?? ""} className={selectClass}>
                <option value="">All</option>
                {strategies.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            {hasActiveFilters(filters) && (
              <Button asChild variant="ghost" size="sm" className="h-9">
                <Link href="/app/trades">Clear all</Link>
              </Button>
            )}
            <Button type="submit" variant="contrast" size="sm" className="h-9 px-5">
              Apply
            </Button>
          </div>
        </Form>
      </details>

      {chips.length > 0 && (
        <ul aria-label="Active filters" className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <li key={c.label}>
              <Link
                href={c.href}
                className="inline-flex items-center gap-1.5 rounded-full border bg-background py-1 pr-2 pl-3 text-xs font-medium transition-colors hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {c.label}
                <X className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <span className="sr-only">(remove filter)</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
