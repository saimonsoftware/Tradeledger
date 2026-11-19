"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/common/form-message";
import { Button } from "@/components/ui/button";
import { generateReport } from "@/lib/coach/actions";
import { useFieldIds } from "@/lib/use-field-ids";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function GenerateForm({
  accounts,
  reportsLeft,
}: {
  accounts: { id: string; name: string; currency: string }[];
  reportsLeft: number;
}) {
  const f = useFieldIds();
  const router = useRouter();
  const [period, setPeriod] = useState("90");
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      setError(null);
      const r = await generateReport({ period: period as "30", accountId: accountId || null });
      if (!r.ok) return setError(r.error);
      router.push(`/app/coach/${r.data!.id}`);
    });

  return (
    <section aria-labelledby="new-report" className="rounded-2xl surface card-glow p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="new-report" className="font-semibold">
            New analysis
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Uses your closed trades. Numbers are calculated by TradeLedger; the coach explains them.
          </p>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {reportsLeft} of 5 analyses left today
        </p>
      </div>

      {error && (
        <div className="mt-4">
          <FormMessage type="error">{error}</FormMessage>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor={f("period")} className="mb-1 block text-xs text-muted-foreground">
            Period
          </label>
          <select
            id={f("period")}
            className={selectClass}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            disabled={pending}
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 12 months</option>
            <option value="all">All time</option>
          </select>
        </div>
        <div>
          <label htmlFor={f("account")} className="mb-1 block text-xs text-muted-foreground">
            Account
          </label>
          <select
            id={f("account")}
            className={selectClass}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            disabled={pending}
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="contrast"
          className="h-9 px-4"
          onClick={run}
          disabled={pending || reportsLeft === 0}
        >
          {pending ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <Sparkles data-icon="inline-start" />
          )}
          {pending ? "Analysing…" : "Analyse my trades"}
        </Button>
      </div>
      {pending && (
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          The coach is reviewing your trades. This usually takes 20–60 seconds.
        </p>
      )}
    </section>
  );
}
