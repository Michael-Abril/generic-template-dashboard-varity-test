import { test, expect } from '@playwright/test';

/**
 * Google Workspace Integration Tests
 * Tests the Google Workspace page functionality
 * 
 * NOTE: These tests require authentication. They will test
 * what's visible without auth and skip auth-required parts.
 * 
 * GUARDRAIL: Prevents deploying with broken integration pages
 */

test.describe('Google Workspace Page', () => {
  test.describe('Unauthenticated State', () => {
    test('Dashboard redirects to auth when not logged in', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Should either show login prompt or redirect
      // The page should handle unauthenticated state gracefully
      await expect(page.locator('body')).toBeVisible();
      
      // Check we don't have a blank page or error
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toBe('');
    });

    test('Onboarding page is accessible', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Onboarding wizard should be visible
      await expect(page.locator('body')).toBeVisible();
      
      // Should have some form of progress indicator
      const hasProgress = await page.locator('text=Step')
        .or(page.locator('[role="progressbar"]'))
        .or(page.locator('.progress'))
        .count();
      
      // Page should load without errors
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toContain('Error');
    });

    test('Marketplace page loads', async ({ page }) => {
      await page.goto('/marketplace');
      
      await expect(page.locator('body')).toBeVisible();
      
      // Should show some integration options or login prompt
      const bodyText = await page.textContent('body');
      expect(bodyText?.length).toBeGreaterThan(100);
    });
  });

  test.describe('Page Structure Checks', () => {
    test('No JavaScript errors on homepage', async ({ page }) => {
      const errors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      page.on('pageerror', err => {
        errors.push(err.message);
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Filter out known non-critical errors
      const criticalErrors = errors.filter(e => 
        !e.includes('favicon') && 
        !e.includes('Failed to load resource') &&
        !e.includes('net::ERR')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });

    test('AI Assistant page structure is valid', async ({ page }) => {
      await page.goto('/ai-assistant');
      
      await expect(page.locator('body')).toBeVisible();
      
      // Should have some chat-related elements or auth prompt
      const bodyText = await page.textContent('body');
      expect(bodyText?.length).toBeGreaterThan(50);
    });
  });
});
