'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check, AlertCircle, Clock } from 'lucide-react';

interface DataFreshnessIndicatorProps {
  lastSyncTime: Date | null;
  onRefresh: () => Promise<void>;
  isRefreshing?: boolean;
  className?: string;
}

export function DataFreshnessIndicator({
  lastSyncTime,
  onRefresh,
  isRefreshing = false,
  className = ''
}: DataFreshnessIndicatorProps) {
  const [displayTime, setDisplayTime] = useState<string>('');
  const [status, setStatus] = useState<'fresh' | 'stale' | 'unknown'>('unknown');

  // Update display time every minute
  useEffect(() => {
    const updateDisplayTime = () => {
      if (!lastSyncTime) {
        setDisplayTime('Never synced');
        setStatus('unknown');
        return;
      }

      const now = new Date();
      const diff = now.getTime() - lastSyncTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      // Determine freshness status
      if (minutes < 15) {
        setStatus('fresh');
      } else if (hours < 1) {
        setStatus('fresh');
      } else if (hours < 24) {
        setStatus('stale');
      } else {
        setStatus('stale');
      }

      // Format display time
      if (minutes < 1) {
        setDisplayTime('Just now');
      } else if (minutes < 60) {
        setDisplayTime(`${minutes}m ago`);
      } else if (hours < 24) {
        setDisplayTime(`${hours}h ago`);
      } else if (days < 7) {
        setDisplayTime(`${days}d ago`);
      } else {
        setDisplayTime(lastSyncTime.toLocaleDateString());
      }
    };

    updateDisplayTime();
    const interval = setInterval(updateDisplayTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    try {
      await onRefresh();
    } catch (error) {
      // Error handling is done by parent component
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'fresh':
        return 'text-green-600';
      case 'stale':
        return 'text-amber-600';
      case 'unknown':
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'fresh':
        return <Check className="w-3.5 h-3.5 text-green-500" />;
      case 'stale':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
      case 'unknown':
      default:
        return <Clock className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status and time */}
      <div className="flex items-center gap-1.5 text-sm">
        {!isRefreshing && getStatusIcon()}
        <span className={`${getStatusColor()} whitespace-nowrap`}>
          {isRefreshing ? 'Syncing...' : `Last synced: ${displayTime}`}
        </span>
      </div>

      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`
          p-1.5 rounded-lg transition-all
          ${isRefreshing
            ? 'text-blue-500 cursor-not-allowed'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }
        `}
        aria-label={isRefreshing ? 'Syncing data' : 'Refresh data'}
      >
        <RefreshCw
          className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
        />
      </button>
    </div>
  );
}

// Hook for managing data freshness
export function useDataFreshness(walletAddress: string | null) {
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load last sync time from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && walletAddress) {
      const stored = localStorage.getItem(`lastSync_${walletAddress}`);
      if (stored) {
        setLastSyncTime(new Date(stored));
      }
    }
  }, [walletAddress]);

  const updateLastSyncTime = useCallback((time: Date = new Date()) => {
    setLastSyncTime(time);
    if (typeof window !== 'undefined' && walletAddress) {
      localStorage.setItem(`lastSync_${walletAddress}`, time.toISOString());
    }
  }, [walletAddress]);

  const refresh = useCallback(async () => {
    if (!walletAddress || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiBase}/api/v1/integrations/sync-all?wallet_address=${walletAddress}`,
        { method: 'POST' }
      );

      if (response.ok) {
        updateLastSyncTime();
      }
    } catch (error) {
      // Silent fail - the UI will show the last sync time
    } finally {
      setIsRefreshing(false);
    }
  }, [walletAddress, isRefreshing, updateLastSyncTime]);

  return {
    lastSyncTime,
    isRefreshing,
    refresh,
    updateLastSyncTime
  };
}
