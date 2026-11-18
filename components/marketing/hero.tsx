import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { DashboardPreview } from "./dashboard-preview";

// Entrance animation (from tw-animate-css). `motion-safe:` means it only runs for
// people who haven't enabled "reduce motion" in their OS settings.
const reveal =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 [animation-duration:700ms] [animation-fill-mode:both]";

const assetClasses = ["Stocks", "Options", "Futures", "Forex", "Crypto", "CFDs"];

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/* Background (light mode only): terminal grid + soft brand glow. Dark mode is pure black. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid opacity-70" />
      <div
        aria-hidden="true"
        className="absolute top-[30rem] left-1/2 -z-10 h-[28rem] w-[56rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px] dark:hidden"
      />

      <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 lg:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <p
            className={`${reveal} inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 font-mono text-[11px] tracking-wider text-muted-foreground uppercase backdrop-blur`}
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full rounded-full bg-profit opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex size-1.5 rounded-full bg-profit" />
            </span>
            Trading journal · Account tracker
          </p>

          <h1
            id="hero-title"
            className={`${reveal} mt-6 text-4xl font-semibold tracking-tight text-balance text-foreground [animation-delay:80ms] hero-glow sm:text-6xl lg:text-7xl`}
          >
            Know your edge.
            <br />
            Journal every trade.
          </h1>

          <p
            className={`${reveal} mx-auto mt-6 max-w-xl text-base text-pretty text-muted-foreground [animation-delay:160ms] sm:text-lg`}
          >
            Log trades in seconds, keep every account in one place, and see exactly where your
            P&amp;L comes from, week after week.
          </p>

          <div
            className={`${reveal} mt-8 flex flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:flex-row`}
          >
            <Button asChild size="lg" className="h-11 w-full px-5 text-[15px] sm:w-auto">
              <Link href="/signup">
                Get started free <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 w-full px-5 text-[15px] sm:w-auto"
            >
              <Link href="/login">Log in</Link>
            </Button>
          </div>

          <ul
            className={`${reveal} mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground [animation-delay:320ms]`}
          >
            {["Free to start", "No credit card", "Private to you"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-profit" aria-hidden="true" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`${reveal} relative mx-auto mt-14 max-w-5xl [animation-delay:420ms] [animation-duration:1000ms] sm:mt-20`}
        >
          <DashboardPreview />
          {/* Fade the bottom of the preview into the page */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent"
          />
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-6">
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            Built for
          </p>
          <ul className="flex flex-wrap justify-center gap-2">
            {assetClasses.map((a) => (
              <li
                key={a}
                className="rounded-md border bg-background/60 px-2.5 py-1 text-xs text-foreground/80"
              >
                {a}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
