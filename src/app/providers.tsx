'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { ThirdwebProvider } from 'thirdweb/react';
import { varietyTestnet5 as varietyTestnet, varietyTestnetWagmi } from '../lib/varity-chain';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { createThirdwebClient } from 'thirdweb';
import { logger } from '@/lib/logger';

// Global wallet context for synchronization
export const WalletSyncContext = createContext<{
  address: string | null;
  isLoading: boolean;
  isSynced: boolean;
}>({
  address: null,
  isLoading: true,
  isSynced: false,
});

export const useWalletSync = () => useContext(WalletSyncContext);

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

/**
 * InitializingScreen - Shows while Privy and thirdweb providers initialize
 * This prevents the 15-second blank screen issue
 */
function InitializingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl">
              ⚡
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Initializing Dashboard...</h1>
        <p className="text-gray-600 mb-4">
          Setting up Web3 providers and authentication. This should take just a few seconds.
        </p>
        <div className="text-sm text-gray-500">
          <p>✓ Loading Privy authentication</p>
          <p>✓ Connecting to Varity L3</p>
          <p>✓ Preparing wallet connection</p>
        </div>
      </div>
    </div>
  );
}

/**
 * InitTimeoutScreen - Shows if initialization takes longer than 10 seconds
 */
function InitTimeoutScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
        <div className="text-yellow-600 text-5xl mb-4">⏱️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Initialization Taking Longer Than Expected</h1>
        <p className="text-gray-600 mb-4">
          The Web3 providers are taking longer than usual to initialize. This might be due to network conditions.
        </p>
        <ul className="text-sm text-gray-700 space-y-2 mb-4">
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 mt-0.5">•</span>
            <span>Check your internet connection</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 mt-0.5">•</span>
            <span>Privy services may be experiencing delays</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-600 mt-0.5">•</span>
            <span>You can wait or try refreshing the page</span>
          </li>
        </ul>
        <div className="flex gap-2">
          <button
            onClick={onRetry}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
          >
            Retry
          </button>
          <button
            onClick={() => {}}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-all"
          >
            Continue Waiting
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * PrivyReadyGate - Waits for Privy to be ready before rendering children
 * This prevents the 15-second blank screen by showing a loading screen
 */
function PrivyReadyGate({ children }: { children: React.ReactNode }) {
  const { ready } = usePrivy();
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [showTimeoutScreen, setShowTimeoutScreen] = useState(false);

  useEffect(() => {
    // Set timeout for 10 seconds
    const timeout = setTimeout(() => {
      if (!ready) {
        setHasTimedOut(true);
        setShowTimeoutScreen(true);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [ready]);

  // If Privy is ready, render children
  if (ready) {
    return <>{children}</>;
  }

  // If timed out, show timeout screen (but continue waiting in background)
  if (showTimeoutScreen) {
    return (
      <InitTimeoutScreen
        onRetry={() => {
          setShowTimeoutScreen(false);
          setHasTimedOut(false);
        }}
      />
    );
  }

  // Show loading screen while waiting for Privy
  return <InitializingScreen />;
}

/**
 * Register a new beta signup when user authenticates
 */
async function registerBetaSignup(email: string, walletAddress: string | null) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
    const response = await fetch(`${backendUrl}/api/v1/stats/signups/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        wallet_address: walletAddress,
        source: 'dashboard'
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.is_new) {
        logger.info(`New beta signup registered: ${email} (#${data.signup_number})`);
      }
      return data;
    }
  } catch (err) {
    logger.error('Failed to register beta signup:', err);
  }
  return null;
}

/**
 * WalletSyncProvider - Synchronizes Privy embedded wallet with Thirdweb
 * This ensures that when a user signs in with Google/email, their embedded wallet
 * is immediately available to all components using Thirdweb hooks.
 *
 * Also registers new beta signups and captures email for outreach.
 */
function WalletSyncProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, user } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const [hasRegistered, setHasRegistered] = useState(false);

  const [syncState, setSyncState] = useState({
    address: null as string | null,
    isLoading: true,
    isSynced: false,
  });

  // Register beta signup when user authenticates
  useEffect(() => {
    const registerUser = async () => {
      if (authenticated && user?.email?.address && !hasRegistered) {
        const primaryWallet = wallets[0];
        await registerBetaSignup(user.email.address, primaryWallet?.address || null);
        setHasRegistered(true);
      }
    };

    if (authenticated && user?.email?.address) {
      registerUser();
    }
  }, [authenticated, user, wallets, hasRegistered]);

  // Reset registration flag when user logs out
  useEffect(() => {
    if (!authenticated) {
      setHasRegistered(false);
    }
  }, [authenticated]);

  useEffect(() => {
    // Get the primary wallet (first embedded wallet or connected wallet)
    const primaryWallet = wallets[0];

    if (!walletsReady) {
      setSyncState({ address: null, isLoading: true, isSynced: false });
      return;
    }

    if (authenticated && primaryWallet?.address) {
      // User is authenticated and has a wallet
      setSyncState({
        address: primaryWallet.address,
        isLoading: false,
        isSynced: true,
      });
    } else if (!authenticated) {
      // User is not authenticated
      setSyncState({
        address: null,
        isLoading: false,
        isSynced: false,
      });
    } else {
      // Authenticated but waiting for wallet
      setSyncState({
        address: null,
        isLoading: true,
        isSynced: false,
      });
    }
  }, [authenticated, user, wallets, walletsReady]);

  return (
    <WalletSyncContext.Provider value={syncState}>
      {children}
    </WalletSyncContext.Provider>
  );
}

