"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/common/form-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { verifyLoginCode } from "@/lib/auth/mfa-actions";
import { useFieldIds } from "@/lib/use-field-ids";

import { CodeInput } from "./code-input";

export function VerifyCodeForm() {
  const f = useFieldIds();
  const next = useSearchParams().get("next") ?? undefined;
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await verifyLoginCode(code, next);
      // On success the action redirects; we only get here on failure.
      if (r && !r.ok) {
        setError(r.error);
        setCode("");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <FormMessage type="error">{error}</FormMessage>}
      <div className="space-y-2">
        <Label htmlFor={f("code")}>Authentication code</Label>
        <CodeInput
          id={f("code")}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          aria-invalid={!!error}
        />
      </div>
      <Button
        type="submit"
        variant="contrast"
        className="h-10 w-full"
        disabled={pending || code.replace(/\s/g, "").length !== 6}
      >
        {pending ? "Verifying…" : "Verify"}
      </Button>
    </form>
  );
}
