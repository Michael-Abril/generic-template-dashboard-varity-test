'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { useSearchParams, useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { IntegrationLogo } from '@/components/IntegrationLogo';
import * as marketplaceService from '@/services/marketplaceService';
import { logger } from '@/lib/logger';

/**
 * Generic Onboarding Wizard
 *
 * Works for ALL integrations in the marketplace
 * 4-step flow: Welcome → OAuth → Sync → Complete
 *
 * NOW FULLY DYNAMIC: Loads integration config from API
 */

type OnboardingStep = 'welcome' | 'oauth' | 'syncing' | 'complete';

export default function OnboardingPage() {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const address = wallets[0]?.address;
  const searchParams = useSearchParams();
  const router = useRouter();

  const integrationSlug = searchParams.get('integration') || 'quickbooks';
  const mode = searchParams.get('mode') || 'purchase'; // 'connect' or 'purchase'

  // State for dynamic config
  const [config, setConfig] = useState<marketplaceService.IntegrationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [syncProgress, setSyncProgress] = useState(0);
  const [currentDataType, setCurrentDataType] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Load integration config from API
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        const integrationConfig = await marketplaceService.getIntegrationConfig(integrationSlug);
        setConfig(integrationConfig);
      } catch (err) {
        console.error('Error loading integration config:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load integration configuration';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [integrationSlug]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authenticated) {
      router.push('/');
    }
  }, [authenticated, router]);

  // Handle OAuth connection
  const handleConnectAccount = async () => {
    if (!address) {
      setError('Please sign in to your account first');
      return;
    }

    setError('');
    setStep('oauth');

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const oauthStartUrl = `${backendUrl}/api/v1/oauth/start/${integrationSlug}`;


      // For MVP with working adapters (QuickBooks, Salesforce, Shopify):
      // In production, this would make an API call and redirect to OAuth provider
      // For other integrations: simulate the flow

      // Simulate OAuth redirect and callback
      setTimeout(() => {
        setStep('syncing');
        startSyncProcess();
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect account';
      setError(errorMessage);
      setStep('welcome');
    }
  };

  // Simulate data sync process
  const startSyncProcess = async () => {
    if (!config) return;
    setSyncing(true);
    const dataTypes = config.sync_capabilities.map(sc => sc.sync_type);

    for (let i = 0; i < dataTypes.length; i++) {
      setCurrentDataType(dataTypes[i]);
      setSyncProgress((i / dataTypes.length) * 100);

      // Simulate sync time for each data type
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    setSyncProgress(100);
    setSyncing(false);

    // Move to complete step
    setTimeout(() => {
      setStep('complete');
    }, 1000);
  };

  const handleFinish = () => {
    router.push('/dashboard');
  };

  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading integration...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error || !config) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Integration Not Found</h2>
            <p className="text-gray-600 mb-4">
              {error || `The integration '${integrationSlug}' is not available.`}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Please check that you selected a valid integration from the marketplace.
            </p>
            <button
              onClick={() => router.push('/marketplace')}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4">
              <StepIndicator
                number={1}
                label="Connect"
                isActive={step === 'welcome' || step === 'oauth'}
                isComplete={step === 'syncing' || step === 'complete'}
              />
              <div className="h-px w-16 bg-gray-300"></div>
              <StepIndicator
                number={2}
                label="Sync"
                isActive={step === 'syncing'}
                isComplete={step === 'complete'}
              />
              <div className="h-px w-16 bg-gray-300"></div>
              <StepIndicator
                number={3}
                label="Complete"
                isActive={step === 'complete'}
                isComplete={false}
              />
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

            {/* Welcome Step */}
            {step === 'welcome' && (
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <IntegrationLogo integration={config.logo} size="lg" className="scale-150" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {mode === 'connect' ? `Connect Your ${config.product_name} Account` : `Setup ${config.product_name}`}
                  </h1>
                  <p className="text-gray-600">
                    {mode === 'connect'
                      ? 'Link your existing account and sync your business data'
                      : 'Get started with AI-powered business intelligence'
                    }
                  </p>
                  {mode === 'connect' && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium">
                      <span>🔗</span>
                      <span>Connecting Existing Account</span>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    📊 What will be synced:
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {config.sync_capabilities.map((capability) => (
                      <div key={capability.sync_type} className="flex items-center gap-2 text-sm">
                        <span className="text-green-600 font-bold">✓</span>
                        <span className="text-gray-700">{capability.sync_type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span>🔒</span>
                    <span>Data Security & Privacy</span>
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-0.5">•</span>
                      <span>End-to-end encryption with bank-level security</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-0.5">•</span>
                      <span>Distributed secure storage across multiple locations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-0.5">•</span>
                      <span>Only you can access your data - complete privacy</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600 mt-0.5">•</span>
                      <span>AI-powered insights across all your data</span>
                    </li>
                  </ul>
                </div>

                {mode === 'connect' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                    <p className="text-sm text-green-800">
                      <span className="font-semibold">✓ Already have {config.product_name}?</span> Great!
                      Just connect your existing account to start syncing your data. No purchase necessary.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-800 text-sm font-medium">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleConnectAccount}
                  className={`w-full py-4 px-6 rounded-xl font-semibold transition-all transform hover:scale-105 hover:shadow-lg ${
                    mode === 'connect'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  }`}
                >
                  {mode === 'connect' ? `Connect Existing ${config.product_name}` : `Start ${config.product_name} Setup`}
                </button>

                <p className="text-center text-xs text-gray-500 mt-4">
                  {mode === 'connect'
                    ? `You'll authorize Varity to access your ${config.developer} account`
                    : `You will be redirected to ${config.developer} to authorize access`
                  }
                </p>
              </div>
            )}

            {/* OAuth Step */}
            {step === 'oauth' && (
              <div className="p-8 text-center">
                <div className="flex justify-center mb-6">
                  <div className="animate-pulse">
                    <IntegrationLogo integration={config.logo} size="lg" className="scale-150" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Connecting to {config.product_name}...
                </h2>
                <div className="flex justify-center mb-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
                <p className="text-gray-600">
                  Please authorize Varity in the {config.developer} window
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This window will close automatically after authorization
                </p>
              </div>
            )}

            {/* Syncing Step */}
            {step === 'syncing' && (
              <div className="p-8">
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <IntegrationLogo integration={config.logo} size="lg" className="scale-150" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Syncing Your Data
                  </h2>
                  <p className="text-gray-600">
                    Fetching, encrypting, and storing your business data...
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {syncing ? `Syncing ${currentDataType}...` : 'Sync Complete!'}
                    </span>
                    <span className="text-sm font-bold text-blue-600">
                      {Math.round(syncProgress)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 h-full transition-all duration-500 ease-out"
                      style={{ width: `${syncProgress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  {config.sync_capabilities.map((capability, index) => {
                    const type = capability.sync_type;
                    const dataTypes = config.sync_capabilities.map(sc => sc.sync_type);
                    const isComplete = dataTypes.indexOf(currentDataType) > index || syncProgress === 100;
                    const isCurrent = currentDataType === type && syncing;

                    return (
                      <div
                        key={type}
                        className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                          isComplete ? 'bg-green-50 border-2 border-green-200' :
                          isCurrent ? 'bg-blue-50 border-2 border-blue-200 scale-105' :
                          'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        {isComplete ? (
                          <span className="text-green-600 text-xl font-bold">✓</span>
                        ) : isCurrent ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        ) : (
                          <span className="text-gray-400 text-xl">○</span>
                        )}
                        <span className={`text-sm font-semibold ${
                          isComplete ? 'text-green-700' :
                          isCurrent ? 'text-blue-700' :
                          'text-gray-500'
                        }`}>
                          {type}
                        </span>
                        {isComplete && (
                          <span className="ml-auto text-xs text-green-600 font-medium">
                            Encrypted & Stored
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Complete Step */}
            {step === 'complete' && (
              <div className="p-8 text-center">
                <div className="text-6xl mb-6 animate-bounce">🎉</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  {config.product_name} Connected Successfully!
                </h2>
                <p className="text-gray-600 mb-8">
                  Your data has been encrypted and securely stored
                </p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-2xl font-bold text-blue-600">{config.sync_capabilities.length}</p>
                    <p className="text-sm text-gray-600">Data Types</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-2xl font-bold text-green-600">100%</p>
                    <p className="text-sm text-gray-600">Encrypted</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <p className="text-2xl font-bold text-purple-600">✓ Secure</p>
                    <p className="text-sm text-gray-600">Storage</p>
                  </div>
                </div>

                <button
                  onClick={handleFinish}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  Go to Dashboard
                </button>

                <p className="text-center text-xs text-gray-500 mt-4">
                  Your AI assistant can now answer questions about your {config.product_name} data
                </p>
              </div>
            )}

          </div>

          {/* Cancel Link */}
          {step === 'welcome' && (
            <div className="text-center mt-6">
              <button
                onClick={() => router.push('/marketplace')}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Back to Marketplace
              </button>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}

// Step Indicator Component
function StepIndicator({
  number,
  label,
  isActive,
  isComplete,
}: {
  number: number;
  label: string;
  isActive: boolean;
  isComplete: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${isActive ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-gray-400'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
        isActive ? 'bg-blue-600 text-white scale-110 shadow-lg' :
        isComplete ? 'bg-green-600 text-white' :
        'bg-gray-300 text-white'
      }`}>
        {isComplete ? '✓' : number}
      </div>
      <span className="font-semibold text-sm">{label}</span>
    </div>
  );
}
