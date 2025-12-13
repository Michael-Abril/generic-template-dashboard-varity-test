'use client';

import { useEffect, useState } from 'react';
import { Wallet, Fuel, CheckCircle, ShoppingCart } from 'lucide-react';

export type TransactionStep =
  | 'checking_balance'
  | 'estimating_gas'
  | 'requesting_approval'
  | 'waiting_approval'
  | 'approving'
  | 'approval_confirmed'
  | 'requesting_transaction'
  | 'waiting_transaction'
  | 'confirming'
  | 'success'
  | 'failed';

interface TransactionStatusModalProps {
  isOpen: boolean;
  currentStep: TransactionStep;
  error?: string | null;
  transactionHash?: string;
  onClose: () => void;
  productName?: string;
  amount?: string;
  estimatedGas?: string;
}

/**
 * Transaction Status Modal Component
 *
 * Displays real-time transaction progress with clear visual feedback
 * Features:
 * - Step-by-step progress indicators
 * - Loading animations
 * - Success/error states
 * - Gas estimation display
 * - Transaction hash with explorer link
 * - User-friendly error messages
 */
export function TransactionStatusModal({
  isOpen,
  currentStep,
  error,
  transactionHash,
  onClose,
  productName,
  amount,
  estimatedGas
}: TransactionStatusModalProps) {
  const [autoCloseTimer, setAutoCloseTimer] = useState<number | null>(null);

  // Auto-close on success after 5 seconds
  useEffect(() => {
    if (currentStep === 'success') {
      const timer = window.setTimeout(() => {
        onClose();
      }, 5000);
      setAutoCloseTimer(5);

      // Countdown timer
      const countdown = window.setInterval(() => {
        setAutoCloseTimer(prev => (prev && prev > 0 ? prev - 1 : null));
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(countdown);
      };
    }
  }, [currentStep, onClose]);

  if (!isOpen) return null;

  const steps = [
    {
      id: 'checking_balance',
      label: 'Checking Balance',
      description: 'Verifying you have sufficient USDC',
      icon: Wallet
    },
    {
      id: 'estimating_gas',
      label: 'Estimating Gas',
      description: 'Calculating transaction costs',
      icon: Fuel
    },
    {
      id: 'approving',
      label: 'Approving USDC',
      description: 'Allowing marketplace to spend USDC',
      icon: CheckCircle
    },
    {
      id: 'confirming',
      label: 'Purchasing License',
      description: 'Minting your license NFT',
      icon: ShoppingCart
    }
  ];

  const getStepStatus = (stepId: string): 'pending' | 'active' | 'complete' | 'failed' => {
    if (currentStep === 'failed') return 'failed';

    const stepOrder = ['checking_balance', 'estimating_gas', 'approving', 'confirming'];
    const currentIndex = stepOrder.indexOf(
      currentStep.includes('approval') ? 'approving' : currentStep.includes('transaction') || currentStep === 'confirming' ? 'confirming' : currentStep
    );
    const thisIndex = stepOrder.indexOf(stepId);

    if (currentStep === 'success' && thisIndex < stepOrder.length) return 'complete';
    if (thisIndex < currentIndex) return 'complete';
    if (thisIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getStatusMessage = (): { title: string; description: string } => {
    switch (currentStep) {
      case 'checking_balance':
        return {
          title: 'Checking Your Balance',
          description: 'Verifying you have sufficient USDC for this purchase...'
        };
      case 'estimating_gas':
        return {
          title: 'Estimating Gas Fees',
          description: 'Calculating the cost to process this transaction...'
        };
      case 'requesting_approval':
        return {
          title: 'Approval Required',
          description: 'Please approve USDC spending in your wallet'
        };
      case 'waiting_approval':
        return {
          title: 'Waiting for Approval',
          description: 'Confirm the approval transaction in your wallet...'
        };
      case 'approving':
        return {
          title: 'Approving USDC',
          description: 'Allowing the marketplace to spend your USDC...'
        };
      case 'approval_confirmed':
        return {
          title: 'Approval Confirmed',
          description: 'USDC spending approved successfully!'
        };
      case 'requesting_transaction':
        return {
          title: 'Purchase Transaction',
          description: 'Please confirm the purchase in your wallet'
        };
      case 'waiting_transaction':
        return {
          title: 'Waiting for Confirmation',
          description: 'Confirm the purchase transaction in your wallet...'
        };
      case 'confirming':
        return {
          title: 'Minting License NFT',
          description: 'Creating your license on the blockchain...'
        };
      case 'success':
        return {
          title: 'Purchase Successful!',
          description: `Your ${productName || 'license'} has been activated`
        };
      case 'failed':
        return {
          title: 'Transaction Failed',
          description: error || 'An error occurred during the transaction'
        };
      default:
        return {
          title: 'Processing',
          description: 'Please wait...'
        };
    }
  };

  const status = getStatusMessage();
  const isFailed = currentStep === 'failed';
  const isSuccess = currentStep === 'success';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className={`p-6 rounded-t-xl ${
          isSuccess ? 'bg-gradient-to-r from-green-500 to-green-600' :
          isFailed ? 'bg-gradient-to-r from-red-500 to-red-600' :
          'bg-gradient-to-r from-blue-500 to-blue-600'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSuccess ? (
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : isFailed ? (
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : (
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-white">{status.title}</h2>
                <p className="text-blue-100 text-sm">{status.description}</p>
              </div>
            </div>
            {(isSuccess || isFailed) && (
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Transaction Details */}
          {(amount || estimatedGas) && !isFailed && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              {amount && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold text-gray-900">{amount} USDC</span>
                </div>
              )}
              {estimatedGas && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Est. Gas Fee:</span>
                  <span className="font-semibold text-gray-900">{estimatedGas} USDC</span>
                </div>
              )}
            </div>
          )}

          {/* Progress Steps */}
          {!isSuccess && !isFailed && (
            <div className="space-y-4 mb-6">
              {steps.map((step, index) => {
                const status = getStepStatus(step.id);
                return (
                  <div key={step.id} className="flex items-start gap-3">
                    {/* Step Icon */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      status === 'complete' ? 'bg-green-100' :
                      status === 'active' ? 'bg-blue-100' :
                      status === 'failed' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}>
                      {status === 'complete' ? (
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : status === 'active' ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      ) : status === 'failed' ? (
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <step.icon className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1">
                      <p className={`font-medium ${
                        status === 'active' ? 'text-blue-900' :
                        status === 'complete' ? 'text-green-900' :
                        status === 'failed' ? 'text-red-900' :
                        'text-gray-500'
                      }`}>
                        {step.label}
                      </p>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error Message */}
          {isFailed && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-900 font-medium mb-2">Error Details:</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Transaction Hash */}
          {transactionHash && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900 font-medium mb-2">Transaction Hash:</p>
              <a
                href={`https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 font-mono break-all flex items-center gap-2"
              >
                {transactionHash}
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-900 font-medium mb-2">What's Next?</p>
              <ul className="text-sm text-green-800 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">1.</span>
                  <span>Your license NFT has been minted to your wallet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">2.</span>
                  <span>You can now use {productName || 'this integration'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">3.</span>
                  <span>Configure your settings in the integrations page</span>
                </li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {isSuccess && autoCloseTimer !== null && (
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
              >
                Close {autoCloseTimer > 0 && `(${autoCloseTimer}s)`}
              </button>
            )}
            {isFailed && (
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all"
              >
                Close
              </button>
            )}
            {!isSuccess && !isFailed && (
              <div className="flex-1 text-center text-sm text-gray-500">
                Please do not close this window...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
