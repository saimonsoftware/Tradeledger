export const DEFAULT_AFTER_LOGIN = "/app/dashboard";

/**
 * Returns `next` only if it is a safe, relative, same-site path. Otherwise the default.
 *
 * Prevents "open redirects": without this, a link like
 * `/login?next=https://evil.example` would forward a freshly logged-in user to an
 * attacker's site (a classic phishing trick).
 */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback: string = DEFAULT_AFTER_LOGIN,
): string {
  if (!next || typeof next !== "string") return fallback;
  // Must be a path on this site: starts with a single "/".
  // "//evil.com" and "/\evil.com" are treated by browsers as other hosts.
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  // Reject control characters (e.g. tabs/newlines that browsers strip from URLs).
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const base = "http://internal.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
