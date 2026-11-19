import { formatInTimeZone } from "date-fns-tz";
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ConsentCard } from "@/components/coach/consent-card";
import { GenerateForm } from "@/components/coach/generate-form";
import { Skeleton } from "@/components/ui/skeleton";
import type { CoachReport } from "@/lib/ai/report-schema";
import { getCoachStatus } from "@/lib/coach/data";
import { getProfile } from "@/lib/profile/data";

export const metadata: Metadata = { title: "AI Coach" };
// Server Actions on this page call the AI, which can take up to a minute.
export const maxDuration = 120;

async function Coach() {
  const [status, { timezone }] = await Promise.all([getCoachStatus(), getProfile()]);
  if (!status.consented) return <ConsentCard />;

  return (
    <div className="space-y-6">
      <GenerateForm accounts={status.accounts} reportsLeft={status.reportsLeft} />
      <section aria-labelledby="past-reports">
        <h2 id="past-reports" className="mb-3 font-semibold">
          Past reports
        </h2>
        {status.reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reports yet. Run your first analysis above.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl surface">
            {status.reports.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/app/coach/${r.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium">{(r.report as CoachReport).headline}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {formatInTimeZone(r.created_at, timezone, "d MMM yyyy")} · {r.trade_count}{" "}
                      trades · {r.period_from ? `since ${r.period_from}` : "all time"}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function CoachPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">AI Coach</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Find what&apos;s working in your trading, and what to change.
      </p>
      <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
        <Coach />
      </Suspense>
    </div>
  );
}
