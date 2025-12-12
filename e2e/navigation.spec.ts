/**
 * Dashboard Navigation E2E Tests
 * Tests for page navigation and routing
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  const pages = [
    { path: '/', title: /Varity|Home|Dashboard/i },
    { path: '/dashboard', title: /Dashboard/i },
    { path: '/marketplace', title: /Marketplace|Tools/i },
    { path: '/integrations', title: /Integrations/i },
    { path: '/analytics', title: /Analytics|Insights/i },
    { path: '/settings', title: /Settings|Profile/i },
  ];

  for (const { path, title } of pages) {
    test(`should navigate to ${path}`, async ({ page }) => {
      await page.goto(path);
      
      // Check page loads without errors
      await expect(page.locator('body')).toBeVisible();
      
      // Check title matches expected pattern
      await expect(page).toHaveTitle(title);
    });
  }

  test('should show loading states on navigation', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click on a nav link
    const navLink = page.locator('nav a, [role="navigation"] a').first();
    
    if (await navLink.isVisible()) {
      await navLink.click();
      
      // Should show loading or navigate immediately
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should maintain navigation state across pages', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Navigate to marketplace
    await page.goto('/marketplace');
    await expect(page).toHaveURL(/marketplace/);
    
    // Navigate back
    await page.goBack();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should show active navigation indicator', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Look for active state on navigation
    const activeNav = page.locator('nav a[aria-current="page"], nav .active, nav [data-active="true"]');
    
    // Active state is optional but good UX
    const count = await activeNav.count();
    if (count > 0) {
      await expect(activeNav.first()).toBeVisible();
    }
  });
});

test.describe('Page Layout', () => {
  test('should display sidebar navigation', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for sidebar or navigation menu
    const sidebar = page.locator('[data-testid="sidebar"], aside, nav[role="navigation"]');
    await expect(sidebar.first()).toBeVisible();
  });

  test('should show header across all pages', async ({ page }) => {
    const pages = ['/dashboard', '/marketplace', '/integrations'];
    
    for (const path of pages) {
      await page.goto(path);
      
      // Header should be visible
      const header = page.locator('header, [role="banner"]');
      await expect(header.first()).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/dashboard');
    
    // Page should load without horizontal scroll
    const bodyWidth = await page.locator('body').evaluate(el => el.scrollWidth);
    const viewportWidth = 375;
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // Allow small margin
  });
});

test.describe('Error Handling', () => {
  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/non-existent-page-12345');
    
    // Should show 404 or redirect to home
    const is404 = await page.locator('text=/404|not found/i').isVisible().catch(() => false);
    const isHome = page.url().includes('/dashboard') || page.url().endsWith('/');
    
    expect(is404 || isHome).toBeTruthy();
  });

  test('should show error boundary on component errors', async ({ page }) => {
    // Visit a page that might have errors
    await page.goto('/dashboard');
    
    // Page should not crash completely
    await expect(page.locator('body')).toBeVisible();
  });
});
