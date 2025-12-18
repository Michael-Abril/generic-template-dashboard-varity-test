/**
 * Sentry Error Tracking Configuration (Stub)
 *
 * Provides centralized error tracking and performance monitoring.
 * Currently provides no-op stubs - install @sentry/nextjs to enable.
 *
 * Installation:
 *   npm install @sentry/nextjs
 *
 * Configuration:
 *   Set NEXT_PUBLIC_SENTRY_DSN in your .env.local file
 *   Set NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true
 *
 * Usage:
 *   import { captureException, captureMessage, setUser } from '@/lib/sentry'
 *   captureException(error)
 *   captureMessage('Something happened')
 *   setUser({ id: 'wallet-address' })
 */

import { env } from './env'

// Check if Sentry is available and configured
export const isSentryEnabled = (): boolean => {
  // Sentry is disabled - @sentry/nextjs not installed
  // To enable: npm install @sentry/nextjs and update this file
  return false
}

/**
 * Initialize Sentry (called once at app startup)
 * Currently a no-op - install @sentry/nextjs to enable
 */
export async function initSentry(): Promise<void> {
  if (env.NEXT_PUBLIC_DEBUG) {
    console.log('[Sentry] @sentry/nextjs not installed - error tracking disabled')
    console.log('[Sentry] To enable: npm install @sentry/nextjs')
  }
}

/**
 * Capture an exception and send it to Sentry
 * Currently logs to console - install @sentry/nextjs to enable
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>
): string | undefined {
  // Log to console in development
  if (env.isDevelopment) {
    console.error('[Error]', error, context)
  }
  return undefined
}

/**
 * Capture a message and send it to Sentry
 * Currently logs to console - install @sentry/nextjs to enable
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  context?: Record<string, unknown>
): string | undefined {
  // Log to console in development
  if (env.isDevelopment) {
    console.log(`[${level.toUpperCase()}]`, message, context)
  }
  return undefined
}

/**
 * Set user context for Sentry
 * Currently a no-op - install @sentry/nextjs to enable
 */
export function setUser(_user: {
  id?: string
  email?: string
  walletAddress?: string
  companyName?: string
} | null): void {
  // No-op when Sentry not installed
}

/**
 * Add breadcrumb for tracking user actions
 * Currently a no-op - install @sentry/nextjs to enable
 */
export function addBreadcrumb(_breadcrumb: {
  message: string
  category?: string
  level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug'
  data?: Record<string, unknown>
}): void {
  // No-op when Sentry not installed
}

/**
 * Set custom tags for filtering in Sentry
 * Currently a no-op - install @sentry/nextjs to enable
 */
export function setTag(_key: string, _value: string): void {
  // No-op when Sentry not installed
}

/**
 * Set multiple tags at once
 * Currently a no-op - install @sentry/nextjs to enable
 */
export function setTags(_tags: Record<string, string>): void {
  // No-op when Sentry not installed
}

/**
 * Start a performance transaction
 * Currently a no-op - install @sentry/nextjs to enable
 */
export function startTransaction(
  _name: string,
  _op: string
): { finish: () => void } | undefined {
  return undefined
}

/**
 * Create a span within the current transaction
 * Currently just runs the function - install @sentry/nextjs to enable
 */
export function withSpan<T>(
  _name: string,
  _op: string,
  fn: () => T
): T {
  return fn()
}

/**
 * Async version of withSpan
 * Currently just runs the function - install @sentry/nextjs to enable
 */
export async function withSpanAsync<T>(
  _name: string,
  _op: string,
  fn: () => Promise<T>
): Promise<T> {
  return fn()
}
