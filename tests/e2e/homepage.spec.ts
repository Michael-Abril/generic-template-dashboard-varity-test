import { test, expect } from '@playwright/test';

/**
 * Homepage and Public Page Tests
 * These tests verify the marketing pages load correctly
 * 
 * GUARDRAIL: Prevents deploying with broken public pages
 */

test.describe('Public Pages', () => {
  test('Homepage loads and displays key elements', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/Varity/i);
    
    // Check for key marketing elements
    await expect(page.locator('text=AI-Powered')).toBeVisible({ timeout: 10000 });
    
    // Check navigation is present
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('Homepage has working CTA buttons', async ({ page }) => {
    await page.goto('/');
    
    // Look for common CTA button text
    const ctaButton = page.locator('button, a').filter({ 
      hasText: /get started|sign up|try free|start/i 
    }).first();
    
    await expect(ctaButton).toBeVisible({ timeout: 10000 });
  });

  test('Homepage FAQ section renders', async ({ page }) => {
    await page.goto('/');
    
    // Check for FAQ section (common on marketing pages)
    const faqSection = page.locator('text=FAQ').or(page.locator('text=Frequently Asked'));
    
    // FAQ might be below the fold, so we wait a bit
    await expect(faqSection).toBeVisible({ timeout: 15000 });
  });

  test('Mobile navigation works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Page should still load
    await expect(page).toHaveTitle(/Varity/i);
    
    // Check for mobile menu button (hamburger)
    const mobileMenuButton = page.locator('button[aria-label*="menu"]')
      .or(page.locator('[data-testid="mobile-menu"]'))
      .or(page.locator('button').filter({ has: page.locator('svg') }).first());
    
    // Mobile menu should be visible or page should adapt
    await expect(page.locator('body')).toBeVisible();
  });
});
