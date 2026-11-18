import { SectionHeading } from "./section-heading";

const steps = [
  {
    title: "Create your account",
    body: "Sign up with your email in under a minute. Verify your address and you're in.",
  },
  {
    title: "Add your trading accounts",
    body: "Add each broker or prop firm account with its currency and starting balance.",
  },
  {
    title: "Log trades and review",
    body: "Record trades as you take them, then review your week on the dashboard.",
  },
];

// Mobile: a left-aligned vertical timeline. Desktop (md+): three centred columns
// joined by a horizontal line.
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="scroll-mt-20 border-t bg-muted/30 py-16 sm:py-24 lg:py-28 dark:bg-transparent"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="how-title"
          eyebrow="How it works"
          title="Up and running in three steps"
        />

        <ol className="relative mx-auto mt-12 max-w-md space-y-8 md:mt-14 md:grid md:max-w-none md:grid-cols-3 md:gap-8 md:space-y-0">
          {/* Vertical line (mobile) */}
          <div
            aria-hidden="true"
            className="absolute top-5 bottom-5 left-5 w-px bg-gradient-to-b from-border via-border to-transparent md:hidden"
          />
          {/* Horizontal line (desktop) */}
          <div
            aria-hidden="true"
            className="absolute top-5 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
          />
          {steps.map((step, i) => (
            <li key={step.title} className="relative flex gap-5 md:block md:text-center">
              <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border bg-background font-mono text-sm font-medium text-primary tabular-nums md:mx-auto">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="pt-1.5 md:pt-0">
                <h3 className="text-lg font-semibold md:mt-5">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground md:mx-auto md:mt-2 md:max-w-xs">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
