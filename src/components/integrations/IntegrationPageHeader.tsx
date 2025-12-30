'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, RefreshCw, Download, Settings, ExternalLink } from 'lucide-react';
import { IntegrationLogo } from '@/components/IntegrationLogo';
import { StatusBadge, IntegrationStatus } from '@/components/ui/StatusBadge';

interface IntegrationPageHeaderProps {
  integrationName: string;
  integrationLogo: string;
  status: IntegrationStatus;
  lastSync: string | null;
  syncing?: boolean;
  onSync?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
  externalUrl?: string;
  description?: string;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never synced';

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

export function IntegrationPageHeader({
  integrationName,
  integrationLogo,
  status,
  lastSync,
  syncing = false,
  onSync,
  onExport,
  onSettings,
  externalUrl,
  description,
}: IntegrationPageHeaderProps) {
  const displayStatus = syncing ? 'syncing' : status;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 py-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-gray-700 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
          <Link href="/integrations" className="hover:text-gray-700 transition-colors">
            Integrations
          </Link>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
          <span className="text-gray-900 font-medium">{integrationName}</span>
        </nav>

        {/* Header Content */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Logo, Name, Status */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <IntegrationLogo integration={integrationLogo} size="lg" />
              {/* Status dot on logo */}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                  displayStatus === 'connected' ? 'bg-green-500' :
                  displayStatus === 'syncing' ? 'bg-blue-500 animate-pulse' :
                  displayStatus === 'attention' ? 'bg-yellow-500' :
                  displayStatus === 'error' ? 'bg-red-500' : 'bg-gray-300'
                }`}
                aria-hidden="true"
              />
            </div>

            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{integrationName}</h1>
                <StatusBadge status={displayStatus} size="md" />
              </div>
              <p className="text-sm text-gray-500">
                {syncing ? (
                  <span className="text-blue-600">Syncing data...</span>
                ) : lastSync ? (
                  <>Last synced: {formatRelativeTime(lastSync)}</>
                ) : (
                  'No data synced yet'
                )}
              </p>
              {description && (
                <p className="text-sm text-gray-600 mt-1 max-w-xl">{description}</p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {onSync && (
              <button
                onClick={onSync}
                disabled={syncing}
                className={`
                  inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium
                  transition-all duration-200
                  ${syncing
                    ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                  }
                `}
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}

            {onExport && (
              <button
                onClick={onExport}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}

            {onSettings && (
              <button
                onClick={onSettings}
                className="inline-flex items-center justify-center w-10 h-10 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}

            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-10 h-10 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                aria-label={`Open ${integrationName} in new tab`}
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab navigation component for integration pages
interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface IntegrationTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function IntegrationTabs({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}: IntegrationTabsProps) {
  return (
    <div className={`border-b border-gray-200 bg-white ${className}`}>
      <div className="px-4 sm:px-6">
        <nav className="flex gap-6 overflow-x-auto -mb-px" aria-label="Integration tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                transition-colors duration-200
                ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
            >
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`
                    ml-1 px-2 py-0.5 rounded-full text-xs
                    ${activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}
                >
                  {tab.count.toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default IntegrationPageHeader;
