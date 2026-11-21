"use client";

import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { logOut } from "@/lib/auth/actions";

/** Round avatar with the first letter of the email. */
function Avatar({ email }: { email: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-linear-to-b from-muted to-background text-xs font-semibold text-foreground uppercase"
    >
      {email.charAt(0) || "?"}
    </span>
  );
}

/** The signed-in user at the bottom of the side panel: Settings and Log out. */
export function SidebarAccount({ email }: { email: string }) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <>
      {/* Log out is a POST to a Server Action (never a GET link). Own form id: the
          top bar's account menu has its own. */}
      <form id="sidebar-logout-form" action={logOut} className="hidden" />
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip={email}
                className="h-12 rounded-xl px-2 data-[state=open]:bg-sidebar-accent"
              >
                <Avatar email={email} />
                <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
                  <span className="truncate text-sm font-medium">{email.split("@")[0]}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{email}</span>
                </span>
                <span className="sr-only">Account options</span>
                <ChevronsUpDown className="ml-auto text-muted-foreground" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={isMobile ? "top" : "right"}
              align="end"
              sideOffset={8}
              className="w-60 rounded-xl"
            >
              <DropdownMenuLabel className="flex items-center gap-2 font-normal">
                <Avatar email={email} />
                <span className="truncate text-xs text-muted-foreground">{email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/app/settings" onClick={() => setOpenMobile(false)}>
                  <Settings /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <button type="submit" form="sidebar-logout-form" className="w-full">
                  <LogOut /> Log out
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
