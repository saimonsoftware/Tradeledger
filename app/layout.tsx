import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { LAUNCH_SCRIPT, LaunchSplash } from "@/components/brand/launch-splash";
import { NO_ZOOM_SCRIPT } from "@/components/layout/no-zoom";
import { NavProgress } from "@/components/layout/nav-progress";
import { ThemeProvider } from "@/components/theme-provider";
import { siteConfig } from "@/lib/site";
import "./globals.css";

// `variable` exposes each font as a CSS variable that globals.css plugs into
// Tailwind's `font-sans` / `font-mono` utilities.
const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/** iPhone screens [css width, css height, pixel ratio], portrait. Images in public/splash. */
const SPLASH_SIZES = [
  [440, 956, 3],
  [402, 874, 3],
  [430, 932, 3],
  [393, 852, 3],
  [428, 926, 3],
  [390, 844, 3],
  [375, 812, 3],
  [414, 896, 2],
  [375, 667, 2],
] as const;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name}: Day trading journal & account tracker`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: ["trading journal", "day trading", "trade log", "P&L tracker", "prop firm"],
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: `${siteConfig.name}: ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: "/",
    locale: "en_IE",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name}: ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  // iPhone "Add to Home Screen": open full-screen with our name and icon.
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "default",
    // Start screens shown while the home-screen app loads: plain black (the app's
    // theme), then the animated launch splash takes over. One per iPhone screen size.
    startupImage: SPLASH_SIZES.map(([w, h, r]) => ({
      url: `/splash/splash-${w * r}x${h * r}.png`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
    })),
  },
  formatDetection: { telephone: false },
};

// Matches the browser UI (address bar on mobile) to the active theme.
export const viewport: Viewport = {
  // Use the whole screen (incl. around the notch); safe-area padding keeps content clear.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes adds the theme class to <html>
    // before React loads, which React would otherwise flag as a mismatch.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Decides before the first paint whether to play the launch animation
            (once per tab/app launch). Static script; see launch-splash.tsx. */}
        <script dangerouslySetInnerHTML={{ __html: LAUNCH_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: NO_ZOOM_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <LaunchSplash />
          <NavProgress />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
