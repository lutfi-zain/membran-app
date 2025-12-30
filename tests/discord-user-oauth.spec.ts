import { test, expect } from "@playwright/test";

test.describe("Discord User OAuth Flow - Manual Authorization", () => {
  test("complete user OAuth flow with manual Discord authorization", async ({ page, context }) => {
    // Increase timeout for manual Discord authorization
    test.setTimeout(300000); // 5 minutes

    // Step 1: Go to signup page
    await page.goto("http://localhost:5173/signup");
    await page.waitForLoadState("networkidle");
    console.log("📄 On signup page");

    // Step 2: Click "Continue with Discord" button
    const discordButton = page.locator('a[href*="/api/auth/discord"]');
    await expect(discordButton).toBeVisible({ timeout: 5000 });

    console.log("🔗 Found Discord button, clicking...");

    // Set up listener for redirect
    const redirectedUrl: string[] = [];
    page.on("load", () => {
      const url = page.url();
      if (url.includes("localhost:5173") && (url.includes("/onboarding") || url.includes("/dashboard") || url.includes("/login"))) {
        redirectedUrl.push(url);
        console.log("📩 Redirect detected:", url);
      }
    });

    // Click the Discord button
    await discordButton.click();

    // Wait a bit for the Discord page to open
    await page.waitForTimeout(2000);

    // Open new tab and wait for user to complete Discord authorization
    const discordPages = context.pages();
    const discordPage = discordPages.length > 1 ? discordPages[1] : page;

    console.log("\n" + "=".repeat(70));
    console.log("🌂 DISCORD AUTHORIZATION PAGE OPENED");
    console.log("=".repeat(70));
    console.log("⏳ Menunggu otorisasi Discord...");
    console.log("   (Anda punya 5 menit untuk menyelesaikan otorisasi)");
    console.log("=".repeat(70) + "\n");

    // Poll for redirect completion
    let callbackReceived = false;
    let finalUrl = "";
    let maxAttempts = 300; // 5 minutes

    for (let i = 0; i < maxAttempts; i++) {
      await page.waitForTimeout(1000);

      // Check if we've been redirected back to the app
      const currentUrl = page.url();
      if (currentUrl.includes("/onboarding") || currentUrl.includes("/dashboard")) {
        callbackReceived = true;
        finalUrl = currentUrl;
        console.log("\n" + "=".repeat(70));
        console.log("✅ DISCORD CONNECTION COMPLETE!");
        console.log("=".repeat(70));
        console.log("Final URL:", finalUrl);
        console.log("=".repeat(70) + "\n");
        break;
      }

      // Show progress every 10 seconds
      if (i % 10 === 0 && i > 0) {
        console.log(`⏳ Menunggu... (${i} detik / 300 detik)`);
      }
    }

    if (!callbackReceived) {
      console.log("\n⏱️  Waktu habis! Callback tidak diterima dalam 5 menit.");
    }

    // Step 3: Check the final state
    await page.waitForTimeout(2000);

    // Get current URL
    const currentUrl = page.url();
    console.log("📄 Current URL:", currentUrl);

    // Get cookies from the browser context
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === "auth_session");

    console.log("\n" + "=".repeat(70));
    console.log("🔍 FINAL STATE");
    console.log("=".repeat(70));
    console.log("URL:", currentUrl);
    console.log("Has session cookie:", !!sessionCookie);
    if (sessionCookie) {
      console.log("Session cookie value (first 20 chars):", sessionCookie.value.substring(0, 20) + "...");
    }

    // Check if we're logged in via API using the session cookie
    let meData;
    if (sessionCookie) {
      const meResponse = await fetch("http://localhost:8787/auth/me", {
        headers: {
          Cookie: `auth_session=${sessionCookie.value}`
        }
      });
      meData = await meResponse.json();

      console.log("Logged in:", !!meData.user);

      if (meData.user) {
        console.log("User ID:", meData.user.id);
        console.log("Email:", meData.user.email);
        console.log("Email Verified:", meData.user.emailVerified);
        console.log("Discord ID:", meData.user.discordId || "Not connected");
      }
    } else {
      console.log("Logged in: false (no session cookie)");
      meData = { user: null };
    }
    console.log("=".repeat(70) + "\n");

    // Take final screenshot
    await page.screenshot({ path: `discord-user-test-${Date.now()}.png`, fullPage: true });
    console.log("📸 Screenshot saved: discord-user-test-" + Date.now() + ".png");

    // Assertions
    expect(callbackReceived).toBeTruthy();
    expect(meData.user).toBeTruthy();
    expect(meData.user.discordId).toBeTruthy();
  });
});
