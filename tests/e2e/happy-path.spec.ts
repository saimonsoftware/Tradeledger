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

  // Log a closed trade via the quick-add sheet (entry/exit today, in the user's timezone)
  await page.getByRole("button", { name: "Log trade" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Account").click();
  await page.getByRole("option", { name: new RegExp(ACCOUNT) }).click();
  await sheet.getByLabel("Symbol").fill("msft");
  const entry = await sheet.getByLabel("Entry date & time").inputValue(); // defaults to "now"
  await sheet.getByLabel("Entry price").fill("400");
  await sheet.getByLabel("Quantity / size").fill("10");
  await sheet.getByLabel("Exit date & time").fill(entry);
  await sheet.getByLabel("Exit price").fill("412.5");
  await sheet.getByLabel(/Fees/).fill("2");
  await expect(sheet.getByLabel("Live P&L preview")).toContainText("+US$123.00");
  await sheet.getByRole("button", { name: "Log trade" }).filter({ visible: true }).click();
  await expect(page.getByText("Trade logged")).toBeVisible();

  // Account balance includes the trade: 10,000 + (412.5 − 400) × 10 − 2 = 10,123.00
  await page.goto(accountUrl);
  await expect(page.getByLabel("Balance")).toContainText("US$10,123.00");

  // Dashboard: this week's P&L, the chart and recent trades show it
  await page.goto("/app/dashboard?currency=USD");
  await expect(page.getByRole("heading", { name: "Daily P&L" })).toBeVisible();
  const recent = page.locator("section", {
    has: page.getByRole("heading", { name: "Recent trades" }),
  });
  await expect(recent.getByRole("link", { name: "MSFT" }).first()).toBeVisible();
  await expect(page.locator("li", { hasText: ACCOUNT })).toContainText("US$10,123.00");
});
