'use client';

/**
 * Staleness Indicator - Data Freshness Display
 *
 * Shows visual indicator of how fresh/stale synced data is.
 * Part of Terminal 4: AI Enhancement Team
 *
 * Created: December 28, 2025
 */

import React from 'react';
import { Clock, Check, AlertTriangle, AlertCircle } from 'lucide-react';
import {
  calculateFreshness,
  getFreshnessColor,
  getFreshnessBgColor,
  FRESHNESS_THRESHOLDS
} from '@/types/ai';

interface StalenessIndicatorProps {
  /** Last sync timestamp */
  lastSyncedAt: Date | null;
  /** Show as compact badge */
  compact?: boolean;
  /** Show tooltip */
  showTooltip?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Format time ago in human-readable format
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Get icon for freshness status
 */
function getFreshnessIcon(freshness: 'fresh' | 'recent' | 'stale') {
  switch (freshness) {
    case 'fresh':
      return <Check className="h-3 w-3" />;
    case 'recent':
      return <Clock className="h-3 w-3" />;
    case 'stale':
      return <AlertTriangle className="h-3 w-3" />;
  }
}

/**
 * Get label text for freshness status
 */
function getFreshnessLabel(freshness: 'fresh' | 'recent' | 'stale'): string {
  switch (freshness) {
    case 'fresh':
      return 'Up to date';
    case 'recent':
      return 'Recent';
    case 'stale':
      return 'Needs sync';
  }
}

export function StalenessIndicator({
  lastSyncedAt,
  compact = false,
  showTooltip = true,
  className = ''
}: StalenessIndicatorProps) {
  // Handle never synced case
  if (!lastSyncedAt) {
    return (
      <div
        className={`inline-flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'} text-gray-500 ${className}`}
        title={showTooltip ? 'Never synced' : undefined}
      >
        <AlertCircle className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        {!compact && <span>Never synced</span>}
      </div>
    );
  }

  const freshness = calculateFreshness(lastSyncedAt);
  const textColor = getFreshnessColor(freshness);
  const bgColor = getFreshnessBgColor(freshness);
  const icon = getFreshnessIcon(freshness);
  const label = getFreshnessLabel(freshness);
  const timeAgo = formatTimeAgo(lastSyncedAt);

  // Compact badge version
  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${bgColor} ${textColor} ${className}`}
        title={showTooltip ? `Last synced: ${timeAgo}` : undefined}
      >
        {icon}
        <span>{timeAgo}</span>
      </span>
    );
  }

  // Full version with label and time
  return (
    <div
      className={`inline-flex items-center gap-2 ${textColor} ${className}`}
      title={showTooltip ? `Last synced: ${lastSyncedAt.toLocaleString()}` : undefined}
    >
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bgColor}`}>
        {icon}
        <span>{label}</span>
      </span>
      <span className="text-xs text-gray-500">
        {timeAgo}
      </span>
    </div>
  );
}

/**
 * Dot indicator for inline use
 */
export function FreshnessDot({
  lastSyncedAt,
  className = ''
}: {
  lastSyncedAt: Date | null;
  className?: string;
}) {
  const freshness = lastSyncedAt ? calculateFreshness(lastSyncedAt) : 'stale';

  const dotColors: Record<string, string> = {
    fresh: 'bg-green-500',
    recent: 'bg-yellow-500',
    stale: 'bg-red-500'
  };

  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${dotColors[freshness]} ${className}`}
      title={lastSyncedAt ? `Last synced: ${formatTimeAgo(lastSyncedAt)}` : 'Never synced'}
    />
  );
}

export default StalenessIndicator;
