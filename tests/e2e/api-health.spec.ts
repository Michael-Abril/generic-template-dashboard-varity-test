import { test, expect } from '@playwright/test';

/**
 * API Health Check Tests
 * These tests verify all critical backend endpoints are responding
 * 
 * GUARDRAIL: Prevents deploying when backend is broken
 */

const API_BASE = 'https://generic-template-dashboard-production.up.railway.app';

test.describe('API Health Checks', () => {
  test('Backend health endpoint returns 200', async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.status).toBe('healthy');
  });

  test('AI service health endpoint returns 200', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/ai/health`);
    expect(response.status()).toBe(200);
  });

  test('API docs are accessible', async ({ request }) => {
    const response = await request.get(`${API_BASE}/docs`);
    expect(response.status()).toBe(200);
  });

  test('OAuth endpoints are reachable', async ({ request }) => {
    // Check that OAuth start endpoint exists (should return 422 without params)
    const response = await request.get(`${API_BASE}/api/v1/oauth/status/google`);
    // Without wallet_address, should return 422 (validation error)
    expect([200, 422]).toContain(response.status());
  });

  test('Integrations endpoint is reachable', async ({ request }) => {
    // Check that integrations endpoint exists (should return 422 without params)
    const response = await request.get(`${API_BASE}/api/v1/integrations/installed`);
    // Without wallet_address, should return 422 (validation error)
    expect([200, 422]).toContain(response.status());
  });

  test('AI chat endpoint is reachable', async ({ request }) => {
    // Just check the endpoint exists - POST without body should return 422
    const response = await request.post(`${API_BASE}/api/v1/ai/chat/general`, {
      data: {}
    });
    // Should return 422 (validation error) without proper body
    expect(response.status()).toBe(422);
  });

  test('Planning endpoints are reachable', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/v1/planning/tasks`);
    // Without wallet_address, should return 422 (validation error)
    expect([200, 422]).toContain(response.status());
  });
});
