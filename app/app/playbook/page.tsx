import { MessagesSquare, NotebookTabs, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { RuleDialog } from "@/components/playbook/rule-dialog";
import { RuleItem } from "@/components/playbook/rule-item";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listRules } from "@/lib/playbook/data";
import { cn } from "@/lib/utils";
import { RULE_CATEGORIES, RULE_CATEGORY_LABELS } from "@/lib/validation/rules";

export const metadata: Metadata = { title: "Playbook" };

async function Rules({
  searchParams,
}: {
  searchParams: PageProps<"/app/playbook">["searchParams"];
}) {
  const { view } = await searchParams;
  const archived = view === "archived";
  const rules = await listRules({ archived });

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );

  return (
    <>
      <nav aria-label="Rule filter" className="inline-flex gap-1 rounded-lg bg-muted p-1">
        {tab("/app/playbook", "Active", !archived)}
        {tab("/app/playbook?view=archived", "Archived", archived)}
      </nav>

      {rules.length === 0 ? (
        archived ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">No archived rules.</p>
        ) : (
          <div className="mt-6 flex flex-col items-center rounded-2xl surface card-glow px-6 py-14 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl border bg-background text-primary">
              <NotebookTabs className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Write your trading rules</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Your rules keep you consistent. Add them yourself, or ask your coach to suggest some
              based on your trades.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <RuleDialog
                trigger={
                  <Button variant="contrast" className="h-10 px-4">
                    <Plus data-icon="inline-start" /> Add a rule
                  </Button>
                }
              />
              <Button asChild variant="outline" className="h-10 px-4">
                <Link href="/app/chat">
                  <MessagesSquare data-icon="inline-start" /> Ask your coach
                </Link>
              </Button>
            </div>
          </div>
        )
      ) : (
        <div className="mt-6 space-y-4">
          {RULE_CATEGORIES.map((cat) => {
            const inCat = rules.filter((r) => r.category === cat);
            if (!inCat.length) return null;
            return (
              <section key={cat} aria-labelledby={`cat-${cat}`} className="rounded-2xl surface">
                <h2
                  id={`cat-${cat}`}
                  className="border-b px-5 py-3 text-xs font-medium tracking-wider text-muted-foreground uppercase"
                >
                  {RULE_CATEGORY_LABELS[cat]}
                </h2>
                <ol className="divide-y">
                  {inCat.map((r, i) => (
                    <RuleItem key={r.id} rule={r} index={i} total={inCat.length} />
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function PlaybookPage({ searchParams }: PageProps<"/app/playbook">) {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Playbook</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your trading rules. Your coach uses them when giving advice.
          </p>
        </div>
        <RuleDialog
          trigger={
            <Button variant="contrast" size="sm" className="h-8">
              <Plus data-icon="inline-start" /> Add rule
            </Button>
          }
        />
      </div>
      <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
        <Rules searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
