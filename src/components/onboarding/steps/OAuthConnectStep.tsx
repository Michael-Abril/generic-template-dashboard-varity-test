'use client';

import { useState } from 'react';
import { Link2, ArrowLeft, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
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
    <div className="p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
            <Link2 className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Connect {integrationName}
        </h2>
        <p className="text-gray-600">
          You&apos;ll be redirected to {integrationName} to authorize the connection
        </p>
      </div>

      {/* Integration Card */}
      <div className="max-w-md mx-auto mb-8">
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <div className="flex justify-center mb-4">
            <IntegrationLogo integration={integration} size="lg" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">{integrationName}</h3>
          <p className="text-sm text-gray-500 mb-4">
            Securely connect your {integrationName} account to sync data to your dashboard
          </p>

          {/* Permissions Preview */}
          <div className="bg-white rounded-lg p-4 text-left">
            <p className="text-xs text-gray-500 font-medium mb-2 uppercase">
              Permissions Requested
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Read your account data
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Access financial records
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Sync data to your dashboard
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-md mx-auto mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 text-sm font-medium">Connection Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Connect Button */}
      <div className="max-w-md mx-auto mb-6">
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {connecting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting to {integrationName}...
            </>
          ) : (
            <>
              Connect with {integrationName}
              <ExternalLink className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex justify-center gap-4 max-w-md mx-auto">
        <button
          onClick={onBack}
          disabled={connecting}
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onSkip}
          disabled={connecting}
          className="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>

      {/* Security Note */}
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            <span className="font-medium">Your data is secure.</span> We use bank-level encryption
            and store your credentials in decentralized storage. Only you can access your data.
          </p>
        </div>
      </div>
    </div>
  );
}
