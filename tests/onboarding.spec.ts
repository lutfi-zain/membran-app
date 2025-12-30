import { test, expect } from "@playwright/test";

test.describe("Onboarding Flow", () => {
  test("should navigate to bot onboarding when clicking Start Onboarding", async ({ page }) => {
    // Go to onboarding page
    await page.goto("http://localhost:5173/onboarding");
    await page.waitForLoadState("networkidle");

    console.log("📄 On onboarding page");

    // Find the Start Onboarding button
    const startButton = page.locator('button:has-text("Start Onboarding")');
    await expect(startButton).toBeVisible({ timeout: 5000 });

    console.log("✅ Found 'Start Onboarding' button");

    // Click the button
    await startButton.click();

    // Wait for navigation to /onboarding/bot
    await page.waitForURL("**/onboarding/bot", { timeout: 5000 });

    const currentUrl = page.url();
    console.log("📄 Navigated to:", currentUrl);

    // Verify we're on the bot onboarding page
    expect(currentUrl).toContain("/onboarding/bot");

    console.log("✅ Successfully navigated to bot onboarding page!");
  });

  test("complete full onboarding flow with Discord OAuth", async ({ page, context }) => {
    test.setTimeout(300000); // 5 minutes for manual Discord authorization

    // Step 1: Create account via API
    const email = `onboarding-full-${Date.now()}@example.com`;
    const password = "TestPass123";

    const signupResponse = await fetch("http://localhost:8787/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    expect(signupResponse.ok).toBeTruthy();

    // Get session cookie and set in browser
    const setCookieHeader = signupResponse.headers.get("set-cookie");
    const match = setCookieHeader?.match(/auth_session=([^;]+)/);
    if (match) {
      await context.addCookies([
        {
          name: "auth_session",
          value: match[1],
          domain: "localhost",
          path: "/",
        },
      ]);
    }

    console.log("✅ User created:", email);

    // Step 2: Go to onboarding page
    await page.goto("http://localhost:5173/onboarding");
    await page.waitForLoadState("networkidle");

    console.log("📄 On onboarding page");

    // Step 3: Click Start Onboarding
    const startButton = page.locator('button:has-text("Start Onboarding")');
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await startButton.click();

    await page.waitForURL("**/onboarding/bot", { timeout: 5000 });
    console.log("✅ Clicked Start Onboarding, now on bot page");

    // Step 4: Click Invite Discord Bot button
    const inviteButton = page.locator('button:has-text("Invite Bot to Server")');
    await expect(inviteButton).toBeVisible({ timeout: 5000 });

    console.log("✅ Found Invite Bot to Server button");

    // Set up listener for OAuth URL
    let oauthUrl = "";
    page.route("**/api/bot/invite", async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      oauthUrl = data.authorizationUrl;
      console.log("🔗 OAuth URL:", oauthUrl);
      return route.fulfill({ response });
    });

    // Click the invite button
    await inviteButton.click();
    await page.waitForTimeout(2000);

    if (!oauthUrl) {
      console.log("⚠️ OAuth URL not captured via route interception");
    }

    console.log("\n" + "=".repeat(70));
    console.log("🌂 DISCORD BOT AUTHORIZATION REQUIRED");
    console.log("=".repeat(70));
    console.log("Please authorize the bot in the opened tab");
    console.log("=".repeat(70) + "\n");

    // Step 5: Poll for bot connection status
    let botConnected = false;
    let maxAttempts = 300; // 5 minutes

    for (let i = 0; i < maxAttempts; i++) {
      await page.waitForTimeout(1000);

      // Check current URL for success indicator
      const currentUrl = page.url();
      if (currentUrl.includes("connected=success") || currentUrl.includes("connected=bot")) {
        botConnected = true;
        console.log("\n✅ Bot connection successful!");
        break;
      }

      // Show progress every 10 seconds
      if (i % 10 === 0 && i > 0) {
        console.log(`⏳ Waiting for bot authorization... (${i}s / 300s)`);
      }
    }

    if (botConnected) {
      console.log("\n" + "=".repeat(70));
      console.log("✅ ONBOARDING COMPLETE!");
      console.log("=".repeat(70));
    } else {
      console.log("\n⏱️ Timeout - bot authorization not completed");
    }

    // Take final screenshot
    await page.screenshot({ path: `onboarding-complete-${Date.now()}.png`, fullPage: true });

    expect(botConnected).toBeTruthy();
  });

  test("onboarding page should be accessible after signup", async ({ page, context }) => {
    // Create a new user via API
    const email = `onboarding-test-${Date.now()}@example.com`;
    const password = "TestPass123";

    const signupResponse = await fetch("http://localhost:8787/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    expect(signupResponse.ok).toBeTruthy();

    // Get session cookie
    const setCookieHeader = signupResponse.headers.get("set-cookie");
    const match = setCookieHeader?.match(/auth_session=([^;]+)/);
    if (match) {
      await context.addCookies([
        {
          name: "auth_session",
          value: match[1],
          domain: "localhost",
          path: "/",
        },
      ]);
    }

    console.log("✅ User created:", email);

    // Go to onboarding page
    await page.goto("http://localhost:5173/onboarding");
    await page.waitForLoadState("networkidle");

    // Verify we see the welcome message
    const welcomeText = page.locator('text=Welcome to Membran!');
    await expect(welcomeText).toBeVisible({ timeout: 5000 });

    console.log("✅ Onboarding page accessible after signup");

    // Verify Start Onboarding button is present
    const startButton = page.locator('button:has-text("Start Onboarding")');
    await expect(startButton).toBeVisible();

    console.log("✅ Start Onboarding button is present");
  });
});
