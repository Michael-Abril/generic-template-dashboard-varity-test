/**
 * Analytics Integration
 *
 * This module provides analytics tracking for user behavior and events.
 * Supports multiple analytics providers (Vercel Analytics, Google Analytics, Plausible).
 *
 * Setup Instructions:
 *
 * OPTION 1: Vercel Analytics (Recommended - FREE on Vercel)
 * 1. Deploy to Vercel
 * 2. Enable Analytics in project settings
 * 3. Install: npm install @vercel/analytics
 * 4. Add to .env.local: NEXT_PUBLIC_ANALYTICS_PROVIDER=vercel
 *
 * OPTION 2: Google Analytics (FREE)
 * 1. Create GA4 property at https://analytics.google.com
 * 2. Get Measurement ID (G-XXXXXXXXXX)
 * 3. Add to .env.local:
 *    NEXT_PUBLIC_ANALYTICS_PROVIDER=google
 *    NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
 *
 * OPTION 3: Plausible Analytics (Privacy-focused, paid)
 * 1. Create account at https://plausible.io
 * 2. Add domain
 * 3. Add to .env.local:
 *    NEXT_PUBLIC_ANALYTICS_PROVIDER=plausible
 *    NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.com
 *
 * Features:
 * - Page view tracking
 * - Custom event tracking
 * - User journey tracking
 * - Conversion tracking
 * - Privacy-preserving (no cookies required)
 */

// Types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

export interface PageViewEvent {
  path: string;
  title?: string;
  referrer?: string;
}

export interface ConversionEvent {
  name: string;
  value?: number;
  currency?: string;
}

type AnalyticsProvider = 'vercel' | 'google' | 'plausible' | 'umami' | 'none';

/**
 * Get configured analytics provider
 */
function getProvider(): AnalyticsProvider {
  const provider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER as AnalyticsProvider;
  return provider || 'none';
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return getProvider() !== 'none';
}

/**
 * Initialize analytics
 * Call this once in your app root
 */
export function initAnalytics(): void {
  const provider = getProvider();

  if (provider === 'none') {
    console.log('[Analytics] Analytics disabled - no provider configured');
    return;
  }

  console.log(`[Analytics] Initializing ${provider} analytics`);

  switch (provider) {
    case 'vercel':
      initVercelAnalytics();
      break;
    case 'google':
      initGoogleAnalytics();
      break;
    case 'plausible':
      initPlausibleAnalytics();
      break;
    case 'umami':
      initUmamiAnalytics();
      break;
  }
}

/**
 * Initialize Vercel Analytics
 */
function initVercelAnalytics(): void {
  // Vercel Analytics auto-initializes when you import from @vercel/analytics
  // No configuration needed
  console.log('[Analytics] Vercel Analytics initialized (auto-configured)');
}

/**
 * Initialize Google Analytics
 */
