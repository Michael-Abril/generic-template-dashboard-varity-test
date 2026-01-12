'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  Plug,
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface Integration {
  id: string;
  name: string;
  provider: string;
  status: 'connected' | 'syncing' | 'stale' | 'error' | 'disconnected';
  lastSyncTime?: string;
  lastSyncStatus?: 'success' | 'partial' | 'failed';
  dataCount?: number;
  icon: string;
}

interface IntegrationHealthCardsProps {
  walletAddress: string;
  className?: string;
}

// Integration icons mapping
const INTEGRATION_ICONS: Record<string, string> = {
  quickbooks: '/icons/quickbooks.svg',
  google: '/icons/google.svg',
  microsoft: '/icons/microsoft.svg',
  slack: '/icons/slack.svg',
  salesforce: '/icons/salesforce.svg',
  hubspot: '/icons/hubspot.svg',
};

// Integration display names
const INTEGRATION_NAMES: Record<string, string> = {
  quickbooks: 'QuickBooks',
  google: 'Google Workspace',
  microsoft: 'Microsoft 365',
  slack: 'Slack',
  salesforce: 'Salesforce',
  hubspot: 'HubSpot',
};

export function IntegrationHealthCards({ walletAddress, className = '' }: IntegrationHealthCardsProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (walletAddress) {
      fetchIntegrationStatus();
    }
  }, [walletAddress]);

  const fetchIntegrationStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

      const response = await fetch(`${apiBase}/api/v1/integrations/installed?wallet_address=${walletAddress}`);

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();

      if (data && data.integrations && Array.isArray(data.integrations)) {
        const transformedIntegrations: Integration[] = data.integrations.map((int: {
          name: string;
          connected: boolean;
          last_sync?: string;
          data_count?: number;
        }) => ({
          id: int.name,
          name: INTEGRATION_NAMES[int.name] || int.name,
          provider: int.name,
          status: int.connected ? 'connected' : 'disconnected',
          lastSyncTime: int.last_sync,
          dataCount: int.data_count,
          icon: INTEGRATION_ICONS[int.name] || '',
        }));

        setIntegrations(transformedIntegrations);
      }
    } catch (err) {
      logger.error('Error fetching integration status:', err);
      setError('Unable to load integration status');
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastSync = (timestamp?: string): string => {
    if (!timestamp) return 'Never synced';

    const syncDate = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return syncDate.toLocaleDateString();
  };

  const getStatusConfig = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return {
          icon: CheckCircle,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          label: 'Connected',
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Syncing',
          animate: true,
        };
      case 'stale':
        return {
          icon: AlertTriangle,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          label: 'Needs Update',
        };
      case 'error':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Error',
        };
      default:
        return {
          icon: Plug,
          color: 'text-gray-400',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Not Connected',
        };
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl p-5 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Integration Health</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
              <div className="h-6 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state - no integrations
  if (integrations.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl p-5 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Integration Health</h3>
        </div>
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Plug className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 mb-4">No integrations connected</p>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Connect your first integration
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Count connected integrations
  const connectedCount = integrations.filter(i => i.status === 'connected' || i.status === 'syncing').length;
  const hasIssues = integrations.some(i => i.status === 'error' || i.status === 'stale');

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Integration Health</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {connectedCount} of {integrations.length} connected
          </p>
        </div>
        <Link
          href="/marketplace"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          Manage
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={fetchIntegrationStatus}
              className="ml-auto text-sm text-red-700 hover:text-red-800 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Integration list */}
      <div className="space-y-2">
        {integrations.slice(0, 6).map((integration) => {
          const config = getStatusConfig(integration.status);
          const StatusIcon = config.icon;

          return (
            <Link
              key={integration.id}
              href={`/dashboard/tools/${integration.provider}`}
              className={`flex items-center gap-3 p-3 -mx-1 rounded-lg border ${config.borderColor} ${config.bgColor} hover:shadow-sm transition-all`}
            >
              {/* Integration icon */}
              <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
                {integration.icon ? (
                  <img
                    src={integration.icon}
                    alt={integration.name}
                    className="w-6 h-6"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-lg">{integration.name.charAt(0)}</span>
                )}
              </div>

              {/* Integration info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{integration.name}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatLastSync(integration.lastSyncTime)}</span>
                </div>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-1.5">
                <StatusIcon
                  className={`w-4 h-4 ${config.color} ${config.animate ? 'animate-spin' : ''}`}
                />
                <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Warning banner for issues */}
      {hasIssues && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              Some integrations need attention. Click to view details.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default IntegrationHealthCards;
