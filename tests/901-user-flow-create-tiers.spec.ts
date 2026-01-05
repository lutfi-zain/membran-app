/**
 * Full User Flow: Create Pricing Tiers
 *
 * Follows the actual user flow to create pricing tiers
 * Run with: npx playwright test --project=chromium --headed 901-user-flow-create-tiers.spec.ts
 */

import { test, expect } from '@playwright/test';

const WEB_URL = process.env.WEB_URL || 'http://localhost:5173';

test.describe('User Flow: Create Pricing Tiers', () => {
  test('Create pricing tiers following actual user flow', async ({ page }) => {
    console.log('\n🚀 Starting user flow to create pricing tiers...\n');

    // Step 1: Navigate to onboarding/pricing
    await page.goto(WEB_URL + '/onboarding/pricing');
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to onboarding/pricing');

    // Step 2: Handle Discord OAuth if needed
    const signInButton = page.getByText('Sign in with Discord');
    if (await signInButton.isVisible({ timeout: 5000 })) {
      console.log('⚠️  Discord sign-in required');
      await signInButton.click();
      console.log('👉 Please complete Discord authorization...\n');

      // Wait for OAuth completion (user interaction)
      await page.waitForURL(/onboarding|localhost/, { timeout: 120000 });
      console.log('✅ Discord authorization complete!\n');

      // Navigate back to pricing if needed
      if (!page.url().includes('pricing')) {
        await page.goto(WEB_URL + '/onboarding/pricing');
        await page.waitForLoadState('networkidle');
      }
    }

    // Step 3: Look for ANY button that might create a tier
    // Try multiple selectors
    console.log('🔍 Looking for tier creation button...\n');

    // Take a screenshot to see what's on the page
    await page.screenshot({ path: 'test-results/onboarding-pricing-page.png' });
    console.log('📸 Screenshot saved: test-results/onboarding-pricing-page.png\n');

    // Try different button patterns
    const possibleButtons = [
      page.getByRole('button', { name: /create/i }),
      page.getByRole('button', { name: /add/i }),
      page.getByRole('button', { name: /first tier/i }),
      page.getByRole('button', { name: /configure/i }),
      page.locator('button').filter({ hasText: /create|add|first/i }),
      page.locator('button.indigo-600'), // Indigo colored buttons
      page.locator('button[class*="bg-indigo"]'), // Any indigo button
    ];

    let buttonFound = false;
    for (const button of possibleButtons) {
      const count = await button.count();
      console.log(`Found ${count} button(s) with selector`);

      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const btn = button.nth(i);
          const text = await btn.textContent();
          console.log(`Button ${i}: "${text}"`);

          if (text && /create|add|first|tier|configure/i.test(text)) {
            console.log(`✅ Clicking button: "${text}"\n`);
            await btn.click();
            buttonFound = true;
            break;
          }
        }
        if (buttonFound) break;
      }
    }

    if (!buttonFound) {
      console.log('⚠️  No tier creation button found via selectors.');
      console.log('Trying to find ANY clickable element...\n');

      // Last resort: Find all buttons and log them
      const allButtons = page.locator('button');
      const buttonCount = await allButtons.count();
      console.log(`Total buttons on page: ${buttonCount}\n`);

      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const btn = allButtons.nth(i);
        const text = await btn.textContent();
        const isVisible = await btn.isVisible();
        console.log(`Button ${i}: "${text?.trim()}" (visible: ${isVisible})`);
      }
    }

    // Wait a bit for any modal/form to appear
    await page.waitForTimeout(2000);

    // Step 4: Check for form inputs
    console.log('\n🔍 Looking for form inputs...\n');

    const allInputs = page.locator('input');
    const inputCount = await allInputs.count();
    console.log(`Found ${inputCount} input(s)`);

    for (let i = 0; i < inputCount; i++) {
      const input = allInputs.nth(i);
      const placeholder = await input.getAttribute('placeholder');
      const name = await input.getAttribute('name');
      const id = await input.getAttribute('id');
      const type = await input.getAttribute('type');
      console.log(`Input ${i}: name="${name}" id="${id}" type="${type}" placeholder="${placeholder}"`);
    }

    // Step 5: Try to fill out the form if we find name/price inputs
    const nameInput = page.locator('input[name*="name" i], input[id*="name" i], input[placeholder*="name" i]').first();
    const priceInput = page.locator('input[name*="price" i], input[id*="price" i], input[placeholder*="price" i]').first();

    if (await nameInput.isVisible({ timeout: 3000 })) {
      console.log('\n✅ Found tier form! Filling it out...\n');

      await nameInput.fill('Basic Tier');
      console.log('✅ Filled name: Basic Tier');

      if (await priceInput.isVisible({ timeout: 1000 })) {
        await priceInput.fill('10000');
        console.log('✅ Filled price: 10000');
      }

      // Look for duration input
      const durationInput = page.locator('input[name*="duration" i], input[id*="duration" i]').first();
      if (await durationInput.isVisible({ timeout: 1000 })) {
        await durationInput.fill('30');
        console.log('✅ Filled duration: 30 days');
      }

      // Look for submit button
      console.log('\n🔍 Looking for submit button...\n');
      const submitButtons = [
        page.getByRole('button', { name: /save|create|submit/i }),
        page.locator('button[type="submit"]'),
        page.locator('button').filter({ hasText: /save|create|submit/i }),
      ];

      for (const btn of submitButtons) {
        if (await btn.isVisible({ timeout: 1000 })) {
          const text = await btn.textContent();
          console.log(`✅ Found submit button: "${text}"`);
          await btn.click();
          console.log('✅ Clicked submit button\n');
          break;
        }
      }

      // Wait for creation
      await page.waitForTimeout(3000);

      // Step 6: Verify tier was created
      console.log('🔍 Verifying tier creation...\n');

      // Check for success message or tier in list
      const pageContent = await page.content();
      const hasTier = /basic tier|basic|10000/i.test(pageContent);

      if (hasTier) {
        console.log('✅ TIER CREATED SUCCESSFULLY!\n');
      } else {
        console.log('⚠️  Could not verify tier creation.\n');
      }
    } else {
      console.log('\n❌ No form found. Tier creation may require different flow.\n');
    }

    // Step 7: Final screenshot
    await page.screenshot({ path: 'test-results/after-tier-creation.png', fullPage: true });
    console.log('📸 Final screenshot saved: test-results/after-tier-creation.png\n');

    // Step 8: Check pricing page
    console.log('🔍 Checking pricing page...\n');
    await page.goto(WEB_URL + '/pricing');
    await page.waitForLoadState('networkidle');

    const subscribeButtons = page.getByRole('button', { name: /subscribe|choose|select/i });
    const subCount = await subscribeButtons.count();

    console.log(`Subscribe buttons found: ${subCount}\n`);

    if (subCount > 0) {
      console.log('✅✅✅ PRICING TIRES ARE READY! ✅✅✅\n');
      console.log('You can now run the full payment flow test!');
    } else {
      console.log('❌ Still no subscribe buttons. Manual setup needed.\n');
      console.log('Go to: http://localhost:5173/onboarding/pricing\n');
    }

    // Keep page open for manual interaction
    console.log('========================================');
    console.log('Browser will stay open for 30 seconds');
    console.log('========================================\n');
    await page.waitForTimeout(30000);
  });
});
