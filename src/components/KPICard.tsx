'use client';

interface KPICardProps {
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
}

export function KPICard({
  title,
  value,
  change,
  icon,
  source,
  trend = 'neutral',
  color = 'blue',
}: KPICardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      border: 'border-blue-100',
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      border: 'border-green-100',
    },
    orange: {
      bg: 'bg-orange-50',
      icon: 'text-orange-600',
      border: 'border-orange-100',
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      border: 'border-purple-100',
    },
    red: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      border: 'border-red-100',
    },
  };

  const trendConfig = {
    up: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: '↑',
    },
    down: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: '↓',
    },
    neutral: {
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      icon: '→',
    },
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 transition-all duration-200 cursor-pointer">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${colorClasses[color].bg} rounded-lg flex items-center justify-center text-2xl`}>
          {icon}
        </div>
        {source && (
          <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
            {source}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>

      {/* Value */}
      <div className="flex items-baseline gap-2 mb-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>

      {/* Change indicator */}
      {change && (
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${trendConfig[trend].bgColor} ${trendConfig[trend].color}`}
          >
            <span>{trendConfig[trend].icon}</span>
            <span>{Math.abs(change.value)}%</span>
          </span>
          <span className="text-xs text-gray-500">{change.period}</span>
        </div>
      )}
    </div>
  );
}
