import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="border-t py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative isolate overflow-hidden rounded-3xl surface px-6 py-14 text-center sm:px-12 sm:py-20">
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid opacity-60" />
          <div
            aria-hidden="true"
            className="absolute -top-24 left-1/2 -z-10 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[100px] dark:hidden"
          />
          <h2
            id="cta-title"
            className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-glow sm:text-4xl"
          >
            Your next hundred trades are data. Start recording them.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Set up your first account in under two minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 w-full px-5 text-[15px] sm:w-auto">
              <Link href="/signup">
                Get started free <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="h-11 w-full px-5 text-[15px] sm:w-auto"
            >
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
