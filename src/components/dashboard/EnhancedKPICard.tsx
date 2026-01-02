'use client';

import { useMemo } from 'react';
import { HelpCircle, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Sparkline, getSparklineColors } from './Sparkline';

interface EnhancedKPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    period: string;
  };
  icon: string;
  source?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  sparklineData?: number[];
  showSparkline?: boolean; // Explicitly control whether to show sparkline
  lastSynced?: string; // ISO timestamp or relative string
  helpText?: string;
  onClick?: () => void;
}

export function EnhancedKPICard({
  title,
  value,
  change,
  icon,
  source,
  trend = 'neutral',
  color = 'blue',
  sparklineData,
  showSparkline = false, // Default to not showing sparkline
  lastSynced,
  helpText,
  onClick,
}: EnhancedKPICardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      border: 'border-blue-100',
      accent: 'text-blue-600',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      border: 'border-green-100',
      accent: 'text-green-600',
    },
    orange: {
      bg: 'bg-orange-50',
      icon: 'text-orange-600',
      border: 'border-orange-100',
      accent: 'text-orange-600',
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      border: 'border-purple-100',
      accent: 'text-purple-600',
    },
    red: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      border: 'border-red-100',
      accent: 'text-red-600',
    },
  };

  const trendConfig = {
    up: {
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      icon: TrendingUp,
      label: 'Up',
    },
    down: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: TrendingDown,
      label: 'Down',
    },
    neutral: {
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      icon: Minus,
      label: 'No change',
    },
  };

  const TrendIcon = trendConfig[trend].icon;
  const sparklineColors = getSparklineColors(trend, color);

  // Format last synced time
  const formattedLastSynced = useMemo(() => {
    if (!lastSynced) return null;

    // If it's already a relative string (e.g., "2 min ago"), return as-is
    if (lastSynced.includes('ago') || lastSynced.includes('Just now')) {
      return lastSynced;
    }

    // Otherwise, try to parse as ISO date
    try {
      const syncDate = new Date(lastSynced);
      const now = new Date();
      const diffMs = now.getTime() - syncDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return lastSynced;
    }
  }, [lastSynced]);

  // Generate mock sparkline data if none provided
  const displaySparklineData = useMemo(() => {
    if (sparklineData && sparklineData.length >= 2) return sparklineData;

    // Generate plausible trend data based on current value and change
    const baseValue = typeof value === 'number' ? value : parseFloat(value.replace(/[^0-9.-]/g, '')) || 100;
    const changePercent = change?.value || 0;
    const points = 7;
    const data: number[] = [];

    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1);
      const trendValue = baseValue * (1 - changePercent / 100 * (1 - progress));
      const noise = trendValue * 0.02 * (Math.random() - 0.5);
      data.push(Math.max(0, trendValue + noise));
    }

    return data;
  }, [sparklineData, value, change]);

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Header Row - Icon, Title, Help, Source */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 ${colorClasses[color].bg} rounded-lg flex items-center justify-center text-xl`}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-medium text-gray-700">{title}</h3>
              {helpText && (
                <div className="relative group">
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    {helpText}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                  </div>
                </div>
              )}
            </div>
            {source && (
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">{source}</span>
            )}
          </div>
        </div>
      </div>

      {/* Value Row - BAN (Big-Ass Number) */}
      <div className="mb-3">
        <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
      </div>

      {/* Trend Indicator */}
      {change && (
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${trendConfig[trend].bgColor} ${trendConfig[trend].color}`}
          >
            <TrendIcon className="w-3.5 h-3.5" />
            <span>{Math.abs(change.value).toFixed(1)}%</span>
          </span>
          <span className="text-xs text-gray-500">{change.period}</span>
        </div>
      )}

      {/* Sparkline - Only show if showSparkline is true */}
      {showSparkline && (
        <div className="mb-3">
          <Sparkline
            data={displaySparklineData}
            width={180}
            height={36}
            strokeColor={sparklineColors.stroke}
            fillColor={sparklineColors.fill}
            strokeWidth={2}
            showGradient={true}
            className="w-full"
          />
        </div>
      )}

      {/* Footer - Last Synced */}
      {formattedLastSynced && (
        <div className="flex items-center gap-1 text-[10px] text-gray-400 pt-2 border-t border-gray-100">
          <Clock className="w-3 h-3" />
          <span>Synced {formattedLastSynced}</span>
        </div>
      )}
    </div>
  );
}

export default EnhancedKPICard;
