import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:8787";

test.describe("Settings Navigation (User Story 4)", () => {
  test("should access settings and navigate back to dashboard", async ({
    page,
  }) => {
    // 1. Create user with complete onboarding
    const email = `settings-complete-${Date.now()}@example.com`;
    const password = "TestPass123";

    const signupResponse = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const setCookieHeader = signupResponse.headers.get("set-cookie");
    const match = setCookieHeader?.match(/auth_session=([^;]+)/);
    const sessionCookie = match ? match[1] : "";

    // Complete onboarding
    await fetch(`${API_BASE}/api/onboarding/state`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth_session=${sessionCookie}`,
      },
      body: JSON.stringify({ botConnected: true, pricingConfigured: true }),
    });

    await fetch(`${API_BASE}/api/onboarding/complete`, {
      method: "POST",
      headers: { Cookie: `auth_session=${sessionCookie}` },
    });

    // 2. Visit dashboard
    await page
      .context()
      .addCookies([
        {
          name: "auth_session",
          value: sessionCookie,
          domain: "localhost",
          path: "/",
        },
      ]);

    await page.goto("/dashboard");

    // 3. Navigate to Settings (Manage Bot)
    await page.getByRole("link", { name: "Manage Bot" }).click();
    await expect(page).toHaveURL(/\/settings\/bot/);

    // 4. Check Back Link
    const backLink = page.getByRole("link", { name: "Back to Dashboard" });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 5. Navigate to Pricing (Configure Pricing)
    await page.getByRole("link", { name: "Configure Pricing" }).click();
    await expect(page).toHaveURL(/\/settings\/pricing/);

    // 6. Check Back Link
    await page.getByRole("link", { name: "Back to Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should redirect incomplete onboarding user away from settings", async ({
    page,
  }) => {
    // 1. Create user (incomplete)
    const email = `settings-incomplete-${Date.now()}@example.com`;
    const password = "TestPass123";

    const signupResponse = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const setCookieHeader = signupResponse.headers.get("set-cookie");
    const match = setCookieHeader?.match(/auth_session=([^;]+)/);
    const sessionCookie = match ? match[1] : "";

    // 2. Try to access settings
    await page
      .context()
      .addCookies([
        {
          name: "auth_session",
          value: sessionCookie,
          domain: "localhost",
          path: "/",
        },
      ]);

    await page.goto("/settings/bot");

    // 3. Expect redirect to onboarding (bot step)
    await expect(page).toHaveURL(/\/onboarding\/bot/);
  });
});
