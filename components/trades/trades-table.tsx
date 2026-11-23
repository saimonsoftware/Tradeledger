import { formatInTimeZone } from "date-fns-tz";
import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpRight, ChevronsUpDown } from "lucide-react";
import Link from "next/link";

import { SignedAmount } from "@/components/common/signed-amount";
import { PIP_LABEL, pipsBetween } from "@/lib/calculations/rr";
import { formatPrice, formatR } from "@/lib/format/number";
import { BIAS_LABELS, type TradeSymbol } from "@/lib/trades/constants";
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
      className={cn("px-4 py-3 font-medium", align === "right" && "text-right")}
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
      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
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

/** Two-letter tile for the symbol (EU / NQ), like an asset icon. */
function SymbolTile({ symbol }: { symbol: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-linear-to-b from-muted to-background font-mono text-[11px] font-semibold text-foreground"
    >
      {symbol.slice(0, 2)}
    </span>
  );
}

function SidePill({ direction }: { direction: string }) {
  const long = direction === "long";
  const Icon = long ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium text-foreground/80">
      <Icon className="size-3" aria-hidden="true" />
      {long ? "Long" : "Short"}
    </span>
  );
}

/** Net P&L as a soft coloured pill (sign + arrow + colour, never colour alone). */
function PnlPill({ value, currency }: { value: string | number | null; currency: string }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const n = Number(value);
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1",
        n > 0 ? "bg-profit-muted" : n < 0 ? "bg-loss-muted" : "bg-muted",
      )}
    >
      <SignedAmount value={n} currency={currency} className="text-[13px]" />
    </span>
  );
}

function Rr({ value }: { value: number | null }) {
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        Number(value) > 0 && "text-profit",
        Number(value) < 0 && "text-loss",
        value === null && "text-muted-foreground",
      )}
    >
      {formatR(value)}
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
    <>
      {/* Phones: one card per trade (tap anywhere to open it). */}
      <ul aria-label="Trades" className="space-y-2 md:hidden">
        {trades.map((t) => {
          const currency = t.account?.currency ?? "EUR";
          const label = `${t.symbol} ${t.direction}`;
          return (
            <li
              key={t.id}
              className="relative flex items-center gap-3 rounded-2xl surface p-3 transition-colors active:bg-muted/50"
            >
              <SymbolTile symbol={t.symbol} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  {/* Stretched link: the whole card opens the trade. */}
                  <Link
                    href={`/app/trades/${t.id}`}
                    className="font-mono text-sm font-semibold outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                  >
                    {t.symbol}
                  </Link>
                  <SidePill direction={t.direction} />
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
                  {formatInTimeZone(t.entry_time, timezone, "EEE d MMM · HH:mm")}
                  {t.strategy && ` · ${t.strategy}`}
                  {t.bias && ` · ${BIAS_LABELS[t.bias]}`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {t.status === "open" ? (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    Open
                  </span>
                ) : (
                  <>
                    <PnlPill value={t.net_pnl} currency={currency} />
                    <span className="text-xs">
                      <Rr value={t.r_multiple} />
                    </span>
                  </>
                )}
              </div>
              {/* Above the stretched link so the menu stays tappable. */}
              <div className="relative z-10 -mr-1">
                <TradeRowActions tradeId={t.id} label={label} />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Tablets and up: the full table. */}
      <div className="hidden overflow-hidden rounded-2xl surface md:block">
        {/* relative: keeps absolutely positioned sr-only labels inside the scroll box. */}
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <caption className="sr-only">Trades</caption>
            <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
              <tr>
                <SortHeader field="symbol" label="Trade" filters={filters} />
                <SortHeader field="entry_time" label="Date" filters={filters} />
                <th scope="col" className="px-4 py-3 font-medium">
                  Account
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Entry
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  SL / TP
                </th>
                <SortHeader field="r_multiple" label="RR" filters={filters} align="right" />
                <SortHeader field="net_pnl" label="Net P&L" filters={filters} align="right" />
                <th scope="col" className="w-12 px-2 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {trades.map((t) => {
                const currency = t.account?.currency ?? "EUR";
                const label = `${t.symbol} ${t.direction}`;
                return (
                  <tr key={t.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <SymbolTile symbol={t.symbol} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/app/trades/${t.id}`}
                              className="font-mono font-semibold hover:underline"
                            >
                              {t.symbol}
                            </Link>
                            <SidePill direction={t.direction} />
                          </div>
                          {(t.strategy || t.bias) && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {[t.strategy, t.bias && BIAS_LABELS[t.bias]]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      <span className="block">
                        {formatInTimeZone(t.entry_time, timezone, "d MMM yyyy")}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatInTimeZone(t.entry_time, timezone, "EEE · HH:mm")}
                      </span>
                    </td>
                    <td className="max-w-40 truncate px-4 py-3 text-muted-foreground">
                      {t.account?.name}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPrice(t.entry_price)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <SlTp trade={t} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Rr value={t.r_multiple} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PnlPill value={t.net_pnl} currency={currency} />
                    </td>
                    <td className="px-2 py-3">
                      <TradeRowActions tradeId={t.id} label={label} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
