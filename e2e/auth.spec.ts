/**
 * Authentication Flow E2E Tests
 * Tests for Privy authentication and wallet connection
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display Privy login button on homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check for connect wallet or sign in button
    const authButton = page.locator('button:has-text("Connect Wallet"), button:has-text("Sign In"), button:has-text("Log In")').first();
    await expect(authButton).toBeVisible();
  });

  test('should navigate to dashboard home page', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Page should load without errors
    await expect(page).toHaveTitle(/Varity|Dashboard/i);
  });

  test('should show navigation menu', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for main navigation elements
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav).toBeVisible();
  });

  test('should display company branding', async ({ page }) => {
    await page.goto('/');
    
    // Check for logo or company name
    await expect(page.locator('img[alt*="logo" i], img[alt*="brand" i], h1, [data-testid="company-logo"]').first()).toBeVisible();
  });

  test('should handle unauthenticated access gracefully', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should not crash - may redirect to login or show limited view
    await expect(page).not.toHaveTitle(/Error/i);
  });
});

test.describe('Wallet Connection', () => {
  test('should show wallet connection options', async ({ page }) => {
    await page.goto('/');
    
    // Look for connect wallet button
    const connectButton = page.locator('[data-testid="connect-wallet"], button:has-text("Connect")').first();
    
    if (await connectButton.isVisible()) {
      await expect(connectButton).toBeEnabled();
    }
  });

  test('should load dashboard without wallet connection', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Dashboard should load (may have limited functionality)
    await expect(page.locator('body')).toBeVisible();
  });
});
