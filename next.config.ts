import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// The only external server the browser may talk to: our Supabase project.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();
const supabaseWs = supabaseOrigin.replace(/^https:/, "wss:");

/**
 * Content-Security-Policy: tells the browser which sources it may load code,
 * styles, images and connections from. Anything else is blocked.
 *
 * Trade-off: `script-src 'unsafe-inline'` is needed because Next.js and the theme
 * script use small inline scripts. The strict alternative (per-request nonces)
 * would make EVERY page dynamic, losing the static landing page. XSS risk is kept
 * low elsewhere: React escapes all output and we never render user content as HTML.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Supabase: trade screenshots, shown through short-lived signed links.
  `img-src 'self' blob: data: ${supabaseOrigin}`.trim(),
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs}`.trim(),
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Don't allow any site to embed TradeLedger in a frame (clickjacking protection).
  { key: "X-Frame-Options", value: "DENY" },
  // Don't let the browser guess file types (blocks some content-sniffing attacks).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send only our origin (not full URLs) to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Switch off powerful browser features we never use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // HTTPS only, for two years. Production only (localhost runs over plain HTTP).
  ...(isDev
    ? []
    : [
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ]),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    // Trade screenshots are uploaded through a Server Action. Images are shrunk in
    // the browser first; 4 MB stays under Vercel's 4.5 MB request limit.
    serverActions: { bodySizeLimit: "4mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
