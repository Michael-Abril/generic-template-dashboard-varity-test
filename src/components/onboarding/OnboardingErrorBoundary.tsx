'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, MessageSquare } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class OnboardingErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Onboarding error caught:', error, errorInfo);
    this.setState({ errorInfo });

    // Log to analytics/error tracking service (if configured)
    try {
      const errorData = {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: typeof window !== 'undefined' ? window.location.href : '',
        timestamp: new Date().toISOString(),
      };
      console.error('Error data for tracking:', errorData);
      // TODO: Send to error tracking service when configured
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      // Clear any cached state that might cause issues
      try {
        localStorage.removeItem('varity_onboarding_draft');
      } catch (e) {
        console.warn('Failed to clear onboarding draft:', e);
      }
      window.location.href = '/';
    }
  };

  private handleContactSupport = () => {
    if (typeof window !== 'undefined') {
      // Open email with error details
      const subject = encodeURIComponent('Onboarding Error Report');
      const body = encodeURIComponent(
        `Hi Varity Team,\n\nI encountered an error during onboarding:\n\nError: ${this.state.error?.message || 'Unknown error'}\n\nPlease help me resolve this issue.\n\nThank you!`
      );
      window.location.href = `mailto:support@varity.so?subject=${subject}&body=${body}`;
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/20 rounded-2xl blur-xl"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <AlertTriangle className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>

            {/* Error Message */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Oops! Something went wrong
              </h2>
              <p className="text-gray-600 mb-4">
                We encountered an unexpected error during onboarding.
                Don&apos;t worry - your progress has been saved.
              </p>

              {/* Error details (collapsed by default in production) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left bg-gray-50 rounded-lg p-4 mb-4 text-sm">
                  <summary className="cursor-pointer text-gray-700 font-medium">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-40">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-6 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 py-3.5 px-6 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <Home className="w-5 h-5" />
                Go to Homepage
              </button>

              <button
                onClick={this.handleContactSupport}
                className="w-full flex items-center justify-center gap-2 text-gray-500 py-2 text-sm hover:text-gray-700 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Contact Support
              </button>
            </div>

            {/* Reassurance */}
            <p className="text-center text-xs text-gray-400 mt-6">
              Error ID: {Date.now().toString(36).toUpperCase()}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
