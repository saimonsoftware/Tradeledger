"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { loadTradeFormOptions } from "@/lib/trades/actions";
import type { TradeFormOptions } from "@/lib/trades/data";
import { emptyTradeValues } from "@/lib/trades/form-values";

import { TradeForm } from "./trade-form";

/** "+ Log trade" in the top bar: opens the trade form in a slide-over from any page. */
export function QuickAddTrade() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<TradeFormOptions | null>(null);
  const [loading, startLoading] = useTransition();

  const openSheet = () => {
    setOpen(true);
    setOptions(null);
    // Load fresh accounts/strategies each time it opens.
    startLoading(async () => setOptions(await loadTradeFormOptions()));
  };

  const active = options?.accounts.filter((a) => !a.is_archived) ?? [];

  return (
    <>
      <Button size="sm" variant="contrast" className="h-8 px-2.5 sm:px-3" onClick={openSheet}>
        <Plus data-icon="inline-start" />
        <span className="hidden sm:inline">Log trade</span>
        <span className="sr-only sm:hidden">Log trade</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        {/* data-[side=right]: matches (and overrides) the default sheet width rule. */}
        <SheetContent
          side="right"
          className="w-full overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
        >
          <SheetHeader>
            <SheetTitle>Log a trade</SheetTitle>
            <SheetDescription>
              Net P&amp;L and R-multiple are calculated as you type.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {loading || !options ? (
              <div className="space-y-4" aria-busy="true" aria-label="Loading form">
                <Skeleton className="h-40 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
              </div>
            ) : active.length === 0 ? (
              <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
                <p>You need a trading account before logging trades.</p>
                <Button asChild variant="contrast" className="mt-4" onClick={() => setOpen(false)}>
                  <Link href="/app/accounts">Go to accounts</Link>
                </Button>
              </div>
            ) : (
              <TradeForm
                accounts={active}
                strategies={options.strategies}
                confluences={options.confluences}
                timezone={options.timezone}
                defaultValues={emptyTradeValues(
                  options.nowLocal,
                  active.length === 1 ? active[0].id : "",
                )}
                onCancel={() => setOpen(false)}
                onSaved={(id) => {
                  setOpen(false);
                  toast.success("Trade logged", {
                    action: { label: "View", onClick: () => router.push(`/app/trades/${id}`) },
                  });
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
