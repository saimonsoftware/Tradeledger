"use client";

import { LogOut, Settings, UserRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logOut } from "@/lib/auth/actions";

export function UserMenu({ email }: { email: string }) {
  return (
    <>
      {/* Logging out is a POST to a Server Action (never a GET link), so other
          sites can't log you out just by embedding a URL. */}
      <form id="logout-form" action={logOut} className="hidden" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Account menu">
            <UserRound />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
            {email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/app/settings">
              <Settings /> Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <button type="submit" form="logout-form" className="w-full">
              <LogOut /> Log out
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
