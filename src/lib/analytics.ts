/**
 * Umami Analytics Integration
 *
 * Privacy-focused, self-hosted analytics via Umami.
 * Can be deployed on decentralized infrastructure (Akash Network).
 *
 * Features:
 * - No cookies required
 * - GDPR compliant
 * - Self-hosted for data sovereignty
 * - Lightweight (~1kb)
 *
 * Setup:
 * 1. Set NEXT_PUBLIC_UMAMI_WEBSITE_ID in environment
 * 2. Add Umami script to layout or _document
 * 3. Use trackEvent() for custom events
 */

// Umami window type declaration
declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, string | number | boolean>) => void;
    };
  }
}

// Check if Umami is available
function isUmamiAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.umami?.track === 'function';
}

// Generic event tracking
export function trackEvent(
  eventName: string,
  eventData?: Record<string, string | number | boolean>
): void {
  if (!isUmamiAvailable()) {
    // Log in development if Umami not loaded
    if (process.env.NODE_ENV === 'development') {
      console.log('[Umami - not loaded]', eventName, eventData || '');
    }
    return;
  }

  try {
    window.umami?.track(eventName, eventData);
  } catch (err) {
    console.warn('Umami tracking error:', err);
  }
}

// Onboarding-specific analytics
export const onboardingAnalytics = {
  // Called when onboarding wizard mounts
  started: () => {
    trackEvent('onboarding-started');
  },

  // Called when user moves to a new step
  stepViewed: (step: string, stepIndex: number) => {
    trackEvent('onboarding-step-viewed', {
      step,
      step_index: stepIndex,
    });
  },

  // Called when user completes a step
  stepCompleted: (step: string, stepIndex: number) => {
    trackEvent('onboarding-step-completed', {
      step,
      step_index: stepIndex,
    });
  },

  // Called when company profile is saved
  companyProfileSaved: (industry?: string, companySize?: string) => {
    trackEvent('company-profile-saved', {
      industry: industry || 'not-specified',
      company_size: companySize || 'not-specified',
    });
  },

  // Called when user selects an integration
  integrationSelected: (integration: string) => {
    trackEvent('integration-selected', {
      integration,
    });
  },

  // Called when OAuth flow starts
  oauthStarted: (provider: string) => {
    trackEvent('oauth-started', {
      provider,
    });
  },

  // Called when OAuth completes successfully
  oauthCompleted: (provider: string) => {
    trackEvent('oauth-completed', {
      provider,
    });
  },

  // Called when OAuth fails
  oauthFailed: (provider: string) => {
    trackEvent('oauth-failed', {
      provider,
    });
  },

  // Called when onboarding is fully completed
  completed: (integration?: string, trialTier?: string) => {
    trackEvent('onboarding-completed', {
      integration: integration || 'none',
      trial_tier: trialTier || '30_day',
    });
  },

  // Called when user skips a step
  stepSkipped: (step: string) => {
    trackEvent('onboarding-step-skipped', {
      step,
    });
  },

  // Called when an error occurs
  error: (step: string, errorType: string) => {
    trackEvent('onboarding-error', {
      step,
      error_type: errorType,
    });
  },
};
