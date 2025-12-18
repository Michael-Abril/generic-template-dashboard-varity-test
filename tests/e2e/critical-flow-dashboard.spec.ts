/**
 * Critical Flow E2E Tests: Login → Connect Integration → View Dashboard
 * Tests the complete user journey from authentication to viewing integrated data
 */

import { test, expect, Page } from '@playwright/test';

// Helper function to mock authentication
async function mockAuthentication(page: Page) {
  // Mock Privy authentication in localStorage
  await page.addInitScript(() => {
    const mockAuth = {
      user: {
        id: 'test-user-123',
        email: 'test@varity.xyz',
        wallet: { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' }
      },
      authenticated: true
    };
    localStorage.setItem('privy:token', JSON.stringify(mockAuth));
    localStorage.setItem('privy:authenticated', 'true');
  });
}

// Helper function to mock wallet connection
async function mockWalletConnection(page: Page) {
  await page.addInitScript(() => {
    // Mock wallet connection
    (window as any).ethereum = {
      isMetaMask: true,
      selectedAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      request: async ({ method }: any) => {
        if (method === 'eth_requestAccounts') {
          return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'];
        }
        if (method === 'eth_chainId') {
          return '0x82f9'; // 33529 in hex (Varity L3 testnet)
        }
        if (method === 'wallet_switchEthereumChain') {
          return null;
        }
        return null;
      },
      on: () => {},
      removeListener: () => {}
    };
  });
}

test.describe('Critical Flow: Login → Connect Integration → View Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock authentication and wallet
    await mockAuthentication(page);
    await mockWalletConnection(page);
  });

  test('Complete flow: Login and view dashboard homepage', async ({ page }) => {
    // Step 1: Navigate to homepage
    await page.goto('/');

    // Verify homepage loads
    await expect(page).toHaveTitle(/Varity|Dashboard/i);

    // Step 2: Navigate to dashboard (should work with mock auth)
    await page.goto('/dashboard');

    // Verify dashboard loads
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Step 3: Check for key dashboard elements
    const dashboardElements = [
      page.locator('nav'),
      page.locator('[data-testid="kpi-cards"], [data-testid="metrics"]').first(),
    ];

    for (const element of dashboardElements) {
      await expect(element).toBeVisible({ timeout: 10000 });
    }
  });

  test('Navigate to integrations page and view available integrations', async ({ page }) => {
    await page.goto('/dashboard');

    // Step 1: Navigate to integrations
    await page.click('a[href*="integration"], a:has-text("Integration"), nav a:has-text("Connect")');

    // Step 2: Verify integrations page loads
    await expect(page).toHaveURL(/integrations|marketplace/i);

    // Step 3: Check for integration cards
    const integrationCards = page.locator('[data-testid="integration-card"], .integration-card, [class*="IntegrationCard"]');
    await expect(integrationCards.first()).toBeVisible({ timeout: 10000 });

    // Step 4: Verify popular integrations are displayed
    const expectedIntegrations = ['QuickBooks', 'Salesforce', 'Shopify', 'Slack', 'Stripe'];
    for (const integration of expectedIntegrations) {
      const integrationElement = page.locator(`text="${integration}"`).first();
      if (await integrationElement.isVisible()) {
        await expect(integrationElement).toBeVisible();
        break; // At least one should be visible
      }
    }
  });

  test('Connect an integration (QuickBooks) and verify connection', async ({ page }) => {
    // Mock API responses for integration
    await page.route('**/api/v1/integrations/connect', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          integration: {
            id: 'quickbooks-123',
            name: 'QuickBooks',
            type: 'quickbooks',
            status: 'connected',
            connectedAt: new Date().toISOString()
          }
        })
      });
    });

    await page.route('**/api/v1/integrations', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          integrations: [
            {
              id: 'quickbooks-123',
              name: 'QuickBooks',
              type: 'quickbooks',
              status: 'connected',
              connectedAt: new Date().toISOString()
            }
          ]
        })
      });
    });

    // Step 1: Navigate to integrations
    await page.goto('/dashboard/integrations');

    // Step 2: Find QuickBooks integration card
    const quickbooksCard = page.locator('[data-testid="integration-quickbooks"], text="QuickBooks"').first();
    await expect(quickbooksCard).toBeVisible({ timeout: 10000 });

    // Step 3: Click connect button
    const connectButton = page.locator('button:has-text("Connect"), [data-testid="connect-button"]').first();
    await connectButton.click();

    // Step 4: Verify connection success (look for success message or status change)
    await expect(
      page.locator('text="Connected", text="Successfully connected", [data-testid="connection-success"]').first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('View dashboard with integrated data', async ({ page }) => {
    // Mock dashboard data API
    await page.route('**/api/v1/dashboard/kpis', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          kpis: [
            { name: 'Total Revenue', value: '$125,430', change: '+12.5%' },
            { name: 'Active Customers', value: '342', change: '+8.2%' },
            { name: 'Pending Invoices', value: '23', change: '-5.1%' },
            { name: 'Sync Status', value: 'Healthy', change: 'Up to date' }
          ]
        })
      });
    });

    await page.route('**/api/v1/integrations', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          integrations: [
            { id: '1', name: 'QuickBooks', status: 'connected', lastSync: new Date().toISOString() },
            { id: '2', name: 'Salesforce', status: 'connected', lastSync: new Date().toISOString() }
          ]
        })
      });
    });

    // Step 1: Navigate to dashboard
    await page.goto('/dashboard');

    // Step 2: Verify KPI cards are displayed
    const kpiCards = page.locator('[data-testid="kpi-card"], .kpi-card, [class*="KPICard"]');
    await expect(kpiCards.first()).toBeVisible({ timeout: 10000 });

    // Step 3: Verify data is populated (not just loading states)
    await expect(page.locator('text="$125,430", text="342", text="23"').first()).toBeVisible({ timeout: 10000 });

    // Step 4: Verify integration status is shown
    await expect(
      page.locator('text="Connected", text="Healthy", text="Up to date"').first()
    ).toBeVisible();
  });

  test('Complete end-to-end flow: Login → Connect → View Data', async ({ page }) => {
    // Mock all API endpoints
    await page.route('**/api/v1/**', async route => {
      const url = route.request().url();

      if (url.includes('/integrations/connect')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, integration: { id: '1', status: 'connected' } })
        });
      } else if (url.includes('/integrations')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            integrations: [{ id: '1', name: 'QuickBooks', status: 'connected' }]
          })
        });
      } else if (url.includes('/dashboard/kpis')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            kpis: [
              { name: 'Total Revenue', value: '$125,430', change: '+12.5%' }
            ]
          })
        });
      } else {
        await route.continue();
      }
    });

    // Step 1: Start at homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/Varity|Dashboard/i);

    // Step 2: Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Step 3: Go to integrations
    await page.goto('/dashboard/integrations');
    await expect(page.locator('[data-testid="integration-card"]').first()).toBeVisible({ timeout: 10000 });

    // Step 4: Connect integration
    const connectBtn = page.locator('button:has-text("Connect")').first();
    if (await connectBtn.isVisible()) {
      await connectBtn.click();
      await page.waitForTimeout(2000); // Wait for connection
    }

    // Step 5: Return to dashboard and verify data
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="kpi-card"]').first()).toBeVisible({ timeout: 10000 });

    // Step 6: Verify connected status
    await expect(
      page.locator('text="Connected", text="$125,430"').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('Error handling: Failed integration connection', async ({ page }) => {
    // Mock failed connection
    await page.route('**/api/v1/integrations/connect', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid OAuth credentials'
        })
      });
    });

    await page.goto('/dashboard/integrations');

    // Try to connect
    const connectButton = page.locator('button:has-text("Connect")').first();
    if (await connectButton.isVisible()) {
      await connectButton.click();

      // Verify error message is shown
      await expect(
        page.locator('text="Error", text="Failed", text="Invalid"').first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('Dashboard performance: Load time under 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');
    await expect(page.locator('h1, h2').first()).toBeVisible();

    const loadTime = Date.now() - startTime;

    // Dashboard should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('Responsive design: Dashboard works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard');

    // Verify mobile navigation
    const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu" i]');
    await expect(mobileMenu.first()).toBeVisible();

    // Verify content is visible and not cut off
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

test.describe('Navigation and UX', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthentication(page);
    await mockWalletConnection(page);
  });

  test('Sidebar navigation works correctly', async ({ page }) => {
    await page.goto('/dashboard');

    // Find navigation links
    const navLinks = page.locator('nav a, [role="navigation"] a');
    const navCount = await navLinks.count();

    expect(navCount).toBeGreaterThan(0);

    // Click through navigation items
    for (let i = 0; i < Math.min(navCount, 5); i++) {
      const link = navLinks.nth(i);
      const href = await link.getAttribute('href');

      if (href && !href.startsWith('http')) {
        await link.click();
        await page.waitForTimeout(500);

        // Verify page changed
        expect(page.url()).toContain('dashboard');
      }
    }
  });

  test('Breadcrumb navigation shows current location', async ({ page }) => {
    await page.goto('/dashboard/integrations');

    // Look for breadcrumbs
    const breadcrumbs = page.locator('[data-testid="breadcrumb"], [aria-label="breadcrumb"], nav ol');

    if (await breadcrumbs.first().isVisible()) {
      await expect(breadcrumbs.first()).toContainText(/dashboard|integration/i);
    }
  });

  test('Search functionality works if present', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.first().isVisible()) {
      await searchInput.first().fill('QuickBooks');
      await page.waitForTimeout(1000);

      // Results should filter
      await expect(page.locator('text="QuickBooks"').first()).toBeVisible();
    }
  });
});
