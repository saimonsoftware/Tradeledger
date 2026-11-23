import type { Metadata } from "next";
import { Suspense } from "react";

import { NoAccountsNotice } from "@/components/trades/no-accounts-notice";
import { TradeFormPage } from "@/components/trades/trade-form-page";
import { Skeleton } from "@/components/ui/skeleton";
import { getTradeFormOptions } from "@/lib/trades/data";
import { emptyTradeValues } from "@/lib/trades/form-values";

export const metadata: Metadata = { title: "Log a trade" };

async function NewTrade() {
  const { accounts, strategies, confluences, hiddenConfluences, timezone, nowLocal } =
    await getTradeFormOptions();
  const active = accounts.filter((a) => !a.is_archived);
  if (!active.length) return <NoAccountsNotice />;
  return (
    <TradeFormPage
      accounts={active}
      strategies={strategies}
      confluences={confluences}
      hiddenConfluences={hiddenConfluences}
      timezone={timezone}
      defaultValues={emptyTradeValues(nowLocal, active.length === 1 ? active[0].id : "")}
    />
  );
}

export default function NewTradePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Log a trade</h1>
      <Suspense fallback={<Skeleton className="h-[40rem] rounded-2xl" />}>
        <NewTrade />
      </Suspense>
    </div>
  );
}
