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
        // Store wallet address as fallback for OAuth callback
        localStorage.setItem('varity_oauth_wallet_address', walletAddress);

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
    <div className="px-6 py-10 sm:px-10 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
            <Link2 className="w-7 h-7 text-white" />
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          Connect {integrationName}
        </h2>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          You&apos;ll be redirected to {integrationName} to authorize securely
        </p>
      </div>

      {/* Integration Card */}
      <div className="max-w-sm mx-auto mb-6">
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-center">
          <div className="flex justify-center mb-3">
            <div className="p-2.5 bg-white border border-gray-100 rounded-lg">
              <IntegrationLogo integration={integration} size="lg" />
            </div>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{integrationName}</h3>
          <p className="text-sm text-gray-600 mb-4">
            Sync your {integrationName} data to your dashboard
          </p>

          {/* Permissions Preview */}
          <div className="bg-white rounded-lg p-4 text-left border border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-2.5 uppercase tracking-wide">
              Permissions
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Read your account data</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Access business records</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Sync data to dashboard</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-sm mx-auto mb-5">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Connect Button */}
      <div className="max-w-sm mx-auto mb-5">
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full bg-blue-600 text-white px-5 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {connecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              Connect {integrationName}
              <ExternalLink className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex justify-center gap-3 max-w-sm mx-auto">
        <button
          onClick={onBack}
          disabled={connecting}
          className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onSkip}
          disabled={connecting}
          className="px-5 py-2.5 text-gray-500 hover:text-gray-700 font-medium transition-colors disabled:opacity-50 text-sm"
        >
          Skip
        </button>
      </div>

      {/* Security Note */}
      <div className="max-w-sm mx-auto mt-4">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <Shield className="w-3 h-3" />
          <span>Your credentials are encrypted and secure</span>
        </div>
      </div>
    </div>
  );
}
