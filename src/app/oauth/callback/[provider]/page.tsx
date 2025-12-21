'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * OAuth Callback Handler for Varity Marketplace
 *
 * This component handles OAuth callbacks from all providers (QuickBooks, Stripe, etc.)
 * It exchanges authorization codes for access tokens and stores them securely
 * using wallet-based encryption - each business controls their own OAuth tokens.
 */

interface OAuthCallbackPageProps {
  params: {
    provider: string;
  };
}

function OAuthCallbackContent({ params }: OAuthCallbackPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Use Privy for authentication (NOT wagmi - wagmi doesn't see Privy embedded wallets)
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false); // Prevent double execution - OAuth codes are single-use!

  // Extract query parameters
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const realmId = searchParams.get('realmId'); // QuickBooks company ID

  // Get wallet address from Privy OR localStorage (persisted before OAuth redirect)
  const getWalletAddress = (): string | null => {
    // First try Privy (if authenticated in this session)
    const primaryWallet = wallets?.[0];
    const privyWalletAddress = primaryWallet?.address || user?.wallet?.address;
    if (authenticated && privyWalletAddress) {
      return privyWalletAddress;
    }
    // Fall back to localStorage (stored before OAuth redirect)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('varity_oauth_wallet_address');
    }
    return null;
  };

  const walletAddress = getWalletAddress();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // CRITICAL: Prevent double execution - OAuth codes are single-use!
      // This effect can run multiple times if Privy's auth state changes after initial render
      if (hasProcessed) {
        return;
      }
      setHasProcessed(true);

      // Helper function to notify opener of errors
      const notifyOpenerOfError = (errorMsg: string) => {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({
            type: 'oauth-complete',
            provider: params.provider,
            success: false,
            error: errorMsg,
          }, window.location.origin);
        }
      };

      // Check for errors from OAuth provider
      if (error) {
        const errorMsg = errorDescription || 'The authorization was denied or failed.';
        setStatus('error');
        setMessage(`OAuth Error: ${error}`);
        setDetails(errorMsg);
        notifyOpenerOfError(errorMsg);
        return;
      }

      // Try to get wallet address (from wagmi or localStorage)
      const effectiveWallet = getWalletAddress();
      if (!effectiveWallet) {
        const errorMsg = 'Wallet address not found. Please try connecting again from the integrations page.';
        setStatus('error');
        setMessage('Wallet Not Found');
        setDetails(errorMsg);
        notifyOpenerOfError(errorMsg);
        return;
      }

      // Verify we have an authorization code
      if (!code) {
        const errorMsg = 'No authorization code received from the OAuth provider.';
        setStatus('error');
        setMessage('Missing Authorization Code');
        setDetails(errorMsg);
        notifyOpenerOfError(errorMsg);
        return;
      }

      // Verify state for CSRF protection
      if (!state) {
        const errorMsg = 'OAuth state parameter missing. This might be a security issue.';
        setStatus('error');
        setMessage('Security Validation Failed');
        setDetails(errorMsg);
        notifyOpenerOfError(errorMsg);
        return;
      }

      try {
        setMessage(`Exchanging authorization code for ${params.provider} access token...`);
        setDetails('Your OAuth tokens will be encrypted with your wallet address for maximum privacy.');

        // Call backend to exchange code for tokens
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002'}/api/v1/oauth/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: params.provider,
            code,
            state,
            wallet_address: effectiveWallet,
            // Include redirect URI for token exchange
            redirect_uri: `${window.location.origin}/oauth/callback/${params.provider}`,
            // QuickBooks requires realmId (company ID) for API calls
            ...(realmId && { realm_id: realmId })
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || data.message || 'Failed to exchange authorization code');
        }

        // Success! Clear the stored wallet address
        if (typeof window !== 'undefined') {
          localStorage.removeItem('varity_oauth_wallet_address');
        }

        setStatus('success');
        setMessage(`Successfully connected ${params.provider}!`);
        setDetails(`Your ${params.provider} account has been securely connected. Tokens are encrypted with your wallet.`);

        // Check if this OAuth was initiated from the onboarding flow
        const onboardingIntegration = typeof window !== 'undefined'
          ? localStorage.getItem('onboarding_integration')
          : null;
        const onboardingReturn = typeof window !== 'undefined'
          ? localStorage.getItem('onboarding_return')
          : null;

        // Trigger initial sync (will be picked up by onboarding syncing step if from onboarding)
        if (data.requires_sync) {
          await triggerInitialSync(params.provider, effectiveWallet);
        }

        // Handle redirect based on where OAuth was initiated from
        if (onboardingReturn && onboardingIntegration) {
          // Clear onboarding localStorage flags
          localStorage.removeItem('onboarding_integration');
          localStorage.removeItem('onboarding_step');
          localStorage.removeItem('onboarding_return');

          // Redirect back to onboarding with syncing step
          setDetails(`${params.provider} connected! Returning to onboarding...`);
          setTimeout(() => {
            setIsRedirecting(true);
            router.push(`/onboarding?integration=${onboardingIntegration}&step=syncing`);
          }, 1500);
        } else if (window.opener && !window.opener.closed) {
          // Check if this page was opened in a new tab from integrations page
          // Send success message to parent window
          window.opener.postMessage({
            type: 'oauth-complete',
            provider: params.provider,
            success: true,
          }, window.location.origin);

          // Close this tab after showing success briefly
          setDetails(`${params.provider} connected! This window will close automatically.`);
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          // Direct navigation - redirect to integrations page after 3 seconds
          setTimeout(() => {
            setIsRedirecting(true);
            router.push('/integrations?success=true');
          }, 3000);
        }

      } catch (error) {
        console.error('OAuth callback error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to complete OAuth connection';
        setStatus('error');
        setMessage('Connection Failed');
        setDetails(errorMessage);

        // Notify parent window of error if opened in new tab
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({
            type: 'oauth-complete',
            provider: params.provider,
            success: false,
            error: errorMessage,
          }, window.location.origin);
        }
      }
    };

    handleOAuthCallback();
  }, [code, state, error, errorDescription, params.provider, walletAddress, authenticated, wallets, router, hasProcessed, realmId]);

  const triggerInitialSync = async (provider: string, wallet: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002'}/api/v1/sync/${provider}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: wallet,
        }),
      });
    } catch (error) {
      console.error('Failed to trigger initial sync:', error);
      // Don't fail the OAuth flow if sync fails
    }
  };

  const getProviderDisplayName = (provider: string): string => {
    const names: Record<string, string> = {
      'quickbooks': 'QuickBooks',
      'stripe': 'Stripe',
      'salesforce': 'Salesforce',
      'google-workspace': 'Google Workspace',
      'shopify': 'Shopify',
      'microsoft-365': 'Microsoft 365',
      'slack': 'Slack',
      'zendesk': 'Zendesk',
      'mailchimp': 'Mailchimp',
      'hubspot': 'HubSpot'
    };
    return names[provider] || provider;
  };

  const providerName = getProviderDisplayName(params.provider);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-0">
          <CardContent className="pt-8 pb-8 px-8">
            {/* Status Display */}
            <div className="flex flex-col items-center text-center">
              {status === 'processing' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-6">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                  <h1 className="text-xl font-semibold text-gray-900 mb-2">
                    Connecting to {providerName}
                  </h1>
                  <p className="text-gray-500">
                    Please wait while we securely connect your account...
                  </p>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <h1 className="text-xl font-semibold text-gray-900 mb-2">
                    {providerName} Connected
                  </h1>
                  <p className="text-gray-500 mb-6">
                    Your account has been successfully connected. This window will close automatically.
                  </p>

                  {/* Security Badge */}
                  <div className="w-full p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center space-x-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Your data is protected with bank-level security
                      </span>
                    </div>
                  </div>

                  {isRedirecting && (
                    <div className="flex items-center space-x-2 mt-4">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      <span className="text-sm text-gray-500">Redirecting...</span>
                    </div>
                  )}
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <h1 className="text-xl font-semibold text-gray-900 mb-2">
                    Connection Failed
                  </h1>
                  <p className="text-gray-500 mb-6">
                    {details || 'We couldn\'t connect your account. Please try again.'}
                  </p>
                  <div className="flex flex-col w-full space-y-3">
                    <Button
                      onClick={() => router.push('/marketplace')}
                      className="w-full"
                    >
                      Try Again
                    </Button>
                    <Button
                      onClick={() => router.push('/integrations')}
                      variant="outline"
                      className="w-full"
                    >
                      View My Integrations
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Secured by Varity
        </p>
      </div>
    </div>
  );
}

// Main component wrapped in Suspense for searchParams
export default function OAuthCallbackPage(props: OAuthCallbackPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <OAuthCallbackContent {...props} />
    </Suspense>
  );
}