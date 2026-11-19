import Form from "next/form";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasActiveFilters, type TradeFilters as Filters } from "@/lib/trades/filters";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-base md:text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const labelClass = "mb-1 block text-xs text-muted-foreground";

/**
 * A plain GET form: filters live in the URL, so filtered views can be bookmarked
 * and shared, and the page works even before JavaScript loads. next/form turns
 * submissions into fast client-side navigations.
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
  return (
    <Form action="/app/trades" className="rounded-2xl surface p-4" aria-label="Filter trades">
      {/* Keep the current sort when filtering. */}
      {filters.sort && <input type="hidden" name="sort" value={filters.sort} />}
      {filters.dir && <input type="hidden" name="dir" value={filters.dir} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <label className="col-span-1">
          <span className={labelClass}>From</span>
          <Input type="date" name="from" defaultValue={filters.from} />
        </label>
        <label className="col-span-1">
          <span className={labelClass}>To</span>
          <Input type="date" name="to" defaultValue={filters.to} />
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
          <span className={labelClass}>Symbol</span>
          <Input
            name="symbol"
            defaultValue={filters.symbol}
            placeholder="Any"
            autoCapitalize="characters"
            className="uppercase placeholder:normal-case"
          />
        </label>
        <label>
          <span className={labelClass}>Side</span>
          <select name="direction" defaultValue={filters.direction ?? ""} className={selectClass}>
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
          <span className={labelClass}>Result</span>
          <select name="result" defaultValue={filters.result ?? ""} className={selectClass}>
            <option value="">All</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
            <option value="breakeven">Breakeven</option>
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

      <div className="mt-3 flex items-center justify-end gap-2">
        {hasActiveFilters(filters) && (
          <Button asChild variant="ghost" size="sm" className="h-8">
            <Link href="/app/trades">Clear filters</Link>
          </Button>
        )}
        <Button type="submit" variant="contrast" size="sm" className="h-8 px-4">
          Apply
        </Button>
      </div>
    </Form>
  );
}
