"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { AccountDialog } from "./account-dialog";

export function AddAccountButton({
  label = "Add account",
  size = "sm",
}: {
  label?: string;
  size?: "sm" | "lg";
}) {
  const [open, setOpen] = useState(false);
  return (
    <AccountDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="contrast" size={size} className={size === "sm" ? "h-8" : "h-10 px-4"}>
          <Plus data-icon="inline-start" /> {label}
        </Button>
      }
    />
  );
}
