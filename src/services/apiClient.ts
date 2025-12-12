/**
 * Centralized API Client
 * Provides request/response interceptors, caching, deduplication, and authentication
 */

import { logger } from '@/lib/logger';
import {
  fetchWithTimeout,
  withRetry,
  ApiError,
  NetworkError,
  getErrorMessage,
  RetryConfig,
} from '@/lib/errorHandling';

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * In-flight request tracker
 */
interface InFlightRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

/**
 * API Client Configuration
 */
export interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  retryConfig?: RetryConfig;
  defaultCacheTTL?: number;
  authToken?: string;
  onRequest?: (url: string, options: RequestInit) => void;
  onResponse?: (response: Response) => void;
  onError?: (error: Error) => void;
}

/**
 * Request Options
 */
export interface RequestOptions extends RequestInit {
  timeout?: number;
  retryConfig?: RetryConfig;
  cacheTTL?: number;
  skipCache?: boolean;
  skipDeduplication?: boolean;
}

/**
 * Centralized API Client with advanced features
 */
export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private retryConfig: RetryConfig;
  private defaultCacheTTL: number;
  private authToken?: string;
  private cache: Map<string, CacheEntry<unknown>>;
  private inFlightRequests: Map<string, InFlightRequest<unknown>>;
  private onRequest?: (url: string, options: RequestInit) => void;
  private onResponse?: (response: Response) => void;
  private onError?: (error: Error) => void;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    this.timeout = config.timeout || 30000;
    this.retryConfig = config.retryConfig || { maxAttempts: 3, initialDelay: 1000 };
    this.defaultCacheTTL = config.defaultCacheTTL || 5 * 60 * 1000; // 5 minutes
    this.authToken = config.authToken;
    this.cache = new Map();
    this.inFlightRequests = new Map();
    this.onRequest = config.onRequest;
    this.onResponse = config.onResponse;
    this.onError = config.onError;

    // Clean up expired cache entries every minute
    setInterval(() => this.cleanupCache(), 60000);
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string | undefined): void {
    this.authToken = token;
  }

  /**
   * Generate cache key from URL and options
   */
  private getCacheKey(url: string, options?: RequestOptions): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Get cached response if available and not expired
   */
  private getCachedResponse<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache response with TTL
   */
  private setCachedResponse<T>(key: string, data: T, ttl: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Get in-flight request if exists
   */
  private getInFlightRequest<T>(key: string): Promise<T> | null {
    const inFlight = this.inFlightRequests.get(key) as InFlightRequest<T> | undefined;
    if (!inFlight) return null;

    // Check if request is stale (older than 30 seconds)
    const now = Date.now();
    if (now - inFlight.timestamp > 30000) {
      this.inFlightRequests.delete(key);
      return null;
    }

    return inFlight.promise;
  }

  /**
   * Set in-flight request
   */
  private setInFlightRequest<T>(key: string, promise: Promise<T>): void {
    this.inFlightRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    // Remove from in-flight when complete
    promise.finally(() => {
      this.inFlightRequests.delete(key);
    });
  }

  /**
   * Build full URL from path
   */
  private buildUrl(path: string): string {
    // If path is already a full URL, return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // Remove leading slash from path if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;

    // Remove trailing slash from base URL if present
    const cleanBaseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;

    return `${cleanBaseUrl}/${cleanPath}`;
  }

  /**
   * Build request headers
   */
  private buildHeaders(options?: RequestOptions): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add custom headers from options
    if (options?.headers) {
      const customHeaders = new Headers(options.headers);
      customHeaders.forEach((value, key) => {
        (headers as Record<string, string>)[key] = value;
      });
    }

    // Add auth token if available
    if (this.authToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Make HTTP request with all features
   */
  async request<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path);
    const method = options?.method || 'GET';
    const cacheKey = this.getCacheKey(url, options);
    const cacheTTL = options?.cacheTTL ?? this.defaultCacheTTL;
    const skipCache = options?.skipCache || method !== 'GET';
    const skipDeduplication = options?.skipDeduplication || false;

    try {
      // Check cache for GET requests
      if (!skipCache && method === 'GET') {
        const cached = this.getCachedResponse<T>(cacheKey);
        if (cached !== null) {
          logger.debug(`Cache hit for ${method} ${url}`);
          return cached;
        }
      }

      // Check for in-flight request (deduplication)
      if (!skipDeduplication) {
        const inFlight = this.getInFlightRequest<T>(cacheKey);
        if (inFlight) {
          logger.debug(`Deduplicating request for ${method} ${url}`);
          return await inFlight;
        }
      }

      // Build request options
      const requestOptions: RequestInit = {
        ...options,
        method,
        headers: this.buildHeaders(options),
      };

      // Call onRequest interceptor
      if (this.onRequest) {
        this.onRequest(url, requestOptions);
      }

      // Create the fetch promise
      const fetchPromise = this.executeRequest<T>(url, requestOptions, options);

      // Track in-flight request
      if (!skipDeduplication) {
        this.setInFlightRequest(cacheKey, fetchPromise);
      }

      const data = await fetchPromise;

      // Cache GET responses
      if (!skipCache && method === 'GET' && cacheTTL > 0) {
        this.setCachedResponse(cacheKey, data, cacheTTL);
      }

      return data;
    } catch (error) {
      // Call onError interceptor
      if (this.onError && error instanceof Error) {
        this.onError(error);
      }

      // Re-throw with improved error message
      if (error instanceof ApiError || error instanceof NetworkError) {
        throw error;
      }

      const message = getErrorMessage(error);
      logger.error(`Request failed: ${method} ${url}`, { error, message });
      throw new ApiError(
        `Failed to ${method} ${path}: ${message}`,
        undefined,
        url,
        error
      );
    }
  }

  /**
   * Execute the actual request with retry logic
   */
  private async executeRequest<T>(
    url: string,
    options: RequestInit,
    requestOptions?: RequestOptions
  ): Promise<T> {
    const timeout = requestOptions?.timeout ?? this.timeout;
    const retryConfig = requestOptions?.retryConfig ?? this.retryConfig;

    const response = await withRetry(
      () => fetchWithTimeout(url, options, timeout),
      retryConfig
    );

    // Call onResponse interceptor
    if (this.onResponse) {
      this.onResponse(response);
    }

    // Parse JSON response
    const data = await response.json();
    return data as T;
  }

  /**
   * GET request
   */
  async get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /**
   * Clear cache (all or specific key)
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      logger.debug(`Cleared cache for key: ${key}`);
    } else {
      this.cache.clear();
      logger.debug('Cleared all cache');
    }
  }

  /**
   * Clear all in-flight requests
   */
  clearInFlightRequests(): void {
    this.inFlightRequests.clear();
    logger.debug('Cleared all in-flight requests');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Get in-flight request stats
   */
  getInFlightStats(): { count: number; requests: string[] } {
    return {
      count: this.inFlightRequests.size,
      requests: Array.from(this.inFlightRequests.keys()),
    };
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient({
  onRequest: (url, options) => {
    logger.debug(`API Request: ${options.method || 'GET'} ${url}`);
  },
  onResponse: (response) => {
    logger.debug(`API Response: ${response.status} ${response.statusText}`);
  },
  onError: (error) => {
    logger.error('API Error:', error);
  },
});

/**
 * Create a new API client with custom configuration
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

export default apiClient;
