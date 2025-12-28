'use client';

/**
 * Context Preview - Data Availability Summary
 *
 * Shows what data sources are available for AI queries with sync status.
 * Part of Terminal 4: AI Enhancement Team
 *
 * Created: December 28, 2025
 */

import React, { useMemo } from 'react';
import {
  Database,
  FileText,
  Cloud,
  Mail,
  Calendar,
  Users,
  Briefcase,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { StalenessIndicator, FreshnessDot } from './StalenessIndicator';
import { IntegrationContextInfo, EnhancedRAGStatus, calculateFreshness } from '@/types/ai';

interface ContextPreviewProps {
  /** RAG status with integration details */
  ragStatus: EnhancedRAGStatus;
  /** Whether to show expanded view */
  expanded?: boolean;
  /** Toggle expanded state */
  onToggleExpanded?: () => void;
  /** Trigger data sync */
  onSync?: (integration: string) => void;
  /** Custom className */
  className?: string;
}

/**
 * Get icon for integration provider
 */
function getIntegrationIcon(provider: string) {
  const iconMap: Record<string, React.ReactNode> = {
    google: <Mail className="h-4 w-4" />,
    microsoft: <Calendar className="h-4 w-4" />,
    slack: <MessageSquare className="h-4 w-4" />,
    quickbooks: <Briefcase className="h-4 w-4" />,
    salesforce: <Users className="h-4 w-4" />,
    hubspot: <Users className="h-4 w-4" />
  };
  return iconMap[provider.toLowerCase()] || <Cloud className="h-4 w-4" />;
}

/**
 * Get brand color for integration
 */
function getIntegrationColor(provider: string): string {
  const colorMap: Record<string, string> = {
    google: 'text-red-600 bg-red-50',
    microsoft: 'text-blue-600 bg-blue-50',
    slack: 'text-purple-600 bg-purple-50',
    quickbooks: 'text-green-600 bg-green-50',
    salesforce: 'text-sky-600 bg-sky-50',
    hubspot: 'text-orange-600 bg-orange-50'
  };
  return colorMap[provider.toLowerCase()] || 'text-gray-600 bg-gray-50';
}

/**
 * Integration row component
 */
function IntegrationRow({
  info,
  onSync
}: {
  info: IntegrationContextInfo;
  onSync?: (integration: string) => void;
}) {
  const freshness = calculateFreshness(info.lastSyncedAt);
  const colorClasses = getIntegrationColor(info.provider);

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        {/* Icon */}
        <span className={`p-1.5 rounded ${colorClasses}`}>
          {getIntegrationIcon(info.provider)}
        </span>

        {/* Name and status */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {info.displayName}
            </span>
            <FreshnessDot lastSyncedAt={info.lastSyncedAt} />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{info.documentCount} documents</span>
            {info.dataTypes.length > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span>{info.dataTypes.slice(0, 2).join(', ')}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sync button for stale data */}
      <div className="flex items-center gap-2">
        <StalenessIndicator lastSyncedAt={info.lastSyncedAt} compact />
        {freshness === 'stale' && onSync && (
          <button
            onClick={() => onSync(info.provider)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Sync now"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Summary badges component
 */
function ContextSummary({ ragStatus }: { ragStatus: EnhancedRAGStatus }) {
  const connectedCount = ragStatus.integrationDetails.filter(i => i.isConnected).length;
  const staleCount = ragStatus.integrationDetails.filter(i => i.isStale).length;

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5">
        <Database className="h-4 w-4 text-blue-600" />
        <span className="text-gray-700">
          <span className="font-semibold">{ragStatus.documentCount}</span> docs
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Cloud className="h-4 w-4 text-green-600" />
        <span className="text-gray-700">
          <span className="font-semibold">{connectedCount}</span> sources
        </span>
      </div>

      {staleCount > 0 && (
        <div className="flex items-center gap-1.5 text-yellow-600">
          <AlertTriangle className="h-4 w-4" />
          <span>
            <span className="font-semibold">{staleCount}</span> need sync
          </span>
        </div>
      )}
    </div>
  );
}

export function ContextPreview({
  ragStatus,
  expanded = false,
  onToggleExpanded,
  onSync,
  className = ''
}: ContextPreviewProps) {
  // Sort integrations: connected first, then by freshness
  const sortedIntegrations = useMemo(() => {
    return [...ragStatus.integrationDetails].sort((a, b) => {
      // Connected first
      if (a.isConnected !== b.isConnected) {
        return a.isConnected ? -1 : 1;
      }
      // Then by freshness (fresh > recent > stale)
      const freshnessOrder = { fresh: 0, recent: 1, stale: 2 };
      return freshnessOrder[a.freshness] - freshnessOrder[b.freshness];
    });
  }, [ragStatus.integrationDetails]);

  if (ragStatus.loading) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  if (!ragStatus.dataAvailable || ragStatus.integrationDetails.length === 0) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <Database className="h-5 w-5" />
          <span className="text-sm">No data sources connected</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Connect integrations in the Marketplace to enable AI search
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header with summary */}
      <button
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-900">Search in your data</span>
        </div>

        <div className="flex items-center gap-3">
          <ContextSummary ragStatus={ragStatus} />
          {onToggleExpanded && (
            expanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 p-2 max-h-64 overflow-y-auto">
          {sortedIntegrations.map((info) => (
            <IntegrationRow
              key={info.provider}
              info={info}
              onSync={onSync}
            />
          ))}

          {ragStatus.lastSyncTime && (
            <div className="mt-2 pt-2 border-t border-gray-100 px-3">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Last sync: {ragStatus.lastSyncTime.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline version for header
 */
export function ContextPreviewBadge({
  ragStatus,
  onClick
}: {
  ragStatus: EnhancedRAGStatus;
  onClick?: () => void;
}) {
  if (ragStatus.loading) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs animate-pulse">
        <Database className="h-3 w-3" />
        Loading...
      </span>
    );
  }

  if (!ragStatus.dataAvailable) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
        <Database className="h-3 w-3" />
        No data
      </span>
    );
  }

  const hasStale = ragStatus.hasStaleData;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
        hasStale
          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
          : 'bg-green-100 text-green-700 hover:bg-green-200'
      }`}
    >
      {hasStale ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Database className="h-3 w-3" />
      )}
      <span>{ragStatus.documentCount} docs</span>
      <span className="text-gray-400">|</span>
      <span>{ragStatus.integrations.length} sources</span>
    </button>
  );
}

export default ContextPreview;
