/**
 * Two-factor authentication, end to end (test user B):
 * enable in Settings → login requires the code → app pages blocked until then →
 * wrong code rejected → right code works → disable. Always cleans up.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { loadEnv } from "./env";
import { nextWindow, totp } from "./totp";

const env = loadEnv();
const EMAIL = env.ISOLATION_USER_B_EMAIL;
const PASSWORD = env.ISOLATION_USER_B_PASSWORD;
let secret: string | null = null;

test.skip(!EMAIL || !PASSWORD, "Needs .env.test.local");
test.setTimeout(180_000); // waits for fresh 30-second codes

async function passwordLogin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
}

test.afterAll(async () => {
  // Safety net: if the test failed half-way, turn 2FA off for user B via the API.
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });
  await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  const { data } = await sb.auth.mfa.listFactors();
  for (const f of data?.all ?? []) {
    if (f.status === "verified" && secret) {
      await nextWindow();
      await sb.auth.mfa.challengeAndVerify({ factorId: f.id, code: totp(secret) });
    }
    await sb.auth.mfa.unenroll({ factorId: f.id });
  }
  await sb.auth.signOut({ scope: "global" });
});

test("enable 2FA, log in with a code, then disable it", async ({ page }) => {
  // 1. Enable
  await passwordLogin(page);
  await expect(page).toHaveURL(/\/app\/dashboard$/);
  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Turn on" }).filter({ visible: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByAltText("QR code for your authenticator app")).toBeVisible();
  await dialog.getByText("Can't scan it?").click();
  secret = (await dialog.locator("code").textContent())!.trim();
  await dialog.getByLabel("6-digit code").fill(totp(secret));
  await dialog.getByRole("button", { name: "Turn on two-factor" }).click();
  await expect(page.getByText("Two-factor authentication is on")).toBeVisible();

  // 2. Log out and back in: the code step is required
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await passwordLogin(page);
  await expect(page).toHaveURL(/\/login\/verify/);

  // App pages are blocked until the code is entered
  await page.goto("/app/dashboard");
  await expect(page).toHaveURL(/\/login\/verify\?next=%2Fapp%2Fdashboard$/);

  // 3. Wrong code is rejected
  const wrong = totp(secret) === "000000" ? "111111" : "000000";
  await page.getByLabel("Authentication code").fill(wrong);
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "didn't work" })).toBeVisible();

  // Right code (fresh window) gets in
  await nextWindow();
  await page.getByLabel("Authentication code").fill(totp(secret));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard$/);

  // 4. Disable (needs a current code)
  await page.goto("/app/settings");
  await page.locator("#app-content").getByRole("button", { name: "Turn off" }).click();
  await nextWindow();
  await page.getByRole("dialog").getByLabel("6-digit code").fill(totp(secret));
  await page.getByRole("dialog").getByRole("button", { name: "Turn off two-factor" }).click();
  await expect(page.getByText("Two-factor authentication is off")).toBeVisible();
  secret = null;

  // Next login needs no code
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await passwordLogin(page);
  await expect(page).toHaveURL(/\/app\/dashboard$/);
});
