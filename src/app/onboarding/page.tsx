'use client';

import { Suspense } from 'react';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import type { OnboardingStep } from '@/components/onboarding/OnboardingWizard';

/**
 * Enhanced Onboarding Page
 *
 * 6-step progressive onboarding flow:
 * 1. Welcome - Value proposition and trial tier badge
 * 2. Company Profile - Collect company name, industry, size for AI personalization
 * 3. Integration Select - Industry-filtered integration recommendations
 * 4. OAuth - Real OAuth redirect to provider (NOT simulated)
 * 5. Syncing - Data sync progress with encryption status
 * 6. Complete - AI assistant introduction and next steps
 *
 * Handles:
 * - New user onboarding (full 6-step flow)
 * - Integration-specific onboarding (pre-selects integration from URL param)
 * - OAuth return (resumes flow after OAuth callback)
 *
 * URL Parameters:
 * - integration: Pre-selected integration slug (e.g., 'quickbooks')
 * - step: Resume from specific step (e.g., 'syncing' after OAuth return)
 */

function OnboardingContent() {
  return <OnboardingWizard />;
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your dashboard...</p>
          </div>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
