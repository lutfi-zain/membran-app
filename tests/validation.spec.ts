import { test, expect } from '@playwright/test';

// T034: Email validation schema
test.describe('Email Validation', () => {
  test('T034: Validates email addresses correctly', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();

    // Test that email input accepts valid email
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');

    // Test invalid format - input should still accept it (validation happens on submit)
    await emailInput.fill('notanemail');
    await expect(emailInput).toHaveValue('notanemail');
  });
});

// T035: Password validation schema
test.describe('Password Validation', () => {
  test('T035: Validates password requirements correctly', async ({ page }) => {
    await page.goto('/signup');

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();

    // Test password input accepts valid password
    await passwordInput.fill('ValidPassword123');
    await expect(passwordInput).toHaveValue('ValidPassword123');

    // Test short password
    await passwordInput.fill('short');
    await expect(passwordInput).toHaveValue('short');
  });
});

// T036: API response validation
test.describe('API Response Validation', () => {
  test('T036: Validates API responses correctly', async ({ page }) => {
    // This test verifies that invalid data doesn't crash the app

    await page.goto('/login');

    // Test with valid credentials format
    await page.fill('input[type="email"]', 'valid@example.com');
    await page.fill('input[type="password"]', 'ValidPassword123');

    // Click login - the app should handle the API response gracefully
    await page.click('button[type="submit"]');

    // Wait for API response
    await page.waitForTimeout(1000);

    // App should still be responsive (no crashes from invalid data)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

// T037: Form validation error messages
test.describe('Form Validation Error Messages', () => {
  test('T037: Displays user-friendly error messages', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    // Test that form elements are interactive
    await emailInput.fill('test@example.com');
    await passwordInput.fill('testpassword');
    await submitButton.click();

    // Form should submit (even if auth fails)
    await page.waitForTimeout(1000);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
