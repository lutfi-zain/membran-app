import { test } from "@playwright/test";

test("debug - see what's on the page", async ({ page }) => {
  // Create user and get session
  const timestamp = Date.now();
  const signupResponse = await fetch("http://localhost:8787/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `debug-${timestamp}@example.com`, password: "TestPass123" }),
  });

  const setCookieHeader = signupResponse.headers.get("set-cookie");
  const match = setCookieHeader?.match(/auth_session=([^;]+)/);
  if (match) {
    await page.context().addCookies([
      { name: "auth_session", value: match[1], domain: "localhost", path: "/" }
    ]);
  }

  await page.goto("http://localhost:5173/onboarding/pricing");
  await page.waitForTimeout(3000);

  // Get page content
  const content = await page.content();
  console.log("PAGE LENGTH:", content.length);
  const bodyText = await page.locator("body").textContent();
  console.log("BODY TEXT:", bodyText?.substring(0, 500));

  // Take screenshot
  await page.screenshot({ path: "test-results/debug-screenshot.png" });
});