function initGoogleAnalytics(): void {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!measurementId) {
    console.warn('[Analytics] Google Analytics enabled but NEXT_PUBLIC_GA_MEASUREMENT_ID not set');
    return;
  }

  // Add Google Analytics script to page
  if (typeof window !== 'undefined') {
    const script1 = document.createElement('script');
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script1.async = true;
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}', {
        page_path: window.location.pathname,
        send_page_view: false
      });
    `;
    document.head.appendChild(script2);

    console.log('[Analytics] Google Analytics initialized:', measurementId);
  }
}

/**
 * Initialize Plausible Analytics
 */
function initPlausibleAnalytics(): void {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  if (!domain) {
    console.warn('[Analytics] Plausible enabled but NEXT_PUBLIC_PLAUSIBLE_DOMAIN not set');
    return;
  }

  // Add Plausible script to page
  if (typeof window !== 'undefined') {
    const script = document.createElement('script');
    script.defer = true;
    script.setAttribute('data-domain', domain);
    script.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(script);

    console.log('[Analytics] Plausible Analytics initialized:', domain);
  }
}

/**
 * Initialize Umami Analytics (Privacy-focused, GDPR compliant)
 *
 * Setup Instructions:
 * 1. Create account at https://cloud.umami.is or self-host
 * 2. Add your website and get the website ID
 * 3. Add to .env.local:
 *    NEXT_PUBLIC_ANALYTICS_PROVIDER=umami
 *    NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id
 *    NEXT_PUBLIC_UMAMI_URL=https://cloud.umami.is/script.js
 */
function initUmamiAnalytics(): void {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL || 'https://cloud.umami.is/script.js';

  if (!websiteId) {
    console.warn('[Analytics] Umami enabled but NEXT_PUBLIC_UMAMI_WEBSITE_ID not set');
    return;
  }

  // Add Umami script to page
  if (typeof window !== 'undefined') {
    const script = document.createElement('script');
    script.defer = true;
    script.setAttribute('data-website-id', websiteId);
    script.src = umamiUrl;
    document.head.appendChild(script);

    console.log('[Analytics] Umami Analytics initialized:', websiteId);
  }
}

/**
 * Track page view
 * Call this on route changes
 */
export function trackPageView(event: PageViewEvent): void {
  if (!isAnalyticsEnabled()) return;

  const provider = getProvider();

  switch (provider) {
    case 'vercel':
      // Vercel Analytics auto-tracks page views
      break;

    case 'google':
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'page_view', {
          page_path: event.path,
          page_title: event.title,
          page_referrer: event.referrer,
        });
      }
      break;

    case 'plausible':
      if (typeof window !== 'undefined' && (window as any).plausible) {
        (window as any).plausible('pageview', {
          u: event.path,
        });
      }
      break;

    case 'umami':
      if (typeof window !== 'undefined' && (window as any).umami) {
        (window as any).umami.track('pageview', {
          url: event.path,
          title: event.title,
          referrer: event.referrer,
        });
      }
      break;
  }

  console.log('[Analytics] Page view:', event.path);
}

/**
 * Track custom event
 * Use this to track user interactions
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (!isAnalyticsEnabled()) {
    console.log('[Analytics Disabled] Event:', event.name, event.properties);
    return;
  }

  const provider = getProvider();

  switch (provider) {
    case 'vercel':
      // Vercel Analytics uses data attributes on elements
      // Or you can use their track() function if installed
      if (typeof window !== 'undefined' && (window as any).va) {
        (window as any).va('track', event.name, event.properties);
      }
      break;

    case 'google':
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', event.name, event.properties);
      }
      break;

    case 'plausible':
      if (typeof window !== 'undefined' && (window as any).plausible) {
        (window as any).plausible(event.name, {
          props: event.properties,
        });
      }
      break;

    case 'umami':
      if (typeof window !== 'undefined' && (window as any).umami) {
        (window as any).umami.track(event.name, event.properties);
      }
      break;
  }

  console.log('[Analytics] Event:', event.name, event.properties);
}

/**
 * Track conversion event
 * Use this for important business metrics
 */
export function trackConversion(event: ConversionEvent): void {
  trackEvent({
    name: event.name,
    properties: {
      value: event.value,
      currency: event.currency || 'USD',
      event_category: 'conversion',
    },
  });
}

// Pre-defined event tracking functions

export function trackWalletConnection(provider: string): void {
  trackEvent({
    name: 'wallet_connected',
    properties: {
      provider: provider,
    },
  });
}

export function trackPurchase(productId: string, price: number): void {
  trackConversion({
    name: 'purchase',
    value: price,
  });

  trackEvent({
    name: 'product_purchased',
    properties: {
      product_id: productId,
      price: price,
    },
  });
}

export function trackOAuthConnection(provider: string, success: boolean): void {
  trackEvent({
    name: 'oauth_connection',
    properties: {
      provider: provider,
      success: success,
    },
  });
}

export function trackDashboardView(dashboardType: string): void {
  trackEvent({
    name: 'dashboard_view',
    properties: {
      dashboard_type: dashboardType,
    },
  });
}

export function trackAIQuery(queryLength: number, responseTime: number): void {
  trackEvent({
    name: 'ai_query',
    properties: {
      query_length: queryLength,
      response_time_ms: responseTime,
    },
  });
}

export function trackError(errorType: string, errorMessage: string): void {
  trackEvent({
    name: 'error_occurred',
    properties: {
      error_type: errorType,
      error_message: errorMessage,
    },
  });
}

export function trackFormSubmission(formName: string, success: boolean): void {
  trackEvent({
    name: 'form_submission',
    properties: {
      form_name: formName,
      success: success,
    },
  });
}

export function trackFeatureUsage(featureName: string): void {
  trackEvent({
    name: 'feature_used',
    properties: {
      feature_name: featureName,
    },
  });
}

/**
 * Get analytics configuration status
 */
export function getAnalyticsStatus() {
  const provider = getProvider();

  return {
    enabled: isAnalyticsEnabled(),
    provider: provider,
    configured: provider !== 'none',
  };
}

export default {
  isAnalyticsEnabled,
  initAnalytics,
  trackPageView,
  trackEvent,
  trackConversion,
  trackWalletConnection,
  trackPurchase,
  trackOAuthConnection,
  trackDashboardView,
  trackAIQuery,
  trackError,
  trackFormSubmission,
  trackFeatureUsage,
  getAnalyticsStatus,
};
