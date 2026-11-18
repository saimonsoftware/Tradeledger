import {
  BarChart3,
  BookOpenCheck,
  Lock,
  Star,
  Target,
  Timer,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { SectionHeading } from "./section-heading";

function BenefitCard({
  icon: Icon,
  title,
  children,
  visual,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  visual?: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl surface card-glow p-6 transition-colors hover:border-primary/40 dark:hover:border-white/20",
        className,
      )}
    >
      <span className="inline-flex size-9 items-center justify-center rounded-lg border bg-background text-primary">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{children}</p>
      {visual && (
        <div aria-hidden="true" className="mt-6 flex flex-1 items-end">
          {visual}
        </div>
      )}
    </li>
  );
}

const Chip = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span
    className={cn(
      "rounded-md border bg-background px-2 py-1 font-mono text-[11px] text-foreground/80",
      className,
    )}
  >
    {children}
  </span>
);

const bars = [40, -18, 64, -9, 52, 30, -22, 70, 45, 58];

export function Benefits() {
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="scroll-mt-20 border-t py-16 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="features-title"
          eyebrow="Features"
          title="Everything a serious trader tracks. Nothing they don't."
          description="A focused journal that turns your trading history into clear answers: what's working, what isn't, and how your accounts are really doing."
        />

        <ul className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <BenefitCard
            icon={Wallet}
            title="All your accounts in one place"
            className="lg:col-span-4"
            visual={
              <div className="flex flex-wrap gap-2">
                <Chip>Live</Chip>
                <Chip>Demo</Chip>
                <Chip>Prop challenge</Chip>
                <Chip>Prop funded</Chip>
                <Chip className="border-primary/30 text-primary">EUR</Chip>
                <Chip className="border-primary/30 text-primary">USD</Chip>
                <Chip className="border-primary/30 text-primary">GBP</Chip>
              </div>
            }
          >
            Broker accounts, prop firm challenges and funded accounts side by side, each with its
            own currency, deposits, withdrawals and a live balance.
          </BenefitCard>

          <BenefitCard
            icon={Timer}
            title="Log trades in seconds"
            className="lg:col-span-2"
            visual={
              <div className="w-full rounded-lg border bg-background p-3 font-mono text-[11px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>NQ · Long · 2 @ 21,480</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-muted-foreground">Net P&amp;L</span>
                  <span className="text-profit tabular-nums">+€640.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">R-multiple</span>
                  <span className="tabular-nums">2.1R</span>
                </div>
              </div>
            }
          >
            Enter the basics and TradeLedger calculates gross and net P&amp;L, fees and your
            R‑multiple instantly.
          </BenefitCard>

          <BenefitCard
            icon={BarChart3}
            title="Weekly P&L at a glance"
            className="lg:col-span-2"
            visual={
              <div className="flex h-16 w-full items-center gap-1.5">
                {bars.map((b, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col justify-center">
                    <div className="flex h-1/2 items-end">
                      {b > 0 && (
                        <div
                          className="w-full rounded-t-sm bg-profit/80"
                          style={{ height: `${b}%` }}
                        />
                      )}
                    </div>
                    <div className="flex h-1/2 items-start">
                      {b < 0 && (
                        <div
                          className="w-full rounded-b-sm bg-loss/80"
                          style={{ height: `${-b * 2}%` }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            }
          >
            Your week, Monday to Sunday in your own timezone, with daily net P&amp;L, win rate and
            trade count.
          </BenefitCard>

          <BenefitCard
            icon={Target}
            title="Find what's working"
            className="lg:col-span-2"
            visual={
              <div className="flex flex-wrap gap-2">
                <Chip>ORB</Chip>
                <Chip>VWAP reclaim</Chip>
                <Chip className="border-profit/30 text-profit">A+ setup</Chip>
                <Chip className="border-loss/30 text-loss">FOMO</Chip>
              </div>
            }
          >
            Tag every trade with its strategy and setup, then filter to see which ones actually pay.
          </BenefitCard>

          <BenefitCard
            icon={BookOpenCheck}
            title="Build discipline"
            className="lg:col-span-2"
            visual={
              <div className="w-full rounded-lg border bg-background p-3">
                <div className="flex gap-0.5 text-primary">
                  {[1, 2, 3, 4].map((s) => (
                    <Star key={s} className="size-3.5 fill-current" />
                  ))}
                  <Star className="size-3.5 text-muted-foreground" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  &ldquo;Waited for the retest. Followed the plan.&rdquo;
                </p>
              </div>
            }
          >
            Rate your execution and write notes on every trade, so the lessons actually stick.
          </BenefitCard>

          <BenefitCard
            icon={Lock}
            title="Private by design"
            className="md:col-span-2 lg:col-span-6"
          >
            Your journal is visible to you and nobody else. Access is enforced by the database
            itself, not just the app.{" "}
            <Link
              href="/#security"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              How we protect your data
            </Link>
          </BenefitCard>
        </ul>
      </div>
    </section>
  );
}
