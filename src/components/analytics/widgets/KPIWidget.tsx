'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer
} from 'recharts';

interface KPIWidgetProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  previousValue?: number;
  sparklineData?: number[];
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
  size?: 'sm' | 'md' | 'lg';
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-100 text-blue-600',
    text: 'text-blue-600',
    spark: '#3b82f6',
    sparkFill: 'rgba(59, 130, 246, 0.1)'
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-100 text-green-600',
    text: 'text-green-600',
    spark: '#22c55e',
    sparkFill: 'rgba(34, 197, 94, 0.1)'
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-100 text-purple-600',
    text: 'text-purple-600',
    spark: '#8b5cf6',
    sparkFill: 'rgba(139, 92, 246, 0.1)'
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'bg-orange-100 text-orange-600',
    text: 'text-orange-600',
    spark: '#f97316',
    sparkFill: 'rgba(249, 115, 22, 0.1)'
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-100 text-red-600',
    text: 'text-red-600',
    spark: '#ef4444',
    sparkFill: 'rgba(239, 68, 68, 0.1)'
  },
  gray: {
    bg: 'bg-gray-50',
    icon: 'bg-gray-100 text-gray-600',
    text: 'text-gray-600',
    spark: '#6b7280',
    sparkFill: 'rgba(107, 114, 128, 0.1)'
  }
};

export default function KPIWidget({
  title,
  value,
  prefix = '',
  suffix = '',
  change,
  changeLabel,
  previousValue,
  sparklineData,
  icon,
  color = 'blue',
  size = 'md'
}: KPIWidgetProps) {
  const colors = colorClasses[color];
  const formattedValue = `${prefix}${value.toLocaleString()}${suffix}`;

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const valueSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  // Prepare sparkline data
  const chartData = sparklineData?.map((val, idx) => ({ value: val, index: idx })) || [];

  return (
    <div className={`h-full ${colors.bg} rounded-lg ${sizeClasses[size]} flex flex-col justify-between`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <div className={`p-2 rounded-lg ${colors.icon}`}>
              {icon}
            </div>
          )}
          <span className="text-sm font-medium text-gray-600">{title}</span>
        </div>
      </div>

      {/* Value */}
      <div className="my-2">
        <p className={`${valueSizeClasses[size]} font-bold text-gray-900`}>
          {formattedValue}
        </p>
      </div>

      {/* Sparkline */}
      {chartData.length > 0 && (
        <div className="h-12 -mx-2 mb-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.spark} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.spark} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={colors.spark}
                strokeWidth={2}
                fill={`url(#gradient-${color})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Change indicator */}
      {change !== undefined && (
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 ${
            change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
          }`}>
            {change > 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : change < 0 ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {change > 0 ? '+' : ''}{change}%
            </span>
          </div>
          {changeLabel && (
            <span className="text-xs text-gray-500">{changeLabel}</span>
          )}
          {previousValue !== undefined && (
            <span className="text-xs text-gray-400">
              vs {prefix}{previousValue.toLocaleString()}{suffix}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
