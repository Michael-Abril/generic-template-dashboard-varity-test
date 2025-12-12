/**
 * UI Constants and Configuration
 */

/**
 * App metadata
 */
export const APP_NAME = 'Varity Dashboard';
export const APP_DESCRIPTION = 'Company-specific AI Dashboard powered by Varity L3';
export const APP_VERSION = '1.0.0';

/**
 * Theme colors
 */
export const COLORS = {
  PRIMARY: '#3b82f6', // blue-600
  SECONDARY: '#8b5cf6', // purple-600
  SUCCESS: '#10b981', // green-500
  ERROR: '#ef4444', // red-500
  WARNING: '#f59e0b', // amber-500
  INFO: '#06b6d4', // cyan-500
} as const;

/**
 * Breakpoints (matches Tailwind defaults)
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

/**
 * Animation durations (milliseconds)
 */
export const ANIMATION_DURATION = {
  FAST: 150,
  DEFAULT: 300,
  SLOW: 500,
} as const;

/**
 * Toast notification durations (milliseconds)
 */
export const TOAST_DURATION = {
  SHORT: 3000,
  DEFAULT: 5000,
  LONG: 8000,
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

/**
 * File upload limits
 */
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'varity_user_preferences',
  THEME: 'varity_theme',
  WALLET_ADDRESS: 'varity_wallet_address',
  TRANSACTION_HISTORY: 'varity_tx_history',
} as const;

/**
 * Date format strings
 */
export const DATE_FORMATS = {
  SHORT: 'MM/DD/YYYY',
  LONG: 'MMMM DD, YYYY',
  WITH_TIME: 'MM/DD/YYYY HH:mm:ss',
  ISO: 'YYYY-MM-DDTHH:mm:ss',
} as const;
