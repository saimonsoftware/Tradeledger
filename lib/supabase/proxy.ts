import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

import type { Database } from "./database.types";

// Pages only logged-OUT visitors should see. Logged-in users are sent to the app.
// (/reset-password is deliberately excluded: the reset link signs the user in.)
const GUEST_ONLY = ["/login", "/signup", "/forgot-password"];

/**
 * Runs before every matched request (see /proxy.ts):
 *  1. Refreshes the Supabase session cookie if the access token is about to expire.
 *  2. Optimistic route protection: logged-out visitors can't reach /app/*.
 *
 * This is the first line of defence only. Every page, Server Action and Route
 * Handler checks auth again on its own (see lib/auth/dal.ts), because proxy
 * coverage can silently change if the matcher or routes change.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Make refreshed cookies visible to the page rendering this request...
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          // ...and send them back to the browser.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Cache-Control: private, no-store, so no CDN ever caches one user's cookie.
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // IMPORTANT: no code between createServerClient and this call.
  // getClaims() verifies the access token's signature (it never trusts the cookie
  // blindly like getSession() would) and triggers a refresh when needed.
  const { data } = await supabase.auth.getClaims();
  let isLoggedIn = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;
  const isAppRoute = pathname === "/app" || pathname.startsWith("/app/");

  // A token can still be validly signed after its session was revoked ("sign out
  // everywhere", password change). On pages where it matters, confirm the session
  // still exists; if not, clear this browser's cookies and treat it as logged out.
  if (isLoggedIn && (isAppRoute || GUEST_ONLY.includes(pathname))) {
    const { data: active } = await supabase.rpc("session_is_active");
    if (active === false) {
      await supabase.auth.signOut({ scope: "local" }); // clears the auth cookies via setAll
      isLoggedIn = false;
    }
  }

  // 2FA: password entered but not the code yet → the code step (for app pages).
  if (isLoggedIn && isAppRoute) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
      const url = request.nextUrl.clone();
      url.pathname = "/login/verify";
      url.search = "";
      url.searchParams.set("next", pathname + search);
      return redirectWithCookies(url, response);
    }
  }

  if (!isLoggedIn && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return redirectWithCookies(url, response);
  }

  if (isLoggedIn && GUEST_ONLY.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/dashboard";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

// Keep any refreshed session cookies (and no-cache headers) when redirecting.
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  from.headers.forEach((value, key) => {
    if (/^(cache-control|expires|pragma)$/i.test(key)) redirect.headers.set(key, value);
  });
  return redirect;
}
