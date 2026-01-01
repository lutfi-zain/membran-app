import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:8787";

test.describe("Navigation & Redirects", () => {
  test("should redirect unauthenticated user to login with return URL", async ({
    page,
  }) => {
    // 1. Visit protected route directly
    await page.goto("/dashboard");

    // 2. Expect redirect to login with return param
    await expect(page).toHaveURL(/\/login/);
    expect(page.url()).toContain("return=");
    expect(decodeURIComponent(page.url())).toContain(
      "return=http://localhost:5173/dashboard",
    );
  });

  test("should redirect to return URL after login", async ({ page }) => {
    // 1. Create user
    const email = `nav-return-${Date.now()}@example.com`;
    const password = "TestPass123";

    await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    // 2. Visit login with return URL
    await page.goto("/login?return=/settings/bot");

    // 3. Fill login form
    await page.getByPlaceholder("Email address").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Log In" }).click();

    // 4. Expect redirect to /settings/bot (or onboarding if incomplete)
    // Since user is new, onboarding is incomplete, so it should redirect to /onboarding/bot
    // BUT the logic in main.tsx checks onboarding state before rendering settings
    // So /settings/bot -> redirect to /onboarding/bot

    // Ideally we want to test that it ATTEMPTS to go to settings/bot first.
    // Let's manually complete onboarding first to test the happy path.

    // Get session
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const setCookieHeader = loginRes.headers.get("set-cookie");
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

    // Now try login flow again with valid return URL
    await page.context().clearCookies(); // Logout
    await page.goto("/login?return=/settings/bot");
    await page.getByPlaceholder("Email address").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Log In" }).click();

    // Now it should go to /settings/bot
    await expect(page).toHaveURL(/\/settings\/bot/);
  });

  test("should show 404 for unknown routes", async ({ page }) => {
    await page.goto("/some/unknown/route");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page Not Found")).toBeVisible();
  });
});
