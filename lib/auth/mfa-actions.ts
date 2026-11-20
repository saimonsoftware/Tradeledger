"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePasswordSession, requireUser } from "@/lib/auth/dal";
import { queueIntro } from "@/lib/auth/intro";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { totpCodeSchema } from "@/lib/validation/mfa";

type Result = { ok: true } | { ok: false; error: string };
const GENERIC = "Something went wrong. Please try again.";
const BAD_CODE = "That code didn't work. Check your app and try again.";

/** Login step 2: verify a code and upgrade the session to aal2. */
export async function verifyLoginCode(code: string, next?: string): Promise<Result> {
  await requirePasswordSession();
  const parsed = totpCodeSchema.safeParse(code);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp?.[0];
  if (!totp) return { ok: false, error: GENERIC };

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: totp.id,
    code: parsed.data,
  });
  if (error)
    return {
      ok: false,
      error: error.status === 429 ? "Too many attempts. Please wait a minute." : BAD_CODE,
    };

  await queueIntro();
  redirect(safeRedirectPath(next));
}

/** Settings: start enrolment. Returns the QR code (SVG data URL) and the secret. */
export async function startTotpEnrollment(): Promise<
  { ok: true; factorId: string; qrCode: string; secret: string } | { ok: false; error: string }
> {
  await requireUser();
  const supabase = await createClient();

  // Clear any abandoned, unverified enrolments first (Supabase limits them).
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }
  if ((factors?.totp?.length ?? 0) > 0)
    return { ok: false, error: "Two-factor authentication is already on." };

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
  });
  if (error || !data) return { ok: false, error: GENERIC };
  return { ok: true, factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Settings: confirm enrolment with the first code (also upgrades this session to aal2). */
export async function confirmTotpEnrollment(factorId: string, code: string): Promise<Result> {
  await requireUser();
  if (!z.uuid().safeParse(factorId).success) return { ok: false, error: GENERIC };
  const parsed = totpCodeSchema.safeParse(code);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: parsed.data });
  if (error) return { ok: false, error: BAD_CODE };

  refresh();
  return { ok: true };
}

/** Settings: turn 2FA off. Requires a current code (proves the device is still in hand). */
export async function disableTotp(code: string): Promise<Result> {
  await requireUser(); // already aal2 if 2FA is on
  const parsed = totpCodeSchema.safeParse(code);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const totp = factors?.totp?.[0];
  if (!totp) return { ok: false, error: "Two-factor authentication is already off." };

  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
    factorId: totp.id,
    code: parsed.data,
  });
  if (verifyError) return { ok: false, error: BAD_CODE };

  const { error } = await supabase.auth.mfa.unenroll({ factorId: totp.id });
  if (error) return { ok: false, error: GENERIC };

  // Drop back to a normal session now that 2FA is off.
  await supabase.auth.refreshSession();
  refresh();
  return { ok: true };
}

/** Settings: is 2FA on? */
export async function getTotpStatus(): Promise<{ enabled: boolean }> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  return { enabled: (data?.totp?.length ?? 0) > 0 };
}
