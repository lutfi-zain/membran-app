/**
 * Proper User Flow: Create Pricing Tiers
 *
 * Waits for React hydration before querying elements
 * Run with: npx playwright test --project=chromium --headed 902-proper-user-flow.spec.ts
 */

import { test, expect } from '@playwright/test';

const WEB_URL = process.env.WEB_URL || 'http://localhost:5173';

test.describe('Proper User Flow: Create Pricing Tiers', () => {
  test('Create pricing tiers with proper React hydration wait', async ({ page }) => {
    console.log('\n🚀 Starting proper user flow...\n');

    // Step 1: Navigate to onboarding/pricing
    await page.goto(WEB_URL + '/onboarding/pricing');

    // CRITICAL: Wait for React to fully hydrate before querying
    // Wait for network idle AND page to be stable
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Extra wait for React hydration

    console.log('✅ Page loaded, React should be hydrated\n');

    // Step 2: Check for Discord sign-in
    const signInText = page.getByText('Sign in with Discord');
    if (await signInText.isVisible({ timeout: 5000 })) {
      console.log('⚠️  Discord sign-in required - please authorize...\n');
      await signInText.click();
      await page.waitForURL(/onboarding|localhost/, { timeout: 120000 });
      console.log('✅ Discord authorized!\n');

      // Navigate back if needed
      if (!page.url().includes('pricing')) {
        await page.goto(WEB_URL + '/onboarding/pricing');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      }
    }

    // Step 3: Wait for the page to show content
    // Look for the header text which should always be present
    await expect(page.getByText('Configure Your Pricing Tiers')).toBeVisible({ timeout: 10000 });
    console.log('✅ Page content is visible\n');

    // Step 4: Take screenshot to verify state
    await page.screenshot({ path: 'test-results/proper-flow-start.png' });
    console.log('📸 Screenshot saved\n');

    // Step 5: Look for the "Create First Tier" button
    // The button is inside the TierList component
    console.log('🔍 Looking for "Create First Tier" button...\n');

    // Try multiple approaches to find the button
    let clicked = false;

    // Approach 1: By text content (exact match)
    try {
      const createButton = page.getByText('Create First Tier', { exact: true });
      if (await createButton.isVisible({ timeout: 5000 })) {
        console.log('✅ Found button by exact text!\n');
        await createButton.click();
        clicked = true;
      }
    } catch (e) {
      console.log('❌ Not found by exact text\n');
    }

    // Approach 2: By text content (case insensitive)
    if (!clicked) {
      try {
        const createButton = page.getByText(/create first tier/i);
        if (await createButton.isVisible({ timeout: 3000 })) {
          console.log('✅ Found button by regex text!\n');
          await createButton.click();
          clicked = true;
        }
      } catch (e) {
        console.log('❌ Not found by regex\n');
      }
    }

    // Approach 3: Get all buttons and click the right one
    if (!clicked) {
      console.log('🔍 Trying to find button by iterating all buttons...\n');

      const allButtons = page.locator('button');
      const count = await allButtons.count();

      console.log(`Found ${count} button(s) total\n`);

      for (let i = 0; i < count; i++) {
        const button = allButtons.nth(i);
        try {
          const isVisible = await button.isVisible({ timeout: 1000 });
          if (isVisible) {
            const text = await button.textContent();
          console.log(`Button ${i}: "${text?.trim()}"`);

            if (text && /create.*first.*tier/i.test(text)) {
              console.log(`✅ Clicking button: "${text}"\n`);
              await button.click();
              clicked = true;
              break;
            }
          }
        } catch (e) {
          // Button might not be visible or accessible
          continue;
        }
      }
    }

    if (!clicked) {
      console.log('❌ Could not find or click "Create First Tier" button\n');
      console.log('Taking screenshot for debugging...\n');
      await page.screenshot({ path: 'test-results/proper-flow-no-button.png', fullPage: true });

      // Get page HTML for debugging
      const html = await page.content();
      console.log('Page contains "Create First Tier":', /create first tier/i.test(html));
      console.log('Page contains "button":', /button/i.test(html));
      console.log('Page contains "Create":', /create/i.test(html));
    } else {
      console.log('✅ Button clicked!\n');

      // Wait for form to appear
      await page.waitForTimeout(2000);

      // Step 6: Fill out the tier form
      console.log('🔍 Looking for tier form inputs...\n');

      const nameInput = page.locator('input').filter({ hasText: '' }).first();
      const visibleInputs = page.locator('input:visible');

      const inputCount = await visibleInputs.count();
      console.log(`Found ${inputCount} visible input(s)\n`);

      if (inputCount > 0) {
        // Fill first input (likely name)
        const firstInput = visibleInputs.nth(0);
        await firstInput.fill('Basic Tier');
        console.log('✅ Filled first input: Basic Tier\n');

        // Fill second input if exists (likely price)
        if (inputCount > 1) {
          const secondInput = visibleInputs.nth(1);
          await secondInput.fill('10000');
          console.log('✅ Filled second input: 10000\n');
        }

        // Fill third input if exists (likely duration)
        if (inputCount > 2) {
          const thirdInput = visibleInputs.nth(2);
          await thirdInput.fill('30');
          console.log('✅ Filled third input: 30\n');
        }

        // Step 7: Submit the form
        console.log('🔍 Looking for submit button...\n');

        // Try to find Save/Create button
        const submitButton = page.getByRole('button', { name: /save|create|submit/i }).or(
          page.locator('button[type="submit"]')
        );

        if (await submitButton.isVisible({ timeout: 3000 })) {
          await submitButton.first().click();
          console.log('✅ Submit button clicked!\n');

          // Wait for creation
          await page.waitForTimeout(3000);
        } else {
          console.log('❌ No submit button found\n');
        }
      } else {
        console.log('❌ No form inputs found\n');
      }

      // Step 8: Verify tier was created
      await page.screenshot({ path: 'test-results/proper-flow-end.png' });

      // Check pricing page
      await page.goto(WEB_URL + '/pricing');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const subscribeButtons = page.getByRole('button', { name: /subscribe/i });
      const subCount = await subscribeButtons.count();

      console.log(`\n🔍 Subscribe buttons on pricing page: ${subCount}\n`);

      if (subCount > 0) {
        console.log('✅✅✅ SUCCESS! Pricing tiers are ready! ✅✅✅\n');
      } else {
        console.log('❌ Still no subscribe buttons\n');
      }
    }

    // Keep browser open for 60 seconds for manual interaction
    console.log('Browser will stay open for 60 seconds for manual interaction...\n');
    await page.waitForTimeout(60000);
  });
});
