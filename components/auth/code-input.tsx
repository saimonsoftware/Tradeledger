"use client";

import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** 6-digit authenticator code input. autocomplete="one-time-code" enables phone autofill. */
export function CodeInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9 ]*"
      maxLength={7}
      placeholder="123 456"
      className={cn("h-11 text-center font-mono text-lg tracking-[0.3em] tabular-nums", className)}
      {...props}
    />
  );
}
