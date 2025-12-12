/**
 * API Endpoints and Configuration
 */

/**
 * Backend API base URL
 * Checks both NEXT_PUBLIC_API_URL and NEXT_PUBLIC_BACKEND_URL for compatibility
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:8000';

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // AI endpoints
  AI_CHAT: '/api/v1/ai/chat',
  AI_RAG: '/api/v1/ai/rag',

  // Marketplace endpoints
  MARKETPLACE_PRODUCTS: '/api/v1/marketplace/products',
  MARKETPLACE_CATEGORIES: '/api/v1/marketplace/categories',
  MARKETPLACE_PURCHASE: '/api/v1/marketplace/purchase',

  // Integration endpoints
  INTEGRATIONS_LIST: '/api/v1/integrations',
  INTEGRATIONS_INSTALLED: '/api/v1/integrations/installed',
  INTEGRATIONS_CONFIG: '/api/v1/integrations/config',

  // OAuth endpoints
  OAUTH_START: '/api/v1/oauth/start',
  OAUTH_CALLBACK: '/api/v1/oauth/callback',
  OAUTH_STATUS: '/api/v1/oauth/status',

  // User endpoints
  USER_PROFILE: '/api/v1/user/profile',
  USER_SETTINGS: '/api/v1/user/settings',

  // Health check
  HEALTH: '/health',
} as const;

/**
 * API request timeouts (milliseconds)
 */
export const API_TIMEOUTS = {
  DEFAULT: 30000, // 30 seconds
  LONG: 60000, // 1 minute
  SHORT: 10000, // 10 seconds
} as const;

/**
 * API retry configuration
 */
export const API_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 5000, // 5 seconds
} as const;
