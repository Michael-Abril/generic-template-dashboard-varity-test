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
    <div className="px-6 py-10 sm:px-12 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Link2 className="w-7 h-7 text-white" />
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Connect {integrationName}
        </h2>
        <p className="text-gray-600 text-base max-w-xl mx-auto">
          You&apos;ll be redirected to {integrationName} to authorize securely
        </p>
      </div>

      {/* Integration Card */}
      <div className="max-w-md mx-auto mb-8">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
              <IntegrationLogo integration={integration} size="lg" />
            </div>
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-2">{integrationName}</h3>
          <p className="text-sm text-gray-600 mb-6">
            Sync your {integrationName} data to your dashboard
          </p>

          {/* Permissions Preview */}
          <div className="bg-white rounded-xl p-5 text-left border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 font-semibold mb-3 uppercase tracking-wide">
              Permissions
            </p>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>Read your account data</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>Access business records</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span>Sync data to dashboard</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-md mx-auto mb-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Connect Button */}
      <div className="max-w-md mx-auto mb-6">
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-xl font-semibold text-base hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-200/60"
        >
          {connecting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              Connect {integrationName}
              <ExternalLink className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 max-w-md mx-auto">
        <button
          onClick={onBack}
          disabled={connecting}
          className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base shadow-sm hover:shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onSkip}
          disabled={connecting}
          className="flex-1 px-6 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-300 rounded-xl font-medium transition-all disabled:opacity-50 text-base shadow-sm hover:shadow-md"
        >
          Skip for Now
        </button>
      </div>

      {/* Security Note */}
      <div className="max-w-md mx-auto mt-6">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Shield className="w-4 h-4 text-green-600" />
          <span>Your credentials are encrypted and secure</span>
        </div>
      </div>
    </div>
  );
}
