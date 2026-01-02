/**
 * useMCPData Hook
 *
 * Manages data fetching, caching, and auto-refresh for MCP data.
 * Intelligently routes between RAG storage and Live API based on data type.
 *
 * Features:
 * - Automatic cache management (localStorage + memory)
 * - Auto-refresh for live data types
 * - Manual sync trigger for RAG data
 * - Graceful error handling with fallback to cache
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchIntegrationData,
  triggerMCPSync,
  getDataDestination,
  DataResponse,
} from '@/lib/mcp-data-fetcher';

export interface UseMCPDataOptions {
  integration: string;
  dataType: string;
  walletAddress: string | null;
  autoRefresh?: boolean;
  refreshInterval?: number; // Milliseconds (default: 60000 = 1 min)
  cacheEnabled?: boolean;
  cacheTTL?: number; // Cache TTL in ms (default: 5 min)
}

export interface MCPDataState<T extends { id?: string | number } = Record<string, unknown>> {
  data: T[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  lastSync: string | null;
  source: 'rag' | 'live' | 'hybrid' | 'cache';
  destination: 'rag' | 'live' | 'hybrid';

  // Actions
  refresh: () => Promise<void>;
  sync: () => Promise<void>;
}

interface CacheEntry<T extends { id?: string | number }> {
  data: T[];
  lastSync: string | null;
  timestamp: string;
}

export function useMCPData<T extends { id?: string | number } = Record<string, unknown>>(
  options: UseMCPDataOptions
): MCPDataState<T> {
  const {
    integration,
    dataType,
    walletAddress,
    autoRefresh = false,
    refreshInterval = 60000,
    cacheEnabled = true,
    cacheTTL = 300000, // 5 minutes
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [source, setSource] = useState<'rag' | 'live' | 'hybrid' | 'cache'>(
    'cache'
  );

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  // Determine data destination
  const destination = getDataDestination(integration, dataType);

  // Cache key
  const cacheKey = `mcp_${integration}_${dataType}_${walletAddress}`;

  /**
   * Load from cache
   */
  const loadFromCache = useCallback((): CacheEntry<T> | null => {
    if (!cacheEnabled || typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const parsed = JSON.parse(cached) as CacheEntry<T>;
      const age = Date.now() - new Date(parsed.timestamp).getTime();

      // Return if within TTL
      if (age < cacheTTL) {
        return parsed;
      }
    } catch (err) {
      console.error('Cache load error:', err);
    }

    return null;
  }, [cacheKey, cacheEnabled, cacheTTL]);

  /**
   * Save to cache
   */
  const saveToCache = useCallback(
    (cacheData: T[], syncTime: string | null) => {
      if (!cacheEnabled || typeof window === 'undefined') return;

      try {
        const entry: CacheEntry<T> = {
          data: cacheData,
          lastSync: syncTime,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(cacheKey, JSON.stringify(entry));
      } catch (err) {
        console.error('Cache save error:', err);
      }
    },
    [cacheKey, cacheEnabled]
  );

  /**
   * Fetch data (with cache check)
   */
  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (!walletAddress) return;

      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = loadFromCache();
        if (cached) {
          setData(cached.data);
          setLastSync(cached.lastSync);
          setSource('cache');
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const result: DataResponse<T> = await fetchIntegrationData<T>({
          integration,
          dataType,
          walletAddress,
          forceRefresh,
        });

        if (!isMounted.current) return;

        if (result.success) {
          setData(result.data);
          setLastSync(result.lastSync || null);
          setSource(result.source);
          saveToCache(result.data, result.lastSync || null);
        } else {
          setError(result.error || 'Failed to fetch data');

          // Try to load from cache on error
          const cached = loadFromCache();
          if (cached) {
            setData(cached.data);
            setLastSync(cached.lastSync);
            setSource('cache');
          }
        }
      } catch (err) {
        if (!isMounted.current) return;
        setError(err instanceof Error ? err.message : 'Unknown error');

        // Try to load from cache on error
        const cached = loadFromCache();
        if (cached) {
          setData(cached.data);
          setLastSync(cached.lastSync);
          setSource('cache');
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [
      integration,
      dataType,
      walletAddress,
      loadFromCache,
      saveToCache,
    ]
  );

  /**
   * Refresh data (soft reload from cache or API)
   */
  const refresh = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  /**
   * Sync data (force sync from MCP backend)
   */
  const sync = useCallback(async () => {
    if (!walletAddress) return;

    setSyncing(true);
    setError(null);

    try {
      const result = await triggerMCPSync({
        integration,
        walletAddress,
        dataTypes: [dataType],
      });

      if (!isMounted.current) return;

      if (!result.success) {
        throw new Error(result.error || 'Sync failed');
      }

      // Refresh data after sync
      await fetchData(true);
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      if (isMounted.current) {
        setSyncing(false);
      }
    }
  }, [integration, dataType, walletAddress, fetchData]);

  /**
   * Initial load
   */
  useEffect(() => {
    isMounted.current = true;
    fetchData(false);

    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  /**
   * Auto-refresh timer
   */
  useEffect(() => {
    if (!autoRefresh || !walletAddress) return;

    refreshTimerRef.current = setInterval(() => {
      fetchData(false);
    }, refreshInterval);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, walletAddress, fetchData]);

  return {
    data,
    loading,
    syncing,
    error,
    lastSync,
    source,
    destination,
    refresh,
    sync,
  };
}

/**
 * Hook for fetching multiple data types for an integration
 */
export function useMCPIntegration(options: {
  integration: string;
  walletAddress: string | null;
  dataTypes: string[];
}) {
  const { integration, walletAddress, dataTypes } = options;

  // Create hooks for each data type
  const results = dataTypes.map((dataType) => ({
    dataType,
    ...useMCPData({
      integration,
      dataType,
      walletAddress,
      autoRefresh: getDataDestination(integration, dataType) === 'live',
      refreshInterval: 60000,
    }),
  }));

  // Aggregate loading state
  const loading = results.some((r) => r.loading);
  const syncing = results.some((r) => r.syncing);
  const errors = results.filter((r) => r.error).map((r) => r.error);

  // Sync all data types
  const syncAll = useCallback(async () => {
    await Promise.all(results.map((r) => r.sync()));
  }, [results]);

  return {
    results,
    loading,
    syncing,
    errors,
    syncAll,
  };
}
