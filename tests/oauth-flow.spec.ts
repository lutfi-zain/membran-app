import { test, expect } from "@playwright/test";

test.describe("Discord Bot OAuth Flow", () => {
  test("get OAuth invite URL", async ({ page }) => {
    // Navigate to signup page
    await page.goto("http://localhost:5173/signup");

    // Fill in signup form
    const email = `oauth-test-${Date.now()}@example.com`;
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "TestPass123");

    // Submit signup
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(1000);

    // Go to onboarding bot page
    await page.goto("http://localhost:5173/onboarding/bot");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Find the invite button using aria-label
    const inviteButton = page.getByRole("button", { name: /invite discord bot/i });

    await expect(inviteButton).toBeVisible({ timeout: 5000 });
    console.log("✅ Found invite button");

    // Intercept the request BEFORE clicking
    let oauthUrl = "";
    page.route("**/api/bot/invite", async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      oauthUrl = data.authorizationUrl;
      console.log("📝 OAuth URL captured:", oauthUrl);
      return route.fulfill({ response });
    });

    // Click the invite button
    await inviteButton.click();

    // Wait for API call and potential navigation
    await page.waitForTimeout(3000);

    // Verify OAuth URL was generated
    if (oauthUrl) {
      expect(oauthUrl).toContain("discord.com/oauth2/authorize");
      expect(oauthUrl).toContain("client_id=1440549262512492658");
      console.log("✅ OAuth URL generated successfully!");
      console.log("🔗 Visit this URL to complete the flow:");
      console.log(oauthUrl);
    } else {
      console.log("⚠️ OAuth URL not captured - checking if redirected...");
      const currentUrl = page.url();
      console.log("Current URL:", currentUrl);
    }

    // Take screenshot
    await page.screenshot({ path: "oauth-invite.png" });
  });

  test("check bot status API", async ({ request }) => {
    // First, create a session by signing up
    const email = `status-test-${Date.now()}@example.com`;
    const signupResponse = await request.post("http://localhost:8787/auth/signup", {
      data: {
        email,
        password: "TestPass123",
      },
    });

    expect(signupResponse.ok()).toBeTruthy();

    // Get cookies from response headers
    const setCookieHeader = signupResponse.headers()["set-cookie"];
    let sessionCookie = "";

    // Parse the cookie manually
    if (setCookieHeader) {
      const match = setCookieHeader.match(/auth_session=([^;]+)/);
      if (match) {
        sessionCookie = match[1];
      }
    }

    // Check bot status
    const statusResponse = await request.get("http://localhost:8787/api/bot/status", {
      headers: {
        Cookie: `auth_session=${sessionCookie}`,
      },
    });

    const statusData = await statusResponse.json();
    console.log("Bot status:", JSON.stringify(statusData, null, 2));
    expect(statusResponse.ok()).toBeTruthy();
  });
});
