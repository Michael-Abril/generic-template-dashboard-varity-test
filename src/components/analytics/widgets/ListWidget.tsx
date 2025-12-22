'use client';

import React from 'react';
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  User,
  Mail,
  Calendar,
  Package
} from 'lucide-react';

interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  value?: string | number;
  change?: number;
  icon?: React.ReactNode;
  avatar?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

interface ListWidgetProps {
  title?: string;
  items: ListItem[];
  variant?: 'simple' | 'detailed' | 'ranked' | 'activity';
  showIndex?: boolean;
  maxItems?: number;
  onItemClick?: (item: ListItem) => void;
  emptyMessage?: string;
}

const statusColors = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700'
};

export default function ListWidget({
  title,
  items,
  variant = 'simple',
  showIndex = false,
  maxItems = 5,
  onItemClick,
  emptyMessage = 'No items to display'
}: ListWidgetProps) {
  const displayItems = items.slice(0, maxItems);

  if (displayItems.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {title && (
          <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
        )}
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          {emptyMessage}
        </div>
      </div>
    );
  }

  // Ranked variant (like top customers/products)
  if (variant === 'ranked') {
    return (
      <div className="h-full flex flex-col">
        {title && (
          <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
        )}
        <div className="flex-1 space-y-3 overflow-auto">
          {displayItems.map((item, index) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors ${
                onItemClick ? 'cursor-pointer' : ''
              }`}
              onClick={() => onItemClick?.(item)}
            >
              {/* Rank Badge */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                index === 0 ? 'bg-yellow-100 text-yellow-700' :
                index === 1 ? 'bg-gray-100 text-gray-600' :
                index === 2 ? 'bg-orange-100 text-orange-700' :
                'bg-gray-50 text-gray-500'
              }`}>
                {index + 1}
              </div>

              {/* Avatar or Icon */}
              {item.avatar ? (
                <img
                  src={item.avatar}
                  alt={item.title}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : item.icon ? (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  {item.icon}
                </div>
              ) : null}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                {item.subtitle && (
                  <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                )}
              </div>

              {/* Value */}
              {item.value !== undefined && (
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{item.value}</p>
                  {item.change !== undefined && (
                    <div className={`flex items-center gap-0.5 text-xs ${
                      item.change > 0 ? 'text-green-600' : item.change < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {item.change > 0 ? <TrendingUp className="w-3 h-3" /> : item.change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                      {item.change > 0 ? '+' : ''}{item.change}%
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Activity feed variant
  if (variant === 'activity') {
    return (
      <div className="h-full flex flex-col">
        {title && (
          <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
        )}
        <div className="flex-1 overflow-auto">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-4">
              {displayItems.map((item) => (
                <div
                  key={item.id}
                  className={`relative flex items-start gap-3 pl-10 ${
                    onItemClick ? 'cursor-pointer hover:bg-gray-50 rounded-lg p-2 -ml-2' : ''
                  }`}
                  onClick={() => onItemClick?.(item)}
                >
                  {/* Timeline dot */}
                  <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white ${
                    item.status ? statusColors[item.status].replace('text-', 'bg-').split(' ')[0] : 'bg-blue-500'
                  }`} />

                  {/* Icon */}
                  {item.icon && (
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                      {item.icon}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-xs text-gray-500">{item.subtitle}</p>
                    )}
                    {item.timestamp && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.timestamp}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Detailed variant
  if (variant === 'detailed') {
    return (
      <div className="h-full flex flex-col">
        {title && (
          <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
        )}
        <div className="flex-1 divide-y divide-gray-100 overflow-auto">
          {displayItems.map((item, index) => (
            <div
              key={item.id}
              className={`py-3 first:pt-0 last:pb-0 ${
                onItemClick ? 'cursor-pointer hover:bg-gray-50 rounded px-2 -mx-2' : ''
              }`}
              onClick={() => onItemClick?.(item)}
            >
              <div className="flex items-start gap-3">
                {/* Index */}
                {showIndex && (
                  <span className="text-xs text-gray-400 font-medium w-4">{index + 1}.</span>
                )}

                {/* Avatar or Icon */}
                {item.avatar ? (
                  <img
                    src={item.avatar}
                    alt={item.title}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : item.icon ? (
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    {item.icon}
                  </div>
                ) : null}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    {item.value !== undefined && (
                      <span className="text-sm font-semibold text-gray-900 ml-2">{item.value}</span>
                    )}
                  </div>
                  {item.subtitle && (
                    <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {item.status && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                        {item.status}
                      </span>
                    )}
                    {item.timestamp && (
                      <span className="text-xs text-gray-400">{item.timestamp}</span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                {onItemClick && (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Simple variant (default)
  return (
    <div className="h-full flex flex-col">
      {title && (
        <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      )}
      <div className="flex-1 space-y-2 overflow-auto">
        {displayItems.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors ${
              onItemClick ? 'cursor-pointer' : ''
            }`}
            onClick={() => onItemClick?.(item)}
          >
            <div className="flex items-center gap-2 min-w-0">
              {showIndex && (
                <span className="text-xs text-gray-400 font-medium w-4">{index + 1}.</span>
              )}
              {item.icon && (
                <span className="text-gray-500">{item.icon}</span>
              )}
              <span className="text-sm text-gray-900 truncate">{item.title}</span>
            </div>
            {item.value !== undefined && (
              <span className="text-sm font-medium text-gray-700 ml-2">{item.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
