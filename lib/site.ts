// Central place for site-wide constants used by metadata, navigation and the footer.
export const siteConfig = {
  name: "TradeLedger",
  tagline: "Know your edge. Journal every trade.",
  description:
    "TradeLedger is a day trading journal and account tracker. Log every trade, track all of your accounts in one place and see your weekly P&L at a glance.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export const marketingNav = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
] as const;
