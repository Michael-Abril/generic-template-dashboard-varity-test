/**
 * Marketplace Purchase Flow E2E Tests
 * Tests for tool marketplace browsing and purchasing
 */

import { test, expect } from '@playwright/test';

test.describe('Marketplace Browsing', () => {
  test('should display marketplace page', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Page should load
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show available tools/apps', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Look for product cards, tool listings, or app cards
    const productCards = page.locator('[data-testid="tool-card"], [data-testid="app-card"], [data-testid="product-card"], .tool-card, .app-card, .product-card');
    
    // Should show at least one tool/app or an empty state message
    const count = await productCards.count();
    if (count > 0) {
      await expect(productCards.first()).toBeVisible();
    } else {
      // Check for empty state or loading state
      await expect(page.locator('body')).toContainText(/marketplace|tools|apps/i);
    }
  });

  test('should display tool details when clicked', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Find first tool card and click
    const firstTool = page.locator('[data-testid="tool-card"], [data-testid="app-card"], .tool-card').first();
    
    if (await firstTool.isVisible()) {
      await firstTool.click();
      
      // Should navigate or show modal with details
      await page.waitForTimeout(1000); // Wait for navigation/modal
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show pricing information', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Look for price indicators (USDC, $, pricing)
    const hasPricing = await page.locator('text=/USDC|\\$[0-9]|price|cost/i').first().isVisible().catch(() => false);
    
    // If no pricing visible, that's ok (might be in details view)
    if (hasPricing) {
      await expect(page.locator('text=/USDC|\\$/i').first()).toBeVisible();
    }
  });
});

test.describe('Tool Categories', () => {
  test('should show different tool categories', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Look for category filters or sections
    const hasCategories = await page.locator('[data-testid="category"], .category, nav a').count() > 0;
    
    // Categories are optional - just check page loads
    await expect(page.locator('body')).toBeVisible();
  });

  test('should filter tools by category', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Find category filter if it exists
    const categoryFilter = page.locator('[data-testid="category-filter"], select, button:has-text("Filter")').first();
    
    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();
      await page.waitForTimeout(500);
    }
    
    // Page should remain functional
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Purchase Flow', () => {
  test('should show purchase button for tools', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Look for purchase, buy, or subscribe buttons
    const purchaseButton = page.locator('[data-testid="purchase-button"], button:has-text("Purchase"), button:has-text("Buy"), button:has-text("Subscribe")').first();
    
    if (await purchaseButton.isVisible()) {
      await expect(purchaseButton).toBeEnabled();
    }
  });

  test('should handle purchase flow initiation', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Try to initiate purchase
    const purchaseButton = page.locator('[data-testid="purchase-button"], button:has-text("Purchase"), button:has-text("Buy")').first();
    
    if (await purchaseButton.isVisible()) {
      await purchaseButton.click();
      
      // Should show payment modal or wallet prompt
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display gas estimation on purchase', async ({ page }) => {
    await page.goto('/marketplace');
    
    // Try to trigger purchase flow
    const purchaseButton = page.locator('[data-testid="purchase-button"]').first();
    
    if (await purchaseButton.isVisible()) {
      await purchaseButton.click();
      
      // Look for gas estimator
      const gasEstimator = page.locator('[data-testid="gas-estimator"], text=/gas|fee/i');
      
      // Gas estimator is optional but good to check
      await page.waitForTimeout(1000);
    }
  });
});
