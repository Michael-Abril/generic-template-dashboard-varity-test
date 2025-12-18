/**
 * Frontend Performance Monitoring
 *
 * Tracks Core Web Vitals and custom metrics for production monitoring
 */

/**
 * Web Vitals metric types
 */
export interface Metric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'prerender';
}

/**
 * Track Core Web Vitals (CLS, FID, FCP, LCP, TTFB)
 *
 * Sends metrics to Google Analytics
 *
 * @param metric - Web Vitals metric object
 *
 * @example
 * ```typescript
 * import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
 *
 * getCLS(trackWebVitals);
 * getFID(trackWebVitals);
 * getFCP(trackWebVitals);
 * getLCP(trackWebVitals);
 * getTTFB(trackWebVitals);
 * ```
 */
export function trackWebVitals(metric: Metric) {
  const { id, name, value, rating } = metric;

  // Send to Google Analytics (if configured)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', name, {
      event_category: 'Web Vitals',
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      event_label: id,
      non_interaction: true,
    });
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${name}:`, {
      value,
      rating,
      id,
    });
  }
}

/**
 * Track custom performance metrics
 *
 * @param name - Metric name (e.g., "marketplace_load_time")
 * @param value - Metric value (in milliseconds or other unit)
 * @param unit - Unit of measurement (default: "ms")
 *
 * @example
 * ```typescript
 * trackMetric('marketplace_load_time', 1234, 'ms');
 * trackMetric('nft_mint_time', 3456, 'ms');
 * trackMetric('api_calls_count', 42, 'count');
 * ```
 */
export function trackMetric(name: string, value: number, unit: string = 'ms') {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Metric] ${name}: ${value} ${unit}`);
  }
}

/**
 * Track page load performance
 *
 * Measures time from navigation start to page load complete
 *
 * @example
 * ```typescript
 * // In your page component
 * useEffect(() => {
 *   trackPageLoad();
 * }, []);
 * ```
 */
export function trackPageLoad() {
  if (typeof window === 'undefined') return;

  try {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
    const firstPaintTime = perfData.responseEnd - perfData.fetchStart;

    trackMetric('page_load_time', pageLoadTime, 'ms');
    trackMetric('dom_ready_time', domReadyTime, 'ms');
    trackMetric('first_paint_time', firstPaintTime, 'ms');
  } catch (error) {
    // Performance API not available
    console.warn('Performance tracking not available');
  }
}

/**
 * Track API response times
 *
 * @param endpoint - API endpoint name
 * @param duration - Request duration in milliseconds
 * @param success - Whether the request was successful
 *
 * @example
 * ```typescript
 * const startTime = Date.now();
 * try {
 *   const response = await fetch('/api/v1/marketplace/products');
 *   trackAPIResponse('marketplace_products', Date.now() - startTime, true);
 * } catch (error) {
 *   trackAPIResponse('marketplace_products', Date.now() - startTime, false);
 * }
 * ```
 */
export function trackAPIResponse(endpoint: string, duration: number, success: boolean) {
  const metricName = `api_${endpoint.replace(/\//g, '_')}_duration`;
  trackMetric(metricName, duration, 'ms');

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${endpoint}:`, {
      duration,
      success,
      status: success ? 'success' : 'failure',
    });
  }
}

/**
 * Track blockchain transaction performance
 *
 * @param transactionType - Type of transaction (e.g., "nft_mint", "usdc_transfer")
 * @param duration - Transaction duration in milliseconds
 * @param success - Whether the transaction succeeded
 * @param txHash - Transaction hash (optional)
 *
 * @example
 * ```typescript
 * const startTime = Date.now();
 * try {
 *   const tx = await contract.mint();
 *   const receipt = await tx.wait();
 *   trackBlockchainTransaction('nft_mint', Date.now() - startTime, true, receipt.hash);
 * } catch (error) {
 *   trackBlockchainTransaction('nft_mint', Date.now() - startTime, false);
 * }
 * ```
 */
export function trackBlockchainTransaction(
  transactionType: string,
  duration: number,
  success: boolean,
  txHash?: string
) {
  const metricName = `blockchain_${transactionType}_duration`;
  trackMetric(metricName, duration, 'ms');

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Blockchain] ${transactionType}:`, {
      duration,
      success,
      txHash,
      status: success ? 'success' : 'failure',
    });
  }
}

/**
 * Start a performance timer
 *
 * Returns a function to stop the timer and track the metric
 *
 * @param metricName - Name of the metric to track
 * @returns Function to stop the timer
 *
 * @example
 * ```typescript
 * const stopTimer = startTimer('data_processing');
 * // ... do work ...
 * stopTimer(); // Automatically tracks "data_processing" metric
 * ```
 */
export function startTimer(metricName: string): () => void {
  const startTime = Date.now();

  return () => {
    const duration = Date.now() - startTime;
    trackMetric(metricName, duration, 'ms');
  };
}

/**
 * Track component render time
 *
 * Use in React components with useEffect
 *
 * @param componentName - Name of the component
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   trackComponentRender('MarketplacePage');
 * }, []);
 * ```
 */
export function trackComponentRender(componentName: string) {
  trackMetric(`component_${componentName}_render`, performance.now(), 'ms');
}

/**
 * Track user interaction events
 *
 * @param action - Action type (e.g., "button_click", "form_submit")
 * @param label - Action label (e.g., "purchase_product", "connect_wallet")
 * @param value - Optional numeric value
 *
 * @example
 * ```typescript
 * trackInteraction('button_click', 'connect_wallet');
 * trackInteraction('form_submit', 'merchant_registration');
 * trackInteraction('purchase', 'quickbooks_integration', 299);
 * ```
 */
export function trackInteraction(action: string, label: string, value?: number) {
  // Send to Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: 'User Interaction',
      event_label: label,
      value,
    });
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[User Interaction] ${action}: ${label}`, { value });
  }
}

/**
 * Performance monitoring wrapper for async functions
 *
 * Automatically tracks execution time and errors
 *
 * @param metricName - Name of the metric
 * @param fn - Async function to wrap
 * @returns Wrapped function
 *
 * @example
 * ```typescript
 * const fetchProducts = withPerformanceTracking(
 *   'fetch_products',
 *   async () => {
 *     const response = await fetch('/api/v1/marketplace/products');
 *     return response.json();
 *   }
 * );
 *
 * const products = await fetchProducts();
 * ```
 */
export function withPerformanceTracking<T>(
  metricName: string,
  fn: () => Promise<T>
): () => Promise<T> {
  return async () => {
    const stopTimer = startTimer(metricName);
    try {
      const result = await fn();
      stopTimer();
      return result;
    } catch (error) {
      stopTimer();

      // Log error in development
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Performance Error] ${metricName}:`, error);
      }

      throw error;
    }
  };
}
