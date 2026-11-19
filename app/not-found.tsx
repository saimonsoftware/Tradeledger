import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { StatusPage } from "@/components/common/status-page";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-16 items-center px-4 sm:px-6">
        <Link href="/" aria-label="TradeLedger home" className="rounded-md">
          <Logo />
        </Link>
      </header>
      <main id="main" className="flex flex-1 flex-col">
        <StatusPage
          code="404"
          title="This page doesn't exist"
          body="The link may be broken, or the page may have moved."
          actions={
            <>
              <Button asChild variant="contrast" className="h-10 px-4">
                <Link href="/">Go to the homepage</Link>
              </Button>
              <Button asChild variant="outline" className="h-10 px-4">
                <Link href="/app/dashboard">Open the app</Link>
              </Button>
            </>
          }
        />
      </main>
    </div>
  );
}
