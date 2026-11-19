import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { formatSignedCurrency } from "@/lib/format/currency";
import { cn } from "@/lib/utils";

/** P&L-style amount: green/red/grey PLUS a sign and an arrow (never colour alone). */
export function SignedAmount({
  value,
  currency,
  className,
  showIcon = true,
}: {
  value: number;
  currency: string;
  className?: string;
  showIcon?: boolean;
}) {
  // Zero gets no icon: a dash would read like a minus sign.
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium tabular-nums",
        value > 0 ? "text-profit" : value < 0 ? "text-loss" : "text-neutral",
        className,
      )}
    >
      {showIcon && Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
      {formatSignedCurrency(value, currency)}
    </span>
  );
}
