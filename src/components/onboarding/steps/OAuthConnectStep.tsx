'use client';

import { useState } from 'react';
import { Link2, ArrowLeft, Loader2, ExternalLink, AlertCircle, Shield, CheckCircle2 } from 'lucide-react';
import { IntegrationLogo } from '@/components/IntegrationLogo';

interface OAuthConnectStepProps {
  integration: string;
  integrationName: string;
  walletAddress: string;
  onBack: () => void;
  onSkip: () => void;
}

export function OAuthConnectStep({
  integration,
  integrationName,
  walletAddress,
  onBack,
  onSkip,
}: OAuthConnectStepProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!walletAddress) {
      setError('Wallet not connected. Please refresh and try again.');
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // Start the OAuth flow
      const response = await fetch(`${backendUrl}/api/v1/oauth/start/${integration}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Failed to start OAuth flow');
      }

      if (data.authorization_url) {
        // Store onboarding state before redirect so we can return here
        localStorage.setItem('onboarding_integration', integration);
        localStorage.setItem('onboarding_step', 'oauth');
        localStorage.setItem('onboarding_return', 'true');

        // Redirect to the OAuth provider
        window.location.href = data.authorization_url;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (err) {
      console.error('OAuth start error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect. Please try again.');
      setConnecting(false);
    }
  };

  return (
    <div className="p-8 sm:p-10">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-xl"></div>
            <div className="relative w-18 h-18 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Link2 className="w-9 h-9 text-white" />
            </div>
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
          Connect {integrationName}
        </h2>
        <p className="text-gray-600 text-lg max-w-md mx-auto">
          You&apos;ll be redirected to {integrationName} to authorize the connection securely
        </p>
      </div>

      {/* Integration Card */}
      <div className="max-w-md mx-auto mb-8">
        <div className="bg-gradient-to-br from-gray-50 to-emerald-50 rounded-2xl p-6 text-center border border-gray-100">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white rounded-2xl shadow-md">
              <IntegrationLogo integration={integration} size="lg" />
            </div>
          </div>
          <h3 className="font-bold text-gray-900 mb-2 text-lg">{integrationName}</h3>
          <p className="text-sm text-gray-600 mb-5">
            Securely connect your {integrationName} account to sync data to your dashboard
          </p>

          {/* Permissions Preview */}
          <div className="bg-white rounded-xl p-5 text-left shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-semibold mb-3 uppercase tracking-wide flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              Permissions Requested
            </p>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Read your account data</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Access financial records</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Sync data to your dashboard</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-md mx-auto mb-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-red-800 text-sm font-semibold">Connection Error</p>
              <p className="text-red-600 text-sm mt-0.5">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Connect Button */}
      <div className="max-w-md mx-auto mb-6">
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="group w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {connecting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting to {integrationName}...
            </>
          ) : (
            <>
              Connect with {integrationName}
              <ExternalLink className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex justify-center gap-4 max-w-md mx-auto">
        <button
          onClick={onBack}
          disabled={connecting}
          className="px-6 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onSkip}
          disabled={connecting}
          className="px-6 py-3 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-all disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>

      {/* Security Note */}
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-emerald-800 font-semibold mb-1">Your data is secure</p>
              <p className="text-sm text-emerald-700">
                We use bank-level encryption and store your credentials in decentralized storage. Only you can access your data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
