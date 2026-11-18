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

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="scroll-mt-20 border-t bg-muted/30 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="how-title"
          eyebrow="How it works"
          title="Up and running in three steps"
        />

        <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {/* Connecting line on desktop */}
          <div
            aria-hidden="true"
            className="absolute top-5 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
          />
          {steps.map((step, i) => (
            <li key={step.title} className="relative text-center">
              <span className="relative mx-auto flex size-10 items-center justify-center rounded-full border bg-background font-mono text-sm font-medium text-primary tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
