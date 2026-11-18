import { ArrowDownRight, ArrowUpRight, LineChart, Minus } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";

// Phase 0 placeholder. Replaced by the real landing page in Phase 1.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <LineChart className="size-5 text-primary" aria-hidden="true" />
          TradeLedger
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
          <p className="text-sm font-medium text-primary">Phase 0 · Setup complete</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Know your edge. Journal every trade.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This is a placeholder page. Use the toggle in the top right to switch between light,
            dark and system themes.
          </p>

          {/* Token preview: profit / loss / neutral with sign + icon (never colour alone). */}
          <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-profit-muted p-3">
              <dt className="text-muted-foreground">Win</dt>
              <dd className="mt-1 flex items-center gap-1 font-medium text-profit tabular-nums">
                <ArrowUpRight className="size-4" aria-hidden="true" />
                +€1,240.50
              </dd>
            </div>
            <div className="rounded-lg bg-loss-muted p-3">
              <dt className="text-muted-foreground">Loss</dt>
              <dd className="mt-1 flex items-center gap-1 font-medium text-loss tabular-nums">
                <ArrowDownRight className="size-4" aria-hidden="true" />
                −€310.00
              </dd>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <dt className="text-muted-foreground">Even</dt>
              <dd className="mt-1 flex items-center gap-1 font-medium text-neutral tabular-nums">
                <Minus className="size-4" aria-hidden="true" />
                €0.00
              </dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
