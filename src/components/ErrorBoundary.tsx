'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error', { error, errorInfo });
  }

  // Reset error state when resetKey changes (e.g., on navigation)
  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            {this.state.error && process.env.NODE_ENV === 'development' && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <p className="text-xs font-mono text-gray-700 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 hover:shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component that provides pathname as resetKey
// This ensures the ErrorBoundary resets when navigating between pages
export function ErrorBoundary({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const pathname = usePathname();

  return (
    <ErrorBoundaryInner resetKey={pathname} fallback={fallback}>
      {children}
    </ErrorBoundaryInner>
  );
}
