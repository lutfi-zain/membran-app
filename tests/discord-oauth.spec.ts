import { test, expect } from "@playwright/test";

test.describe("Discord Bot OAuth Flow - Manual Discord Auth", () => {
  test("complete OAuth flow with manual Discord authorization", async ({ page, context }) => {
    // Increase timeout for manual Discord authorization
    test.setTimeout(300000); // 5 minutes

    // Step 1: Sign up via API to get proper session
    const email = `test-${Date.now()}@example.com`;

    console.log("📝 Creating account:", email);

    const signupResponse = await page.request.post("http://localhost:8787/auth/signup", {
      headers: { "Content-Type": "application/json" },
      data: {
        email,
        password: "TestPass123"
      }
    });

    // Get session from response
    const setCookieHeader = signupResponse.headers()["set-cookie"];
    let sessionCookie = "";

    if (setCookieHeader) {
      const match = setCookieHeader.match(/auth_session=([^;]+)/);
      if (match) {
        sessionCookie = match[1];
      }
    }

    if (!sessionCookie) {
      throw new Error("Failed to get session cookie");
    }

    console.log("✅ Account created!");
    console.log("🍪 Session:", sessionCookie.substring(0, 20) + "...");

    // Set cookie in browser context
    await context.addCookies([{
      name: "auth_session",
      value: sessionCookie,
      domain: "localhost",
      path: "/"
    }]);

    // Step 2: Go to bot onboarding page
    await page.goto("http://localhost:5173/onboarding/bot");
    await page.waitForLoadState("networkidle");
    console.log("📄 On bot page");

    // Step 3: Get OAuth invite URL
    const inviteResponse = await page.request.post("http://localhost:8787/api/bot/invite", {
      headers: {
        "Content-Type": "application/json",
        "Origin": "http://localhost:5173",
        "Cookie": `auth_session=${sessionCookie}`
      }
    });

    const inviteData = await inviteResponse.json();
    const oauthUrl = inviteData.authorizationUrl;
    const state = inviteData.state;

    console.log("\n" + "=".repeat(70));
    console.log("🔗 OAUTH URL SIAP!");
    console.log("=".repeat(70));
    console.log(oauthUrl);
    console.log("=".repeat(70));
    console.log("\n⏸️  PILIH SALAH SATU:");
    console.log("   A. Copy URL di atas & buka manual di browser");
    console.log("   B. Tunggu tab Discord terbuka otomatis...");
    console.log("=".repeat(70) + "\n");

    // Step 4: Open new tab with Discord OAuth
    const discordPage = await context.newPage();

    // Set up a listener for when Discord redirects back
    let callbackUrl = "";
    discordPage.on("load", () => {
      const url = discordPage.url();
      if (url.includes("localhost:8787") || url.includes("connected=")) {
        callbackUrl = url;
        console.log("📩 Callback detected:", url);
      }
    });

    await discordPage.goto(oauthUrl);

    console.log("🌂 Halaman Discord terbuka di tab baru");
    console.log("⏳ Menunggu otorisasi Discord...");
    console.log("   (Anda punya 5 menit untuk menyelesaikan otorisasi)");

    // Wait for user to complete Discord authorization
    let callbackReceived = false;
    let maxAttempts = 300; // 5 minutes

    for (let i = 0; i < maxAttempts; i++) {
      // Use a shorter delay and check more frequently
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check bot status using API request (doesn't require page)
      try {
        const statusResponse = await fetch("http://localhost:8787/api/bot/status", {
          headers: {
            "Cookie": `auth_session=${sessionCookie}`
          }
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();

          if (statusData.connected) {
            callbackReceived = true;
            console.log("\n" + "=".repeat(70));
            console.log("✅ BOT TERHUBUNG!");
            console.log("=".repeat(70));
            console.log("Server:", statusData.server?.name);
            console.log("Status:", statusData.server?.botStatus);
            console.log("Members:", statusData.server?.memberCount);
            console.log("Permissions:", statusData.server?.permissions);
            console.log("=".repeat(70) + "\n");
            break;
          }
        }
      } catch (e) {
        // Ignore errors during polling
      }

      // Show progress every 10 seconds
      if (i % 10 === 0 && i > 0) {
        console.log(`⏳ Menunggu... (${i} detik / 300 detik)`);
      }
    }

    if (!callbackReceived) {
      console.log("\n⏱️  Waktu habis! Callback tidak diterima dalam 5 menit.");
    }

    // Step 5: Verify final state
    await page.goto("http://localhost:5173/onboarding/bot");
    await page.waitForLoadState("networkidle");

    const finalUrl = page.url();
    console.log("📄 Final URL:", finalUrl);

    if (finalUrl.includes("connected=success") || finalUrl.includes("connected=bot")) {
      console.log("✅ BERHASIL! Bot terhubung!");
    } else if (finalUrl.includes("error=")) {
      console.log("❌ GAGAL! Ada error:", finalUrl.split("error=")[1]);
    }

    // Take final screenshot
    await page.screenshot({ path: `test-result-${Date.now()}.png`, fullPage: true });
    console.log("📸 Screenshot saved: test-result-" + Date.now() + ".png");

    expect(callbackReceived).toBeTruthy();
  });
});
