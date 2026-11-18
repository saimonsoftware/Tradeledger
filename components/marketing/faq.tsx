import { ChevronDown } from "lucide-react";

import { SectionHeading } from "./section-heading";

// Uses native <details>/<summary>: accessible, keyboard-friendly, and needs no JavaScript.
const faqs = [
  {
    q: "Is TradeLedger free?",
    a: "Yes. You can create an account and start journaling for free. No credit card required.",
  },
  {
    q: "Can I connect my broker automatically?",
    a: "Not yet. For now you add accounts and log trades manually, which takes seconds. CSV import and direct broker connections are on the roadmap.",
  },
  {
    q: "Which markets can I journal?",
    a: "Stocks, options, futures, forex, crypto and CFDs. A contract multiplier setting handles futures point values, so P&L is always calculated correctly.",
  },
  {
    q: "Does it work for prop firm accounts?",
    a: "Yes. Mark an account as a prop challenge or prop funded account and track it alongside your personal accounts.",
  },
  {
    q: "What if my accounts use different currencies?",
    a: "Each account keeps its own currency. Totals are grouped by currency, so nothing is silently converted at a made-up rate.",
  },
  {
    q: "Who can see my data?",
    a: "Only you. Your data is isolated at the database level, so no other user can ever read, change or delete it.",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="scroll-mt-20 border-t bg-muted/30 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading id="faq-title" eyebrow="FAQ" title="Questions, answered" />

        <div className="mt-12 divide-y rounded-2xl border bg-card">
          {faqs.map((item) => (
            <details key={item.q} className="group px-5 sm:px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-5 font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="pb-5 text-sm text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
