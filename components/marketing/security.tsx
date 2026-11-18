import { Cookie, Database, KeyRound, LockKeyhole, MailCheck } from "lucide-react";

import { SectionHeading } from "./section-heading";

const points = [
  {
    Icon: Database,
    title: "Isolated at the database level",
    body: "Every record is tied to your account, and the database itself refuses to show it to anyone else, even if the app had a bug.",
  },
  {
    Icon: LockKeyhole,
    title: "Encrypted in transit",
    body: "All traffic between your browser and TradeLedger travels over HTTPS.",
  },
  {
    Icon: Cookie,
    title: "Secure sessions",
    body: "You stay signed in with secure, http-only cookies that page scripts can't read.",
  },
  {
    Icon: MailCheck,
    title: "Verified sign-ups",
    body: "Email verification and a 12-character minimum password protect every account.",
  },
  {
    Icon: KeyRound,
    title: "No broker logins needed",
    body: "You enter trades yourself. We never ask for your broker or prop firm password.",
  },
];

export function Security() {
  return (
    <section
      id="security"
      aria-labelledby="security-title"
      className="scroll-mt-20 border-t py-20 sm:py-28"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            id="security-title"
            align="left"
            eyebrow="Security"
            title="Your trades are yours alone."
            description="A trading journal holds sensitive information: your accounts, balances and every decision you make. TradeLedger is built so that only you can ever see it."
          />
        </div>

        <ul className="divide-y rounded-2xl border bg-card">
          {points.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-4 p-5 sm:p-6">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-profit-muted text-profit">
                <Icon className="size-4.5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
