import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:8787";

test.describe("Onboarding Flow (User Story 3)", () => {
  test("should guide user through full onboarding flow", async ({ page }) => {
    // 1. Signup
    const email = `onboard-flow-${Date.now()}@example.com`;
    const password = "TestPass123";

    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign Up" }).click();

    // 2. Expect redirect to /onboarding then /onboarding/bot
    await expect(page).toHaveURL(/\/onboarding\/bot/);

    // Check progress indicator
    await expect(page.getByText("Connect Bot")).toBeVisible();
    await expect(page.getByText("Configure Pricing")).toBeVisible();

    // Simulate completing Step 2 (Bot Connection)
    // We can't easily click a "Connect Discord" button in E2E without mocking OAuth
    // So we'll use API to update state, then reload/verify navigation
    const context = page.context();
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "auth_session")?.value;
    expect(sessionCookie).toBeTruthy();

    await fetch(`${API_BASE}/api/onboarding/state`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth_session=${sessionCookie}`,
      },
      body: JSON.stringify({ botConnected: true }),
    });

    // Reload or navigate to trigger state check
    await page.goto("/onboarding");

    // 3. Expect redirect to /onboarding/pricing
    await expect(page).toHaveURL(/\/onboarding\/pricing/);

    // Simulate completing Step 3 (Pricing)
    await fetch(`${API_BASE}/api/onboarding/state`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth_session=${sessionCookie}`,
      },
      body: JSON.stringify({ pricingConfigured: true }),
    });

    // Reload to enable "Complete" button (if UI updates) or just use API to complete if button depends on state
    await page.reload();

    // 4. Click Complete Setup (assuming button exists on pricing page when tiers exist)
    // Or simpler: verify we can now POST to complete or navigating to /onboarding redirects to dashboard

    // Let's verify auto-complete logic by visiting /onboarding
    await page.goto("/onboarding");

    // 5. Expect redirect to /dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should resume onboarding from partial state", async ({ page }) => {
    // 1. Create user with partial state
    const email = `onboard-resume-${Date.now()}@example.com`;
    const password = "TestPass123";

    const signupResponse = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const setCookieHeader = signupResponse.headers.get("set-cookie");
    const match = setCookieHeader?.match(/auth_session=([^;]+)/);
    const sessionCookie = match ? match[1] : "";

    // Set botConnected = true
    await fetch(`${API_BASE}/api/onboarding/state`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `auth_session=${sessionCookie}`,
      },
      body: JSON.stringify({ botConnected: true }),
    });

    // 2. Login
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

    await page.goto("/login"); // Or just visit protected route to trigger redirect logic
    // Actually let's visit /onboarding directly to test resume logic
    await page.goto("/onboarding");

    // 3. Expect redirect to /onboarding/pricing (Step 3)
    await expect(page).toHaveURL(/\/onboarding\/pricing/);
  });
});
