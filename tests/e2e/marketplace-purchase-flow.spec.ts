/**
 * Marketplace Purchase Flow E2E Tests
 * Tests: Purchase Marketplace Tool → Mint NFT → Verify License
 */

import { test, expect, Page } from '@playwright/test';

// Helper to mock wallet and authentication
async function setupMockWallet(page: Page) {
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

    // Mock Web3 wallet
    (window as any).ethereum = {
      isMetaMask: true,
      selectedAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      request: async ({ method, params }: any) => {
        if (method === 'eth_requestAccounts') {
          return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'];
        }
        if (method === 'eth_chainId') {
          return '0x82f9'; // 33529 in hex
        }
        if (method === 'eth_sendTransaction') {
          // Mock transaction hash
          return '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        }
        if (method === 'eth_getTransactionReceipt') {
          return {
            status: '0x1',
            transactionHash: params[0],
            blockNumber: '0x1',
            logs: []
          };
        }
        return null;
      },
      on: () => {},
      removeListener: () => {}
    };
  });
}

test.describe('Marketplace Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockWallet(page);
  });

  test('View marketplace and available tools', async ({ page }) => {
    // Mock marketplace API
    await page.route('**/api/v1/marketplace/tools', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tools: [
            {
              id: 'tool-1',
              name: 'QuickBooks Premium',
              description: 'Advanced accounting features',
              price: '99.00',
              currency: 'USDC',
              category: 'accounting',
              vendor: 'Intuit'
            },
            {
              id: 'tool-2',
              name: 'Salesforce CRM',
              description: 'Customer relationship management',
              price: '149.00',
              currency: 'USDC',
              category: 'crm',
              vendor: 'Salesforce'
            },
            {
              id: 'tool-3',
              name: 'Advanced Analytics',
              description: 'AI-powered business intelligence',
              price: '199.00',
              currency: 'USDC',
              category: 'analytics',
              vendor: 'Varity'
            }
          ]
        })
      });
    });

    // Step 1: Navigate to marketplace
    await page.goto('/dashboard/marketplace');

    // Step 2: Verify marketplace page loads
    await expect(page.locator('h1, h2').first()).toContainText(/marketplace|tools/i);

    // Step 3: Verify tools are displayed
    const toolCards = page.locator('[data-testid="tool-card"], .tool-card, [class*="ToolCard"]');
    await expect(toolCards.first()).toBeVisible({ timeout: 10000 });

    // Step 4: Verify at least one tool is shown
    await expect(
      page.locator('text="QuickBooks", text="Salesforce", text="Analytics"').first()
    ).toBeVisible();
  });

  test('Purchase a tool and mint NFT license', async ({ page }) => {
    // Mock marketplace and purchase APIs
    await page.route('**/api/v1/marketplace/tools', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          tools: [
            {
              id: 'tool-analytics',
              name: 'Advanced Analytics',
              price: '199.00',
              currency: 'USDC'
            }
          ]
        })
      });
    });

    await page.route('**/api/v1/marketplace/purchase', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          transactionHash: '0xabc123',
          nftTokenId: '42',
          toolId: 'tool-analytics'
        })
      });
    });

    await page.route('**/api/v1/nft/mint', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          tokenId: '42',
          tokenURI: 'ipfs://Qm...',
          txHash: '0xabc123'
        })
      });
    });

    // Step 1: Go to marketplace
    await page.goto('/dashboard/marketplace');

    // Step 2: Find a tool to purchase
    const toolCard = page.locator('[data-testid="tool-card"]').first();
    await expect(toolCard).toBeVisible({ timeout: 10000 });

    // Step 3: Click purchase/buy button
    const purchaseButton = page.locator('button:has-text("Purchase"), button:has-text("Buy")').first();
    await expect(purchaseButton).toBeVisible();
    await purchaseButton.click();

    // Step 4: Confirm purchase in modal/dialog
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Complete Purchase")').first();

    if (await confirmButton.isVisible({ timeout: 5000 })) {
      await confirmButton.click();
    }

    // Step 5: Wait for transaction confirmation
    await expect(
      page.locator('text="Success", text="Purchased", text="NFT Minted"').first()
    ).toBeVisible({ timeout: 15000 });

    // Step 6: Verify NFT token ID is displayed
    await expect(
      page.locator('text="Token #42", text="#42", text="Token ID"').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('View owned NFT licenses', async ({ page }) => {
    // Mock NFT ownership API
    await page.route('**/api/v1/nft/owned', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          licenses: [
            {
              tokenId: '42',
              toolName: 'Advanced Analytics',
              purchasedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'active'
            },
            {
              tokenId: '43',
              toolName: 'QuickBooks Premium',
              purchasedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
              expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'active'
            }
          ]
        })
      });
    });

    // Step 1: Navigate to licenses/NFTs page
    await page.goto('/dashboard/licenses');

    // Step 2: Verify page loads
    await expect(page.locator('h1, h2').first()).toContainText(/licenses|nft|tools/i);

    // Step 3: Verify owned licenses are displayed
    const licenseCards = page.locator('[data-testid="license-card"], .license-card');
    await expect(licenseCards.first()).toBeVisible({ timeout: 10000 });

    // Step 4: Verify license details
    await expect(page.locator('text="Token #42"').first()).toBeVisible();
    await expect(page.locator('text="Advanced Analytics"').first()).toBeVisible();
    await expect(page.locator('text="active"').first()).toBeVisible();
  });

  test('Complete purchase flow with USDC approval', async ({ page }) => {
    // Mock USDC balance and approval
    await page.route('**/api/v1/wallet/balance', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          usdc: '500.00',
          eth: '0.1'
        })
      });
    });

    await page.route('**/api/v1/marketplace/tools', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          tools: [{ id: '1', name: 'Test Tool', price: '99.00' }]
        })
      });
    });

    await page.route('**/api/v1/marketplace/purchase', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          requiresApproval: true,
          approvalTxHash: '0xapproval123',
          purchaseTxHash: '0xpurchase456',
          nftTokenId: '50'
        })
      });
    });

    // Step 1: Navigate to marketplace
    await page.goto('/dashboard/marketplace');

    // Step 2: Select a tool
    const toolCard = page.locator('[data-testid="tool-card"]').first();
    await expect(toolCard).toBeVisible({ timeout: 10000 });

    // Step 3: Initiate purchase
    await page.click('button:has-text("Purchase"), button:has-text("Buy")');

    // Step 4: Approve USDC spending (if modal appears)
    const approveButton = page.locator('button:has-text("Approve USDC"), button:has-text("Approve")').first();

    if (await approveButton.isVisible({ timeout: 5000 })) {
      await approveButton.click();
      await page.waitForTimeout(2000);
    }

    // Step 5: Confirm purchase
    const confirmButton = page.locator('button:has-text("Confirm Purchase"), button:has-text("Complete")').first();

    if (await confirmButton.isVisible({ timeout: 5000 })) {
      await confirmButton.click();
    }

    // Step 6: Verify success
    await expect(
      page.locator('text="Success", text="NFT Minted", text="Token #50"').first()
    ).toBeVisible({ timeout: 20000 });
  });

  test('Error handling: Insufficient USDC balance', async ({ page }) => {
    // Mock insufficient balance
    await page.route('**/api/v1/wallet/balance', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ usdc: '50.00', eth: '0.1' })
      });
    });

    await page.route('**/api/v1/marketplace/tools', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          tools: [{ id: '1', name: 'Expensive Tool', price: '999.00' }]
        })
      });
    });

    await page.route('**/api/v1/marketplace/purchase', async route => {
      await route.fulfill({
        status: 400,
        body: JSON.stringify({
          success: false,
          error: 'Insufficient USDC balance'
        })
      });
    });

    await page.goto('/dashboard/marketplace');

    // Try to purchase expensive tool
    const purchaseButton = page.locator('button:has-text("Purchase")').first();

    if (await purchaseButton.isVisible()) {
      await purchaseButton.click();

      // Verify error message
      await expect(
        page.locator('text="Insufficient", text="Not enough", text="Balance too low"').first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('NFT metadata is correctly displayed', async ({ page }) => {
    // Mock NFT with metadata
    await page.route('**/api/v1/nft/42', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          tokenId: '42',
          metadata: {
            name: 'Advanced Analytics License #42',
            description: 'Premium analytics tool license',
            image: 'ipfs://QmTest123/analytics.png',
            attributes: [
              { trait_type: 'Tool', value: 'Advanced Analytics' },
              { trait_type: 'Tier', value: 'Premium' },
              { trait_type: 'Duration', value: '30 days' }
            ]
          },
          owner: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          purchasedAt: new Date().toISOString()
        })
      });
    });

    await page.goto('/dashboard/licenses/42');

    // Verify NFT details
    await expect(page.locator('text="Advanced Analytics License #42"').first()).toBeVisible();
    await expect(page.locator('text="Premium"').first()).toBeVisible();
    await expect(page.locator('text="30 days"').first()).toBeVisible();

    // Verify image is displayed
    const nftImage = page.locator('img[src*="ipfs"], img[alt*="NFT"]').first();
    await expect(nftImage).toBeVisible();
  });

  test('Filter marketplace by category', async ({ page }) => {
    await page.route('**/api/v1/marketplace/tools**', async route => {
      const url = route.request().url();
      const category = new URL(url).searchParams.get('category');

      const allTools = [
        { id: '1', name: 'QuickBooks', category: 'accounting' },
        { id: '2', name: 'Salesforce', category: 'crm' },
        { id: '3', name: 'Analytics', category: 'analytics' }
      ];

      const filtered = category
        ? allTools.filter(t => t.category === category)
        : allTools;

      await route.fulfill({
        status: 200,
        body: JSON.stringify({ tools: filtered })
      });
    });

    await page.goto('/dashboard/marketplace');

    // Find category filter
    const categoryFilter = page.locator('select[name="category"], button:has-text("Category")').first();

    if (await categoryFilter.isVisible()) {
      // Select accounting category
      await categoryFilter.click();
      await page.click('text="Accounting", [data-value="accounting"]');

      // Verify only accounting tools shown
      await expect(page.locator('text="QuickBooks"').first()).toBeVisible();
      await expect(page.locator('text="Salesforce"').first()).not.toBeVisible();
    }
  });

  test('Search marketplace tools', async ({ page }) => {
    await page.route('**/api/v1/marketplace/tools**', async route => {
      const url = route.request().url();
      const search = new URL(url).searchParams.get('search') || '';

      const allTools = [
        { id: '1', name: 'QuickBooks Premium', price: '99.00' },
        { id: '2', name: 'Salesforce CRM', price: '149.00' },
        { id: '3', name: 'Advanced Analytics', price: '199.00' }
      ];

      const filtered = search
        ? allTools.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
        : allTools;

      await route.fulfill({
        status: 200,
        body: JSON.stringify({ tools: filtered })
      });
    });

    await page.goto('/dashboard/marketplace');

    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('QuickBooks');
      await page.waitForTimeout(1000);

      // Verify filtered results
      await expect(page.locator('text="QuickBooks"').first()).toBeVisible();
      await expect(page.locator('text="Salesforce"').first()).not.toBeVisible();
    }
  });

  test('View transaction history', async ({ page }) => {
    await page.route('**/api/v1/marketplace/transactions', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          transactions: [
            {
              id: 'tx-1',
              type: 'purchase',
              toolName: 'Advanced Analytics',
              amount: '199.00',
              currency: 'USDC',
              status: 'confirmed',
              timestamp: new Date().toISOString(),
              txHash: '0xabc123'
            },
            {
              id: 'tx-2',
              type: 'purchase',
              toolName: 'QuickBooks Premium',
              amount: '99.00',
              currency: 'USDC',
              status: 'confirmed',
              timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              txHash: '0xdef456'
            }
          ]
        })
      });
    });

    await page.goto('/dashboard/transactions');

    // Verify transaction list
    await expect(page.locator('[data-testid="transaction-row"]').first()).toBeVisible({ timeout: 10000 });

    // Verify transaction details
    await expect(page.locator('text="Advanced Analytics"').first()).toBeVisible();
    await expect(page.locator('text="199.00"').first()).toBeVisible();
    await expect(page.locator('text="confirmed"').first()).toBeVisible();
  });
});

test.describe('Marketplace Performance', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockWallet(page);
  });

  test('Marketplace loads quickly', async ({ page }) => {
    await page.route('**/api/v1/marketplace/tools', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          tools: Array(20).fill(null).map((_, i) => ({
            id: `tool-${i}`,
            name: `Tool ${i}`,
            price: '99.00'
          }))
        })
      });
    });

    const startTime = Date.now();
    await page.goto('/dashboard/marketplace');
    await expect(page.locator('[data-testid="tool-card"]').first()).toBeVisible();
    const loadTime = Date.now() - startTime;

    // Should load in under 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });

  test('Purchase flow completes quickly', async ({ page }) => {
    await page.route('**/api/v1/**', async route => route.fulfill({ status: 200, body: '{"success":true}' }));

    await page.goto('/dashboard/marketplace');

    const startTime = Date.now();

    // Complete purchase
    await page.click('button:has-text("Purchase")');
    await page.click('button:has-text("Confirm")');
    await expect(page.locator('text="Success"').first()).toBeVisible({ timeout: 15000 });

    const purchaseTime = Date.now() - startTime;

    // Purchase should complete in under 10 seconds
    expect(purchaseTime).toBeLessThan(10000);
  });
});
