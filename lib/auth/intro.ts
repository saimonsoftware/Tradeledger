import "server-only";

import { cookies } from "next/headers";

/**
 * "Play the intro" marker, set when a login completes. The launch splash then plays
 * once as the app opens (components/brand/launch-splash.tsx), and clears the marker.
 * Not sensitive: it only controls an animation, so it's readable by the page's script.
 */
export const INTRO_COOKIE = "tl-intro";

export async function queueIntro() {
  (await cookies()).set(INTRO_COOKIE, "1", {
    path: "/",
    maxAge: 300, // long enough to type a 2FA code
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  });
}
