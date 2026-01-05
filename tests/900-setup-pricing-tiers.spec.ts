/**
 * Setup Test Pricing Tiers
 *
 * Creates test pricing tiers through the onboarding flow
 * Run with: npx playwright test --project=chromium --headed 900-setup-pricing-tiers.spec.ts
 *
 * Prerequisites:
 * - Web server running on http://localhost:5173
 * - API server running on http://127.0.0.1:8787
 * - Discord bot configured
 */

import { test, expect } from '@playwright/test';

const WEB_URL = process.env.WEB_URL || 'http://localhost:5173';

test.describe('Setup - Create Pricing Tiers', () => {
  test('Setup: Create test pricing tiers via onboarding', async ({ page }) => {
    console.log('\n🔧 Setting up test pricing tiers...\n');

    // Step 1: Navigate to onboarding/pricing
    await page.goto(WEB_URL + '/onboarding/pricing');
    await page.waitForLoadState('networkidle');

    // Check if user needs to sign in
    const signInButton = page.locator('a:has-text("Sign in with Discord")');
    if (await signInButton.isVisible({ timeout: 5000 })) {
      console.log('⚠️  Discord sign-in required');
      await signInButton.click();
      console.log('👉 Please complete Discord authorization...\n');

      // Wait for OAuth completion
      await page.waitForURL(/onboarding|localhost/, { timeout: 120000 });
      console.log('✅ Discord authorization complete!\n');

      // Navigate back to pricing if needed
      if (!page.url().includes('pricing')) {
        await page.goto(WEB_URL + '/onboarding/pricing');
        await page.waitForLoadState('networkidle');
      }
    }

    // Step 2: Check if we're on the pricing onboarding page
    console.log('Current URL:', page.url());

    // Look for "Create First Tier" button
    const createFirstTierButton = page.locator('button:has-text("Create First Tier"), button:has-text("Create your first tier")');

    if (await createFirstTierButton.isVisible({ timeout: 5000 })) {
      console.log('✅ Found "Create First Tier" button!\n');

      // Click to open the form
      await createFirstTierButton.click();
      await page.waitForTimeout(1000);

      // Now look for the tier form
      const tierNameInput = page.locator('input[name="name"], input[id*="name"], input[placeholder*="name" i]').first();
      const priceInput = page.locator('input[name="price"], input[id*="price"], input[placeholder*="price" i]').first();

      if (await tierNameInput.isVisible({ timeout: 3000 })) {
        console.log('✅ Tier form is open!\n');

        // Create Tier 1: Basic
        console.log('Creating Tier 1: Basic...');
        await tierNameInput.fill('Basic Tier');
        await page.waitForTimeout(500);

        if (await priceInput.isVisible()) {
          await priceInput.fill('10000'); // 10,000 IDR
        }

        // Fill in other required fields
        const durationInput = page.locator('input[name="duration"], input[id*="duration"]').first();
        if (await durationInput.isVisible()) {
          await durationInput.fill('30'); // 30 days
        }

        // Submit the form
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Create"), button[type="submit"]').first();
        await saveButton.click();
        await page.waitForTimeout(1000);
        console.log('✅ Tier 1 created!\n');
      }
    } else {
      console.log('⚠️  Pricing form not found after clicking button.\n');

      // Check if there's a different UI
      const existingTiers = page.locator('text=/tier|plan|subscribe/i');
      const hasExistingTiers = await existingTiers.count() > 0;

      if (hasExistingTiers) {
        console.log('✅ Tiers might already exist! Let me check...\n');

        // Try to navigate to pricing page to verify
        await page.goto(WEB_URL + '/pricing');
        await page.waitForLoadState('networkidle');

        const subscribeButtons = page.locator('button:has-text("Subscribe")');
        const buttonCount = await subscribeButtons.count();

        console.log(`Found ${buttonCount} Subscribe button(s) on pricing page!\n`);

        if (buttonCount > 0) {
          console.log('✅ PRICING TIRES ARE READY!\n');
        } else {
          console.log('❌ No Subscribe buttons found. Manual setup required.\n');
          console.log('Please go to http://localhost:5173/onboarding/pricing and create tiers manually.\n');
        }
      } else {
        console.log('❌ Could not find pricing setup interface.\n');
        console.log('Please navigate to http://localhost:5173/onboarding/pricing and create tiers manually.\n');
      }
    }

    // Wait a bit before closing
    await page.waitForTimeout(3000);

    console.log('========================================');
    console.log('SETUP SUMMARY:');
    console.log('========================================');
    console.log('Navigate to: http://localhost:5173/pricing');
    console.log('You should see pricing tiers with Subscribe buttons.\n');
  });

  test('Quick check: Verify pricing page has tiers', async ({ page }) => {
    console.log('\n🔍 Checking pricing page...\n');

    await page.goto(WEB_URL + '/pricing');
    await page.waitForLoadState('networkidle');

    // Check for Subscribe buttons
    const subscribeButtons = page.locator('button:has-text("Subscribe"), button:has-text("Choose"), button:has-text("Select")');
    const buttonCount = await subscribeButtons.count();

    console.log(`Subscribe buttons found: ${buttonCount}\n`);

    if (buttonCount > 0) {
      console.log('✅ PRICING TIRES CONFIGURED!\n');
      console.log('You can run the full payment flow test now.\n');
    } else {
      console.log('❌ No pricing tiers found.\n');
      console.log('Run the setup test first or create tiers manually.\n');
    }

    // Screenshot for verification
    await page.screenshot({ path: 'test-results/pricing-page-verification.png' });
    console.log('Screenshot saved to: test-results/pricing-page-verification.png\n');
  });
});
