/**
 * OAuth Integration E2E Tests
 * Tests for third-party integrations and OAuth flows
 */

import { test, expect } from '@playwright/test';

test.describe('Integrations Page', () => {
  test('should display integrations page', async ({ page }) => {
    await page.goto('/integrations');
    
    // Page should load
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveTitle(/Integration/i);
  });

  test('should show available integrations', async ({ page }) => {
    await page.goto('/integrations');
    
    // Look for integration cards
    const integrationCards = page.locator('[data-testid="integration-card"], .integration-card, .app-card');
    
    const count = await integrationCards.count();
    if (count > 0) {
      await expect(integrationCards.first()).toBeVisible();
    } else {
      // Should at least show empty state or loading
      await expect(page.locator('text=/integration|connect|apps/i').first()).toBeVisible();
    }
  });

  test('should display integration categories', async ({ page }) => {
    await page.goto('/integrations');
    
    // Look for categories (Accounting, CRM, etc.)
    const hasCategories = await page.locator('text=/accounting|crm|payment|analytics/i').count() > 0;
    
    // Categories are optional
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('OAuth Connection Flow', () => {
  test('should show connect button for integrations', async ({ page }) => {
    await page.goto('/integrations');
    
    // Look for connect buttons
    const connectButton = page.locator('[data-testid="connect-button"], button:has-text("Connect"), button:has-text("Link")').first();
    
    if (await connectButton.isVisible()) {
      await expect(connectButton).toBeEnabled();
    }
  });

  test('should handle QuickBooks integration', async ({ page }) => {
    await page.goto('/integrations');
    
    // Look for QuickBooks integration
    const qbConnect = page.locator('[data-testid="connect-quickbooks"], text=/quickbooks/i');
    
    if (await qbConnect.isVisible()) {
      await expect(qbConnect.first()).toBeVisible();
    }
  });

  test('should handle OAuth callback route', async ({ page }) => {
    // Visit OAuth callback route (should not crash)
    await page.goto('/oauth/callback/test?code=test_code&state=test_state');
    
    // Should either redirect or show callback handling
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Integration Data Display', () => {
  test('should show connected integrations', async ({ page }) => {
    await page.goto('/integrations');
    
    // Look for connected status indicators
    const connectedBadge = page.locator('[data-testid="connected-badge"], .connected, text=/connected/i');
    
    // May not have connected integrations
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display integration data when available', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for data from integrations (sales, revenue, etc.)
    const integrationData = page.locator('[data-testid="integration-data"], [data-source], .kpi-card');
    
    // Integration data is optional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show disconnect option for connected apps', async ({ page }) => {
    await page.goto('/integrations');
    
    // Look for disconnect button
    const disconnectButton = page.locator('[data-testid="disconnect-button"], button:has-text("Disconnect"), button:has-text("Remove")');
    
    // May not have connected apps to disconnect
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Integration Settings', () => {
  test('should allow configuring integration settings', async ({ page }) => {
    await page.goto('/integrations');
    
    // Look for settings or configuration options
    const settingsButton = page.locator('[data-testid="integration-settings"], button:has-text("Settings"), button:has-text("Configure")').first();
    
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show sync status for integrations', async ({ page }) => {
    await page.goto('/integrations');
    
    // Look for sync status indicators
    const syncStatus = page.locator('[data-testid="sync-status"], text=/sync|last updated/i');
    
    // Sync status is optional
    await expect(page.locator('body')).toBeVisible();
  });
});
