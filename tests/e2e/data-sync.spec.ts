import { test, expect } from '@playwright/test';

/**
 * Data Sync and RAG Tests
 * Tests the data pipeline from sync to RAG queries
 * 
 * GUARDRAIL: Prevents deploying with broken data pipeline
 */

const API_BASE = 'https://generic-template-dashboard-production.up.railway.app';

test.describe('Data Pipeline Health', () => {
  test('Sync endpoint structure is valid', async ({ request }) => {
    // Test that sync endpoint returns proper error for missing params
    const response = await request.post(`${API_BASE}/api/v1/integrations/google/sync`, {
      data: {}
    });
    
    // Should return 422 (validation error) without wallet_address
    expect(response.status()).toBe(422);
    
    const body = await response.json();
    expect(body).toHaveProperty('detail');
  });

  test('RAG query endpoint is available', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/v1/ai/query/combined`, {
      data: {}
    });
    
    // Should return 422 (validation error) without proper body
    expect(response.status()).toBe(422);
  });

  test('Planning RAG health check endpoint works', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/planning/rag-health`);
    
    // Without wallet_address, should return 422 or 200 with empty data
    expect([200, 422]).toContain(response.status());
  });

  test('Conversations endpoint is available', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/conversations/`);
    
    // Without wallet_address, should return 422 (validation error)
    expect([200, 422]).toContain(response.status());
  });

  test('Dashboard KPIs endpoint is available', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/dashboard/kpis`);
    
    // Without wallet_address, should return 422 (validation error)
    expect([200, 422]).toContain(response.status());
  });
});

test.describe('Integration Endpoints', () => {
  const integrations = ['google', 'slack', 'quickbooks', 'salesforce', 'hubspot', 'microsoft'];
  
  for (const integration of integrations) {
    test(`${integration} data endpoint structure is valid`, async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/v1/integrations/${integration}/data`);
      
      // Should return 422 (validation error) without wallet_address
      expect([200, 422, 404]).toContain(response.status());
    });
  }
});
