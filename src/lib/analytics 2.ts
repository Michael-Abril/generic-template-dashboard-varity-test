/**
 * Analytics utility for tracking user events
 *
 * This is a lightweight analytics layer that can be connected to:
 * - Google Analytics 4
 * - Mixpanel
 * - Amplitude
 * - PostHog
 * - Custom backend analytics
 *
 * For now, logs events to console in development.
 * Configure NEXT_PUBLIC_ANALYTICS_ENABLED=true to enable in production.
 */

export type AnalyticsEvent =
  | 'onboarding_started'
  | 'onboarding_step_viewed'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'onboarding_abandoned'
  | 'onboarding_error'
  | 'integration_selected'
  | 'oauth_started'
  | 'oauth_completed'
  | 'oauth_failed'
  | 'company_profile_saved'
  | 'trial_started';

interface EventProperties {
  [key: string]: string | number | boolean | undefined | null;
}

interface AnalyticsUser {
  wallet_address?: string;
  company_name?: string;
  industry?: string;
  company_size?: string;
}

// In-memory session data
let sessionData: {
  sessionId: string;
  startTime: number;
  user: AnalyticsUser;
  pageViews: number;
} | null = null;

// Generate simple session ID
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Initialize session
function initSession(): void {
  if (sessionData) return;

  sessionData = {
    sessionId: generateSessionId(),
    startTime: Date.now(),
    user: {},
    pageViews: 0,
  };
}

// Check if analytics is enabled
function isEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true'
  );
}

// Identify user (call after authentication)
export function identifyUser(user: AnalyticsUser): void {
  initSession();
  if (sessionData) {
    sessionData.user = { ...sessionData.user, ...user };
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] User identified:', user);
  }

  // TODO: Send to analytics provider
  // Example: mixpanel.identify(user.wallet_address);
}

// Track event
export function trackEvent(
  event: AnalyticsEvent,
  properties?: EventProperties
): void {
  if (!isEnabled()) return;

  initSession();

  const eventData = {
    event,
    timestamp: new Date().toISOString(),
    sessionId: sessionData?.sessionId,
    url: typeof window !== 'undefined' ? window.location.pathname : '',
    user: sessionData?.user,
    properties: properties || {},
  };

  // Development: log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', event, properties || '');
  }

  // TODO: Send to analytics provider
  // Example implementations:
  //
  // Google Analytics 4:
  // gtag('event', event, properties);
  //
  // Mixpanel:
  // mixpanel.track(event, { ...properties, ...eventData });
  //
  // PostHog:
  // posthog.capture(event, properties);
  //
  // Custom backend:
  // fetch('/api/v1/analytics/event', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(eventData),
  // });
}

// Track page view
export function trackPageView(page: string): void {
  if (!isEnabled()) return;

  initSession();
  if (sessionData) {
    sessionData.pageViews++;
  }

  trackEvent('onboarding_step_viewed', {
    page,
    pageViews: sessionData?.pageViews,
  });
}

// Track onboarding funnel specifically
export const onboardingAnalytics = {
  // Called when onboarding wizard mounts
  started: (walletAddress?: string) => {
    if (walletAddress) {
      identifyUser({ wallet_address: walletAddress });
    }
    trackEvent('onboarding_started', {
      wallet_address: walletAddress,
    });
  },

  // Called when user moves to a new step
  stepViewed: (step: string, stepIndex: number) => {
    trackEvent('onboarding_step_viewed', {
      step,
      step_index: stepIndex,
    });
  },

  // Called when user completes a step
  stepCompleted: (step: string, stepIndex: number, duration?: number) => {
    trackEvent('onboarding_step_completed', {
      step,
      step_index: stepIndex,
      duration_ms: duration,
    });
  },

  // Called when company profile is saved
  companyProfileSaved: (data: {
    industry?: string;
    company_size?: string;
    has_email?: boolean;
    has_referral?: boolean;
  }) => {
    identifyUser({
      industry: data.industry,
      company_size: data.company_size,
    });
    trackEvent('company_profile_saved', {
      industry: data.industry,
      company_size: data.company_size,
      has_email: data.has_email,
      has_referral: data.has_referral,
    });
  },

  // Called when user selects an integration
  integrationSelected: (integration: string, industry?: string) => {
    trackEvent('integration_selected', {
      integration,
      industry,
    });
  },

  // Called when OAuth flow starts
  oauthStarted: (provider: string) => {
    trackEvent('oauth_started', {
      provider,
    });
  },

  // Called when OAuth completes successfully
  oauthCompleted: (provider: string) => {
    trackEvent('oauth_completed', {
      provider,
    });
  },

  // Called when OAuth fails
  oauthFailed: (provider: string, error?: string) => {
    trackEvent('oauth_failed', {
      provider,
      error,
    });
  },

  // Called when onboarding is fully completed
  completed: (data: {
    integration?: string;
    trial_tier?: string;
    trial_days?: number;
  }) => {
    trackEvent('onboarding_completed', {
      integration: data.integration,
      trial_tier: data.trial_tier,
      trial_days: data.trial_days,
    });
    trackEvent('trial_started', {
      tier: data.trial_tier,
      days: data.trial_days,
    });
  },

  // Called when user abandons onboarding (leaves before completing)
  abandoned: (lastStep: string, stepIndex: number) => {
    trackEvent('onboarding_abandoned', {
      last_step: lastStep,
      step_index: stepIndex,
    });
  },

  // Called when an error occurs
  error: (step: string, error: string) => {
    trackEvent('onboarding_error', {
      step,
      error,
    });
  },
};
