import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:5173";
const API_BASE = "http://localhost:8787";

test.describe("Landing Page (User Story 1)", () => {
  test("should display landing page with CTAs for visitors", async ({
    page,
  }) => {
    // Ensure we are logged out (clear cookies)
    await page.context().clearCookies();

    await page.goto("/");

    // Check for product name and value prop
    await expect(page.getByText("Membran")).toBeVisible();
    await expect(page.getByText("Monetize your Discord server")).toBeVisible();

    // Check CTAs
    const signupBtn = page.getByRole("link", { name: "Start Free Trial" });
    await expect(signupBtn).toBeVisible();
    await expect(signupBtn).toHaveAttribute("href", "/signup");

    const loginBtn = page.getByRole("link", { name: "Login" });
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toHaveAttribute("href", "/login");
  });

  test("should redirect authenticated users to dashboard", async ({ page }) => {
    // Create a user and get session
    const email = `landing-test-${Date.now()}@example.com`;
    const password = "TestPass123";

    // Create user via API
    const signupResponse = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(signupResponse.ok).toBeTruthy();

    const setCookieHeader = signupResponse.headers.get("set-cookie");
    const match = setCookieHeader?.match(/auth_session=([^;]+)/);
    const sessionCookie = match ? match[1] : "";
    expect(sessionCookie).toBeTruthy();

    // Set cookie in browser context
    await page.context().addCookies([
      {
        name: "auth_session",
        value: sessionCookie,
        domain: "localhost",
        path: "/",
      },
    ]);

    // Go to root
    await page.goto("/");

    // Should be redirected to dashboard
    // Note: Dashboard might redirect to onboarding if incomplete, which is expected behavior
    // So we check if URL is NOT root and contains either dashboard or onboarding
    await expect(page).not.toHaveURL(/\/$/); // Not ending in /
    const url = page.url();
    expect(url).toMatch(/\/dashboard|\/onboarding/);
  });
});
