# CLAUDE.md — Day Trading Journal & Account Tracker

> **How to use this file:** Save it as `CLAUDE.md` in the root of an empty project folder, open that folder in your terminal, and run `claude`. Claude Code reads this file automatically at the start of every session. Then paste the **Kickoff Prompt** (bottom of this file) to begin Phase 0.

---

## 1. Project Overview

We are building a **web-based day trading journal and account tracking platform** (working name: **TradeLedger**, which can be renamed later). Traders use it to:

- See all of their trading accounts in one dashboard (balances, weekly profit/loss)
- Log every trade they take, with entry/exit, size, fees, notes and strategy
- Review performance over time (later phases: analytics, calendar, broker sync)

This document covers **Release 1**: Landing page, Authentication, Dashboard, Trade Logging, and Dark/Light mode. Later phases are listed at the end so architecture decisions don't block them.

### About the developer (important for how you work)

- The owner is **learning full-stack development** and is early in that journey. **Explain what you're doing and why** in plain language as you build, especially for security, database and auth decisions.
- Work in **small, reviewable steps**. After each milestone, stop, summarise what was built, list how to test it manually, and wait for approval before continuing.
- Prefer **well-known, well-documented tools** over clever or obscure ones.
- Development machine: **MacBook + VS Code**.

---

## 2. Tech Stack (use exactly this unless you ask first)

| Layer           | Choice                                                             | Why                                                                                                                   |
| --------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Framework       | **Next.js (latest stable, App Router) + TypeScript (strict mode)** | Full-stack in one project, huge ecosystem                                                                             |
| Styling         | **Tailwind CSS** + **shadcn/ui** components                        | Fast, consistent, modern UI                                                                                           |
| Theming         | **next-themes**                                                    | Dark/light/system mode with no flash on load                                                                          |
| Auth + Database | **Supabase** (Postgres + Supabase Auth) via **@supabase/ssr**      | Secure email/password auth, cookie sessions, **Row Level Security** to isolate each user's data at the database level |
| Validation      | **Zod** (shared client + server schemas)                           | Never trust input                                                                                                     |
| Forms           | **react-hook-form** + Zod resolver                                 |                                                                                                                       |
| Charts          | **Recharts**                                                       | Equity curve / P&L charts                                                                                             |
| Dates           | **date-fns** + **date-fns-tz**                                     | Week boundaries and timezones                                                                                         |
| Icons           | **lucide-react**                                                   |                                                                                                                       |
| Testing         | **Vitest** (unit), **Playwright** (end-to-end)                     |                                                                                                                       |
| Linting         | ESLint + Prettier                                                  |                                                                                                                       |
| Hosting         | **Vercel** (app) + **Supabase Cloud** (DB/Auth)                    |                                                                                                                       |

**Package manager:** `npm`.

---

## 3. Non-Negotiable Rules

### 3.1 Security rules (highest priority)

These rules override everything else. If a feature request conflicts with them, stop and flag it.

1. **Every table holding user data has a `user_id uuid` column referencing `auth.users(id)` and Row Level Security (RLS) ENABLED**, with policies restricting `SELECT / INSERT / UPDATE / DELETE` to `auth.uid() = user_id`. No exceptions.
2. **Never use the Supabase `service_role` key in the browser** or in any file that ships to the client. It must not be needed for Release 1 at all. If you think it is, ask first.
3. **Never trust `user_id` from the client.** On insert, set it server-side from the authenticated session (or with a DB default of `auth.uid()`), and RLS `WITH CHECK` must enforce it.
4. **Sessions are stored in secure, httpOnly cookies** using `@supabase/ssr`. Never store tokens in `localStorage`.
5. **Use `supabase.auth.getUser()` (not `getSession()`) on the server** when making authorization decisions, because it re-validates the token with Supabase.
6. **Protect all `/app/*` routes in Next.js proxy (`proxy.ts`, formerly called middleware)**: unauthenticated users are redirected to `/login`. Also check auth again inside every Server Action and Route Handler (proxy alone is not enough).
7. **Validate every input with Zod on the server** (Server Actions / Route Handlers), even if it was validated on the client.
8. **Secrets live in `.env.local` only**, and `.env*` is in `.gitignore`. Provide a `.env.example` with placeholder values.
9. **Generic error messages for auth:** login failures say "Invalid email or password". Never reveal whether an email exists. Signup and password reset show the same neutral "If that email is valid, check your inbox" message.
10. **Security headers** in `next.config`: Content-Security-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and HSTS in production.
11. **No `dangerouslySetInnerHTML`** with user content. Trade notes are rendered as plain text.
12. **Write an automated test that proves data isolation**: create User A and User B, have A create an account and a trade, then confirm B cannot read, update or delete them, both via the app and via direct Supabase queries with B's session.

### 3.2 Code quality rules

