import { Layers, MessagesSquare, NotebookTabs, Plus, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { CATEGORY_ICONS } from "@/components/playbook/category-icon";
import { RuleDialog } from "@/components/playbook/rule-dialog";
import { RuleItem } from "@/components/playbook/rule-item";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listRules } from "@/lib/playbook/data";
import { cn } from "@/lib/utils";
import { RULE_CATEGORIES, RULE_CATEGORY_LABELS } from "@/lib/validation/rules";

export const metadata: Metadata = { title: "Playbook" };

function Tile({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint: string;
}) {
  return (
    <div className="rounded-2xl surface card-glow p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-md border bg-background">
          {icon}
        </span>
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

async function Rules({
  searchParams,
}: {
  searchParams: PageProps<"/app/playbook">["searchParams"];
}) {
  const { view } = await searchParams;
  const archived = view === "archived";
  const [active, archivedRules] = await Promise.all([
    listRules({ archived: false }),
    listRules({ archived: true }),
  ]);
  const rules = archived ? archivedRules : active;
  const usedCategories = RULE_CATEGORIES.filter((c) => active.some((r) => r.category === c));
  const fromCoach = active.filter((r) => r.source === "ai").length;

  const tab = (href: string, label: string, count: number, current: boolean) => (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        current
          ? "bg-background text-foreground shadow-sm dark:bg-muted"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span className="rounded-full bg-foreground/10 px-1.5 text-[10px] tabular-nums">{count}</span>
    </Link>
  );

  const categories = RULE_CATEGORIES.map((cat) => ({
    cat,
    rules: rules.filter((r) => r.category === cat),
  })).filter((c) => c.rules.length > 0);

  return (
    <div className="space-y-5">
      <section aria-label="Overview" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tile
          icon={<NotebookTabs className="size-3.5" aria-hidden="true" />}
          label="Active rules"
          value={active.length}
          hint={archivedRules.length ? `${archivedRules.length} archived` : "Rules you trade by"}
        />
        <Tile
          icon={<Layers className="size-3.5" aria-hidden="true" />}
          label="Categories"
          value={
            <>
              {usedCategories.length}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {RULE_CATEGORIES.length}
              </span>
            </>
          }
          hint={
            usedCategories.length === RULE_CATEGORIES.length
              ? "Every area covered"
              : `Missing: ${RULE_CATEGORIES.filter((c) => !usedCategories.includes(c))
                  .map((c) => RULE_CATEGORY_LABELS[c])
                  .join(", ")}`
          }
        />
        <div className="col-span-2 lg:col-span-1">
          <Tile
            icon={<Sparkles className="size-3.5" aria-hidden="true" />}
            label="From your coach"
            value={fromCoach}
            hint="Rules the AI coach suggested and you added"
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <nav
          aria-label="Rule filter"
          className="inline-flex items-center gap-0.5 rounded-xl border bg-muted/40 p-0.5"
        >
          {tab("/app/playbook", "Active", active.length, !archived)}
          {tab("/app/playbook?view=archived", "Archived", archivedRules.length, archived)}
        </nav>
        {categories.length > 1 && (
          <ul aria-label="Jump to a category" className="flex flex-wrap gap-1.5">
            {categories.map(({ cat, rules: inCat }) => {
              const Icon = CATEGORY_ICONS[cat];
              return (
                <li key={cat}>
                  <a
                    href={`#cat-${cat}`}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <Icon className="size-3" aria-hidden="true" />
                    {RULE_CATEGORY_LABELS[cat]}
                    <span className="tabular-nums">{inCat.length}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {rules.length === 0 ? (
        archived ? (
          <div className="rounded-2xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
            No archived rules. Archive a rule from its ⋯ menu to keep it out of the way.
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
            <span className="chat-mark-glow flex size-12 items-center justify-center rounded-2xl border bg-background">
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
                  <Button variant="contrast" className="h-10 rounded-xl px-4">
                    <Plus data-icon="inline-start" /> Add a rule
                  </Button>
                }
              />
              <Button asChild variant="outline" className="h-10 rounded-xl px-4">
                <Link href="/app/chat">
                  <MessagesSquare data-icon="inline-start" /> Ask your coach
                </Link>
              </Button>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {categories.map(({ cat, rules: inCat }) => {
            const Icon = CATEGORY_ICONS[cat];
            return (
              <section
                key={cat}
                id={`cat-${cat}`}
                aria-labelledby={`cat-${cat}-title`}
                className="scroll-mt-20 overflow-hidden rounded-2xl surface"
              >
                <header className="flex items-center gap-2.5 border-b bg-muted/30 px-4 py-3 sm:px-5">
                  <span className="flex size-7 items-center justify-center rounded-lg border bg-background">
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <h2 id={`cat-${cat}-title`} className="text-sm font-semibold">
                    {RULE_CATEGORY_LABELS[cat]}
                  </h2>
                  <span className="rounded-full border px-2 text-[11px] text-muted-foreground tabular-nums">
                    {inCat.length} rule{inCat.length === 1 ? "" : "s"}
                  </span>
                </header>
                <ol className="divide-y">
                  {inCat.map((r, i) => (
                    <RuleItem key={r.id} rule={r} index={i} total={inCat.length} />
                  ))}
                </ol>
              </section>
            );
          })}

          {!archived && (
            <Link
              href="/app/chat"
              className="group flex items-center gap-3 rounded-2xl border border-dashed p-4 transition-colors hover:border-foreground/30 hover:bg-muted/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-background">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">Want sharper rules?</span>
                <span className="block text-xs text-muted-foreground">
                  Ask your coach to suggest rules based on your trades.
                </span>
              </span>
              <MessagesSquare
                className="ml-auto size-4 text-muted-foreground transition-colors group-hover:text-foreground"
                aria-hidden="true"
              />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function PlaybookSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="col-span-2 h-28 rounded-2xl lg:col-span-1" />
      </div>
      <Skeleton className="h-9 w-56 rounded-xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

export default function PlaybookPage({ searchParams }: PageProps<"/app/playbook">) {
  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-silver text-2xl font-semibold tracking-tight text-glow sm:text-3xl">
            Playbook
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your trading rules. Your coach uses them when giving advice.
          </p>
        </div>
        <RuleDialog
          trigger={
            <Button variant="contrast" size="sm" className="h-9 rounded-xl px-3.5">
              <Plus data-icon="inline-start" /> Add rule
            </Button>
          }
        />
      </div>
      <Suspense fallback={<PlaybookSkeleton />}>
        <Rules searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
