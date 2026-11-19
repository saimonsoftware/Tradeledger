"use client";

import { ShieldCheck, ShieldOff } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { CodeInput } from "@/components/auth/code-input";
import { FormMessage } from "@/components/common/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { confirmTotpEnrollment, disableTotp, startTotpEnrollment } from "@/lib/auth/mfa-actions";
import { useFieldIds } from "@/lib/use-field-ids";

type Enrollment = { factorId: string; qrCode: string; secret: string };

export function TwoFactor({ enabled }: { enabled: boolean }) {
  const f = useFieldIds();
  const [mode, setMode] = useState<"idle" | "enable" | "disable">("idle");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    setMode("idle");
    setEnrollment(null);
    setCode("");
    setError(null);
  };

  const begin = () =>
    startTransition(async () => {
      setError(null);
      const r = await startTotpEnrollment();
      if (!r.ok) return void toast.error(r.error);
      setEnrollment(r);
      setMode("enable");
    });

  const confirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment) return;
    startTransition(async () => {
      const r = await confirmTotpEnrollment(enrollment.factorId, code);
      if (!r.ok) {
        setError(r.error);
        setCode("");
        return;
      }
      close();
      toast.success("Two-factor authentication is on");
    });
  };

  const turnOff = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const r = await disableTotp(code);
      if (!r.ok) {
        setError(r.error);
        setCode("");
        return;
      }
      close();
      toast.success("Two-factor authentication is off");
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-sm">
          {enabled ? (
            <>
              <ShieldCheck className="size-4 text-profit" aria-hidden="true" />
              <span>
                <span className="font-medium">On.</span> A code from your authenticator app is
                required at login.
              </span>
            </>
          ) : (
            <>
              <ShieldOff className="size-4 text-muted-foreground" aria-hidden="true" />
              <span>
                <span className="font-medium">Off.</span> Add a second step to your login with an
                authenticator app.
              </span>
            </>
          )}
        </p>
        {enabled ? (
          <Button variant="outline" size="sm" className="h-8" onClick={() => setMode("disable")}>
            Turn off
          </Button>
        ) : (
          <Button variant="contrast" size="sm" className="h-8" onClick={begin} disabled={pending}>
            {pending ? "Starting…" : "Turn on"}
          </Button>
        )}
      </div>

      <Dialog open={mode !== "idle"} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          {mode === "enable" && enrollment && (
            <form onSubmit={confirm} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Set up two-factor authentication</DialogTitle>
                <DialogDescription>
                  Scan this QR code with an authenticator app (Google Authenticator, 1Password,
                  Authy…), then enter the 6-digit code it shows.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center rounded-xl bg-white p-4">
                {/* Supabase returns the QR code as an SVG data URL (allowed by our CSP's img-src data:). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={enrollment.qrCode}
                  alt="QR code for your authenticator app"
                  className="size-44"
                />
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Can&apos;t scan it?
                </summary>
                <p className="mt-2 text-muted-foreground">Enter this key in your app instead:</p>
                <code className="mt-1 block rounded-md bg-muted px-2 py-1.5 font-mono text-xs break-all select-all">
                  {enrollment.secret}
                </code>
              </details>
              {error && <FormMessage type="error">{error}</FormMessage>}
              <div className="space-y-2">
                <Label htmlFor={f("enroll-code")}>6-digit code</Label>
                <CodeInput
                  id={f("enroll-code")}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                variant="contrast"
                className="h-10 w-full"
                disabled={pending || code.replace(/\s/g, "").length !== 6}
              >
                {pending ? "Verifying…" : "Turn on two-factor"}
              </Button>
            </form>
          )}
          {mode === "disable" && (
            <form onSubmit={turnOff} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Turn off two-factor authentication?</DialogTitle>
                <DialogDescription>
                  Enter a current code from your authenticator app to confirm. Your account will
                  then be protected by your password only.
                </DialogDescription>
              </DialogHeader>
              {error && <FormMessage type="error">{error}</FormMessage>}
              <div className="space-y-2">
                <Label htmlFor={f("disable-code")}>6-digit code</Label>
                <CodeInput
                  id={f("disable-code")}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                variant="destructive"
                className="h-10 w-full"
                disabled={pending || code.replace(/\s/g, "").length !== 6}
              >
                {pending ? "Turning off…" : "Turn off two-factor"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
