'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft, ExternalLink } from 'lucide-react';
import { logger } from '@/lib/logger';

const INTEGRATION_DISPLAY_NAMES: Record<string, string> = {
  google: 'Google Workspace',
  microsoft: 'Microsoft 365',
  slack: 'Slack',
  quickbooks: 'QuickBooks',
  salesforce: 'Salesforce',
  hubspot: 'HubSpot',
};

const INTEGRATION_HELP_LINKS: Record<string, string> = {
  google: 'https://support.google.com/a/answer/60762',
  microsoft: 'https://support.microsoft.com/en-us/office',
  slack: 'https://slack.com/help',
  quickbooks: 'https://quickbooks.intuit.com/learn-support/',
  salesforce: 'https://help.salesforce.com/',
  hubspot: 'https://knowledge.hubspot.com/',
};

interface Props {
  children: ReactNode;
  integrationName: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class IntegrationErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    logger.error('Integration error boundary caught error', {
      integration: this.props.integrationName,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  private handleGoToDashboard = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  private handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  private getDisplayName(): string {
    return INTEGRATION_DISPLAY_NAMES[this.props.integrationName] || this.props.integrationName;
  }

  private getHelpLink(): string | null {
    return INTEGRATION_HELP_LINKS[this.props.integrationName] || null;
  }

  public render() {
    if (this.state.hasError) {
      const displayName = this.getDisplayName();
      const helpLink = this.getHelpLink();

      return (
        <div className="min-h-[400px] bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-2xl blur-xl"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <AlertTriangle className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {displayName} encountered an error
              </h2>
              <p className="text-gray-600 mb-4">
                We had trouble loading your {displayName} data. This could be due to a
                temporary connection issue or an expired authentication session.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left bg-gray-50 rounded-lg p-4 mb-4 text-sm">
                  <summary className="cursor-pointer text-gray-700 font-medium">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-40 whitespace-pre-wrap">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-6 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>

              <button
                onClick={this.handleGoToDashboard}
                className="w-full flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 py-3.5 px-6 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <Home className="w-5 h-5" />
                Go to Dashboard
              </button>

              <button
                onClick={this.handleGoBack}
                className="w-full flex items-center justify-center gap-2 text-gray-500 py-2 text-sm hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            </div>

            {helpLink && (
              <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                <a
                  href={helpLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {displayName} Help Center
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <p className="text-center text-xs text-gray-400 mt-4">
              Error ID: {Date.now().toString(36).toUpperCase()}-{this.props.integrationName.toUpperCase().slice(0, 3)}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default IntegrationErrorBoundary;
