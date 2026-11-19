import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CoachChat } from "@/components/coach/coach-chat";
import { DeleteReportButton } from "@/components/coach/delete-report-button";
import { ReportView } from "@/components/coach/report-view";
import { Skeleton } from "@/components/ui/skeleton";
import type { CoachReport } from "@/lib/ai/report-schema";
import { getCoachStatus, getReportWithMessages } from "@/lib/coach/data";
import { getProfile } from "@/lib/profile/data";
import { idSchema } from "@/lib/validation/accounts";

export const metadata: Metadata = { title: "Coach report" };
export const maxDuration = 120;

async function Report({ params }: { params: PageProps<"/app/coach/[id]">["params"] }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const [data, status, { timezone }] = await Promise.all([
    getReportWithMessages(id),
    getCoachStatus(),
    getProfile(),
  ]);
  if (!data) notFound(); // includes other users' reports (RLS)
  const { report, messages } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Coach report</h1>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {formatInTimeZone(report.created_at, timezone, "d MMM yyyy, HH:mm")} ·{" "}
            {report.trade_count} closed trades ·{" "}
            {report.period_from ? `${report.period_from} to ${report.period_to}` : "all time"} ·{" "}
            {report.account?.name ?? "all accounts"}
          </p>
        </div>
        <DeleteReportButton id={report.id} />
      </div>
      <ReportView report={report.report as CoachReport} />
      <CoachChat
        reportId={report.id}
        chatsLeft={status.chatsLeft}
        initial={messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))}
      />
    </div>
  );
}

export default function CoachReportPage({ params }: PageProps<"/app/coach/[id]">) {
  return (
    <div>
      <Link
        href="/app/coach"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> AI Coach
      </Link>
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <Report params={params} />
      </Suspense>
    </div>
  );
}
