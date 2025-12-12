'use client';
import { logger } from '@/lib/logger';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Loader2, Link2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface OAuthButtonProps {
  provider: string;
  productName: string;
  isConnected?: boolean;
  hasLicense?: boolean;
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * OAuth Connection Button Component
 *
 * Allows businesses to connect their existing software accounts
 * Each connection is encrypted with the business's wallet address
 * ensuring complete privacy - Varity never sees the OAuth tokens
 */
export function OAuthButton({
  provider,
  productName,
  isConnected = false,
  hasLicense = true,
  className = '',
  onSuccess,
  onError
}: OAuthButtonProps) {
  const { address: walletAddress, isConnected: walletConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthConnect = async () => {
    // Clear previous errors
    setError(null);

    // Check wallet connection
    if (!walletConnected || !walletAddress) {
      setError('Please connect your wallet first to securely store OAuth credentials');
      setShowDialog(true);
      return;
    }

    // Check license
    if (!hasLicense) {
      setError('Please purchase a license for this product before connecting');
      setShowDialog(true);
      return;
    }

    try {
      setIsLoading(true);

      // Generate state for CSRF protection
      const state = generateState(walletAddress, provider);

      // Store state in session storage for verification
      sessionStorage.setItem(`oauth_state_${provider}`, state);
      sessionStorage.setItem(`oauth_wallet_${provider}`, walletAddress);

      // Get OAuth authorization URL from backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/v1/oauth/start/${provider}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wallet_address: walletAddress,
            shop_domain: null,
            subdomain: null
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get authorization URL');
      }

      const data = await response.json();

      // Open OAuth popup window
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        data.authorization_url,
        `oauth_${provider}`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for popup close
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          setIsLoading(false);

          // Check if connection was successful
          checkConnectionStatus();
        }
      }, 1000);

    } catch (err) {
      logger.error('OAuth connection error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate OAuth connection';
      setError(errorMessage);
      setShowDialog(true);
      if (onError) onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/v1/oauth/status/${provider}?wallet_address=${walletAddress}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.is_connected && onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      logger.error('Failed to check connection status:', error);
    }
  };

  const generateState = (wallet: string, provider: string): string => {
    // Generate a random state parameter for CSRF protection
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${wallet}_${provider}_${timestamp}_${random}`;
  };

  const handleDisconnect = async () => {
    if (!walletConnected || !walletAddress) {
      setError('Please connect your wallet to manage OAuth connections');
      setShowDialog(true);
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/v1/oauth/disconnect/${provider}?wallet_address=${walletAddress}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to disconnect OAuth');
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      logger.error('OAuth disconnect error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect';
      setError(errorMessage);
      setShowDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isConnected) {
    return (
      <>
        <Button
          variant="outline"
          className={`${className} border-green-500 text-green-600 hover:bg-green-50`}
          onClick={handleDisconnect}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Connected
        </Button>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>OAuth Status</DialogTitle>
              <DialogDescription>
                {error && (
                  <Alert className="mt-4" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Button
        className={className}
        onClick={handleOAuthConnect}
        disabled={isLoading || !hasLicense}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Link2 className="mr-2 h-4 w-4" />
            Connect {productName}
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connection Required</DialogTitle>
            <DialogDescription>
              {error && (
                <Alert className="mt-4" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {!hasLicense && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You need to purchase a license for {productName} before you can connect your account.
                  </AlertDescription>
                </Alert>
              )}
              {!walletConnected && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please connect your wallet to securely store OAuth credentials.
                    Your integration tokens are encrypted with your wallet address.
                  </AlertDescription>
                </Alert>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default OAuthButton;