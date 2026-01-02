import { test, expect } from "@playwright/test";

test("debug onboarding flow", async ({ page, context, request }) => {
  // First authenticate via Discord
  await page.goto("/login");

  // Check auth status
  const authResponse = await request.get("/api/auth/me");
  const authData = await authResponse.json();
  console.log("Auth Status:", authData);

  if (!authData.user) {
    // Need to authenticate
    console.log("Not authenticated, clicking Discord login...");
    const loginButton = page.getByRole("button", { name: /login with discord/i });
    await loginButton.click();

    // Wait for navigation to Discord or redirect back
    await page.waitForTimeout(5000);

    // Check if still on login page (need to click through Discord)
    if (page.url().includes("discord.com")) {
      console.log("On Discord page - this requires manual authentication");
      console.log("Discord OAuth URL:", page.url());
      return;
    }

    // Check auth again
    const authResponse2 = await request.get("/api/auth/me");
    const authData2 = await authResponse2.json();
    console.log("Auth after login:", authData2);
  }

  // Check onboarding state first
  const stateResponse = await request.get("/api/onboarding/state");
  const stateData = await stateResponse.json();
  console.log("Onboarding State:", JSON.stringify(stateData, null, 2));

  // Navigate to pricing page
  await page.goto("/onboarding/pricing");
  await page.waitForLoadState("networkidle");

  // Take a screenshot
  await page.screenshot({ path: "onboarding-pricing.png" });
  console.log("Current URL:", page.url());

  // Check if we have pricing tiers
  const hasTiers = await page.getByText(/pricing tier/i).isVisible();
  console.log("Has pricing tiers element:", hasTiers);

  // Try clicking complete setup if it exists
  const completeButton = page.getByText("Complete Setup");
  if (await completeButton.isVisible()) {
    console.log("Found Complete Setup button, clicking...");
    await completeButton.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "after-click.png" });
    console.log("Current URL after click:", page.url());

    // Check if we were redirected
    if (page.url().includes("/onboarding/bot")) {
      console.log("ERROR: Was redirected to /onboarding/bot instead of dashboard");
    }
  }

  // Check final state
  const stateResponse3 = await request.get("/api/onboarding/state");
  const stateData3 = await stateResponse3.json();
  console.log("Final Onboarding State:", JSON.stringify(stateData3, null, 2));
});
