'use client';

import { useState } from 'react';
import { Lightbulb, AlertTriangle, Ban, Wallet, Fuel, Hash, XCircle, Globe, ArrowLeftRight, CircleDollarSign } from 'lucide-react';

// Icon type mapping for error states
type ErrorIconType = 'cancel' | 'insufficient' | 'warning' | 'network' | 'wrongNetwork' | 'wallet' | 'gas' | 'nonce' | 'error';

// Helper to get Lucide icon component based on icon type
function getErrorIcon(iconType: ErrorIconType) {
  const iconMap: Record<ErrorIconType, React.ReactNode> = {
    cancel: <Ban className="w-7 h-7 text-red-500" />,
    insufficient: <CircleDollarSign className="w-7 h-7 text-amber-500" />,
    warning: <AlertTriangle className="w-7 h-7 text-amber-500" />,
    network: <Globe className="w-7 h-7 text-red-500" />,
    wrongNetwork: <ArrowLeftRight className="w-7 h-7 text-orange-500" />,
    wallet: <Wallet className="w-7 h-7 text-blue-500" />,
    gas: <Fuel className="w-7 h-7 text-orange-500" />,
    nonce: <Hash className="w-7 h-7 text-purple-500" />,
    error: <XCircle className="w-7 h-7 text-red-500" />,
  };
  return iconMap[iconType] || iconMap.error;
}

export interface Web3Error {
  code?: number | string;
  message: string;
  data?: unknown;
  reason?: string;
}

interface Web3ErrorHandlerProps {
  error: Web3Error | Error | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showRetry?: boolean;
  className?: string;
}

/**
 * Web3 Error Handler Component
 *
 * Displays user-friendly error messages for Web3/blockchain errors
 * Features:
 * - Automatic error parsing and categorization
 * - User-friendly explanations
 * - Suggested actions
 * - Retry functionality
 * - Support documentation links
 */
