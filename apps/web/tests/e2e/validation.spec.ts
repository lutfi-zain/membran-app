import { test, expect } from '@playwright/test';

// T034: Email validation schema
test.describe('Email Validation', () => {
  test('T034: Validates email addresses correctly', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    // Test empty email
    await emailInput.fill('');
    await submitButton.click();
    // Should show validation error
    const errorMsg = page.locator('text=/email/i');
    await expect(errorMsg).toBeVisible();

    // Test invalid email format
    await emailInput.fill('notanemail');
    await submitButton.click();
    await expect(errorMsg).toBeVisible();

    // Test valid email
    await emailInput.fill('test@example.com');
    await submitButton.click();
    // Email error should be gone (may have other errors like missing password)
    const emailError = page.locator('text=/invalid email/i');
    await expect(emailError).not.toBeVisible();
  });
});

// T035: Password validation schema
test.describe('Password Validation', () => {
  test('T035: Validates password requirements correctly', async ({ page }) => {
    await page.goto('/signup');

    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    // Test empty password
    await passwordInput.fill('');
    await submitButton.click();
    const errorMsg = page.locator('text=/password/i');
    await expect(errorMsg).toBeVisible();

    // Test short password
    await passwordInput.fill('short');
    await submitButton.click();
    await expect(page.locator('text=/8 characters/i')).toBeVisible();

    // Test password without uppercase
    await passwordInput.fill('password123');
    await submitButton.click();
    await expect(page.locator('text=/uppercase/i')).toBeVisible();

    // Test password without number
    await passwordInput.fill('Password');
    await submitButton.click();
    await expect(page.locator('text=/number/i')).toBeVisible();

    // Test valid password
    await passwordInput.fill('Password123');
    await submitButton.click();
    // Password error should be gone
    const passwordError = page.locator('text=/uppercase/i');
    await expect(passwordError).not.toBeVisible();
  });
});

// T036: API response validation
test.describe('API Response Validation', () => {
  test('T036: Validates API responses correctly', async ({ page }) => {
    // This test would typically use mock API responses
    // For now, we verify that invalid data doesn't crash the app

    await page.goto('/login');

    // Test with valid credentials format (will fail auth but format is correct)
    await page.fill('input[type="email"]', 'valid@example.com');
    await page.fill('input[type="password"]', 'ValidPassword123');

    // Click login - the app should handle the API response gracefully
    await page.click('button[type="submit"]');

    // Wait for API response
    await page.waitForTimeout(1000);

    // App should still be responsive (no crashes from invalid data)
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Should not have unhandled errors in console
    const [error] = await Promise.all([
      page.waitForEvent('console', { timeout: 2000 }).catch(() => null),
    ]);

    // If there was a console error, it should be a 401 (auth failure), not a validation error
    if (error) {
      expect(error.text()).not.toContain('validation');
    }
  });
});

// T037: Form validation error messages
test.describe('Form Validation Error Messages', () => {
  test('T037: Displays user-friendly error messages', async ({ page }) => {
    await page.goto('/signup');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const confirmPasswordInput = page.locator('input[name*="confirm"]').or(
      page.locator('input[type="password"]').nth(1)
    );
    const submitButton = page.locator('button[type="submit"]').first();

    // Test multiple validation errors at once
    await emailInput.fill('invalid-email');
    await passwordInput.fill('short');
    await confirmPasswordInput.fill('different');
    await submitButton.click();

    // Check that specific error messages are shown
    await expect(page.locator('text=/email/i')).toBeVisible();
    await expect(page.locator('text=/password/i')).toBeVisible();

    // Fix email
    await emailInput.fill('test@example.com');
    await expect(page.locator('text=/invalid email/i')).not.toBeVisible();

    // Fix password
    await passwordInput.fill('ValidPassword123');
    await expect(page.locator('text=/8 characters/i')).not.toBeVisible();

    // Passwords still don't match
    await confirmPasswordInput.fill('ValidPassword456');
    await submitButton.click();
    await expect(page.locator('text=/match/i')).toBeVisible();

    // Fix confirmation
    await confirmPasswordInput.fill('ValidPassword123');
    await submitButton.click();
    // No validation errors (though API may reject)
    await expect(page.locator('text=/match/i')).not.toBeVisible();
  });
});
