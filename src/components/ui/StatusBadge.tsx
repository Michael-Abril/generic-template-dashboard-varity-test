import * as React from 'react';
import { Check, RefreshCw, AlertTriangle, X, Plus, Bell, Loader2 } from 'lucide-react';

export type IntegrationStatus =
  | 'connected'
  | 'syncing'
  | 'attention'
  | 'error'
  | 'available'
  | 'coming_soon'
  | 'disconnected';

interface StatusBadgeProps {
  status: IntegrationStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
  pulse?: boolean;
}

const STATUS_CONFIG: Record<IntegrationStatus, {
  icon: React.ElementType;
  text: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  iconColor: string;
}> = {
  connected: {
    icon: Check,
    text: 'Connected',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
  },
  syncing: {
    icon: Loader2,
    text: 'Syncing...',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
  },
  attention: {
    icon: AlertTriangle,
    text: 'Needs attention',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-500',
  },
  error: {
    icon: X,
    text: 'Connection failed',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
  },
  available: {
    icon: Plus,
    text: 'Connect',
    bgColor: 'bg-white',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-300',
    iconColor: 'text-gray-400',
  },
  coming_soon: {
    icon: Bell,
    text: 'Coming Soon',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-200',
    iconColor: 'text-gray-400',
  },
  disconnected: {
    icon: X,
    text: 'Disconnected',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-200',
    iconColor: 'text-gray-400',
  },
};

const SIZE_CONFIG = {
  sm: {
    badge: 'px-2 py-0.5 text-xs',
    icon: 'w-3 h-3',
    gap: 'gap-1',
  },
  md: {
    badge: 'px-2.5 py-1 text-sm',
    icon: 'w-4 h-4',
    gap: 'gap-1.5',
  },
  lg: {
    badge: 'px-3 py-1.5 text-sm',
    icon: 'w-5 h-5',
    gap: 'gap-2',
  },
};

export const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({
    status,
    size = 'md',
    showIcon = true,
    showText = true,
    className = '',
    pulse = false,
  }, ref) => {
    const config = STATUS_CONFIG[status];
    const sizeConfig = SIZE_CONFIG[size];
    const Icon = config.icon;
    const isAnimated = status === 'syncing';

    return (
      <div
        ref={ref}
        className={`
          inline-flex items-center ${sizeConfig.gap}
          ${sizeConfig.badge}
          ${config.bgColor} ${config.textColor}
          border ${config.borderColor}
          rounded-full font-medium
          transition-all duration-200
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        role="status"
        aria-label={config.text}
      >
        {showIcon && (
          <span className={`relative ${pulse ? 'animate-pulse' : ''}`}>
            <Icon
              className={`
                ${sizeConfig.icon} ${config.iconColor}
                ${isAnimated ? 'animate-spin' : ''}
              `.trim().replace(/\s+/g, ' ')}
              aria-hidden="true"
            />
          </span>
        )}
        {showText && <span>{config.text}</span>}
      </div>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

// Dot-only status indicator for compact displays
interface StatusDotProps {
  status: IntegrationStatus;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const DOT_SIZE_CONFIG = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

const DOT_COLOR_CONFIG: Record<IntegrationStatus, string> = {
  connected: 'bg-green-500',
  syncing: 'bg-blue-500',
  attention: 'bg-yellow-500',
  error: 'bg-red-500',
  available: 'bg-gray-300',
  coming_soon: 'bg-gray-300',
  disconnected: 'bg-gray-300',
};

export const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(
  ({ status, size = 'md', pulse = false, className = '' }, ref) => {
    const shouldPulse = pulse || status === 'syncing' || status === 'attention';
    const config = STATUS_CONFIG[status];

    return (
      <span
        ref={ref}
        className={`
          inline-block ${DOT_SIZE_CONFIG[size]} ${DOT_COLOR_CONFIG[status]}
          rounded-full
          ${shouldPulse ? 'animate-pulse' : ''}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        role="status"
        aria-label={config.text}
      />
    );
  }
);

StatusDot.displayName = 'StatusDot';

export { STATUS_CONFIG };
