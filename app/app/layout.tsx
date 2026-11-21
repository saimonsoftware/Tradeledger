import { Suspense } from "react";

import { PostLoginIntro } from "@/components/brand/post-login-intro";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { EdgeSwipe } from "@/components/layout/edge-swipe";
import { SidebarAccount } from "@/components/layout/sidebar-account";
import { TopBar } from "@/components/layout/top-bar";
import { UserMenu } from "@/components/layout/user-menu";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireUser } from "@/lib/auth/dal";

// Reads the session, so it streams in behind <Suspense> (Cache Components rule).
async function CurrentUserMenu() {
  const user = await requireUser();
  return <UserMenu email={user.email} />;
}

async function CurrentSidebarAccount() {
  const user = await requireUser();
  return <SidebarAccount email={user.email} />;
}

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <TooltipProvider>
      <PostLoginIntro />
      <SidebarProvider>
        <AppSidebar
          account={
            <Suspense fallback={<div className="h-12 skeleton-shimmer rounded-xl" />}>
              <CurrentSidebarAccount />
            </Suspense>
          }
        />
        {/* Swipe from the left edge opens the sidebar instead of going back a page. */}
        <EdgeSwipe />
        <SidebarInset className="min-w-0">
          <TopBar
            userMenu={
              <Suspense fallback={<div className="size-8" />}>
                <CurrentUserMenu />
              </Suspense>
            }
          />
          {/* min-w-0: lets wide content (e.g. the trades table) scroll inside its card instead of stretching the page. */}
          <div
            id="app-content"
            className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8"
          >
            {children}
          </div>
        </SidebarInset>
        <Toaster position="bottom-right" />
      </SidebarProvider>
    </TooltipProvider>
  );
}
