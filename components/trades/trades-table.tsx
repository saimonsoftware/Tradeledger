import { formatInTimeZone } from "date-fns-tz";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import Link from "next/link";

import { SignedAmount } from "@/components/common/signed-amount";
import { PIP_LABEL, pipsBetween } from "@/lib/calculations/rr";
import { formatPrice, formatR } from "@/lib/format/number";
import type { TradeSymbol } from "@/lib/trades/constants";
import type { TradeListItem } from "@/lib/trades/data";
import { tradesHref, type SortField, type TradeFilters } from "@/lib/trades/filters";
import { cn } from "@/lib/utils";

import { TradeRowActions } from "./trade-row-actions";

function SortHeader({
  field,
  label,
  filters,
  align = "left",
}: {
  field: SortField;
  label: string;
  filters: TradeFilters;
  align?: "left" | "right";
}) {
  const current = (filters.sort ?? "entry_time") === field;
  const dir = filters.dir ?? "desc";
  const nextDir = current && dir === "desc" ? "asc" : "desc";
  const Icon = !current ? ChevronsUpDown : dir === "desc" ? ArrowDown : ArrowUp;
  return (
    <th
      scope="col"
      aria-sort={current ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-3 py-2.5 font-medium", align === "right" && "text-right")}
    >
      <Link
        href={tradesHref(filters, { sort: field, dir: nextDir, page: 1 })}
        className={cn(
          "inline-flex items-center gap-1 rounded hover:text-foreground",
          current && "text-foreground",
        )}
      >
        {label}
        <Icon className="size-3.5" aria-hidden="true" />
      </Link>
    </th>
  );
}

/** "10 / 25 pips" (or points for NQ); "Open" badge for open trades without levels. */
function SlTp({ trade: t }: { trade: TradeListItem }) {
  const entry = String(t.entry_price);
  const sl = t.stop_loss === null ? null : pipsBetween(t.symbol, entry, String(t.stop_loss));
  const tp = t.take_profit === null ? null : pipsBetween(t.symbol, entry, String(t.take_profit));
  if (sl === null && tp === null) {
    return t.status === "open" ? (
      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
        Open
      </span>
    ) : (
      <span className="text-muted-foreground">—</span>
    );
  }
  const unit = t.symbol in PIP_LABEL ? PIP_LABEL[t.symbol as TradeSymbol] : "";
  return (
    <span className="whitespace-nowrap">
      {sl ?? "—"} / {tp ?? "—"} <span className="text-xs text-muted-foreground">{unit}</span>
    </span>
  );
}

export function TradesTable({
  trades,
  filters,
  timezone,
}: {
  trades: TradeListItem[];
  filters: TradeFilters;
  timezone: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl surface">
      {/* relative: keeps absolutely positioned sr-only labels inside the scroll box (else they widen the page on mobile). */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <caption className="sr-only">Trades</caption>
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <SortHeader field="entry_time" label="Date" filters={filters} />
              <SortHeader field="symbol" label="Symbol" filters={filters} />
              <th scope="col" className="px-3 py-2.5 font-medium">
                Side
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Account
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Entry
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                SL / TP
              </th>
              <SortHeader field="net_pnl" label="Net P&L" filters={filters} align="right" />
              <SortHeader field="r_multiple" label="RR" filters={filters} align="right" />
              <th scope="col" className="w-10 px-2 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {trades.map((t) => {
              const currency = t.account?.currency ?? "EUR";
              const label = `${t.symbol} ${t.direction}`;
              return (
                <tr key={t.id} className="group hover:bg-muted/40">
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatInTimeZone(t.entry_time, timezone, "d MMM yyyy, HH:mm")}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/app/trades/${t.id}`}
                      className="font-mono font-medium hover:underline"
                    >
                      {t.symbol}
                    </Link>
                    {t.strategy && (
                      <span className="ml-2 text-xs text-muted-foreground">{t.strategy}</span>
                    )}
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
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatPrice(t.entry_price)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <SlTp trade={t} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {t.net_pnl === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <SignedAmount value={Number(t.net_pnl)} currency={currency} />
                    )}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right tabular-nums",
                      Number(t.r_multiple) > 0 && "text-profit",
                      Number(t.r_multiple) < 0 && "text-loss",
                    )}
                  >
                    {formatR(t.r_multiple)}
                  </td>
                  <td className="px-2 py-2.5">
                    <TradeRowActions tradeId={t.id} label={label} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
