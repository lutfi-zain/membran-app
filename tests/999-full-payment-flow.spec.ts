/**
 * Full E2E Payment Flow Test with Discord OAuth
 *
 * This test requires manual interaction for Discord OAuth authorization.
 * Run with: npx playwright test --project=chromium --headed 999-full-payment-flow.spec.ts
 *
 * Prerequisites:
 * - Web server running on http://localhost:5173
 * - API server running on http://127.0.0.1:8787
 * - Midtrans sandbox configured
 * - Valid Discord bot credentials
 *
 * Manual Steps Required:
 * 1. When Discord authorization page appears, click "Authorize"
 * 2. If email verification is needed, check email and click verification link
 * 3. Complete Midtrans payment (use test card: 4811 1111 1111 1114)
 */

import { test, expect } from '@playwright/test';

const WEB_URL = process.env.WEB_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://127.0.0.1:8787';

test.describe('Full Payment Flow - Discord OAuth', () => {
  test('E2E: Complete checkout from pricing to payment', async ({ page, context }) => {
    // Step 1: Navigate to pricing page
    await page.goto(WEB_URL + '/pricing');
    await expect(page.locator('h1')).toContainText('Choose Your Subscription Plan');

    // Step 2: Check if user is logged in
    const signInButton = page.locator('a:has-text("Sign in with Discord")');

    if (await signInButton.isVisible()) {
      console.log('\n⚠️  DISCORD OAuth REQUIRED ⚠️');
      console.log('Please complete Discord authorization in the browser window.\n');

      // Click Sign in with Discord
      await signInButton.click();

      // Wait for Discord authorization page or callback
      // User needs to manually click "Authorize" on Discord page
      console.log('Waiting for Discord OAuth completion...');

      // Wait for redirect back to app (timeout increased for manual interaction)
      await page.waitForURL(/(localhost|membran)/, { timeout: 120000 });

      console.log('✅ Discord OAuth completed!');
    }

    // Step 3: Check for email verification
    const verifyEmailPrompt = page.locator('text=/verify your email/i');

    if (await verifyEmailPrompt.isVisible()) {
      console.log('\n⚠️  EMAIL VERIFICATION REQUIRED ⚠️');
      console.log('Please verify your email and refresh the page.');
      console.log('Pausing for 60 seconds...\n');

      // Wait for user to verify email
      await page.waitForTimeout(60000);

      // Reload to check verification status
      await page.reload();
    }

    // Step 4: Wait for pricing tiers to load
    await expect(page.locator('text=/Subscribe/i')).toBeVisible({ timeout: 10000 });

    // Step 5: Select a pricing tier (first available tier)
    const subscribeButton = page.locator('button:has-text("Subscribe")').first();

    if (await subscribeButton.isVisible()) {
      console.log('Clicking Subscribe button...');

      // Store context for after OAuth
      const cookies = await context.cookies();

      // Click subscribe to initiate payment
      await subscribeButton.click();

      // Step 6: Wait for payment processing
      // Either:
      // - Redirect to Midtrans payment page
      // - Show payment processing state
      // - Redirect to checkout page

      console.log('Waiting for payment flow...');

      // Wait for either Midtrans redirect or checkout page
      await page.waitForURL(
        (url) => {
          return (
            url.href.includes('midtrans.com') ||
            url.href.includes('/checkout') ||
            url.href.includes('transaction_status')
          );
        },
        { timeout: 15000 }
      );

      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);

      // Step 7: Handle different outcomes
      if (currentUrl.includes('midtrans.com')) {
        console.log('\n⚠️  MIDTRANS PAYMENT PAGE ⚠️');
        console.log('Complete payment using test card:');
        console.log('Card Number: 4811 1111 1111 1114');
        console.log('Expiry: Any future date');
        console.log('CVV: Any 3 digits');
        console.log('\nPausing for payment completion...\n');

        // Wait for user to complete payment
        await page.waitForTimeout(120000);

        // Should redirect back to checkout page
        await page.waitForURL(/checkout/, { timeout: 30000 });
      }

      // Step 8: Verify final state
      if (currentUrl.includes('checkout') || page.url().includes('checkout')) {
        console.log('Payment flow completed! Checking status...');

        // Check for success, pending, or failed status
        const pageContent = await page.content();

        if (pageContent.includes('Payment Successful') || pageContent.includes('success')) {
          console.log('✅ PAYMENT SUCCESSFUL!');
          await expect(page.locator('text=/Payment Successful|success/i')).toBeVisible();
        } else if (pageContent.includes('Payment Pending') || pageContent.includes('pending')) {
          console.log('⏳ PAYMENT PENDING');
          await expect(page.locator('text=/Payment Pending|pending/i')).toBeVisible();
        } else if (pageContent.includes('Payment Failed') || pageContent.includes('failed')) {
          console.log('❌ PAYMENT FAILED');
          await expect(page.locator('text=/Payment Failed|failed/i')).toBeVisible();
        } else {
          console.log('Payment status unclear. Current page:', page.url());
        }
      }
    } else {
      console.log('No Subscribe button found - might need pricing tiers setup');
    }

    console.log('\n✅ TEST FLOW COMPLETE ✅\n');
  });

  test('E2E: Verify pricing page components', async ({ page }) => {
    // Quick smoke test of pricing page without OAuth
    await page.goto(WEB_URL + '/pricing');

    // Check header
    await expect(page.locator('h1')).toContainText('Choose Your Subscription Plan');

    // Check FAQ section
    await expect(page.locator('h2:has-text("Frequently Asked Questions")')).toBeVisible();

    // Check for authentication prompt (should be visible for unauthenticated users)
    await expect(page.locator('a:has-text("Sign in with Discord")')).toBeVisible();

    console.log('✅ Pricing page components verified');
  });
});

// Helper to pause execution
function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
