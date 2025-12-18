/**
 * Onboarding Analytics - Uses Umami via existing monitoring system
 *
 * To enable Umami analytics:
 * 1. Add to .env.local:
 *    NEXT_PUBLIC_ANALYTICS_PROVIDER=umami
 *    NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id
 *    NEXT_PUBLIC_UMAMI_URL=your-umami-url (or use cloud.umami.is)
 *
 * Since you're using Umami for the Varity marketing website,
 * you can use the same Umami instance for the dashboard.
 */

import { trackEvent, trackFormSubmission, trackOAuthConnection } from '@/lib/monitoring/analytics';

// Onboarding-specific analytics using the existing system
export const onboardingAnalytics = {
  // Called when onboarding wizard mounts
  started: () => {
    trackEvent({
      name: 'onboarding_started',
    });
  },

  // Called when user moves to a new step
  stepViewed: (step: string, stepIndex: number) => {
    trackEvent({
      name: 'onboarding_step_viewed',
      properties: {
        step,
        step_index: stepIndex,
      },
    });
  },

  // Called when user completes a step
  stepCompleted: (step: string, stepIndex: number) => {
    trackEvent({
      name: 'onboarding_step_completed',
      properties: {
        step,
        step_index: stepIndex,
      },
    });
  },

  // Called when company profile is saved
  companyProfileSaved: (industry?: string, companySize?: string) => {
    trackFormSubmission('company_profile', true);
    trackEvent({
      name: 'company_profile_saved',
      properties: {
        industry: industry || 'not_specified',
        company_size: companySize || 'not_specified',
      },
    });
  },

  // Called when user selects an integration
  integrationSelected: (integration: string) => {
    trackEvent({
      name: 'integration_selected',
      properties: {
        integration,
      },
    });
  },

  // Called when OAuth flow starts
  oauthStarted: (provider: string) => {
    trackEvent({
      name: 'oauth_started',
      properties: {
        provider,
      },
    });
  },

  // Called when OAuth completes successfully
  oauthCompleted: (provider: string) => {
    trackOAuthConnection(provider, true);
  },

  // Called when OAuth fails
  oauthFailed: (provider: string) => {
    trackOAuthConnection(provider, false);
  },

  // Called when onboarding is fully completed
  completed: (integration?: string, trialTier?: string) => {
    trackEvent({
      name: 'onboarding_completed',
      properties: {
        integration: integration || 'none',
        trial_tier: trialTier || '30_day',
      },
    });
    trackEvent({
      name: 'trial_started',
      properties: {
        tier: trialTier || '30_day',
      },
    });
  },

  // Called when user skips a step
  stepSkipped: (step: string) => {
    trackEvent({
      name: 'onboarding_step_skipped',
      properties: {
        step,
      },
    });
  },

  // Called when an error occurs
  error: (step: string, errorType: string) => {
    trackEvent({
      name: 'onboarding_error',
      properties: {
        step,
        error_type: errorType,
      },
    });
  },
};
