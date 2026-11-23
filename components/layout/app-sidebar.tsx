"use client";

import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  LineChart,
  NotebookTabs,
  MessagesSquare,
  Settings,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { LogoMark } from "@/components/brand/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/trades", label: "Trades", icon: BookOpen },
      { href: "/app/analytics", label: "Analytics", icon: LineChart },
      { href: "/app/accounts", label: "Accounts", icon: Wallet },
    ],
  },
  {
    label: "Coach",
    items: [
      { href: "/app/coach", label: "AI Coach", icon: Sparkles },
      { href: "/app/chat", label: "Coach chat", icon: MessagesSquare },
      { href: "/app/playbook", label: "Playbook", icon: NotebookTabs },
    ],
  },
];

const SOON: NavItem[] = [{ href: "#", label: "Calendar", icon: CalendarDays }];

/**
 * Nav item look: taller, rounder rows; the current page gets a raised surface and a
 * glowing marker on its left edge (`nav-item` in globals.css).
 */
const ITEM = "nav-item h-9 rounded-xl px-2.5 text-sidebar-foreground/70";
const LABEL = "h-7 px-2.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase";

/** Main nav + settings. Reads the URL (for the active highlight), so it's
 *  rendered inside <Suspense> with an un-highlighted fallback. */
function NavGroups({ pathname }: { pathname: string | null }) {
  const { setOpenMobile } = useSidebar();
  const isActive = (href: string) =>
    !!pathname && (pathname === href || pathname.startsWith(href + "/"));
  // On phones the sidebar is a drawer: close it after choosing a page.
  const close = () => setOpenMobile(false);

  return (
    <SidebarContent className="gap-1 pt-1">
      {SECTIONS.map((section) => (
        <SidebarGroup key={section.label} className="py-1.5">
          <SidebarGroupLabel className={LABEL}>{section.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {section.items.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(href)}
                    tooltip={label}
                    className={ITEM}
                  >
                    <Link
                      href={href}
                      onClick={close}
                      aria-current={isActive(href) ? "page" : undefined}
                    >
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}

      <SidebarGroup className="py-1.5">
        <SidebarGroupLabel className={LABEL}>Coming soon</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-0.5">
            {SOON.map(({ label, icon: Icon }) => (
              <SidebarMenuItem key={label}>
                <SidebarMenuButton
                  aria-disabled="true"
                  tooltip={`${label} (coming soon)`}
                  className={cn(ITEM, "cursor-not-allowed opacity-45 hover:bg-transparent")}
                >
                  <Icon />
                  <span>{label}</span>
                </SidebarMenuButton>
                <SidebarMenuBadge className="top-2! right-2 rounded-full border px-1.5 text-[10px] font-medium text-muted-foreground">
                  Soon
                </SidebarMenuBadge>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="mt-auto py-1.5">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive("/app/settings")}
                tooltip="Settings"
                className={ITEM}
              >
                <Link
                  href="/app/settings"
                  onClick={close}
                  aria-current={isActive("/app/settings") ? "page" : undefined}
                >
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}

function ActiveNavGroups() {
  return <NavGroups pathname={usePathname()} />;
}

/** `account`: the signed-in user's card (server-rendered by the app layout). */
export function AppSidebar({ account }: { account: ReactNode }) {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      {/* <nav> landmark: lets screen-reader users jump straight to the app navigation. */}
      <nav aria-label="App" className="flex min-h-0 flex-1 flex-col">
        <SidebarHeader className="px-2 pt-3 pb-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="lg"
                tooltip="TradeLedger"
                className="h-11 rounded-xl px-2 group-data-[collapsible=icon]:p-0! hover:bg-transparent [&_svg]:size-8"
              >
                <Link href="/app/dashboard" onClick={() => setOpenMobile(false)}>
                  <span className="nav-logo-glow shrink-0 rounded-[9px]">
                    <LogoMark className="size-8" />
                  </span>
                  <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:sr-only">
                    <span className="font-semibold tracking-tight">TradeLedger</span>
                    <span className="text-[11px] text-muted-foreground">Trading journal</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <Suspense fallback={<NavGroups pathname={null} />}>
          <ActiveNavGroups />
        </Suspense>
      </nav>
      <SidebarFooter className="border-t border-sidebar-border p-2">{account}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
