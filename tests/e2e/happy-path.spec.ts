/**
 * End-to-end happy path (CLAUDE.md Phase 7):
 *   sign up → add account → log trade → see it on the dashboard.
 *
 * Email confirmation can't be clicked by a robot, and sending mail to made-up
 * addresses hurts deliverability. So:
 *   1. Sign-up is submitted with an EXISTING address: it must show the same neutral
 *      "Check your email" page (proving no account enumeration). Supabase sends no
 *      mail in that case.
 *   2. The rest runs as the pre-confirmed test user A, and cleans up after itself.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { loadEnv } from "./env";

const env = loadEnv();
const configured = Boolean(env.ISOLATION_USER_A_EMAIL && env.ISOLATION_USER_A_PASSWORD);
const ACCOUNT = `E2E Account ${Date.now()}`;

test.skip(!configured, "Needs .env.local and .env.test.local");

async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(env.ISOLATION_USER_A_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(env.ISOLATION_USER_A_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/);
}

test.afterAll(async () => {
  // Remove the account this test created (its trades cascade).
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });
  await sb.auth.signInWithPassword({
    email: env.ISOLATION_USER_A_EMAIL,
    password: env.ISOLATION_USER_A_PASSWORD,
  });
  // Screenshot files of this account's trades first (Storage isn't part of the cascade).
  const { data: trades } = await sb
    .from("trades")
    .select("id, user_id, account:trading_accounts!inner(name)")
    .eq("account.name", ACCOUNT);
  const shots = sb.storage.from("trade-screenshots");
  for (const t of trades ?? []) {
    const { data: files } = await shots.list(`${t.user_id}/${t.id}`);
    if (files?.length) await shots.remove(files.map((f) => `${t.user_id}/${t.id}/${f.name}`));
  }
  await sb.from("trading_accounts").delete().eq("name", ACCOUNT);
  await sb.auth.signOut({ scope: "local" });
});

test("landing page → sign up shows the neutral 'check your email' screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Get started free" }).first().click();
  await expect(page).toHaveURL(/\/signup$/);

  await page.getByLabel("Email").fill(env.ISOLATION_USER_A_EMAIL); // already registered
  await page.getByLabel("Password", { exact: true }).fill("Blue-Kettle-Rain-42!");
  await page.getByLabel("Confirm password").fill("Blue-Kettle-Rain-42!");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/check-email$/);
  await expect(page.getByText("If that email is valid")).toBeVisible();
});

test("logged-out visitors are sent to login", async ({ page }) => {
  await page.goto("/app/trades");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Ftrades$/);
});

test("add account → log trade → see it on the dashboard", async ({ page }) => {
  await logIn(page);

  // Add an account
  await page.goto("/app/accounts");
  await page
    .locator("#app-content")
    .getByRole("button", { name: /Add (your first )?account/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Account name").fill(ACCOUNT);
  await dialog.getByLabel("Currency").click();
  await page.getByRole("option", { name: "USD" }).click();
  await dialog.getByLabel("Starting balance").fill("10000");
  await dialog.getByRole("button", { name: "Add account" }).click();
  await expect(page).toHaveURL(/\/app\/accounts\/[0-9a-f-]{36}$/);
  const accountUrl = page.url();

  // Before any trades, the dashboard already shows the equity curve as a flat line.
  await page.goto("/app/dashboard?currency=USD");
  await expect(
    page
      .locator("section", { has: page.getByRole("heading", { name: "Equity curve" }) })
      .locator(".recharts-area-curve"),
    // A flat line is 0px tall, which Playwright counts as "not visible": check it's drawn.
  ).toHaveCount(1);
  await page.goto(accountUrl);

  // Log a closed trade via the quick-add sheet (entry/exit today, in the user's timezone)
  await page.getByRole("button", { name: "Log trade" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Account").click();
  await page.getByRole("option", { name: new RegExp(ACCOUNT) }).click();
  await sheet.getByRole("radio", { name: "NQ" }).click();
  await sheet.getByLabel("Entry price").fill("21480");
  await sheet.getByLabel(/SL price/).fill("21460");
  await sheet.getByLabel(/TP price/).fill("21520");
  await expect(sheet.getByText(/SL: 20 points/)).toBeVisible();
  await expect(sheet.getByText(/TP: 40 points/)).toBeVisible();
  await sheet.getByRole("radio", { name: /Profit/ }).click();
  await sheet.getByLabel(/^Amount/).fill("123");
  // A win exits at the TP: RR = 40 ÷ 20 = +2R, +40 points.
  await expect(sheet.locator("output")).toContainText("+2.00R");
  await expect(sheet.locator("output")).toContainText("+40 points");
  await expect(sheet.getByText("+US$123.00").filter({ visible: true }).first()).toBeVisible();
  await sheet.getByLabel(/Strategy/).click();
  await page.getByRole("option", { name: "FBOs" }).click();
  // Confluences: pick a starter one and add a custom one, then close the dropdown.
  await sheet.getByLabel(/^Confluences/).click();
  await page.getByRole("button", { name: "Liquidity sweep" }).click();
  await page.getByLabel("Search or add a confluence").fill("London range");
  await page.getByLabel("Search or add a confluence").press("Enter");
  await page.keyboard.press("Escape");
  await expect(sheet.getByRole("list", { name: "Selected confluences" })).toContainText(
    /Liquidity sweep[\s\S]*London range/,
  );
  // Attach a screenshot before saving (uploaded right after the trade is created).
  await sheet.locator('input[type="file"]').setInputFiles({
    name: "chart.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(sheet.getByRole("button", { name: "Remove screenshot 1" })).toBeVisible();
  await sheet.getByRole("button", { name: "Log trade" }).filter({ visible: true }).click();
  await expect(page.getByText("Trade logged")).toBeVisible();

  // The trade page shows the screenshot (a private, signed link).
  await page.getByRole("button", { name: "View" }).click();
  await expect(page).toHaveURL(/\/app\/trades\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("button", { name: "View screenshot 1" })).toBeVisible();
  await expect(page.getByLabel("Results")).toContainText("+2.00R");
  await expect(page.getByLabel("Results")).toContainText("+40 points");
  await expect(page.getByText("FBOs")).toBeVisible();
  await expect(page.getByRole("list", { name: "Confluences" })).toContainText("London range");
  await expect(page.getByText("21,460 · 20 points")).toBeVisible();
  await expect(page.getByText("21,520 · 40 points")).toBeVisible();

  // Account balance includes the trade: 10,000 + 123 = 10,123.00
  await page.goto(accountUrl);
  await expect(page.getByLabel("Balance")).toContainText("US$10,123.00");

  // Dashboard: this week's P&L, the chart and recent trades show it
  await page.goto("/app/dashboard?currency=USD");
  await expect(page.getByRole("heading", { name: "Daily P&L" })).toBeVisible();
  // Equity curve card: this account started today, so it's a flat line for today.
  const equity = page.locator("section", {
    has: page.getByRole("heading", { name: "Equity curve" }),
  });
  await expect(equity.locator(".recharts-area-curve")).toHaveCount(1);
  await expect(equity.getByRole("table")).toContainText("US$10,123.00");
  const recent = page.locator("section", {
    has: page.getByRole("heading", { name: "Recent trades" }),
  });
  await expect(recent.getByRole("link", { name: "NQ" }).first()).toBeVisible();
  await expect(page.locator("li", { hasText: ACCOUNT })).toContainText("US$10,123.00");
});
