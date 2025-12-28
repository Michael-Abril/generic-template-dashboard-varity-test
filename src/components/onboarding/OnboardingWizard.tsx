'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { useSearchParams, useRouter } from 'next/navigation';
import { OnboardingProgress } from './OnboardingProgress';
import { TrialBadge } from './TrialBadge';
import { WelcomeStep } from './steps/WelcomeStep';
import { CompanyProfileStep } from './steps/CompanyProfileStep';
import { IntegrationSelectStep } from './steps/IntegrationSelectStep';
import { OAuthConnectStep } from './steps/OAuthConnectStep';
import { SyncingStep } from './steps/SyncingStep';
import { CompleteStep } from './steps/CompleteStep';
import { onboardingAnalytics } from '@/lib/analytics';

// localStorage key for draft data backup
const ONBOARDING_DRAFT_KEY = 'varity_onboarding_draft';

export type OnboardingStep =
  | 'welcome'
  | 'company_profile'
  | 'integration_select'
  | 'oauth'
  | 'syncing'
  | 'complete';

export interface OnboardingState {
  step: OnboardingStep;
  companyName: string;
  industry: string;
  companySize: string;
  primaryGoal: string;
  contactEmail: string;
  contactName: string;
  referralSource: string;
  selectedIntegration: string | null;
  trialTier: '30_day' | '14_day' | null;
  trialDays: number;
}

interface OnboardingWizardProps {
  initialIntegration?: string;
  initialStep?: OnboardingStep;
}

const STEPS: OnboardingStep[] = [
  'welcome',
  'company_profile',
  'integration_select',
  'oauth',
  'syncing',
  'complete'
];

// Integration name mapping
const INTEGRATION_NAMES: Record<string, string> = {
  quickbooks: 'QuickBooks',
  google: 'Google Workspace',
  slack: 'Slack',
  salesforce: 'Salesforce',
  hubspot: 'HubSpot',
  shopify: 'Shopify',
  stripe: 'Stripe',
  xero: 'Xero',
  freshbooks: 'FreshBooks',
  zoom: 'Zoom',
  dropbox: 'Dropbox',
  square: 'Square',
  monday: 'Monday.com',
  github: 'GitHub',
  jira: 'Jira',
  docusign: 'DocuSign',
  mailchimp: 'Mailchimp',
  microsoft: 'Microsoft 365',
};

