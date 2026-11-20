import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { queueIntro } from "@/lib/auth/intro";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

// Email links (sign-up confirmation, password reset) land here.
// Two formats are supported:
//   ?token_hash=...&type=...  works on any device (recommended email templates)
//   ?code=...                 PKCE flow, only works in the browser that asked for the email
const ALLOWED_TYPES: EmailOtpType[] = ["email", "signup", "recovery", "email_change"];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeRedirectPath(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(new URL("/login?error=link", origin));
  }
  // A password-reset link must always go to the reset form.
  const destination = type === "recovery" ? "/reset-password" : next;
  // Signed in by a confirmation link: play the launch intro as the app opens.
  if (type !== "recovery") await queueIntro();
  return NextResponse.redirect(new URL(destination, origin));
}