- TypeScript `strict: true`. No `any` unless justified in a comment.
- Generate DB types with `supabase gen types typescript` and use them.
- Money and prices are **never** JavaScript floats in the database. Use Postgres `numeric`. Convert carefully in the UI.
- Keep components small. Server Components by default; `"use client"` only where interactivity is needed.
- All database changes go through **Supabase migration files** in `supabase/migrations/`, never ad-hoc dashboard edits.
- Commit after each working milestone with a clear message.

---

## 4. Design System

### 4.1 Overall feel

Modern, dark, premium fintech. Think clean trading terminal meets a polished SaaS product. Calm, data-dense but uncluttered. **Dark mode is the default**; light mode must look equally intentional, not an afterthought.

### 4.2 Theme

- Implement with `next-themes` using the `class` strategy, `defaultTheme="dark"`, and `enableSystem`.
- A **theme toggle** (sun/moon icon, with Light / Dark / System options) appears in the landing page navbar **and** the app top bar.
- Define all colours as CSS variables (shadcn convention) so both themes come from one token set.
- Semantic colours:
  - **Profit / positive:** green (e.g. emerald)
  - **Loss / negative:** red (e.g. rose)
  - **Neutral / breakeven:** muted grey
  - **Accent / brand:** one confident accent (e.g. electric blue or violet). Pick one and use it consistently.
- Never rely on colour alone for profit vs loss: also show `+` / `−` signs and/or arrow icons (accessibility).

### 4.3 Typography and numbers

- Clean sans-serif (e.g. Inter or Geist).
- **All numbers use tabular figures** (`font-variant-numeric: tabular-nums`) so columns line up.
- Currency formatted with `Intl.NumberFormat` using the account's currency.

### 4.4 Responsiveness & accessibility

- Fully responsive: mobile, tablet, desktop.
- WCAG AA contrast in both themes. Keyboard navigable. Visible focus rings. Labels on all inputs.

---

## 5. Release 1 Features

### 5.1 Landing Page (`/`)

A public, dark, modern marketing page.

**Sections (in order):**

1. **Navbar:** logo/name, links (Features, How it works, FAQ), theme toggle, **Log in** button (→ `/login`) and **Sign up** button (→ `/signup`, primary style).
2. **Hero:** strong headline (e.g. "Know your edge. Journal every trade."), one-sentence subheadline, primary CTA "Get started free" (→ `/signup`), secondary CTA "Log in". Include a stylised dashboard preview (a mock screenshot built with real components or a styled illustration; no stock photos).
3. **Value / Benefits:** 3–6 cards, for example:
   - All your accounts in one place
   - Log trades in seconds
   - See your weekly P&L at a glance
   - Find what's working: track setups and strategies
   - Build discipline with notes and reviews
   - Bank-grade security: your data is private to you
4. **How it works:** 3 steps (Create account → Add your trading accounts → Log trades & review).
5. **Security section:** briefly explain that data is private and isolated per user.
6. **FAQ:** 4–6 questions.
7. **Final CTA band** + **Footer** (links, © year, placeholder Privacy/Terms pages).

**Requirements:** Fast (static rendering), good SEO metadata, Open Graph tags, subtle tasteful animations only (no heavy libraries needed). If a logged-in user visits `/`, show "Go to dashboard" in the navbar instead of Log in / Sign up.

### 5.2 Authentication (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`)

**Sign up**

- Fields: email, password, confirm password. Optional: display name.
- Password policy: **minimum 12 characters**, with a live strength meter. Enforce the same policy server-side and in Supabase Auth settings.
- **Email verification is required** before the user can access the app. After signup, show a "Check your email" screen.
- After verification, the user lands on `/app/dashboard` and a `profiles` row is auto-created (via a DB trigger on `auth.users`).

**Log in**

- Email + password. Generic error on failure.
- "Forgot password?" link.
- Redirect to the originally requested page after login (validate the redirect is a relative internal path to prevent open redirects).

**Password reset**

- Request reset by email → link → `/reset-password` form → updates password → signs out other sessions where possible.

**Log out**

- Available from the app's user menu. Clears the session cookie server-side.

**Security hardening checklist (do all of these and explain each one):**

- [ ] Email confirmation ON in Supabase Auth
- [ ] Minimum password length 12 in Supabase Auth settings
- [ ] Leaked-password protection ON (if available on the Supabase plan)
- [ ] Supabase Auth rate limits reviewed; add CAPTCHA (Cloudflare Turnstile or hCaptcha, both supported by Supabase) on signup, login and password reset
- [ ] Site URL and Redirect URLs allow-listed in Supabase (localhost + production domain only)
- [ ] Optional **two-factor authentication (TOTP authenticator app)** available in Settings. Build this as the final step of Phase 2 if time allows; otherwise list it as the first task of the next phase
- [ ] Middleware protects `/app/*`; auth pages redirect to the dashboard if already logged in
- [ ] RLS isolation test (rule 3.1.12) passes

