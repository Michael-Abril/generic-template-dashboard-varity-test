'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

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

  // Extract query parameters
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

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
            redirect_uri: `${window.location.origin}/oauth/callback/${params.provider}`
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

        // Trigger initial sync
        if (data.requires_sync) {
          await triggerInitialSync(params.provider, effectiveWallet);
        }

        // Check if this page was opened in a new tab from integrations page
        if (window.opener && !window.opener.closed) {
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
  }, [code, state, error, errorDescription, params.provider, walletAddress, authenticated, wallets, router]);

  const triggerInitialSync = async (provider: string, wallet: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/v1/sync/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          wallet_address: wallet,
          sync_type: 'initial'
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="container max-w-2xl mx-auto pt-20">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-blue-500" />
            </div>
            <CardTitle className="text-2xl font-bold">
              OAuth Connection
            </CardTitle>
            <CardDescription className="text-lg">
              {getProviderDisplayName(params.provider)} Integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Display */}
            <div className="flex flex-col items-center space-y-4">
              {status === 'processing' && (
                <>
                  <Loader2 className="h-16 w-16 animate-spin text-blue-500" />
                  <div className="text-center">
                    <p className="text-lg font-medium">{message || 'Processing OAuth callback...'}</p>
                    <p className="text-sm text-gray-500 mt-2">{details}</p>
                  </div>
                </>
              )}

              {status === 'success' && (
                <>
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription className="text-green-800">
                      <strong>{message}</strong>
                      <br />
                      {details}
                    </AlertDescription>
                  </Alert>
                  {isRedirecting && (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">Redirecting to integrations...</span>
                    </div>
                  )}
                </>
              )}

              {status === 'error' && (
                <>
                  <XCircle className="h-16 w-16 text-red-500" />
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">
                      <strong>{message}</strong>
                      <br />
                      {details}
                    </AlertDescription>
                  </Alert>
                  <div className="flex space-x-4 mt-4">
                    <Button
                      onClick={() => router.push('/marketplace')}
                      variant="outline"
                    >
                      Back to Marketplace
                    </Button>
                    <Button
                      onClick={() => router.push('/integrations')}
                    >
                      View Integrations
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Privacy Notice */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    Your Data is Secure
                  </p>
                  <p className="text-blue-700 dark:text-blue-200 mt-1">
                    OAuth tokens are encrypted with your wallet address using AES-256-GCM encryption.
                    Only you can decrypt and access your integration credentials. Varity never sees your tokens.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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