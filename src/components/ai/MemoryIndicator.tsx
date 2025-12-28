'use client';

/**
 * Memory Indicator - Context Window Usage Display
 *
 * Shows visual indicator of conversation context window usage.
 * Part of Terminal 4: AI Enhancement Team
 *
 * Created: December 28, 2025
 */

import React, { useMemo } from 'react';
import {
  Brain,
  AlertTriangle,
  AlertCircle,
  Trash2,
  FileText,
  ChevronDown
} from 'lucide-react';
import {
  MemoryStatus,
  calculateMemoryStatus,
  TOKEN_CONSTANTS
} from '@/types/ai';

interface MemoryIndicatorProps {
  /** Array of messages to calculate from */
  messages: Array<{ content: string; role: string }>;
  /** Pre-calculated memory status (optional) */
  memoryStatus?: MemoryStatus;
  /** Handler for summarize action */
  onSummarize?: () => void;
  /** Handler for clear context action */
  onClearContext?: () => void;
  /** Show expanded view with actions */
  expanded?: boolean;
  /** Toggle expanded state */
  onToggleExpanded?: () => void;
  /** Custom className */
  className?: string;
}

/**
 * Get color classes based on memory status
 */
function getStatusColors(status: 'normal' | 'warning' | 'critical'): {
  bg: string;
  text: string;
  bar: string;
  icon: string;
} {
  switch (status) {
    case 'normal':
      return {
        bg: 'bg-green-50',
        text: 'text-green-700',
        bar: 'bg-green-500',
        icon: 'text-green-600'
      };
    case 'warning':
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        bar: 'bg-yellow-500',
        icon: 'text-yellow-600'
      };
    case 'critical':
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        bar: 'bg-red-500',
        icon: 'text-red-600'
      };
  }
}

/**
 * Get status icon
 */
function getStatusIcon(status: 'normal' | 'warning' | 'critical', className: string = 'h-4 w-4') {
  switch (status) {
    case 'normal':
      return <Brain className={className} />;
    case 'warning':
      return <AlertTriangle className={className} />;
    case 'critical':
      return <AlertCircle className={className} />;
  }
}

/**
 * Format token count for display
 */
function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Token usage bar component
 */
export function TokenUsageBar({
  memoryStatus,
  showLabel = true,
  className = ''
}: {
  memoryStatus: MemoryStatus;
  showLabel?: boolean;
  className?: string;
}) {
  const colors = getStatusColors(memoryStatus.status);

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Context usage</span>
          <span>{Math.round(memoryStatus.percentUsed)}%</span>
        </div>
      )}
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.bar} transition-all duration-300`}
          style={{ width: `${Math.min(memoryStatus.percentUsed, 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Compact badge version
 */
export function MemoryBadge({
  memoryStatus,
  onClick,
  className = ''
}: {
  memoryStatus: MemoryStatus;
  onClick?: () => void;
  className?: string;
}) {
  const colors = getStatusColors(memoryStatus.status);

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
        ${colors.bg} ${colors.text}
        hover:opacity-80 transition-opacity
        ${className}
      `}
      title={`${memoryStatus.messagesIncluded} messages, ~${formatTokens(memoryStatus.estimatedTokens)} tokens`}
    >
      {getStatusIcon(memoryStatus.status, 'h-3 w-3')}
      <span>{Math.round(memoryStatus.percentUsed)}%</span>
    </button>
  );
}

/**
 * Full memory indicator with actions
 */
export function MemoryIndicator({
  messages,
  memoryStatus: providedStatus,
  onSummarize,
  onClearContext,
  expanded = false,
  onToggleExpanded,
  className = ''
}: MemoryIndicatorProps) {
  // Calculate memory status
  const memoryStatus = useMemo(() => {
    if (providedStatus) return providedStatus;
    return calculateMemoryStatus(messages);
  }, [messages, providedStatus]);

  const colors = getStatusColors(memoryStatus.status);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <button
        onClick={onToggleExpanded}
        className={`
          w-full flex items-center justify-between p-3
          hover:bg-gray-50 transition-colors rounded-lg
        `}
      >
        <div className="flex items-center gap-3">
          <span className={`p-1.5 rounded-lg ${colors.bg}`}>
            {getStatusIcon(memoryStatus.status, `h-4 w-4 ${colors.icon}`)}
          </span>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">
              Conversation Memory
            </p>
            <p className="text-xs text-gray-500">
              {memoryStatus.messagesIncluded} messages · ~{formatTokens(memoryStatus.estimatedTokens)} tokens
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TokenUsageBar memoryStatus={memoryStatus} showLabel={false} className="w-20" />
          <span className={`text-sm font-medium ${colors.text}`}>
            {Math.round(memoryStatus.percentUsed)}%
          </span>
          {onToggleExpanded && (
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 p-3 space-y-3">
          {/* Status message */}
          {memoryStatus.status === 'warning' && (
            <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded-lg text-sm text-yellow-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>Context is getting large. Consider summarizing to maintain response quality.</p>
            </div>
          )}

          {memoryStatus.status === 'critical' && (
            <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>Context is near maximum. Summarize or clear context to continue effectively.</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 bg-gray-50 rounded-lg">
              <p className="text-lg font-semibold text-gray-900">
                {memoryStatus.messagesIncluded}
              </p>
              <p className="text-xs text-gray-500">Messages</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <p className="text-lg font-semibold text-gray-900">
                {formatTokens(memoryStatus.estimatedTokens)}
              </p>
              <p className="text-xs text-gray-500">Tokens</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <p className="text-lg font-semibold text-gray-900">
                {formatTokens(memoryStatus.maxTokens - memoryStatus.estimatedTokens)}
              </p>
              <p className="text-xs text-gray-500">Remaining</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {memoryStatus.shouldSummarize && onSummarize && (
              <button
                onClick={onSummarize}
                className="
                  flex-1 flex items-center justify-center gap-2
                  px-3 py-2 rounded-lg
                  bg-blue-50 text-blue-700 hover:bg-blue-100
                  text-sm font-medium transition-colors
                "
              >
                <FileText className="h-4 w-4" />
                Summarize Context
              </button>
            )}

            {onClearContext && (
              <button
                onClick={onClearContext}
                className="
                  flex-1 flex items-center justify-center gap-2
                  px-3 py-2 rounded-lg
                  bg-gray-50 text-gray-700 hover:bg-gray-100
                  text-sm font-medium transition-colors
                "
              >
                <Trash2 className="h-4 w-4" />
                Clear Context
              </button>
            )}
          </div>

          {/* Info text */}
          <p className="text-xs text-gray-500 text-center">
            Context window affects AI memory of this conversation.
            Clearing context keeps messages visible but starts fresh context.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Inline indicator for header
 */
export function MemoryIndicatorInline({
  messages,
  onSummarize,
  className = ''
}: {
  messages: Array<{ content: string; role: string }>;
  onSummarize?: () => void;
  className?: string;
}) {
  const memoryStatus = useMemo(() => calculateMemoryStatus(messages), [messages]);
  const colors = getStatusColors(memoryStatus.status);

  if (memoryStatus.percentUsed < 30) {
    return null; // Don't show when memory is low
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5">
        {getStatusIcon(memoryStatus.status, `h-3 w-3 ${colors.icon}`)}
        <span className={`text-xs font-medium ${colors.text}`}>
          {Math.round(memoryStatus.percentUsed)}% context
        </span>
      </div>

      {memoryStatus.shouldSummarize && onSummarize && (
        <button
          onClick={onSummarize}
          className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
        >
          Summarize
        </button>
      )}
    </div>
  );
}

export default MemoryIndicator;
