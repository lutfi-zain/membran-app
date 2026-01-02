import { test } from "@playwright/test";

test("Manual interaction - Create First Tier button", async ({ page, context }) => {
  // Create test user and set session
  const timestamp = Date.now();
  const signupResponse = await fetch("http://localhost:8787/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `manual-${timestamp}@example.com`, password: "TestPass123" }),
  });

  const setCookieHeader = signupResponse.headers.get("set-cookie");
  const match = setCookieHeader?.match(/auth_session=([^;]+)/);
  if (match) {
    await page.context().addCookies([
      { name: "auth_session", value: match[1], domain: "localhost", path: "/" }
    ]);
  }

  // Navigate to pricing page
  await page.goto("http://localhost:5173/onboarding/pricing");
  await page.waitForLoadState("networkidle");

  console.log("\n=== BROWSER OPENED - PLEASE MANUALLY TEST ===");
  console.log("1. Click the 'Create First Tier' button");
  console.log("2. Check if the form appears");
  console.log("3. Check browser console (F12) for any React errors");
  console.log("4. When done, press Ctrl+C to stop the test\n");

  // Keep browser open indefinitely for manual testing
  await page.pause();
});
