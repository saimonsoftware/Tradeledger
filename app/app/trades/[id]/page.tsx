import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft, Pencil, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SignedAmount } from "@/components/common/signed-amount";
import { DeleteTradeButton } from "@/components/trades/delete-trade-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format/currency";
import { formatPrice, formatR } from "@/lib/format/number";
import { getProfile } from "@/lib/profile/data";
import { ASSET_CLASS_LABELS, type AssetClass } from "@/lib/trades/constants";
import { getTrade } from "@/lib/trades/data";
import { cn } from "@/lib/utils";
import { idSchema } from "@/lib/validation/accounts";

export const metadata: Metadata = { title: "Trade" };

async function TradeDetail({ params }: { params: PageProps<"/app/trades/[id]">["params"] }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const [trade, { timezone }] = await Promise.all([getTrade(id), getProfile()]);
  if (!trade) notFound();

  const cur = trade.account?.currency ?? "EUR";
  const fmtTime = (iso: string | null) =>
    iso ? formatInTimeZone(iso, timezone, "EEE d MMM yyyy, HH:mm") : "—";
  const net = trade.net_pnl === null ? null : Number(trade.net_pnl);
  const result = net === null ? "Open" : net > 0 ? "Win" : net < 0 ? "Loss" : "Breakeven";

  const facts: [string, React.ReactNode][] = [
    ["Account", trade.account?.name ?? "—"],
    ["Asset class", ASSET_CLASS_LABELS[trade.asset_class as AssetClass] ?? trade.asset_class],
    [
      "Entry",
      <>
        {formatPrice(trade.entry_price)}{" "}
        <span className="text-muted-foreground">· {fmtTime(trade.entry_time)}</span>
      </>,
    ],
    [
      "Exit",
      trade.exit_time ? (
        <>
          {formatPrice(trade.exit_price)}{" "}
          <span className="text-muted-foreground">· {fmtTime(trade.exit_time)}</span>
        </>
      ) : (
        "Still open"
      ),
    ],
    ["Quantity", formatPrice(trade.quantity)],
    ["Multiplier", formatPrice(trade.multiplier)],
    ["Stop loss", formatPrice(trade.stop_loss)],
    ["Take profit", formatPrice(trade.take_profit)],
    ["Fees", formatCurrency(Number(trade.fees), cur)],
    ["Strategy", trade.strategy ?? "—"],
  ];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{trade.symbol}</h1>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-xs font-medium capitalize",
                trade.direction === "long"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {trade.direction}
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{result}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmtTime(trade.entry_time)} · times in {timezone}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="contrast" size="sm" className="h-8">
            <Link href={`/app/trades/${trade.id}/edit`}>
              <Pencil data-icon="inline-start" /> Edit
            </Link>
          </Button>
          <DeleteTradeButton tradeId={trade.id} label={`${trade.symbol} ${trade.direction}`} />
        </div>
      </div>

      <section
        aria-label="Results"
        className="mt-6 grid grid-cols-2 gap-5 rounded-2xl surface card-glow p-5 sm:grid-cols-4 sm:p-6"
      >
        <div>
          <p className="text-xs text-muted-foreground">Net P&amp;L</p>
          <p className="mt-1 text-2xl font-semibold">
            {net === null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <SignedAmount value={net} currency={cur} />
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Gross P&amp;L</p>
          <p className="mt-1 text-lg font-medium">
            {trade.gross_pnl === null ? (
              "—"
            ) : (
              <SignedAmount value={Number(trade.gross_pnl)} currency={cur} showIcon={false} />
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">R-multiple</p>
          <p
            className={cn(
              "mt-1 text-lg font-medium tabular-nums",
              Number(trade.r_multiple) > 0 && "text-profit",
              Number(trade.r_multiple) < 0 && "text-loss",
            )}
          >
            {formatR(trade.r_multiple)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Execution</p>
          <p
            className="mt-1.5 flex gap-0.5"
            aria-label={trade.rating ? `${trade.rating} out of 5` : "Not rated"}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                aria-hidden="true"
                className={cn(
                  "size-4",
                  (trade.rating ?? 0) >= n
                    ? "fill-primary text-primary"
                    : "text-muted-foreground/50",
                )}
              />
            ))}
          </p>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section aria-labelledby="details-title" className="rounded-2xl surface">
          <h2 id="details-title" className="border-b px-5 py-4 font-semibold">
            Details
          </h2>
          <dl className="divide-y text-sm">
            {facts.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-5 py-2.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="notes-title" className="rounded-2xl surface">
          <h2 id="notes-title" className="border-b px-5 py-4 font-semibold">
            Notes &amp; tags
          </h2>
          <div className="space-y-4 p-5 text-sm">
            {trade.tags.length > 0 && (
              <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
                {trade.tags.map((t) => (
                  <li key={t} className="rounded-md border bg-background px-2 py-0.5 text-xs">
                    {t}
                  </li>
                ))}
              </ul>
            )}
            {/* Plain text only (React escapes it). whitespace-pre-wrap keeps line breaks. */}
            {trade.notes ? (
              <p className="leading-relaxed whitespace-pre-wrap">{trade.notes}</p>
            ) : (
              <p className="text-muted-foreground">No notes for this trade.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

export default function TradePage({ params }: PageProps<"/app/trades/[id]">) {
  return (
    <div>
      <Link
        href="/app/trades"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> All trades
      </Link>
      <Suspense
        fallback={
          <>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-6 h-32 rounded-2xl" />
            <Skeleton className="mt-6 h-72 rounded-2xl" />
          </>
        }
      >
        <TradeDetail params={params} />
      </Suspense>
    </div>
  );
}
