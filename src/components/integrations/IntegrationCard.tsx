'use client';

import React from 'react';
import { Settings, ExternalLink, RefreshCw, Database, Clock, Bell, ArrowRight } from 'lucide-react';
import { IntegrationLogo } from '@/components/IntegrationLogo';
import { StatusBadge, IntegrationStatus, StatusDot } from '@/components/ui/StatusBadge';

export interface IntegrationCardData {
  id: string | number;
  name: string;
  logo: string;
  developer: string;
  shortDescription: string;
  category: string;
  status: IntegrationStatus;
  lastSync?: string | null;
  recordsCount?: number;
  startingPrice?: number | null;
  isFeatured?: boolean;
  hasAdapter?: boolean;
}

interface IntegrationCardProps {
  integration: IntegrationCardData;
  onConnect?: () => void;
  onConfigure?: () => void;
  onNotifyMe?: () => void;
  isConnecting?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNumber(num: number | undefined): string {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function IntegrationCard({
  integration,
  onConnect,
  onConfigure,
  onNotifyMe,
  isConnecting = false,
  variant = 'default',
  className = '',
}: IntegrationCardProps) {
  const isConnected = integration.status === 'connected' || integration.status === 'syncing';
  const isComingSoon = integration.status === 'coming_soon';
  const hasError = integration.status === 'error' || integration.status === 'attention';

  const handleClick = () => {
    if (isComingSoon && onNotifyMe) {
      onNotifyMe();
    } else if (isConnected && onConfigure) {
      onConfigure();
    } else if (!isConnected && !isComingSoon && onConnect) {
      onConnect();
    }
  };

  // Compact variant for lists
  if (variant === 'compact') {
    return (
      <div
        className={`
          flex items-center justify-between p-4
          bg-white border border-gray-200 rounded-lg
          hover:shadow-md transition-all duration-200
          ${isComingSoon ? 'opacity-60' : 'cursor-pointer hover:border-gray-300'}
          ${isConnected ? 'border-green-200 bg-green-50/30' : ''}
          ${className}
        `}
        onClick={!isComingSoon ? handleClick : undefined}
        role={!isComingSoon ? 'button' : undefined}
        tabIndex={!isComingSoon ? 0 : undefined}
        onKeyDown={(e) => {
          if (!isComingSoon && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <div className="flex items-center gap-3">
          <IntegrationLogo integration={integration.logo} size="sm" />
          <div>
            <h4 className="font-medium text-gray-900">{integration.name}</h4>
            <p className="text-sm text-gray-500">{integration.developer}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isConnected && integration.recordsCount !== undefined && (
            <span className="text-sm text-gray-500">
              {formatNumber(integration.recordsCount)} items
            </span>
          )}
          <StatusBadge status={integration.status} size="sm" showText={false} />
        </div>
      </div>
    );
  }

  // Detailed variant with more information
  if (variant === 'detailed') {
    return (
      <div
        className={`
          bg-white border rounded-xl overflow-hidden
          transition-all duration-300
          ${isConnected ? 'border-green-200 ring-2 ring-green-100' : 'border-gray-200'}
          ${hasError ? 'border-yellow-200 ring-2 ring-yellow-100' : ''}
          ${isComingSoon ? 'opacity-60' : 'hover:shadow-xl hover:-translate-y-1'}
          ${className}
        `}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <IntegrationLogo integration={integration.logo} size="lg" />
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{integration.name}</h3>
                <p className="text-sm text-gray-500">{integration.developer}</p>
              </div>
            </div>
            <StatusBadge status={integration.status} size="md" />
          </div>

          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {integration.shortDescription}
          </p>

          {/* Stats for connected integrations */}
          {isConnected && (
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              {integration.lastSync && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Synced {formatRelativeTime(integration.lastSync)}</span>
                </div>
              )}
              {integration.recordsCount !== undefined && (
                <div className="flex items-center gap-1">
                  <Database className="w-4 h-4" />
                  <span>{formatNumber(integration.recordsCount)} items</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          {isComingSoon ? (
            <button
              onClick={onNotifyMe}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
            >
              <Bell className="w-4 h-4" />
              Notify Me
            </button>
          ) : isConnected ? (
            <div className="flex gap-3">
              <button
                onClick={onConfigure}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all"
              >
                <Settings className="w-4 h-4" />
                Configure
              </button>
              <button
                onClick={onConnect}
                disabled={isConnecting}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {isConnecting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 hover:shadow-md transition-all disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default card variant
  return (
    <div
      className={`
        bg-white rounded-xl p-6 relative
        border transition-all duration-300
        ${isConnected
          ? 'border-2 border-green-500 ring-2 ring-green-100 hover:shadow-xl hover:-translate-y-1 cursor-pointer'
          : isComingSoon
            ? 'border-gray-200 opacity-60 cursor-not-allowed'
            : hasError
              ? 'border-2 border-yellow-400 ring-2 ring-yellow-100 hover:shadow-xl hover:-translate-y-1 cursor-pointer'
              : 'border-gray-200 hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 cursor-pointer'
        }
        ${className}
      `}
      onClick={!isComingSoon ? handleClick : undefined}
      role={!isComingSoon ? 'button' : undefined}
      tabIndex={!isComingSoon ? 0 : undefined}
      onKeyDown={(e) => {
        if (!isComingSoon && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Status indicator in corner */}
      <div className="absolute top-3 right-3">
        {isConnected ? (
          <StatusBadge status={integration.status} size="sm" />
        ) : isComingSoon ? (
          <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1 rounded-full">
            Coming Soon
          </span>
        ) : hasError ? (
          <StatusBadge status={integration.status} size="sm" />
        ) : null}
      </div>

      {/* Card Content */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <IntegrationLogo integration={integration.logo} size="md" />
          <div>
            <h3 className={`font-bold ${isComingSoon ? 'text-gray-500' : 'text-gray-900'}`}>
              {integration.name}
            </h3>
            <p className="text-xs text-gray-500">{integration.developer}</p>
          </div>
        </div>
      </div>

      <p className={`text-sm mb-4 line-clamp-2 ${isComingSoon ? 'text-gray-400' : 'text-gray-600'}`}>
        {integration.shortDescription}
      </p>

      {/* Connected integration stats */}
      {isConnected && (
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 border-t border-gray-100 pt-4">
          {integration.lastSync && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatRelativeTime(integration.lastSync)}</span>
            </div>
          )}
          {integration.recordsCount !== undefined && (
            <div className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              <span>{formatNumber(integration.recordsCount)} items</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        {isComingSoon ? (
          <p className="text-sm text-gray-400 italic">Available soon</p>
        ) : integration.startingPrice ? (
          <div>
            <p className="text-xs text-gray-500 mb-1">Starting at</p>
            <p className="text-2xl font-bold text-gray-900">
              ${integration.startingPrice}
              <span className="text-sm font-normal text-gray-500">/mo</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">Free to connect</p>
        )}
      </div>
    </div>
  );
}

// Grid wrapper for consistent layout
interface IntegrationCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function IntegrationCardGrid({
  children,
  columns = 4,
  className = '',
}: IntegrationCardGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={`grid grid-cols-1 ${gridCols[columns]} gap-6 ${className}`}>
      {children}
    </div>
  );
}

export default IntegrationCard;
