import Link from "next/link";
import { Suspense } from "react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { requireUser } from "@/lib/auth/dal";

// Reads the session, so it streams in behind <Suspense> (Cache Components rule).
async function CurrentUserMenu() {
  const user = await requireUser();
  return <UserMenu email={user.email} />;
}

// Minimal authenticated shell. The full sidebar/top bar arrives with the app pages.
export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/app/dashboard" aria-label="Dashboard" className="rounded-md">
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Suspense fallback={<div className="size-8" />}>
              <CurrentUserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
