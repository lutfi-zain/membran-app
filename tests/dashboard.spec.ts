import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:8787";

test.describe("Dashboard (User Story 2)", () => {
  test("should access dashboard and see status (completed onboarding)", async ({
    page,
  }) => {
    // 1. Create user
    const email = `dash-complete-${Date.now()}@example.com`;
    const password = "TestPass123";

    const signupResponse = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const setCookieHeader = signupResponse.headers.get("set-cookie");
    const match = setCookieHeader?.match(/auth_session=([^;]+)/);
    const sessionCookie = match ? match[1] : "";

    // 2. Mark onboarding complete via API
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

    // 3. Set cookie and visit dashboard
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

    // 4. Verify dashboard content
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(page.getByText("Server Status")).toBeVisible();
    await expect(page.getByRole("link", { name: "Manage Bot" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Configure Pricing" }),
    ).toBeVisible();
  });

  test("should redirect to onboarding if incomplete (bot not connected)", async ({
    page,
  }) => {
    // 1. Create user (fresh, so onboarding incomplete)
    const email = `dash-incomplete-${Date.now()}@example.com`;
    const password = "TestPass123";

    const signupResponse = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const setCookieHeader = signupResponse.headers.get("set-cookie");
    const match = setCookieHeader?.match(/auth_session=([^;]+)/);
    const sessionCookie = match ? match[1] : "";

    // 2. Set cookie and visit dashboard
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

    // 3. Verify redirect to /onboarding/bot
    await expect(page).toHaveURL(/\/onboarding\/bot/);
  });
});
