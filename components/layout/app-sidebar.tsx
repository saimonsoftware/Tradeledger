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
import { Suspense } from "react";

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

type NavItem = { href: string; label: string; icon: LucideIcon };

const MAIN: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/trades", label: "Trades", icon: BookOpen },
  { href: "/app/coach", label: "AI Coach", icon: Sparkles },
  { href: "/app/chat", label: "Coach chat", icon: MessagesSquare },
  { href: "/app/playbook", label: "Playbook", icon: NotebookTabs },
  { href: "/app/accounts", label: "Accounts", icon: Wallet },
];

const SOON: NavItem[] = [
  { href: "#", label: "Analytics", icon: LineChart },
  { href: "#", label: "Calendar", icon: CalendarDays },
];

/** Main nav + settings. Reads the URL (for the active highlight), so it's
 *  rendered inside <Suspense> with an un-highlighted fallback. */
function NavGroups({ pathname }: { pathname: string | null }) {
  const { setOpenMobile } = useSidebar();
  const isActive = (href: string) =>
    !!pathname && (pathname === href || pathname.startsWith(href + "/"));
  // On phones the sidebar is a drawer: close it after choosing a page.
  const close = () => setOpenMobile(false);

  return (
    <>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Journal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive(href)} tooltip={label}>
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

        <SidebarGroup>
          <SidebarGroupLabel>Coming soon</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SOON.map(({ label, icon: Icon }) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton
                    aria-disabled="true"
                    tooltip={`${label} (coming soon)`}
                    className="cursor-not-allowed opacity-50 hover:bg-transparent"
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="text-[10px] text-muted-foreground">
                    Soon
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/app/settings")} tooltip="Settings">
              <Link href="/app/settings" onClick={close}>
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}

function ActiveNavGroups() {
  return <NavGroups pathname={usePathname()} />;
}

export function AppSidebar() {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      {/* <nav> landmark: lets screen-reader users jump straight to the app navigation. */}
      <nav aria-label="App" className="flex min-h-0 flex-1 flex-col">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" tooltip="TradeLedger">
                <Link href="/app/dashboard" onClick={() => setOpenMobile(false)}>
                  <LogoMark className="size-7" />
                  <span className="font-semibold tracking-tight">TradeLedger</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <Suspense fallback={<NavGroups pathname={null} />}>
          <ActiveNavGroups />
        </Suspense>
      </nav>
      <SidebarRail />
    </Sidebar>
  );
}
