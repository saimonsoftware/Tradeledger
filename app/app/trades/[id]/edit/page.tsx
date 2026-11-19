import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { TradeFormPage } from "@/components/trades/trade-form-page";
import { Skeleton } from "@/components/ui/skeleton";
import { getTrade, getTradeFormOptions } from "@/lib/trades/data";
import { tradeToFormValues } from "@/lib/trades/form-values";
import { idSchema } from "@/lib/validation/accounts";

export const metadata: Metadata = { title: "Edit trade" };

async function EditTrade({ params }: { params: PageProps<"/app/trades/[id]/edit">["params"] }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const [trade, options] = await Promise.all([getTrade(id), getTradeFormOptions()]);
  if (!trade) notFound();

  // Active accounts, plus this trade's own account even if it's archived.
  const accounts = options.accounts.filter((a) => !a.is_archived || a.id === trade.account_id);
  return (
    <TradeFormPage
      tradeId={trade.id}
      accounts={accounts}
      strategies={options.strategies}
      timezone={options.timezone}
      defaultValues={tradeToFormValues(trade, options.timezone)}
    />
  );
}

export default function EditTradePage({ params }: PageProps<"/app/trades/[id]/edit">) {
  return (
    <div>
      <Link
        href="/app/trades"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> All trades
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Edit trade</h1>
      <Suspense fallback={<Skeleton className="h-[40rem] rounded-2xl" />}>
        <EditTrade params={params} />
      </Suspense>
    </div>
  );
}
