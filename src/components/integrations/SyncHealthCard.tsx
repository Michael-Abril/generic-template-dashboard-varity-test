'use client';

import React from 'react';
import {
  RefreshCw,
  Clock,
  Database,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Calendar,
  Loader2,
} from 'lucide-react';
import { StatusBadge, IntegrationStatus, StatusDot } from '@/components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface SyncHealthData {
  status: IntegrationStatus;
  lastSync: string | null;
  nextSync?: string | null;
  recordsCount: number;
  errorMessage?: string | null;
  dataTypes?: Array<{
    type: string;
    count: number;
    lastUpdated?: string;
  }>;
}

interface SyncHealthCardProps {
  integrationName: string;
  health: SyncHealthData;
  onSyncNow?: () => void;
  syncing?: boolean;
  compact?: boolean;
  className?: string;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return 'Not scheduled';

  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

const StatusIcon: React.FC<{ status: IntegrationStatus; className?: string }> = ({
  status,
  className = 'w-5 h-5',
}) => {
  switch (status) {
    case 'connected':
      return <CheckCircle className={`${className} text-green-500`} />;
    case 'syncing':
      return <Loader2 className={`${className} text-blue-500 animate-spin`} />;
    case 'attention':
      return <AlertTriangle className={`${className} text-yellow-500`} />;
    case 'error':
      return <XCircle className={`${className} text-red-500`} />;
    default:
      return <Activity className={`${className} text-gray-400`} />;
  }
};

export function SyncHealthCard({
  integrationName,
  health,
  onSyncNow,
  syncing = false,
  compact = false,
  className = '',
}: SyncHealthCardProps) {
  const displayStatus = syncing ? 'syncing' : health.status;

  if (compact) {
    return (
      <div
        className={`
          bg-white border border-gray-200 rounded-lg p-4
          hover:shadow-md transition-shadow duration-200
          ${className}
        `}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StatusDot status={displayStatus} size="md" />
            <span className="text-sm font-medium text-gray-900">Sync Status</span>
          </div>
          <StatusBadge status={displayStatus} size="sm" />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Last sync</span>
            <p className="font-medium text-gray-900">{formatRelativeTime(health.lastSync)}</p>
          </div>
          <div>
            <span className="text-gray-500">Records</span>
            <p className="font-medium text-gray-900">{formatNumber(health.recordsCount)}</p>
          </div>
        </div>

        {onSyncNow && (
          <button
            onClick={onSyncNow}
            disabled={syncing}
            className={`
              mt-3 w-full flex items-center justify-center gap-2
              px-3 py-2 text-sm font-medium rounded-lg
              transition-all duration-200
              ${syncing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }
            `}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Sync Health
          </CardTitle>
          <StatusBadge status={displayStatus} size="md" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Summary */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <StatusIcon status={displayStatus} className="w-8 h-8" />
          <div>
            <p className="font-medium text-gray-900">
              {displayStatus === 'connected' && 'All systems operational'}
              {displayStatus === 'syncing' && 'Sync in progress...'}
              {displayStatus === 'attention' && 'Requires attention'}
              {displayStatus === 'error' && 'Connection issue detected'}
              {displayStatus === 'available' && 'Ready to connect'}
              {displayStatus === 'disconnected' && 'Not connected'}
            </p>
            {health.errorMessage && (
              <p className="text-sm text-red-600 mt-1">{health.errorMessage}</p>
            )}
          </div>
        </div>

        {/* Sync Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Clock className="w-4 h-4" />
              <span>Last Sync</span>
            </div>
            <p className="font-semibold text-gray-900">
              {formatRelativeTime(health.lastSync)}
            </p>
            {health.lastSync && (
              <p className="text-xs text-gray-500">
                {formatDateTime(health.lastSync)}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Calendar className="w-4 h-4" />
              <span>Next Sync</span>
            </div>
            <p className="font-semibold text-gray-900">
              {health.nextSync ? formatDateTime(health.nextSync) : 'Manual'}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Database className="w-4 h-4" />
              <span>Records Synced</span>
            </div>
            <p className="font-semibold text-gray-900">
              {formatNumber(health.recordsCount)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Activity className="w-4 h-4" />
              <span>Data Types</span>
            </div>
            <p className="font-semibold text-gray-900">
              {health.dataTypes?.length || 0}
            </p>
          </div>
        </div>

        {/* Data Types Breakdown */}
        {health.dataTypes && health.dataTypes.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Data Breakdown</p>
            <div className="space-y-2">
              {health.dataTypes.map((dataType) => (
                <div
                  key={dataType.type}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-600 capitalize">
                    {dataType.type.replace(/_/g, ' ')}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatNumber(dataType.count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sync Now Button */}
        {onSyncNow && (
          <button
            onClick={onSyncNow}
            disabled={syncing}
            className={`
              w-full flex items-center justify-center gap-2
              px-4 py-3 font-medium rounded-lg
              transition-all duration-200
              ${syncing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
              }
            `}
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing data...' : 'Sync Now'}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// Export a mini version for inline use
interface SyncStatusInlineProps {
  lastSync: string | null;
  status: IntegrationStatus;
  recordsCount?: number;
  className?: string;
}

export function SyncStatusInline({
  lastSync,
  status,
  recordsCount,
  className = '',
}: SyncStatusInlineProps) {
  return (
    <div className={`flex items-center gap-3 text-sm ${className}`}>
      <StatusDot status={status} />
      <span className="text-gray-600">
        {lastSync ? `Synced ${formatRelativeTime(lastSync)}` : 'Not synced'}
      </span>
      {recordsCount !== undefined && recordsCount > 0 && (
        <>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600">{formatNumber(recordsCount)} items</span>
        </>
      )}
    </div>
  );
}

export default SyncHealthCard;