/**
 * Combined Providers for all Varity L3 integrations:
 *
 * 1. PrivyProvider - Authentication (email, Google, wallet)
 * 2. ThirdwebProvider - Wallet management, contracts, marketplace
 *
 * This setup enables:
 * - Gasless transactions (via ZeroDev when funded)
 * - NFT-based licensing
 * - Tool marketplace
 * - Cross-chain functionality (via Decent)
 * - Bridging (via Superbridge)
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [configError, setConfigError] = useState<string | null>(null);

  // Validate environment variables on mount (synchronous check)
  useEffect(() => {
    if (!PRIVY_APP_ID) {
      setConfigError('NEXT_PUBLIC_PRIVY_APP_ID is missing');
      console.error('Missing required environment variable: NEXT_PUBLIC_PRIVY_APP_ID');
      return;
    }
    if (!THIRDWEB_CLIENT_ID) {
      setConfigError('NEXT_PUBLIC_THIRDWEB_CLIENT_ID is missing');
      console.error('Missing required environment variable: NEXT_PUBLIC_THIRDWEB_CLIENT_ID');
      return;
    }
    setConfigError(null);
  }, []);

  // Configuration error state
  if (configError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuration Error</h1>
          <p className="text-gray-600 mb-4">
            Missing required environment variable: <strong>{configError}</strong>
          </p>
          <ul className="text-sm text-gray-700 space-y-2 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-red-600 mt-0.5">•</span>
              <span>Check your .env.local file</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 mt-0.5">•</span>
              <span>Ensure all environment variables are set</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 mt-0.5">•</span>
              <span>Restart the development server after changes</span>
            </li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Create thirdweb client with error handling (memoized to prevent re-creation)
  const [thirdwebError, setThirdwebError] = useState<string | null>(null);
  const client = React.useMemo(() => {
    if (!THIRDWEB_CLIENT_ID) {
      setThirdwebError('NEXT_PUBLIC_THIRDWEB_CLIENT_ID is missing');
      return null;
    }

    try {
      const thirdwebClient = createThirdwebClient({ clientId: THIRDWEB_CLIENT_ID });
      setThirdwebError(null);
      return thirdwebClient;
    } catch (error) {
      console.error('Failed to initialize thirdweb client:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize thirdweb client';
      setThirdwebError(errorMessage);
      return null;
    }
  }, []);

  if (!client || thirdwebError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thirdweb Initialization Error</h1>
          <p className="text-gray-600 mb-4">
            Failed to initialize thirdweb client. This is required for wallet connections and marketplace transactions.
          </p>
          {thirdwebError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800 font-mono">{thirdwebError}</p>
            </div>
          )}
          <ul className="text-sm text-gray-700 space-y-2 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-red-600 mt-0.5">•</span>
              <span>Check NEXT_PUBLIC_THIRDWEB_CLIENT_ID in .env.local</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 mt-0.5">•</span>
              <span>Ensure you have a valid thirdweb API key</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 mt-0.5">•</span>
              <span>Restart the development server after changes</span>
            </li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <PrivyProvider
        appId={PRIVY_APP_ID!}
        config={{
          loginMethods: ['email', 'google', 'wallet'],
          appearance: {
            theme: 'light',
            accentColor: '#2563EB',
            logo: '/varity-logo.png',
          },
          // embeddedWallets config removed - conflicts with Privy dashboard settings
          supportedChains: [varietyTestnetWagmi],
          defaultChain: varietyTestnetWagmi,
        }}
      >
        <PrivyReadyGate>
          <ThirdwebProvider>
            <WalletSyncProvider>
              {children}
            </WalletSyncProvider>
          </ThirdwebProvider>
        </PrivyReadyGate>
      </PrivyProvider>
    </ErrorBoundary>
  );
}
