"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { TradeInput } from "@/lib/validation/trades";

import { TradeForm, type TradeFormAccount } from "./trade-form";

/** Full-page wrapper for /app/trades/new and /app/trades/[id]/edit. */
export function TradeFormPage(props: {
  accounts: TradeFormAccount[];
  strategies: string[];
  timezone: string;
  defaultValues: TradeInput;
  tradeId?: string;
}) {
  const router = useRouter();
  return (
    <TradeForm
      {...props}
      onCancel={() => router.back()}
      onSaved={(id) => {
        toast.success(props.tradeId ? "Trade updated" : "Trade logged");
        router.push(`/app/trades/${id}`);
      }}
    />
  );
}
