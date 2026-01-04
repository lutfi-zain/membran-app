/**
 * Network Debug Test - See all requests and failures
 */

import { test, expect } from '@playwright/test';

const WEB_URL = process.env.WEB_URL || 'http://localhost:5173';

test('Debug: Monitor all network requests on pricing page', async ({ page }) => {
  const failedRequests: Array<{ url: string; status: number; resourceType: string }> = [];
  const allRequests: string[] = [];

  // Monitor all requests
  page.on('request', request => {
    const url = request.url();
    allRequests.push(`${request.method()} ${url}`);
    console.log(`➡️  Request: ${request.method()} ${url}`);
  });

  // Monitor responses
  page.on('response', response => {
    const status = response.status();
    const url = response.url();
    const resourceType = response.request().resourceType();

    console.log(`${status === 200 ? '✅' : '❌'} Response: ${status} ${resourceType} - ${url}`);

    if (status >= 400) {
      failedRequests.push({ url, status, resourceType });
    }
  });

  // Monitor console
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' || text.includes('404') || text.includes('Failed to load')) {
      console.error(`🔴 Console [${msg.type()}]:`, text);
    }
  });

  page.on('pageerror', error => {
    console.error(`🔴 Page Error:`, error.message);
  });

  // Navigate to pricing page
  console.log('\n=== Navigating to pricing page ===\n');
  await page.goto(WEB_URL + '/pricing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Print summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total requests: ${allRequests.length}`);
  console.log(`Failed requests: ${failedRequests.length}`);

  if (failedRequests.length > 0) {
    console.log('\n❌ FAILED REQUESTS:');
    failedRequests.forEach(({ url, status, resourceType }) => {
      console.log(`  - ${status} ${resourceType}: ${url}`);
    });
  }

  // Verify Test 1.1 requirements
  console.log('\n=== TEST 1.1 VERIFICATION ===');

  // Check page loads without critical errors
  const title = await page.title();
  console.log(`✅ Page title: "${title}"`);

  // Check for expected heading
  const mainHeading = page.locator('h1');
  await expect(mainHeading).toBeVisible();
  const headingText = await mainHeading.textContent();
  console.log(`✅ Main heading visible: "${headingText}"`);

  // Check subheading
  const hasSubheading = await page.locator('text=/unlock premium features/i').count();
  console.log(`${hasSubheading > 0 ? '✅' : '⚠️'}  Subheading about premium features: ${hasSubheading > 0 ? 'VISIBLE' : 'NOT FOUND'}`);

  // Check FAQ section
  const faqSection = page.locator('text=Frequently Asked Questions');
  const faqVisible = await faqSection.isVisible();
  console.log(`${faqVisible ? '✅' : '⚠️'}  FAQ section: ${faqVisible ? 'VISIBLE' : 'NOT FOUND'}`);

  // Take screenshot
  await page.screenshot({ path: 'debug-network-pricing.png', fullPage: true });
  console.log('📸 Screenshot saved: debug-network-pricing.png');

  // Final verdict
  console.log('\n=== TEST 1.1 RESULT ===');
  const testPasses =
    title.includes('Membran') &&
    headingText?.includes('Subscription') &&
    hasSubheading > 0 &&
    faqVisible;

  if (testPasses) {
    console.log('✅ TEST 1.1 PASSED - All content elements visible');
  } else {
    console.log('❌ TEST 1.1 FAILED - Some elements missing');
  }

  // Note about 404s
  if (failedRequests.length > 0) {
    console.log(`\n⚠️  Note: ${failedRequests.length} non-critical 404 errors detected`);
    console.log('These may be for missing assets, fonts, or API endpoints.');
  }
});