function getIntegrationName(slug: string): string {
  return INTEGRATION_NAMES[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function OnboardingWizard({
  initialIntegration,
  initialStep
}: OnboardingWizardProps) {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const address = wallets?.[0]?.address;
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get integration from URL or props
  const integrationSlug = searchParams.get('integration') || initialIntegration || '';
  const urlStep = searchParams.get('step') as OnboardingStep | null;
  const referralCode = searchParams.get('ref');

  // Initialize state with localStorage draft if available
  const getInitialState = (): OnboardingState => {
    const defaultState: OnboardingState = {
      step: urlStep || initialStep || 'welcome',
      companyName: '',
      industry: '',
      companySize: '',
      primaryGoal: '',
      contactEmail: '',
      contactName: '',
      referralSource: referralCode ? `Referral: ${referralCode}` : '',
      selectedIntegration: integrationSlug || null,
      trialTier: null,
      trialDays: 30,
    };

    // Try to restore from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      try {
        const draft = localStorage.getItem(ONBOARDING_DRAFT_KEY);
        if (draft) {
          const parsed = JSON.parse(draft);
          // Merge draft with defaults, keeping URL params as priority
          return {
            ...defaultState,
            ...parsed,
            step: urlStep || parsed.step || defaultState.step,
            selectedIntegration: integrationSlug || parsed.selectedIntegration || null,
          };
        }
      } catch (err) {
        console.warn('Failed to restore onboarding draft:', err);
      }
    }
    return defaultState;
  };

  const [state, setState] = useState<OnboardingState>(getInitialState);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastSavedRef = useRef<string>('');

  // Save draft to localStorage whenever state changes (debounced)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (state.step === 'complete') {
      // Clear draft when onboarding completes
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
      return;
    }

    const draftData = {
      companyName: state.companyName,
      industry: state.industry,
      companySize: state.companySize,
      primaryGoal: state.primaryGoal,
      contactEmail: state.contactEmail,
      contactName: state.contactName,
      referralSource: state.referralSource,
      selectedIntegration: state.selectedIntegration,
      step: state.step,
    };

    const serialized = JSON.stringify(draftData);
    // Only save if data changed (avoid unnecessary writes)
    if (serialized !== lastSavedRef.current) {
      lastSavedRef.current = serialized;
      localStorage.setItem(ONBOARDING_DRAFT_KEY, serialized);
    }
  }, [state]);

  // Fetch onboarding status and trial tier on mount
  useEffect(() => {
    const fetchOnboardingStatus = async () => {
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        // Fetch onboarding status
        const statusRes = await fetch(
          `${backendUrl}/api/v1/onboarding/status?wallet_address=${address}`
        );

        if (statusRes.ok) {
          const statusData = await statusRes.json();

          // If onboarding already completed, redirect to dashboard
          if (statusData.onboarding_completed) {
            router.push('/dashboard');
            return;
          }

          // Update state with existing data
          setState(prev => ({
            ...prev,
            companyName: statusData.company_name || '',
            industry: statusData.industry || '',
            companySize: statusData.company_size || '',
            trialTier: statusData.trial_tier || null,
            trialDays: statusData.trial_days || 30,
            // Resume from last step if user left mid-flow
            step: urlStep || statusData.current_step || prev.step,
          }));
        }

        // Fetch trial tier for new users
        const tierRes = await fetch(`${backendUrl}/api/v1/onboarding/trial-tier`);
        if (tierRes.ok) {
          const tierData = await tierRes.json();
          setState(prev => ({
            ...prev,
            trialTier: prev.trialTier || tierData.trial_tier,
            trialDays: prev.trialDays || tierData.trial_days,
          }));
        }

      } catch (err) {
        console.error('Error fetching onboarding status:', err);
        setError('Failed to load onboarding status');
      } finally {
        setLoading(false);
      }
    };

    fetchOnboardingStatus();
  }, [address, router, urlStep]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authenticated && !loading) {
      router.push('/');
    }
  }, [authenticated, loading, router]);

  // Track onboarding started (once when wizard loads)
  useEffect(() => {
    if (!loading && authenticated) {
      onboardingAnalytics.started();
    }
  }, [loading, authenticated]);

  // Track step changes
  useEffect(() => {
    const stepIndex = STEPS.indexOf(state.step);
    onboardingAnalytics.stepViewed(state.step, stepIndex);
  }, [state.step]);

  // Save current step to backend
  const saveStep = useCallback(async (step: OnboardingStep) => {
    if (!address) return;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await fetch(
        `${backendUrl}/api/v1/onboarding/step?wallet_address=${address}&step=${step}`,
        { method: 'PUT' }
      );
    } catch (err) {
      console.error('Error saving onboarding step:', err);
    }
  }, [address]);

  // Navigation functions
  const goToStep = useCallback((step: OnboardingStep) => {
    setState(prev => ({ ...prev, step }));
    saveStep(step);
  }, [saveStep]);

  const nextStep = useCallback(() => {
    const currentIndex = STEPS.indexOf(state.step);
    // Track step completion before moving
    onboardingAnalytics.stepCompleted(state.step, currentIndex);
    if (currentIndex < STEPS.length - 1) {
      goToStep(STEPS[currentIndex + 1]);
    }
  }, [state.step, goToStep]);

  const prevStep = useCallback(() => {
    const currentIndex = STEPS.indexOf(state.step);
    if (currentIndex > 0) {
      goToStep(STEPS[currentIndex - 1]);
    }
  }, [state.step, goToStep]);

  // Update state functions
  const updateCompanyProfile = useCallback((data: {
    companyName?: string;
    industry?: string;
    companySize?: string;
    primaryGoal?: string;
    contactEmail?: string;
    contactName?: string;
    referralSource?: string;
  }) => {
    setState(prev => ({
      ...prev,
      ...data,
    }));
  }, []);

  const selectIntegration = useCallback((integration: string) => {
    setState(prev => ({
      ...prev,
      selectedIntegration: integration,
    }));
  }, []);

  // Handle completing the onboarding flow
  const handleCompleteOnboarding = useCallback(async () => {
    if (!address) return;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // Mark onboarding as complete
      const response = await fetch(
        `${backendUrl}/api/v1/onboarding/complete?wallet_address=${address}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to complete onboarding');
      }

      // Track onboarding completion
      onboardingAnalytics.completed(
        state.selectedIntegration || undefined,
        state.trialTier || undefined
      );

      // Clear the localStorage draft on successful completion
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ONBOARDING_DRAFT_KEY);
      }
    } catch (err) {
      console.error('Error completing onboarding:', err);
      onboardingAnalytics.error('complete', 'api_error');
      throw err; // Re-throw so CompleteStep can handle
    }
  }, [address, state.selectedIntegration, state.trialTier]);

  // Get current step index for progress indicator
  const currentStepIndex = STEPS.indexOf(state.step);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Trial Badge */}
        {state.trialTier && (
          <div className="flex justify-center mb-6">
            <TrialBadge
              tier={state.trialTier}
              days={state.trialDays}
            />
          </div>
        )}

        {/* Progress Indicator */}
        <OnboardingProgress
          currentStep={currentStepIndex}
          totalSteps={STEPS.length}
          steps={['Welcome', 'Your Business', 'Select Tool', 'Authorize', 'Syncing', 'Complete']}
        />

        {/* Step Content */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl overflow-hidden">
          {state.step === 'welcome' && (
            <WelcomeStep
              trialDays={state.trialDays}
              onNext={nextStep}
            />
          )}

          {state.step === 'company_profile' && (
            <CompanyProfileStep
              companyName={state.companyName}
              industry={state.industry}
              companySize={state.companySize}
              primaryGoal={state.primaryGoal}
              contactEmail={state.contactEmail}
              contactName={state.contactName}
              referralSource={state.referralSource}
              onUpdate={updateCompanyProfile}
              onNext={nextStep}
              onBack={prevStep}
              walletAddress={address || ''}
            />
          )}

          {state.step === 'integration_select' && (
            <IntegrationSelectStep
              industry={state.industry}
              selectedIntegration={state.selectedIntegration}
              onSelect={selectIntegration}
              onNext={nextStep}
              onBack={prevStep}
              onSkip={() => goToStep('complete')}
            />
          )}

          {state.step === 'oauth' && state.selectedIntegration && (
            <OAuthConnectStep
              integration={state.selectedIntegration}
              integrationName={getIntegrationName(state.selectedIntegration)}
              walletAddress={address || ''}
              onBack={prevStep}
              onSkip={() => goToStep('complete')}
            />
          )}

          {state.step === 'syncing' && state.selectedIntegration && (
            <SyncingStep
              integration={state.selectedIntegration}
              integrationName={getIntegrationName(state.selectedIntegration)}
              walletAddress={address || ''}
              onComplete={() => goToStep('complete')}
            />
          )}

          {state.step === 'complete' && (
            <CompleteStep
              companyName={state.companyName}
              integration={state.selectedIntegration}
              trialDays={state.trialDays}
              walletAddress={address || ''}
              onComplete={handleCompleteOnboarding}
            />
          )}
        </div>

        {/* Back to Marketplace link on welcome step */}
        {state.step === 'welcome' && (
          <div className="text-center mt-6">
            <button
              onClick={() => router.push('/marketplace')}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              &larr; Back to Marketplace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
