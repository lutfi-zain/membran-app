import { test } from "@playwright/test";

test("debug button click", async ({ page }) => {
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
  await page.waitForTimeout(2000);

  // Check the HTML structure
  const tierList = page.locator('text=Configure your premium membership options');
  const tierListCount = await tierList.count();
  console.log("TIER LIST EMPTY MESSAGE COUNT:", tierListCount);

  // Check if canAddMore is true by checking if there are 5 tiers already
  const tierCards = page.locator('[class*="tier"], [class*="pricing"]').all();
  console.log("TIER CARDS COUNT:", tierCards.length);

  // Check all button texts
  const allButtons = page.locator('button');
  const count = await allButtons.count();
  console.log("TOTAL BUTTONS:", count);

  for (let i = 0; i < Math.min(count, 10); i++) {
    const btn = allButtons.nth(i);
    const text = await btn.textContent();
    const isVisible = await btn.isVisible();
    const isEnabled = await btn.isEnabled();
    console.log(`  BUTTON ${i}: "${text?.trim()}" visible=${isVisible} enabled=${isEnabled}`);
  }

  // Look specifically for the create button inside the TierList
  const dashedBox = page.locator('.border-dashed');
  const boxCount = await dashedBox.count();
  console.log("DASHED BOX COUNT:", boxCount);

  if (boxCount > 0) {
    const boxContent = await dashedBox.first().textContent();
    console.log("BOX CONTENT:", boxContent?.substring(0, 200));

    // Check for button inside the dashed box
    const buttonInBox = dashedBox.first().locator('button');
    const btnInBoxCount = await buttonInBox.count();
    console.log("BUTTON IN DASHED BOX:", btnInBoxCount);

    if (btnInBoxCount > 0) {
      const btnText = await buttonInBox.textContent();
      const btnVisible = await buttonInBox.isVisible();
      const btnEnabled = await buttonInBox.isEnabled();
      console.log("  TEXT:", btnText, "VISIBLE:", btnVisible, "ENABLED:", btnEnabled);

      if (btnVisible && btnEnabled) {
        console.log("CLICKING BUTTON...");
        await buttonInBox.click();

        // Wait longer for React state update
        await page.waitForTimeout(5000);

        console.log("AFTER WAIT - checking page state...");

        // Check what's on the page now
        const bodyText = await page.locator("body").textContent();
        console.log("BODY TEXT LENGTH:", bodyText?.length);
        console.log("BODY SNIPPET:", bodyText?.substring(0, 500));

        const backBtn = page.locator('text=Back to tiers');
        const hasBack = await backBtn.count();
        console.log("HAS BACK BUTTON:", hasBack);

        const nameInput = page.locator('input#tier-name');
        const hasInput = await nameInput.count();
        console.log("HAS NAME INPUT:", hasInput);

        // Check if form modal is visible
        const formVisible = await page.locator('text=Create Tier').count();
        console.log("FORM CREATE BUTTON VISIBLE:", formVisible);
      }
    }
  }

  await page.screenshot({ path: "test-results/debug-button-click.png" });
});
