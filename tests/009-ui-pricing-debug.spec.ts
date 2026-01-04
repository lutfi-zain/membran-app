/**
 * UI Debug Test - See what's actually loading
 */

import { test } from '@playwright/test';

const WEB_URL = process.env.WEB_URL || 'http://localhost:5173';

test('Debug: See what loads on pricing page', async ({ page }) => {
  // Listen for console messages
  page.on('console', msg => {
    console.log(`Browser console [${msg.type()}]:`, msg.text());
  });

  // Listen for errors
  page.on('pageerror', error => {
    console.error(`Browser error:`, error);
  });

  // Navigate to pricing page
  await page.goto(WEB_URL + '/pricing', { waitUntil: 'networkidle' });

  // Wait a bit more for any dynamic content
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: 'debug-pricing-page.png', fullPage: true });

  // Get page title
  const title = await page.title();
  console.log('Page title:', title);

  // Get all text content
  const bodyText = await page.locator('body').textContent();
  console.log('Page content length:', bodyText?.length);
  console.log('Page content preview:', bodyText?.substring(0, 500));

  // Check for any error messages
  const hasError = await page.locator('text=/error|Error|ERROR').count();
  console.log('Error count:', hasError);

  // List all h1, h2, h3 elements
  const headings = await page.locator('h1, h2, h3').allTextContents();
  console.log('Headings found:', headings);
});

test('Debug: See what loads on root', async ({ page }) => {
  page.on('console', msg => {
    console.log(`Browser console [${msg.type()}]:`, msg.text());
  });

  await page.goto(WEB_URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const title = await page.title();
  console.log('Root page title:', title);

  await page.screenshot({ path: 'debug-root-page.png', fullPage: true });
});

test('Debug: Navigate from root to pricing', async ({ page }) => {
  page.on('console', msg => {
    console.log(`Browser console [${msg.type()}]:`, msg.text());
  });

  await page.goto(WEB_URL + '/');
  await page.waitForTimeout(1000);

  // Try to navigate to pricing
  await page.goto(WEB_URL + '/pricing');
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'debug-navigate-to-pricing.png', fullPage: true });

  const url = page.url();
  console.log('Final URL:', url);
});
