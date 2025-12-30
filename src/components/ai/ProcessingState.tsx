'use client';

/**
 * ProcessingState - Enhanced AI Processing State Indicators
 *
 * Shows distinct visual states during AI response generation:
 * - thinking: Animated dots with "Analyzing your data..."
 * - searching: Icon + "Searching [integration name]..."
 * - streaming: Text appearing with cursor animation
 * - error: Red icon + message + Retry button
 * - ready: Brief checkmark then hidden
 *
 * Created: December 30, 2025
 */

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Search,
  Database,
  Globe,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Square,
  Sparkles,
  Brain
} from 'lucide-react';

export type ProcessingStatus =
  | 'idle'
  | 'thinking'
  | 'searching_rag'
  | 'searching_web'
  | 'streaming'
  | 'error'
  | 'ready';

interface ProcessingStateProps {
  /** Current processing status */
  status: ProcessingStatus;
  /** Integration name being searched (optional) */
  integrationName?: string;
  /** Error message if status is 'error' */
  errorMessage?: string;
  /** Handler for stop button */
  onStop?: () => void;
  /** Handler for retry button */
  onRetry?: () => void;
  /** Optional: Custom className */
  className?: string;
}

/**
 * Animated thinking dots component
 */
function ThinkingDots() {
  return (
    <div className="flex space-x-1.5">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

/**
 * Pulsing brain animation for deep thinking
 */
function ThinkingBrain() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
      <div className="relative w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
        <Brain className="w-4 h-4 text-white" />
      </div>
    </div>
  );
}

/**
 * Searching animation with rotating icon
 */
function SearchingAnimation({ icon: Icon, color }: { icon: React.ElementType; color: string }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
      <Icon className="w-4 h-4 text-white animate-pulse" />
    </div>
  );
}

/**
 * Blinking cursor for streaming state
 */
function StreamingCursor() {
  return (
    <span className="inline-block w-0.5 h-4 bg-gray-800 animate-pulse ml-0.5" />
  );
}

export function ProcessingState({
  status,
  integrationName,
  errorMessage,
  onStop,
  onRetry,
  className = ''
}: ProcessingStateProps) {
  const [showReady, setShowReady] = useState(false);

  // Show checkmark briefly when ready, then hide
  useEffect(() => {
    if (status === 'ready') {
      setShowReady(true);
      const timer = setTimeout(() => setShowReady(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Don't render anything for idle state
  if (status === 'idle') return null;

  // Ready state - brief checkmark
  if (status === 'ready' && showReady) {
    return (
      <div className={`flex justify-start ${className}`}>
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-700">Response complete</span>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className={`flex justify-start ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-w-md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Something went wrong</p>
              <p className="text-xs text-red-600 mt-1">
                {errorMessage || 'Failed to generate response. Please try again.'}
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Thinking state
  if (status === 'thinking') {
    return (
      <div className={`flex justify-start ${className}`}>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <ThinkingBrain />
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <ThinkingDots />
                <span className="text-sm text-gray-600">Analyzing your data...</span>
              </div>
              <span className="text-xs text-gray-400 mt-1">This may take a moment</span>
            </div>
          </div>
          {onStop && (
            <button
              onClick={onStop}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-full justify-center"
            >
              <Square className="w-3.5 h-3.5" fill="currentColor" />
              Stop generating
            </button>
          )}
        </div>
      </div>
    );
  }

  // Searching RAG state
  if (status === 'searching_rag') {
    return (
      <div className={`flex justify-start ${className}`}>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <SearchingAnimation icon={Database} color="bg-gradient-to-br from-purple-500 to-indigo-600" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  Searching {integrationName || 'your business data'}...
                </span>
              </div>
              <span className="text-xs text-gray-400 mt-0.5">Querying indexed documents</span>
            </div>
          </div>
          {onStop && (
            <button
              onClick={onStop}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-full justify-center"
            >
              <Square className="w-3.5 h-3.5" fill="currentColor" />
              Stop
            </button>
          )}
        </div>
      </div>
    );
  }

  // Searching web state
  if (status === 'searching_web') {
    return (
      <div className={`flex justify-start ${className}`}>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <SearchingAnimation icon={Globe} color="bg-gradient-to-br from-green-500 to-teal-600" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Searching the web...</span>
              </div>
              <span className="text-xs text-gray-400 mt-0.5">Finding relevant information</span>
            </div>
          </div>
          {onStop && (
            <button
              onClick={onStop}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-full justify-center"
            >
              <Square className="w-3.5 h-3.5" fill="currentColor" />
              Stop
            </button>
          )}
        </div>
      </div>
    );
  }

  // Streaming state - simplified indicator
  if (status === 'streaming') {
    return (
      <div className={`flex justify-start ${className}`}>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
              <span className="text-sm text-gray-600">Generating response</span>
              <StreamingCursor />
            </div>
          </div>
          {onStop && (
            <button
              onClick={onStop}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-full justify-center"
            >
              <Square className="w-3.5 h-3.5" fill="currentColor" />
              Stop generating
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Inline processing indicator for compact spaces
 */
export function ProcessingIndicator({
  status,
  className = ''
}: {
  status: ProcessingStatus;
  className?: string;
}) {
  if (status === 'idle' || status === 'ready') return null;

  const configs: Record<ProcessingStatus, { icon: React.ElementType; text: string; color: string } | null> = {
    idle: null,
    ready: null,
    thinking: { icon: Brain, text: 'Thinking...', color: 'text-blue-500' },
    searching_rag: { icon: Database, text: 'Searching...', color: 'text-purple-500' },
    searching_web: { icon: Globe, text: 'Web search...', color: 'text-green-500' },
    streaming: { icon: Sparkles, text: 'Generating...', color: 'text-purple-500' },
    error: { icon: AlertCircle, text: 'Error', color: 'text-red-500' }
  };

  const config = configs[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Icon className={`w-3.5 h-3.5 ${config.color} animate-pulse`} />
      <span className={`text-xs ${config.color}`}>{config.text}</span>
    </div>
  );
}

export default ProcessingState;
