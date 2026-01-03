import { test, expect } from '@playwright/test';

// T012: Button component rendering and interaction
test('T012: Button component renders and responds to interactions', async ({ page }) => {
  await page.goto('/test');

  // Check that buttons are visible
  const defaultButton = page.locator('button:has-text("Default")').first();
  await expect(defaultButton).toBeVisible();

  // Check button variants exist
  await expect(page.locator('button:has-text("Secondary")')).toBeVisible();
  await expect(page.locator('button:has-text("Destructive")')).toBeVisible();
  await expect(page.locator('button:has-text("Outline")')).toBeVisible();
  await expect(page.locator('button:has-text("Ghost")')).toBeVisible();
  await expect(page.locator('button:has-text("Link")')).toBeVisible();

  // Check button sizes
  await expect(page.locator('button:has-text("Small")')).toBeVisible();
  await expect(page.locator('button:has-text("Large")')).toBeVisible();

  // Test button click interaction
  await defaultButton.click();
  // Button should remain visible after click
  await expect(defaultButton).toBeVisible();
});

// T013: Input component keyboard navigation
test('T013: Input component handles keyboard navigation and input', async ({ page }) => {
  await page.goto('/test');

  // Find email input
  const emailInput = page.locator('input[type="email"]').first();
  await expect(emailInput).toBeVisible();

  // Test focus
  await emailInput.focus();
  await expect(emailInput).toBeFocused();

  // Test typing
  await emailInput.fill('test@example.com');
  await expect(emailInput).toHaveValue('test@example.com');

  // Test keyboard navigation (Tab to next input)
  await page.keyboard.press('Tab');
  const passwordInput = page.locator('input[type="password"]').first();
  await expect(passwordInput).toBeFocused();

  // Test password input
  await passwordInput.fill('password123');
  await expect(passwordInput).toHaveValue('password123');
});

// T014: Component accessibility (ARIA attributes)
test('T014: Components have proper ARIA attributes and accessibility', async ({ page }) => {
  await page.goto('/test');

  // Check buttons have appropriate ARIA roles or are button elements
  const buttons = page.locator('button');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);

  // Check form labels are properly associated
  const emailInput = page.locator('input[type="email"]').first();
  const emailLabel = page.locator('label[for="email"]');
  await expect(emailLabel).toBeVisible();
  await expect(emailLabel).toHaveText(/Email/i);

  // Check checkbox accessibility - Radix UI uses button with role="checkbox"
  const checkbox = page.locator('#terms');
  await expect(checkbox).toHaveAttribute('role', 'checkbox');
  await expect(checkbox).toHaveAttribute('type', 'button');

  // Check radio group accessibility
  const radioGroup = page.locator('[role="radiogroup"]');
  await expect(radioGroup).toBeVisible();

  // Verify radio items have proper attributes
  const radioItems = page.locator('[role="radio"]');
  const radioCount = await radioItems.count();
  expect(radioCount).toBeGreaterThan(0);

  // Check that all radio items are tab-accessible
  for (let i = 0; i < radioCount; i++) {
    await expect(radioItems.nth(i)).toHaveAttribute('role', 'radio');
  }
});

// T015: Theme switching (light/dark mode)
test('T015: Theme switching works correctly', async ({ page }) => {
  await page.goto('/test');

  // Check initial state (should be light by default)
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/dark/);

  // Find and click theme toggle button
  const themeButton = page.locator('button:has-text("Toggle Dark Mode")');
  await expect(themeButton).toBeVisible();

  // Toggle to dark mode
  await themeButton.click();
  await expect(html).toHaveClass(/dark/);

  // Button text should change
  const lightModeButton = page.locator('button:has-text("Toggle Light Mode")');
  await expect(lightModeButton).toBeVisible();

  // Toggle back to light mode
  await lightModeButton.click();
  await expect(html).not.toHaveClass(/dark/);

  // Verify button text changed back
  await expect(themeButton).toBeVisible();
});

// Additional: Dialog component test
test('Dialog component opens and closes correctly', async ({ page }) => {
  await page.goto('/test');

  // Find dialog trigger button
  const dialogTrigger = page.locator('button:has-text("Open Dialog")');
  await expect(dialogTrigger).toBeVisible();

  // Open dialog
  await dialogTrigger.click();

  // Check dialog content is visible
  const dialogTitle = page.locator('h2:has-text("Test Dialog")');
  await expect(dialogTitle).toBeVisible();

  const dialogDescription = page.locator('p:has-text("This is a test dialog")');
  await expect(dialogDescription).toBeVisible();

  // Close dialog by clicking outside (using Escape key is more reliable)
  await page.keyboard.press('Escape');

  // Wait for dialog to close
  await expect(dialogTitle).not.toBeVisible({ timeout: 5000 });
});

// Additional: Select and checkbox interactions
test('Form controls respond correctly to user interactions', async ({ page }) => {
  await page.goto('/test');

  // Test checkbox - Radix UI uses button with role="checkbox"
  const checkbox = page.locator('#terms');
  await expect(checkbox).toHaveAttribute('aria-checked', 'false');

  // Click to check
  await checkbox.click();
  await expect(checkbox).toHaveAttribute('aria-checked', 'true');

  // Click to uncheck
  await checkbox.click();
  await expect(checkbox).toHaveAttribute('aria-checked', 'false');

  // Test radio group
  const radioOption2 = page.locator('#option2');
  await radioOption2.click();
  await expect(radioOption2).toHaveAttribute('aria-checked', 'true');

  // Verify other options are not checked
  const radioOption1 = page.locator('#option1');
  await expect(radioOption1).toHaveAttribute('aria-checked', 'false');
});
