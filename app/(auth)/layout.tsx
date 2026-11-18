import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate flex flex-1 flex-col">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid opacity-60" />
      <header className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="TradeLedger home" className="rounded-md">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}
