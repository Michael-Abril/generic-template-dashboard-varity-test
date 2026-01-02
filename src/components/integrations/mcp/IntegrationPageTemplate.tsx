'use client';

import { useState } from 'react';
import { RefreshCw, Clock, AlertCircle, CheckCircle, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Simple cn utility
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
  component: React.ReactNode;
  dataType?: string;
  destination?: 'rag' | 'live' | 'hybrid';
}

interface IntegrationPageTemplateProps {
  integration: string;
  integrationName: string;
  integrationIcon: React.ReactNode;
  tabs: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  lastSync?: string | null;
  source?: 'rag' | 'live' | 'hybrid' | 'cache';
  loading?: boolean;
  syncing?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onSync?: () => void;
  className?: string;
}

/**
 * IntegrationPageTemplate - Unified layout for all integration pages
 *
 * Features:
 * - Consistent header with integration icon and status
 * - Tab navigation
 * - Data freshness indicator
 * - Sync/Refresh actions
 * - Error handling
 */
export function IntegrationPageTemplate({
  integration: _integration, // Prefixed to indicate intentionally unused (could be used for analytics)
  integrationName,
  integrationIcon,
  tabs,
  activeTab: controlledActiveTab,
  onTabChange,
  lastSync,
  source = 'cache',
  loading = false,
  syncing = false,
  error,
  onRefresh,
  onSync,
  className = '',
}: IntegrationPageTemplateProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id || '');

  const activeTab = controlledActiveTab ?? internalActiveTab;
  const handleTabChange = onTabChange ?? setInternalActiveTab;

  const currentTab = tabs.find((t) => t.id === activeTab);

  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                {integrationIcon}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {integrationName}
                </h1>
                <DataSourceBadge source={source} lastSync={lastSync} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={loading}
                >
                  <RefreshCw
                    className={cn('h-4 w-4 mr-2', loading && 'animate-spin')}
                  />
                  Refresh
                </Button>
              )}
              {onSync && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onSync}
                  disabled={syncing}
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>Sync Data</>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex space-x-8 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                  {tab.destination === 'live' && (
                    <span className="ml-1 w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Error loading data</p>
              <p className="text-sm text-red-600">{error}</p>
              {source === 'cache' && (
                <p className="text-sm text-red-600 mt-1">
                  Showing cached data. Try refreshing.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab Content */}
        {currentTab?.component}
      </div>
    </div>
  );
}

/**
 * Data source badge showing freshness
 */
function DataSourceBadge({
  source,
  lastSync,
}: {
  source: 'rag' | 'live' | 'hybrid' | 'cache';
  lastSync?: string | null;
}) {
  const getSourceInfo = () => {
    switch (source) {
      case 'live':
        return {
          icon: Wifi,
          label: 'Live',
          className: 'bg-green-100 text-green-700',
        };
      case 'hybrid':
        return {
          icon: CheckCircle,
          label: 'Hybrid',
          className: 'bg-blue-100 text-blue-700',
        };
      case 'rag':
        return {
          icon: Clock,
          label: 'Synced',
          className: 'bg-gray-100 text-gray-700',
        };
      case 'cache':
      default:
        return {
          icon: Clock,
          label: 'Cached',
          className: 'bg-yellow-100 text-yellow-700',
        };
    }
  };

  const { icon: Icon, label, className } = getSourceInfo();

  const formatLastSync = () => {
    if (!lastSync) return null;

    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="flex items-center gap-2 mt-1">
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
          className
        )}
      >
        <Icon className="h-3 w-3" />
        {label}
      </span>
      {lastSync && (
        <span className="text-xs text-gray-500">{formatLastSync()}</span>
      )}
    </div>
  );
}

export default IntegrationPageTemplate;