### 5.3 App Shell (`/app/*`)

- **Sidebar** (collapsible; becomes a drawer on mobile): Dashboard, Trades, Accounts, Settings. Placeholders (disabled, "Coming soon"): Analytics, Calendar, Playbook.
- **Top bar:** page title, "+ Log trade" quick button, theme toggle, user menu (email, Settings, Log out).

### 5.4 Trading Accounts (`/app/accounts`)

For Release 1, accounts are **added manually** (broker API connection is a later phase, so design the schema so it can be added).

- Create / edit / archive a trading account with:
  - Name (e.g. "FTMO 100k Challenge", "IBKR Main")
  - Broker / prop firm (free text)
  - Account type: `live` | `demo` | `prop_challenge` | `prop_funded`
  - Currency (EUR, USD, GBP…; default EUR)
  - Starting balance
  - Start date
- Record **deposits and withdrawals** (account transactions) so the balance stays accurate.
- **Current balance = starting balance + deposits − withdrawals + sum of net P&L of closed trades.** Compute this in the database (a SQL view or function) so the logic lives in one place.

### 5.5 Dashboard (`/app/dashboard`)

Show at a glance:

1. **Summary cards (top row):**
   - Total balance across all active accounts (if accounts use different currencies, group totals by currency; do not convert in Release 1)
   - **This week's P&L** (net, after fees), in amount and %
   - This week's win rate (wins / closed trades)
   - Number of trades this week
2. **Accounts grid:** one card per active account showing name, broker, type badge, current balance, this week's P&L (green/red), and a mini sparkline of balance over the last 30 days.
3. **Weekly P&L chart:** bar chart of daily net P&L for the current week (Mon–Sun), with the option to switch to the previous week.
4. **Recent trades table:** last 10 trades with symbol, side, account, date, net P&L. Each row links to the trade detail.
5. **Empty states:** if the user has no accounts, show a friendly onboarding card: "Add your first trading account" → button. If they have accounts but no trades: "Log your first trade".

**Week definition:** Monday 00:00 to Sunday 23:59:59 **in the user's timezone** (stored on their profile, defaulting to the browser timezone detected at signup, e.g. `Europe/Dublin`). P&L belongs to the week in which the trade was **closed** (`exit_time`).

### 5.6 Trade Logging (`/app/trades`, `/app/trades/new`, `/app/trades/[id]`)

**Trade form fields:**

| Field               | Type               | Required | Notes                                            |
| ------------------- | ------------------ | -------- | ------------------------------------------------ |
| Account             | select             | ✅       | Only the user's active accounts                  |
| Symbol              | text               | ✅       | Uppercased (e.g. `AAPL`, `EURUSD`, `NQ`)         |
| Asset class         | select             | ✅       | stock, option, future, forex, crypto, cfd, other |
| Direction           | toggle             | ✅       | Long / Short                                     |
| Status              | auto               |          | `open` if no exit, else `closed`                 |
| Entry date & time   | datetime           | ✅       |                                                  |
| Entry price         | number             | ✅       | > 0                                              |
| Quantity / size     | number             | ✅       | > 0 (shares, contracts, lots, units)             |
| Contract multiplier | number             |          | Default 1 (e.g. futures point value)             |
| Exit date & time    | datetime           |          | Must be ≥ entry time                             |
| Exit price          | number             |          | Required if exit time is set                     |
| Fees / commissions  | number             |          | Default 0, ≥ 0                                   |
| Stop loss           | number             |          | Used for R-multiple                              |
| Take profit         | number             |          |                                                  |
| Strategy / setup    | text + suggestions |          | e.g. "ORB", "VWAP reclaim"                       |
| Tags                | multi-text         |          | e.g. "A+ setup", "FOMO", "revenge"               |
| Notes               | textarea           |          | Plain text, max 5,000 chars                      |
| Rating              | 1–5                |          | Self-rated execution quality                     |

**Calculations (compute server-side / in the DB, show live preview in the form):**

- Gross P&L (long) = `(exit − entry) × quantity × multiplier`
- Gross P&L (short) = `(entry − exit) × quantity × multiplier`
- Net P&L = `gross − fees`
- R-multiple (if stop loss set) = `net P&L ÷ (|entry − stop| × quantity × multiplier)`
- Result = win (net > 0), loss (net < 0), breakeven (net = 0)

**Trades list page:**

- Table with sorting and filters: date range, account, symbol, direction, status, result, strategy.
- Pagination (server-side).
- Totals row for the filtered set: number of trades, net P&L, win rate.
- Row actions: view, edit, delete (with confirmation dialog).

**Trade detail page:** all fields, computed metrics, notes, edit/delete buttons.

**Quick add:** the "+ Log trade" button in the top bar opens the form in a slide-over sheet from anywhere in the app.

### 5.7 Settings (`/app/settings`)

