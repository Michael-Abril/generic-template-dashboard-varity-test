/**
 * Error Handling Utilities
 * Provides error classes, retry logic, and timeout handling for API calls
 */

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

/**
 * Default retry configuration
 */
export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  public readonly status: number | undefined;
  public readonly statusText: string | undefined;
  public readonly data: unknown;

  constructor(message: string, status?: number, statusText?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

/**
 * Network Error class for connection failures
 */
export class NetworkError extends Error {
  public readonly originalError: Error;

  constructor(message: string, originalError: Error) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;
  }
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return `API Error: ${error.message} (${error.status})`;
  }
  if (error instanceof NetworkError) {
    return `Network Error: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Fetch with timeout support
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkError(`Request timeout after ${timeout}ms`, error);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const multiplier = config.backoffMultiplier || 2;
  const maxDelay = config.maxDelay || 10000;
  const delay = config.initialDelay * Math.pow(multiplier, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true;
  }
  if (error instanceof ApiError && error.status !== undefined) {
    // Retry on 5xx errors and 429 (rate limit)
    return error.status >= 500 || error.status === 429;
  }
  return false;
}

/**
 * Wrap an async function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = defaultRetryConfig
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < config.maxAttempts - 1 && isRetryableError(error)) {
        const delay = calculateDelay(attempt, config);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
