import { cacheLife } from "next/cache";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { siteConfig } from "@/lib/site";

// With Cache Components, reading the current date during prerender must happen
// inside a cached scope. The year is computed once and refreshed daily.
async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

const columns = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#security", label: "Security" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/signup", label: "Sign up" },
      { href: "/login", label: "Log in" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl grid-cols-3 gap-x-6 gap-y-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="col-span-3 max-w-xs md:col-span-1">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">{siteConfig.tagline}</p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
              {col.title}
            </h2>
            <ul className="mt-2 text-sm">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block py-2 text-foreground/80 transition-colors hover:text-foreground md:py-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          © <CopyrightYear /> {siteConfig.name}. Trading involves risk. TradeLedger is a journaling
          tool and does not provide financial advice.
        </p>
      </div>
    </footer>
  );
}
