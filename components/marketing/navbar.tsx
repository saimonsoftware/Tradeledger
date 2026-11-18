import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { marketingNav } from "@/lib/site";

import { MobileNav } from "./mobile-nav";

// TODO(Phase 2): when the visitor is logged in, swap "Log in / Sign up" for
// "Go to dashboard". Done client-side so this page can stay statically rendered.
export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="TradeLedger home" className="rounded-md">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1 text-sm">
            {marketingNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="lg" className="hidden md:inline-flex">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="lg" variant="contrast" className="px-3.5">
            <Link href="/signup">Sign up</Link>
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
