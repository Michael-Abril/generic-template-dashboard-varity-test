'use client';

import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  showGradient?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 100,
  height = 32,
  strokeColor = '#3b82f6',
  fillColor = '#3b82f680',
  strokeWidth = 2,
  showGradient = true,
  className = '',
}: SparklineProps) {
  const pathData = useMemo(() => {
    if (!data || data.length < 2) return { line: '', area: '' };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return { x, y };
    });

    // Create smooth line path using cubic bezier curves
    let linePath = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const tension = 0.3;

      const cp1x = prev.x + (curr.x - prev.x) * tension;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) * tension;
      const cp2y = curr.y;

      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }

    // Create area path for gradient fill
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { line: linePath, area: areaPath };
  }, [data, width, height]);

  // Generate unique ID for gradient
  const gradientId = useMemo(() => `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`, []);

  if (!data || data.length < 2) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width, height }}>
        <div className="h-0.5 w-full bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      {showGradient && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}

      {/* Gradient fill area */}
      {showGradient && (
        <path
          d={pathData.area}
          fill={`url(#${gradientId})`}
        />
      )}

      {/* Line */}
      <path
        d={pathData.line}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End point dot */}
      {data.length > 0 && (
        <circle
          cx={width - 2}
          cy={
            height -
            2 -
            ((data[data.length - 1] - Math.min(...data)) /
              (Math.max(...data) - Math.min(...data) || 1)) *
              (height - 4)
          }
          r={3}
          fill={strokeColor}
        />
      )}
    </svg>
  );
}

// Preset color configurations for different trends
export const SPARKLINE_COLORS = {
  positive: {
    stroke: '#10b981',
    fill: '#10b98180',
  },
  negative: {
    stroke: '#ef4444',
    fill: '#ef444480',
  },
  neutral: {
    stroke: '#6b7280',
    fill: '#6b728080',
  },
  blue: {
    stroke: '#3b82f6',
    fill: '#3b82f680',
  },
  purple: {
    stroke: '#8b5cf6',
    fill: '#8b5cf680',
  },
  orange: {
    stroke: '#f97316',
    fill: '#f9731680',
  },
};

// Helper to determine sparkline color based on trend
export function getSparklineColors(trend?: 'up' | 'down' | 'neutral', color?: string) {
  if (trend === 'up') return SPARKLINE_COLORS.positive;
  if (trend === 'down') return SPARKLINE_COLORS.negative;
  if (color && SPARKLINE_COLORS[color as keyof typeof SPARKLINE_COLORS]) {
    return SPARKLINE_COLORS[color as keyof typeof SPARKLINE_COLORS];
  }
  return SPARKLINE_COLORS.blue;
}

export default Sparkline;