- Profile: display name, timezone, default currency.
- Appearance: theme (Light / Dark / System).
- Security: change password, (TOTP 2FA if built), sign out of all sessions.
- Danger zone: delete account (requires typing "DELETE" and re-entering password; deletes all of the user's data).

---

## 6. Database Schema (Supabase / Postgres)

Create via migrations. All tables: `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz default now()` (with update trigger), and **RLS enabled**.

```
profiles
  id uuid PK = auth.users.id (on delete cascade)
  display_name text
  timezone text not null default 'UTC'
  default_currency text not null default 'EUR'

trading_accounts
  user_id uuid not null default auth.uid() → auth.users (cascade)
  name text not null
  broker text
  account_type text check in ('live','demo','prop_challenge','prop_funded')
  currency char(3) not null
  starting_balance numeric(18,2) not null
  start_date date not null
  is_archived boolean default false
  external_provider text null      -- reserved for future broker sync
  external_account_id text null    -- reserved for future broker sync

account_transactions
  user_id uuid not null default auth.uid()
  account_id uuid → trading_accounts (cascade)
  type text check in ('deposit','withdrawal')
  amount numeric(18,2) not null check (amount > 0)
  occurred_at timestamptz not null
  note text

trades
  user_id uuid not null default auth.uid()
  account_id uuid → trading_accounts (cascade)
  symbol text not null
  asset_class text not null
  direction text check in ('long','short')
  entry_time timestamptz not null
  entry_price numeric(18,8) not null
  quantity numeric(18,8) not null
  multiplier numeric(18,8) not null default 1
  exit_time timestamptz
  exit_price numeric(18,8)
  fees numeric(18,2) not null default 0
  stop_loss numeric(18,8)
  take_profit numeric(18,8)
  strategy text
  tags text[] default '{}'
  notes text
  rating smallint check between 1 and 5
  gross_pnl numeric(18,2) generated/computed
  net_pnl numeric(18,2) generated/computed
  status text generated ('open' | 'closed')
```

**Also create:**

- Indexes on `(user_id, exit_time)`, `(user_id, account_id)`, `(account_id)`.
- A view/function `account_balances` returning current balance per account (must respect RLS, e.g. use `security_invoker = true` on views).
- A trigger that creates a `profiles` row when a new `auth.users` row is inserted.
- An RLS check that `trades.account_id` and `account_transactions.account_id` belong to the same `user_id` (users can't attach trades to someone else's account).
- `supabase/seed.sql` with realistic demo data for local development only.

---

## 7. Project Structure

```
/app
  /(marketing)/page.tsx           → landing page
  /(auth)/login, /signup, /forgot-password, /reset-password
  /auth/callback/route.ts
  /app/layout.tsx                 → authenticated shell
  /app/dashboard, /app/trades, /app/accounts, /app/settings
/components
  /ui                             → shadcn components
  /marketing, /dashboard, /trades, /accounts, /layout
/lib
  /supabase/client.ts, server.ts, middleware.ts
  /validation                     → Zod schemas
  /calculations                   → P&L, R-multiple, week ranges (pure, unit-tested)
  /format                         → currency/number/date formatting
/supabase
  /migrations
  seed.sql
/tests
  /unit, /e2e
proxy.ts                          → Next 16 name for middleware
.env.example
```

---

## 8. Build Phases (stop and check in after each one)

**Phase 0: Setup**
Initialise Next.js + TS + Tailwind + shadcn/ui + ESLint/Prettier, install dependencies, set up Supabase CLI for local dev, `.env.example`, `next-themes` with toggle, base layout, git init. Explain how to create the Supabase project and where to paste keys.
✅ Done when: `npm run dev` shows a placeholder page with a working dark/light toggle.

**Phase 1: Landing page**
Build all sections from 5.1, responsive, both themes.
✅ Done when: looks polished on mobile and desktop in both themes; Log in / Sign up buttons navigate correctly.

**Phase 2: Authentication & security**
Everything in 5.2, middleware, security headers, profiles trigger.
✅ Done when: signup → email verify → dashboard works; logged-out users can't reach `/app/*`; the full security checklist is ticked with an explanation for each item.

**Phase 3: Database & isolation tests**
Migrations for all tables, RLS policies, balance view, generated types, seed data, **two-user isolation test**.
✅ Done when: the isolation test passes and is part of `npm test`.

**Phase 4: Accounts**
Accounts CRUD + deposits/withdrawals + balance display.

**Phase 5: Trade logging**
Trade form (with live P&L preview), list with filters/totals, detail, edit, delete, quick-add sheet. Unit tests for all calculations (long, short, fees, multiplier, R-multiple, open trades).

**Phase 6: Dashboard**
Summary cards, accounts grid with sparklines, weekly P&L chart, recent trades, empty states. Unit tests for week-boundary logic across timezones (including a trade closed late Sunday night).

**Phase 7: Polish & deploy**
Loading skeletons, error boundaries, toasts, 404 page, accessibility pass, Lighthouse check, Playwright happy-path test (signup → add account → log trade → see it on dashboard), deploy to Vercel with production Supabase, update Supabase redirect URLs.

---

## 9. Future Phases (do NOT build yet; just don't block them)

- Broker connections / automatic trade import (CSV import first, then broker APIs)
- Analytics: equity curve, win rate by strategy/symbol/day/time, profit factor, expectancy, max drawdown, average R
- P&L calendar heatmap
- Screenshot / chart image uploads per trade (Supabase Storage with per-user RLS policies)
- Daily journal entries (pre-market plan, post-market review, mood)
- Playbook of setups with rules
- Prop-firm rule tracking (daily loss limit, max drawdown, profit target)
- Subscription billing (Stripe)
- Multi-currency conversion

---

## 10. Definition of Done (every phase)

- [ ] Works in **both dark and light mode**
- [ ] Responsive on mobile and desktop
- [ ] No TypeScript or lint errors (`npm run lint`, `npm run typecheck`)
- [ ] Tests pass (`npm test`)
- [ ] All new tables have RLS + policies
- [ ] Server-side Zod validation on every mutation
- [ ] Summary posted: what was built, how to test manually, what's next
- [ ] Git commit made

---

## 11. Kickoff Prompt (paste this into Claude Code to start)

```
Read CLAUDE.md fully. Then:
1. Summarise back to me, in plain language, what we're building and the plan.
2. List anything you need from me (accounts to create, keys, decisions).
3. Start Phase 0 only. Explain each step as you go since I'm still learning.
4. Stop when Phase 0's "Done when" criteria are met and tell me how to check it.
```

**Prompts for the following phases** (use one per session or after approving the last phase):

```
Phase 0 is approved. Start Phase 1 (Landing page) from CLAUDE.md. Use the frontend-design approach: make it look distinctive and premium, not like a generic template. Stop when done.
```

```
Start Phase 2 (Authentication & security). Go through the security checklist item by item and explain each one. Stop when done.
```

```
Start Phase 3 (Database & isolation tests). Show me the RLS policies and explain how they stop one user seeing another's data. Stop when the two-user isolation test passes.
```

…and so on for Phases 4–7.

---

## 12. Project Notes (learned during the build — keep up to date)

### Versions in use (set up in Phase 0)

- **Next.js 16.4** (App Router, Turbopack), React 19.3, Tailwind CSS v4, TypeScript strict.
- **This Next.js is newer than most training data.** Before using an unfamiliar API, read the bundled docs in `node_modules/next/dist/docs/` (see `AGENTS.md`).
- **Middleware is now called "Proxy"**: the file is `proxy.ts` in the project root and exports `proxy`. Wherever this document says "middleware", use proxy.
- **Cache Components** (`cacheComponents: true`) and Partial Prefetching are enabled in `next.config.ts`. Reading cookies/headers makes a route dynamic; keep the marketing page static.
- `LayoutProps` / `PageProps` are global types generated by Next. `npm run typecheck` runs `next typegen` first.
- **shadcn/ui** uses the `radix-nova` style (Radix primitives, Lucide icons). Its `cn()` helper comes from the official `cn` package (shadcn's replacement for clsx + tailwind-merge). Add components with `npx shadcn@latest add <name>`.
- **Supabase CLI** is a dev dependency: run it with `npx supabase …` or the `db:*` npm scripts. Local Supabase (`npm run db:start`) requires Docker Desktop.

### Design tokens

- Defined in `app/globals.css`. Brand accent = **electric blue** (`primary`). Semantic trading colours: `text-profit` / `bg-profit-muted`, `text-loss` / `bg-loss-muted`, `text-neutral`.
- Numbers: add the `tabular-nums` class to every numeric value.

### npm scripts

`dev`, `build`, `lint`, `typecheck`, `format`, `format:check`, `test` (Vitest), `test:e2e` (Playwright), `db:start`, `db:stop`, `db:types`.

### Gotchas found in Phase 1

- **`new Date()` / `Date.now()` in a prerendered Server Component fails the build** under Cache Components. Put it inside a `"use cache"` function with `cacheLife(...)` (see `components/marketing/footer.tsx`), behind `<Suspense>` + `connection()`, or in a Client Component.
- **Pages are kept alive after navigating away** (React `<Activity>`, hidden with `display: none`). Form state survives navigation. **Auth forms must clear password fields** (reset on unmount/hide or after submit) so passwords don't linger in a hidden DOM. In tests, use `locator("h1:visible")`, since the previous page's elements are still in the DOM.
- The "Go to dashboard" navbar variant for logged-in visitors (spec 5.1) is deferred to Phase 2. Implement it client-side so `/` stays static.
- **Stale CSS in dev:** Next 16 keeps a disk cache in `.next/`. If CSS edits (especially new `@utility` rules in `globals.css`) don't show up, stop the dev server, delete `.next`, and restart `npm run dev`. A plain restart is not always enough.
- Avoid naming custom utilities with Tailwind's built-in prefixes (e.g. `text-`), to prevent clashes with its own utilities.

### Supabase setup notes (Phase 2)

- Project: Supabase Cloud, linked with `npx supabase link`. CLI v3 targets local by default: use `--remote` (e.g. `npm run db:push`, `npm run db:types`).
- **Email templates can't be edited until custom SMTP is configured.** Until then, confirmation/reset links use Supabase's default PKCE `?code=` flow, which only works in the **same browser** that requested the email. In Phase 7 (custom SMTP), change the templates to token_hash links (`/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/app/dashboard` and `...&type=recovery`); `/auth/callback` already supports both.
- Dev redirect allow-list uses `http://localhost:3000/**`. In production, allow only the exact production callback URL.
- Supabase's built-in email sender is heavily rate-limited (a few emails/hour). Configure custom SMTP before launch.

### Database notes (Phase 3)

- **This Supabase project does NOT auto-grant table privileges.** New tables give `authenticated` no SELECT/INSERT/UPDATE (and default grants include TRUNCATE, which bypasses RLS). **Every new table/view migration must `revoke all ... from anon, authenticated` and then `grant` exactly what's needed.** RLS controls which rows; GRANTs control which operations.
- Child tables reference accounts via composite FK `(account_id, user_id) → trading_accounts(id, user_id)`, so a row can only point at an account owned by the same user (enforced by the schema, in addition to RLS).
- P&L (`gross_pnl`, `net_pnl`, `r_multiple`, `status`) are Postgres generated columns. Never send them from the client.
- Balances come from the `account_balances` view (`security_invoker = true`).
- Test migrations safely before pushing: wrap them in `begin; … rollback;` and run with `npx supabase db query --remote -f file.sql` (asks for confirmation; use `--read-only` for plain reads).
- **Isolation test** (`tests/integration/isolation.test.ts`) runs in `npm test` using two real users from `.env.test.local` (created in the dashboard with "Auto Confirm User"). No service_role key. If CAPTCHA is enabled later, the test users' sign-in will need a bypass strategy (e.g. a separate test project).
- `supabase/seed.sql` is for LOCAL Docker databases only (creates `demo@tradeledger.local` / `demo-password-123`). Never run it on production.

### UI conventions (Phase 4)

- **Form field ids: always use `useFieldIds()`** (`lib/use-field-ids.ts`), never fixed `id="email"`. Next keeps visited pages alive (hidden), so fixed ids get duplicated and `<label htmlFor>` points at the hidden copy.
- **Client components that read the URL** (`usePathname`, `useSearchParams`) must sit inside `<Suspense>` (see `app-sidebar.tsx` / `top-bar.tsx`), or dynamic routes like `/app/accounts/[id]` fail Cache Components validation.
- After a Server Action mutates data, call `refresh()` from `next/cache` (our reads are per-request, not cached).
- Server Actions receive the RAW form values (`getValues()`), then validate with Zod themselves. Forms use `useForm<Input, unknown, Output>`.
- Money: validate as a string (`moneyString`, ≤13 integer digits, ≤2 decimals), convert with `moneyToNumber` only after validation. Display with `formatCurrency` (en-IE: USD shows as "US$", which is intentional for multi-currency clarity).
- `SignedAmount` shows P&L with colour + sign + arrow; zero has no icon.
- Shared form messages live in `components/common/form-message.tsx`.
- `TooltipProvider` wraps the app layout (required by the sidebar).
- When running `npx shadcn add`, never overwrite `button.tsx` (custom `contrast` variant) or `input.tsx`.

### Trades notes (Phase 5)

- Trade times are entered as wall-clock times in the **user's profile timezone**; Server Actions convert with `fromZonedTime` (`lib/trades/actions.ts`). Display with `formatInTimeZone(iso, profile.timezone, …)`.
- Prices/quantities (numeric(18,8)) travel as **exact strings** to Postgres (`numeric()` helper in `lib/trades/actions.ts`). Never `Number()` them before saving.
- List filters live in the URL (`lib/trades/filters.ts`); invalid params are ignored, not errors. Totals are grouped by currency (never summed across currencies).
- **Responsive forms inside panels: use container queries** (`@container`, `@lg:`, `@3xl:`) so layout follows the form's own width, not the viewport.
- **Wide tables:** the app content wrapper and `SidebarInset` need `min-w-0`, and a scroll box containing `sr-only` (absolutely positioned) elements needs `relative`, or the page scrolls sideways on mobile.
- Sheet width: override with `data-[side=right]:sm:max-w-…` (the default sheet rule uses that selector).

### Dashboard notes (Phase 6)

- Week logic lives in `lib/calculations/week.ts`: calendar maths on "yyyy-MM-dd" strings in the user's timezone; only the boundaries become UTC instants ([start, end)). `npm test` also runs the week tests with the SERVER in UTC+14 and UTC−8 (`test:tz`) to prove server timezone never matters.
- Dashboard sums money in integer cents, groups everything by currency, and never converts between currencies. The chart shows one currency at a time (profile default first, switchable via `?currency=`).
- **Chart colours are separate from text colours:** `--chart-profit` / `--chart-loss` (bars) were validated with the dataviz palette checker (CVD ΔE ≥ 16.9 both modes); `--profit` / `--loss` stay for text. Because bar contrast vs surface is < 3:1, the chart must keep its visible axis values and the "Show as table" view.
- Chart conventions: ≤24px bars, 4px rounded data end, solid hairline horizontal grid, zero reference line, per-bar tooltip, `accessibilityLayer` (keyboard), true minus signs.
- Unique ids across layouts: only the marketing layout uses `id="main"` (skip link); the app content is `#app-content`.

### Settings & sessions (Phase 7)

- Account deletion uses `delete_my_account()` (SECURITY DEFINER, no args, deletes only `auth.uid()`, cascades). No service_role key. The Server Action re-verifies the password first (`lib/supabase/verify-password.ts`, a throwaway client so the real session is untouched).
- **Revoked sessions are rejected immediately:** Supabase access tokens stay valid until expiry (≤1h) after "sign out everywhere"/password change. `session_is_active()` checks `auth.sessions` for the token's `session_id`; the proxy (app + guest-only routes) and the DAL both call it. Covered by `tests/integration/sessions.test.ts`.
- Sensitive actions (change password, delete account) require the current password.

### Quality gates (Phase 7)

- `npm run test:e2e` (Playwright, `tests/e2e/`) covers signup-neutrality → account → trade → dashboard. It runs serially (shared test user) and cleans up.
- Accessibility: axe-core (`@axe-core/playwright`) found 0 violations on all pages in both themes. Rules learned: app sidebar content sits inside `<nav aria-label="App">`; `aria-label` on a non-interactive element needs a role (e.g. `role="img"`); light-mode `--destructive` darkened for 4.5:1.
- Lighthouse (prod build): landing 91/100/96/100, login 99/100/96/100, signup 93/100/96/100. **Never animate the hero `<h1>`**: it's the LCP element.
- Error pages use the `retry()` prop (Next 16), not `reset()`. `app/app/not-found.tsx` renders inside the app shell.
- Test-script gotcha: never wait with `waitForURL("**/app/dashboard")` (it matches `/login?next=/app/dashboard`); use a regex anchored with `$`.

### Two-factor authentication (Phase 7)

- TOTP via Supabase MFA. Login → if `aal1` with `nextLevel aal2` → `/login/verify`. Enforced in three layers: proxy (app routes), DAL (`requireUser()` redirects; `requirePasswordSession()` only for the verify page), and **RLS restrictive policies** `"Require 2FA when enabled"` using `mfa_satisfied()` on every table (+ `delete_my_account()` checks it).
- **Every new user-data table must also get the restrictive 2FA policy**, alongside its owner-only policies and grants.
- Turning 2FA off requires a current code. `tests/e2e/two-factor.spec.ts` covers the whole flow (uses user B; always cleans up).

### AI Coach

- Claude (Anthropic API, official `@anthropic-ai/sdk`) added to the stack with the owner's approval. `ANTHROPIC_API_KEY` is **server-only** (never `NEXT_PUBLIC_`), in `.env.local` and as a Vercel **Secret**.
- Numbers come from `lib/insights/stats.ts` (pure, unit-tested); the model only interprets them and never does arithmetic.
- Tables `ai_reports`, `ai_messages` (owner-only RLS + 2FA + grants), `ai_usage` (append-only, read-only for users). Limits are enforced atomically by `ai_try_consume(kind)` (5 reports / 30 chat messages per rolling 24h), and are hard-coded in SQL so callers can't raise them. Don't call it from tests (it spends the real quota).
- Users opt in via `profiles.ai_consent_at` before any data is sent to Anthropic.
- Report: `generateReport` (Server Action, `lib/coach/actions.ts`): Opus 5.5, structured output (`lib/ai/report-schema.ts`), effort high, refusal fallbacks (`fallbacks: "default"`). Chat: streaming Route Handler `app/api/coach/[reportId]/chat/route.ts` (effort medium, cached report context). Coach pages set `maxDuration = 120`.
- Prompt rules (`lib/ai/prompts.ts`): quote only given numbers, flag small samples, process not financial advice, trade notes are data not instructions.
- AI replies are rendered with `ChatText` (safe bold/lists built as React elements, never HTML).
- **Deploying the coach needs:** the `ai_coach` migration on prod and `ANTHROPIC_API_KEY` (a separate prod key) as a Vercel **Secret**, then a redeploy.

### Coach chat & Playbook

- `/app/chat`: general coach chat on the Messages API with a manual streaming tool loop (`app/api/chat/route.ts`, max 6 tool rounds, NDJSON events text/status/proposal/error/done). Tools in `lib/ai/assistant-tools.ts` are read-only lookups run with the user's session (RLS), plus `propose_rule`, which only shows a card. Rules are saved only when the user clicks "Add to my rules".
- Tools use `eager_input_streaming: true`; every input is validated with Zod before running; a turn with stop_reason `max_tokens` or `refusal` never runs its tools.
- **Conversations are append-only and replayed verbatim:** `coach_messages.content` stores the exact API content (thinking, tool_use, tool_result). Never edit, filter or rebuild earlier turns, and never change `ASSISTANT_SYSTEM_PROMPT` per request (preserved-thinking history-editing check). Users can only delete whole conversations.
- Limits: `ai_try_consume('assistant')` = 30 per rolling 24h, separate from report chat (30) and reports (5).
- `/app/playbook`: `trading_rules` (manual or `source = 'ai'` when approved from a proposal), with up/down reordering.

### Mobile web app (installable)

- `app/manifest.ts` (standalone, opens at `/app/dashboard`), `app/apple-icon.png`, `public/icons/*` (192/512 + maskable). No offline mode / service worker.
- `viewportFit: "cover"`: the body pads `env(safe-area-inset-*)`; `fixed` elements (sheets) and sticky bottom bars must add `env(safe-area-inset-bottom)` themselves.
- Form controls must be ≥16px on mobile (`text-base md:text-sm`), or iOS zooms in on focus. This includes native `<select>`s.

### Simple trades & screenshots (replaces parts of spec 5.6)

- The owner asked for a simpler trade form: symbols **EURUSD / NQ only** (`SYMBOLS` in `lib/trades/constants.ts`, DB check `trades_symbol_allowed`, NOT VALID for older rows). No asset class, quantity, multiplier or fees.
- **P&L is typed by the trader**: unsigned amount + Profit/Loss toggle (iPhone decimal keypads have no minus key) → `netPnl` signed string. Empty = open trade.
- `trades.exit_time` and `status` are generated from `net_pnl`: a closed trade's `exit_time` = its `entry_time`, so dashboard/week/coach logic is unchanged. Never send them.
- **No exit price field** (column kept, saved as null). The trader enters **SL price** and **TP price**, and the **TP price means where they got out** (their exit, either side of the entry). `lib/calculations/rr.ts` (exact BigInt decimal maths; `BigInt(…)` not `123n`, tsconfig target < ES2020): `pipsBetween` (EURUSD pip 0.0001, NQ point 1), `movePips` (signed), `checkStop` (long: SL below entry), `tradeRrFromPrices` = signed move to TP ÷ SL distance.
- **Suggested Trade RR** (`suggestedRr`, unsigned): from the TP when given; a loss with no TP = SL hit → 1 (saved −1); P&L 0 → 0. A TP that disagrees with Profit/Loss is a validation error on `pnlSide`. The form auto-fills the RR until the trader types over it ("Use calculated" restores); the server uses the typed RR, or the suggestion if empty.
- **Trade RR** (`trades.r_multiple`, numeric(8,2)) is suggested as above or typed by the trader, unsigned in the form; its sign follows Profit/Loss. DB checks: closed trades only, same sign as `net_pnl`, |R| < 1000. The AI Coach's R stats use it.
- Insight stats also have `bySession` (market sessions in **Irish time**, Europe/Dublin, `sessionOf()`), `byStrategySymbol` / `byStrategyDirection` / `byStrategySession` combinations, and a `definitions` object (explains them to the chat assistant, whose prompt can't change). Holding time was removed (no exit times); `get_trading_stats`'s description still mentions it on purpose (tool definitions must not change), and `definitions.holdingTime` says it isn't tracked.
- The AI Coach gets an asset class derived from the symbol (`SYMBOL_ASSET_CLASS`). Tool definitions/prompts were deliberately NOT changed (that would break replay of saved conversations).
- **Screenshots**: private bucket `trade-screenshots`, path `<user_id>/<trade_id>/<uuid>.<ext>`. Storage RLS = own folder + own trade + max 6 (`can_add_trade_screenshot()`, SECURITY DEFINER, because a storage.objects policy can't query storage.objects: "infinite recursion" → storage reports `DatabaseInvalidObjectDefinition`). Restrictive 2FA policy too.
- Uploads: browser shrinks to ≤2400px WebP/JPEG (`lib/screenshots/prepare.ts`), Server Action checks size + magic bytes (`lib/screenshots/sniff.ts`); `serverActions.bodySizeLimit` = 4mb (Vercel's limit is 4.5 MB). Viewed through 1-hour signed URLs (CSP `img-src` allows the Supabase origin).
- Storage files are NOT removed by DB cascades: `deleteTrade` and `deleteAccount` remove them explicitly; tests clean up their files too.
