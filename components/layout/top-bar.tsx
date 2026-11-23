"use client";

import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { QuickAddTrade } from "@/components/trades/quick-add-trade";
import { SidebarTrigger } from "@/components/ui/sidebar";

const TITLES: [prefix: string, title: string][] = [
  ["/app/dashboard", "Dashboard"],
  ["/app/accounts", "Accounts"],
  ["/app/trades", "Trades"],
  ["/app/analytics", "Analytics"],
  ["/app/coach", "AI Coach"],
  ["/app/chat", "Coach chat"],
  ["/app/playbook", "Playbook"],
  ["/app/settings", "Settings"],
];

/** Reads the URL, so it renders inside <Suspense> (Cache Components rule). */
function PageTitle() {
  const pathname = usePathname();
  const title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? "TradeLedger";
  return <p className="truncate text-sm font-medium">{title}</p>;
}

export function TopBar({ userMenu }: { userMenu: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-xl sm:px-4">
      <SidebarTrigger aria-label="Toggle sidebar" />
      <div aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
      <Suspense fallback={<span className="h-4 w-20" />}>
        <PageTitle />
      </Suspense>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <QuickAddTrade />
        <ThemeToggle />
        {userMenu}
      </div>
    </header>
  );
}
