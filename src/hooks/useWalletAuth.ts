/**
 * Wallet Authentication Hook
 *
 * Provides wallet-based authentication with session management
 * Integrates with Privy for seamless Web3 UX
 */
import { useState, useEffect, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useActiveAccount } from 'thirdweb/react';
import axios from 'axios';
import { logger } from '@/lib/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface WalletSession {
  sessionToken: string;
  walletAddress: string;
  expiresAt: number;
  expiresIn: number;
}

interface SessionInfo {
  wallet_address: string;
  session_token: string;
  created_at: number;
  expires_at: number;
  metadata: Record<string, any>;
}

interface UseWalletAuthReturn {
  // Authentication state
  isAuthenticated: boolean;
  sessionToken: string | null;
  walletAddress: string | null;
  isAuthenticating: boolean;
  authError: string | null;

  // Session management
  sessions: SessionInfo[];

  // Actions
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  getSessions: () => Promise<void>;
  logoutFromSession: (sessionToken: string) => Promise<void>;
  logoutFromAllDevices: () => Promise<void>;
  addWallet: (newWalletAddress: string) => Promise<void>;
}

export const useWalletAuth = (): UseWalletAuthReturn => {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const activeAccount = useActiveAccount();

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);

  // Get wallet address from Privy or thirdweb
  const address = wallets?.[0]?.address || activeAccount?.address;

  // Load session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('wallet_session_token');
    const storedAddress = localStorage.getItem('wallet_address');

    if (storedToken && storedAddress) {
      setSessionToken(storedToken);
      setWalletAddress(storedAddress);

      // Verify session is still valid
      verifySession(storedToken).catch(() => {
        // Session invalid, clear storage
        localStorage.removeItem('wallet_session_token');
        localStorage.removeItem('wallet_address');
        setSessionToken(null);
        setWalletAddress(null);
      });
    }
  }, []);

  /**
   * Verify session is still valid
   */
  const verifySession = async (token: string): Promise<boolean> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/wallet/auth/session`, {
        headers: {
          'X-Session-Token': token,
        },
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  };

  /**
   * Sign message with wallet
   */
  const signMessage = async (message: string): Promise<string> => {
    // Try Privy wallet first
    const privyWallet = wallets?.[0];

    if (privyWallet && 'signMessage' in privyWallet) {
      try {
        // Privy wallets support signMessage directly
        const signature = await (privyWallet as any).signMessage(message);
        return signature;
      } catch (error) {
        logger.error('Privy wallet signing failed', error);
        throw error;
      }
    }

    // Fall back to thirdweb active account
    if (activeAccount && 'signMessage' in activeAccount) {
      try {
        const signature = await activeAccount.signMessage({ message });
        return signature;
      } catch (error) {
        logger.error('Thirdweb wallet signing failed', error);
        throw error;
      }
    }

    throw new Error('No wallet available for signing');
  };

  /**
   * Login with wallet signature
   */
  const login = useCallback(async () => {
    if (!address) {
      setAuthError('No wallet connected');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      // Step 1: Get authentication message
      const messageResponse = await axios.post(`${API_BASE_URL}/api/v1/wallet/auth/message`, {
        wallet_address: address,
      });

      const { message, nonce } = messageResponse.data;

      // Step 2: Sign message with wallet
      const signature = await signMessage(message);

      // Step 3: Login with signature
      const loginResponse = await axios.post<WalletSession>(
        `${API_BASE_URL}/api/v1/wallet/auth/login`,
        {
          wallet_address: address,
          signature,
          message,
          nonce,
          user_agent: navigator.userAgent,
        }
      );

      const session = loginResponse.data;

      // Store session
      setSessionToken(session.sessionToken);
      setWalletAddress(session.walletAddress);
      localStorage.setItem('wallet_session_token', session.sessionToken);
      localStorage.setItem('wallet_address', session.walletAddress);

      logger.info('Wallet authentication successful');
    } catch (error: any) {
      logger.error('Wallet authentication failed', error);
      setAuthError(
        error.response?.data?.detail?.message ||
          error.response?.data?.detail ||
          'Authentication failed'
      );

      // Clear any existing session
      setSessionToken(null);
      setWalletAddress(null);
      localStorage.removeItem('wallet_session_token');
      localStorage.removeItem('wallet_address');
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, activeAccount, wallets]);

  /**
   * Logout and invalidate session
   */
  const logout = useCallback(async () => {
    if (!sessionToken) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/v1/wallet/auth/logout`,
        {},
        {
          headers: {
            'X-Session-Token': sessionToken,
          },
        }
      );

      logger.debug('Logged out successfully');
    } catch (error) {
      logger.error('Logout failed', error);
    } finally {
      // Clear session regardless of API success
      setSessionToken(null);
      setWalletAddress(null);
      localStorage.removeItem('wallet_session_token');
      localStorage.removeItem('wallet_address');
    }
  }, [sessionToken]);

  /**
   * Refresh session expiration
   */
  const refreshSession = useCallback(async () => {
    if (!sessionToken) return;

    try {
      const response = await axios.post<WalletSession>(
        `${API_BASE_URL}/api/v1/wallet/auth/refresh`,
        {},
        {
          headers: {
            'X-Session-Token': sessionToken,
          },
        }
      );

      const session = response.data;

      // Update expiration
      logger.debug('Session refreshed', { expiresAt: new Date(session.expiresAt * 1000) });
    } catch (error) {
      logger.error('Session refresh failed', error);
      // Session might be expired, logout
      await logout();
    }
  }, [sessionToken, logout]);

  /**
   * Get all active sessions
   */
  const getSessions = useCallback(async () => {
    if (!sessionToken) return;

    try {
      const response = await axios.get<SessionInfo[]>(
        `${API_BASE_URL}/api/v1/wallet/auth/sessions`,
        {
          headers: {
            'X-Session-Token': sessionToken,
          },
        }
      );

      setSessions(response.data);
    } catch (error) {
      logger.error('Failed to get sessions', error);
    }
  }, [sessionToken]);

  /**
   * Logout from specific session
   */
  const logoutFromSession = useCallback(
    async (targetSessionToken: string) => {
      if (!sessionToken) return;

      try {
        await axios.delete(`${API_BASE_URL}/api/v1/wallet/auth/sessions/${targetSessionToken}`, {
          headers: {
            'X-Session-Token': sessionToken,
          },
        });

        logger.debug('Session invalidated');

        // If we logged out our own session, clear local state
        if (targetSessionToken === sessionToken) {
          await logout();
        } else {
          // Refresh sessions list
          await getSessions();
        }
      } catch (error) {
        logger.error('Failed to invalidate session', error);
      }
    },
    [sessionToken, logout, getSessions]
  );

  /**
   * Logout from all devices
   */
  const logoutFromAllDevices = useCallback(async () => {
    if (!sessionToken) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/v1/wallet/auth/sessions`, {
        headers: {
          'X-Session-Token': sessionToken,
        },
      });

      logger.info('Logged out from all devices');

      // Clear local session
      await logout();
    } catch (error) {
      logger.error('Failed to logout from all devices', error);
    }
  }, [sessionToken, logout]);

  /**
   * Add additional wallet to session (multi-wallet support)
   */
  const addWallet = useCallback(
    async (newWalletAddress: string) => {
      if (!sessionToken) return;

      try {
        // Get authentication message for new wallet
        const messageResponse = await axios.post(`${API_BASE_URL}/api/v1/wallet/auth/message`, {
          wallet_address: newWalletAddress,
        });

        const { message, nonce } = messageResponse.data;

        // Sign message with new wallet
        const signature = await signMessage(message);

        // Add wallet to session
        await axios.post(
          `${API_BASE_URL}/api/v1/wallet/auth/add-wallet`,
          {
            new_wallet_address: newWalletAddress,
            signature,
            message,
            nonce,
          },
          {
            headers: {
              'X-Session-Token': sessionToken,
            },
          }
        );

        logger.info('Wallet added successfully');
      } catch (error) {
        logger.error('Failed to add wallet', error);
        throw error;
      }
    },
    [sessionToken, activeAccount, wallets]
  );

  // Auto-login when Privy authenticates
  useEffect(() => {
    if (ready && authenticated && address && !sessionToken && !isAuthenticating) {
      logger.debug('Auto-logging in with wallet', { address });
      login().catch((e) => logger.error('Auto-login failed', e));
    }
  }, [ready, authenticated, address, sessionToken, isAuthenticating, login]);

  // Auto-refresh session every 30 minutes
  useEffect(() => {
    if (!sessionToken) return;

    const intervalId = setInterval(() => {
      refreshSession().catch((e) => logger.error('Auto-refresh failed', e));
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(intervalId);
  }, [sessionToken, refreshSession]);

  return {
    // Authentication state
    isAuthenticated: !!sessionToken && !!walletAddress,
    sessionToken,
    walletAddress,
    isAuthenticating,
    authError,

    // Session management
    sessions,

    // Actions
    login,
    logout,
    refreshSession,
    getSessions,
    logoutFromSession,
    logoutFromAllDevices,
    addWallet,
  };
};

/**
 * Get axios instance with auth headers
 */
export const useAuthenticatedAxios = () => {
  const { sessionToken } = useWalletAuth();

  return axios.create({
    baseURL: API_BASE_URL,
    headers: sessionToken
      ? {
          'X-Session-Token': sessionToken,
        }
      : {},
  });
};