export function Web3ErrorHandler({
  error,
  onRetry,
  onDismiss,
  showRetry = true,
  className = ''
}: Web3ErrorHandlerProps) {
  const [expanded, setExpanded] = useState(false);

  if (!error) return null;

  const errorInfo = parseWeb3Error(error);

  return (
    <div className={`bg-red-50 border-2 border-red-200 rounded-lg overflow-hidden ${className}`}>
      {/* Error Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {getErrorIcon(errorInfo.icon as ErrorIconType)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-red-900 mb-1">
              {errorInfo.title}
            </h3>
            <p className="text-sm text-red-800 mb-3">
              {errorInfo.userMessage}
            </p>

            {/* Suggested Actions */}
            {errorInfo.suggestions.length > 0 && (
              <div className="bg-red-100 rounded-lg p-3 mb-3">
                <p className="text-xs font-semibold text-red-900 mb-2 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> What you can do:
                </p>
                <ul className="space-y-1">
                  {errorInfo.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-xs text-red-800 flex items-start gap-2">
                      <span className="text-red-600 mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {showRetry && onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
              )}
              {errorInfo.helpUrl && (
                <a
                  href={errorInfo.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-all text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Get Help
                </a>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 bg-white text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-all text-sm font-medium"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>

          {/* Dismiss Button (Top Right) */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Technical Details (Collapsible) */}
      {errorInfo.technicalDetails && (
        <div className="border-t border-red-200">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-2 bg-red-100 hover:bg-red-150 transition-colors flex items-center justify-between text-sm text-red-800"
          >
            <span className="font-medium">Technical Details</span>
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expanded && (
            <div className="p-4 bg-red-50">
              <pre className="text-xs text-red-900 font-mono whitespace-pre-wrap break-all">
                {errorInfo.technicalDetails}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Parse Web3 errors and return user-friendly information
 */
function parseWeb3Error(error: Web3Error | Error | string): {
  title: string;
  userMessage: string;
  suggestions: string[];
  technicalDetails: string;
  helpUrl?: string;
  icon: string;
} {
  // Convert to string if needed
  const errorMessage = typeof error === 'string'
    ? error
    : error instanceof Error
    ? error.message
    : (error as Web3Error).message || 'Unknown error';

  const errorCode = typeof error === 'object' && 'code' in error ? error.code : null;
  const errorReason = typeof error === 'object' && 'reason' in error ? error.reason : null;

  // User rejected transaction
  if (
    errorMessage.includes('user rejected') ||
    errorMessage.includes('User denied') ||
    errorMessage.includes('rejected') ||
    errorCode === 4001 ||
    errorCode === 'ACTION_REJECTED'
  ) {
    return {
      title: 'Transaction Cancelled',
      userMessage: 'You rejected the transaction in your wallet.',
      suggestions: [
        'Click "Try Again" to restart the transaction',
        'Make sure you want to proceed before confirming in your wallet'
      ],
      technicalDetails: errorMessage,
      icon: 'cancel'
    };
  }

  // Insufficient funds
  if (
    errorMessage.includes('insufficient funds') ||
    errorMessage.includes('insufficient balance') ||
    errorMessage.toLowerCase().includes('insufficient')
  ) {
    return {
      title: 'Insufficient Funds',
      userMessage: 'You don\'t have enough USDC to complete this transaction.',
      suggestions: [
        'Bridge USDC from Arbitrum One using Superbridge',
        'Check your wallet balance on the Varity L3 network',
        'Ensure you have enough USDC for both the purchase and gas fees'
      ],
      technicalDetails: errorMessage,
      helpUrl: 'https://docs.varity.xyz/bridging',
      icon: 'insufficient'
    };
  }

  // Execution reverted
  if (
    errorMessage.includes('execution reverted') ||
    errorMessage.includes('transaction reverted') ||
    errorMessage.includes('revert')
  ) {
    return {
      title: 'Transaction Reverted',
      userMessage: 'The smart contract rejected this transaction. This could be due to various reasons.',
      suggestions: [
        'Check that you have approved enough USDC for this purchase',
        'Ensure the product is still available and not sold out',
        'Try refreshing the page and attempting again',
        'Contact support if the problem persists'
      ],
      technicalDetails: errorReason || errorMessage,
      helpUrl: 'https://docs.varity.xyz/troubleshooting',
      icon: 'warning'
    };
  }

  // Network/RPC errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('NETWORK_ERROR')
  ) {
    return {
      title: 'Network Error',
      userMessage: 'Unable to connect to the Varity L3 network.',
      suggestions: [
        'Check your internet connection',
        'Try switching to a different network and back to Varity L3',
        'Refresh the page and try again',
        'Check if the network is experiencing issues'
      ],
      technicalDetails: errorMessage,
      helpUrl: 'https://status.varity.xyz',
      icon: 'network'
    };
  }

  // Wrong network
  if (
    errorMessage.includes('wrong network') ||
    errorMessage.includes('chain') ||
    errorMessage.includes('network mismatch')
  ) {
    return {
      title: 'Wrong Network',
      userMessage: 'You\'re connected to the wrong blockchain network.',
      suggestions: [
        'Switch to Varity L3 Testnet (Chain ID: 33529) in your wallet',
        'Add the Varity L3 network if it\'s not in your wallet',
        'Ensure you\'re not on Ethereum mainnet or another network'
      ],
      technicalDetails: errorMessage,
      helpUrl: 'https://docs.varity.xyz/network-setup',
      icon: 'wrongNetwork'
    };
  }

  // Wallet not connected
  if (
    errorMessage.includes('wallet') ||
    errorMessage.includes('not connected') ||
    errorMessage.includes('no provider')
  ) {
    return {
      title: 'Wallet Not Connected',
      userMessage: 'No wallet is connected to this application.',
      suggestions: [
        'Click "Sign In" at the top right',
        'Connect your wallet (MetaMask, Coinbase Wallet, etc.)',
        'Install a Web3 wallet extension if you don\'t have one'
      ],
      technicalDetails: errorMessage,
      helpUrl: 'https://docs.varity.xyz/wallet-setup',
      icon: 'wallet'
    };
  }

  // Gas estimation failed
  if (
    errorMessage.includes('gas') ||
    errorMessage.includes('estimate')
  ) {
    return {
      title: 'Gas Estimation Failed',
      userMessage: 'Unable to estimate the gas fees for this transaction.',
      suggestions: [
        'This often means the transaction would fail',
        'Check that you have enough USDC balance',
        'Ensure all transaction parameters are correct',
        'Try again in a few moments'
      ],
      technicalDetails: errorMessage,
      icon: 'gas'
    };
  }

  // Nonce too low
  if (errorMessage.includes('nonce')) {
    return {
      title: 'Transaction Nonce Error',
      userMessage: 'There\'s a mismatch in transaction ordering.',
      suggestions: [
        'Reset your wallet\'s account in settings',
        'Wait a few moments for pending transactions to clear',
        'Refresh the page and try again'
      ],
      technicalDetails: errorMessage,
      icon: 'nonce'
    };
  }

  // Generic error
  return {
    title: 'Transaction Error',
    userMessage: 'An unexpected error occurred while processing your transaction.',
    suggestions: [
      'Try refreshing the page and attempting again',
      'Check your wallet connection and network',
      'Contact support if this problem persists'
    ],
    technicalDetails: errorMessage,
    helpUrl: 'https://docs.varity.xyz/support',
    icon: 'error'
  };
}

/**
 * Inline Error Display (Compact Version)
 */
export function Web3ErrorInline({
  error,
  className = ''
}: {
  error: Web3Error | Error | string | null;
  className?: string;
}) {
  if (!error) return null;

  const errorInfo = parseWeb3Error(error);

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0">{getErrorIcon(errorInfo.icon as ErrorIconType)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-900">{errorInfo.title}</p>
          <p className="text-xs text-red-800 mt-1">{errorInfo.userMessage}</p>
        </div>
      </div>
    </div>
  );
}
