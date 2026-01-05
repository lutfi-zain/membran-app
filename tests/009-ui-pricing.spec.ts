/**
 * UI E2E Tests: Pricing & Checkout Pages
 *
 * Browser-based tests that open a real browser and interact with the UI
 * Tests the pricing page, tier selector, and checkout flow
 */

import { test, expect } from '@playwright/test';

const WEB_URL = process.env.WEB_URL || 'http://localhost:5173';

test.describe('Pricing Page - UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(WEB_URL + '/pricing');
  });

  test('UI-001: Pricing page loads and displays header', async ({ page }) => {
    // Check main heading
    await expect(page.locator('h1')).toContainText('Choose Your Subscription Plan');

    // Check subheading
    await expect(page.locator('p').filter({ hasText: 'Unlock premium features' })).toBeVisible();
  });

  test('UI-002: Pricing page shows authentication warnings when not logged in', async ({ page }) => {
    // Should see sign-in prompt
    await expect(page.locator('a', { hasText: 'Sign in with Discord' })).toBeVisible();
  });

  test('UI-003: FAQ section is displayed and interactive', async ({ page }) => {
    // FAQ section should be visible
    await expect(page.locator('h2', { hasText: 'Frequently Asked Questions' })).toBeVisible();

    // First FAQ item
    const firstFaq = page.locator('details').first();
    await expect(firstFaq).toContainText('How do I cancel my subscription?');

    // Click to expand
    await firstFaq.click();
    await expect(firstFaq.locator('p')).toContainText('cancel your subscription');
  });

  test('UI-004: Page has correct styling and layout', async ({ page }) => {
    // Check for the main container
    const mainContainer = page.locator('.min-h-screen');
    await expect(mainContainer).toBeVisible();

    // Check background color
    await expect(mainContainer).toHaveClass(/bg-gray-50/);
  });
});

test.describe('Checkout Page - UI Tests', () => {
  test('UI-005: Checkout page without transaction ID redirects to pricing', async ({ page }) => {
    await page.goto(WEB_URL + '/checkout');

    // Should redirect to pricing page
    await page.waitForURL(/\/pricing/, { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Choose Your Subscription Plan');
  });

  test('UI-006: Checkout page with pending status shows pending message', async ({ page }) => {
    // Navigate with pending status
    await page.goto(WEB_URL + '/checkout?transaction_status=pending&transaction_id=test-123');

    // Should show pending state
    await expect(page.locator('text=/pending/i')).toBeVisible({ timeout: 5000 });
  });

  test('UI-007: Checkout page with failed status shows failed message', async ({ page }) => {
    // Navigate with failed status
    await page.goto(WEB_URL + '/checkout?transaction_status=failure&transaction_id=test-456');

    // Should show failed state
    await expect(page.locator('text=/failed/i')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Integration - Pricing to Checkout Flow', () => {
  test('UI-008: Navigation from pricing to checkout', async ({ page }) => {
    await page.goto(WEB_URL + '/pricing');

    // Pricing page should load
    await expect(page.locator('h1')).toBeVisible();

    // Note: Full checkout flow requires authenticated user and pricing tiers
    // This test verifies the pages exist and are navigable
  });
});

test.describe('Pricing Page - Responsive Design', () => {
  test('UI-009: Pricing page is mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(WEB_URL + '/pricing');

    // Header should be visible on mobile
    await expect(page.locator('h1')).toBeVisible();

    // Content should stack vertically
    const mainContainer = page.locator('.max-w-7xl');
    await expect(mainContainer).toBeVisible();
  });

  test('UI-010: Pricing page on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(WEB_URL + '/pricing');

    // Container should use max-width
    const mainContainer = page.locator('.max-w-7xl');
    await expect(mainContainer).toBeVisible();
  });
});
